import { type Bill, type BillStage, type Campaign, type ChamberVote, type Effect, type LegislativeAct, type UsMajorParty } from "@admin/engine";
import type { ProjectedEffect } from "../reading";
import { type MetricStance } from "../format/figures";
import { type MoneyFormatter } from "../format/money";
/**
 * The bill as it would stand the day it became law, as an effect the fiscal
 * preview can price. A law's substance for the books is its offset to the take
 * and the lines, which lives in the statute's own row rather than on the act,
 * so a preview that read only the act's effects priced a $220 billion tax cut
 * at nothing.
 */
export declare function enactmentEffects(campaign: Campaign, bill: Bill): readonly Effect[];
/** How many years a law's offset to the books runs, where the statute writes one. */
export declare function lawOffsetYears(act: string): number | undefined;
/** The law's annual flows and any separate charge to available authority when enacted. */
export declare function billFundingLines(campaign: Campaign, act: LegislativeAct, bill?: Bill): readonly string[];
/** Annual changes to the underlying economy while the enacted provision runs. */
export declare function billRestingLines(act: LegislativeAct, bill?: Bill): readonly string[];
/** A floor count as a line a player can read: "House 291 of 290 needed". */
export declare function voteLine(vote: ChamberVote): string;
/**
 * Who a president short of the votes is actually dealing with: the chamber's
 * minority leader, named rather than left as an arithmetic gap. Undefined
 * where the count carries, or where the post sits vacant.
 */
export declare function shortfallCounterparty(campaign: Campaign, vote: ChamberVote): string | undefined;
/**
 * What the presiding officer's tie-break reads as, on the one vote it ever
 * touches: a fifty-fifty Senate on a simple majority. Undefined on every other
 * count, which is what `tieBrokenBy` already guarantees.
 */
export declare function tieBreakLine(campaign: Campaign, vote: ChamberVote): string | undefined;
/**
 * The chamber and status line printed directly under the bill's title —
 * "Passed the House and the Senate. Awaiting the President's signature." —
 * so the document names where it came from and what has already happened to
 * it before a player reads a word of the text itself.
 */
export declare function billStatusLine(bill: Bill): string;
/** What each stage is called on the docket row and at the head of the folio. */
export declare const BILL_STAGE_NAME: Readonly<Record<BillStage, string>>;
export type BillStageReading = {
    readonly stage: BillStage;
    readonly stageName: string;
    readonly where: string;
    /** What the chambers did to it last week, in the words the wire used. */
    readonly lastWeek?: string;
    readonly rows: readonly StageRow[];
    readonly votes: readonly ChamberVote[];
    readonly stance: MetricStance;
};
export type StageRow = {
    readonly label: string;
    readonly value: string;
    readonly detail: string;
    readonly stance: MetricStance;
};
/** Procedural history is public; future scheduling and member support are unresolved. */
export declare function billStageReading(_campaign: Campaign, bill: Bill): BillStageReading | undefined;
export type OverrideReading = {
    readonly votes: readonly ChamberVote[];
    readonly wouldCarry: boolean | undefined;
    readonly headline: string;
    readonly detail: string;
    readonly stance: MetricStance;
};
/**
 * The two-thirds count on the veto, before the veto.
 *
 * This is the whole drama of the instrument: a veto Congress can overturn is a
 * bill that becomes law anyway with the presidency publicly overruled on the
 * way, and a veto it cannot is the end of the matter. A player shown that
 * arithmetic only afterward has been shown it too late to have decided
 * anything.
 */
export declare function overrideReading(campaign: Campaign, bill: Bill): OverrideReading;
/**
 * What an act does, as the ceremony's effect preview reads it.
 *
 * Two vocabularies, kept apart on purpose: what it costs the administration
 * (the five readings) and what it does to the country (the sixteen stat paths).
 * A president signing a bill is spending one to move the other, and a preview
 * that mixed them into one list would hide which is which.
 */
export declare function actEffects(campaign: Campaign, act: LegislativeAct, money?: MoneyFormatter): readonly ProjectedEffect[];
/**
 * The bill itself, at length.
 *
 * Nobody reads a statute in a summary box, so the ceremony scrolls the
 * instrument: what Congress enacted, who wrote it, and the count that carried
 * it in each chamber — all of it quoted off the bill on the record rather than
 * composed for the screen.
 */
export declare function billInstrument(bill: Bill, act: LegislativeAct, caucusAnchor: UsMajorParty): string;
export type LawBinding = {
    readonly bill: Bill;
    /** What the act forbids the presidency, one clause per line, or empty where it binds nothing. */
    readonly binds: readonly string[];
};
/**
 * The statute book, and what each entry closes.
 *
 * A law that makes an executive order unsignable is the reason a button
 * elsewhere is disabled, and a player who cannot trace the closure back to the
 * act that caused it reads the app as broken rather than the presidency as
 * constrained.
 */
export declare function lawBindings(campaign: Campaign): readonly LawBinding[];
/** A blocked order's name, read off the same catalogue the orders desk offers. */
export declare function orderName(orderId: string): string | undefined;
/** The act behind a bill id, for the route that opens one. */
export declare function billAndAct(campaign: Campaign, id: string): {
    readonly bill: Bill;
    readonly act: LegislativeAct;
} | undefined;
