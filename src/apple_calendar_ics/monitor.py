from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from .loader import _load_official_year, load_official_years
from .model import OfficialYear
from .paths import DEFAULT_DATA_DIR, PROJECT_ROOT


DEFAULT_BASE_URL = "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master"
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")

HOLIDAY_NAME_MAP: dict[str, tuple[str, str, list[str]]] = {
    "元旦": ("new-year", "元旦", ["new-year"]),
    "春节": ("spring-festival", "春节", ["spring-festival"]),
    "清明节": ("qingming", "清明节", ["qingming"]),
    "清明": ("qingming", "清明节", ["qingming"]),
    "劳动节": ("labour-day", "劳动节", ["labour-day"]),
    "端午节": ("dragon-boat", "端午节", ["dragon-boat"]),
    "端午": ("dragon-boat", "端午节", ["dragon-boat"]),
    "中秋节": ("mid-autumn", "中秋节", ["mid-autumn"]),
    "中秋": ("mid-autumn", "中秋节", ["mid-autumn"]),
    "国庆节": ("national-day", "国庆节", ["national-day"]),
    "国庆": ("national-day", "国庆节", ["national-day"]),
    "国庆节、中秋节": (
        "national-day-mid-autumn",
        "国庆、中秋",
        ["national-day", "mid-autumn"],
    ),
    "中秋节、国庆节": (
        "national-day-mid-autumn",
        "国庆、中秋",
        ["national-day", "mid-autumn"],
    ),
    "国庆、中秋": (
        "national-day-mid-autumn",
        "国庆、中秋",
        ["national-day", "mid-autumn"],
    ),
}


class UpstreamError(RuntimeError):
    pass


