from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from .model import CalendarEvent, OfficialPeriod, OfficialYear


def _utc_midnight(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=timezone.utc)


def _format_date(day: date, *, include_year: bool = False) -> str:
    prefix = f"{day.year}年" if include_year else ""
    return f"{prefix}{day.month}月{day.day}日"


def _format_range(period: OfficialPeriod) -> str:
    if period.start == period.end_inclusive:
        return _format_date(period.start)
    if period.start.month == period.end_inclusive.month:
        return (
            f"{period.start.month}月{period.start.day}日至{period.end_inclusive.day}日"
        )
    return f"{_format_date(period.start)}至{_format_date(period.end_inclusive)}"


def official_events(years: tuple[OfficialYear, ...]) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    for year_data in years:
        modified = _utc_midnight(year_data.published_at)
        for period in year_data.periods:
            workday_text = "、".join(
                _format_date(item.date) for item in period.workdays
            )
            description_parts = [
                f"{year_data.year}年{period.name}放假安排：{_format_range(period)}，"
                f"共{period.duration_days}天。"
            ]
            if workday_text:
                description_parts.append(f"调休上班：{workday_text}。")
            description_parts.extend(
                [
                    f"官方通知：{year_data.source.title}",
                    f"文号：{year_data.source.document_number}",
                ]
            )
            events.append(
                CalendarEvent(
                    logical_id=(f"cn-{year_data.year}-{period.id}-holiday-period"),
                    kind="holiday-period",
                    concepts=period.concepts,
                    title=f"{period.name}假期（{period.duration_days}天）",
                    start=period.start,
                    end=period.end_inclusive + timedelta(days=1),
                    description="\n".join(description_parts),
                    categories=("中国日历", "放假"),
                    last_modified=modified,
                    sequence=period.sequence,
                    data_status="confirmed",
                    apple_special_day="WORK-HOLIDAY",
                )
            )
            for workday in period.workdays:
                description = "\n".join(
                    [
                        f"{_format_date(workday.date, include_year=True)}为{period.name}调休上班日。",
                        "这是全天提示，不会占用忙闲状态，也不包含默认提醒。",
                        f"官方通知：{year_data.source.title}",
                        f"文号：{year_data.source.document_number}",
                    ]
                )
                events.append(
                    CalendarEvent(
                        logical_id=(
                            f"cn-{year_data.year}-{period.id}-{workday.id}-workday"
                        ),
                        kind="alternate-workday",
                        concepts=period.concepts,
                        title=f"{period.name}调休上班",
                        start=workday.date,
                        end=workday.date + timedelta(days=1),
                        description=description,
                        categories=("中国日历", "调休上班"),
                        last_modified=modified,
                        sequence=workday.sequence,
                        data_status="confirmed",
                        apple_special_day="ALTERNATE-WORKDAY",
                    )
                )
    return tuple(sorted(events, key=lambda event: event.sort_key))
