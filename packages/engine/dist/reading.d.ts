import type { Confidence } from "./assessments.js";
import type { MagnitudeBand } from "./projection.js";
/**
 * What kind of claim a figure is.
 *
 * The seven classes are ordered from what the game simply declares to what
 * somebody merely says, and the distinction that matters most sits in the
 * middle: an administrative measurement is a count somebody took, a model
 * estimate is arithmetic over things nobody counted, and a reader who cannot
 * tell them apart is being asked to trust both equally.
 */
export type ReadingSource = "canonical-fact" | "directly-observable" | "administrative-measurement" | "model-estimate" | "political-forecast" | "intelligence-assessment" | "allegation";
export declare const READING_SOURCES: readonly ReadingSource[];
/**
 * A figure with its provenance attached.
 *
 * `band` is the magnitude the reading honestly supports; `range` is the span
 * behind it where one is known, and is absent rather than invented where the
 * producer has no error bar to give. `gaps` names what is missing, because a
 * low-confidence reading that cannot say why is a hedge rather than a caveat.
 */
export type Reading = {
    readonly band: MagnitudeBand;
    readonly source: ReadingSource;
    readonly confidence: Confidence;
    readonly range?: readonly [number, number];
    readonly gaps?: readonly string[];
};
/** What a source class is called on the line a reader actually reads. */
export declare function readingSourceLabel(source: ReadingSource): string;
/**
 * Whether a reading is worth drawing as a figure at all.
 *
 * An allegation and a low-confidence estimate are claims, not measurements.
 * The surfaces that honor this draw the band and the provenance and withhold
 * the number, which is the difference between hedging a figure and not
 * printing one.
 */
export declare function readingCarriesFigure(reading: Reading): boolean;
