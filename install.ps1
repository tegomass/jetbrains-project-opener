# One-shot installer for the jb:// protocol handler.
# - Copies jb-protocol-handler.ps1 to a permanent per-user location.
# - Registers the jb:// protocol in HKCU (no admin rights required).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#   powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall

param(
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

$InstallDir  = Join-Path $env:LOCALAPPDATA "jb-protocol-handler"
$TargetPath  = Join-Path $InstallDir "jb-protocol-handler.ps1"
$SourcePath  = Join-Path $PSScriptRoot "jb-protocol-handler.ps1"

if ($Uninstall) {
    if (Test-Path "HKCU:\Software\Classes\jb") {
        Remove-Item -Path "HKCU:\Software\Classes\jb" -Recurse -Force
        Write-Host "Removed jb:// protocol registration."
    } else {
        Write-Host "jb:// protocol was not registered."
    }

    if (Test-Path $InstallDir) {
        Remove-Item -Path $InstallDir -Recurse -Force
        Write-Host "Removed installed handler script from '$InstallDir'."
    }

    Write-Host "Uninstall complete."
    return
}

if (-Not (Test-Path $SourcePath)) {
    Write-Error "Could not find jb-protocol-handler.ps1 next to install.ps1 (expected at '$SourcePath')."
}

New-Item -Path $InstallDir -ItemType Directory -Force | Out-Null
Copy-Item -Path $SourcePath -Destination $TargetPath -Force

$command = "powershell.exe -ExecutionPolicy Bypass -File `"$TargetPath`" -Url `"%1`""

New-Item -Path "HKCU:\Software\Classes\jb" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\jb" -Name "(Default)" -Value "URL:JetBrains Custom Protocol"
Set-ItemProperty -Path "HKCU:\Software\Classes\jb" -Name "URL Protocol" -Value ""

New-Item -Path "HKCU:\Software\Classes\jb\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\jb\shell\open\command" -Name "(Default)" -Value $command

Write-Host "Installed handler script to '$TargetPath'."
Write-Host "jb:// protocol registered."
Write-Host ""
Write-Host "If you need to set custom IDE exe paths, edit:"
Write-Host "  $TargetPath"
Write-Host "(re-run install.ps1 afterwards, since it overwrites the installed copy from the source file)."
Write-Host ""
Write-Host "To uninstall later, run: powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall"
