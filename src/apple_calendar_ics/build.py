from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date, timedelta
from pathlib import Path

from lunar_python import Solar

from .celestial import moon_phase_events, sky_event_events
from .culture import culture_events
from .ics import serialize_feed
from .lifestyle import lifestyle_events
from .loader import (
    load_culture_config,
    load_lifestyle_config,
    load_metadata,
    load_observance_config,
    load_official_years,
)
from .lunar_days import lunar_day_events
from .model import CalendarEvent, Feed
from .observances import observance_events
from .official import official_events
from .paths import DEFAULT_DATA_DIR, DEFAULT_OUTPUT_DIR
from .reminders import holiday_reminder_events
from .traditional import almanac_events, lunar_mansion_events, seasonal_events


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
    observance_config = load_observance_config(data_dir)
    lifestyle_config = load_lifestyle_config(data_dir)
    official = official_events(years)
    culture = culture_events(culture_config, metadata)
    festivals = [event for event in culture if event.kind == "festival"]
    solar_terms = [event for event in culture if event.kind == "solar-term"]
    observances = observance_events(observance_config, metadata)
    lifestyle = lifestyle_events(lifestyle_config, metadata)
    lunar_days = lunar_day_events(culture_config, metadata)
    holiday_reminders = holiday_reminder_events(years)
    almanac = almanac_events(culture_config, metadata)
    lunar_mansions = lunar_mansion_events(culture_config, metadata)
    seasonal = seasonal_events(culture_config, metadata)
    moon_phases = moon_phase_events(culture_config, metadata)
    sky_events = sky_event_events(culture_config, metadata)

    holiday_periods = [event for event in official if event.kind == "holiday-period"]
    essential_culture: list[CalendarEvent] = []
    for event in culture:
        covered_by_official = any(
            period.start <= event.start < period.end
            and bool(set(event.concepts) & set(period.concepts))
            for period in holiday_periods
        )
        if not covered_by_official:
            essential_culture.append(event)

    work_rest = Feed(
        slug="work-rest",
        name="中国班休",
        description="中国大陆法定放假与调休上班；全天、透明、无默认提醒。",
        events=_deduplicate(list(official)),
        category="推荐",
        cadence="按官方通知更新",
        source_type="官方",
        density="低频",
        tier="core",
        overlaps=("essential.ics",),
        featured=True,
    )
    essential = Feed(
        slug="essential",
        name="中国日历",
        description="法定班休、核心传统节日与二十四节气；清爽去重版。",
        events=_deduplicate(list(official) + essential_culture),
        category="推荐",
        cadence="按官方通知更新",
        source_type="官方 + 算法",
        density="低频",
        tier="core",
        overlaps=("work-rest.ics", "festivals.ics", "solar-terms.ics"),
        featured=True,
    )
    return (
        essential,
        work_rest,
        Feed(
            slug="festivals",
            name="传统节日",
            description="除夕、元宵、龙抬头、七夕、中元、重阳等传统节日。",
            events=_deduplicate(list(festivals)),
            category="基础日期",
            cadence="每年约十次",
            source_type="历法算法",
            density="低频",
            tier="core",
            overlaps=("essential.ics",),
        ),
        Feed(
            slug="solar-terms",
            name="二十四节气",
            description="立春、春分、夏至、冬至等二十四节气。",
            events=_deduplicate(list(solar_terms)),
            category="基础日期",
            cadence="每月两次",
            source_type="历法算法",
            density="低频",
            tier="core",
            overlaps=("essential.ics",),
        ),
        Feed(
            slug="observances",
            name="公众节日与纪念日",
            description="妇女节、青年节、教师节及全国性纪念日；详情注明是否放假。",
            events=_deduplicate(list(observances)),
            category="基础日期",
            cadence="每年十三次",
            source_type="国务院行政法规",
            density="低频",
            tier="optional",
        ),
        Feed(
            slug="holiday-reminders",
            name="假期提醒",
            description="每个已确认法定假期开始前 7 天提示一次，不做逐日倒计时。",
            events=_deduplicate(list(holiday_reminders)),
            category="生活提醒",
            cadence="每个假期一次",
            source_type="官方",
            density="低频",
            tier="optional",
        ),
        Feed(
            slug="life-festivals",
            name="生活节日",
            description="母亲节、父亲节、情人节、520、感恩节与圣诞节等常用日期。",
            events=_deduplicate(list(lifestyle)),
            category="生活提醒",
            cadence="每年九次",
            source_type="通行日期规则",
            density="低频",
            tier="optional",
        ),
        Feed(
            slug="lunar-days",
            name="农历初一十五",
            description="每个农历月的初一和十五；不生成每日农历事件。",
            events=_deduplicate(list(lunar_days)),
            category="传统历法",
            cadence="每月两次",
            source_type="历法算法",
            density="低频",
            tier="optional",
            overlaps=("festivals.ics",),
        ),
        Feed(
            slug="almanac",
            name="黄历宜忌",
            description="每日一条宜忌摘要，完整农历、干支、冲煞与民俗信息放在详情中。",
            events=_deduplicate(list(almanac)),
            category="高频文化",
            cadence="每日一条",
            source_type="算法",
            density="高频",
            tier="dense",
            overlaps=("lunar-mansions.ics",),
        ),
        Feed(
            slug="lunar-mansions",
            name="二十八星宿",
            description="每日星宿、十二值星、值日天神与九星；民俗参考。",
            events=_deduplicate(list(lunar_mansions)),
            category="高频文化",
            cadence="每日一条",
            source_type="算法",
            density="高频",
            tier="dense",
            overlaps=("almanac.ics",),
        ),
        Feed(
            slug="seasonal",
            name="中国时令",
            description="七十二候、数九与三伏的时令节点。",
            events=_deduplicate(list(seasonal)),
            category="传统历法",
            cadence="约每五日",
            source_type="算法",
            density="中频",
            tier="optional",
        ),
        Feed(
            slug="moon-phases",
            name="月相",
            description="新月、上弦月、满月与下弦月，北京时间。",
            events=_deduplicate(list(moon_phases)),
            category="天文与星象",
            cadence="每月四次",
            source_type="天文算法",
            density="低频",
            tier="optional",
        ),
        Feed(
            slug="sky-events",
            name="重要天象",
            description="日月食、主要流星雨、行星冲日与水星金星大距。",
            events=_deduplicate(list(sky_events)),
            category="天文与星象",
            cadence="不定期",
            source_type="天文算法 + 年表",
            density="低频",
            tier="optional",
        ),
    )


