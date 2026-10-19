import { CARETAKER_QUALITY, POLICY_QUALITY_RANGE, directivesFor, domainsChairedBy, executionQuality, institutionChildren, institutionForRole, selectAppointableFor, selectCabinetExposure, selectCabinetHolder, selectCabinetSeats, selectCounselRecord, selectLoyaltyTrend, selectDepartureTransitions, selectNominationForOffice, } from "@admin/engine";
import { COMMAND_LABEL, commandOf, nominationStanding } from "../government/machine";
import { deliveryShare } from "./west-wing";
/**
 * The cabinet as the roster reads it, for a campaign in play.
 *
 * Kept out of the screen so it can be asserted on: which chairs exist, which
 * are empty, who is still appointable to them and where the player sits are
 * facts about the campaign, and a screen is the wrong place to find out they
 * are wrong.
 *
 * Every reading composed here is one the turn loop itself runs — the delivery
 * multiplier, the break-ranks rate, the counsel record, the office's own
 * removal rule. None of it is stored and none of it is derived twice, so a row
 * cannot claim something the week will then fail to do.
 */
function withTrend(campaign, person) {
    const trend = selectLoyaltyTrend(campaign, person);
    return trend ? { loyaltyMovedPoints: trend.movedPoints } : {};
}
/** Component offices under a body with nobody confirmed in them. */
function unledBureaus(campaign, institution) {
    return institutionChildren(institution.id).filter((child) => campaign.institutions[child.id]?.vacancy === true).length;
}
/**
 * What a department is currently carrying, whether or not anyone is over it.
 *
 * A vacant chair reads on this scale rather than on the program multiplier's:
 * with nobody confirmed, `executionQuality` collapses to the caretaker floor
 * and would print the same "−40%" against every empty seat in the government.
 * The building's own share is the honest figure, and it is the one that says
 * what the vacancy is costing.
 */
function departmentReading(campaign, institution) {
    const runtime = campaign.institutions[institution.id];
    if (!runtime)
        return {};
    return {
        deliversQuality: runtime.implementationQuality,
        deliversFraction: Math.max(0, Math.min(1, runtime.implementationQuality)),
        deliversValue: `${Math.round(runtime.implementationQuality * 100)}%`,
        deliversLabel: institution.abbr,
        deliversKind: "department",
        ...(runtime.backlog >= 1 ? { departmentBacklog: Math.round(runtime.backlog) } : {}),
        ...(unledBureaus(campaign, institution) > 0
            ? { departmentUnledBureaus: unledBureaus(campaign, institution) }
            : {}),
    };
}
function withDelivery(campaign, role, held) {
    const institution = institutionForRole(role);
    if (!held)
        return institution ? departmentReading(campaign, institution) : {};
    const domains = domainsChairedBy(campaign, role);
    if (domains.length > 0) {
        const average = domains.reduce((sum, domain) => sum + executionQuality(campaign, domain), 0) / domains.length;
        const fraction = Math.max(0, Math.min(1, (average - CARETAKER_QUALITY) / POLICY_QUALITY_RANGE));
        return {
            deliversQuality: average,
            deliversFraction: fraction,
            deliversValue: deliveryShare(average),
            deliversKind: "program",
            // Named even on the program reading. Four inner-cabinet chairs can land
            // on the same share in the same week, and a row that said only "+34%"
            // would print the identical sentence under four different faces.
            ...(institution ? { deliversLabel: institution.abbr, ...departmentQueue(campaign, institution) } : {}),
        };
    }
    // A chair that runs a department but chairs no legislable domain still
    // delivers something, and it is what that department can currently carry.
    // Only six domains are legislable and five roles chair them, so without this
    // ten of the fifteen secretaries would show a blank where every other row
    // shows a figure.
    return institution ? departmentReading(campaign, institution) : {};
}
/** The queue and the unled bureaus, for a chair whose own reading is the program multiplier. */
function departmentQueue(campaign, institution) {
    const runtime = campaign.institutions[institution.id];
    if (!runtime)
        return {};
    return {
        ...(runtime.backlog >= 1 ? { departmentBacklog: Math.round(runtime.backlog) } : {}),
        ...(unledBureaus(campaign, institution) > 0
            ? { departmentUnledBureaus: unledBureaus(campaign, institution) }
            : {}),
    };
}
/**
 * The odds this chair breaks in a bad week and the way it breaks — the one
 * reading on the row that is about this officer rather than about their
 * building, and the reason no two rows in a cabinet read alike.
 */
