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
        "기술 스택": "Tech Stack",
        "구현 역량": "What I Can Build",
        "Git·GitHub와 배포": "Git, GitHub & Deployment",
        "배칭과 렌더링 최적화": "Batching & Rendering Optimization",
        "실시간 셰이더와 Technical Art": "Real-Time Shaders & Technical Art",
        "AI·카메라·미디어 통합": "AI, Camera & Media Integration",
        "API·OCR 도구 개발": "API & OCR Tool Development",
        "주력": "Primary",
        "활용": "Working",
        "기초": "Basic",
        "상": "High",
        "중": "Intermediate",
        "하": "Basic",
        "EditorWindow로 반복 작업을 도구화하고, 여러 머티리얼의 셰이더 속성을 검색·미리보기·일괄 변경하며 Undo를 지원할 수 있습니다.":
            "I can automate repetitive tasks with EditorWindow tools that search, preview, and bulk-edit shader properties across multiple materials with Undo support.",
        "몬스터 공통 Base와 BT 상태, ScriptableObject 기반 카메라 설정, Animator·Spine·FMOD를 게임 이벤트와 연결할 수 있습니다.":
            "I can connect shared monster bases and behavior-tree states, ScriptableObject-based camera settings, and Animator, Spine, and FMOD systems to gameplay events.",
        "URP 툰 라이팅, SDF 얼굴 그림자, Rim Light, 거리 기반 디더링과 월드 좌표 UV 등 프로젝트에 필요한 화면 표현을 구현할 수 있습니다.":
            "I can implement project-specific visuals including URP toon lighting, SDF face shadows, rim lighting, distance-based dithering, and world-space UVs.",
        "캐릭터를 회전하며 확인한 Rim Light 적용 결과":
            "Rim light behavior verified while rotating the character",
        "광원과 캐릭터 방향 변화에 따른 SDF 얼굴 그림자 결과":
            "SDF face-shadow behavior under changing light and character directions",
        "실제 플레이에서 가림 오브젝트가 거리 기반으로 디더링되는 결과":
            "Distance-based dithering of occluding objects during gameplay",
    },
    "ja": {
        "상": "上",
        "중": "中",
        "하": "下",
        "청강대 졸업작품에 들어가는 물 쉐이더에서 캐주얼한 foam 파트를 추가한 작업입니다.":
            "チョンガン文化産業大学の卒業制作で使用するウォーターシェーダーに、カジュアルなフォーム表現を追加しました。",
        "Git·GitHub와 배포": "Git・GitHubとデプロイ",
        "배칭과 렌더링 최적화": "バッチングとレンダリング最適化",
        "공개 저장소의 실제 코드를 기준으로 정리했습니다.": "公開リポジトリの実際のコードを基に整理しました。",
        "게임 상태와 공용 데이터를 관리하는 싱글턴 매니저를 구성하고, 씬이 바뀌어도 필요한 상태를 유지할 수 있습니다.":
            "ゲーム状態と共有データを管理するシングルトンマネージャーを構成し、シーンが変わっても必要な状態を維持できます。",
        "상태 기반 게임 로직": "状態ベースのゲームロジック",
        "이동, 상호작용, 퍼즐, 충돌, 저장과 불러오기, 비동기 씬 전환 등 플레이 흐름에 필요한 기능을 연결할 수 있습니다.":
            "移動、インタラクション、パズル、衝突判定、セーブ・ロード、非同期シーン遷移など、ゲームプレイに必要な機能を連携できます。",
        "게임과 도구의 저장소를 관리하고, GitHub Pages 배포, 프론트엔드와 API 서버 분리, 다국어 README와 라이선스 문서화를 할 수 있습니다.":
            "ゲームやツールのリポジトリを管理し、GitHub Pagesへのデプロイ、フロントエンドとAPIサーバーの分離、多言語READMEとライセンス文書の整備ができます。",
        "캐릭터를 회전하며 확인한 Rim Light 적용 결과":
            "キャラクターを回転させて検証したリムライトの適用結果",
        "광원과 캐릭터 방향 변화에 따른 SDF 얼굴 그림자 결과":
            "光源とキャラクター方向の変化に応じたSDF顔シャドウの結果",
        "실제 플레이에서 가림 오브젝트가 거리 기반으로 디더링되는 결과":
            "実際のプレイ中に遮蔽物へ適用した距離ベースのディザリング結果",
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
