import { type Campaign, type Pledge } from "@admin/engine";
import type { AttentionItem } from "./attention-row";
/** How far ahead an open promise earns a line in the week ahead: a first-hundred-days promise from the oath, with room to spare. */
export declare const PLEDGE_AHEAD_DAYS = 120;
export declare function pledgeItem(campaign: Campaign, pledge: Pledge): AttentionItem;
/** An open promise further out than its warning window, as a line in the week ahead. It never stops the week. */
export declare function pledgeAheadItem(campaign: Campaign, pledge: Pledge): AttentionItem;
/**
 * Every open pledge inside its warning window, as a row the Desk stops for,
 * and every one due inside the next four months beyond it, as a line in the
 * week ahead. It reads the Record's own selector, so the Desk and the Promises
 * list agree on which pledges are close.
 */
export declare function pledgeItems(campaign: Campaign): readonly AttentionItem[];
