/**
 * Ambient calendar rows and one state opposition.
 *
 * Calendar releases, foreign selections and political opposition do not pause the clock.
 * Every release of the week just run is listed on its own date with the figure
 * it printed; a market crash has its own row (`attention-markets.ts`).
 */
import { type Campaign } from "@admin/engine";
import type { AttentionItem } from "./attention-row";
/** Releases, a due selection, and at most one state opposition. */
export declare function briefAttentionItems(campaign: Campaign): readonly AttentionItem[];
