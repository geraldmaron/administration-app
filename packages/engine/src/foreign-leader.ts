import {
  NATION_LEADER_CONSTRAINTS,
  SECOND_TRAIT_CHANCE,
  US_ID,
  roleProfileByRole,
  worldDataset,
  type NationId,
  type NationTraits,
  type PartyId,
  type Person,
  type PersonId,
  type PersonTrait,
  type RoleId,
} from "@admin/world";
import { leaderPersonalityOn, nationalsOf, rememberedLeader, rememberedRapport } from "./leader-index.js";
import { personIdFor } from "./person-id.js";
import { leaderRapport } from "./person-disposition.js";
import type { RngStream } from "./rng.js";
import { selectCabinetHolder, selectNation, type Campaign, type PersonRuntime } from "./state.js";
import type { TemperamentAxisKey, TemperamentOffset } from "./state-world.js";
import { TEMPERAMENT_CENTER, appetite } from "./temperament.js";

// Who holds a nation's own lead chair, and what that person brings to the
// government they lead: the disposition the government's temperament reads
// into them when they are drawn, and the bounded lean their character puts on
// that temperament for as long as they hold office.

/** The lead chair a nation's own charter names, or undefined for a nation with no charter on record. */
export function leadRoleFor(campaign: Campaign, nationId: NationId): RoleId | undefined {
  const nation = selectNation(campaign, nationId);
  const charter = nation && worldDataset.charters.find((c) => c.id === nation.base.identity.government);
  return charter?.cabinetRoles[0];
}

/** The person the leader table describes: the first candidate drawn for the lead chair. */
export function tableIncumbentId(nationId: NationId, lead: RoleId): PersonId {
  return personIdFor(nationId as string, lead as string, 0) as PersonId;
}

/**
 * The seated head of government for a nation that is not the player's own —
 * the same living national `/nation`, `/ops` and `/person` already name for
 * that office, so a counterpart who speaks in a conversation is the same
 * person those surfaces already point at, not a second guess at who runs
 * the place.
 *
 * Whoever holds the chair on the record holds it: a successor an election, a
 * coup or a lost war seated carries the lead role as their `currentRole`, and
 * outranks everyone, including the table's incumbent and whatever chair the
 * successor was first drawn for. With nobody seated on the record, the table's
 * incumbent holds the chair while alive, and only after them does the most
 * competent living candidate for it succeed, so a stronger rival drawn for the
 * same chair never outranks the head of government the table seats.
 */
export function foreignLeaderFor(campaign: Campaign, nationId: NationId): { readonly person: PersonId; readonly name: string } | undefined {
  const lead = leadRoleFor(campaign, nationId);
  if (!lead) return undefined;
  if (nationId === campaign.founding.nation) {
    const holder = selectCabinetHolder(campaign, lead);
    if (holder?.alive) return { person: holder.base.id, name: holder.base.name };
  }
  const seated = rememberedLeader(campaign, nationId, lead as string, () => seatedAbroad(campaign, nationId, lead));
  return seated ? { person: seated.base.id, name: seated.base.name } : undefined;
}

function seatedAbroad(campaign: Campaign, nationId: NationId, lead: RoleId): PersonRuntime | undefined {
  const incumbent = tableIncumbentId(nationId, lead);
  const rank = (runtime: PersonRuntime): number =>
    (runtime.currentRole === lead ? 2 : 0) + ((runtime.base.id as string) === incumbent ? 1 : 0);
  return nationalsOf(campaign, nationId)
    .filter((runtime) => runtime.alive && (runtime.currentRole === lead || runtime.base.eligibleRoles.includes(lead)))
    .sort((a, b) => rank(b) - rank(a) || b.base.competence - a.base.competence)[0];
}

/** The party the leader table says governs a nation, or none for a government that runs without one. */
export function tableGoverningParty(nation: NationId): PartyId | undefined {
  return NATION_LEADER_CONSTRAINTS[nation as string]?.governing[0];
}

/**
 * The party in power: the one the seat abroad records once foreign politics
 * has seated anybody, and the table's before that. A seat that names no party
 * (a junta, a throne) reads as none, which is the slate's reading.
 */
