import { actOf } from "./legislative-acts.js";
import { selectChairRunner } from "./appointments.js";
import { axisLean } from "./person-disposition.js";
import { usPartyOfPerson } from "./cast-fit.js";
// The Secretary who makes the department's case on the Hill.
//
// A President asking a member for a vote on a defense bill is not asking alone:
// the Secretary of Defense has already been up to the Hill about it, and a
// Secretary the member finds persuasive makes the ask easier while one they do
// not makes it harder. This reads that Secretary off the bill's committee,
// because the committee is what the Hill itself uses to say whose business a
// bill is, and the department that answers to that committee is the one whose
// Secretary testifies for it.
/**
 * Whose Secretary carries a bill, by the Senate committee that marks it up.
 *
 * Commerce, Science, and Transportation and Environment and Public Works both
 * write the highway and transit titles, which the Secretary of Transportation
 * testifies for. Banking and Finance are both the Treasury's: the money a bill
 * raises or a market it steadies is the Secretary of the Treasury's to defend.
 */
export const ACT_ADVOCATE = {
    "CMTE-AGRICULTURE": "role-agriculture-secretary",
    "CMTE-ARMED": "role-defense-minister",
    "CMTE-BANKING": "role-treasury-minister",
    "CMTE-COMMERCE": "role-transportation-secretary",
    "CMTE-ENERGY": "role-energy-secretary",
    "CMTE-ENVIRONMENT": "role-transportation-secretary",
    "CMTE-FINANCE": "role-treasury-minister",
    "CMTE-FOREIGN": "role-foreign-minister",
    "CMTE-HELP": "role-labor-secretary",
    "CMTE-HOMELAND": "role-homeland-secretary",
    "CMTE-INTEL": "role-intelligence-director",
    "CMTE-JUDICIARY": "role-attorney-general",
    "CMTE-VETERANS": "role-veterans-secretary",
};
/** How much a persuasive Secretary is worth to a private ask, per unit of craft above the typical cabinet's. */
const ADVOCATE_WEIGHT = 0.12;
/** A member across the aisle hears a Secretary of the other party out, and discounts them. */
const ACROSS_THE_AISLE = 0.6;
/** Nobody in the chair means nobody made the case, which a member notices. */
const VACANT_CHAIR = -0.02;
const round4 = (value) => Math.round(value * 10000) / 10000 + 0;
function sameParty(advocate, member) {
    const theirs = member.person ? usPartyOfPerson(member.person) : undefined;
    return theirs !== undefined && usPartyOfPerson(advocate) === theirs;
}
/**
 * Who makes the case for this bill to this member, and what it is worth. Only
 * for a private ask: a public appeal goes over the member's head to their
 * voters, where no Secretary is in the room.
 */
export function lobbyAdvocate(campaign, member, approach, billId) {
    if (approach === "public" || billId === undefined)
        return undefined;
    const bill = campaign.bills[billId];
    const committee = bill ? actOf(bill)?.committee : undefined;
    const role = committee ? ACT_ADVOCATE[committee] : undefined;
    if (!role)
        return undefined;
    const runner = selectChairRunner(campaign, role);
    if (!runner)
        return { role, billId, sameParty: false, value: VACANT_CHAIR };
    const person = runner.base;
    const party = sameParty(person, member);
    const value = round4(ADVOCATE_WEIGHT * axisLean(person, "craft") * (party ? 1 : ACROSS_THE_AISLE));
    return { role, billId, person, sameParty: party, value };
}
/** The advocate as the member weighs it: one term, or none where no Secretary carries the bill. */
export function advocateTerms(campaign, member, approach, billId) {
    const advocate = lobbyAdvocate(campaign, member, approach, billId);
    return advocate ? [{ key: "advocate", source: "situation", value: advocate.value }] : [];
}
