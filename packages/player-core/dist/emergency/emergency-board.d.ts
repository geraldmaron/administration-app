import { type Campaign, type DeclaredEmergency, type EmergencyScope, type GameDate } from "@admin/engine";
import { type StateId } from "@admin/world";
import { type ConditionReading } from "../world/board-state";
/** Where a declaration reaches, in words. */
export declare function scopeWords(scope: EmergencyScope): string;
/** The camera key for a scope. */
export declare function scopeCamera(scope: EmergencyScope): string;
export type DeclarationRow = {
    readonly id: string;
    readonly scope: EmergencyScope;
    readonly where: string;
    readonly cause: DeclaredEmergency["cause"];
    readonly causeLabel: string;
    readonly declared: GameDate;
    readonly weeksStanding: number;
    /** Weeks left before it lapses unrenewed. */
    readonly weeksToLapse: number;
    readonly lapses: GameDate;
    /** Whether the continuation notice can be published this week. */
    readonly renewalOpen: boolean;
    /** Weeks until the notice window opens; zero once it has. */
    readonly renewalOpensIn: number;
    /** Standing it charges this week, as a positive fraction. */
    readonly weeklyCost: number;
    /** Whether a live condition is still running where it reaches. */
    readonly causeRunning: boolean;
    readonly camera: string;
};
/** Every declaration in force, the one closest to lapsing first. */
export declare function declarationRows(campaign: Campaign): readonly DeclarationRow[];
/** A scope a declaration over this condition could honestly take this week. */
export type DeclarableScope = {
    readonly scope: EmergencyScope;
    readonly where: string;
};
export type ConditionBoardRow = ConditionReading & {
    /** The scopes a declaration over it could take now; empty when none can. */
    readonly declarable: readonly DeclarableScope[];
    /** A declaration already reaches where it runs. */
    readonly covered: boolean;
    readonly camera: string;
};
export type GuardRow = {
    readonly state: StateId;
    readonly stateName: string;
    readonly conditionLabel: string;
    readonly forecast: string;
};
export type EmergencyBoard = {
    readonly declarations: readonly DeclarationRow[];
    /** Conditions the country is living through, worst first. */
    readonly conditions: readonly ConditionBoardRow[];
    /** One-afternoon events: dated, and never declarable once over. */
    readonly incidents: readonly ConditionBoardRow[];
    readonly guard: readonly GuardRow[];
    /** Standing every declaration charges this week, summed. */
    readonly weeklyCost: number;
};
export declare function emergencyBoard(campaign: Campaign): EmergencyBoard;
/** One state as the conditions lens reads it. */
export type StateConditionReading = {
    readonly state: StateId;
    /** The worst condition running there, 0..1; zero where nothing is. */
    readonly severity: number;
    readonly labels: readonly string[];
    readonly declared: boolean;
};
/**
 * Conditions by state, for the map: each state's worst running condition and
 * whether a declaration reaches it. A condition across the whole country is
 * felt in every state, so it counts everywhere.
 */
export declare function stateConditions(campaign: Campaign): ReadonlyMap<StateId, StateConditionReading>;
