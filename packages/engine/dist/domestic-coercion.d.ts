import type { StateId } from "@admin/world";
import type { Effect } from "./effects.js";
import type { Campaign, FlagId } from "./state.js";
export type CoercionKind = "agents" | "troops" | "surveillance";
/** How dangerous one use is before tempo: the chance of an incident, and how hard one lands. */
export type CoercionRisk = {
    readonly kind: CoercionKind;
    readonly odds: number;
    readonly severity: number;
};
/** How many weeks back an earlier coercive act still colors how the next one is read. */
export declare const COERCION_TEMPO_WEEKS = 8;
/** Each recent act raises the chance of an incident by this share of its base, up to the cap. */
export declare const TEMPO_ODDS_STEP = 0.6;
/** Each recent act makes an incident land this much harder, up to the cap. */
export declare const TEMPO_SEVERITY_STEP = 0.35;
export declare const MAX_INCIDENT_ODDS = 0.85;
export declare const MAX_SEVERITY = 2.5;
/** From the second recent act on, the run itself costs: the country sees a pattern, not a decision. */
export declare const ERRATIC_FROM = 2;
export declare const ERRATIC_COMPETENCE = 0.012;
export declare const ERRATIC_UNITY = 0.008;
/**
 * Taken with no unrest to answer, the same act is a choice rather than a
 * response: the public reads it as overreach before anything happens, crowds
 * meet it angrier, and what goes wrong lands harder.
 */
export declare const UNPROVOKED_ODDS = 1.5;
export declare const UNPROVOKED_SEVERITY = 1.3;
export declare const UNPROVOKED_INTEGRITY = 0.015;
export declare const UNPROVOKED_POLARIZE = 0.006;
/**
 * The deed flag one coercive act leaves, read back by tempo. Numbered by how
 * many came before it, so the same act taken twice in a week is two deeds on
 * the record rather than one flag set twice.
 */
export declare function coercedFlag(kind: CoercionKind, state: StateId, sequence: number): FlagId;
/** The flag a surveillance program leaves on a state: the intelligence committee hears of it. */
export declare function surveillanceFlag(state: StateId): FlagId;
/**
 * How many coercive acts the President has taken in the last
 * `COERCION_TEMPO_WEEKS`, counted off the turn-stamped markers each one left,
 * so the count is the record's and survives a save.
 */
export declare function recentCoercion(campaign: Campaign): number;
export type CoercionOutlook = {
    /** Whether there was unrest for the act to answer. */
    readonly provoked: boolean;
    readonly recent: number;
    readonly odds: number;
    readonly severity: number;
    readonly erratic: boolean;
};
/** The chance and weight of an incident if the act were taken now, with the run that came before it. */
export declare function coercionOutlook(campaign: Campaign, risk: CoercionRisk, provoked?: boolean): CoercionOutlook;
export type CoercionOutcome = {
    readonly effects: readonly Effect[];
    /** The incident's headline, for the packet's narration; absent when nothing went wrong this time. */
    readonly incident?: string;
    readonly outlook: CoercionOutlook;
};
/**
 * Everything one coercive act sets in motion beyond its price: the deed flags
 * tempo and the inquiry read, the cost of a run when this act extends one, and
 * the incident, if the draw finds one. The draw has its own stream, keyed by
 * the state, the week and how many acts preceded it ever, so taking the same
 * act twice in a week is two draws and an old save's other streams are untouched.
 */
export declare function coercionOutcome(campaign: Campaign, state: StateId, place: string, risk: CoercionRisk, provoked?: boolean): CoercionOutcome;
