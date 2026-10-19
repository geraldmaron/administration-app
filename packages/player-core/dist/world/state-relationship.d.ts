import { type Campaign, type UsParty } from "@admin/engine";
import type { StateId } from "@admin/world";
export type RelationshipBand = "allied" | "cooperative" | "guarded" | "opposed";
export type StateRelationship = {
    readonly id: StateId;
    readonly governor?: {
        readonly person: string;
        readonly name: string;
        readonly party: UsParty;
        readonly partyWord: string;
    };
    /** 0..1 toward the administration; absent when no governor is seated. */
    readonly disposition?: number;
    readonly band?: RelationshipBand;
    /** The ordinal word: Allied, Cooperative, Guarded or Opposed; absent with no governor. */
    readonly word: string;
    /** What the standing means for an ask such as deploying the Guard. */
    readonly meaning: string;
    /** Whether the governor is below the line at which they go along with an ask. */
    readonly leansAgainst: boolean;
    readonly termEnds?: string;
    /** Requests and running conditions that call for a federal answer, requests first. */
    readonly needs: readonly {
        readonly cause: string;
        readonly title: string;
        readonly requested: boolean;
    }[];
    readonly needsCount: number;
    readonly declared: boolean;
    /** Acts open against the lead matter this week; zero when there is nothing to answer. */
    readonly actCount: number;
};
/** Where the President stands with one state: its governor, what it needs from Washington, and what can be done about it. */
export declare function stateRelationship(campaign: Campaign, id: StateId): StateRelationship | undefined;
