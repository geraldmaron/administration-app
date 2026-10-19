import { type Campaign } from "@admin/engine";
import type { PersonId } from "@admin/world";
import { type CourtPipeline } from "./court-overview";
export type CourtLane = keyof CourtPipeline;
export type CourtSystemCase = {
    readonly id: string;
    readonly title: string;
    readonly href: string;
    readonly lane: CourtLane;
    /** The circuit the district forum sits in; absent until the forum is recorded. */
    readonly circuit?: string;
    readonly state?: string;
    readonly forum: string;
    /** The next step on the court's calendar. */
    readonly next: CourtDate;
    /** The President's own deadline to answer, when the case is waiting on one. */
    readonly response?: CourtDate;
    /** A stay application waits on the court with no decision date set. */
    readonly stayPending: boolean;
};
export type CourtDate = {
    readonly turn: number;
    readonly date: string;
    readonly weeks: number;
};
export type CourtEventKind = "step" | "argument" | "opinion-target" | "response";
export type CourtEvent = CourtDate & {
    readonly kind: CourtEventKind;
    readonly caseId: string;
    readonly title: string;
    readonly href: string;
};
export type CourtCircuit = {
    readonly name: string;
    readonly states: readonly string[];
    readonly democratic: number;
    readonly republican: number;
    readonly vacant: number;
    /** Democratic minus Republican appointees over seats filled, from -1 to 1; absent with no seat filled. */
    readonly margin?: number;
    readonly caseIds: readonly string[];
};
export type CourtJustice = {
    readonly seat: number;
    readonly name: string;
    readonly vacant: boolean;
    readonly chief: boolean;
    readonly lean?: number;
    readonly age?: number;
    readonly tenure?: number;
    readonly href?: string;
    readonly personId?: PersonId;
    readonly pending?: string;
};
export type AgreementCell = {
    readonly together: number;
    readonly shared: number;
};
export type CourtSystem = {
    readonly cases: readonly CourtSystemCase[];
    readonly lanes: CourtPipeline;
    readonly decided: readonly {
        readonly title: string;
        readonly href: string;
        readonly ruled: string;
        readonly split?: string;
        readonly upheld: boolean;
    }[];
    readonly events: readonly CourtEvent[];
    readonly circuits: readonly CourtCircuit[];
    readonly justices: readonly CourtJustice[];
    readonly majority: number;
    /** Agreement between two seated justices, keyed by both ids in either order; only cases where both voted count. */
    readonly agreement: ReadonlyMap<string, AgreementCell>;
    /** Whether any two sitting justices have a recorded vote in common. */
    readonly agreementRecorded: boolean;
    readonly solicitorGeneral: {
        readonly standing: number;
        readonly assessment: "strained" | "mixed" | "strong";
    };
    /** The Court's October terms that overlap the coming year, October 1 to June 30. */
    readonly terms: readonly {
        readonly label: string;
        readonly start: CourtDate;
        readonly end: CourtDate;
    }[];
    /** The first of each month in the coming year, placed on its week, to label the calendar. */
    readonly months: readonly {
        readonly label: string;
        readonly weeks: number;
    }[];
};
/** Weeks of the calendar the courts view looks ahead. */
export declare const COURT_HORIZON_WEEKS = 52;
export declare const agreementKey: (first: string, second: string) => string;
export declare function courtSystem(campaign: Campaign): CourtSystem;
