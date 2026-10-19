import { describe, expect, it } from "vitest";
import { commandSearch } from "./command-search";

describe("command action addresses", () => {
  it("restores a known action and drops unknown actions", () => {
    for (const action of ["posture", "relieve", "reassign", "amend"]) expect(commandSearch({ action })).toEqual({ action });
    expect(commandSearch({ action: "invented" })).toEqual({});
    expect(commandSearch({ action: ["posture"] })).toEqual({});
    expect(commandSearch({})).toEqual({});
  });
});
