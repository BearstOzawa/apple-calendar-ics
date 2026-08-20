from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .loader import load_official_years
from .model import OfficialYear
from .paths import DEFAULT_DATA_DIR, PROJECT_ROOT


DEFAULT_BASE_URL = "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master"


class UpstreamError(RuntimeError):
    pass


def _local_days(year_data: OfficialYear) -> dict[str, bool]:
    days: dict[str, bool] = {}
    for period in year_data.periods:
        current = period.start
        while current <= period.end_inclusive:
            days[current.isoformat()] = True
            current += timedelta(days=1)
        for workday in period.workdays:
            days[workday.date.isoformat()] = False
    return days


def _parse_upstream(payload: Any, expected_year: int) -> dict[str, Any]:
    if not isinstance(payload, dict) or payload.get("year") != expected_year:
        raise UpstreamError(f"upstream payload does not describe {expected_year}")
    papers = payload.get("papers", [])
    raw_days = payload.get("days", [])
    if not isinstance(papers, list) or not all(
        isinstance(item, str) for item in papers
    ):
        raise UpstreamError(f"upstream {expected_year}: invalid papers")
    if not isinstance(raw_days, list):
        raise UpstreamError(f"upstream {expected_year}: invalid days")
    days: dict[str, dict[str, Any]] = {}
    for item in raw_days:
        if (
            not isinstance(item, dict)
            or not isinstance(item.get("date"), str)
            or not isinstance(item.get("name"), str)
            or not isinstance(item.get("isOffDay"), bool)
        ):
            raise UpstreamError(f"upstream {expected_year}: malformed day entry")
        day = item["date"]
        try:
            parsed_day = date.fromisoformat(day)
        except ValueError as error:
            raise UpstreamError(
                f"upstream {expected_year}: invalid date {day!r}"
            ) from error
        if parsed_day.year != expected_year:
            raise UpstreamError(
                f"upstream {expected_year}: date is outside the expected year: {day}"
            )
        if day in days:
            raise UpstreamError(f"upstream {expected_year}: duplicate date {day}")
        days[day] = {
            "date": day,
            "name": item["name"],
            "isOffDay": item["isOffDay"],
        }
    return {"year": expected_year, "papers": papers, "days": days}


def compare_year(
    upstream: dict[str, Any], local_year: OfficialYear | None
) -> dict[str, Any] | None:
    year = int(upstream["year"])
    upstream_days: dict[str, dict[str, Any]] = upstream["days"]
    local_days = _local_days(local_year) if local_year else {}
    if not upstream_days and not local_days:
        return None

    added = [upstream_days[day] for day in sorted(set(upstream_days) - set(local_days))]
    removed = [
        {"date": day, "isOffDay": local_days[day]}
        for day in sorted(set(local_days) - set(upstream_days))
    ]
    status_changed = [
        {
            "date": day,
            "local_isOffDay": local_days[day],
            "upstream_isOffDay": upstream_days[day]["isOffDay"],
            "name": upstream_days[day]["name"],
        }
        for day in sorted(set(local_days) & set(upstream_days))
        if local_days[day] != upstream_days[day]["isOffDay"]
    ]
    local_papers = [local_year.source.url] if local_year else []
    papers_changed = sorted(upstream["papers"]) != sorted(local_papers)
    if not added and not removed and not status_changed and not papers_changed:
        return None
    return {
        "year": year,
        "kind": "new-year" if local_year is None and upstream_days else "changed-year",
        "papers": upstream["papers"],
        "local_papers": local_papers,
        "added": added,
        "removed": removed,
        "status_changed": status_changed,
    }


def fetch_year(base_url: str, year: int, timeout: float = 30.0) -> dict[str, Any]:
    url = f"{base_url.rstrip('/')}/{year}.json"
    request = Request(
        url,
        headers={"User-Agent": "apple-calendar-ics-source-monitor/0.1"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise UpstreamError(f"cannot fetch {url}: {error}") from error
    return _parse_upstream(payload, year)


def monitor(
    data_dir: Path,
    output: Path,
    *,
    base_url: str = DEFAULT_BASE_URL,
    years: list[int] | None = None,
) -> list[dict[str, Any]]:
    official_years = load_official_years(data_dir)
    local_by_year = {item.year: item for item in official_years}
    checked_years = years or sorted([*local_by_year, max(local_by_year) + 1])
    differences: list[dict[str, Any]] = []
    for year in checked_years:
        upstream = fetch_year(base_url, year)
        difference = compare_year(upstream, local_by_year.get(year))
        if difference:
            differences.append(difference)

    if differences:
        report = {
            "schema_version": 1,
            "action_required": True,
            "message": (
                "候选变化仅供审核；核对国务院正式通知后，才能更新 data/official。"
            ),
            "upstream": {
                "name": "NateScarlet/holiday-cn",
                "url": "https://github.com/NateScarlet/holiday-cn",
            },
            "checked_years": checked_years,
            "differences": differences,
        }
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(
            json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    elif output.exists():
        output.unlink()
    return differences


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Compare reviewed work/rest data with a candidate upstream"
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument(
        "--output", type=Path, default=PROJECT_ROOT / "reports/upstream-diff.json"
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--years", nargs="*", type=int)
    args = parser.parse_args(argv)
    try:
        differences = monitor(
            args.data_dir.resolve(),
            args.output.resolve(),
            base_url=args.base_url,
            years=args.years,
        )
    except UpstreamError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error
    if differences:
        print(f"found candidate changes in {len(differences)} year(s)")
        raise SystemExit(2)
    print("reviewed data matches the candidate upstream")


if __name__ == "__main__":
    main()
