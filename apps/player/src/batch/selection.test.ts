import { describe, expect, it } from "vitest";
import { EMPTY_SELECTION, choose, selectAll, selectOnly, toggle } from "./selection";

describe("the selection model", () => {
  it("replaces on a plain press and clears when the only member is pressed again", () => {
    const one = choose(EMPTY_SELECTION, "CA", false);
    expect(one).toEqual({ members: ["CA"], focus: "CA" });
    expect(choose(one, "TX", false)).toEqual(selectOnly("TX"));
    expect(choose(one, "CA", false)).toEqual(EMPTY_SELECTION);
  });

  it("adds and takes out on an additive press, keeping the order and moving focus", () => {
    const two = choose(choose(EMPTY_SELECTION, "CA", false), "TX", true);
    expect(two).toEqual({ members: ["CA", "TX"], focus: "TX" });
    expect(toggle(two, "TX")).toEqual({ members: ["CA"], focus: "CA" });
    expect(toggle(two, "CA")).toEqual({ members: ["TX"], focus: "TX" });
  });

  it("selects all without repeating anyone already chosen", () => {
    expect(selectAll(selectOnly("TX"), ["CA", "TX", "LA"])).toEqual({ members: ["TX", "CA", "LA"], focus: "TX" });
  });
});
