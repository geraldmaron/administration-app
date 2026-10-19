import { describe, expect, it } from "vitest";
import { US_BASING } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { BOARD_DEPLOYMENTS, openingBaseCommitments, selectBases } from "./basing.js";
import type { Campaign } from "./state.js";

const { campaign: sealed } = foundedForBalance("basing-board", "democrat", {}, { openingPreset: "world-2026" });

describe("US forces at their installations", () => {
  it("opens every seeded installation whose host is on the roster, positioned at its base", () => {
    const opened = openingBaseCommitments(sealed.nations, false);
    const installations = US_BASING.filter((row) => row.base !== "country total, all services" && sealed.nations[row.country as never]);
    expect(opened).toHaveLength(installations.length);
    for (const commitment of opened) {
      expect(commitment.kind).toBe("basing");
      expect(commitment.location?.base).toBeTruthy();
      expect(commitment.resource.amountPerTurn).toBe(0);
      expect(commitment.source).toEqual({ kind: "budgetLine", line: "defense" });
    }
  });

  it("adds the Gulf posture and the Red Sea deployment only where the board carries the Iran front, labeled planning", () => {
    expect(openingBaseCommitments(sealed.nations, false).some((commitment) => commitment.kind === "deployment")).toBe(false);
    const withGulf = openingBaseCommitments(sealed.nations, true).filter((commitment) => commitment.kind === "deployment");
    expect(withGulf).toHaveLength(BOARD_DEPLOYMENTS.length);
    for (const commitment of withGulf) expect(commitment.location?.theater).toBeTruthy();
  });

  it("reads the bases back from the sealed campaign with their bands and sources", () => {
    const bases = selectBases(sealed);
    expect(bases.length).toBeGreaterThan(0);
    for (const base of bases) {
      expect(base.personnelBand).not.toBe("");
      expect(base.source).not.toBe("");
      expect(base.country).not.toBe("USA");
    }
    const kadena = bases.find((base) => base.installation.startsWith("Kadena"));
    expect(kadena?.countryTotal).toBe("30,000 to 60,000");
    expect(bases.filter((base) => base.kind === "deployment").every((base) => base.provenance === "planning value")).toBe(true);
  });

  it("drops a base the week its commitment is wound down", () => {
    const bases = selectBases(sealed);
    const first = Object.values(sealed.commitments).find((commitment) => commitment.location?.base !== undefined)!;
    const closed: Campaign = { ...sealed, commitments: { ...sealed.commitments, [first.id]: { ...first, status: "wound-down" } } };
    expect(selectBases(closed)).toHaveLength(bases.length - 1);
  });

  it("names no installation for a person: every label is a place or a function", () => {
    for (const row of US_BASING) expect(row.base).not.toMatch(/named for/i);
  });
});
