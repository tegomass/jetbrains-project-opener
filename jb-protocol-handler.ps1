
param([string]$Url)

# jb:// url handler for JetBrains IDEs (WebStorm, Rider, PhpStorm, PyCharm, IDEA) and VS Code
# Expected URL format:
#   jb://open?ide=webstorm&path=C:/Users/yourname/Projects/management-service&repo=git%40gitlab.xxx.com%3Amanagement%2Fmanagement-service.git
#   jb://open?ide=rider&path=C:/Users/yourname/Projects/some-dotnet-service&repo=git%40gitlab.xxx.com%3Ateam%2Fsome-dotnet-service.git
#   jb://open?ide=vscode&path=C:/Users/yourname/Projects/some-service&repo=git%40github.com%3Aorg%2Fsome-service.git
#
# Behavior:
#   - If the local "path" folder exists -> open it directly in the target IDE (e.g. webstorm64.exe <path>)
#   - If it does not exist -> clone it, then open it:
#       - JetBrains IDEs: hand off to the official jetbrains://<ide>/checkout/git clone dialog
#       - VS Code: this script runs "git clone" itself (via git.exe in PATH), then launches
#         VS Code on the resulting folder — no second custom protocol involved
#   - "ide" defaults to "webstorm" if omitted, for backward compatibility with older links

# ---------------------------------------------------------------------------
# EDIT ME: set the full path to each IDE's executable if it isn't found
# automatically (e.g. non-default install location, or installed via Toolbox
# under a versioned folder). Leave as "" to rely on auto-detection only.
# ---------------------------------------------------------------------------
$WebStormExePath  = ""
$RiderExePath     = ""
$PhpStormExePath  = ""
$PyCharmExePath   = ""
$IdeaExePath      = ""
$VsCodeExePath    = ""

function Decode([string]$s) {
    if ([string]::IsNullOrEmpty($s)) { return $s }
    return [System.Uri]::UnescapeDataString($s)
}

$path = $null
$repo = $null
$ide  = "webstorm"

if ($Url -match "path=([^&]+)") { $path = Decode($matches[1]) }
if ($Url -match "repo=([^&]+)") { $repo = Decode($matches[1]) }
if ($Url -match "ide=([^&]+)")  { $ide  = Decode($matches[1]).ToLower() }

# Map each supported IDE to its jetbrains:// scheme name and possible exe locations.
# Adjust the paths below to match your actual installs (Toolbox vs standalone installers differ).
$localAppData = [Environment]::GetFolderPath("LocalApplicationData")

$ideMap = @{
    "webstorm" = @{
        Scheme = "webstorm"
        ExePaths = @(
            $WebStormExePath,
            "C:\Program Files\JetBrains\WebStorm\bin\webstorm64.exe",
            (Join-Path $localAppData "Programs\WebStorm\bin\webstorm64.exe")
        )
        FallbackCommand = "webstorm"
        RequiredPlugin = "Git4Idea"
    }
    "rider" = @{
        Scheme = "rider"
        ExePaths = @(
            $RiderExePath,
            "C:\Program Files\JetBrains\JetBrains Rider\bin\rider64.exe",
            (Join-Path $localAppData "Programs\Rider\bin\rider64.exe")
        )
        FallbackCommand = "rider"
        RequiredPlugin = "Git4Idea"
    }
    "phpstorm" = @{
        Scheme = "phpstorm"
        ExePaths = @(
            $PhpStormExePath,
            "C:\Program Files\JetBrains\PhpStorm\bin\phpstorm64.exe",
            (Join-Path $localAppData "Programs\PhpStorm\bin\phpstorm64.exe")
        )
        FallbackCommand = "phpstorm"
        RequiredPlugin = "Git4Idea"
    }
    "pycharm" = @{
        Scheme = "pycharm"
        ExePaths = @(
            $PyCharmExePath,
            "C:\Program Files\JetBrains\PyCharm\bin\pycharm64.exe",
            (Join-Path $localAppData "Programs\PyCharm\bin\pycharm64.exe")
        )
        FallbackCommand = "pycharm"
        RequiredPlugin = "Git4Idea"
    }
    "idea" = @{
        Scheme = "idea"
        ExePaths = @(
            $IdeaExePath,
            "C:\Program Files\JetBrains\IntelliJ IDEA\bin\idea64.exe",
            (Join-Path $localAppData "Programs\IDEA\bin\idea64.exe")
        )
        FallbackCommand = "idea"
        RequiredPlugin = "Git4Idea"
    }
    "vscode" = @{
        # VS Code isn't a JetBrains IDE and has no equivalent built-in
        # "clone dialog" deep link we want to depend on here. Instead, the
        # clone itself is performed directly by this script (see CloneMethod
        # below), keeping jb:// as the only custom protocol involved.
        ExePaths = @(
            $VsCodeExePath,
            "C:\Program Files\Microsoft VS Code\Code.exe",
            (Join-Path $localAppData "Programs\Microsoft VS Code\Code.exe")
        )
        FallbackCommand = "code"
        CloneMethod = "git"
    }
}

if (-Not $ideMap.ContainsKey($ide)) {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("Unknown ide '$ide' in jb:// URL.`n`nSupported: $($ideMap.Keys -join ', ')`nURL received: $Url")
    exit
}

$ideConfig = $ideMap[$ide]

$exePath = $ideConfig.ExePaths | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-Not $exePath) {
    $exePath = $ideConfig.FallbackCommand
}

if ($path -and (Test-Path $path)) {
    Start-Process -FilePath $exePath -ArgumentList "`"$path`""
}
elseif ($repo) {
    if ($ideConfig.ContainsKey("CloneMethod") -and $ideConfig.CloneMethod -eq "git") {
        # Clone directly with git.exe instead of depending on a second
        # registered protocol (e.g. vscode://), then open the result.
        if (-Not (Get-Command git -ErrorAction SilentlyContinue)) {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show("Cannot clone '$repo': git.exe was not found in PATH. Install Git for Windows (https://git-scm.com/download/win), or clone the repo manually.")
            exit
        }

        $parentDir = Split-Path -Path $path -Parent
        if ($parentDir -and -Not (Test-Path $parentDir)) {
            New-Item -Path $parentDir -ItemType Directory -Force | Out-Null
        }

        $cloneProcess = Start-Process -FilePath "git" -ArgumentList @("clone", $repo, $path) -Wait -NoNewWindow -PassThru
        if ($cloneProcess.ExitCode -eq 0 -and (Test-Path $path)) {
            Start-Process -FilePath $exePath -ArgumentList "`"$path`""
        }
        else {
            Add-Type -AssemblyName System.Windows.Forms
            [System.Windows.Forms.MessageBox]::Show("git clone failed for '$repo' (exit code $($cloneProcess.ExitCode)).")
        }
    }
    else {
        $encodedRepo = [System.Uri]::EscapeDataString($repo)
        $cloneUrl = "jetbrains://$($ideConfig.Scheme)/checkout/git?idea.required.plugins.id=$($ideConfig.RequiredPlugin)&checkout.repo=$encodedRepo"
        Start-Process $cloneUrl
    }
}
else {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("jb:// URL missing both a valid 'path' and a 'repo' parameter.`n`nURL received: $Url")
}
