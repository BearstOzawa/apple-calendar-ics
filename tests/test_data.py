from __future__ import annotations

import unittest

from apple_calendar_ics.culture import culture_events
from apple_calendar_ics.loader import (
    load_culture_config,
    load_metadata,
    load_observance_config,
    load_official_years,
)
from apple_calendar_ics.observances import observance_events
from apple_calendar_ics.official import official_events
from apple_calendar_ics.paths import DEFAULT_DATA_DIR


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


if __name__ == "__main__":
    unittest.main()
