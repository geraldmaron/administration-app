import { CHOKEPOINT_CARGO, CHOKEPOINT_ORIGINS, chokepointById, nationOilGas } from "@admin/world";
import { blockadeCutOn, blockadesInForce } from "./blockades.js";
import { COMMODITY_DEFS, supplierShare, supplierShares } from "./commodity-registry.js";
import { buyerShareOf, coercionsInForce, newlyStoppedShare } from "./external-pressure.js";
import { compareDates } from "./clock.js";
import { straitPassage } from "./strait-passage.js";
import { selectActiveConditions, selectActiveConflicts, selectNation } from "./state.js";
/**
 * Planning values: the share of a principal belligerent's output a war at full
 * intensity takes off the market. A defender fights on its own fields and
 * wells; an aggressor fights abroad, and its output mostly keeps flowing.
 */
export const WAR_OUTPUT_LOSS = { defender: 0.5, aggressor: 0.02 };
/**
 * How much of a strait's stopped cargo a war with a government on its shores
 * keeps from getting through at full intensity. Fitted, not measured: with
 * per-flag passage, the pipelines, the barrels the war already took at origin
 * (weighted by EIA's loadings by origin) and the war's own lost output, 0.68
 * makes a full-intensity Hormuz war take 9.6 percent of world supply, the
 * 10.4 Mb/d of 108.42 EIA's Short-Term Energy Outlook gives as shut in in
 * April 2026 (July edition, Table 1; October edition, Table 3a; opened
 * 2026-10-13).
 */
export const ROUTE_CLOSURE = 0.68;
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
function nameOf(campaign, nation) {
    return selectNation(campaign, nation)?.base.identity.name ?? nation;
}
function principalRole(conflict, nation) {
    if (conflict.defender === nation)
        return "defender";
    if (conflict.aggressor === nation)
        return "aggressor";
    return undefined;
}
function isParty(conflict, nation) {
    return principalRole(conflict, nation) !== undefined || conflict.joined.aggressor.includes(nation) || conflict.joined.defender.includes(nation);
}
function warLabel(campaign, conflict) {
    return `the war between ${nameOf(campaign, conflict.aggressor)} and ${nameOf(campaign, conflict.defender)}`;
}
function warShocks(campaign, id, conflicts) {
    return conflicts.flatMap((conflict) => {
        const loss = supplierShares(id).reduce((sum, row) => {
            const role = principalRole(conflict, row.nation);
            return role ? sum + row.share * conflict.intensity * WAR_OUTPUT_LOSS[role] : sum;
        }, 0);
        return loss > 0 ? [{ commodity: id, kind: "war", cause: warLabel(campaign, conflict), loss, risk: 0 }] : [];
    });
}
/** How badly a government is hurt if a strait closes, from the dataset's lanes (`geo.chokepointDependence`), 0 where it has none on file. */
export function chokepointDependence(campaign, nation, chokepoint) {
    return selectNation(campaign, nation)?.base.geo.chokepointDependence?.find((lane) => lane.chokepoint === chokepoint)?.weight ?? 0;
}
/**
 * 0..1 of a nation's oil consumption that the strait's cargo bound for it
 * carries: the cargo table's barrels over EIA's consumption series. Undefined
 * where the source names no such cargo or no consumption, and for any
 * commodity but crude, whose cargo and consumption are in the same barrels.
 */
export function cargoDependence(nation, chokepoint, commodity) {
    if (commodity !== "crude")
        return undefined;
    const row = CHOKEPOINT_CARGO.find((cargo) => cargo.chokepoint === chokepoint && cargo.commodity === commodity && cargo.destination === nation);
    const use = nationOilGas(nation)?.oilKbd;
    if (!row || !use)
        return undefined;
    return Math.min(1, (row.mbd * 1000) / use);
}
/**
 * 0..1 of a nation's crude sold abroad that loads behind a strait: the origin
 * table's barrels over EIA's crude production less the country's own oil
 * consumption. Undefined where the source names no such origin.
 */
