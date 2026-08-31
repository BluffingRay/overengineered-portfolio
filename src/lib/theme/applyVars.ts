/**
 * M6 — single writer for --font / --font-custom / --dur theme vars.
 * Previously 4 writers (globals.css :root + 3 skins + inline style) competed.
 * This helper applies the doc's theme to <html> in one place, called from
 * usePortfolioShell + the pre-paint script.
 */
export function applyThemeVars(
  el: HTMLElement,
  theme: { accentColor?: string; fontFamily?: string; viewScale?: number },
  skin: string,
) {
  if (theme.accentColor) el.style.setProperty('--accent', theme.accentColor);
  if (theme.fontFamily) el.style.setProperty('--font-custom', theme.fontFamily);
  // --dur is now skin-driven only (globals.css :root per [data-skin]), not overridden here.
}
