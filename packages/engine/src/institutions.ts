import { AGENCY_HEAD_ROLE, type PersonId, type RoleId } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import type { DirectiveId } from "./directives.js";
import type { TurnPhase } from "./turn-loop.js";
import { INSTITUTION_CATALOG } from "./institution-catalog.js";
import { campaignFoundingDate, daysBetween } from "./clock.js";
import { weekOpenDate } from "./feed-cap.js";
import { FUNDED_BUDGET_ADEQUACY, inShutdown, lapsedBudgetAdequacy, settledBudgetAdequacy } from "./funding.js";
import { JUDICIARY_SEAT_ROLE } from "./judiciary.js";
import { CIRCUIT_SEAT_DEFS, isCircuitSeat } from "./lower-bench.js";
import type { AdministrationParty } from "./state-legislature.js";

export { INSTITUTION_CATALOG };

// The executive branch as a graph of institutions with capacity, not a cabinet
// table with seven names in it.
//
// The distinction this module exists to make is between *deciding* and
// *executing*. Before it, a policy became an outcome because a stance changed,
// and a vacancy cost nothing because nothing downstream asked whether anyone
// was in the chair. An institution has a mandate it is asked to deliver, a
// staff whose size does not change on presidential whim, a leader who may be
// absent, acting or confirmed, and a budget that may not cover the mandate.
// What comes out is implementation quality, and implementation quality is what
// separates a president who announces things from a president who delivers.
//
// Nothing here mutates. The phase at the bottom returns an EffectPacket like
// every other system, and apply() remains the only writer.

export type InstitutionId = string;
export type OfficeId = string;

export type InstitutionKind =
  | "presidency"
  | "legislature"
  | "judiciary"
  | "state-government"
  | "department"
  | "executive-office"
  | "independent-agency"
  | "regulator"
  | "intelligence"
  | "military"
  | "operating-component"
  | "field";

/**
 * How far a body sits from presidential direction, which is the single most
 * consequential fact about it and the one a seven-seat cabinet could not
 * express at all.
 *
 * `executive` takes direction. `semi-autonomous` takes direction but has norms
 * or a statutory mission that make politicizing it cost something. `independent`
 * does not take direction on its core function at all: the President's only
 * lever is the seat that opens, which is what makes a long-dated appointment
 * a real decision rather than a flavor line.
 */
export type InstitutionIndependence = "executive" | "semi-autonomous" | "independent";

/** How a leadership office is filled. Drives which confirmation path applies. */
export type AppointmentClass = "PAS" | "PA" | "SES" | "ScheduleC" | "fixed-term" | "judicial" | "military";

/**
 * What may happen when the office is empty.
 *
 * Deliberately per-office. Assuming one global Vacancies Act rule for every
 * seat is wrong in both directions: some offices have their own statutory
 * succession that overrides it, and a multi-member board does not get an
 * acting member at all, it operates on whatever quorum it still has.
 */
export type ActingAuthority = "vacancies-act" | "statutory-succession" | "board-quorum" | "none";

export type RemovalConstraint = "at-will" | "for-cause" | "term-protected";

export type OfficeDef = {
  readonly id: OfficeId;
  readonly title: string;
  readonly appointmentClass: AppointmentClass;
  readonly confirmingChamber?: "senate";
  readonly committee?: string;
  /** Fixed statutory term, where the office has one. Absent means serves at pleasure. */
  readonly termYears?: number;
  /** Multi-member bodies: how many seats the office describes. Absent means one. */
  readonly seats?: number;
  readonly actingAuthority: ActingAuthority;
  /** How long an acting officer may serve before the authority lapses. */
  readonly actingLimitDays?: number;
  readonly removal: RemovalConstraint;
  /** Order in the presidential line of succession, where the office is in it. */
  readonly successionRank?: number;
  readonly cabinetRank?: number;
};

