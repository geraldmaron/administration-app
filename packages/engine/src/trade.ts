import { US_GOODS_TRADE, type NationId } from "@admin/world";
import type { CausalId } from "./causality.js";
import type { Campaign, GameDate } from "./state.js";
import type { EffectPacket, Effect } from "./effects.js";
import { selectNation, selectRelationship } from "./state.js";
import { tradeSector, TRADE_SECTORS, type TradeSectorDef, type TradeSectorId } from "./trade-sectors.js";
import { CUSTOMS_COLLECTION, selectWorkDelivery } from "./executive-work.js";
import { COERCION_AS_RATE, exportGoodsOf, leadingExportSector, retaliationFall, sectorFlow, sectorImports, volumeFall } from "./trade-volume.js";
import { measureCut } from "./external-pressure.js";
import { isTradeMeasureEffective } from "./order-authority.js";
import type { TariffFinding, TariffStatute } from "./tariff-statutes.js";
import { liftPriceMove } from "./trade-effects.js";

// Trade as a sectoral network with an incidence, replacing a tariff that was
// a treasury credit and a bilateral relationship knock.
//
// The old rung moved `tradeDependence` down and `treasury` up by a constant.
// It had no rate, no sector, no price, no volume, no incidence on the country
// imposing it, no retaliation, and it was repeatable without limit. A player
// could not answer the only question a tariff actually raises, which is who
// pays for it.
//
// Two decisions keep this affordable at fifty nations and twenty-eight sectors.
//
// **Edges are derived, not stored.** A dense network would be 70,000 entries
// and would have to be authored or invented. What a bilateral sector edge
// actually is — how much of this sector we buy from them — is the two
// countries' recorded goods trade, split by what each makes and moved since by
// the two economies and the measures in force (`trade-volume.ts`). So
// `tradeEdge()` computes it, and the save carries only what a *decision*
// created: the measures, the retaliation, and the price deviation each sector
// is carrying.
//
// **The player is the United States.** Edges are US-centric, and the
// pass-through ordering in trade-sectors.ts is specific to the US as importer.
// Neither generalizes to a world where some other capital is imposing tariffs,
// and both are documented as not generalizing.

export type TradeMeasureId = string;

// Every member is an act somebody can order. Three more were declared here for
// a long time — a quota, an agreement and an exclusion — and nothing anywhere
// in the engine ever constructed one, so the register's vocabulary was wider
// than the board's and a reader could not tell which half was real.
// `scripts/verify-trade-measure-kinds.mjs` holds the line.
export type TradeMeasureKind =
  | "tariff"
  | "sanctions"
  | "asset-restriction"
  | "export-control"
  | "embargo";

export type TradeMeasure = {
  readonly id: TradeMeasureId;
  readonly kind: TradeMeasureKind;
  readonly sector: TradeSectorId;
  readonly target: NationId;
  /** Statutory rate, 0..1. Zero for a measure that is not a rate. */
  readonly rate: number;
  readonly imposedTurn: number;
  readonly imposedDate: GameDate;
  /** The institution whose authority this was taken under. */
  readonly authority: string;
  /** The statute an American tariff was imposed under. Absent on a partner's measure and on saves before v67. */
  readonly statute?: TariffStatute;
  /** Whose measure it is: the player's, or a partner's answer to one. */
  readonly origin: "us" | "retaliation";
  /**
   * The capital that imposed it, where it is worth naming.
   *
   * `origin` says which side of the exchange a measure is on and cannot say who
   * is on that side: every retaliation read as "somebody answered", so a board
   * carrying answers from three capitals could not tell them apart. Absent means
   * the United States for an `origin: "us"` measure and the retaliating capital
   * for an `origin: "retaliation"` one, which is what every measure written
   * before this field meant.
   */
  readonly actor?: NationId;
  readonly liftedTurn?: number;
  /** The day it was lifted. Absent on a record lifted before the day was stored; readers fall back to the lifted week's date. */
  readonly liftedDate?: GameDate;
  readonly expiresDate?: GameDate;
  /** Import-only suspensions leave American exports legally open. */
  readonly direction?: "imports" | "both";
  /** A list-based program or a blocked account: it designates named persons or holdings, cuts no sector's trade and reaches no further. Absent on every other measure. */
  readonly scope?: "listed";
  /** 0..1 of the sector's sales the designated companies carry, where a designation names companies rather than the sector. Absent means all of it. */
  readonly covered?: number;
  /**
   * The ledger event that imposed this measure.
   *
   * Written by the effect handler rather than by the caller, because the id is
   * only knowable inside `apply()`. It is what lets a lift, months later, name
   * the signature it is undoing instead of arriving on the trail as an
   * unrelated sentence.
   */
  readonly causedBy?: CausalId;
};

