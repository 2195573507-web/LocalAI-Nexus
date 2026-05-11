# LocalAI Nexus - Create Desktop Shortcut
# Current delivery target: Electron/Vite desktop launcher with devtools skipped.

[CmdletBinding()]
param(
    [switch]$DryRun,
    [string]$ShortcutDirectory
)

$ErrorActionPreference = "Stop"

$projectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$shortcutFileName = "LocalAI Nexus.lnk"
$shortcutDescription = "LocalAI Nexus - Local AI Gateway, Runtime & AgentOps Hub"
$icoPath = Join-Path $projectDir "assets\localai-nexus.ico"

function Test-LocalAINexusIcon {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path $Path -PathType Leaf)) {
        throw "Icon file not found: $Path. Run 'npm.cmd run icon' first."
    }

    $iconBytes = [System.IO.File]::ReadAllBytes($Path)
    if ($iconBytes.Length -lt 128) {
        throw "Icon file is empty or too small: $Path"
    }

    $isIco = $iconBytes[0] -eq 0 -and $iconBytes[1] -eq 0 -and $iconBytes[2] -eq 1 -and $iconBytes[3] -eq 0
    if (-not $isIco) {
        throw "Icon file is not a valid Windows ICO: $Path. Run 'npm.cmd run icon' first."
    }

    return $iconBytes.Length
}

function Get-LocalAINexusLauncher {
    param([Parameter(Mandatory = $true)][string]$Root)

    $electronExe = Join-Path $Root "node_modules\electron\dist\electron.exe"
    $electronMain = Join-Path $Root "dist-electron\main\index.js"
    if ((Test-Path $electronExe -PathType Leaf) -and (Test-Path $electronMain -PathType Leaf)) {
        return [PSCustomObject]@{
            Kind = "ElectronBuilt"
            TargetPath = $electronExe
            Arguments = "`"$electronMain`""
            WorkingDirectory = $Root
            WindowStyle = 1
        }
    }

    $desktopLauncher = Join-Path $Root "start-agentflow.bat"
    if (Test-Path $desktopLauncher -PathType Leaf) {
        return [PSCustomObject]@{
            Kind = "ElectronDesktop"
            TargetPath = $desktopLauncher
            Arguments = ""
            WorkingDirectory = $Root
            WindowStyle = 1
        }
    }

    $electronLauncher = Join-Path $Root "start-agentflow-electron.bat"
    if (Test-Path $electronLauncher -PathType Leaf) {
        return [PSCustomObject]@{
            Kind = "ElectronDesktop"
            TargetPath = $electronLauncher
            Arguments = ""
            WorkingDirectory = $Root
            WindowStyle = 1
        }
    }

    throw "Rebuilt desktop launcher not found. Expected start-agentflow.bat in $Root."
}

$iconSize = Test-LocalAINexusIcon -Path $icoPath
$launcher = Get-LocalAINexusLauncher -Root $projectDir

if ([string]::IsNullOrWhiteSpace($ShortcutDirectory)) {
    $ShortcutDirectory = [Environment]::GetFolderPath("Desktop")
}

$shortcutPath = Join-Path $ShortcutDirectory $shortcutFileName

Write-Host "Project directory: $projectDir"
Write-Host "Icon: $icoPath ($iconSize bytes)"
Write-Host "Selected target kind: $($launcher.Kind)"
Write-Host "Selected target: $($launcher.TargetPath)"

if ($DryRun) {
    Write-Host "Dry run enabled; desktop shortcut was not created."
    exit 0
}

if (-not (Test-Path $ShortcutDirectory -PathType Container)) {
    throw "Shortcut directory not found: $ShortcutDirectory"
}

$WScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $WScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher.TargetPath
$shortcut.Arguments = $launcher.Arguments
$shortcut.WorkingDirectory = $launcher.WorkingDirectory
$shortcut.Description = $shortcutDescription
$shortcut.WindowStyle = $launcher.WindowStyle
$shortcut.IconLocation = "$icoPath,0"
$shortcut.Save()

$verifiedShortcut = $WScriptShell.CreateShortcut($shortcutPath)
$expectedIconLocation = "$icoPath,0"
$expectedValues = @(
    @{ Name = "target"; Actual = $verifiedShortcut.TargetPath; Expected = $launcher.TargetPath },
    @{ Name = "arguments"; Actual = $verifiedShortcut.Arguments; Expected = $launcher.Arguments },
    @{ Name = "working directory"; Actual = $verifiedShortcut.WorkingDirectory; Expected = $launcher.WorkingDirectory },
    @{ Name = "icon"; Actual = $verifiedShortcut.IconLocation; Expected = $expectedIconLocation }
)

foreach ($value in $expectedValues) {
    if ($value.Actual -ne $value.Expected) {
        throw "Shortcut verification failed for $($value.Name). Expected '$($value.Expected)', got '$($value.Actual)'."
    }
}

if (-not (Test-Path $verifiedShortcut.TargetPath -PathType Leaf)) {
    throw "Shortcut target does not exist after creation: $($verifiedShortcut.TargetPath)"
}

$argumentPath = $verifiedShortcut.Arguments.Trim('"')
if (-not [string]::IsNullOrWhiteSpace($argumentPath) -and -not (Test-Path $argumentPath -PathType Leaf)) {
    throw "Shortcut argument file does not exist after creation: $argumentPath"
}

$iconFile = $verifiedShortcut.IconLocation -replace ',\d+$', ''
if (-not (Test-Path $iconFile -PathType Leaf)) {
    throw "Shortcut icon does not exist after creation: $iconFile"
}

Write-Host "Desktop shortcut created: $shortcutPath"
Write-Host "Shortcut target: $($verifiedShortcut.TargetPath)"
Write-Host "Shortcut arguments: $($verifiedShortcut.Arguments)"
Write-Host "Working directory: $($verifiedShortcut.WorkingDirectory)"
Write-Host "Icon location: $($verifiedShortcut.IconLocation)"
Write-Host "Shortcut verification: PASS"
