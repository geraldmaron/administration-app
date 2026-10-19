import { type Campaign, type EffectPacket, type FindingState, type NotificationTier } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type ChoiceTable } from "../policy/choice-table.js";
export declare const FINDING_TIERS: readonly {
    readonly id: NotificationTier;
    readonly label: string;
    readonly who: string;
}[];
export declare const FINDING_STATES: readonly {
    readonly id: Exclude<FindingState, "unwritten">;
    readonly label: string;
    readonly detail: string;
}[];
export type FindingRow = {
    readonly id: string;
    readonly objective: string;
    readonly target: NationId;
    readonly targetName: string;
    readonly signed: string;
    readonly state: string;
    readonly told: string;
    /** Notice was withheld and the committees have not yet been told. */
    readonly owesNotice: boolean;
    readonly reasons?: string;
    readonly activities: number;
    readonly closed: boolean;
};
export type UnfoundedRow = {
    readonly id: string;
    readonly targetName: string;
    readonly description: string;
};
export type CovertReading = {
    readonly open: readonly FindingRow[];
    readonly closed: readonly FindingRow[];
    readonly unfounded: readonly UnfoundedRow[];
};
/** Findings open and closed, newest first, and the covert acts taken with no paper behind them. */
export declare function covertReading(campaign: Campaign): CovertReading;
/** The governments a finding could be aimed at today: every one but the homeland and any that already has one standing. */
export declare function findingTargets(campaign: Campaign): readonly {
    readonly id: NationId;
    readonly name: string;
}[];
export type FindingDraft = {
    readonly target: NationId;
    readonly objective: string;
    readonly state: Exclude<FindingState, "unwritten">;
    readonly reasons: string;
};
/** Why counsel will not paper this objective, or nothing. */
export declare function counselRefusal(campaign: Campaign, draft: FindingDraft): string | undefined;
/** The three ways to tell the committees, each read as what signing adds; the paper and what it costs are on the same rows. */
export declare function signChoices(campaign: Campaign, draft: FindingDraft): ChoiceTable;
export declare function signOrder(campaign: Campaign, draft: FindingDraft, tier: NotificationTier): EffectPacket;
/** Closing a finding out, read as what it ends. */
export declare function closeFindingChoices(campaign: Campaign, id: string): ChoiceTable | undefined;
export declare function closeFindingOrder(campaign: Campaign, id: string): EffectPacket;
