from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from lunar_python import Solar

from .model import CalendarEvent, CultureConfig, Metadata


def _month_name(lunar: object) -> str:
    name = lunar.getMonthInChinese()
    return f"闰{name}月" if lunar.getMonth() < 0 else f"{name}月"


def lunar_day_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    modified = datetime.combine(metadata.dataset_version, time.min, tzinfo=timezone.utc)
    events: list[CalendarEvent] = []
    current = date(config.start_year, 1, 1)
    end = date(config.end_year + 1, 1, 1)
    while current < end:
        lunar = Solar.fromYmd(current.year, current.month, current.day).getLunar()
        lunar_day = lunar.getDay()
        if lunar_day in {1, 15}:
            month_name = _month_name(lunar)
            day_name = lunar.getDayInChinese()
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{current.isoformat()}-lunar-day-{lunar_day}",
                    kind="lunar-day",
                    concepts=(
                        "lunar-month-start" if lunar_day == 1 else "lunar-midmonth",
                    ),
                    title=f"{month_name}{day_name}",
                    start=current,
                    end=current + timedelta(days=1),
                    description=f"农历{month_name}{day_name}。",
                    categories=("中国日历", "农历初一十五"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
        current += timedelta(days=1)
    return tuple(events)
