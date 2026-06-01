(function () {
  const groups = {
    project: window.PORTFOLIO_PROJECTS || [],
    freelance: window.PORTFOLIO_FREELANCE || [],
    study: window.PORTFOLIO_STUDIES || [],
  };

  const makeText = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    element.textContent = text;
    return element;
  };

  const makeTags = (tags) => {
    const tagList = document.createElement("ul");
    tagList.className = "tag-list";
    (tags || []).forEach((tag) => {
      tagList.append(makeText("li", "", tag));
    });
    return tagList;
  };

  const makeDetailList = (item) => {
    const details = [
      ["개발목적", item.purpose],
      ["개발기간", item.period],
      ["개발인원", item.team],
    ].filter(([, value]) => value);

    if (details.length === 0) {
      return null;
    }

    const list = document.createElement("dl");
    list.className = "project-details";

    details.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.append(makeText("dt", "", label), makeText("dd", "", value));
      list.append(row);
    });

    return list;
  };

  const renderCard = (item) => {
    const article = document.createElement("article");
    article.className = item.featured ? "project project--featured" : "project";

    const detailUrl = `project.html?work=${encodeURIComponent(item.slug)}`;
    const imageLink = document.createElement("a");
    imageLink.className = "project__image-link";
    imageLink.href = detailUrl;

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = `${item.title} 대표 이미지`;
    image.loading = item.featured ? "eager" : "lazy";
    imageLink.append(image);

    const body = document.createElement("div");
    body.className = "project__body";
    body.append(makeTags(item.tags), makeText("h3", "", item.title), makeText("p", "", item.summary));

    const detailList = makeDetailList(item);
    if (detailList) {
      body.append(detailList);
    }

    const detailLink = document.createElement("a");
    detailLink.className = "project-detail-link";
    detailLink.href = detailUrl;
    detailLink.textContent = "자세히 보기";
    body.append(detailLink);

    article.append(imageLink, body);
    return article;
  };

  document.querySelectorAll("[data-work-list]").forEach((root) => {
    const category = root.dataset.workList;
    const items = groups[category] || [];
    root.replaceChildren(...items.map(renderCard));
  });
})();
