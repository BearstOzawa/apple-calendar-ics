from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import astronomy

from .model import CalendarEvent, CultureConfig, Metadata


PHASES = {
    0: ("new-moon", "新月"),
    1: ("first-quarter", "上弦月"),
    2: ("full-moon", "满月"),
    3: ("third-quarter", "下弦月"),
}

ECLIPSE_NAMES = {
    astronomy.EclipseKind.Penumbral: "半影月食",
    astronomy.EclipseKind.Partial: "偏食",
    astronomy.EclipseKind.Annular: "日环食",
    astronomy.EclipseKind.Total: "全食",
}

BODY_NAMES = {
    astronomy.Body.Mercury: "水星",
    astronomy.Body.Venus: "金星",
    astronomy.Body.Mars: "火星",
    astronomy.Body.Jupiter: "木星",
    astronomy.Body.Saturn: "土星",
}

ZODIAC = (
    ("aquarius", "水瓶座", 300.0, 1, 18),
    ("pisces", "双鱼座", 330.0, 2, 17),
    ("aries", "白羊座", 0.0, 3, 18),
    ("taurus", "金牛座", 30.0, 4, 18),
    ("gemini", "双子座", 60.0, 5, 19),
    ("cancer", "巨蟹座", 90.0, 6, 19),
    ("leo", "狮子座", 120.0, 7, 21),
    ("virgo", "处女座", 150.0, 8, 21),
    ("libra", "天秤座", 180.0, 9, 21),
    ("scorpio", "天蝎座", 210.0, 10, 21),
    ("sagittarius", "射手座", 240.0, 11, 20),
    ("capricorn", "摩羯座", 270.0, 12, 20),
)


@dataclass(frozen=True)
class MeteorShower:
    slug: str
    name: str
    longitude: float
    month: int
    day: int
    active: str
    zhr: str


METEOR_SHOWERS = (
    MeteorShower(
        "quadrantids", "象限仪座流星雨", 283.15, 1, 3, "12月28日至1月12日", "约80"
    ),
    MeteorShower("lyrids", "天琴座流星雨", 32.32, 4, 22, "4月14日至30日", "约18"),
    MeteorShower(
        "eta-aquariids", "宝瓶座η流星雨", 45.5, 5, 6, "4月19日至5月28日", "约50"
    ),
    MeteorShower(
        "southern-delta-aquariids",
        "宝瓶座δ南流星雨",
        128.0,
        7,
        31,
        "7月12日至8月23日",
        "约25",
    ),
    MeteorShower("perseids", "英仙座流星雨", 140.0, 8, 13, "7月17日至8月24日", "约100"),
    MeteorShower(
        "orionids", "猎户座流星雨", 208.0, 10, 21, "10月2日至11月7日", "20以上"
    ),
    MeteorShower("leonids", "狮子座流星雨", 235.27, 11, 17, "11月6日至30日", "约15"),
    MeteorShower("geminids", "双子座流星雨", 262.2, 12, 14, "12月4日至20日", "约150"),
    MeteorShower("ursids", "小熊座流星雨", 270.7, 12, 22, "12月17日至26日", "约10"),
)


def _modified(metadata: Metadata) -> datetime:
    return datetime.combine(metadata.dataset_version, time.min, tzinfo=timezone.utc)


def _local_datetime(value: astronomy.Time, metadata: Metadata) -> datetime:
    utc_value = value.Utc().replace(tzinfo=timezone.utc)
    return utc_value.astimezone(ZoneInfo(metadata.timezone))


def _format_local(value: astronomy.Time, metadata: Metadata) -> str:
    return _local_datetime(value, metadata).strftime("%Y年%m月%d日 %H:%M")


def _eclipse_title(body: str, kind_name: str) -> str:
    if body in kind_name:
        return kind_name
    return f"{body}{kind_name}"


def moon_phase_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    cursor = astronomy.Time.Make(config.start_year, 1, 1, 0, 0, 0)
    end = datetime(config.end_year + 1, 1, 1, tzinfo=timezone.utc)
    while True:
        quarter = astronomy.SearchMoonQuarter(cursor)
        utc_value = quarter.time.Utc().replace(tzinfo=timezone.utc)
        if utc_value >= end:
            break
        local_value = _local_datetime(quarter.time, metadata)
        slug, name = PHASES[quarter.quarter]
        current = local_value.date()
        events.append(
            CalendarEvent(
                logical_id=f"astro-{current.isoformat()}-{slug}",
                kind="moon-phase",
                concepts=(slug,),
                title=name,
                start=current,
                end=current + timedelta(days=1),
                description="\n".join(
                    [
                        f"{name}发生于北京时间 {_format_local(quarter.time, metadata)}。",
                        "月相时刻为地心视角计算值。",
                    ]
                ),
                categories=("中国日历", "月相", "天文"),
                last_modified=modified,
                data_status="computed",
            )
        )
        cursor = quarter.time.AddDays(1.0)
    return tuple(events)