export type InstitutionDef = {
  readonly id: InstitutionId;
  readonly name: string;
  readonly abbr: string;
  readonly kind: InstitutionKind;
  readonly tier: 0 | 1 | 2 | 3;
  readonly parent?: InstitutionId;
  readonly mandate: string;
  readonly jurisdictions: readonly string[];
  readonly authorities: readonly string[];
  readonly independence: InstitutionIndependence;
  readonly offices: readonly OfficeDef[];
  readonly capabilities: readonly string[];
  readonly domains: readonly string[];
  readonly locales?: readonly string[];
  /** Capacity at inauguration, 0..1: how much of its mandate it can carry. */
  readonly foundingCapacity: number;
  /** Relative size, 0..1. Scales how much work arrives and how fast backlog builds. */
  readonly staffScale: number;
  /**
   * The cabinet seat that runs this body, where one does.
   *
   * The join that was missing, and the whole of a defect the player could see:
   * the roster read "Secretary of State — Hannah Palmer" while the executive
   * branch on the same screen read "Department of State — No confirmed
   * officer", because `player.cabinet` is keyed by charter role and
   * `campaign.institutions` by institution id and nothing connected them. One
   * office was two records, and they disagreed.
   *
   * With this, the cabinet seat is the fact and the institution's `leader` is
   * projected from it by the one writer that seats a minister
   * (`seatCabinetOffice`). A body with no `cabinetRole` — an independent
   * regulator, a component bureau — keeps its own leader and its own
   * confirmation, which is correct: nobody sits in the cabinet for the FCC.
   */
  readonly cabinetRole?: RoleId;
};

/**
 * The live state of one institution. Everything here is 0..1 except backlog,
 * which is an unbounded count of work owed, because the whole point of a
 * backlog is that it has no ceiling and a capacity reading does.
 */
export type InstitutionRuntime = {
  readonly id: InstitutionId;
  /** The confirmed officeholder, where there is one. */
  readonly leader?: PersonId;
  /** The occupant's appointment record. Founding entries are explicitly synthetic. */
  readonly judicialProvenance?: {
    readonly serviceStartYear: number;
    readonly appointingParty: AdministrationParty;
    readonly synthetic?: true;
  };
  /** Last annual vacancy draw for this occupant; stored so replay and save/reload cannot redraw it. */
  readonly judicialAssessmentYear?: number;
  /** An anonymous circuit incumbent is occupied even before a panel gives them a fictional identity. */
  readonly lowerBenchSeat?: { readonly circuit: string; readonly sourceDate: string;
    readonly appointingParty?: AdministrationParty; readonly modeledAgeAtFounding?: number;
    readonly modeledServiceYearsAtFounding?: number };
  /** Serving under acting authority, which is not the same as holding the office. */
  readonly actingLeader?: PersonId;
  /** The date the acting authority lapses, as an ordinal day of the campaign. */
  readonly actingExpiresDay?: number;
  readonly vacancy: boolean;
  /** How long the top office has been empty, in days. Drives the cost of leaving it empty. */
  readonly vacantDays: number;
  readonly capacity: number;
  readonly staffing: number;
  readonly morale: number;
  readonly integrity: number;
  /** How far the body has been bent toward the administration's politics rather than its mandate. */
  readonly politicization: number;
  readonly budgetAdequacy: number;
  readonly backlog: number;
  /**
   * The instructions this administration has given it, by id.
   *
   * Ids rather than sentences. It held free text until the directive layer
   * landed, which meant an instruction had no status, no date, no author and no
   * way to have been refused — so nothing could read it and nothing did. The
   * record itself lives in `campaign.directives`; what sits here is the join.
   */
  readonly directives: readonly DirectiveId[];
  /** What actually comes out, 0..1. Derived each turn, never written directly. */
  readonly implementationQuality: number;
  readonly oversightPressure: number;
};

// --- Catalog access --------------------------------------------------------

const BY_ID: ReadonlyMap<InstitutionId, InstitutionDef> = new Map(
  [...INSTITUTION_CATALOG, ...CIRCUIT_SEAT_DEFS].map((def) => [def.id, def]),
);

const OFFICE_INDEX: ReadonlyMap<OfficeId, { readonly office: OfficeDef; readonly institution: InstitutionDef }> =
  new Map(
    [...INSTITUTION_CATALOG, ...CIRCUIT_SEAT_DEFS].flatMap((institution) =>
      institution.offices.map((office) => [office.id, { office, institution }] as const),
    ),
  );

