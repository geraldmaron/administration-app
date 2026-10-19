import { type Campaign } from "@admin/engine";
import type { NationId } from "@admin/world";
import type { Stance } from "../reading";
import { type RecordRow } from "../record/record-entry";
import { type InFlight, type Mover } from "./world-board";
import type { WorldGovernment } from "./world-governments";
export type WarDeskRow = {
    readonly id: string;
    readonly href: string;
    readonly sides: readonly {
        readonly nation: NationId;
        readonly name: string;
        readonly role: "aggressor" | "defender";
    }[];
    /** Governments that joined after the opening, both sides together. */
    readonly joined: number;
    readonly intensity: number;
    readonly intensityText: string;
    readonly age: string;
    readonly youAreParty: boolean;
    /** US personnel hosted by the belligerents, in words; absent when none is. */
    readonly exposure: string | undefined;
};
/** Wars the United States fights first, then the hottest. */
export declare function worldWars(campaign: Campaign): readonly WarDeskRow[];
export type StanceTally = Readonly<Record<Stance | "unread", number>>;
export type StandingKpi = {
    /** Governments whose view of the United States the services can read. */
    readonly read: number;
    readonly total: number;
    readonly counts: StanceTally;
    /** The average of the read governments' trust: its band, and where it sits on the axis, 0..1. */
    readonly mean: {
        readonly stance: Stance;
        readonly word: string;
        readonly fraction: number;
    } | undefined;
    /** Four weeks' move in that average, in the same axis units; absent until the record reaches back. */
    readonly change4: number | undefined;
};
export type WorldKpis = {
    readonly wars: {
        readonly count: number;
        readonly withUs: number;
        readonly hottest: WarDeskRow | undefined;
    };
    readonly standing: StandingKpi;
    readonly treaties: {
        readonly inForce: number;
        readonly alliances: number;
        readonly awaiting: number;
        readonly alignedGovernments: number;
    };
    readonly pending: {
        readonly total: number;
        readonly byKind: Readonly<Record<InFlight["kind"], number>>;
    };
    readonly trade: {
        readonly topShare: number;
        readonly topText: string;
        readonly topNames: readonly string[];
        readonly measures: number;
        readonly expectedAnswers: number;
    };
    readonly intelligence: {
        readonly assessed: number;
        readonly unread: number;
        readonly total: number;
    };
};
export declare function tallyStances(governments: readonly WorldGovernment[]): StanceTally;
type TrustPoint = {
    readonly turn: number;
    readonly value: number;
};
/** The mean of the read governments' trust each closed week, oldest first, on the 0..1 axis. */
export declare function averageTrustSeries(campaign: Campaign, governments: readonly WorldGovernment[]): readonly TrustPoint[];
/** The six readings across the top of the World, each from the same rows the sections below draw. */
export declare function worldKpis(campaign: Campaign, governments: readonly WorldGovernment[], wars: readonly WarDeskRow[], flight: readonly InFlight[], series: readonly TrustPoint[]): WorldKpis;
export type StandingMoves = {
    /** Every Record entry that moved International Standing, newest first, each narrowed to that one reading. */
    readonly rows: readonly RecordRow[];
    readonly lifted: {
        readonly count: number;
        readonly text: string;
    };
    readonly cost: {
        readonly count: number;
        readonly text: string;
    };
};
/** What moved International Standing, from the Record, whoever acted. */
export declare function standingMoves(campaign: Campaign): StandingMoves;
export type WorldDesk = {
    readonly governments: readonly WorldGovernment[];
    readonly wars: readonly WarDeskRow[];
    readonly flight: readonly InFlight[];
    readonly movers: readonly Mover[];
    readonly kpis: WorldKpis;
    readonly trustSeries: readonly number[];
};
export declare const formatTrustBand: (fraction: number) => string;
/** One axis tick in the middle of each trust band, so a chart names every band once and never repeats a word. */
export declare const TRUST_BAND_TICKS: readonly number[];
/** Everything the World's overview draws, from one pass over the governments. */
export declare function worldDesk(campaign: Campaign, governments: readonly WorldGovernment[]): WorldDesk;
export {};
