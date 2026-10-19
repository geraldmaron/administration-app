import { type Campaign, type Commitment } from "@admin/engine";
import { type NationId } from "@admin/world";
import type { Stance } from "../reading";
export type OrgMember = {
    readonly nation: NationId;
    readonly name: string;
    readonly us: boolean;
    readonly stance: Stance | "unread";
    readonly word: string;
    /** Where the member sits on its four steps, as a fraction of the meter; 0 for an unread government. */
    readonly fraction: number;
    /** Fighting in a war right now. */
    readonly atWar: boolean;
};
export type OrgAlignment = {
    readonly counts: Readonly<Record<Stance | "unread", number>>;
    /** Share of the readable members that trust the United States or stand on the merits. */
    readonly warm: number;
    readonly readable: number;
    readonly word: string;
};
export type OrgCommitment = {
    readonly id: string;
    readonly line: string;
    readonly status: Commitment["status"];
    readonly toward: "body" | "member";
};
export type OrgCall = {
    readonly conflict: string;
    readonly ally: string;
    readonly aggressor: string;
    readonly answered: boolean;
};
export type OrgScreenReading = {
    readonly id: string;
    readonly name: string;
    readonly kind: string;
    readonly history: string;
    readonly trade?: string;
    readonly scope?: string;
    readonly usMember: boolean;
    readonly usRole: string;
    readonly members: readonly OrgMember[];
    readonly alignment: OrgAlignment;
    readonly commitments: readonly OrgCommitment[];
    readonly calls: readonly OrgCall[];
    /** The members in the map's set form: `nation:A|nation:B`. */
    readonly set: string;
};
/** The governments sitting in the body this week, as accessions and withdrawals have left its roster. */
export declare function orgMembersOf(campaign: Campaign, org: string): readonly NationId[];
/** One body's screen reading. Undefined for an id the dataset does not know. */
export declare function orgScreenReading(campaign: Campaign, id: string): OrgScreenReading | undefined;
