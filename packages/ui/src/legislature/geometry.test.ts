import { describe, expect, it } from "vitest";
import { benchSeats, hemicycleSeats, majoritySpoke, ridgeShapes, ridgeX, seatRadius } from "./geometry";

describe("hemicycleSeats", () => {
  it("places every seat of a chamber, left to right", () => {
    for (const total of [9, 100, 435]) {
      const seats = hemicycleSeats(total);
      expect(seats).toHaveLength(total);
      const angles = seats.map((seat) => seat.angle);
      expect(angles).toEqual([...angles].sort((a, b) => b - a));
    }
  });

  it("keeps every seat inside the drawing box", () => {
    for (const seat of hemicycleSeats(435)) {
      expect(seat.x).toBeGreaterThanOrEqual(0);
      expect(seat.x).toBeLessThanOrEqual(100);
      expect(seat.y).toBeGreaterThanOrEqual(0);
      expect(seat.y).toBeLessThanOrEqual(54);
    }
  });

  it("draws nothing for an empty chamber", () => {
    expect(hemicycleSeats(0)).toEqual([]);
  });
});

describe("majoritySpoke", () => {
  it("falls between the majority seat and the next", () => {
    const seats = hemicycleSeats(100);
    expect(majoritySpoke(seats, 51)).toBeDefined();
    expect(majoritySpoke(seats, undefined)).toBeUndefined();
    expect(majoritySpoke(seats, 100)).toBeUndefined();
  });
});

describe("seatRadius and benchSeats", () => {
  it("shrinks marks as the chamber grows", () => {
    expect(seatRadius(435)).toBeLessThan(seatRadius(100));
  });

  it("spreads the bench across the arc from the left", () => {
    const seats = benchSeats(9);
    expect(seats).toHaveLength(9);
    expect(seats[0]!.x).toBeLessThan(seats[8]!.x);
  });
});

describe("ridgeShapes", () => {
  it("draws one ridge per group with members, with its median", () => {
    const shapes = ridgeShapes([{ id: "a", positions: [-0.5, -0.4, -0.3] }, { id: "b", positions: [] }]);
    expect(shapes.map((shape) => shape.id)).toEqual(["a"]);
    expect(shapes[0]!.median).toBe(-0.4);
    expect(shapes[0]!.path.startsWith("M0,150")).toBe(true);
  });

  it("maps the scale's ends to the box's edges", () => {
    expect(ridgeX(-1)).toBe(0);
    expect(ridgeX(1)).toBe(1000);
  });
});
