import { expect, it } from "vitest";
import { balanceSeeds, playCampaign, type CampaignOutcome } from "../balance-harness.js";
import { FISCAL_PROXY_PROFILES, type FiscalProxyProfile, type SkillProxy } from "../balance-proxies.js";
import type { AdministrationParty } from "../state-legislature.js";

// R1.1, the owner's rule that a President cannot buy approval on the debt: the
// investment program's own price has to be felt by the end of a term. Read at
// the last week played, since a President who loses the election stops at it.
//
// One party per balance file, so the runner's file-level parallelism runs the
// three at once; this is the one copy of the check they all register.
//
// Thirty-six seeds, because the gap is a difference of two noisy approvals
// and its median settles slowly. Measured over balance-0..35 when the count
// was set, the per-seed gaps run from -0.008 to 0.059 with a thin middle: the
// first twelve Republican seeds gave a median of 0.0206, the first 24 0.01998
// and the first 32 0.0181, while all 36 give 0.0142 (Democrat 0.0131,
// Independent 0.0119; means 0.0170, 0.0175 and 0.0154). A bootstrap over those
// 36 put a re-drawn 24-seed Republican median over the ceiling one time in
// five. The ceiling stays at two points.
//
// Cost: each seed plays three term campaigns (investment, careful, idle) at
// 38 to 48 seconds each, so a party's file takes about 70 to 90 minutes of wall
// time (the Republican file took 86 minutes on a loaded machine when the count
// was set), and the three files run beside each other rather than one after
// another, so R1.1 as a whole costs about the same.
export const R1_SEED_COUNT = 36;
const HORIZON = 208;

const INVESTMENT = FISCAL_PROXY_PROFILES["investment-only"]!;
const CAREFUL = FISCAL_PROXY_PROFILES["careful-without-fiscal"]!;

function play(seed: string, player: SkillProxy | FiscalProxyProfile, party: AdministrationParty): CampaignOutcome {
  const schedule = typeof player === "string" ? undefined : player.schedule;
  return playCampaign(seed, player, HORIZON, party, undefined, schedule ? { schedule } : {});
}

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};
const round = (value: number, places = 4) => Math.round(value * 10 ** places) / 10 ** places;

const closing = (outcome: CampaignOutcome) => outcome.metricSeries[Math.min(HORIZON, outcome.metricSeries.length - 1)]!.approval;
const vote = (outcome: CampaignOutcome) => outcome.elections.find((election) => election.kind === "presidential")?.voteShare;

/** Paired seed by seed: the investment run's reading less the other player's. */
function gaps(
  mine: readonly CampaignOutcome[],
  theirs: readonly CampaignOutcome[],
  read: (outcome: CampaignOutcome) => number | undefined,
): readonly number[] {
  return mine.flatMap((outcome, index) => {
    const a = read(outcome);
    const b = read(theirs[index]!);
    return a === undefined || b === undefined ? [] : [a - b];
  });
}

/** Registers R1.1 for one party, in the balance file that measures that party. */
export function borrowingDoesNotBuyTheCountry(party: AdministrationParty): void {
  it(`gives investment no more than two points over careful play by the end of a term, and no less than three under idle, as a ${party}`, () => {
    const seeds = balanceSeeds(R1_SEED_COUNT);
    const investment = seeds.map((seed) => play(seed, INVESTMENT, party));
    const careful = seeds.map((seed) => play(seed, CAREFUL, party));
    const idle = seeds.map((seed) => play(seed, "passive", party));
    const overCareful = gaps(investment, careful, closing);
    const overIdle = gaps(investment, idle, closing);
    const votes = gaps(investment, careful, vote);
    console.info(
      `R1.1 ${party} over ${seeds.length} seeds: investment over careful ${overCareful.map((g) => round(g, 3)).join(", ")} ` +
        `(median ${round(median(overCareful), 4)}, spread ${round(Math.min(...overCareful), 3)} to ${round(Math.max(...overCareful), 3)}); ` +
        `over idle ${overIdle.map((g) => round(g, 3)).join(", ")} (median ${round(median(overIdle), 4)}); ` +
        `vote over careful ${votes.map((g) => round(g, 3)).join(", ")}`,
    );
    expect(overCareful).toHaveLength(seeds.length);
    expect(median(overCareful)).toBeLessThanOrEqual(0.02);
    expect(median(overIdle)).toBeGreaterThanOrEqual(-0.03);
    // The projected vote is reported and not yet held: it reads the three
    // coalitions, and the working households' and business coalitions each
    // carry an authored preference for the investment program of their own,
    // which puts investment near three points of vote over careful play
    // with approval level. Holding it to two is a change to the
    // coalitions' own reading, not to the program.
  });
}
