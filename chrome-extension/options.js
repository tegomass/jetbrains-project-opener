const IDE_TYPES = {
  WS: { protocol: "webstorm", label: "WebStorm (WS)" },
  RD: { protocol: "rider", label: "Rider (RD)" },
  PS: { protocol: "phpstorm", label: "PhpStorm (PS)" },
  PC: { protocol: "pycharm", label: "PyCharm (PC)" },
  IJ: { protocol: "idea", label: "IntelliJ IDEA (IJ)" },
};

const DEFAULT_CONFIG = {
  gitlabDomain: "gitlab.xxx.com",
  projectsBasePath: "C:/Users/xxx/Desktop/_PROJECTS",
  enabledIdes: ["WS", "RD"],
};

const ideListEl = document.getElementById("ideList");
const gitlabDomainEl = document.getElementById("gitlabDomain");
const projectsBasePathEl = document.getElementById("projectsBasePath");
const statusEl = document.getElementById("status");

function renderIdeCheckboxes(enabledIdes) {
  ideListEl.innerHTML = "";
  Object.entries(IDE_TYPES).forEach(([key, ide]) => {
    const label = document.createElement("label");
    label.className = "ide-chip";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = key;
    checkbox.checked = enabledIdes.includes(key);

    const span = document.createElement("span");
    span.textContent = ide.label;

    label.appendChild(checkbox);
    label.appendChild(span);
    ideListEl.appendChild(label);
  });
}

function getSelectedIdes() {
  return Array.from(ideListEl.querySelectorAll("input[type=checkbox]:checked")).map(
    (cb) => cb.value
  );
}

async function load() {
  const config = await chrome.storage.sync.get(DEFAULT_CONFIG);
  gitlabDomainEl.value = config.gitlabDomain;
  projectsBasePathEl.value = config.projectsBasePath;
  renderIdeCheckboxes(config.enabledIdes);
}

async function save() {
  const gitlabDomain = gitlabDomainEl.value.trim();
  const projectsBasePath = projectsBasePathEl.value.trim();
  const enabledIdes = getSelectedIdes();

  if (!gitlabDomain) {
    setStatus("Please enter a GitLab domain.", "error");
    return;
  }

  const origin = `*://${gitlabDomain}/*`;
  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) {
    setStatus("Permission denied — the extension needs access to your GitLab domain to work.", "error");
    return;
  }

  await chrome.storage.sync.set({ gitlabDomain, projectsBasePath, enabledIdes });

  await chrome.runtime.sendMessage({ type: "reregister-content-script", domain: gitlabDomain });

  setStatus("✓ Saved. Reload any open GitLab tabs to apply changes.", "success");
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = type || "";
}

document.getElementById("save").addEventListener("click", save);

load();
