import { VICE_PRESIDENT_ROLE_ID, WHITE_HOUSE_ROLE_TITLES, WHITE_HOUSE_STAFF_ROLE_IDS, } from "@admin/world";
import { crossesTheAisle } from "./cast-fit.js";
import { stateOfBirthplace } from "./cast-home.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
import { deriveImplementationQuality, institutionDef } from "./institutions.js";
import { isOnTheTicket, onRunningMateBench, runningMateCandidates } from "./vice-president.js";
import { onStaffBench, staffCandidates } from "./white-house.js";
/** The President as the ticket reads them, from the draft and the person it composed. */
export function ticketPresident(draft, leader) {
    const homeState = draft.homeState ?? stateOfBirthplace(leader?.birthplace);
    return { party: draft.party, ideology: draft.ideology, age: draft.age, ...(homeState ? { homeState } : {}) };
}
/** Everyone the choices already place, so no default lands on a chosen name. */
function chosenIds(choices) {
    return new Set([
        ...Object.values(choices.cabinet).map((id) => id),
        ...(choices.runningMate ? [choices.runningMate] : []),
        ...Object.values(choices.staff ?? {}).map((id) => id),
    ]);
}
/**
 * The running mate and the staff the seal will seat: each one chosen, or the
 * best fit the founding would have offered first. Filled in a fixed order —
 * the ticket, then the posts in the order they are listed — so the same
 * choices always seat the same people.
 */
export function resolveFoundingCast(pool, nation, president, choices) {
    const placed = chosenIds(choices);
    const runningMate = choices.runningMate ?? runningMateCandidates(pool, nation, president, placed)[0]?.person.id;
    const start = runningMate ? new Set([...placed, runningMate]) : placed;
    const staff = WHITE_HOUSE_STAFF_ROLE_IDS.reduce((acc, post) => {
        const pick = choices.staff?.[post] ?? staffCandidates(pool, nation, president, post, acc.taken)[0]?.person.id;
        if (!pick)
            return acc;
        return { taken: new Set([...acc.taken, pick]), staff: { ...acc.staff, [post]: pick } };
    }, { taken: start, staff: {} }).staff;
    return { ...(runningMate ? { runningMate } : {}), staff };
}
function runningMateRejections(byId, nation, president, runningMate) {
    if (!runningMate)
        return [];
    const mate = byId.get(runningMate);
    if (!mate || !onRunningMateBench(mate, nation)) {
        return [{ subject: "runningMate", explanation: "Nobody by that name is among the members of Congress a running mate is drawn from." }];
    }
    if (!isOnTheTicket(mate, president)) {
        return [{ subject: "runningMate", explanation: `${mate.name} is not of your party, and a running mate runs on your ticket.` }];
    }
    return [];
}
function staffRejections(byId, nation, president, staff) {
    return WHITE_HOUSE_STAFF_ROLE_IDS.flatMap((post) => {
        const id = staff[post];
        if (!id)
            return [];
        const person = byId.get(id);
        const title = WHITE_HOUSE_ROLE_TITLES[post];
        if (!person || !onStaffBench(person, nation, post)) {
            return [{ subject: post, explanation: `Nobody by that name is among the people a ${title} is drawn from.` }];
        }
        if (crossesTheAisle(person, president)) {
            return [{ subject: post, explanation: `${person.name} sits across the aisle, and the ${title} is one of your own political hires.` }];
        }
        return [];
    });
}
/** One person named for two posts is refused on every post after the first. */
function doubleSeatRejections(byId, choices) {
    const named = [
        ...Object.entries(choices.cabinet),
        ...(choices.runningMate ? [["runningMate", choices.runningMate]] : []),
        ...Object.entries(choices.staff ?? {}),
    ];
    return named.flatMap(([subject, id], index) => {
        const earlier = named.slice(0, index).some(([, other]) => other === id);
        if (!earlier)
            return [];
        const name = byId.get(id)?.name ?? "The same person";
        return [{ subject, explanation: `${name} is already named for another post, and nobody holds two at once.` }];
    });
}
export function castRejections(pool, nation, president, choices) {
    const byId = new Map(pool.map((person) => [person.id, person]));
    return [
        ...runningMateRejections(byId, nation, president, choices.runningMate),
        ...staffRejections(byId, nation, president, choices.staff ?? {}),
        ...doubleSeatRejections(byId, choices),
    ];
}
function castSeats(cast) {
    return [
        ...(cast.runningMate ? [[cast.runningMate, VICE_PRESIDENT_ROLE_ID]] : []),
        ...Object.entries(cast.staff).map(([post, id]) => [id, post]),
    ];
}
/**
 * The runtimes, with the ticket and the staff in their posts. Done before the
 * Hill, the statehouses and the bureaus are seated, so none of those sweeps
 * seats somebody the President has already taken.
 */
export function seatFoundingCast(people, cast) {
    const seated = castSeats(cast).flatMap(([id, role]) => {
        const runtime = people[id];
        return runtime ? [[id, { ...runtime, currentRole: role, loyaltyAtAppointment: runtime.base.loyalty }]] : [];
    });
    return { ...people, ...Object.fromEntries(seated) };
}
/** The offices those people lead: the Vice President's own, the Executive Office for the chief of staff, the NSC for the adviser. */
const CAST_INSTITUTION = {
    [VICE_PRESIDENT_ROLE_ID]: VICE_PRESIDENCY_INSTITUTION_ID,
    "role-chief-of-staff": "INST-PRESIDENCY",
    "role-national-security-adviser": "INST-NSC",
};
export function withFoundingCastOffices(institutions, cast) {
    const led = castSeats(cast).flatMap(([person, role]) => {
        const id = CAST_INSTITUTION[role];
        const runtime = id ? institutions[id] : undefined;
        const def = id ? institutionDef(id) : undefined;
        if (!id || !runtime || !def)
            return [];
        const seated = { ...runtime, leader: person, vacancy: false, vacantDays: 0 };
        return [[id, { ...seated, implementationQuality: deriveImplementationQuality(seated, def) }]];
    });
    return { ...institutions, ...Object.fromEntries(led) };
}
