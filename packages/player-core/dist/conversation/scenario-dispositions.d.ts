import { type Campaign, type Effect, type EffectPacket, type GameDate, type MetricSet, type OpinionDriver } from "@admin/engine";
import { type CastScenario } from "@admin/content";
/** The dispositions a decision takes without a reply; `act` is the reply itself. */
export type ScenarioDispositionKind = "defer" | "decline" | "allow-default";
/** What leaving the decision unanswered costs right now, read off the packet that would charge it. */
export type SilencePrice = {
    /** The silence was already charged this week, so leaving it now adds nothing. */
    readonly alreadyCharged: boolean;
    /** Each reading's move, as the ledger will record it. */
    readonly metrics: Partial<Record<keyof MetricSet, number>>;
    /** Each public judgment's move behind the approval figure. */
    readonly judgments: Partial<Record<OpinionDriver, number>>;
    /** The author's own sentence for what not deciding does. */
    readonly narration: string;
};
/**
 * The price of silence on this decision today. Applied to a copy of the
 * campaign, so the figures are the entry `apply()` will write: the readings'
 * move, approval settled from the judgments exactly as the ledger settles it,
 * and the judgments' own move as the entry records it.
 */
export declare function silencePrice(campaign: Campaign, cast: CastScenario): SilencePrice;
/**
 * The decision left unanswered, as the player acts: its silence charged once
 * (never twice in a week), then its case closed with the chosen disposition
 * and the desk closed for the week, as an answer closes it. Two packets,
 * because the charge is the world's and the closing is the President's.
 */
export declare function leaveUnansweredPackets(campaign: Campaign, cast: CastScenario, kind: Exclude<ScenarioDispositionKind, "defer">, narration: {
    readonly summary: string;
    readonly onCase: string;
}): readonly EffectPacket[];
/** Keep the authored answer and its underlying lower-court response on one return date. */
export declare function scenarioPutOffEffects(campaign: Campaign, cast: CastScenario, until: GameDate): readonly Effect[];
/** The packets one disposition commits, in order, or the reason it cannot be taken today. */
export declare function scenarioDispositionPackets(campaign: Campaign, cast: CastScenario, kind: ScenarioDispositionKind): {
    readonly ok: true;
    readonly packets: readonly EffectPacket[];
} | {
    readonly ok: false;
    readonly reason: string;
};
export type ScenarioDisposition = {
    readonly kind: ScenarioDispositionKind;
    readonly label: string;
    /** What it does, in a sentence, before it is pressed. */
    readonly detail: string;
    /** Why it cannot be taken today, when it cannot. */
    readonly unavailable?: string;
};
/**
 * Every disposition the decision's case declares besides a reply, in the order
 * the case lists them, each with what it does. Nothing is offered that the case
 * does not accept.
 */
export declare function scenarioDispositions(campaign: Campaign, cast: CastScenario): readonly ScenarioDisposition[];
