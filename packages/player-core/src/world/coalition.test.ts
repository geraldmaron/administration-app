import { describe, expect, it } from "vitest";
import { selectNation, selectRelationship } from "@admin/engine";
import type { NationId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { BACKING_TRUST } from "@admin/engine";
import { coalitionReading } from "./coalition";
import { forcePackageFor } from "./nation-forces";

const opening = openingCampaign({ seedText: "coalition" });
const actor = opening.founding.nation;

describe("who would back a move", () => {
  it("names only partners that share a compact with you, trust you and are not aligned with the target", () => {
    const target = "IRN" as NationId;
    const reading = coalitionReading(opening, target);
    const mine = new Set((selectNation(opening, actor)?.base.memberships ?? []).map(String));
    const theirs = new Set((selectNation(opening, target)?.base.memberships ?? []).map(String));
    expect(reading.backers.length).toBeGreaterThan(0);
    for (const backer of reading.backers) {
      const memberships = (selectNation(opening, backer.nation)?.base.memberships ?? []).map(String);
      expect(memberships.some((id) => mine.has(id))).toBe(true);
      expect(memberships.some((id) => theirs.has(id))).toBe(false);
      expect(backer.trust).toBeGreaterThanOrEqual(BACKING_TRUST);
      expect(selectRelationship(opening, backer.nation, target)?.trust ?? 0).toBeLessThan(0.4);
    }
  });

  it("ranks defense partners ahead of looser ties", () => {
    const kinds = coalitionReading(opening, "IRN" as NationId).backers.map((backer) => backer.compact.kind);
    const firstLoose = kinds.findIndex((kind) => kind !== "defense");
    if (firstLoose >= 0) expect(kinds.slice(firstLoose)).not.toContain("defense");
  });
});

describe("the force package against a named target", () => {
  it("says what it was sized against and proposes less than a peer would draw", () => {
    const weak = forcePackageFor(opening, 4, "CUB" as NationId);
    const peer = forcePackageFor(opening, 4, "CHN" as NationId);
    expect(weak?.sizing?.arm).toBe("air arm");
    expect(weak!.composed.spec.preferred).toBeLessThan(peer!.composed.spec.preferred);
  });
});
