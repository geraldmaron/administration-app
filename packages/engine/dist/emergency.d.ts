import type { StateId } from "@admin/world";
import type { Campaign, ConditionKind, NationCondition } from "./state.js";
import type { AuthorityClock, DeclaredEmergency, EmergencyScope } from "./state-emergency.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
/**
 * Weeks a declaration stands before it lapses unrenewed.
 *
 * A term is 208 turns and this is 52, so a full term holds at most four
 * renewals: four public moments of choosing not to give the power back. That is
 * the mechanic. Declaring is cheap and popular; what costs is staying declared.
 */
export declare const EMERGENCY_RENEWAL_TURNS = 52;
/** Standing charged per week a declaration stands, before the compounding below. */
export declare const EMERGENCY_WEEKLY_STANDING_COST = 0.0015;
/**
 * How much the weekly cost grows per additional week the declaration stands.
 *
 * Compounding is the whole design. A flat rent would make a standing emergency
 * a fixed line item a player stops reading; a rising one means the question
 * "when do I end this" gets louder the longer it goes unanswered.
 */
export declare const EMERGENCY_COST_COMPOUNDING = 0.02;
export declare function emergencyId(scope: EmergencyScope, cause: DeclaredEmergency["cause"], turn: number): string;
export declare function emergencyCauseLabel(cause: DeclaredEmergency["cause"]): string;
export declare function isStanding(emergency: DeclaredEmergency): boolean;
export type EmergencyReading = DeclaredEmergency & {
    readonly clockReading: {
        readonly turn: number;
        readonly daysLeft: number;
        readonly presidentialRenewal: boolean;
    };
};
export declare function selectDeclaredEmergencies(campaign: Campaign): readonly EmergencyReading[];
/**
 * Weeks before the anniversary in which the continuation may be published.
 *
 * Ninety days, in the weeks this game runs on. The notice is a public act with
 * a season on it rather than a switch: a president cannot quietly reset the
 * clock the week after declaring, so the choice to keep the power arrives on a
 * date the country can see coming.
 */
export declare const EMERGENCY_NOTICE_TURNS = 13;
/** Whether a declaration has gone past its renewal window and lapsed. */
export declare function hasLapsed(emergency: DeclaredEmergency | EmergencyReading, turn: number, campaign?: Campaign): boolean;
/** Weeks until this declaration lapses unrenewed. Negative once it has. */
export declare function weeksToLapse(emergency: DeclaredEmergency | EmergencyReading, turn: number): number;
/** Whether the continuation notice is open this week. */
export declare function renewalIsOpen(emergency: DeclaredEmergency | EmergencyReading, turn: number): boolean;
/**
 * Whether a declaration authorizes an act against this state.
 *
 * A national declaration reaches everywhere; a state declaration reaches its
 * own state and nowhere else. Asked with no state, the question is whether any
 * declaration is in force at all.
 */
export declare function authorizes(emergency: DeclaredEmergency, state?: StateId): boolean;
/**
 * The replacement for the ambient `inEmergency`.
 *
 * Takes an optional state so an order aimed at one place cannot be authorized
 * by a declaration covering a different one.
 */
export declare function underDeclaredEmergency(campaign: Campaign, state?: StateId): boolean;
export type DeclarationRefusal = {
    readonly ok: false;
    readonly reason: string;
};
/**
 * A packet rather than loose effects, for the same reason every other act the
 * president can take hands one back: `apply()` is the one write path onto the
 * ledger, and a caller assembling its own narration would be a second account
 * of what the administration did.
 */
export type DeclarationResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | DeclarationRefusal;
/**
 * Declare an emergency over a condition that is actually running.
 *
 * Refuses without a cause on the ground. A president who could declare an
 * emergency over nothing would have the ambient boolean back with an extra
 * button in front of it.
 */
export declare function declareEmergency(campaign: Campaign, scope: EmergencyScope, cause: ConditionKind, armedForcesConflictId?: string): DeclarationResult;
/** The national declaration names the active conflict whose defense requires armed forces. */
export declare function declareArmedForcesEmergency(campaign: Campaign, conflictId: string): DeclarationResult;
/** End a declaration the president is holding. The act of giving the power back. */
export declare function endEmergency(campaign: Campaign, id: string): DeclarationResult;
/**
 * Renew a declaration that would otherwise lapse.
 *
 * The anniversary continuation: the power does not carry itself, and choosing
 * to keep it is a notice published in public rather than a silence.
 */
export declare function renewEmergency(campaign: Campaign, id: string): DeclarationResult;
/** Conditions a declaration of this scope could honestly be declared over. */
export declare function liveCauses(campaign: Campaign, scope: EmergencyScope): readonly NationCondition[];
/**
 * What one standing declaration costs the administration this week.
 *
 * Rises with the weeks it has stood, so an emergency nobody ends becomes the
 * loudest line on the ledger rather than a rounding error.
 */
export declare function weeklyStandingCost(emergency: DeclaredEmergency, turn: number): number;
/**
 * The weekly price of every standing declaration, and the lapse of any that
 * went unrenewed.
 *
 * This is where the design lives. Declaring is cheap and popular; the cost is
 * carried by the weeks afterward, rising as they accumulate, so a president who
 * declares an emergency and never ends it is paying more for it every week and
 * can see the number. A declaration past its renewal window lapses on its own —
 * the power is not held by inertia.
 */
export declare const emergencyPhase: TurnPhase;
export declare function authorityDeadline(campaign: Campaign, clock: AuthorityClock): Campaign["calendar"];
export declare function authorityHasExpired(campaign: Campaign, clock: AuthorityClock, now?: import("./state-campaign.js").GameDate): boolean;
export declare function emergencyAuthorityClock(campaign: Campaign, emergency: DeclaredEmergency): AuthorityClock;
export declare function emergencyExpiryPhase(campaign: Campaign): readonly EffectPacket[];
export declare function emergencyLegislationEffects(campaign: Campaign, target: string | undefined, action: "terminate" | "renew"): readonly Effect[];
