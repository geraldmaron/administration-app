import { AGENCY_HEAD_ROLE, worldStates, type CareerArchetype, type Person, type StudyField } from "@admin/world";
import type { Campaign, PersonRuntime } from "./state.js";
import { officeDef, officeInstitution, type OfficeId } from "./institutions.js";
import { selectActiveNominations } from "./nomination-stages.js";
import { presidentFit } from "./appointments.js";
import { crossesTheAisle, ideologyCloseness, usPartyOfPerson, type FitPresident } from "./cast-fit.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
import { DISTRICT_SEAT_SOURCE } from "./lower-bench-source.js";
import { stateOfBirthplace } from "./cast-home.js";
import { commandYears, isLifeSeat, isServingOfficer, seatKindOf, seatRuleRefusal, yearsOutOfUniform, type SeatKind } from "./appointment-eligibility.js";
import { lensFor, relevanceOf, type Relevance } from "./appointment-lens.js";

// Who the President could send up for an office, best fit for the seat first,
// and why.
//
// One ranking for every Senate-confirmed seat. Before this, cabinet chairs
// sorted by party first, agencies by years in a coarse career table, and the
// courts by competence alone, so the Chief Justice's seat was offered an
// economist, the same octogenarian engineer topped four health and science
// agencies, and a civilian topped the Joint Chiefs. The order is now the
// seat's own: hard rules first (appointment-eligibility.ts), then a life in
// what the seat hires (appointment-lens.ts), then fit with the President, then
// the record the Senate reads. Each row carries the reasons it was ranked on,
// every one of them a fact the dossier already shows, so the screen can say
// why without printing a hidden reading.
//
// The pool is read from state on every call and never stored. A bench the
// cast cannot staff is generated once, when the vacancy opens
// (appointment-bench.ts), so waiting never conjures a better candidate.

/** How long a life seat's nominee could serve, read from age. A derived band, never a figure. */
export type TenureBand = "decades" | "a-decade-or-two" | "under-a-decade";

/** Why a candidate is where they are on the list, heaviest reason first. */
export type PoolReason =
  | { readonly kind: "career"; readonly years: number; readonly careers: readonly CareerArchetype[] }
  | { readonly kind: "study"; readonly field: StudyField; readonly postgraduate: boolean }
  | { readonly kind: "agency-bench" }
  | { readonly kind: "serving"; readonly commandYears: number }
  | { readonly kind: "veteran"; readonly yearsOut: number }
  | { readonly kind: "home-circuit"; readonly circuit: string }
  | { readonly kind: "tenure"; readonly band: TenureBand }
  | { readonly kind: "party"; readonly side: "own" | "other" };

export type PoolCandidate = {
  readonly person: PersonRuntime;
  /** The rank key, 0..1. Internal: a screen shows the reasons and banded readings, never this. */
  readonly score: number;
  readonly reasons: readonly PoolReason[];
};

/** The fewest credible names a seat should offer before a bench is generated for it. */
export const POOL_MINIMUM: Readonly<Record<SeatKind, number>> = {
  cabinet: 4, deputy: 4, agency: 4, regulator: 4, "service-secretary": 4, "joint-chiefs": 3, justice: 3, circuit: 3,
};

type Weights = { readonly relevance: number; readonly party: number; readonly politics: number; readonly record: number; readonly tenure: number };

// Party is a weight, not the first sort key, so twenty-two years of Treasury
// work is not ranked under four years of a co-partisan's. Bodies the law keeps
// at arm's length from the President weigh the record over politics; the Joint
// Chiefs weigh no politics at all.
const EXECUTIVE: Weights = { relevance: 0.45, party: 0.2, politics: 0.15, record: 0.2, tenure: 0 };
const ARMS_LENGTH: Weights = { relevance: 0.45, party: 0.1, politics: 0.15, record: 0.3, tenure: 0 };
const REGULATOR: Weights = { relevance: 0.45, party: 0.15, politics: 0.15, record: 0.25, tenure: 0 };
const MILITARY: Weights = { relevance: 0.6, party: 0, politics: 0, record: 0.4, tenure: 0 };
const BENCH: Weights = { relevance: 0.35, party: 0.05, politics: 0.25, record: 0.2, tenure: 0.15 };

