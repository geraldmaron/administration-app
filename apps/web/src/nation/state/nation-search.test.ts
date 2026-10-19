import { describe, expect, it } from "vitest";
import { nationSearch } from "./nation-search";

describe("Nation investigation address", () => {
  it("retains the complete state comparison context across a URL roundtrip", () => {
    const chosen = nationSearch({ view: "states", lens: "population", group: "place", state: "co", query: "Colorado", sort: "reading", direction: "descending", party: "democrat", flagged: true, groupSort: "rural", groupDirection: "ascending" });
    const params = new URLSearchParams(Object.entries(chosen).map(([key, value]) => [key, String(value)]));
    expect(nationSearch(Object.fromEntries(params))).toEqual({ ...chosen, state: "CO" });
  });
  it("rejects unknown states, invalid axes and sort keys that belong to another category", () => {
    expect(nationSearch({ state: "ZZ", group: "invented", sort: "invented", groupSort: "age-65-plus", direction: "sideways" })).toEqual({});
    expect(nationSearch({ group: "age", groupSort: "rural" })).toEqual({ group: "age" });
  });
  it("strips defaults but preserves a meaningful empty-state search", () => {
    expect(nationSearch({ view: "opinion", lens: "approval", query: "no matching governor", sort: "name", direction: "ascending", groupSort: "approval", groupDirection: "descending" })).toEqual({ query: "no matching governor" });
  });
});
