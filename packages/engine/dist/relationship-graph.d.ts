import { type Nation, type NationId, type Relationship } from "@admin/world";
import { type RelationshipGraph } from "./state.js";
export declare function hasStandingLink(from: Nation, to: Nation): boolean;
/** Great-circle distance between two capitals, in kilometers. */
export declare function capitalDistanceKm(from: Pick<Nation, "geo">, to: Pick<Nation, "geo">): number;
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
