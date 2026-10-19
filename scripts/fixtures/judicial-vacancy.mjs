import { JUDICIARY_SEAT_INSTITUTIONS } from "../../packages/engine/dist/judiciary.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "judicial-vacancy";

/** An ordinary founding advanced through the full weekly engine until a justice leaves. */
export function build() {
  let campaign = foundFixture({ seedText: "court-vacancy-29", leaderName: "Avery Bell" });
  for (let week = 0; week < 208; week += 1) {
    if (JUDICIARY_SEAT_INSTITUTIONS.some((id) => campaign.institutions[id]?.vacancy)) return campaign;
    campaign = advanceWeeks(campaign, 1);
  }
  throw new Error("No ordinary judicial vacancy within four campaign years on this seed");
}
