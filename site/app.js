"use strict";

const publishedBase = "https://apple-calendar.lili.uno/";
const selectionStorageKey = "cn-calendar-selected-feeds-v2";
const themeStorageKey = "cn-calendar-theme";

const statusNode = document.querySelector(".copy-status");
const subscribeDialog = document.querySelector("[data-subscribe-dialog]");
const helpDialog = document.querySelector("[data-help-dialog]");
const popover = document.querySelector("[data-event-popover]");
const previewClock = CalendarPreview.calendarContext();

let viewYear = previewClock.year;
let viewMonth = previewClock.month;
let activeMobileDayKey = previewClock.todayKey;
let statusTimer;
let lunarDays = {};
let officialBadges = {};
let densePreviewCache = null;
let densePreviewLoading = false;
const eventRegistry = new Map();
const dayEventsRegistry = new Map();
const addedSplitFeeds = new Set();

const colors = {
  "essential.ics": "#DE3D32",
  "work-rest.ics": "#684B83",
  "festivals.ics": "#D66B2C",
  "solar-terms.ics": "#BF8626",
  "observances.ics": "#5B708F",
  "holiday-reminders.ics": "#CC5F3B",
  "life-festivals.ics": "#BA506D",
  "lunar-days.ics": "#52705E",
  "seasonal.ics": "#8A6235",
  "moon-phases.ics": "#47749F",
  "sky-events.ics": "#B72F59",
  "almanac.ics": "#9A4FA5",
  "lunar-mansions.ics": "#765D45",
};

const bundlePalette = [
  "#DE3D32",
  "#D66B2C",
  "#BF8626",
  "#2F7D57",
  "#47749F",
  "#684B83",
  "#BA506D",
];

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

