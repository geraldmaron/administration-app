import { debtToGdp } from "@admin/world";
import { describe, expect, it } from "vitest";
import {
  balanceSeeds,
  electoralSeeds,
  formatBalanceReport,
  playCampaign,
  runBalanceHarness,
  TERM_HORIZON_TURNS,
  type BalanceReport,
} from "./balance-harness.js";
import { PROXY_PROFILES, SKILL_PROXIES, type SkillProxy } from "./balance-proxies.js";
import type { Campaign } from "./state.js";

// The population gate, and why it is not `balance.test.ts`.
//
// The standing gate defends written-down numbers against three proxies that
// bracket the space: never act, always reach for the top, act on odds you
// like. Those numbers are measured, and running ten more players through that
// file would have quadrupled its cost without moving one assertion.
//
// What a population can be asked and a bracket cannot is whether the outcome
// depends on *how* a president governs rather than only on how hard. Every
// assertion below is a comparison between two players who differ in one dial
// and are otherwise held to the same seeds, the same charter draw and the same
// horizon — which is the only reason the comparison means anything.
//
// These are harness-measured, not playtested. Nobody has played these
// campaigns; what is defended is the shape of the distribution.

const SEEDS = balanceSeeds(5);
const TIMEOUT = 600_000;

let cached: BalanceReport | undefined;
function report(): BalanceReport {
  cached ??= runBalanceHarness(SEEDS, undefined, SKILL_PROXIES);
  return cached;
}

function summary(skill: SkillProxy) {
  return report().bySkill[skill];
}

