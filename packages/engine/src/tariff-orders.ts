import type { NationId } from "@admin/world";
import { addDays, compareDates, formatGameDate } from "./clock.js";
import { authorityDeadline, authorityHasExpired } from "./emergency.js";
import type { AuthorityClock } from "./state-emergency.js";
import { elapsedDays } from "./pace.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { Campaign } from "./state.js";
import { selectNation, selectRelationship } from "./state.js";
import {
  TARIFF_STATUTES,
  type InvestigatedStatute,
  type TariffFinding,
  type TariffStatute,
} from "./tariff-statutes.js";
import { currentRate, suppliersOf, tariffPacket, tradeEdgesWith, type TradeResult } from "./trade.js";
import { tradeSector, type TradeSectorId } from "./trade-sectors.js";
import type { TurnPhase } from "./turn-loop.js";

// The statute half of a tariff order: whether a statute's finding holds, its
// cap and its clock, the investigations that produce findings, and the weekly
// ruling on the ones that are due. The pricing half stays in trade.ts.

const MAX_TOTAL_RATE = 1;
/** The Commission votes on its own record. Roughly how often it has found injury. */
const SAFEGUARD_AFFIRMATIVE_CHANCE = 0.55;
/** How strained relations must be before the Trade Representative finds a practice actionable. */
const UNFAIR_PRACTICE_TENSION = 0.45;
/** One supplier's share of the goods that reads as a security dependence. */
const SECURITY_DEPENDENCE = 0.4;

export type TariffStatuteStanding = {
  readonly statute: TariffStatute;
  readonly available: boolean;
  /** Why it is or isn't available, in plain words. */
  readonly reason: string;
  /** The investigation this statute rests on, where it needs one. */
  readonly finding?: TariffFinding;
  readonly investigation: "not-needed" | "none" | "under-way" | "affirmative" | "negative";
  /** How much more this statute still allows on these goods from this country, as a fraction. */
  readonly room: number;
};

function nationName(campaign: Campaign, id: NationId): string {
  return selectNation(campaign, id)?.base.identity.name ?? String(id);
}

function findingSubject(statute: InvestigatedStatute, partner: NationId, sector: TradeSectorId): { readonly sector?: TradeSectorId; readonly partner?: NationId } {
  return TARIFF_STATUTES[statute].investigation?.subject === "partner" ? { partner } : { sector };
}

/** The latest investigation under a statute about this partner or these goods. */
export function latestFinding(campaign: Campaign, statute: InvestigatedStatute, partner: NationId, sector: TradeSectorId): TariffFinding | undefined {
  const subject = findingSubject(statute, partner, sector);
  return Object.values(campaign.trade.findings ?? {})
    .filter((finding) => finding.statute === statute && finding.partner === subject.partner && finding.sector === subject.sector)
    .sort((a, b) => b.openedTurn - a.openedTurn || b.id.localeCompare(a.id))[0];
}

/** Whether a partner has a measure of its own in force against American goods. */
export function partnerDiscriminates(campaign: Campaign, partner: NationId): boolean {
  return Object.values(campaign.trade.measures).some((measure) =>
    measure.origin === "retaliation" && measure.liftedTurn === undefined && (measure.actor ?? measure.target) === partner);
}

function partnerRunsSurplus(campaign: Campaign, partner: NationId): boolean {
  const edges = tradeEdgesWith(campaign, partner);
  const imports = edges.reduce((sum, edge) => sum + edge.imports, 0);
  const exports = edges.reduce((sum, edge) => sum + edge.exports, 0);
  return imports > exports;
}

function rateUnder(campaign: Campaign, statute: TariffStatute, partner: NationId, sector: TradeSectorId): number {
  return Object.values(campaign.trade.measures)
    .filter((measure) => measure.statute === statute && measure.origin === "us" && measure.liftedTurn === undefined && measure.target === partner && measure.sector === sector)
    .reduce((sum, measure) => sum + measure.rate, 0);
}

