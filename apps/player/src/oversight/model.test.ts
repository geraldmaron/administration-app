import { describe, expect, it } from "vitest";
import type { Campaign } from "@admin/engine";
import { authorityByCite, type DirectiveTarget } from "@admin/player-core";
import { LAW, directiveSubjects, movedWords, oversightView } from "./model";

describe("oversight model", () => {
  it("cites only authorities the registry holds", () => {
    for (const cite of Object.values(LAW)) expect(authorityByCite(cite), cite).toBeDefined();
  });

  it("falls back to inquiries for an unknown view", () => {
    expect(oversightView("appointments")).toBe("appointments");
    expect(oversightView("x")).toBe("inquiries");
  });

  it("offers the predefined requests for a monetary directive", () => {
    const target: DirectiveTarget = { institution: "INST-FED", name: "The Federal Reserve", kinds: ["monetary"], refusals: 0 };
    expect(directiveSubjects({} as Campaign, target, "monetary").map((entry) => entry.value)).toContain("Request a lower policy rate");
  });

  it("says a moved reading as before and after", () => {
    expect(movedWords(0.2, 0.35)).toBe("20% to 35%");
    expect(movedWords(0.2, 0.2)).toBe("20%");
  });
});
