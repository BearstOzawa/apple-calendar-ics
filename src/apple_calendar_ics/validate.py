from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

from icalendar import Calendar

from .paths import DEFAULT_OUTPUT_DIR


class CalendarValidationError(ValueError):
    pass


def _validate_wire_format(path: Path, payload: bytes) -> None:
    if not payload.endswith(b"\r\n"):
        raise CalendarValidationError(f"{path}: file must end with CRLF")
    without_crlf = payload.replace(b"\r\n", b"")
    if b"\n" in without_crlf or b"\r" in without_crlf:
        raise CalendarValidationError(f"{path}: file contains a bare CR or LF")
    for line_number, line in enumerate(payload.split(b"\r\n")[:-1], start=1):
        if len(line) > 75:
            raise CalendarValidationError(
                f"{path}:{line_number}: content line is {len(line)} octets"
            )
        if not line:
            raise CalendarValidationError(f"{path}:{line_number}: empty content line")


def _decoded_date(component: Any, name: str, path: Path) -> date:
    try:
        value = component.decoded(name)
    except (KeyError, ValueError) as error:
        raise CalendarValidationError(f"{path}: missing or invalid {name}") from error
    if isinstance(value, datetime) or not isinstance(value, date):
        raise CalendarValidationError(f"{path}: {name} must be an all-day DATE")
    return value


def validate_file(path: Path, *, max_active_events_per_day: int = 3) -> dict[str, Any]:
    payload = path.read_bytes()
    _validate_wire_format(path, payload)
    try:
        calendar = Calendar.from_ical(payload)
    except Exception as error:  # icalendar exposes multiple parser exceptions
        raise CalendarValidationError(f"{path}: cannot parse ICS: {error}") from error

    if str(calendar.get("VERSION")) != "2.0":
        raise CalendarValidationError(f"{path}: VERSION must be 2.0")
    events = tuple(calendar.walk("VEVENT"))
    if not events:
        raise CalendarValidationError(f"{path}: calendar contains no events")

    uids: set[str] = set()
    semantic_keys: set[tuple[object, ...]] = set()
    active_counts: Counter[date] = Counter()
    first_date: date | None = None
    last_date: date | None = None
    for component in events:
        uid = str(component.get("UID", ""))
        if not uid or uid in uids:
            raise CalendarValidationError(f"{path}: missing or duplicate UID {uid!r}")
        uids.add(uid)

        start = _decoded_date(component, "DTSTART", path)
        end = _decoded_date(component, "DTEND", path)
        if end <= start:
            raise CalendarValidationError(f"{path}: {uid} has an invalid date range")
        first_date = start if first_date is None else min(first_date, start)
        inclusive_end = end - timedelta(days=1)
        last_date = (
            inclusive_end if last_date is None else max(last_date, inclusive_end)
        )

        if str(component.get("TRANSP", "")) != "TRANSPARENT":
            raise CalendarValidationError(f"{path}: {uid} must be transparent")
        if str(component.get("STATUS", "")) != "CONFIRMED":
            raise CalendarValidationError(f"{path}: {uid} must be confirmed")
        if component.get("RRULE") is not None:
            raise CalendarValidationError(f"{path}: {uid} must not use RRULE")
        if any(item.name == "VALARM" for item in component.subcomponents):
            raise CalendarValidationError(f"{path}: {uid} contains a default alarm")

        summary = str(component.get("SUMMARY", ""))
        if (
            not summary
            or len(summary) > 24
            or "｜" in summary
            or re.search(r"第\s*\d+\s*天", summary)
        ):
            raise CalendarValidationError(f"{path}: noisy or missing title for {uid}")
        if component.get("URL") is not None:
            raise CalendarValidationError(
                f"{path}: {uid} must not expose a per-event source URL"
            )
        description = str(component.get("DESCRIPTION", ""))
        forbidden_detail_tails = (
            "计算库：",
            "计算：Astronomy Engine",
            "来源：http",
            "说明：传统民俗信息仅供文化参考",
            "数据依据：International Meteor Organization",
        )
        if any(marker in description for marker in forbidden_detail_tails):
            raise CalendarValidationError(
                f"{path}: {uid} contains a repeated implementation/source tail"
            )

        kind = str(component.get("X-CN-CALENDAR-KIND", ""))
        concepts = tuple(
            sorted(
                value
                for value in str(component.get("X-CN-CALENDAR-CONCEPTS", "")).split(",")
                if value
            )
        )
        if not kind or not concepts:
            raise CalendarValidationError(f"{path}: {uid} lacks semantic metadata")
        data_status = str(component.get("X-CN-CALENDAR-DATA-STATUS", ""))
        if data_status not in {"CONFIRMED", "COMPUTED", "REVIEWED"}:
            raise CalendarValidationError(
                f"{path}: {uid} has an unknown data status {data_status!r}"
            )
        semantic_key = (start, end, kind, concepts)
        if semantic_key in semantic_keys:
            raise CalendarValidationError(f"{path}: duplicate semantic event {uid}")
        semantic_keys.add(semantic_key)

        apple_special_day = str(component.get("X-APPLE-SPECIAL-DAY", ""))
        if apple_special_day and apple_special_day not in {
            "WORK-HOLIDAY",
            "ALTERNATE-WORKDAY",
        }:
            raise CalendarValidationError(
                f"{path}: {uid} has an unknown Apple special-day value"
            )

        current = start
        while current < end:
            active_counts[current] += 1
            current += timedelta(days=1)

    crowded = {
        day.isoformat(): count
        for day, count in active_counts.items()
        if count > max_active_events_per_day
    }
    if crowded:
        raise CalendarValidationError(f"{path}: too many active events: {crowded}")

    return {
        "event_count": len(events),
        "first_date": first_date.isoformat() if first_date else None,
        "last_date": last_date.isoformat() if last_date else None,
        "sha256": hashlib.sha256(payload).hexdigest(),
    }