export function governingPartyOf(campaign: Campaign, nation: NationId): PartyId | undefined {
  const seat = campaign.foreignPolitics?.seats[nation];
  return seat ? seat.party : tableGoverningParty(nation);
}

// --- The disposition a government reads into the leader it is drawn -------

/** The three dispositions toward force a head of government can be read as. */
const DISPOSITIONS: readonly PersonTrait[] = ["hawkish", "dovish", "pragmatic"];

// How far a government's appetite has to sit from the world's middle before it
// reads its leaders one way rather than the other. At the middle a leader is
// as likely a pragmatist as either of the other two together.
const DISPOSITION_FLOOR = 0.2;
const DISPOSITION_SLOPE = 2;
const PRAGMATIC_WEIGHT = 0.4;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** The weights the three dispositions are read at, from a government's own temperament. */
export function dispositionWeights(traits: NationTraits): Readonly<Record<"hawkish" | "dovish" | "pragmatic", number>> {
  const lean = appetite(traits) - TEMPERAMENT_CENTER.appetite;
  return {
    hawkish: clamp01(DISPOSITION_FLOOR + lean * DISPOSITION_SLOPE),
    dovish: clamp01(DISPOSITION_FLOOR - lean * DISPOSITION_SLOPE),
    pragmatic: PRAGMATIC_WEIGHT,
  };
}

function dispositionByRoll(roll: number, traits: NationTraits): PersonTrait {
  const weights = dispositionWeights(traits);
  const total = weights.hawkish + weights.dovish + weights.pragmatic;
  let target = roll * total;
  for (const trait of ["hawkish", "dovish", "pragmatic"] as const) {
    target -= weights[trait];
    if (target <= 0) return trait;
  }
  return "pragmatic";
}

/**
 * A foreign head of government's traits, with the disposition read from the
 * government they lead.
 *
 * Takes exactly the draws the seat's ordinary pick takes — one roll for the
 * anchor, one for whether there is a second trait, and one more only when
 * there is — so everything drawn after it from the same stream (party,
 * ideology, the face) lands exactly where it did, and no name moves. The
 * anchor's roll is read against the government's temperament rather than the
 * seat's list; the second trait still comes from the seat, and never names a
 * second disposition. Undefined for the President's own country and for a
 * nation the dataset does not carry, which the caller draws the ordinary way.
 */
export function pickLeadTraits(stream: RngStream, likely: readonly PersonTrait[], nation: string): PersonTrait[] | undefined {
  if (nation === (US_ID as string)) return undefined;
  const traits = worldDataset.nations.find((entry) => (entry.id as string) === nation)?.traits;
  if (!traits) return undefined;
  const anchor = dispositionByRoll(stream.next(), traits);
  const others = likely.filter((trait) => !DISPOSITIONS.includes(trait));
  if (stream.next() >= SECOND_TRAIT_CHANCE) return [anchor];
  // The ordinary pick always has a second trait to offer, so it always takes
  // this draw once the roll asks for one; a seat whose whole list is
  // dispositions still takes it here, and keeps only the anchor.
  const second = stream.pick(others.length > 0 ? others : likely);
  return others.length > 0 ? [anchor, second] : [anchor];
}

// --- The lean a leader puts on their government's temperament ---------------

/** The most a seated leader moves any one axis of their government's temperament, either way. */
export const LEADER_OFFSET_BOUND = 0.1;

/** A hawk's or a dove's pull on both the government's aggression and the risk it will run. */
export const LEADER_DISPOSITION_SWING = 0.06;

/** Ambition's pull on the risk a government will run, at the reading's two ends. */
export const LEADER_AMBITION_SWING = 0.04;

/** Integrity's pull on how far a government holds to law and treaty. */
export const LEADER_INTEGRITY_SWING = 0.06;

/** Loyalty's pull on how far a government keeps its word to partners. */
export const LEADER_LOYALTY_SWING = 0.04;

/** A nationalist's or a globalist's pull on how far the government keeps to its own business. */
export const LEADER_OUTLOOK_SWING = 0.06;

/** An ambitious leader's pull toward taking an opening, and a cautious one's away from it. */
export const LEADER_OPPORTUNISM_SWING = 0.04;

