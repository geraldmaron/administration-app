import { personPoolSpecs, stateById, US_ID, type PersonId, type StateId } from "@admin/world";
import type { Effect } from "./effects.js";
import type { Campaign, PersonRuntime } from "./state.js";
import type { InstitutionDef, InstitutionId, InstitutionRuntime, OfficeId } from "./institutions.js";
import { CIRCUIT_SEAT_SOURCE, DISTRICT_SEAT_SOURCE, LOWER_BENCH_SOURCE_DATE } from "./lower-bench-source.js";
import { createRngStreams, type CampaignSeed } from "./rng.js";
import { newNameLedger } from "./naming.js";
import { generateRolePerson } from "./people.js";
import { JUDICIARY_SEAT_ROLE } from "./judiciary.js";
import { orderDomainLean } from "./strike-odds.js";
import type { ExecutiveOrder } from "./orders.js";
import type { ExecutiveOrderRecord } from "./state-orders.js";
import { priorGovernmentAdviceRecusal } from "./court-recusal.js";

const slug = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");

// The 94 section-133 source rows describe 91 Article III district forums and
// three groups of shared judgeships. A shared group contributes seats to each
// named forum's possible bench, but is counted once in the national total.
export const DISTRICT_FORUMS = DISTRICT_SEAT_SOURCE.filter((row) =>
  !row.district.includes(" and ") && !row.district.includes(","));
export const SHARED_DISTRICT_SEATS = DISTRICT_SEAT_SOURCE.filter((row) =>
  row.district.includes(" and ") || row.district.includes(","));

type DistrictRow = (typeof DISTRICT_SEAT_SOURCE)[number];
export type DistrictForum = { readonly id: string; readonly court: string; readonly circuit: string;
  readonly state: string; readonly sourceRows: readonly DistrictRow[]; readonly authorized: number;
  readonly activeRepublican: number; readonly activeDemocratic: number; readonly vacancies: number };

const sharedIn = (row: DistrictRow, forum: DistrictRow) =>
  row.state === forum.state && row.circuit === forum.circuit &&
  (row.district === "Eastern and Western" && (forum.district === "Eastern" || forum.district === "Western") ||
    row.district === "Northern, Eastern, and Western" && ["Northern", "Eastern", "Western"].includes(forum.district));

/** A shared judgeship appears in each eligible forum, while the source row is nationally counted once. */
export const DISTRICT_FORUM_READINGS: readonly DistrictForum[] = DISTRICT_FORUMS.map((forum) => {
  const sourceRows = [forum, ...SHARED_DISTRICT_SEATS.filter((row) => sharedIn(row, forum))];
  const sum = (key: "authorized" | "activeRepublican" | "activeDemocratic" | "vacancies") =>
    sourceRows.reduce((total, row) => total + row[key], 0);
  const court = forum.state === "District of Columbia" ? "United States District Court for the District of Columbia"
    : forum.district === "whole state" ? `United States District Court for the District of ${forum.state}`
      : `United States District Court for the ${forum.district} District of ${forum.state}`;
  return { id: `DIST-${slug(forum.state)}-${slug(forum.district)}`, court,
    circuit: forum.circuit === "D.C. Circuit" ? "District of Columbia" : forum.circuit,
    state: forum.state, sourceRows, authorized: sum("authorized"),
    activeRepublican: sum("activeRepublican"), activeDemocratic: sum("activeDemocratic"),
    vacancies: sum("vacancies") };
});

/** State-specific filings stay in that state; federal-wide acts start in D.C. */
export function districtForumFor(state: StateId | undefined, caseId: string, seed: CampaignSeed): DistrictForum {
  const stateName = state ? stateById.get(state as string)?.name : "District of Columbia";
  const available = DISTRICT_FORUM_READINGS.filter((forum) => forum.state === stateName);
  const choices = available.length ? available : DISTRICT_FORUM_READINGS.filter((forum) => forum.state === "District of Columbia");
  const draw = createRngStreams(seed).stream("district-forum", caseId);
  return choices[draw.nextInt(0, choices.length)]!;
}

/** Appointer mix is a small modeled uncertainty around the legal merits, never the merits itself. */
export function districtStrikeChance(legalChance: number, forum: DistrictForum, order: ExecutiveOrder): number {
  const active = forum.activeRepublican + forum.activeDemocratic;
  const mix = active ? (forum.activeDemocratic - forum.activeRepublican) / active : 0;
  const direction = orderDomainLean(order).economicLeftRight;
  // Four points is a bounded modeling assumption. With no economic policy
  // direction, the aggregate party count supplies no directional evidence.
  return Math.max(0.02, Math.min(0.98, legalChance + mix * direction * 0.04));
}

