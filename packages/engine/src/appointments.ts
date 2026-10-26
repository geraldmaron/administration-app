import type { PersonId, RoleId } from "@admin/world";
import { selectCabinetHolder, selectPerson, type Campaign, type PersonRuntime } from "./state.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { MetricCost, RiskBranch } from "./resolution.js";
import { counselDismissalEffects, projectCounselObstruction } from "./special-counsel.js";
import { departureEffects, factionEffects, type CabinetDeparture } from "./cabinet.js";
import {
  institutionDef,
  institutionForRole,
  leaderRoleOf,
  leadsInstitution,
  officeInstitution,
  seatCabinetOffice,
  type InstitutionDef,
  type OfficeDef,
  type OfficeId,
} from "./institutions.js";
import { selectActiveNominations, type NominationStage } from "./nomination-stages.js";
import type { Nomination } from "./nomination.js";
import { campaignDay } from "./clock.js";
import { orderByFit, type FitPresident } from "./cast-fit.js";

// Hiring and firing. Until now a cabinet was a thing the player assembled once,
// at founding, and then watched happen to them: competence swayed every
// resolution (stewardship.ts), loyalty and ambition produced leaks,
// resignations and internal rivals (cabinet.ts), counsel and dissent argued
// with every reply (counsel.ts) — and none of it could be answered. A chair
// emptied by a resignation stayed empty for the rest of the campaign.
//
// The design constraint is that this must not reduce to "always seat the most
// competent candidate", which is what a free swap would be. So the acts are
// separate and each is priced:
//
//   - Dismissal costs standing, more of it the more popular the minister is,
//     and an ambitious one does not go quietly — they leave as a rival faction,
//     which is the same marked-rival state cabinet.ts's challenge produces and
//     which feeds removal pressure.
//   - Filling the chair is a nomination (nomination.ts), the same months-long
//     pipeline every other Senate-confirmed seat goes through, with the
//     deputy acting meanwhile. There is no same-day vote for a cabinet chair.
//
// Both produce an EffectPacket for apply() like everything else; nothing here
// touches state. Both are the player's own decisions, so both carry
// `actor: "player"` and land in the record the ledger shows as such. Dismissal
// is priced by the projection the act itself spends (`projectDismissal`), so
// the price a screen shows before the click is the arithmetic the click
// performs rather than a second copy of it.

export type AppointmentResult =
  // `ok: false` is for what a president structurally cannot do at all: empty
  // a chair nobody holds, seat an acting the law does not allow, or touch
  // their own chair.
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

// Dismissal is never free — a cabinet reshuffle reads as disarray whoever it
// is — and a minister the public knows costs more to remove than one it does
// not.
const DISMISSAL_STANDING_FLOOR = 0.02;
const DISMISSAL_CHARISMA_WEIGHT = 0.05;

// A minister with this much ambition takes dismissal as the start of something
// rather than the end of it. The floor is cabinet.ts's own challenge floor: the
// same person who would have built a faction in office builds one out of it.
const RESENTMENT_AMBITION_FLOOR = 0.65;
const RESENTFUL_STABILITY_HIT = 0.03;

const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

/** Everyone the President has a name before the Senate for, by person. */
function pendingNominees(campaign: Campaign): ReadonlySet<string> {
  return new Set(selectActiveNominations(campaign).map((nomination) => nomination.nominee as string));
}

/** The President as every shortlist reads them: their party, and where their politics sit. */
export function presidentFit(campaign: Campaign): FitPresident {
  return { party: campaign.founding.leader.party, ideology: campaign.founding.leader.ideology };
}

/**
 * Who the player could actually seat in a chair right now: their own nationals,
 * alive, eligible for that seat, not already holding another one, not acting
 * in another, and not before the Senate for one — ranked the way the founding
 * shortlist is, by fit to this President rather than by competence alone, so a
 * Treasury bench mid-term leads with the President's own side just as the one
 * on the first morning did.
 *
 * The pool is the campaign's own cast rather than a fresh draw, so the people
 * passed over at founding are exactly the people still available later. A
 * campaign cannot conjure a better candidate by waiting.
 */
