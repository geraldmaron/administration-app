// A second term won, with the map called and the next Congress elected but not
// yet seated.
//
// The country only re-elects a government that governed, which is the whole
// point of the contest: a campaign that drifts for four years loses, measured at
// a 0.499 share. So this fixture is played rather than idled — the balance
// harness's careful proxy makes the acts, sends the bills up and staffs the
// offices for the first 196 weeks, and then the last fortnight is run day by day
// the way Continue runs it so the save lands exactly on the night of November 2,
// 2032 rather than the following weekend.
//
// The harness is the engine's own player, not a second simulation: it drives
// `advanceUntilAttention` with the charter's phase list, which is what the app
// drives. Nothing here fabricates state — a fixture that hand-wrote a won
// election would prove nothing about the election.
//
// The night is the state the name promises: a won presidential result on the term
// clock, a called map, and `congress.seatingOn` carrying the chambers that take
// their seats on January 3 — the lame-duck weeks, which no other fixture reaches.
import { advanceUntilAttention } from "../../packages/engine/dist/advance.js";
import { playCampaign } from "../../packages/engine/dist/balance-harness.js";
import { daysBetween, federalElectionDay, formatGameDate } from "../../packages/engine/dist/clock.js";
import { stateCalls } from "../../packages/engine/dist/states.js";
import { campaignTurnPhases } from "../../packages/engine/dist/turn-phases.js";
import { charterOf } from "../../packages/player-core/dist/index.js";

export const name = "reelection-night";

/** Weeks of careful government before the last fortnight is walked by hand. */
const PLAYED_WEEKS = 196;

export function build() {
  const night = federalElectionDay(2032);
  let governed;
  playCampaign("fixture-reelection-night", "prudent", PLAYED_WEEKS, "democrat", {}, {
    observeWeek: (state) => {
      if (daysBetween(state.calendar, night) > 0) governed = state;
    },
  });
  if (governed === undefined) throw new Error("the played term never closed a week before the night");

  const phases = campaignTurnPhases(charterOf(governed));
  let campaign = governed;
  for (let pass = 0; pass < 60; pass += 1) {
    const remaining = daysBetween(campaign.calendar, night);
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

  const contest = [...campaign.termClock.elections].reverse().find((election) => election.kind === "presidential");
  if (daysBetween(campaign.calendar, night) !== 0 || contest?.won !== true) {
    throw new Error(
      `expected a second term won on ${formatGameDate(night)}; the run is on ${formatGameDate(campaign.calendar)} ` +
        `with ${contest ? `a contest at ${contest.voteShare}` : "no contest held"}`,
    );
  }
  if (stateCalls(campaign).length === 0) throw new Error("the night called no states");
  if (campaign.congress.seatingOn === undefined) {
    throw new Error("the Congress elected tonight is not waiting to be seated");
  }
  return campaign;
}
