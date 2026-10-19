import type { CourtCase, CourtProceeding, SolicitorGeneralEvent } from "./state-judiciary.js";
import { type CausalId } from "./causality.js";
import type { AccountCapRaise, Campaign, Commitment, FeedItem, FundingLapse, NationCondition, PendingRule, Pursuit } from "./state.js";
import type { DeclaredEmergency, ExternalThreatEmergency } from "./state-emergency.js";
import type { DecisionFraming } from "./press-framing.js";
/**
 * What every one of these records carries so the causal graph can reach it.
 *
 * The four families here are the campaign's multi-turn memory: a condition
 * that runs for eleven weeks, an emergency that outlives the crisis that
 * declared it, a commitment paid every turn until it is not. They are exactly
 * the records whose later weeks were unattributable — the phase that worsens a
 * condition in June holds the record and nothing else, so it could never point
 * at the week the condition opened.
 */
export type CausedRecord = {
    readonly id: string;
    readonly causedBy?: CausalId;
};
export type CommitmentEffect = {
    readonly kind: "commitment";
    readonly set: Commitment;
};
export type ConditionEffect = {
    readonly kind: "condition";
    readonly set: NationCondition;
};
export type PursuitEffect = {
    readonly kind: "pursuit";
    readonly set: Pursuit;
};
export type EmergencyEffect = {
    readonly kind: "emergency";
    readonly set: DeclaredEmergency;
};
export type ExternalEmergencyEffect = {
    readonly kind: "externalEmergency";
    readonly set: ExternalThreatEmergency;
};
export declare function applyCommitment(state: Campaign, effect: CommitmentEffect): Campaign;
export declare function applyCondition(state: Campaign, effect: ConditionEffect): Campaign;
export declare function applyPursuit(state: Campaign, effect: PursuitEffect): Campaign;
export declare function applyEmergency(state: Campaign, effect: EmergencyEffect): Campaign;
export declare function applyExternalEmergency(state: Campaign, effect: ExternalEmergencyEffect): Campaign;
export type PendingRuleEffect = {
    readonly kind: "pendingRule";
    readonly set: PendingRule;
};
export type CourtCaseEffect = {
    readonly kind: "courtCase";
    readonly set: CourtCase;
};
export type CourtProceedingEffect = {
    readonly kind: "courtProceeding";
    readonly set: CourtProceeding;
};
export type SolicitorGeneralEffect = {
    readonly kind: "solicitorGeneral";
    readonly event: SolicitorGeneralEvent;
};
export type CapRaiseEffect = {
    readonly kind: "capRaise";
    readonly set: AccountCapRaise;
};
export declare function applyCourtCase(state: Campaign, effect: CourtCaseEffect): Campaign;
export declare function applyCourtProceeding(state: Campaign, effect: CourtProceedingEffect): Campaign;
export declare function applySolicitorGeneral(state: Campaign, effect: SolicitorGeneralEffect): Campaign;
export declare function applyPendingRule(state: Campaign, effect: PendingRuleEffect): Campaign;
export declare function applyCapRaise(state: Campaign, effect: CapRaiseEffect): Campaign;
export type OrderFramingEffect = {
    readonly kind: "orderFraming";
    readonly id: string;
    readonly framing: DecisionFraming;
};
export declare function applyOrderFraming(state: Campaign, effect: OrderFramingEffect): Campaign;
export type FundingLapseEffect = {
    readonly kind: "fundingLapse";
    readonly set: FundingLapse;
};
/**
 * More weeks of government at the numbers already in force.
 *
 * A patch of one field rather than a whole `Congress` write, which is the
 * distinction that makes it safe to emit from an enactment: a bill's packet
 * already carries a `congress` effect for the disposition, built from the
 * campaign as it stood before the fold began, and a second whole-object write
 * in the same packet would silently undo whichever of the two landed first.
 *
 * The date is computed here, against the turn the enactment actually folds in,
 * because that is the day the money starts running again.
 *
 * `onPriorYear` goes true. A stopgap continues last year's appropriation; it
 * does not enact this administration's, and a government living six weeks at a
 * time is still a government with no budget of its own. A stopgap can now pass
 * before the book it extends has run out, so it has to say so itself: left to
 * the weekly lapse check, a chain of stopgaps each passed ahead of its deadline
 * would never read as a government without a budget.
 */
export type AppropriationEffect = {
    readonly kind: "appropriation";
    readonly fundTurns: number;
}
/** A fixed last turn rather than a span: the end of a fiscal year does not move with the week an act lands in. */
 | {
    readonly kind: "appropriation";
    readonly throughTurn: number;
};
export declare function applyFundingLapse(state: Campaign, effect: FundingLapseEffect): Campaign;
export declare function applyAppropriation(state: Campaign, effect: AppropriationEffect): Campaign;
export type FeedEffect = {
    readonly kind: "feed";
    readonly items: readonly FeedItem[];
};
export declare function applyFeed(state: Campaign, effect: FeedEffect): Campaign;
