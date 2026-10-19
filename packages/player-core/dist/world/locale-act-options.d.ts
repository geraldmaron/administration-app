import { type Campaign, type ConditionKind, type EffectPacket, type LocaleActId } from "@admin/engine";
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
export type LocaleActOption = {
    readonly id: LocaleActId;
    readonly name: string;
    readonly summary: string;
    /** USD millions this obligates. */
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
};
/** A state's request on a clock: said beside the options as what goes unanswered, never as one of them. */
export type LocaleWaiting = {
    readonly line: string;
    readonly weeksLeft: number;
};
/** What in this state a locale act could answer, requests first, then the worst condition. */
export declare function localeMatters(campaign: Campaign, id: StateId): readonly LocaleMatter[];
/**
 * Every locale act against one matter in one state, in the engine's order,
 * priced on this week's campaign. Force and collection aimed at Americans are
 * offered only against unrest: against a flood they are not a choice anyone
 * would weigh, only clutter.
 */
export declare function localeActOptions(campaign: Campaign, id: StateId, cause: ConditionKind): readonly LocaleActOption[];
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
 * initiative, with no unrest there to answer: every act that carries a
 * coercion risk, priced as the overreach it is read as.
 */
export declare function homeActOptions(campaign: Campaign, id: StateId): readonly LocaleActOption[];
/** How long a review buys, for the sentence that says so. */
export declare const REVIEW_WEEKS = 3;
