import { type NationId, type Organization } from "@admin/world";
import { type Campaign } from "./state.js";
export type CouncilMeasure = "procedural" | "recommendation" | "sanctions" | "authorize-force";
export type CouncilPosition = "for" | "against" | "abstain";
export type CouncilProposal = {
    readonly sponsor: NationId;
    readonly target?: NationId;
    readonly measure: CouncilMeasure;
    /** Governments party to the dispute, who must abstain on a recommendation. Defaults to the target. */
    readonly parties?: readonly NationId[];
};
export type CouncilReason = "adopted" | "vetoed" | "short-of-votes";
export type CouncilTally = {
    readonly for: number;
    readonly against: number;
    readonly abstain: number;
    readonly adopted: boolean;
    readonly reason: CouncilReason;
    /** Permanent members that voted no on a substantive question. Empty on a procedural one, which carries no veto. */
    readonly vetoedBy: readonly NationId[];
};
export type CouncilEffects = {
    readonly standing: "agenda" | "recommendation" | "binding-measures" | "authorization-of-force";
    /** Art. 25: members agree to carry out the Council's decisions. A recommendation is not one. */
    readonly bindsMembers: boolean;
    /** Art. 42: states may act. No state is obliged to, because the Art. 43 force agreements were never made. */
    readonly authorizesForce: boolean;
    readonly usDomesticAuthority: "none";
    readonly militaryOutcome: "none";
};
export type CouncilOutcome = CouncilTally & {
    readonly measure: CouncilMeasure;
    readonly positions: Readonly<Record<string, CouncilPosition>>;
    /** What an adopted resolution does; a failed one does nothing. */
    readonly effects: CouncilEffects | undefined;
};
export declare function councilEffects(measure: CouncilMeasure): CouncilEffects;
export declare function isSubstantive(measure: CouncilMeasure): boolean;
/** The Council as the registry holds it, or undefined where a dataset ships none. */
export declare function securityCouncil(): Organization | undefined;
/** Art. 27 on a set of positions: the count, the veto and whether the draft is adopted. */
export declare function tallyCouncil(rule: NonNullable<Organization["council"]>, measure: CouncilMeasure, positions: Readonly<Record<string, CouncilPosition>>): CouncilTally;
/** How one member votes: its own cause first, then a treaty partner's, then which of the two it would rather see prevail. */
export declare function councilPosition(campaign: Campaign, member: NationId, proposal: CouncilProposal): CouncilPosition;
/** The vote on a draft resolution, member by member in id order, with what an adopted one does. */
export declare function councilVote(campaign: Campaign, proposal: CouncilProposal): CouncilOutcome | undefined;
