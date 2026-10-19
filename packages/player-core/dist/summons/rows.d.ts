import { type Campaign, type GameDate } from "@admin/engine";
import type { AttentionItem } from "../desk/attention-row";
import type { SummonsDue } from "./types";
/**
 * The countdown in words, day-precise where the statute is.
 *
 * A clock whose date has passed is running rather than owed: an appropriation
 * that lapsed, a treaty the Senate never took up and a closed government are
 * all counting up, and phrasing them as overdue deadlines would put a date on
 * something that has none.
 */
export declare function dueSentence(today: GameDate, due: SummonsDue): string;
/**
 * The headline figure: days inside a fortnight, weeks beyond it.
 *
 * The unit changes because the reading does. Six days and two days are a
 * different week's work and used to round to the same figure; three months and
 * fourteen weeks are the same fact and counting the days would be false
 * precision on a date nobody plans a Tuesday around.
 */
export declare function dueFigure(today: GameDate, due: SummonsDue): string;
export declare function summonsItems(campaign: Campaign): readonly AttentionItem[];
