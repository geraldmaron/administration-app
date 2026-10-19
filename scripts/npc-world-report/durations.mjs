// The war-duration block of scripts/measure-npc-world.mjs: how long every war
// on the board lasted, how it ended, and where that sits beside the record and
// the owner's band. Its own module so the wave that tunes war length owns the
// figures it is judged by without owning the whole report.
//
// Three kinds of conflict are counted apart, because the band is about one of
// them: wars the world started during the run (the band), wars the opening
// board carried into the oath (they were already years old), and conflicts a
// border-clash template opened (a clash is not a war).

const bump = (into, key) => {
  into[key] = (into[key] ?? 0) + 1;
};

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : (sorted[mid] ?? 0);
}

/** Nearest-rank percentile, so the figure printed is a war that actually ran that long. */
function percentile(values, share) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(share * sorted.length) - 1)];
}

/**
 * The owner's band (D14): months with a long tail. Printed beside the run so a
 * reader sees the judgment and the figures together; the run does not tune to it.
 */
export const D14_BAND = { medianWeeks: [10, 20], p25AtMost: 5, p90Weeks: [52, 156], endedWithoutVictorAtLeast: 0.2 };

/**
 * The record, from data/war-durations.tsv (weeks): Correlates of War
 * interstate wars 1823-2003 via the freerangestats summary (D1, opened
 * 2026-09-24): median 20, mean 58, shortest 1, longest 533. The source gives
 * no quartiles, so none is printed.
 */
export const RECORD_INTERSTATE = { source: "COW interstate wars via D1, war-durations.tsv", medianWeeks: 20, meanWeeks: 58, minWeeks: 1, maxWeeks: 533 };

const HELD_FRONT_INTENSITY = 0.2;

function classOf(conflict) {
  if (conflict.inherited) return "carried";
  if (/border clash/i.test(conflict.cause ?? "")) return "border-clash";
  return "war";
}

// A war still running when the run stops is counted to the last week and
// reported apart, because leaving it out would shorten the median by exactly
// the wars that do not end. A running war on a held front is reported as
// frozen: it has stopped being fought without ending.
export function warRecords(working) {
  return Object.values(working.conflicts).map((conflict) => ({
    weeks: (conflict.endedTurn ?? working.turn) - conflict.startedTurn,
    outcome: conflict.status === "active" && conflict.intensity < HELD_FRONT_INTENSITY ? "frozen" : conflict.status,
    ended: conflict.status !== "active",
    class: classOf(conflict),
  }));
}

function block(wars) {
  const ended = wars.filter((war) => war.ended).map((war) => war.weeks);
  const all = wars.map((war) => war.weeks);
  const outcomes = {};
  for (const war of wars) bump(outcomes, war.outcome);
  const withoutVictor = wars.filter((war) => war.outcome === "settled" || war.outcome === "frozen").length;
  return {
    wars: wars.length,
    ended: ended.length,
    censored: wars.length - ended.length,
    endedWeeks: {
      p25: percentile(ended, 0.25),
      median: median(ended),
      p90: percentile(ended, 0.9),
      min: ended.length ? Math.min(...ended) : 0,
      max: ended.length ? Math.max(...ended) : 0,
    },
    allWeeksCensoredCountedToEnd: { p25: percentile(all, 0.25), median: median(all), p90: percentile(all, 0.9) },
    outcomes,
    shareWithoutVictor: wars.length ? Math.round((withoutVictor / wars.length) * 1000) / 1000 : 0,
    bothVictorsOccur: (outcomes["aggressor-victory"] ?? 0) > 0 && (outcomes["defender-victory"] ?? 0) > 0,
  };
}

export function durationReport(runs) {
  const wars = runs.flatMap((r) => r.wars);
  const ofClass = (name) => wars.filter((war) => (war.class ?? "war") === name);
  return {
    ...block(ofClass("war")),
    band: D14_BAND,
    record: RECORD_INTERSTATE,
    carried: block(ofClass("carried")),
    borderClashes: block(ofClass("border-clash")),
    warsBySeed: runs.map((r) => r.wars.filter((war) => (war.class ?? "war") === "war").length),
  };
}
