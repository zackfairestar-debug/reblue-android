# Builds the tools the Android build runs on this PC: XenosRecomp (Xenos ->
# HLSL -> SPIR-V shader cache). rexglue.exe comes prebuilt from the SDK
# release in host-tools\sdk. Needs Visual Studio 2022 Build Tools (C++).
#   .\scripts\build-host-tools.ps1
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\env.ps1"

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vs = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { Write-Error 'Visual Studio 2022 Build Tools (C++) not found'; exit 1 }
$vcvars = Join-Path $vs 'VC\Auxiliary\Build\vcvars64.bat'

$src = Join-Path $RB_ROOT 'reblue\thirdparty\XenosRecomp'
$bin = Join-Path $RB_ROOT 'build\host-xenosrecomp'
$out = Join-Path $RB_ROOT 'host-tools\bin'
New-Item -ItemType Directory -Force $out | Out-Null

# clang-cl: the recompiler uses Clang builtins, and the MSVC STL behind it has the
# parallel algorithms std::execution::par_unseq needs.
# REBLUE_RECOMP makes the emitted cache include gpu/shaders/shader_cache.h.
# No DXIL: only the D3D12 renderer reads it.
$configure = "cmake -S `"$src`" -B `"$bin`" -G Ninja -DCMAKE_BUILD_TYPE=Release " +
    "-DCMAKE_C_COMPILER=clang-cl -DCMAKE_CXX_COMPILER=clang-cl " +
    "`"-DCMAKE_CXX_FLAGS=/DWIN32 /D_WINDOWS /EHsc /DREBLUE_RECOMP /utf-8`" " +
    "-DXENOS_RECOMP_DXIL=OFF -DCMAKE_POLICY_VERSION_MINIMUM=3.5"
cmd /c "call `"$vcvars`" >nul && $configure && cmake --build `"$bin`" --target XenosRecomp"
if ($LASTEXITCODE) { exit $LASTEXITCODE }

Copy-Item "$bin\XenosRecomp\XenosRecomp.exe" $out -Force
# The recompiler loads dxcompiler.dll at run time to emit SPIR-V.
Copy-Item "$src\thirdparty\dxc-bin\bin\x64\dxcompiler.dll", "$src\thirdparty\dxc-bin\bin\x64\dxil.dll" $out -Force
Get-ChildItem $out | Select-Object Name, Length
