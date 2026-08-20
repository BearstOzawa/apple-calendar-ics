"use strict";

const publishedBase = "https://apple-calendar.lili.uno/";
const selectionStorageKey = "cn-calendar-selected-feeds-v2";
const statusNode = document.querySelector(".copy-status");
const dialog = document.querySelector("[data-subscribe-dialog]");
const previewClock = CalendarPreview.calendarContext();
let statusTimer;
let lunarDays = {};

const colors = {
  "essential.ics": "#de3d32",
  "work-rest.ics": "#684b83",
  "festivals.ics": "#d66b2c",
  "solar-terms.ics": "#bf8626",
  "observances.ics": "#5b708f",
  "holiday-reminders.ics": "#cc5f3b",
  "life-festivals.ics": "#ba506d",
  "lunar-days.ics": "#52705e",
  "seasonal.ics": "#8a6235",
  "moon-phases.ics": "#47749f",
  "sky-events.ics": "#b72f59",
  "almanac.ics": "#9a4fa5",
  "lunar-mansions.ics": "#765d45",
};

const displayOrder = [
  "essential.ics",
  "work-rest.ics",
  "festivals.ics",
  "solar-terms.ics",
  "observances.ics",
  "holiday-reminders.ics",
  "life-festivals.ics",
  "lunar-days.ics",
  "seasonal.ics",
  "moon-phases.ics",
  "sky-events.ics",
  "almanac.ics",
  "lunar-mansions.ics",
];

const fallbackFeeds = {
  "essential.ics": {
    name: "中国日历",
    description: "班休、核心传统节日与二十四节气，已做跨频道去重。",
    cadence: "约每月 3 条",
    density: "低频",
    tier: "core",
    featured: true,
    events_per_year: 36.7,
    sample_titles: ["清明节假期（3天）", "谷雨"],
  },
  "work-rest.ics": {
    name: "中国班休",
    description: "只保留法定放假与调休上班。",
    cadence: "按官方通知更新",
    density: "低频",
    tier: "core",
    featured: true,
    events_per_year: 12,
    sample_titles: ["清明节假期（3天）"],
  },
  "festivals.ics": {
    name: "传统节日",
    description: "除夕、元宵、龙抬头、七夕、中元、重阳等。",
    cadence: "每年约十次",
    density: "低频",
    tier: "core",
    events_per_year: 10,
    sample_titles: ["除夕", "元宵节", "七夕"],
  },
  "solar-terms.ics": {
    name: "二十四节气",
    description: "单独订阅立春、春分、夏至、冬至等节气。",
    cadence: "每月两次",
    density: "低频",
    tier: "core",
    events_per_year: 24,
    sample_titles: ["清明", "谷雨"],
  },
  "observances.ics": {
    name: "公众节日与纪念日",
    description: "妇女节、青年节、教师节与全国性纪念日。",
    cadence: "每年十三次",
    density: "低频",
    tier: "optional",
    events_per_year: 13,
    sample_titles: ["妇女节", "青年节", "教师节"],
  },
  "holiday-reminders.ics": {
    name: "假期提醒",
    description: "每个已确认法定假期开始前 7 天提示一次，不做逐日倒计时。",
    cadence: "每个假期一次",
    density: "低频",
    tier: "optional",
    events_per_year: 6.5,
    sample_titles: ["春节假期还有 7 天"],
  },
  "life-festivals.ics": {
    name: "生活节日",
    description: "母亲节、父亲节、情人节、520、感恩节与圣诞节等常用日期。",
    cadence: "每年九次",
    density: "低频",
    tier: "optional",
    events_per_year: 9,
    sample_titles: ["母亲节", "父亲节", "圣诞节"],
  },
  "lunar-days.ics": {
    name: "农历初一十五",
    description: "每个农历月的初一和十五；不生成每日农历事件。",
    cadence: "每月两次",
    density: "低频",
    tier: "optional",
    events_per_year: 24.7,
    sample_titles: ["四月初一", "四月十五"],
  },
  "seasonal.ics": {
    name: "中国时令",
    description: "七十二候、数九与三伏节点。",
    cadence: "约每五日",
    density: "中频",
    tier: "optional",
    events_per_year: 84,
    sample_titles: ["桐始华", "虹始见", "初伏开始"],
  },
  "moon-phases.ics": {
    name: "月相",
    description: "新月、上弦月、满月与下弦月。",
    cadence: "每月四次",
    density: "低频",
    tier: "optional",
    events_per_year: 49.5,
    sample_titles: ["满月", "下弦月", "新月"],
  },
  "sky-events.ics": {
    name: "重要天象",
    description: "日月食、主要流星雨、冲日与大距。",
    cadence: "不定期",
    density: "低频",
    tier: "optional",
    events_per_year: 23.5,
    sample_titles: ["水星西大距", "天琴座流星雨极大"],
  },
  "almanac.ics": {
    name: "黄历宜忌",
    description: "每天一条宜忌摘要，完整信息在事件详情。",
    cadence: "每天一条",
    density: "高频",
    tier: "dense",
    events_per_year: 365.2,
    sample_titles: ["宜 纳财 · 忌 移徙", "宜 嫁娶 · 忌 开市"],
  },
  "lunar-mansions.ics": {
    name: "二十八星宿",
    description: "每天一条星宿、值星、天神与九星信息。",
    cadence: "每天一条",
    density: "高频",
    tier: "dense",
    events_per_year: 365.2,
    sample_titles: ["轸水蚓 · 吉", "角木蛟 · 吉"],
  },
};

