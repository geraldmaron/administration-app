/**
 * Lowest to highest. The engine models no compartments, so there is no
 * level above TOP SECRET here; a marking the simulation never assigned
 * would claim a sensitivity it does not have.
 */
export const CLASSIFICATION_ORDER = ["UNCLASSIFIED", "CONFIDENTIAL", "SECRET", "TOP SECRET"];
function rank(level) {
    return CLASSIFICATION_ORDER.indexOf(level);
}
/** The most restrictive level among those given; UNCLASSIFIED when none is marked. */
export function highestClassification(levels) {
    let highest = "UNCLASSIFIED";
    for (const level of levels) {
        if (level !== undefined && rank(level) > rank(highest))
            highest = level;
    }
    return highest;
}
/** The words a banner line carries: the level itself, in capitals, as the government prints it. */
export function bannerWords(level) {
    return level;
}