// Consumer-facing concise labels & summaries (kept independent of backend ICS metadata)
const uiCatalog = {
  "essential.ics": {
    name: "中国日历",
    summary: "放假调休、传统节日与二十四节气",
    tier: "core",
    featured: true,
    sample_titles: ["春节假期（9天）", "立春"],
  },
  "work-rest.ics": {
    name: "法定班休",
    summary: "国务院放假与周末调休上班",
    tier: "core",
    sample_titles: ["春节假期（9天）"],
  },
  "festivals.ics": {
    name: "传统节日",
    summary: "除夕、元宵、端午、七夕、中秋、重阳等",
    tier: "core",
    sample_titles: ["除夕", "元宵节", "七夕"],
  },
  "solar-terms.ics": {
    name: "二十四节气",
    summary: "立春、雨水、春分、夏至、冬至等",
    tier: "core",
    sample_titles: ["立春", "雨水"],
  },
  "observances.ics": {
    name: "纪念日与节日",
    summary: "妇女节、青年节、儿童节、教师节等",
    tier: "optional",
    sample_titles: ["妇女节", "青年节", "教师节"],
  },
  "holiday-reminders.ics": {
    name: "长假提前提醒",
    summary: "每次法定假期开始前 7 天提醒",
    tier: "optional",
    sample_titles: ["春节假期还有 7 天"],
  },
  "life-festivals.ics": {
    name: "生活节日",
    summary: "情人节、母亲节、父亲节、感恩节、圣诞节等",
    tier: "optional",
    sample_titles: ["情人节", "母亲节", "圣诞节"],
  },
  "lunar-days.ics": {
    name: "农历初一十五",
    summary: "每个农历月的初一与十五",
    tier: "optional",
    sample_titles: ["正月初一", "正月十五"],
  },
  "seasonal.ics": {
    name: "传统时令",
    summary: "七十二候、数九与三伏",
    tier: "optional",
    sample_titles: ["东风解冻", "初伏开始"],
  },
  "moon-phases.ics": {
    name: "月相",
    summary: "新月、上弦月、满月、下弦月",
    tier: "optional",
    sample_titles: ["满月", "上弦月", "新月"],
  },
  "sky-events.ics": {
    name: "重要天象",
    summary: "日月食、流星雨、行星冲日与大距",
    tier: "optional",
    sample_titles: ["双子座流星雨极大", "木星冲日"],
  },
  "almanac.ics": {
    name: "黄历宜忌",
    summary: "每日宜忌、冲煞与吉神方位",
    tier: "dense",
    sample_titles: ["宜 祭祀 · 忌 动土", "宜 纳财 · 忌 移徙"],
  },
  "lunar-mansions.ics": {
    name: "二十八星宿",
    summary: "每日值宿与吉凶参考",
    tier: "dense",
    sample_titles: ["角木蛟 · 吉", "轸水蚓 · 吉"],
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

let feeds = structuredClone(uiCatalog);
let selected = new Set(loadSelection());
let bundleState = {
  name: "",
  color: "#DE3D32",
  remind: "",
  colorTouched: false,
};

function loadSelection() {
  try {
    const value = JSON.parse(window.localStorage.getItem(selectionStorageKey));
    if (Array.isArray(value) && value.length && value.every((item) => displayOrder.includes(item))) {
      return value;
    }
  } catch {
    // Ignore storage errors.
  }
  return presets.quiet;
}

function saveSelection() {
  try {
    window.localStorage.setItem(selectionStorageKey, JSON.stringify([...selected]));
  } catch {
    // Ignore storage errors.
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
  statusTimer = window.setTimeout(() => statusNode.classList.remove("visible"), 2200);
}

async function copyText(text, successMessage = "链接已复制") {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      showStatus(successMessage);
      return;
    }
  } catch {
    // Fall back below.
  }
  window.prompt("复制订阅链接", text);
}

function feedHttpsUrl(filename) {
  return new URL(filename, publishedBase).href;
}

function feedWebcalUrl(filename) {
  const url = new URL(filename, publishedBase);
  return `webcal://${url.host}${url.pathname}`;
}

function syncDefaultBundleColor() {
  if (bundleState.colorTouched) return;
  const first = displayOrder.find((item) => selected.has(item));
  bundleState.color = first ? colors[first] : "#DE3D32";
}

function buildBundleUrls() {
  const filenames = displayOrder.filter((item) => selected.has(item));
  if (!filenames.length) return null;

  const trimmedName = bundleState.name.trim();
  const singleFeed = filenames.length === 1 ? filenames[0] : null;
  const isDefaultSingle =
    singleFeed &&
    !trimmedName &&
    !bundleState.remind &&
    bundleState.color.toUpperCase() === colors[singleFeed].toUpperCase();

  if (isDefaultSingle) {
    return {
      https: feedHttpsUrl(singleFeed),
      webcal: feedWebcalUrl(singleFeed),
      download: singleFeed,
    };
  }

  const slugs = filenames.map((item) => item.replace(/\.ics$/, ""));
  const prodUrl = new URL("bundle.ics", publishedBase);
  prodUrl.searchParams.set("feeds", slugs.join(","));
  if (trimmedName) prodUrl.searchParams.set("name", trimmedName);
  const defaultPrimaryColor = colors[filenames[0]].toUpperCase();
  if (bundleState.color.toUpperCase() !== defaultPrimaryColor) {
    prodUrl.searchParams.set("color", bundleState.color.toUpperCase());
  }
  if (bundleState.remind) {
    prodUrl.searchParams.set("remind", bundleState.remind);
  }

  const dlUrl = new URL(prodUrl.href);
  dlUrl.searchParams.set("download", "1");
  return {
    https: prodUrl.href,
    webcal: `webcal://${prodUrl.host}${prodUrl.pathname}${prodUrl.search}`,
    download: dlUrl.href,
  };
}

/* Theme */
function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  const meta = document.querySelector("[data-theme-meta]");
  if (meta) meta.setAttribute("content", mode === "dark" ? "#0b0c0f" : "#f5f6f8");
}

document.querySelector("[data-theme-toggle]")?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    window.localStorage.setItem(themeStorageKey, next);
  } catch {}
});

/* Dense Preview Lazy Loader */
function ensureDensePreviewLoaded() {
  if (densePreviewCache || densePreviewLoading) return;
  const hasDenseSelected = [...selected].some((item) => feeds[item]?.tier === "dense");
  if (!hasDenseSelected) return;
  densePreviewLoading = true;
  fetch("dense-preview.json")
    .then((res) => (res.ok ? res.json() : null))
    .then((payload) => {
      if (payload) {
        densePreviewCache = payload;
        renderCalendar();
      }
    })
    .catch(() => {})
    .finally(() => {
      densePreviewLoading = false;
    });
}

