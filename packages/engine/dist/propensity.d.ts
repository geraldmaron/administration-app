import { type Nation, type NationId, type Relationship } from "@admin/world";
import type { InstrumentId } from "./instruments.js";
import { type RedLineCrossing } from "./red-lines.js";
import { type Campaign } from "./state.js";
export type CoercionPropensity = {
    readonly mercantilist: number;
    readonly autarkic: number;
    readonly sanctionProne: number;
};
export declare function coercionPropensity(nation: Nation): CoercionPropensity;
/**
 * How much of this target's economy runs through this actor. The other half of
 * the question: a state can be as sanction-prone as it likes and still have
 * nothing the target would miss.
 */
export declare function leverageOver(actor: Nation, target: Nation): number;
/** What the actor would be cutting off from itself by cutting off the target. */
export declare function exposureTo(actor: Nation, target: Nation): number;
/**
 * What this nation's own position says about reaching for this instrument
 * against this target, on the same scale as the agent's other terms.
 *
 * Economic coercion is the case it speaks to most directly: a surplus exporter
 * with a customer that cannot replace it finds sanctions obvious, and an
 * import-dependent state with nothing the target needs finds them a way to hurt
 * itself. Force is proximity, a disputed border and declared posture, less the
 * trade a state does not lightly shoot its way out of. Covert work is what
 * there is to work with inside the target. Diplomacy gets nothing: a démarche
 * costs a government neither goods nor a service, and there is no position
 * that makes it more or less available.
 */
export declare function propensityFor(instrument: InstrumentId, actor: Nation, target: Nation): number;
/** Why a government would coerce this one, as the record names it. Undefined when the record names nothing. */
export type CoercionCause = "dyad" | "crossing" | "trade-dispute" | "grievance" | "hostile-standing" | "past-war" | "named-interest";
/**
 * The grievance or interest on the target's side that coercion would be about.
 *
 * Without one the agent pressed whoever was softest, and a government with no
 * quarrel on file with a country found itself sanctioning it because the odds
 * were good. A state coerces over something: a sourced rivalry, a line the
 * target crossed, a trade measure standing against it, a grudge the record
 * still carries, a relationship already read as hostile, a war the two have
 * fought, or a country its own doctrine names. Read once per target, not per
 * rung.
 */
export declare function coercionCause(campaign: Campaign, actor: Nation, target: NationId, edge: Relationship, crossings: readonly RedLineCrossing[]): CoercionCause | undefined;
