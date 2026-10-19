import { describe, expect, it } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { archiveMonth, economyRecord, foldIntoArchive } from "./economy-archive.js";
import { createSave, loadSave } from "./save.js";
import type { Campaign, EconomySample } from "./state.js";
import { ECONOMY_HISTORY_WINDOW, advanceTurn } from "./turn-loop.js";

const sample = (turn: number): EconomySample => ({ turn, growth: 0.02, inflation: 0.03, unemployment: 0.04 + turn / 100_000, costOfLiving: 1 });

describe("folding weeks into the monthly archive", () => {
  it("keeps the last reading of each month and never two of one month", () => {
    const weeks = Array.from({ length: 20 }, (_, i) => sample(i + 1));
    const archive = foldIntoArchive([], weeks);
    const months = archive.map((s) => archiveMonth(s.turn));
    expect(new Set(months).size).toBe(months.length);
    for (const kept of archive) {
      const later = weeks.find((w) => archiveMonth(w.turn) === archiveMonth(kept.turn) && w.turn > kept.turn);
      expect(later, `week ${kept.turn} is not its month's last`).toBeUndefined();
    }
  });

  it("folds in two steps exactly as in one", () => {
    const weeks = Array.from({ length: 30 }, (_, i) => sample(i + 1));
    expect(foldIntoArchive(foldIntoArchive([], weeks.slice(0, 11)), weeks.slice(11))).toEqual(foldIntoArchive([], weeks));
  });
});

describe("a presidency longer than the weekly ring", () => {
  function played(weeks: number): Campaign {
    let campaign: Campaign = { ...buildCampaign(), economyHistory: [] };
    for (let i = 0; i < weeks; i += 1) campaign = advanceTurn(campaign);
    return campaign;
  }

  it("keeps the older course monthly while the ring stays two years", () => {
    const campaign = played(ECONOMY_HISTORY_WINDOW + 60);
    expect(campaign.economyHistory).toHaveLength(ECONOMY_HISTORY_WINDOW);
    const archive = campaign.economyArchive!;
    expect(archive.length).toBeGreaterThan(10);
    expect(archive.at(-1)!.turn).toBeLessThan(campaign.economyHistory![0]!.turn);
    const turns = economyRecord(campaign).map((s) => s.turn);
    expect(turns).toEqual([...turns].sort((a, b) => a - b));
    expect(new Set(turns).size).toBe(turns.length);
    expect(campaign.economyHistory![0]!.turn).toBe(campaign.turn - ECONOMY_HISTORY_WINDOW + 1);
  });

  it("holds nothing in the archive until a week actually leaves the ring", () => {
    expect(played(ECONOMY_HISTORY_WINDOW).economyArchive).toBeUndefined();
  });

  it("round-trips through a save without gaining or losing a month", () => {
    const campaign = played(ECONOMY_HISTORY_WINDOW + 30);
    const loaded = loadSave(createSave(campaign));
    expect(loaded.economyArchive).toEqual(campaign.economyArchive);
  });

  it("opens an older save with no archive and does not invent the weeks it never kept", () => {
    const old = { ...buildCampaign(), economyHistory: [sample(5), sample(6)] };
    const loaded = loadSave(createSave(old));
    expect(loaded.economyArchive).toBeUndefined();
    expect(economyRecord(loaded).map((s) => s.turn)).toEqual([5, 6]);
  });
});
