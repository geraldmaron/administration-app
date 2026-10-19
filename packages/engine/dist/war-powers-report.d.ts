import type { NationId } from "@admin/world";
import type { Campaign, GameDate } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { TurnPhase } from "./turn-loop.js";
export type ReportObligationId = string;
/** Which limb of the reporting trigger this introduction fell under. */
export type IntroductionKind = "hostilities" | "equipped-for-combat" | "substantial-enlargement";
export type ReportFiling = {
    readonly filedDay: number;
    readonly filedDate: GameDate;
    /** The constitutional or legislative authority the administration says it is acting under. */
    readonly authorityClaimed: string;
    readonly scope: string;
    /** Weeks the administration estimates. The estimate is on the record when it is exceeded. */
    readonly estimatedWeeks: number;
};
export type ReportObligation = {
    readonly id: ReportObligationId;
    readonly target: NationId;
    readonly kind: IntroductionKind;
    readonly rung: number;
    readonly openedDay: number;
    readonly openedDate: GameDate;
    /** Two days after the introduction. The statute says forty-eight hours and means it. */
    readonly dueDay: number;
    readonly description: string;
    readonly filing?: ReportFiling;
    /** Set once the deadline passed unfiled. The obligation does not go away when it is missed. */
    readonly missed?: true;
    /** The thirty-day extension, certified in writing on grounds of unavoidable military necessity. */
    readonly extension?: {
        readonly certifiedDay: number;
        readonly necessity: string;
    };
    /**
     * The day the force actually came out.
     *
     * The only thing that discharges a termination obligation short of a vote.
     * Set once and never cleared: an introduction that was ended is a different
     * record from one that was never opened, and the ladder reads the difference.
     */
    readonly terminated?: {
        readonly day: number;
    };
};
export type WarPowersReportState = {
    readonly obligations: readonly ReportObligation[];
};
export declare function foundingWarPowersReports(): WarPowersReportState;
export declare const REPORT_WINDOW_DAYS = 2;
/** Sixty days, in the weeks this game runs on, and the thirty-day certification on top of it. */
export declare const TERMINATION_WINDOW_DAYS = 60;
export declare const EXTENSION_DAYS = 30;
/**
 * How close to the end of the sixty days the extension can be certified. A
 * necessity for more time to withdraw is not credible two months out, and the
 * player surfaces say when the certification opens from this same number.
 */
export declare const EXTENSION_OPENS_DAYS = 14;
/**
 * What a week of continuing past the sixty days costs, before the compounding.
 *
 * The statute leaves the President three answers at day sixty: a vote, thirty
 * certified days to bring the force out, or the force comes out. There is no
 * fourth, so continuing is not a state the game can price at zero — it is the
 * administration standing on an authority it has been told it does not have,
 * and the Hill is the party that reads it that way.
 */
export declare const SUSTAINED_WEEKLY_STANDING_COST = 0.02;
export declare const SUSTAINED_WEEKLY_DISPOSITION_COST = 0.02;
/**
 * How much that weekly price grows per further week the force stays in.
 *
 * The same shape a standing emergency is billed on, and for the same reason: a
 * flat rent becomes a line item a president stops reading, while a rising one
 * makes "when does this end" the loudest question on the ledger.
 */
export declare const SUSTAINED_COST_COMPOUNDING = 0.15;
export declare function selectObligations(campaign: Campaign): readonly ReportObligation[];
export declare function selectUnfiledObligations(campaign: Campaign): readonly ReportObligation[];
/** The sixty days, plus the thirty a certification buys. */
export declare function terminationWindowDays(obligation: ReportObligation): number;
/**
 * Whether the sixty-day termination requirement attaches to this introduction
 * at all.
 *
 * Three conditions, each one the statute's own. It is keyed to a hostilities
 * report and to nothing else, so a forward deployment owes the forty-eight
 * hour report and no window, while a blockade, which is hostilities, owes both. It falls away entirely once Congress
 * has authorized force against that government, which is what a vote buys. And
 * it ends when the force comes out, which is what it was asking for.
 */
export declare function terminationClockRuns(campaign: Campaign, obligation: ReportObligation): boolean;
/**
 * The day the sixty days start counting.
 *
 * The statute runs them from the day a report "is submitted or is required to
 * be submitted ..., whichever is earlier". So a report filed inside the
 * forty-eight hours starts the clock on the day it was filed, and a report
 * filed late, or never, starts it on the day it was owed: not reporting buys
 * at most the two days the statute already gave.
 */
