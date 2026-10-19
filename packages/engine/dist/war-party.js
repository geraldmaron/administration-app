import { selectConflictsInvolving } from "./conflicts.js";
import { selectActiveConflicts } from "./state.js";
// Two different questions hide behind "is the country at war", and the powers
// that follow from each are different.
//
// A government that joined a war abroad is a party to it: it fights, it pays,
// and the public counts it as a war. A government whose own soil is being
// defended is something narrower, and the homeland powers (the Suspension
// Clause, federalizing the Guard) are written for that case alone. Naming both
// here, beside each other, is what makes a caller choose which one it means.
/** Every live war the nation fights in, as a principal or as a joiner on either side. */
export function conflictsAsParty(campaign, nation = campaign.founding.nation) {
    return selectConflictsInvolving(campaign, nation);
}
/** Whether the nation is a party to any live war, joined or principal. */
export function atWarAsParty(campaign, nation) {
    return conflictsAsParty(campaign, nation).length > 0;
}
/**
 * Whether the President's own country is defending a war on its own soil. A war
 * it is prosecuting abroad, or one it joined, is not an invasion.
 */
export function homelandInvaded(campaign) {
    return selectActiveConflicts(campaign).some((conflict) => conflict.defender === campaign.founding.nation);
}
