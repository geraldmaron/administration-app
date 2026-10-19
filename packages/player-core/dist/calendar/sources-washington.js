import { institutionDef, officeDef, seatKindOf, selectBillsAwaitingSignature, selectSigningWindow, selectUpcomingSeats, } from "@admin/engine";
import { place } from "../navigation/places";
import { beforeHorizon, dateOfDay, inWindow } from "./window";
/**
 * Washington's dates: the bills on the desk and the fixed-term seats falling
 * open. Every enrolled bill is listed, not only the one nearest its tenth day.
 */
function deskEvent(campaign, bill) {
    return {
        id: `bill:${bill.id}:signing`,
        date: selectSigningWindow(campaign, bill).deadline,
        kind: "legislative",
        title: `Sign or veto: ${bill.title}`,
        urgency: "hard",
        entityRefs: [{ kind: "bill", id: bill.id }],
        href: place.bill(bill.id),
        lapse: "It becomes law without your signature.",
        authorityCite: "U.S. Const. art. I, §7, cl. 2",
        summons: "bill-desk",
    };
}
export function legislativeCalendar(campaign, window) {
    return selectBillsAwaitingSignature(campaign)
        .map((bill) => deskEvent(campaign, bill))
        .filter((event) => beforeHorizon(window, event.date));
}
function seatEvent(campaign, opening) {
    const office = officeDef(opening.office);
    const body = institutionDef(opening.institution);
    if (!office || !body)
        return undefined;
    const plural = office.seats !== undefined && office.seats > 1;
    return {
        id: `seat:${opening.office}:${opening.seatIndex}:${opening.opensDay}`,
        // Seat terms are kept as campaign days; the day is the record.
        date: dateOfDay(campaign, opening.opensDay),
        kind: "appointment",
        title: plural ? `${body.abbr} seat ${opening.seatIndex + 1} opens` : `${office.title} term ends`,
        detail: `${body.name}. Fixed term of ${opening.termYears} years.`,
        urgency: "soft",
        entityRefs: [{ kind: "institution", id: opening.institution }],
        href: seatKindOf(opening.office) ? place.appointments(opening.office) : place.appointments(),
    };
}
export function seatCalendar(campaign, window, horizonDays) {
    return selectUpcomingSeats(campaign, horizonDays).flatMap((opening) => {
        const event = seatEvent(campaign, opening);
        return event && inWindow(window, event.date) ? [event] : [];
    });
}
