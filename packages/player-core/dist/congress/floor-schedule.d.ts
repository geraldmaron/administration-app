import { type Bill, type BillSponsor, type BillStage, type Campaign, type ChamberVote } from "@admin/engine";
import { type MetricStance } from "../format/figures.js";
/** A chamber as a heading or a count names it. */
export declare const CHAMBER_TITLE: {
    readonly house: "House";
    readonly senate: "Senate";
};
export type FloorCount = {
    readonly chamber: ChamberVote["chamber"];
    readonly name: string;
    readonly yeas: number;
    readonly required: number;
    readonly seats: number;
    readonly passed: boolean;
    readonly supportKnown?: boolean;
};
export type FloorRow = {
    readonly id: string;
    readonly title: string;
    readonly href: string;
    readonly sponsor: string;
    readonly stageName: string;
    /** One line on where it stands and what it faces. */
    readonly line: string;
    /** For a bill in the chambers, the floor count; for one on the desk, the override count. */
    readonly counts: readonly FloorCount[];
    /** Whether that count carries: for a desk bill, whether a veto would be overridden. */
    readonly carries: boolean | undefined;
    readonly stance: MetricStance;
};
export type FloorGroupKey = "desk" | BillStage;
export type FloorGroup = {
    readonly key: FloorGroupKey;
    readonly title: string;
    readonly rows: readonly FloorRow[];
};
export declare const FLOOR_GROUP_TITLE: Readonly<Record<FloorGroupKey, string>>;
/** Whose bill it is, the way a whip would say it. */
export declare function sponsorWords(campaign: Campaign, sponsor: BillSponsor): string;
/**
 * Congress's floor schedule: the bills awaiting the President's signature and
 * every bill in the chambers by the stage it has reached, furthest along first.
 */
export declare function floorSchedule(campaign: Campaign): readonly FloorGroup[];
export type PipelineStep = {
    readonly key: string;
    readonly label: string;
    readonly state: "done" | "current" | "ahead";
};
/** Where a bill is on the road from referral to the statute book. */
export declare function billPipeline(bill: Bill): readonly PipelineStep[];
/** Bills that have left the chambers this term, newest first, for the floor's own record. */
export declare function settledBills(campaign: Campaign, limit?: number): readonly FloorRow[];