export function originDependence(nation, chokepoint, commodity) {
    const row = CHOKEPOINT_ORIGINS.find((origin) => origin.chokepoint === chokepoint && origin.commodity === commodity && origin.origin === nation);
    const figures = nationOilGas(nation);
    if (!row || !figures?.crudeKbd)
        return undefined;
    const abroad = figures.crudeKbd > figures.oilKbd ? figures.crudeKbd - figures.oilKbd : figures.crudeKbd;
    return Math.min(1, (row.mbd * 1000) / abroad);
}
/** The share of a producer's energy output it sells abroad, 0 for a net importer: only exports cross a strait outward. */
function exportedShare(campaign, nation) {
    const energy = selectNation(campaign, nation)?.base.stats.energy;
    if (!energy || energy.production <= 0 || energy.consumption >= energy.production)
        return 0;
    return (energy.production - energy.consumption) / energy.production;
}
/**
 * The share of the strait's flow already lost at origin: each exporter that
 * ships through it, weighted by what it sells abroad and its dependence on the
 * strait, and how much of its output is already off the market. A barrel a war
 * or a measure took is not there to be stopped at the strait, so charging both
 * took the same barrel twice. An importer's own production never crosses the
 * strait outward, so a war on an importer's ground takes nothing from the flow.
 */
function upstreamLoss(campaign, id, route, conflicts) {
    // Where the source says who loads the strait's cargo, those barrels are the weights; elsewhere each
    // supplier's share of world supply, the share it exports and its dependence on the strait stand in.
    const origins = CHOKEPOINT_ORIGINS.filter((row) => row.chokepoint === route.chokepoint && row.commodity === id && row.origin !== "other");
    const shippers = origins.length > 0
        ? origins.map((row) => ({ row: { nation: row.origin }, weight: row.mbd }))
        : supplierShares(id).map((row) => ({ row, weight: row.share * exportedShare(campaign, row.nation) * chokepointDependence(campaign, row.nation, route.chokepoint) }));
    const total = shippers.reduce((sum, { weight }) => sum + weight, 0);
    if (total <= 0)
        return 0;
    return shippers.reduce((sum, { row, weight }) => sum + weight * originLoss(campaign, id, row.nation, conflicts), 0) / total;
}
/** The heaviest threat to one strait: a war with a government on its shores as a party, at its intensity. */
function contestRoute(campaign, id, route, conflicts) {
    const threat = conflicts
        .filter((conflict) => route.littoral.some((shore) => isParty(conflict, shore)))
        .reduce((worst, conflict) => (!worst || conflict.intensity > worst.intensity ? conflict : worst), undefined);
    if (!threat)
        return undefined;
    return {
        route,
        threat,
        passage: straitPassage(campaign, threat, route.chokepoint, id, route.littoral),
        closure: threat.intensity * ROUTE_CLOSURE,
        upstreamLost: upstreamLoss(campaign, id, route, conflicts),
    };
}
const routesBySnapshot = new WeakMap();
/** Every strait a war contests this week for one commodity. */
export function contestedRoutes(campaign, id) {
    let byCommodity = routesBySnapshot.get(campaign);
    if (!byCommodity) {
        byCommodity = new Map();
        routesBySnapshot.set(campaign, byCommodity);
    }
    const known = byCommodity.get(id);
    if (known)
        return known;
    const conflicts = selectActiveConflicts(campaign);
    const routes = COMMODITY_DEFS[id].routes.flatMap((route) => {
        const contested = contestRoute(campaign, id, route, conflicts);
        return contested ? [contested] : [];
    });
    byCommodity.set(id, routes);
    return routes;
}
function routeShock(campaign, id, contested) {
    const { route, threat, passage, closure, upstreamLost } = contested;
    const flowing = route.share * (1 - route.bypass) * (1 - upstreamLost);
    const strait = chokepointById.get(route.chokepoint)?.name ?? route.chokepoint;
    return {
        commodity: id,
        kind: "route",
        cause: `shipping through the ${strait} is contested in ${warLabel(campaign, threat)}${passingClause(campaign, passage)}`,
        loss: flowing * passage.stoppedShare * closure,
        // The threat is priced on every ship that still has to cross, the flags a
        // closing government lets through included: war-risk cover is written on the
        // transit, not on the flag.
        risk: flowing * threat.intensity * ROUTE_RISK,
        passage,
    };
}
/** ", and ships bound for China and India are let through", where any are. */
function passingClause(campaign, passage) {
    if (passage.passing.length === 0)
        return "";
    const names = passage.passing.map((flag) => nameOf(campaign, flag));
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return `, and ships bound for ${list} are let through`;
}
/** The share of a producer's output this week's wars already take, so a blockade is not charged for the same barrels. */
export function warLossFraction(nation, conflicts) {
    const lost = conflicts.reduce((sum, conflict) => {
        const role = principalRole(conflict, nation);
        return role ? sum + conflict.intensity * WAR_OUTPUT_LOSS[role] : sum;
    }, 0);
    return Math.min(1, lost);
}
/**
 * The output a blockade on station keeps off the market: the target's share of
 * world supply times what the blockade stops of what its wars left. One shock
 * per blockaded supplier, at the heaviest blockade on it, and gone the week
 * the blockade lifts. The same accounting as `originLoss`, so the shocks the
 * market is fed and the strait's deduction agree.
 */
