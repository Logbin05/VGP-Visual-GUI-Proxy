export type Theme = "dark" | "light" | "system";
export type Accent = "cyan" | "violet" | "green" | "amber" | "pink";
export type Density = "compact" | "comfortable" | "spacious";

const KEYS = {
  theme: "vgp.theme",
  accent: "vgp.accent",
  density: "vgp.density",
} as const;

export function getTheme(): Theme {
  return (localStorage.getItem(KEYS.theme) as Theme | null) ?? "dark";
}
export function getAccent(): Accent {
  return (localStorage.getItem(KEYS.accent) as Accent | null) ?? "cyan";
}
export function getDensity(): Density {
  return (
    (localStorage.getItem(KEYS.density) as Density | null) ?? "comfortable"
  );
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEYS.theme, theme);
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function setAccent(accent: Accent) {
  localStorage.setItem(KEYS.accent, accent);
  document.documentElement.setAttribute("data-accent", accent);
}

export function setDensity(density: Density) {
  localStorage.setItem(KEYS.density, density);
  document.documentElement.setAttribute("data-density", density);
}

export function initPreferences() {
  setTheme(getTheme());
  setAccent(getAccent());
  setDensity(getDensity());
}
