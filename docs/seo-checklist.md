# 검색 노출 체크리스트

사이트 주소: https://aldkl.github.io/Portfolio/

## 1. 코드 쪽 (완료)

- `index.html` / `project.html`에 canonical, Open Graph, Twitter Card, `robots` 메타 추가
- `index.html`에 JSON-LD 구조화 데이터(Person, WebSite) 추가 — 이름·직무·GitHub·학교를 검색엔진이 인물 정보로 인식
- 홈 `<title>`을 `이창준 Portfolio | Unity 게임 개발자 · 테크니컬 아티스트`로 변경 (EN/JP 번역 포함)
- 프로젝트 상세 페이지는 `scripts/render-project-detail.js`가 프로젝트별 title/description/canonical/og:image를 채움
- `sitemap.xml`(홈 + 프로젝트 22개), `robots.txt` 추가

## 2. 직접 해야 하는 등록 절차

### Google Search Console

1. https://search.google.com/search-console 접속 → **URL 접두어** 속성으로 `https://aldkl.github.io/Portfolio/` 추가
   - `aldkl.github.io`는 GitHub 소유 도메인이라 도메인 속성(DNS 인증)은 사용할 수 없음
2. 소유권 확인은 **HTML 파일 업로드** 방식 선택 → 받은 `googleXXXXXXXX.html`을 저장소 루트에 넣고 push
   - HTML 태그 방식을 쓰려면 확인 메타 태그를 `index.html`의 `<head>`에 추가
3. 확인 후 **Sitemaps** 메뉴에서 `sitemap.xml` 제출
4. **URL 검사** → `https://aldkl.github.io/Portfolio/` 입력 → *색인 생성 요청*
5. 보통 며칠~2주 내 색인. `site:aldkl.github.io/Portfolio`로 확인

> `robots.txt`는 도메인 루트(`https://aldkl.github.io/robots.txt`)만 크롤러가 읽습니다.
> 저장소의 `robots.txt`는 커스텀 도메인을 연결했을 때를 위한 사본이고, 지금은 Search Console에
> sitemap을 직접 제출하는 방식으로 대신합니다.

### 네이버 서치어드바이저

1. https://searchadvisor.naver.com → 사이트 등록 (`https://aldkl.github.io/Portfolio/`)
2. HTML 파일 업로드로 소유권 확인 → `sitemap.xml` 제출
3. 국내 채용 담당자는 네이버 검색을 쓰는 경우가 많아 Google과 함께 등록하는 것이 좋음

### Bing Webmaster Tools

- https://www.bing.com/webmasters — Search Console 계정을 그대로 가져오는 기능(Import)이 있어 클릭 몇 번이면 끝
- Bing 색인은 ChatGPT 검색 등에도 사용됨

## 3. 검색 순위를 올리는 실제 요인

색인 등록만으로 "이창준 포트폴리오"가 상위에 뜨지는 않습니다. 동명이인이 많아 **외부 링크(백링크)** 가 가장 큰 영향을 줍니다.

- GitHub 프로필(`github.com/aldkl`) README와 저장소 About의 **Website** 칸에 포트폴리오 주소 넣기
- GitHub 저장소 이름/설명에 포트폴리오임을 명시
- 링크드인, 노션 이력서, 커리어 플랫폼(잡코리아·사람인·원티드) 프로필의 개인 사이트 칸에 주소 등록
- 아트스테이션 / 유튜브 채널 설명 / 인디 게임 커뮤니티 글에 주소 추가
- 이력서와 지원 서류에 항상 같은 주소를 쓰기 (주소가 갈리면 신호가 분산됨)

## 4. 더 확실한 방법: 커스텀 도메인

`changjun.dev` 같은 도메인을 사서 연결하면

- 도메인 자체가 검색어가 되어 이름 검색 경쟁에서 유리
- `robots.txt`가 정상 동작하고 Search Console 도메인 속성 사용 가능
- 주소가 짧아져 이력서에 쓰기 좋음

설정: 도메인 등록 후 GitHub 저장소 `Settings > Pages > Custom domain`에 입력 → 루트 `CNAME` 파일 생성 → DNS에 GitHub Pages A 레코드 / CNAME 등록.
도메인을 바꾸면 `index.html`, `project.html`, `scripts/render-project-detail.js`, `scripts/generate-sitemap.py`, `robots.txt`의 `https://aldkl.github.io/Portfolio/` 주소도 함께 수정해야 합니다.
