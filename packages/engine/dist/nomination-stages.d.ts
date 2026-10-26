import type { Campaign } from "./state.js";
import type { Nomination } from "./nomination.js";
import { type OfficeId } from "./institutions.js";
export type NominationStage = "shortlist" | "vetting" | "prepared" | "nominated" | "referred" | "disclosures" | "hearing-scheduled" | "hearing" | "committee-action" | "executive-calendar" | "floor-pending" | "cloture" | "vote" | "confirmed" | "rejected" | "withdrawn" | "returned" | "sworn-in";
/** The stages a nomination is still moving through. */
export declare const ACTIVE_STAGES: readonly NominationStage[];
/** The stages nothing further happens from. */
export declare const TERMINAL_STAGES: readonly NominationStage[];
export declare function isTerminal(stage: NominationStage): boolean;
export declare function selectActiveNominations(campaign: Campaign): readonly Nomination[];
export declare function selectNominationForOffice(campaign: Campaign, office: OfficeId): Nomination | undefined;
export declare const CONGESTED_STAGES: readonly NominationStage[];
/**
 * The four legs a nomination runs, in order: the White House's own vetting,
 * the committee, the floor, and the oath. A screen draws a nomination as these
 * rather than as its fourteen stages, and they are defined here, beside the
 * stage lists that decide which stages the committee and the floor stretch, so
 * the legs a player sees are the ones the clock actually runs on.
 */
export type NominationLeg = "white-house" | "committee" | "floor" | "seated";
export declare const NOMINATION_LEGS: readonly NominationLeg[];
/** Which leg a stage belongs to; a nomination that ended without a seat is on none. */
export declare function nominationLeg(stage: NominationStage): NominationLeg | undefined;
/** How many days this nomination's current stage takes, in this Senate, right now. */
export declare function stageDuration(campaign: Campaign, nomination: Nomination): number;
export type StageResolution = {
    readonly stage: NominationStage;
    readonly note: string;
    readonly outcome?: string;
};
/**
 * What happens when the current stage's clock runs out.
 *
 * Every branch here is a real way a nomination ends or stalls. `returned` is
 * the one that surprises players and is worth keeping: a nomination the Senate
 * never acted on is returned to the President rather than carried forward, and
 * a president who lets one sit has to start it again.
 */
export declare function resolveStage(campaign: Campaign, nomination: Nomination): StageResolution;
