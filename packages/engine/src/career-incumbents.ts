import { AGENCY_HEAD_ROLE, type Person, type PersonId, type RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import { vacancyBenchEffects } from "./appointment-bench.js";
import {
  deriveImplementationQuality,
  institutionDef,
  type InstitutionDef,
  type InstitutionId,
  type InstitutionRuntime,
  type OfficeDef,
} from "./institutions.js";

// The executive branch below the cabinet, staffed.
//
// A new president is sworn in over a government that is already running, and
// the asymmetry that matters is *which* chairs empty on inauguration day. The
// cabinet does: those are the outgoing administration's appointees and they
// leave with it. The forty-five buildings underneath it do not. The
// Commissioner of Internal Revenue, the Director of the Secret Service, the
// Administrator of FEMA and the Chair of the Federal Reserve are all sitting in
// their offices on the morning of the twenty-first, and every one of them is a
// person this president may keep, may replace, and will be answered by either
// way.
//
// Before this the whole branch opened headless: forty-five bodies reading "no
// confirmed officer", a delivery shortfall charged from turn one for offices no
// real transition ever empties, and — worse — a government the player could not
// tell a real vacancy from. A vacancy means something only when being staffed
// is the ordinary state.
//
// The incumbents are the campaign's own cast rather than forty-five names typed
// into a table: they are drawn from the seeded person pool like every other
// American in the game, so the same seed seats the same people, they carry the
// same attributes every dossier reads, and a player who dismisses one is
// dismissing somebody with a record rather than deleting a string.

/** The seat every one of them is drawn for. */
export const CAREER_INCUMBENT_ROLE = AGENCY_HEAD_ROLE as RoleId;

export type CareerOffice = {
  readonly institution: InstitutionDef;
  readonly office: OfficeDef;
};

/**
 * Every leadership office the president fills that no cabinet secretary holds,
 * in catalog order.
 *
 * Catalog order rather than sorted, because it is the order the assignment is
 * keyed on: it is stable across builds by construction (the catalog is a
 * literal), so a save reopened on a later build finds the same person in the
 * same chair. A body appended to the catalog therefore takes the next unused
 * incumbent rather than displacing anybody already seated.
 */
export function careerOffices(): readonly CareerOffice[] {
  return INSTITUTION_CATALOG.flatMap((institution) => {
    if (institution.cabinetRole) return [];
    const office = institution.offices[0];
    return office ? [{ institution, office }] : [];
  });
}

/** The unseated part of the bench these offices are filled from, in pool order: nobody holding a chair or acting in one. */
function freeIncumbents(
  people: Readonly<Record<string, PersonRuntime>>,
  institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>,
): readonly PersonRuntime[] {
  const acting = new Set(Object.values(institutions).flatMap((runtime) => (runtime.actingLeader === undefined ? [] : [runtime.actingLeader as string])));
  return Object.values(people).filter(
    (runtime) =>
      runtime.alive &&
      runtime.currentRole === undefined &&
      !acting.has(runtime.base.id as string) &&
      runtime.base.eligibleRoles.some((role) => (role as string) === (CAREER_INCUMBENT_ROLE as string)),
  );
}

export type CareerSeating = {
  readonly people: Readonly<Record<string, PersonRuntime>>;
  readonly institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>;
};

/**
 * Seat an incumbent in every non-cabinet office that nobody is in.
 *
 * Pure over the two records and idempotent: an office that already has a
 * leader, an acting officer, or a person seated in it by an earlier pass is
 * left exactly as it is. That is what lets founding and the save migration
 * share one rule rather than two implementations of it that agree today.
 *
 * `implementationQuality` is re-derived for the bodies this seats, because that
 * is what the confirmation writer does for a leader the Senate confirms. A
 * seated office whose delivery still carried a vacancy drag would be the two
 * records disagreeing again, one turn before the tick corrected it.
 */
export function withCareerIncumbents(
  people: Readonly<Record<string, PersonRuntime>>,
  institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>,
): CareerSeating {
  const bench = freeIncumbents(people, institutions);
  if (bench.length === 0) return { people, institutions };

  const seatedPeople: Record<string, PersonRuntime> = { ...people };
  const seatedInstitutions: Record<InstitutionId, InstitutionRuntime> = { ...institutions };
  let next = 0;

  for (const { institution } of careerOffices()) {
    const runtime = seatedInstitutions[institution.id];
    if (!runtime) continue;
    if (runtime.leader !== undefined || runtime.actingLeader !== undefined) continue;
    const incumbent = bench[next];
    if (!incumbent) break;
    next += 1;

    const led: InstitutionRuntime = { ...runtime, leader: incumbent.base.id, vacancy: false, vacantDays: 0 };
    seatedInstitutions[institution.id] = {
      ...led,
      implementationQuality: deriveImplementationQuality(led, institution, incumbent.base.competence),
    };
    seatedPeople[incumbent.base.id as string] = {
      ...incumbent,
      currentRole: CAREER_INCUMBENT_ROLE,
      loyaltyAtAppointment: incumbent.base.loyalty,
    };
  }

  return { people: seatedPeople, institutions: seatedInstitutions };
}

/**
 * The bodies below the cabinet whose heads are the President's own political
 * appointees rather than the next career official on the bench: the budget
 * office, the trade representative, the environmental regulator and the CIA.
 * An incoming President does not keep the last administration's people in
 * these chairs, and does not seat the other party's in them either.
 */
export const POLITICAL_OFFICE_INSTITUTIONS: readonly InstitutionId[] = ["INST-OMB", "INST-USTR", "INST-EPA", "INST-CIA"];

/**
 * Open the political offices under a career acting.
 *
 * The heads of these four bodies leave with the administration that appointed
 * them, and the new President's picks wait on the Senate: in 2021 the EPA
 * Administrator was confirmed on March 10 and the Trade Representative on March
 * 17, and the budget office was still run by an acting on March 23, when the
 * Senate confirmed only its deputy (Senate roll call votes, 117th Congress, 1st
 * session). So each opens vacant with its senior career official acting on the
 * office's Vacancies Act clock, and filling it is the President's to do. Run
 * before the career sweep, which passes over a chair with an acting in it.
 */
export function withPoliticalActings(
  people: Readonly<Record<string, PersonRuntime>>,
  institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>,
): CareerSeating {
  return POLITICAL_OFFICE_INSTITUTIONS.reduce<CareerSeating>(
    (seating, id) => {
      const institution = institutionDef(id);
      const office = institution?.offices[0];
      const runtime = seating.institutions[id];
      if (!institution || !office || !runtime || runtime.leader !== undefined || runtime.actingLeader !== undefined) return seating;
      const senior = [...freeIncumbents(seating.people, seating.institutions)].sort((a, b) => b.base.competence - a.base.competence)[0];
      if (!senior) return seating;
      const acting: InstitutionRuntime = {
        ...runtime,
        vacancy: true,
        vacantDays: 0,
        actingLeader: senior.base.id,
        ...(office.actingLimitDays !== undefined ? { actingExpiresDay: office.actingLimitDays } : {}),
      };
      return {
        people: seating.people,
        institutions: { ...seating.institutions, [id]: { ...acting, implementationQuality: deriveImplementationQuality(acting, institution) } },
      };
    },
    { people, institutions },
  );
}

/** The acting records the political offices open with, keyed the way `selectActing` reads them. */
export function foundingActings(institutions: Readonly<Record<InstitutionId, InstitutionRuntime>>): Readonly<Record<string, PersonId>> {
  return Object.fromEntries(
    POLITICAL_OFFICE_INSTITUTIONS.flatMap((id) => {
      const person = institutions[id]?.actingLeader;
      const office = institutionDef(id)?.offices[0];
      return person !== undefined && office ? [[office.id as string, person] as const] : [];
    }),
  );
}

/**
 * The bench a campaign founded before this branch existed never drew.
 *
 * A save carries the seed it was founded on, and the pool is a pure function of
 * that seed keyed per role, so the incumbents a migrated campaign gets are
 * exactly the incumbents a campaign founded today on the same seed gets. The
 * role is generated last in the pool for precisely this reason: nobody already
 * in the save's cast moves, and nothing already seated is re-rolled.
 *
 * Takes the pool rather than the seed so that this module does not have to
 * reach back into founding, which reaches into it.
 */
export function withCareerBench(
  people: Readonly<Record<string, PersonRuntime>>,
  pool: readonly Person[],
): Readonly<Record<string, PersonRuntime>> {
  const missing = pool.filter(
    (person) =>
      person.eligibleRoles.some((role) => (role as string) === (CAREER_INCUMBENT_ROLE as string)) &&
      people[person.id as string] === undefined,
  );
  if (missing.length === 0) return people;
  return {
    ...people,
    ...Object.fromEntries(missing.map((person) => [person.id as string, { base: person, alive: true }])),
  };
}

/** Which body this person runs, where they run one. */
export function selectInstitutionLedBy(campaign: Campaign, person: PersonId): InstitutionDef | undefined {
  for (const runtime of Object.values(campaign.institutions)) {
    if (runtime.leader !== person) continue;
    const def = institutionDef(runtime.id);
    if (def && !def.cabinetRole) return def;
  }
  return undefined;
}

// A removal at a body with a statutory mission is not the same act as a
// removal at one that takes direction, and the difference lands where the game
// already keeps it: politicization, which is the reading of how far a body has
// been bent toward this administration's politics rather than its mandate.
/** How far a for-cause removal bends the body, on the same 0..1 politicization reading the institution file uses. */
export const FOR_CAUSE_POLITICIZATION = 0.15;

/** A stated cause is not one act. Malfeasance bends the office harder than inefficiency. */
export const REMOVAL_POLITICIZATION: Readonly<Record<string, number>> = {
  Inefficiency: 0.08,
  "Neglect of duty": 0.12,
  "Malfeasance in office": 0.18,
};

/** What this removal writes onto politicization. An at-will departure writes nothing. */
export function removalPoliticization(forCause: boolean, cause?: string): number {
  if (!forCause) return 0;
  return REMOVAL_POLITICIZATION[cause?.trim() ?? ""] ?? FOR_CAUSE_POLITICIZATION;
}

export type OfficerResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/**
 * Remove the officer running a body below the cabinet.
 *
 * The counterpart to `dismissMinister`, and separate from it because these are
 * not cabinet chairs: there is no charter seat to empty, only an office and the
 * person in it. The chair is left open rather than refilled, so the vacancy and
 * the drag it accumulates are the price of the removal — exactly the price a
 * president pays for firing a Director in January and confirming a successor in
 * June.
 *
 * What the office may be removed *for* is the catalog's, not this function's:
 * an at-will office goes on the president's word, a for-cause office needs a
 * stated cause, and a term-protected one cannot be emptied at all. That is why
 * relieving a Chair of the Federal Reserve is a different kind of act from
 * replacing the Administrator of FEMA, and the difference is read off the same
 * table the confirmation path reads.
 */
export function removeOfficer(campaign: Campaign, id: InstitutionId, cause?: string): OfficerResult {
  const def = institutionDef(id);
  if (!def) return { ok: false, reason: "No such body." };
  if (def.cabinetRole) {
    return { ok: false, reason: `${def.name} is run from a cabinet chair. Dismiss the secretary who holds it.` };
  }
  const office = def.offices[0];
  if (!office) return { ok: false, reason: `${def.name} has no office the President appoints to.` };

  const runtime = campaign.institutions[id];
  const holder = runtime?.leader ? campaign.people[runtime.leader] : undefined;
  if (!runtime || !holder) return { ok: false, reason: `Nobody holds ${office.title}.` };

  if (office.removal === "term-protected") {
    return { ok: false, reason: `${office.title} is held for a fixed term. The President cannot end it.` };
  }
  if (office.removal === "for-cause" && !cause?.trim()) {
    return { ok: false, reason: `${office.title} can only be removed for cause, and none has been stated.` };
  }

  const person = holder.base;
  const politicized = office.removal === "for-cause";

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", entities: [id], systems: ["institutions"] },
      narration: {
        summary: politicized
          ? `${person.name} is removed from ${office.title} for ${cause!.trim()}, over the objection ${def.abbr}'s independence is written to raise.`
          : cause?.trim()
            ? `${person.name} is removed from ${office.title}. The stated reason is ${cause.trim()}, and the office is left open.`
            : `${person.name} is removed from ${office.title}, and the office is left open.`,
      },
      effects: [
        {
          kind: "institution",
          institution: id,
          vacate: true,
          ...(politicized
            ? { changes: { politicization: Math.min(1, runtime.politicization + removalPoliticization(true, cause)) } }
            : {}),
        },
        {
          kind: "person",
          person: person.id,
          // The office and the person are two facts and both have to move, or a
          // removed officer still reads as seated to everything that walks the
          // cast rather than the institutions.
          changes: { currentRole: undefined, loyaltyAtAppointment: undefined },
        },
        // A seat the cast cannot staff (the Joint Chiefs) draws its bench now,
        // once, rather than whenever the President next looks.
        ...vacancyBenchEffects(campaign, office.id),
        {
          kind: "feed",
          items: [
            {
              turn: campaign.turn,
              kind: "press",
              visibility: "public",
              headline: `The President removes ${person.name} from ${office.title}.`,
              facts: { subject: person.name },
            },
          ],
        },
      ],
    },
  };
}
