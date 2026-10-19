import { type Campaign } from "@admin/engine";
export type OpeningCampaignOptions = {
    /** Seed text to found under. Omitted, the fixed fixture seed stands. */
    readonly seedText?: string;
    /** The name on the oath. Omitted, the fixture's own name stands. */
    readonly leaderName?: string;
};
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
export declare function openingCampaign({ seedText, leaderName }?: OpeningCampaignOptions): Campaign;
