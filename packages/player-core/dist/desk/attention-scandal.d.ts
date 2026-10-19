/**
 * Live scandals as Desk rows.
 *
 * One row per story still standing. A story stands for weeks, so a row that
 * asked for the President every week it stood would stop the clock on every
 * tick of a thirteen-week story: the row is soft only in the week the story
 * broke, and ambient after. A story with no date of its own (an authored flag
 * nothing stamped) has no week it broke, so it is never soft, whatever its age
 * reads as. A resolved story has no row.
 */
import { type Campaign, type Scandal } from "@admin/engine";
import { type AttentionItem } from "./attention-row";
/** The given stories as rows; a resolved story is omitted. */
export declare function scandalDeskItems(campaign: Campaign, scandals: readonly Scandal[]): readonly AttentionItem[];
/** One row per live story on the campaign's board. */
export declare function scandalAttentionItems(campaign: Campaign): readonly AttentionItem[];
