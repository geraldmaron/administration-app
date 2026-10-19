import type { InkRole } from "../icons/Icon";

/**
 * How a reading of a person draws. Graded readings are good to bad;
 * ambition is pressure toward a mark and is never graded, so it has inks of
 * its own.
 */
export type ReadTone = "good" | "fair" | "watch" | "bad" | "neutral" | "pressure-low" | "pressure-near" | "pressure-past";

export const READ_INK: Readonly<Record<ReadTone, InkRole>> = {
  good: "successInk",
  fair: "infoInk",
  watch: "warningInk",
  bad: "danger",
  neutral: "colorSecondary",
  "pressure-low": "colorTertiary",
  "pressure-near": "gold",
  "pressure-past": "gold",
};