/**
 * An institution's name as it reads inside a sentence.
 *
 * Every body in the catalog takes the article in running prose (the Department
 * of Justice, the Federal Bureau of Investigation), and a sentence that
 * interpolated the bare name read like a telegram: "directing casework at
 * Federal Bureau of Investigation". A name that already opens with "The" keeps
 * its own article, lowered to sit mid-sentence.
 */
export function institutionInProse(name: string): string {
  return name.startsWith("The ") ? `the ${name.slice(4)}` : `the ${name}`;
}

/** The same name opening a sentence. */
export function institutionOpening(name: string): string {
  const prose = institutionInProse(name);
  return prose.charAt(0).toUpperCase() + prose.slice(1);
}

export function institutionDef(id: InstitutionId): InstitutionDef | undefined {
  return BY_ID.get(id);
}

export function officeDef(id: OfficeId): OfficeDef | undefined {
  return OFFICE_INDEX.get(id)?.office;
}

export function officeInstitution(id: OfficeId): InstitutionDef | undefined {
  return OFFICE_INDEX.get(id)?.institution;
}

export const INSTITUTION_IDS: readonly InstitutionId[] = INSTITUTION_CATALOG.map((def) => def.id);
export const OFFICE_IDS: readonly OfficeId[] = [...OFFICE_INDEX.keys()];

/** Direct children of an institution in the graph. */
export function institutionChildren(id: InstitutionId): readonly InstitutionDef[] {
  return INSTITUTION_CATALOG.filter((def) => def.parent === id);
}

/** Every institution holding a named authority, which is how a policy finds its executor. */
export function institutionsWithAuthority(authority: string): readonly InstitutionDef[] {
  return INSTITUTION_CATALOG.filter((def) => def.authorities.includes(authority));
}

export function institutionsForDomain(domain: string): readonly InstitutionDef[] {
  return INSTITUTION_CATALOG.filter((def) => def.domains.includes(domain));
}

// --- Founding --------------------------------------------------------------

/**
 * Every institution at inauguration.
 *
 * A new administration inherits a government that is already running: staffed,
 * with its own morale and its own backlog, and with the political offices empty
 * because the previous administration's appointees left with it. That asymmetry
 * — career staff present, political leadership absent — is the actual opening
 * position of an American presidency and it is what makes the first months of
 * a term about appointments whether the player wants them to be or not.
 */
export function foundingInstitutions(
  cabinet: Readonly<Record<string, PersonId>> = {},
): Readonly<Record<InstitutionId, InstitutionRuntime>> {
  const runtimes: Record<InstitutionId, InstitutionRuntime> = {};
  for (const def of INSTITUTION_CATALOG) {
    const politicalTop = def.offices.some(
      (office) => office.appointmentClass === "PAS" || office.appointmentClass === "PA",
    );
    // A body whose cabinet seat the founding already filled is not vacant, and
    // saying otherwise is how the Government room came to show a named
    // Secretary of State above a Department of State with nobody in the chair.
    // The default is an empty cabinet, which is the honest reading for a
    // migrated save and for the fixtures: nobody has been seated.
    const seated = def.cabinetRole ? cabinet[def.cabinetRole as string] : undefined;
    runtimes[def.id] = {
      id: def.id,
      ...(seated ? { leader: seated } : {}),
      vacancy: seated ? false : politicalTop,
      vacantDays: 0,
      capacity: def.foundingCapacity,
      staffing: 0.85,
      morale: 0.6,
      integrity: 0.75,
      politicization: 0.1,
      budgetAdequacy: 0.8,
      backlog: 0,
      directives: [],
      implementationQuality: def.foundingCapacity,
      oversightPressure: 0,
    };
  }
  return runtimes;
}

// --- Derivation ------------------------------------------------------------

// A vacancy does not zero an agency out. Career staff keep executing; what
// stops is anything needing a decision only the confirmed officer can make.
// So the drag is real, bounded, and it compounds with time rather than
// arriving all at once, which is the actual observed shape of a long vacancy.
const VACANCY_DRAG_FLOOR = 0.06;
const VACANCY_DRAG_CEILING = 0.28;
const VACANCY_DRAG_DAYS = 300;
// An acting officer is better than nobody and worse than a confirmed officer:
// they can sign, but they carry no mandate and the building knows it.
const ACTING_RECOVERY = 0.55;
// And the cost of that stays bounded: an acting who has run a department for
// half a year knows it, and a contested nominee's department is not charged a
// deepening vacancy for a chair somebody is sitting in. Held at the day-one
// cost of an empty chair.
const ACTING_DRAG_CAP = VACANCY_DRAG_FLOOR;

