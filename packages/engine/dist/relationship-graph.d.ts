import { type Nation, type NationId, type Relationship } from "@admin/world";
import { type NationRuntime, type RelationshipGraph } from "./state.js";
export declare function hasStandingLink(from: Nation, to: Nation): boolean;
/** Great-circle distance between two capitals, in kilometers. */
export declare function capitalDistanceKm(from: Pick<Nation, "geo">, to: Pick<Nation, "geo">): number;
/** Trade exposure in both directions; a lane is a relationship, not a one-way fact. */
/**
 * How much of a pair's trade one side reads as its own business: its own
 * dependence on the lane, and a smaller part of the counterpart's.
 */
export declare function laneMagnitude(ours: number, theirs: number): number;
/**
 * How A reads B.
 *
 * Alignment is where the two governments' interests actually sit relative to
 * one another — bloc position, the compacts they share, whether either points
 * at the other as somewhere to pull toward, how alike the political systems
 * are, and how entangled the two economies have become. Trust follows
 * alignment but is a judgment about *conduct*, so it turns on B's own record
 * of keeping its word and on how legible its government is. Tension is what
 * remains: opposed interests, force pointed this way, and proximity to a
 * capital that leans forward — less whatever the two would lose by falling
 * out.
 */
export declare function deriveRelationship(from: Nation, to: Nation): Relationship;
export declare function buildInitialRelationships(nations: readonly Nation[], player: NationId): RelationshipGraph;
/** The part of a reading that relationship memory settles back toward. */
export type StructuralReading = {
    readonly trust: number;
    readonly tension: number;
};
/** The standing reading with the threat assessment the same records give, which standing pressures press against. */
export type StandingReading = StructuralReading & {
    readonly militaryThreat: number;
};
/**
 * Where `from`'s reading of `to` sits on its standing facts alone: the same
 * derivation and sourced overlay the founding graph is built from, read off
 * each nation's unmutated record and its live compact memberships. A favor, a
 * slight or a week of war moves the live reading away from this; joining or
 * leaving a compact moves this itself, which is why a withdrawal is never
 * undone by time.
 *
 * Cached per pair of records, because the records never change inside a
 * campaign and the memory phase reads every edge every week. A nation that has
 * joined or left a body since founding is derived fresh.
 */
export declare function structuralReading(from: NationRuntime, to: NationRuntime, player: NationId): StandingReading;
