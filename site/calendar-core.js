"use strict";

(function exposeCalendarPreview(globalScope) {
  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateKey(year, month, day) {
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  function parseDateKey(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12);
  }

  function calendarContext(now = new Date()) {
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      todayKey: dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    };
  }

  function monthCells(year, month) {
    const first = new Date(year, month - 1, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const value = new Date(year, month - 1, index - mondayOffset + 1, 12);
      return {
        year: value.getFullYear(),
        month: value.getMonth() + 1,
        day: value.getDate(),
        key: dateKey(value.getFullYear(), value.getMonth() + 1, value.getDate()),
        currentMonth: value.getFullYear() === year && value.getMonth() + 1 === month,
      };
    });
  }

  function expandEvents(events, year, month) {
    const result = [];
    for (const event of events || []) {
      const cursor = parseDateKey(event.start);
      const end = parseDateKey(event.end);
      let continuation = false;
      while (cursor < end) {
        if (cursor.getFullYear() === year && cursor.getMonth() + 1 === month) {
          result.push({
            key: dateKey(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()),
            title: continuation ? "" : event.title,
            continuation,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
        continuation = true;
      }
    }
    return result;
  }

  const api = { calendarContext, dateKey, expandEvents, monthCells };
  globalScope.CalendarPreview = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