// What the person at the head of a body below the cabinet brings to its work.
// Centered on the middle of the seated cast, so a typical agency head leaves
// delivery where it was and the term only separates a strong one from a weak
// one. A department's Secretary is already read by the program they carry
// (policy.ts) and by the resolutions they steward, so the term is for the
// bodies whose heads nothing else reads.
const LEADER_COMPETENCE_WEIGHT = 0.2;
const LEADER_COMPETENCE_MIDPOINT = 0.85;

const POLITICIZATION_INTEGRITY_WEIGHT = 0.3;
const MORALE_WEIGHT = 0.2;
const BUDGET_WEIGHT = 0.25;
const STAFFING_WEIGHT = 0.25;
const BACKLOG_DRAG_PER_UNIT = 0.004;
const BACKLOG_DRAG_CEILING = 0.3;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** How much of the top office's absence is actually biting, 0..1. */
export function vacancyDrag(runtime: InstitutionRuntime): number {
  if (!runtime.vacancy) return 0;
  const ramp = Math.min(1, runtime.vacantDays / VACANCY_DRAG_DAYS);
  const full = VACANCY_DRAG_FLOOR + (VACANCY_DRAG_CEILING - VACANCY_DRAG_FLOOR) * ramp;
  return round3(runtime.actingLeader ? Math.min(ACTING_DRAG_CAP, full * (1 - ACTING_RECOVERY)) : full);
}

/**
 * How much the head of a body below the cabinet adds to or takes from what it
 * delivers, signed. Zero for a department, whose Secretary other rules read,
 * and zero where nobody is in the chair, which the vacancy drag already prices.
 */
export function leaderDeliveryTerm(def: InstitutionDef, leaderCompetence: number | undefined): number {
  if (def.cabinetRole || leaderCompetence === undefined) return 0;
  return round3((leaderCompetence - LEADER_COMPETENCE_MIDPOINT) * LEADER_COMPETENCE_WEIGHT);
}

/** The competence of whoever is running this body, confirmed or acting, where anyone is. */
export function leaderCompetenceOf(campaign: Pick<Campaign, "people">, runtime: InstitutionRuntime): number | undefined {
  const head = runtime.leader ?? runtime.actingLeader;
  return head === undefined ? undefined : campaign.people[head]?.base.competence;
}

/**
 * What an institution actually delivers, as against what it was asked for.
 *
 * Deliberately a derivation rather than a stored dial: every term in it is a
 * fact the player can see and move, so when delivery degrades there is always
 * an answer to "why", which is the difference between endogenous fragility and
 * a hidden difficulty multiplier.
 */
export function deriveImplementationQuality(
  runtime: InstitutionRuntime,
  def: InstitutionDef,
  leaderCompetence?: number,
): number {
  const terms = implementationTerms(runtime, def, leaderCompetence);
  const base = terms.staffing + terms.morale + terms.budget + terms.capacity + terms.leader;
  return round3(clamp01(base - terms.vacancy - terms.politicization - terms.backlog));
}

/**
 * The terms delivery is the sum of, unrounded: four inputs and the head's
 * signed contribution that add up to what the body could deliver, and three
 * drags, already scaled by its insulation, that come off it. A screen that
 * explains a delivery figure reads these rather than restating the weights,
 * so the explanation cannot drift from the figure it explains.
 */
export type ImplementationTerms = {
  readonly staffing: number;
  readonly morale: number;
  readonly budget: number;
  readonly capacity: number;
  readonly leader: number;
  readonly vacancy: number;
  readonly politicization: number;
  readonly backlog: number;
};

