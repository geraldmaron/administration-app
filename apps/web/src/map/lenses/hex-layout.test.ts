import { describe, expect, it } from "vitest";
import { regionTable } from "../__fixtures__/map-fixtures";
import { districtHexes } from "../HexHouse";
import { hexLayout, ring } from "./hex-layout";

const layout = districtHexes(regionTable());

describe("the House hex layout", () => {
  it("gives every district its own hex", () => {
    expect(layout.cells.length).toBeGreaterThan(430);
    expect(new Set(layout.cells.map((c) => `${c.q},${c.r}`)).size).toBe(layout.cells.length);
    expect(new Set(layout.cells.map((c) => c.id)).size).toBe(layout.cells.length);
  });

  it("keeps each state one connected block", () => {
    const byState = new Map<string, Set<string>>();
    for (const cell of layout.cells) byState.set(cell.state, (byState.get(cell.state) ?? new Set()).add(`${cell.q},${cell.r}`));
    for (const [, cells] of byState) {
      const [start] = cells;
      const seen = new Set([start!]);
      const queue = [start!];
      while (queue.length > 0) {
        const [q, r] = queue.pop()!.split(",").map(Number);
        for (const [nq, nr] of ring(q!, r!, 1)) {
          const key = `${nq},${nr}`;
          if (cells.has(key) && !seen.has(key)) {
            seen.add(key);
            queue.push(key);
          }
        }
      }
      expect(seen.size).toBe(cells.size);
    }
  });

  it("keeps geography: California west of New York, Florida south of Michigan", () => {
    const meanX = (state: string) => avg(layout.cells.filter((c) => c.state === state).map((c) => c.x));
    const meanY = (state: string) => avg(layout.cells.filter((c) => c.state === state).map((c) => c.y));
    expect(meanX("CA")).toBeLessThan(meanX("NY"));
    expect(meanY("FL")).toBeGreaterThan(meanY("MI"));
  });

  it("is deterministic", () => {
    const seats = [
      { id: "A-01", state: "A", lon: -100, lat: 40 },
      { id: "A-02", state: "A", lon: -100.1, lat: 40 },
      { id: "B-01", state: "B", lon: -90, lat: 35 },
    ];
    expect(hexLayout(seats)).toEqual(hexLayout([...seats].reverse()));
  });

  it("walks a ring of 6k cells at distance k", () => {
    expect(ring(0, 0, 0)).toEqual([[0, 0]]);
    expect(ring(0, 0, 1)).toHaveLength(6);
    expect(ring(3, -2, 2)).toHaveLength(12);
  });
});

function avg(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