function roomUnder(campaign: Campaign, statute: TariffStatute, partner: NationId, sector: TradeSectorId): number {
  const total = MAX_TOTAL_RATE - currentRate(campaign, partner, sector);
  const cap = TARIFF_STATUTES[statute].cap;
  const capped = cap === null ? total : Math.min(total, cap - rateUnder(campaign, statute, partner, sector));
  return Math.max(0, Math.round(capped * 1000) / 1000);
}

function investigatedStanding(campaign: Campaign, statute: InvestigatedStatute, partner: NationId, sector: TradeSectorId, room: number): TariffStatuteStanding {
  const def = TARIFF_STATUTES[statute];
  const by = def.investigation!.by;
  const finding = latestFinding(campaign, statute, partner, sector);
  const base = { statute, room, ...(finding ? { finding } : {}) };
  if (!finding) {
    return { ...base, available: false, investigation: "none", reason: `This needs a finding from ${by} first. An investigation takes about ${def.investigation!.weeks} weeks.` };
  }
  if (!finding.outcome) {
    return { ...base, available: false, investigation: "under-way", reason: `${capitalize(by)} is still investigating. The finding is due ${formatGameDate(finding.dueDate)}.` };
  }
  if (finding.outcome === "negative") {
    return { ...base, available: false, investigation: "negative", reason: `${capitalize(by)} found no case on ${formatGameDate(finding.decidedDate ?? finding.dueDate)}. You can order a new investigation.` };
  }
  return { ...base, available: room > 0, investigation: "affirmative", reason: room > 0 ? `${capitalize(by)} made the finding on ${formatGameDate(finding.decidedDate ?? finding.dueDate)}.` : "These goods are already at the most this law allows." };
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Whether a statute can carry a tariff on these goods from this country right now, and why. */
export function tariffStatuteStanding(campaign: Campaign, statute: TariffStatute, partner: NationId, sector: TradeSectorId): TariffStatuteStanding {
  const room = roomUnder(campaign, statute, partner, sector);
  if (statute === "s232" || statute === "s301" || statute === "s201") return investigatedStanding(campaign, statute, partner, sector, room);
  const base = { statute, room, investigation: "not-needed" as const };
  const full = "These goods are already at the most this law allows.";
  if (statute === "s122") {
    const clock = section122Clock(campaign);
    const expired = clock && authorityHasExpired(campaign, clock);
    const holds = nationalPaymentsDeficit(campaign) && partnerRunsSurplus(campaign, partner);
    return { ...base, available: holds && !expired && room > 0, reason: expired
      ? "Section 122's 150 days for this payments episode have run out. Only Congress can extend it; changing countries, goods or proclamations does not restart the clock."
      : !holds ? `${nationName(campaign, partner)} cannot be singled out without both a national deficit and a surplus in its trade with us.`
        : room > 0 ? `The national deficit predicate supports this measure through ${formatGameDate(clock ? authorityDeadline(campaign, clock) : addDays(campaign.calendar, TARIFF_STATUTES.s122.clockDays!))}.` : full };
  }
  const holds = partnerDiscriminates(campaign, partner);
  return { ...base, available: holds && room > 0, reason: !holds ? `${nationName(campaign, partner)} has no tariff of its own on American goods to answer.` : room > 0 ? `${nationName(campaign, partner)} has its own tariff on American goods.` : full };
}

/**
 * Impose a tariff under a named statute.
 *
 * Refuses, in the statute's own terms, a statute whose finding doesn't hold, a
 * rate over its cap, or goods that aren't tariffed at all. A safeguard lands
 * on every country that sells the goods, as the law requires.
 */
export function imposeTariff(campaign: Campaign, statute: TariffStatute, target: NationId, sectorId: TradeSectorId, rate: number): TradeResult {
  const def = tradeSector(sectorId);
  if (!def) return { ok: false, reason: "No such trade sector." };
  if (def.instrument !== "tariff") return { ok: false, reason: `Tariffs don't apply to ${def.name.toLowerCase()}. They're handled as ${def.instrument.replace("-", " ")}.` };
  if (!Number.isFinite(rate) || rate <= 0 || rate > MAX_TOTAL_RATE) return { ok: false, reason: "A tariff rate has to be above zero and no more than a total ban." };
  const law = TARIFF_STATUTES[statute];
  const standing = tariffStatuteStanding(campaign, statute, target, sectorId);
  if (!standing.available) return { ok: false, reason: standing.reason };
  if (rate > standing.room + 1e-9) return { ok: false, reason: `${law.name} allows at most ${Math.round(standing.room * 100)}% more on these goods.` };
  const clock = statute === "s122" ? section122Clock(campaign) ?? newSection122Clock(campaign) : undefined;
  const expires = clock ? authorityDeadline(campaign, clock) : law.clockDays === null ? undefined : addDays(campaign.calendar, law.clockDays);
  const priced = tariffPacket(campaign, target, sectorId, rate, statute, expires);
  const first = priced.ok && clock ? { ...priced, packet: { ...priced.packet,
    effects: [{ kind: "authorityClock" as const, set: clock }, ...priced.packet.effects] } } : priced;
  if (!first.ok || law.reach === "one-country") return first;
  const others = suppliersOf(campaign, sectorId).map((edge) => edge.partner).filter((partner) => partner !== target);
  const extra = others.flatMap((partner) => {
    const order = tariffPacket(campaign, partner, sectorId, rate, statute, expires);
    return order.ok && rate <= roomUnder(campaign, statute, partner, sectorId) + 1e-9 ? [order] : [];
  });
  const effects: Effect[] = [...first.packet.effects, ...extra.flatMap((order) => order.packet.effects)];
  const revenue = extra.reduce((sum, order) => sum + order.incidence.revenue, first.incidence.revenue);
  return {
    ok: true,
    incidence: { ...first.incidence, revenue },
    packet: {
      ...first.packet,
      provenance: { origin: "decision", entities: [target, ...extra.map((order) => order.incidence.target), def.authority], systems: ["trade", def.rollup], effectiveDate: campaign.calendar },
      narration: { summary: `A ${Math.round(rate * 100)}% safeguard tariff is imposed on ${def.name.toLowerCase()} from every country that sells them.` },
      effects,
    },
  };
}

/** The first statute that can carry this tariff now, answering a partner's own measure first. */
export function fittingTariffStatute(campaign: Campaign, target: NationId, sector: TradeSectorId, rate: number): TariffStatute | undefined {
  const order: readonly TariffStatute[] = ["s338", "s301", "s232", "s122"];
  return order.find((statute) => {
    const standing = tariffStatuteStanding(campaign, statute, target, sector);
    return standing.available && rate <= standing.room + 1e-9;
  });
}

export type InvestigationResult =
  | { readonly ok: true; readonly packet: EffectPacket; readonly finding: TariffFinding }
  | { readonly ok: false; readonly reason: string };

/** Order the investigation a statute's finding comes from. */
export function openTariffInvestigation(campaign: Campaign, statute: InvestigatedStatute, partner: NationId, sectorId: TradeSectorId): InvestigationResult {
  const law = TARIFF_STATUTES[statute];
  const sector = tradeSector(sectorId);
  if (!law.investigation || !sector) return { ok: false, reason: "That law has no investigation to order." };
  if (sector.instrument !== "tariff") return { ok: false, reason: `Tariffs don't apply to ${sector.name.toLowerCase()}.` };
  const latest = latestFinding(campaign, statute, partner, sectorId);
  if (latest && !latest.outcome) return { ok: false, reason: `${capitalize(law.investigation.by)} is already investigating. The finding is due ${formatGameDate(latest.dueDate)}.` };
  if (latest?.outcome === "affirmative") return { ok: false, reason: `${capitalize(law.investigation.by)} has already made this finding.` };
  const subject = findingSubject(statute, partner, sectorId);
  const finding: TariffFinding = {
    id: `finding:${statute}:${subject.partner ?? subject.sector}:${campaign.turn}`,
    statute,
    ...subject,
    openedTurn: campaign.turn,
    openedDate: campaign.calendar,
    dueDate: addDays(campaign.calendar, elapsedDays(law.investigation.weeks)),
  };
  const about = subject.partner ? `${nationName(campaign, partner)}'s trade practices` : `imports of ${sector.name.toLowerCase()}`;
  const headline = `The President orders ${law.investigation.by} to investigate ${about} under ${law.name}.`;
  return {
    ok: true,
    finding,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: { origin: "decision", entities: subject.partner ? [partner] : [statute === "s232" ? "INST-COMMERCE" : sector.authority], systems: ["trade"], effectiveDate: campaign.calendar },
      narration: { summary: headline },
      effects: [
        { kind: "trade", finding },
        { kind: "feed", items: [{ turn: campaign.turn, kind: "press", visibility: "public", headline, date: campaign.calendar }] },
      ],
    },
  };
}

