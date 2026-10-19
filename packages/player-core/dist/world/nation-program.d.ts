import { type Campaign, type PolicyDomain } from "@admin/engine";
import type { NationId } from "@admin/world";
export type ProgramRow = {
    readonly domain: PolicyDomain;
    readonly domainName: string;
    readonly stanceName: string;
    readonly summary: string;
};
export type ProgramChange = {
    readonly turn: number;
    readonly headline: string;
    /** "This week", "Last week", "5 weeks ago". */
    readonly when: string;
};
export type NationProgram = {
    readonly rows: readonly ProgramRow[];
    readonly lastChange?: ProgramChange;
    /** Weeks until it next reviews the program; 0 when that is this week. */
    readonly reviewInWeeks: number;
};
/** The program row on a foreign country's file; undefined for the player's own government or an unknown id. */
export declare function nationProgram(campaign: Campaign, nation: NationId): NationProgram | undefined;