export type CircuitSeat = {
  readonly id: InstitutionId;
  readonly office: OfficeId;
  readonly circuit: string;
  readonly ordinal: number;
};

export const CIRCUIT_SEATS: readonly CircuitSeat[] = CIRCUIT_SEAT_SOURCE.flatMap((row) =>
  Array.from({ length: row.authorized }, (_, index) => {
    const id = `INST-CIRCUIT-${slug(row.court)}-SEAT-${index + 1}`;
    return { id, office: `OFF-CIRCUIT-${slug(row.court)}-SEAT-${index + 1}`, circuit: row.court, ordinal: index + 1 };
  }));

/** Office definitions exist for the existing Senate pipeline, outside the agency catalog. */
export const CIRCUIT_SEAT_DEFS: readonly InstitutionDef[] = CIRCUIT_SEATS.map((seat) => ({
  id: seat.id,
  name: `${seat.circuit} Circuit judicial seat ${seat.ordinal}`,
  abbr: `${seat.circuit} Circuit ${seat.ordinal}`,
  kind: "judiciary",
  tier: 1,
  parent: "INST-JUDICIARY",
  mandate: "Decide cases and controversies on appeal under federal law.",
  jurisdictions: ["judicial"],
  authorities: [],
  independence: "independent",
  offices: [{ id: seat.office, title: `Judge of the ${seat.circuit} Circuit`, appointmentClass: "judicial",
    confirmingChamber: "senate", committee: "CMTE-JUDICIARY", actingAuthority: "none", removal: "term-protected" }],
  capabilities: ["adjudication"],
  domains: ["judicial"],
  // The capacity fields satisfy InstitutionDef. Circuit seats are excluded
  // from agency delivery, budget, and oversight loops by the resolver boundary.
  foundingCapacity: 1,
  staffScale: 0,
}));

export const CIRCUIT_SEAT_IDS = new Set(CIRCUIT_SEATS.map((seat) => seat.id));
export function isCircuitSeat(id: string): boolean { return CIRCUIT_SEAT_IDS.has(id); }

/** The same case and campaign always draw the same three occupied seats. */
export function eligibleCircuitSeat(campaign: Campaign, seat: CircuitSeat, challenged?: ExecutiveOrderRecord): boolean {
  const runtime = campaign.institutions[seat.id];
  if (!runtime || runtime.vacancy) return false;
  if (!runtime.leader) return true; // An anonymous incumbent may be materialized only once.
  const person = campaign.people[runtime.leader];
  return Boolean(person?.alive && person.currentRole === JUDICIARY_SEAT_ROLE
    && !priorGovernmentAdviceRecusal(runtime.leader, challenged));
}

export function circuitPanelRecusals(campaign: Campaign, circuit: string, challenged?: ExecutiveOrderRecord) {
  return CIRCUIT_SEATS.filter((seat) => seat.circuit === circuit).flatMap((seat) => {
    const runtime = campaign.institutions[seat.id];
    const judge = runtime?.leader;
    return runtime && !runtime.vacancy && judge && campaign.people[judge]?.alive
      && priorGovernmentAdviceRecusal(judge, challenged)
      ? [{ seatId: seat.id, judge, turn: campaign.turn, reason: "prior-government-advice" as const }] : [];
  });
}

export function circuitPanelFor(campaign: Campaign, circuit: string, caseId: string,
  challenged?: ExecutiveOrderRecord, excluded: ReadonlySet<string> = new Set()): readonly CircuitSeat[] {
  const available = CIRCUIT_SEATS.filter((seat) => seat.circuit === circuit
    && !excluded.has(seat.id) && eligibleCircuitSeat(campaign, seat, challenged));
  const stream = createRngStreams(campaign.seed).stream("circuit-panel", caseId, circuit);
  for (let i = available.length - 1; i > 0; i--) {
    const j = stream.nextInt(0, i + 1);
    [available[i], available[j]] = [available[j]!, available[i]!];
  }
  return available.slice(0, 3);
}

