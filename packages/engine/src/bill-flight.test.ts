import { describe, expect, it } from "vitest";
import { originationBlocked } from "./legislation.js";
import type { Bill } from "./state-legislature.js";

function bill(id: string, sponsor: Bill["sponsor"]): Bill {
  return {
    id,
    act: id,
    title: id,
    sponsor,
    introducedTurn: 1,
    status: "in-progress",
    passage: [],
  };
}

describe("originationBlocked", () => {
  it("lets Congress start bills until two are live, holding the third slot", () => {
    expect(originationBlocked([])).toBe(false);
    expect(originationBlocked([bill("a", "opposition")])).toBe(false);
    expect(originationBlocked([bill("a", "opposition"), bill("b", "bipartisan")])).toBe(true);
  });

  it("fills the third slot once an administration bill is already in flight", () => {
    const live = [bill("a", "administration"), bill("b", "opposition")];
    expect(originationBlocked(live)).toBe(false);
    expect(originationBlocked([...live, bill("c", "opposition")])).toBe(true);
  });
});
