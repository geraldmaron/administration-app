import { describe, expect, it } from "vitest";
import { projectVote, projectedStateCalls, stateApprovals } from "@admin/engine";
import { STATE_IDS } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { NATION_LENSES, callWords, isNationLens, leanWords, nationOverview, peopleWords, rankStates, stateLensValue, stateRows } from "./nation-overview";

const campaign = openingCampaign();

describe("stateRows", () => {
  it("carries every state with the engine's own approval and call", () => {
    const rows = stateRows(campaign);
    expect(rows.map((row) => row.id)).toEqual([...STATE_IDS]);
    const approvals = stateApprovals(campaign);
    const calls = projectedStateCalls(campaign, projectVote(campaign).share);
    for (const row of rows) {
      expect(row.approval).toBe(approvals[row.id]);
      expect(row.call).toEqual(calls.find((call) => call.state === row.id));
      expect(row.href).toBe(`/nation/state/${row.id}`);
    }
  });
});

describe("nationOverview", () => {
  const overview = nationOverview(campaign);

  it("splits all 538 electors between the administration and the opposition", () => {
    expect(overview.electoral.forYou + overview.electoral.against).toBe(538);
    expect(overview.electoral.needed).toBe(270);
  });

  it("puts every state in exactly one approval band, in states and in electors", () => {
    expect(overview.bands.reduce((sum, band) => sum + band.states, 0)).toBe(STATE_IDS.length);
    expect(overview.bands.reduce((sum, band) => sum + band.electoralVotes, 0)).toBe(538);
  });

  it("puts the median between the lowest and highest state", () => {
    const approvals = overview.rows.map((row) => row.approval);
    expect(overview.median).toBeGreaterThanOrEqual(Math.min(...approvals));
    expect(overview.median).toBeLessThanOrEqual(Math.max(...approvals));
  });
});

describe("ranking by lens", () => {
  const rows = stateRows(campaign);

  it("ranks approval highest first", () => {
    const ranked = rankStates(rows, "approval");
    for (let i = 1; i < ranked.length; i += 1) expect(ranked[i - 1]!.approval).toBeGreaterThanOrEqual(ranked[i]!.approval);
  });

  it("ranks lean from the Democratic end and population largest first", () => {
    const lean = rankStates(rows, "lean");
    expect(lean[0]!.lean).toBeLessThanOrEqual(lean[lean.length - 1]!.lean);
    expect(rankStates(rows, "population")[0]!.id).toBe("CA");
  });

  it("says every lens's value in words", () => {
    for (const lens of NATION_LENSES) expect(stateLensValue(rows[0]!, lens).text.length).toBeGreaterThan(0);
    // The call ranks by the administration's own share, so a state lost by a mile sits below one lost narrowly.
    for (const row of rows) expect(stateLensValue(row, "call").rank).toBe(row.call.share);
    expect(isNationLens("lean")).toBe(true);
    expect(isNationLens("relations")).toBe(false);
  });
});

describe("words", () => {
  it("says lean the way a reader does", () => {
    expect(leanWords(-0.12)).toBe("D+12");
    expect(leanWords(0.04)).toBe("R+4");
    expect(leanWords(0.001)).toBe("Even");
  });

  it("rounds a headcount", () => {
    expect(peopleWords(38_943_145)).toBe("39 million");
    expect(peopleWords(5_877_610)).toBe("5.9 million");
    expect(peopleWords(733_406)).toBe("733 thousand");
  });

  it("says a split call by its electors", () => {
    expect(callWords({ state: "ME", share: 0.52, electoralVotes: 4, administrationVotes: 3, winner: "administration", allocation: "by-district" })).toBe("Split, 3 of 4 for you");
    expect(callWords({ state: "TX", share: 0.56, electoralVotes: 40, administrationVotes: 0, winner: "opposition", allocation: "winner-take-all" })).toBe("Against you, 44%");
  });
});
