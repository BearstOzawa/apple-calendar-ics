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

  function shiftMonth(year, month, delta, bounds = { minYear: 2025, maxYear: 2030 }) {
    const date = new Date(year, month - 1 + delta, 1, 12);
    const nextYear = date.getFullYear();
    const nextMonth = date.getMonth() + 1;
    if (nextYear < bounds.minYear) return { year: bounds.minYear, month: 1 };
    if (nextYear > bounds.maxYear) return { year: bounds.maxYear, month: 12 };
    return { year: nextYear, month: nextMonth };
  }

  function monthCells(year, month) {
    const first = new Date(year, month - 1, 1, 12);
    const mondayOffset = (first.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => {
      const value = new Date(year, month - 1, index - mondayOffset + 1, 12);
      const weekday = (value.getDay() + 6) % 7; // 0 = Mon .. 6 = Sun
      return {
        year: value.getFullYear(),
        month: value.getMonth() + 1,
        day: value.getDate(),
        weekday,
        isWeekend: weekday >= 5,
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

  function inclusiveEndKey(exclusiveEndKey) {
    const end = parseDateKey(exclusiveEndKey);
    end.setDate(end.getDate() - 1);
    return dateKey(end.getFullYear(), end.getMonth() + 1, end.getDate());
  }

  /**
   * Builds 6 week rows (7 cells each) with continuous multi-column event segments
   * and per-day overflow counters, matching Apple Calendar's month view layout.
   */
  function layoutMonthWeeks(year, month, rawEvents, maxLanes = 3) {
    const cells = monthCells(year, month);
    const weeks = [];

    const normalized = (rawEvents || [])
      .map((item, idx) => {
        const endInclusive = inclusiveEndKey(item.end);
        const spanDays = Math.max(
          1,
          Math.round((parseDateKey(item.end) - parseDateKey(item.start)) / 86400000),
        );
        return {
          ...item,
          uid: item.uid || `${item.filename || "feed"}-${item.start}-${item.title}-${idx}`,
          endInclusive,
          spanDays,
        };
      })
      .sort((a, b) => (
        a.start.localeCompare(b.start) ||
        b.spanDays - a.spanDays ||
        a.title.localeCompare(b.title, "zh-CN")
      ));

    for (let w = 0; w < 6; w += 1) {
      const weekCells = cells.slice(w * 7, w * 7 + 7);
      const weekStart = weekCells[0].key;
      const weekEnd = weekCells[6].key;

      // Skip trailing 5th/6th week if all 7 days belong to next month
      if (w >= 4 && weekCells.every((cell) => !cell.currentMonth)) {
        continue;
      }

      const weekOverlaps = normalized.filter(
        (ev) => ev.start <= weekEnd && ev.endInclusive >= weekStart,
      );

      const lanes = Array.from({ length: maxLanes }, () => Array(7).fill(false));
      const segments = [];
      const overflowByCol = Array(7).fill(0);
      const eventsByKey = Object.fromEntries(weekCells.map((c) => [c.key, []]));

      for (const ev of weekOverlaps) {
        let colStart = 0;
        while (colStart < 7 && weekCells[colStart].key < ev.start) colStart += 1;
        let colEnd = 6;
        while (colEnd >= 0 && weekCells[colEnd].key > ev.endInclusive) colEnd -= 1;
        if (colStart > colEnd) continue;

        for (let c = colStart; c <= colEnd; c += 1) {
          eventsByKey[weekCells[c].key].push(ev);
        }

        let placedLane = -1;
        for (let lane = 0; lane < maxLanes; lane += 1) {
          let free = true;
          for (let c = colStart; c <= colEnd; c += 1) {
            if (lanes[lane][c]) {
              free = false;
              break;
            }
          }
          if (free) {
            placedLane = lane;
            for (let c = colStart; c <= colEnd; c += 1) lanes[lane][c] = true;
            break;
          }
        }

        if (placedLane !== -1) {
          segments.push({
            event: ev,
            lane: placedLane,
            colStart,
            colSpan: colEnd - colStart + 1,
            continuesLeft: ev.start < weekStart,
            continuesRight: ev.endInclusive > weekEnd,
          });
        } else {
          for (let c = colStart; c <= colEnd; c += 1) overflowByCol[c] += 1;
        }
      }

      weeks.push({
        cells: weekCells,
        segments,
        overflowByCol,
        eventsByKey,
      });
    }

    return weeks;
  }

  const api = {
    calendarContext,
    dateKey,
    expandEvents,
    inclusiveEndKey,
    layoutMonthWeeks,
    monthCells,
    parseDateKey,
    shiftMonth,
  };
  globalScope.CalendarPreview = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
