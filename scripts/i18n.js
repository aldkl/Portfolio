(function () {
  const supportedLanguages = ["ko", "en", "ja"];
  const savedLanguage = localStorage.getItem("portfolio-language");
  const browserLanguage = (navigator.language || "ko").slice(0, 2);
  const initialLanguage = supportedLanguages.includes(savedLanguage)
    ? savedLanguage
    : supportedLanguages.includes(browserLanguage)
      ? browserLanguage
      : "ko";

  const setTranslationCookie = (language) => {
    const value = language === "ko" ? "/ko/ko" : `/ko/${language}`;
    const maxAge = language === "ko" ? 0 : 60 * 60 * 24 * 365;
    document.cookie = `googtrans=${value};path=/;max-age=${maxAge};SameSite=Lax`;
    document.cookie = `googtrans=${value};path=/;domain=${location.hostname};max-age=${maxAge};SameSite=Lax`;
  };

  const markCurrentLanguage = (language) => {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-language]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.language === language));
    });
  };

  markCurrentLanguage(initialLanguage);
  if (initialLanguage !== "ko") {
    setTranslationCookie(initialLanguage);
  }

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      const language = button.dataset.language;
      if (!supportedLanguages.includes(language)) return;
      localStorage.setItem("portfolio-language", language);
      setTranslationCookie(language);
      location.reload();
    });
  });

  const mount = document.createElement("div");
  mount.id = "google_translate_element";
  mount.setAttribute("aria-hidden", "true");
  document.body.append(mount);

  window.googleTranslateElementInit = function () {
    if (!window.google || !window.google.translate) return;
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "ko",
        includedLanguages: "ko,en,ja",
        autoDisplay: false,
      },
      "google_translate_element",
    );
  };

  const script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.head.append(script);
})();
