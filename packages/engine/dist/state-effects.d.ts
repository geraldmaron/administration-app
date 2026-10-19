import type { GrievanceMark, PendingClaim, StateDelegation, GovernorStanding, StateRuntime } from "./state.js";
/**
 * The most one answer may move a governor's standing toward or away from the
 * administration, on the 0..1 disposition scale. A planning value, not a
 * fitted one. The answer also leaves a tilt the governor remembers
 * (`GovernorStanding.answerTilt`), which moves where the statehouse settles and
 * fades, so an answer is felt for months rather than for the fortnight the
 * statehouse's own drift would take to erase a bare step. The balance run sizes
 * both.
 */
export declare const GOVERNOR_STANDING_STEP_CAP = 0.04;
/** The most a governor's remembered tilt may hold, either way: three capped answers' worth, so no run of answers buys a statehouse. */
export declare const GOVERNOR_TILT_CAP = 0.12;
export type StateGeographyOps = {
    /**
     * A signed move of the seated governor's disposition. Relative rather than a
     * replacement standing, so an answer that waited on the desk cannot write
     * back a governor who has since been replaced. Clamped to
     * `GOVERNOR_STANDING_STEP_CAP` and to 0..1 here, and ignored with no governor.
     */
    readonly governorShift?: number;
    /** Appended. See the module comment for the two permitted writers. */
    readonly addMark?: GrievanceMark;
    /** Whole-array replacement — the neglect and decay phases' own tool, not a way around the two-writer rule above: every entry it carries must already satisfy it. */
    readonly replaceMarks?: readonly GrievanceMark[];
    /** Appended; a claim already pending under the same signature is replaced rather than duplicated, honoring PendingClaim's one-open-claim-per-signature rule. */
    readonly addClaim?: PendingClaim;
    readonly replaceClaims?: readonly PendingClaim[];
    readonly setDelegation?: StateDelegation;
    readonly setGovernor?: GovernorStanding;
    readonly setStaffordRequest?: StateRuntime["staffordRequest"];
    readonly setStaffordDeclaration?: StateRuntime["staffordDeclaration"];
    readonly setElectionAccess?: StateRuntime["electionAccess"];
};
/** Merges a StateEffect's geography operations onto one state's runtime. */
export declare function applyStateGeography(current: StateRuntime, ops: StateGeographyOps): StateRuntime;
