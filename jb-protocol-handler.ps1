
param([string]$Url)

# jb:// url handler for JetBrains IDEs (WebStorm, Rider, PhpStorm, PyCharm, IDEA, ...)
# Expected URL format:
#   jb://open?ide=webstorm&path=C:/Users/yourname/Projects/management-service&repo=git%40gitlab.xxx.com%3Amanagement%2Fmanagement-service.git
#   jb://open?ide=rider&path=C:/Users/yourname/Projects/some-dotnet-service&repo=git%40gitlab.xxx.com%3Ateam%2Fsome-dotnet-service.git
#
# Behavior:
#   - If the local "path" folder exists -> open it directly in the target IDE (e.g. webstorm64.exe <path>)
#   - If it does not exist -> fall back to the official jetbrains://<ide>/checkout/git clone dialog using "repo"
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
    $encodedRepo = [System.Uri]::EscapeDataString($repo)
    $cloneUrl = "jetbrains://$($ideConfig.Scheme)/checkout/git?idea.required.plugins.id=$($ideConfig.RequiredPlugin)&checkout.repo=$encodedRepo"
    Start-Process $cloneUrl
}
else {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("jb:// URL missing both a valid 'path' and a 'repo' parameter.`n`nURL received: $Url")
}
