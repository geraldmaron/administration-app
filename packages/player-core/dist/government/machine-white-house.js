import { VICE_PRESIDENCY_INSTITUTION_ID, selectPerson } from "@admin/engine";
import { VICE_PRESIDENT_ROLE_ID, WHITE_HOUSE_ROLE_TITLES, WHITE_HOUSE_STAFF_ROLE_IDS, } from "@admin/world";
/** The Vice President first, then the staff in the order the contract lists them. */
const WHITE_HOUSE_ROLE_ORDER = [VICE_PRESIDENT_ROLE_ID, ...WHITE_HOUSE_STAFF_ROLE_IDS];
const INSTITUTION_OF = {
    "role-vice-president": VICE_PRESIDENCY_INSTITUTION_ID,
    "role-chief-of-staff": "INST-PRESIDENCY",
    "role-national-security-adviser": "INST-NSC",
    "role-press-secretary": "INST-PRESIDENCY",
};
// Stated as what the office is, never as a lever the game does not offer: no
// staff post can be vacated yet, so none of these says "serves at your pleasure".
const DUTY_OF = {
    "role-vice-president": "Leads the Senate and casts the deciding vote in a tie. Gives you a small boost in every Senate count. First in line to take over if you can't serve. You can't fire them.",
    "role-chief-of-staff": "Runs the White House staff and decides which department requests reach your desk. How skilled and loyal they are changes how likely each Secretary is to break with you in a given week. You hire them without a Senate vote.",
    "role-national-security-adviser": "Coordinates the National Security Council's work across State, Defense, and the intelligence agencies. You hire them without a Senate vote.",
    "role-press-secretary": "Speaks for the White House from the podium in the briefing room. You hire them without a Senate vote.",
};
// The founding records who it seated in each staff post, and nothing else
// writes the staff, so that record is the current holder. The Vice President is
// the one post that can change hands: `campaign.vicePresident` follows a
// confirmation after a vacancy.
function holderIdOf(campaign, role) {
    if (role === VICE_PRESIDENT_ROLE_ID)
        return campaign.vicePresident;
    return campaign.founding.staff?.[role];
}
function holderOf(campaign, role) {
    const id = holderIdOf(campaign, role);
    const runtime = id === undefined ? undefined : selectPerson(campaign, id);
    return runtime?.alive ? runtime.base : undefined;
}
// The running mate is on the ticket and owes the Senate nothing; anyone seated
// since a vacancy was confirmed by both houses.
function vicePresidentTenure(campaign) {
    const holder = campaign.vicePresident;
    const seated = Object.values(campaign.nominations).some((nomination) => nomination.institution === VICE_PRESIDENCY_INSTITUTION_ID &&
        nomination.nominee === holder &&
        (nomination.stage === "confirmed" || nomination.stage === "sworn-in"));
    return seated ? "confirmed" : "elected";
}
/** Every White House post, filled or not, in order. */
export function whiteHouseSeats(campaign) {
    return WHITE_HOUSE_ROLE_ORDER.map((role) => ({
        role,
        title: WHITE_HOUSE_ROLE_TITLES[role],
        holder: holderOf(campaign, role),
        tenure: role === VICE_PRESIDENT_ROLE_ID ? vicePresidentTenure(campaign) : "appointed",
        institution: INSTITUTION_OF[role],
        duty: DUTY_OF[role],
    }));
}
/** The White House post a person holds, if they hold one. */
export function whiteHouseSeatOf(campaign, personId) {
    return whiteHouseSeats(campaign).find((seat) => seat.holder?.id === personId);
}