function hashChance(id: string): number {
  let hash = 2166136261;
  for (const char of id) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000) / 1000;
}

function affirmative(campaign: Campaign, finding: TariffFinding): boolean {
  if (finding.statute === "s201") return hashChance(finding.id) < SAFEGUARD_AFFIRMATIVE_CHANCE;
  if (finding.statute === "s301") {
    const partner = finding.partner!;
    const tension = selectRelationship(campaign, campaign.founding.nation, partner)?.tension ?? 0;
    return partnerDiscriminates(campaign, partner) || tension >= UNFAIR_PRACTICE_TENSION;
  }
  const sector = tradeSector(finding.sector!);
  const concentrated = suppliersOf(campaign, finding.sector!).some((edge) => edge.dependence >= SECURITY_DEPENDENCE);
  return Boolean(sector?.strategic) || concentrated;
}

function rulingHeadline(campaign: Campaign, finding: TariffFinding, found: boolean): string {
  const law = TARIFF_STATUTES[finding.statute];
  const by = capitalize(law.investigation!.by);
  if (finding.statute === "s301") {
    const name = nationName(campaign, finding.partner!);
    return found ? `${by} finds ${name}'s trade practices unfair under ${law.name}.` : `${by} finds no unfair practice by ${name} under ${law.name}.`;
  }
  const goods = tradeSector(finding.sector!)?.name.toLowerCase() ?? finding.sector!;
  if (finding.statute === "s232") return found ? `${by} finds imports of ${goods} threaten national security.` : `${by} finds imports of ${goods} don't threaten national security.`;
  return found ? `${by} finds a surge of ${goods} imports is hurting American producers.` : `${by} finds imports of ${goods} aren't the main cause of the industry's harm.`;
}

