import type { NationId } from "@admin/world";
import type { Effect } from "./effects.js";
import { type AlignmentVector, type Campaign, type NationRuntime } from "./state.js";
export type ForeignOutletKind = "wire" | "national" | "state-media";
export type ForeignOutlet = {
    readonly id: string;
    readonly name: string;
    readonly nation: NationId;
    readonly kind: ForeignOutletKind;
    /** What it is for, in the words a media page would use. */
    readonly beat: string;
    /** The outlet's own sign-off: the one line of its voice no other masthead shares. */
    readonly signature: string;
};
/**
 * Below this, a country's press prints what its government says. Read off
 * the dataset's own scale, whose low end is "state media only"; the lowest
 * fifth of it is where no paper can file against the government it covers.
 */
export declare const STATE_PRESS_CEILING = 0.2;
/** The foreign outlets the desk reads. */
export declare const FOREIGN_OUTLETS: readonly ForeignOutlet[];
/** The outlet a nation's coverage is read through, where the roster carries one. */
export declare function outletOf(nation: NationId): ForeignOutlet | undefined;
/** Whether a country's press is its government's voice. */
export declare function isStatePress(runtime: NationRuntime): boolean;
export type CoverageBand = "hostile" | "cool" | "neutral" | "warm";
/** How a nation's press is covering the President, as a band a screen may print. */
export type ForeignCoverage = {
    readonly nation: NationId;
    readonly band: CoverageBand;
    /** Its press prints the government's line rather than its own. */
    readonly echo: boolean;
    readonly outlet?: ForeignOutlet;
};
export declare function coverageBand(score: number): CoverageBand;
/**
 * Where the President's politics sit, as the press abroad reads them: half the
 * platform of the ticket they ran on, half the program they actually hold.
 * The program alone where the ticket carries no platform the slate records.
 */
export declare function presidentPosition(campaign: Campaign): AlignmentVector;
/**
 * How close the President's politics sit to the party governing a nation,
 * -1 opposite to 1 alike, on the same affinity every other stance is read
 * against.
 */
export declare function politicalCloseness(campaign: Campaign, nation: NationId, president?: AlignmentVector): number;
/**
 * The coverage a nation's press gives the President, -1 to 1. State media
 * repeat their government's standing with Washington; a free press weighs the
 * President's politics for itself, by as much as it is free to.
 */
export declare function coverageScore(campaign: Campaign, nation: NationId, president?: AlignmentVector): number | undefined;
/**
 * A nation's coverage of the President. Undefined for the President's own
 * country, and until the week's press abroad has first been read: a campaign
 * sealed at the oath has not been written about yet.
 */
export declare function foreignCoverage(campaign: Campaign, nation: NationId): ForeignCoverage | undefined;
/**
 * The most the press abroad can move a government's trust in the President,
 * either way, over a whole term. A planning value: small enough that no
 * government's standing with Washington is decided by its newspapers, large
 * enough that a term of warm coverage is a reason and not a rounding error.
 */
export declare const AFFINITY_CAP = 0.05;
/** The most one week's coverage moves that trust. At this pace the cap takes twenty weeks to reach. */
export declare const AFFINITY_STEP = 0.0025;
/**
 * Where a government's trust in the President is being pulled by its press
 * and by how close the President's politics sit to the party in power, within
 * the cap. Zero for the President's own country.
 */
export declare function pressTrustAffinity(campaign: Campaign, nation: NationId, president?: AlignmentVector): number;
/**
 * One week of the press abroad: each government's trust moved one step toward
 * where its coverage pulls it, and the running total that keeps the move
 * inside the cap. The total is what is stored, so a term's worth of warm
 * coverage cannot push past the cap however long it runs.
 */
export declare function coverageWeek(campaign: Campaign): readonly Effect[];