export function selectAppointableFor(campaign: Campaign, role: RoleId, includeNominees = false): readonly PersonRuntime[] {
  const pending = includeNominees ? new Set<string>() : pendingNominees(campaign);
  const bench = Object.values(campaign.people).filter(
    (runtime) =>
      runtime.alive &&
      runtime.currentRole === undefined &&
      !pending.has(runtime.base.id as string) &&
      !actingElsewhere(campaign, runtime.base.id, role as string) &&
      (runtime.base.nationality as string) === (campaign.founding.nation as string) &&
      runtime.base.eligibleRoles.some((eligible) => (eligible as string) === (role as string)),
  );
  return orderByFit(
    bench.map((runtime) => runtime.base),
    presidentFit(campaign),
  ).map((fit) => campaign.people[fit.person.id]!);
}

/** Whether a chair can be emptied or filled at all — the head of state's cannot. */
function seatRefusal(campaign: Campaign, role: RoleId): string | undefined {
  if (role === campaign.founding.leadRole) {
    return "That chair is yours. A head of government does not appoint or dismiss themselves.";
  }
  if (campaign.player.cabinet[role] === undefined && campaign.founding.cabinet[role] === undefined) {
    return "Your charter seats no such office.";
  }
  return undefined;
}

/**
 * What an act on a chair moves the week it lands, and what follows from it.
 *
 * Shaped for the terms row a screen already draws for every other priced act:
 * `cost` is every reading the packet moves, summed the way apply() will sum
 * it, and `risks` are the consequences past the week. A risk here is the
 * rule's own verdict rather than a roll, so it is stated as certain.
 */
export type AppointmentPrice = {
  readonly cost: MetricCost;
  readonly risks: readonly RiskBranch[];
};

export type DismissalProjection =
  | ({ readonly ok: true; readonly holder: PersonRuntime; readonly resentful: boolean } & AppointmentPrice)
  | { readonly ok: false; readonly reason: string };

/** The price of emptying a chair, which `dismissMinister` spends as it stands. */
export function projectDismissal(campaign: Campaign, role: RoleId): DismissalProjection {
  const refusal = seatRefusal(campaign, role);
  if (refusal) return { ok: false, reason: refusal };

  const holder = selectCabinetHolder(campaign, role);
  if (!holder || !holder.alive) return { ok: false, reason: "That chair is already empty." };

  const person = holder.base;
  const resentful = person.ambition >= RESENTMENT_AMBITION_FLOOR;
  const obstructs = projectCounselObstruction(campaign, role) !== undefined;
  return {
    ok: true,
    holder,
    resentful,
    cost: {
      standing: round3(-(DISMISSAL_STANDING_FLOOR + person.charisma * DISMISSAL_CHARISMA_WEIGHT)),
      ...(resentful ? { stability: -RESENTFUL_STABILITY_HIT } : {}),
    },
    risks: [
      ...(resentful
        ? [{ id: "dismissal-faction", chance: 1, description: `${person.name} leaves as a rival faction, and the faction adds to the pressure to remove you.` }]
        : []),
      ...(obstructs
        ? [{ id: "dismissal-counsel", chance: 1, description: "The special counsel keeps sitting, and the Senate reads the dismissal as the answer to the inquiry." }]
        : []),
    ],
  };
}

/**
 * Remove the minister holding a chair. The chair is left empty: filling it is a
 * second decision with its own price, so a reshuffle is never a single costless
 * motion.
 */
export function dismissMinister(campaign: Campaign, role: RoleId): AppointmentResult {
  const projection = projectDismissal(campaign, role);
  if (!projection.ok) return projection;

  const person = projection.holder.base;
  const resentful = projection.resentful;
  const counsel = counselDismissalEffects(campaign, role, person.name);

  const effects: Effect[] = [
    // The one writer of what it means to leave a chair alive, shared with the
    // resignation this is the other half of: seat cleared, person kept, and the
    // departure on the record so a former Secretary can be summoned, quoted or
    // cast later.
    ...vacates(campaign, role, "dismissed", person.id),
    ...(resentful ? factionEffects(campaign.turn, role, person.id) : []),
    { kind: "metric", deltas: projection.cost },
    {
      kind: "feed",
      items: [
        {
          turn: campaign.turn,
          kind: "press",
          visibility: "public",
          headline: resentful
            ? `${person.name} is dismissed from the cabinet, and does not intend to go quietly.`
            : `${person.name} is dismissed from the cabinet.`,
          facts: { subject: person.name },
        },
      ],
    },
    // Emptying one chair reaches oversight the President does not otherwise
    // touch: the Attorney General is the only person who could dismiss a
    // special counsel, so removing them mid-counsel is read as the answer to
    // the inquiry. Nothing here stops the counsel; it is priced, not obeyed.
    ...counsel,
  ];

  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      narration: { summary: dismissalSummary(person.name, resentful, counsel.length > 0) },
      effects,
    },
  };
}

