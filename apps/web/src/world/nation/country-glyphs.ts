import type { IconName } from "@admin/ui-web";
import type { NationVital } from "@admin/player-core";

/** How many of five steps each force band lights, weakest to strongest. */
export const FORCE_STEPS = { Slight: 1, Limited: 2, Capable: 3, Strong: 4, Formidable: 5 } as const;

export const VITAL_GLYPH: Readonly<Record<NationVital["key"], IconName>> = {
  economy: "economyGrowth",
  prices: "economyInflation",
  jobs: "economyUnemployment",
  order: "layerRegime",
  living: "eventEmergency",
};

/** Where a government sits among the world's fifths on one temperament axis; the long comparison goes under it. */
export const TEMPERAMENT_WORD = { 1: "Lowest", 2: "Low", 3: "Middle", 4: "High", 5: "Highest" } as const;
