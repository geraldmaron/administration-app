import type { NationId, OrgId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type ForeignSeat, type LeadershipChange, type MarketsState, type MunitionsState, type Indictment, type RegimeOperation } from "./state-world.js";
/** Full replacement of the markets record. `commodityPhase` is its weekly writer; the President's market acts write the parts they own. */
export type MarketsEffect = {
    readonly kind: "markets";
    readonly set: MarketsState;
};
export declare function applyMarkets(state: Campaign, effect: MarketsEffect): Campaign;
/** Full replacement of the munitions record. `munitionsPhase` is its writer. */
export type MunitionsEffect = {
    readonly kind: "munitions";
    readonly set: MunitionsState;
};
export declare function applyMunitions(state: Campaign, effect: MunitionsEffect): Campaign;
/**
 * One seat changing hands, and the change filed for the feed; or one week of
 * the press abroad, as the running total its coverage has moved the
 * government's trust by. The seat's offset is what `liveTemperament` reads,
 * so this is the one way a leader's character reaches a government's decisions.
 */
export type LeadershipEffect = {
    readonly kind: "leadership";
    readonly nation: NationId;
    readonly seat?: ForeignSeat;
    readonly change?: LeadershipChange;
    readonly coverage?: {
        readonly affinity: number;
    };
};
export declare function applyLeadership(state: Campaign, effect: LeadershipEffect): Campaign;
/** One regime operation written whole: a new one appended, a known one replaced by its id. */
export type RegimeEffect = {
    readonly kind: "regime";
    readonly upsert: RegimeOperation;
};
export declare function applyRegime(state: Campaign, effect: RegimeEffect): Campaign;
/** An indictment filed, or served: upserted by id. Indictments are kept for the whole campaign, since a served one is the record of why a leader is in custody. */
export type IndictmentEffect = {
    readonly kind: "indictment";
    readonly upsert: Indictment;
};
export declare function applyIndictment(state: Campaign, effect: IndictmentEffect): Campaign;
/** A government accedes to a body or withdraws from it; the runtime override of its authored roster. */
export type MembershipEffect = {
    readonly kind: "membership";
    readonly nation: NationId;
    readonly org: OrgId;
    readonly change: "accede" | "withdraw";
};
export declare function applyMembership(state: Campaign, effect: MembershipEffect): Campaign;
