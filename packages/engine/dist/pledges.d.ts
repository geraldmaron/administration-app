import { type Plank, type PlankId } from "@admin/world";
import type { PolicyDomain } from "./policy.js";
import type { Campaign, FlagId, FlagSet, GameDate } from "./state.js";
import type { TurnPhase } from "./turn-loop.js";
export type PledgeStatus = "open" | "kept" | "broken";
export type Pledge = {
    /** Unique within the ledger and stable across a save, so a reader can key a row by it. */
    readonly id: string;
    readonly plank: PlankId;
    readonly madeDate: GameDate;
    readonly dueDate: GameDate;
    /** Promised for the first hundred days rather than for the term. */
    readonly firstHundredDays: boolean;
    readonly status: PledgeStatus;
    /** The day it was kept or broken. Absent while it is still open. */
    readonly settledDate?: GameDate;
};
export type PledgeLedger = readonly Pledge[];
/** Everything the platform writes onto a campaign at the seal. */
export type PlatformSeal = {
    readonly pledges: PledgeLedger;
    /** Stances the platform takes over the inherited program, by policy domain. */
    readonly policies: Readonly<Record<string, string>>;
    readonly flags: FlagSet;
};
/** More than this and the platform is a list the country cannot remember, not a program. */
export declare const PLATFORM_MAX_PLANKS = 5;
/** More than this and a first hundred days has no priority at all. */
export declare const FIRST_HUNDRED_DAYS_MAX = 3;
export declare const FIRST_HUNDRED_DAYS = 100;
/**
 * What settling a pledge is worth, to the cohorts it courted (strain, before
 * each cohort's attention) and to the country's read of the President's word
 * (integrity).
 *
 * A broken promise weighs twice what a kept one earns, because a kept promise
 * is what a voter expected and a broken one is news. A first-hundred-days
 * pledge is a promise the President chose to put in the window, so both sides
 * of it are much larger: that is the whole trade of promoting one. Polarization
 * damps and compresses every judgment move, so the stake is sized by what it
 * costs on screen: a broken one takes nearly a point of approval the week it
 * breaks and about a point at its deepest over the next quarter (four seeds).
 * At a third of these stakes it cost a quarter of a point, which nobody felt.
 * The strain is at its cap: a cohort's strain weight never exceeds its attention.
 */
export declare const PLEDGE_STAKES: {
    readonly term: {
        readonly kept: {
            readonly strain: 0.15;
            readonly integrity: 0.01;
        };
        readonly broken: {
            readonly strain: 0.3;
            readonly integrity: -0.02;
        };
    };
    readonly firstHundredDays: {
        readonly kept: {
            readonly strain: 0.5;
            readonly integrity: 0.06;
        };
        readonly broken: {
            readonly strain: 1;
            readonly integrity: -0.12;
        };
    };
};
/** The flag a sealed platform raises for each plank it runs on. */
export declare function plankFlag(plank: PlankId | string): FlagId;
/** Stable across a save and unique within a ledger, because a platform names each plank once. */
export declare function pledgeId(plank: PlankId | string): string;
/**
 * When a pledge falls due: a hundred days after the oath for a first-hundred-
 * days pledge, and otherwise the first midterm election after it, which is the
 * day the country gets to say whether it was kept.
 */
export declare function pledgeDueDate(oathDate: GameDate, firstHundredDays: boolean): GameDate;
/** A platform choice the seal would refuse, with the sentence the player reads. Shaped as a founding rejection. */
export type PlatformRejection = {
    readonly subject: string;
    readonly explanation: string;
};
/**
 * Everything the seal would refuse about a platform and its first-hundred-days
 * priorities: an unknown or repeated plank, two planks that set the same
 * program, too many of either, and a priority that is not on the platform or
 * would be kept by doing nothing.
 */
export declare function platformRejections(platform: readonly PlankId[], firstHundredDays?: readonly PlankId[]): readonly PlatformRejection[];
/**
 * What a chosen platform commits the administration to on the day of the
 * oath. `sealFounding` spreads each part over what it would otherwise write,
 * so an empty seal leaves the founding exactly as it was.
 *
 * One pledge per plank, in the order the planks were chosen. An economic plank
 * also opens the term on its program, which is what makes the platform the
 * administration's opening program rather than a list beside it; the program
 * still has to be stood up like any other, so it reaches the country a month
 * in. Each plank raises a dated `plank:` flag content can gate on.
 */
export declare function sealPlatform(platform: readonly PlankId[], oathDate: GameDate, firstHundredDays?: readonly PlankId[]): PlatformSeal;
/** An act a President can take that a pledge may rest on: adopting a program, or signing an order. */
export type PledgeAct = {
    readonly kind: "policy";
    readonly domain: PolicyDomain;
    readonly stance: string;
} | {
    readonly kind: "order";
    readonly order: string;
};
/** An open pledge an act would settle, and which way. */
export type PledgeAtStake = {
    readonly pledge: Pledge;
    readonly plank: Plank;
    readonly effect: "keeps" | "breaks";
};
/**
 * The open pledges an act would keep or break, so a screen can name the
 * promise before the President commits rather than after the Record stamps
 * it. Adopting the pledged program or signing the pledged order keeps one;
 * replacing a program the platform promised to hold breaks one.
 */
export declare function pledgesAtStake(campaign: Campaign, act: PledgeAct): readonly PledgeAtStake[];
/** "Breaks your first-hundred-days pledge to secure the border, due April 30, 2029." */
export declare function pledgeAtStakeLine(stake: PledgeAtStake): string;
/** A pledge written onto the ledger: added, or replacing the entry with its id. */
export type PledgeEffect = {
    readonly kind: "pledge";
    readonly set: Pledge;
};
export declare function applyPledge(state: Campaign, effect: PledgeEffect): Campaign;
/**
 * What this week decides about an open pledge.
 *
 * `byDeadline` says whether the due date settled it, as against something the
 * President did: adopting the program, signing the order, or dropping the
 * program the platform promised to keep.
 */
export type PledgeVerdict = {
    readonly status: "open";
} | {
    readonly status: "kept" | "broken";
    readonly settledDate: GameDate;
    readonly byDeadline: boolean;
};
/**
 * Whether an open pledge settles this week.
 *
 * A pledge falls due in the week its due date lands in, so it is settled before
 * that week closes rather than the week after. A promise to put something in
 * place is kept the week it is in place; a promise to keep a program is broken
 * the week the program goes, and on the due date it is kept only if the program
 * delivered what the plank said it was for. The platform stood the program up
 * at the oath, so standing on the due date is not a result by itself.
 */
export declare function pledgeVerdict(campaign: Campaign, pledge: Pledge): PledgeVerdict;
/**
 * The week's reckoning with the ledger: a pledge that reaches its due date is
 * settled here, before the public's week is read, so a promise broken this
 * week is in this week's mood rather than next week's. One packet per pledge
 * settled, and nothing at all in a week that settles none.
 */
export declare const pledgePhase: TurnPhase;