function dismissalSummary(name: string, resentful: boolean, massacre: boolean): string {
  if (massacre) {
    return `${name} is dismissed as Attorney General with a special counsel sitting. The counsel does not stop.`;
  }
  return resentful
    ? `${name} is dismissed, and starts building a following out of office rather than in it.`
    : `${name} is dismissed from the cabinet.`;
}

function pressItem(turn: number, headline: string, subject: string): Effect {
  return { kind: "feed", items: [{ turn, kind: "press", visibility: "public", headline, facts: { subject } }] };
}

/** The cabinet roles somebody alive already holds on the record; one person holds each. */
function heldCabinetRoles(campaign: Campaign): ReadonlySet<string> {
  return new Set(
    Object.values(campaign.people).flatMap((runtime) =>
      runtime.alive && runtime.currentRole !== undefined && institutionForRole(runtime.currentRole) ? [runtime.currentRole as string] : [],
    ),
  );
}

/**
 * A confirmed officer holds the office on the record: their `currentRole`
 * names the chair, the same as a secretary seated at the founding. The
 * nomination pipeline once seated a confirmed nominee without writing it, and a
 * campaign that confirmed somebody then still holds an officer the rest of the
 * engine reads as unemployed and offers for every other job. Loading derives
 * the missing roles.
 *
 * Only from a confirmation: a nomination the Senate confirmed, for the office
 * a body's leader holds, whose body that same person still leads. An acting
 * officer was never confirmed and a removed one no longer leads, so neither is
 * touched. Nobody whose role is already set is touched either, which keeps the
 * Vice President and the White House staff exactly where the founding put them,
 * and a cabinet role another person already holds on the record is never
 * handed out a second time. Idempotent, so it is safe on every load.
 */
export function deriveConfirmedRoles(campaign: Campaign): Campaign {
  const confirmed = Object.values(campaign.nominations).filter(
    (nomination) => (nomination.stage === "confirmed" || nomination.stage === "sworn-in") && leadsInstitution(nomination.office),
  );
  if (confirmed.length === 0) return campaign;

  const held = new Set(heldCabinetRoles(campaign));
  let people = campaign.people;
  for (const nomination of confirmed) {
    const def = officeInstitution(nomination.office);
    const person = people[nomination.nominee];
    if (!def || !person || !person.alive || person.currentRole !== undefined) continue;
    if (campaign.institutions[def.id]?.leader !== nomination.nominee) continue;
    const role = leaderRoleOf(def);
    if (def.cabinetRole) {
      if (held.has(role as string) || campaign.player.cabinet[def.cabinetRole] !== nomination.nominee) continue;
      held.add(role as string);
    }
    people = {
      ...people,
      [nomination.nominee]: { ...person, currentRole: role, loyaltyAtAppointment: person.loyaltyAtAppointment ?? person.base.loyalty },
    };
  }
  return people === campaign.people ? campaign : { ...campaign, people };
}

// --- Acting officers ---------------------------------------------------------

/** The body a seat heads and the office that is its top chair, whichever id the seat is given as. */
function actingSeat(seat: RoleId | OfficeId): { readonly def: InstitutionDef; readonly office: OfficeDef } | undefined {
  const byRole = institutionForRole(seat as RoleId);
  const def = byRole ?? (leadsInstitution(seat as OfficeId) ? officeInstitution(seat as OfficeId) : undefined);
  const office = def?.offices[0];
  return def && office ? { def, office } : undefined;
}

/** The seat an acting is keyed by: the cabinet role for a department, the office for any other body. */
function actingKey(def: InstitutionDef, office: OfficeDef): string {
  return (def.cabinetRole as string | undefined) ?? office.id;
}

/** Whether this person is already acting somewhere other than this seat. */
function actingElsewhere(campaign: Campaign, person: PersonId, key: string): string | undefined {
  const entry = Object.entries(campaign.actings ?? {}).find(([seat, holder]) => holder === person && seat !== key);
  return entry?.[0];
}

