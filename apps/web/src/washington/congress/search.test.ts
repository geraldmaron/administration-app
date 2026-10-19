import { describe, expect, it } from "vitest";
import { aisleFromSearch, parseCongressSearch, withAisle } from "./search";

describe("Congress return context", () => {
  it("retains validated chart, delegation, seat and member filters", () => {
    const raw = { view: "overview", state: "OH", seat: "OH-01", map: "delegation-warmth", color: "vote", houseLens: "slice", houseAt: "-1", senateLens: "opponents", chamber: "senate", q: "Wyoming", sort: "state", direction: "descending" };
    const parsed = parseCongressSearch(raw);
    expect(parsed).toEqual({ ...raw, houseAt: -1 });
    expect(aisleFromSearch(parsed, "house")).toEqual({ kind: "slice", at: -1 });
    expect(aisleFromSearch(parsed, "senate")).toEqual({ kind: "opponents" });
  });
  it("does not trust arbitrary states, lenses, sort columns or off-scale values", () => {
    expect(parseCongressSearch({ view: "unknown", state: "ZZ", seat: "<script>", map: "secret", color: "race", houseLens: "invalid", houseAt: -1.01, senateAt: Infinity, chamber: "all", q: 42, sort: "private", direction: "sideways" })).toEqual({});
  });
  it("changes one chamber without losing the other chamber or member search", () => {
    const search = parseCongressSearch({ view: "overview", senateLens: "opponents", state: "OH", q: "Ohio" });
    const next = withAisle(search, "house", { kind: "slice", at: 1 });
    expect(next).toMatchObject({ senateLens: "opponents", state: "OH", q: "Ohio", houseLens: "slice", houseAt: 1 });
    expect(withAisle(next, "house", { kind: "all" })).not.toHaveProperty("houseAt");
  });
});
