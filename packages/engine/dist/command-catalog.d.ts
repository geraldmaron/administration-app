import type { MilitaryBranch } from "@admin/world";
export type CombatantCommandId = "CCMD-AFRICOM" | "CCMD-CENTCOM" | "CCMD-EUCOM" | "CCMD-INDOPACOM" | "CCMD-NORTHCOM" | "CCMD-SOUTHCOM" | "CCMD-SPACECOM" | "CCMD-CYBERCOM" | "CCMD-SOCOM" | "CCMD-STRATCOM" | "CCMD-TRANSCOM";
export type CommandOfficerSeed = {
    readonly name: string;
    readonly service: MilitaryBranch;
    readonly permanentGrade: string;
    /** Days already served in the chair at inauguration. A commander does not arrive with the president. */
    readonly tenureDays: number;
};
export type CombatantCommandDef = {
    readonly id: CombatantCommandId;
    readonly name: string;
    readonly abbr: string;
    readonly type: "geographic" | "functional";
    readonly headquarters: string;
    readonly mission: string;
    readonly commanderTitle: string;
    /** Shares of each service assigned here in peacetime. Every branch sums to 1 across the eleven. */
    readonly foundingAssignment: Readonly<Record<MilitaryBranch, number>>;
    readonly standingMissions: readonly string[];
    readonly incumbent: CommandOfficerSeed;
    /** Who takes acting command the afternoon the commander is relieved. */
    readonly deputy: CommandOfficerSeed;
};
export declare const COMBATANT_COMMANDS: readonly CombatantCommandDef[];
/**
 * Which command a country falls to by its region.
 *
 * A default and not a map: the exceptions below are the part a player can
 * change, and the part that has actually changed in the record.
 */
export declare const DEFAULT_AOR_BY_REGION: Readonly<Record<string, CombatantCommandId>>;
/**
 * The countries whose command is not the one their neighborhood implies.
 *
 * Every entry is a decision somebody took: Egypt is a Middle Eastern theater's
 * problem rather than Africa's, Turkey is NATO's rather than the Levant's, and
 * Pakistan sits with the Gulf rather than with India — which is exactly why
 * both India and Pakistan being one command's would be the wrong reading.
 */
export declare const AOR_EXCEPTIONS: Readonly<Record<string, CombatantCommandId>>;
