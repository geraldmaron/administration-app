import { describe, expect, it } from "vitest";
import type { ConditionBoardRow } from "@admin/player-core";
import { prioritizedIncidents } from "./incidents";

const row = (id: string, headline: string, fraction: number): ConditionBoardRow => ({ id, headline, severity: { fraction } }) as unknown as ConditionBoardRow;

describe("prioritizedIncidents", () => {
  it("lists conditions and incidents together, most severe first", () => {
    const conditions = [row("a", "Drought", 0.4), row("b", "Flood", 0.9)];
    const incidents = [row("c", "Tornado", 0.6)];
    expect(prioritizedIncidents({ conditions, incidents }).map((entry) => entry.id)).toEqual(["b", "c", "a"]);
  });

  it("breaks ties by headline and leaves its input alone", () => {
    const conditions = [row("a", "Wildfire", 0.5), row("b", "Earthquake", 0.5)];
    expect(prioritizedIncidents({ conditions, incidents: [] }).map((entry) => entry.id)).toEqual(["b", "a"]);
    expect(conditions.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("is empty when nothing is running", () => {
    expect(prioritizedIncidents({ conditions: [], incidents: [] })).toEqual([]);
  });
});
