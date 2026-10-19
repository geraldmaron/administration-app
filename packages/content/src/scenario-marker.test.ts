import { describe, it, expect } from "vitest";
import { flagMarker } from "@admin/engine";
import { flagSetFlag } from "./scenario-deed-flags.js";

// `flagSetFlag` delegates to the engine's `flagMarker` rather than open-coding
// the `flagset:<flag>:<turn>` template, because a second copy of the template
// can drift from the key the engine's resolver actually stamps and nothing
// would force the two to agree. This test is the trip wire for an edit that
// reintroduces the literal here.
describe("flagSetFlag delegates to the engine's flagMarker", () => {
  const cases: ReadonlyArray<readonly [string, number]> = [
    ["cleared-the-square", 0],
    ["guaranteed-the-deposits", 1],
    ["founding-complete", 12],
    ["flag:with:colons", 7],
    ["", 999],
  ];

  it.each(cases)("matches for flag=%s turn=%i", (flag, turn) => {
    expect(flagSetFlag(flag, turn)).toBe(flagMarker(flag, turn));
  });
});
