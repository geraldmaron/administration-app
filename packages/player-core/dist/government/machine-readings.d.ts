import { type Campaign, type Chamber, type Confidence, type HillCaucus, type HillMember, type UsMajorParty } from "@admin/engine";
import { type MetricStance } from "../format/figures";
export type JudgedAttribute = "loyalty" | "competence" | "integrity" | "charisma";
export type AttributeJudgment = {
    readonly attribute: JudgedAttribute;
    readonly label: string;
    readonly word: string;
    readonly stance: MetricStance;
    /** Which of the four bands the reading falls in, lowest 0 to highest 3, for a mark that draws the band and not the figure. */
    readonly band: 0 | 1 | 2 | 3;
    readonly confidence: Confidence;
    /** What the confidence rests on, in the words a card prints beside it. */
    readonly basis: string;
};
/**
 * One person's reading as a band and a confidence.
 *
 * `contestedCalls` is how many contested decisions they have advised the
 * President on: none for a nominee or a newly seated secretary.
 */
export declare function judgeAttribute(attribute: JudgedAttribute, value: number, contestedCalls?: number): AttributeJudgment;
export type ChamberControl = {
    readonly chamber: Chamber;
    /** The party whose caucus holds the majority. Independents caucus with the Democrats. */
    readonly party: UsMajorParty;
    readonly caucus: HillCaucus;
    /** The major party the administration caucuses with: its own, or the nearest for an Independent President. */
    readonly anchor: UsMajorParty;
    /** The majority's floor leader: the Speaker in the House, the Majority Leader in the Senate. */
    readonly leader?: HillMember;
};
/** Which party holds a chamber and who leads its floor, counted the way the engine counts control. */
export declare function chamberControl(campaign: Campaign, chamber: Chamber): ChamberControl;
