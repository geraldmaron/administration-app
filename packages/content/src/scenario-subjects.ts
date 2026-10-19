import { z } from "zod";
import { worldSettlements } from "@admin/world";
import { createRngStreams, cityMayorSeat, decisionCauses, institutionDef, selectGovernor, selectPerson, type Campaign, type Effect, type StorySubject } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
import type { ResolvedLocus } from "./scenario-locus.js";
import { INSTITUTION_KINDS } from "./audit-lexicon.js";
import { ENTITY_REGISTRY, EntityRegistryId } from "./entity-registry.js";
import { PLACE_TOKEN_NAMES } from "./scenario-text.js";

const token = z.string().regex(/^[a-zA-Z]{2,24}$/);
const key = token.refine((value) =>
  !/^entity[A-Z]$/.test(value) && !new Set<string>([...PLACE_TOKEN_NAMES, ...INSTITUTION_KINDS, "settlementSite", "counterpart", "counterpartAdjective", "leader", "title", "nation"]).has(value), "Reserved rendering token");
export const ScenarioSubjectSlot = z.discriminatedUnion("source", [
  z.object({ key, source: z.literal("entity"), entity: EntityRegistryId }).strict(),
  z.object({ key, source: z.literal("governor") }).strict(),
  z.object({ key, source: z.literal("mayor") }).strict(),
  z.object({ key, source: z.literal("member"), chamber: z.enum(["house", "senate"]), scope: z.enum(["state", "nation"]) }).strict(),
  z.object({ key, source: z.literal("institution"), institution: z.string().min(1) }).strict(),
  z.object({ key, source: z.literal("inherit"), scenario: z.string().min(1), slot: token }).strict(),
]);

/** Closed cases retain their typed binding; inheritance never re-renders their prose. */
function inherited(campaign: Campaign, scenario: string, slot: string): StorySubject | undefined {
  return Object.values(campaign.cases ?? {}).filter((item) => item.story?.scenario === scenario)
    .sort((a, b) => b.raisedAt.year - a.raisedAt.year || b.raisedAt.month - a.raisedAt.month || b.raisedAt.day - a.raisedAt.day || b.id.localeCompare(a.id))
    .flatMap((item) => item.story?.subjects ?? []).find((subject) => subject.key === slot);
}

/** The registry already declares each actor's introduction; no name is inferred from prose. */
function registeredEntities(def: ScenarioDef): readonly string[] {
  return [...new Set([...(def.entities ?? []), ...ENTITY_REGISTRY.filter((entry) => entry.firstAppearance === def.id).map((entry) => entry.id)])];
}

/** Absence means the scenario cannot honestly be cast, never an invented substitute. */
export function bindStorySubjects(campaign: Campaign, def: ScenarioDef, locus: ResolvedLocus | undefined, originCase = `scenario:${def.id}`): readonly StorySubject[] | undefined {
  const causes = decisionCauses(campaign.ledger, { gatedOn: def.conditions.flatMap((condition) => condition.kind === "flag" && condition.is ? [condition.flag] : []) });
  const inheritedSubjects = campaign.ledger.filter((entry) => entry.causal && causes.includes(entry.causal.eventId)).flatMap((entry) => entry.subjects ?? []);
  const familySubjects = def.family && def.family.role !== "opener" ? Object.values(campaign.cases ?? {})
    .filter((item) => item.story?.family === def.family?.id).flatMap((item) => item.story?.subjects ?? []) : [];
  const result: StorySubject[] = [...new Map([...familySubjects, ...inheritedSubjects].map((subject) => [subject.id, subject])).values()]
    .filter((subject) => !def.subjects?.some((slot) => slot.key === subject.key));
  const locality = settlementSubject(campaign, def, locus, originCase);
  if (locality) result.push(locality);
  const slots: z.infer<typeof ScenarioSubjectSlot>[] = [...(def.subjects ?? []), ...registeredEntities(def)
    .filter((id) => !def.subjects?.some((slot) => slot.source === "entity" && slot.entity === id))
    .map((entity, index) => ({ key: `entity${String.fromCharCode(65 + index)}`, source: "entity" as const, entity }))];
  for (const slot of slots) {
    if (slot.source === "inherit") {
      const prior = inherited(campaign, slot.scenario, slot.slot);
      if (!prior) return undefined;
      result.push({ ...prior, key: slot.key });
      continue;
    }
    const entityPrior = slot.source === "entity" ? Object.values(campaign.cases ?? {}).flatMap((item) => item.story?.subjects ?? [])
      .find((subject) => subject.id === `entity:${slot.entity}`) : undefined;
    if (entityPrior) { result.push({ ...entityPrior, key: slot.key }); continue; }
    const existing = slot.source === "entity" && def.family && def.family.role !== "opener" ? Object.values(campaign.cases ?? {})
      .filter((item) => item.story?.family === def.family?.id && item.status === "acted")
      .flatMap((item) => item.story?.subjects ?? []).find((subject) => subject.key === slot.key) : undefined;
    if (existing) { result.push(existing); continue; }
    const identity = resolveIdentity(campaign, slot, locus, def.id);
    if (!identity) return undefined;
    const id = slot.source === "entity" ? `entity:${slot.entity}` : "person" in identity && typeof identity.person === "string" ? identity.person : "institution" in identity && typeof identity.institution === "string" ? identity.institution : `story:${def.id}:${slot.key}`;
    const prior = Object.values(campaign.cases ?? {}).flatMap((item) => item.story?.subjects ?? []).find((subject) => subject.id === id);
    if (prior) { result.push({ ...prior, key: slot.key }); continue; }
    result.push({ key: slot.key, id, ...identity,
      nation: locus?.nation ?? campaign.founding.nation, ...(locus?.state ? { state: locus.state } : {}),
      ...(locus?.city ? { city: locus.city } : {}), ...(locus?.settlement ? { settlement: locus.settlement } : {}), originCase, originScenario: def.id, originTurn: campaign.turn });
  }
  if (def.transmission?.domesticSubject && !result.some((subject) => subject.key === def.transmission?.domesticSubject && subject.kind === "person")) return undefined;
  return [...new Map(result.map((subject) => [`${subject.id}:${subject.key}`, subject])).values()];
}

