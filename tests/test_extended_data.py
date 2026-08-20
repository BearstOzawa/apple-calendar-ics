from __future__ import annotations

import unittest

from apple_calendar_ics.celestial import (
    moon_phase_events,
    sky_event_events,
    zodiac_season_events,
)
from apple_calendar_ics.loader import load_culture_config, load_metadata
from apple_calendar_ics.paths import DEFAULT_DATA_DIR
from apple_calendar_ics.traditional import (
    almanac_events,
    lunar_mansion_events,
    seasonal_events,
)


class ExtendedDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.config = load_culture_config(DEFAULT_DATA_DIR)
        cls.metadata = load_metadata(DEFAULT_DATA_DIR)

    def test_almanac_uses_auditable_lunar_values(self) -> None:
        events = almanac_events(self.config, self.metadata)
        event = next(item for item in events if item.start.isoformat() == "2026-08-20")
        self.assertEqual("黄历｜农历七月初八 · 丙寅日", event.title)
        self.assertIn("宜：破屋、坏垣、治病、馀事勿取", event.description)
        self.assertIn("冲煞：冲(庚申)猴，煞北", event.description)
        self.assertIn("传统民俗信息仅供文化参考", event.description)

    def test_lunar_mansion_feed_keeps_long_text_out_of_title(self) -> None:
        events = lunar_mansion_events(self.config, self.metadata)
        event = next(item for item in events if item.start.isoformat() == "2026-08-20")
        self.assertEqual("星宿｜角木蛟 · 吉", event.title)
        self.assertIn("十二值星：破日", event.description)
        self.assertIn("星宿歌：角星造作主荣昌", event.description)

    def test_seasonal_feed_emits_transitions_instead_of_daily_labels(self) -> None:
        events = seasonal_events(self.config, self.metadata)
        winter_solstice = [
            item for item in events if item.start.isoformat() == "2026-12-22"
        ]
        self.assertEqual(
            {"数九｜一九开始", "物候｜蚯蚓结"},
            {item.title for item in winter_solstice},
        )
        self.assertLess(len(events), 600)

    def test_moon_phases_use_beijing_time(self) -> None:
        events = moon_phase_events(self.config, self.metadata)
        full_moon = next(
            item
            for item in events
            if item.start.isoformat() == "2026-01-03" and "满月" in item.title
        )
        self.assertIn("2026年01月03日 18:03", full_moon.description)
        self.assertEqual("computed", full_moon.data_status)

    def test_sky_events_include_reviewable_2026_events(self) -> None:
        events = sky_event_events(self.config, self.metadata)
        lookup = {(item.start.isoformat(), item.title) for item in events}
        self.assertIn(("2026-08-13", "流星雨｜英仙座流星雨极大"), lookup)
        self.assertIn(("2026-08-13", "日食｜全食"), lookup)
        self.assertIn(("2026-10-04", "行星｜土星冲日"), lookup)

    def test_zodiac_seasons_are_events_not_horoscope_copy(self) -> None:
        events = zodiac_season_events(self.config, self.metadata)
        aries = next(
            item for item in events if item.logical_id == "astro-2026-zodiac-aries"
        )
        self.assertEqual("星座季节｜白羊座", aries.title)
        self.assertIn("不提供个人运势解读", aries.description)
        self.assertEqual(12 * 6, len(events))


if __name__ == "__main__":
    unittest.main()
