import type { Confidence } from "./assessments.js";
import type { MagnitudeBand } from "./projection.js";

// One shape for "here is a figure, and here is what kind of claim it is".
//
// The three parts already existed and never traveled together: the design
// system carried source and confidence and knew they belong on one line, the
// projection bundle carried the band that stops a cross-instrument summary
// claiming three decimal places, and the intelligence product carried the
// gaps. A screen that had one of the three showed a number with half a label
// on it, which is how a rolled coefficient came to be drawn as a measurement.
//
// Nothing here computes. A `Reading` is assembled by whichever module already
// knows the answer, and the screen that draws it renders the same provenance
// line a brief does.

/**
 * What kind of claim a figure is.
 *
 * The seven classes are ordered from what the game simply declares to what
 * somebody merely says, and the distinction that matters most sits in the
 * middle: an administrative measurement is a count somebody took, a model
 * estimate is arithmetic over things nobody counted, and a reader who cannot
 * tell them apart is being asked to trust both equally.
 */
export type ReadingSource =
  | "canonical-fact"
  | "directly-observable"
  | "administrative-measurement"
  | "model-estimate"
  | "political-forecast"
  | "intelligence-assessment"
  | "allegation";

export const READING_SOURCES: readonly ReadingSource[] = [
  "canonical-fact",
  "directly-observable",
  "administrative-measurement",
  "model-estimate",
  "political-forecast",
  "intelligence-assessment",
  "allegation",
];

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

// The words a reader sees where the source would otherwise be a slug. Written
// in the register a briefing uses — what desk this came off — rather than as
// the taxonomy's own names, which are for the code and nobody else.
const SOURCE_LABEL: Readonly<Record<ReadingSource, string>> = {
  "canonical-fact": "On the record",
  "directly-observable": "Directly observed",
  "administrative-measurement": "Departmental returns",
  "model-estimate": "Staff estimate",
  "political-forecast": "Whip counts and press",
  "intelligence-assessment": "Intelligence assessment",
  allegation: "Unverified allegation",
};

/** What a source class is called on the line a reader actually reads. */
export function readingSourceLabel(source: ReadingSource): string {
  return SOURCE_LABEL[source];
}

/**
 * Whether a reading is worth drawing as a figure at all.
 *
 * An allegation and a low-confidence estimate are claims, not measurements.
 * The surfaces that honor this draw the band and the provenance and withhold
 * the number, which is the difference between hedging a figure and not
 * printing one.
 */
export function readingCarriesFigure(reading: Reading): boolean {
  if (reading.source === "allegation") return false;
  return reading.confidence !== "low";
}
