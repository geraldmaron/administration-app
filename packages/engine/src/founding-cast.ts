import {
  VICE_PRESIDENT_ROLE_ID,
  WHITE_HOUSE_ROLE_TITLES,
  WHITE_HOUSE_STAFF_ROLE_IDS,
  type NationId,
  type Person,
  type PersonId,
  type RoleId,
  type StateId,
  type WhiteHouseStaff,
  type WhiteHouseStaffRoleId,
} from "@admin/world";
import { crossesTheAisle, type FitPresident } from "./cast-fit.js";
import { stateOfBirthplace } from "./cast-home.js";
import { VICE_PRESIDENCY_INSTITUTION_ID } from "./institution-catalog.js";
import { deriveImplementationQuality, institutionDef, type InstitutionId, type InstitutionRuntime } from "./institutions.js";
import type { LeaderDraft } from "./leader.js";
import type { PersonRuntime } from "./state.js";
import { isOnTheTicket, onRunningMateBench, runningMateCandidates, type TicketPresident } from "./vice-president.js";
import { onStaffBench, staffCandidates } from "./white-house.js";

// Who stands beside the President on the first morning: the running mate and
// the three staff posts. The player picks them at founding; a post left open
// is filled with the best fit the founding would have offered first, so a
// quick oath seats a whole West Wing rather than an empty one.

/** A refusal in the player's terms, keyed by the choice it is about. */
export type CastRejection = { readonly subject: string; readonly explanation: string };

export type FoundingCast = {
  readonly runningMate?: PersonId;
  readonly staff: WhiteHouseStaff;
};

export type CastChoices = {
  readonly cabinet: Readonly<Record<RoleId, PersonId>>;
  readonly runningMate?: PersonId;
  readonly staff?: WhiteHouseStaff;
};

/** The President as the ticket reads them, from the draft and the person it composed. */
export function ticketPresident(draft: LeaderDraft, leader: Pick<Person, "birthplace"> | undefined): TicketPresident {
  const homeState: StateId | undefined = draft.homeState ?? stateOfBirthplace(leader?.birthplace);
  return { party: draft.party, ideology: draft.ideology, age: draft.age, ...(homeState ? { homeState } : {}) };
}

/** Everyone the choices already place, so no default lands on a chosen name. */
function chosenIds(choices: CastChoices): ReadonlySet<string> {
  return new Set<string>([
    ...Object.values(choices.cabinet).map((id) => id as string),
    ...(choices.runningMate ? [choices.runningMate as string] : []),
    ...Object.values(choices.staff ?? {}).map((id) => id as string),
  ]);
}

/**
 * The running mate and the staff the seal will seat: each one chosen, or the
 * best fit the founding would have offered first. Filled in a fixed order —
 * the ticket, then the posts in the order they are listed — so the same
 * choices always seat the same people.
 */
export function resolveFoundingCast(
  pool: readonly Person[],
  nation: NationId,
  president: TicketPresident,
  choices: CastChoices,
): FoundingCast {
  const placed = chosenIds(choices);
  const runningMate = choices.runningMate ?? runningMateCandidates(pool, nation, president, placed)[0]?.person.id;
  const start = runningMate ? new Set([...placed, runningMate as string]) : placed;
  const staff = WHITE_HOUSE_STAFF_ROLE_IDS.reduce<{ readonly taken: ReadonlySet<string>; readonly staff: WhiteHouseStaff }>(
    (acc, post) => {
      const pick = choices.staff?.[post] ?? staffCandidates(pool, nation, president, post, acc.taken)[0]?.person.id;
      if (!pick) return acc;
      return { taken: new Set([...acc.taken, pick as string]), staff: { ...acc.staff, [post]: pick } };
    },
    { taken: start, staff: {} },
  ).staff;
  return { ...(runningMate ? { runningMate } : {}), staff };
}

function runningMateRejections(
  byId: ReadonlyMap<string, Person>,
  nation: NationId,
  president: FitPresident,
  runningMate: PersonId | undefined,
): readonly CastRejection[] {
  if (!runningMate) return [];
  const mate = byId.get(runningMate as string);
  if (!mate || !onRunningMateBench(mate, nation)) {
    return [{ subject: "runningMate", explanation: "Nobody by that name is among the members of Congress a running mate is drawn from." }];
  }
  if (!isOnTheTicket(mate, president)) {
    return [{ subject: "runningMate", explanation: `${mate.name} is not of your party, and a running mate runs on your ticket.` }];
  }
  return [];
}

