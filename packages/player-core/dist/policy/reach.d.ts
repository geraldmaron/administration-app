import { type Campaign, type DomesticSignature } from "@admin/engine";
import type { CohortId } from "@admin/world";
export type ReachLine = {
    readonly cohort: CohortId;
    readonly name: string;
    readonly direction: "helps" | "costs";
    readonly weight: number;
};
/** The groups an act lands on, hardest first. Empty when it names no one in particular. */
export declare function reachByGroup(campaign: Campaign, signature: DomesticSignature): readonly ReachLine[];
/** One sentence for a desk row: who it helps and who it costs, the first few of each. */
export declare function reachSentence(lines: readonly ReachLine[]): string | undefined;