const presets = {
  quiet: ["essential.ics"],
  custom: ["work-rest.ics", "festivals.ics", "solar-terms.ics"],
  sky: ["essential.ics", "seasonal.ics", "moon-phases.ics", "sky-events.ics"],
  life: ["essential.ics", "holiday-reminders.ics", "life-festivals.ics"],
};

const exclusive = {
  "essential.ics": ["work-rest.ics", "festivals.ics", "solar-terms.ics"],
  "work-rest.ics": ["essential.ics"],
  "festivals.ics": ["essential.ics"],
  "solar-terms.ics": ["essential.ics"],
  "almanac.ics": ["lunar-mansions.ics"],
  "lunar-mansions.ics": ["almanac.ics"],
};

let feeds = structuredClone(fallbackFeeds);
let selected = new Set(loadSelection());

function loadSelection() {
  try {
    const value = JSON.parse(window.localStorage.getItem(selectionStorageKey));
    if (Array.isArray(value) && value.every((item) => displayOrder.includes(item))) {
      return value;
    }
  } catch {
    // Storage can be disabled in private browsing.
  }
  return presets.quiet;
}

function saveSelection() {
  try {
    window.localStorage.setItem(selectionStorageKey, JSON.stringify([...selected]));
  } catch {
    // The configurator still works without persistence.
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showStatus(message) {
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.classList.add("visible");
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => statusNode.classList.remove("visible"), 2600);
}

function httpsUrl(filename) {
  return new URL(filename, publishedBase).href;
}

function webcalUrl(filename) {
  const url = new URL(filename, publishedBase);
  return `webcal://${url.host}${url.pathname}`;
}

async function copyUrl(filename) {
  const url = httpsUrl(filename);
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(url);
    showStatus("HTTPS 订阅地址已复制");
    return;
  }
  window.prompt("复制以下订阅地址", url);
}

function feedOption(filename, feed) {
  const checked = selected.has(filename);
  const sample = feed.sample_titles?.[0] || "查看事件示例";
  return `
    <label class="feed-option${checked ? " selected" : ""}" style="--feed-color:${colors[filename]}">
      <input type="checkbox" value="${escapeHtml(filename)}" ${checked ? "checked" : ""} />
      <span class="feed-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8 3 3 7-7" /></svg></span>
      <span class="feed-option-copy">
        <span class="feed-option-title"><strong>${escapeHtml(feed.name)}</strong>${feed.featured ? "<em>推荐</em>" : ""}</span>
        <small>${escapeHtml(feed.description)}</small>
        <span class="feed-option-meta"><b>${escapeHtml(feed.cadence)}</b><i>月视图：${escapeHtml(sample)}</i></span>
      </span>
    </label>`;
}

function renderFeedOptions() {
  for (const container of document.querySelectorAll("[data-feed-tier]")) {
    const tier = container.dataset.feedTier;
    container.innerHTML = displayOrder
      .filter((filename) => feeds[filename]?.tier === tier)
      .map((filename) => feedOption(filename, feeds[filename]))
      .join("");
  }
  for (const input of document.querySelectorAll('.feed-option input[type="checkbox"]')) {
    input.addEventListener("change", () => toggleFeed(input.value, input.checked));
  }
}

function toggleFeed(filename, enabled) {
  if (enabled) {
    selected.add(filename);
    for (const conflict of exclusive[filename] || []) selected.delete(conflict);
  } else {
    selected.delete(filename);
  }
  saveSelection();
  render();
}

function denseEvents(filename) {
  const titles = feeds[filename].sample_titles;
  const daysInMonth = new Date(previewClock.year, previewClock.month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => ({
    key: CalendarPreview.dateKey(previewClock.year, previewClock.month, index + 1),
    title: titles[index % titles.length],
    continuation: false,
  }));
}

