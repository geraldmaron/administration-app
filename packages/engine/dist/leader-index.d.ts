import type { NationId, PersonId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
/** Everyone of one nationality in the cast, living or not, in the cast's own order. */
export declare function nationalsOf(campaign: Campaign, nation: NationId): readonly PersonRuntime[];
/**
 * The person `find` names as a nation's leader, worked out once per cast.
 * `lead` is in the key because a chair is named by the nation's charter, and a
 * campaign that changed one would otherwise read the old chair's holder.
 */
export declare function rememberedLeader(campaign: Campaign, nation: NationId, lead: string, find: () => PersonRuntime | undefined): PersonRuntime | undefined;
/**
 * A rapport `find` reads between two leaders, worked out once per cast and per
 * pair. Keyed by the two people rather than their countries, because the
 * President's chair is read off the administration rather than off the cast.
 */
export declare function rememberedRapport(campaign: Campaign, from: PersonId, to: PersonId, find: () => number): number;
/** Whether foreign leaders' own character reaches their governments' decisions. Always true outside a measurement. */
export declare function leaderPersonalityOn(): boolean;
/**
 * Runs `measure` with foreign leaders' own character switched off — the lean
 * the leader in office at the start puts on their government, the two axes
 * their traits fill, and their rapport with the leader across the table — so a
 * battery can measure the world with and without it from one copy of the code.
 * Restored on the way out, thrown or not, so nothing outside the run sees it off.
 */
export declare function withoutLeaderPersonality<T>(measure: () => T): T;
