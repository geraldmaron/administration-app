import type { Campaign } from "./state.js";
/**
 * Move every figure's disposition and every promise onto the people they
 * belong to. A promise whose post nobody holds any longer has no member to
 * owe, and is the one thing a pre-v63 save can lose on the way in; a promise
 * did not record who it was made with, only where they sat.
 */
export declare function withTieLedger(campaign: Campaign): Campaign;
