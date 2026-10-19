import { describe, expect, it } from "vitest";
import { departingFlag, flagMarker, TRANSITION_WEEKS, type Campaign } from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingCampaign } from "../__fixtures__/opening";
import { specFor, summonsReading } from "./registry";

const founding = openingCampaign();
const ENERGY = "role-energy-secretary" as RoleId;

/** The founding campaign with its Energy Secretary having announced a departure this week. */
function announcing(): Campaign {
  const secretary = founding.player.cabinet[ENERGY]!;
  const flag = departingFlag(ENERGY, secretary);
  return {
    ...founding,
    player: { ...founding.player, flags: { ...founding.player.flags, [flag]: true, [flagMarker(flag, founding.turn)]: true } },
  };
}

describe("an announced cabinet departure on the Desk", () => {
  it("is not on the Desk while nobody is leaving", () => {
    expect(specFor("departure-transition")?.due(founding)).toBeUndefined();
  });

  it("puts the week the Secretary goes on the Desk, named for the department", () => {
    const campaign = announcing();
    const due = specFor("departure-transition")?.due(campaign);
    expect(due?.dueTurn).toBe(founding.turn + TRANSITION_WEEKS);
    expect(due?.subject).toBe(`departure:${ENERGY}`);
    expect(due?.title).toMatch(/is leaving/);
    const reading = summonsReading(campaign, "departure-transition");
    expect(reading?.brief.clockLine).toMatch(/replacement/);
  });
});
