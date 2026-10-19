import { describe, expect, it } from "vitest";
import type { NationFile } from "@admin/player-core";
import { countryPriorities } from "./priorities";

const band = (stance: "favorable" | "neutral" | "caution" | "adverse", word: string) => ({ stance, word, level: 2 });

function file(overrides: Record<string, unknown> = {}): NationFile {
  return {
    name: "Canada",
    atWarWith: [],
    standing: { unread: false },
    trade: { measures: [] },
    commitments: [],
    presence: [],
    ...overrides,
  } as unknown as NationFile;
}

describe("what a President opening a country file sees first", () => {
  it("says nothing when nothing marks the file", () => {
    expect(countryPriorities(file())).toEqual([]);
  });

  it("puts a war ahead of everything else and points at the war", () => {
    const items = countryPriorities(file({ atWarWith: ["war-1"], commitments: [{ status: "active" }], presence: [{ id: "a" }] }));
    expect(items[0]).toMatchObject({ id: "war", tone: "risk", href: "/world/war/war-1" });
  });

  it("orders by severity and keeps the order of the rules within one severity", () => {
    const items = countryPriorities(
      file({
        standing: { unread: true, tension: band("caution", "Rising"), threat: band("adverse", "Grave") },
        trade: { measures: [{ ours: true }, { ours: false }] },
        commitments: [{ status: "active" }, { status: "wound-down" }],
        presence: [{ id: "base" }],
      }),
    );
    expect(items.map((item) => item.id)).toEqual(["threat", "tension", "measures", "unread", "commitments", "presence"]);
    expect(items.find((item) => item.id === "measures")?.text).toBe("2 trade penalties are in place between you, and 1 of them came from their side.");
    expect(items.find((item) => item.id === "commitments")?.text).toBe("You've made them 1 promise that is still active.");
  });

  it("sends each line to the view that holds the detail", () => {
    const items = countryPriorities(file({ standing: { unread: true, tension: band("adverse", "High") }, trade: { measures: [{ ours: true }] }, presence: [{ id: "base" }] }));
    expect(Object.fromEntries(items.map((item) => [item.id, item.view]))).toEqual({ tension: "diplomacy", unread: "intelligence", measures: "economy", presence: "security" });
  });

  it("does not raise a tension that is low or manageable", () => {
    expect(countryPriorities(file({ standing: { unread: false, tension: band("favorable", "Low"), threat: band("neutral", "Modest") } }))).toEqual([]);
  });
});
