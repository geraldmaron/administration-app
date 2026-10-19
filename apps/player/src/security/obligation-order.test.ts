import { describe, expect, it } from "vitest";
import type { WarPowersRow } from "@admin/player-core";
import { byUrgency, isOverdue } from "./obligation-order";

const row = (id: string, left: number | undefined, extra: Partial<WarPowersRow> = {}): WarPowersRow => ({
  id,
  target: id.toUpperCase(),
  description: "",
  reported: true,
  missed: false,
  href: "/",
  ...(left === undefined ? {} : { clock: { left, window: 60 } }),
  ...extra,
});

describe("War Powers obligations", () => {
  it("counts a missed report and a window that ran out as overdue", () => {
    expect(isOverdue(row("a", 10, { missed: true }))).toBe(true);
    expect(isOverdue(row("b", -2))).toBe(true);
    expect(isOverdue(row("c", 0))).toBe(false);
    expect(isOverdue(row("d", undefined))).toBe(false);
  });

  it("puts overdue first, then the fewest days left, then rows that run no clock", () => {
    const ordered = byUrgency([row("none", undefined), row("late", 40), row("soon", 5), row("out", -1), row("missed", 50, { missed: true })]);
    expect(ordered.map((entry) => entry.id)).toEqual(["missed", "out", "soon", "late", "none"]);
  });

  it("does not reorder the rows it was given", () => {
    const input = [row("b", 30), row("a", 3)];
    byUrgency(input);
    expect(input.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});
