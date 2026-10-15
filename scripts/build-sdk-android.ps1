# Cross-compiles the ReXGlue SDK runtime for Android arm64-v8a.
#   .\scripts\build-sdk-android.ps1 [-Config Release] [-ConfigureOnly]
param(
    [string]$Config = 'Release',
    [switch]$ConfigureOnly
)
# Not 'Stop': Windows PowerShell turns every stderr line of a native tool
# (CMake warnings included) into a terminating error.
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\env.ps1"

$src = Join-Path $RB_ROOT 'rexglue-sdk'
$bin = Join-Path $RB_ROOT "build\sdk-android-$($Config.ToLower())"

cmake -S $src -B $bin -G Ninja `
    "-DCMAKE_TOOLCHAIN_FILE=$env:ANDROID_NDK_ROOT\build\cmake\android.toolchain.cmake" `
    -DANDROID_ABI=arm64-v8a `
    -DANDROID_PLATFORM=android-33 `
    -DANDROID_STL=c++_shared `
    "-DCMAKE_BUILD_TYPE=$Config" `
    -DREXGLUE_ENABLE_TRACY=OFF `
    -DREXGLUE_ENABLE_PERF_COUNTERS=OFF
if ($LASTEXITCODE) { exit $LASTEXITCODE }
if ($ConfigureOnly) { exit 0 }

cmake --build $bin
if ($LASTEXITCODE) { exit $LASTEXITCODE }

# re:Blue consumes the SDK installed, like its CI does with a release slice:
# an imported rex::rexglue is what lets the Android build run codegen with the
# host rexglue.exe instead.
cmake --install $bin --prefix (Join-Path $RB_ROOT 'build\sdk-android-install')
exit $LASTEXITCODE
