import { organizations } from "@admin/world";
import { campaignFoundingDate, compareDates } from "../clock.js";
import { JUDICIARY_SEAT_INSTITUTIONS } from "../judiciary.js";
import { CIRCUIT_SEATS } from "../lower-bench.js";
import { liveMembers } from "../world-events-filing.js";
const JUDICIAL_SEATS = [...JUDICIARY_SEAT_INSTITUTIONS, ...CIRCUIT_SEATS.map((seat) => seat.id)];
const changeKey = (change) => `${change.nation}|${change.date.year}-${change.date.month}-${change.date.day}|${change.kind}`;
function rosters(campaign) {
    return Object.fromEntries(organizations.map((org) => [org.id, new Set(liveMembers(campaign, org.id))]));
}
function vacantSeats(campaign) {
    return new Set(JUDICIAL_SEATS.filter((id) => campaign.institutions[id]?.vacancy));
}
/** The census before the first week: what the founding board already carries is not counted. */
export function startCensus(founded) {
    return {
        seenChanges: new Set((founded.foreignPolitics?.recent ?? []).map(changeKey)),
        coups: 0,
        elections: 0,
        otherChanges: 0,
        rosters: rosters(founded),
        exits: {},
        accessions: {},
        vacantSeats: vacantSeats(founded),
        judicialVacancies: 0,
    };
}
const bump = (counts, key, by) => by === 0 ? counts : { ...counts, [key]: (counts[key] ?? 0) + by };
/** Fold one advanced week into the census. */
export function observeWeek(census, campaign) {
    const founding = campaignFoundingDate(campaign);
    const fresh = (campaign.foreignPolitics?.recent ?? []).filter((change) => !change.projected && compareDates(change.date, founding) >= 0 && !census.seenChanges.has(changeKey(change)));
    const now = rosters(campaign);
    let exits = census.exits;
    let accessions = census.accessions;
    for (const [org, members] of Object.entries(now)) {
        const before = census.rosters[org] ?? new Set();
        exits = bump(exits, org, [...before].filter((id) => !members.has(id)).length);
        accessions = bump(accessions, org, [...members].filter((id) => !before.has(id)).length);
    }
    const vacant = vacantSeats(campaign);
    return {
        seenChanges: new Set([...census.seenChanges, ...fresh.map(changeKey)]),
        coups: census.coups + fresh.filter((change) => change.kind === "coup").length,
        elections: census.elections + fresh.filter((change) => change.kind === "election").length,
        otherChanges: census.otherChanges + fresh.filter((change) => change.kind !== "coup" && change.kind !== "election").length,
        rosters: now,
        exits,
        accessions,
        vacantSeats: vacant,
        judicialVacancies: census.judicialVacancies + [...vacant].filter((id) => !census.vacantSeats.has(id)).length,
    };
}
/**
 * Successful coups a year worldwide, the one band both the events and the
 * geopolitics probes assert. Powell and Thyne as read by the RAND Forecasting
 * Initiative put successes at about 1.65 a year for 1960 to 2023, with recent
 * years between 2 and 6 (search results only, not opened: both audits say so).
 * The engine records successful coups only, so attempts (about 6.6 a year) are
 * not a comparable denominator.
 */
export const COUPS_PER_YEAR = { min: 0.5, max: 8 };
