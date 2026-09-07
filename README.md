# gitlab-jetbrains-project-opener

Adds a button directly on your GitLab and GitHub project pages that lets you
open the project in your JetBrains IDE (or VS Code) with a single click,
instead of manually cloning/opening it yourself.

## How it works

A browser extension injects an "Open in IDE" button/toolbar into the GitLab
or GitHub UI. Clicking it navigates to a custom `jb://` URL, which Windows
routes to a local PowerShell script via a registry-registered protocol
handler. That script takes care of opening (or cloning and opening) the
project in the appropriate JetBrains IDE or VS Code.

## Requirements

- Windows
- Chrome or Edge (for the `chrome-extension/` extension)
- [Git for Windows](https://git-scm.com/download/win) (`git.exe` in `PATH`) —
  only needed if you enable the VS Code button and want it to clone missing
  projects automatically

## Setup

### 1. Run the installer

1. Clone/download this repo somewhere on disk.
2. Run:
   ```
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```
   No admin rights are required. This copies `jb-protocol-handler.ps1` to
   `%LOCALAPPDATA%\jb-protocol-handler\jb-protocol-handler.ps1` and registers
   the `jb://` protocol in `HKCU` to point at it — no manual editing or
   separate registration step needed.
3. (Optional) If a JetBrains IDE or VS Code isn't auto-detected on your
   machine, edit the exe path variable(s) at the top of the **installed**
   copy at `%LOCALAPPDATA%\jb-protocol-handler\jb-protocol-handler.ps1`
   (`$WebStormExePath`, `$RiderExePath`, `$PhpStormExePath`, `$PyCharmExePath`,
   `$IdeaExePath`, `$VsCodeExePath`). Leave a variable as `""` to rely on
   auto-detection.

### 2. Install the browser extension

1. Open `chrome://extensions` (or `edge://extensions`) and enable
   **Developer mode**.
2. Click **Load unpacked** and select the `chrome-extension/` folder from
   this repo. It's active by default on `github.com` and `gitlab.com` — no
   extra setup needed for those.
3. Click the extension's icon (or its "Details" → **Extension options**) to
   open its settings page if you want to change anything:
   - **Enabled sites** — checkboxes to toggle GitHub (`github.com`) and/or
     GitLab (`gitlab.com`) support on/off.
   - **Custom GitLab domain (optional)** — set this if you use a self-hosted
     GitLab/Enterprise instance, e.g. `gitlab.mycompany.com`. Leave blank if
     you only use the public gitlab.com.
   - **Projects root directory** — the local folder where you keep
     checked-out projects (forward slashes, e.g. `C:/Users/you/Projects`).
   - **Enabled IDE buttons** — which IDEs (and/or VS Code) to show buttons
     for.
4. Click **Save** (only prompts for permission if you set a custom GitLab
   domain).
5. Reload any open GitLab/GitHub tabs.

### 3. Try it out

1. Open any project page on your GitLab or GitHub instance.
   - On GitLab, buttons appear inline next to the native clone button.
   - On GitHub, a small floating toolbar appears in the bottom-right corner
     of the page (GitHub's own "Code" button UI is React-rendered and too
     unstable to reliably inject buttons into directly).
2. Click one — Windows should prompt to open the `jb://` link (first time
   only), then launch the matching IDE on the project, cloning it first if
   it isn't already checked out locally.

## Uninstall

To remove the `jb://` protocol registration and the installed handler script:
```
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall
```
Then remove the browser extension from `chrome://extensions` if you no
longer want the "Open in IDE" buttons on GitLab/GitHub.

