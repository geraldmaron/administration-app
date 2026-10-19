// Which bodies two governments share, and whether they share a land border.
//
// Split out of the cast resolver: these are board readings a scenario's gates
// and its `{{sharedOrganization}}` token both ask, and the resolver is already
// the largest file in the package.
import { matchRole, selectNation, tradeSector, type Campaign, type TradeMeasure, type TradeSectorId } from "@admin/engine";
import { organizations, type NationId, type Organization, type RoleId } from "@admin/world";
import { roleHintTargets } from "./scenario-role-hints.js";
import type { ScenarioCondition, ScenarioDef } from "./scenario.js";

type SharedBodyFilter = { readonly orgKind?: string; readonly tradeCompetence?: string };

/**
 * The bodies both governments sit in that meet the gate's narrowing, in a
 * stable order (the widest membership first, then by id) so the one the prose
 * names is the same on every build of the same campaign.
 */
export function sharedBodies(campaign: Campaign, counterpart: NationId, filter: SharedBodyFilter = {}): readonly Organization[] {
  if (counterpart === campaign.founding.nation) return [];
  const mine = selectNation(campaign, campaign.founding.nation)?.base.memberships ?? [];
  const theirs = new Set<string>(selectNation(campaign, counterpart)?.base.memberships ?? []);
  return organizations
    .filter((org) => mine.some((id) => id === org.id) && theirs.has(org.id))
    .filter((org) => filter.orgKind === undefined || org.kind === filter.orgKind)
    .filter((org) => filter.tradeCompetence === undefined || org.tradeCompetence === filter.tradeCompetence)
    .sort((a, b) => b.members.length - a.members.length || String(a.id).localeCompare(String(b.id)));
}

/**
 * The name `{{sharedOrganization}}` renders as: the first body that every
 * positive membership gate accepts. Binding to only the first gate named a body
 * a later, narrower gate rejected, and made the rendered organization depend on
 * the order of conditions that mean the same thing in any order.
 */
export function sharedOrganizationName(campaign: Campaign, def: ScenarioDef, counterpart: NationId): string | undefined {
  const gates = def.conditions.flatMap((condition) => (condition.kind === "sharedMembership" && condition.present ? [condition] : []));
  if (gates.length === 0) return undefined;
  const accepted = sharedBodies(campaign, counterpart).filter((body) => gates.every((gate) => sharedBodies(campaign, counterpart, gate).some((match) => match.id === body.id)));
  return accepted[0]?.name;
}

export function bordersHome(campaign: Campaign, counterpart: NationId): boolean {
  if (counterpart === campaign.founding.nation) return false;
  const neighbors = selectNation(campaign, campaign.founding.nation)?.base.geo.neighbors ?? [];
  return neighbors.some((id) => id === counterpart);
}


/** What `{{ourTariffSector}}` renders as when no pinned retaliation can be found. */
export const UNKNOWN_TARIFF_SECTOR = "the original goods";

/**
 * The sector of the tariff this administration imposed that the family's
 * retaliation answers, in lower case.
 *
 * A week that arrives after the original tariff has left the desk cannot name
 * it from its own gates, and "the tariff that started this" asks the President
 * to remember which one. The family opener pinned the retaliation it dealt on
 * (the case's occurrence carries the retaliation measure), and the record of
 * that retaliation points at the measure it answers, so the answer is read off
 * the ledger by following the opener, never by guessing the newest one: a
 * neighbor that answers a second tariff mid-arc does not change which tariff
 * this arc is about. A scenario with no family, or a family whose opener
 * pinned no retaliation, falls back to the counterpart's newest landed one.
 */
export function answeredTariff(campaign: Campaign, family: { readonly id: string } | undefined, counterpart: NationId): TradeMeasure | undefined {
  const opener = family ? campaign.scenarioFamilies?.[family.id]?.beats[0] : undefined;
  const prefix = opener ? `scenario:${opener}@trade:retaliation-measure:` : undefined;
  const pinnedKey = prefix ? Object.keys(campaign.cases ?? {}).find((key) => key.startsWith(prefix)) : undefined;
  const pinnedRecord = pinnedKey && prefix ? campaign.trade.retaliation.find((record) => record.id === pinnedKey.slice(prefix.length)) : undefined;
  const record = pinnedRecord ?? [...campaign.trade.retaliation]
    .filter((candidate) => candidate.by === counterpart && candidate.landed)
    .sort((a, b) => b.dueTurn - a.dueTurn || a.id.localeCompare(b.id))[0];
  const answered = record ? campaign.trade.measures[record.answering] : undefined;
  return answered?.origin === "us" ? answered : undefined;
}

/** Whether that tariff is still in force: a draft to pause one the President has since lifted describes nothing. */
export function answeredTariffInForce(campaign: Campaign, family: { readonly id: string } | undefined, counterpart: NationId): boolean {
  const answered = answeredTariff(campaign, family, counterpart);
  return answered !== undefined && answered.liftedTurn === undefined;
}

