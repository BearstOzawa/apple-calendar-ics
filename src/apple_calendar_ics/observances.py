from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from .model import CalendarEvent, Metadata, ObservanceConfig


def observance_events(
    config: ObservanceConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    modified = datetime.combine(metadata.dataset_version, time.min, tzinfo=timezone.utc)
    events: list[CalendarEvent] = []
    for year in range(config.start_year, config.end_year + 1):
        for rule in config.rules:
            current = date(year, rule.month, rule.day)
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{year}-observance-{rule.id}",
                    kind="public-observance",
                    concepts=(rule.concept,),
                    title=rule.name,
                    start=current,
                    end=current + timedelta(days=1),
                    description="\n".join(
                        [
                            rule.note,
                            "本频道用于日期识别；是否放假以事件详情和现行规定为准。",
                            f"依据：{rule.source.title}",
                        ]
                    ),
                    categories=("中国日历", "公众节日与纪念日"),
                    last_modified=modified,
                    data_status="reviewed",
                )
            )
    return tuple(sorted(events, key=lambda event: event.sort_key))