function denseEventsForMonth(filename, year, month) {
  const titles = feeds[filename].sample_titles || ["每日日程"];
  const cells = CalendarPreview.monthCells(year, month);
  const feedLookup = densePreviewCache?.[filename] || null;

  return cells.map((cell, index) => {
    const entry = feedLookup?.[cell.key];
    const nextDay = new Date(cell.year, cell.month - 1, cell.day + 1, 12);
    const endKey = CalendarPreview.dateKey(
      nextDay.getFullYear(),
      nextDay.getMonth() + 1,
      nextDay.getDate(),
    );
    return {
      uid: `dense-${filename}-${cell.key}`,
      start: cell.key,
      end: endKey,
      title: entry ? entry[0] : titles[index % titles.length],
      description: entry ? entry[1] : feeds[filename].summary,
      filename,
    };
  });
}

function collectSelectedEvents() {
  const raw = [];
  for (const filename of displayOrder) {
    if (!selected.has(filename)) continue;
    const feed = feeds[filename];
    if (!feed) continue;
    if (feed.tier === "dense") {
      for (const item of denseEventsForMonth(filename, viewYear, viewMonth)) {
        raw.push(item);
      }
    } else {
      for (const [idx, ev] of (feed.preview_events || []).entries()) {
        raw.push({
          uid: `${filename}-${idx}-${ev.start}`,
          start: ev.start,
          end: ev.end,
          title: ev.title,
          description: ev.description || feed.summary,
          filename,
        });
      }
    }
  }
  return raw;
}

/* Channel List */
function renderFeedOption(filename, feed) {
  const checked = selected.has(filename);
  const color = feed.color || colors[filename];
  return `
    <label class="feed-option${checked ? " selected" : ""}" style="--feed-color:${escapeHtml(color)}">
      <input type="checkbox" value="${escapeHtml(filename)}" ${checked ? "checked" : ""} />
      <span class="feed-check" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3.2 8.2 3 3 6.6-6.6" /></svg></span>
      <span class="feed-option-body">
        <span class="feed-option-title">
          <i class="feed-dot" aria-hidden="true"></i>
          <strong>${escapeHtml(feed.name)}</strong>
          ${feed.featured ? "<em>推荐</em>" : ""}
        </span>
        <small>${escapeHtml(feed.summary)}</small>
      </span>
    </label>`;
}

function renderFeedOptions() {
  for (const container of document.querySelectorAll("[data-feed-tier]")) {
    const tier = container.dataset.feedTier;
    container.innerHTML = displayOrder
      .filter((filename) => feeds[filename]?.tier === tier)
      .map((filename) => renderFeedOption(filename, feeds[filename]))
      .join("");
  }
  for (const input of document.querySelectorAll('.feed-option input[type="checkbox"]')) {
    input.addEventListener("change", () => toggleFeed(input.value, input.checked));
  }
  const denseDetails = document.querySelector("[data-dense-details]");
  if (denseDetails && [...selected].some((item) => feeds[item]?.tier === "dense")) {
    denseDetails.open = true;
  }
}

function toggleFeed(filename, enabled) {
  if (enabled) {
    selected.add(filename);
    for (const conflict of exclusive[filename] || []) selected.delete(conflict);
  } else {
    selected.delete(filename);
  }
  syncDefaultBundleColor();
  saveSelection();
  hidePopover();
  ensureDensePreviewLoaded();
  render();
}

/* Calendar Grid */
function showOfficialBadges() {
  return selected.has("essential.ics") || selected.has("work-rest.ics");
}

function renderBadgeHtml(dateKey) {
  if (!showOfficialBadges()) return "";
  const mark = officialBadges[dateKey];
  if (mark === "休") return '<i class="tag-rest">休</i>';
  if (mark === "班") return '<i class="tag-work">班</i>';
  return "";
}

