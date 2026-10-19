import type { NationId } from "@admin/world";
import { type Campaign, type Conflict } from "./state.js";
/** Every live war the nation fights in, as a principal or as a joiner on either side. */
export declare function conflictsAsParty(campaign: Campaign, nation?: NationId): readonly Conflict[];
/** Whether the nation is a party to any live war, joined or principal. */
export declare function atWarAsParty(campaign: Campaign, nation?: NationId): boolean;
/**
 * Whether the President's own country is defending a war on its own soil. A war
 * it is prosecuting abroad, or one it joined, is not an invasion.
 */
export declare function homelandInvaded(campaign: Campaign): boolean;
