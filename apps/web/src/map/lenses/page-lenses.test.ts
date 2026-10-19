import { describe, expect, it } from "vitest";
import { NAMED_PALETTE, regionTable } from "../__fixtures__/map-fixtures";
import { regionKey } from "../data";
import { openingHarnessCampaign } from "../harness/fixture";
import { homesLensId } from "./home-lens";
import { resolveLens } from "./registry";

const table = regionTable();
const campaign = openingHarnessCampaign();
const state = (id: string) => table.byKey.get(regionKey("states", id))!;

describe("the circuits lens", () => {
  it("colors a state by its circuit's bench and leaves foreign land alone", () => {
    const lens = resolveLens("circuits", campaign, NAMED_PALETTE);
    expect(lens.id).toBe("circuits");
    expect(lens.read(state("OH"), "state")?.text).toContain("Sixth Circuit");
    expect(lens.read(table.byKey.get(regionKey("world", "FRA"))!, "nation")).toBeNull();
  });
});

describe("the homes lens", () => {
  it("names a ticket's states before any campaign exists", () => {
    const lens = resolveLens(homesLensId("OH", "TX", ["FL", "TX"]), null, NAMED_PALETTE);
    expect(lens.read(state("OH"), "state")?.text).toContain("your home");
    expect(lens.read(state("TX"), "state")?.text).toContain("running mate");
    expect(lens.read(state("FL"), "state")?.text).toContain("shortlist");
    expect(lens.read(state("NY"), "state")).toBeNull();
  });

  it("marks a state that is both yours and your running mate's once", () => {
    const lens = resolveLens(homesLensId("OH", "OH"), null, NAMED_PALETTE);
    expect(lens.read(state("OH"), "state")?.text).toContain("you and your running mate");
  });
});