/** Rule on every investigation whose finding is due. */
export const tariffFindingPhase: TurnPhase = (state: Campaign) => [
  ...paymentsRecoveryPackets(state),
  ...Object.values(state.trade.findings ?? {})
    .filter((finding) => !finding.outcome && compareDates(state.calendar, finding.dueDate) >= 0)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((finding): EffectPacket => {
      const found = affirmative(state, finding);
      const headline = rulingHeadline(state, finding, found);
      return {
        source: "simulate",
        actor: "world",
        turn: state.turn,
        provenance: { origin: "scheduled", causeIds: finding.causedBy ? [finding.causedBy] : [], entities: finding.partner ? [finding.partner] : [], systems: ["trade"], effectiveDate: state.calendar },
        narration: { summary: headline },
        effects: [
          { kind: "trade", finding: { ...finding, outcome: found ? "affirmative" : "negative", decidedDate: state.calendar } },
          { kind: "feed", items: [{ turn: state.turn, kind: "press", visibility: "public", headline, date: state.calendar }] },
        ],
      };
    }),
];

// Goods trade is the existing proxy; fiscal distress and bilateral tariff effects
// are not evidence that the national payments predicate has ended.
function nationalPaymentsDeficit(campaign: Campaign): boolean {
  const trade = selectNation(campaign, campaign.founding.nation)?.stats.trade;
  return trade !== undefined && trade.imports > trade.exports;
}