function blockadeShocks(campaign, id, conflicts) {
    const targets = [...new Set(blockadesInForce(campaign).map((blockade) => blockade.target))];
    return targets.flatMap((target) => {
        const share = supplierShare(id, target);
        const stopped = (1 - warLossFraction(target, conflicts)) * Math.min(1, blockadeCutOn(campaign, target));
        if (share <= 0 || stopped <= 0)
            return [];
        return [{ commodity: id, kind: "blockade", cause: `the blockade of ${nameOf(campaign, target)}`, loss: share * stopped, risk: 0 }];
    });
}
/**
 * The heaviest of several shocks on the same output, by key. A producer's
 * output can be kept off the market once: two measures on the same supplier,
 * or two cyclones on the same coast, do not remove twice what it sells, so
 * summing them charged the same barrels again.
 */
function heaviestByKey(shocks) {
    const heaviest = new Map();
    for (const shock of shocks) {
        const held = heaviest.get(shock.key);
        if (!held || shock.loss > held.loss)
            heaviest.set(shock.key, shock);
    }
    return [...heaviest.values()].map(({ key: _key, ...shock }) => shock);
}
/**
 * The share of a producer's output of a commodity the measures on it keep off
 * the market: the share of its sales of the commodity's goods they stop
 * (`stoppedShare`, the record the producer's own economy reads), at the bite a
 * sanction carries because most of what it stops is sold elsewhere at a
 * discount. Measured from the producer's baseline vintage: the supply the
 * dataset records already carries what was in force then, so only the change
 * is lost, and lifting an embedded program returns supply.
 */
function sanctionLossOn(campaign, id, nation) {
    return SANCTION_BITE * newlyStoppedShare(campaign, nation, COMMODITY_DEFS[id].sector, COMMODITY_DEFS[id].good);
}
/**
 * How much of one producer's output of a commodity is off the market this
 * week before any strait: its wars, a blockade on station and the measures on
 * it, each taking its share of what the others left.
 */
function originLoss(campaign, id, nation, conflicts) {
    const kept = (1 - warLossFraction(nation, conflicts)) * (1 - Math.min(1, blockadeCutOn(campaign, nation))) * (1 - Math.max(0, sanctionLossOn(campaign, id, nation)));
    return 1 - Math.max(0, kept);
}
/**
 * Measures that keep a supplier's output off the market: the measures on a
 * supplier, charged on what its wars and a blockade left, and a supplier's own
 * measure on a buyer, which is an export restriction by another name unless it
 * bans only the buyer's goods. The second reaches only what the supplier sells
 * that buyer: a government that stops its own sales to one market leaves the
 * rest of its customers served.
 */
