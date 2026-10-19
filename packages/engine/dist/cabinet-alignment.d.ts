import type { PersonId, RoleId } from "@admin/world";
import type { DecisionStamp } from "./willingness.js";
import { type Campaign } from "./state.js";
/**
 * The ideology gap between two Secretaries in a founded cabinet, the median and
 * the 75th percentile over every Secretary pair the balance seeds found for all
 * three parties. A gap is read in units of the distance between the two, so a
 * pair at the wide quarter of a real cabinet reads one unit apart however
 * clustered cabinets are. Pinned by a test that recomputes both.
 */
export declare const GAP_MEDIAN = 0.035;
export declare const GAP_WIDE = 0.0483;
/** Half a year, the same stretch a Secretary holds being overruled against the President. */
export declare const RECORD_MEMORY_TURNS = 26;
/** The system tag a leak aimed at a colleague carries, beside "cabinet" and "leak". */
export declare const RIVAL_LEAK_SYSTEM = "rival";
/** What two people have said in the room, side by side, over the last half year. */
export type TieRecord = {
    /** Decisions where both took a side and it was the same side. */
    readonly agreed: number;
    /** Decisions where both took a side and they were opposite sides. */
    readonly opposed: number;
    /** What the record adds to the standing, signed. */
    readonly term: number;
};
/** What each reading adds to a tie's standing, signed; the standing is their sum on `TIE_BASE`, clamped. */
export type TieTerms = {
    /** How far apart they sit on the issues, against a founded cabinet's own spread. */
    readonly ideology: number;
    /** Temperaments that clash or click. */
    readonly temperament: number;
    /** Departments that answer for the same crises. */
    readonly turf: number;
    /** Two bold Secretaries competing for the President's ear. */
    readonly ambition: number;
    /** One of them leads a rival faction. */
    readonly faction: number;
    /** The sides they have taken in the room lately. */
    readonly record: number;
};
export type CabinetTie = {
    readonly a: PersonId;
    readonly b: PersonId;
    readonly roleA: RoleId;
    readonly roleB: RoleId;
    /** -1 (cannot be in a room together) to 1 (natural allies). */
    readonly standing: number;
    readonly record: TieRecord;
    readonly terms: TieTerms;
};
export type TieReading = "allied" | "workable" | "strained" | "opposed";
export declare function tieReading(standing: number): TieReading;
/** What two people have said side by side in the room over the last half year. */
export declare function tieRecordBetween(campaign: Campaign, a: PersonId, b: PersonId): TieRecord;
/**
 * Every tie one seated minister has with the rest of the room, strongest
 * feeling first.
 *
 * The player's own chair is included: the president sits in this cabinet, and
 * whether a Secretary can work with *them* is the tie that decides whether the
 * rest of the graph matters.
 */
export declare function selectCabinetTies(campaign: Campaign, person: PersonId): readonly CabinetTie[];
/**
 * The same ties with the President's chair left out, for the rules that act on
 * them: a Secretary aims a leak at a colleague, and a room is split between
 * colleagues. The President is never one side of a feud a rule can act on.
 */
export declare function selectSecretaryTies(campaign: Campaign, person: PersonId): readonly CabinetTie[];
/** Every pair of seated Secretaries, each pair once, in the order the cabinet seats them. */
export declare function selectSecretaryPairs(campaign: Campaign): readonly CabinetTie[];
/** A leak a Secretary aimed at a colleague, as the record kept it. */
export type AimedLeak = {
    readonly turn: number;
    readonly leaker: PersonId;
    readonly target: PersonId;
    readonly decision?: DecisionStamp;
};
/**
 * The leaks aimed at a colleague over the last half year that this person was
 * either side of, newest first: the record a cabinet chart shows beside a feud.
 */
export declare function selectAimedLeaks(campaign: Campaign, person: PersonId): readonly AimedLeak[];
