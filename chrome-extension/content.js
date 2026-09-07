// Content script: injects "Open in JetBrains IDE / VS Code" buttons on
// GitLab and GitHub project pages. Configuration (projects root dir, enabled
// IDEs, site domains) is read from chrome.storage.sync, set via the
// extension's options page.

(function () {
  const IDE_TYPES = {
    VSC: { protocol: "vscode", label: "VS Code" },
    WS: { protocol: "webstorm", label: "WS" },
    RD: { protocol: "rider", label: "RD" },
    PS: { protocol: "phpstorm", label: "PS" },
    PC: { protocol: "pycharm", label: "PC" },
    IJ: { protocol: "idea", label: "IJ" },
  };

  // Buttons are always rendered in the canonical order above, regardless of
  // the order IDEs were enabled/saved in, so VS Code (for example) reliably
  // appears before the JetBrains IDEs.
  function orderIdes(enabledIdes) {
    return Object.keys(IDE_TYPES).filter((key) => enabledIdes.includes(key));
  }

  function buildOpenUrl(ideType, projectName, sshUrl, projectsBasePath) {
    return `jb://open?path=${projectsBasePath}/${encodeURIComponent(projectName)}&repo=${sshUrl}&ide=${ideType.protocol}`;
  }

  // ---------------------------------------------------------------------
  // GitLab: inline buttons next to the native clone dropdown.
  // ---------------------------------------------------------------------
  const GITLAB_SSH_URL_INPUT_SELECTOR = "#copy-ssh-url-input";
  const GITLAB_CLONE_HOLDER_SELECTOR = ".project-code-holder";
  const GITLAB_IDEA_LINK_SELECTOR = 'a[href*="jetbrains://idea/checkout/git"][href*="git%40"]';
  const GITLAB_BUTTON_CLASS_NAME = "gl-button btn btn-default shortcuts-find-file";

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

  function runGitlab(enabledIdes, projectsBasePath) {
    function handle() {
      const input = document.querySelector(GITLAB_SSH_URL_INPUT_SELECTOR);
      const sshUrl = input ? input.value : "";
      const projectName = getProjectNameFromSshUrl(sshUrl);

      const cloneHolder = document.querySelector(GITLAB_CLONE_HOLDER_SELECTOR);
      if (!cloneHolder || !sshUrl) return;

      orderIdes(enabledIdes).forEach((ideKey) => {
        const ideType = IDE_TYPES[ideKey];
        if (!ideType) return;
        const openUrl = buildOpenUrl(ideType, projectName, sshUrl, projectsBasePath);
        const button = document.createElement("a");
        button.className = GITLAB_BUTTON_CLASS_NAME;
        button.rel = "nofollow";
        button.href = openUrl;
        button.textContent = ideType.label;
        cloneHolder.parentNode.insertBefore(button, cloneHolder);
      });
    }

    const existing = document.querySelector(GITLAB_IDEA_LINK_SELECTOR);
    if (existing) return handle();

    const observer = new MutationObserver(() => {
      const el = document.querySelector(GITLAB_IDEA_LINK_SELECTOR);
      if (el) {
        observer.disconnect();
        handle();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------------
  // GitHub: a small floating toolbar, since GitHub's native "Code" button
  // is rendered client-side by React with unstable class names, making
  // reliable inline insertion impractical.
  // ---------------------------------------------------------------------
  const GITHUB_EXCLUDED_TOP_SEGMENTS = new Set([
    "settings", "notifications", "marketplace", "explore", "topics", "trending",
    "collections", "sponsors", "orgs", "apps", "about", "pricing", "features",
    "security", "contact", "login", "join", "new", "organizations", "codespaces",
    "issues", "pulls", "dashboard", "search", "watching", "stars",
  ]);

  function getGithubProjectInfo(hostname, pathname) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    const [owner, repo] = segments;
    if (GITHUB_EXCLUDED_TOP_SEGMENTS.has(owner)) return null;

    const projectName = repo.replace(/\.git$/, "");
    const sshUrl = `git@${hostname}:${owner}/${projectName}.git`;
    return { projectName, sshUrl };
  }

  const GITHUB_TOOLBAR_ID = "jb-opener-github-toolbar";

  function injectGithubStyles() {
    if (document.getElementById("jb-opener-github-toolbar-style")) return;
    const style = document.createElement("style");
    style.id = "jb-opener-github-toolbar-style";
    style.textContent = `
      #${GITHUB_TOOLBAR_ID} {
        position: fixed;
        bottom: 18px;
        right: 18px;
        z-index: 2147483647;
        display: flex;
        gap: 6px;
        padding: 6px;
        background: #ffffff;
        border: 1px solid #d0d7de;
        border-radius: 10px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
        font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
      }
      #${GITHUB_TOOLBAR_ID} a {
        display: inline-flex;
        align-items: center;
        padding: 6px 10px;
        border-radius: 6px;
        background: #fc801d;
        color: #fff;
        font-size: 12px;
        font-weight: 600;
        text-decoration: none;
        white-space: nowrap;
      }
      #${GITHUB_TOOLBAR_ID} a:hover {
        background: #e06b0f;
      }
    `;
    document.head.appendChild(style);
  }

  function renderGithubToolbar(enabledIdes, projectsBasePath, projectInfo) {
    document.getElementById(GITHUB_TOOLBAR_ID)?.remove();
    if (!projectInfo) return;

    injectGithubStyles();

    const toolbar = document.createElement("div");
    toolbar.id = GITHUB_TOOLBAR_ID;

    orderIdes(enabledIdes).forEach((ideKey) => {
      const ideType = IDE_TYPES[ideKey];
      if (!ideType) return;
      const openUrl = buildOpenUrl(ideType, projectInfo.projectName, projectInfo.sshUrl, projectsBasePath);
      const link = document.createElement("a");
      link.href = openUrl;
      link.rel = "nofollow";
      link.textContent = ideType.label;
      toolbar.appendChild(link);
    });

    document.body.appendChild(toolbar);
  }

  function runGithub(enabledIdes, projectsBasePath) {
    let lastHref = "";

    function update() {
      if (location.href === lastHref) return;
      lastHref = location.href;
      const projectInfo = getGithubProjectInfo(location.hostname, location.pathname);
      renderGithubToolbar(enabledIdes, projectsBasePath, projectInfo);
    }

    update();
    // GitHub is a single-page app (Turbo) — most navigations don't reload
    // this content script, so poll for URL changes instead of relying on
    // GitHub-internal event names that may change over time.
    setInterval(update, 800);
  }

  // ---------------------------------------------------------------------
  // Entry point: decide which site we're on and dispatch accordingly.
  // ---------------------------------------------------------------------
  const GITHUB_DOMAIN = "github.com";
  const GITLAB_DOMAIN = "gitlab.com";

  function normalizeHostname(hostname) {
    if (!hostname) return "";
    return hostname.toLowerCase().replace(/^www\./, "");
  }

  function resolveSiteType(hostname, config) {
    const host = normalizeHostname(hostname);
    if (config.githubEnabled && host === GITHUB_DOMAIN) return "github";
    if (config.gitlabEnabled && host === GITLAB_DOMAIN) return "gitlab";
    if (config.gitlabCustomDomain && host === normalizeHostname(config.gitlabCustomDomain)) return "gitlab";
    return null;
  }

  chrome.storage.sync.get(
    {
      githubEnabled: true,
      gitlabEnabled: true,
      gitlabCustomDomain: "",
      projectsBasePath: "C:/Users/xxx/Desktop/_PROJECTS",
      enabledIdes: ["VSC"],
    },
    (config) => {
      const siteType = resolveSiteType(location.hostname, config);
      if (siteType === "gitlab") {
        runGitlab(config.enabledIdes, config.projectsBasePath);
      } else if (siteType === "github") {
        runGithub(config.enabledIdes, config.projectsBasePath);
      }
    }
  );
})();