function medianYearOneDebtRatio(skill: SkillProxy): number {
  const ratios = SEEDS.map((seed) => {
    let ratio = 0;
    playCampaign(seed, skill, 52, "democrat", undefined, {
      observeWeek: (state: Campaign) => {
        ratio = debtToGdp(state.nations[state.founding.nation]!.stats);
      },
    });
    return ratio;
  });
  const sorted = [...ratios].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

describe("the population of players", () => {
  it("reports the distribution it is asserting on", () => {
    console.info(formatBalanceReport(report()));
  }, TIMEOUT);

  it("measures every player it claims to model", () => {
    // The gap this file closes: the harness modeled three players and the
    // mission named thirteen, so ten ways of governing had never been run.
    expect(SKILL_PROXIES).toHaveLength(13);
    for (const skill of SKILL_PROXIES) {
      expect(summary(skill).campaigns, `${skill} ran no campaigns`).toBe(SEEDS.length);
    }
  }, TIMEOUT);

  it("gives every player a reason to exist beside the others", () => {
    // A population whose rows are duplicates is a bracket wearing a bigger
    // name. Two players may share a dial; no two may share all of them.
    const seen = new Map<string, SkillProxy>();
    for (const skill of SKILL_PROXIES) {
      const profile = PROXY_PROFILES[skill];
      const key = JSON.stringify([
        profile.oddsFloor,
        profile.reserveShare,
        profile.rungBias,
        [...profile.instruments].sort(),
        profile.nominationsPerWeek,
        profile.pipelineWidth,
        profile.freeWinsOnly,
        [...profile.program].sort(),
      ]);
      const twin = seen.get(key);
      expect(twin, `${skill} and ${twin} are the same player under two names`).toBeUndefined();
      seen.set(key, skill);
    }
  });

  it("separates filling the offices from playing well", () => {
    // The measurement this population was built for. Until it existed, exactly
    // one proxy staffed the government and it was also the one that played
    // carefully, so the delivery wire's effect and careful play's effect
    // arrived welded together and no run could tell them apart.
    //
    // `institutionalist` staffs harder than anyone and acts almost never;
    // `passive` does neither. They differ in the staffing dial and in nothing
    // that reaches the instrument ladder, so the gap between them is the
    // offices and only the offices.
    expect(PROXY_PROFILES.institutionalist.nominationsPerWeek).toBeGreaterThan(0);
    expect(PROXY_PROFILES.passive.nominationsPerWeek).toBe(0);
  }, TIMEOUT);

  // What the offices are worth to the headline. The four political offices
  // below the cabinet open under career actings while the President's picks
  // wait on the Senate, and an acting's authority runs out on the Vacancies Act
  // clock. The institutionalist has them filled within weeks; a President who
  // never nominates governs their last months of the year with the chairs
  // empty, and the country notices a little.
  it("lifts approval by filling the offices", () => {
    expect(summary("institutionalist").medianFinalApproval).toBeGreaterThan(
      summary("passive").medianFinalApproval,
    );
  }, TIMEOUT);

  it("makes the instrument a president reaches for show up in what they used", () => {
    // A preference dial that did not move the mix would be a comment. Each
    // single-lane player has to actually spend most of its acts in its lane.
    const lanes: readonly (readonly [SkillProxy, readonly ("diplomatic" | "economic" | "covert" | "military" | "assistance")[]])[] = [
      ["hawk", ["military", "covert"]],
      ["diplomat", ["diplomatic", "assistance"]],
      ["economist", ["economic"]],
    ];
    for (const [skill, lane] of lanes) {
      const shares = summary(skill).instrumentShare;
      const used = lane.reduce((sum, id) => sum + shares[id], 0);
      // Not 1.0: a lane player still governs in a week its lane offers nothing,
      // and the fallback is deliberate rather than a leak.
      expect(used, `${skill} spent ${used} of its acts in its own lane`).toBeGreaterThan(0.6);
    }
  }, TIMEOUT);

  it("keeps the accounts a constraint for every way of playing, not only three", () => {
    // The treasury band was defended against three players. Ten of the
    // thirteen had never been near it, including the two whose whole design is
    // to press on it — `spendthrift` keeps no reserve at all and `populist`
    // keeps a fifth.
    for (const skill of SKILL_PROXIES) {
      const ratio = summary(skill).medianTreasuryRatio;
      expect(ratio, `${skill} treasury ratio ${ratio}`).toBeLessThan(2);
    }
  }, TIMEOUT);

  // Spending has to cost more than not spending for the player whose whole
  // design is to press on the accounts. The year-one debt stock is the
  // comparison, because both proxies sit on the authority ceiling and an
  // administration's authority never reaches the national books: what reaches
  // them is the program, and the spendthrift's borrows to build.
  it("spends more than doing nothing, for the player whose whole design is to press on the accounts", () => {
    const spendthrift = medianYearOneDebtRatio("spendthrift");
    const passive = medianYearOneDebtRatio("passive");
    console.info(`[population] spendthrift debt ratio at a year ${spendthrift}; passive ${passive}`);
    expect(spendthrift).toBeGreaterThan(passive);
  }, TIMEOUT);

  // The hawk used to end the year at zero whatever it kept back. Traced week
  // by week, its authority held through the autumn and then emptied in the
  // twelve weeks a lapse ran into the new fiscal year: nothing was apportioned,
  // and its program and the budget rebuilding the forces its acts had spent
  // kept obligating money that no officer may obligate while the appropriation
  // has lapsed. Both now stop for the weeks of a shutdown. The reckless proxy
  // keeps no reserve and is exempt, for the reason given in balance.test.ts.
  it("keeps every player that holds a reserve above the treasury floor", () => {
    for (const skill of SKILL_PROXIES) {
      if (skill === "reckless") continue;
      const ratio = summary(skill).medianTreasuryRatio;
      expect(ratio, `${skill} treasury ratio ${ratio}`).toBeGreaterThan(0.1);
    }
  }, TIMEOUT);

  // No deliberate way of playing leaves the country's order on the floor a year
  // in. The line sits just under the reckless proxy's own year, so nobody who
  // is not built to govern badly ends it with less order than the one who is,
  // and well under the lowest proxy that behaves. Reckless is exempt and read
  // out beside the bound, because the removal path needs a player who can
  // reach the floors.
  it("leaves no way of playing but the reckless one with the country's order under 0.15 at a year", () => {
    console.info(`[population] reckless order at a year ${summary("reckless").medianFinalStability} (exempt)`);
    for (const skill of SKILL_PROXIES) {
      if (skill === "reckless") continue;
      const order = summary(skill).medianFinalStability;
      expect(order, `${skill} order at a year ${order}`).toBeGreaterThanOrEqual(0.15);
    }
  }, TIMEOUT);

  it("charges for reaching up the ladder no matter which lane it is reached in", () => {
    // Removal pressure is the game's judgment on how a president governed. The
    // bracket could only show that `reckless` is punished; what it could not
    // show is whether that is about *force* or about *volume*. `hawk` and
    // `diplomat` act at the same odds floor and keep the same reserve, and
    // differ only in which instrument they reach for.
    expect(PROXY_PROFILES.hawk.oddsFloor).toBe(PROXY_PROFILES.diplomat.oddsFloor);
    expect(PROXY_PROFILES.hawk.reserveShare).toBe(PROXY_PROFILES.diplomat.reserveShare);
    // Reaching for the coercive lane has to cost something the gentle lane
    // does not: the hawk must not finish the year on a steadier country than
    // the diplomat does.
    expect(summary("hawk").medianFinalStability).toBeLessThanOrEqual(
      summary("diplomat").medianFinalStability,
    );
  }, TIMEOUT);

  it("leaves no player in a campaign that cannot be lost or cannot be survived", () => {
    // A proxy removed in every campaign, or in none of them across the whole
    // population, is a player the game has no answer for.
    const rates = SKILL_PROXIES.map((skill) => summary(skill).removalRate);
    expect(Math.min(...rates)).toBeLessThan(1);
    expect(Math.max(...rates)).toBeLessThanOrEqual(1);
  }, TIMEOUT);

  // Somebody in the population has to be able to be removed from office, or the
  // game has no failure state but the ballot. The bar is a full term, not this
  // file's year: removal is built on pressure that compounds, and with the
  // war's cost to approval measured from the forces actually sent, the
  // reckless player is removed in its third year (week 115 on one of four term
  // seeds when this bar moved) rather than its first. A year with nobody removed is the expected reading now; a term with
  // nobody removed is the defect. The term is run on `term-balance.test.ts`'s
  // horizon and seeds, one player at a time and stopping at the first removal.
  // The reckless player goes first because it is the one built to reach the
  // floors, so a passing run usually costs a few of its campaigns; a failing
  // one has asked every way of playing.
  it("leaves somebody in the population able to be removed within a term", () => {
    const seeds = electoralSeeds(4);
    const order: readonly SkillProxy[] = ["reckless", ...SKILL_PROXIES.filter((skill) => skill !== "reckless")];
    const removable = order.find((skill) =>
      seeds.some((seed) => playCampaign(seed, skill, TERM_HORIZON_TURNS).ending === "removed"),
    );
    console.info(`[population] first player removed within a term: ${removable ?? "none"}`);
    expect(removable, "no way of playing is removed within a term").toBeDefined();
  }, TIMEOUT);
});
