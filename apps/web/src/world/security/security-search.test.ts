import { describe, expect, it } from "vitest";
import { securityActOf, securityHref, securitySearch, viewOf } from "./security-search";

describe("the security desk's address", () => {
  it("keeps a view other than the first and a named service", () => {
    expect(securitySearch({ view: "operations" })).toEqual({ view: "operations" });
    expect(securitySearch({ view: "theaters" })).toEqual({});
    expect(securitySearch({ view: "feed" })).toEqual({});
    expect(securitySearch({ service: "INST-NAVY" })).toEqual({ service: "INST-NAVY" });
    expect(securitySearch({ service: "" })).toEqual({});
  });

  it("opens the forces view on a service link that names no view", () => {
    expect(viewOf(securitySearch({ service: "INST-ARMY" }))).toBe("forces");
    expect(viewOf(securitySearch({}))).toBe("theaters");
    expect(viewOf(securitySearch({ view: "intelligence", service: "INST-ARMY" }))).toBe("intelligence");
  });

  it("keeps only a complete known action and its exact subject alongside the context", () => {
    const search = securitySearch({ view: "intelligence", action: "share-report", subject: "report:IC-NGA:ARG:12" });
    expect(securityActOf(search)).toEqual({ kind: "share-report", id: "report:IC-NGA:ARG:12" });
    expect(search.view).toBe("intelligence");
    expect(securitySearch({ action: "share-report" })).toEqual({});
    expect(securitySearch({ action: "task", subject: "irrelevant" })).toEqual({ action: "task" });
    expect(securitySearch({ action: "invented", subject: "id" })).toEqual({});
    expect(securitySearch({ action: "press", subject: "x".repeat(201) })).toEqual({});
    expect(securitySearch({ action: "press", subject: "bad\nidentifier" })).toEqual({});
  });

  it("builds the address of each view, the first being the bare address", () => {
    expect(securityHref("theaters")).toBe("/world/security");
    expect(securityHref("operations")).toBe("/world/security?view=operations");
  });
});