export function implementationTerms(
  runtime: InstitutionRuntime,
  def: InstitutionDef,
  leaderCompetence?: number,
): ImplementationTerms {
  // An independent body is *less* degraded by presidential neglect and less
  // improved by presidential attention: that is what its independence buys it,
  // in both directions.
  const insulation = def.independence === "independent" ? 0.5 : def.independence === "semi-autonomous" ? 0.75 : 1;
  return {
    staffing: runtime.staffing * STAFFING_WEIGHT,
    morale: runtime.morale * MORALE_WEIGHT,
    budget: runtime.budgetAdequacy * BUDGET_WEIGHT,
    capacity: runtime.capacity * (1 - STAFFING_WEIGHT - MORALE_WEIGHT - BUDGET_WEIGHT),
    leader: leaderDeliveryTerm(def, leaderCompetence),
    vacancy: vacancyDrag(runtime) * insulation,
    politicization: runtime.politicization * POLITICIZATION_INTEGRITY_WEIGHT * insulation,
    backlog: Math.min(BACKLOG_DRAG_CEILING, runtime.backlog * BACKLOG_DRAG_PER_UNIT) * insulation,
  };
}

/**
 * The executive branch's aggregate ability to carry out what it is told to do.
 *
 * Weighted by staff scale rather than by headcount of institutions, because a
 * vacancy at the Department of Defense and a vacancy at a five-person board
 * are not the same fact and averaging them flat would say they were.
 */
export function selectExecutiveCapacity(campaign: Campaign): number {
  let weighted = 0;
  let weight = 0;
  for (const def of INSTITUTION_CATALOG) {
    if (def.tier === 0) continue;
    if (def.independence === "independent") continue;
    const runtime = campaign.institutions[def.id];
    if (!runtime) continue;
    weighted += runtime.implementationQuality * def.staffScale;
    weight += def.staffScale;
  }
  return weight === 0 ? 0 : round3(weighted / weight);
}

/**
 * How much of the executive branch's delivery is being lost to offices nobody
 * is in, 0..1.
 *
 * Measured on the vacancy drag alone, weighted the way capacity is, and not on
 * capacity itself — which is the distinction that makes this a fair reading
 * rather than a permanent tax. Capacity also carries morale and backlog, and a
 * branch that has been hollow for two years keeps a lowered morale and a
 * standing backlog long after its offices are filled; charging the president
 * for those forever would mean no administration could ever recover from a bad
 * start. What a president controls, and what this reads, is whether anybody is
 * in the chair.
 *
 * Zero for a fully led branch, which is the point: this can only ever mark an
 * administration down, and only for the part of the government it has actually
 * left empty.
 */
export function selectDeliveryShortfall(campaign: Campaign): number {
  let weighted = 0;
  let weight = 0;
  for (const def of INSTITUTION_CATALOG) {
    if (def.tier === 0) continue;
    if (def.independence === "independent") continue;
    const runtime = campaign.institutions[def.id];
    if (!runtime) continue;
    weighted += vacancyDrag(runtime) * def.staffScale;
    weight += def.staffScale;
  }
  if (weight === 0) return 0;
  // Normalized by the drag's own ceiling, so a branch whose every office has
  // been empty long enough to bite in full reads 1 rather than 0.28.
  return round3(clamp01(weighted / weight / VACANCY_DRAG_CEILING));
}

/** Every institution whose top office is empty, worst first. */
export function selectVacancies(campaign: Campaign): readonly InstitutionRuntime[] {
  return Object.values(campaign.institutions)
    .filter((runtime) => runtime.vacancy && !isCircuitSeat(runtime.id))
    .sort((a, b) => b.vacantDays - a.vacantDays);
}

// --- The turn phase --------------------------------------------------------

// Work arrives in proportion to size, and is cleared in proportion to what the
// institution can actually do. A body running at its founding capacity clears
// slightly more than arrives, so a well-run government drains its backlog;
// one running below about 0.7 accumulates. That crossing point is the whole
// mechanic and it is deliberately visible rather than tuned to be invisible.
const ARRIVAL_PER_TURN = 6;
const CLEARANCE_PER_TURN = 8.5;
/** What a body clears against what arrives at full delivery; the services keep the same crossing point. */
export const CLEARANCE_PER_ARRIVAL = CLEARANCE_PER_TURN / ARRIVAL_PER_TURN;
const MORALE_DRIFT = 0.01;
const MORALE_VACANCY_COST = 0.012;
const MORALE_BACKLOG_FLOOR = 40;
const POLITICIZATION_DECAY = 0.008;

