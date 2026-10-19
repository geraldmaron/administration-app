import { describe, expect, it } from "vitest";
import { makeCampaignSeed, sealFounding, type Campaign } from "@admin/engine";
import { COMPARE_METRICS, foundingOptions, openingChoices, standingToward } from "@admin/player-core";
import { worldDataset, type NationId } from "@admin/world";
import { NATION_METRICS, dossierMatrix } from "./compare";

function opening(): Campaign {
  const seed = makeCampaignSeed("world-dossier-compare");
  const choices = openingChoices(foundingOptions(seed));
  return sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Test President" } });
}

const campaign = opening();
const others = (Object.keys(campaign.nations) as NationId[]).filter((id) => id !== campaign.founding.nation);
const unread = others.find((id) => standingToward(campaign, id)?.unread);
const read = others.find((id) => standingToward(campaign, id)?.unread === false);

describe("a government set beside the United States and its peers", () => {
  it("carries only the readings a foreign government has in this game", () => {
    expect(NATION_METRICS.length).toBeGreaterThan(0);
    for (const id of NATION_METRICS) expect(COMPARE_METRICS[id].subjects).toContain("nation");
    expect(NATION_METRICS).not.toContain("approval");
  });

  it("puts the President's own row first, the file's government second, and never repeats it among the peers", () => {
    const matrix = dossierMatrix(campaign, others[0]!, "g7");
    expect(matrix.rows[0]?.self).toBe(true);
    expect(matrix.rows[1]?.focus).toBe(true);
    expect(matrix.rows.filter((row) => row.focus)).toHaveLength(1);
    expect(matrix.columns.map((column) => column.id)).toEqual(NATION_METRICS);
  });

  it("refuses an assessed reading of a government the services cannot read, in words, rather than printing a figure", () => {
    expect(unread).toBeDefined();
    if (!unread) return;
    const matrix = dossierMatrix(campaign, unread, "rivals");
    const row = matrix.rows.find((entry) => entry.focus)!;
    const assessed = matrix.columns.filter((column) => column.assessed);
    expect(assessed.length).toBeGreaterThan(0);
    for (const column of assessed) expect(row.values[column.id]).toBeNull();
    expect(matrix.refusals.some((refusal) => refusal.label.startsWith(row.label) && refusal.reason.length > 0)).toBe(true);
  });

  it("prints an assessed reading of a government the services do read", () => {
    expect(read).toBeDefined();
    if (!read) return;
    const matrix = dossierMatrix(campaign, read, "allies");
    const row = matrix.rows.find((entry) => entry.focus)!;
    const assessed = matrix.columns.filter((column) => column.assessed);
    expect(assessed.some((column) => typeof row.values[column.id] === "number")).toBe(true);
  });
});
