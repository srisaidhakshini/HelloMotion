$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$nativeRoot = Join-Path $repoRoot 'native'
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (!(Test-Path $vswhere)) { throw 'Install Visual Studio 2022 Build Tools with Desktop development with C++ and Windows 11 SDK.' }
$msbuild = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -find 'MSBuild\**\Bin\MSBuild.exe' | Select-Object -First 1
if (!$msbuild) { throw 'C++ build tools are missing. Add Desktop development with C++ in Visual Studio Installer.' }
function Get-HeaderPackage($package, $version, $destination) {
    if (Test-Path (Join-Path $destination 'include')) { return }
    New-Item -ItemType Directory -Force $destination | Out-Null
    $archive = Join-Path $destination 'package.zip'
    Invoke-WebRequest "https://api.nuget.org/v3-flatcontainer/$package/$version/$package.$version.nupkg" -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force
}
Get-HeaderPackage 'microsoft.windows.implementationlibrary' '1.0.260126.7' (Join-Path $nativeRoot 'deps\wil')
Get-HeaderPackage 'microsoft.windows.cppwinrt' '3.0.260520.1' (Join-Path $nativeRoot 'deps\cppwinrt')
foreach ($project in @('HelloMotionCamera','HelloMotionHost','HelloMotionProbe')) {
    & $msbuild (Join-Path $nativeRoot "$project.vcxproj") /m /p:Configuration=Release /p:Platform=x64 /verbosity:minimal
    if ($LASTEXITCODE -ne 0) { throw "$project build failed." }
}
Write-Host 'Native camera built. Register it with scripts\setup-camera.ps1 in an administrator PowerShell.'
