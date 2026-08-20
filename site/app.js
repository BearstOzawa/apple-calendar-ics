"use strict";

const publishedBase = "https://apple-calendar.lili.uno/";
const selectionStorageKey = "cn-calendar-selected-feeds-v2";
const statusNode = document.querySelector(".copy-status");
const dialog = document.querySelector("[data-subscribe-dialog]");
let statusTimer;

const colors = {
  "essential.ics": "#de3d32",
  "work-rest.ics": "#684b83",
  "festivals.ics": "#d66b2c",
  "solar-terms.ics": "#bf8626",
  "observances.ics": "#5b708f",
  "seasonal.ics": "#8a6235",
  "moon-phases.ics": "#47749f",
  "sky-events.ics": "#b72f59",
  "zodiac-seasons.ics": "#7558a6",
  "almanac.ics": "#9a4fa5",
  "lunar-mansions.ics": "#765d45",
};

const displayOrder = [
  "essential.ics",
  "work-rest.ics",
  "festivals.ics",
  "solar-terms.ics",
  "observances.ics",
  "seasonal.ics",
  "moon-phases.ics",
  "sky-events.ics",
  "zodiac-seasons.ics",
  "almanac.ics",
  "lunar-mansions.ics",
];

const fallbackFeeds = {
  "essential.ics": {
    name: "中国日历・精选",
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
  "zodiac-seasons.ics": {
    name: "星座季节",
    description: "太阳进入十二热带黄道区段的时间。",
    cadence: "每月一次",
    density: "低频",
    tier: "optional",
    events_per_year: 12,
    sample_titles: ["金牛座季节开始"],
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
};

const exclusive = {
  "essential.ics": ["work-rest.ics", "festivals.ics", "solar-terms.ics"],
  "work-rest.ics": ["essential.ics"],
  "festivals.ics": ["essential.ics"],
  "solar-terms.ics": ["essential.ics"],
  "almanac.ics": ["lunar-mansions.ics"],
  "lunar-mansions.ics": ["almanac.ics"],
};

const lunarLabels = [
  "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三",
  "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三月初一", "初二", "初三", "初四",
  "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四",
];

const previewDefinitions = {
  "essential.ics": [
    { day: 4, span: 3, title: "清明节假期（3天）" },
    { day: 20, title: "谷雨" },
  ],
  "work-rest.ics": [{ day: 4, span: 3, title: "清明节假期（3天）" }],
  "festivals.ics": [],
  "solar-terms.ics": [
    { day: 5, title: "清明" },
    { day: 20, title: "谷雨" },
  ],
  "observances.ics": [],
  "seasonal.ics": [
    { day: 5, title: "桐始华" },
    { day: 10, title: "田鼠化为鴽" },
    { day: 15, title: "虹始见" },
    { day: 20, title: "萍始生" },
    { day: 25, title: "鸣鸠拂其羽" },
    { day: 30, title: "戴胜降于桑" },
  ],
  "moon-phases.ics": [
    { day: 2, title: "满月" },
    { day: 10, title: "下弦月" },
    { day: 17, title: "新月" },
    { day: 24, title: "上弦月" },
  ],
  "sky-events.ics": [
    { day: 4, title: "水星西大距" },
    { day: 22, title: "天琴座流星雨极大" },
  ],
  "zodiac-seasons.ics": [{ day: 20, title: "金牛座季节开始" }],
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
  return Array.from({ length: 30 }, (_, index) => ({
    day: index + 1,
    title: titles[index % titles.length],
  }));
}

function selectedEvents() {
  const result = [];
  for (const filename of displayOrder) {
    if (!selected.has(filename)) continue;
    const definitions = feeds[filename].tier === "dense"
      ? denseEvents(filename)
      : previewDefinitions[filename] || [];
    for (const definition of definitions) {
      const span = definition.span || 1;
      for (let offset = 0; offset < span; offset += 1) {
        result.push({
          day: definition.day + offset,
          filename,
          title: offset === 0 ? definition.title : "",
          continuation: offset > 0,
        });
      }
    }
  }
  return result;
}

function dayCell(day, month, events) {
  const inApril = month === 4;
  const lunar = inApril ? lunarLabels[day - 1] : "";
  const lines = events
    .filter((event) => inApril && event.day === day)
    .map((event) => `
      <span class="preview-event${event.continuation ? " continuation" : ""}" style="--feed-color:${colors[event.filename]}" title="${escapeHtml(feeds[event.filename].name)}：${escapeHtml(event.title)}">
        ${event.title ? escapeHtml(event.title) : "&nbsp;"}
      </span>`)
    .join("");
  return `
    <div class="calendar-day${inApril ? "" : " outside"}">
      <div class="calendar-date"><span>${escapeHtml(lunar)}</span><b>${day}${inApril ? "" : "日"}</b></div>
      <div class="calendar-events">${lines}</div>
    </div>`;
}

function renderCalendar() {
  const events = selectedEvents();
  const grid = document.querySelector("[data-calendar-grid]");
  if (!grid) return;
  const cells = [
    dayCell(30, 3, events),
    dayCell(31, 3, events),
    ...Array.from({ length: 30 }, (_, index) => dayCell(index + 1, 4, events)),
    ...Array.from({ length: 10 }, (_, index) => dayCell(index + 1, 5, events)),
  ];
  grid.innerHTML = cells.join("");

  const agendaDays = [4, 10, 17, 20, 22, 24];
  const agenda = document.querySelector("[data-mobile-agenda]");
  agenda.innerHTML = agendaDays
    .map((day) => {
      const dayEvents = events.filter((event) => event.day === day && !event.continuation);
      const lines = dayEvents.length
        ? dayEvents.map((event) => `
            <span class="agenda-event" style="--feed-color:${colors[event.filename]}">
              <i></i><b>${escapeHtml(event.title)}</b><small>${escapeHtml(feeds[event.filename].name)}</small>
            </span>`).join("")
        : '<span class="agenda-empty">没有订阅事件</span>';
      return `<div class="agenda-day"><time><b>${day}</b><span>4 月</span></time><div>${lines}</div></div>`;
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
    message.textContent = "“精选”已经包含班休、传统节日和二十四节气，不需要重复添加。";
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

function render() {
  renderFeedOptions();
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
    if (manifest.schema_version < 3) throw new Error("manifest schema is outdated");
    feeds = { ...feeds, ...manifest.feeds };
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
