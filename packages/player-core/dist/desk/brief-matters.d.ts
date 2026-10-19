import { type AttentionMatter, type AttentionUrgency, type Campaign, type GameDate } from "@admin/engine";
import { type CastScenario } from "@admin/content";
import type { MetricStance } from "../format/figures";
import { type AttentionPolicySettings } from "./attention";
/**
 * A countdown, drawn only where a real window runs: a statute's, a case's own
 * clock, a decision's response window. `window` and `left` are in `unit`.
 */
export type MatterClock = {
    readonly label: string;
    readonly window: number;
    readonly left: number;
    readonly unit: "day" | "week";
    readonly due?: GameDate;
};
/** One row of what needs the President, in the order the Brief ranks them. */
export type BriefMatter = {
    readonly id: string;
    readonly kind: "decision" | "case" | "row";
    readonly kindLabel: string;
    /** The family's glyph name in the icon set, so the row is recognizable before it is read. */
    readonly kindIcon: string;
    readonly title: string;
    readonly reason: string;
    readonly urgency: AttentionUrgency;
    readonly stance: MetricStance;
    /** Whether it holds Continue right now. */
    readonly holds: boolean;
    readonly clock?: MatterClock;
    /** A standing matter's age instead of a countdown, where it has one. */
    readonly age?: string;
    readonly due?: GameDate;
    /** Where it is answered. */
    readonly href?: string;
    /** The map's framing for it, where it has a place. */
    readonly camera?: string;
    /** The region it happens in, which the map lifts, where it is one. */
    readonly selection?: string;
    /** The matter the Desk's put-off keys on, when it can be put off from its row. */
    readonly putOff?: AttentionMatter;
    /** The day a put-off would bring it back, so the control can say what it buys. */
    readonly putOffUntil?: GameDate;
};
/** Where a decision happens, as the map frames it: its US state, else its point, else its government. */
export declare function decisionCamera(cast: CastScenario): {
    readonly camera: string;
    readonly selection?: string;
};
/**
 * Everything waiting on the President, worst first: decisions, which always
 * hold the week, then every owed row in the order the engine's composer ranks
 * them, the three it presents before the ones queued behind, then the empty
 * seats still waiting on a nominee, then the stories still waiting for an
 * answer. Other ambient rows are not here; they reach the wire and the Record.
 */
export declare function briefMatters(campaign: Campaign, settings?: AttentionPolicySettings): readonly BriefMatter[];
/** What waits on the President, counted once for every place that shows the count. */
export type WaitingOnYou = {
    readonly matters: readonly BriefMatter[];
    readonly count: number;
    /** How many of them hold Continue right now. */
    readonly holding: number;
};
/**
 * The one count of what waits on the President. The Brief's lede, the rail's
 * badges, the bar's "waiting on you" and the bell's desk rows all read it, so
 * no two of them can ever name a different number for the same desk.
 */
export declare function waitingOnYou(campaign: Campaign, settings?: AttentionPolicySettings): WaitingOnYou;
