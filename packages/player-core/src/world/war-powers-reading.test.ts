import { describe, expect, it } from "vitest";
import { apply, joinConflict, openConflict, type Campaign, type Conflict } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { boardStateSummary, warReadings } from "./board-state";
import { enteredFronts, frontWarPowers, joinPriceBeforeJoin, warPartyForces, warPowersBeforeJoin } from "./war-powers-reading";

const RUS = "RUS" as NationId;
const UKR = "UKR" as NationId;

function invasion(): { campaign: Campaign; conflict: Conflict } {
  const opening = openingCampaign({ seedText: "war-powers-reading" });
  const conflict = openConflict(RUS, UKR, opening.turn, "Russia invades Ukraine.");
  return { campaign: { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } }, conflict };
}

describe("the War Powers price of entering a war, before it is entered", () => {
  // Sixty days from the day the report is owed, two days after forces go in: the
  // latest the statute lets the clock start, which is when it starts unreported.
  it("shows the report due in two days, the withdrawal clock at sixty-two, and the arsenal on the other side", () => {
    const { campaign, conflict } = invasion();
    const preview = warPowersBeforeJoin(campaign, conflict.id, "defender")!;
    expect(preview.report.daysRemaining).toBe(2);
    expect(preview.report.windowDays).toBe(2);
    expect(preview.report.dueLabel).toMatch(/^Report to Congress by [A-Z][a-z]+ \d{1,2}, \d{4}$/);
    expect(preview.withdrawal?.daysRemaining).toBe(62);
    expect(preview.withdrawal?.windowDays).toBe(62);
    expect(preview.withdrawal?.dueLabel).toMatch(/unless Congress votes$/);
    expect(preview.refusal).toBeUndefined();
    expect(preview.deterrence).toMatch(/^Russia has nuclear weapons, and so does the United States/);
  });

  it("names the authorization instead of a withdrawal clock when Congress has voted", () => {
    const { campaign: open, conflict } = invasion();
    const authorization = { id: `aumf:RUS:${open.turn}`, title: "Authorization for Use of Military Force", target: RUS, enactedTurn: open.turn, expiresTurn: open.turn + 52, vote: [] };
    const campaign: Campaign = { ...open, congress: { ...open.congress, authorizations: [authorization] } };
    const preview = warPowersBeforeJoin(campaign, conflict.id, "defender")!;
    expect(preview.withdrawal).toBeUndefined();
    expect(preview.cover).toMatch(/^Allowed by the Authorization for Use of Military Force until /);
  });

  it("says what is missing, rather than offering a clock, when the office's own authority does not reach", () => {
    const { campaign: open, conflict } = invasion();
    const campaign: Campaign = {
      ...open,
      congress: { ...open.congress, unauthorized: [{ id: `unauthorized:IRN:${open.turn}`, target: "IRN" as NationId, turn: open.turn, rung: 4, description: "Air strikes against Iran, ordered without a vote." }] },
    };
    expect(warPowersBeforeJoin(campaign, conflict.id, "defender")?.refusal).toMatch(/congressional authorization/);
  });

  it("runs the same clock on the front once the United States is in", () => {
    const { campaign, conflict } = invasion();
    const joined = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const front = frontWarPowers(apply(campaign, joined.packet), RUS);
    expect(front.withdrawal?.daysRemaining).toBe(warPowersBeforeJoin(campaign, conflict.id, "defender")?.withdrawal?.daysRemaining);
    expect(front.withdrawal?.windowDays).toBe(62);
    expect(front.report).toBe("Owed");
    expect(front.cover).toBeUndefined();
  });

  it("reads a certified front against the sixty days and the thirty the certification buys", () => {
    const { campaign, conflict } = invasion();
    const joined = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const entered = apply(campaign, joined.packet);
    const warPowers = entered.security.warPowers;
    const certified: Campaign = {
      ...entered,
      security: {
        ...entered.security,
        warPowers: {
          ...warPowers,
          obligations: warPowers.obligations.map((obligation) =>
            obligation.target === RUS ? { ...obligation, extension: { certifiedDay: obligation.openedDay, necessity: "Bringing the force out safely." } } : obligation,
          ),
        },
      },
    };
    const before = frontWarPowers(entered, RUS).withdrawal!;
    const after = frontWarPowers(certified, RUS).withdrawal!;
    expect(after.windowDays).toBe(92);
    expect(after.daysRemaining).toBe(before.daysRemaining + 30);
  });

  it("lists the entered war, with its clock, among the fronts the United States is on", () => {
    const { campaign, conflict } = invasion();
    expect(enteredFronts(campaign)).toEqual([]);
    const joined = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(enteredFronts(apply(campaign, joined.packet))).toEqual([
      expect.objectContaining({ conflictId: conflict.id, alongside: UKR, against: RUS, warPowers: expect.objectContaining({ report: "Owed" }) }),
    ]);
  });

  it("is silent about a front nobody has introduced forces into", () => {
    const { campaign } = invasion();
    expect(frontWarPowers(campaign, RUS)).toEqual({});
  });
});

