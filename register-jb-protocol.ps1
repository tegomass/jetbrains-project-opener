# Registers the jb:// protocol handler in the current user's registry hive.
# Run this script once (no admin rights required) after copying
# jb-protocol-handler.ps1 to its final location.

# ---------------------------------------------------------------------------
# EDIT ME: full path to where you saved jb-protocol-handler.ps1
# ---------------------------------------------------------------------------
$HandlerScriptPath = "C:\Tools\jb-protocol-handler.ps1"

if (-Not (Test-Path $HandlerScriptPath)) {
    Write-Warning "No file found at '$HandlerScriptPath'. Update `$HandlerScriptPath at the top of this script to match where you saved jb-protocol-handler.ps1, then re-run."
}

$command = "powershell.exe -ExecutionPolicy Bypass -File `"$HandlerScriptPath`" -Url `"%1`""

New-Item -Path "HKCU:\Software\Classes\jb" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\jb" -Name "(Default)" -Value "URL:JetBrains Custom Protocol"
Set-ItemProperty -Path "HKCU:\Software\Classes\jb" -Name "URL Protocol" -Value ""

New-Item -Path "HKCU:\Software\Classes\jb\shell\open\command" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\jb\shell\open\command" -Name "(Default)" -Value $command

Write-Host "jb:// protocol registered, pointing to '$HandlerScriptPath'."
