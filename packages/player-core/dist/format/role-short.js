import { institutionForRole } from "@admin/engine";
// The chairs at a cabinet table that run no department. The president's own is
// the one every cabinet has; the others are here so a charter seating a staff
// chief or a vice president does not draw one unnamed face among fifteen named
// ones, which reads as a gap in the data rather than as a chair with no
// department behind it.
const CHAIRS_WITHOUT_A_DEPARTMENT = {
    "role-president": "President",
    "role-vice-president": "Vice President",
    "role-chief-of-staff": "Chief of Staff",
};
/**
 * The department as a president names it: "Defense", "State", "Homeland
 * Security".
 *
 * For the places a chair has to be named *on a drawing* rather than in a row.
 * "Secretary of Homeland Security" under a 36pt face is three ellipsized
 * characters or a caption four times wider than the portrait; the full title
 * still goes to the screen reader and to every roster row, and this is only the
 * form the tableau can carry.
 *
 * The institution catalog already holds exactly this string and the executor
 * bench already reads it, so nothing here invents a second vocabulary — a chair
 * named "Defense" on the desk is named "Defense" on the dispatch board.
 *
 * Undefined for a role with neither a department nor an entry above, which is
 * the honest answer: the tableau draws no caption rather than a guess made by
 * chopping words off a title.
 */
export function roleShortLabel(roleId) {
    return CHAIRS_WITHOUT_A_DEPARTMENT[roleId] ?? institutionForRole(roleId)?.abbr;
}
