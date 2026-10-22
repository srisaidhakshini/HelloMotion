param([switch]$Remove)
$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if (!(New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Run this script in an administrator PowerShell.' }
$key = 'HKLM:\SOFTWARE\Classes\CLSID\{A719E0B3-8C86-4C0C-BA04-CE326F5BA713}'
if ($Remove) {
    # This literal key belongs only to HelloMotion; stop HelloMotion and all camera clients first.
    if (Test-Path $key) { Remove-Item -LiteralPath $key -Recurse }
    Write-Host 'HelloMotion COM registration removed.'
    return
}
$binary = Join-Path (Split-Path $PSScriptRoot -Parent) 'native\bin\HelloMotionCamera.dll'
if (!(Test-Path $binary)) { throw 'Build the camera first: npm run camera:build' }
New-Item -Path "$key\InprocServer32" -Force | Out-Null
Set-Item -LiteralPath $key -Value 'HelloMotion Camera Source'
Set-Item -LiteralPath "$key\InprocServer32" -Value $binary
New-ItemProperty -LiteralPath "$key\InprocServer32" -Name ThreadingModel -Value Both -PropertyType String -Force | Out-Null
Write-Host 'HelloMotion camera source registered. Open HelloMotion and enable Call output.'
