# One command from your discs to an installed APK.
#   .\scripts\build-all.ps1 -Source D:\BD\disc1.iso,D:\BD\disc2.iso,D:\BD\disc3.iso [-Install]
#   .\scripts\build-all.ps1 [-Install]          # assets already prepared
# -Source takes the three disc images or a folder with the game files (e.g.
# the game\ folder of a re:Blue PC install). Each step is skipped when its
# output is already there, except the re:Blue build and the APK.
param(
    [string[]]$Source,
    [switch]$Install,
    [string]$Config = 'Release'
)
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\env.ps1"

function Step($name, [scriptblock]$body) {
    Write-Host "`n=== $name" -ForegroundColor Cyan
    & $body
    if ($LASTEXITCODE) {
        Write-Host "FAILED: $name (exit $LASTEXITCODE)" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

$assets = Join-Path $RB_ROOT 'reblue\assets'
if ($Source) {
    Step 'Game files -> reblue\assets' {
        python -I "$PSScriptRoot\prepare_assets.py" @Source --out $assets
    }
}
if (-not (Test-Path "$assets\default.xex")) {
    Write-Error "reblue\assets\default.xex is missing. Pass -Source with your disc images."
    exit 1
}

if (-not (Test-Path (Join-Path $RB_ROOT 'host-tools\bin\XenosRecomp.exe'))) {
    Step 'Host tools (XenosRecomp)' {
        powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\build-host-tools.ps1"
    }
}

if (-not (Test-Path (Join-Path $RB_ROOT 'build\sdk-android-install\lib\librexruntime.so'))) {
    Step 'ReXGlue SDK for Android' {
        powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\build-sdk-android.ps1"
    }
}

Step 're:Blue for Android (codegen + shaders + compile)' {
    powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\build-reblue-android.ps1" -Config $Config
}

$apkArgs = @('-Config', $Config)
if ($Install) { $apkArgs += '-Install' }
Step 'APK' {
    powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\build-apk.ps1" @apkArgs
}
