// Seasonal onset weights. A kind with a season is shut outside it and stronger
// inside it. Twelve months of any kind average to 1, so a year of chances
// matches the unseasoned exposure and adding a season changes when a country is
// struck without changing how often.

import type { ConditionKind } from "./condition-kinds.js";

/**
 * The months each seasonal kind can open in, in the northern frame.
 *
 * Hurricanes are the National Hurricane Center's Atlantic season, June through
 * November, and the federal declaration record agrees sharply: 48 of 75
 * hurricane declarations since 2015 fell in September and October alone.
 * Tornadoes take the same record's severe-storm window, March through August,
 * which is where those declarations peak.
 *
 * Winter storms and heat waves are inferred from what the kind is rather than
 * read off a declaration month, because the record counts declarations and not
 * dates for either: a winter storm is November through March and a heat wave is
 * June through September. That inference is not a measurement, and it is worth
 * replacing with monthly counts when a run of the declaration API carries them.
 *
 * A kind absent from this table has no season, which is the honest answer for
 * an earthquake, a flood, a fire and an epidemic — each of which has a season
 * somewhere and no single one across fifty countries.
 */
const SEASONS: Partial<Record<ConditionKind, readonly number[]>> = {
  cyclone: [6, 7, 8, 9, 10, 11],
  tornado: [3, 4, 5, 6, 7, 8],
  "winter-storm": [11, 12, 1, 2, 3],
  "heat-wave": [6, 7, 8, 9],
};

type Season = { readonly months: ReadonlySet<number>; readonly weight: number };

// Built once: the in-season weight is twelve over the number of open months, so
// the twelve-month mean is exactly 1 whatever the window's length.
const SEASON_TABLE: Partial<Record<ConditionKind, Season>> = Object.fromEntries(
  Object.entries(SEASONS).map(([kind, months]) => [
    kind,
    { months: new Set(months), weight: 12 / months!.length },
  ]),
);

/**
 * The month as the northern hemisphere would read it.
 *
 * Six months across for a southern-hemisphere country, so an Australian cyclone
 * season is January rather than July and the same table serves both halves of
 * the world without a second set of windows to keep in step.
 */
function monthInNorthernFrame(month: number, latitude: number): number {
  if (latitude >= 0) return month;
  return ((month + 5) % 12) + 1;
}

export function seasonWeight(kind: ConditionKind, month: number, latitude: number): number {
  const season = SEASON_TABLE[kind];
  if (!season) return 1;
  return season.months.has(monthInNorthernFrame(month, latitude)) ? season.weight : 0;
}
