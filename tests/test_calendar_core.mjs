import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  calendarContext,
  expandEvents,
  layoutMonthWeeks,
  monthCells,
  shiftMonth,
} = require("../site/calendar-core.js");
const { encodeMatrix, renderSvg } = require("../site/qrcode.js");

const context = calendarContext(new Date(2026, 7, 21, 9, 30));
assert.deepEqual(context, {
  year: 2026,
  month: 8,
  day: 21,
  todayKey: "2026-08-21",
});

assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
assert.deepEqual(shiftMonth(2025, 1, -1), { year: 2025, month: 1 });
assert.deepEqual(shiftMonth(2030, 12, 1), { year: 2030, month: 12 });

const cells = monthCells(2026, 8);
assert.equal(cells.length, 42);
assert.equal(cells[0].key, "2026-07-27");
assert.equal(cells.at(-1).key, "2026-09-06");
assert.equal(cells.find((cell) => cell.key === context.todayKey).currentMonth, true);

const occurrences = expandEvents(
  [{ start: "2026-07-31", end: "2026-08-03", title: "跨月假期" }],
  2026,
  8,
);
assert.deepEqual(occurrences, [
  { key: "2026-08-01", title: "", continuation: true },
  { key: "2026-08-02", title: "", continuation: true },
]);

// Multi-day week layout: 2027 Spring Festival (Feb 5 Fri .. Feb 13 Sat, exclusive end Feb 14)
const febWeeks = layoutMonthWeeks(
  2027,
  2,
  [
    {
      uid: "spring-2027",
      start: "2027-02-05",
      end: "2027-02-14",
      title: "春节假期（9天）",
      filename: "essential.ics",
    },
  ],
  3,
);
assert.equal(febWeeks.length, 4); // 2027-02 starts Monday Feb 1 and ends Sunday Feb 28 (exact 4 weeks!)
assert.equal(febWeeks[0].segments.length, 1);
assert.deepEqual(
  {
    colStart: febWeeks[0].segments[0].colStart,
    colSpan: febWeeks[0].segments[0].colSpan,
    continuesLeft: febWeeks[0].segments[0].continuesLeft,
    continuesRight: febWeeks[0].segments[0].continuesRight,
  },
  { colStart: 4, colSpan: 3, continuesLeft: false, continuesRight: true },
);
assert.deepEqual(
  {
    colStart: febWeeks[1].segments[0].colStart,
    colSpan: febWeeks[1].segments[0].colSpan,
    continuesLeft: febWeeks[1].segments[0].continuesLeft,
    continuesRight: febWeeks[1].segments[0].continuesRight,
  },
  { colStart: 0, colSpan: 6, continuesLeft: true, continuesRight: false },
);

// QR code SVG encoder sanity check
const qrUrl = "webcal://apple-calendar.lili.uno/bundle.ics?feeds=essential,holiday-reminders,life-festivals&remind=09:00";
const matrix = encodeMatrix(qrUrl);
assert.ok(matrix.version >= 4 && matrix.version <= 10);
assert.equal(matrix.modules.length, matrix.size);
const svg = renderSvg(qrUrl);
assert.ok(svg.startsWith("<svg") && svg.includes("<path d=\"M"));

console.log("calendar preview & qr svg: month layout, multi-day spans, bounds and QR valid");
