import { type Campaign, type ConditionKind, type EffectPacket, type LocaleActGroup, type LocaleActId, type LocaleGateCheck } from "@admin/engine";
import type { StateId } from "@admin/world";
/** Something in the state a locale act can answer: a live condition, a governor's request, or both. */
export type LocaleMatter = {
    readonly cause: ConditionKind;
    readonly title: string;
    /** The governor's open request over it, when there is one. */
    readonly request?: {
        readonly reason: string;
        readonly weeksLeft: number;
        readonly weight: number;
    };
    /** 0..1, when a live condition carries it. */
    readonly severity?: number;
};
/** The law an act runs on, with the registry record a card opens for it. */
export type LocaleActAuthorityView = {
    readonly cite: string;
    readonly name: string;
    readonly limit: string;
    readonly recordId?: string;
};
/** What a suit against the act's mission order looks like before it is signed: odds only. */
export type LocaleLitigation = {
    /** 0..1: the chance somebody sues, the chance the signature is drawn against. */
    readonly filingChance: number;
    /** 0..1: the chance a court sets the order aside once challenged. */
    readonly meritsChance: number;
    /** Who would sue, states first. */
    readonly plaintiffs: readonly string[];
    /** The Attorney General's review, where the order reaches far enough to get one. */
    readonly counsel?: {
        readonly name: string;
        readonly objects: boolean;
    };
    readonly reasoning: string;
    /** 0..1: the chance a court pauses the mission once a suit reaches interim relief. */
    readonly interimRelief?: number;
};
export type LocaleActOption = {
    readonly id: LocaleActId;
    readonly name: string;
    readonly summary: string;
    readonly group: LocaleActGroup;
    /** USD millions this obligates up front. */
    readonly cost: number;
    readonly costText: string;
    /** Standing given up at home, as a positive share; zero when it costs none. */
    readonly standing: number;
    readonly standingText: string;
    /** Relief the state did not ask for, which its governor will say so about. */
    readonly unrequested: boolean;
    /** Whether it discharges the state's open request over this matter. */
    readonly answers: boolean;
    /** Whether it buys the request more time instead. */
    readonly defers: boolean;
    /** The governor's part, said plainly, where the act needs their assent. */
    readonly assent?: string;
    readonly needsDeclaration: boolean;
    /** Why it cannot be taken now; absent when it can. */
    readonly locked?: string;
    /** The packet authorizing commits, built against this campaign. Absent when locked. */
    readonly packet?: EffectPacket;
    /**
     * For force or surveillance aimed at Americans: the chance something goes
     * wrong and how many recent acts are raising it. Only the odds: whether it
     * does go wrong is in the packet, and is read on the receipt, never before.
     */
    readonly risk?: {
        readonly odds: number;
        readonly recent: number;
        readonly erratic: boolean;
    };
    /** Sent with no unrest to answer: read as overreach, and priced as it. */
    readonly unprovoked?: true;
    readonly authority?: LocaleActAuthorityView;
    /** Each legal condition the act waits on, and whether it holds this week. */
    readonly gates: readonly LocaleGateCheck[];
    readonly litigation?: LocaleLitigation;
    /** The standing mission it opens: the formations, the weekly bill and the term. */
    readonly commitment?: {
        readonly forcesText?: string;
        readonly weeklyText: string;
        readonly weeks: number;
    };
    /**
     * What it does for the unrest: mission attention (0..1) for some weeks, and
     * the signed change to national protest pressure, negative where it eases.
     */
    readonly eases?: {
        readonly attention: number;
        readonly weeks: number;
        readonly protest: number;
    };
    /** The governor's step toward (positive) or away from the administration. */
    readonly governorShift?: number;
    /** The act that must come first, said plainly. */
    readonly step?: {
        readonly after: "proclaim";
        readonly text: string;
    };
    /** Closed by law in every case: why, with the law, and the lawful act beside it. Never a button. */
    readonly refusedByLaw?: {
        readonly reason: string;
        readonly neighbor: "priority" | "surveil-under-order";
    };
};
/** A state's request on a clock: said beside the options as what goes unanswered, never as one of them. */
export type LocaleWaiting = {
    readonly line: string;
    readonly weeksLeft: number;
};
/** A federal mission running in a state, as a desk lists it. */
export type LocaleMissionView = {
    readonly act: LocaleActId;
    readonly name: string;
    /** The week it was ordered. */
    readonly since: number;
    readonly status: "in force" | "not yet in force" | "paused by a court" | "ended";
};
/** What in this state a locale act could answer, requests first, then the worst condition. */
export declare function localeMatters(campaign: Campaign, id: StateId): readonly LocaleMatter[];
/** A weekly bill in USD millions, kept to one decimal below $100M so $13.45M reads $13.5M, not $13M. */
export declare function formatWeeklyBill(usdMillions: number): string;
/** Every locale act against one matter in one state, in the engine's order, priced on this week's campaign. */
export declare function localeActOptions(campaign: Campaign, id: StateId, cause: ConditionKind): readonly LocaleActOption[];
/**
 * How many of those acts the engine would take this week, read off its own
 * gate without pricing or building any of them: a table of every state asks
 * this once per row.
 */
export declare function openLocaleActCount(campaign: Campaign, id: StateId, cause: ConditionKind): number;
/** The state's request running out unanswered, which becomes a grievance; undefined when nothing is owed, so no clock runs. */
export declare function localeWaiting(campaign: Campaign, id: StateId, cause: ConditionKind): LocaleWaiting | undefined;
/**
 * What went wrong when a coercive act was taken, read after the fact off the
 * campaign it was taken on: the draw is the same one the committed packet
 * made, so this is the incident on the books, not a second roll. Undefined
 * when the act carries no risk or nothing went wrong.
 */
export declare function localeIncident(before: Campaign, id: StateId, actId: LocaleActId, provoked?: boolean): string | undefined;
/**
 * Force and collection the President can send into a state on their own
 * initiative, with nothing there to answer: every coercive act the home path
 * takes, which is the ones whose occasion is not "any". Only routine
 * enforcement can actually go; the rest say which unrest they wait on.
 */
export declare function homeActOptions(campaign: Campaign, id: StateId): readonly LocaleActOption[];
/** Every federal mission still inside its window in this state, newest first, with whether its order still runs. */
export declare function localeMissions(campaign: Campaign, id: StateId): readonly LocaleMissionView[];
/** How long a review buys, for the sentence that says so. */
export declare const REVIEW_WEEKS = 3;
