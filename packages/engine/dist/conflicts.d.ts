import type { NationId } from "@admin/world";
import { type Campaign, type Conflict, type ConflictOpening, type ConflictSide } from "./state.js";
/**
 * Which side of a war a nation is on, principal or joiner, or none. It reads a
 * conflict rather than a campaign, which is why it lives here and not with the
 * campaign selectors in state.ts.
 */
export declare function sideOf(conflict: Conflict, nation: NationId): ConflictSide | undefined;
export declare function selectConflictsInvolving(campaign: Campaign, nation: NationId): readonly Conflict[];
/**
 * The live war between two nations in either direction, if there is one. The
 * pair is what matters, not who is nominally the aggressor: a second invasion
 * of a country already being invaded is the same war getting hotter.
 */
export declare function selectConflictBetween(campaign: Campaign, a: NationId, b: NationId): Conflict | undefined;
export declare function conflictId(aggressor: NationId, defender: NationId, turn: number): string;
export declare function openConflict(aggressor: NationId, defender: NationId, turn: number, cause: string, opening?: ConflictOpening): Conflict;
/**
 * What a fresh act of war does to the board: it opens a conflict if the two
 * are not already fighting, and makes the existing one hotter if they are.
 * A second invasion of a country already under invasion is not a second war.
 */
export declare function openOrEscalate(campaign: Campaign, aggressor: NationId, defender: NationId, cause: string, opening?: ConflictOpening): Conflict;
/** A blow struck inside a war already running: hotter front, one more beat. */
export declare function escalate(conflict: Conflict, turn: number, cause: string): Conflict;
/** The peace moves a conversation reply may make on a war the board is carrying. */
export declare const CONFLICT_MOVES: readonly ["offerTerms", "acceptTerms", "deescalate"];
export type ConflictMove = (typeof CONFLICT_MOVES)[number];
/**
 * The flag left when terms are put to the other side and not yet answered.
 * Keyed by conflict, so a second war with someone else does not read as the
 * same offer, and readable by a follow-up scenario the same way any other
 * governance flag is.
 */
export declare function termsOfferedFlag(conflictId: string): string;
/**
 * A war ended at a table rather than by exhaustion. Status and shape are
 * `settle`'s, because a settled war has to look identical however it got
 * there — the ending screens, the feed and every selector read `status`, and a
 * second terminal shape would be a second set of rules to keep in step.
 */
export declare function settleByAgreement(conflict: Conflict, turn: number, summary: string): Conflict;
/** A front cooled by a decision: still a war, one step less hot, one more beat. */
export declare function deescalateConflict(conflict: Conflict, turn: number, summary: string): Conflict;
export type DeterrenceAssessment = {
    readonly defenderNuclear: boolean;
    readonly mutual: boolean;
    /** 0..1 — how much of the aggressor's house a failed gamble puts at stake. */
    readonly retaliationSeverity: number;
    readonly summary: string;
    /** The governments the attacker should expect in the war beside its victim, read only where the question was asked. */
    readonly expectedJoiners?: readonly NationId[];
    /** 0..1 — how much the victim's likely allies add to what the attacker would face, beside its own strength. */
    readonly alliedSeverity?: number;
};
/**
 * Deterrence is information, not a wall. The projection shows what a nuclear
 * defender makes of the odds and what it would cost to be wrong, and the
 * player commits with open eyes — a locked door would teach them nothing.
 *
 * Asked about the war an attack would start, it also reads who would come in
 * beside the victim, from the same forecast a war already on the board is
 * read with: an alliance deters by the governments it would bring, not by the
 * paper. Only asked for the rung that opens a war, because the forecast weighs
 * every government in the world.
 */
export declare function assessDeterrence(campaign: Campaign, aggressor: NationId, defender: NationId, options?: {
    readonly expectJoiners?: boolean;
}): DeterrenceAssessment;
/**
 * What committing this act would do to the war ledger, stated before it is
 * committed.
 *
 * The projection told the player what a strike costs and how likely it is to
 * land, and said nothing at all about the fact that the heaviest rung starts a
 * war that the board then carries for the rest of the campaign. That is the
 * largest consequence any single act in the game has, and it was the one thing
 * the projection pane did not mention.
 *
 * Derived here rather than in the surface, for the same reason odds are: the
 * rule about which rungs open a war and which escalate a running one lives in
 * `openOrEscalate` and the rung table, and a screen re-deriving it would be a
 * second copy that goes quietly wrong the first time either changes.
 */
export type ConflictConsequence = {
    readonly opens: boolean;
    readonly escalates: boolean;
    /**
     * Which of the two things this act does to the war ledger, as one word a
     * surface can key a headline off directly.
     *
     * `opens` and `escalates` were the whole contract, and a surface reading them
     * had to decide for itself what "neither" meant. Every one of them decided
     * wrong in the same direction: a rung-4 strike against a country this
     * government is not at war with came back `{opens: false, escalates: false}`
     * and was headlined "This widens the war" over a sentence saying it did not.
     * A projection that is present but means "nothing happens to the war ledger"
     * is a trap, so this type is now only ever built for an act that does one of
     * the two, and `headline` is the words for the one it does.
     */
    readonly effect: WarLedgerEffect;
    /** The words over the summary. Authored here so two surfaces cannot disagree. */
    readonly headline: string;
    readonly summary: string;
};
export type WarLedgerEffect = "starts" | "widens";
/**
 * What this act would do to the war ledger, or nothing at all.
 *
 * `undefined` is the honest answer for every act that neither opens a conflict
 * nor makes a running one hotter — which includes a strike on a country this
 * government is not fighting. A caller that renders a war line whenever this is
 * present is then correct by construction.
 */
export declare function projectConflictConsequence(campaign: Campaign, actor: NationId, target: NationId, instrument: string, rung: number): ConflictConsequence | undefined;
