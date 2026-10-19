import { type NationId } from "@admin/world";
import { type Campaign, type PersonRuntime, type TreatyKind } from "./state.js";
import { type DecisionStamp, type WillingnessForecast, type WillingnessProjection } from "./willingness.js";
/**
 * Where the counterpart's weighing must land for it to sign, by kind. A named
 * input rather than a buried constant, so a rule that makes treaty partners
 * more willing lowers it in one place and the stamp records the line it used.
 * Planning values: an executive agreement is the easiest thing to sign and a
 * mutual-defense treaty the hardest.
 */
export declare const ACCEPT_TREATY_THRESHOLDS: Readonly<Record<TreatyKind, number>>;
/**
 * The craft of the typical Secretary of State a President could name, and half
 * the distance from the weak end of that bench to the strong end (its 10th to
 * 90th percentile), measured over every State-eligible American in the founding
 * pools of the balance seeds and pinned by a test that measures them again.
 *
 * The Secretary is read against the people who could hold the job, not against
 * the cabinet as a whole: every plausible Secretary of State is a better
 * diplomat than the typical cabinet member, so a cabinet-wide middle would make
 * every Secretary a help and barely tell a strong one from a weak one.
 */
export declare const STATE_BENCH_MEDIAN = 0.783;
export declare const STATE_BENCH_HALF_SPREAD = 0.0562;
/**
 * Where an empty State Department sits on the same reading: below the weakest
 * Secretary on the bench, because a weak Secretary still makes the case and an
 * empty chair has nobody senior to make it.
 */
export declare const VACANT_BENCH_LEAN = -1.25;
/** Whoever runs the State Department this week: the confirmed Secretary, or the acting. */
export declare function secretaryOfState(campaign: Campaign): PersonRuntime | undefined;
/**
 * How the Secretary of State compares with the people who could hold the job,
 * -1 (the weak end of the bench) to 1 (the strong end). An empty chair reads
 * below the whole bench.
 */
export declare function envoyBenchLean(campaign: Campaign): number;
/**
 * The same reading back on the craft scale, which is the unit the receive and
 * treaty weights were set in: a Secretary at the strong end of the bench is
 * worth half the bench's spread in craft.
 */
export declare function envoyLean(campaign: Campaign): number;
/**
 * How well the President and this government's leader get on, -1..1 off the
 * typical pair. Undefined where either leader is not on the record, which
 * leaves the term out rather than reading a stranger as a typical pair.
 */
export declare function presidentRapport(campaign: Campaign, nation: NationId): number | undefined;
/**
 * The counterpart's willingness to sign a treaty of this kind, forecast
 * without the draw. Undefined where the two governments hold no relationship.
 */
export declare function counterpartWillingness(campaign: Campaign, counterpart: NationId, kind: TreatyKind, threshold?: number): WillingnessProjection | undefined;
/**
 * The counterpart's reasoning as it stands, with no draw in it: what a reading
 * of the offer may name before it is made. Never applied.
 */
export declare function counterpartPreview(campaign: Campaign, counterpart: NationId, kind: TreatyKind): DecisionStamp | undefined;
/** The counterpart's decision with its one draw, keyed without the week: the same offer gets the same answer until a term moves. */
export declare function counterpartDecision(campaign: Campaign, counterpart: NationId, kind: TreatyKind, threshold?: number): DecisionStamp | undefined;
/**
 * Where the counterpart's own trust in the United States would have to stand
 * for its weighing of this kind to clear the line, every other term held where
 * it is. A forecast, not a promise: the decision still carries its draw, so a
 * government near the line can go either way. Undefined where the two hold no
 * relationship.
 */
export declare function counterpartTrustFloor(campaign: Campaign, counterpart: NationId, kind: TreatyKind): number | undefined;
export type TreatyRefusal = {
    readonly ok: false;
    readonly reason: string;
    readonly decision: DecisionStamp;
};
/**
 * The signature gate's one call. Undefined when the counterpart signs, a
 * refusal carrying its own stamp when it will not.
 */
export declare function counterpartRefusal(campaign: Campaign, counterpart: NationId, kind: TreatyKind): TreatyRefusal | undefined;
export type TreatyForecast = {
    readonly forecast: WillingnessForecast;
    /** The two terms that lead the reading, as plain phrases, heaviest first. */
    readonly reasons: readonly string[];
};
/** Whether the counterpart would sign, said before the offer is made: likely, unlikely or a close call, and the two readings that lead it. */
export declare function treatyForecast(campaign: Campaign, counterpart: NationId, kind: TreatyKind): TreatyForecast | undefined;
