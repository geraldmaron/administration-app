export const READING_SOURCES = [
    "canonical-fact",
    "directly-observable",
    "administrative-measurement",
    "model-estimate",
    "political-forecast",
    "intelligence-assessment",
    "allegation",
];
// The words a reader sees where the source would otherwise be a slug. Written
// in the register a briefing uses — what desk this came off — rather than as
// the taxonomy's own names, which are for the code and nobody else.
const SOURCE_LABEL = {
    "canonical-fact": "On the record",
    "directly-observable": "Directly observed",
    "administrative-measurement": "Departmental returns",
    "model-estimate": "Staff estimate",
    "political-forecast": "Whip counts and press",
    "intelligence-assessment": "Intelligence assessment",
    allegation: "Unverified allegation",
};
/** What a source class is called on the line a reader actually reads. */
export function readingSourceLabel(source) {
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
export function readingCarriesFigure(reading) {
    if (reading.source === "allegation")
        return false;
    return reading.confidence !== "low";
}
