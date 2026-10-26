import { describe, expect, it } from "vitest";
import { matchParts } from "./match-parts";

describe("matchParts", () => {
  it("marks the first match and keeps the rest of the text", () => {
    expect(matchParts("Answer reporters", "port")).toEqual([
      { text: "Answer re", match: false },
      { text: "port", match: true },
      { text: "ers", match: false },
    ]);
  });

  it("ignores case and surrounding spaces in the query", () => {
    expect(matchParts("Budget", "  BUD ")).toEqual([
      { text: "Bud", match: true },
      { text: "get", match: false },
    ]);
  });

  it("returns the text whole when nothing matches or the query is empty", () => {
    expect(matchParts("Budget", "zz")).toEqual([{ text: "Budget", match: false }]);
    expect(matchParts("Budget", "")).toEqual([{ text: "Budget", match: false }]);
  });
});
