import { chokepointById, tradeExposure, US_ID, type NationId } from "@admin/world";
import { blockadeCutOn, blockadesInForce } from "./blockades.js";
import { COMMODITY_DEFS, supplierShare, supplierShares, type CommodityRoute } from "./commodity-registry.js";
import type { CommodityId } from "./commodities.js";
import { coercionsInForce } from "./external-pressure.js";
import { compareDates } from "./clock.js";
import { straitPassage, type StraitPassage } from "./strait-passage.js";
import { selectActiveConditions, selectActiveConflicts, selectNation, type Campaign, type Conflict } from "./state.js";

// What is moving each market this week, read off the world as it stands.
//
// A shock changes a market's mechanism (supply lost, a strait threatened, a
// reserve drawn) and never its price: the kernel turns the mechanism into a
// price. Every shock is derived from a fact the campaign already keeps — a war,
// a blockade, a condition, a measure, a release — so a shock ends the week its
// cause does, and there is no second record of it to fall out of step.

export type CommodityShockKind = "war" | "route" | "blockade" | "sanction" | "harvest" | "release";

export type CommodityShock = {
  readonly commodity: CommodityId;
  readonly kind: CommodityShockKind;
  /** What the Record and the screens name as the cause. */
  readonly cause: string;
  /** Share of world supply lost this week; negative where supply is added. */
  readonly loss: number;
  /** Log-price premium for a threat that has not yet cut any supply. */
  readonly risk: number;
  /** For a contested strait: who the governments closing it let through and who they stop. */
  readonly passage?: StraitPassage;
};

/**
 * Planning values: the share of a principal belligerent's output a war at full
 * intensity takes off the market. A defender fights on its own fields and
 * wells; an aggressor fights abroad, and its output mostly keeps flowing.
 */
export const WAR_OUTPUT_LOSS = { defender: 0.5, aggressor: 0.02 } as const;

/** Planning value: how much of a strait a war with a government on its shores closes at full intensity. */
export const ROUTE_CLOSURE = 0.5;

/** Planning value: the log-price premium per unit of a threatened strait's share, at full intensity. */
export const ROUTE_RISK = 0.3;

// Both route terms are charged on the flow that cannot go around (the route's
// `share` net of its `bypass`), because a barrel a pipeline or a detour still
// delivers is neither lost nor at risk: the 2024 Red Sea attacks halved the
// Bab el-Mandeb's flow and sent most of it round the Cape, and the world price
// barely moved. Fed net loss rather than the gross drop in transits, the kernel
// is calibrated against what supply was actually lost: crude's sensitivity is
// fitted to the 2026 shut-ins (`commodity-registry.ts`). The route term itself
// carries at most 0.2 × (1 − 0.124) × 0.5 = 0.088 for a Hormuz war at full
// intensity, before the war's own lost barrels, and less where the government
// closing the strait lets its friends' ships through (`strait-passage.ts`).

/** Planning value: sanctioned output finds other buyers at a discount, so a measure cuts less than its trade rate. */
export const SANCTION_BITE = 0.3;

/** Planning value: the share of a supplier's output a condition at full severity takes. */
export const CONDITION_OUTPUT_LOSS = 0.3;

/** Planning value: a Strategic Petroleum Reserve release, as a share of world crude supply. */
export const RESERVE_RELEASE_SHARE = 0.01;

/** The most one week's shocks together can take off a market. */
const LOSS_CAP = 0.6;

function nameOf(campaign: Campaign, nation: NationId): string {
  return selectNation(campaign, nation)?.base.identity.name ?? (nation as string);
}

function principalRole(conflict: Conflict, nation: NationId): "defender" | "aggressor" | undefined {
  if (conflict.defender === nation) return "defender";
  if (conflict.aggressor === nation) return "aggressor";
  return undefined;
}

function isParty(conflict: Conflict, nation: NationId): boolean {
  return principalRole(conflict, nation) !== undefined || conflict.joined.aggressor.includes(nation) || conflict.joined.defender.includes(nation);
}

function warLabel(campaign: Campaign, conflict: Conflict): string {
  return `the war between ${nameOf(campaign, conflict.aggressor)} and ${nameOf(campaign, conflict.defender)}`;
}

