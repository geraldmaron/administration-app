import { useSyncExternalStore } from "react";
import type { CameraMotion } from "./motion";
import type { Density } from "./pitch";

export type MapPaletteVariant = "standard" | "color-vision";

/** The player's map settings. The shell's settings store owns them; the map only reads them. */
export interface MapSettings {
  readonly camera: CameraMotion;
  readonly density: Density;
  readonly highContrast: boolean;
  readonly palette: MapPaletteVariant;
}

export const DEFAULT_MAP_SETTINGS: MapSettings = { camera: "fly", density: "standard", highContrast: false, palette: "standard" };

export function withDefaults(settings: Partial<MapSettings> | undefined): MapSettings {
  return { ...DEFAULT_MAP_SETTINGS, ...settings };
}

const subscribers = new Map<string, (notify: () => void) => () => void>();

function subscribeTo(query: string): (notify: () => void) => () => void {
  const known = subscribers.get(query);
  if (known) return known;
  const subscribe = (notify: () => void): (() => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
    const list = window.matchMedia(query);
    list.addEventListener("change", notify);
    return () => list.removeEventListener("change", notify);
  };
  subscribers.set(query, subscribe);
  return subscribe;
}

/** Whether a media query matches, kept current. False where there is no window. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    subscribeTo(query),
    () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}
