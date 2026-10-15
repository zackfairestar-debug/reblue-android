"""Fills reblue/assets with what the build reads from your own copy of the
game: default.xex (codegen input) and the Xenos shaders (.vso/.pso) that live
inside the game's IPK archives (shader cache input).

    python -I scripts/prepare_assets.py <source>... [--out reblue/assets]

Each <source> is either an Xbox 360 disc image (.iso, read in place through
its XDVDFS file system, nothing is mounted or extracted to disk) or a folder
holding the game files, such as the game\\ folder of a re:Blue PC install.
Pass all three discs; default.xex is taken from the first source that has it.
"""
import argparse
import csv
import os
import struct
import sys
import zlib
from pathlib import Path

SECTOR = 2048
# Where the game partition starts in the image: none (a partition-only dump),
# XGD3, XGD2, and original-Xbox XGD1 layouts.
PARTITION_OFFSETS = (0x0, 0x2080000, 0xFD90000, 0x18300000)
XDVDFS_MAGIC = b"MICROSOFT*XBOX*MEDIA"
SHADER_EXTS = (".vso", ".pso")


class IsoImage:
    """Read-only XDVDFS walker over an Xbox disc image."""

    def __init__(self, path):
        self.path = path
        self.f = open(path, "rb")
        self.base = None
        for offset in PARTITION_OFFSETS:
            self.f.seek(offset + 32 * SECTOR)
            head = self.f.read(28)
            if head[:20] == XDVDFS_MAGIC:
                self.base = offset
                self.root_sector, self.root_size = struct.unpack_from("<II", head, 20)
                break
        if self.base is None:
            raise ValueError(f"{path}: no XDVDFS volume found (not an Xbox 360 disc image?)")

    def read_at(self, sector, offset, size):
        self.f.seek(self.base + sector * SECTOR + offset)
        return self.f.read(size)

    def walk(self):
        """Yields (relative path, start sector, size) for every file."""
        yield from self._walk_dir(self.root_sector, self.root_size, "")

    def _walk_dir(self, sector, size, prefix):
        if size == 0:
            return
        table = self.read_at(sector, 0, size)
        stack, seen = [0], set()
        while stack:
            pos = stack.pop()
            if pos in seen or pos + 14 > len(table):
                continue
            seen.add(pos)
            left, right, start, length, attrs, name_len = struct.unpack_from(
                "<HHIIBB", table, pos)
            if left == 0xFFFF and right == 0xFFFF:
                continue  # sector padding
            name = table[pos + 14:pos + 14 + name_len].decode("latin-1")
            if left:
                stack.append(left * 4)
            if right:
                stack.append(right * 4)
            path = f"{prefix}{name}"
            if attrs & 0x10:
                yield from self._walk_dir(start, length, path + "/")
            else:
                yield path, start, length

    def open_file(self, start, size):
        return Slice(self.f, self.base + start * SECTOR, size)


class Slice:
    """A file-like window over part of another file."""

    def __init__(self, f, base, size):
        self.f, self.base, self.size, self.pos = f, base, size, 0

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False  # the image stays open for the next file

    def seek(self, pos, whence=0):
        self.pos = pos if whence == 0 else self.pos + pos if whence == 1 else self.size + pos

    def read(self, n=-1):
        n = self.size - self.pos if n < 0 else min(n, self.size - self.pos)
        self.f.seek(self.base + self.pos)
        data = self.f.read(n)
        self.pos += len(data)
        return data


def ipk_shaders(f, archive_name):
    """Yields (record name, bytes) for each shader record in an IPK1 archive."""
    header = f.read(16)
    if header[:4] != b"IPK1":
        return
    count = struct.unpack_from("<I", header, 8)[0]
    table = f.read(count * 0x60)
    for i in range(len(table) // 0x60):
        rec = table[i * 0x60:(i + 1) * 0x60]
        name = rec[:0x40].split(b"\0", 1)[0].decode("latin-1")
        compressed, zsize, offset, size = struct.unpack_from("<IIII", rec, 0x40)
        if not name.lower().endswith(SHADER_EXTS) or size == 0:
            continue
        f.seek(offset)
        data = f.read(zsize if compressed else size)
        if compressed:
            try:
                data = zlib.decompress(data)
            except zlib.error as e:
                print(f"  warning: {archive_name}:{name} did not inflate ({e})")
                continue
        yield name, data[:size]


def sources_files(source):
    """Yields (relative path, opener) for every file in an ISO or folder."""
    if source.is_dir():
        for p in source.rglob("*"):
            if p.is_file():
                yield p.relative_to(source).as_posix(), (lambda p=p: open(p, "rb"))
        return
    iso = IsoImage(source)
    for path, start, size in iso.walk():
        yield path, (lambda s=start, n=size: iso.open_file(s, n))


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("sources", nargs="+", type=Path)
    root = Path(__file__).resolve().parent.parent
    parser.add_argument("--out", type=Path, default=root / "reblue" / "assets")
    args = parser.parse_args()

    out = args.out
    shader_out = out / "shaders"
    shader_out.mkdir(parents=True, exist_ok=True)
    have_xex = (out / "default.xex").exists()
    shaders = {}

    for source in args.sources:
        print(f"Reading {source}")
        for rel, opener in sources_files(source):
            lower = rel.lower()
            base = os.path.basename(rel)
            if lower.endswith("default.xex") and not have_xex:
                with opener() as src, open(out / "default.xex", "wb") as dst:
                    while chunk := src.read(1 << 20):
                        dst.write(chunk)
                have_xex = True
                print(f"  default.xex <- {rel}")
            elif lower.endswith(SHADER_EXTS):
                with opener() as src:
                    shaders.setdefault(base.lower(), (base, src.read()))
            elif lower.endswith(".ipk"):
                found = 0
                with opener() as src:
                    for name, data in ipk_shaders(src, rel):
                        name = name.replace("\\", "/").rsplit("/", 1)[-1]
                        if shaders.setdefault(name.lower(), (name, data))[1] is data:
                            found += 1
                if found:
                    print(f"  {found} shaders <- {rel}")

    for _, (name, data) in shaders.items():
        (shader_out / name).write_bytes(data)

    expected_csv = root / "reblue" / "tools" / "shader_cache" / "shader_hashes.csv"
    expected = set()
    if expected_csv.exists():
        with open(expected_csv, newline="") as f:
            expected = {row["name"].split("#")[0].lower() for row in csv.DictReader(f)}
    missing = sorted(expected - set(shaders))

    print(f"\ndefault.xex: {'ok' if have_xex else 'NOT FOUND'}")
    print(f"shaders:     {len(shaders)} written to {shader_out}")
    if expected:
        print(f"             {len(expected) - len(missing)} of the {len(expected)} "
              "shaders the PSO cache was built from")
        for name in missing[:20]:
            print(f"             missing {name}")
    return 0 if have_xex and shaders else 1


if __name__ == "__main__":
    sys.exit(main())
