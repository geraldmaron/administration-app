import { type Campaign } from "@admin/engine";
import { type EndingKind } from "./finale-copy";
export type LegacyMarkKind = "law" | "election" | "removal" | "war" | "pledge";
export type LegacyTone = "favorable" | "adverse" | "neutral";
export type LegacyMark = {
    readonly key: string;
    readonly kind: LegacyMarkKind;
    /** Days from the oath. */
    readonly at: number;
    readonly date: string;
    readonly label: string;
    readonly tone: LegacyTone;
};
export type LegacyPoint = {
    readonly label: string;
    readonly at: number;
    readonly value: number;
};
export type LegacyWar = {
    readonly key: string;
    readonly name: string;
    readonly outcome: string;
    readonly tone: LegacyTone;
};
export type LegacyReading = {
    readonly ending: EndingKind;
    readonly from: string;
    readonly to: string;
    /** Days from the oath to the last day the record reaches. */
    readonly span: number;
    readonly timelineLine: string;
    readonly marks: readonly LegacyMark[];
    readonly approval: readonly LegacyPoint[];
    readonly unemployment: readonly LegacyPoint[];
    readonly inflation: readonly LegacyPoint[];
    readonly countryLine: string;
    readonly laws: {
        readonly line: string;
        readonly titles: readonly string[];
    };
    readonly promises: {
        readonly line: string;
        readonly kept: number;
        readonly broken: number;
        readonly open: number;
    };
    readonly wars: {
        readonly line?: string;
        readonly list: readonly LegacyWar[];
    };
    readonly record: {
        readonly unauthorizedForce: number;
        readonly struckDownOrders: number;
        readonly overriddenVetoes: number;
        readonly removalSteps: number;
    };
    readonly closing: string;
};
/** The record a finished presidency leaves. Undefined while the President is in office. */
export declare function legacyReading(campaign: Campaign): LegacyReading | undefined;
