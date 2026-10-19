import { makeCampaignSeed, sealFounding } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { DEFAULT_SEED, foundingOptions, openingChoices } from "../campaign/founding-options";
/**
 * The campaign player-core's own tests exercise: a real seal of the real
 * dataset under a fixed seed, so nothing here is a hand-written stand-in for
 * game state.
 *
 * The arguments exist so the browser suite's fixture saves can be founded off
 * the same one path with their own seed and name. They are not a second way to
 * found a campaign — every caller still lands on `sealFounding` with
 * `openingChoices`, which is what the founding screen itself seals.
 */
export function openingCampaign({ seedText, leaderName } = {}) {
    const seed = seedText === undefined ? DEFAULT_SEED : makeCampaignSeed(seedText);
    const options = foundingOptions(seed);
    const choices = openingChoices(options);
    // The opening slate deliberately leaves the leader unnamed — a founding must
    // not seal on a name nobody chose. A fixture has to answer that one question
    // the way a player would before it can seal at all.
    return sealFounding(seed, worldDataset, {
        ...choices,
        leader: { ...choices.leader, name: leaderName ?? "Ilsabet Ferran" },
    });
}