def validate_directory(path: Path) -> dict[str, dict[str, Any]]:
    manifest_path = path / "manifest.json"
    if not manifest_path.exists():
        raise CalendarValidationError(f"{path}: manifest.json is missing")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise CalendarValidationError(
            f"{manifest_path}: invalid JSON: {error}"
        ) from error
    feed_entries = manifest.get("feeds")
    if not isinstance(feed_entries, dict) or not feed_entries:
        raise CalendarValidationError(f"{manifest_path}: feeds must be non-empty")
    if manifest.get("schema_version") != 3:
        raise CalendarValidationError(f"{manifest_path}: schema_version must be 3")

    expected_files = set(feed_entries)
    actual_files = {item.name for item in path.glob("*.ics")}
    if actual_files != expected_files:
        missing = sorted(expected_files - actual_files)
        extra = sorted(actual_files - expected_files)
        raise CalendarValidationError(
            f"{path}: calendar file set differs; missing={missing}, extra={extra}"
        )

    results: dict[str, dict[str, Any]] = {}
    for filename, expected in sorted(feed_entries.items()):
        if not isinstance(expected, dict) or not filename.endswith(".ics"):
            raise CalendarValidationError(f"{manifest_path}: invalid feed entry")
        for key in (
            "name",
            "description",
            "category",
            "cadence",
            "source_type",
            "density",
            "tier",
        ):
            if not isinstance(expected.get(key), str) or not expected[key]:
                raise CalendarValidationError(
                    f"{manifest_path}: {filename} lacks {key}"
                )
        if expected["tier"] not in {"core", "optional", "dense"}:
            raise CalendarValidationError(
                f"{manifest_path}: {filename} has invalid tier"
            )
        events_per_year = expected.get("events_per_year")
        if not isinstance(events_per_year, (int, float)) or events_per_year <= 0:
            raise CalendarValidationError(
                f"{manifest_path}: {filename} lacks events_per_year"
            )
        sample_titles = expected.get("sample_titles")
        if (
            not isinstance(sample_titles, list)
            or not sample_titles
            or len(sample_titles) > 3
            or any(not isinstance(item, str) or not item for item in sample_titles)
        ):
            raise CalendarValidationError(
                f"{manifest_path}: {filename} has invalid sample_titles"
            )
        overlaps = expected.get("overlaps")
        if not isinstance(overlaps, list) or any(
            not isinstance(item, str) or item not in feed_entries or item == filename
            for item in overlaps
        ):
            raise CalendarValidationError(
                f"{manifest_path}: {filename} has invalid overlaps"
            )
        if not isinstance(expected.get("featured"), bool):
            raise CalendarValidationError(
                f"{manifest_path}: {filename} lacks featured state"
            )
        result = validate_file(path / filename)
        for key in ("event_count", "first_date", "last_date", "sha256"):
            if result[key] != expected.get(key):
                raise CalendarValidationError(
                    f"{manifest_path}: {filename} {key} is {result[key]!r}, "
                    f"expected {expected.get(key)!r}"
                )
        results[filename] = result
    return results


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Validate generated ICS feeds")
    parser.add_argument("paths", nargs="*", type=Path, default=[DEFAULT_OUTPUT_DIR])
    args = parser.parse_args(argv)
    for path in args.paths:
        resolved = path.resolve()
        if resolved.is_dir():
            results = validate_directory(resolved)
            for filename, result in results.items():
                print(f"{filename}: {result['event_count']} events, valid")
        else:
            result = validate_file(resolved)
            print(f"{resolved.name}: {result['event_count']} events, valid")


if __name__ == "__main__":
    main()
