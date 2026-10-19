import type { ForceAssetId, Nation, NationId } from "@admin/world";
import type { Campaign } from "./state.js";
import { type ContestDials } from "./contest-dials.js";
export type ForceDomainId = "ground" | "air" | "sea" | "cyber" | "space";
/**
 * A named thing the domain can send, with how much of it is ready.
 *
 * `type` is the roster label a screen prints, resolved from the catalog (or
 * the service's own name for it, where the record carries one); `id` is the
 * catalog id a rule matches on. `personnel` is the count at the catalog's
 * establishment, so a bench of hulls and a bench of brigades read on one scale.
 */
export type ForceHolding = {
    readonly id: ForceAssetId;
    readonly type: string;
    readonly count: number;
    readonly readiness: number;
    readonly personnel: number;
};
/** What a domain is made of, as the catalog names it: a formation and how many of them. */
export type ForceFormation = {
    readonly id: ForceAssetId;
    readonly name: string;
    readonly count: number;
    readonly personnel: number;
};
export type ForceDomain = {
    readonly id: ForceDomainId;
    readonly label: string;
    /** What this domain decides, in the sentence a player reads beside it. */
    readonly question: string;
    /** 0..1 — doctrine weight in this domain, as the dataset authors it. */
    readonly weight: number;
    /** People. Off the order of battle where one exists, off the national total where not. */
    readonly personnel: number;
    /** 0..1 — what could move this month. Unit-weighted where formations are on file. */
    readonly readiness: number;
    /**
     * 0..1 — the domain as one figure: doctrine weight, what shape it is in, and
     * how well it is organized to be used. This is what the contest compares.
     */
    readonly strength: number;
    /** Named formations, where the dataset carries them. */
    readonly formations: readonly ForceFormation[];
    /** Countable holdings, where the dataset carries them. */
    readonly holdings: readonly ForceHolding[];
    /** False where the composition was inferred from aggregates rather than counted. */
    readonly authored: boolean;
};
export type NuclearReading = {
    readonly warheads: number;
    readonly triad: boolean;
    /** 0..1 — what the arsenal is worth as a threat, saturating rather than scaling with the count. */
    readonly severity: number;
};
export declare const FORCE_DOMAINS: readonly ForceDomainId[];
export declare function forceDomain(nation: Nation, domain: ForceDomainId, dials?: ContestDials): ForceDomain;
export declare function forceDomains(nation: Nation, dials?: ContestDials): readonly ForceDomain[];
/**
 * What the arsenal is worth as a threat.
 *
 * Saturating rather than linear: the difference between zero warheads and two
 * hundred is the whole game, and the difference between two thousand and five
 * thousand is arithmetic. The triad is a separate fact from the count — a
 * stockpile nobody can deliver by three routes is a stockpile that can be
 * disarmed in one strike.
 */
export declare function nuclearReading(nation: Nation): NuclearReading;
/**
 * The warhead count a government admits to, or undefined where it admits
 * nothing. A state that has never declared its arsenal is not credited with a
 * figure on any surface, however well the count is estimated abroad; every
 * reader that prints a count reads it through here.
 */
export declare function declaredWarheads(campaign: Campaign, nation: NationId): number | undefined;
/**
 * A holding as a phrase: "11 aircraft carriers", "1 aircraft carrier".
 *
 * The dataset names a unit type in the plural, because that is what a type is.
 * A count of one then reads "1 aircraft carriers", which is the kind of seam
 * that makes a screen look generated rather than written. The rule is naive on
 * purpose — every unit type in the dataset is a regular plural — and it says so
 * rather than pretending to be a morphology engine.
 */
export declare function holdingPhrase(count: number, type: string): string;
/** How much of the pair's combined mass one side holds — meaningful at every scale, unlike a fixed reference. */
export declare function share(mine: number, theirs: number): number;
