import { useEffect, useMemo, useState } from "react";
import { THEME_CHOICES, effectiveCamera, type Preferences, type ThemeChoice } from "@admin/player-core";
import type { MapSettings } from "../map/settings";

type DisplayOptions = {
  readonly firstSession: boolean;
  readonly reducedMotion: boolean;
  /** Whether the device asks for dark; System follows it. */
  readonly systemDark?: boolean;
  /** The choice the boot script painted with, used until the stored preferences arrive. */
  readonly themeHint?: ThemeChoice;
};

/**
 * A synchronous copy of the theme choice. The preferences live in IndexedDB or
 * the desktop host's files, neither readable before the first paint, so
 * `public/theme-boot.js` reads this key instead and a dark choice never
 * flashes light. The stored preference stays the authority.
 */
export const THEME_HINT_KEY = "administration.theme-hint";

/** The theme the page draws in: System resolved against the device, never "system" itself. */
export function resolvedTheme(choice: ThemeChoice, systemDark: boolean): "light" | "dark" {
  if (choice === "system") return systemDark ? "dark" : "light";
  return choice;
}

function readThemeHint(): ThemeChoice | undefined {
  try {
    const hint = window.localStorage.getItem(THEME_HINT_KEY);
    return (THEME_CHOICES as readonly (string | null)[]).includes(hint) ? (hint as ThemeChoice) : undefined;
  } catch (cause) {
    console.warn("The theme hint could not be read; the stored preference will set the theme once it loads.", cause);
    return undefined;
  }
}

function writeThemeHint(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_HINT_KEY, choice);
  } catch (cause) {
    console.warn("The theme hint could not be kept; the next launch may paint in the system theme first.", cause);
  }
}

/**
 * The display settings, written onto the root element as data attributes.
 *
 * That is the whole contract between the settings and what draws: the token
 * sheet swaps palettes and inks on `data-contrast` and `data-vision`, and the
 * map reads `data-camera` and `data-map-density` from the same element. No
 * component reads a preference to decide a color.
 */
export function displayAttributes(preferences: Preferences, options: DisplayOptions): Readonly<Record<string, string | undefined>> {
  return {
    "data-camera": effectiveCamera(preferences, options),
    "data-map-density": preferences.mapDensity ?? "standard",
    "data-contrast": preferences.highContrast ? "high" : undefined,
    "data-vision": preferences.colorVision && preferences.colorVision !== "standard" ? preferences.colorVision : undefined,
    "data-theme": resolvedTheme(preferences.theme ?? options.themeHint ?? "system", options.systemDark === true),
  };
}

/**
 * The same settings as the map takes them. Any color-vision palette is the
 * map's color-vision variant: the root's `data-vision` has already swapped
 * the ramps it points at for the one the player chose.
 */
export function mapSettingsOf(preferences: Preferences, options: DisplayOptions): MapSettings {
  return {
    camera: effectiveCamera(preferences, options),
    density: preferences.mapDensity ?? "standard",
    highContrast: preferences.highContrast === true,
    palette: preferences.colorVision && preferences.colorVision !== "standard" ? "color-vision" : "standard",
  };
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const changed = () => setMatches(list.matches);
    list.addEventListener("change", changed);
    return () => list.removeEventListener("change", changed);
  }, [query]);
  return matches;
}

/** Writes the display settings onto the root element and returns them as the map takes them. */
export function useDisplaySettings(preferences: Preferences, firstSession: boolean): MapSettings {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [themeHint] = useState(readThemeHint);
  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(displayAttributes(preferences, { firstSession, reducedMotion, systemDark, ...(themeHint ? { themeHint } : {}) }))) {
      if (value === undefined) root.removeAttribute(name);
      else root.setAttribute(name, value);
    }
  }, [preferences, firstSession, reducedMotion, systemDark, themeHint]);
  useEffect(() => {
    if (preferences.theme) writeThemeHint(preferences.theme);
  }, [preferences.theme]);
  return useMemo(() => mapSettingsOf(preferences, { firstSession, reducedMotion }), [preferences, firstSession, reducedMotion]);
}
