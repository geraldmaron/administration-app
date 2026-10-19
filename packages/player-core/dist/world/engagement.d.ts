import { type Campaign, type EngagementKind, type TreatyKind, type WillingnessForecast } from "@admin/engine";
import type { NationId, PersonId } from "@admin/world";
/** The size of the step a received engagement takes, in words: the figures are the engine's, not the player's. */
export type EngagementWarmth = "a small step" | "a real step" | "a large step";
export type EngagementOption = {
    readonly kind: EngagementKind;
    readonly label: string;
    readonly forecast: WillingnessForecast;
    readonly warmth: EngagementWarmth;
    /** Why the other side would or would not take it, only where the services can read that government. */
    readonly reasons: readonly string[];
};
export type TreatyOption = {
    readonly kind: TreatyKind;
    readonly name: string;
    readonly forecast: WillingnessForecast;
    /** The two readings that lead the forecast, heaviest first, only where the services can read that government. */
    readonly reasons: readonly string[];
};
/** Where the Secretary of State stands among the people who could hold the job, in a word. */
export type EnvoyHand = "skilled" | "capable" | "unsure" | "vacant";
export type EnvoyReading = {
    readonly hand: EnvoyHand;
    /** Whoever runs the State Department, confirmed or acting. */
    readonly person?: PersonId;
    /** One sentence a player reads: who it is and what their hand does to reception, warmth and signatures. */
    readonly line: string;
};
export type EngagementReading = {
    readonly nation: NationId;
    readonly options: readonly EngagementOption[];
    readonly treaties: readonly TreatyOption[];
    readonly envoy: EnvoyReading;
    /** How the President and this leader get on, said only where it is marked and the services can read that leader. */
    readonly rapport?: string;
};
/** How big one move of one reading is, in the words an engagement's step is said in. */
export declare function warmthWord(size: number): EngagementWarmth;
/** The Secretary of State's hand, read against the people who could hold the job. */
export declare function envoyReading(campaign: Campaign): EnvoyReading;
/**
 * How the President and this government's leader get on, in a sentence. Said
 * only where the services read that government and the dataset knows it in
 * full: rapport is read from the leader's own character, and a thin record's
 * leader has none worth naming.
 */
export declare function rapportLine(campaign: Campaign, nation: NationId): string | undefined;
/** What the President could do with a government this week. Undefined for the President's own country. */
export declare function engagementReading(campaign: Campaign, nation: NationId): EngagementReading | undefined;