export type RetaliationRecord = {
  readonly id: string;
  readonly by: NationId;
  readonly answering: TradeMeasureId;
  /** The turn the answer is expected to land. Retaliation is not instant. */
  readonly dueTurn: number;
  readonly sector: TradeSectorId;
  readonly rate: number;
  readonly landed: boolean;
  /**
   * The ledger event that provoked this answer — the day the tariff was
   * signed. Carried on the record because the phase that lands it runs weeks
   * later in a different function, and a partner's answer that cannot point at
   * what it is answering is the exact shape of a shallow causal graph.
   */
  readonly causedBy?: CausalId;
};

export type TradeState = {
  readonly measures: Readonly<Record<TradeMeasureId, TradeMeasure>>;
  readonly retaliation: readonly RetaliationRecord[];
  /**
   * How far each sector's US price has moved from its founding baseline, as a
   * fraction. Accumulated rather than recomputed so the record can say which
   * decision moved it and by how much.
   */
  readonly sectorPrice: Readonly<Record<TradeSectorId, number>>;
  /** The trade investigations ordered and what each found, by id. Absent until the first is ordered. */
  readonly findings?: Readonly<Record<string, TariffFinding>>;
};

export function foundingTrade(): TradeState {
  return { measures: {}, retaliation: [], sectorPrice: {} };
}

// --- Derived edges ---------------------------------------------------------

export type TradeEdge = {
  readonly partner: NationId;
  readonly sector: TradeSectorId;
  /** US imports from the partner in this sector, USD millions per year. */
  readonly imports: number;
  /** US exports to the partner in this sector, USD millions per year. */
  readonly exports: number;
  /** This partner's share of everything the US imports in this sector, 0..1. */
  readonly dependence: number;
  readonly substitutability: number;
  readonly tariffRate: number;
  readonly strategic: boolean;
};

/**
 * What the United States trades with one partner in one sector.
 *
 * Derived every call rather than stored: the recorded opening, split by the
 * partner's own sector mix (a country with no steel industry does not sell
 * steel) and moved since by the two economies and the measures in force. The
 * reliance reading is this partner's share of everything the country imports
 * in the sector.
 */
export function tradeEdge(
  campaign: Campaign,
  partner: NationId,
  sectorId: TradeSectorId,
): TradeEdge | undefined {
  const def = tradeSector(sectorId);
  const flow = sectorFlow(campaign, partner, sectorId);
  if (!def || !flow) return undefined;
  const everyone = sectorImports(campaign, sectorId);
  return {
    partner,
    sector: sectorId,
    imports: flow.imports,
    exports: flow.exports,
    dependence: everyone > 0 ? round3(flow.imports / everyone) : 0,
    substitutability: def.substitutability,
    tariffRate: currentRate(campaign, partner, sectorId),
    strategic: def.strategic,
  };
}

/** Every sector the US actually trades with one partner, largest import first. */
export function tradeEdgesWith(campaign: Campaign, partner: NationId): readonly TradeEdge[] {
  return TRADE_SECTORS.map((def) => tradeEdge(campaign, partner, def.id))
    .filter((edge): edge is TradeEdge => edge !== undefined && (edge.imports > 0 || edge.exports > 0))
    .sort((a, b) => b.imports - a.imports);
}

