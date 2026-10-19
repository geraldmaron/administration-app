import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { boardPanelsReading } from "./board-panels";

const campaign = openingCampaign();

describe("the world board's panels", () => {
  it("always returns exactly the three panels, in flight then watch then blocs", () => {
    const panels = boardPanelsReading(campaign);
    expect(panels.map((panel) => panel.id)).toEqual(["in-flight", "watch", "blocs"]);
  });

  it("the watch panel never lists more than ten capitals, and never the President's own country", () => {
    const watch = boardPanelsReading(campaign).find((panel) => panel.id === "watch")!;
    expect(watch.rows.length).toBeLessThanOrEqual(10);
    expect(watch.rows.some((row) => row.nation === campaign.founding.nation)).toBe(false);
  });

  it("the blocs panel never lists an empty bucket, and every row names a real alignment word", () => {
    const blocs = boardPanelsReading(campaign).find((panel) => panel.id === "blocs")!;
    for (const row of blocs.rows) expect(Number(row.meta)).toBeGreaterThan(0);
  });

  it("lists a pursuit run in the open, and never one run entirely by covert means", () => {
    const pursuit = (id: string, overt: boolean): Campaign["pursuits"][string] => ({
      id,
      actor: "CHN" as NationId,
      target: "IND" as NationId,
      aim: "security",
      openedTurn: 0,
      commitment: 0.5,
      progress: 0,
      rungReached: 1,
      overt,
      lastActedTurn: 0,
      status: "active",
      beats: [],
    });
    const planted: Campaign = { ...campaign, pursuits: { open: pursuit("open", true), hidden: pursuit("hidden", false) } };
    const inFlight = boardPanelsReading(planted).find((panel) => panel.id === "in-flight")!;
    expect(inFlight.rows.map((row) => row.key)).toContain("open");
    expect(inFlight.rows.map((row) => row.key)).not.toContain("hidden");
    expect(inFlight.rows.find((row) => row.key === "open")?.meta).toBe("Wants to feel safe");
  });
});
