from __future__ import annotations

import argparse
import hashlib
import json
from datetime import timedelta
from pathlib import Path

from .culture import culture_events
from .ics import serialize_feed
from .loader import load_culture_config, load_metadata, load_official_years
from .model import CalendarEvent, Feed
from .official import official_events
from .paths import DEFAULT_DATA_DIR, DEFAULT_OUTPUT_DIR


def _deduplicate(events: list[CalendarEvent]) -> tuple[CalendarEvent, ...]:
    by_logical_id: dict[str, CalendarEvent] = {}
    semantic_keys: set[tuple[object, ...]] = set()
    for event in sorted(events, key=lambda item: item.sort_key):
        if event.logical_id in by_logical_id:
            raise ValueError(f"duplicate logical event id: {event.logical_id}")
        semantic_key = (
            event.start,
            event.end,
            event.kind,
            tuple(sorted(event.concepts)),
        )
        if semantic_key in semantic_keys:
            raise ValueError(f"duplicate semantic event: {event.logical_id}")
        semantic_keys.add(semantic_key)
        by_logical_id[event.logical_id] = event
    return tuple(by_logical_id.values())


def build_feeds(data_dir: Path) -> tuple[Feed, ...]:
    metadata = load_metadata(data_dir)
    years = load_official_years(data_dir)
    culture_config = load_culture_config(data_dir)
    official = official_events(years)
    culture = culture_events(culture_config, metadata)

    holiday_periods = [event for event in official if event.kind == "holiday-period"]
    essential_culture: list[CalendarEvent] = []
    for event in culture:
        same_start_official = any(
            event.start == period.start
            and bool(set(event.concepts) & set(period.concepts))
            for period in holiday_periods
        )
        if not same_start_official:
            essential_culture.append(event)

    work_rest = Feed(
        slug="work-rest",
        name="中国班休",
        description="中国大陆法定放假与调休上班；全天、透明、无默认提醒。",
        events=_deduplicate(list(official)),
    )
    essential = Feed(
        slug="essential",
        name="中国日历・精选",
        description="法定班休、核心传统节日与二十四节气；清爽去重版。",
        events=_deduplicate(list(official) + essential_culture),
    )
    return (essential, work_rest)


def _write_if_changed(path: Path, payload: bytes) -> bool:
    if path.exists() and path.read_bytes() == payload:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return True


def build(data_dir: Path, output_dir: Path) -> dict[str, object]:
    metadata = load_metadata(data_dir)
    official_years = load_official_years(data_dir)
    culture_config = load_culture_config(data_dir)
    feeds = build_feeds(data_dir)
    feed_manifest: dict[str, object] = {}
    for feed in feeds:
        payload = serialize_feed(feed, metadata)
        path = output_dir / f"{feed.slug}.ics"
        changed = _write_if_changed(path, payload)
        feed_manifest[f"{feed.slug}.ics"] = {
            "name": feed.name,
            "description": feed.description,
            "event_count": len(feed.events),
            "first_date": min(event.start for event in feed.events).isoformat(),
            "last_date": max(
                event.end - timedelta(days=1) for event in feed.events
            ).isoformat(),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "changed": changed,
        }

    manifest = {
        "schema_version": 1,
        "dataset_version": metadata.dataset_version.isoformat(),
        "confirmed_work_rest_years": [year.year for year in official_years],
        "confirmed_work_rest_through": max(year.year for year in official_years),
        "culture_years": [culture_config.start_year, culture_config.end_year],
        "feeds": feed_manifest,
        "sources": [
            {
                "year": year.year,
                "title": year.source.title,
                "url": year.source.url,
                "published_at": year.published_at.isoformat(),
            }
            for year in official_years
        ],
    }
    persisted_manifest = {
        **manifest,
        "feeds": {
            filename: {key: value for key, value in details.items() if key != "changed"}
            for filename, details in feed_manifest.items()
        },
    }
    manifest_payload = (
        json.dumps(persisted_manifest, ensure_ascii=False, indent=2, sort_keys=True)
        + "\n"
    ).encode("utf-8")
    _write_if_changed(output_dir / "manifest.json", manifest_payload)
    return manifest


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build Chinese calendar ICS feeds")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args(argv)
    manifest = build(args.data_dir.resolve(), args.output.resolve())
    for filename, details in manifest["feeds"].items():
        marker = "updated" if details["changed"] else "unchanged"
        print(f"{filename}: {details['event_count']} events ({marker})")


if __name__ == "__main__":
    main()
