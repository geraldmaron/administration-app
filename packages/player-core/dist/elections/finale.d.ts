import { type Campaign, type Chamber, type ChamberComposition, type GameDate, type StateCall, type UsMajorParty } from "@admin/engine";
import { type RaceOpponent } from "./race";
import { type EndingKind } from "./finale-copy";
export * from "./race";
export * from "./legacy";
export * from "./statehouses";
export { REELECTED_LINE, type EndingKind, type SeasonStage } from "./finale-copy";
export type FinaleContest = {
    readonly share: number;
    readonly electoralVotes: number;
    readonly opponentVotes: number;
    readonly electoralMajority: number;
    readonly calls: readonly StateCall[];
    readonly opponent?: RaceOpponent;
    /** The night's own sentence, as the result filed it. */
    readonly summary: string;
    readonly won: boolean;
};
export type FinaleChamber = {
    readonly chamber: Chamber;
    readonly name: string;
    readonly composition: ChamberComposition;
    /** The administration's party, whose seats `composition.administration` counts. */
    readonly anchor: UsMajorParty;
    readonly other: UsMajorParty;
    /** Seats the last election moved toward the administration; negative is lost. */
    readonly swing?: number;
};
export type FinaleSuccessor = {
    readonly id: string;
    readonly name: string;
    readonly from: "vice-president" | "speaker";
    readonly lines: readonly string[];
};
export type FinaleReading = {
    readonly ending: EndingKind;
    readonly title: string;
    /** The day the presidency ends, as a date a reader says. */
    readonly when: string;
    readonly opening: string;
    /** The engine's own account of how it ended, where it kept one. */
    readonly account?: string;
    readonly closing: string;
    readonly contest?: FinaleContest;
    readonly chambers: readonly FinaleChamber[];
    readonly successor?: FinaleSuccessor;
    /** Kept for the readers that only need names. */
    readonly opponent?: string;
};
/** The day the presidency ends: noon on the next Inauguration Day, or the day the Senate convicted. */
export declare function finaleDate(campaign: Campaign, ending: EndingKind): GameDate;
/** The chambers as the next President meets them: the seating the last November ordered, if it is still owed. */
export declare function finaleChambers(campaign: Campaign): readonly FinaleChamber[];
/** The ending once the presidency is over. Undefined while the President is in office. */
export declare function finaleReading(campaign: Campaign): FinaleReading | undefined;
