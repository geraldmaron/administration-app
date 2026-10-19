import { type Campaign, type GameDate } from "@admin/engine";
export type ContinuationHorizon = {
    readonly title: string;
    readonly dueDate: GameDate;
};
/**
 * The nearest dated matter not already presented this week — the soonest
 * date Continue could run into. Undefined on a board with nothing dated
 * ahead, which is a true quiet stretch, not a gap in this reading.
 */
export declare function continuationHorizon(campaign: Campaign): ContinuationHorizon | undefined;
