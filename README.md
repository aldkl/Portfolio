# Portfolio

GitHub Pages로 배포할 정적 포트폴리오 사이트입니다.

사이트 주소: https://aldkl.github.io/Portfolio/

## GitHub Pages 설정

1. GitHub에 새 저장소를 만듭니다.
2. 이 폴더를 해당 저장소에 push합니다.
3. GitHub 저장소의 `Settings > Pages`로 이동합니다.
4. `Build and deployment`의 source를 `Deploy from a branch`로 설정합니다.
5. branch는 `main`, folder는 `/ (root)`를 선택합니다.

배포 후 포트폴리오의 기본 문구와 섹션 구조는 `index.html`, 스타일은 `styles.css`에서 수정합니다.

프로젝트, 외주 작업, 학교 과제 카드와 상세 페이지 정보는 `scripts/portfolio-data.js`에서 수정합니다.
새 항목은 `window.PORTFOLIO_ITEMS` 배열에 객체를 하나 더 추가하면 됩니다. `category`는 `project`,
`freelance`, `study` 중 하나를 사용하고, 상세 페이지에서 보여줄 사진은 `gallery` 배열에 경로를
추가합니다.