export type InstitutionTick = {
  readonly id: InstitutionId;
  readonly changes: Partial<InstitutionRuntime>;
};

/**
 * One turn of institutional life, as a list of changes rather than as writes.
 *
 * Split out from the phase so the balance harness and the tests can read what
 * a turn would do to an institution without going through apply().
 */
export function institutionTick(
  runtime: InstitutionRuntime,
  def: InstitutionDef,
  daysElapsed: number,
  lapsed = false,
  settled: number = FUNDED_BUDGET_ADEQUACY,
  leaderCompetence?: number,
): InstitutionTick {
  const vacantDays = runtime.vacancy ? runtime.vacantDays + daysElapsed : 0;
  // Budget adequacy had been a founding constant nothing ever moved. Two things
  // move it now, and they are different facts: a lapse in appropriations is the
  // money not arriving at all, and `settled` is the level the domestic line the
  // President voted actually pays for. A body walks toward the second and falls
  // off the cliff of the first.
  const budgetAdequacy = lapsedBudgetAdequacy(
    runtime.budgetAdequacy,
    def.independence !== "executive",
    lapsed,
    settled,
  );
  const withDays: InstitutionRuntime = { ...runtime, vacantDays, budgetAdequacy };

  const arrival = ARRIVAL_PER_TURN * def.staffScale;
  const cleared = CLEARANCE_PER_TURN * def.staffScale * deriveImplementationQuality(withDays, def, leaderCompetence);
  const backlog = Math.max(0, round3(runtime.backlog + arrival - cleared));

  const moralePressure =
    (runtime.vacancy ? MORALE_VACANCY_COST : 0) + (backlog > MORALE_BACKLOG_FLOOR * def.staffScale ? MORALE_DRIFT : 0);
  // Morale recovers toward a settled level rather than toward 1: a functioning
  // bureaucracy is not an enthusiastic one, and modeling it as though it should
  // be would make every quiet week read as a failure.
  const moraleTarget = 0.6;
  const morale = clamp01(
    round3(runtime.morale + (runtime.morale < moraleTarget ? MORALE_DRIFT : -MORALE_DRIFT / 2) - moralePressure),
  );

  const politicization = clamp01(round3(Math.max(0, runtime.politicization - POLITICIZATION_DECAY)));

  const next: InstitutionRuntime = { ...withDays, backlog, morale, politicization };
  const implementationQuality = deriveImplementationQuality(next, def, leaderCompetence);

  return {
    id: def.id,
    changes: { vacantDays, budgetAdequacy, backlog, morale, politicization, implementationQuality },
  };
}

/**
 * The executive branch's own week: backlogs move, morale drifts, vacancies get
 * more expensive, and acting authority runs out.
 *
 * Emitted as one packet rather than one per institution, because fifty-odd
 * ledger entries a week for routine administrative drift would bury the record
 * the player actually reads.
 */
export const institutionPhase: TurnPhase = (state: Campaign) => {
  const ticks: InstitutionTick[] = [];
  const actingLapses: InstitutionId[] = [];
  const daysElapsed = 7;
  // Read once for the whole branch: whether the government has been funded is a
  // fact about the appropriation, not about any one agency.
  const lapsed = inShutdown(state);
  // Read once for the whole branch too, and for the same reason: what the
  // domestic appropriation buys is a level for the government, not for one
  // agency.
  const settled = settledBudgetAdequacy(state);

  // Read at the week's opening day rather than the weekday this phase happens
  // to run on, so a week stepped by office day and a week taken whole lapse the
  // same acting in the same week.
  const weekOpenDay = daysBetween(campaignFoundingDate(state), weekOpenDate(state));
  for (const def of INSTITUTION_CATALOG) {
    const runtime = state.institutions[def.id];
    if (!runtime) continue;
    ticks.push(institutionTick(runtime, def, daysElapsed, lapsed, settled, leaderCompetenceOf(state, runtime)));
    if (runtime.actingLeader !== undefined && runtime.actingExpiresDay !== undefined && weekOpenDay >= runtime.actingExpiresDay) {
      actingLapses.push(def.id);
    }
  }
  // Light judicial seats have no agency workload, but an open seat's vacancy
  // clock still advances for the appointments board.
  for (const runtime of Object.values(state.institutions)) {
    if (runtime.lowerBenchSeat && runtime.vacancy) {
      ticks.push({ id: runtime.id, changes: { vacantDays: runtime.vacantDays + daysElapsed } });
    }
  }

  if (ticks.length === 0) return [];

  return [
    {
      source: "simulate",
      actor: "world",
      turn: state.turn,
      provenance: { origin: "institution", systems: ["institutions"] },
      narration: {
        summary: phaseSummary(actingLapses.length, lapsed),
      },
      effects: [
        { kind: "institution", ticks },
        ...(actingLapses.length > 0 ? [{ kind: "institution" as const, actingLapsed: actingLapses }] : []),
      ],
    },
  ];
};

