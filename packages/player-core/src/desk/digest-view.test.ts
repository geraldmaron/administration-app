import { describe, expect, it } from "vitest";
import { advanceUntilAttention, campaignTurnPhases } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { DIGEST_WINDOW, digestView, kpiHref } from "./digest-view";
import { NOW_KEYS } from "./now-readings";
import { weekDigest } from "./week-digest";

const OPENING = openingCampaign();
const RAN = advanceUntilAttention(OPENING, { phases: campaignTurnPhases(charterOf(OPENING)), matterSources: [], horizonDays: 28 }).campaign;
const WEEK = RAN.turn - 2;

describe("the digest view", () => {
  it("has no view for a week the term has not closed", () => {
    expect(digestView(RAN, RAN.turn)).toBeUndefined();
    expect(digestView(OPENING, 1)).toBeUndefined();
  });

  it("draws the picker oldest to newest with the open week marked and the chart scaled to its largest move", () => {
    const view = digestView(RAN, WEEK)!;
    expect(view.bars.length).toBeLessThanOrEqual(DIGEST_WINDOW);
    expect(view.bars.map((bar) => bar.week)).toEqual([...view.bars.map((bar) => bar.week)].sort((a, b) => a - b));
    expect(view.bars.filter((bar) => bar.current).map((bar) => bar.week)).toEqual([WEEK]);
    expect(view.bars.every((bar) => Math.abs(bar.share) <= 1)).toBe(true);
    expect(view.newerWeek).toBe(WEEK + 1);
  });

  it("reads each bar's figure from the same week list the digest uses", () => {
    const view = digestView(RAN, WEEK)!;
    const bar = view.bars.find((entry) => entry.week === WEEK)!;
    expect(bar.delta).toBeCloseTo(weekDigest(RAN, WEEK)!.approvalDelta!, 10);
  });

  it("gives all five readings, each linked to the screen that owns it and never to a retired metric page", () => {
    const view = digestView(RAN, WEEK)!;
    expect(view.kpis.map((kpi) => kpi.key)).toEqual([...NOW_KEYS]);
    expect(kpiHref("approval")).toBe("/nation?view=opinion");
    expect(kpiHref("treasury")).toBe("/nation/budget?view=authority");
    expect(view.kpis.some((kpi) => kpi.href.startsWith("/brief/metric/"))).toBe(false);
  });

  it("agrees with the week's own moves: every moved reading carries the digest's text and direction", () => {
    const view = digestView(RAN, WEEK)!;
    for (const move of view.digest.moves) {
      const kpi = view.kpis.find((entry) => entry.key === move.key)!;
      expect(kpi.text).toBe(move.text);
      expect(kpi.direction).toBe(move.delta > 0 ? "up" : "down");
      expect(kpi.afterText).toBe(move.afterText);
    }
    for (const kpi of view.kpis.filter((entry) => entry.direction === "flat")) expect(kpi.share).toBe(0);
  });

  it("scales every reading to one signed scale", () => {
    const view = digestView(RAN, WEEK)!;
    expect(view.kpis.every((kpi) => Math.abs(kpi.share) <= 1)).toBe(true);
  });

  it("tiles every state that moved, each a door to its state, with the digest's top movers among them", () => {
    const view = digestView(RAN, WEEK)!;
    expect(view.tiles.every((tile) => tile.href === `/nation/state/${tile.id}` && Math.abs(tile.share) <= 1)).toBe(true);
    const ids = new Set(view.tiles.map((tile) => tile.id));
    for (const move of [...view.digest.risers, ...view.digest.fallers]) expect(ids.has(move.id)).toBe(true);
  });

  it("keeps every act and world entry in exactly one domain group", () => {
    const view = digestView(RAN, WEEK)!;
    expect(view.acts.flatMap((group) => group.rows).length).toBe(view.digest.acts.length);
    expect(view.world.flatMap((group) => group.rows).length).toBe(view.digest.world.length);
    for (const group of [...view.acts, ...view.world]) expect(group.helped + group.hurt).toBeLessThanOrEqual(group.rows.length);
  });

  it("keeps every wire item, marking intelligence and linking only items that name a subject", () => {
    const view = digestView(RAN, WEEK)!;
    expect(view.wire.flatMap((group) => group.lines).length).toBe(view.digest.wire.length);
    for (const line of view.wire.flatMap((group) => group.lines)) {
      expect(line.intelligence).toBe(view.digest.wire[line.index]!.visibility === "intelligence");
      if (line.href) expect(line.subject).toBeTruthy();
    }
  });
});
