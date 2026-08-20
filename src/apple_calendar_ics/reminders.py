from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from .model import CalendarEvent, OfficialYear


def holiday_reminder_events(
    years: tuple[OfficialYear, ...],
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    for year_data in years:
        modified = datetime.combine(
            year_data.published_at, time.min, tzinfo=timezone.utc
        )
        for period in year_data.periods:
            current = period.start - timedelta(days=7)
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{year_data.year}-{period.id}-seven-day-reminder",
                    kind="holiday-reminder",
                    concepts=period.concepts,
                    title=f"{period.name}假期还有 7 天",
                    start=current,
                    end=current + timedelta(days=1),
                    description=(
                        f"已确认的{period.name}假期将于"
                        f"{period.start.month}月{period.start.day}日开始，"
                        f"共{period.duration_days}天。"
                    ),
                    categories=("中国日历", "假期提醒"),
                    last_modified=modified,
                    data_status="confirmed",
                )
            )
    return tuple(sorted(events, key=lambda event: event.sort_key))
