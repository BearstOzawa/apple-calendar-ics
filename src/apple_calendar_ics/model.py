from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True)
class Metadata:
    schema_version: int
    dataset_version: date
    default_language: str
    timezone: str
    uid_domain: str


@dataclass(frozen=True)
class Source:
    title: str
    url: str
    document_number: str = ""
    license: str = ""


@dataclass(frozen=True)
class Workday:
    id: str
    date: date
    sequence: int


@dataclass(frozen=True)
class OfficialPeriod:
    id: str
    name: str
    concepts: tuple[str, ...]
    start: date
    end_inclusive: date
    sequence: int
    workdays: tuple[Workday, ...]

    @property
    def duration_days(self) -> int:
        return (self.end_inclusive - self.start).days + 1


@dataclass(frozen=True)
class OfficialYear:
    year: int
    published_at: date
    source: Source
    periods: tuple[OfficialPeriod, ...]


@dataclass(frozen=True)
class LunarFestivalRule:
    id: str
    concept: str
    name: str
    month: int
    day: int


@dataclass(frozen=True)
class ObservanceRule:
    id: str
    concept: str
    name: str
    month: int
    day: int
    note: str
    source: Source


@dataclass(frozen=True)
class ObservanceConfig:
    start_year: int
    end_year: int
    rules: tuple[ObservanceRule, ...]


@dataclass(frozen=True)
class CultureConfig:
    start_year: int
    end_year: int
    include_solar_terms: bool
    include_lunar_new_years_eve: bool
    source: Source
    lunar_festivals: tuple[LunarFestivalRule, ...]


@dataclass(frozen=True)
class CalendarEvent:
    logical_id: str
    kind: str
    concepts: tuple[str, ...]
    title: str
    start: date
    end: date
    description: str
    categories: tuple[str, ...]
    last_modified: datetime
    sequence: int = 0
    data_status: str = "confirmed"
    apple_special_day: str | None = None

    def __post_init__(self) -> None:
        if self.end <= self.start:
            raise ValueError(f"event {self.logical_id!r} must end after it starts")
        if not self.logical_id.isascii():
            raise ValueError(f"event logical id must be ASCII: {self.logical_id!r}")

    @property
    def duration_days(self) -> int:
        return (self.end - self.start).days

    @property
    def sort_key(self) -> tuple[date, date, str, str]:
        return (self.start, self.end, self.kind, self.logical_id)


@dataclass(frozen=True)
class Feed:
    slug: str
    name: str
    description: str
    events: tuple[CalendarEvent, ...]
    category: str
    cadence: str
    source_type: str
    density: str
    tier: str = "optional"
    overlaps: tuple[str, ...] = ()
    featured: bool = False