const HOME_CIRCUIT_BONUS = 0.08;
/** What the agency-head bench is worth below the cabinet, in years of the seat's own work. */
const AGENCY_BENCH_YEARS = 15;

function weightsFor(kind: SeatKind, office: OfficeId): Weights {
  if (kind === "justice" || kind === "circuit") return BENCH;
  if (kind === "joint-chiefs") return MILITARY;
  if (kind === "regulator") return REGULATOR;
  return officeInstitution(office)?.independence === "executive" ? EXECUTIVE : ARMS_LENGTH;
}

/** The President's own side, the other side, or neither, as 1, 0 and a half. */
function sideOf(person: Person, president: FitPresident): { readonly value: number; readonly side?: "own" | "other" } {
  const crosses = crossesTheAisle(person, president);
  if (crosses && usPartyOfPerson(person) !== undefined) return { value: 0, side: "other" };
  const own = president.party === "independent" ? usPartyOfPerson(person) !== undefined && !crosses : usPartyOfPerson(person) === president.party;
  return own ? { value: 1, side: "own" } : { value: 0.5 };
}

export function tenureBand(age: number): TenureBand {
  if (age <= 55) return "decades";
  return age <= 65 ? "a-decade-or-two" : "under-a-decade";
}

const TENURE_VALUE: Readonly<Record<TenureBand, number>> = { decades: 1, "a-decade-or-two": 0.55, "under-a-decade": 0.1 };

const STATE_NAME: ReadonlyMap<string, string> = new Map(worldStates.map((state) => [state.id as string, state.name]));

/** The regional circuit each state sits in, from the district table's own rows. D.C. and the Federal Circuit have none. */
const CIRCUIT_OF_STATE: ReadonlyMap<string, string> = new Map(DISTRICT_SEAT_SOURCE.map((row) => [row.state, row.circuit]));

/** The circuit a circuit seat sits on, where it is a regional one whose judges the law requires to live in it (28 U.S.C. §44(c)). */
function regionalCircuitOf(office: OfficeId): string | undefined {
  const circuit = CIRCUIT_SEATS.find((seat) => seat.office === office)?.circuit;
  return circuit && circuit !== "District of Columbia" && circuit !== "Federal" ? circuit : undefined;
}

/** Whether a person is from the seat's circuit, read off their birthplace; residence is not modeled. */
export function fromCircuit(person: Pick<Person, "birthplace">, circuit: string): boolean {
  const state = stateOfBirthplace(person.birthplace);
  const name = state === undefined ? undefined : STATE_NAME.get(state as string);
  return name !== undefined && CIRCUIT_OF_STATE.get(name) === circuit;
}

/** Everyone who could be sent up for this office at all: free, alive, the President's own, within the seat's rules. */
function eligibleBench(campaign: Campaign, office: OfficeId, kind: SeatKind): readonly PersonRuntime[] {
  const pending = new Set(selectActiveNominations(campaign).map((nomination) => nomination.nominee as string));
  const institution = officeInstitution(office);
  // Acting somewhere else is being spoken for; acting in this seat is the
  // commonest way into it, so that name stays.
  const ownKey = (kind === "cabinet" ? (institution?.cabinetRole as string | undefined) : undefined) ?? office;
  const acting = new Set(Object.entries(campaign.actings ?? {}).flatMap(([seat, person]) => (seat === ownKey ? [] : [String(person)])));
  const role = kind === "cabinet" ? (institution?.cabinetRole as string | undefined) : undefined;
  return Object.values(campaign.people).filter(
    (runtime) =>
      runtime.alive &&
      runtime.currentRole === undefined &&
      runtime.judicialRetired !== true &&
      (runtime.base.nationality as string) === (campaign.founding.nation as string) &&
      !pending.has(runtime.base.id as string) &&
      !acting.has(runtime.base.id as string) &&
      (role === undefined || runtime.base.eligibleRoles.some((eligible) => (eligible as string) === role)) &&
      seatRuleRefusal(campaign, office, runtime.base) === undefined,
  );
}

