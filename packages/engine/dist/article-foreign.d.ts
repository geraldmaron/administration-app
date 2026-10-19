import { type CoverageBand, type ForeignOutlet, type ForeignOutletKind } from "./press-foreign.js";
import { type Campaign } from "./state.js";
/** What a line may name: the outlet's home country, and the act being covered. */
export type ForeignParticulars = {
    readonly nation: string;
    readonly act: string;
};
type Line = (p: ForeignParticulars) => string;
type FormatBank = {
    readonly ledes: readonly Line[];
    readonly closings: readonly Line[];
    readonly voice: Readonly<Record<CoverageBand, string>>;
};
export declare const FOREIGN_ARTICLE_BANK: Readonly<Record<ForeignOutletKind, FormatBank>>;
/** What state media are, said plainly: the line under every piece they file. */
export declare const STATE_MEDIA_ECHO: readonly string[];
export type ForeignPiece = {
    readonly outletId: string;
    readonly outlet: string;
    readonly kind: ForeignOutletKind;
    readonly band: CoverageBand;
    readonly lede: string;
    readonly voice: string;
    readonly closing: string;
    /** State media only: the line that says whose words these are. */
    readonly echo?: string;
    readonly signature: string;
};
/** The act the desks abroad are covering this week: the administration's latest on the record. */
export declare function coveredAct(campaign: Campaign): string;
/**
 * One outlet's piece this week. Keyed on the outlet and the turn rather than a
 * stream, so a press page opened twice in a week reads the same, and a new
 * week reads a new piece.
 */
export declare function foreignPiece(campaign: Campaign, outlet: ForeignOutlet): ForeignPiece | undefined;
/** Every outlet's piece, in roster order. Empty until the press abroad has first filed. */
export declare function foreignPressWeek(campaign: Campaign, outlets: readonly ForeignOutlet[]): readonly ForeignPiece[];
export {};
