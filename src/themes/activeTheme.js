// Seasonal skins (see README "Seasonal themes"). A theme is purely additive:
// its CSS only matches while <html> carries its `theme-<name>` class, so with
// no theme active the app looks exactly like the classic black-and-yellow
// design. Dates are the phone's local time; `until` is exclusive.
export const SEASONAL_THEMES = [{ name: "halloween", from: "2026-10-01T00:00", until: "2026-11-01T00:00" }];

// `?theme=classic` or `?theme=halloween` in the address bar previews a look
// regardless of the date (it lasts until the page is reloaded without it).
export function pickTheme(now, search) {
  const forced = new URLSearchParams(search).get("theme");
  if (forced === "classic") return null;
  if (SEASONAL_THEMES.some((t) => t.name === forced)) return forced;
  const current = SEASONAL_THEMES.find((t) => now >= new Date(t.from) && now < new Date(t.until));
  return current ? current.name : null;
}

export const activeTheme = typeof window === "undefined" ? null : pickTheme(new Date(), window.location.search);

const THEME_COLOR = { halloween: "#07040f" };

export function applyTheme(theme) {
  if (!theme) return;
  document.documentElement.classList.add(`theme-${theme}`);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && THEME_COLOR[theme]) meta.setAttribute("content", THEME_COLOR[theme]);
}
