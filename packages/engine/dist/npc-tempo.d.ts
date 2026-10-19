import type { NationId } from "@admin/world";
import type { Campaign } from "./state.js";
/** A term, in weeks: the window every family's cap is counted over. */
export declare const TERM_WEEKS = 208;
export type TempoFamily = {
    /** The ledger's key for the family; unique across families. */
    readonly id: string;
    /** The most acts of the family the world's governments make in any 208 weeks. */
    readonly perTerm: number;
    /** Weeks one key rests after an act on it before the family may act on it again. */
    readonly cooldownWeeks: number;
    /** The plural a refusal names: "acts of force", "strait closures". */
    readonly noun: string;
};
/** One act a decision would make of a family, on one key. */
export type TempoClaim = {
    readonly family: TempoFamily;
    /** What rests after the act: a pair (`pairKey`), a strait, anything the family names. */
    readonly key: string;
    /** The key in words, for a refusal a person reads: "China and Russia", "the Strait of Hormuz". */
    readonly label?: string;
};
export type TempoEntry = {
    readonly family: string;
    readonly key: string;
    readonly actor: NationId;
    readonly turn: number;
    /** The last turn the entry can still refuse anything; dropped after it. */
    readonly keepUntil: number;
};
export type NpcTempoEffect = {
    readonly kind: "npcTempo";
    readonly entries: readonly TempoEntry[];
};
/** The key for a pair of governments, the same whichever acted on which. */
export declare function pairKey(a: NationId, b: NationId): string;
/** Every act still on the ledger, oldest first. Absent on older saves, which read as none. */
export declare function tempoLedger(campaign: Campaign): readonly TempoEntry[];
/** Acts of the family the world has made in the term ending this week. */
export declare function actsThisTerm(campaign: Campaign, family: TempoFamily): number;
/** The turn the family last acted on the key, if it ever did and the entry is still kept. */
export declare function lastActOn(campaign: Campaign, family: TempoFamily, key: string): number | undefined;
/** Why the world may not make this act this week, or undefined where it may. */
export declare function tempoRefusal(campaign: Campaign, claim: TempoClaim): string | undefined;
/** The first refusal among a decision's claims, or undefined where every one is allowed. */
export declare function firstTempoRefusal(campaign: Campaign, claims: readonly TempoClaim[]): string | undefined;
/** The ledger entries an act makes, as the effect that writes them; undefined where it made none. */
export declare function tempoEffect(campaign: Campaign, actor: NationId, claims: readonly TempoClaim[]): NpcTempoEffect | undefined;
/** Appends the act's entries and drops every entry past its keep, so the ledger stays a term long. */
export declare function applyNpcTempo(campaign: Campaign, effect: NpcTempoEffect): Campaign;