/** Every partner the US buys a sector from, most dependent first. */
export function suppliersOf(campaign: Campaign, sectorId: TradeSectorId): readonly TradeEdge[] {
  return Object.keys(campaign.nations)
    .map((nation) => tradeEdge(campaign, nation as NationId, sectorId))
    .filter((edge): edge is TradeEdge => edge !== undefined && edge.imports > 0)
    .sort((a, b) => b.imports - a.imports);
}

/** The rate currently in force on a partner and sector, counting only live measures. */
export function currentRate(campaign: Campaign, partner: NationId, sectorId: TradeSectorId): number {
  return Object.values(campaign.trade.measures)
    .filter(
      (measure) =>
        measure.liftedTurn === undefined &&
        measure.origin === "us" &&
        measure.target === partner &&
        measure.sector === sectorId,
    )
    .reduce((total, measure) => total + measure.rate, 0);
}

// --- Incidence -------------------------------------------------------------

export type TariffIncidence = {
  readonly sector: TradeSectorDef;
  readonly target: NationId;
  readonly rate: number;
  /** Annual customs revenue, USD millions, net of the volume the tariff destroys and of what Customs fails to collect. */
  readonly revenue: number;
  /** Fractional rise in the duty-inclusive border price. */
  readonly borderPriceRise: number;
  /** Fractional rise in the US shelf price within a year. */
  readonly shelfPriceRise: number;
  /** Fractional fall in imported volume from this partner. */
  readonly importFall: number;
  /** Share of the lost volume that goes to another foreign supplier rather than home. */
  readonly diversionShare: number;
  /** Fractional rise in protected domestic output of this sector. */
  readonly domesticGain: number;
  /** Fractional rise in input costs for the sectors that buy from this one. */
  readonly inputCostRise: number;
  /** Net employment effect on the rolled-up sector, fraction. */
  readonly employmentEffect: number;
  /** Who is likely to answer, and where. */
  readonly retaliationChance: number;
  readonly retaliationTarget?: TradeSectorId;
  /** The share of American sales in the target sector the answer would remove, if it lands. */
  readonly retaliationCut: number;
};

// Most of the volume a tariff destroys does not come home. It goes to the next
// cheapest foreign supplier, which is why a country-specific tariff moves the
// map more than it moves the factory.
const DIVERSION_BASE = 0.69;
// What actually reaches a domestic producer, before the input costs that the
// same tariff raises for them.
const DOMESTIC_CAPTURE = 0.31;
// A supplier whose share of a sector's US imports is below this is not where
// diverted orders can go at scale.
const MATERIAL_SUPPLIER_SHARE = 0.01;
const EMPLOYMENT_PER_OUTPUT = 0.35;
const INPUT_COST_EMPLOYMENT_DRAG = 0.55;

/**
 * What a tariff does, all the way through.
 *
 * Deliberately returns the whole distribution rather than a treasury number.
 * The action surface shows who gains, who pays and who may answer, because a
 * single treasury delta was the thing that made a tariff feel free.
 */
