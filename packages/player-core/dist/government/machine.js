import { INSTITUTION_CATALOG } from "@admin/engine";
// The White House posts, the band-and-confidence readings and an office's
// staffing facts belong to the same vocabulary and reach the package through
// this module.
export * from "./machine-white-house.js";
export * from "./machine-readings.js";
export { staffingChips } from "../institution/office-chips.js";
export const COMMAND_LABEL = {
    directed: "Under your direction",
    "arms-length": "Partly independent",
    independent: "Independent of you",
};
export function commandOf(def) {
    switch (def.independence) {
        case "independent":
            return "independent";
        case "semi-autonomous":
            return "arms-length";
        default:
            return "directed";
    }
}
const RANK_BY_ROLE = new Map(INSTITUTION_CATALOG.flatMap((def) => {
    const rank = def.offices[0]?.cabinetRank;
    return def.cabinetRole && rank !== undefined ? [[def.cabinetRole, rank]] : [];
}));
/** Where a cabinet chair sits in the order of precedence, if it has one. */
export function cabinetRankOf(role) {
    return RANK_BY_ROLE.get(role);
}
/**
 * Where a nomination is, in the words a player would use rather than the stage
 * id.
 */
export function nominationStanding(nomination) {
    switch (nomination.stage) {
        case "shortlist":
            return "On the shortlist";
        case "vetting":
            return "Background check under way";
        case "prepared":
            return "Paperwork ready";
        case "nominated":
            return "Sent to the Senate";
        case "referred":
            return "Sent to a Senate committee";
        case "disclosures":
            return "Committee is reviewing their records";
        case "hearing-scheduled":
            return "Waiting for a hearing date";
        case "hearing":
            return "At the hearing";
        case "committee-action":
            return "Waiting for the committee's decision";
        case "executive-calendar":
            return "On the Senate's list for a vote";
        case "floor-pending":
            return "Waiting for a vote in the full Senate";
        case "cloture":
            return "Vote to end debate requested";
        case "vote":
            return "Being voted on";
        case "confirmed":
            return "Confirmed, not yet sworn in";
        case "sworn-in":
            return "Sworn in";
        case "rejected":
            return "Voted down by the Senate";
        case "withdrawn":
            return "Withdrawn";
        case "returned":
            return "Sent back without a vote";
    }
}
