import { EMERGENCY_NOTICE_TURNS, EMERGENCY_RENEWAL_TURNS, EXTENSION_DAYS, TERMINATION_WINDOW_DAYS, emergencyCauseLabel, formatGameDate, hasLapsed, selectDeclaredEmergencies, selectObligations, terminationClockRuns, terminationStartDay, } from "@admin/engine";
import { place } from "../navigation/places";
import { reportTitle, terminationTitle } from "../summons/due-executive";
import { beforeHorizon, dateOfDay, dateOfTurn } from "./window";
/**
 * The clocks the use of force and the emergency powers run on.
 *
 * Every obligation is listed, not only the nearest: the summons folio speaks
 * for the closest clock, and a calendar that showed one of three introductions
 * would hide two deadlines the statute is counting.
 */
function nationName(campaign, id) {
    return campaign.nations[id]?.base.identity.name ?? id;
}
function reportEvent(campaign, obligation) {
    if (obligation.filing !== undefined)
        return undefined;
    return {
        id: `war-powers:${obligation.id}:report`,
        date: dateOfDay(campaign, obligation.dueDay),
        kind: "war-powers",
        // The summons' own title, so the desk's row and this date read as one obligation.
        title: reportTitle(campaign, obligation),
        detail: obligation.description,
        urgency: "soft",
        entityRefs: [{ kind: "nation", id: obligation.target }],
        href: place.security(),
        lapse: "You miss the report, and the 60-day clock counts from the day it was due.",
        authorityCite: "50 U.S.C. §1543(a)",
        summons: "war-powers-report",
    };
}
/**
 * The sixty days and the certified thirty beyond them. Whichever window the
 * engine is counting carries the summons' title and tag, so the desk's
 * termination row folds into the date it actually speaks for.
 */
function terminationEvents(campaign, obligation) {
    if (!terminationClockRuns(campaign, obligation))
        return [];
    const where = nationName(campaign, obligation.target);
    const start = terminationStartDay(obligation);
    const extended = obligation.extension !== undefined;
    const live = { title: terminationTitle(campaign, obligation), urgency: "hard", summons: "war-powers-termination" };
    const base = { kind: "war-powers", entityRefs: [{ kind: "nation", id: obligation.target }], href: place.security(), authorityCite: "50 U.S.C. §1544(b)" };
    const sixty = {
        ...base,
        id: `war-powers:${obligation.id}:sixty`,
        date: dateOfDay(campaign, start + TERMINATION_WINDOW_DAYS),
        ...(extended
            ? { title: `60-day limit on forces in ${where}`, urgency: "ambient", detail: "Extended because you certified the troops need more time to leave safely." }
            : live),
        lapse: "Unless Congress votes to allow it, the troops must come out, or you must certify 30 more days to bring them home.",
    };
    const ninety = {
        ...base,
        id: `war-powers:${obligation.id}:ninety`,
        date: dateOfDay(campaign, start + TERMINATION_WINDOW_DAYS + EXTENSION_DAYS),
        ...(extended
            ? { ...live, detail: "The 30 extra days you certified to bring the troops home end here." }
            : { title: `90-day final limit on forces in ${where}`, urgency: "ambient", detail: "This date only applies if you certify the 30-day extension." }),
        lapse: "No more extensions are possible. Troops still there would be serving under a permission the law says has run out.",
    };
    return [sixty, ninety];
}
export function warPowersCalendar(campaign, window) {
    return selectObligations(campaign)
        .flatMap((obligation) => {
        const report = reportEvent(campaign, obligation);
        return [...(report ? [report] : []), ...terminationEvents(campaign, obligation)];
    })
        .filter((event) => beforeHorizon(window, event.date));
}
function declarationEvent(campaign, emergency) {
    const national = emergency.scope.kind === "nation";
    const notice = dateOfTurn(campaign, emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS - EMERGENCY_NOTICE_TURNS);
    return {
        id: `emergency:${emergency.id}:anniversary`,
        date: dateOfTurn(campaign, emergency.renewedTurn + EMERGENCY_RENEWAL_TURNS),
        kind: "emergency",
        title: `${emergencyCauseLabel(emergency.cause)} emergency ends unless you renew it`,
        detail: `You can publish the renewal notice starting ${formatGameDate(notice)}.`,
        urgency: "soft",
        entityRefs: emergency.scope.kind === "state" ? [{ kind: "state", id: emergency.scope.state }] : [],
        href: place.emergencyDeclaration(emergency.id),
        lapse: "The emergency ends, and so do the powers it gave you.",
        ...(national ? { authorityCite: "50 U.S.C. §1622(d)" } : {}),
    };
}
function findingEvent(campaign, finding) {
    return {
        id: `emergency:${finding.id}:expiry`,
        date: dateOfTurn(campaign, finding.expiresTurn),
        kind: "emergency",
        title: `Emergency finding on ${nationName(campaign, finding.target)} expires`,
        urgency: "soft",
        entityRefs: [{ kind: "nation", id: finding.target }],
        href: place.country(finding.target),
        lapse: "The finding ends unless you declare it again.",
        authorityCite: "50 U.S.C. §1622(d)",
    };
}
export function emergencyCalendar(campaign, window) {
    const declarations = selectDeclaredEmergencies(campaign)
        .filter((emergency) => !hasLapsed(emergency, campaign.turn))
        .map((emergency) => declarationEvent(campaign, emergency));
    const findings = Object.values(campaign.externalEmergencies ?? {})
        .filter((finding) => finding.endedTurn === undefined && campaign.turn < finding.expiresTurn)
        .map((finding) => findingEvent(campaign, finding));
    return [...declarations, ...findings].filter((event) => beforeHorizon(window, event.date));
}
