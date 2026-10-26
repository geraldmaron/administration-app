import { addDays, campaignFoundingDate, compareDates, daysBetween, weekCloseDate } from "./clock.js";
import { createRngStreams } from "./rng.js";
import { JUDICIARY_SEAT_ROLE } from "./judiciary.js";
import { selectForeignSeat } from "./foreign-politics.js";
import { institutionDef } from "./institutions.js";
import { CAREER_INCUMBENT_ROLE } from "./career-incumbents.js";
// Who in office can die, and when. Only occupied offices are drawn: a person
// with no seat is a biography, and simulating every biography's mortality would
// cost a draw per person per year for deaths no surface reads.
//
// The President does not die at random. An unpreventable death would end a
// campaign the player did nothing to lose, and adding that rule is a design
// change of its own. The Vice President is drawn like any other office-holder:
// the vacancy is filled through the Twenty-fifth Amendment's nomination, and
// until it is the Speaker stands next in line. Judges are drawn once a year by
// judicial-vacancies.ts with their own sourced adjustments and are never drawn
// here.
// CDC/NCHS, United States Life Tables, 2024 (NVSR vol. 75 no. 5, August 25,
// 2026), table 1, qx for the total population, ages 18 to 99. The cast carries
// no biological-sex field, so the total-population column is used for everyone.
const LIFE_TABLE_FIRST_AGE = 18;
const LIFE_TABLE_QX_TOTAL = [
    0.000583, 0.000646, 0.000714, 0.000783, 0.000841, 0.000883, 0.000915, 0.000942, 0.000978,
    0.001028, 0.001099, 0.001183, 0.001269, 0.001351, 0.001430, 0.001506, 0.001583, 0.001664,
    0.001753, 0.001849, 0.001955, 0.002066, 0.002190, 0.002319, 0.002440, 0.002550, 0.002661,
    0.002786, 0.002942, 0.003133, 0.003359, 0.003615, 0.003898, 0.004205, 0.004529, 0.004873,
    0.005252, 0.005652, 0.006104, 0.006656, 0.007316, 0.008040, 0.008779, 0.009511, 0.010252,
    0.011021, 0.011837, 0.012723, 0.013783, 0.014771, 0.015845, 0.016966, 0.018110, 0.019489,
    0.021136, 0.022936, 0.025125, 0.027586, 0.030376, 0.032830, 0.037438, 0.041077, 0.046154,
    0.051126, 0.057587, 0.063598, 0.070988, 0.078467, 0.088254, 0.099057, 0.110928, 0.123911,
    0.138036, 0.153317, 0.169746, 0.187293, 0.205902, 0.225491, 0.245949, 0.267138, 0.288900,
    0.311054,
];
/** The chance of dying within the year at this age. The table's open "100 and older" row is not an annual rate, so 99 stands for it. */
export function lifeTableQx(age) {
    const index = Math.max(0, Math.min(LIFE_TABLE_QX_TOTAL.length - 1, Math.floor(age) - LIFE_TABLE_FIRST_AGE));
    return LIFE_TABLE_QX_TOTAL[index];
}
/**
 * Office-holders die at about a third of the general population's rate at the
 * same age. Measured: 16 members of Congress died in office from January 2021
 * to October 2026 (Wikipedia, "List of members of the United States Congress
 * who died in office (2000–present)"), 2.75 a year, against 7.76 a year the
 * table above predicts for the 539 sitting members' ages (current House and
 * Senate rosters with birth dates, opened 2026-10-25): 0.35. Applied to every
 * modeled office. A check rather than a fit for foreign leaders: at 0.35 the
 * cast's 195 heads of government lose about 1.2 a year, under the 1.8 a year
 * heads of state and of government together died in office of natural causes
 * since 2000 (Wikipedia, "List of heads of state and government who died in
 * office": 49 natural of 64).
 */
