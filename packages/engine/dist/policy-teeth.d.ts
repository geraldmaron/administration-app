import type { CohortId } from "@admin/world";
import type { PolicyDomain, PolicyStance } from "./policy.js";
import type { Campaign } from "./state.js";
/**
 * How long a newly adopted program takes to reach the country.
 *
 * A month. Long enough that the signature and the first effect are separate
 * events a player can tell apart — which is the whole point — and short enough
 * that a four-year term is not mostly spent waiting. The inherited program is
 * exempt: it was already running on the morning of the oath.
 */
export declare const PROGRAM_STANDUP_TURNS = 4;
/** What the record calls a program that has gone to work. */
export declare function programMark(domain: PolicyDomain, stanceId: string): string;
/** The turn this program first appeared in the record, or nothing where it has not. */
export declare function programStandingSince(campaign: Campaign, domain: PolicyDomain, stanceId: string): number | undefined;
/**
 * Weeks left before a newly adopted program delivers anything. Zero once it
 * does.
 *
 * Counted from the first week the program was at work, which is the week after
 * the signature: the mark is written by the phase that runs at the end of the
 * week it was signed in, so the recorded week is already the first week of
 * work. Inclusive of that week, so a program signed in week 10 is at work from
 * 11 and paying from 15 — a month between the signature and the first effect,
 * which is what the wait is for.
 */
export declare function programStandUpRemaining(campaign: Campaign, domain: PolicyDomain, stance: PolicyStance): number;
/** Whether a program has been standing long enough to be worth anything yet. */
export declare function programBites(campaign: Campaign, domain: PolicyDomain, stance: PolicyStance): boolean;
/** Who a program is against, in the words the country is described in. */
export type PolicyOpposition = {
    readonly cohort: CohortId;
    readonly name: string;
    /** How far the program pushes against what this group holds. Positive by construction. */
    readonly strength: number;
};
/**
 * The constituency a program is worst for.
 *
 * Nothing here is a judgment about the program: it is the arithmetic of the
 * direction the stance declares against the beliefs sixteen cohorts already
 * hold. A stance that pushes nowhere has nobody to be against, which is the
 * honest reading of the inherited program — continuity is what everyone is
 * already living with — and a failure for anything else, which is what the
 * gate in policy-teeth.test.ts refuses.
 */
export declare function stanceOpposition(stance: PolicyStance): PolicyOpposition | undefined;
export declare function domainAuthority(domain: PolicyDomain): string;
