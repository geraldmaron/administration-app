import { describe, expect, it } from "vitest";
import { MAX_CARDS, placeCards, type CardRequest } from "./placement";

const area = { x0: 0, y0: 0, x1: 1000, y1: 700 };
const card = (key: string, ax: number, ay: number, priority = 0): CardRequest => ({ key, ax, ay, width: 200, height: 80, priority });

describe("map card placement", () => {
  it("sets a card up and to the right of its anchor, with the leader meeting its nearest corner", () => {
    const [placed] = placeCards([card("a", 400, 400)], area);
    expect(placed?.at).toEqual([416, 304]);
    expect(placed?.joint).toEqual([416, 384]);
  });

  it("turns to another corner at the edge of the visible map", () => {
    const [placed] = placeCards([card("a", 950, 50)], area);
    expect(placed?.at).toEqual([950 - 200 - 16, 66]);
  });

  it("keeps two cards and their pins apart", () => {
    const placed = placeCards([card("a", 400, 400), card("b", 420, 410)], area);
    const [a, b] = placed.map((p) => p.at);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const ra = { x0: a![0], y0: a![1], x1: a![0] + 200, y1: a![1] + 80 };
    const rb = { x0: b![0], y0: b![1], x1: b![0] + 200, y1: b![1] + 80 };
    expect(ra.x0 < rb.x1 && rb.x0 < ra.x1 && ra.y0 < rb.y1 && rb.y0 < ra.y1).toBe(false);
  });

  it("holds back cards past the cap and cards whose place is out of view, by priority", () => {
    const requests = [card("far", 1200, 300, 0), ...[0, 1, 2, 3].map((i) => card(`c${i}`, 150 + i * 230, 350, i + 1))];
    const placed = placeCards(requests, area);
    expect(placed.find((p) => p.key === "far")?.at).toBeNull();
    expect(placed.filter((p) => p.at !== null)).toHaveLength(MAX_CARDS);
    expect(placed.find((p) => p.key === "c3")?.at).toBeNull();
  });
});
