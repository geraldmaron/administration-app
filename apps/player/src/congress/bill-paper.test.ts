import { describe, expect, it } from "vitest";
import type { Bill } from "@admin/engine";
import { billNumber, congressOf, originOf, sessionOf, vetoMessage } from "./bill-paper";

const vote = (chamber: "house" | "senate") => ({ chamber }) as Bill["passage"][number];

describe("a bill's printed page", () => {
  it("names the Congress and session the date falls in", () => {
    expect(congressOf(2025)).toBe(119);
    expect(congressOf(2029)).toBe(121);
    expect(congressOf(2030)).toBe(121);
    expect(sessionOf(2029)).toBe(1);
    expect(sessionOf(2030)).toBe(2);
  });

  it("takes its chamber from the first floor vote and keeps one number", () => {
    expect(originOf({ passage: [] })).toBe("house");
    expect(originOf({ passage: [vote("senate"), vote("house")] })).toBe("senate");
    const bill = { id: "bill:act-infrastructure:3", passage: [vote("house")] };
    expect(billNumber(bill)).toMatch(/^H\. R\. \d{4}$/);
    expect(billNumber(bill)).toBe(billNumber({ ...bill }));
    expect(billNumber({ ...bill, passage: [vote("senate")] })).toMatch(/^S\. \d{4}$/);
  });
});

describe("a veto message", () => {
  const bill = { title: "The Clean Grid Act", resolvedTurn: 9 };
  it("reads the objections back from the veto's Record line", () => {
    const ledger = [{ turn: 9, description: "The President vetoes The Clean Grid Act and returns it to Congress. It spends money the country does not have." }];
    expect(vetoMessage(ledger, bill)).toBe("It spends money the country does not have.");
  });

  it("says nothing it cannot find", () => {
    expect(vetoMessage([{ turn: 8, description: "The President vetoes The Clean Grid Act and returns it to Congress. Too costly." }], bill)).toBeUndefined();
    expect(vetoMessage([], bill)).toBeUndefined();
  });
});
