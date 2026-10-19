import { type AttentionMatter } from "@admin/engine";
import type { StopBrief } from "./stop-brief";
/** How long the world ran, in the unit a player thinks in: whole weeks when it ran whole weeks, else days. */
export declare function spanWords(brief: Pick<StopBrief, "elapsedDays">): string;
/** The stop's reason as one sentence. */
export declare function stopWords(brief: Pick<StopBrief, "stopReason" | "stop">): string;
/**
 * Where a matter is answered, among the Brief's own screens: a decision on its
 * decision screen, a case or a statutory clock on its clock screen, a story on
 * its scandal screen. Anything else opens where its row says it does.
 */
export declare function matterDoor(matter: Pick<AttentionMatter, "id">, fallback?: string): string | undefined;
export type StopLine = {
    readonly id: string;
    readonly title: string;
    readonly reason: string;
    readonly urgency: AttentionMatter["urgency"];
    readonly href?: string;
};
/** What a run stopped on, each with the screen that answers it. */
export declare function stopLines(brief: Pick<StopBrief, "stop">, hrefOf?: (id: string) => string | undefined): readonly StopLine[];
