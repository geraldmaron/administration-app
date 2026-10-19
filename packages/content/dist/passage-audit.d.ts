export type Passage = {
    readonly label: string;
    readonly text: string;
};
export type PassageSeverity = "error" | "warning";
/** The finding kinds every document type shares, whatever else it also reports. */
export type PassageFindingKind = "mechanics-language" | "british-spelling" | "doubled-word" | "filler-language" | "press-organization" | "numeral-in-prose" | "overlong-text" | "thin-text" | "nation-name-in-generic" | "literal-capability-figure" | "charter-institution-literal" | "cabinet-title-literal" | "hardcoded-individual" | "invented-proper-noun" | "stilted-register";
/**
 * How a runner reports. The caller owns the finding record — which document the
 * finding belongs to, and how its kinds are spelled — so the runners never need
 * to know either.
 */
export type PassageEmit<K extends string> = (kind: K | PassageFindingKind, severity: PassageSeverity, message: string) => void;
export declare const excerpt: (text: string) => string;
export type PassageLanguageOptions<K extends string> = {
    /** The token vocabulary this document's binder actually fills. */
    readonly placeholders: readonly string[];
    /** What an unfilled token is called in the calling audit's own vocabulary. */
    readonly placeholderKind: K;
    /** Off for structured data fields, where a figure is the native tongue. */
    readonly numerals: boolean;
    /** The length this field stops fitting its surface at. Unset means unbounded. */
    readonly ceiling?: number;
    /** What a writer is aiming for. Unset means the field has no target worth warning about. */
    readonly target?: number;
};
export declare function auditPassageLanguage<K extends string>(passage: Passage, options: PassageLanguageOptions<K>, emit: PassageEmit<K>): void;
export type PassageNeutralityOptions = {
    /**
     * A declared, owned exception: content that pins a nation may name it. Nothing
     * else may, because everything else has to survive being cast onto whichever
     * nation the live board picks.
     */
    readonly allowNationNames?: boolean;
};
export declare function auditPassageNeutrality(passage: Passage, options: PassageNeutralityOptions, emit: PassageEmit<PassageFindingKind>): void;
