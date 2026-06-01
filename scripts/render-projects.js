(function () {
  const root = document.querySelector("[data-project-list]");
  const projects = window.PORTFOLIO_PROJECTS || [];

  if (!root || projects.length === 0) {
    return;
  }

  const makeText = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    element.textContent = text;
    return element;
  };

  const makeDetailList = (project) => {
    const details = [
      ["개발목적", project.purpose],
      ["개발기간", project.period],
      ["개발인원", project.team],
    ].filter(([, value]) => value);

    if (details.length === 0) {
      return null;
    }

    const list = document.createElement("dl");
    list.className = "project-details";

    details.forEach(([label, value]) => {
      const item = document.createElement("div");
      item.append(makeText("dt", "", label), makeText("dd", "", value));
      list.append(item);
    });

    return list;
  };

  const makeLinks = (links) => {
    if (!links || links.length === 0) {
      return null;
    }

    const container = document.createElement("div");
    container.className = "project-links";

    links.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = link.label;
      container.append(anchor);
    });

    return container;
  };

  projects.forEach((project) => {
    const article = document.createElement("article");
    article.className = project.featured ? "project project--featured" : "project";

    const detailUrl = `project.html?project=${encodeURIComponent(project.slug)}`;
    const imageLink = document.createElement("a");
    imageLink.className = "project__image-link";
    imageLink.href = detailUrl;

    const image = document.createElement("img");
    image.src = project.image;
    image.alt = `${project.title} 대표 이미지`;
    image.loading = project.featured ? "eager" : "lazy";
    imageLink.append(image);

    const body = document.createElement("div");
    body.className = "project__body";
    body.append(
      makeText(
        "p",
        "project__meta",
        [project.status, project.graphic, project.view, project.genre, project.engine]
          .filter(Boolean)
          .join(" · "),
      ),
      makeText("h3", "", project.title),
      makeText("p", "", project.summary),
    );

    const detailList = makeDetailList(project);
    const links = makeLinks(project.links);

    if (detailList) {
      body.append(detailList);
    }

    const detailLink = document.createElement("a");
    detailLink.className = "project-detail-link";
    detailLink.href = detailUrl;
    detailLink.textContent = "자세히 보기";
    body.append(detailLink);

    if (links) {
      body.append(links);
    }

    article.append(imageLink, body);
    root.append(article);
  });
})();