/**
 * Who 5 U.S.C. 3345(a) lets act in a vacant Senate-confirmed office.
 *
 * The first assistant, a person already confirmed to another Senate-confirmed
 * office, or a senior employee of the same agency. The bench is the engine's
 * record of the agency's own senior people; its first name is the first
 * assistant, taken to have served the 90 days the nominee exception asks
 * about because a first assistant is a holdover the transition inherits.
 */
export type ActingClass = "first-assistant" | "confirmed-officer" | "senior-employee";

function holdsConfirmedOffice(campaign: Campaign, person: PersonRuntime): boolean {
  return Object.values(campaign.institutions).some(
    (runtime) => runtime.leader === person.base.id && institutionDef(runtime.id)?.offices[0]?.appointmentClass === "PAS",
  );
}

export function actingClassOf(campaign: Campaign, def: InstitutionDef, person: PersonRuntime): ActingClass | undefined {
  if (person.currentRole !== undefined) return holdsConfirmedOffice(campaign, person) ? "confirmed-officer" : undefined;
  const bench = selectAppointableFor(campaign, leaderRoleOf(def), true);
  const index = bench.findIndex((runtime) => runtime.base.id === person.base.id);
  if (index < 0) return undefined;
  return index === 0 ? "first-assistant" : "senior-employee";
}

function actingRefusal(campaign: Campaign, seat: RoleId | OfficeId, personId: PersonId): string | undefined {
  if (seat === campaign.founding.leadRole) return "That chair is yours. A head of government does not act for themselves.";
  const found = actingSeat(seat);
  if (!found) return "No such office.";
  const { def, office } = found;
  if (office.actingAuthority === "none" || office.actingAuthority === "board-quorum") {
    return `The law gives ${office.title} no acting officer.`;
  }
  const holder = def.cabinetRole ? selectCabinetHolder(campaign, def.cabinetRole) : undefined;
  const leader = holder?.alive ? holder.base.id : campaign.institutions[def.id]?.leader;
  if (leader !== undefined) return `${selectPerson(campaign, leader)?.base.name ?? "Somebody"} holds ${office.title}.`;
  const candidate = selectPerson(campaign, personId);
  if (!candidate) return "No such person is in this campaign.";
  const name = candidate.base.name;
  if (!candidate.alive) return `${name} is no longer available.`;
  if ((candidate.base.nationality as string) !== (campaign.founding.nation as string)) return `${name} is not one of your nationals.`;
  if (actingElsewhere(campaign, personId, actingKey(def, office))) return `${name} is already acting in another office.`;
  const acting = actingClassOf(campaign, def, candidate);
  if (!acting) {
    return `${name} is not in a position the Vacancies Act reaches: only the office's first assistant, an officer already confirmed to another office, or a senior employee of the same agency may act.`;
  }
  const pending = selectActiveNominations(campaign).find((nomination) => nomination.nominee === personId);
  if (pending && pending.office !== office.id) return `${name} is before the Senate for another office.`;
  // 5 U.S.C. 3345(b)(1): a nominee may not also act, unless they were the first
  // assistant. Only that exception is modeled; the confirmed-first-assistant
  // exception in (b)(2) has no office here to apply to.
  if (pending && acting !== "first-assistant") {
    return `${name} has been nominated to ${office.title} and was not its first assistant, so the Vacancies Act bars ${name} from acting in it.`;
  }
  return undefined;
}

/**
 * What submitting a nomination does to the nominee's own acting service.
 * 5 U.S.C. 3345(b)(1) bars a nominee from acting unless they were the first
 * assistant, and the bar applies from the day the nomination is submitted, so
 * an acting named first and nominated afterward stops acting that day and
 * leaves the office with nobody signing.
 */
