/**
 * A story names two desks and a reporter who is not a real person.
 */
import { describe, expect, it } from "vitest";
import { carriesLeaderSurname, carriesRealName } from "@admin/world";
import { composeArticle } from "./article.js";
import { REPORTERS_PER_DESK, deskStaff, reporterRoster } from "./article-bylines.js";
import { PRESS_OUTLETS } from "./press-outlets.js";
import type { FeedItem } from "./state.js";

const item = (over: Partial<FeedItem> = {}): FeedItem => ({
  turn: 4,
  kind: "press",
  visibility: "public",
  headline: "The shipment was turned back at the border.",
  ...over,
});

describe("bylines", () => {
  it.each(["press-corps", "seed-a", "seed-b"])("uses no real officeholder and no American leader's surname (%s)", (seed) => {
    for (const name of reporterRoster(seed)) {
      expect(carriesRealName(name), name).toBe(false);
      const surname = name.split(" ").at(-1)!;
      expect(carriesLeaderSurname("USA", surname), name).toBe(false);
    }
  });

  it("staffs every desk with three reporters, no two alike, the same for the same seed", () => {
    const staff = deskStaff("seed-a");
    for (const outlet of PRESS_OUTLETS) expect(staff[outlet.id]).toHaveLength(REPORTERS_PER_DESK);
    const names = reporterRoster("seed-a");
    expect(new Set(names).size).toBe(names.length);
    expect(deskStaff("seed-a")).toEqual(staff);
    expect(reporterRoster("seed-b")).not.toEqual(names);
  });

  it("files one story at two desks, and rereads the same reporters", () => {
    const first = composeArticle(item({ facts: { dateline: "Geneva" } }));
    const again = composeArticle(item({ facts: { dateline: "Geneva" } }));
    expect(first.also).toBeDefined();
    expect(first.also!.outletId).not.toBe(first.outletId);
    expect(first.byline).not.toBe(first.also!.byline);
    expect(again).toEqual(first);
    expect(first.byline).toMatch(/Filed from Geneva, week 4\.$/);
    expect(first.also!.byline).toMatch(/Filed from Geneva, week 4\.$/);
  });

  it("does not give an intelligence note a reporter or a second desk", () => {
    const article = composeArticle(item({ visibility: "intelligence" }));
    expect(article.also).toBeUndefined();
    expect(article.byline.startsWith("Circulated")).toBe(true);
    expect(article.byline).not.toMatch(/[A-Z][a-z]+ [A-Z][a-z]+\./);
  });
});
