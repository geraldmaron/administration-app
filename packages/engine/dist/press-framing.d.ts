import { type IdeologyVector } from "@admin/world";
import type { AlignmentVector, Campaign, ExecutiveOrderRecord, FeedItem } from "./state.js";
import type { EffectPacket } from "./effects.js";
/** The four things an administration can say it was doing. */
export type DecisionFramingKey = "resolve" | "restraint" | "necessity" | "regret";
export type DecisionFramingDef = {
    readonly key: DecisionFramingKey;
    /** What the podium is choosing, in the words a communications director uses. */
    readonly name: string;
    /** The line the framing puts on the act, for a room that has to print it. */
    readonly line: string;
    /**
     * The pull the framing itself carries, on the three axes every actor in this
     * game believes things on — read by exactly the fold `recentActPull` is read
     * by, because a framing is an argument about the same act in the same space.
     *
     * Authored small: a framing is how a thing was put, and how a thing was put
     * is worth less than what the thing was. Resolve is the register of executive
     * authority and of the nation acting for itself; restraint is the register of
     * a power that accepts being checked; necessity is the technocratic claim
     * that the situation, not the office, decided; regret is the apology, which
     * disclaims authority and speaks about who was hurt.
     */
    readonly pull: Partial<AlignmentVector>;
};
export declare const DECISION_FRAMINGS: Readonly<Record<DecisionFramingKey, DecisionFramingDef>>;
export declare const DECISION_FRAMING_KEYS: readonly DecisionFramingKey[];
/** The framing an act was given, written onto the act's own ledger entry. */
export type DecisionFraming = {
    readonly framing: DecisionFramingKey;
    /** The week it was said, which is what the catch below is dated from. */
    readonly turn: number;
};
/** How far back the podium can reach for an act to explain. */
export declare const FRAMING_WINDOW_TURNS = 2;
/**
 * How long a framing stands before the desks have read the order themselves.
 * One week: the podium leads the evening bulletins, and the text is filed by
 * the time the Sunday pieces are written.
 */
export declare const FRAMING_SCRUTINY_TURNS = 1;
/**
 * How far a framing can carry a desk. Smaller than PRESS_BELIEF_WEIGHT (0.4)
 * because it has to be: an administration that could talk its way to the same
 * place signing nothing would make the record decorative.
 */
export declare const FRAMING_WEIGHT = 0.15;
/**
 * What a caught framing costs, as a multiple of what it bought.
 *
 * Above one, and that is the whole design: a president who framed honestly and
 * a president who framed a retreat as resolve must not end the month in the
 * same place, and the second must not end it merely back where an unframed act
 * would have left them. The desks that ran the line are the ones with a
 * correction to write.
 */
export declare const FRAMING_BACKLASH = 1.75;
/** What being caught costs at every desk, including the ones that never bought it. */
export declare const FRAMING_CREDIBILITY_HIT = 0.25;
/**
 * How far a framing has to argue against its own act before it is a lie rather
 * than a gloss. Small, but not zero: a framing is allowed to be a reading of an
 * act, and only an argument pointing the other way is a contradiction.
 */
export declare const FRAMING_CONTRADICTION_THRESHOLD = 0.1;
/**
 * Whether the framing points the opposite way to the act it is put on.
 *
 * The one contradiction class this models, and it is mechanical rather than
 * interpretive: the act's authored alignment and the framing's authored pull
 * are two vectors in the same space, and their fold is negative exactly when
 * the podium is arguing against the page the President signed. Framing a
 * withdrawal of executive power as resolve is the case it was built for.
 */
export declare function framingContradicts(alignment: Partial<AlignmentVector>, framing: DecisionFramingKey): boolean;
/**
 * What one masthead makes of how this administration has been explaining
 * itself, signed the way `outletReading` is signed.
 *
 * A framing still standing is read as the argument it is: the desk that agrees
 * with it moves toward the administration and the desk it was never going to
 * persuade moves away. A framing the record has since contradicted is read as
 * the correction it became — every desk is worse off than if the act had gone
 * unexplained, and the desks that ran the line are worst off, which is the term
 * that makes framing a retreat as resolve a decision rather than free upside.
 */
export declare function outletFramingReading(campaign: Campaign, beliefs: IdeologyVector): number;
/** The acts the podium could still explain: signed recently, and not yet framed. */
export declare function frameableOrders(campaign: Campaign): readonly ExecutiveOrderRecord[];
/** Whether the administration has already put a framing on something this week. */
export declare function framedThisWeek(campaign: Campaign): boolean;
/**
 * The part of a masthead this file needs: a name to print and a worldview to
 * fold the framing against. Structural rather than an import of `PressOutlet`,
 * which would make the two press modules a cycle — press.ts reads the framing
 * term, so nothing here may read back into it.
 */
export type FramingReader = {
    readonly id: string;
    readonly name: string;
    readonly beliefs: IdeologyVector;
};
export type FramingOutletMovement = {
    readonly outlet: FramingReader;
    /** Where this desk is heading now. */
    readonly target: number;
    /** Where it would be heading with this framing on the record. */
    readonly framedTarget: number;
};
export type FramingProjection = {
    readonly framing: DecisionFramingDef;
    readonly order: ExecutiveOrderRecord;
    /** Whether the act itself argues the other way — stated before the podium, never after. */
    readonly contradicts: boolean;
    readonly movements: readonly FramingOutletMovement[];
    readonly reasoning: string;
};
/**
 * What the player reads before saying it, holding the contract `projectOrder`
 * and `projectPressAction` hold: this is the only estimator, and the framing
 * itself writes nothing this does not show.
 *
 * The contradiction is disclosed rather than hidden, and that is deliberate. A
 * president knows whether the sentence they are about to read out is true; the
 * interesting decision is saying it anyway, and a screen that concealed the
 * risk would be inventing an ignorance the office does not have.
 */
export declare function projectFraming<O extends FramingReader>(campaign: Campaign, record: ExecutiveOrderRecord, framing: DecisionFramingKey, outlets: readonly O[], targetOf: (campaign: Campaign, outlet: O) => number): FramingProjection;
export type FramingResult = {
    readonly ok: false;
    readonly reason: string;
} | {
    readonly ok: true;
    readonly framing: DecisionFramingDef;
    readonly contradicts: boolean;
    readonly packet: EffectPacket;
};
/**
 * Put a framing on an act, on the record.
 *
 * Writes the framing onto the order's own ledger entry and nothing else: no
 * metric, no cost, no outcome. One act a week, because the podium makes one
 * statement a week, and never a second framing on the same act — an
 * administration that could keep re-explaining the same order until a desk
 * agreed would be arguing with the record rather than standing on it.
 */
export declare function frameDecision(campaign: Campaign, recordId: string, framing: DecisionFramingKey): FramingResult;
/**
 * The framings the record catches up with this week, reported once.
 *
 * Dated off the framing rather than accumulated, for the reason the press
 * drivers are derived: a correction the campaign remembers having run is a
 * stale flag, and a correction computed from the record is the record.
 */
export declare function framingCaughtItems(campaign: Campaign, turn: number): readonly FeedItem[];
