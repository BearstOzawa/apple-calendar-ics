from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

from lunar_python import Solar

from .model import CalendarEvent, CultureConfig, Metadata


SOLAR_TERM_CONCEPTS = {
    "小寒": "minor-cold",
    "大寒": "major-cold",
    "立春": "start-of-spring",
    "雨水": "rain-water",
    "惊蛰": "awakening-of-insects",
    "春分": "spring-equinox",
    "清明": "qingming",
    "谷雨": "grain-rain",
    "立夏": "start-of-summer",
    "小满": "grain-buds",
    "芒种": "grain-in-ear",
    "夏至": "summer-solstice",
    "小暑": "minor-heat",
    "大暑": "major-heat",
    "立秋": "start-of-autumn",
    "处暑": "end-of-heat",
    "白露": "white-dew",
    "秋分": "autumn-equinox",
    "寒露": "cold-dew",
    "霜降": "frost-descent",
    "立冬": "start-of-winter",
    "小雪": "minor-snow",
    "大雪": "major-snow",
    "冬至": "winter-solstice",
}


def _computed_description(kind: str, config: CultureConfig) -> str:
    return "\n".join(
        [
            f"类型：{kind}。本事件依据公开历法规则计算，不代表放假安排。",
            f"计算库：{config.source.title}（{config.source.license}）",
            f"来源：{config.source.url}",
        ]
    )


def culture_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    modified = datetime.combine(metadata.dataset_version, time.min, tzinfo=timezone.utc)
    rules = {(rule.month, rule.day): rule for rule in config.lunar_festivals}
    current = date(config.start_year, 1, 1)
    end = date(config.end_year + 1, 1, 1)

    while current < end:
        lunar = Solar.fromYmd(current.year, current.month, current.day).getLunar()
        lunar_month = lunar.getMonth()
        lunar_day = lunar.getDay()
        rule = rules.get((lunar_month, lunar_day)) if lunar_month > 0 else None
        if rule is not None:
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{current.year}-{rule.id}",
                    kind="festival",
                    concepts=(rule.concept,),
                    title=rule.name,
                    start=current,
                    end=current + timedelta(days=1),
                    description=_computed_description("传统节日", config),
                    categories=("中国日历", "传统节日"),
                    source_url=config.source.url,
                    last_modified=modified,
                    data_status="computed",
                )
            )

        if config.include_lunar_new_years_eve and lunar_month == 12:
            tomorrow = current + timedelta(days=1)
            next_lunar = Solar.fromYmd(
                tomorrow.year, tomorrow.month, tomorrow.day
            ).getLunar()
            if next_lunar.getMonth() == 1 and next_lunar.getDay() == 1:
                events.append(
                    CalendarEvent(
                        logical_id=f"cn-{current.year}-lunar-new-years-eve",
                        kind="festival",
                        concepts=("lunar-new-years-eve",),
                        title="除夕",
                        start=current,
                        end=tomorrow,
                        description=_computed_description("传统节日", config),
                        categories=("中国日历", "传统节日"),
                        source_url=config.source.url,
                        last_modified=modified,
                        data_status="computed",
                    )
                )

        if config.include_solar_terms:
            term = lunar.getJieQi()
            concept = SOLAR_TERM_CONCEPTS.get(term)
            if concept is not None:
                events.append(
                    CalendarEvent(
                        logical_id=f"cn-{current.year}-solar-term-{concept}",
                        kind="solar-term",
                        concepts=(concept,),
                        title=term,
                        start=current,
                        end=current + timedelta(days=1),
                        description=_computed_description("二十四节气", config),
                        categories=("中国日历", "二十四节气"),
                        source_url=config.source.url,
                        last_modified=modified,
                        data_status="computed",
                    )
                )

        current += timedelta(days=1)

    return tuple(sorted(events, key=lambda event: event.sort_key))