function warShocks(campaign: Campaign, id: CommodityId, conflicts: readonly Conflict[]): CommodityShock[] {
  return conflicts.flatMap((conflict) => {
    const loss = supplierShares(id).reduce((sum, row) => {
      const role = principalRole(conflict, row.nation);
      return role ? sum + row.share * conflict.intensity * WAR_OUTPUT_LOSS[role] : sum;
    }, 0);
    return loss > 0 ? [{ commodity: id, kind: "war" as const, cause: warLabel(campaign, conflict), loss, risk: 0 }] : [];
  });
}

/** The heaviest threat to one strait: a war with a government on its shores as a party, at its intensity. */
function routeShock(campaign: Campaign, id: CommodityId, route: CommodityRoute, conflicts: readonly Conflict[]): CommodityShock | undefined {
  const threat = conflicts
    .filter((conflict) => route.littoral.some((shore) => isParty(conflict, shore)))
    .reduce<Conflict | undefined>((worst, conflict) => (!worst || conflict.intensity > worst.intensity ? conflict : worst), undefined);
  if (!threat) return undefined;
  const passage = straitPassage(campaign, threat, route.chokepoint, id, route.littoral);
  const stranded = route.share * (1 - route.bypass) * passage.stoppedShare;
  const strait = chokepointById.get(route.chokepoint)?.name ?? route.chokepoint;
  return {
    commodity: id,
    kind: "route",
    cause: `shipping through the ${strait} is contested in ${warLabel(campaign, threat)}${passingClause(campaign, passage)}`,
    loss: stranded * threat.intensity * ROUTE_CLOSURE,
    risk: stranded * threat.intensity * ROUTE_RISK,
    passage,
  };
}

/** ", and ships bound for China and India are let through", where any are. */
function passingClause(campaign: Campaign, passage: StraitPassage): string {
  if (passage.passing.length === 0) return "";
  const names = passage.passing.map((flag) => nameOf(campaign, flag));
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
  return `, and ships bound for ${list} are let through`;
}

/** The share of a producer's output this week's wars already take, so a blockade is not charged for the same barrels. */
function warLossFraction(nation: NationId, conflicts: readonly Conflict[]): number {
  const lost = conflicts.reduce((sum, conflict) => {
    const role = principalRole(conflict, nation);
    return role ? sum + conflict.intensity * WAR_OUTPUT_LOSS[role] : sum;
  }, 0);
  return Math.min(1, lost);
}

/**
 * The output a blockade on station keeps off the market: the target's share of
 * world supply times what the blockade stops, less what its wars already took.
 * One shock per blockaded supplier, at the heaviest blockade on it, and gone
 * the week the blockade lifts.
 */
function blockadeShocks(campaign: Campaign, id: CommodityId, conflicts: readonly Conflict[]): CommodityShock[] {
  const targets = [...new Set(blockadesInForce(campaign).map((blockade) => blockade.target))];
  return targets.flatMap((target) => {
    const share = supplierShare(id, target);
    const stopped = Math.max(0, blockadeCutOn(campaign, target) - warLossFraction(target, conflicts));
    if (share <= 0 || stopped <= 0) return [];
    return [{ commodity: id, kind: "blockade" as const, cause: `the blockade of ${nameOf(campaign, target)}`, loss: share * stopped, risk: 0 }];
  });
}

/**
 * The heaviest of several shocks on the same output, by key. A producer's
 * output can be kept off the market once: two measures on the same supplier,
 * or two cyclones on the same coast, do not remove twice what it sells, so
 * summing them charged the same barrels again.
 */
function heaviestByKey(shocks: readonly (CommodityShock & { readonly key: string })[]): CommodityShock[] {
  const heaviest = new Map<string, CommodityShock & { readonly key: string }>();
  for (const shock of shocks) {
    const held = heaviest.get(shock.key);
    if (!held || shock.loss > held.loss) heaviest.set(shock.key, shock);
  }
  return [...heaviest.values()].map(({ key: _key, ...shock }) => shock);
}

/**
 * How much of a seller's trade runs to one buyer, 0..1: the modeled partner
 * share the dataset derives by gravity, recovered from the seller's trade
 * dependence on that buyer. A measure keeps a seller's output from that buyer
 * only; the rest of its customers still buy, so charging the whole output
 * priced one government's tariff on the largest producer as a world shortage.
 * The share is the dataset's model, not bilateral trade statistics.
 *
 * The United States is the exception as a buyer: its measures carry secondary
 * sanctions through the dollar system (OFAC), so a seller it sanctions loses
 * buyers well beyond the American market, and its reach is the whole output,
 * discounted by the bite every sanction already carries.
 */
