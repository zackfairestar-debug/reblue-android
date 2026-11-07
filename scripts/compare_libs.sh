#!/usr/bin/env bash
# Compares two builds of libreblue.so: how guest calls are linked, what the
# loader has to bind, code size, and one guest function's instructions.
#   scripts/compare_libs.sh before.so after.so [function]
set -euo pipefail
before=$1
after=$2
fn=${3:-sub_820DC270}
ndk=$(ls -d "${ANDROID_NDK_ROOT:-$LOCALAPPDATA/Android/Sdk/ndk/29.0.14206865}" 2>/dev/null || ls -d /c/Users/*/AppData/Local/Android/Sdk/ndk/29*/ | head -1)
bin="$ndk/toolchains/llvm/prebuilt/windows-x86_64/bin"

stats() {
  local so=$1
  local text plt_calls
  text=$("$bin/llvm-size.exe" -A "$so" | awk '$1==".text"{print $2}')
  plt_calls=$("$bin/llvm-objdump.exe" -d --no-show-raw-insn "$so" | grep -c "bl	.*@plt>" || true)
  printf "  .text bytes            %s\n" "$text"
  printf "  PLT relocations        %s\n" "$("$bin/llvm-readelf.exe" -r --wide "$so" | grep -c JUMP_SLOT || true)"
  printf "  dynamic symbols        %s\n" "$("$bin/llvm-readelf.exe" --dyn-syms --wide "$so" | grep -c ': ' || true)"
  printf "  bl through the PLT     %s\n" "$plt_calls"
  printf "  %s: %s instructions\n" "$fn" "$("$bin/llvm-objdump.exe" -d --no-show-raw-insn --disassemble-symbols="$fn" "$so" | grep -cP '^\s+[0-9a-f]+:' || true)"
}

echo "before: $before"; stats "$before"
echo "after:  $after";  stats "$after"
