// A presidency the country votes out. The opening administration governs by
// drift for a whole term — nothing answered, nothing sent up — and the world
// runs day by day the way Continue runs it, so the midterm is filed on
// Election Day, 2030, and the save stops where the player's run would: on
// Election Day, 2032, with its ending.
//
// The defeat is not a near thing and is not meant to be. The contest reads how
// much of a term reached the statute book, and a term that signed nothing pays
// the whole of that: this run finishes at a 0.38 share against a country that
// was never asked for anything.
import { advanceUntilAttention } from "../../packages/engine/dist/advance.js";
import { daysBetween, federalElectionDay, formatGameDate } from "../../packages/engine/dist/clock.js";
import { selectEnding } from "../../packages/engine/dist/elections.js";
import { campaignTurnPhases } from "../../packages/engine/dist/turn-phases.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "loses-reelection";

export function build() {
  const opening = foundFixture({ seedText: "fixture-loses-reelection", leaderName: "Fixture President" });
  const electionDay = federalElectionDay(2032);
  const phases = campaignTurnPhases(charterOf(opening));
  // The living clock stops the run on every federal Election Day while the
  // President is still in office, so one call now halts at the 2030 midterm
  // rather than running to 2032. A player presses on past that night, and so
  // does this: resume from each stop until the presidency ends or the vote
  // arrives. A week past the vote, so a run that failed to stop on the night is
  // caught below rather than handed to the browser as a save that looks right.
  let run = { campaign: opening, stopReason: "horizon" };
  for (let pass = 0; pass < 500; pass += 1) {
    const remaining = daysBetween(run.campaign.calendar, electionDay) + 7;
    if (remaining <= 0) break;
    const before = run.campaign.calendar;
    run = advanceUntilAttention(run.campaign, { phases, horizonDays: remaining });
    if (run.stopReason === "ended") break;
    // A stop that did not move the calendar would loop forever; fail loudly
    // rather than spin, because a silent spin here is a hung build.
    if (daysBetween(before, run.campaign.calendar) === 0) {
      throw new Error(`the run stopped on ${formatGameDate(before)} (${run.stopReason}) without advancing a day`);
    }
  }
  const ending = selectEnding(run.campaign);
  if (run.stopReason !== "ended" || ending !== "defeated" || daysBetween(run.campaign.calendar, electionDay) !== 0) {
    throw new Error(
      `expected the run to stop on ${formatGameDate(electionDay)} with a defeat; it stopped (${run.stopReason}) on ` +
        `${formatGameDate(run.campaign.calendar)} as "${ending}"`,
    );
  }
  return run.campaign;
}