function settlementSubject(campaign: Campaign, def: ScenarioDef, locus: ResolvedLocus | undefined, originCase: string): StorySubject | undefined {
  const point = worldSettlements.find((place) => place.id === locus?.settlement);
  if (!point) return undefined;
  const earlier = Object.values(campaign.cases ?? {}).flatMap((item) => item.story?.subjects ?? []).find((subject) => subject.id === point.id);
  return earlier ?? { key: "settlementSite", id: point.id, kind: "place", name: point.name, description: "Sourced geographic locality", nation: point.nation,
    state: point.state, settlement: point.id, originCase, originScenario: def.id, originTurn: campaign.turn };
}

function resolveIdentity(campaign: Campaign, slot: z.infer<typeof ScenarioSubjectSlot>, locus: ResolvedLocus | undefined, scenario: string) {
  if (slot.source === "entity") {
    const entity = ENTITY_REGISTRY.find((entry) => entry.id === slot.entity);
    return entity && entity.homeNation === (locus?.nation ?? campaign.founding.nation) ? { kind: "organization" as const, name: entity.name, description: `${entity.sector.replaceAll("-", " ")} organization` } : undefined;
  }
  if (slot.source === "governor") {
    const governor = locus?.state ? selectGovernor(campaign, locus.state) : undefined;
    const person = governor ? selectPerson(campaign, governor.person) : undefined;
    return person ? { kind: "person" as const, name: person.base.name, person: person.base.id, description: "Governor when this subject entered the record" } : undefined;
  }
  if (slot.source === "mayor") {
    const seat = locus?.city ? cityMayorSeat(campaign, locus.city) : undefined;
    return seat ? { kind: "person" as const, name: seat.person.base.name, person: seat.person.base.id, description: "Mayor when this subject entered the record" } : undefined;
  }
  if (slot.source === "member") {
    if (slot.scope === "state" && !locus?.state) return undefined;
    const members = (campaign.congress.members ?? []).filter((member) => member.chamber === slot.chamber &&
      (slot.scope === "nation" || member.state === locus?.state) && campaign.people[member.person]?.alive).sort((a, b) => a.seat.localeCompare(b.seat));
    const index = createRngStreams(campaign.seed).stream("story-member", scenario, slot.key).nextInt(0, Math.max(1, members.length));
    const person = members[index] ? campaign.people[members[index]!.person] : undefined;
    return person ? { kind: "person" as const, name: person.base.name, person: person.base.id, description: `${slot.chamber === "house" ? "Representative" : "Senator"} when this subject entered the record` } : undefined;
  }
  if (slot.source === "institution") {
    const institution = institutionDef(slot.institution);
    return institution && campaign.institutions[slot.institution] ? { kind: "institution" as const, name: institution.name,
      institution: institution.id, description: "Institution named in the decision" } : undefined;
  }
  return undefined;
}

/** Existing narrative assets keep their location across unrelated callbacks too. */
export function priorSubjectPlace(campaign: Campaign, def: ScenarioDef) {
  for (const id of registeredEntities(def)) {
    const found = Object.values(campaign.cases ?? {}).flatMap((item) => item.story?.subjects ?? []).find((subject) => subject.id === `entity:${id}`);
    if (found?.state) return { state: found.state, ...(found.city ? { city: found.city } : {}), ...(found.settlement ? { settlement: found.settlement } : {}) };
  }
  for (const slot of def.subjects ?? []) {
    if (slot.source !== "inherit") continue;
    const found = inherited(campaign, slot.scenario, slot.slot);
    if (found?.state) return { state: found.state, ...(found.city ? { city: found.city } : {}), ...(found.settlement ? { settlement: found.settlement } : {}) };
  }
  return undefined;
}

/** The selector can reject an unavailable predecessor without loading/rendering a body. */
export function subjectRequirementsMet(campaign: Campaign, slots: readonly z.infer<typeof ScenarioSubjectSlot>[] = []): boolean {
  return slots.every((slot) => slot.source === "inherit" ? inherited(campaign, slot.scenario, slot.slot) !== undefined :
    slot.source === "institution" ? institutionDef(slot.institution) !== undefined && campaign.institutions[slot.institution] !== undefined : true);
}

/** Materialize a city's existing fictional officeholder through the engine's person effect. */
export function storySubjectEffects(campaign: Campaign, cast: { readonly locus?: ResolvedLocus; readonly script: { readonly subjects?: readonly StorySubject[] } }): readonly Effect[] {
  if (!cast.locus?.city || !cast.script.subjects?.some((subject) => subject.person && !campaign.people[subject.person])) return [];
  const seat = cityMayorSeat(campaign, cast.locus.city);
  return seat && cast.script.subjects.some((subject) => subject.person === seat.person.base.id) ? seat.effects : [];
}