export declare function terminationStartDay(obligation: ReportObligation): number;
/**
 * The whole window measured from the day forces went in: the sixty days (and
 * any certified thirty) plus however long after the introduction they started.
 * What a gauge of the window is drawn against, so a clock that starts on the
 * day the report was owed never reads as more time left than the window holds.
 */
export declare function terminationWindowFromIntroduction(obligation: ReportObligation): number;
/** Days from introducing forces to the latest the sixty days can end: the report's two days, then the sixty. */
export declare const LATEST_TERMINATION_DAYS: number;
/**
 * Days left before the President must terminate the use of force absent a vote.
 *
 * Negative once the window has run out. Ask `terminationClockRuns` first: this
 * is the arithmetic of the window, not the question of whether the statute sets
 * one.
 */
export declare function terminationDaysRemaining(campaign: Campaign, obligation: ReportObligation): number;
/**
 * Every introduction whose clock has run out with nothing standing over it.
 *
 * The live obligation to terminate, which is what running the clock out
 * produces. It is not a lapse and it is not permission: while one of these
 * stands, the force is in place on an authority the statute says expired.
 */
export declare function expiredObligations(campaign: Campaign): readonly ReportObligation[];
/** Weeks the force has stayed in past the day it was owed out. Zero on the week it expires. */
export declare function weeksPastTermination(campaign: Campaign, obligation: ReportObligation): number;
/** How far this week's price has compounded above the first week's. */
export declare function sustainedCostScale(campaign: Campaign, obligation: ReportObligation): number;
/**
 * What introducing forces leaves behind: an obligation with two days on it.
 *
 * Only the player's government, for the reason the war powers gate is only the
 * player's: the campaign carries one Congress and it is theirs.
 */
export declare function recordForceIntroduction(campaign: Campaign, actor: NationId, target: NationId, rung: number, description: string): readonly Effect[];
export type ReportResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * File the report.
 *
 * Filing on time is worth something with the Hill and filing late costs
 * something, and neither is large — which is right. The report is not where a
 * presidency is won. It is where the record of it starts, and the estimate
 * written into it is the sentence a committee reads back in six months.
 */
export declare function fileWarPowersReport(campaign: Campaign, id: ReportObligationId, authorityClaimed: string, scope: string, estimatedWeeks: number): ReportResult;
/**
 * Certify the thirty-day extension.
 *
 * Available only where forces are actually still committed, and it buys thirty
 * days for the purpose of bringing them out — not thirty days of continued
 * operations, which is the distinction the certification is written against and
 * the one an administration is most tempted to blur.
 */
export declare function certifyExtension(campaign: Campaign, id: ReportObligationId, necessity: string): ReportResult;
/**
 * Why no window is running on an introduction, in the words the refusal and
 * the paperwork row both use.
 */
export declare function coverLine(campaign: Campaign, obligation: ReportObligation): string;
/**
 * Bring the force out.
 *
 * The answer the statute is actually asking for, and the only one short of a
 * vote: the obligation is discharged, the weekly price of continuing stops, and
 * the ladder the introduction closed opens again. Available at any point the
 * clock is running rather than only after it has run out — a president who
 * brings a force home inside the sixty days has complied, not forfeited
 * something.
 */
export declare function terminateForce(campaign: Campaign, id: ReportObligationId): ReportResult;
/**
 * The war powers week: deadlines that passed unfiled are marked as missed, and
 * force still in place past the sixty days is billed for continuing.
 *
 * Both halves are the weekly consequence of one record, which is why they are
 * one phase. A missed report is marked, not forgiven and not escalated: it is
 * on the record as missed, the Hill liked this administration better before,
 * and the termination clock has been running the whole time from a date the
 * President never acknowledged. An expired clock is not marked and forgotten —
 * the statute's answer at day sixty is a vote, a certification, or the force
 * coming out, and there is no fourth answer for the game to price at zero.
 *
 * The chamber's regard is threaded through both rather than computed twice
 * from the opening figure: every packet a phase returns is planned against the
 * same week, so two that each write the whole `Congress` record from that week
 * would have the second quietly undo the first.
 */
export declare const warPowersReportPhase: TurnPhase;
