(() => {
  try {
    const pref = localStorage.getItem("ec-theme") || "dark";
    const resolved = pref === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : pref;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = pref;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
