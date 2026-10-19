export const APPOINTMENT_LABEL = {
    PAS: "Senate confirms",
    PA: "No Senate vote",
    SES: "Career staff",
    ScheduleC: "Political staff",
    "fixed-term": "Fixed term",
    judicial: "Judge",
    military: "Military officer",
};
export const APPOINTMENT_MEANING = {
    PAS: "You pick someone, and the Senate votes to confirm them",
    PA: "You pick someone, with no Senate vote",
    SES: "A career government job, not yours to fill",
    ScheduleC: "A political job you fill yourself",
    "fixed-term": "You pick someone for a term set by law, and the Senate confirms them",
    judicial: "You pick a judge, the Senate confirms them, and they serve for life",
    military: "A military officer you pick and the Senate confirms",
};
export const REMOVAL_LABEL = {
    "at-will": "Any time",
    "for-cause": "Only for a reason",
    "term-protected": "Protected term",
};
const REMOVAL_MEANING = {
    "at-will": "You can remove them whenever you choose, but it lowers your international standing",
    "for-cause": "You can remove them only for a reason the law accepts, and you have to put it in writing",
    "term-protected": "You can't remove them just because you disagree with them. You have to wait for their term to end",
};
/**
 * Exported because the cabinet roster prints the same facts on its own rows,
 * and one office described two ways in one room is worse than either wording.
 */
export const ACTING_LABEL = {
    "vacancies-act": "Vacancies Act",
    "statutory-succession": "Next in line",
    "board-quorum": "Board carries on",
    none: "No stand-in",
};
export const ACTING_MEANING = {
    "vacancies-act": "Someone can fill in for a limited time while the job is empty",
    "statutory-succession": "The law says who fills in while the job is empty",
    "board-quorum": "Nobody fills in. The board keeps working as long as it has enough members to vote",
    none: "Nobody can fill in while the job is empty",
};
/**
 * The three staffing facts an office wears, in stable order. Callers may hide
 * the ordinary at-will removal fact in bulk views, but the exceptions stay in
 * the same slot and the office file can still state the complete rule.
 */
export function staffingChips(office, { showOrdinaryRemoval = true } = {}) {
    const actingLimit = office.actingLimitDays !== undefined ? `, up to ${office.actingLimitDays} days` : "";
    const chips = [
        {
            key: "appointment",
            label: APPOINTMENT_LABEL[office.appointmentClass],
            spoken: `Appointment: ${APPOINTMENT_LABEL[office.appointmentClass]}. ${APPOINTMENT_MEANING[office.appointmentClass]}.`,
        },
        {
            key: "removal",
            label: REMOVAL_LABEL[office.removal],
            spoken: `Removal: ${REMOVAL_LABEL[office.removal]}. ${REMOVAL_MEANING[office.removal]}.`,
        },
        {
            key: "acting",
            label: ACTING_LABEL[office.actingAuthority],
            spoken: `Who fills in: ${ACTING_LABEL[office.actingAuthority]}. ${ACTING_MEANING[office.actingAuthority]}${actingLimit}.`,
        },
    ];
    return showOrdinaryRemoval || office.removal !== "at-will"
        ? chips
        : chips.filter((chip) => chip.key !== "removal");
}
