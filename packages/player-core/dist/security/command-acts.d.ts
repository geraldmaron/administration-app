import { type Campaign, type CombatantCommandId, type CommandPosture, type EffectPacket } from "@admin/engine";
import type { MilitaryBranch, NationId } from "@admin/world";
import { type ChoiceTable } from "../policy/choice-table.js";
export declare function postureOfChoice(choice: string): CommandPosture | undefined;
/** Raising or lowering a theater's posture, each read as its change from where it stands. */
export declare function postureChoices(campaign: Campaign, id: CombatantCommandId): ChoiceTable | undefined;
export declare function postureOrder(campaign: Campaign, id: CombatantCommandId, posture: CommandPosture): EffectPacket;
/** Relieving the commander, read as its change from today; the reason is the one the Record keeps. */
export declare function reliefChoices(campaign: Campaign, id: CombatantCommandId, rationale: string): ChoiceTable | undefined;
export declare function reliefOrder(campaign: Campaign, id: CombatantCommandId, rationale: string): EffectPacket;
/** The shares of a service's force a reassignment can move. */
export declare const REASSIGN_SHARES: readonly number[];
/** Moving a share of one service's force between two commands, read as its change from today's laydown. */
export declare function reassignChoices(campaign: Campaign, from: CombatantCommandId, to: CombatantCommandId, branch: MilitaryBranch, share: number): ChoiceTable;
export declare function reassignOrder(campaign: Campaign, from: CombatantCommandId, to: CombatantCommandId, branch: MilitaryBranch, share: number): EffectPacket;
/** Moving a country between commands' maps, read as its change from today's plan. */
export declare function amendChoices(campaign: Campaign, nation: NationId, to: CombatantCommandId, rationale: string): ChoiceTable;
export declare function amendOrder(campaign: Campaign, nation: NationId, to: CombatantCommandId, rationale: string): EffectPacket;
