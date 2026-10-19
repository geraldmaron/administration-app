import type { PersonId } from "@admin/world";
import type { AlignmentVector, Campaign, PressAction, PressCorps } from "./state.js";
import { type OutletStance, type PressOutlet } from "./press-outlets.js";
import type { OpinionDriver } from "./opinion.js";
import type { TurnPhase } from "./turn-loop.js";
import { type Confidence, type Likelihood } from "./assessments.js";
import { type ActPull } from "./press-beliefs.js";
export { FORMAT_PARTISANSHIP, NATIONAL_OUTLETS, PRESS_OUTLETS, outletDisposition, outletSpreadAt, outletStance, type OutletFormat, type OutletStance, type PressOutlet, } from "./press-outlets.js";
import type { MetricDeltas } from "./effect-types.js";
export { WEEK_SHARE_CAP, fileAtDesk, fileAtDesks, localeRegion, pickOutletForFeedItem, pressOutletById, secondOutletFor } from "./press-filing.js";
export { placementOf, placementFor, PLATFORM_PLACEMENT_WEIGHT } from "./press-placement.js";
export { outletAudience, type AudienceCohort, type OutletAudience } from "./outlet-audience.js";
/**
 * A corps whose standing is the aggregate of what its mastheads think.
 *
 * The one writer of `standing`, and the reason there can be four numbers and a
 * fifth without the fifth being a second opinion of the first four. Everything
 * that moves the press moves an outlet and comes back through here, so the
 * figure the coalitions read is never one somebody set by hand beside four that
 * say otherwise.
 */
export declare function corpsFrom(corps: PressCorps, dispositions: Readonly<Record<string, number>>): PressCorps;
export type OutletStanding = {
    readonly outlet: PressOutlet;
    readonly disposition: number;
    readonly stance: OutletStance;
    /** Where this masthead's own reading of the record is pulling it. */
    readonly target: number;
    /** What it makes of what the administration has been signing, and of which act. */
    readonly read: OutletActRead;
};
/** The spectrum, hostile end first, for a room that has to show it as one. */
export declare function selectOutlets(campaign: Campaign): readonly OutletStanding[];
/**
 * The corps a presidency opens with: each desk's institutional term, plus how
 * far its politics carry it toward or away from the President it is meeting.
 *
 * With no placement, every desk sits on the institutional lean alone, which is
 * the neutral corps a fixture wants; the founding always passes the President's
 * placement (`placementFor`). The partisan reading sums to zero across the
 * roster, and the partisan desks come in mirrored pairs whose clamp is
 * symmetric, so the corps's standing stays the institutional figure and opening
 * approval does not move.
 */
export declare function openingPressCorps(turn: number, placement?: Partial<AlignmentVector>): PressCorps;
/**
 * How long an administration can go without saying anything before the silence
 * is itself the story. Six weeks: long enough that a quiet month is quiet, short
 * enough that a government which has stopped explaining itself is covered as
 * one.
 */
export declare const SILENCE_TOLERANCE_TURNS = 6;
/**
 * What a scenario can ask of the press: the corps's standing, how many weeks
 * the administration has gone without answering a question, the share of desks
 * that have turned hostile, or where one named desk stands.
 */
export type PressMeasure = "standing" | "silenceWeeks" | "hostileShare" | "outlet";
/**
 * One press reading, for content to gate on. Undefined only for an outlet id
 * that is not on the roster, which a condition can never honestly satisfy.
 */
export declare function pressReading(campaign: Campaign, measure: PressMeasure, outletId?: string): number | undefined;
export type PressDriver = {
    readonly reason: string;
    readonly delta: number;
};
/**
 * Where the corps would stand if it had finished reading everything the
 * administration has done.
 *
 * Derived, never accumulated, for the reason removal pressure is: a press corps
 * warm to a government that has since had three orders struck down is not a
 * press corps with a memory, it is a stale number. What accumulates is only the
 * record itself, which is already stored.
 */