export const OFFICEHOLDER_MORTALITY_RATIO = 0.35;
export function officeholderDeathChance(age) {
    return lifeTableQx(age) * OFFICEHOLDER_MORTALITY_RATIO;
}
function homeOffices(campaign) {
    const members = (campaign.congress.members ?? [])
        .filter((member) => !member.vacancy)
        .map((member) => ({ person: member.person, office: { kind: "congress", seat: member.seat } }));
    const governors = Object.values(campaign.states).flatMap((runtime) => {
        const state = runtime.base.id;
        return state === "DC" || !runtime.governor ? [] : [{ person: runtime.governor.person, office: { kind: "governor", state } }];
    });
    const cabinet = Object.entries(campaign.player.cabinet)
        .filter(([role]) => role !== campaign.founding.leadRole)
        .map(([role, person]) => ({ person, office: { kind: "cabinet", role } }));
    const vicePresident = campaign.vicePresident;
    const second = vicePresident ? [{ person: vicePresident, office: { kind: "vice-president" } }] : [];
    return [...second, ...members, ...governors, ...cabinet, ...agencyHeads(campaign)];
}
/**
 * The heads of the bodies below the cabinet: whoever sits in an office the
 * President appoints to, seated from the career bench or confirmed into it.
 * White House staff lead the Executive Office's components too, but nothing in
 * office hires a successor to a staff post, so they are not drawn.
 */
function agencyHeads(campaign) {
    return Object.keys(campaign.institutions).sort().flatMap((institution) => {
        const def = institutionDef(institution);
        const leader = campaign.institutions[institution]?.leader;
        const seated = leader ? campaign.people[leader] : undefined;
        if (!def || !leader || def.cabinetRole || def.kind === "judiciary" || !def.offices[0])
            return [];
        return seated?.currentRole === CAREER_INCUMBENT_ROLE ? [{ person: leader, office: { kind: "agency", institution } }] : [];
    });
}
function foreignOffices(campaign) {
    return Object.keys(campaign.nations).flatMap((nation) => {
        const person = selectForeignSeat(campaign, nation)?.person;
        return person ? [{ person, office: { kind: "foreign-leader", nation } }] : [];
    });
}
/** Every living person in a modeled office the mortality draw covers, once each, in id order. */
export function occupiedOffices(campaign) {
    const president = campaign.player.cabinet[campaign.founding.leadRole];
    const seen = new Set(president === undefined ? [] : [president]);
    const holders = [];
    for (const holder of [...homeOffices(campaign), ...foreignOffices(campaign)]) {
        const runtime = campaign.people[holder.person];
        if (seen.has(holder.person) || !runtime?.alive || runtime.currentRole === JUDICIARY_SEAT_ROLE)
            continue;
        seen.add(holder.person);
        holders.push(holder);
    }
    return holders.sort((a, b) => a.person.localeCompare(b.person));
}
/**
 * The day this person dies in `year`, or none: one keyed draw for whether, one
 * for the day. Whether they are still in office that day is asked then, so a
 * person who leaves office first simply does not die in it.
 */
export function deathDateIn(streams, person, age, year) {
    const draw = streams.stream("officeholder-mortality", person, year);
    if (draw.next() >= officeholderDeathChance(age))
        return undefined;
    const january = { year, month: 1, day: 1 };
    const days = daysBetween(january, { year: year + 1, month: 1, day: 1 });
    return addDays(january, Math.floor(draw.next() * days));
}
/** A person's age in `year`: `base.age` is the age at founding, so it advances with the calendar. */
export function ageInYear(campaign, foundingAge, year) {
    return foundingAge + year - campaignFoundingDate(campaign).year;
}
/** The office-holders whose drawn day falls in the week now open, in id order. */
export function deathsThisWeek(campaign) {
    const close = weekCloseDate(campaign);
    const founding = campaignFoundingDate(campaign);
    const opened = addDays(close, -6);
    const open = compareDates(opened, founding) < 0 ? founding : opened;
    const streams = createRngStreams(campaign.seed);
    const years = [...new Set([open.year, close.year])];
    return occupiedOffices(campaign).flatMap((holder) => {
        const age = campaign.people[holder.person].base.age;
        for (const year of years) {
            const date = deathDateIn(streams, holder.person, ageInYear(campaign, age, year), year);
            if (date && compareDates(date, open) >= 0 && compareDates(date, close) <= 0)
                return [{ holder, date }];
        }
        return [];
    });
}
