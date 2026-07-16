(function () {
  const supportedLanguages = ["ko", "en", "ja"];
  const dictionaries = window.PORTFOLIO_LOCALES || {};
  const originals = new WeakMap();
  const originalAttributes = new WeakMap();
  const originalDocumentTitle = document.title;
  let currentLanguage = supportedLanguages.includes(localStorage.getItem("portfolio-language"))
    ? localStorage.getItem("portfolio-language")
    : "ko";

  const normalize = (value) => value.replace(/\s+/g, " ").trim();

  const translatedValue = (source) => {
    if (currentLanguage === "ko") return source;
    const normalized = normalize(source);
    const translated = dictionaries[currentLanguage] && dictionaries[currentLanguage][normalized];
    if (!translated) return source;
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    return `${leading}${translated}${trailing}`;
  };

  const shouldSkip = (node) => {
    const parent = node.parentElement;
    return !parent || parent.closest("script, style, .notranslate, [translate='no']");
  };

  const translateTextNode = (node) => {
    if (shouldSkip(node) || !normalize(node.nodeValue)) return;
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    node.nodeValue = translatedValue(originals.get(node));
  };

  const translateAttributes = (element) => {
    if (element.closest(".notranslate, [translate='no']")) return;
    const names = ["alt", "title", "aria-label", "content"];
    if (!originalAttributes.has(element)) originalAttributes.set(element, {});
    const stored = originalAttributes.get(element);
    names.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      if (!(name in stored)) stored[name] = element.getAttribute(name);
      element.setAttribute(name, translatedValue(stored[name]));
    });
  };

  const translateTree = (root) => {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    translateAttributes(root);
    root.querySelectorAll("*").forEach(translateAttributes);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateTextNode(walker.currentNode);
  };

  const updateButtons = () => {
    document.documentElement.lang = currentLanguage;
    document.title = currentLanguage === "ko"
      ? originalDocumentTitle
      : originalDocumentTitle
          .split(" | ")
          .map((part) => (dictionaries[currentLanguage] && dictionaries[currentLanguage][part]) || part)
          .join(" | ");
    document.querySelectorAll("[data-language]").forEach((button) => {
      const active = button.dataset.language === currentLanguage;
      button.setAttribute("aria-pressed", String(active));
      button.title = active ? "" : `Switch to ${button.textContent}`;
    });
  };

  const applyLanguage = (language) => {
    currentLanguage = supportedLanguages.includes(language) ? language : "ko";
    localStorage.setItem("portfolio-language", currentLanguage);
    translateTree(document.body);
    updateButtons();
  };

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => applyLanguage(button.dataset.language));
  });

  applyLanguage(currentLanguage);
})();
