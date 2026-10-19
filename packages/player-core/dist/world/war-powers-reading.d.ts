import { type Campaign, type ConflictSide, type Likelihood, type ReportObligation } from "@admin/engine";
import type { NationId } from "@admin/world";
import { type DispositionReading } from "../congress/congress-reading";
/** One War Powers deadline, in the shape a clock dial draws. */
export type WarPowersClock = {
    readonly daysRemaining: number;
    readonly dueLabel: string;
    /** The statute's whole window, so the dial reads the days left against it. */
    readonly windowDays: number;
};
/**
 * What joining a war would start, read before the President commits: the
 * report to Congress it obliges, the date forces must come home by without an
 * authorization, and what the other side's arsenal puts at stake. A join is
 * the one act whose legal clock starts the moment it is taken, so the price
 * has to be on the screen before the button, not in the Record after it.
 */
export type WarPowersPreview = {
    readonly report: WarPowersClock;
    /** Absent where Congress has authorized force against that government: no withdrawal clock runs then. */
    readonly withdrawal?: WarPowersClock;
    /** The authorization that covers the entry, in place of the withdrawal clock. */
    readonly cover?: string;
    /** What the office is missing to go in, where its own authority does not reach this war. Nothing may be committed then. */
    readonly refusal?: string;
    /** One sentence on deterrence, absent when nothing on the other side deters. */
    readonly deterrence?: string;
};
export declare function dueIn(campaign: Campaign, days: number, windowDays: number, caption: (date: string) => string): WarPowersClock;
export declare function warPowersBeforeJoin(campaign: Campaign, conflictId: string, side: ConflictSide): WarPowersPreview | undefined;
/**
 * What entering a war does at home, read before the President commits: the
 * approval headline now, the one the join's own packet settles, and the level
 * it heads toward while the war lasts; how the Hill reads the administration
 * before and after; and how an authorization against the enemy would count.
 * Every figure comes from applying the join's packet to the campaign, so the
 * preview cannot drift from what the act does.
 */
export type JoinPrice = {
    readonly approval: {
        readonly now: number;
        readonly settled: number;
        readonly heading: number;
    };
    /** Why the level heads where it does: the war term's own sentence, from the cause decomposition. */
    readonly because?: string;
    readonly congress: {
        readonly before: DispositionReading;
        readonly after: DispositionReading;
    };
    /** True where no authorization covers the enemy, so the join files a War Powers record of unilateral force. */
    readonly unilateral: boolean;
    readonly authorization: {
        readonly against: NationId;
        readonly before: Likelihood;
        readonly after: Likelihood;
    };
    /** The same, as the lines a confirmation prints. */
    readonly words: readonly string[];
};
export declare function joinPriceBeforeJoin(campaign: Campaign, conflictId: string, side: ConflictSide): JoinPrice | undefined;
/** Where the forty-eight hour report on an introduction stands. */
export type ReportStanding = "Filed" | "Filed late" | "Missed" | "Owed";
/**
 * The War Powers position on one front the United States is fighting on: the
 * sixty-day clock where it runs, the authorization where one covers the war,
 * and where the report stands.
 */
export type FrontWarPowers = {
    readonly withdrawal?: WarPowersClock;
    readonly cover?: string;
    readonly report?: ReportStanding;
};
export declare function reportStanding(obligation: ReportObligation): ReportStanding;
/**
 * Read off the introductions filed against the government on the other side,
 * the only join the engine records between a war and its War Powers paper:
 * an introduction is filed against a government, not a war.
 */
export declare function frontWarPowers(campaign: Campaign, counterpart: NationId): FrontWarPowers;
/** A war the United States went into on somebody else's side, with the War Powers position on the government it now fights. */
export type EnteredFront = {
    readonly conflictId: string;
    readonly alongside: NationId;
    readonly against: NationId;
    readonly weeks: number;
    readonly intensity: number;
    readonly warPowers: FrontWarPowers;
};
/**
 * Every war the United States entered beside one of its principals. Entering
 * is the act that starts the War Powers clocks, so the list a joined war
 * appears in is the list that carries them.
 */
export declare function enteredFronts(campaign: Campaign): readonly EnteredFront[];
/** One government on one side of a war, and what it has committed to the fighting, line by line. */
export type WarParty = {
    readonly nation: NationId;
    readonly role: "principal" | "joined";
    /** Empty where nothing is on record: no other government's commitments are modeled yet. */
    readonly committed: readonly string[];
};
/** Every party to a war, side by side, each with what it has committed. Undefined for a war not on the board. */
export declare function warPartyForces(campaign: Campaign, conflictId: string): Readonly<Record<ConflictSide, readonly WarParty[]>> | undefined;
