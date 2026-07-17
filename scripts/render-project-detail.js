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

  const makeTag = (tag) => {
    const element = makeText("li", tag);
    element.className = window.PORTFOLIO_TAGS.getClassName(tag);
    element.dataset.tagGroup = element.className.split(" ")[0].replace("tag--", "");
    return element;
  };

  const makeParagraph = (text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  };

  const getYouTubeVideoId = (url) => {
    try {
      const parsed = new URL(url);
      if (parsed.hostname === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
      if (parsed.hostname.endsWith("youtube.com")) {
        if (parsed.pathname === "/watch") return parsed.searchParams.get("v") || "";
        const parts = parsed.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || "";
      }
    } catch (error) {
      return "";
    }
    return "";
  };

  const makeProjectLink = (link) => {
    const anchor = document.createElement("a");
    const videoId = getYouTubeVideoId(link.url);
    anchor.href = link.url;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";

    if (!videoId) {
      anchor.textContent = link.label;
      return anchor;
    }

    anchor.className = "video-link-card";
    anchor.setAttribute("aria-label", link.label);

    const thumbnail = document.createElement("img");
    thumbnail.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    thumbnail.alt = link.label;
    thumbnail.loading = "lazy";

    const playIcon = document.createElement("span");
    playIcon.className = "video-link-card__play";
    playIcon.setAttribute("aria-hidden", "true");
    playIcon.textContent = "▶";

    const title = document.createElement("span");
    title.className = "video-link-card__title";
    title.textContent = link.label;

    anchor.append(thumbnail, playIcon, title);
    return anchor;
  };

  const makeFigure = (block, itemTitle) => {
    const figure = document.createElement("figure");
    figure.className = "content-figure";

    const image = document.createElement("img");
    image.src = block.src;
    image.alt = block.caption || `${itemTitle} 상세 이미지`;
    image.loading = "lazy";
    figure.append(image);

    if (block.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = block.caption;
      figure.append(caption);
    }

    return figure;
  };

  const renderContentBlocks = (container, item) => {
    const blocks = (window.PORTFOLIO_CONTENT || {})[item.slug];
    container.replaceChildren();

    if (blocks && blocks.length > 0) {
      container.className = "content-flow";
      blocks.forEach((block) => {
        if (block.type === "h3") {
          container.append(makeText("h3", block.text));
        } else if (block.type === "image") {
          container.append(makeFigure(block, item.title));
        } else {
          container.append(makeParagraph(block.text));
        }
      });
      return;
    }

    container.className = "gallery-grid";
    const images = item.gallery && item.gallery.length > 0 ? item.gallery : [item.image];
    container.replaceChildren(
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
    tags.replaceChildren(...(item.tags || []).map(makeTag));
  }

  const image = document.querySelector("[data-project-image]");
  if (image) {
    image.src = item.image;
    image.alt = `${item.title} 대표 이미지`;
  }

  const links = document.querySelector("[data-project-links]");
  if (links) {
    links.replaceChildren();
    links.append(...(item.links || []).map(makeProjectLink));
  }

  const specs = document.querySelector("[data-project-specs]");
  if (specs) {
    specs.replaceChildren();
    [
      ["구분", item.category === "freelance" ? "외주 작업" : item.category === "study" ? "학교 과제 및 기타" : "프로젝트"],
      ["개발여부", item.status],
      ["담당 파트", item.parts ? item.parts.join(", ") : ""],
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

  const content = document.querySelector("[data-project-content]");
  if (content) {
    renderContentBlocks(content, item);
  }
})();
