from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from icalendar import Calendar

from apple_calendar_ics.build import build
from apple_calendar_ics.ics import escape_text, fold_content_line, make_uid
from apple_calendar_ics.loader import load_metadata
from apple_calendar_ics.paths import DEFAULT_DATA_DIR
from apple_calendar_ics.validate import validate_directory


class IcsTests(unittest.TestCase):
    def test_text_escaping(self) -> None:
        self.assertEqual(
            r"一\,二\;三\\四\n五",
            escape_text("一,二;三\\四\n五"),
        )

    def test_folding_counts_utf8_octets_and_round_trips(self) -> None:
        original = "DESCRIPTION:" + "这是很长的中文内容，" * 20
        folded = fold_content_line(original)
        self.assertEqual(original, folded.replace("\r\n ", ""))
        for line in folded.encode("utf-8").split(b"\r\n"):
            self.assertLessEqual(len(line), 75)

    def test_uid_depends_only_on_logical_id_and_domain(self) -> None:
        metadata = load_metadata(DEFAULT_DATA_DIR)
        self.assertEqual(
            "cn-2026-spring-festival@apple-calendar-ics.bearstozawa.github.io",
            make_uid("cn-2026-spring-festival", metadata),
        )

    def test_build_is_byte_deterministic_and_independently_parseable(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            first = build(DEFAULT_DATA_DIR, output)
            snapshots = {path.name: path.read_bytes() for path in output.iterdir()}
            second = build(DEFAULT_DATA_DIR, output)
            self.assertTrue(all(item["changed"] for item in first["feeds"].values()))
            self.assertTrue(
                all(not item["changed"] for item in second["feeds"].values())
            )
            self.assertEqual(
                snapshots,
                {path.name: path.read_bytes() for path in output.iterdir()},
            )
            results = validate_directory(output)
            self.assertEqual(
                {
                    "almanac.ics",
                    "essential.ics",
                    "festivals.ics",
                    "lunar-mansions.ics",
                    "moon-phases.ics",
                    "observances.ics",
                    "seasonal.ics",
                    "sky-events.ics",
                    "solar-terms.ics",
                    "work-rest.ics",
                    "zodiac-seasons.ics",
                },
                set(results),
            )
            self.assertEqual(220, results["essential.ics"]["event_count"])
            self.assertEqual(24, results["work-rest.ics"]["event_count"])
            for filename in results:
                calendar = Calendar.from_ical((output / filename).read_bytes())
                events = tuple(calendar.walk("VEVENT"))
                self.assertGreater(len(events), 0)
                for event in events:
                    self.assertIsNone(event.get("URL"), filename)
                    description = str(event.get("DESCRIPTION", ""))
                    self.assertNotIn("计算库：", description, filename)
                    self.assertNotIn("来源：http", description, filename)

    def test_essential_feed_uses_contextual_deduplication(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            build(DEFAULT_DATA_DIR, output)
            calendar = Calendar.from_ical((output / "essential.ics").read_bytes())
            components = tuple(calendar.walk("VEVENT"))

            dragon_boat = [
                item
                for item in components
                if item.decoded("DTSTART").isoformat() == "2026-06-19"
                and "dragon-boat" in str(item.get("X-CN-CALENDAR-CONCEPTS", ""))
            ]
            self.assertEqual(1, len(dragon_boat))
            self.assertEqual("端午节假期（3天）", str(dragon_boat[0]["SUMMARY"]))

            duplicated_spring_festival = [
                item
                for item in components
                if item.decoded("DTSTART").isoformat() == "2026-02-17"
                and str(item.get("SUMMARY", "")) == "春节"
            ]
            self.assertEqual(0, len(duplicated_spring_festival))


if __name__ == "__main__":
    unittest.main()