/** Below the cabinet a candidate must have done or studied what the seat's primary domain hires; a cabinet chair's bench is its own gate. */
function clearsFloor(kind: SeatKind, relevance: Relevance): boolean {
  return kind === "cabinet" || kind === "joint-chiefs" || kind === "justice" || kind === "circuit" || relevance.primary;
}

type Scored = PoolCandidate & { readonly id: string };

function reasonsFor(person: Person, kind: SeatKind, relevance: Relevance, extras: { readonly agency: boolean; readonly circuit?: string; readonly side?: "own" | "other" }): readonly PoolReason[] {
  const out = yearsOutOfUniform(person);
  // The two longest careers the seat hires, and only their years, so the line never claims more than it names.
  const named = relevance.careers.slice(0, 2);
  return [
    ...(named.length > 0 ? [{ kind: "career" as const, years: named.reduce((sum, career) => sum + career.years, 0), careers: named.map((career) => career.archetype) }] : []),
    ...(relevance.studied ? [{ kind: "study" as const, field: person.education.field, postgraduate: person.education.postgraduate }] : []),
    ...(extras.agency ? [{ kind: "agency-bench" as const }] : []),
    ...(kind === "joint-chiefs" && isServingOfficer(person) ? [{ kind: "serving" as const, commandYears: commandYears(person) }] : []),
    ...(kind !== "joint-chiefs" && out !== undefined ? [{ kind: "veteran" as const, yearsOut: out }] : []),
    ...(extras.circuit ? [{ kind: "home-circuit" as const, circuit: extras.circuit }] : []),
    ...(isLifeSeat(kind) ? [{ kind: "tenure" as const, band: tenureBand(person.age) }] : []),
    ...(extras.side ? [{ kind: "party" as const, side: extras.side }] : []),
  ];
}

function scored(runtime: PersonRuntime, office: OfficeId, kind: SeatKind, president: FitPresident): Scored | undefined {
  const person = runtime.base;
  const lens = lensFor(office, kind);
  const relevance = relevanceOf(person, lens);
  if (!clearsFloor(kind, relevance)) return undefined;
  const weights = weightsFor(kind, office);
  const agency = (kind === "agency" || kind === "regulator" || kind === "deputy") && person.eligibleRoles.some((role) => (role as string) === AGENCY_HEAD_ROLE);
  const relevanceShare = Math.min(1, (relevance.score + (agency ? AGENCY_BENCH_YEARS : 0)) / lens.saturation);
  const side = sideOf(person, president);
  const record = person.competence * 0.6 + person.integrity * 0.4;
  const circuit = regionalCircuitOf(office);
  const home = circuit !== undefined && fromCircuit(person, circuit) ? circuit : undefined;
  const score =
    weights.relevance * relevanceShare +
    weights.party * side.value +
    weights.politics * ideologyCloseness(person.ideology, president.ideology) +
    weights.record * record +
    weights.tenure * (isLifeSeat(kind) ? TENURE_VALUE[tenureBand(person.age)] : 0) +
    (home ? HOME_CIRCUIT_BONUS : 0);
  const showSide = weights.party > 0 ? side.side : undefined;
  return { id: person.id as string, person: runtime, score: Math.round(score * 1e6) / 1e6, reasons: reasonsFor(person, kind, relevance, { agency, ...(home ? { circuit: home } : {}), ...(showSide ? { side: showSide } : {}) }) };
}

/**
 * Every name the President could send up for this office, best fit first, with
 * the reasons each was ranked on. Empty for an office the Senate does not
 * confirm, or one that does not exist.
 */
export function appointmentPool(campaign: Campaign, office: OfficeId): readonly PoolCandidate[] {
  const kind = seatKindOf(office);
  if (!kind || !officeDef(office)) return [];
  const president = presidentFit(campaign);
  return eligibleBench(campaign, office, kind)
    .flatMap((runtime) => scored(runtime, office, kind, president) ?? [])
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map(({ person, score, reasons }) => ({ person, score, reasons }));
}
