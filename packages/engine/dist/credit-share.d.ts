import type { Effect } from "./effects.js";
import type { Bill, Campaign } from "./state.js";
/**
 * The share of a law's favorable movement that goes to the member instead.
 *
 * Under half, because the President still signs it and the coverage still
 * leads with the White House; a named co-author takes a real slice of the
 * story, not most of it.
 */
export declare const SHARED_CREDIT_FRACTION = 0.3;
/** A law's domestic effects with the shared credit taken out of the favorable part. Unchanged when nothing was shared. */
export declare function withSharedCredit(campaign: Campaign, bill: Bill, effects: readonly Effect[]): readonly Effect[];
