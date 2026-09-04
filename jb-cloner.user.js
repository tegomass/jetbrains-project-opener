// ==UserScript==
// @name        Gitlab Jetbrains cloner
// @namespace   tegomass
// @match       https://gitlab.xxx.com/*
// @grant       none
// @version     1.0
// @author      tegomass
// ==/UserScript==

(function() {

  // Local folder where projects are checked out. Update this to match your own setup.
  const PROJECTS_BASE_PATH = 'C:/Users/xxx/Desktop/_PROJECTS';

  // Which IDE buttons to show. Pick any combination of keys from IDE_TYPES below.
  const ENABLED_IDES = ['WS', 'RD'/*, 'PS', 'PC', 'IJ'*/];

  // Supported IDEs: protocol name used by the jb:// URL, and the button label.
  const IDE_TYPES = {
    WS: { protocol: 'webstorm', label: 'WS' },
    RD: { protocol: 'rider', label: 'RD' },
    PS: { protocol: 'phpstorm', label: 'PS' },
    PC: { protocol: 'pycharm', label: 'PC' },
    IJ: { protocol: 'idea', label: 'IJ' },
  };

  const IDEA_LINK_SELECTOR = 'a[href*="jetbrains://idea/checkout/git"][href*="git%40"]';
  const SSH_URL_INPUT_SELECTOR = '#copy-ssh-url-input';
  const CLONE_HOLDER_SELECTOR = '.project-code-holder';
  const BUTTON_CLASS_NAME = 'gl-button btn btn-default shortcuts-find-file';

  // Create a styled gl-button anchor element.
  function createButton(href, text) {
    const button = document.createElement('a');
    button.className = BUTTON_CLASS_NAME;
    button.rel = 'nofollow';
    button.href = href;
    button.textContent = text;
    return button;
  }

  // Extract the project name from the current page URL.
  function getProjectNameFromLocation() {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || '';
  }

  // Get the project's SSH clone URL from the copy-ssh-url input field.
  function getProjectSshUrl() {
    const input = document.querySelector(SSH_URL_INPUT_SELECTOR);
    return input ? input.value : '';
  }

  // Build the jb://open URL for opening the project in the given IDE.
  function buildOpenUrl(ideType, projectName, projectUrl) {
    return `jb://open?path=${PROJECTS_BASE_PATH}/${encodeURIComponent(projectName)}&repo=${projectUrl}&ide=${ideType.protocol}`;
  }

  // Handle the discovered IDEA link: build and insert the enabled IDE buttons.
  function handle(ideaSshLink) {
    const projectUrl = getProjectSshUrl();
    const projectName = getProjectNameFromLocation();

    const cloneHolder = document.querySelector(CLONE_HOLDER_SELECTOR);
    if (!cloneHolder) return;

    ENABLED_IDES.forEach(ideKey => {
      const ideType = IDE_TYPES[ideKey];
      if (!ideType) return;
      const openUrl = buildOpenUrl(ideType, projectName, projectUrl);
      const openButton = createButton(openUrl, ideType.label);
      cloneHolder.parentNode.insertBefore(openButton, cloneHolder);
    });
  }

  // Watch the DOM for the IDEA link to appear, then invoke handle().
  function observeForLink() {
    const existing = document.querySelector(IDEA_LINK_SELECTOR);
    if (existing) return handle(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(IDEA_LINK_SELECTOR);
      if (el) {
        observer.disconnect();
        handle(el);
      }
    });

    observer.observe(document.documentElement, {childList: true, subtree: true});
  }

  observeForLink();

})();

