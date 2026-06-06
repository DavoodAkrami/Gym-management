export const COLOR_THEME_STORAGE_KEY = "gymmanager-color-theme";

export type ColorThemeId = "ocean" | "midnight";

export const COLOR_THEME_IDS: ColorThemeId[] = ["ocean", "midnight"];

export function isColorTheme(value: string | null | undefined): value is ColorThemeId {
  return value === "ocean" || value === "midnight";
}