def _eclipse_events(config: CultureConfig, metadata: Metadata) -> list[CalendarEvent]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    start = astronomy.Time.Make(config.start_year, 1, 1, 0, 0, 0)
    end = datetime(config.end_year + 1, 1, 1, tzinfo=timezone.utc)

    lunar = astronomy.SearchLunarEclipse(start)
    while lunar.peak.Utc().replace(tzinfo=timezone.utc) < end:
        local_value = _local_datetime(lunar.peak, metadata)
        current = local_value.date()
        kind_name = ECLIPSE_NAMES[lunar.kind]
        title = _eclipse_title("月", kind_name)
        events.append(
            CalendarEvent(
                logical_id=f"astro-{current.isoformat()}-lunar-eclipse-{lunar.kind.name.lower()}",
                kind="lunar-eclipse",
                concepts=("lunar-eclipse", lunar.kind.name.lower()),
                title=title,
                start=current,
                end=current + timedelta(days=1),
                description="\n".join(
                    [
                        f"食甚：北京时间 {_format_local(lunar.peak, metadata)}。",
                        "实际可见情况取决于所在地是否处于夜间及天气条件。",
                    ]
                ),
                categories=("中国日历", "天象", "月食"),
                last_modified=modified,
                data_status="computed",
            )
        )
        lunar = astronomy.NextLunarEclipse(lunar.peak)

    solar = astronomy.SearchGlobalSolarEclipse(start)
    while solar.peak.Utc().replace(tzinfo=timezone.utc) < end:
        local_value = _local_datetime(solar.peak, metadata)
        current = local_value.date()
        kind_name = ECLIPSE_NAMES[solar.kind]
        location = ""
        if solar.latitude == solar.latitude and solar.longitude == solar.longitude:
            location = (
                f"全球食甚中心约位于纬度 {solar.latitude:.1f}°、"
                f"经度 {solar.longitude:.1f}°。"
            )
        events.append(
            CalendarEvent(
                logical_id=f"astro-{current.isoformat()}-solar-eclipse-{solar.kind.name.lower()}",
                kind="solar-eclipse",
                concepts=("solar-eclipse", solar.kind.name.lower()),
                title=_eclipse_title("日", kind_name),
                start=current,
                end=current + timedelta(days=1),
                description="\n".join(
                    [
                        f"食甚：北京时间 {_format_local(solar.peak, metadata)}。",
                        location or "本事件为全球日食；具体可见区域需另行查询。",
                        "请勿在没有合格日食观测设备的情况下直视太阳。",
                    ]
                ),
                categories=("中国日历", "天象", "日食"),
                last_modified=modified,
                data_status="computed",
            )
        )
        solar = astronomy.NextGlobalSolarEclipse(solar.peak)
    return events


