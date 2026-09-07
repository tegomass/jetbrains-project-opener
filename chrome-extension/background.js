// Background service worker: keeps the dynamically-registered content script
// in sync with the domain configured in the options page, and seeds default
// settings on first install.

const CONTENT_SCRIPT_ID = "gitlab-jetbrains-opener";

const DEFAULT_CONFIG = {
  gitlabDomain: "gitlab.xxx.com",
  projectsBasePath: "C:/Users/xxx/Desktop/_PROJECTS",
  enabledIdes: ["WS", "RD"],
};

async function registerContentScriptForDomain(domain) {
  if (!domain) return;

  const matches = [`*://${domain}/*`];

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  } catch (e) {
    // Not previously registered; ignore.
  }

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["content.js"],
      matches,
      runAt: "document_idle",
    },
  ]);
}

async function init() {
  const stored = await chrome.storage.sync.get(DEFAULT_CONFIG);
  await chrome.storage.sync.set(stored);

  const hasPermission = await chrome.permissions.contains({
    origins: [`*://${stored.gitlabDomain}/*`],
  });

  if (hasPermission) {
    await registerContentScriptForDomain(stored.gitlabDomain);
  }
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "reregister-content-script") {
    registerContentScriptForDomain(message.domain).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});
