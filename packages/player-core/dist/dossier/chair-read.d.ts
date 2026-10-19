import type { AttributeKey } from "@admin/engine";
import type { Person } from "@admin/world";
import { type ConsequenceSubject } from "./attribute-consequence";
export type ReadTone = "good" | "watch" | "bad";
/** How one reading draws as a pip: graded readings by their band, ambition by where it sits against the mark. */
export type PipTone = "good" | "fair" | "watch" | "bad" | "pressure-low" | "pressure-near" | "pressure-past";
export type ReadPip = {
    readonly key: AttributeKey;
    readonly label: string;
    readonly word: string;
    readonly tone: PipTone;
    /** What this reading moves for an officer in the simulation. */
    readonly consequence: string;
};
export type ChairRead = {
    readonly tone: ReadTone;
    /** The read in a word or two: "Sound", "Loyalty soft". */
    readonly word: string;
    /** Why the read says what it does, in one sentence. */
    readonly reason: string;
    /** The readings the read is made of, in profile order: what decides whether a chair holds. */
    readonly pips: readonly ReadPip[];
    /** Readings on file that do not bear on whether the chair holds, said in the explanation only. */
    readonly others: readonly ReadPip[];
};
export declare function chairRead(person: Person, subject?: ConsequenceSubject): ChairRead;