function sanctionShocks(campaign, id, conflicts) {
    const { sector, good } = COMMODITY_DEFS[id];
    const all = coercionsInForce(campaign);
    const onTargets = supplierShares(id).flatMap(({ nation: target, share }) => {
        const left = (1 - warLossFraction(target, conflicts)) * (1 - Math.min(1, blockadeCutOn(campaign, target)));
        const loss = share * left * sanctionLossOn(campaign, id, target);
        return Math.abs(loss) > 1e-9 ? [{ commodity: id, kind: "sanction", cause: loss > 0 ? `measures on ${nameOf(campaign, target)}` : `measures lifted on ${nameOf(campaign, target)}`, loss, risk: 0 }] : [];
    });
    const byImposers = heaviestByKey(all.flatMap((coercion) => {
        const imposerShare = supplierShare(id, coercion.imposer);
        const restricts = coercion.sector === undefined || (coercion.sector === sector && (coercion.good === undefined || coercion.good === good));
        if (imposerShare <= 0 || coercion.direction === "target-sales" || !restricts)
            return [];
        const lost = imposerShare * coercion.severity * SANCTION_BITE * buyerShareOf(campaign, coercion.imposer, coercion.target, coercion.sector);
        return [{ key: coercion.imposer, commodity: id, kind: "sanction", cause: `export restrictions by ${nameOf(campaign, coercion.imposer)}`, loss: lost, risk: 0 }];
    }));
    return [...onTargets, ...byImposers];
}
function conditionShocks(campaign, id) {
    const hitBy = COMMODITY_DEFS[id].hitBy;
    if (hitBy.length === 0)
        return [];
    const suppliers = new Map(supplierShares(id).map((row) => [row.nation, row.share]));
    return heaviestByKey(selectActiveConditions(campaign).flatMap((condition) => {
        const share = suppliers.get(condition.nation);
        if (!share || !hitBy.includes(condition.kind))
            return [];
        const loss = share * condition.severity * CONDITION_OUTPUT_LOSS;
        return [{ key: `${condition.nation}:${condition.kind}`, commodity: id, kind: "harvest", cause: `${condition.kind.replace("-", " ")} in ${nameOf(campaign, condition.nation)}`, loss, risk: 0 }];
    }));
}
/** Whether a reserve release covers today. */
export function reserveReleasing(campaign) {
    const release = campaign.markets?.reserve?.release;
    return release !== undefined && compareDates(campaign.calendar, release.from) >= 0 && compareDates(campaign.calendar, release.until) <= 0;
}
function releaseShock(campaign, id) {
    if (id !== "crude" || !reserveReleasing(campaign))
        return [];
    const share = campaign.markets?.reserve?.release?.share ?? RESERVE_RELEASE_SHARE;
    return [{ commodity: id, kind: "release", cause: "the Strategic Petroleum Reserve release", loss: -share, risk: 0 }];
}
/** Everything moving one market this week, heaviest first. */
export function commodityShocks(campaign, id) {
    const conflicts = selectActiveConflicts(campaign);
    const routes = contestedRoutes(campaign, id).map((contested) => routeShock(campaign, id, contested));
    return [...warShocks(campaign, id, conflicts), ...routes, ...blockadeShocks(campaign, id, conflicts), ...sanctionShocks(campaign, id, conflicts), ...conditionShocks(campaign, id), ...releaseShock(campaign, id)].sort((a, b) => Math.abs(b.loss) + b.risk - (Math.abs(a.loss) + a.risk));
}
/** The week's shocks as one supply loss and one premium, the loss capped so no week empties a market. */
export function netShock(shocks) {
    const loss = shocks.reduce((sum, shock) => sum + shock.loss, 0);
    const risk = shocks.reduce((sum, shock) => sum + shock.risk, 0);
    return { loss: Math.min(LOSS_CAP, loss), risk };
}
