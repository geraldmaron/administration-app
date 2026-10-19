// The foreign-elections block of scripts/measure-npc-world.mjs: how many seats
// changed hands abroad over the run, and how, year by year; which selections
// the run held on a date the calendar only estimates or disputes; and how far
// the press abroad moved governments' trust in the President.
//
// Read off the ledger rather than the seat record, because the seat record
// keeps only the latest change per nation and the recent list is bounded. The
// foreign-politics phase files one packet per change with its origin and the
// people either side of it, which is enough to tell the kinds apart:
//
//   scheduled, the nation alone         an election the government came through
//   scheduled, with the people          an election that changed the chair
//   world, stamped as a coup            a coup
//   world, the nation alone             a lost confidence vote (a caretaker)
//   world, with the people              a succession outside the calendar
import { ELECTION_CALENDAR, preOathSelection, windowSelection } from "../../packages/world/dist/index.js";

const bump = (into, key) => {
  into[key] = (into[key] ?? 0) + 1;
};

function kindOf(causal) {
  const moved = (causal.entities?.length ?? 0) > 1;
  if (causal.origin === "scheduled") return moved ? "election-changed" : "election-held";
  if (causal.decision?.question === "coup-hazard") return "coup";
  return moved ? "succession" : "confidence-lost";
}

/** Every change of government abroad on one seed's ledger, with its kind, its year and its nation. */
function changesOf(working) {
  return working.ledger.flatMap((entry) => {
    const causal = entry.causal;
    if (!causal?.systems?.includes("foreign-politics") || entry.background) return [];
    return [{ kind: kindOf(causal), year: causal.createdDate.year, nation: causal.entities?.[0] }];
  });
}

/** The capped running total the press abroad has moved each government's trust by, at the end of the run. */
function affinitiesOf(working) {
  return Object.values(working.foreignCoverage ?? {}).map((entry) => entry.affinity);
}

/** What one seed's run contributes to the block. */
export function electionsOfSeed(working) {
  return {
    changes: changesOf(working),
    affinities: affinitiesOf(working),
    projectedSeats: Object.values(working.foreignPolitics?.seats ?? {}).filter((seat) => seat.provenance === "projected").length,
  };
}

const round = (value) => Math.round(value * 10_000) / 10_000;

function summarize(values) {
  if (values.length === 0) return { count: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  return {
    count: values.length,
    mean: round(values.reduce((sum, v) => sum + v, 0) / values.length),
    min: round(sorted[0]),
    max: round(sorted.at(-1)),
  };
}

/**
 * The selections the run held on a date the calendar does not state as a
 * scheduling fact, by nation and standing, so nobody reads those dates as the
 * table's.
 */
function labeledDates(changes) {
  const held = new Set(changes.filter((c) => c.kind.startsWith("election")).map((c) => c.nation));
  return ELECTION_CALENDAR.flatMap((row) => {
    const selection = windowSelection(row.nationId);
    if (!selection || selection.standing === "scheduled" || !held.has(row.nationId)) return [];
    return [{ nation: row.nationId, standing: selection.standing }];
  });
}

/** The block itself, across every seed. */
export function electionsReport(runs) {
  const all = runs.flatMap((run) => run.elections?.changes ?? []);
  const byKind = {};
  const byYear = {};
  for (const change of all) {
    bump(byKind, change.kind);
    byYear[change.year] ??= {};
    bump(byYear[change.year], change.kind);
  }
  return {
    seeds: runs.length,
    byKind,
    byYear,
    perSeed: runs.map((run) => (run.elections?.changes ?? []).length),
    preOathSet: ELECTION_CALENDAR.filter((row) => preOathSelection(row.nationId) !== null).length,
    projectedSeatsStandingAtEnd: runs.map((run) => run.elections?.projectedSeats ?? 0),
    heldOnLabeledDates: labeledDates(all),
    pressTrustAffinity: summarize(runs.flatMap((run) => run.elections?.affinities ?? [])),
  };
}
