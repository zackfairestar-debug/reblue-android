# Puts the build tools on PATH for the current PowerShell session.
#   . .\scripts\env.ps1
$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
if (Test-Path 'C:\Program Files\LLVM\bin') { $env:Path = "C:\Program Files\LLVM\bin;$env:Path" }
$jdk = Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-21*' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($jdk) { $env:JAVA_HOME = $jdk.FullName; $env:Path = "$($jdk.FullName)\bin;$env:Path" }
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:Path = "$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
$env:ANDROID_NDK_ROOT = "$env:ANDROID_HOME\ndk\29.0.14206865"
$env:ANDROID_NDK_HOME = $env:ANDROID_NDK_ROOT
$global:RB_ROOT = Split-Path -Parent $PSScriptRoot