function phaseSummary(actingLapses: number, unfunded: boolean): string {
  if (unfunded) {
    return "The executive branch works its week without an appropriation: excepted staff only, and everything else waits.";
  }
  if (actingLapses > 0) {
    return `Acting authority lapses at ${actingLapses} ${actingLapses === 1 ? "agency" : "agencies"}, and the executive branch works through its week.`;
  }
  return "The executive branch works through its week.";
}

// --- The cabinet seat and the body it runs, as one fact --------------------

/**
 * Every institution a cabinet seat runs, keyed by that seat.
 *
 * Built once off the catalog rather than searched per call: the roster reads
 * it on every render and the seating writer on every appointment.
 */
export const INSTITUTION_BY_CABINET_ROLE: ReadonlyMap<string, InstitutionDef> = new Map(
  INSTITUTION_CATALOG.flatMap((def) => (def.cabinetRole ? [[def.cabinetRole as string, def] as const] : [])),
);

/** The body this cabinet seat runs, where it runs one. */
export function institutionForRole(role: RoleId): InstitutionDef | undefined {
  return INSTITUTION_BY_CABINET_ROLE.get(role as string);
}

/**
 * The role on the record of whoever leads this body: its cabinet seat for a
 * department, a seat on the bench for a court, and the agency head's for every
 * other body. These are the roles the founding seats each kind under, so an
 * officer the Senate confirms reads the same as one the transition inherited.
 */
export function leaderRoleOf(def: InstitutionDef): RoleId {
  if (def.cabinetRole) return def.cabinetRole;
  return def.kind === "judiciary" ? JUDICIARY_SEAT_ROLE : (AGENCY_HEAD_ROLE as RoleId);
}

/**
 * Who holds a chair, moved on the people as well as on the seat: the person
 * leaving it stops holding the role, the person taking it starts, and the
 * loyalty they arrive with becomes the baseline their dossier's trend reads
 * against. A person already holding the role keeps their baseline, so seating
 * somebody where they already sit changes nothing.
 */
function withOfficeholder(
  people: Readonly<Record<string, PersonRuntime>>,
  role: RoleId,
  incoming: PersonId | undefined,
  outgoing: PersonId | undefined,
): Readonly<Record<string, PersonRuntime>> {
  let next = people;
  const leaving = outgoing !== undefined && outgoing !== incoming ? next[outgoing] : undefined;
  if (leaving && leaving.currentRole === role) {
    // Deleted rather than written as undefined, for the JSON round trip a save is.
    const { currentRole: _role, loyaltyAtAppointment: _baseline, ...rest } = leaving;
    next = { ...next, [outgoing as string]: rest as PersonRuntime };
  }
  const taking = incoming !== undefined ? next[incoming] : undefined;
  if (taking && taking.currentRole !== role) {
    next = { ...next, [incoming as string]: { ...taking, currentRole: role, loyaltyAtAppointment: taking.base.loyalty } };
  }
  return next;
}

