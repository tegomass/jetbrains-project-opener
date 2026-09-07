// Background service worker:
// - Keeps the dynamically-registered content script in sync with the
//   domain(s) configured in the options page.
// - Seeds default settings on first install.
// - Draws the toolbar icon dynamically (no static image files needed) and
//   switches it between a colored "active" state (current tab matches a
//   configured GitLab/GitHub domain) and a grey "inactive" state otherwise.

const CONTENT_SCRIPT_ID = "jetbrains-opener";

const GITHUB_DOMAIN = "github.com";
const GITLAB_DOMAIN = "gitlab.com";

const DEFAULT_CONFIG = {
  githubEnabled: true,
  gitlabEnabled: true,
  gitlabCustomDomain: "",
  projectsBasePath: "C:/Users/xxx/Desktop/_PROJECTS",
  enabledIdes: ["VSC"],
};

// Build the list of hostnames the extension should be active on, based on
// the "GitHub"/"GitLab" checkboxes plus an optional self-hosted GitLab domain.
function getConfiguredDomains(config) {
  return [
    config.githubEnabled ? GITHUB_DOMAIN : null,
    config.gitlabEnabled ? GITLAB_DOMAIN : null,
    config.gitlabCustomDomain || null,
  ].filter(Boolean);
}

function domainsToMatches(domains) {
  return domains.filter(Boolean).map((domain) => `*://${domain}/*`);
}

async function registerContentScriptForDomains(domains) {
  const matches = domainsToMatches(domains);

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
  } catch (e) {
    // Not previously registered; ignore.
  }

  if (matches.length === 0) return;

  await chrome.scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["content.js"],
      matches,
      runAt: "document_idle",
    },
  ]);
}

// ---------------------------------------------------------------------
// Dynamic toolbar icon (colored when active on the current tab, grey
// otherwise), drawn at runtime with OffscreenCanvas so no icon asset files
// are needed.
// ---------------------------------------------------------------------
const ICON_SIZES = [16, 32, 48, 128];
const ACTIVE_COLOR = "#fc801d";
const INACTIVE_COLOR = "#9aa1a9";

let iconCache = null;

function buildIconImageData(color) {
  const data = {};
  for (const size of ICON_SIZES) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(size * 0.56)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("J", size / 2, size / 2 + size * 0.02);

    data[size] = ctx.getImageData(0, 0, size, size);
  }
  return data;
}

function getIcons() {
  if (!iconCache) {
    iconCache = {
      active: buildIconImageData(ACTIVE_COLOR),
      inactive: buildIconImageData(INACTIVE_COLOR),
    };
  }
  return iconCache;
}

function normalizeHostname(hostname) {
  if (!hostname) return "";
  return hostname.toLowerCase().replace(/^www\./, "");
}

function isConfiguredDomain(hostname, config) {
  const normalizedHost = normalizeHostname(hostname);
  if (!normalizedHost) return false;
  return getConfiguredDomains(config).some((domain) => normalizeHostname(domain) === normalizedHost);
}

async function refreshIconForTab(tab) {
  if (!tab || !tab.id) return;

  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  const icons = getIcons();

  let hostname = null;
  try {
    hostname = tab.url ? new URL(tab.url).hostname : null;
  } catch (e) {
    hostname = null;
  }

  const active = isConfiguredDomain(hostname, config);
  try {
    await chrome.action.setIcon({ tabId: tab.id, imageData: active ? icons.active : icons.inactive });
  } catch (e) {
    // Tab may have closed already; ignore.
  }
}

async function refreshAllTabIcons() {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => refreshIconForTab(tab)));
}

chrome.tabs.onUpdated.addListener((_tabId, _changeInfo, tab) => {
  refreshIconForTab(tab);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    refreshIconForTab(tab);
  } catch (e) {
    // Tab may have closed already; ignore.
  }
});

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
async function init() {
  const stored = await chrome.storage.sync.get(DEFAULT_CONFIG);
  await chrome.storage.sync.set(stored);

  const icons = getIcons();
  await chrome.action.setIcon({ imageData: icons.inactive });

  const domains = getConfiguredDomains(stored);
  const grantedOrigins = [];

  for (const domain of domains) {
    // github.com and gitlab.com are declared as static host_permissions in
    // the manifest, so they're already granted at install time — only the
    // optional custom GitLab domain needs a runtime permission check.
    if (domain === GITHUB_DOMAIN || domain === GITLAB_DOMAIN) {
      grantedOrigins.push(domain);
      continue;
    }
    const hasPermission = await chrome.permissions.contains({ origins: [`*://${domain}/*`] });
    if (hasPermission) grantedOrigins.push(domain);
  }

  await registerContentScriptForDomains(grantedOrigins);
  await refreshAllTabIcons();
}

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "reregister-content-script") {
    registerContentScriptForDomains(message.domains)
      .then(() => refreshAllTabIcons())
      .then(() => sendResponse({ ok: true }));
    return true; // async response
  }
});
