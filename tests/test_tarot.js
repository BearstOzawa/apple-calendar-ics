"use strict";

const assert = require("node:assert/strict");
const tools = require("../site/tarot.js");

assert.equal(tools.deck.length, 78);
assert.equal(new Set(tools.deck.map((card) => card.id)).size, 78);

const first = tools.drawForDate("2026-08-20", 20260820);
const second = tools.drawForDate("2026-08-20", 20260820);
assert.deepEqual(first, second);

const daily = tools.buildDailyCalendar(first, "2026-08-20");
assert.match(daily, /BEGIN:VCALENDAR\r\n/);
assert.match(daily, /DTSTART;VALUE=DATE:20260820/);
assert.match(daily, /CLASS:PRIVATE/);
assert.equal((daily.match(/BEGIN:VEVENT/g) || []).length, 1);

const study = tools.buildStudyCalendar("2026-08-20", 42);
assert.equal((study.match(/BEGIN:VEVENT/g) || []).length, 78);
assert.match(study, /DTSTART;VALUE=DATE:20261105/);
assert.ok(study.endsWith("\r\n"));

for (const line of study.split("\r\n").slice(0, -1)) {
  assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
}

console.log("tarot.js: 78 cards and generated calendars valid");