export function tariffIncidence(
  campaign: Campaign,
  target: NationId,
  sectorId: TradeSectorId,
  rate: number,
): TariffIncidence | undefined {
  const def = tradeSector(sectorId);
  const edge = tradeEdge(campaign, target, sectorId);
  if (!def || !edge) return undefined;

  const borderPriceRise = round3(rate * def.borderPassThrough);
  const importFall = volumeFall(def, rate);
  // Net of what Customs actually collects, so the figure the order shows is
  // the figure the books later take in.
  const revenue = round2(edge.imports * (1 - importFall) * rate * customsCollectionShare(campaign));
  const shelfPriceRise = round3(borderPriceRise * def.shelfPassThrough);

  // How much of the destroyed volume goes to another foreign source rather than
  // to a US producer. A sector with many suppliers diverts almost entirely; one
  // where this partner is the only real source cannot divert and has to either
  // pay or do without.
  // Every economy sells the US something, so an alternative is a real source:
  // one that already supplies a material share of what the country imports.
  const alternatives = suppliersOf(campaign, sectorId).filter(
    (other) => other.partner !== target && other.dependence >= MATERIAL_SUPPLIER_SHARE,
  ).length;
  const diversionShare = round3(DIVERSION_BASE * Math.min(1, alternatives / 4));
  const domesticGain = round3(importFall * (1 - diversionShare) * DOMESTIC_CAPTURE);
  const inputCostRise = round3(shelfPriceRise * def.inputIntensity);

  // The employment reading is the whole argument about tariffs in one line:
  // protection adds jobs in the protected sector, and the input costs the same
  // tariff creates subtract more of them across the sectors that buy from it.
  const employmentEffect = round3(
    domesticGain * EMPLOYMENT_PER_OUTPUT - inputCostRise * INPUT_COST_EMPLOYMENT_DRAG * def.inputIntensity,
  );

  const retaliation = retaliationOutlook(campaign, target, rate);

  return {
    sector: def,
    target,
    rate,
    revenue,
    borderPriceRise,
    shelfPriceRise,
    importFall,
    diversionShare,
    domesticGain,
    inputCostRise,
    employmentEffect,
    retaliationChance: retaliation.chance,
    retaliationCut: retaliation.cut,
    ...(retaliation.sector ? { retaliationTarget: retaliation.sector } : {}),
  };
}

// Roughly half to two thirds of major targeted partners answered a broad
// action in the modern record, and the ones that did covered under a tenth of
// the US export book. Small and alliance-dependent partners absorb, which is
// why capability and alignment both enter here.
const RETALIATION_FLOOR = 0.15;
/** An answer is laid at this share of the rate it answers. */
const ANSWER_RATE_SHARE = 0.8;
/**
 * Planning value: what the answer's bite is worth to the odds. Set so the
 * mean odds across the founding partners of answering a 25 percent tariff
 * stay where reading the rate itself put them (about 0.43).
 */
const RETALIATION_CUT_WEIGHT = 0.6;

/**
 * Whether a partner answers, read off what its answer would take from
 * American sellers: the same export flow and the same response
 * (`retaliationFall`) the trade book cuts once the answer lands, so the odds
 * and the loss describe one flow.
 */
function retaliationOutlook(
  campaign: Campaign,
  target: NationId,
  rate: number,
): { readonly chance: number; readonly sector?: TradeSectorId; readonly cut: number } {
  const relationship = selectRelationship(campaign, campaign.founding.nation, target);
  const nation = selectNation(campaign, target);
  if (!relationship || !nation) return { chance: 0, cut: 0 };
  const sector = retaliationTargetFor(campaign, target);
  const def = sector ? tradeSector(sector) : undefined;
  const cut = def ? retaliationFall(def, answerRate(rate)) : 0;
  // A partner that depends on the US absorbs; one that does not, answers.
  const leverage = 1 - relationship.tradeDependence;
  const hostility = 1 - Math.max(0, relationship.alignment);
  const chance = clamp01(
    round3(RETALIATION_FLOOR + cut * RETALIATION_CUT_WEIGHT * leverage * (0.5 + hostility * 0.5)),
  );
  return { chance, cut, ...(sector ? { sector } : {}) };
}

const answerRate = (rate: number): number => round3(rate * ANSWER_RATE_SHARE);

/**
 * What a partner would hit back at.
 *
 * Retaliators pick politically salient US exports rather than economically
 * optimal ones — the record is soybeans, bourbon, orange juice and motorcycles,
 * not the largest line in the book. So salience leads, the partner has to
 * actually buy the thing, and the answer has to bite: goods its buyers can
 * get elsewhere at the world price, which is what made those answers cost
 * American sellers (the same border pass-through and substitutability
 * `retaliationFall` cuts by). A partner does not answer by taxing aircraft it
 * cannot buy from anyone else.
 */