export declare function pressDrivers(campaign: Campaign): readonly PressDriver[];
export declare function pressStandingTarget(campaign: Campaign): number;
/**
 * Where the record would put one masthead if it had finished reading it.
 *
 * The drivers are shared, because a struck-down order is a struck-down order at
 * every desk; the lean is what the paper was before this president. That is
 * what makes one week's record a different destination on the adversarial daily
 * and on the sympathetic weekly, and it is why the two can be pulling opposite
 * ways in the same week.
 */
export declare function outletTarget(campaign: Campaign, outlet: PressOutlet): number;
/** Where a masthead's reading comes from, for a surface that says why the desk sits where it does. */
export type OutletDriverKey = "record" | "institution" | "partisan" | "acts" | "framing";
export type OutletDriver = PressDriver & {
    readonly key: OutletDriverKey;
};
/**
 * Why one masthead is heading where it is, term by term: the record every desk
 * reads alike, what the paper is toward any President, who this President is
 * to it, what it makes of what the administration has signed, and how the
 * administration explained itself. Their sum around the middle is the desk's
 * target, so the profile and the drift can never disagree.
 */
export declare function outletDrivers(campaign: Campaign, outlet: PressOutlet): readonly OutletDriver[];
/**
 * What this masthead makes of what the administration has been signing, and
 * which act it is reading — the per-outlet half of the target above, exposed so
 * a room can print the reason a desk is moving the way it is.
 *
 * Zero, with no act named, for an administration that has signed nothing
 * alignment-bearing inside the window. That is a real state and the surfaces
 * say so rather than inventing a reading.
 */
export type OutletActRead = {
    readonly reading: number;
    readonly act?: ActPull["act"];
};
export declare function outletActRead(campaign: Campaign, outlet: PressOutlet): OutletActRead;
/**
 * What each way of talking to them is worth, and what it costs.
 *
 * The three are deliberately not a ladder of the same thing at three sizes. An
 * interview is small, safe and slow. A press conference is the only one that can
 * move the corps far in a week, and it is also the only one where a bad record
 * is put in front of people whose job is to have read it. A leak buys coverage
 * without the president's name on it — until it has the president's name on it,
 * which is the price the other two do not carry.
 */
export type PressPlay = {
    readonly kind: PressAction;
    readonly name: string;
    readonly summary: string;
    /** What the corps moves by when it goes well, and when it does not. */
    readonly good: number;
    readonly bad: number;
    readonly cost: MetricDeltas;
    /**
     * What it costs on top when it goes badly, on the state's own ledger.
     *
     * These were an order of magnitude too big, and the size was a category error
     * rather than a tuning miss. A bad hour at the podium cost six points of
     * `standing` and two of `stability` — that is, it moved the world's reading of
     * the United States by more than a lost war does in a month, and shook order
     * at home. A press conference does neither of those things. It costs the
     * administration what the *country* thinks of it, which is why what is left
     * here is a token and the weight has moved to `moodBackfire`.
     */
    readonly backfire: MetricDeltas;
    /**
     * What it costs in what the country believes, which is where a bad week with
     * the press is actually paid for. Drifts back like every other judgment
     * instead of being a permanent mark on the state.
     */
    readonly moodBackfire?: Partial<Record<OpinionDriver, number>>;
    /** Whether it counts as the administration having spoken on the record. */
    readonly onTheRecord: boolean;
    /**
     * Who the play is actually with.
     *
     * An interview is one reporter in one room and a leak is placed on one desk,
     * so both name a masthead and land hardest there. A press conference is the
     * whole corps on camera, and there is no honest way to hold one with a single
     * paper — so it is the one play that moves all four by the same amount, which
     * is what the old model claimed all three did.
     */
    readonly targeting: PressPlayTargeting;
    /**
     * What the desks it was not with take from it.
     *
     * Asymmetric on purpose, and the asymmetry is most of why the leak is the
     * dangerous one: a scoop belongs to the desk that got it, but sourcing traced
     * back to the administration is a story every masthead runs in full.
     */
    readonly spillover?: {
        readonly good: number;
        readonly bad: number;
    };
};
export type PressPlayTargeting = "outlet" | "corps";
export declare const PRESS_PLAYS: Readonly<Record<PressAction, PressPlay>>;
/**
 * How far each masthead moves on a play, aimed or not.
 *
 * The desk the play was with takes it in full; the rest take the play's own
 * share of it. A corps play has no desk and no share — everybody was in the
 * room.
 */
