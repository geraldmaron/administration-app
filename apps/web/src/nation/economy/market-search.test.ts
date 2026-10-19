import { describe, expect, it } from "vitest";
import { PEER_GROUP } from "@admin/player-core";
import { marketSearch } from "./market-search";

describe("market URL state", () => {
  it("retains subject, recorded cursor and sorting through a dossier visit", () => {
    expect(marketSearch({ view: "markets", measure: "crude", observation: 4, sort: "stocks", direction: "descending" })).toEqual({ view: "markets", measure: "crude", observation: 4, sort: "stocks", direction: "descending" });
  });
  it("retains an explicit history window without accepting invented windows", () => {
    expect(marketSearch({ measure: "inflation", historyWindow: "published" })).toEqual({ measure: "inflation", historyWindow: "published" });
    expect(marketSearch({ historyWindow: "forecast" })).toEqual({});
    expect(marketSearch({ historyWindow: "term" })).toEqual({ historyWindow: "term" });
  });
  it("retains only supported inline comparison bases and US windows", () => {
    expect(marketSearch({ measure: "growth", basis: "countries", comparisonWindow: "2020-2022" })).toEqual({ measure: "growth", basis: "countries", comparisonWindow: "2020-2022" });
    expect(marketSearch({ basis: "forecast", comparisonWindow: "invented" })).toEqual({});
  });
  it("retains peer and year context through URL serialization and unrelated basis edits", () => {
    const selected = { measure: "growth", basis: "countries", peers: ["USA", "DEU"], peerWindow: "2015-2019" };
    const parsed = marketSearch(JSON.parse(JSON.stringify(selected)));
    expect(parsed).toEqual(selected);
    expect(marketSearch({ ...parsed, basis: "history" })).toEqual({ ...selected, basis: "history" });
    expect(marketSearch({ ...parsed, peerWindow: "2020-2022" }).peers).toEqual(selected.peers);
  });
  it("normalizes duplicate, unknown and excessive peers using the reference pack", () => {
    const known = PEER_GROUP.slice(0, 5).map((peer) => peer.id);
    expect(marketSearch({ peers: [known[0], ...known, "unknown", 7] }).peers).toEqual(known.slice(0, 4));
    expect(marketSearch({ peers: [], peerWindow: "1973-1982" })).toEqual({ peers: [], peerWindow: "1973-1982" });
    expect(marketSearch({ peers: "USA,DEU", peerWindow: "invented" })).toEqual({});
  });
  it("rejects unsupported fields and invalid cursor values", () => {
    expect(marketSearch({ view: "bogus", measure: "bogus", observation: -1, sort: "price", direction: "sideways", return: "https://example.com" })).toEqual({});
    expect(marketSearch({ observation: Infinity })).toEqual({});
    expect(marketSearch({ observation: 1.5 })).toEqual({});
  });
});