export function retaliationTargetFor(campaign: Campaign, partner: NationId): TradeSectorId | undefined {
  const weight = (def: TradeSectorDef, exports: number) => def.retaliationSalience * def.borderPassThrough * def.substitutability * exports;
  return tradeEdgesWith(campaign, partner)
    .filter((edge) => edge.exports > 0)
    .map((edge) => ({ edge, def: tradeSector(edge.sector)! }))
    .sort((a, b) => weight(b.def, b.edge.exports) - weight(a.def, a.edge.exports))[0]
    ?.edge.sector;
}

// --- Imposing a measure ----------------------------------------------------

export type TradeResult =
  | { readonly ok: true; readonly packet: EffectPacket; readonly incidence: TariffIncidence }
  | { readonly ok: false; readonly reason: string };

const RETALIATION_LAG_TURNS = 4;

/** How much of the duty owed Customs collects, from 0.6 with no capacity to all of it. */
export function customsCollectionShare(campaign: Campaign): number {
  return 0.6 + 0.4 * selectWorkDelivery(campaign, CUSTOMS_COLLECTION).capacity;
}

/**
 * This week's customs on tariffs the administration still has in force. Annual
 * revenue, one week of it.
 *
 * Duty is charged on the goods that still arrive, and the live edge already
 * carries the fall every tariff in force causes. Charging it through
 * `tariffIncidence` took that fall a second time.
 */
export function selectCustomsReceipts(campaign: Campaign): number {
  const share = customsCollectionShare(campaign);
  let annual = 0;
  for (const measure of Object.values(campaign.trade.measures)) {
    if (measure.kind !== "tariff" || measure.origin !== "us" || measure.liftedTurn !== undefined) continue;
    const edge = tradeEdge(campaign, measure.target, measure.sector);
    if (!edge) continue;
    annual += edge.imports * measure.rate * share;
  }
  return round2(annual / 52);
}

// Each signature stays separately liftable and retains its own retaliation cause.
function tariffOrderIds(campaign: Campaign, target: NationId, sector: TradeSectorId) {
  let ordinal = Object.values(campaign.trade.measures).filter((measure) => measure.kind === "tariff" && measure.origin === "us" && measure.target === target && measure.imposedTurn === campaign.turn).length + 1;
  for (; ; ordinal += 1) {
    const suffix = ordinal === 1 ? "" : `:${ordinal}`;
    const measure = `tariff:${target}:${sector}:${campaign.turn}${suffix}`;
    const retaliation = `retaliation:${target}:${campaign.turn}${suffix}`;
    if (!campaign.trade.measures[measure] && !campaign.trade.retaliation.some((record) => record.id === retaliation)) return { measure, retaliation };
  }
}

/**
 * The packet a tariff order is, once its statute's checks have passed.
 *
 * Callers go through `imposeTariff` in `tariff-orders.ts`, which holds the
 * statute's finding, cap and clock. This only prices and writes the order.
 */
