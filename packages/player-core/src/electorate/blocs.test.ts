import { describe, expect, it } from "vitest";
import { advanceTurn, campaignTurnPhases, displayRollup, selectElectorate, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { blocTopline } from "./blocs";

function weeksOn(campaign: Campaign, weeks: number): Campaign {
  const phases = campaignTurnPhases(charterOf(campaign));
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) working = advanceTurn(working, phases);
  return working;
}

describe("the three-bloc topline", () => {
  const opening = openingCampaign();
  const played = weeksOn(opening, 6);

  it("draws the engine's own rollup, in the order own, independent, opposition", () => {
    const reading = selectElectorate(played);
    const rollup = displayRollup(reading.shares, reading.approvals);
    const { blocs } = blocTopline(played);
    expect(blocs.map((bloc) => bloc.id)).toEqual(["own", "independent", "opposition"]);
    for (const bloc of blocs) {
      expect(bloc.share).toBeCloseTo(rollup[bloc.id].share, 10);
      expect(bloc.approval).toBeCloseTo(rollup[bloc.id].value, 10);
    }
  });

  it("adds up: the three contributions are the headline", () => {
    const topline = blocTopline(played);
    expect(topline.blocs.reduce((sum, bloc) => sum + bloc.contribution, 0)).toBeCloseTo(topline.headline, 8);
    expect(topline.blocs.reduce((sum, bloc) => sum + bloc.share, 0)).toBeCloseTo(1, 6);
  });

  it("labels only the President's own party as the base", () => {
    expect(blocTopline(played).blocs.filter((bloc) => bloc.base).map((bloc) => bloc.id)).toEqual(["own"]);
  });

  it("says nothing about a week's move before two weeks are observed", () => {
    for (const bloc of blocTopline(opening).blocs) expect(bloc.week).toBeUndefined();
  });

  it("splits an observed week into the record's part and the rest, which add to the observed change", () => {
    for (const bloc of blocTopline(played).blocs) {
      expect(bloc.week).toBeDefined();
      const total = bloc.week!.moves.reduce((sum, move) => sum + move.delta, 0);
      expect(total).toBeCloseTo(bloc.week!.change, 8);
    }
  });

  it("never reports an erosion cost on a bloc other than the President's own", () => {
    for (const bloc of blocTopline(played).blocs.filter((entry) => entry.id !== "own")) {
      expect(bloc.holds.find((hold) => hold.key === "scandal")).toBeUndefined();
    }
  });
});
