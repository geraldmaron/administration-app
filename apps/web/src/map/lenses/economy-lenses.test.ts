import { describe, expect, it } from "vitest";
import { stateEconomyBoard } from "@admin/player-core";
import { NAMED_PALETTE, regionTable } from "../__fixtures__/map-fixtures";
import { regionKey } from "../data";
import { openingHarnessCampaign } from "../harness/fixture";
import { lensRows } from "./contract";
import { dependenceLens, jobsLens, outputLens, pricesLens } from "./economy-lenses";

const table = regionTable();
const campaign = openingHarnessCampaign();
const state = (id: string) => table.byKey.get(regionKey("states", id))!;

describe("the economy lenses", () => {
  it("say nothing about foreign land and read every state", () => {
    for (const lens of [jobsLens(campaign, NAMED_PALETTE), pricesLens(campaign, NAMED_PALETTE), outputLens(campaign, NAMED_PALETTE), dependenceLens(campaign, NAMED_PALETTE)]) {
      expect(lens.read(table.byKey.get(regionKey("world", "FRA"))!, "nation")).toBeNull();
      expect(lens.read(state("OH"), "state")?.text.length).toBeGreaterThan(0);
    }
  });

  it("ranks the jobs list from fewest out of work, each line saying the gap against the country", () => {
    const rows = lensRows(jobsLens(campaign, NAMED_PALETTE), table, "state");
    const board = new Map(stateEconomyBoard(campaign).rows.map((row) => [`state:${row.state}`, row.jobsGap]));
    const gaps = rows.map((row) => board.get(row.ref)!);
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(rows[0]!.value).toMatch(/out of work, [+−]\d+\.\d pts against the country$/);
  });

  it("reads DC as the most federally dependent place", () => {
    const rows = lensRows(dependenceLens(campaign, NAMED_PALETTE), table, "state");
    expect(rows[0]!.ref).toBe("state:DC");
  });

  it("is dim with no administration in office", () => {
    expect(jobsLens(null, NAMED_PALETTE).read(state("OH"), "state")?.text).toBe("No administration in office");
  });
});
