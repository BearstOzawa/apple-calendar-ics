from __future__ import annotations

import json
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from .model import (
    CultureConfig,
    LunarFestivalRule,
    Metadata,
    OfficialPeriod,
    OfficialYear,
    Source,
    Workday,
)


class DataValidationError(ValueError):
    pass


def _read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise DataValidationError(f"cannot read {path}: {error}") from error
    if not isinstance(value, dict):
        raise DataValidationError(f"{path} must contain a JSON object")
    return value


def _require_schema_version(raw: dict[str, Any], path: Path) -> None:
    if raw.get("schema_version") != 1:
        raise DataValidationError(f"{path}: unsupported schema_version")


def _parse_date(value: Any, field: str, path: Path) -> date:
    if not isinstance(value, str):
        raise DataValidationError(f"{path}: {field} must be an ISO date")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise DataValidationError(f"{path}: invalid {field}: {value!r}") from error


def _require_string(value: Any, field: str, path: Path) -> str:
    if not isinstance(value, str) or not value.strip():
        raise DataValidationError(f"{path}: {field} must be a non-empty string")
    return value.strip()


def load_metadata(data_dir: Path) -> Metadata:
    path = data_dir / "metadata.json"
    raw = _read_json(path)
    _require_schema_version(raw, path)
    uid_domain = _require_string(raw.get("uid_domain"), "uid_domain", path)
    if not uid_domain.isascii() or " " in uid_domain:
        raise DataValidationError(f"{path}: uid_domain must be an ASCII domain")
    return Metadata(
        schema_version=1,
        dataset_version=_parse_date(
            raw.get("dataset_version"), "dataset_version", path
        ),
        default_language=_require_string(
            raw.get("default_language"), "default_language", path
        ),
        timezone=_require_string(raw.get("timezone"), "timezone", path),
        uid_domain=uid_domain,
    )


def _load_official_year(path: Path) -> OfficialYear:
    raw = _read_json(path)
    _require_schema_version(raw, path)
    year = raw.get("year")
    if not isinstance(year, int) or year < 2000 or year > 2200:
        raise DataValidationError(f"{path}: invalid year")

    source_raw = raw.get("source")
    if not isinstance(source_raw, dict):
        raise DataValidationError(f"{path}: source must be an object")
    source = Source(
        title=_require_string(source_raw.get("title"), "source.title", path),
        url=_require_string(source_raw.get("url"), "source.url", path),
        document_number=_require_string(
            source_raw.get("document_number"), "source.document_number", path
        ),
    )
    if not source.url.startswith("https://www.gov.cn/"):
        raise DataValidationError(f"{path}: official source must be on www.gov.cn")

    periods_raw = raw.get("periods")
    if not isinstance(periods_raw, list) or not periods_raw:
        raise DataValidationError(f"{path}: periods must be a non-empty list")

    periods: list[OfficialPeriod] = []
    period_ids: set[str] = set()
    off_dates: set[date] = set()
    all_work_dates: set[date] = set()
    for index, item in enumerate(periods_raw):
        if not isinstance(item, dict):
            raise DataValidationError(f"{path}: periods[{index}] must be an object")
        period_id = _require_string(item.get("id"), f"periods[{index}].id", path)
        if not period_id.isascii() or period_id in period_ids:
            raise DataValidationError(
                f"{path}: duplicate or non-ASCII period id {period_id!r}"
            )
        period_ids.add(period_id)

        start = _parse_date(item.get("start"), f"periods[{index}].start", path)
        end = _parse_date(
            item.get("end_inclusive"), f"periods[{index}].end_inclusive", path
        )
        if start > end or start.year != year or end.year not in (year, year + 1):
            raise DataValidationError(f"{path}: invalid range for period {period_id}")
        current = start
        while current <= end:
            if current in off_dates:
                raise DataValidationError(f"{path}: overlapping holiday date {current}")
            off_dates.add(current)
            current += timedelta(days=1)

        concepts_raw = item.get("concepts")
        if not isinstance(concepts_raw, list) or not concepts_raw:
            raise DataValidationError(f"{path}: {period_id}.concepts must be non-empty")
        concepts = tuple(
            _require_string(value, f"{period_id}.concepts", path)
            for value in concepts_raw
        )
        if any(not concept.isascii() for concept in concepts):
            raise DataValidationError(f"{path}: concepts must be ASCII")

        workdays_raw = item.get("workdays", [])
        if not isinstance(workdays_raw, list):
            raise DataValidationError(f"{path}: {period_id}.workdays must be a list")
        workdays: list[Workday] = []
        workday_ids: set[str] = set()
        for work_index, work_item in enumerate(workdays_raw):
            if not isinstance(work_item, dict):
                raise DataValidationError(
                    f"{path}: {period_id}.workdays[{work_index}] must be an object"
                )
            work_id = _require_string(
                work_item.get("id"), f"{period_id}.workdays[{work_index}].id", path
            )
            work_date = _parse_date(
                work_item.get("date"),
                f"{period_id}.workdays[{work_index}].date",
                path,
            )
            sequence = work_item.get("sequence", 0)
            if (
                not work_id.isascii()
                or work_id in workday_ids
                or work_date.year != year
                or not isinstance(sequence, int)
                or sequence < 0
            ):
                raise DataValidationError(f"{path}: invalid workday in {period_id}")
            if work_date in all_work_dates:
                raise DataValidationError(f"{path}: duplicate workday date {work_date}")
            workday_ids.add(work_id)
            all_work_dates.add(work_date)
            workdays.append(Workday(work_id, work_date, sequence))

        sequence = item.get("sequence", 0)
        if not isinstance(sequence, int) or sequence < 0:
            raise DataValidationError(f"{path}: invalid sequence for {period_id}")
        periods.append(
            OfficialPeriod(
                id=period_id,
                name=_require_string(item.get("name"), f"{period_id}.name", path),
                concepts=concepts,
                start=start,
                end_inclusive=end,
                sequence=sequence,
                workdays=tuple(workdays),
            )
        )

    overlap = off_dates & all_work_dates
    if overlap:
        raise DataValidationError(
            f"{path}: dates cannot be both off and work: {overlap}"
        )

    return OfficialYear(
        year=year,
        published_at=_parse_date(raw.get("published_at"), "published_at", path),
        source=source,
        periods=tuple(periods),
    )


