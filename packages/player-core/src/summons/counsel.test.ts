import { describe, expect, it } from "vitest";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import type { Campaign } from "@admin/engine";
import { counselFor } from "./compose";
import { placeCounsel } from "./counsel";

const opening = openingCampaign();

function withoutChair(campaign: Campaign, role: string): Campaign {
  const cabinet = Object.fromEntries(Object.entries(campaign.player.cabinet).filter(([key]) => key !== role));
  return { ...campaign, player: { ...campaign.player, cabinet } };
}

describe("a place's counsel", () => {
  it("is composed from the campaign: two states, two readings of the same place", () => {
    const lowCorps = { ...opening, press: { ...opening.press, standing: 0.1 } };
    expect(counselFor(lowCorps, "pressOffice")).not.toBe(counselFor(opening, "pressOffice"));

    const role = "role-labor-secretary";
    expect(opening.player.cabinet[role as RoleId]).toBeDefined();
    const vacated = withoutChair(opening, role);
    expect(counselFor(vacated, "washington")).not.toBe(counselFor(opening, "washington"));
    expect(placeCounsel(vacated, "washington").next?.href).toMatch(/^\/washington\/office\//);
  });

  it("says plainly when a place has no counsel of its own", () => {
    expect(placeCounsel(opening, "settings")).toEqual({ lines: ["Settings doesn't have a summary."], quiet: true });
  });
});
