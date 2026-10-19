import { describe, expect, it } from "vitest";
import { hasRoute, patternTest } from "./built-routes";

const patterns = ["/", "/brief", "/brief/", "/brief/decision/$id", "/record/event/$id", "/washington"].map(patternTest);

describe("whether a door has a screen in this build", () => {
  it("matches a pattern's own path and its parameters, encoded or not", () => {
    expect(hasRoute("/brief", patterns)).toBe(true);
    expect(hasRoute("/brief/decision/the-port", patterns)).toBe(true);
    expect(hasRoute("/record/event/case%3Abill%3A1", patterns)).toBe(true);
    expect(hasRoute("/washington?office=x", patterns)).toBe(true);
  });

  it("refuses a screen a later build adds, and a deeper path than any pattern", () => {
    expect(hasRoute("/washington/congress", patterns)).toBe(false);
    expect(hasRoute("/brief/decision/a/b", patterns)).toBe(false);
    expect(hasRoute("/nation/state/OH", patterns)).toBe(false);
  });
});
