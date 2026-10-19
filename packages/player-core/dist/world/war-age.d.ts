import { type Campaign, type Conflict, type GameDate } from "@admin/engine";
/**
 * How long a war has run, in the one sentence its file's standfirst carries
 * after the cause. A carried war with no date on record says nothing of its
 * age, because its cause already says it predates the oath.
 */
export declare function warAgeLine(campaign: Campaign, conflict: Conflict): string;
/**
 * The date a war's beat is filed under. A carried war's opening beats sit on
 * the turn before the first week, which the calendar would date a week before
 * the oath; they are what the administration found on taking office, so they
 * are dated to the oath.
 */
export declare function warBeatDate(campaign: Campaign, turn: number): GameDate;
