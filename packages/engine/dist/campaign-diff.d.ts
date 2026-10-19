import type { Campaign } from "./state-campaign.js";
export type CampaignDiffEntry = {
    readonly path: string;
    readonly before: unknown;
    readonly after: unknown;
};
export declare function diffCampaign(before: Campaign, after: Campaign): readonly CampaignDiffEntry[];
