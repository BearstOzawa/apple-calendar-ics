from __future__ import annotations

import json
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SITE_DIR = ROOT / "site"
DIST_DIR = ROOT / "dist"


class SiteDocument(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.attributes: list[tuple[str, dict[str, str]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.attributes.append((tag, {name: value or "" for name, value in attrs}))


def load_site_document() -> SiteDocument:
    document = SiteDocument()
    document.feed((SITE_DIR / "index.html").read_text(encoding="utf-8"))
    document.close()
    return document


class SiteTests(unittest.TestCase):
    def test_local_page_assets_exist(self) -> None:
        document = load_site_document()
        references = {
            value
            for _, attrs in document.attributes
            for name in ("href", "src")
            if (value := attrs.get(name))
            and not value.startswith(("#", "http://", "https://", "webcal://"))
            and value != "./"
        }

        for reference in references:
            path = urlparse(reference).path
            self.assertTrue(
                (SITE_DIR / path).is_file() or (DIST_DIR / path).is_file(),
                reference,
            )

    def test_every_published_feed_is_present_in_interactive_catalogue(self) -> None:
        manifest = json.loads((DIST_DIR / "manifest.json").read_text(encoding="utf-8"))
        app = (SITE_DIR / "app.js").read_text(encoding="utf-8")

        for filename in manifest["feeds"]:
            self.assertIn(f'"{filename}"', app)

    def test_manifest_fields_have_static_fallbacks(self) -> None:
        document = load_site_document()
        names = {
            name
            for _, attrs in document.attributes
            for name in attrs
            if name.startswith("data-")
        }
        self.assertTrue(
            {
                "data-work-rest-year",
                "data-culture-year",
                "data-dataset-version",
                "data-channel-count",
            }.issubset(names)
        )

    def test_primary_feed_uses_simple_product_name(self) -> None:
        manifest = json.loads((DIST_DIR / "manifest.json").read_text(encoding="utf-8"))
        essential_ics = (DIST_DIR / "essential.ics").read_text(encoding="utf-8")
        site_source = "\n".join(
            (SITE_DIR / filename).read_text(encoding="utf-8")
            for filename in ("index.html", "app.js")
        )
        self.assertEqual("中国日历", manifest["feeds"]["essential.ics"]["name"])
        self.assertIn("X-WR-CALNAME;LANGUAGE=zh-CN:中国日历", essential_ics)
        self.assertNotIn("中国日历・精选", essential_ics)
        self.assertNotIn("中国日历・精选", site_source)

    def test_tarot_is_not_part_of_calendar_product(self) -> None:
        html = (SITE_DIR / "index.html").read_text(encoding="utf-8")
        self.assertNotIn("塔罗", html)
        self.assertFalse((SITE_DIR / "tarot.js").exists())


if __name__ == "__main__":
    unittest.main()
