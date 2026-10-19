// The opening fixture twelve weeks on: enough history for the Record, the
// press and the polls to have something to show.
import { advanceWeeks } from "./_campaign.mjs";
import { build as opening } from "./opening.mjs";

export const name = "week-12";

export function build() {
  return advanceWeeks(opening(), 12);
}
