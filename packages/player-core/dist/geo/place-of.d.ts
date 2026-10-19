import { type Campaign, type DeclaredEmergency, type ExecutiveOrderRecord, type GrievanceMark, type NationCondition, type PendingClaim } from "@admin/engine";
import { type NationId, type Place, type StateId } from "@admin/world";
export type PinnableItem = {
    readonly kind: "condition";
    readonly record: NationCondition;
} | {
    readonly kind: "emergency";
    readonly nation: NationId;
    readonly record: DeclaredEmergency;
} | {
    readonly kind: "mark";
    readonly nation: NationId;
    readonly state: StateId;
    readonly record: GrievanceMark;
} | {
    readonly kind: "claim";
    readonly nation: NationId;
    readonly state: StateId;
    readonly record: PendingClaim;
} | {
    readonly kind: "order";
    readonly nation: NationId;
    readonly record: ExecutiveOrderRecord;
};
export type PinnableKind = PinnableItem["kind"];
/** Every kind `placeOf` answers for; `verify-incident-places` holds it to the engine's records. */
export declare const PINNABLE_KINDS: readonly PinnableKind[];
export type { Place, PlaceLevel } from "@admin/world";
/** City, then the state's largest city or its capitol, then the nation. */
export declare function placeOf(item: PinnableItem): Place | undefined;
/**
 * Every live pinnable record in a campaign, in a declared order: conditions and
 * emergencies by id, located orders by id, then each state's marks and claims in `STATE_IDS` order.
 * Resolved conditions and ended emergencies are history, not pins.
 */
export declare function pinnableItems(campaign: Campaign): readonly PinnableItem[];
