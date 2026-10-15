# Packages the Android build into an APK and optionally installs it.
#   .\scripts\build-apk.ps1 [-Config Release] [-Install] [-JavaOnly]
# -JavaOnly skips the native libraries, to check the Gradle side on its own.
param(
    [string]$Config = 'Release',
    [switch]$Install,
    [switch]$JavaOnly
)
$ErrorActionPreference = 'Continue'
. "$PSScriptRoot\env.ps1"

$android = Join-Path $RB_ROOT 'android'
$jni = Join-Path $android 'app\libs\arm64-v8a'
New-Item -ItemType Directory -Force $jni | Out-Null
Get-ChildItem $jni -Filter *.so | Remove-Item -Force

if (-not $JavaOnly) {
    $libs = @(
        (Join-Path $RB_ROOT "build\reblue-android-$($Config.ToLower())\libreblue.so"),
        (Join-Path $RB_ROOT 'build\sdk-android-install\lib\librexruntime.so'),
        "$env:ANDROID_NDK_ROOT\toolchains\llvm\prebuilt\windows-x86_64\sysroot\usr\lib\aarch64-linux-android\libc++_shared.so"
    )
    foreach ($lib in $libs) {
        if (-not (Test-Path $lib)) {
            Write-Error "Missing $lib (run scripts\build-reblue-android.ps1 first)"
            exit 1
        }
        Copy-Item $lib $jni -Force
    }
}

$task = if ($Config -eq 'Debug') { 'assembleDebug' } else { 'assembleRelease' }
cmd /c "cd /d `"$android`" && .\gradlew.bat --no-daemon $task"
if ($LASTEXITCODE) { exit $LASTEXITCODE }

$variant = $Config.ToLower()
$apk = Join-Path $android "app\build\outputs\apk\$variant\app-$variant.apk"
Write-Host "APK: $apk ($([math]::Round((Get-Item $apk).Length / 1MB)) MB)"

if ($Install) {
    adb install -r $apk
    exit $LASTEXITCODE
}