/**
 * Seat a person in a cabinet office, in every record at once.
 *
 * **The one writer.** Before this, seating a Secretary of State wrote
 * `player.cabinet` and left `INST-STATE` vacant forever, so the Government
 * room showed a named Secretary of State above a Department of State with "no
 * confirmed officer" — one office, two records, disagreeing on screen. The
 * person is the third record: a Secretary seated without their `currentRole`
 * was offered for every other job in the government, and a Secretary displaced
 * without losing it could never be appointed again. Every path that seats or
 * empties a cabinet chair goes through here, which is what makes the three
 * unable to drift apart rather than merely agreeing today.
 *
 * `person` omitted empties the chair. The institution's `vacantDays` resets on
 * a seating and starts counting again from an emptying, because that clock is
 * what the delivery reading is actually about: how long nobody has been in it.
 */
export function seatCabinetOffice(
  state: Campaign,
  role: RoleId,
  person: PersonId | undefined,
): Campaign {
  const cabinet = { ...state.player.cabinet };
  const outgoing = cabinet[role];
  if (person === undefined) delete cabinet[role];
  else cabinet[role] = person;
  const people = withOfficeholder(state.people, role, person, outgoing);
  const next = { ...state, people, player: { ...state.player, cabinet } };

  const def = institutionForRole(role);
  const runtime = def ? next.institutions[def.id] : undefined;
  if (!def || !runtime) return next;

  // The key is deleted rather than written as undefined for an emptied chair,
  // the same rule the cabinet record itself follows: an explicit undefined
  // does not survive the JSON round trip a save is, so the institution would
  // reload with a shape it was not written from.
  const { leader: _departed, ...withoutLeader } = runtime;
  // A confirmed Secretary is what an acting stood in for, so seating one ends
  // the acting arrangement in both records; emptying the chair leaves any
  // acting where it is, because that is who runs the department next.
  const { actingLeader: _acting, actingExpiresDay: _expires, ...unacted } = runtime;
  const led: InstitutionRuntime =
    person === undefined
      ? { ...withoutLeader, vacancy: true, vacantDays: 0 }
      : { ...(unacted as InstitutionRuntime), leader: person, vacancy: false, vacantDays: 0 };

  const seated = { ...next, institutions: { ...next.institutions, [def.id]: led } };
  return person === undefined ? seated : withoutActing(seated, [role as string]);
}

/**
 * The acting record with these seats cleared. Deleted rather than set to
 * undefined, for the JSON round trip a save is, and left untouched when none
 * of them is held so a campaign with no actings keeps the shape it had.
 */
export function withoutActing(state: Campaign, seats: readonly string[]): Campaign {
  const actings = state.actings;
  if (!actings || !seats.some((seat) => seat in actings)) return state;
  const kept = Object.fromEntries(Object.entries(actings).filter(([seat]) => !seats.includes(seat)));
  return { ...state, actings: kept };
}

/**
 * Seat a confirmed officer at the head of a body, whatever kind of body it is.
 *
 * A department's chair is its cabinet seat, so it goes through
 * `seatCabinetOffice`; any other body is led directly. Either way the person
 * takes the body's leader role and whoever led it before gives it up, and the
 * acting authority ends, because a confirmed officer is what acting authority
 * stood in for.
 */
export function seatOfficer(state: Campaign, institution: InstitutionId, person: PersonId): Campaign {
  const def = institutionDef(institution);
  const runtime = state.institutions[institution];
  if (!def || !runtime) return state;
  const seated = def.cabinetRole
    ? seatCabinetOffice(state, def.cabinetRole, person)
    : {
        ...state,
        people: withOfficeholder(state.people, leaderRoleOf(def), person, runtime.leader),
        institutions: { ...state.institutions, [institution]: { ...runtime, leader: person, vacancy: false, vacantDays: 0 } },
      };
  const { actingLeader: _acting, actingExpiresDay: _expires, ...led } = seated.institutions[institution]!;
  const confirmed = { ...seated, institutions: { ...seated.institutions, [institution]: led as InstitutionRuntime } };
  return withoutActing(confirmed, [...(def.cabinetRole ? [def.cabinetRole as string] : []), ...(def.offices[0] ? [def.offices[0].id] : [])]);
}

/** Whether an office is the one its body's leader holds; a deputy's is not. */
export function leadsInstitution(office: OfficeId): boolean {
  return officeInstitution(office)?.offices[0]?.id === office;
}
