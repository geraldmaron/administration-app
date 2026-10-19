import type { Campaign, FundingLapse } from "./state.js";
import { SHUTDOWN_GRACE_TURNS, inShutdown, openLapse } from "./funding.js";
import type { EffectPacket } from "./effects.js";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import type { TurnPhase } from "./turn-loop.js";
import { elapsedDays } from "./pace.js";

// The lapse in appropriations, which is the only thing in this game that stops
// the government rather than making it worse at something.
//
// Running on the prior year's numbers was already modeled and already cost
// something — a quarter of a point of stability a week, forever, for a
// government that plans nothing and signs month-to-month contracts. What was
// missing is the cliff at the end of it. A continuing resolution is not a
// background condition of American government; it is an act somebody has to
// pass, on a deadline, and when nobody passes it the Antideficiency Act does
// exactly what it says: no officer may obligate money Congress has not
// appropriated, so non-excepted work stops and the people who do it go home.
//
// Three properties keep this a decision rather than a penalty:
//
//   - Nothing here originates the stopgap or counts a vote. The continuing
//     resolution is an ordinary act in the catalogue, arising from the deadline
//     and carried by the same floor arithmetic as everything else, and the
//     President signs or vetoes it at the same desk. This file only reads
//     whether the money is there.
//   - The clock is the appropriation's own date. Whether the government is
//     closed is never stored, so a stopgap that moves the date ends the
//     shutdown in the same instant with nobody having to remember to.
//   - What it costs is an order of magnitude above the friction of governing
//     without a budget, because that is the actual difference between a
//     government working from last year's numbers and a government not working.

/**
 * What a week of lapsed appropriations costs the country's footing.
 *
 * Ten times the friction of governing on the prior year's numbers, which is
 * the ratio the two facts actually stand in: one is a government that cannot
 * plan, the other is a government that has stopped. Charged on top of that
 * friction rather than instead of it — a shutdown does not suspend the fact
 * that there is still no budget.
 */
export const LAPSE_STABILITY_COST = 0.04;

export type ShutdownReading = {
  readonly begunTurn: number;
  /** Full weeks the government has been closed, counted from the first one. */
  readonly weeks: number;
  readonly days: number;
  /** Bodies whose non-excepted work has stopped, largest first. */
  readonly closed: readonly string[];
  /** Bodies riding it at half, because their money is not all appropriated. */
  readonly insulated: number;
};

/**
 * The bodies that close, largest first — the executive departments and their
 * components, which is where the appropriated work of the government is done.
 */
function closingBodies(): readonly string[] {
  return INSTITUTION_CATALOG.filter((def) => def.tier !== 0 && def.independence === "executive")
    .slice()
    .sort((a, b) => b.staffScale - a.staffScale)
    .map((def) => def.abbr);
}

const INSULATED_COUNT = INSTITUTION_CATALOG.filter(
  (def) => def.tier !== 0 && def.independence !== "executive",
).length;

/**
 * The shutdown as a player reads it: how long, and what has stopped.
 *
 * `undefined` when the government is open, so a surface asks one question
 * rather than reading a status field and then deciding whether to believe it.
 */
export function selectShutdown(campaign: Campaign): ShutdownReading | undefined {
  if (!inShutdown(campaign)) return undefined;
  const lapse = openLapse(campaign);
  const begunTurn = lapse?.begunTurn ?? campaign.congress.appropriation.throughTurn + SHUTDOWN_GRACE_TURNS;
  const weeks = Math.max(1, campaign.turn - begunTurn + 1);
  return {
    begunTurn,
    weeks,
    days: elapsedDays(weeks),
    closed: closingBodies(),
    insulated: INSULATED_COUNT,
  };
}

/**
 * The week the money is or is not there.
 *
 * Runs after the chamber has voted and the President has had the desk, so a
 * stopgap passed this week has already moved the date this phase reads.
 */
export const shutdownPhase: TurnPhase = (state: Campaign) => {
  const open = openLapse(state);
  const closed = inShutdown(state);
  if (!closed && !open) return [];

  if (!closed && open) return [reopening(state, open)];
  if (closed && !open) return [beginning(state)];
  return [continuing(state, open!)];
};

function beginning(state: Campaign): EffectPacket {
  const bodies = closingBodies().slice(0, 3);
  const lapse: FundingLapse = { id: `lapse:${state.turn}`, begunTurn: state.turn };
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn + 1,
    narration: {
      summary:
        "Appropriations lapse. Non-excepted operations stop across the executive branch, and the people who run them are sent home without pay.",
    },
    effects: [
      { kind: "fundingLapse", set: lapse },
      { kind: "metric", deltas: { stability: -LAPSE_STABILITY_COST } },
      {
        kind: "feed",
        items: [
          {
            turn: state.turn + 1,
            kind: "press",
            visibility: "public",
            headline: `The government closes: ${sentenceList(bodies)} shut non-excepted operations as the appropriation runs out.`,
          },
        ],
      },
    ],
  };
}

function continuing(state: Campaign, open: FundingLapse): EffectPacket {
  const weeks = state.turn - open.begunTurn + 1;
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn + 1,
    narration: {
      summary: `Week ${weeks} of the shutdown: ${elapsedDays(weeks)} days with no appropriation, and nothing has reopened.`,
    },
    effects: [{ kind: "metric", deltas: { stability: -LAPSE_STABILITY_COST } }],
  };
}

function reopening(state: Campaign, open: FundingLapse): EffectPacket {
  const byStopgap = state.congress.appropriation.onPriorYear;
  const ended: FundingLapse = {
    ...open,
    endedTurn: state.turn,
    endedBy: byStopgap ? "continuing-resolution" : "appropriation",
  };
  const days = elapsedDays(state.turn - open.begunTurn);
  return {
    source: "simulate",
    actor: "world",
    turn: state.turn + 1,
    narration: {
      summary: byStopgap
        ? `The shutdown ends after ${days} days on a continuing resolution, which funds the same government for six more weeks and settles nothing.`
        : `The shutdown ends after ${days} days: Congress has enacted a full appropriation and the departments reopen.`,
    },
    effects: [
      { kind: "fundingLapse", set: ended },
      {
        kind: "feed",
        items: [
          {
            turn: state.turn + 1,
            kind: "press",
            visibility: "public",
            headline: `Federal offices reopen after ${days} days, and every agency starts the week behind.`,
          },
        ],
      },
    ],
  };
}

function sentenceList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)!}`;
}