export function nominationEndsActing(campaign: Campaign, seat: RoleId | OfficeId, nominee: PersonId): readonly Effect[] {
  const found = actingSeat(seat);
  if (!found || selectActing(campaign, seat) !== nominee) return [];
  const person = selectPerson(campaign, nominee);
  if (!person || actingClassOf(campaign, found.def, person) === "first-assistant") return [];
  const ended: readonly Effect[] = [
    { kind: "acting", seat: actingKey(found.def, found.office) },
    { kind: "institution", actingLapsed: [found.def.id] },
  ];
  // 3345(a) still names who may act, so the next eligible name takes the
  // office the same day. Only when nobody is left do the office's functions
  // wait: 3348(b)(2) leaves a non-head office's statutory functions to the head
  // of the agency alone, and the feed says so.
  const next = deputyFor(campaign, leaderRoleOf(found.def), nominee);
  const seated = next ? actingEffects(campaign, seat, next) : undefined;
  if (seated?.ok) return [...ended, ...seated.effects];
  return [
    ...ended,
    {
      kind: "feed",
      items: [
        {
          turn: campaign.turn,
          kind: "governance",
          visibility: "public",
          headline: `${found.office.title} has no eligible acting officer; its statutory functions fall to the head of the agency alone.`,
        },
      ],
    },
  ];
}

const NOMINATION_ENDINGS: readonly NominationStage[] = ["rejected", "withdrawn", "returned"];

// The vacancy's age is a weekly counter, ticked after the nomination phase and
// phased to the day the vacancy opened. Read against the calendar it can be
// off by a week either way, so a nomination opened on the vacancy day must
// still land inside the window it implies.
const VACANCY_COUNTER_SKEW_DAYS = 14;

function submissionDay(nomination: Nomination): number | undefined {
  return nomination.history.find((step) => step.stage === "nominated")?.day;
}

/**
 * The nominations submitted for this vacancy, in the order the Senate received
 * them. A confirmed one closed an earlier vacancy and belongs to none of this
 * one.
 */
function vacancyNominations(campaign: Campaign, office: OfficeId, vacantDays: number, day: number): readonly Nomination[] {
  const windowStart = day - vacantDays - VACANCY_COUNTER_SKEW_DAYS;
  return Object.values(campaign.nominations)
    .filter(
      (entry) =>
        entry.office === office &&
        entry.openedDay >= windowStart &&
        entry.stage !== "confirmed" &&
        entry.stage !== "sworn-in" &&
        submissionDay(entry) !== undefined,
    )
    .sort((a, b) => submissionDay(a)! - submissionDay(b)! || a.openedDay - b.openedDay || a.id.localeCompare(b.id));
}

type NominationClock = { readonly tolled: true } | { readonly restartFrom: number };

/**
 * What the office's first and second nominations say about the acting clock
 * right now: tolled while either is pending, restarted from the latest day one
 * of them ended, and silent when neither has been submitted or both ended
 * before this vacancy's clock began.
 */
function nominationClock(campaign: Campaign, found: NonNullable<ReturnType<typeof actingSeat>>, day: number): NominationClock | undefined {
  const vacantDays = campaign.institutions[found.def.id]?.vacantDays ?? 0;
  const ledger = vacancyNominations(campaign, found.office.id, vacantDays, day).slice(0, 2);
  if (ledger.some((entry) => !NOMINATION_ENDINGS.includes(entry.stage))) return { tolled: true };
  const ended = ledger.flatMap((entry) => entry.history.filter((step) => NOMINATION_ENDINGS.includes(step.stage)).map((step) => step.day));
  return ended.length > 0 ? { restartFrom: Math.max(...ended) } : undefined;
}

/**
 * 3346(a)(1) and (b) are alternatives, so a restart never takes days back from
 * the period the vacancy itself earned (3349a stretches that one across a
 * transition): the later of the two governs.
 */
function clockExpiry(clock: NominationClock, limit: number, vacancyExpiry: number): number | undefined {
  return "tolled" in clock ? undefined : Math.max(vacancyExpiry, clock.restartFrom + limit);
}

/**
 * What a nomination's life does to the acting officer's clock, 5 U.S.C.
 * 3346(a)(2) and (b). Submission of a first or second nomination tolls the 210
 * days for as long as it is pending; its rejection, withdrawal or return
 * restarts them from that day. A third nomination changes nothing. The clock
 * is the one `actingLapseDay` stamps; this rewrites it, and the institution
 * phase's lapse check keeps reading the same field. An office whose acting ran
 * out its 210 days before the nomination was submitted names one again, since
 * 3345(a) still says who may act.
 */
