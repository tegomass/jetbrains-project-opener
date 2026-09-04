# gitlab-jetbrains-project-opener

Adds a button directly on your GitLab project pages that lets you open the
project in your JetBrains IDE with a single click, instead of manually
cloning/opening it yourself.

## How it works

A Tampermonkey userscript injects an "Open in JetBrains IDE" button into the
GitLab UI. Clicking it navigates to a custom `jb://` URL, which Windows routes
to a local PowerShell script via a registry-registered protocol handler. That
script takes care of opening (or cloning and opening) the project in the
appropriate JetBrains IDE.

## Requirements

- Windows
- [Tampermonkey](https://www.tampermonkey.net/) (or a similar userscript
  manager) installed in your browser

## Setup

### 1. Install the handler script

1. Copy `jb-protocol-handler.ps1` to a permanent folder on your machine
   (e.g. `C:\Tools\jb-protocol-handler.ps1`).
2. Open it and, at the top of the file, fill in the exe path variable(s) for
   any JetBrains IDE that isn't auto-detected on your machine (`$WebStormExePath`,
   `$RiderExePath`, `$PhpStormExePath`, `$PyCharmExePath`, `$IdeaExePath`).
   Leave a variable as `""` to rely on auto-detection.

### 2. Register the `jb://` protocol handler

1. Open `register-jb-protocol.ps1`.
2. Set the `$HandlerScriptPath` variable at the top to the full path where
   you saved `jb-protocol-handler.ps1` in step 1.
3. Run the script (e.g. right-click → *Run with PowerShell*, or
   `powershell -ExecutionPolicy Bypass -File .\register-jb-protocol.ps1`).
   No admin rights are required; it only writes to `HKCU`.
4. You should see `jb:// protocol registered, pointing to '<your path>'.`

### 3. Install the userscript

1. Install [Tampermonkey](https://www.tampermonkey.net/) (or a similar
   userscript manager) in your browser.
2. Open Tampermonkey's dashboard → **Create a new script**, then replace the
   contents with `jb-cloner.user.js`.
3. In the script, update:
   - `@match` to point at your GitLab domain.
   - `PROJECTS_BASE_PATH` to the local folder where you keep checked-out
     projects.
   - `ENABLED_IDES` to the list of IDE buttons you want shown (from
     `IDE_TYPES`: `WS`, `RD`, `PS`, `PC`, `IJ`).
4. Save the script.

### 4. Try it out

1. Open any project page on your GitLab instance.
2. You should see one button per entry in `ENABLED_IDES` next to the clone
   button.
3. Click one — Windows should prompt to open the `jb://` link (first time
   only), then launch the matching JetBrains IDE on the project, cloning it
   first if it isn't already checked out locally.
