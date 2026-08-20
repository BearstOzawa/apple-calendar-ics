const publishedBase = "https://bearstozawa.github.io/apple-calendar-ics/";
const statusNode = document.querySelector(".copy-status");
let statusTimer;

function showStatus(message) {
  if (!statusNode) return;

  statusNode.textContent = message;
  statusNode.classList.add("visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusNode.classList.remove("visible");
  }, 2400);
}

async function copyUrl(url) {
  if (!navigator.clipboard || !window.isSecureContext) {
    throw new Error("Clipboard API unavailable");
  }
  await navigator.clipboard.writeText(url);
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const url = new URL(button.dataset.copy, publishedBase).href;
    try {
      await copyUrl(url);
      showStatus("HTTPS 订阅地址已复制");
    } catch {
      window.prompt("复制以下订阅地址", url);
    }
  });
}

const platformTabs = [...document.querySelectorAll("[data-platform]")];
const platformPanels = [...document.querySelectorAll("[data-panel]")];

function activatePlatform(activeTab, moveFocus = false) {
  const platform = activeTab.dataset.platform;

  for (const tab of platformTabs) {
    const isActive = tab === activeTab;
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  }

  for (const panel of platformPanels) {
    panel.hidden = panel.dataset.panel !== platform;
  }

  if (moveFocus) activeTab.focus();
}

for (const [index, tab] of platformTabs.entries()) {
  tab.addEventListener("click", () => activatePlatform(tab));
  tab.addEventListener("keydown", (event) => {
    let targetIndex;
    if (event.key === "ArrowRight") {
      targetIndex = (index + 1) % platformTabs.length;
    } else if (event.key === "ArrowLeft") {
      targetIndex = (index - 1 + platformTabs.length) % platformTabs.length;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = platformTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activatePlatform(platformTabs[targetIndex], true);
  });
}

function setText(selector, value) {
  for (const node of document.querySelectorAll(selector)) {
    node.textContent = value;
  }
}

fetch("manifest.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    return response.json();
  })
  .then((manifest) => {
    setText("[data-work-rest-year]", manifest.confirmed_work_rest_through);
    setText("[data-culture-year]", manifest.culture_years[1]);
    setText(
      "[data-dataset-version]",
      manifest.dataset_version.replaceAll("-", "."),
    );

    for (const [filename, feed] of Object.entries(manifest.feeds)) {
      setText(`[data-feed-count="${filename}"]`, feed.event_count);
    }
  })
  .catch(() => {
    // Static values in the document remain available when the page is offline.
  });
