// Sealed under its own seed, so the state this fixture stands for (thirty weeks of the economy)
// is built on an oath no other fixture shares, and building it moves no other spec. Thirty
// unforced weeks is what F12 asks for: the room's price reading and the approval driver read
// off the same tree, with nothing in it written directly onto a nation stat.
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "week-30";

export function build() {
  return advanceWeeks(foundFixture({ seedText: "fixture-week-30", leaderName: "Fixture President" }), 30);
}