function buyerShare(campaign: Campaign, seller: NationId, buyer: NationId): number {
  if (buyer === US_ID) return 1;
  const base = campaign.nations[seller]?.base.stats;
  if (!base) return 0;
  const exposure = tradeExposure(base);
  if (exposure <= 0) return 0;
  return Math.min(1, (base.trade.tradeDependence[buyer] ?? 0) / exposure);
}

/**
 * Measures that keep a supplier's output off the market: a measure on a
 * supplier, and a supplier's own measure on a buyer, which is an export
 * restriction by another name unless it bans only the buyer's goods.
 */
function sanctionShocks(campaign: Campaign, id: CommodityId): CommodityShock[] {
  const suppliers = new Map(supplierShares(id).map((row) => [row.nation, row.share] as const));
  return heaviestByKey(coercionsInForce(campaign).flatMap((coercion) => {
    const targetShare = suppliers.get(coercion.target) ?? 0;
    const imposerShare = suppliers.get(coercion.imposer) ?? 0;
    const shocks: (CommodityShock & { readonly key: string })[] = [];
    if (targetShare > 0) {
      const lost = targetShare * coercion.severity * SANCTION_BITE * buyerShare(campaign, coercion.target, coercion.imposer);
      shocks.push({ key: coercion.target, commodity: id, kind: "sanction", cause: `measures on ${nameOf(campaign, coercion.target)}`, loss: lost, risk: 0 });
    }
    if (imposerShare > 0 && coercion.stopsImposerSales) {
      const lost = imposerShare * coercion.severity * SANCTION_BITE * buyerShare(campaign, coercion.imposer, coercion.target);
      shocks.push({ key: coercion.imposer, commodity: id, kind: "sanction", cause: `export restrictions by ${nameOf(campaign, coercion.imposer)}`, loss: lost, risk: 0 });
    }
    return shocks;
  }));
}

function conditionShocks(campaign: Campaign, id: CommodityId): CommodityShock[] {
  const hitBy = COMMODITY_DEFS[id].hitBy;
  if (hitBy.length === 0) return [];
  const suppliers = new Map(supplierShares(id).map((row) => [row.nation, row.share] as const));
  return heaviestByKey(selectActiveConditions(campaign).flatMap((condition) => {
    const share = suppliers.get(condition.nation);
    if (!share || !hitBy.includes(condition.kind)) return [];
    const loss = share * condition.severity * CONDITION_OUTPUT_LOSS;
    return [{ key: `${condition.nation}:${condition.kind}`, commodity: id, kind: "harvest" as const, cause: `${condition.kind.replace("-", " ")} in ${nameOf(campaign, condition.nation)}`, loss, risk: 0 }];
  }));
}

/** Whether a reserve release covers today. */
export function reserveReleasing(campaign: Campaign): boolean {
  const release = campaign.markets?.reserve?.release;
  return release !== undefined && compareDates(campaign.calendar, release.from) >= 0 && compareDates(campaign.calendar, release.until) <= 0;
}

function releaseShock(campaign: Campaign, id: CommodityId): CommodityShock[] {
  if (id !== "crude" || !reserveReleasing(campaign)) return [];
  return [{ commodity: id, kind: "release", cause: "the Strategic Petroleum Reserve release", loss: -RESERVE_RELEASE_SHARE, risk: 0 }];
}

/** Everything moving one market this week, heaviest first. */
export function commodityShocks(campaign: Campaign, id: CommodityId): readonly CommodityShock[] {
  const conflicts = selectActiveConflicts(campaign);
  const routes = COMMODITY_DEFS[id].routes.flatMap((route) => {
    const shock = routeShock(campaign, id, route, conflicts);
    return shock ? [shock] : [];
  });
  return [...warShocks(campaign, id, conflicts), ...routes, ...blockadeShocks(campaign, id, conflicts), ...sanctionShocks(campaign, id), ...conditionShocks(campaign, id), ...releaseShock(campaign, id)].sort(
    (a, b) => Math.abs(b.loss) + b.risk - (Math.abs(a.loss) + a.risk),
  );
}

/** The week's shocks as one supply loss and one premium, the loss capped so no week empties a market. */
export function netShock(shocks: readonly CommodityShock[]): { readonly loss: number; readonly risk: number } {
  const loss = shocks.reduce((sum, shock) => sum + shock.loss, 0);
  const risk = shocks.reduce((sum, shock) => sum + shock.risk, 0);
  return { loss: Math.min(LOSS_CAP, loss), risk };
}
