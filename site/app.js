const publishedBase = "https://bearstozawa.github.io/apple-calendar-ics/";
const statusNode = document.querySelector(".copy-status");
let statusTimer;

function showStatus(message) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.classList.add("visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(
    () => statusNode.classList.remove("visible"),
    2200,
  );
}

for (const button of document.querySelectorAll("[data-copy]")) {
  button.addEventListener("click", async () => {
    const url = new URL(button.dataset.copy, publishedBase).href;
    try {
      await navigator.clipboard.writeText(url);
      showStatus("订阅地址已复制");
    } catch {
      window.prompt("复制这个订阅地址", url);
    }
  });
}

fetch("manifest.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    return response.json();
  })
  .then((manifest) => {
    document.querySelector("[data-work-rest-year]").textContent =
      manifest.confirmed_work_rest_through;
    document.querySelector("[data-culture-year]").textContent =
      manifest.culture_years[1];
    document.querySelector("[data-dataset-version]").textContent =
      manifest.dataset_version;
    for (const [filename, feed] of Object.entries(manifest.feeds)) {
      const node = document.querySelector(`[data-feed-count="${filename}"]`);
      if (node) node.textContent = feed.event_count;
    }
  })
  .catch(() => {
    // The static fallback values in the HTML remain useful when opened locally.
  });