function section122Clock(campaign: Campaign): AuthorityClock | undefined {
  const stored = Object.values(campaign.authorityClocks ?? {}).filter((clock) => clock.authority === "s122")
    .sort((a, b) => compareDates(b.openedDate, a.openedDate) || b.id.localeCompare(a.id))[0];
  if (stored) return stored.recoveredDate ? undefined : stored;
  // Legacy measures cannot prove an intervening recovery. Preserve the earliest
  // recorded episode, including lifted measures, rather than inventing a reset.
  const first = Object.values(campaign.trade.measures).filter((measure) => measure.origin === "us" && measure.statute === "s122")
    .sort((a, b) => compareDates(a.imposedDate, b.imposedDate) || a.id.localeCompare(b.id))[0];
  return first ? { id: `authority:s122:legacy:${first.id}`, authority: "s122", predicate: "national-payments-deficit",
    openedDate: first.imposedDate, expiresDate: addDays(first.imposedDate, TARIFF_STATUTES.s122.clockDays!),
    ...(first.causedBy ? { causedBy: first.causedBy } : {}) } : undefined;
}

function newSection122Clock(campaign: Campaign): AuthorityClock {
  const date = campaign.calendar;
  const base = `authority:s122:${date.year}-${date.month}-${date.day}`;
  let id = base;
  let ordinal = 2;
  while (campaign.authorityClocks?.[id]) id = `${base}:${ordinal++}`;
  return { id, authority: "s122", predicate: "national-payments-deficit",
    openedDate: date, expiresDate: addDays(date, TARIFF_STATUTES.s122.clockDays!) };
}

function paymentsRecoveryPackets(campaign: Campaign): readonly EffectPacket[] {
  const clock = section122Clock(campaign);
  if (!clock || nationalPaymentsDeficit(campaign)) return [];
  return [{ source: "simulate", actor: "world", turn: campaign.turn,
    provenance: { origin: "scheduled", causeIds: clock.causedBy ? [clock.causedBy] : [], systems: ["trade"], effectiveDate: campaign.calendar },
    narration: { summary: "The national deficit predicate for the Section 122 episode has ended." },
    effects: [{ kind: "authorityClock", set: { ...clock, recoveredDate: campaign.calendar } }],
  }];
}

export const tariffAuthorityPhase: TurnPhase = (campaign) => {
  const clocks = Object.values(campaign.authorityClocks ?? {}).filter((clock) => clock.authority === "s122")
    .sort((a, b) => compareDates(b.openedDate, a.openedDate) || b.id.localeCompare(a.id));
  const legacy = clocks.length === 0 ? section122Clock(campaign) : undefined;
  const effects = Object.values(campaign.trade.measures).filter((measure) => measure.origin === "us" && measure.statute === "s122" && measure.liftedTurn === undefined)
    .sort((a, b) => a.id.localeCompare(b.id)).flatMap((measure): Effect[] => {
      const clock = clocks.find((entry) => compareDates(entry.openedDate, measure.imposedDate) <= 0) ?? legacy;
      if (!clock) return [];
      const expiresDate = authorityDeadline(campaign, clock);
      if (measure.expiresDate && compareDates(measure.expiresDate, expiresDate) <= 0) return [];
      return [{ kind: "trade", measure: { ...measure, expiresDate } }];
    });
  if (effects.length === 0) return [];
  return [{ source: "simulate", actor: "world", turn: campaign.turn,
    provenance: { origin: "scheduled", causeIds: [...new Set(Object.values(campaign.trade.measures)
      .filter((measure) => measure.statute === "s122").flatMap((measure) => measure.causedBy ? [measure.causedBy] : []))].sort(),
    systems: ["trade"], effectiveDate: campaign.calendar },
    narration: { summary: "Section 122 measures retain the deadline of their original payments episode." }, effects }];
};
