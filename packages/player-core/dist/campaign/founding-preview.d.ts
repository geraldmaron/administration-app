import { type Campaign, type CampaignSeed, type FoundingChoices, type FoundingRejection } from "@admin/engine";
export type FoundingPreview = {
    readonly ok: true;
    readonly campaign: Campaign;
} | {
    readonly ok: false;
    readonly rejections: readonly FoundingRejection[];
};
/**
 * The campaign the oath would seal right now, or the reasons it would not.
 *
 * It is the seal itself rather than an estimate of it, which is the only way
 * a preview can promise to equal what the player gets: a second derivation of
 * the opening position is a second answer that can drift from the first.
 */
export declare function previewFounding(seed: CampaignSeed, choices: FoundingChoices): FoundingPreview;
