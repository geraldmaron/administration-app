import { type Campaign, type CourtCase } from "@admin/engine";
import type { ProjectedEffect } from "../reading";
import { type DocketCase } from "./courts";
export type CaseMoment = {
    readonly date: string;
    readonly text: string;
};
export type CaseVoteRow = {
    readonly name: string;
    readonly seat: number;
    readonly vote: "strike" | "uphold";
    readonly href?: string;
};
/** A thing the President can do before the ruling that the bench will read on its day. */
export type CasePath = {
    readonly key: "statute" | "bench";
    readonly title: string;
    readonly detail: string;
    readonly href: string;
    readonly door: string;
};
export type CaseFile = DocketCase & {
    readonly summary: string;
    /** What a strike-down undoes, in the words the order's signing previewed. */
    readonly reversed: readonly ProjectedEffect[];
    /** Why nothing is undone, when a strike-down only cancels a rule not yet in force. */
    readonly reversedNote?: string;
    readonly unreversed?: string;
    readonly timeline: readonly CaseMoment[];
    readonly votes: readonly CaseVoteRow[];
    readonly circuitVotes?: readonly {
        readonly name: string;
        readonly vote: "strike" | "uphold";
        readonly href?: string;
    }[];
    readonly majorityAuthor?: string;
    readonly dissentAuthor?: string;
    readonly opinion?: CourtCase["opinion"];
    readonly paths: readonly CasePath[];
    readonly partyEffects?: readonly ProjectedEffect[];
};
/** The case behind an order record id, pending or ruled. */
export declare function caseFile(campaign: Campaign, id: string): CaseFile | undefined;
