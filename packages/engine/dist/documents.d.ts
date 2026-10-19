/**
 * Document classification and family — shared game-domain types.
 * Lives in engine (not contracts) so the dependency-direction rule holds:
 * engine may only depend on world.
 *
 * Pruned to the families a reached caller actually stamps: the digest's daily
 * brief, and the decision memo `DecisionBrief.tsx` marks. The wider set this
 * file once declared (cables, sitreps, options papers, bills, court opinions
 * and the rest) had no producer anywhere in the app — seventeen families
 * exercised only by this file's own test — which is the "exported, tested,
 * called by nobody" defect the wave's law calls out by name. A family comes
 * back the day a second document type is actually composed and rendered.
 */
export type ClassificationLevel = "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET" | "TOP SECRET";
export type DocumentFamily = "presidential-daily-brief" | "presidential-decision-memo";
/** Scenario severity band — mirrors `@admin/content` without importing it. */
export type ScenarioSeverity = "routine" | "serious" | "critical";
export declare function classificationForSeverity(severity: ScenarioSeverity): ClassificationLevel;
export declare function defaultClassificationForFamily(family: DocumentFamily): ClassificationLevel;
export declare function classificationHelper(level: ClassificationLevel): string;
/**
 * Handling caveats — the second half of a real marking line.
 *
 * The level says how much damage disclosure does; the caveat says who may hold
 * it and what state it is in. They are separate facts and a document can carry
 * both, which is why the banner prints `SECRET // NOFORN` rather than inventing
 * a fifth level for every combination.
 */
export type HandlingCaveat = "PRE-DECISIONAL" | "NOFORN" | "ORCON" | "DELIBERATIVE" | "CLOSE HOLD";
export declare function documentFamilyLabel(family: DocumentFamily): string;
/** The finished marking a surface draws: level, why, and the caveat line. */
export type DocumentMarking = {
    readonly family: DocumentFamily;
    readonly level: ClassificationLevel;
    readonly helper: string;
    readonly caveats: readonly HandlingCaveat[];
    /** `SECRET // NOFORN // ORCON` — the line as it is actually stamped. */
    readonly line: string;
};
export type DocumentMarkingInput = {
    readonly family: DocumentFamily;
    /**
     * The week's own severity, where the document's sensitivity *is* the week's.
     *
     * It decides the level outright rather than raising the family default,
     * because the two answer different questions and the caller passing it is
     * asserting which one applies. A decision memo is a standing family of paper
     * the executive produces constantly; what makes one copy sensitive is the
     * week it is about, and a routine week is not a secret. Raising instead of
     * replacing would have marked every memo the player ever opens, which is how
     * a marking becomes wallpaper.
     */
    readonly severity?: ScenarioSeverity;
    /**
     * The document has been issued, filed, or published. A draft executive order
     * is pre-decisional working paper; the same order once signed is published in
     * the Federal Register and anyone may read it. Release is the single largest
     * mover of a marking, and it is a state the game already tracks — which is
     * what keeps the marking a fact about the document rather than a decoration
     * fixed to its type.
     */
    readonly released?: boolean;
};
/**
 * The one derivation of a document's marking.
 *
 * Deriving it here rather than per surface is what stops the inbox and the
 * document it opens from disagreeing about how closely the same paper is held.
 */
export declare function documentMarking({ family, severity, released }: DocumentMarkingInput): DocumentMarking;
