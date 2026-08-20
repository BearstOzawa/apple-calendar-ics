from __future__ import annotations

import unittest

from apple_calendar_ics.culture import culture_events
from apple_calendar_ics.loader import (
    load_culture_config,
    load_lifestyle_config,
    load_metadata,
    load_observance_config,
    load_official_years,
)
from apple_calendar_ics.lifestyle import _event_date, lifestyle_events
from apple_calendar_ics.lunar_days import lunar_day_events
from apple_calendar_ics.observances import observance_events
from apple_calendar_ics.official import official_events
from apple_calendar_ics.paths import DEFAULT_DATA_DIR
from apple_calendar_ics.reminders import holiday_reminder_events
from apple_calendar_ics.model import LifestyleRule


class DataTests(unittest.TestCase):
    def test_reviewed_official_years_expand_to_expected_day_counts(self) -> None:
        years = load_official_years(DEFAULT_DATA_DIR)
        self.assertEqual([2025, 2026], [item.year for item in years])
        counts = {
            item.year: sum(period.duration_days for period in item.periods)
            + sum(len(period.workdays) for period in item.periods)
            for item in years
        }
        self.assertEqual({2025: 33, 2026: 39}, counts)

    def test_official_events_use_one_event_per_holiday_period(self) -> None:
        events = official_events(load_official_years(DEFAULT_DATA_DIR))
        spring_2026 = [
            event
            for event in events
            if event.logical_id == "cn-2026-spring-festival-holiday-period"
        ]
        self.assertEqual(1, len(spring_2026))
        self.assertEqual(9, spring_2026[0].duration_days)
        self.assertEqual("春节假期（9天）", spring_2026[0].title)

    def test_culture_has_known_festivals_and_24_terms_per_year(self) -> None:
        metadata = load_metadata(DEFAULT_DATA_DIR)
        events = culture_events(load_culture_config(DEFAULT_DATA_DIR), metadata)
        lookup = {(event.start.isoformat(), event.title) for event in events}
        self.assertIn(("2026-02-16", "除夕"), lookup)
        self.assertIn(("2026-02-17", "春节"), lookup)
        self.assertIn(("2026-03-03", "元宵节"), lookup)
        self.assertIn(("2026-04-05", "清明"), lookup)
        self.assertIn(("2026-08-27", "中元节"), lookup)
        self.assertIn(("2026-12-22", "冬至"), lookup)
        for year in range(2025, 2031):
            terms = [
                event
                for event in events
                if event.start.year == year and event.kind == "solar-term"
            ]
            self.assertEqual(24, len(terms), year)

    def test_public_observances_are_low_frequency_and_explain_leave_status(
        self,
    ) -> None:
        metadata = load_metadata(DEFAULT_DATA_DIR)
        events = observance_events(load_observance_config(DEFAULT_DATA_DIR), metadata)
        self.assertEqual(13 * 6, len(events))
        womens_day = next(
            item for item in events if item.start.isoformat() == "2026-03-08"
        )
        self.assertEqual("妇女节", womens_day.title)
        self.assertIn("放假半天", womens_day.description)
        self.assertEqual("reviewed", womens_day.data_status)

    def test_lifestyle_festivals_use_fixed_and_weekday_rules(self) -> None:
        metadata = load_metadata(DEFAULT_DATA_DIR)
        events = lifestyle_events(load_lifestyle_config(DEFAULT_DATA_DIR), metadata)
        lookup = {(event.start.isoformat(), event.title) for event in events}
        self.assertIn(("2026-05-10", "母亲节"), lookup)
        self.assertIn(("2026-06-21", "父亲节"), lookup)
        self.assertIn(("2026-11-26", "感恩节"), lookup)
        self.assertEqual(9 * 6, len(events))
        self.assertTrue(
            all("不属于中国法定节假日" in item.description for item in events)
        )

    def test_lifestyle_weekday_rule_cannot_spill_into_next_month(self) -> None:
        rule = LifestyleRule(
            id="fifth-sunday",
            concept="fifth-sunday",
            name="第五个星期日",
            month=2,
            day=None,
            weekday=6,
            occurrence=5,
            note="测试规则。",
        )
        with self.assertRaisesRegex(ValueError, "has no occurrence 5"):
            _event_date(2026, rule)

    def test_lunar_days_keep_daily_lunar_text_out_of_calendar(self) -> None:
        metadata = load_metadata(DEFAULT_DATA_DIR)
        events = lunar_day_events(load_culture_config(DEFAULT_DATA_DIR), metadata)
        lookup = {(event.start.isoformat(), event.title) for event in events}
        self.assertIn(("2026-02-17", "正月初一"), lookup)
        self.assertIn(("2026-09-25", "八月十五"), lookup)
        self.assertGreater(len(events), 24 * 5)
        self.assertLess(len(events), 25 * 6)

    def test_holiday_reminders_emit_one_seven_day_notice_per_period(self) -> None:
        years = load_official_years(DEFAULT_DATA_DIR)
        events = holiday_reminder_events(years)
        self.assertEqual(sum(len(year.periods) for year in years), len(events))
        spring = next(
            item
            for item in events
            if item.logical_id == "cn-2026-spring-festival-seven-day-reminder"
        )
        self.assertEqual("2026-02-08", spring.start.isoformat())
        self.assertEqual("春节假期还有 7 天", spring.title)


if __name__ == "__main__":
    unittest.main()
