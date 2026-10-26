import { type AppropriationProjection, type Campaign, type EffectPacket, type TariffStatute } from "@admin/engine";
import type { CampaignStamp, DraftAuthority, DraftPreview, DraftSpec } from "./types";
/** The registry record each tariff statute rests on. */
export declare const TARIFF_STATUTE_AUTHORITY: Readonly<Record<TariffStatute, string>>;
export type PricedDraft = {
    readonly ok: true;
    readonly authority: DraftAuthority;
    readonly preview: DraftPreview;
    readonly build: () => EffectPacket | readonly EffectPacket[];
} | {
    readonly ok: false;
    readonly reason: string;
};
/** The campaign's fingerprint: its seed, turn, date and how many acts its ledger holds. */
export declare function campaignStamp(campaign: Campaign): CampaignStamp;
export declare function sameStamp(a: CampaignStamp, b: CampaignStamp): boolean;
/** The draft's key: one budget per administration, one tariff order per government. */
export declare function draftSubject(spec: DraftSpec): string;
/** What the floor would do with a drafted book, in one line. */
export declare function budgetFloorWords(floor: AppropriationProjection): string;
/** Prices a draft on one campaign: what it would do there, and the packets that do it. */
export declare function priceDraft(campaign: Campaign, spec: DraftSpec): PricedDraft;
