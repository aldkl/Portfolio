"""Generate sitemap.xml from the portfolio item list.

Run this after adding or removing entries in scripts/portfolio-data.js.
"""

import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE_URL = "https://aldkl.github.io/Portfolio/"
SLUG = re.compile(r'^\s*slug:\s*"([^"]+)"', re.MULTILINE)


def build_urls():
    slugs = SLUG.findall((ROOT / "scripts" / "portfolio-data.js").read_text(encoding="utf-8"))
    urls = [(SITE_URL, "1.0")]
    urls.extend((f"{SITE_URL}project.html?work={slug}", "0.8") for slug in slugs)
    return urls


def main():
    today = date.today().isoformat()
    entries = "\n".join(
        "  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{today}</lastmod>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>"
        for loc, priority in build_urls()
    )
    document = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{entries}\n"
        "</urlset>\n"
    )
    (ROOT / "sitemap.xml").write_text(document, encoding="utf-8")
    print(f"Generated sitemap.xml with {document.count('<url>')} URLs.")


if __name__ == "__main__":
    main()
