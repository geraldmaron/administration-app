import type { Charter } from "@admin/world";
import type { Campaign } from "./state.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import type { CourtProceeding } from "./state-judiciary.js";
import type { LocaleActId } from "./locale-acts.js";
/**
 * How irreparable the harm a mission does reads to a court, 0..1. Soldiers in
 * the street most; a task force the governor invited, working cases beside the
 * state's own police, least.
 */
export declare const INTERIM_HARM: Readonly<Partial<Record<LocaleActId, number>>>;
/** What a state plaintiff's own sovereign injury adds to the chance, where the governor did not assent. */
export declare const STATE_PLAINTIFF_RELIEF = 0.1;
export declare const MAX_INTERIM_RELIEF = 0.9;
export declare const MIN_INTERIM_RELIEF = 0.05;
export type MissionInterimRelief = {
    /** The chance the court enjoins the mission order once the suit reaches interim relief. */
    readonly chance: number;
    /** The district court's modeled chance of setting the order aside on the merits. */
    readonly merits: number;
    readonly harm: number;
    readonly statePlaintiff: boolean;
};
/**
 * The interim relief a suit against this mission order would win, or nothing
 * for an order that is not a mission order. Before a suit exists, pass whether
 * a state is expected to lead it; once filed, the proceeding says.
 */
export declare function missionInterimRelief(campaign: Campaign, charter: Charter, record: Pick<ExecutiveOrderRecord, "id" | "order" | "subject">, proceeding?: CourtProceeding, expectStatePlaintiff?: boolean): MissionInterimRelief | undefined;