def load_official_years(data_dir: Path) -> tuple[OfficialYear, ...]:
    paths = sorted((data_dir / "official").glob("*.json"))
    if not paths:
        raise DataValidationError(f"{data_dir / 'official'} contains no year files")
    years = tuple(_load_official_year(path) for path in paths)
    numeric_years = [year.year for year in years]
    if numeric_years != sorted(set(numeric_years)):
        raise DataValidationError("official year files must have unique, sorted years")
    return years


def load_culture_config(data_dir: Path) -> CultureConfig:
    path = data_dir / "culture.json"
    raw = _read_json(path)
    _require_schema_version(raw, path)
    start_year = raw.get("start_year")
    end_year = raw.get("end_year")
    if (
        not isinstance(start_year, int)
        or not isinstance(end_year, int)
        or start_year < 1900
        or end_year < start_year
        or end_year > 2100
    ):
        raise DataValidationError(f"{path}: invalid culture year range")

    source_raw = raw.get("source")
    if not isinstance(source_raw, dict):
        raise DataValidationError(f"{path}: source must be an object")
    source = Source(
        title=_require_string(source_raw.get("name"), "source.name", path),
        url=_require_string(source_raw.get("url"), "source.url", path),
        license=_require_string(source_raw.get("license"), "source.license", path),
    )
    if not source.url.startswith("https://"):
        raise DataValidationError(f"{path}: culture source must use HTTPS")

    include_solar_terms = raw.get("include_solar_terms")
    include_lunar_new_years_eve = raw.get("include_lunar_new_years_eve")
    if not isinstance(include_solar_terms, bool) or not isinstance(
        include_lunar_new_years_eve, bool
    ):
        raise DataValidationError(f"{path}: culture include flags must be booleans")

    rules_raw = raw.get("lunar_festivals")
    if not isinstance(rules_raw, list) or not rules_raw:
        raise DataValidationError(f"{path}: lunar_festivals must be non-empty")
    rules: list[LunarFestivalRule] = []
    ids: set[str] = set()
    lunar_dates: set[tuple[int, int]] = set()
    for index, item in enumerate(rules_raw):
        if not isinstance(item, dict):
            raise DataValidationError(f"{path}: lunar_festivals[{index}] invalid")
        rule_id = _require_string(item.get("id"), f"festivals[{index}].id", path)
        concept = _require_string(
            item.get("concept"), f"festivals[{index}].concept", path
        )
        month = item.get("month")
        day = item.get("day")
        if (
            not rule_id.isascii()
            or not concept.isascii()
            or rule_id in ids
            or not isinstance(month, int)
            or not isinstance(day, int)
            or not 1 <= month <= 12
            or not 1 <= day <= 30
            or (month, day) in lunar_dates
        ):
            raise DataValidationError(f"{path}: invalid festival rule {rule_id!r}")
        ids.add(rule_id)
        lunar_dates.add((month, day))
        rules.append(
            LunarFestivalRule(
                id=rule_id,
                concept=concept,
                name=_require_string(
                    item.get("name"), f"festivals[{index}].name", path
                ),
                month=month,
                day=day,
            )
        )

    return CultureConfig(
        start_year=start_year,
        end_year=end_year,
        include_solar_terms=include_solar_terms,
        include_lunar_new_years_eve=include_lunar_new_years_eve,
        source=source,
        lunar_festivals=tuple(rules),
    )
