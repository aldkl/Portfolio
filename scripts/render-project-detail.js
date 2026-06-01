(function () {
  const root = document.querySelector("[data-project-detail]");
  const projects = window.PORTFOLIO_PROJECTS || [];

  if (!root) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("project");
  const project = projects.find((item) => item.slug === slug) || projects[0];

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

  document.title = `${project.title} | 이창준 Portfolio`;
  setText("[data-project-meta]", [project.status, project.graphic, project.view, project.genre, project.engine].filter(Boolean).join(" · "));
  setText("[data-project-title]", project.title);
  setText("[data-project-summary]", project.summary);
  setText("[data-project-detail-text]", project.detail);

  const image = document.querySelector("[data-project-image]");
  if (image) {
    image.src = project.image;
    image.alt = `${project.title} 대표 이미지`;
  }

  const links = document.querySelector("[data-project-links]");
  if (links) {
    links.replaceChildren();
    (project.links || []).forEach((link) => {
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
      ["개발여부", project.status],
      ["그래픽", project.graphic],
      ["시점", project.view],
      ["장르", project.genre],
      ["사용엔진", project.engine],
      ["개발목적", project.purpose],
      ["개발기간", project.period],
      ["개발인원", project.team],
    ]
      .filter(([, value]) => value)
      .forEach(([label, value]) => {
        const item = document.createElement("div");
        item.append(makeText("dt", label), makeText("dd", value));
        specs.append(item);
      });
  }

  const gallery = document.querySelector("[data-project-gallery]");
  if (gallery) {
    gallery.replaceChildren();
    const images = project.gallery && project.gallery.length > 0 ? project.gallery : [project.image];
    images.forEach((src, index) => {
      const figure = document.createElement("figure");
      const galleryImage = document.createElement("img");
      galleryImage.src = src;
      galleryImage.alt = `${project.title} 사진 ${index + 1}`;
      galleryImage.loading = index === 0 ? "eager" : "lazy";
      figure.append(galleryImage);
      gallery.append(figure);
    });
  }
})();