/** A pragmatist's pull toward letting a slight go. */
export const LEADER_VENGEFULNESS_SWING = 0.04;

const centered = (reading: number): number => (reading - 0.5) * 2;

/**
 * What the lean is read from. A person supplies their own fields, a sign for
 * hawk or dove and 1 or 0 for a trait; the leader a government would typically
 * be drawn supplies the middle of the chair's windows and the odds of each
 * trait. One shape for both is what keeps the expected lean computed by the
 * same arithmetic as the lean it is measured against.
 */
type LeanInputs = {
  readonly hawk: number;
  readonly ambition: number;
  readonly integrity: number;
  readonly loyalty: number;
  readonly nationalistGlobalist: number;
  readonly trait: (trait: PersonTrait) => number;
};

// Transparency stays at zero: integrity already reaches covert restraint
// through legalism, and an openness reading taken from it would brake covert
// work twice for the same scruple.
function leanOf(input: LeanInputs): Readonly<Record<TemperamentAxisKey, number>> {
  const disposition = input.hawk * LEADER_DISPOSITION_SWING;
  const traitAxes = leaderPersonalityOn();
  return {
    aggression: disposition,
    riskTolerance: disposition + centered(input.ambition) * LEADER_AMBITION_SWING,
    legalism: centered(input.integrity) * LEADER_INTEGRITY_SWING,
    reliability: centered(input.loyalty) * LEADER_LOYALTY_SWING,
    isolationism: input.nationalistGlobalist * LEADER_OUTLOOK_SWING,
    opportunism: traitAxes ? (input.trait("ambitious") - input.trait("cautious")) * LEADER_OPPORTUNISM_SWING : 0,
    transparency: 0,
    vengefulness: traitAxes ? (0 - input.trait("pragmatic")) * LEADER_VENGEFULNESS_SWING : 0,
  };
}

function dispositionSign(traits: readonly PersonTrait[]): number {
  if (traits.includes("hawkish")) return 1;
  return traits.includes("dovish") ? -1 : 0;
}

/** What a person would put on a government's temperament, before it is measured against anyone. */
export function personalLean(person: Person): Readonly<Record<TemperamentAxisKey, number>> {
  return leanOf({
    hawk: dispositionSign(person.traits),
    ambition: person.ambition,
    integrity: person.integrity,
    loyalty: person.loyalty,
    nationalistGlobalist: person.ideology.nationalistGlobalist,
    trait: (trait) => (person.traits.includes(trait) ? 1 : 0),
  });
}

const round3 = (value: number): number => Math.round(value * 1000) / 1000 + 0;

function boundedDifference(lean: Readonly<Record<TemperamentAxisKey, number>>, base: Readonly<Record<TemperamentAxisKey, number>> | undefined): TemperamentOffset {
  const offset: Partial<Record<TemperamentAxisKey, number>> = {};
  for (const axis of Object.keys(lean) as TemperamentAxisKey[]) {
    const delta = round3(Math.max(-LEADER_OFFSET_BOUND, Math.min(LEADER_OFFSET_BOUND, lean[axis] - (base?.[axis] ?? 0))));
    if (delta !== 0) offset[axis] = delta;
  }
  return offset;
}

/**
 * The offset a leader holds while in office: how far their lean sits from the
 * lean of the leader the table seated, per axis, within the bound.
 *
 * Measured against the table's incumbent because the stored seat is what
 * changes when the chair changes hands: the incumbent stores nothing, a
 * successor stores how they differ from them, and the incumbent's own lean is
 * added on read (`incumbentResidual`), so a successor ends up measured against
 * the same expected leader the incumbent is. Zero axes are left out.
 */
export function leaderOffset(successor: Person | undefined, baseline: Person | undefined): TemperamentOffset {
  if (!successor || (baseline && successor.id === baseline.id)) return {};
  return boundedDifference(personalLean(successor), baseline ? personalLean(baseline) : undefined);
}

// --- The lean of the leader in office at the start ---------------------------

const DISPOSITION_ODDS_KEYS = ["hawkish", "dovish", "pragmatic"] as const;

