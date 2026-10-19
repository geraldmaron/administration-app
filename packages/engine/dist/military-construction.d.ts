import { type Campaign } from "./state.js";
import type { StateId } from "@admin/world";
import type { MilitaryConstructionProject } from "./state-orders.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import type { TurnPhase } from "./turn-loop.js";
export type MilitaryConstructionProjectEffect = {
    readonly kind: "militaryConstructionProject";
    readonly set: MilitaryConstructionProject;
};
/** Congress names the project and its money when an appropriation becomes law. */
export declare function militaryConstructionAppropriation(campaign: Campaign, billId: string, slug: string, name: string, shareOfGdp: number, hostState?: StateId): MilitaryConstructionProject;
export declare function applyMilitaryConstructionProject(state: Campaign, effect: MilitaryConstructionProjectEffect): Campaign;
/** A live declaration can still support new emergency contracts, subject to court relief. */
export declare function constructionAuthorityAvailable(campaign: Campaign, order: ExecutiveOrderRecord): boolean;
/** Commit enacted balances, then pay only commitments actually made. */
export declare const militaryConstructionPhase: TurnPhase;
