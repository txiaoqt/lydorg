(function () {
  try {
    var isPwa =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.navigator.standalone === true ||
      sessionStorage.getItem("ytrace-pwa-preview") === "1";
    if (!isPwa) return;
    var themes = {
      "pasig-blue": "#1D4F88",
      "sky-blue": "#326C9B",
      "powder-blue": "#496D90",
      aqua: "#276D77",
      mint: "#29715F",
      sage: "#526C53",
      pistachio: "#596F39",
      "butter-yellow": "#79540D",
      "lemon-cream": "#71590D",
      peach: "#9B5637",
      "soft-coral": "#A54C49",
      "blush-pink": "#9B496A",
      "rose-pink": "#934157",
      lavender: "#65499F",
      lilac: "#744F8D",
      periwinkle: "#50599D",
      "soft-mauve": "#755267",
      "warm-gray": "#59544F",
    };
    var stored = JSON.parse(
      localStorage.getItem("ytrace-pwa-preferences-v1") || "{}"
    );
    var theme = themes[stored.accentTheme]
      ? stored.accentTheme
      : "pasig-blue";
    document.documentElement.dataset.pwaTheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themes[theme]);
  } catch (_) {}
})();
