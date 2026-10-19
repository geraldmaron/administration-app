import { describe, expect, it } from "vitest";
import { COHORT_AXES, COHORT_IDS, COHORT_AXIS, STATE_IDS, cohortsOfAxis } from "@admin/world";
import { cohortSupport, stateApprovals, type Campaign } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { STATE_GROUP_METHOD, stateGroupGrid, stateGroupRating, statePeople } from "./state-people";

const campaign = openingCampaign();

describe("a state's groups, rated in that state", () => {
  it("reads each group's support in the state, beside its national figure and the gap between them", () => {
    const people = statePeople(campaign, "WV")!;
    expect(people.ratings.length).toBeGreaterThan(0);
    for (const rating of people.ratings) {
      expect(rating.national).toBeCloseTo(cohortSupport(campaign, rating.cohort), 6);
      expect(rating.gap).toBeCloseTo(rating.support - rating.national, 9);
      expect(rating.figure).toBe(`${Math.round(rating.support * 100)}%`);
    }
  });

  it("no longer reads the national figure as the state's: the same group rates differently in West Virginia and California", () => {
    const rural = (state: "WV" | "CA") => stateGroupGrid(campaign, "place").rows.find((row) => row.state === state)!.cells.find((cell) => cell.cohort === "rural")!.support;
    expect(Math.abs(rural("WV") - rural("CA"))).toBeGreaterThan(0.1);
  });

  it("says what the figure is in one line", () => {
    expect(STATE_GROUP_METHOD).toMatch(/^Estimated/);
    expect(STATE_GROUP_METHOD.split(". ").length).toBe(1);
  });
});

describe("the states-by-groups grid", () => {
  it.each(COHORT_AXES)("carries every state and every %s group, and each row adds up to the state's approval", (axis) => {
    const grid = stateGroupGrid(campaign, axis);
    expect(grid.groups.map((group) => group.cohort)).toEqual(cohortsOfAxis(axis));
    expect(grid.rows.map((row) => row.state)).toEqual([...STATE_IDS]);
    const approvals = stateApprovals(campaign);
    for (const row of grid.rows) {
      const total = row.cells.reduce((sum, cell) => sum + cell.share, 0);
      const mean = row.cells.reduce((sum, cell) => sum + cell.share * cell.support, 0) / total;
      expect(mean, row.state).toBeCloseTo(approvals[row.state]!, 5);
      expect(row.approval).toBe(approvals[row.state]);
    }
  });

  it("is undefined-free for a campaign with a state missing", () => {
    const { WY: _drop, ...rest } = campaign.states;
    const partial: Campaign = { ...campaign, states: rest as Campaign["states"] };
    const grid = stateGroupGrid(partial, "age");
    expect(grid.rows.some((row) => row.state === "WY")).toBe(false);
    expect(statePeople(partial, "WY")).toBeUndefined();
  });
});


describe("exact state-community evidence", () => {
  it("matches each heatmap cell even for groups omitted from the selected summary", () => {
    const summarized = new Set(statePeople(campaign, "CO")!.ratings.map((entry) => entry.cohort));
    expect(COHORT_IDS.some((cohort) => !summarized.has(cohort))).toBe(true);
    for (const cohort of COHORT_IDS) {
      const selected = stateGroupRating(campaign, "CO", cohort);
      const cell = stateGroupGrid(campaign, COHORT_AXIS[cohort]).rows.find((row) => row.state === "CO")!.cells.find((entry) => entry.cohort === cohort)!;
      expect(selected?.support, cohort).toBe(cell.support);
      expect(selected?.state, cohort).toBe(cell.share);
      expect(selected?.national, cohort).toBe(cohortSupport(campaign, cohort));
    }
  });
  it("does not invent evidence for a missing state", () => {
    const { WY: _drop, ...states } = campaign.states;
    expect(stateGroupRating({ ...campaign, states: states as Campaign["states"] }, "WY", "rural")).toBeUndefined();
  });
});
