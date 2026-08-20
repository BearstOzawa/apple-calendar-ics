from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from .model import CalendarEvent, LifestyleConfig, LifestyleRule, Metadata


def _event_date(year: int, rule: LifestyleRule) -> date:
    if rule.day is not None:
        return date(year, rule.month, rule.day)
    if rule.weekday is None or rule.occurrence is None:
        raise ValueError(f"incomplete lifestyle rule: {rule.id}")
    first = date(year, rule.month, 1)
    offset = (rule.weekday - first.weekday()) % 7
    return first + timedelta(days=offset + 7 * (rule.occurrence - 1))


def lifestyle_events(
    config: LifestyleConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    modified = datetime.combine(metadata.dataset_version, time.min, tzinfo=timezone.utc)
    events: list[CalendarEvent] = []
    for year in range(config.start_year, config.end_year + 1):
        for rule in config.rules:
            current = _event_date(year, rule)
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{year}-lifestyle-{rule.id}",
                    kind="lifestyle-festival",
                    concepts=(rule.concept,),
                    title=rule.name,
                    start=current,
                    end=current + timedelta(days=1),
                    description=rule.note,
                    categories=("中国日历", "生活节日"),
                    last_modified=modified,
                    data_status="reviewed",
                )
            )
    return tuple(sorted(events, key=lambda event: event.sort_key))
