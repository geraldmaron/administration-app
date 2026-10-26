import type { Campaign, EffectPacket } from "@admin/engine";
import { type ActReceipt, type CampaignStore } from "../campaign/store";
import { type CampaignStamp, type Draft, type DraftAuthority, type DraftPreview, type DraftSpec } from "./types";
/**
 * Written beside the draft before its act is committed, and kept if the
 * device then refuses the save. `from` is the campaign the act was signed on.
 * Campaign saves are whole and in order, so a campaign read back further along
 * than `from` holds the act, and one read back at `from` lost it: the draft is
 * then pending again, never signed twice.
 */
export type SigningMark = {
    readonly from: CampaignStamp;
    readonly eventIds?: readonly string[];
    readonly saveError?: string;
};
export type DraftEntry = Draft & {
    readonly signing?: SigningMark;
};
export type DraftState = {
    readonly drafts: readonly DraftEntry[];
    /** Set when the device refused to keep the drafts themselves; they stand in this session. */
    readonly saveError?: string;
};
export type PutOutcome = {
    readonly ok: true;
    readonly draft: Draft;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * A draft priced again on the campaign in play and frozen for its sign-off:
 * the terms shown, the packets that carry them out, and the campaign they were
 * priced on. Signing commits exactly these, so what is signed is what was read.
 */
export type OpenReview = {
    readonly ok: true;
    readonly draft: Draft;
    readonly stale: boolean;
    readonly basis: Campaign;
    readonly prepared: EffectPacket | readonly EffectPacket[];
};
export type DraftReview = OpenReview | {
    readonly ok: false;
    readonly reason: string;
};
export type DraftStore = {
    getState(): DraftState;
    subscribe(listener: () => void): () => void;
    /** Writes or revises the draft for the spec's subject, priced on the campaign in play. */
    put(spec: DraftSpec): Promise<PutOutcome>;
    discard(subject: string): Promise<void>;
    /** Prices a draft on the campaign in play for its sign-off; an act the engine refuses is said here, before any review opens. */
    review(subject: string): DraftReview;
    /** Signs the reviewed draft. Rejects, applying nothing, when the draft was revised or the campaign moved since the review. */
    sign(review: OpenReview): Promise<ActReceipt>;
    /** Writes the campaign again for a draft signed while the device refused to save; applies nothing. */
    retrySave(subject: string): Promise<ActReceipt>;
};
export declare const ALREADY_SIGNED = "This draft is already signed. It went through but isn't saved yet, so save again rather than signing twice.";
export declare const REVISED_DRAFT = "This draft changed after you opened it, so nothing was signed. Review it again.";
export declare const MARK_UNSAVED = "Your drafts couldn't be saved on this device, so nothing was signed. Try again.";
/** True when the campaign has moved since the draft was priced. */
export declare function isStale(draft: Draft, campaign: Campaign): boolean;
/**
 * The drafts read back beside a restored campaign. Another administration's
 * drafts are dropped; a signed draft whose act the campaign holds is done; one
 * whose act the campaign lost is pending again.
 */
export declare function reconcileDrafts(stored: unknown, campaign: Campaign): readonly DraftEntry[];
export type DraftGroupItem = {
    readonly subject: string;
    readonly preview: DraftPreview;
    readonly stale: boolean;
    /** Present while its act is going through, and kept with the device's reason when the save was refused. */
    readonly signing?: SigningMark;
};
export type DraftGroup = {
    readonly authority: DraftAuthority;
    readonly label: string;
    readonly items: readonly DraftGroupItem[];
};
/** The tray's groups, by the authority that would act on each draft, in a fixed order; empty groups are left out. */
export declare function draftGroups(drafts: readonly DraftEntry[], campaign: Campaign): readonly DraftGroup[];
export declare function createDraftStore({ campaigns }: {
    readonly campaigns: CampaignStore;
}): DraftStore;