export function actingClockEffects(campaign: Campaign, nomination: Nomination, stage: NominationStage, day: number): readonly Effect[] {
  const found = actingSeat(nomination.office);
  const runtime = found ? campaign.institutions[found.def.id] : undefined;
  const limit = found?.office.actingLimitDays;
  const ends = NOMINATION_ENDINGS.includes(stage);
  if (!found || !runtime || limit === undefined || (stage !== "nominated" && !ends)) return [];
  const advanced: Nomination = { ...nomination, stage, history: [...nomination.history, { stage, day, note: "" }] };
  const view: Campaign = { ...campaign, nominations: { ...campaign.nominations, [nomination.id]: advanced } };
  const ledger = vacancyNominations(view, found.office.id, runtime.vacantDays, day).slice(0, 2);
  if (!ledger.some((entry) => entry.id === nomination.id)) return [];
  if (runtime.actingLeader === undefined) {
    const successor = stage === "nominated" ? deputyFor(view, leaderRoleOf(found.def), nomination.nominee) : undefined;
    const restored = successor ? actingEffects(view, nomination.office, successor, day) : undefined;
    return restored?.ok ? restored.effects : [];
  }
  const clock = nominationClock(view, found, day);
  const vacancyExpiry = runtime.actingExpiresDay ?? actingLapseDay(day - runtime.vacantDays, limit);
  return clock ? [{ kind: "institution", institution: found.def.id, changes: { actingExpiresDay: clockExpiry(clock, limit, vacancyExpiry) } }] : [];
}

/**
 * An older save's acting clock was stamped before the office's nominations
 * moved it, so a nomination already pending when it loads would otherwise let
 * the acting lapse. Reads the same rule the live clock does.
 */
export function reconcileActingClocks(campaign: Campaign): Campaign {
  const day = campaignDay(campaign);
  let institutions = campaign.institutions;
  for (const runtime of Object.values(campaign.institutions)) {
    const def = institutionDef(runtime.id);
    const found = def?.offices[0] ? actingSeat(def.offices[0].id) : undefined;
    const limit = found?.office.actingLimitDays;
    if (!found || limit === undefined || runtime.actingLeader === undefined) continue;
    const clock = nominationClock(campaign, found, day);
    if (!clock) continue;
    const expiry = clockExpiry(clock, limit, runtime.actingExpiresDay ?? actingLapseDay(day - runtime.vacantDays, limit));
    if (runtime.actingExpiresDay === expiry) continue;
    const { actingExpiresDay: _stale, ...rest } = runtime;
    institutions = { ...institutions, [runtime.id]: expiry === undefined ? rest : { ...rest, actingExpiresDay: expiry } };
  }
  return institutions === campaign.institutions ? campaign : { ...campaign, institutions };
}

/**
 * The day an acting officer's authority lapses under 5 U.S.C. 3346(a)(1):
 * 210 days from the day the vacancy occurred, not the day somebody was named.
 * A vacancy open in the 60 days after an inauguration starts its 210 days at
 * the later of 90 days after the inauguration and 90 days after the vacancy
 * (3349a). `actingClockEffects` tolls and restarts it as nominations come and go.
 */
export function actingLapseDay(vacancyDay: number, limitDays: number): number {
  const transition = vacancyDay < TRANSITION_WINDOW_DAYS;
  const start = transition ? Math.max(TRANSITION_DELAY_DAYS, vacancyDay + TRANSITION_DELAY_DAYS) : vacancyDay;
  return start + limitDays;
}

const TRANSITION_WINDOW_DAYS = 60;
const TRANSITION_DELAY_DAYS = 90;

/**
 * What seating an acting writes, where the seat can take one: the acting record
 * and the body's own acting authority, together. Two records, one change,
 * because the body's authority is what lapses under the Vacancies Act and the
 * acting record is what every screen asks.
 */
export function actingEffects(
  campaign: Campaign,
  seat: RoleId | OfficeId,
  person: PersonId,
  fromDay: number = campaignDay(campaign),
): { readonly ok: true; readonly effects: readonly Effect[] } | { readonly ok: false; readonly reason: string } {
  const refusal = actingRefusal(campaign, seat, person);
  if (refusal) return { ok: false, reason: refusal };
  const { def, office } = actingSeat(seat)!;
  const vacantDays = campaign.institutions[def.id]?.vacantDays ?? 0;
  const clock = nominationClock(campaign, { def, office }, fromDay);
  const expires =
    office.actingLimitDays === undefined
      ? {}
      : { actingExpiresDay: clock ? clockExpiry(clock, office.actingLimitDays, campaign.institutions[def.id]?.actingExpiresDay ?? actingLapseDay(fromDay - vacantDays, office.actingLimitDays)) : actingLapseDay(fromDay - vacantDays, office.actingLimitDays) };
  return {
    ok: true,
    effects: [
      { kind: "acting", seat: actingKey(def, office), person },
      { kind: "institution", institution: def.id, changes: { actingLeader: person, ...expires } },
    ],
  };
}