export declare function playMovement(play: PressPlay, wentWell: boolean, outletId: string | undefined): Readonly<Record<string, number>>;
export declare function movedCorps(corps: PressCorps, movement: Readonly<Record<string, number>>): PressCorps;
export type PressForecast = {
    readonly likelihood: Likelihood;
    readonly confidence: Confidence;
    readonly confidenceBasis: string;
    readonly supporting: string;
    readonly uncertainty: string;
    readonly source: string;
};
export type PressProjection = {
    readonly play: PressPlay;
    /**
     * The number the resolution roll uses. Not for ordinary player copy — the
     * forecast is what a screen prints.
     */
    readonly successChance: number;
    readonly standingIfGood: number;
    readonly standingIfBad: number;
    /** Where the named masthead itself lands, for a play that is with one of them. */
    readonly outletIfGood?: number;
    readonly outletIfBad?: number;
    /** The one-line reason the odds are what they are. */
    readonly reasoning: string;
    readonly forecast: PressForecast;
    /** What the room will ask about. */
    readonly subject: PodiumSubject;
};
/**
 * What the room will ask about, which is not the President's choice.
 *
 * A running story first, because no reporter lets a live scandal go to ask about
 * anything else; then the administration's most recent act inside the press's
 * memory; and only a government that has done nothing the desks can name is
 * asked about its record in general.
 */
export type PodiumSubject = {
    readonly kind: "story";
    readonly text: string;
} | {
    readonly kind: "act";
    readonly text: string;
    readonly act: "order" | "decision";
} | {
    readonly kind: "record";
    readonly text: string;
};
export declare function podiumSubject(campaign: Campaign): PodiumSubject;
/** The White House post that speaks for the President from the briefing room. */
export declare const PRESS_SECRETARY_ROLE = "role-press-secretary";
/** The flag a press secretary leaves once they have spent their credibility taking a bad cycle for the President. */
export declare function secretarySpentFlag(person: string): string;
/** The seated press secretary, if the post is filled and the holder alive. */
export declare function pressSecretary(campaign: Campaign): {
    readonly id: PersonId;
    readonly name: string;
} | undefined;
/**
 * How well the people at the podium handle a room, for this play.
 *
 * Read off the same charisma and competence every other reading of a person
 * uses. The President is the one member of the cabinet the player authored, so
 * this is the one place the biography they wrote at the founding is worth
 * something concrete. The press secretary is read only for a play they deliver,
 * never week by week: a good secretary makes the briefings land, and does not
 * move the corps while nobody is speaking. One who has already taken a bad cycle
 * for the President has spent the room's trust, and briefs at half.
 */
export declare function podiumSkill(campaign: Campaign, kind: PressAction): number;
/**
 * What the player reads before deciding to say anything. Pure and
 * seed-independent, the same contract `projectOrder` holds: `issuePressAction`
 * calls this and nothing else for the odds, so the number shown is the number
 * rolled against.
 */
export declare function projectPressAction(campaign: Campaign, kind: PressAction, outletId?: string): PressProjection;
/** The flag that stands while the corps has turned, so it is reported once. */
export declare const PRESS_HOSTILE_FLAG = "press:hostile";
export declare const pressPhase: TurnPhase;
