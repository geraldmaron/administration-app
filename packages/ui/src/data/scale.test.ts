import { describe, expect, it } from "vitest";
import { fitXLabels, nearestMarks, stackLabels, tickLabelRows } from "./scale";

describe("fitXLabels", () => {
  it("keeps the last and first label and drops the ones that would touch", () => {
    const widths = Array.from({ length: 8 }, () => 80);
    const positions = Array.from({ length: 8 }, (_, i) => 40 + i * 40);
    const kept = fitXLabels(widths, positions, 0, 360);
    const indexes = kept.map((k) => k.index);
    expect(indexes).toContain(0);
    expect(indexes).toContain(7);
    for (let i = 1; i < kept.length; i++) expect(kept[i]!.x - kept[i - 1]!.x).toBeGreaterThanOrEqual(80);
  });

  it("shifts an edge label inside the bounds", () => {
    const [only] = fitXLabels([100], [10], 0, 300);
    expect(only!.x - 50).toBeGreaterThanOrEqual(0);
  });
});

describe("stackLabels", () => {
  it("parts labels whose lines sit a few pixels apart and keeps each near its line", () => {
    // Approval landmarks at 55% and 58% and the President at 61% on a 200px plot: 6px apart.
    const slots = [
      { id: "ceiling", y: 102, height: 14 },
      { id: "honeymoon", y: 96, height: 14 },
      { id: "self", y: 90, height: 14 },
    ];
    const placed = stackLabels(slots, 2, 12, 212)!;
    const ys = slots.map((slot) => placed.get(slot.id)!).sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(16);
    expect(Math.abs(placed.get("honeymoon")! - 96)).toBeLessThanOrEqual(16);
  });

  it("pushes a crowd at the floor back up instead of past it", () => {
    const placed = stackLabels([0, 1, 2].map((i) => ({ id: String(i), y: 200, height: 14 })), 2, 0, 200)!;
    expect(Math.max(...placed.values()) + 7).toBeLessThanOrEqual(200);
    expect(Math.min(...placed.values()) - 7).toBeGreaterThanOrEqual(0);
  });

  it("refuses a column too short to hold every label", () => {
    expect(stackLabels([0, 1, 2, 3].map((i) => ({ id: String(i), y: 20, height: 14 })), 2, 0, 50)).toBeUndefined();
  });
});

describe("tickLabelRows", () => {
  it("drops a name that would touch its neighbor to the next row and keeps every name inside the track", () => {
    const placed = tickLabelRows(
      [
        { id: "a", at: 0.55, width: 120 },
        { id: "b", at: 0.58, width: 120 },
        { id: "c", at: 0.98, width: 80 },
      ],
      300,
    );
    const byId = new Map(placed!.map((tick) => [tick.id, tick]));
    expect(byId.get("a")!.row).not.toBe(byId.get("b")!.row);
    for (const tick of placed!) expect(tick.left).toBeGreaterThanOrEqual(0);
    expect(byId.get("c")!.side).toBe("end");
    expect(byId.get("c")!.left + 80).toBeLessThanOrEqual(300);
  });

  it("refuses a name that fits on neither side of its tick", () => {
    expect(tickLabelRows([{ id: "peak", at: 0.5, width: 125 }], 200)).toBeUndefined();
  });
});

describe("nearestMarks", () => {
  const marks = [
    { id: "truman", at: 0.22, kind: "historical" },
    { id: "nixon", at: 0.24, kind: "historical" },
    { id: "ceiling", at: 0.55, kind: "historical" },
    { id: "honeymoon", at: 0.58, kind: "historical" },
    { id: "peak", at: 0.9, kind: "historical" },
  ];

  it("keeps the two marks the reading sits between", () => {
    expect(nearestMarks(marks, 0.61).map((mark) => mark.id)).toEqual(["honeymoon", "peak"]);
  });

  it("always keeps a gate", () => {
    const kept = nearestMarks([...marks, { id: "collapse", at: 0.25, kind: "gate" }], 0.61);
    expect(kept.map((mark) => mark.id)).toEqual(["honeymoon", "peak", "collapse"]);
  });
});