describe("a joined war on the board, in the joiner's own words", () => {
  function joined(): Campaign {
    const { campaign, conflict } = invasion();
    const result = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
    if (!result.ok) throw new Error(`the join was refused: ${result.reason}`);
    return apply(campaign, result.packet);
  }

  it("counts the war the United States entered as one this government is carrying", () => {
    const { campaign } = invasion();
    expect(warReadings(campaign)).toEqual([]);
    const entered = joined();
    expect(warReadings(entered).map((war) => war.id)).toEqual(enteredFronts(entered).map((front) => front.conflictId));
    expect(boardStateSummary(entered)).toBe("You're dealing with a war.");
  });

  it("names the side it fights on and the government it fights, and never calls it the other side's war against us", () => {
    const [war] = warReadings(joined());
    expect(war?.headline).toBe("Your war beside Ukraine, against Russia");
    expect(war?.joined).toEqual({ alongside: UKR, against: RUS });
    expect(war?.headline).not.toMatch(/war against you/);
  });

  it("leaves out the principal's willingness and wear, which are not this country's figures", () => {
    const [war] = warReadings(joined());
    expect(war?.readings.map((reading) => reading.key)).toEqual(["intensity"]);
  });

  it("keeps a war the United States fights as a principal in its own words, with all three readings", () => {
    const opening = openingCampaign({ seedText: "war-powers-reading" });
    const conflict = openConflict(RUS, opening.founding.nation, opening.turn, "Russia strikes Alaska.");
    const [war] = warReadings({ ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } });
    expect(war?.headline).toBe("Russia's war against you");
    expect(war?.joined).toBeUndefined();
    expect(war?.readings.map((reading) => reading.key)).toEqual(["intensity", "support", "exhaustion"]);
  });
});

