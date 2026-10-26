import { type Campaign, type CourtOrderKind, type CourtOrderStatus, type DirectiveStatus, type EffectPacket, type LocaleActId } from "@admin/engine";
import type { StateId } from "@admin/world";
import type { LocaleActAuthorityView } from "./locale-act-options";
/** The court's odds in whole percents, which always add up to 100. */
export type CourtOrderOddsView = {
    readonly granted: number;
    readonly narrowed: number;
    readonly denied: number;
};
/** What the application rests on, in whole percents where it is a reading. */
export type CourtOrderEvidenceView = {
    /** The FBI's capability to build the affidavit. */
    readonly capability: number;
    /** How strong the kind's own legal predicate is on this week's record; zero means absent. */
    readonly predicate: number;
    /** The overall evidence the court weighs. */
    readonly score: number;
    readonly priority: boolean;
    readonly surveillance: boolean;
    /** Each part said plainly, for the row that lists them. */
    readonly lines: readonly string[];
};
/** One application already filed, as the record keeps it. */
export type CourtOrderApplicationView = {
    readonly id: string;
    readonly kind: CourtOrderKind;
    readonly name: string;
    readonly status: CourtOrderStatus;
    readonly statusText: string;
    readonly appliedTurn: number;
    readonly decideTurn: number;
    readonly termEndsTurn?: number;
    readonly cooldownEndsTurn?: number;
    /** Weeks until the court answers, the order lapses, or Justice can file again. */
    readonly weeksLeft?: number;
    /** What a live order lets the administration do; only on a granted or narrowed order still running. */
    readonly enables?: string;
};
export type CourtOrderOption = {
    readonly kind: CourtOrderKind;
    readonly name: string;
    readonly court: string;
    readonly authority: LocaleActAuthorityView;
    /** What a granted order would let the administration do. */
    readonly enables: string;
    /** The act a live order opens, where one does. */
    readonly opensAct?: LocaleActId;
    /** Why Justice cannot file it this week; absent when it can. */
    readonly locked?: string;
    /** The packet that files the application. Carries the odds, never the answer. Absent when locked. */
    readonly packet?: EffectPacket;
    readonly evidence: CourtOrderEvidenceView;
    readonly odds: CourtOrderOddsView;
    /** Which way the district bench leans, for the injunction only. */
    readonly bench?: {
        readonly court: string;
        readonly leaning: "your way" | "against you" | "even";
    };
    readonly decisionWeeks: {
        readonly min: number;
        readonly max: number;
    };
    readonly decisionText: string;
    readonly termWeeks: number;
    readonly termText: string;
    /** What the Attorney General does with the instruction this week; only a carried one files. */
    readonly attorneyGeneral?: DirectiveStatus;
    readonly attorneyGeneralText?: string;
    /** Whether filing it now would renew an order already running. */
    readonly renewal: boolean;
    /** The newest application of this kind in this state, whatever became of it. */
    readonly latest?: CourtOrderApplicationView;
};
export type CourtOrderDesk = {
    readonly state: StateId;
    readonly options: readonly CourtOrderOption[];
    /** Every application filed for the state, newest first. */
    readonly applications: readonly CourtOrderApplicationView[];
    /** The granted or narrowed orders still running. */
    readonly live: readonly CourtOrderApplicationView[];
};
/** Every court order Justice could ask for over one state this week, in the engine's order. */
export declare function courtOrderOptions(campaign: Campaign, state: StateId): readonly CourtOrderOption[];
/** The "Seek a court order" desk for one state: what can be asked for, and what became of what was. */
export declare function courtOrderDesk(campaign: Campaign, state: StateId): CourtOrderDesk;
