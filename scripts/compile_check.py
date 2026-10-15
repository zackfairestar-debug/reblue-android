"""Compiles translation units of a configured Ninja build one by one, outside
Ninja, so sources can be checked before codegen has produced the recompiled
game code they are ordered after.

    python -I scripts/compile_check.py <build-dir> <path-substring>...

Precompiled-header flags are swapped for a plain -include of the PCH source,
since the .pch itself is ordered after codegen too. Prints one line per TU and
the first errors of each failure; a TU that fails only because a codegen
output is missing is reported as SKIP.
"""
import concurrent.futures
import json
import os
import re
import subprocess
import sys

CODEGEN_MISSING = re.compile(
    r"fatal error: '(generated/[^']+|reblue_[a-z_]+\.h|[a-z_]+_init\.h|shader_cache\.h)' file not found")


def load(build_dir):
    out = subprocess.run(["ninja", "-C", build_dir, "-t", "compdb"],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def strip_pch(command):
    # -Xclang -include-pch -Xclang X.pch -Xclang -include -Xclang X.hxx
    command = re.sub(r"-Xclang -include-pch -Xclang \S+", "", command)
    command = re.sub(r"-Xclang -include -Xclang (\S+)", r"-include \1", command)
    return command


def check(entry):
    command = strip_pch(entry["command"])
    command = re.sub(r" -o \S+", " -o NUL", command)
    command += " -fsyntax-only"
    proc = subprocess.run(command, cwd=entry["directory"], shell=True,
                          capture_output=True, text=True)
    text = proc.stdout + proc.stderr
    if proc.returncode == 0:
        return "OK  ", entry["file"], ""
    if CODEGEN_MISSING.search(text) and text.count("error:") <= 1:
        return "SKIP", entry["file"], CODEGEN_MISSING.search(text).group(1)
    errors = [l for l in text.splitlines() if "error:" in l][:6]
    return "FAIL", entry["file"], "\n    ".join(errors)


def main():
    build_dir, filters = sys.argv[1], sys.argv[2:]
    entries = [e for e in load(build_dir)
               if e["file"].endswith((".cpp", ".c"))
               and any(f.replace("\\", "/") in e["file"].replace("\\", "/") for f in filters)]
    seen, unique = set(), []
    for e in entries:
        if e["file"] not in seen:
            seen.add(e["file"])
            unique.append(e)
    counts = {"OK  ": 0, "SKIP": 0, "FAIL": 0}
    with concurrent.futures.ThreadPoolExecutor(os.cpu_count()) as pool:
        for status, path, detail in pool.map(check, unique):
            counts[status] += 1
            if status != "OK  ":
                print(f"{status} {os.path.relpath(path)}" + (f"\n    {detail}" if detail else ""))
    print(f"ok={counts['OK  ']} skip(codegen)={counts['SKIP']} fail={counts['FAIL']}")


if __name__ == "__main__":
    main()
