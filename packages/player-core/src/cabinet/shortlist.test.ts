import { describe, expect, it } from "vitest";
import { apply, dismissMinister, type Campaign } from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening.js";
import { actingShortlist } from "./shortlist.js";

const DEFENSE = "role-defense-minister" as RoleId;

function emptied(campaign: Campaign, role: RoleId): Campaign {
  const dismissal = dismissMinister(campaign, role);
  if (!dismissal.ok) throw new Error(dismissal.reason);
  return apply(campaign, dismissal.packet);
}

describe("the acting shortlist", () => {
  it("offers names who could sign for an empty chair tomorrow, each with how long they may serve", () => {
    const campaign = emptied(openingCampaign({ seedText: "w6-acting" }), DEFENSE);
    const shortlist = actingShortlist(campaign, DEFENSE, DEFENSE, 210);
    expect(shortlist.mode).toBe("acting");
    expect(shortlist.options.length).toBeGreaterThan(0);
    expect(shortlist.waiting).toMatch(/weakest work/);
    const follows = shortlist.rows.find((row) => row.id === "follows")!.cells[0]!;
    expect(follows.kind === "lines" && follows.lines.join(" ")).toMatch(/210 days/);
  });

  it("has nobody to offer for a chair still held", () => {
    const campaign = openingCampaign({ seedText: "w6-acting-held" });
    expect(actingShortlist(campaign, DEFENSE, DEFENSE, 210).options).toHaveLength(0);
  });
});
