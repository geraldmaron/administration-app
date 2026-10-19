import { describe, expect, it } from "vitest";
import {
  FORCE_ASSETS,
  FORCE_ASSET_IDS,
  MILITARY_BRANCHES,
  forceAssetNoun,
  forceAssetsOfBranch,
  type ForceUnit,
  type Nation,
} from "../schemas/index.js";
import { worldDataset } from "../dataset/index.js";
import { checkForceAssets, checkForceBoard } from "./force-checks.js";
import { CARRIED_CONFLICTS } from "../dataset/carried-conflicts.js";
import { US_BASING } from "../dataset/us-basing.js";
import { US_MUNITIONS } from "../dataset/us-munitions.js";

const usa = worldDataset.nations.find((nation) => String(nation.id) === "USA")!;

function withArmy(units: ForceUnit[]): Nation {
  const oob = usa.stats.military.orderOfBattle!;
  return { ...usa, stats: { ...usa.stats, military: { ...usa.stats.military, orderOfBattle: { ...oob, army: { ...oob.army, units } } } } };
}

describe("the force-asset catalog", () => {
  it("names every id after the service that owns it, so a misfiled holding is visible in the id", () => {
    for (const id of FORCE_ASSET_IDS) {
      expect(id.split(".")[0]).toBe(FORCE_ASSETS[id].branch);
    }
  });

  it("gives every service something to count", () => {
    for (const branch of MILITARY_BRANCHES) expect(forceAssetsOfBranch(branch).length).toBeGreaterThan(0);
  });

  it("crews every asset with at least one person, and describes it", () => {
    for (const id of FORCE_ASSET_IDS) {
      expect(FORCE_ASSETS[id].nominalPersonnel).toBeGreaterThan(0);
      expect(FORCE_ASSETS[id].description.length).toBeGreaterThan(40);
    }
  });

  it("counts a holding in the noun a sentence would use, never in its id", () => {
    expect(forceAssetNoun("air.fighter", 48)).toBe("fighters");
    expect(forceAssetNoun("navy.aircraft-carrier", 1)).toBe("aircraft carrier");
    expect(forceAssetNoun("army.brigade-combat-team", 8)).toBe("brigade combat teams");
    expect(forceAssetNoun("army.group-army", 2)).toBe("group armies");
    expect(forceAssetNoun("air.transport", 30)).toBe("transport aircraft");
    for (const id of FORCE_ASSET_IDS) {
      expect(forceAssetNoun(id, 2)).not.toContain(".");
      expect(forceAssetNoun(id, 2)).toBe(forceAssetNoun(id, 2).toLowerCase());
    }
  });
});

describe("what the validator holds an order of battle to", () => {
  it("passes every authored decomposition in the dataset", () => {
    for (const nation of worldDataset.nations) expect(checkForceAssets(nation)).toEqual([]);
  });

  it("refuses a holding filed under a service that does not own it", () => {
    const errors = checkForceAssets(withArmy([{ type: "navy.frigate", count: 2, readiness: 0.5 }]));
    expect(errors.map((e) => e.message)).toEqual([expect.stringContaining("belongs to the navy")]);
  });

  it("refuses the same holding listed twice, so counts can be added", () => {
    const errors = checkForceAssets(
      withArmy([
        { type: "army.brigade-combat-team", count: 2, readiness: 0.5 },
        { type: "army.brigade-combat-team", count: 3, readiness: 0.6 },
      ]),
    );
    expect(errors.map((e) => e.message)).toEqual([expect.stringContaining("listed twice")]);
  });

  it("refuses units that would need more people than the service has", () => {
    const errors = checkForceAssets(withArmy([{ type: "army.brigade-combat-team", count: 500, readiness: 0.5 }]));
    expect(errors).toEqual([expect.objectContaining({ kind: "unit-mismatch" })]);
  });
});

describe("the board's force rules", () => {
  const seeded = { basing: US_BASING, conflicts: CARRIED_CONFLICTS, munitions: US_MUNITIONS };

  it("passes the seeded tables", () => {
    expect(checkForceBoard(worldDataset)).toEqual([]);
  });

  it("refuses an installation in a country not on the roster", () => {
    const basing = [...US_BASING, { ...US_BASING[0]!, country: "ZZZ" }];
    expect(checkForceBoard(worldDataset, { ...seeded, basing }).map((error) => error.kind)).toEqual(["dangling-reference"]);
  });

  it("refuses a row that cites no opened source", () => {
    const basing = [...US_BASING, { ...US_BASING[0]!, source: "" }];
    const munitions = [...US_MUNITIONS, { ...US_MUNITIONS[0]!, opened: "" }];
    expect(checkForceBoard(worldDataset, { ...seeded, basing, munitions })).toHaveLength(2);
  });

  it("refuses the United States as a belligerent in a carried war", () => {
    const conflicts = [...CARRIED_CONFLICTS, { ...CARRIED_CONFLICTS[0]!, parties: ["USA", "IRN"] }];
    expect(checkForceBoard(worldDataset, { ...seeded, conflicts }).map((error) => error.kind)).toEqual(["plausibility"]);
  });

  it("refuses a munitions class the engine does not read, or an opening off the index", () => {
    const munitions = [...US_MUNITIONS, { ...US_MUNITIONS[0]!, munitionClass: "javelin" }, { ...US_MUNITIONS[0]!, openingIndex: 1.4 }];
    expect(checkForceBoard(worldDataset, { ...seeded, munitions })).toHaveLength(2);
  });
});
