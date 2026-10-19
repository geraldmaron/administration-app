import { anchor, chrome } from "@admin/design";

/**
 * The colors a seal spec names, as the metals and tinctures an informed
 * player expects (Army black and gold, Navy blue and gold, the Air Force's
 * ultramarine, the Marine Corps' scarlet). Seals keep these in every theme:
 * an emblem is the same artwork on light and dark ground, which is why it
 * does not take theme roles.
 */
export const SEAL_PALETTE = {
  navy: "#14284B",
  midnight: chrome.navy,
  federalBlue: "#1F4E9C",
  ultramarine: "#2340A0",
  sky: "#5B8FC7",
  teal: "#16707A",
  forest: "#1F5A3A",
  green: "#3C8A4E",
  scarlet: "#B3202E",
  maroon: "#6E1E2C",
  orange: "#E06A1B",
  purple: "#4B2E6F",
  gold: "#C9A44C",
  bronze: "#9A6B34",
  silver: "#C3CAD3",
  white: anchor.white,
  cream: "#F3ECDB",
  black: "#17181B",
} as const;

export type SealPaletteKey = keyof typeof SEAL_PALETTE;

/** A spec's color key as a value; an unknown key falls to the navy ground rather than drawing nothing. */
export function sealInk(key: string): string {
  return key in SEAL_PALETTE ? SEAL_PALETTE[key as SealPaletteKey] : SEAL_PALETTE.navy;
}
