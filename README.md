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

프로젝트 카드 정보는 `scripts/portfolio-data.js`에서 수정합니다. 새 프로젝트를 추가할 때는
`window.PORTFOLIO_PROJECTS` 배열에 객체를 하나 더 추가하고, 대표 이미지는 `assets/portfolio/`에
넣은 뒤 `image` 경로만 연결하면 됩니다.