/** Where the governing party's platform puts a leader drawn from it on the nationalist-globalist axis; nowhere without one. */
function platformOutlook(nation: (typeof worldDataset.nations)[number], spread: number): number {
  const party = tableGoverningParty(nation.id);
  const platform = party === undefined ? undefined : nation.partySystem.parties.find((entry) => entry.id === party);
  if (!platform) return 0;
  return Math.max(-spread, Math.min(spread, platform.beliefs.nationalistGlobalist));
}

/**
 * The leader a government would typically be drawn: the anchor read from its
 * temperament at the odds the draw uses, a second trait from the chair's list
 * at the odds the draw uses, the middle of every window, and the governing
 * party's outlook.
 */
function expectedInputs(nationId: NationId, lead: RoleId): LeanInputs | undefined {
  const nation = worldDataset.nations.find((entry) => entry.id === nationId);
  const profile = roleProfileByRole.get(lead as string);
  if (!nation || !profile) return undefined;
  const weights = dispositionWeights(nation.traits);
  const total = weights.hawkish + weights.dovish + weights.pragmatic;
  const anchor = Object.fromEntries(DISPOSITION_ODDS_KEYS.map((key) => [key, weights[key] / total])) as Record<string, number>;
  const others = profile.likelyTraits.filter((trait) => !DISPOSITIONS.includes(trait));
  const mid = (key: keyof typeof profile.attributes): number => (profile.attributes[key].min + profile.attributes[key].max) / 2;
  return {
    hawk: anchor.hawkish! - anchor.dovish!,
    ambition: mid("ambition"),
    integrity: mid("integrity"),
    loyalty: mid("loyalty"),
    nationalistGlobalist: platformOutlook(nation, profile.ideologySpread),
    trait: (trait) => anchor[trait] ?? (others.includes(trait) ? SECOND_TRAIT_CHANCE / others.length : 0),
  };
}

const expectedLeans = new Map<string, Readonly<Record<TemperamentAxisKey, number>> | null>();

/** The lean the typical leader of this government would put on it, read once per nation and chair. */
function expectedLean(nationId: NationId, lead: RoleId): Readonly<Record<TemperamentAxisKey, number>> | undefined {
  const key = `${nationId as string}|${lead as string}`;
  if (!expectedLeans.has(key)) {
    const inputs = expectedInputs(nationId, lead);
    expectedLeans.set(key, inputs ? leanOf(inputs) : null);
  }
  return expectedLeans.get(key) ?? undefined;
}

const residuals = new WeakMap<Person, TemperamentOffset>();

/**
 * How far the leader in office at the start leans from the leader their
 * government would typically have, within the bound.
 *
 * The dataset's temperament describes the government, not the person the
 * founding drew to lead it, so a markedly hawkish incumbent of a cautious
 * government used to move nothing. Read on every call rather than stored, from
 * the table's incumbent whoever now holds the chair: a successor's stored
 * offset is measured against that incumbent, so adding this puts every leader
 * against the same expected one.
 */
export function incumbentResidual(campaign: Campaign, nation: NationId): TemperamentOffset {
  if (nation === campaign.founding.nation || !leaderPersonalityOn()) return {};
  const lead = leadRoleFor(campaign, nation);
  const incumbent = lead ? campaign.people[tableIncumbentId(nation, lead)]?.base : undefined;
  if (!lead || !incumbent) return {};
  const known = residuals.get(incumbent);
  if (known) return known;
  const expected = expectedLean(nation, lead);
  const residual = expected ? boundedDifference(personalLean(incumbent), expected) : {};
  residuals.set(incumbent, residual);
  return residual;
}

// --- Two leaders across a table ----------------------------------------------

/**
 * How well the leaders of two capitals get on personally, centered on the
 * typical pair of governments, -1..1; nothing where either chair is empty. The
 * President is read as the American side's leader, a fact about the other
 * government's situation and never a choice the President makes.
 */
export function leaderRapportBetween(campaign: Campaign, from: NationId, to: NationId): number {
  const left = foreignLeaderFor(campaign, from);
  const right = foreignLeaderFor(campaign, to);
  const a = left ? campaign.people[left.person]?.base : undefined;
  const b = right ? campaign.people[right.person]?.base : undefined;
  if (!a || !b) return 0;
  return rememberedRapport(campaign, a.id, b.id, () => leaderRapport(a, b));
}
