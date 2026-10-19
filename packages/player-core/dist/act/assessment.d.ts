import { type Campaign, type Consultee } from "@admin/engine";
import type { ForceAssetId, NationId } from "@admin/world";
import { type ActConfig, type ActOption } from "./catalogue";
import { type OddsStance, type OptionPreview } from "./preview";
/**
 * One line under a cell with what a screen needs to draw it, not only say it:
 * the government it names, how likely a branch is, which way a reading moves,
 * who is consulted. `text` always says it all, so a reader that draws nothing
 * loses nothing.
 */
export type AssessmentItem = {
    readonly text: string;
    readonly nation?: NationId;
    /** 1 (remote) to 5 (almost certain), the engine's five likelihood words in order. */
    readonly likelihood?: number;
    readonly direction?: "up" | "down";
    readonly consultee?: Consultee;
    /** The glyph a consultee wears, a name from the icon set the web checks before drawing it. */
    readonly emblem?: string;
    readonly stance?: OddsStance;
};
export type AssessmentCell = {
    readonly text: string;
    readonly stance?: OddsStance;
    /** Lines under the cell: the reasons, the countries that react, the branches that go wrong. */
    readonly detail?: readonly string[];
    /** The same lines with what draws them, where the cell has them. */
    readonly items?: readonly AssessmentItem[];
    /** Where the cell is itself a chance: 1 (remote) to 5 (almost certain). */
    readonly likelihood?: number;
    /** Where the cell is a count of a force asset, which a screen draws with its glyph. */
    readonly unitType?: ForceAssetId;
};
/** A chance as its step on the engine's five words, so a screen can light that many pips. */
export declare const likelihoodStep: (chance: number) => number;
/** A likelihood word as its step, for rows that carry the word rather than the chance; an unknown word has no step. */
export declare const likelihoodStepOfWord: (word: string | undefined) => number | undefined;
/** One reading of an act, said as its change from today. */
export type AssessmentRow = {
    readonly label: string;
    readonly act: AssessmentCell;
};
export type ActAssessment = {
    readonly option: ActOption;
    /** What the act is called on its receipt. */
    readonly title: string;
    /** The one named verb. */
    readonly verb: string;
    readonly tone: "commit" | "danger";
    /** Why it cannot be authorized now; the rows still say what it would have done. */
    readonly locked?: string;
    readonly review: string;
    readonly rows: readonly AssessmentRow[];
};
export declare const assessCell: (text: string, stance?: OddsStance, detail?: readonly string[]) => AssessmentCell;
/** The assessment of one instrument rung against one government, held when the engine will not project it. */
export declare function instrumentAssessment(campaign: Campaign, nation: NationId, option: ActOption, preview: OptionPreview, config: ActConfig): ActAssessment;