/**
 * Seat somebody in a role or an office without a confirmation.
 *
 * Every seat on the board used to be either confirmed or empty, which is not
 * how the executive branch runs: a secretary resigns on a Friday, the deputy
 * runs the department on Monday, and the Senate gets to the nomination months
 * later or never. An acting signs for the office and carries none of its
 * mandate, so the office runs worse than it would under a confirmed officer
 * and far better than it does under nobody.
 */
export function appointActing(campaign: Campaign, seat: RoleId | OfficeId, person: PersonId): AppointmentResult {
  const seated = actingEffects(campaign, seat, person);
  if (!seated.ok) return seated;
  const { def, office } = actingSeat(seat)!;
  const name = selectPerson(campaign, person)!.base.name;
  const summary = `${name} is named acting ${office.title}.`;
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", entities: [person, def.id], systems: ["cabinet"] },
      narration: { summary },
      effects: [...seated.effects, pressItem(campaign.turn, summary, name)],
    },
  };
}

/**
 * Who is holding a seat in an acting capacity, if anyone.
 *
 * The body's own authority is the one that lapses, so an acting whose body no
 * longer carries them is nobody's acting any more, whatever the acting record
 * still says.
 */
export function selectActing(campaign: Campaign, seat: RoleId | OfficeId): PersonId | undefined {
  const found = actingSeat(seat);
  if (!found) return undefined;
  const person = campaign.actings?.[actingKey(found.def, found.office)];
  if (person === undefined) return undefined;
  if (campaign.institutions[found.def.id]?.actingLeader !== person) return undefined;
  return campaign.people[person]?.alive ? person : undefined;
}

/**
 * Who is running a chair's department this week: the confirmed Secretary, or
 * failing one the acting. The reading a program, a directive or anything else
 * that needs somebody to sign for a department asks, because an acting signs
 * for the office — that is what the arrangement is for.
 */
export function selectChairRunner(campaign: Campaign, role: RoleId): PersonRuntime | undefined {
  const holder = selectCabinetHolder(campaign, role);
  if (holder?.alive) return holder;
  const acting = selectActing(campaign, role);
  return acting ? campaign.people[acting] : undefined;
}

/**
 * Who would act in a chair the moment it empties: the strongest free name on
 * the chair's own bench, the way a department's senior deputy steps up. Never
 * somebody already acting elsewhere, and never the person leaving.
 */
export function deputyFor(campaign: Campaign, role: RoleId, leaving?: PersonId): PersonId | undefined {
  const key = role as string;
  return selectAppointableFor(campaign, role).find(
    (runtime) => runtime.base.id !== leaving && !actingElsewhere(campaign, runtime.base.id, key),
  )?.base.id;
}

/**
 * Empty a chair the way the executive branch empties one: the departure on the
 * record, and the chair's senior deputy acting from the same day.
 *
 * The one path a chair leaves by, for a resignation, a dismissal, an accepted
 * offer or a public break alike — and the path an authored card that narrates
 * a resignation has to take, so a card cannot say a Secretary walked out while
 * the Secretary stays seated.
 */
export function vacates(
  campaign: Campaign,
  role: RoleId,
  departure: CabinetDeparture,
  person: PersonId,
  turn: number = campaign.turn,
  fromDay: number = campaignDay(campaign),
): readonly Effect[] {
  const leaving = departureEffects(departure, role, person, turn);
  // Checked against the chair as it will be once emptied, since that is the
  // chair the acting is seated into.
  const emptied = seatCabinetOffice(campaign, role, undefined);
  const deputy = deputyFor(emptied, role, person);
  const acting = deputy ? actingEffects(emptied, role, deputy, fromDay) : undefined;
  return acting?.ok ? [...leaving, ...acting.effects] : leaving;
}
