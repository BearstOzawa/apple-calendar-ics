from __future__ import annotations

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from apple_calendar_ics.loader import load_culture_config, load_official_years
from apple_calendar_ics.monitor import (
    UpstreamError,
    _local_days,
    compare_year,
    monitor,
)
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

    def test_monitor_tolerates_missing_next_year_and_writes_actionable_reports(
        self,
    ) -> None:
        years = load_official_years(DEFAULT_DATA_DIR)
        next_year = max(item.year for item in years) + 1
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
            report = root / "report.json"

            differences = monitor(
                DEFAULT_DATA_DIR,
                report,
                base_url=root.as_uri(),
            )
            self.assertEqual([], differences)
            self.assertFalse(report.exists())

            future = {
                "year": next_year,
                "papers": ["https://www.gov.cn/zhengce/example.htm"],
                "days": [
                    {"date": f"{next_year}-01-01", "name": "元旦", "isOffDay": True}
                ],
            }
            (root / f"{next_year}.json").write_text(
                json.dumps(future), encoding="utf-8"
            )
            differences = monitor(
                DEFAULT_DATA_DIR,
                report,
                base_url=root.as_uri(),
            )
            self.assertEqual("new-year", differences[0]["kind"])
            self.assertTrue(report.exists())

    def test_apply_changes_generates_valid_official_year_and_rolls_end_year(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as directory:
            temp_root = Path(directory)
            temp_data = temp_root / "data"
            upstream_dir = temp_root / "upstream"
            shutil.copytree(DEFAULT_DATA_DIR, temp_data)
            upstream_dir.mkdir()

            years = load_official_years(temp_data)
            for year_data in years:
                payload = {
                    "year": year_data.year,
                    "papers": [year_data.source.url],
                    "days": [
                        {"date": day, "name": "元旦", "isOffDay": is_off}
                        for day, is_off in sorted(_local_days(year_data).items())
                    ],
                }
                (upstream_dir / f"{year_data.year}.json").write_text(
                    json.dumps(payload), encoding="utf-8"
                )

            next_year = max(item.year for item in years) + 1
            future_payload = {
                "year": next_year,
                "papers": ["https://www.gov.cn/zhengce/202711/content_999999.htm"],
                "days": [
                    {"date": f"{next_year}-01-01", "name": "元旦", "isOffDay": True},
                    {"date": f"{next_year}-01-23", "name": "春节", "isOffDay": False},
                    {"date": f"{next_year}-01-25", "name": "春节", "isOffDay": True},
                    {"date": f"{next_year}-01-26", "name": "春节", "isOffDay": True},
                    {"date": f"{next_year}-01-27", "name": "春节", "isOffDay": True},
                    {
                        "date": f"{next_year}-10-01",
                        "name": "国庆节、中秋节",
                        "isOffDay": True,
                    },
                    {
                        "date": f"{next_year}-10-02",
                        "name": "国庆节、中秋节",
                        "isOffDay": True,
                    },
                    {
                        "date": f"{next_year}-10-08",
                        "name": "国庆节、中秋节",
                        "isOffDay": False,
                    },
                ],
            }
            (upstream_dir / f"{next_year}.json").write_text(
                json.dumps(future_payload), encoding="utf-8"
            )

            report = temp_root / "report.json"
            diffs = monitor(
                temp_data,
                report,
                base_url=upstream_dir.as_uri(),
                apply_changes=True,
                probe_gov_page=False,
            )
            self.assertEqual(1, len(diffs))
            self.assertTrue((temp_data / "official" / f"{next_year}.json").is_file())

            reloaded = load_official_years(temp_data)
            newest = [item for item in reloaded if item.year == next_year][0]
            self.assertEqual(3, len(newest.periods))
            self.assertEqual("national-day-mid-autumn", newest.periods[2].id)
            self.assertEqual(("national-day", "mid-autumn"), newest.periods[2].concepts)
            self.assertEqual(1, len(newest.periods[1].workdays))

            culture_cfg = load_culture_config(temp_data)
            self.assertGreaterEqual(culture_cfg.end_year, next_year + 3)

            # Reject non-gov.cn sources during auto-apply
            bad_year = next_year + 1
            (upstream_dir / f"{bad_year}.json").write_text(
                json.dumps(
                    {
                        "year": bad_year,
                        "papers": ["https://example.com/unofficial.htm"],
                        "days": [
                            {
                                "date": f"{bad_year}-01-01",
                                "name": "元旦",
                                "isOffDay": True,
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            with self.assertRaises(UpstreamError):
                monitor(
                    temp_data,
                    report,
                    base_url=upstream_dir.as_uri(),
                    apply_changes=True,
                    probe_gov_page=False,
                )


if __name__ == "__main__":
    unittest.main()