function staffRejections(
  byId: ReadonlyMap<string, Person>,
  nation: NationId,
  president: FitPresident,
  staff: WhiteHouseStaff,
): readonly CastRejection[] {
  return WHITE_HOUSE_STAFF_ROLE_IDS.flatMap((post): CastRejection[] => {
    const id = staff[post];
    if (!id) return [];
    const person = byId.get(id as string);
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
function doubleSeatRejections(byId: ReadonlyMap<string, Person>, choices: CastChoices): readonly CastRejection[] {
  const named: readonly (readonly [string, PersonId])[] = [
    ...(Object.entries(choices.cabinet) as [string, PersonId][]),
    ...(choices.runningMate ? [["runningMate", choices.runningMate] as const] : []),
    ...(Object.entries(choices.staff ?? {}) as [string, PersonId][]),
  ];
  return named.flatMap(([subject, id], index): CastRejection[] => {
    const earlier = named.slice(0, index).some(([, other]) => other === id);
    if (!earlier) return [];
    const name = byId.get(id as string)?.name ?? "The same person";
    return [{ subject, explanation: `${name} is already named for another post, and nobody holds two at once.` }];
  });
}

export function castRejections(
  pool: readonly Person[],
  nation: NationId,
  president: FitPresident,
  choices: CastChoices,
): readonly CastRejection[] {
  const byId = new Map(pool.map((person) => [person.id as string, person]));
  return [
    ...runningMateRejections(byId, nation, president, choices.runningMate),
    ...staffRejections(byId, nation, president, choices.staff ?? {}),
    ...doubleSeatRejections(byId, choices),
  ];
}

function castSeats(cast: FoundingCast): readonly (readonly [PersonId, RoleId])[] {
  return [
    ...(cast.runningMate ? [[cast.runningMate, VICE_PRESIDENT_ROLE_ID as RoleId] as const] : []),
    ...(Object.entries(cast.staff) as [WhiteHouseStaffRoleId, PersonId][]).map(([post, id]) => [id, post as RoleId] as const),
  ];
}

/**
 * The runtimes, with the ticket and the staff in their posts. Done before the
 * Hill, the statehouses and the bureaus are seated, so none of those sweeps
 * seats somebody the President has already taken.
 */
export function seatFoundingCast(
  people: Readonly<Record<string, PersonRuntime>>,
  cast: FoundingCast,
): Readonly<Record<string, PersonRuntime>> {
  const seated = castSeats(cast).flatMap(([id, role]) => {
    const runtime = people[id as string];
    return runtime ? [[id as string, { ...runtime, currentRole: role, loyaltyAtAppointment: runtime.base.loyalty }] as const] : [];
  });
  return { ...people, ...Object.fromEntries(seated) };
}

/** The offices those people lead: the Vice President's own, the Executive Office for the chief of staff, the NSC for the adviser. */
const CAST_INSTITUTION: Readonly<Record<string, InstitutionId>> = {
  [VICE_PRESIDENT_ROLE_ID]: VICE_PRESIDENCY_INSTITUTION_ID,
  "role-chief-of-staff": "INST-PRESIDENCY",
  "role-national-security-adviser": "INST-NSC",
};

export function withFoundingCastOffices(
  institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>,
  cast: FoundingCast,
): Readonly<Record<InstitutionId, InstitutionRuntime>> {
  const led = castSeats(cast).flatMap(([person, role]) => {
    const id = CAST_INSTITUTION[role as string];
    const runtime = id ? institutions[id] : undefined;
    const def = id ? institutionDef(id) : undefined;
    if (!id || !runtime || !def) return [];
    const seated: InstitutionRuntime = { ...runtime, leader: person, vacancy: false, vacantDays: 0 };
    return [[id, { ...seated, implementationQuality: deriveImplementationQuality(seated, def) }] as const];
  });
  return { ...institutions, ...Object.fromEntries(led) };
}