def _today_shanghai() -> date:
    return datetime.now(SHANGHAI_TZ).date()


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
        if parsed_day.year not in (expected_year, expected_year + 1):
            raise UpstreamError(
                f"upstream {expected_year}: date is outside the expected year: {day}"
            )
        if day in days:
            raise UpstreamError(f"upstream {expected_year}: duplicate date {day}")
        days[day] = {
            "date": day,
            "name": item["name"].strip(),
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


def fetch_year(
    base_url: str,
    year: int,
    *,
    allow_missing: bool = False,
    timeout: float = 30.0,
) -> dict[str, Any] | None:
    url = f"{base_url.rstrip('/')}/{year}.json"
    request = Request(
        url,
        headers={"User-Agent": "apple-calendar-ics-source-monitor/0.3"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = json.load(response)
    except HTTPError as error:
        if allow_missing and error.code == 404:
            return None
        raise UpstreamError(f"cannot fetch {url}: {error}") from error
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        if (
            allow_missing
            and isinstance(error, URLError)
            and isinstance(error.reason, FileNotFoundError)
        ):
            return None
        raise UpstreamError(f"cannot fetch {url}: {error}") from error
    return _parse_upstream(payload, year)


def _probe_gov_cn_metadata(
    url: str, timeout: float = 8.0
) -> tuple[str | None, str | None]:
    if not url.startswith("https://www.gov.cn/"):
        return None, None
    request = Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; apple-calendar-ics/1.0)"},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            html = response.read(131072).decode("utf-8", errors="ignore")
    except Exception:
        return None, None

    doc_match = re.search(r"国办发明电〔\d{4}〕\d+号", html)
    date_match = re.search(r"(20\d{2})[-年](\d{1,2})[-月](\d{1,2})", html)
    published_iso = None
    if date_match:
        try:
            published_iso = date(
                int(date_match.group(1)),
                int(date_match.group(2)),
                int(date_match.group(3)),
            ).isoformat()
        except ValueError:
            published_iso = None
    return (doc_match.group(0) if doc_match else None), published_iso


def _contiguous_runs(dates: list[date]) -> list[tuple[date, date]]:
    if not dates:
        return []
    ordered = sorted(dates)
    runs: list[tuple[date, date]] = []
    run_start = ordered[0]
    prev = ordered[0]
    for item in ordered[1:]:
        if item == prev + timedelta(days=1):
            prev = item
        else:
            runs.append((run_start, prev))
            run_start = item
            prev = item
    runs.append((run_start, prev))
    return runs


def convert_upstream_to_official_payload(
    upstream: dict[str, Any],
    existing: OfficialYear | None = None,
    *,
    probe_gov_page: bool = True,
) -> dict[str, Any]:
    year = int(upstream["year"])
    gov_papers = [
        url.strip()
        for url in upstream.get("papers", [])
        if isinstance(url, str) and url.strip().startswith("https://www.gov.cn/")
    ]
    if not gov_papers:
        raise UpstreamError(
            f"upstream {year}: missing official https://www.gov.cn/ paper URL"
        )
    paper_url = gov_papers[0]

    raw_days: dict[str, dict[str, Any]] = upstream["days"]
    if not raw_days:
        raise UpstreamError(f"upstream {year}: contains no holiday entries")

    doc_no: str | None = None
    published_at: str | None = None
    if existing and existing.source.url == paper_url:
        doc_no = existing.source.document_number
        published_at = existing.published_at.isoformat()
    elif probe_gov_page:
        doc_no, published_at = _probe_gov_cn_metadata(paper_url)

    if not doc_no:
        doc_no = (
            existing.source.document_number if existing else "国务院办公厅节假日通知"
        )
    if not published_at:
        published_at = _today_shanghai().isoformat()

    grouped: dict[str, dict[str, Any]] = {}
    custom_counter = 0
    for day_str in sorted(raw_days):
        entry = raw_days[day_str]
        raw_name = entry["name"]
        mapped = HOLIDAY_NAME_MAP.get(raw_name)
        if mapped is None:
            for key, candidate in HOLIDAY_NAME_MAP.items():
                if key in raw_name:
                    mapped = candidate
                    break
        if mapped is None:
            custom_counter += 1
            base_id = f"special-holiday-{custom_counter}"
            mapped = (base_id, raw_name, [base_id])

        base_id, clean_name, concepts = mapped
        bucket = grouped.setdefault(
            base_id,
            {
                "base_id": base_id,
                "name": clean_name,
                "concepts": concepts,
                "off_dates": [],
                "work_dates": [],
            },
        )
        parsed_day = date.fromisoformat(day_str)
        if entry["isOffDay"]:
            bucket["off_dates"].append(parsed_day)
        elif parsed_day.year == year:
            bucket["work_dates"].append(parsed_day)

    existing_periods = {p.id: p for p in existing.periods} if existing else {}
    periods_out: list[dict[str, Any]] = []

    for bucket in grouped.values():
        runs = [
            (start, end)
            for start, end in _contiguous_runs(bucket["off_dates"])
            if start.year == year
        ]
        if not runs:
            continue

        work_assignments: list[list[date]] = [[] for _ in runs]
        for work_day in sorted(bucket["work_dates"]):
            nearest_idx = min(
                range(len(runs)),
                key=lambda idx: min(
                    abs((work_day - runs[idx][0]).days),
                    abs((work_day - runs[idx][1]).days),
                ),
            )
            work_assignments[nearest_idx].append(work_day)

        for idx, (run_start, run_end) in enumerate(runs, start=1):
            period_id = bucket["base_id"] if idx == 1 else f"{bucket['base_id']}-{idx}"
            prev_period = existing_periods.get(period_id)
            assigned_work = sorted(work_assignments[idx - 1])
            same_as_prev = (
                prev_period is not None
                and prev_period.start == run_start
                and prev_period.end_inclusive == run_end
                and [w.date for w in prev_period.workdays] == assigned_work
            )
            seq = (
                prev_period.sequence
                if same_as_prev
                else (prev_period.sequence + 1 if prev_period else 0)
            )
            periods_out.append(
                {
                    "id": period_id,
                    "name": bucket["name"],
                    "concepts": list(bucket["concepts"]),
                    "start": run_start.isoformat(),
                    "end_inclusive": run_end.isoformat(),
                    "sequence": seq,
                    "workdays": [
                        {
                            "id": f"makeup-{w_idx}",
                            "date": wd.isoformat(),
                            "sequence": seq,
                        }
                        for w_idx, wd in enumerate(assigned_work, start=1)
                    ],
                }
            )

    periods_out.sort(key=lambda item: item["start"])
    return {
        "schema_version": 1,
        "year": year,
        "published_at": published_at,
        "source": {
            "title": f"国务院办公厅关于{year}年部分节假日安排的通知",
            "url": paper_url,
            "document_number": doc_no,
        },
        "periods": periods_out,
    }


def _ensure_rolling_end_year(data_dir: Path, target_end_year: int) -> bool:
    changed = False
    for filename in ("culture.json", "observances.json", "life_festivals.json"):
        path = data_dir / filename
        if not path.exists():
            continue
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw.get("end_year"), int) and raw["end_year"] < target_end_year:
            raw["end_year"] = target_end_year
            path.write_text(
                json.dumps(raw, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            changed = True
    return changed


def _bump_dataset_version(data_dir: Path, version_date: date) -> None:
    meta_path = data_dir / "metadata.json"
    raw = json.loads(meta_path.read_text(encoding="utf-8"))
    raw["dataset_version"] = version_date.isoformat()
    meta_path.write_text(
        json.dumps(raw, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def monitor(
    data_dir: Path,
    output: Path,
    *,
    base_url: str = DEFAULT_BASE_URL,
    years: list[int] | None = None,
    apply_changes: bool = False,
    probe_gov_page: bool = True,
) -> list[dict[str, Any]]:
    official_years = load_official_years(data_dir)
    local_by_year = {item.year: item for item in official_years}
    max_local_year = max(local_by_year)
    checked_years = years or sorted([*local_by_year, max_local_year + 1])
    differences: list[dict[str, Any]] = []
    upstream_by_year: dict[int, dict[str, Any]] = {}

    for year in checked_years:
        upstream = fetch_year(
            base_url,
            year,
            allow_missing=year > max_local_year,
        )
        if upstream is None:
            continue
        difference = compare_year(upstream, local_by_year.get(year))
        if difference:
            differences.append(difference)
            upstream_by_year[year] = upstream

    if apply_changes:
        applied_any = False
        for year, upstream in sorted(upstream_by_year.items()):
            payload = convert_upstream_to_official_payload(
                upstream,
                local_by_year.get(year),
                probe_gov_page=probe_gov_page,
            )
            target_path = data_dir / "official" / f"{year}.json"
            target_path.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            # Validate immediately against strict schema invariants
            _load_official_year(target_path)
            applied_any = True

        newest_year = max([max_local_year, *upstream_by_year.keys()])
        desired_end_year = max(2030, newest_year + 3, _today_shanghai().year + 4)
        if _ensure_rolling_end_year(data_dir, desired_end_year):
            applied_any = True

        if applied_any:
            _bump_dataset_version(data_dir, _today_shanghai())
            if output.exists():
                output.unlink()
        return differences

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
        description="Check and optionally auto-apply official holiday updates from upstream"
    )
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument(
        "--output", type=Path, default=PROJECT_ROOT / "reports/upstream-diff.json"
    )
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--years", nargs="*", type=int)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Automatically convert verified www.gov.cn upstream schedules into data/official/<year>.json",
    )
    args = parser.parse_args(argv)
    try:
        differences = monitor(
            args.data_dir.resolve(),
            args.output.resolve(),
            base_url=args.base_url,
            years=args.years,
            apply_changes=args.apply,
        )
    except UpstreamError as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error
    if differences:
        action = "applied" if args.apply else "found"
        print(f"{action} official holiday changes in {len(differences)} year(s)")
        raise SystemExit(0 if args.apply else 2)
    print("official holiday data is up to date")


if __name__ == "__main__":
    main()
