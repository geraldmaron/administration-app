import { advanceWeeks } from "./_campaign.mjs";
import { build as challenged, contestedOn } from "./court-challenge.mjs";

export const name = "court-procedure";

/** An actual final judgment and a newly filed challenge, both issued by the engine. */
export function build() {
  let campaign = challenged();
  for (let week = 0; week < 24 && campaign.judiciary.cases.length === 0; week += 1) {
    campaign = advanceWeeks(campaign, 1);
  }
  if (campaign.judiciary.cases.length === 0) throw new Error("No final court disposition within the fixture window");
  for (let week = 0; week < 12; week += 1) {
    const next = contestedOn(campaign);
    if (next) return next;
    campaign = advanceWeeks(campaign, 1);
  }
  throw new Error("No subsequent challenge within the fixture window");
}
