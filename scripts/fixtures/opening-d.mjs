// The oath as a Democrat: a quick oath with the running mate, the staff, the
// cabinet and the mandate the founding recommends. Also the one place the three
// party fixtures share their founding, so a Republican and an Independent are
// sealed the same way and differ only in who the President is.
import { sealFounding } from "../../packages/engine/dist/founding.js";
import { worldDataset } from "../../packages/world/dist/index.js";
import { cabinetSlate, charterFor, foundingOptions, openingChoices } from "../../packages/player-core/dist/index.js";
import { makeCampaignSeed } from "../../packages/engine/dist/rng.js";

export const name = "opening-d";

/** Seals the founding screen's quick oath for a President of the given party and politics. */
export function foundAs({ seedText, leaderName, party, ideology, homeState, presentation }) {
  const seed = makeCampaignSeed(seedText);
  const options = foundingOptions(seed);
  const opening = openingChoices(options);
  const leader = { ...opening.leader, name: leaderName, party, ideology, homeState, presentation };
  const nation = options.nations[0];
  const slate = cabinetSlate(options, charterFor(options, nation.identity.government), nation, leader);
  const cabinet = Object.fromEntries(Object.entries(slate).map(([role, list]) => [role, list[0].id]));
  return sealFounding(seed, worldDataset, { cabinet, leader });
}

export function build() {
  return foundAs({
    seedText: "fixture-opening-d",
    leaderName: "Fixture Democrat",
    party: "democrat",
    ideology: { economicLeftRight: -0.3, authLibertarian: -0.1, nationalistGlobalist: -0.2 },
    homeState: "PA",
    presentation: "feminine",
  });
}
