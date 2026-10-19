import type { Campaign, IssuedPressAct, PressAction, PressEngagement } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { type PressProjection } from "./press.js";
export type PressIssueResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly projection: PressProjection;
    readonly act: IssuedPressAct;
    readonly packet: EffectPacket;
};
export type PressResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly projection: PressProjection;
    readonly wentWell: boolean;
    readonly engagement: PressEngagement;
    readonly packet: EffectPacket;
};
/**
 * Authorize the engagement. The corps has not answered yet. Standing (and only
 * standing) can move at issuance when the play prices it; the room's reading
 * lands on the due date.
 */
export declare function issuePressAction(campaign: Campaign, kind: PressAction, outletId?: string): PressIssueResult;
/** Resolve one issued press engagement whose due date has arrived. */
export declare function resolveIssuedPress(campaign: Campaign, id: string, roleTitles?: Readonly<Record<string, string>>): PressResult;
export declare function dueIssuedPressActs(campaign: Campaign): readonly IssuedPressAct[];
/** Every press engagement still waiting on the room, whether or not it is due. */
export declare function outstandingIssuedPressActs(campaign: Campaign): readonly IssuedPressAct[];
/**
 * Apply every press engagement that has come due. Charter titles are optional;
 * American role fallbacks cover the playable seat when none are supplied.
 */
export declare function resolveDuePress(campaign: Campaign, roleTitles?: Readonly<Record<string, string>>): {
    readonly campaign: Campaign;
    readonly packets: readonly EffectPacket[];
};
export * from "./press-secretary.js";
