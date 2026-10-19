import { foundFixture } from "./_campaign.mjs";

export const name = "collection-journey";

// A fresh administration lets the browser perform the first tasking and wait
// for its first real collection cycle without an unrelated inherited case.
export function build() {
  return foundFixture({ seedText: "collection-journey", leaderName: "Morgan Avery" });
}
