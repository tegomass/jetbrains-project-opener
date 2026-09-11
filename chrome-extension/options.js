const IDE_TYPES = {
  VSC: { protocol: "vscode", label: "VS Code" },
  WS: { protocol: "webstorm", label: "WebStorm (WS)" },
  RD: { protocol: "rider", label: "Rider (RD)" },
  PS: { protocol: "phpstorm", label: "PhpStorm (PS)" },
  PC: { protocol: "pycharm", label: "PyCharm (PC)" },
  IJ: { protocol: "idea", label: "IntelliJ IDEA (IJ)" },
};

const GITHUB_DOMAIN = "github.com";
const GITLAB_DOMAIN = "gitlab.com";

const DEFAULT_CONFIG = {
  githubEnabled: true,
  gitlabEnabled: true,
  gitlabCustomDomain: "",
  projectsBasePath: "C:/Users/xxx/Desktop/_PROJECTS",
  enabledIdes: ["VSC"],
};

const PRIMARY_IDE_KEYS = ["VSC", "WS"];
const OTHER_IDE_KEYS = ["RD", "PS", "PC", "IJ"];

const ideListEl = document.getElementById("ideList");
const othersGroupEl = document.getElementById("othersGroup");
const githubEnabledEl = document.getElementById("githubEnabled");
const gitlabEnabledEl = document.getElementById("gitlabEnabled");
const gitlabCustomDomainEl = document.getElementById("gitlabCustomDomain");
const projectsBasePathEl = document.getElementById("projectsBasePath");
const statusEl = document.getElementById("status");

function createIdeChip(key, enabledIdes) {
  const ide = IDE_TYPES[key];
  const label = document.createElement("label");
  label.className = "ide-chip";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.value = key;
  checkbox.checked = enabledIdes.includes(key);
  checkbox.addEventListener("change", save);

  const span = document.createElement("span");
  span.textContent = ide.label;

  label.appendChild(checkbox);
  label.appendChild(span);
  return label;
}

function renderIdeCheckboxes(enabledIdes) {
  ideListEl.innerHTML = "";
  othersGroupEl.innerHTML = "";

  PRIMARY_IDE_KEYS.forEach((key) => ideListEl.appendChild(createIdeChip(key, enabledIdes)));

  const othersToggle = document.createElement("button");
  othersToggle.type = "button";
  othersToggle.className = "ide-chip-toggle";
  othersToggle.id = "othersToggle";
  ideListEl.appendChild(othersToggle);

  OTHER_IDE_KEYS.forEach((key) => othersGroupEl.appendChild(createIdeChip(key, enabledIdes)));

  const anyOtherEnabled = OTHER_IDE_KEYS.some((key) => enabledIdes.includes(key));
  setOthersExpanded(anyOtherEnabled);

  othersToggle.addEventListener("click", () => {
    setOthersExpanded(othersGroupEl.style.display === "none");
  });
}

function setOthersExpanded(expanded) {
  othersGroupEl.style.display = expanded ? "flex" : "none";
  const othersToggle = document.getElementById("othersToggle");
  othersToggle.textContent = "Others";
  othersToggle.classList.toggle("expanded", expanded);
}

function getSelectedIdes() {
  return Array.from(
    document.querySelectorAll("#ideList input[type=checkbox]:checked, #othersGroup input[type=checkbox]:checked")
  ).map((cb) => cb.value);
}

function normalizeDomainInput(value) {
  if (!value) return "";
  let domain = value.trim();
  // Strip protocol (http://, https://, or a bare "//").
  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/^\/\//, "");
  // Drop any path/query/hash and trailing slashes, keep just host[:port].
  domain = domain.split(/[/?#]/)[0];
  // Drop trailing dot and any accidental whitespace.
  domain = domain.replace(/\.$/, "").trim();
  return domain;
}

async function load() {
  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  githubEnabledEl.checked = config.githubEnabled;
  gitlabEnabledEl.checked = config.gitlabEnabled;
  gitlabCustomDomainEl.value = normalizeDomainInput(config.gitlabCustomDomain);
  projectsBasePathEl.value = config.projectsBasePath;
  renderIdeCheckboxes(config.enabledIdes);
}

gitlabCustomDomainEl.addEventListener("blur", () => {
  gitlabCustomDomainEl.value = normalizeDomainInput(gitlabCustomDomainEl.value);
  save();
});

githubEnabledEl.addEventListener("change", save);
gitlabEnabledEl.addEventListener("change", save);

// Debounce the free-text base path field so we don't save on every
// keystroke, but still auto-save shortly after the user stops typing —
// no explicit "Save changes" click required.
function debounce(fn, delayMs) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

projectsBasePathEl.addEventListener("input", debounce(save, 600));

async function save() {
  const githubEnabled = githubEnabledEl.checked;
  const gitlabEnabled = gitlabEnabledEl.checked;
  const gitlabCustomDomain = normalizeDomainInput(gitlabCustomDomainEl.value);
  gitlabCustomDomainEl.value = gitlabCustomDomain;
  const projectsBasePath = projectsBasePathEl.value.trim();
  const enabledIdes = getSelectedIdes();

  const domains = [
    githubEnabled ? GITHUB_DOMAIN : null,
    gitlabEnabled ? GITLAB_DOMAIN : null,
    gitlabCustomDomain || null,
  ].filter(Boolean);

  if (domains.length === 0) {
    setStatus("Please enable at least one site (GitHub and/or GitLab).", "error");
    return;
  }

  // Persist settings before requesting the optional permission below: that
  // request opens a native Chrome dialog which steals focus and can close
  // this popup mid-flight, killing its JS context. Saving first means the
  // typed values survive even if that happens, instead of resetting to
  // whatever was last saved.
  await chrome.storage.sync.set({
    githubEnabled,
    gitlabEnabled,
    gitlabCustomDomain,
    projectsBasePath,
    enabledIdes,
  });

  // github.com/gitlab.com are already granted via static host_permissions in
  // the manifest — only the optional custom GitLab domain needs a runtime
  // permission request.
  if (gitlabCustomDomain) {
    const granted = await chrome.permissions.request({ origins: [`*://${gitlabCustomDomain}/*`] });
    if (!granted) {
      setStatus("Permission denied — the extension needs access to this domain to work.", "error");
      return;
    }
  }

  await chrome.runtime.sendMessage({ type: "reregister-content-script", domains });

  setStatus("✓ Saved. Reload any open GitLab/GitHub tabs to apply changes.", "success");
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

document.getElementById("save").addEventListener("click", save);

load();
