import { daysBetween, selectDateOfTurn } from "./clock.js";
import type { EffectPacket } from "./effect-types.js";
import type { ScenarioFamilyRun } from "./scenario-families.js";
import type { Campaign } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";

// An arc nobody closed has to stop being open.
//
// A family ends when its close member is answered, and nothing else ever
// ended one: a close the director never drew, or a corpus that never shipped
// one, left the family open for the rest of the term, pinning its country and
// sitting on the Record as a story still running. The lapse is the ending
// nobody chose, and it is a real ending: "the port strike stopped being news
// and nobody in this building ended it" is a true sentence about an
// administration.

/**
 * How long an arc may go without putting anything in front of the President
 * before it lapses, in calendar days rather than turns so the bound means the
 * same thing whatever a turn is.
 *
 * A planning value. Sixteen weeks is past double the longest callback the
 * corpus writes end to end (about nine weeks), so an arc still being dealt
 * never lapses, and it is short enough that an abandoned one clears inside a
 * season.
 */
export const FAMILY_LAPSE_DAYS = 112;

/**
 * Open families whose last beat is at least `FAMILY_LAPSE_DAYS` behind the
 * campaign's date. Measured from the last thing the family dealt rather than
 * from its opening, so a long arc that keeps coming back is a story still
 * running, not one the administration walked away from.
 */
export function lapsingFamilies(campaign: Campaign): readonly ScenarioFamilyRun[] {
  return Object.values(campaign.scenarioFamilies)
    .filter((run) => run.closedTurn === undefined && !run.unanswered)
    .filter((run) => daysBetween(selectDateOfTurn(campaign, run.lastTurn), campaign.calendar) >= FAMILY_LAPSE_DAYS)
    .sort((a, b) => a.openedTurn - b.openedTurn || a.family.localeCompare(b.family));
}

/**
 * Pins whose opener was raised and never answered, once as old as a lapsing
 * arc. They are dropped rather than closed: nothing was dealt under them, so
 * there is no ending to put on the Record, and without a bound every raised
 * opener of a 416-week campaign would stay on the save.
 */
export function expiringPins(campaign: Campaign): readonly ScenarioFamilyRun[] {
  return Object.values(campaign.scenarioFamilies)
    .filter((run) => run.unanswered === true)
    .filter((run) => daysBetween(selectDateOfTurn(campaign, run.lastTurn), campaign.calendar) >= FAMILY_LAPSE_DAYS)
    .sort((a, b) => a.family.localeCompare(b.family));
}

function lapseSummary(run: ScenarioFamilyRun): string {
  const story = run.title ? `"${run.title}"` : "A story this administration opened";
  return `${story} has not reached the President's desk in sixteen weeks. Nobody ended it; it has lapsed.`;
}

/**
 * Closes every lapsing family as `lapsed`. Goes through the family effect, the
 * one writer of `campaign.scenarioFamilies`, rather than beside it.
 */
export const familyLapsePhase: TurnPhase = (campaign) => [
  ...lapsingFamilies(campaign).map(
    (run): EffectPacket => ({
      source: "simulate",
      actor: "world",
      turn: campaign.turn,
      narration: { summary: lapseSummary(run) },
      effects: [{ kind: "scenarioFamily", close: { family: run.family, turn: campaign.turn, disposition: "lapsed" } }],
    }),
  ),
  ...expiringPins(campaign).map(
    (run): EffectPacket => ({
      source: "simulate",
      actor: "world",
      turn: campaign.turn,
      background: true,
      narration: { summary: "A raised decision went unanswered and its thread was dropped." },
      effects: [{ kind: "scenarioFamily", expire: { family: run.family } }],
    }),
  ),
];
