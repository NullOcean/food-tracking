export type AppColorScheme = "light" | "dark";

/**
 * The single source of truth for runtime color. Components should use a
 * semantic token from the active theme—not a literal color value.
 */
export const Colors = {
  light: {
    background: "#F7F7F8",
    surface: "#FFFFFF",
    surfaceRaised: "#ECECEF",
    text: "#0F1729",
    textMuted: "#616168",
    textSubtle: "#777780",
    textOnAccent: "#0F1729",
    accent: "#167C90",
    accentSoft: "#D9F4F8",
    border: "#B7B7BD",
    divider: "#DCDCE0",
    overlay: "#0F1729CC",
    danger: "#C2473E",
    success: "#2F9E62",
    recording: "#D84B4B",
    progressTrack: "#D5D5DA",
    tabBackground: "#FFFFFF",
    tabInactive: "#74747C",
    shadow: "#0F1729",
  },
  dark: {
    background: "#000000",
    surface: "#1C1C1E",
    surfaceRaised: "#303033",
    text: "#FFFFFF",
    textMuted: "#B8B8BD",
    textSubtle: "#A9A9AD",
    textOnAccent: "#0F1729",
    accent: "#69CEDF",
    accentSoft: "#173B42",
    border: "#85858A",
    divider: "#3A3A3C",
    overlay: "#000000CC",
    danger: "#FF8F8F",
    success: "#4ADE80",
    recording: "#FF4D4D",
    progressTrack: "#CACACA",
    tabBackground: "#000000",
    tabInactive: "#A9A9AD",
    shadow: "#000000",
  },
  metrics: {
    calories: "#FF816E",
    carbohydrate: "#FFCB6E",
    net_carbohydrates: "#FFF86E",
    fat: "#90FF6E",
    protein: "#69CEDF",
    fiber: "#6986DF",
    sugar: "#FF6ED8",
    added_sugars: "#C58BFF",
  },
} as const;

export type AppTheme = (typeof Colors)[AppColorScheme];
export type AppColorToken = keyof AppTheme;

export const getTheme = (colorScheme?: string | null): AppTheme =>
  colorScheme === "dark" ? Colors.dark : Colors.light;
