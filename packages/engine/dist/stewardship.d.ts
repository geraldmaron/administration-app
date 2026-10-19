import type { RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { InstrumentId } from "./instruments.js";
import type { ResolutionRequest } from "./resolution.js";
/** The classes a relevance set is declared for, so a check can iterate them without a second copy of the list. */
export declare const CLASSES_WITH_SEATED_STANDING: readonly string[];
/**
 * The seated chairs a scenario of this class is actually the business of.
 *
 * Deduplicated and ordered: a charter that runs two of the groups out of one
 * office seats that office once, at the highest standing it earned.
 */
export declare function classRoles(campaign: Campaign, scenarioClass: string | undefined): readonly RoleId[];
export declare function matchRole(roles: readonly RoleId[], hints: readonly string[]): RoleId | undefined;
/**
 * The chair that owns an instrument: the department the charter's table names,
 * filled or not, and by hint among the seated chairs where no table is written.
 */
export declare function domainRole(campaign: Campaign, instrument: InstrumentId): RoleId | undefined;
/**
 * The living minister running this instrument's department, if anyone is:
 * the confirmed Secretary, or the deputy acting in an empty chair. An acting
 * Secretary signs the department's orders, so the department's instrument
 * answers to them too rather than to nobody.
 */
export declare function ministerFor(campaign: Campaign, instrument: InstrumentId): PersonRuntime | undefined;
/**
 * The chair that spends one budget account, whether or not it is an instrument.
 *
 * The one resolver the appropriation asks, so a screen and the turn phase
 * cannot disagree about who is carrying a line.
 */
export declare function budgetChair(campaign: Campaign, account: InstrumentId | "domestic"): PersonRuntime | undefined;
/**
 * The multiplier a projection applies for the player's own government. NPC
 * nations run no modeled cabinet, so their attempts pass through unchanged —
 * the player's ministers must never price another nation's moves.
 */
export declare function stewardSway(campaign: Campaign, request: ResolutionRequest): number;