describe("what a join does to approval and to the Hill, read before it is taken", () => {
  function authorizedAgainst(campaign: Campaign, target: NationId): Campaign {
    const authorization = { id: `aumf:${target}:${campaign.turn}`, title: "Authorization for Use of Military Force", target, enactedTurn: campaign.turn, expiresTurn: campaign.turn + 52, vote: [] };
    return { ...campaign, congress: { ...campaign.congress, authorizations: [authorization] } };
  }

  const cases = [
    { side: "defender" as const, enemy: RUS, authorized: false },
    { side: "defender" as const, enemy: RUS, authorized: true },
    { side: "aggressor" as const, enemy: UKR, authorized: false },
    { side: "aggressor" as const, enemy: UKR, authorized: true },
  ];
  for (const { side, enemy, authorized } of cases) {
    it(`projects the headline the packet settles, joining the ${side} ${authorized ? "under an authorization" : "without a vote"}`, () => {
      const { campaign: open, conflict } = invasion();
      const campaign = authorized ? authorizedAgainst(open, enemy) : open;
      const price = joinPriceBeforeJoin(campaign, conflict.id, side)!;
      const joined = joinConflict(campaign, campaign.founding.nation, conflict.id, side);
      expect(joined.ok).toBe(true);
      if (!joined.ok) return;
      const after = apply(campaign, joined.packet);
      expect(price.approval.settled).toBe(after.player.metrics.approval);
      expect(price.approval.now).toBe(campaign.player.metrics.approval);
      expect(price.unilateral).toBe(!authorized);
      expect(price.words.every((line) => !/\d\.\d/.test(line))).toBe(true);
    });
  }

  // The war's own term on the security judgment is a rally less the front's
  // unease and the dead. In the week a fresh war is entered the rally outweighs
  // the rest, so the war is not the reason approval falls and no reason is given.
  it("lifts approval the week the country goes in while a fresh war is rallied to, and blames no war the country is still rallying to", () => {
    // The rally is an impulse on the record every bloc reads, so it lands in
    // the week of joining rather than in a judgment the country drifts toward.
    const { campaign, conflict } = invasion();
    const price = joinPriceBeforeJoin(campaign, conflict.id, "defender")!;
    expect(price.approval.settled).toBeGreaterThan(price.approval.now);
    expect(price.because).toBeUndefined();
    expect(price.words[0]).toMatch(/while the war lasts\.$/);
  });

  it("says the war is why, once the rally has faded below the unease of the front", () => {
    const { campaign: open, conflict: fresh } = invasion();
    // A year and a half in, a joined war's rally (halving over twenty weeks) has
    // halved four times and the front's unease is the larger cost.
    const conflict: Conflict = { ...fresh, startedTurn: fresh.startedTurn - 80 };
    const campaign: Campaign = { ...open, conflicts: { ...open.conflicts, [conflict.id]: conflict } };
    const price = joinPriceBeforeJoin(campaign, conflict.id, "defender")!;
    expect(price.because).toMatch(/^The country is at war/);
    expect(price.words[0]).toMatch(/while the war lasts\. The country is at war/);
  });

  it("charges the Hill's goodwill for going in without a vote, and not under an authorization", () => {
    const { campaign, conflict } = invasion();
    const unilateral = joinPriceBeforeJoin(campaign, conflict.id, "defender")!;
    expect(unilateral.congress.after.value).toBeLessThan(unilateral.congress.before.value);
    const covered = joinPriceBeforeJoin(authorizedAgainst(campaign, RUS), conflict.id, "defender")!;
    expect(covered.congress.after.value).toBe(covered.congress.before.value);
  });

  it("reads the whip's count on force against the enemy before and after the join", () => {
    const { campaign, conflict } = invasion();
    const price = joinPriceBeforeJoin(campaign, conflict.id, "defender")!;
    expect(price.authorization.against).toBe(RUS);
    expect(["remote", "unlikely", "roughly even", "likely", "almost certain"]).toContain(price.authorization.before);
    expect(["remote", "unlikely", "roughly even", "likely", "almost certain"]).toContain(price.authorization.after);
  });
});

describe("what each party to a war has committed to it", () => {
  it("lists the United States' introduction against the enemy, and no commitment on record for anyone else", () => {
    const { campaign: open, conflict } = invasion();
    const withAlly = { ...open, conflicts: { ...open.conflicts, [conflict.id]: { ...conflict, joined: { aggressor: ["BLR" as NationId], defender: [] } } } };
    const joined = joinConflict(withAlly, withAlly.founding.nation, conflict.id, "defender");
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    const forces = warPartyForces(apply(withAlly, joined.packet), conflict.id)!;
    expect(forces.aggressor.map((party) => [party.nation, party.role, party.committed])).toEqual([
      [RUS, "principal", []],
      ["BLR", "joined", []],
    ]);
    const [ukraine, us] = forces.defender;
    expect(ukraine).toEqual({ nation: UKR, role: "principal", committed: [] });
    expect(us?.role).toBe("joined");
    expect(us?.committed).toEqual(["Forces sent into the war against Russia: forces introduced into hostilities."]);
  });

  it("reads nothing for a war that is not on the board", () => {
    expect(warPartyForces(invasion().campaign, "war:none")).toBeUndefined();
  });
});

describe("the arsenal read stays an honest fact, never a figure (review F14)", () => {
  it("says a side holds nuclear weapons but never states a count, even when its arsenal is undeclared", () => {
    const { campaign, conflict } = invasion();
    const runtime = campaign.nations[RUS]!;
    const undeclared: Campaign = {
      ...campaign,
      nations: {
        ...campaign.nations,
        [RUS]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, arsenal: { ...runtime.stats.military.arsenal, declared: false } } } },
      },
    };
    const preview = warPowersBeforeJoin(undeclared, conflict.id, "defender")!;
    expect(preview.deterrence).toMatch(/has nuclear weapons/);
    expect(preview.deterrence).not.toMatch(/\d/);
  });
});
