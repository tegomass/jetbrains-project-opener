// Content script: injects "Open in JetBrains IDE" buttons on GitLab project
// pages. Configuration (projects root dir, enabled IDEs) is read from
// chrome.storage.sync, set via the extension's options page.

(function () {
  const IDE_TYPES = {
    WS: { protocol: "webstorm", label: "WS" },
    RD: { protocol: "rider", label: "RD" },
    PS: { protocol: "phpstorm", label: "PS" },
    PC: { protocol: "pycharm", label: "PC" },
    IJ: { protocol: "idea", label: "IJ" },
  };

  const IDEA_LINK_SELECTOR = 'a[href*="jetbrains://idea/checkout/git"][href*="git%40"]';
  const SSH_URL_INPUT_SELECTOR = "#copy-ssh-url-input";
  const CLONE_HOLDER_SELECTOR = ".project-code-holder";
  const BUTTON_CLASS_NAME = "gl-button btn btn-default shortcuts-find-file";

  function createButton(href, text) {
    const button = document.createElement("a");
    button.className = BUTTON_CLASS_NAME;
    button.rel = "nofollow";
    button.href = href;
    button.textContent = text;
    return button;
  }

  // Derive the project (repo) name from its SSH clone URL rather than the
  // page path, since the path's last segment is only the project name on
  // the project root page — it's a subfolder/file name when browsing the
  // repo tree (e.g. .../-/tree/main/some/sub/folder).
  function getProjectNameFromSshUrl(sshUrl) {
    if (!sshUrl) return "";
    const withoutGitSuffix = sshUrl.replace(/\.git$/, "");
    const segments = withoutGitSuffix.split(/[/:]/).filter(Boolean);
    return segments[segments.length - 1] || "";
  }

  function getProjectSshUrl() {
    const input = document.querySelector(SSH_URL_INPUT_SELECTOR);
    return input ? input.value : "";
  }

  function buildOpenUrl(ideType, projectName, projectUrl, projectsBasePath) {
    return `jb://open?path=${projectsBasePath}/${encodeURIComponent(projectName)}&repo=${projectUrl}&ide=${ideType.protocol}`;
  }

  function handle(enabledIdes, projectsBasePath) {
    const projectUrl = getProjectSshUrl();
    const projectName = getProjectNameFromSshUrl(projectUrl);

    const cloneHolder = document.querySelector(CLONE_HOLDER_SELECTOR);
    if (!cloneHolder) return;

    enabledIdes.forEach((ideKey) => {
      const ideType = IDE_TYPES[ideKey];
      if (!ideType) return;
      const openUrl = buildOpenUrl(ideType, projectName, projectUrl, projectsBasePath);
      const openButton = createButton(openUrl, ideType.label);
      cloneHolder.parentNode.insertBefore(openButton, cloneHolder);
    });
  }

  function observeForLink(enabledIdes, projectsBasePath) {
    const existing = document.querySelector(IDEA_LINK_SELECTOR);
    if (existing) return handle(enabledIdes, projectsBasePath);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(IDEA_LINK_SELECTOR);
      if (el) {
        observer.disconnect();
        handle(enabledIdes, projectsBasePath);
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  chrome.storage.sync.get(
    { projectsBasePath: "C:/Users/xxx/Desktop/_PROJECTS", enabledIdes: ["WS", "RD"] },
    (config) => observeForLink(config.enabledIdes, config.projectsBasePath)
  );
})();