export function tariffPacket(
  campaign: Campaign,
  target: NationId,
  sectorId: TradeSectorId,
  rate: number,
  statute: TariffStatute,
  expiresDate?: GameDate,
): TradeResult {
  const def = tradeSector(sectorId);
  if (!def) return { ok: false, reason: "No such trade sector." };
  const incidence = tariffIncidence(campaign, target, sectorId, rate);
  if (!incidence) {
    return { ok: false, reason: "The United States does not trade that sector with that partner." };
  }

  const nationName = selectNation(campaign, target)?.base.identity.name ?? String(target);
  const ids = tariffOrderIds(campaign, target, sectorId);
  const effects: Effect[] = [
    {
      kind: "trade",
      measure: {
        id: ids.measure,
        kind: "tariff",
        sector: sectorId,
        target,
        rate,
        imposedTurn: campaign.turn,
        imposedDate: campaign.calendar,
        authority: def.authority,
        statute,
        ...(expiresDate ? { expiresDate } : {}),
        origin: "us",
        actor: campaign.founding.nation,
      },
      priceMove: { sector: sectorId, by: incidence.shelfPriceRise },
      ...(incidence.retaliationChance > 0 && incidence.retaliationTarget
        ? {
            expect: {
              id: ids.retaliation,
              by: target,
              answering: ids.measure,
              dueTurn: campaign.turn + RETALIATION_LAG_TURNS,
              sector: incidence.retaliationTarget,
              rate: answerRate(rate),
              landed: false,
            },
            chance: incidence.retaliationChance,
          }
        : {}),
    },
    {
      kind: "relationship",
      from: campaign.founding.nation,
      to: target,
      deltas: { tension: round3(rate * 0.3), trust: round3(-rate * 0.2), tradeDependence: round3(-incidence.importFall * 0.4) },
    },
  ];

  return {
    ok: true,
    incidence,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        entities: [target, def.authority],
        systems: ["trade", def.rollup],
        effectiveDate: campaign.calendar,
      },
      narration: {
        summary: `A ${Math.round(rate * 100)}% tariff is imposed on ${def.name.toLowerCase()} from ${nationName}.`,
      },
      effects,
    },
  };
}

// --- The ladder's economic rungs, in the register's own vocabulary ----------
//
// The instrument ladder and the trade register were two disjoint accounts of
// the same acts. A ten percent tariff on one sector, ordered through a country
// file, scheduled a dated and cause-linked answer four weeks out. A full
// embargo, ordered through the ladder, was answered by nobody — so the
// President's heaviest economic act had no consequence and a routine one did,
// and the lesson a player drew about which instrument bites was backwards.

/** The economic acts the ladder orders that are not rates. */
export type CoerciveMeasureKind = Exclude<TradeMeasureKind, "tariff">;

const MEASURE_AUTHORITY: Readonly<Record<CoerciveMeasureKind, string>> = {
  sanctions: "INST-OFAC",
  "asset-restriction": "INST-OFAC",
  embargo: "INST-OFAC",
  "export-control": "INST-BIS",
};

/**
 * What a denial package against this partner actually is.
 *
 * A government cannot be export-controlled out of goods it does not buy. Where
 * the partner takes something from the United States that is licensed rather
 * than taxed — semiconductor equipment, critical minerals, defense articles,
 * telecom gear — denying it can be an export control, which BIS owns. A
 * designation, which OFAC owns, reaches the partner's sales to everyone the
 * dollar touches, so it is the package wherever it takes more of the partner's
 * trade than the control would, read off the same reach record the economy
 * charges (`external-pressure.ts#measureCut`).
 */
export function denialMeasureKind(campaign: Campaign, target: NationId): CoerciveMeasureKind {
  const control = candidateMeasure(campaign, target, "export-control");
  if (!control) return "sanctions";
  const designation = candidateMeasure(campaign, target, "sanctions");
  return designation && measureCut(campaign, designation) > measureCut(campaign, control) ? "sanctions" : "export-control";
}

function controlledExportTo(campaign: Campaign, target: NationId): TradeSectorId | undefined {
  return tradeEdgesWith(campaign, target)
    .filter((edge) => {
      const def = tradeSector(edge.sector);
      return edge.exports > 0 && (def?.instrument === "export-control" || def?.instrument === "licensing");
    })
    .sort((a, b) => b.exports - a.exports)[0]?.sector;
}

/**
 * Where a measure that is not a rate bites: what we license them for an
 * export control; for a designation, the target's leading export to the
 * world, where its reach bites; otherwise, and where neither is on file, what
 * they sell us.
 */