function selectedEvents() {
  const result = [];
  for (const filename of displayOrder) {
    if (!selected.has(filename)) continue;
    const definitions = feeds[filename].tier === "dense"
      ? denseEvents(filename)
      : CalendarPreview.expandEvents(
        feeds[filename].preview_events,
        previewClock.year,
        previewClock.month,
      );
    for (const definition of definitions) {
      result.push({ ...definition, filename });
    }
  }
  return result;
}

function dayCell(cell, events) {
  const lunar = cell.currentMonth ? lunarDays[cell.key] || "" : "";
  const lines = events
    .filter((event) => cell.currentMonth && event.key === cell.key)
    .map((event) => `
      <span class="preview-event${event.continuation ? " continuation" : ""}" style="--feed-color:${colors[event.filename]}" title="${escapeHtml(feeds[event.filename].name)}：${escapeHtml(event.title)}">
        ${event.title ? escapeHtml(event.title) : "&nbsp;"}
      </span>`)
    .join("");
  const today = cell.key === previewClock.todayKey;
  return `
    <div class="calendar-day${cell.currentMonth ? "" : " outside"}${today ? " today" : ""}">
      <div class="calendar-date"><span>${escapeHtml(lunar)}</span><b>${cell.day}${cell.currentMonth ? "" : "日"}</b></div>
      <div class="calendar-events">${lines}</div>
    </div>`;
}

function renderCalendar() {
  const events = selectedEvents();
  const grid = document.querySelector("[data-calendar-grid]");
  if (!grid) return;
  document.querySelector("#preview-title").textContent = `${previewClock.year} 年 ${previewClock.month} 月`;
  grid.innerHTML = CalendarPreview.monthCells(previewClock.year, previewClock.month)
    .map((cell) => dayCell(cell, events))
    .join("");

  const eventKeys = [...new Set(events.filter((event) => event.title).map((event) => event.key))].sort();
  const upcoming = eventKeys.filter((key) => key >= previewClock.todayKey);
  const previous = eventKeys.filter((key) => key < previewClock.todayKey).reverse();
  const agendaKeys = [...new Set([previewClock.todayKey, ...upcoming, ...previous])]
    .slice(0, 6)
    .sort();
  const agenda = document.querySelector("[data-mobile-agenda]");
  agenda.innerHTML = agendaKeys
    .map((key) => {
      const [, month, day] = key.split("-").map(Number);
      const dayEvents = events.filter((event) => event.key === key && !event.continuation);
      const lines = dayEvents.length
        ? dayEvents.map((event) => `
            <span class="agenda-event" style="--feed-color:${colors[event.filename]}">
              <i></i><b>${escapeHtml(event.title)}</b><small>${escapeHtml(feeds[event.filename].name)}</small>
            </span>`).join("")
        : '<span class="agenda-empty">没有订阅事件</span>';
      return `<div class="agenda-day${key === previewClock.todayKey ? " today" : ""}"><time><b>${day}</b><span>${month} 月</span></time><div>${lines}</div></div>`;
    })
    .join("");
}

function monthlyCount() {
  return [...selected].reduce((total, filename) => total + (feeds[filename]?.events_per_year || 0) / 12, 0);
}

function renderSummary() {
  const count = selected.size;
  const monthly = monthlyCount();
  for (const node of document.querySelectorAll("[data-selected-count]")) node.textContent = String(count);
  for (const node of document.querySelectorAll("[data-monthly-count]")) node.textContent = String(Math.round(monthly));

  const density = monthly > 28 ? "crowded" : monthly > 12 ? "balanced" : "quiet";
  const densityLabels = { quiet: "清爽", balanced: "适中", crowded: "拥挤" };
  const score = document.querySelector(".density-score");
  score.dataset.density = density;
  const mobileDock = document.querySelector("[data-mobile-selection-dock]");
  if (mobileDock) mobileDock.dataset.density = density;
  for (const node of document.querySelectorAll("[data-density-label], [data-mobile-density-label]")) {
    node.textContent = densityLabels[density];
  }

  const message = document.querySelector("[data-selection-message]");
  if (!count) {
    message.textContent = "还没有选择频道。可以从“清爽推荐”开始。";
  } else if ([...selected].some((filename) => feeds[filename].tier === "dense")) {
    message.textContent = "当前包含每日频道：月视图会在每一天增加一条全天事件。";
  } else if (selected.has("essential.ics")) {
    message.textContent = "“中国日历”已经包含班休、传统节日和二十四节气，不需要重复添加。";
  } else {
    message.textContent = "你正在拆分基础频道，可以为班休、节日和节气分别设置颜色。";
  }

  const legend = document.querySelector("[data-preview-legend]");
  legend.innerHTML = displayOrder
    .filter((filename) => selected.has(filename))
    .map((filename) => `<span style="--feed-color:${colors[filename]}"><i></i>${escapeHtml(feeds[filename].name)}</span>`)
    .join("") || "<span>尚未选择频道</span>";

  const current = [...selected].sort().join(",");
  for (const button of document.querySelectorAll("[data-preset]")) {
    const preset = [...presets[button.dataset.preset]].sort().join(",");
    button.setAttribute("aria-pressed", String(current === preset));
  }
}

