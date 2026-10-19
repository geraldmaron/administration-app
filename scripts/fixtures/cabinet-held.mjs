// Sealed under its own seed, so the state this fixture stands for (a cabinet whose chairs are held)
// is built on an oath no other fixture shares, and building it moves no other spec.
import { foundFixture } from "./_campaign.mjs";

export const name = "cabinet-held";

export function build() {
  return foundFixture({ seedText: "fixture-cabinet-held", leaderName: "Fixture President" });
}
