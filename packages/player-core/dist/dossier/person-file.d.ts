import { type Campaign, type Confidence } from "@admin/engine";
import type { Person } from "@admin/world";
import { type AssessmentReading, type AssessmentWatch } from "./assessment-profile.js";
import { type PersonDossier } from "./person-dossier.js";
import { type PersonConnectionRow } from "./person-network.js";
import type { LeverSeat } from "./person-lever.js";
export type ReadingTrend = "rising" | "falling";
export type PersonReading = AssessmentReading & {
    /** Which of four bands it falls in, lowest 0; for ambition, where it sits against the mark. */
    readonly band: 0 | 1 | 2 | 3;
    readonly confidence?: Confidence;
    readonly basis?: string;
    readonly trend?: ReadingTrend;
    readonly trendText?: string;
};
export type CareerEntry = {
    readonly key: string;
    readonly when: string;
    readonly text: string;
    /** A Record entry the line opens, for what happened in this administration. */
    readonly eventId?: string;
};
export type PersonFile = {
    readonly person: Person;
    readonly age: number;
    readonly dossier: PersonDossier;
    /** Their chair or station, in one line under the name. */
    readonly role: string;
    /** Where the map frames them: their office's headquarters, their state or their capital. */
    readonly camera: string;
    readonly readings: readonly PersonReading[];
    readonly watch?: AssessmentWatch;
    readonly career: readonly CareerEntry[];
    readonly circle: readonly PersonConnectionRow[];
    /** The chair the President could empty, where there is one. */
    readonly seat?: LeverSeat;
};
/** A person's whole file, or undefined for an id this campaign does not know. */
export declare function personFile(campaign: Campaign, personId: string): PersonFile | undefined;
