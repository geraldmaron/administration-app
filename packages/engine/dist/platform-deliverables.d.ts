import type { PlankId } from "@admin/world";
import { type PolicyDomain } from "./policy.js";
import type { AlignmentVector, Campaign, GameDate } from "./state.js";
export type PlankDeliverable = {
    readonly kind: "hold-program";
    readonly domain: PolicyDomain;
    readonly stance: string;
} | {
    readonly kind: "adopt-program";
    readonly domain: PolicyDomain;
    readonly stance: string;
} | {
    readonly kind: "sign-order";
    readonly order: string;
};
/** What a plank commits the administration to, or nothing for a plank the engine does not know. */
export declare function plankDeliverable(plank: PlankId | string): PlankDeliverable | undefined;
/**
 * Whether a plank can be promised for the first hundred days. A program the
 * platform opens the term on is already in force on the first day, so a
 * hundred-day promise on it would be kept by doing nothing.
 */
export declare function plankFitsFirstHundredDays(plank: PlankId | string): boolean;
/** Which way the plank's program or order pushes, on the axes every cohort's politics sit on. */
export declare function plankAlignment(deliverable: PlankDeliverable): Partial<AlignmentVector>;
/**
 * Whether the thing the plank promised is true of the campaign right now: the
 * program is the domain's program, or the order is signed and not struck down.
 */
export declare function deliverableInForce(campaign: Campaign, deliverable: PlankDeliverable, madeDate: GameDate): boolean;
/** What a plank does and what settles it, in the sentences a player reads beside it. */
export type PlankTerms = {
    /** What the platform puts in force at the oath, for a plank that opens the term on a program. */
    readonly opensOn?: string;
    readonly keptWhen: string;
    readonly brokenWhen: string;
};
/** "the fiscal program", "the civil liberties program": a domain's program inside a sentence. */
export declare function programWords(domain: PolicyDomain): string;
/** The program or the order a deliverable names, as it reads inside a sentence. */
export declare function deliverableName(deliverable: PlankDeliverable): string;
/** The terms of a plank, or nothing for a plank the engine does not know. */
export declare function plankTerms(plank: PlankId | string): PlankTerms | undefined;