function measuredSector(campaign: Campaign, target: NationId, kind: CoerciveMeasureKind): TradeSectorId | undefined {
  if (kind === "export-control") return controlledExportTo(campaign, target);
  const sold = tradeEdgesWith(campaign, target).filter((edge) => edge.imports > 0).map((edge) => edge.sector);
  if (kind !== "sanctions") return sold[0] ?? leadingExportSector(campaign, target);
  // A further designation names the next export not already designated, so escalating never refiles what stands.
  const goods = [...exportGoodsOf(selectNation(campaign, target)?.base.stats.trade.topExports ?? [], US_GOODS_TRADE[target as string]?.imports ?? {}), ...sold];
  return goods.find((good) => !Object.values(campaign.trade.measures).some((m) => m.liftedTurn === undefined && m.origin === "us" && m.target === target && m.kind === "sanctions" && m.sector === good && m.scope !== "listed"));
}

/** The register's record of one measure the administration would file today, before any answer is scheduled. */
function candidateMeasure(campaign: Campaign, target: NationId, kind: CoerciveMeasureKind): (TradeMeasure & { readonly kind: CoerciveMeasureKind }) | undefined {
  const sector = measuredSector(campaign, target, kind);
  if (!sector) return undefined;
  // The register's own contract: a measure that is not a rate carries zero,
  // so a prohibition never stacks against the ceiling a tariff is checked for.
  return { id: `${kind}:${target}:${campaign.turn}`, kind, sector, target, rate: 0, imposedTurn: campaign.turn, imposedDate: campaign.calendar, authority: MEASURE_AUTHORITY[kind], origin: "us", actor: campaign.founding.nation };
}

/**
 * The register's record of an economic act ordered through the ladder, and the
 * answer the partner schedules against it.
 *
 * Written only for the administration's own acts, because the register is
 * US-centric all the way down: every edge is derived against the founding
 * nation, and the answer `tradePhase` lands charges the President's own book.
 * A measure between two other capitals would be an edge this model cannot
 * compute and a bill nobody in the campaign pays.
 */
export function coerciveMeasureEffect(
  campaign: Campaign,
  actor: NationId,
  target: NationId,
  kind: CoerciveMeasureKind,
): Effect | undefined {
  if (actor !== campaign.founding.nation) return undefined;
  const measure = candidateMeasure(campaign, target, kind);
  if (!measure) return undefined;
  const asRate = COERCION_AS_RATE[kind];
  const id = measure.id;
  const answer = retaliationOutlook(campaign, target, asRate);
  return {
    kind: "trade",
    measure,
    ...(answer.chance > 0 && answer.sector
      ? {
          expect: {
            id: `retaliation:${kind}:${target}:${campaign.turn}`,
            by: target,
            answering: id,
            dueTurn: campaign.turn + RETALIATION_LAG_TURNS,
            sector: answer.sector,
            rate: answerRate(asRate),
            landed: false,
          },
          chance: answer.chance,
        }
      : {}),
  };
}

export type LiftResult =
  | { readonly ok: true; readonly packet: EffectPacket }
  | { readonly ok: false; readonly reason: string };

/**
 * A timed suspension of imports, the President's short measure. A standing
 * import embargo, the one the board inherits against Cuba, is lifted as an
 * embargo and thaws the relationship like one.
 */
const isTimedSuspension = (measure: TradeMeasure): boolean => measure.direction === "imports" && measure.expiresDate !== undefined;

/** A lift says what it lifted. Four of the five kinds are not tariffs. */
function liftSummary(measure: TradeMeasure, sectorName: string, nationName: string): string {
  if (isTimedSuspension(measure)) return `The import suspension on ${nationName} is lifted.`;
  switch (measure.kind) {
    case "tariff":
      return `The tariff on ${sectorName} from ${nationName} is lifted.`;
    case "sanctions":
      return measure.scope === "listed" ? `The designations under the ${nationName} program are lifted.` : `The sanctions on ${nationName} are lifted, and ${sectorName} moves again.`;
    case "asset-restriction":
      return `The freeze on ${nationName}'s assets is released.`;
    case "export-control":
      return `The export controls on ${sectorName} to ${nationName} are withdrawn.`;
    case "embargo":
      return `The embargo on ${nationName} is lifted.`;
  }
}

