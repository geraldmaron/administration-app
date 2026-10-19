import { describe, expect, it } from "vitest";
import { apply, declareEmergency, type Campaign, type NationCondition } from "@admin/engine";
import { NAMED_PALETTE, regionTable } from "../../map/__fixtures__/map-fixtures";
import { lensRows } from "../../map/lenses/contract";
import { resolveLens } from "../../map/lenses/registry";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { SHARE_LENS_IDS, shareDomainOf } from "./share-lens";

const table = regionTable();
const campaign = openingHarnessCampaign();

function flooded(base: Campaign): Campaign {
  const condition: NationCondition = {
    id: `condition:flood:${base.founding.nation}:OH:${base.turn}`,
    nation: base.founding.nation,
    kind: "flood",
    scope: "region",
    severity: 0.7,
    startedTurn: base.turn,
    status: "active",
    beats: [],
    state: "OH",
  };
  return { ...base, conditions: { ...base.conditions, [condition.id]: condition } };
}

describe("the policy share lens", () => {
  it("resolves one lens per domain, by its own id", () => {
    for (const id of SHARE_LENS_IDS) expect(resolveLens(id, campaign, NAMED_PALETTE).id).toBe(id);
    expect(shareDomainOf("share-defense")).toBe("defense");
    expect(shareDomainOf("share-nothing")).toBeUndefined();
  });

  it("ranks every state by its share, and says nothing about foreign land", () => {
    const rows = lensRows(resolveLens("share-defense", campaign, NAMED_PALETTE), table, "state");
    expect(rows.length).toBeGreaterThanOrEqual(50);
    expect(rows[0]!.value).toMatch(/^\d+% of its economy in defense work$/);
    expect(lensRows(resolveLens("share-defense", campaign, NAMED_PALETTE), table, "nation")).toEqual([]);
  });
});

describe("the conditions lens", () => {
  it("ranks a state with a running condition first, and marks a declaration", () => {
    const wet = flooded(campaign);
    const first = lensRows(resolveLens("conditions", wet, NAMED_PALETTE), table, "state")[0]!;
    expect(first.ref).toBe("state:OH");
    expect(first.value).toMatch(/severity 70%$/);
    const result = declareEmergency(wet, { kind: "state", state: "OH" }, "flood");
    if (!result.ok) throw new Error(result.reason);
    const declared = lensRows(resolveLens("conditions", apply(wet, result.packet), NAMED_PALETTE), table, "state")[0]!;
    expect(declared.value).toMatch(/emergency declared$/);
  });
});
