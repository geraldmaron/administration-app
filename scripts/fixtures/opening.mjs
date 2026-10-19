// The oath and nothing after it: the campaign a new player first sees.
import { foundFixture } from "./_campaign.mjs";

export const name = "opening";

export function build() {
  return foundFixture({ seedText: "fixture-opening", leaderName: "Fixture President" });
}
