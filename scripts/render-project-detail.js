(function () {
  const root = document.querySelector("[data-project-detail]");
  const items = window.PORTFOLIO_ITEMS || [];

  if (!root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("work") || params.get("project");
  const item = items.find((entry) => entry.slug === slug) || items[0];

  const setText = (selector, text) => {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = text || "";
    }
  };

  const makeText = (tag, text) => {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  };

  document.title = `${item.title} | 이창준 Portfolio`;
  setText("[data-project-title]", item.title);
  setText("[data-project-summary]", item.summary);
  setText("[data-project-role]", item.role);
  setText("[data-project-problem]", item.problem);
  setText("[data-project-solution]", item.solution);
  setText("[data-project-learned]", item.learned);

  const tags = document.querySelector("[data-project-tags]");
  if (tags) {
    tags.replaceChildren(...(item.tags || []).map((tag) => makeText("li", tag)));
  }

  const image = document.querySelector("[data-project-image]");
  if (image) {
    image.src = item.image;
    image.alt = `${item.title} 대표 이미지`;
  }

  const links = document.querySelector("[data-project-links]");
  if (links) {
    links.replaceChildren();
    (item.links || []).forEach((link) => {
      const anchor = document.createElement("a");
      anchor.href = link.url;
      anchor.textContent = link.label;
      links.append(anchor);
    });
  }

  const specs = document.querySelector("[data-project-specs]");
  if (specs) {
    specs.replaceChildren();
    [
      ["구분", item.category === "freelance" ? "외주 작업" : item.category === "study" ? "학교 과제 및 기타" : "프로젝트"],
      ["개발여부", item.status],
      ["개발목적", item.purpose],
      ["개발기간", item.period],
      ["개발인원", item.team],
    ]
      .filter(([, value]) => value)
      .forEach(([label, value]) => {
        const row = document.createElement("div");
        row.append(makeText("dt", label), makeText("dd", value));
        specs.append(row);
      });
  }

  const gallery = document.querySelector("[data-project-gallery]");
  if (gallery) {
    const images = item.gallery && item.gallery.length > 0 ? item.gallery : [item.image];
    gallery.replaceChildren(
      ...images.map((src, index) => {
        const figure = document.createElement("figure");
        const galleryImage = document.createElement("img");
        galleryImage.src = src;
        galleryImage.alt = `${item.title} 사진 ${index + 1}`;
        galleryImage.loading = index === 0 ? "eager" : "lazy";
        figure.append(galleryImage);
        return figure;
      }),
    );
  }
})();
