// The last day of a second term: the opponent named and beaten in 2032, both
// terms served, and the ending and legacy rooms open on a whole record.
//
// Founded on the opening slate and run the way Continue runs, stopping and
// resuming across every night. The re-election is planted, not earned: a
// President who answers nothing loses (the `loses-reelection` save proves it),
// and this save exists to show the term-limited ending and a full legacy, not a
// governing script that wins. So the one presidential night is held with the
// country's mood lifted for that one day, through the day loop's own count,
// and the run then goes on unaided to the 2036 Election Day where the charter
// ends it.
import { advanceUntilAttention } from "../../packages/engine/dist/advance.js";
import { addDays, daysBetween, federalElectionDay, formatGameDate } from "../../packages/engine/dist/clock.js";
import { selectEnding } from "../../packages/engine/dist/elections.js";
import { campaignTurnPhases } from "../../packages/engine/dist/turn-phases.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "term-end";

/** Runs from stop to stop until `until`, the way a player presses on past each night. */
function runTo(campaign, until, phases) {
  let run = { campaign, stopReason: "horizon" };
  for (let pass = 0; pass < 800; pass += 1) {
    const remaining = daysBetween(run.campaign.calendar, until);
    if (remaining <= 0 || run.stopReason === "ended") break;
    const before = run.campaign.calendar;
    run = advanceUntilAttention(run.campaign, { phases, horizonDays: remaining });
    if (daysBetween(before, run.campaign.calendar) === 0 && run.stopReason !== "ended") {
      throw new Error(`the run stopped on ${formatGameDate(before)} (${run.stopReason}) without advancing a day`);
    }
  }
  return run.campaign;
}

const MOOD_DRIVERS = ["security", "prosperity", "services", "integrity", "unity", "competence"];

/** A mood the country could re-elect on, polarization left where it stood. */
function lifted(mood) {
  return { ...mood, ...Object.fromEntries(MOOD_DRIVERS.map((key) => [key, Math.max(mood[key], 0.92)])) };
}

/**
 * Election Day 2032 run with the country's mood lifted for that one day, then
 * the true mood put back: the night is the engine's own, held by the day loop,
 * and nothing but that one reading is planted.
 */
function reelected(eve, phases) {
  const mood = eve.player.opinion;
  const night = runTo({ ...eve, player: { ...eve.player, opinion: lifted(mood) } }, federalElectionDay(2032), phases);
  const result = night.termClock.elections.at(-1);
  if (result?.kind !== "presidential" || result.won !== true) throw new Error("expected the planted 2032 night to re-elect the President");
  return { ...night, player: { ...night.player, opinion: mood } };
}

export function build() {
  const opening = foundFixture({ seedText: "fixture-term-end", leaderName: "Fixture President" });
  const phases = campaignTurnPhases(charterOf(opening));
  const eve = runTo(opening, addDays(federalElectionDay(2032), -1), phases);
  if (daysBetween(eve.calendar, federalElectionDay(2032)) !== 1 || eve.termClock.elections.some((e) => e.kind === "presidential")) {
    throw new Error(`expected to stand on the eve of Election Day 2032 before the count; stood on ${formatGameDate(eve.calendar)}`);
  }
  const closing = runTo(reelected(eve, phases), federalElectionDay(2036), phases);
  const ending = selectEnding(closing);
  if (ending !== "term-limited") {
    throw new Error(`expected both terms served on ${formatGameDate(federalElectionDay(2036))}; the run ended as "${ending}" on ${formatGameDate(closing.calendar)}`);
  }
  return closing;
}
