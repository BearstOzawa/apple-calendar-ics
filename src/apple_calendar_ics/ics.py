from __future__ import annotations

from datetime import datetime, timezone

from .model import CalendarEvent, Feed, Metadata


PRODID = "-//BearstOzawa//Apple Calendar ICS//ZH-CN"


def escape_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\r\n", "\n")
        .replace("\r", "\n")
        .replace("\n", "\\n")
        .replace(";", "\\;")
        .replace(",", "\\,")
    )


def fold_content_line(line: str, limit: int = 75) -> str:
    if "\r" in line or "\n" in line:
        raise ValueError("content line must not contain raw newlines")
    parts: list[str] = []
    current = ""
    current_bytes = 0
    payload_limit = limit
    for char in line:
        char_bytes = len(char.encode("utf-8"))
        if current and current_bytes + char_bytes > payload_limit:
            parts.append(current)
            current = char
            current_bytes = char_bytes
            payload_limit = limit - 1
        else:
            current += char
            current_bytes += char_bytes
    parts.append(current)
    return "\r\n ".join(parts)


def make_uid(logical_id: str, metadata: Metadata) -> str:
    if not logical_id.isascii() or any(char.isspace() for char in logical_id):
        raise ValueError(f"invalid logical id for UID: {logical_id!r}")
    return f"{logical_id}@{metadata.uid_domain}"


def _format_utc(value: datetime) -> str:
    if value.tzinfo is None:
        raise ValueError("timestamps must be timezone-aware")
    return value.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _event_lines(event: CalendarEvent, metadata: Metadata) -> list[str]:
    concepts = ",".join(event.concepts)
    categories = ",".join(escape_text(category) for category in event.categories)
    lines = [
        "BEGIN:VEVENT",
        f"UID:{make_uid(event.logical_id, metadata)}",
        f"DTSTAMP:{_format_utc(event.last_modified)}",
        f"CREATED:{_format_utc(event.last_modified)}",
        f"LAST-MODIFIED:{_format_utc(event.last_modified)}",
        f"SEQUENCE:{event.sequence}",
        f"DTSTART;VALUE=DATE:{event.start.strftime('%Y%m%d')}",
        f"DTEND;VALUE=DATE:{event.end.strftime('%Y%m%d')}",
        f"SUMMARY;LANGUAGE={metadata.default_language}:{escape_text(event.title)}",
        (
            f"DESCRIPTION;LANGUAGE={metadata.default_language}:"
            f"{escape_text(event.description)}"
        ),
        "CLASS:PUBLIC",
        "STATUS:CONFIRMED",
        "TRANSP:TRANSPARENT",
        f"CATEGORIES;LANGUAGE={metadata.default_language}:{categories}",
        f"X-CN-CALENDAR-KIND:{event.kind.upper()}",
        f"X-CN-CALENDAR-CONCEPTS:{concepts}",
        f"X-CN-CALENDAR-DATA-STATUS:{event.data_status.upper()}",
    ]
    if event.apple_special_day:
        lines.append(f"X-APPLE-SPECIAL-DAY:{event.apple_special_day}")
    lines.append("END:VEVENT")
    return lines


def serialize_feed(feed: Feed, metadata: Metadata) -> bytes:
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME;LANGUAGE={metadata.default_language}:{escape_text(feed.name)}",
        (
            f"X-WR-CALDESC;LANGUAGE={metadata.default_language}:"
            f"{escape_text(feed.description)}"
        ),
        f"X-WR-TIMEZONE:{metadata.timezone}",
        "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
        "X-PUBLISHED-TTL:PT12H",
    ]
    for event in sorted(feed.events, key=lambda item: item.sort_key):
        lines.extend(_event_lines(event, metadata))
    lines.append("END:VCALENDAR")
    return ("\r\n".join(fold_content_line(line) for line in lines) + "\r\n").encode(
        "utf-8"
    )
