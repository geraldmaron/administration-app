import { type Campaign } from "./state.js";
export type FragilityTermKey = "institutionalTrust" | "politicalCapital" | "agencyCapacity" | "cabinetCohesion" | "crisisLoad" | "fiscalSpace" | "marketCredibility" | "allianceConfidence" | "bureaucraticMorale" | "congressionalSupport";
/**
 * Each term is read as *health*, 0..1, where 1 is healthy. Fragility is what
 * is left over. Reading them all the same way round is deliberate: a mixed
 * convention is how a sign error becomes a difficulty setting nobody can find.
 */
export type FragilityReading = {
    readonly terms: Readonly<Record<FragilityTermKey, number>>;
    /** 0..1. How much worse than a healthy government this one absorbs a shock. */
    readonly fragility: number;
    /**
     * What a mistake actually costs, as a multiple of its flat price. Always at
     * least 1: fragility can make a mistake worse and can never make one free.
     */
    readonly amplification: number;
    /** The terms actually carrying the fragility, worst first. Never empty when fragility is nonzero. */
    readonly drivers: readonly FragilityDriver[];
};
export type FragilityDriver = {
    readonly term: FragilityTermKey;
    /** 0..1 health. */
    readonly reading: number;
    /** How much of the composite this term is responsible for. */
    readonly contribution: number;
    /** What the player would do about it. */
    readonly remedy: string;
};
export declare const FRAGILITY_WEIGHTS: Readonly<Record<FragilityTermKey, number>>;
/** How split the room is: the seated Secretaries' pairs, and how many of them are opposed. */
export type CabinetSplit = {
    readonly pairs: number;
    readonly opposedPairs: number;
    /** 0..1, or the typical founded cabinet's share where there is no pair to read. */
    readonly opposedShare: number;
};
/**
 * The share of Secretary pairs a typical founded cabinet opens with opposed:
 * the median over the balance seeds for all three parties, rounded to four
 * places. A party President's cabinet founds a little under it (about 0.05),
 * an independent's cross-party cabinet well over it (about 0.26), so a party
 * cabinet reads close to its loyalty and an independent's starts a few points
 * less united, which is what seating both parties at one table costs. Pinned
 * by a test that recomputes it, so a change to how ties read moves it in the
 * open.
 */
export declare const OPPOSED_SHARE_CENTER = 0.0708;
export declare function selectCabinetSplit(campaign: Campaign): CabinetSplit;
/**
 * Every term, read off live state.
 *
 * Nothing here is stored, and nothing is a dial. If a reading is low there is
 * a fact behind it that the player can go and look at, which is the whole
 * difference between this and a difficulty curve.
 */
export declare function fragilityTerms(campaign: Campaign): Readonly<Record<FragilityTermKey, number>>;
export declare function selectFragility(campaign: Campaign): FragilityReading;
/**
 * What a cost actually comes to, given how well the government is holding up.
 *
 * Applied to *costs only*, never to gains: a fragile administration does not
 * get more out of a success, it gets less out of everything and more out of
 * nothing. Amplifying both directions would be a difficulty curve wearing a
 * mechanic's clothes.
 */
export declare function amplifiedCost(reading: FragilityReading, cost: number): number;
/**
 * One sentence naming why a cost was heavier than its sticker price, for a
 * surface that has just charged one. Returns undefined when the administration
 * is healthy enough that nothing was amplified, so a screen never claims a
 * penalty that was not applied.
 */
export declare function explainAmplification(reading: FragilityReading): string | undefined;
