# Cross-compiles re:Blue for Android arm64-v8a against the in-tree SDK, running
# codegen and the shader recompiler with the host tools.
#   .\scripts\build-reblue-android.ps1 [-Config Release] [-ConfigureOnly]
# Needs reblue\assets\default.xex (and the shader-bearing game files) from your
# own discs, see README-ANDROID.md.
param(
    [string]$Config = 'Release',
    [switch]$ConfigureOnly
)
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\env.ps1"

$src = Join-Path $RB_ROOT 'reblue'
# Installed by build-sdk-android.ps1.
$sdk = Join-Path $RB_ROOT 'build\sdk-android-install'
$bin = Join-Path $RB_ROOT "build\reblue-android-$($Config.ToLower())"
$rexglue = Join-Path $RB_ROOT 'host-tools\sdk\win-amd64\bin\rexglue.exe'
$xenos = Join-Path $RB_ROOT 'host-tools\bin\XenosRecomp.exe'
$dxc = Join-Path $src 'thirdparty\XenosRecomp\thirdparty\dxc-bin\bin\x64\dxc.exe'

foreach ($tool in $rexglue, $xenos, $dxc) {
    if (-not (Test-Path $tool)) {
        Write-Error "Missing host tool $tool (run scripts\build-host-tools.ps1)"
        exit 1
    }
}
if (-not (Test-Path "$sdk\lib\cmake\rexglue\rexglueConfig.cmake")) {
    Write-Error "No Android SDK install at $sdk (run scripts\build-sdk-android.ps1)"
    exit 1
}

cmake -S $src -B $bin -G Ninja `
    "-DCMAKE_TOOLCHAIN_FILE=$env:ANDROID_NDK_ROOT\build\cmake\android.toolchain.cmake" `
    -DANDROID_ABI=arm64-v8a `
    -DANDROID_PLATFORM=android-33 `
    -DANDROID_STL=c++_shared `
    "-DCMAKE_BUILD_TYPE=$Config" `
    "-DCMAKE_PREFIX_PATH=$sdk" `
    "-DCMAKE_FIND_ROOT_PATH=$sdk" `
    "-Drexglue_DIR=$sdk\lib\cmake\rexglue" `
    "-DREXGLUE_CODEGEN_EXECUTABLE=$rexglue" `
    "-DREBLUE_XENOS_RECOMP=$xenos" `
    "-DREBLUE_DXC=$dxc" `
    -DREBLUE_PROFILING=OFF `
    -DREXGLUE_ENABLE_TRACY=OFF `
    -DREXGLUE_ENABLE_PERF_COUNTERS=OFF
if ($LASTEXITCODE) { exit $LASTEXITCODE }
if ($ConfigureOnly) { exit 0 }

# generated/sources.cmake only exists once codegen has run, and the configure
# that lacks it leaves the recompiled sources and their include dir out. A
# fresh tree generates first and then configures again.
if (-not (Test-Path (Join-Path $src 'generated\sources.cmake'))) {
    cmake --build $bin --target reblue_codegen
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
    cmake $bin
    if ($LASTEXITCODE) { exit $LASTEXITCODE }
}

cmake --build $bin --target reblue
exit $LASTEXITCODE