def _lunar_calendar_days(start_year: int, end_year: int) -> dict[str, str]:
    result: dict[str, str] = {}
    current = date(start_year, 1, 1)
    end = date(end_year + 1, 1, 1)
    while current < end:
        lunar = Solar.fromYmd(current.year, current.month, current.day).getLunar()
        if lunar.getDay() == 1:
            month = lunar.getMonthInChinese()
            label = f"{'闰' if lunar.getMonth() < 0 else ''}{month}月"
        else:
            label = lunar.getDayInChinese()
        result[current.isoformat()] = label
        current += timedelta(days=1)
    return result


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
    observance_config = load_observance_config(data_dir)
    lifestyle_config = load_lifestyle_config(data_dir)
    feeds = build_feeds(data_dir)
    expected_files = {f"{feed.slug}.ics" for feed in feeds}
    for stale_path in output_dir.glob("*.ics"):
        if stale_path.name not in expected_files:
            stale_path.unlink()
    feed_manifest: dict[str, object] = {}
    for feed in feeds:
        payload = serialize_feed(feed, metadata)
        path = output_dir / f"{feed.slug}.ics"
        changed = _write_if_changed(path, payload)
        coverage_years = (
            max(event.start.year for event in feed.events)
            - min(event.start.year for event in feed.events)
            + 1
        )
        preview_events = [
            event
            for event in feed.events
            if event.start.year == 2026 and event.start.month == 4
        ] or [event for event in feed.events if event.start.year == 2026]
        sample_titles: list[str] = []
        for event in preview_events:
            if event.title not in sample_titles:
                sample_titles.append(event.title)
            if len(sample_titles) == 3:
                break
        feed_manifest[f"{feed.slug}.ics"] = {
            "name": feed.name,
            "description": feed.description,
            "event_count": len(feed.events),
            "first_date": min(event.start for event in feed.events).isoformat(),
            "last_date": max(
                event.end - timedelta(days=1) for event in feed.events
            ).isoformat(),
            "sha256": hashlib.sha256(payload).hexdigest(),
            "category": feed.category,
            "cadence": feed.cadence,
            "source_type": feed.source_type,
            "density": feed.density,
            "tier": feed.tier,
            "events_per_year": round(len(feed.events) / coverage_years, 1),
            "sample_titles": sample_titles,
            "preview_events": (
                [
                    {
                        "start": event.start.isoformat(),
                        "end": event.end.isoformat(),
                        "title": event.title,
                    }
                    for event in feed.events
                ]
                if feed.tier != "dense"
                else []
            ),
            "overlaps": list(feed.overlaps),
            "featured": feed.featured,
            "changed": changed,
        }

    manifest = {
        "schema_version": 4,
        "dataset_version": metadata.dataset_version.isoformat(),
        "confirmed_work_rest_years": [year.year for year in official_years],
        "confirmed_work_rest_through": max(year.year for year in official_years),
        "culture_years": [culture_config.start_year, culture_config.end_year],
        "observance_years": [
            observance_config.start_year,
            observance_config.end_year,
        ],
        "lifestyle_years": [
            lifestyle_config.start_year,
            lifestyle_config.end_year,
        ],
        "calendar_days": _lunar_calendar_days(
            culture_config.start_year, culture_config.end_year
        ),
        "algorithm_sources": [
            {
                "title": culture_config.source.title,
                "url": culture_config.source.url,
                "license": culture_config.source.license,
            },
            {
                "title": "Astronomy Engine 2.1.19",
                "url": "https://github.com/cosinekitty/astronomy",
                "license": "MIT",
            },
            {
                "title": "International Meteor Organization Meteor Shower Calendar",
                "url": "https://www.imo.net/resources/calendar/",
                "license": "reference facts with attribution",
            },
        ],
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
