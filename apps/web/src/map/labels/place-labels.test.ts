import { describe, expect, it } from "vitest";
import { placeLabels, textWidth, type LabelCandidate } from "./place-labels";

const viewport = { x0: 0, y0: 0, x1: 800, y1: 500 };

function candidate(over: Partial<LabelCandidate> & { key: string }): LabelCandidate {
  return { x: 400, y: 250, width: 400, height: 200, texts: ["Pennsylvania", "PA"], priority: 1, callout: false, tier: "state", ...over };
}

describe("placeLabels", () => {
  it("writes the full name where the shape has room for it", () => {
    const [label] = placeLabels([candidate({ key: "PA" })], { viewport, max: 10, reserved: [] });
    expect(label?.text).toBe("Pennsylvania");
  });

  it("falls back to the recognized abbreviation where only that fits", () => {
    const width = textWidth("PA", "state") * 2;
    const [label] = placeLabels([candidate({ key: "PA", width })], { viewport, max: 10, reserved: [] });
    expect(label?.text).toBe("PA");
  });

  it("drops a name its shape cannot hold, unless the shape takes a callout", () => {
    const tiny = { width: 4, height: 4 };
    expect(placeLabels([candidate({ key: "RI", ...tiny, texts: ["Rhode Island", "RI"] })], { viewport, max: 10, reserved: [] })).toEqual([]);
    const [label] = placeLabels([candidate({ key: "RI", ...tiny, texts: ["Rhode Island", "RI"], callout: true })], { viewport, max: 10, reserved: [] });
    expect(label?.text).toBe("RI");
    expect(label?.leader).toEqual({ x: 400, y: 250 });
    expect(label!.x).toBeGreaterThan(400);
  });

  it("never lets two names touch: the higher priority keeps its place", () => {
    const placed = placeLabels([candidate({ key: "low", priority: 1 }), candidate({ key: "high", priority: 5, y: 252 })], { viewport, max: 10, reserved: [] });
    expect(placed.map((label) => label.key)).toEqual(["high"]);
  });

  it("keeps clear of the pins", () => {
    const reserved = [{ x0: 380, y0: 240, x1: 420, y1: 260 }];
    expect(placeLabels([candidate({ key: "PA" })], { viewport, max: 10, reserved })).toEqual([]);
  });

  it("stops at the budget and stays inside the view", () => {
    const many = Array.from({ length: 5 }, (_, i) => candidate({ key: `k${i}`, x: 100 + i * 150, texts: ["AB"], priority: i }));
    expect(placeLabels(many, { viewport, max: 2, reserved: [] })).toHaveLength(2);
    expect(placeLabels([candidate({ key: "edge", x: 2 })], { viewport, max: 10, reserved: [] })).toEqual([]);
  });
});