/**
 * The tariff this administration laid back on the counterpart's goods at the
 * retaliation gate's response sector, while it is in force. Newest first, so
 * a tariff re-laid after a lift is the one a week is about.
 */
export function responseTariff(campaign: Campaign, def: { readonly conditions: readonly ScenarioCondition[] }, counterpart: NationId): TradeMeasure | undefined {
  const gate = def.conditions.find((condition) => condition.kind === "tradeMeasure");
  if (!gate || gate.kind !== "tradeMeasure") return undefined;
  return Object.values(campaign.trade.measures)
    .filter((measure) => measure.origin === "us" && measure.kind === "tariff" && measure.liftedTurn === undefined &&
      measure.target === counterpart && measure.sector === gate.responseSector)
    .sort((a, b) => b.imposedTurn - a.imposedTurn || a.id.localeCompare(b.id))[0];
}

const EMPTY_PIN = { measure: "", sector: "", rate: 0, imposedTurn: -1 };

/**
 * What a reply that lifts one of our tariffs hands the engine: ours, and for a
 * mutual lift the retaliation the cast pinned, each pinned by the fields the
 * engine re-reads at commit.
 *
 * When a measure is already gone its pin is left empty rather than dropped,
 * so the engine refuses the reply with its own words instead of the answer
 * silently becoming a free choice. The `tariffInForce` gate keeps that rare.
 */
export function tariffLiftRequest(
  campaign: Campaign,
  def: Pick<ScenarioDef, "conditions" | "family">,
  counterpart: NationId,
  lift: { readonly theirs: boolean; readonly which?: "answered" | "response" },
  pinned: { readonly id: string } | undefined,
) {
  const ours = lift.which === "response" ? responseTariff(campaign, def, counterpart) : answeredTariff(campaign, def.family, counterpart);
  const pin = (measure: TradeMeasure | undefined) => measure && measure.liftedTurn === undefined
    ? { measure: measure.id, sector: measure.sector, rate: measure.rate, imposedTurn: measure.imposedTurn } : EMPTY_PIN;
  return { ours: pin(ours), ...(lift.theirs ? { theirs: pin(pinned ? campaign.trade.measures[pinned.id] : undefined) } : {}) };
}

export function ourTariffSector(campaign: Campaign, family: { readonly id: string } | undefined, counterpart: NationId): string {
  const answered = answeredTariff(campaign, family, counterpart);
  if (!answered) return UNKNOWN_TARIFF_SECTOR;
  return tradeSector(answered.sector as TradeSectorId)?.name.toLowerCase() ?? answered.sector;
}

/**
 * The seat that answers for a memo when the scenario names its office, in the
 * cabinet the President actually seated. Undefined when it names none or the
 * campaign has no chair that fits, so readers fall back to speaker order.
 */
export function responsibleRole(campaign: Campaign, def: Pick<ScenarioDef, "responsibleOffice">): RoleId | undefined {
  if (!def.responsibleOffice) return undefined;
  return matchRole(Object.keys(campaign.player.cabinet) as RoleId[], roleHintTargets(def.responsibleOffice));
}

/** Whether a country has a coast, read off the player's own country or the cast counterpart. */
export function geographyMet(
  campaign: Campaign,
  counterpart: NationId,
  condition: { readonly field: "coastal" | "landlocked" | "bordered" | "chokepoint"; readonly is: boolean; readonly of?: "player" | "counterpart" },
): boolean {
  const nation = condition.of === "counterpart" ? counterpart : campaign.founding.nation;
  const geo = selectNation(campaign, nation)?.base.geo;
  const coastal = geo?.coastline ?? false;
  const reading =
    condition.field === "coastal" ? coastal : condition.field === "landlocked" ? !coastal : condition.field === "bordered" ? (geo?.neighbors.length ?? 0) > 0 : (geo?.chokepoints.length ?? 0) > 0;
  return reading === condition.is;
}

type GeographyGate = Extract<ScenarioCondition, { kind: "geography" }>;

/** The gates that read the cast government's own geography, which the binder can apply while it ranks. */
export function counterpartGeography(conditions: readonly ScenarioCondition[]): readonly GeographyGate[] {
  return conditions.filter((condition): condition is GeographyGate => condition.kind === "geography" && condition.of === "counterpart");
}

/**
 * The best-ranked candidate that has the geography the week needs.
 *
 * A week that needs the counterpart's coast, land neighbor or chokepoint binds
 * the closest (or tensest, or band-matched) government that has one, rather
 * than the first-ranked government and then finding the gate shut: a gate read
 * after the pick would only ever deal the week when the top of the ranking
 * happened to qualify.
 */
export function firstWithGeography(campaign: Campaign, ranked: readonly NationId[], conditions: readonly ScenarioCondition[]): NationId | undefined {
  const gates = counterpartGeography(conditions);
  return gates.length === 0 ? ranked[0] : ranked.find((id) => gates.every((gate) => geographyMet(campaign, id, gate)));
}
