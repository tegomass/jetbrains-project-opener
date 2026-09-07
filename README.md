# gitlab-jetbrains-project-opener

Adds a button directly on your GitLab project pages that lets you open the
project in your JetBrains IDE with a single click, instead of manually
cloning/opening it yourself.

## How it works

A browser extension (or, alternatively, a Tampermonkey userscript) injects an
"Open in JetBrains IDE" button into the GitLab UI. Clicking it navigates to a
custom `jb://` URL, which Windows routes to a local PowerShell script via a
registry-registered protocol handler. That script takes care of opening (or
cloning and opening) the project in the appropriate JetBrains IDE.

## Requirements

- Windows
- Chrome/Edge (for the `chrome-extension/` extension), or
  [Tampermonkey](https://www.tampermonkey.net/) (or a similar userscript
  manager) if you'd rather use `jb-cloner.user.js` instead

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
3. (Optional) If a JetBrains IDE isn't auto-detected on your machine, edit the
   exe path variable(s) at the top of the **installed** copy at
   `%LOCALAPPDATA%\jb-protocol-handler\jb-protocol-handler.ps1`
   (`$WebStormExePath`, `$RiderExePath`, `$PhpStormExePath`, `$PyCharmExePath`,
   `$IdeaExePath`). Leave a variable as `""` to rely on auto-detection.

### 2. Install the browser extension

1. Open `chrome://extensions` (or `edge://extensions`) and enable
   **Developer mode**.
2. Click **Load unpacked** and select the `chrome-extension/` folder from
   this repo.
3. Click the extension's icon (or its "Details" → **Extension options**) to
   open its settings page, then set:
   - **GitLab domain** — your GitLab host, e.g. `gitlab.mycompany.com`.
   - **Projects root directory** — the local folder where you keep
     checked-out projects (forward slashes, e.g. `C:/Users/you/Projects`).
   - **Enabled IDE buttons** — which IDEs to show buttons for.
4. Click **Save** and grant the permission prompt for your GitLab domain.
5. Reload any open GitLab tabs.

> Prefer Tampermonkey instead? Use `jb-cloner.user.js`: create a new script
> in Tampermonkey, paste its contents, then edit `@match` (your GitLab
> domain), `PROJECTS_BASE_PATH`, and `ENABLED_IDES` at the top before saving.

### 3. Try it out

1. Open any project page on your GitLab instance.
2. You should see one button per enabled IDE next to the clone button.
3. Click one — Windows should prompt to open the `jb://` link (first time
   only), then launch the matching JetBrains IDE on the project, cloning it
   first if it isn't already checked out locally.

## Uninstall

To remove the `jb://` protocol registration and the installed handler script:
```
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Uninstall
```
Then remove the browser extension from `chrome://extensions` (or remove the
Tampermonkey userscript) if you no longer want the "Open in JetBrains IDE"
button on GitLab.

