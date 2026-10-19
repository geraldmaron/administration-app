import { describe, expect, it } from "vitest";
import { COHORT_IDS } from "@admin/world";
import { OPINION_DRIVERS, advanceTurn, campaignTurnPhases, opinionCourse, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "../campaign/founding-options";
import { electorateView } from "../electorate/electorate";
import { crosstabs } from "./crosstabs";
import { crosstabTrends, opinionTrends } from "./opinion-trends";
import { RECORD_STARTS_AT_LOAD, changeOver, recordStart } from "./record-trend";

function weeksOn(campaign: Campaign, weeks: number): Campaign {
  const phases = campaignTurnPhases(charterOf(campaign));
  let working = campaign;
  for (let week = 0; week < weeks; week += 1) working = advanceTurn(working, phases);
  return working;
}

const played = weeksOn(openingCampaign(), 16);

describe("the change over a month and a quarter", () => {
  const points = [1, 2, 3, 4, 5, 6].map((turn) => ({ turn, value: turn / 10 }));

  it("reads the last week against the last one filed at least that many weeks before it", () => {
    expect(changeOver(points, 4)).toBe(0.4);
    expect(changeOver(points, 13)).toBeUndefined();
  });

  it("reads across a monthly stretch from the last point at or before the mark", () => {
    const sparse = [{ turn: 2, value: 0.5 }, { turn: 6, value: 0.4 }, { turn: 20, value: 0.3 }];
    expect(changeOver(sparse, 13)).toBe(-0.1);
  });
});

describe("the public's observed course", () => {
  const trends = opinionTrends(played);
  const course = opinionCourse(played);

  it("runs from the oath with one point a closed week", () => {
    expect(trends.start).toEqual({ since: 1, fromOath: true });
    expect(trends.judgments.map((series) => series.id)).toEqual([...OPINION_DRIVERS]);
    for (const series of trends.judgments) expect(series.points).toHaveLength(16);
  });

  it("draws what the engine observed, and reads its month and quarter off those points", () => {
    const prosperity = trends.judgments.find((series) => series.id === "prosperity")!;
    expect(prosperity.points.map((point) => point.value)).toEqual(course.map((sample) => sample.judgments.prosperity));
    const values = prosperity.points.map((point) => point.value);
    expect(prosperity.change4).toBeCloseTo(values[15]! - values[11]!, 6);
    expect(prosperity.change13).toBeCloseTo(values[15]! - values[2]!, 6);
  });

  it("keeps a course for every cohort cell and each of the three blocs", () => {
    expect(trends.cohorts.map((series) => series.id).sort()).toEqual([...COHORT_IDS].sort());
    expect(trends.blocs.map((series) => series.id)).toEqual(["own", "independent", "opposition"]);
    for (const series of [...trends.cohorts, ...trends.blocs]) expect(series.points, series.id).toHaveLength(16);
  });

  it("files every crosstab row's course under the row's own id, in the order the strips draw", () => {
    const cuts = crosstabs(played);
    const courses = crosstabTrends(played);
    expect(courses.map((group) => group.id)).toEqual(cuts.map((group) => group.id));
    courses.forEach((group, index) => expect(group.rows.map((row) => row.id)).toEqual(cuts[index]!.rows.map((row) => row.id)));
  });

  it("rides the electorate book", () => {
    expect(electorateView(played).trends).toEqual(trends);
  });
});

describe("an older save, whose weeks were never observed", () => {
  const { opinionRecord: _record, ...older } = played;
  const loaded: Campaign = older;

  it("draws no course and says the record starts at the load", () => {
    const trends = opinionTrends(loaded);
    expect(trends.start).toEqual({ fromOath: false, note: RECORD_STARTS_AT_LOAD });
    expect(trends.judgments.every((series) => series.points.length === 0 && series.change4 === undefined)).toBe(true);
  });

  it("keeps saying so once the record opens after the load", () => {
    const next = weeksOn(loaded, 1);
    expect(opinionTrends(next).start).toEqual({ since: played.turn, fromOath: false, note: RECORD_STARTS_AT_LOAD });
    expect(opinionTrends(next).judgments[0]!.points).toHaveLength(1);
  });

  it("does not call a campaign that has closed no week yet an older save", () => {
    expect(recordStart(openingCampaign(), undefined)).toEqual({ fromOath: true });
  });
});
