// Resolves the theme before the first paint. The stored preferences load
// asynchronously, so this reads the synchronous hint the display settings keep
// (THEME_HINT_KEY in src/app/display.ts) and resolves System against the device.
// It is an external file because the page's CSP refuses inline scripts.
(function () {
  var choice = "system";
  try {
    var hint = window.localStorage.getItem("administration.theme-hint");
    if (hint === "light" || hint === "dark" || hint === "system") choice = hint;
  } catch (cause) {
    console.warn("The theme hint could not be read; painting in the system theme.", cause);
  }
  var dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
})();
