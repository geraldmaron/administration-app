import { FEDERAL_JUDGE_ROLE, GENERAL_OFFICER_ROLE, fnv1a, personPoolSpecs, US_ID, worldStates, type Person, type PersonId, type StateId } from "@admin/world";
import type { Effect } from "./effects.js";
import type { Campaign, PersonRuntime } from "./state.js";
import type { OfficeId } from "./institutions.js";
import { campaignDay } from "./clock.js";
import { createRngStreams } from "./rng.js";
import { newNameLedger } from "./naming.js";
import { generateRolePerson } from "./people.js";
import { birthplacesInState } from "./cast-home.js";
import { CIRCUIT_SEATS } from "./lower-bench.js";
import { DISTRICT_SEAT_SOURCE } from "./lower-bench-source.js";
import { seatKindOf } from "./appointment-eligibility.js";
import { appointmentPool, POOL_MINIMUM } from "./appointment-pool.js";

// The candidates a vacancy brings with it, where the cast cannot staff one.
//
// No seat in the seeded pool is drawn from a judge's life or a serving
// officer's, so a federal court and the Joint Chiefs had nobody credible to
// offer. The phase or act that opens one of those seats calls this, and the
// people it draws are written as `person` effects: stored with the campaign,
// once, the way a circuit panel's judge is materialized (lower-bench.ts) and
// the Hill's members are seated. Nothing here runs from a selector, so reading
// a pool never creates anybody, and a President cannot reroll the bench by
// waiting: the draw is keyed on the seat and the day it opened, and a second
// call for the same vacancy names the same people and writes none of them
// twice.

/** Which generated bench a seat draws, and who on today's pool already counts toward it. */
function benchFor(kind: ReturnType<typeof seatKindOf>): { readonly role: string; readonly credible: (person: Person) => boolean } | undefined {
  if (kind === "justice" || kind === "circuit") {
    return { role: FEDERAL_JUDGE_ROLE, credible: (person) => person.career.some((post) => post.archetype === "judiciary") };
  }
  if (kind === "joint-chiefs") return { role: GENERAL_OFFICER_ROLE, credible: () => true };
  return undefined;
}

const STATE_ID_BY_NAME: ReadonlyMap<string, StateId> = new Map(worldStates.map((state) => [state.name, state.id]));

/** The places a circuit seat's own judges could be from: the circuit's states, from the district table. */
function circuitHomes(office: OfficeId): readonly string[] {
  const circuit = CIRCUIT_SEATS.find((seat) => seat.office === office)?.circuit;
  if (!circuit || circuit === "District of Columbia" || circuit === "Federal") return [];
  const states = [...new Set(DISTRICT_SEAT_SOURCE.filter((row) => row.circuit === circuit).map((row) => row.state))];
  return states.flatMap((name) => {
    const id = STATE_ID_BY_NAME.get(name);
    return id ? birthplacesInState(id) : [];
  });
}

/** One generated candidate, numbered within this vacancy so the same seat on the same day always draws the same person. */
function drawOne(campaign: Campaign, office: OfficeId, role: string, day: number, slot: number, taken: readonly PersonRuntime[]): PersonRuntime | undefined {
  const spec = personPoolSpecs.find((row) => row.nation === US_ID);
  if (!spec) return undefined;
  const ledger = newNameLedger();
  for (const runtime of [...Object.values(campaign.people), ...taken]) {
    ledger.full.add(runtime.base.name);
    ledger.given.add(runtime.base.name.split(" ")[0]!);
  }
  const index = fnv1a(`${office}:${day}:${slot}`) % 1_000_000_000;
  const generated = generateRolePerson(spec, "United States", role, index, createRngStreams(campaign.seed), ledger);
  const homes = circuitHomes(office);
  const home = homes.length > 0 ? createRngStreams(campaign.seed).stream("appointment-bench-home", office, day, slot).pick(homes) : undefined;
  return { base: home ? { ...generated, birthplace: home } : generated, alive: true };
}

/**
 * The `person` effects that stock a newly opened seat's bench up to its
 * minimum, or none where the cast already offers enough credible names or the
 * seat is not one a bench is generated for.
 *
 * `campaign` is the state the vacancy opens on; the people the bench already
 * holds count, so the second vacancy on a court draws only what the first one
 * left short.
 */
export function vacancyBenchEffects(campaign: Campaign, office: OfficeId, day: number = campaignDay(campaign)): readonly Effect[] {
  const kind = seatKindOf(office);
  const bench = benchFor(kind);
  if (!bench || !kind) return [];
  const credible = appointmentPool(campaign, office).filter((row) => bench.credible(row.person.base)).length;
  const drawn: PersonRuntime[] = [];
  for (let slot = 0; slot < POOL_MINIMUM[kind] - credible; slot += 1) {
    const person = drawOne(campaign, office, bench.role, day, slot, drawn);
    if (person && !campaign.people[person.base.id]) drawn.push(person);
  }
  return drawn.map((person): Effect => ({ kind: "person", person: person.base.id as PersonId, create: person, changes: {} }));
}
