from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from apple_calendar_ics.loader import load_official_years
from apple_calendar_ics.monitor import _local_days, compare_year, monitor
from apple_calendar_ics.paths import DEFAULT_DATA_DIR


def _upstream_payload(year_data) -> dict[str, object]:
    days = _local_days(year_data)
    return {
        "year": year_data.year,
        "papers": [year_data.source.url],
        "days": {
            day: {"date": day, "name": "测试", "isOffDay": is_off}
            for day, is_off in days.items()
        },
    }


class MonitorTests(unittest.TestCase):
    def test_matching_year_has_no_difference(self) -> None:
        year_data = load_official_years(DEFAULT_DATA_DIR)[-1]
        self.assertIsNone(compare_year(_upstream_payload(year_data), year_data))

    def test_status_change_is_reported(self) -> None:
        year_data = load_official_years(DEFAULT_DATA_DIR)[-1]
        upstream = _upstream_payload(year_data)
        day = sorted(upstream["days"])[0]
        upstream["days"][day]["isOffDay"] = not upstream["days"][day]["isOffDay"]
        difference = compare_year(upstream, year_data)
        self.assertIsNotNone(difference)
        self.assertEqual(day, difference["status_changed"][0]["date"])

    def test_monitor_writes_only_actionable_reports(self) -> None:
        years = load_official_years(DEFAULT_DATA_DIR)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for year_data in years:
                payload = {
                    "year": year_data.year,
                    "papers": [year_data.source.url],
                    "days": [
                        {"date": day, "name": "测试", "isOffDay": is_off}
                        for day, is_off in sorted(_local_days(year_data).items())
                    ],
                }
                (root / f"{year_data.year}.json").write_text(
                    json.dumps(payload), encoding="utf-8"
                )
            (root / "2027.json").write_text(
                json.dumps({"year": 2027, "papers": [], "days": []}),
                encoding="utf-8",
            )
            report = root / "report.json"
            differences = monitor(
                DEFAULT_DATA_DIR,
                report,
                base_url=root.as_uri(),
            )
            self.assertEqual([], differences)
            self.assertFalse(report.exists())

            future = {
                "year": 2027,
                "papers": ["https://www.gov.cn/example"],
                "days": [{"date": "2027-01-01", "name": "元旦", "isOffDay": True}],
            }
            (root / "2027.json").write_text(json.dumps(future), encoding="utf-8")
            differences = monitor(
                DEFAULT_DATA_DIR,
                report,
                base_url=root.as_uri(),
            )
            self.assertEqual("new-year", differences[0]["kind"])
            self.assertTrue(report.exists())


if __name__ == "__main__":
    unittest.main()