function renderCalendar() {
  const titleNode = document.querySelector("#preview-title");
  if (titleNode) titleNode.textContent = `${viewYear} 年 ${viewMonth} 月`;

  const monthKey = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
  for (const btn of document.querySelectorAll("[data-jump-month]")) {
    btn.classList.toggle("active", btn.dataset.jumpMonth === monthKey);
  }

  const events = collectSelectedEvents();
  const weeks = CalendarPreview.layoutMonthWeeks(viewYear, viewMonth, events, 3);

  eventRegistry.clear();
  dayEventsRegistry.clear();

  const grid = document.querySelector("[data-calendar-grid]");
  if (grid) {
    grid.innerHTML = weeks
      .map((week) => {
        const bgCells = week.cells
          .map((cell) => {
            dayEventsRegistry.set(cell.key, week.eventsByKey[cell.key] || []);
            const lunar = lunarDays[cell.key] || "";
            const isSpecialLunar = lunar === "除夕" || lunar === "春节";
            const isToday = cell.key === previewClock.todayKey;
            const classes = [
              "week-day-cell",
              cell.currentMonth ? "" : "outside",
              cell.isWeekend ? "weekend" : "",
              isToday ? "today" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return `
              <div class="${classes}">
                <div class="day-head">
                  <span class="day-lunar${isSpecialLunar ? " special" : ""}">${escapeHtml(lunar)}</span>
                  <span class="day-num-group">
                    ${renderBadgeHtml(cell.key)}
                    <b class="day-num">${cell.day}</b>
                  </span>
                </div>
              </div>`;
          })
          .join("");

        const segHtml = week.segments
          .map((seg) => {
            eventRegistry.set(seg.event.uid, seg.event);
            const feedColor = feeds[seg.event.filename]?.color || colors[seg.event.filename];
            const classes = [
              "event-segment",
              seg.continuesLeft ? "continues-left" : "",
              seg.continuesRight ? "continues-right" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `
              <button
                type="button"
                class="${classes}"
                data-event-uid="${escapeHtml(seg.event.uid)}"
                style="--feed-color:${escapeHtml(feedColor)};grid-column:${seg.colStart + 1} / span ${seg.colSpan};grid-row:${seg.lane + 1}"
              >
                ${escapeHtml(seg.event.title)}
              </button>`;
          })
          .join("");

        const overflowHtml = week.overflowByCol
          .map((count, colIndex) => {
            if (!count) return "";
            const cellKey = week.cells[colIndex].key;
            return `
              <button
                type="button"
                class="event-overflow"
                data-overflow-day="${escapeHtml(cellKey)}"
                style="grid-column:${colIndex + 1};grid-row:4"
              >
                +${count} 项
              </button>`;
          })
          .join("");

        return `
          <div class="calendar-week">
            <div class="week-days-bg">${bgCells}</div>
            <div class="week-events-layer">${segHtml}${overflowHtml}</div>
          </div>`;
      })
      .join("");
  }

  renderMobileCalendar(weeks);
}

function renderMobileCalendar(weeks) {
  const miniGrid = document.querySelector("[data-mobile-mini-grid]");
  const agenda = document.querySelector("[data-mobile-agenda]");
  if (!miniGrid || !agenda) return;

  const allCells = weeks.flatMap((w) => w.cells);
  if (!allCells.some((c) => c.key === activeMobileDayKey && c.currentMonth)) {
    const fallbackToday = allCells.find((c) => c.key === previewClock.todayKey && c.currentMonth);
    const firstWithEvent = allCells.find((c) => c.currentMonth && (dayEventsRegistry.get(c.key)?.length || 0) > 0);
    const firstCurrent = allCells.find((c) => c.currentMonth);
    activeMobileDayKey = (fallbackToday || firstWithEvent || firstCurrent || allCells[0]).key;
  }

  miniGrid.innerHTML = allCells
    .map((cell) => {
      const dayEvents = dayEventsRegistry.get(cell.key) || [];
      for (const ev of dayEvents) eventRegistry.set(ev.uid, ev);
      const uniqueColors = [...new Set(dayEvents.map((ev) => feeds[ev.filename]?.color || colors[ev.filename]))].slice(0, 3);
      const dots = uniqueColors
        .map((c) => `<i style="--feed-color:${escapeHtml(c)}"></i>`)
        .join("");
      const lunar = lunarDays[cell.key] || "";
      const classes = [
        "mini-day-btn",
        cell.currentMonth ? "" : "outside",
        cell.key === previewClock.todayKey ? "today" : "",
        cell.key === activeMobileDayKey ? "selected" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button type="button" class="${classes}" data-mobile-day="${escapeHtml(cell.key)}">
          <span class="mini-day-top"><b>${cell.day}</b></span>
          <span class="mini-day-lunar">${escapeHtml(lunar)}</span>
          <span class="mini-dots">${dots}</span>
        </button>`;
    })
    .join("");

  const currentMonthCells = allCells.filter((c) => c.currentMonth);
  const startEventDays = currentMonthCells
    .map((c) => c.key)
    .filter((key) => (dayEventsRegistry.get(key) || []).some((ev) => ev.start === key));
  const orderedKeys = [
    ...new Set([
      activeMobileDayKey,
      ...startEventDays.filter((k) => k > activeMobileDayKey),
      ...startEventDays.filter((k) => k < activeMobileDayKey),
    ]),
  ].slice(0, 7);

  agenda.innerHTML = orderedKeys
    .map((key) => {
      const [, m, d] = key.split("-").map(Number);
      const list = dayEventsRegistry.get(key) || [];
      const lunar = lunarDays[key] || "";
      const rows = list.length
        ? list
            .map((ev) => {
              const feedColor = feeds[ev.filename]?.color || colors[ev.filename];
              const feedName = feeds[ev.filename]?.name || "";
              return `
                <button type="button" class="agenda-event" data-event-uid="${escapeHtml(ev.uid)}" style="--feed-color:${escapeHtml(feedColor)}">
                  <b>${escapeHtml(ev.title)}</b>
                  <small>${escapeHtml(feedName)}</small>
                </button>`;
            })
            .join("")
        : '<span class="agenda-empty">无日程</span>';

      return `
        <div class="agenda-day">
          <time><b>${d}</b><span>${m}月 · ${escapeHtml(lunar)}</span></time>
          <div class="agenda-events">${rows}</div>
        </div>`;
    })
    .join("");
}

/* Popover */
function formatRangeLabel(ev) {
  const [sy, sm, sd] = ev.start.split("-").map(Number);
  const endInc = ev.endInclusive || CalendarPreview.inclusiveEndKey(ev.end);
  const [ey, em, ed] = endInc.split("-").map(Number);
  if (ev.start === endInc) {
    return `${sy}年${sm}月${sd}日`;
  }
  const span = ev.spanDays || 2;
  if (sy === ey && sm === em) {
    return `${sy}年${sm}月${sd}日 – ${ed}日（共 ${span} 天）`;
  }
  return `${sy}年${sm}月${sd}日 – ${ey}年${em}月${ed}日（共 ${span} 天）`;
}

function cleanEventDescription(rawText) {
  return String(rawText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("这是全天提示") &&
        !line.startsWith("本频道用于日期识别") &&
        !line.startsWith("官方通知：") &&
        !line.startsWith("文号：") &&
        !line.startsWith("依据："),
    );
}

function positionPopover(anchorRect) {
  if (!popover) return;
  const popWidth = Math.min(window.innerWidth - 24, 320);
  let left = anchorRect.left + anchorRect.width / 2 - popWidth / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - popWidth - 12));

  let top = anchorRect.bottom + 8;
  const estimatedHeight = popover.offsetHeight || 170;
  if (top + estimatedHeight > window.innerHeight - 12) {
    top = Math.max(12, anchorRect.top - estimatedHeight - 8);
  }
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function openEventPopover(ev, anchorEl) {
  if (!popover || !ev) return;
  const feed = feeds[ev.filename];
  const color = feed?.color || colors[ev.filename] || "#DE3D32";
  popover.querySelector("[data-popover-dot]").style.background = color;
  popover.querySelector("[data-popover-title]").textContent = ev.title;
  popover.querySelector("[data-popover-meta]").textContent = feed?.name || "中国日历";
  popover.querySelector("[data-popover-range]").textContent = formatRangeLabel(ev);

  const lines = cleanEventDescription(ev.description);
  const bodyNode = popover.querySelector("[data-popover-body]");
  bodyNode.hidden = lines.length === 0;
  bodyNode.innerHTML = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");

  popover.hidden = false;
  positionPopover(anchorEl.getBoundingClientRect());
}

function openDayOverflowPopover(dayKey, anchorEl) {
  const list = dayEventsRegistry.get(dayKey) || [];
  if (!list.length || !popover) return;
  const [y, m, d] = dayKey.split("-").map(Number);
  popover.querySelector("[data-popover-dot]").style.background = "var(--accent)";
  popover.querySelector("[data-popover-title]").textContent = `${m}月${d}日`;
  popover.querySelector("[data-popover-meta]").textContent = `农历${lunarDays[dayKey] || ""}`;
  popover.querySelector("[data-popover-range]").textContent = `共 ${list.length} 项日程`;
  const bodyNode = popover.querySelector("[data-popover-body]");
  bodyNode.hidden = false;
  bodyNode.innerHTML = list
    .map((ev) => `<p><strong>${escapeHtml(ev.title)}</strong> · ${escapeHtml(feeds[ev.filename]?.name || "")}</p>`)
    .join("");

  popover.hidden = false;
  positionPopover(anchorEl.getBoundingClientRect());
}

function hidePopover() {
  if (popover) popover.hidden = true;
}

/* Summary & Subscribe Dialog */
function renderSummary() {
  const filenames = displayOrder.filter((filename) => selected.has(filename));
  const count = filenames.length;

  for (const node of document.querySelectorAll("[data-selected-count]")) {
    node.textContent = String(count);
  }

  const mobileNames = document.querySelector("[data-mobile-names]");
  if (mobileNames) {
    mobileNames.textContent = filenames.length
      ? filenames.map((fn) => feeds[fn].name).join("、")
      : "未选择日历";
  }

  const legend = document.querySelector("[data-preview-legend]");
  if (legend) {
    legend.innerHTML =
      filenames
        .map((filename) => {
          const c = feeds[filename]?.color || colors[filename];
          return `<span style="--feed-color:${escapeHtml(c)}"><i></i>${escapeHtml(feeds[filename].name)}</span>`;
        })
        .join("") || "<span>请在左侧勾选要订阅的内容</span>";
  }

  const current = [...selected].sort().join(",");
  for (const button of document.querySelectorAll("[data-preset]")) {
    const preset = [...presets[button.dataset.preset]].sort().join(",");
    button.setAttribute("aria-pressed", String(current === preset));
  }
}

function renderSubscriptionDialog() {
  const filenames = displayOrder.filter((filename) => selected.has(filename));
  const tabsBar = document.querySelector("[data-sub-tabs]");
  const chipsNode = document.querySelector("[data-bundle-chips]");
  const swatchesNode = document.querySelector("[data-bundle-colors]");
  const webcalBtn = document.querySelector("[data-bundle-webcal]");
  const downloadBtn = document.querySelector("[data-bundle-download]");
  const qrContainer = document.querySelector("[data-qr-container]");
  const splitList = document.querySelector("[data-subscription-list]");

  // Hide mode switcher when only 1 channel is selected
  if (tabsBar) {
    tabsBar.hidden = filenames.length <= 1;
    if (filenames.length <= 1) {
      for (const tab of document.querySelectorAll("[data-sub-mode]")) {
        tab.setAttribute("aria-selected", String(tab.dataset.subMode === "bundle"));
      }
      for (const panel of document.querySelectorAll("[data-sub-panel]")) {
        panel.hidden = panel.dataset.subPanel !== "bundle";
      }
    }
  }

  if (chipsNode) {
    chipsNode.innerHTML = filenames.length
      ? filenames
          .map((fn) => {
            const c = feeds[fn]?.color || colors[fn];
            return `<span class="bundle-chip" style="--feed-color:${escapeHtml(c)}"><i></i>${escapeHtml(feeds[fn].name)}</span>`;
          })
          .join("")
      : '<span class="bundle-chip">未选择</span>';
  }

  if (swatchesNode) {
    swatchesNode.innerHTML = bundlePalette
      .map((hex) => {
        const active = hex.toUpperCase() === bundleState.color.toUpperCase();
        return `<button type="button" class="swatch-btn" role="radio" aria-checked="${active}" data-swatch="${hex}" style="--swatch:${hex}" aria-label="颜色"></button>`;
      })
      .join("");
  }

  for (const btn of document.querySelectorAll("[data-remind-val]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.remindVal === bundleState.remind));
  }

  const urls = buildBundleUrls();
  if (urls) {
    if (webcalBtn) webcalBtn.href = urls.webcal;
    if (downloadBtn) downloadBtn.href = urls.download;
    if (qrContainer && typeof QrSvg !== "undefined") {
      try {
        qrContainer.innerHTML = QrSvg.renderSvg(urls.webcal);
      } catch {
        qrContainer.innerHTML = "";
      }
    }
  } else if (qrContainer) {
    qrContainer.innerHTML = "";
  }

  if (splitList) {
    splitList.innerHTML = filenames.length
      ? filenames
          .map((fn) => {
            const c = feeds[fn]?.color || colors[fn];
            const isAdded = addedSplitFeeds.has(fn);
            return `
              <div class="subscription-row" style="--feed-color:${escapeHtml(c)}">
                <i class="sub-dot" aria-hidden="true"></i>
                <div class="subscription-meta"><strong>${escapeHtml(feeds[fn].name)}</strong></div>
                <a class="row-btn row-btn-primary" href="${feedWebcalUrl(fn)}" data-split-add="${escapeHtml(fn)}">${isAdded ? "再次打开" : "添加"}</a>
                <button class="row-btn" type="button" data-copy-feed="${escapeHtml(fn)}">复制链接</button>
              </div>`;
          })
          .join("")
      : '<p style="padding:24px;text-align:center;color:var(--muted);margin:0">请先选择日历</p>';
  }
}

function render() {
  renderFeedOptions();
  renderCalendar();
  renderSummary();
  renderSubscriptionDialog();
}

/* Listeners */
for (const button of document.querySelectorAll("[data-preset]")) {
  button.addEventListener("click", () => {
    selected = new Set(presets[button.dataset.preset]);
    bundleState.colorTouched = false;
    syncDefaultBundleColor();
    saveSelection();
    hidePopover();
    ensureDensePreviewLoaded();
    render();
  });
}

for (const btn of document.querySelectorAll("[data-month-shift]")) {
  btn.addEventListener("click", () => {
    const delta = Number(btn.dataset.monthShift);
    const next = CalendarPreview.shiftMonth(viewYear, viewMonth, delta);
    viewYear = next.year;
    viewMonth = next.month;
    hidePopover();
    renderCalendar();
  });
}

document.querySelector("[data-month-today]")?.addEventListener("click", () => {
  viewYear = previewClock.year;
  viewMonth = previewClock.month;
  activeMobileDayKey = previewClock.todayKey;
  hidePopover();
  renderCalendar();
});

for (const btn of document.querySelectorAll("[data-jump-month]")) {
  btn.addEventListener("click", () => {
    const [y, m] = btn.dataset.jumpMonth.split("-").map(Number);
    viewYear = y;
    viewMonth = m;
    hidePopover();
    renderCalendar();
  });
}

for (const button of document.querySelectorAll("[data-open-subscriptions]")) {
  button.addEventListener("click", () => {
    if (!selected.size) {
      showStatus("请先在左侧选择至少一项内容");
      return;
    }
    hidePopover();
    renderSubscriptionDialog();
    if (typeof subscribeDialog?.showModal === "function") subscribeDialog.showModal();
  });
}

for (const button of document.querySelectorAll("[data-open-help]")) {
  button.addEventListener("click", () => {
    hidePopover();
    if (typeof helpDialog?.showModal === "function") helpDialog.showModal();
  });
}

document.querySelector("[data-dialog-close]")?.addEventListener("click", () => subscribeDialog?.close());
document.querySelector("[data-help-close]")?.addEventListener("click", () => helpDialog?.close());

subscribeDialog?.addEventListener("click", (e) => {
  if (e.target === subscribeDialog) subscribeDialog.close();
});
helpDialog?.addEventListener("click", (e) => {
  if (e.target === helpDialog) helpDialog.close();
});

for (const tab of document.querySelectorAll("[data-sub-mode]")) {
  tab.addEventListener("click", () => {
    const mode = tab.dataset.subMode;
    for (const item of document.querySelectorAll("[data-sub-mode]")) {
      item.setAttribute("aria-selected", String(item === tab));
    }
    for (const panel of document.querySelectorAll("[data-sub-panel]")) {
      panel.hidden = panel.dataset.subPanel !== mode;
    }
  });
}

document.querySelector("[data-bundle-name]")?.addEventListener("input", (event) => {
  bundleState.name = event.target.value;
  renderSubscriptionDialog();
});

document.addEventListener("click", async (event) => {
  const eventBtn = event.target.closest("[data-event-uid]");
  if (eventBtn) {
    event.stopPropagation();
    const ev = eventRegistry.get(eventBtn.dataset.eventUid);
    if (ev) openEventPopover(ev, eventBtn);
    return;
  }

  const overflowBtn = event.target.closest("[data-overflow-day]");
  if (overflowBtn) {
    event.stopPropagation();
    openDayOverflowPopover(overflowBtn.dataset.overflowDay, overflowBtn);
    return;
  }

  if (event.target.closest("[data-popover-close]")) {
    hidePopover();
    return;
  }

  if (popover && !popover.hidden && !event.target.closest("[data-event-popover]")) {
    hidePopover();
  }

  const mobileDayBtn = event.target.closest("[data-mobile-day]");
  if (mobileDayBtn) {
    activeMobileDayKey = mobileDayBtn.dataset.mobileDay;
    renderCalendar();
    return;
  }

  const swatchBtn = event.target.closest("[data-swatch]");
  if (swatchBtn) {
    bundleState.color = swatchBtn.dataset.swatch;
    bundleState.colorTouched = true;
    renderSubscriptionDialog();
    return;
  }

  const remindBtn = event.target.closest("[data-remind-val]");
  if (remindBtn) {
    bundleState.remind = remindBtn.dataset.remindVal;
    renderSubscriptionDialog();
    return;
  }

  if (event.target.closest("[data-bundle-copy-https]") || event.target.closest("[data-quick-copy]")) {
    const urls = buildBundleUrls();
    if (urls) await copyText(urls.https, "订阅链接已复制");
    else showStatus("请先选择至少一项内容");
    return;
  }

  const splitCopy = event.target.closest("[data-copy-feed]");
  if (splitCopy) {
    await copyText(feedHttpsUrl(splitCopy.dataset.copyFeed), "链接已复制");
    return;
  }

  const splitAdd = event.target.closest("[data-split-add]");
  if (splitAdd) {
    addedSplitFeeds.add(splitAdd.dataset.splitAdd);
    window.setTimeout(() => renderSubscriptionDialog(), 120);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && popover && !popover.hidden) {
    hidePopover();
  }
});

const platformTabs = [...document.querySelectorAll("[data-platform]")];
const platformPanels = [...document.querySelectorAll("[data-panel]")];

for (const tab of platformTabs) {
  tab.addEventListener("click", () => {
    const platform = tab.dataset.platform;
    for (const item of platformTabs) {
      const active = item === tab;
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
    }
    for (const panel of platformPanels) panel.hidden = panel.dataset.panel !== platform;
  });
}

syncDefaultBundleColor();
ensureDensePreviewLoaded();
render();

fetch("manifest.json")
  .then((response) => {
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    return response.json();
  })
  .then((manifest) => {
    if (manifest.schema_version < 4) throw new Error("manifest schema is outdated");
    // Merge event data & colors without overwriting clean consumer UI copy
    for (const [filename, meta] of Object.entries(manifest.feeds || {})) {
      if (!feeds[filename]) continue;
      feeds[filename] = {
        ...feeds[filename],
        color: meta.color || colors[filename],
        preview_events: meta.preview_events || [],
        sample_titles: meta.sample_titles || feeds[filename].sample_titles,
      };
    }
    lunarDays = manifest.calendar_days || {};
    officialBadges = manifest.official_badges || {};
    selected = new Set([...selected].filter((filename) => feeds[filename]));
    if (!selected.size) selected = new Set(presets.quiet);
    syncDefaultBundleColor();

    const workRestNode = document.querySelector("[data-work-rest-year]");
    if (workRestNode) workRestNode.textContent = manifest.confirmed_work_rest_through;

    render();
  })
  .catch(() => {});
