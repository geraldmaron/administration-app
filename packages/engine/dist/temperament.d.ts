import { type NationFidelity, type NationId, type NationTraits } from "@admin/world";
import type { Campaign } from "./state.js";
import type { TemperamentOffset } from "./state-world.js";
/**
 * How much of its temperament a government's record lets it act on, by how
 * deeply the dataset knows it. A roster of every recognized government puts
 * many thin records in the draw beside the researched ones, and at full weight
 * a microstate would outdraw a regional power on an archetype's aims.
 */
export declare const FIDELITY_WEIGHT: Readonly<Record<NationFidelity, number>>;
/** How far up the ladder a government is willing to step at all: mostly nerve, partly appetite for a fight. */
export declare function appetite(traits: NationTraits): number;
/** The strongest brake on acting abroad: a government that has decided its business is its own. */
export declare function inwardPull(traits: NationTraits): number;
export type TemperamentCenter = {
    readonly appetite: number;
    readonly isolationism: number;
    readonly legalism: number;
    readonly reliability: number;
};
/**
 * The middle of the authored world, which a term measures a government
 * against: an appetite above the center pulls toward acting, below it pulls
 * away. Read from the dataset rather than written as constants, so a revised
 * roster moves the center with it; the paired test pins today's figures, so a
 * move is seen rather than absorbed.
 */
export declare const TEMPERAMENT_CENTER: TemperamentCenter;
/** Whether a nation decides for itself. The President's own country acts only on an order. */
export declare function isWorldActor(campaign: Campaign, nation: NationId): boolean;
/**
 * What the seated leader puts on their government in all: the offset the seat
 * stores and the lean of the leader in office at the start, held together
 * inside the one bound. Zero axes are left out, so a government whose leader
 * is exactly the one it would typically have reads an empty lean.
 */
export declare function leaderLean(campaign: Campaign, nation: NationId): TemperamentOffset;
/**
 * The temperament a government decides with this week: its own traits, moved
 * by whatever the leader it has seated brings. With no lean the traits come
 * back unchanged, the same object, so a decision that reads through here for
 * a government whose leader leans nowhere computes exactly what it computed
 * reading the traits directly.
 */
export declare function liveTemperament(campaign: Campaign, nation: NationId): NationTraits | undefined;
