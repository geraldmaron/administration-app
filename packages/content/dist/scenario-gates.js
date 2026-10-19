// Condition evaluators that read campaign memory (state marks, cohort strain).
// Kept beside the cast rather than inside it so scenario-cast stays under the
// file-size ceiling while the gate vocabulary grows.
import { grievanceReading } from "@admin/engine";
import { STATE_IDS } from "@admin/world";
import { cohortStrainReading } from "./impact-model.js";
function inBounds(value, atLeast, atMost) {
    if (atLeast !== undefined && value < atLeast)
        return false;
    if (atMost !== undefined && value > atMost)
        return false;
    return true;
}
function marksMatching(marks, signature) {
    if (signature === undefined)
        return marks;
    return marks.filter((mark) => mark.signature === signature);
}
/** Signed net mark weight for a stateGrievance gate. */
export function stateGrievanceMet(campaign, condition, locus) {
    const readingOf = (state) => {
        const marks = marksMatching(campaign.states[state]?.marks ?? [], condition.signature);
        return grievanceReading(marks);
    };
    if (condition.scope === "locus") {
        const state = locus?.state;
        if (!state)
            return false;
        return inBounds(readingOf(state), condition.atLeast, condition.atMost);
    }
    let extreme = 0;
    for (const id of STATE_IDS) {
        const reading = readingOf(id);
        if (Math.abs(reading) > Math.abs(extreme))
            extreme = reading;
    }
    return inBounds(extreme, condition.atLeast, condition.atMost);
}
/** Signed net strain weight for a cohortStrain gate. */
export function cohortStrainMet(campaign, condition) {
    const strains = campaign.cohorts[condition.cohort] ?? [];
    return inBounds(cohortStrainReading(strains, condition.cause), condition.atLeast, condition.atMost);
}
