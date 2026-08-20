"use strict";

const fallbackPublishedBase = "https://apple-calendar.lili.uno/";
const isPublishedOrigin =
  window.location.protocol === "https:" &&
  !["localhost", "127.0.0.1"].includes(window.location.hostname);
const publishedBase = isPublishedOrigin
  ? new URL("./", window.location.href).href
  : fallbackPublishedBase;
const statusNode = document.querySelector(".copy-status");
let statusTimer;

const subscriptionBase = new URL(publishedBase);
for (const link of document.querySelectorAll('a[href^="webcal://"]')) {
  const filename = link.getAttribute("href").split("/").pop();
  link.href = `webcal://${subscriptionBase.host}${subscriptionBase.pathname}${filename}`;
}

function showStatus(message) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.classList.add("visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusNode.classList.remove("visible");
  }, 2600);
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
    setText("[data-channel-count]", Object.keys(manifest.feeds).length);
    for (const [filename, feed] of Object.entries(manifest.feeds)) {
      setText(`[data-feed-count="${filename}"]`, feed.event_count);
    }
  })
  .catch(() => {
    // Static fallbacks remain visible when the manifest is unavailable.
  });

function localDateKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDeviceSeed() {
  const fallback = window.TarotTools.randomSeed();
  try {
    const existing = window.localStorage.getItem("cn-calendar-tarot-seed");
    if (existing) return Number(existing);
    window.localStorage.setItem("cn-calendar-tarot-seed", String(fallback));
  } catch {
    // Private browsing or storage policies may disable localStorage.
  }
  return fallback;
}

function downloadCalendar(payload, filename) {
  const blob = new Blob([payload], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

const drawButton = document.querySelector("[data-tarot-draw]");
const dailyDownload = document.querySelector("[data-tarot-daily-download]");
const tarotResult = document.querySelector("[data-tarot-result]");
let dailyCard;

function renderDailyCard(card) {
  if (!tarotResult || !drawButton || !dailyDownload) return;
  tarotResult.querySelector("[data-tarot-symbol]").textContent = card.symbol;
  tarotResult.querySelector("[data-tarot-arcana]").textContent = card.arcana;
  tarotResult.querySelector("[data-tarot-name]").textContent = card.name;
  tarotResult.querySelector("[data-tarot-orientation]").textContent = card.reversed
    ? "逆位"
    : "正位";
  tarotResult.querySelector("[data-tarot-keywords]").textContent = card.keywords;
  tarotResult.querySelector("[data-tarot-reflection]").textContent =
    card.reflection;
  tarotResult.hidden = false;
  dailyDownload.hidden = false;
  drawButton.textContent = "今日牌卡已生成";
  drawButton.disabled = true;
}

drawButton?.addEventListener("click", () => {
  const currentDate = localDateKey();
  dailyCard = window.TarotTools.drawForDate(currentDate, getDeviceSeed());
  renderDailyCard(dailyCard);
});

dailyDownload?.addEventListener("click", () => {
  if (!dailyCard) return;
  const currentDate = localDateKey();
  const payload = window.TarotTools.buildDailyCalendar(dailyCard, currentDate);
  downloadCalendar(payload, `tarot-${currentDate}.ics`);
  showStatus("今日牌卡日历已生成");
});

const studyForm = document.querySelector("[data-tarot-study-form]");
const studyStart = document.querySelector("[data-tarot-study-start]");
if (studyStart) studyStart.value = localDateKey();

studyForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const startDate = studyStart.value;
  if (!startDate) {
    studyStart.focus();
    return;
  }
  const payload = window.TarotTools.buildStudyCalendar(startDate);
  downloadCalendar(payload, `tarot-78-day-study-${startDate}.ics`);
  showStatus("78 日研习日历已生成，共 78 条事件");
});
