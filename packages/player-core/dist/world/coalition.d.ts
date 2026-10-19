import { type Backer, type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
export type CoalitionReading = {
    readonly backers: readonly Backer[];
    /** Partners who share a compact with you but are aligned with the target or share its bloc, so the engine counts them as reacting against. */
    readonly torn: number;
};
export declare function coalitionReading(campaign: Campaign, target: NationId, limit?: number): CoalitionReading;
