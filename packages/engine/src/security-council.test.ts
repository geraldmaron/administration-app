import { describe, expect, it } from "vitest";
import type { NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { councilEffects, councilVote, securityCouncil, tallyCouncil, type CouncilMeasure, type CouncilPosition } from "./security-council.js";

const RULE = { permanent: ["CHN", "FRA", "GBR", "RUS", "USA"] as NationId[], threshold: 9, source: "https://example.org/charter" };
const SEATS = ["CHN", "FRA", "GBR", "RUS", "USA", "BHR", "COL", "COD", "DNK", "GRC", "LVA", "LBR", "PAK", "PAN", "SOM"];

function positions(entries: Readonly<Record<string, CouncilPosition>>, fill: CouncilPosition): Record<string, CouncilPosition> {
  return Object.fromEntries(SEATS.map((seat) => [seat, entries[seat] ?? fill]));
}

describe("Article 27 arithmetic", () => {
  it("adopts a substantive draft on nine votes when no permanent member votes no", () => {
    const tally = tallyCouncil(RULE, "sanctions", positions({ RUS: "abstain", CHN: "abstain", BHR: "against", COL: "against", COD: "against", DNK: "against", GRC: "against", LVA: "against", LBR: "against" }, "for"));
    expect(tally).toMatchObject({ for: 6, adopted: false, reason: "short-of-votes" });
    const nine = tallyCouncil(RULE, "sanctions", positions({ RUS: "abstain", CHN: "abstain", BHR: "abstain", COL: "abstain", COD: "abstain", DNK: "abstain" }, "for"));
    expect(nine).toMatchObject({ for: 9, abstain: 6, adopted: true, reason: "adopted", vetoedBy: [] });
  });

  it("fails a substantive draft with fourteen votes when one permanent member votes no", () => {
    const tally = tallyCouncil(RULE, "authorize-force", positions({ RUS: "against" }, "for"));
    expect(tally).toMatchObject({ for: 14, adopted: false, reason: "vetoed", vetoedBy: ["RUS"] });
  });

  it("does not call a permanent no a veto when the draft lacked nine votes anyway", () => {
    const tally = tallyCouncil(RULE, "sanctions", positions({ USA: "for", GBR: "for", FRA: "for", CHN: "against" }, "abstain"));
    expect(tally.reason).toBe("short-of-votes");
  });

  it("carries no veto on a procedural question and still needs nine", () => {
    expect(tallyCouncil(RULE, "procedural", positions({ RUS: "against", CHN: "against" }, "for"))).toMatchObject({ for: 13, adopted: true, vetoedBy: [] });
    expect(tallyCouncil(RULE, "procedural", positions({}, "abstain")).adopted).toBe(false);
  });

  it("lets an elected member's no count only against the total", () => {
    expect(tallyCouncil(RULE, "sanctions", positions({ PAK: "against", SOM: "against" }, "for"))).toMatchObject({ for: 13, adopted: true });
  });
});

describe("what a resolution does", () => {
  it("never gives a President domestic authority or a military result", () => {
    for (const measure of ["procedural", "recommendation", "sanctions", "authorize-force"] as CouncilMeasure[]) {
      expect(councilEffects(measure)).toMatchObject({ usDomesticAuthority: "none", militaryOutcome: "none" });
    }
  });

  it("binds members only through a decision, and permits force without obliging it", () => {
    expect(councilEffects("recommendation").bindsMembers).toBe(false);
    expect(councilEffects("sanctions").bindsMembers).toBe(true);
    expect(councilEffects("authorize-force")).toMatchObject({ authorizesForce: true, bindsMembers: false });
  });
});

describe("the Council voting on the shipped world", () => {
  const { campaign } = foundedForBalance("security-council");
  const usa = "USA" as NationId;

  it("is the registry's body, with its fifteen seats", () => {
    expect(securityCouncil()?.members).toHaveLength(15);
  });

  it("vetoes a resolution the United States favors and Russia and China oppose", () => {
    const vote = councilVote(campaign, { sponsor: usa, target: "IRN" as NationId, measure: "sanctions" })!;
    expect(vote.positions["RUS"]).toBe("against");
    expect(vote.positions["CHN"]).toBe("against");
    expect(vote.adopted).toBe(false);
    expect(vote.vetoedBy).toEqual(["CHN", "RUS"]);
    expect(vote.effects).toBeUndefined();
  });

  it("vetoes a force authorization with nine votes behind it", () => {
    const vote = councilVote(campaign, { sponsor: usa, target: "VEN" as NationId, measure: "authorize-force" })!;
    expect(vote.for).toBeGreaterThanOrEqual(9);
    expect(vote).toMatchObject({ adopted: false, reason: "vetoed" });
  });

  it("makes the target and the sponsor vote their own cause", () => {
    const vote = councilVote(campaign, { sponsor: usa, target: "RUS" as NationId, measure: "sanctions" })!;
    expect(vote.positions["USA"]).toBe("for");
    expect(vote.positions["RUS"]).toBe("against");
    expect(vote.vetoedBy).toContain("RUS");
  });

  it("has a party to the dispute abstain on a recommendation, as Article 27 requires", () => {
    const vote = councilVote(campaign, { sponsor: usa, target: "PAK" as NationId, measure: "recommendation" })!;
    expect(vote.positions["PAK"]).toBe("abstain");
  });

  it("has a sponsor that is itself a party abstain on a recommendation", () => {
    const vote = councilVote(campaign, { sponsor: usa, target: "RUS" as NationId, measure: "recommendation", parties: [usa, "RUS" as NationId] })!;
    expect(vote.positions["USA"]).toBe("abstain");
    expect(vote.positions["RUS"]).toBe("abstain");
  });

  it("adopts some drafts with a permanent member abstaining, and attaches their effects", () => {
    const permanent = securityCouncil()!.council!.permanent as readonly string[];
    const passed = (Object.keys(campaign.nations) as NationId[])
      .filter((target) => target !== usa)
      .map((target) => councilVote(campaign, { sponsor: usa, target, measure: "recommendation" })!)
      .filter((vote) => vote.adopted && permanent.some((seat) => vote.positions[seat] === "abstain"));
    expect(passed.length).toBeGreaterThan(0);
    for (const vote of passed) {
      expect(vote.for).toBeGreaterThanOrEqual(9);
      expect(vote.effects).toEqual(councilEffects("recommendation"));
    }
  });

  it("is deterministic", () => {
    const proposal = { sponsor: usa, target: "CUB" as NationId, measure: "sanctions" as const };
    expect(councilVote(campaign, proposal)).toEqual(councilVote(campaign, proposal));
  });
});
