import { makeCampaignSeed, sealFounding, type Campaign } from "@admin/engine";
import { foundingOptions, openingChoices } from "@admin/player-core";
import { worldDataset } from "@admin/world";

let sealed: Campaign | undefined;

/** A sealed opening campaign on the real dataset, the founding screen's own path, sealed once per test file. */
export function opening(): Campaign {
  if (sealed) return sealed;
  const seed = makeCampaignSeed("executive-tests");
  const choices = openingChoices(foundingOptions(seed));
  sealed = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Test President" } });
  return sealed;
}
