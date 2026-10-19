// The week before a midterm: the chambers about to be recomposed and the
// campaign still governing.
//
// Run day by day the way Continue runs it, up to the day before federal Election
// Day 2030, so the save opens on a campaign whose next fixed date is the midterm
// and whose chambers are still the ones the founding seated. A spec that presses
// on from here reaches the election-night moment in one step, which is the whole
// point of the fixture.
import { advanceUntilAttention } from "../../packages/engine/dist/advance.js";
import { addDays, daysBetween, federalElectionDay, formatGameDate } from "../../packages/engine/dist/clock.js";
import { nextElection } from "../../packages/engine/dist/elections.js";
import { campaignTurnPhases } from "../../packages/engine/dist/turn-phases.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "midterm-eve";

export function build() {
  const opening = foundFixture({ seedText: "fixture-midterm-eve", leaderName: "Fixture President" });
  const eve = addDays(federalElectionDay(2030), -1);
  const phases = campaignTurnPhases(charterOf(opening));
  let campaign = opening;
  for (let pass = 0; pass < 500; pass += 1) {
    const remaining = daysBetween(campaign.calendar, eve);
    if (remaining <= 0) break;
    const before = campaign.calendar;
    const run = advanceUntilAttention(campaign, { phases, horizonDays: remaining });
    campaign = run.campaign;
    if (run.stopReason === "ended") break;
    // A stop that did not move the calendar would spin forever; fail loudly
    // rather than hang a build.
    if (daysBetween(before, campaign.calendar) === 0) {
      throw new Error(`the run stopped on ${formatGameDate(before)} (${run.stopReason}) without advancing a day`);
    }
  }
  const scheduled = nextElection(campaign);
  if (daysBetween(campaign.calendar, eve) !== 0 || scheduled?.kind !== "midterm" || scheduled.daysAway !== 1) {
    throw new Error(
      `expected the eve of the 2030 midterm; the run is on ${formatGameDate(campaign.calendar)} with ` +
        `${scheduled ? `a ${scheduled.kind} ${scheduled.daysAway} days away` : "no election scheduled"}`,
    );
  }
  if (campaign.congress.seatingOn !== undefined) {
    throw new Error("the chambers are already waiting to be seated; nothing has been recomposed yet");
  }
  return campaign;
}
