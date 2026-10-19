import { describe, expect, it } from "vitest";
import { electorateView, nationOverview } from "@admin/player-core";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { NO_FILTER, filterStates, sortStates, stateTableRows, type StateTableRow } from "./states-table";

const row = (id: string, name: string, extra: Partial<StateTableRow> = {}): StateTableRow => ({
  id,
  name,
  href: `/nation/state/${id}`,
  governor: undefined,
  party: undefined,
  reading: "50% approve",
  rank: 0.5,
  history: [],
  conditions: 0,
  declared: false,
  ...extra,
});

const ROWS: readonly StateTableRow[] = [
  row("OH", "Ohio", { governor: "Mike Dale", party: "republican", rank: 0.44 }),
  row("CA", "California", { governor: "Ana Ruiz", party: "democrat", rank: 0.61, conditions: 2 }),
  row("TX", "Texas", { governor: "Lee Park", party: "republican", rank: 0.39, declared: true }),
  row("DC", "District of Columbia", { rank: 0.7 }),
];

describe("filterStates", () => {
  it("keeps every row with no filter", () => {
    expect(filterStates(ROWS, NO_FILTER)).toHaveLength(4);
  });

  it("matches a state name, its postal code or its governor", () => {
    expect(filterStates(ROWS, { ...NO_FILTER, query: "calif" }).map((r) => r.id)).toEqual(["CA"]);
    expect(filterStates(ROWS, { ...NO_FILTER, query: "tx" }).map((r) => r.id)).toEqual(["TX"]);
    expect(filterStates(ROWS, { ...NO_FILTER, query: "park" }).map((r) => r.id)).toEqual(["TX"]);
  });

  it("narrows by the governor's party and leaves out a state with no governor", () => {
    expect(filterStates(ROWS, { ...NO_FILTER, party: "republican" }).map((r) => r.id)).toEqual(["OH", "TX"]);
  });

  it("narrows to states with a condition running or a declaration over them", () => {
    expect(filterStates(ROWS, { ...NO_FILTER, flaggedOnly: true }).map((r) => r.id)).toEqual(["CA", "TX"]);
  });
});

describe("sortStates", () => {
  it("sorts by the week's move with a missing move counted as none", () => {
    const moved = [row("A", "Aa", { change: 0.03 }), row("B", "Bb", { change: -0.04 }), row("C", "Cc")];
    expect(sortStates(moved, "change", "descending").map((r) => r.id)).toEqual(["A", "C", "B"]);
  });

  it("sorts by name either way without changing the input", () => {
    expect(sortStates(ROWS, "name", "ascending").map((r) => r.id)).toEqual(["CA", "DC", "OH", "TX"]);
    expect(sortStates(ROWS, "name", "descending").map((r) => r.id)).toEqual(["TX", "OH", "DC", "CA"]);
    expect(ROWS.map((r) => r.id)).toEqual(["OH", "CA", "TX", "DC"]);
  });

  it("sorts by the lens reading, highest first when descending", () => {
    expect(sortStates(ROWS, "reading", "descending").map((r) => r.id)).toEqual(["DC", "CA", "OH", "TX"]);
  });

  it("puts states with no governor last by governor, ascending", () => {
    expect(sortStates(ROWS, "governor", "ascending").map((r) => r.id)).toEqual(["CA", "TX", "OH", "DC"]);
  });

  it("sorts by flags, the most flagged first when descending, ties by name", () => {
    expect(sortStates(ROWS, "flags", "descending").map((r) => r.id)).toEqual(["CA", "TX", "DC", "OH"]);
  });
});

describe("stateTableRows", () => {
  const campaign = openingHarnessCampaign();
  const overview = nationOverview(campaign);
  const cells = electorateView(campaign).states;

  it("reads every state the overview carries, 51 in all", () => {
    const rows = stateTableRows(campaign, overview, "approval", cells);
    expect(rows).toHaveLength(overview.rows.length);
    expect(rows).toHaveLength(51);
  });

  it("reads each row on the lens the map shows", () => {
    expect(stateTableRows(campaign, overview, "approval", cells)[0]!.reading).toMatch(/approve/);
    expect(stateTableRows(campaign, overview, "population", cells)[0]!.reading).not.toMatch(/approve/);
  });

  it("carries each state's weekly record so the table and the electorate cannot disagree", () => {
    const rows = stateTableRows(campaign, overview, "approval", cells);
    const ohio = cells.find((cell) => cell.state === "OH");
    expect(rows.find((r) => r.id === "OH")?.history).toEqual(ohio?.history);
    expect(rows.find((r) => r.id === "OH")?.change).toBe(ohio?.change);
  });

  it("names a governor and a party for states that have one", () => {
    const governed = stateTableRows(campaign, overview, "approval", cells).filter((row) => row.governor);
    expect(governed.length).toBeGreaterThan(40);
    expect(governed.every((row) => row.party !== undefined)).toBe(true);
  });
});
