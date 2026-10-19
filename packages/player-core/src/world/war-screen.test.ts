import { describe, expect, it } from "vitest";
import { apply, joinConflict, openConflict, type Campaign, type Conflict } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { authorizationComparison, authorizationPacket, endComparison, endPacket, joinComparison, joinPacket, reportComparison, reportPacket, terminateComparison } from "./war-acts";
import { warScreenReading } from "./war-screen";

const RUS = "RUS" as NationId;
const UKR = "UKR" as NationId;

function invasion(): { campaign: Campaign; conflict: Conflict } {
  const opening = openingCampaign({ seedText: "war-screen" });
  const conflict = openConflict(RUS, UKR, opening.turn, "Russia invades Ukraine.");
  return { campaign: { ...opening, conflicts: { ...opening.conflicts, [conflict.id]: conflict } }, conflict };
}

function entered(): { campaign: Campaign; conflict: Conflict } {
  const { campaign, conflict } = invasion();
  const result = joinConflict(campaign, campaign.founding.nation, conflict.id, "defender");
  if (!result.ok) throw new Error(result.reason);
  return { campaign: apply(campaign, result.packet), conflict };
}

describe("a war as its screen reads it", () => {
  it("reads nothing for a war that is not on the board", () => {
    expect(warScreenReading(invasion().campaign, "war:none")).toBeUndefined();
  });

  it("puts each government on its side, names the set the map detaches, and says the United States is outside", () => {
    const { campaign, conflict } = invasion();
    const reading = warScreenReading(campaign, conflict.id)!;
    expect(reading.title).toBe("Russia against Ukraine");
    expect(reading.usRole).toBe("outside");
    expect(reading.sides.aggressor.members.map((member) => member.nation)).toEqual([RUS]);
    expect(reading.sides.defender.members.map((member) => member.role)).toEqual(["principal"]);
    expect(reading.set).toBe("nation:RUS|nation:UKR");
    expect(reading.intensity.word).toMatch(/^(Held|Simmering|Hot|Intense)$/);
    expect(reading.peace).toBeUndefined();
  });

  it("lights the United States on the side it joined and opens the War Powers paper", () => {
    const { campaign, conflict } = entered();
    const reading = warScreenReading(campaign, conflict.id)!;
    expect(reading.usRole).toBe("joined");
    expect(reading.usSide).toBe("defender");
    expect(reading.sides.defender.members.some((member) => member.us)).toBe(true);
    expect(reading.set.split("|")).toContain(`nation:${campaign.founding.nation}`);
    expect(reading.papers).toHaveLength(1);
    expect(reading.papers[0]).toMatchObject({ against: RUS, report: "Owed" });
    expect(reading.papers[0]!.reportClock?.daysRemaining).toBeGreaterThanOrEqual(0);
    expect(reading.papers[0]!.withdrawal?.windowDays).toBe(62);
    expect(reading.canLeave).toBe(true);
    expect(reading.peace?.joined).toBe(true);
  });

  it("never prints one of a side's two will-to-fight readings without the other", () => {
    const { campaign, conflict } = invasion();
    const reading = warScreenReading(campaign, conflict.id)!;
    for (const side of [reading.sides.aggressor, reading.sides.defender]) {
      expect(side.support === undefined).toBe(side.exhaustion === undefined);
    }
  });
});

describe("joining a war", () => {
  it("prices each side from the same call the commit makes, with no column for staying out", () => {
    const { campaign, conflict } = invasion();
    const comparison = joinComparison(campaign, conflict.id)!;
    expect(comparison.columns.map((column) => column.id)).toEqual(["defender", "aggressor"]);
    const defend = comparison.columns.find((column) => column.id === "defender")!;
    expect(defend.refusal).toBeUndefined();
    expect(defend.cells.price!.lines.join(" ")).toMatch(/Military readiness/i);
    const packet = joinPacket(campaign, conflict.id, "defender");
    const metric = packet.effects.find((effect) => effect.kind === "metric");
    expect(metric?.kind === "metric" ? metric.deltas.militaryReadiness : undefined).toBeLessThan(0);
  });

  it("gives a locked column the engine's reason", () => {
    const { campaign, conflict } = entered();
    const comparison = joinComparison(campaign, conflict.id)!;
    expect(comparison.columns.every((column) => column.refusal)).toBe(true);
  });
});

describe("asking Congress for the authority to fight", () => {
  it("offers the ask for each principal the war has not covered, and commits the engine's own packet", () => {
    const { campaign, conflict } = invasion();
    const reading = warScreenReading(campaign, conflict.id)!;
    expect(reading.authorizations.map((entry) => [entry.nation, entry.state])).toEqual([[RUS, "open"], [UKR, "open"]]);
    const comparison = authorizationComparison(campaign, RUS);
    expect(comparison.waiting).toMatch(/sixty-day clock/);
    expect(comparison.columns.find((column) => column.id === "ask")!.refusal).toBeUndefined();
    const asked = apply(campaign, authorizationPacket(campaign, RUS));
    expect(warScreenReading(asked, conflict.id)!.authorizations[0]!.state).toBe("pending");
  });
});

describe("ending a war the United States joined", () => {
  it("offers cooling and leaving, and leaving commits the engine's own packet", () => {
    const { campaign, conflict } = entered();
    const comparison = endComparison(campaign, conflict.id, "joined", undefined);
    expect(comparison.columns.map((column) => column.id)).toEqual(["cool", "leave"]);
    expect(comparison.columns.find((column) => column.id === "leave")!.refusal).toBeUndefined();
    const left = apply(campaign, endPacket(campaign, conflict.id, "leave"));
    expect(left.conflicts[conflict.id]!.joined.defender).not.toContain(campaign.founding.nation);
  });

  it("refuses a settlement the United States cannot sign for a principal", () => {
    const { campaign, conflict } = entered();
    expect(() => endPacket(campaign, conflict.id, "settle")).toThrow(/joined/);
  });
});

describe("the War Powers paper", () => {
  it("files the report against leaving it unfiled, and brings the force out", () => {
    const { campaign, conflict } = entered();
    const paper = warScreenReading(campaign, conflict.id)!.papers[0]!;
    const obligation = campaign.security.warPowers.obligations.find((entry) => entry.id === paper.id)!;
    const terms = { authority: "Article II, as Commander in Chief", weeks: 8 };
    const filing = reportComparison(campaign, obligation, terms);
    expect(filing.columns.map((column) => column.id)).toEqual(["file"]);
    expect(filing.columns[0]!.refusal).toBeUndefined();
    const filed = apply(campaign, reportPacket(campaign, obligation, terms));
    expect(warScreenReading(filed, conflict.id)!.papers[0]!.report).toBe("Filed");
    expect(terminateComparison(campaign, obligation).columns[0]!.refusal).toBeUndefined();
  });
});
