from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from functools import lru_cache

from lunar_python import Solar

from .model import CalendarEvent, CultureConfig, Metadata


def _modified(metadata: Metadata) -> datetime:
    return datetime.combine(metadata.dataset_version, time.min, tzinfo=timezone.utc)


def _days(config: CultureConfig):
    current = date(config.start_year, 1, 1)
    end = date(config.end_year + 1, 1, 1)
    while current < end:
        yield current
        current += timedelta(days=1)


def _lunar_date(lunar) -> str:
    leap = "闰" if lunar.getMonth() < 0 else ""
    return f"{leap}{lunar.getMonthInChinese()}月{lunar.getDayInChinese()}"


@lru_cache(maxsize=None)
def _lunar(day: date):
    return Solar.fromYmd(day.year, day.month, day.day).getLunar()


def _join(values: list[str]) -> str:
    return "、".join(values) if values else "无"


def almanac_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    for current in _days(config):
        lunar = _lunar(current)
        lunar_date = _lunar_date(lunar)
        xiu = f"{lunar.getXiu()}{lunar.getZheng()}{lunar.getAnimal()}"
        day_yi = lunar.getDayYi()
        day_ji = lunar.getDayJi()
        description = "\n".join(
            [
                f"农历：{lunar.getYearInGanZhi()}年（{lunar.getYearShengXiao()}年）{lunar_date}",
                (
                    "干支："
                    f"{lunar.getYearInGanZhi()}年 "
                    f"{lunar.getMonthInGanZhi()}月 "
                    f"{lunar.getDayInGanZhi()}日"
                ),
                f"纳音：{lunar.getDayNaYin()}",
                f"宜：{_join(day_yi)}",
                f"忌：{_join(day_ji)}",
                f"冲煞：冲{lunar.getDayChongDesc()}，煞{lunar.getDaySha()}",
                f"彭祖百忌：{lunar.getPengZuGan()}；{lunar.getPengZuZhi()}",
                (
                    f"值日：{lunar.getZhiXing()}日 · {lunar.getDayTianShen()}"
                    f"（{lunar.getDayTianShenType()}，{lunar.getDayTianShenLuck()}）"
                ),
                f"星宿：{xiu}（{lunar.getXiuLuck()}）",
                f"九星：{lunar.getDayNineStar()}",
                (
                    f"神位：喜神{lunar.getDayPositionXiDesc()} · "
                    f"福神{lunar.getDayPositionFuDesc()} · "
                    f"财神{lunar.getDayPositionCaiDesc()}"
                ),
                f"胎神：{lunar.getDayPositionTai()}",
            ]
        )
        events.append(
            CalendarEvent(
                logical_id=f"cn-{current.isoformat()}-almanac",
                kind="almanac-day",
                concepts=("traditional-almanac",),
                title=(
                    f"宜 {day_yi[0] if day_yi else '无'} · "
                    f"忌 {day_ji[0] if day_ji else '无'}"
                ),
                start=current,
                end=current + timedelta(days=1),
                description=description,
                categories=("中国日历", "传统黄历"),
                last_modified=modified,
                data_status="computed",
            )
        )
    return tuple(events)


def lunar_mansion_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    for current in _days(config):
        lunar = _lunar(current)
        xiu = f"{lunar.getXiu()}{lunar.getZheng()}{lunar.getAnimal()}"
        description = "\n".join(
            [
                f"二十八星宿：{xiu}（{lunar.getXiuLuck()}）",
                f"宫位与守护：{lunar.getGong()}方 · {lunar.getShou()}",
                f"十二值星：{lunar.getZhiXing()}日",
                (
                    f"值日天神：{lunar.getDayTianShen()}"
                    f"（{lunar.getDayTianShenType()}，{lunar.getDayTianShenLuck()}）"
                ),
                f"九星：{lunar.getDayNineStar()}",
                f"星宿歌：{lunar.getXiuSong()}",
            ]
        )
        events.append(
            CalendarEvent(
                logical_id=f"cn-{current.isoformat()}-lunar-mansion",
                kind="lunar-mansion-day",
                concepts=("twenty-eight-lunar-mansions",),
                title=f"{xiu} · {lunar.getXiuLuck()}",
                start=current,
                end=current + timedelta(days=1),
                description=description,
                categories=("中国日历", "二十八星宿"),
                last_modified=modified,
                data_status="computed",
            )
        )
    return tuple(events)


def seasonal_events(
    config: CultureConfig, metadata: Metadata
) -> tuple[CalendarEvent, ...]:
    events: list[CalendarEvent] = []
    modified = _modified(metadata)
    previous_wuhou = ""
    for current in _days(config):
        lunar = _lunar(current)
        wuhou = lunar.getWuHou()
        if wuhou and wuhou != previous_wuhou:
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{current.isoformat()}-wuhou",
                    kind="seasonal-marker",
                    concepts=("seventy-two-pentads",),
                    title=wuhou,
                    start=current,
                    end=current + timedelta(days=1),
                    description="\n".join(
                        [
                            f"节气阶段：{lunar.getHou()}",
                            f"七十二候：{wuhou}",
                        ]
                    ),
                    categories=("中国日历", "中国时令", "七十二候"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
        previous_wuhou = wuhou

        shujiu = lunar.getShuJiu()
        if shujiu is not None and shujiu.getIndex() == 1:
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{current.isoformat()}-shujiu",
                    kind="seasonal-marker",
                    concepts=("shu-jiu", shujiu.getName()),
                    title=f"{shujiu.getName()}开始",
                    start=current,
                    end=current + timedelta(days=1),
                    description=f"{shujiu.getName()}第1天，从今天起共9天。",
                    categories=("中国日历", "中国时令", "数九"),
                    last_modified=modified,
                    data_status="computed",
                )
            )

        fu = lunar.getFu()
        if fu is not None and fu.getIndex() == 1:
            events.append(
                CalendarEvent(
                    logical_id=f"cn-{current.isoformat()}-fu",
                    kind="seasonal-marker",
                    concepts=("san-fu", fu.getName()),
                    title=f"{fu.getName()}开始",
                    start=current,
                    end=current + timedelta(days=1),
                    description=f"{fu.getName()}第1天。",
                    categories=("中国日历", "中国时令", "三伏"),
                    last_modified=modified,
                    data_status="computed",
                )
            )
    return tuple(sorted(events, key=lambda event: event.sort_key))