function withBreak(campaign, role) {
    const exposure = selectCabinetExposure(campaign, role);
    return exposure ? { breaks: { rate: exposure.rate, restOfTerm: exposure.restOfTerm, outcome: exposure.outcome } } : {};
}
/** What their advice has been worth. Silent until they have been asked something contested. */
function withCounsel(campaign, role) {
    const record = selectCounselRecord(campaign, role);
    if (!record || record.contested === 0)
        return {};
    return {
        counsel: { contested: record.contested, right: record.right, overruled: record.overruled },
    };
}
/**
 * The office's own staffing rules, and where a name already sent up for it
 * stands.
 *
 * All three rules ride the seat rather than the removal alone: how the chair is
 * filled decides whether a nomination is a Senate fight, and what may act in it
 * decides what happens to the department while it is empty. The row prints the
 * ones that are load-bearing for the state the chair is actually in.
 */
function withOffice(campaign, role, held) {
    const institution = institutionForRole(role);
    const office = institution?.offices[0];
    if (!office)
        return {};
    // A chair being handed on carries its successor's nomination while the
    // outgoing Secretary still sits in it.
    const handedOn = selectDepartureTransitions(campaign).some((transition) => transition.role === role);
    const nomination = held && !handedOn ? undefined : selectNominationForOffice(campaign, office.id);
    return {
        ...(institution ? { office: departmentSummary(campaign, institution) } : {}),
        removal: office.removal,
        appointment: office.appointmentClass,
        acting: office.actingAuthority,
        ...(office.actingLimitDays !== undefined ? { actingLimitDays: office.actingLimitDays } : {}),
        ...(nomination ? { nomination: nominationStanding(nomination) } : {}),
    };
}
function departmentSummary(campaign, institution) {
    const runtime = campaign.institutions[institution.id];
    const children = institutionChildren(institution.id);
    const unledComponentCount = children.filter((child) => campaign.institutions[child.id]?.vacancy === true).length;
    return {
        id: institution.id,
        name: institution.name,
        abbr: institution.abbr,
        commandLabel: COMMAND_LABEL[commandOf(institution)],
        componentCount: children.length,
        unledComponentCount,
        activeOrderCount: directivesFor(campaign, institution.id).length,
        ...(institution.offices[0] ? { chairTitle: institution.offices[0].title } : {}),
        ...(runtime?.vacancy === true ? { vacancyDays: Math.round(runtime.vacantDays) } : {}),
    };
}
/** Where the holder is serving out an announced departure, how long is left and whether a successor is up. */
function withDeparture(campaign, role) {
    const transition = selectDepartureTransitions(campaign).find((entry) => entry.role === role);
    if (!transition || campaign.player.cabinet[role] !== transition.person)
        return {};
    return { departing: { weeksLeft: Math.max(0, transition.leavesTurn - campaign.turn), successorPending: transition.successorPending } };
}
/** The department as a president names it, for the label drawn under a face. */
function shortLabelFor(role, isPlayer) {
    if (isPlayer)
        return { shortLabel: "President" };
    const abbr = institutionForRole(role)?.abbr;
    return abbr ? { shortLabel: abbr } : {};
}
export function cabinetSeats(campaign) {
    return selectCabinetSeats(campaign)
        // The player's own chair leads the roster wherever the charter happens to
        // order it. It is the one seat that is not a decision, and burying it under
        // five that are made the screen open on somebody else's appointment.
        .slice()
        .sort((a, b) => Number(b === campaign.founding.leadRole) - Number(a === campaign.founding.leadRole))
        .map((role) => seatOf(campaign, role));
}
function seatOf(campaign, role) {
    const runtime = selectCabinetHolder(campaign, role);
    const isPlayer = role === campaign.founding.leadRole;
    const held = runtime !== undefined;
    return {
        role: role,
        holder: runtime?.base,
        isPlayer,
        // A held chair reads the same bench a vacancy does: who the
        // nomination path would accept today, if this chair opened. The bench is
        // never a standing offer to replace the sitting officer — `selectAppointableFor`
        // already excludes the holder by their own `currentRole`, and sending a
        // name up while the chair is held is refused until it is emptied first,
        // which is a decision with its own price.
        candidates: selectAppointableFor(campaign, role).map((entry) => entry.base),
        rival: runtime?.affiliation !== undefined,
        ...shortLabelFor(role, isPlayer),
        // Where the reading has moved since they took the chair. A loyalty of
        // 62 is a fact; 62 and falling is a decision, and the roster is where
        // the player is choosing whether to keep them.
        ...(runtime ? withTrend(campaign, runtime.base.id) : {}),
        // The president's own chair is not one this seat appoints, so none of the
        // consequence readings apply to it.
        ...(isPlayer
            ? {}
            : {
                ...withDelivery(campaign, role, held),
                ...withBreak(campaign, role),
                ...withCounsel(campaign, role),
                ...withOffice(campaign, role, held),
                ...withDeparture(campaign, role),
            }),
        // The player's own face is the picture they chose at founding, held on
        // the founding record rather than on their Person — a save carries a
        // pointer to a local file, not the file.
        ...(isPlayer ? { portraitUri: campaign.founding.leader.portraitUri } : {}),
    };
}
