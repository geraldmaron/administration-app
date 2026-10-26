import type { Campaign, ChamberVote, GameDate } from "./state.js";
import type { BudgetAccount } from "./budget.js";
import type { EffectPacket } from "./effects.js";
export type ImpoundmentKind = "rescission" | "deferral";
/**
 * Why a deferral is proposed. The first two are the purposes 684(b) allows; a
 * deferral for policy reasons is the one the Act does not, and what the
 * Comptroller General reports against.
 */
export type DeferralPurpose = "contingency" | "savings" | "policy";
export type ImpoundmentStatus = "pending"
/** Congress completed action on a rescission bill: the authority is gone. */
 | "rescinded"
/** The window ran out, or the deferral period ended, and the money is available again. */
 | "released"
/** A pocket rescission's fiscal year ended with the money still withheld. */
 | "lapsed"
/** A court ordered the money released on the Comptroller General's suit. */
 | "court-ordered";
export type ImpoundmentMessage = {
    readonly id: string;
    readonly kind: ImpoundmentKind;
    readonly account: BudgetAccount;
    /** The withheld amount, as an annual share of GDP, fixed when the message is sent. */
    readonly share: number;
    readonly transmitted: GameDate;
    readonly transmittedTurn: number;
    readonly fiscalYear: number;
    /** Deferral only. */
    readonly purpose?: DeferralPurpose;
    /** Deferral only: the last day the funds are held, never past the fiscal year's end. */
    readonly heldThrough?: GameDate;
    /** Rescission only: the 45th day of continuous session would fall after the fiscal year ends. */
    readonly pocket?: boolean;
    /** Rescission only: how the floor reads the cut, fixed when sent so the one count Congress takes is reproducible. */
    readonly appeal?: number;
    /** Rescission only: Congress has taken its one count. */
    readonly counted?: boolean;
    readonly status: ImpoundmentStatus;
    readonly closed?: GameDate;
    readonly gao?: {
        readonly reported: GameDate;
        /** Deferral only: whether the Comptroller General finds it within existing statutory authority. */
        readonly inAccordance?: boolean;
        readonly suitFiled?: GameDate;
    };
};
/** 2 U.S.C. 682(3), 683(b): the window Congress has to complete action on a rescission bill. */
export declare const RESCISSION_WINDOW_SESSION_DAYS = 45;
/** 2 U.S.C. 687: days of continuous session after the explanatory statement before the Comptroller General may sue. */
export declare const GAO_SUIT_WAIT_SESSION_DAYS = 25;
/**
 * 2 U.S.C. 688(b)(1): the committee may be discharged after 25 days of
 * continuous session. The one count Congress takes is placed there, the first
 * day a rescission bill can be forced to the floor.
 */
export declare const RESCISSION_VOTE_SESSION_DAY = 25;
/** The Comptroller General reviews "as promptly as practicable" (685(b)); this is the abstraction's pace. */
export declare const GAO_REPORT_SESSION_DAYS = 14;
/** Days from the Comptroller General's filing to an order in the District of Columbia; the Act sets no pace, so this is a design judgment. */
export declare const COURT_ORDER_DAYS = 56;
/** What the Hill thinks of a finding that the administration is withholding money unlawfully. */
export declare const UNLAWFUL_DEFERRAL_DISPOSITION_COST = 0.08;
/** What the Hill thinks of a rescission message that was sent so the money would expire. */
export declare const POCKET_RESCISSION_DISPOSITION_COST = 0.08;
/** What each further unlawful deferral of the same funds in a fiscal year adds, up to the cost of the first finding. */
export declare const REPEAT_UNLAWFUL_DEFERRAL_STEP = 0.02;
export declare function selectImpoundments(campaign: Pick<Campaign, "congress">): readonly ImpoundmentMessage[];
/** The messages whose money is being held back this week. */
export declare function pendingImpoundments(campaign: Pick<Campaign, "congress">): readonly ImpoundmentMessage[];
/** The share of an account that is held back right now, as an annual share of GDP. */
export declare function withheldShare(campaign: Pick<Campaign, "congress">, account: BudgetAccount): number;
/** The count on a rescission bill: both chambers at a majority, because the Act's fast track takes the Senate's filibuster away. */
export declare function countRescission(campaign: Campaign, appeal: number): {
    readonly votes: readonly ChamberVote[];
    readonly carried: boolean;
};
/**
 * One week of every pending message: the count Congress takes, the default
 * release, the Comptroller General's report and suit, the court's order, and
 * a pocket rescission's expiry. Dated by the sitting date so a week stepped by
 * office day and a week taken whole close the same message in the same week.
 */
export declare function impoundmentPackets(campaign: Campaign): readonly EffectPacket[];
