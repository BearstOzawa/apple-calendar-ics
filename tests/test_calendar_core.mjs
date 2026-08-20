import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calendarContext, expandEvents, monthCells } = require("../site/calendar-core.js");

const context = calendarContext(new Date(2026, 7, 21, 9, 30));
assert.deepEqual(context, {
  year: 2026,
  month: 8,
  day: 21,
  todayKey: "2026-08-21",
});

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

console.log("calendar preview: physical today, month grid and event spans valid");
