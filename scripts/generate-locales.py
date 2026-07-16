"""Generate baked locale data from the Korean source copy.

Run this after changing visible Korean copy, then review the generated English and
Japanese wording before publishing.
"""

import html
import json
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SOURCE_FILES = [
    ROOT / "index.html",
    ROOT / "project.html",
    ROOT / "scripts" / "portfolio-data.js",
    ROOT / "scripts" / "work-content.js",
    ROOT / "scripts" / "render-projects.js",
    ROOT / "scripts" / "render-project-detail.js",
]
KOREAN = re.compile(r"[가-힣]")
STRING = re.compile(r'"((?:\\.|[^"\\])*)"', re.DOTALL)
POLISH = {
    "en": {
        "Chungkang University of Cultural Industries": "Chungkang College of Cultural Industries",
        "Chungkang University of Culture and Industry": "Chungkang College of Cultural Industries",
    },
    "ja": {
        "青江文化産業大学": "チョンガン文化産業大学",
        "青江大学": "チョンガン文化産業大学",
        "聴講隊": "チョンガン文化産業大学",
    },
}
MANUAL_TRANSLATIONS = {
    "en": {
        "꽃의소녀": "Flower Girl",
        "내가 한 작업": "My Role",
        "문제 해결": "Problem Solving",
        "문제 해결/배운점": "Problem Solving & Takeaways",
    },
    "ja": {
        "청강대 졸업작품에 들어가는 물 쉐이더에서 캐주얼한 foam 파트를 추가한 작업입니다.":
            "チョンガン文化産業大学の卒業制作で使用するウォーターシェーダーに、カジュアルなフォーム表現を追加しました。",
    },
}


class VisibleTextParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.values = set()

    def handle_data(self, data):
        value = " ".join(data.split())
        if value and KOREAN.search(value):
            self.values.add(value)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in {"alt", "title", "aria-label", "content"} and value and KOREAN.search(value):
                self.values.add(" ".join(value.split()))


def collect_source_copy():
    values = set()
    for path in SOURCE_FILES:
        source = path.read_text(encoding="utf-8")
        if path.suffix == ".html":
            parser = VisibleTextParser()
            parser.feed(source)
            values.update(parser.values)
        for match in STRING.finditer(source):
            value = bytes(match.group(1), "utf-8").decode("unicode_escape") if "\\" in match.group(1) else match.group(1)
            value = " ".join(value.split())
            if value and KOREAN.search(value) and not value.startswith(("http://", "https://")):
                values.add(value)
    return sorted(values)


def translate(value, target):
    query = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "ko",
        "tl": target,
        "dt": "t",
        "q": value,
    })
    request = urllib.request.Request(
        f"https://translate.googleapis.com/translate_a/single?{query}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)
    translated = "".join(part[0] for part in payload[0] if part[0])
    for source, replacement in POLISH[target].items():
        translated = translated.replace(source, replacement)
    return translated


def main():
    values = collect_source_copy()
    jobs = [(value, language) for value in values for language in ("en", "ja")]
    translations = {"en": {}, "ja": {}}

    def run(job):
        value, language = job
        translated = MANUAL_TRANSLATIONS[language].get(value) or translate(value, language)
        return value, language, translated

    with ThreadPoolExecutor(max_workers=6) as executor:
        for value, language, translated in executor.map(run, jobs):
            translations[language][value] = html.unescape(translated)

    output = "window.PORTFOLIO_LOCALES = " + json.dumps(
        translations, ensure_ascii=False, indent=2, sort_keys=True
    ) + ";\n"
    (ROOT / "scripts" / "locales.js").write_text(output, encoding="utf-8")
    print(f"Generated {len(values)} source strings in English and Japanese.")


if __name__ == "__main__":
    main()