function renderSubscriptionList() {
  const list = document.querySelector("[data-subscription-list]");
  const filenames = displayOrder.filter((filename) => selected.has(filename));
  if (!filenames.length) {
    list.innerHTML = '<p class="empty-subscriptions">还没有选择频道。</p>';
    return;
  }
  list.innerHTML = filenames.map((filename, index) => `
    <article class="subscription-row" style="--feed-color:${colors[filename]}">
      <span class="subscription-index">${index + 1}</span>
      <div><strong>${escapeHtml(feeds[filename].name)}</strong><small>${escapeHtml(feeds[filename].cadence)}</small></div>
      <a href="${webcalUrl(filename)}">添加</a>
      <button type="button" data-copy="${escapeHtml(filename)}">复制</button>
    </article>`).join("");
}

function renderDensityDemo() {
  for (const node of document.querySelectorAll("[data-demo-month]")) {
    node.textContent = `${previewClock.year} 年 ${previewClock.month} 月`;
  }
  for (const node of document.querySelectorAll("[data-demo-today]")) {
    node.textContent = String(previewClock.day);
  }
  for (const node of document.querySelectorAll("[data-demo-date]")) {
    node.textContent = `${previewClock.month} 月 ${previewClock.day} 日`;
  }
  const quietEvent = document.querySelector("[data-demo-quiet-event]");
  const currentEvent = feeds["essential.ics"].preview_events?.find(
    (event) => event.start <= previewClock.todayKey && previewClock.todayKey < event.end,
  );
  quietEvent.textContent = currentEvent?.title || "今天没有额外事件";
  quietEvent.classList.toggle("empty", !currentEvent);
}

function render() {
  renderFeedOptions();
  renderDensityDemo();
  renderCalendar();
  renderSummary();
  renderSubscriptionList();
}

for (const button of document.querySelectorAll("[data-preset]")) {
  button.addEventListener("click", () => {
    selected = new Set(presets[button.dataset.preset]);
    saveSelection();
    render();
  });
}

for (const button of document.querySelectorAll("[data-open-subscriptions]")) {
  button.addEventListener("click", () => {
    renderSubscriptionList();
    if (typeof dialog?.showModal === "function") dialog.showModal();
  });
}

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-copy]");
  if (!button) return;
  try {
    await copyUrl(button.dataset.copy);
  } catch {
    window.prompt("复制以下订阅地址", httpsUrl(button.dataset.copy));
  }
});

dialog?.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

const platformTabs = [...document.querySelectorAll("[data-platform]")];
const platformPanels = [...document.querySelectorAll("[data-panel]")];

function activatePlatform(activeTab, moveFocus = false) {
  const platform = activeTab.dataset.platform;
  for (const tab of platformTabs) {
    const active = tab === activeTab;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  }
  for (const panel of platformPanels) panel.hidden = panel.dataset.panel !== platform;
  if (moveFocus) activeTab.focus();
}

for (const [index, tab] of platformTabs.entries()) {
  tab.addEventListener("click", () => activatePlatform(tab));
  tab.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let target = index;
    if (event.key === "ArrowLeft") target = (index - 1 + platformTabs.length) % platformTabs.length;
    if (event.key === "ArrowRight") target = (index + 1) % platformTabs.length;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = platformTabs.length - 1;
    activatePlatform(platformTabs[target], true);
  });
}

render();

fetch("manifest.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    return response.json();
  })
  .then((manifest) => {
    if (manifest.schema_version < 4) throw new Error("manifest schema is outdated");
    feeds = { ...feeds, ...manifest.feeds };
    lunarDays = manifest.calendar_days || {};
    selected = new Set([...selected].filter((filename) => feeds[filename]));
    document.querySelector("[data-work-rest-year]").textContent = manifest.confirmed_work_rest_through;
    document.querySelector("[data-culture-year]").textContent = manifest.culture_years[1];
    document.querySelector("[data-dataset-version]").textContent = manifest.dataset_version.replaceAll("-", ".");
    document.querySelector("[data-channel-count]").textContent = Object.keys(manifest.feeds).length;
    render();
  })
  .catch(() => {
    // The embedded feed catalogue keeps the configurator usable offline.
  });