def _meteor_events(config: CultureConfig, metadata: Metadata) -> list[CalendarEvent]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    for year in range(config.start_year, config.end_year + 1):
        for shower in METEOR_SHOWERS:
            start_day = max(1, shower.day - 3)
            start = astronomy.Time.Make(year, shower.month, start_day, 0, 0, 0)
            peak = astronomy.SearchSunLongitude(shower.longitude, start, 8.0)
            if peak is None:
                raise ValueError(f"cannot calculate {shower.slug} maximum for {year}")
            local_value = _local_datetime(peak, metadata)
            current = local_value.date()
            events.append(
                CalendarEvent(
                    logical_id=f"astro-{year}-{shower.slug}-maximum",
                    kind="meteor-shower",
                    concepts=("meteor-shower", shower.slug),
                    title=f"{shower.name}极大",
                    start=current,
                    end=current + timedelta(days=1),
                    description="\n".join(
                        [
                            f"参考极大：北京时间 {_format_local(peak, metadata)}。",
                            f"常见活跃期：{shower.active}；参考 ZHR：{shower.zhr}。",
                            "极大时间按 IMO 参考太阳黄经计算，实际峰值可能前后浮动。",
                            "观测效果取决于月光、天气、光污染和辐射点高度。",
                        ]
                    ),
                    categories=("中国日历", "天象", "流星雨"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
    return events


def _planet_events(config: CultureConfig, metadata: Metadata) -> list[CalendarEvent]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    start = astronomy.Time.Make(config.start_year, 1, 1, 0, 0, 0)
    end = datetime(config.end_year + 1, 1, 1, tzinfo=timezone.utc)

    for body in (astronomy.Body.Mars, astronomy.Body.Jupiter, astronomy.Body.Saturn):
        cursor = start
        while True:
            event_time = astronomy.SearchRelativeLongitude(body, 0.0, cursor)
            utc_value = event_time.Utc().replace(tzinfo=timezone.utc)
            if utc_value >= end:
                break
            local_value = _local_datetime(event_time, metadata)
            current = local_value.date()
            body_name = BODY_NAMES[body]
            events.append(
                CalendarEvent(
                    logical_id=f"astro-{current.isoformat()}-{body.name.lower()}-opposition",
                    kind="planetary-event",
                    concepts=("opposition", body.name.lower()),
                    title=f"{body_name}冲日",
                    start=current,
                    end=current + timedelta(days=1),
                    description="\n".join(
                        [
                            f"{body_name}冲日发生于北京时间 {_format_local(event_time, metadata)}。",
                            "冲日前后通常是观测外行星的良好时段，实际效果受天气和位置影响。",
                        ]
                    ),
                    categories=("中国日历", "天象", "行星"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
            cursor = event_time.AddDays(30.0)

    for body in (astronomy.Body.Mercury, astronomy.Body.Venus):
        cursor = start
        while True:
            elongation = astronomy.SearchMaxElongation(body, cursor)
            if elongation is None:
                break
            utc_value = elongation.time.Utc().replace(tzinfo=timezone.utc)
            if utc_value >= end:
                break
            local_value = _local_datetime(elongation.time, metadata)
            current = local_value.date()
            body_name = BODY_NAMES[body]
            visibility = (
                "东大距，适合傍晚观测"
                if elongation.visibility == astronomy.Visibility.Evening
                else "西大距，适合清晨观测"
            )
            events.append(
                CalendarEvent(
                    logical_id=f"astro-{current.isoformat()}-{body.name.lower()}-elongation",
                    kind="planetary-event",
                    concepts=("maximum-elongation", body.name.lower()),
                    title=f"{body_name}{visibility[:3]}",
                    start=current,
                    end=current + timedelta(days=1),
                    description="\n".join(
                        [
                            f"{body_name}{visibility}。",
                            f"北京时间：{_format_local(elongation.time, metadata)}。",
                            f"与太阳最大角距约 {elongation.elongation:.1f}°。",
                        ]
                    ),
                    categories=("中国日历", "天象", "行星"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
            cursor = elongation.time.AddDays(10.0)
    return events


def sky_event_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events = [
        *_eclipse_events(config, metadata),
        *_meteor_events(config, metadata),
        *_planet_events(config, metadata),
    ]
    return tuple(sorted(events, key=lambda event: event.sort_key))


def zodiac_season_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    for year in range(config.start_year, config.end_year + 1):
        for slug, name, longitude, month, day in ZODIAC:
            start = astronomy.Time.Make(year, month, day, 0, 0, 0)
            ingress = astronomy.SearchSunLongitude(longitude, start, 8.0)
            if ingress is None:
                raise ValueError(f"cannot calculate {name} ingress for {year}")
            local_value = _local_datetime(ingress, metadata)
            current = local_value.date()
            events.append(
                CalendarEvent(
                    logical_id=f"astro-{year}-zodiac-{slug}",
                    kind="zodiac-season",
                    concepts=("tropical-zodiac", slug),
                    title=f"{name}季节开始",
                    start=current,
                    end=current + timedelta(days=1),
                    description="\n".join(
                        [
                            f"太阳进入{name}黄道区段：北京时间 {_format_local(ingress, metadata)}。",
                            "这里采用热带黄道的十二等分定义，不等同于 IAU 天文学星座边界。",
                            "本频道只发布可复现的星象时间，不提供个人运势解读。",
                        ]
                    ),
                    categories=("中国日历", "星象", "星座季节"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
    return tuple(sorted(events, key=lambda event: event.sort_key))