function sourcePartyOrder(seed: CampaignSeed, circuit: string, republican: number, democratic: number): readonly ("republican" | "democrat")[] {
  const parties: ("republican" | "democrat")[] = [
    ...Array.from({ length: republican }, () => "republican" as const),
    ...Array.from({ length: democratic }, () => "democrat" as const),
  ];
  const stream = createRngStreams(seed).stream("fictional-circuit-seats", circuit);
  for (let i = parties.length - 1; i > 0; i--) {
    const j = stream.nextInt(0, i + 1);
    [parties[i], parties[j]] = [parties[j]!, parties[i]!];
  }
  return parties;
}

/** One authoritative occupied/vacant record per light seat; no current judge is identified. */
export function foundingCircuitSeats(seed: CampaignSeed, foundingYear: number): Readonly<Record<InstitutionId, InstitutionRuntime>> {
  const result: Record<InstitutionId, InstitutionRuntime> = {};
  for (const row of CIRCUIT_SEAT_SOURCE) {
    const seats = CIRCUIT_SEATS.filter((seat) => seat.circuit === row.court);
    const parties = sourcePartyOrder(seed, row.court, row.activeRepublican, row.activeDemocratic);
    for (const [index, seat] of seats.entries()) {
      const party = parties[index];
      const biography = createRngStreams(seed).stream("fictional-circuit-biography", seat.id);
      // The source gives party totals, not individual ages or commissions.
      // These ranges are synthetic and intentionally broad; legal retirement
      // eligibility is evaluated against the stored age and service every year.
      const modeledAgeAtFounding = 48 + biography.nextInt(0, 33);
      const modeledServiceYearsAtFounding = 5 + biography.nextInt(0, Math.min(26, modeledAgeAtFounding - 39));
      result[seat.id] = {
        id: seat.id,
        vacancy: party === undefined,
        vacantDays: 0,
        capacity: 1,
        staffing: 1,
        morale: 0.6,
        integrity: 0.75,
        politicization: 0,
        budgetAdequacy: 0,
        backlog: 0,
        directives: [],
        implementationQuality: 1,
        oversightPressure: 0,
        lowerBenchSeat: { circuit: row.court, sourceDate: LOWER_BENCH_SOURCE_DATE,
          ...(party ? { appointingParty: party, modeledAgeAtFounding, modeledServiceYearsAtFounding } : {}) },
        ...(party ? { judicialProvenance: { serviceStartYear: foundingYear - modeledServiceYearsAtFounding,
          appointingParty: party, synthetic: true as const }, judicialAssessmentYear: foundingYear } : {}),
      };
    }
  }
  return result;
}

export type MaterializedSeat = { readonly seat: CircuitSeat; readonly person: PersonRuntime; readonly effects: readonly Effect[] };

/** A panel event, never a selector, gives an anonymous source seat a fictional identity. */
export function materializeCircuitSeat(campaign: Campaign, seat: CircuitSeat, drawn: readonly PersonRuntime[] = []): MaterializedSeat | undefined {
  const runtime = campaign.institutions[seat.id];
  if (!runtime || runtime.vacancy) return undefined;
  const existing = runtime.leader && campaign.people[runtime.leader];
  if (runtime.leader) return existing?.alive && existing.currentRole === JUDICIARY_SEAT_ROLE
    ? { seat, person: existing, effects: [] } : undefined;
  const spec = personPoolSpecs.find((row) => row.nation === US_ID);
  if (!spec) return undefined;
  const ledger = newNameLedger();
  for (const person of [...Object.values(campaign.people), ...drawn]) {
    ledger.full.add(person.base.name);
    ledger.given.add(person.base.name.split(" ")[0]!);
  }
  const role = "role-court-chancellor";
  const index = 1000 + CIRCUIT_SEATS.indexOf(seat);
  const generated = generateRolePerson(spec, "United States", role, index, createRngStreams(campaign.seed), ledger);
  const party = runtime.lowerBenchSeat?.appointingParty;
  // The aggregate only identifies the appointing party. This small economic
  // tilt is a modeling assumption; individual traits still determine a vote.
  const economicShift = party === "republican" ? 0.15 : party === "democrat" ? -0.15 : 0;
  const base = { ...generated,
    age: runtime.lowerBenchSeat?.modeledAgeAtFounding ?? generated.age,
    ideology: { ...generated.ideology,
    economicLeftRight: Math.max(-1, Math.min(1, generated.ideology.economicLeftRight + economicShift)) } };
  const person: PersonRuntime = { base, alive: true, currentRole: JUDICIARY_SEAT_ROLE };
  const id = base.id as PersonId;
  return { seat, person, effects: [
    { kind: "person", person: id, create: person, changes: {} },
    { kind: "institution", institution: seat.id, changes: { leader: id } },
  ] };
}
