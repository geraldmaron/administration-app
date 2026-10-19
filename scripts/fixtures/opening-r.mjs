// The oath as a Republican, sealed the way the Democrat's is.
import { foundAs } from "./opening-d.mjs";

export const name = "opening-r";

export function build() {
  return foundAs({
    seedText: "fixture-opening-r",
    leaderName: "Fixture Republican",
    party: "republican",
    ideology: { economicLeftRight: 0.35, authLibertarian: 0.2, nationalistGlobalist: 0.3 },
    homeState: "TX",
    presentation: "masculine",
  });
}
