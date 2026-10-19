import type { Campaign, GameDate } from "@admin/engine";
import type { MetricStance } from "../format/figures";
import type { SummonsUrgency, SummonsWindow } from "./types";
export type RunningClockRow = {
    readonly id: string;
    readonly title: string;
    /** The clock's own summons. */
    readonly href: string;
    readonly due?: GameDate;
    readonly urgency?: SummonsUrgency;
    /** The clock in one line and its headline figure, from its composed brief. */
    readonly line: string;
    readonly figure: string;
    readonly stance: MetricStance;
    /** The window a rule sets, where one does: only these draw a countdown. */
    readonly window?: SummonsWindow;
};
export declare function runningClocks(campaign: Campaign): readonly RunningClockRow[];
