import { describe, expect, it } from "vitest";
import { PLACES } from "../navigation/places.js";
import { EXPLAINERS, explainer, glossaryEntry } from "./index.js";
import { chapterForExplainer, HANDBOOK } from "./handbook.js";

describe("the Handbook", () => {
  it("teaches every explainer in exactly one chapter", () => {
    const placed = HANDBOOK.flatMap((chapter) => chapter.explainers);
    expect(new Set(placed).size).toBe(placed.length);
    expect([...placed].sort()).toEqual(EXPLAINERS.map((entry) => entry.id).sort());
  });

  it("points only at explainers, terms and screens that exist", () => {
    const missing = HANDBOOK.flatMap((chapter) => [
      ...chapter.explainers.filter((id) => explainer(id) === undefined),
      ...(chapter.terms ?? []).filter((id) => glossaryEntry(id) === undefined),
      ...chapter.places.filter((key) => PLACES[key] === undefined),
    ]);
    expect(missing).toEqual([]);
  });

  it("gives each chapter a unique id and finds the chapter for an explainer", () => {
    const ids = HANDBOOK.map((chapter) => chapter.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(chapterForExplainer("bill-to-law")?.id).toBe("congress");
  });
});
