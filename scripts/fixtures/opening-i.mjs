// The oath as an Independent, who anchors on the caucus nearest their economics.
import { foundAs } from "./opening-d.mjs";

export const name = "opening-i";

export function build() {
  return foundAs({
    seedText: "fixture-opening-i",
    leaderName: "Fixture Independent",
    party: "independent",
    ideology: { economicLeftRight: 0.05, authLibertarian: -0.3, nationalistGlobalist: 0.1 },
    homeState: "ME",
    presentation: "feminine",
  });
}