/**
 * Lift a measure the administration imposed.
 *
 * No incidence is returned, and the reason is the embargo: cutting a partner
 * off sets the trade dependence the whole edge is derived from to zero, so the
 * measure that is hardest to lift is exactly the one whose incidence can no
 * longer be computed. A lift is a lift; what it undoes is on the record.
 */
export function liftMeasure(campaign: Campaign, id: TradeMeasureId): LiftResult {
  const measure = campaign.trade.measures[id];
  if (!measure) return { ok: false, reason: "No such measure." };
  if (measure.liftedTurn !== undefined) return { ok: false, reason: "That measure is already lifted." };
  if (measure.origin !== "us") return { ok: false, reason: "That measure is not this administration's to lift." };
  const def = tradeSector(measure.sector);
  const nationName = selectNation(campaign, measure.target)?.base.identity.name ?? String(measure.target);
  // What comes off the relationship when the measure comes off. A rate says how
  // heavy a tariff was; a prohibition has no rate, so it is weighed by what it
  // was answered as.
  const weight = measure.kind === "tariff" ? measure.rate : COERCION_AS_RATE[measure.kind];
  return {
    ok: true,
    packet: {
      source: "action",
      actor: "player",
      turn: campaign.turn,
      provenance: {
        origin: "decision",
        // The signature this undoes. A lift with no cause reads on the trail as
        // a tariff appearing from nowhere and vanishing to nowhere.
        ...(measure.causedBy ? { causeIds: [measure.causedBy] } : {}),
        entities: [measure.target],
        systems: ["trade"],
      },
      narration: { summary: liftSummary(measure, def?.name.toLowerCase() ?? measure.sector, nationName) },
      effects: [
        { kind: "trade", lift: id, priceMove: liftPriceMove(measure) },
        ...(isTimedSuspension(measure) ? [] : [{
          kind: "relationship" as const,
          from: campaign.founding.nation,
          to: measure.target,
          deltas: { tension: -round3(weight * 0.2), trust: round3(weight * 0.15) },
        }]),
        // The ladder writes a standing embargo as a governance flag and the
        // register writes it as a measure. Lifting one and leaving the other
        // would give the board two answers to whether the trade is cut off.
        ...(measure.kind === "embargo" && measure.direction !== "imports"
          ? [{ kind: "flag" as const, clear: [`embargo:${campaign.founding.nation}:${measure.target}`] }]
          : []),
      ],
    },
  };
}

// --- Readings --------------------------------------------------------------

export type TradeExposure = {
  readonly sector: TradeSectorDef;
  readonly priceMove: number;
  readonly measures: readonly TradeMeasure[];
};

/** Which sectors are carrying a price move, worst first — the cost-of-living read. */
export function selectTradeExposure(campaign: Campaign): readonly TradeExposure[] {
  const live = Object.values(campaign.trade.measures).filter((measure) => measure.liftedTurn === undefined
    && isTradeMeasureEffective(campaign, measure.id));
  return TRADE_SECTORS.map((def) => ({
    sector: def,
    priceMove: campaign.trade.sectorPrice[def.id] ?? 0,
    measures: live.filter((measure) => measure.sector === def.id),
  }))
    .filter((exposure) => exposure.priceMove !== 0 || exposure.measures.length > 0)
    .sort((a, b) => Math.abs(b.priceMove) - Math.abs(a.priceMove));
}

/** Everything in force, so a surface never has to filter the record itself. */
export function selectLiveMeasures(campaign: Campaign): readonly TradeMeasure[] {
  return Object.values(campaign.trade.measures).filter((measure) => measure.liftedTurn === undefined
    && isTradeMeasureEffective(campaign, measure.id));
}

/** What is coming, and from whom. */
export function selectExpectedRetaliation(campaign: Campaign): readonly RetaliationRecord[] {
  return campaign.trade.retaliation.filter((record) => !record.landed);
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
