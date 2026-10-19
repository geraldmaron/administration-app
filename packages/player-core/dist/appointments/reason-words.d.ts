import type { PoolReason } from "@admin/engine";
/** One reason as a sentence. */
export declare function reasonWords(reason: PoolReason): string;
/** The one-line case for a nominee: the two heaviest reasons. */
export declare function whyLine(reasons: readonly PoolReason[]): string;
