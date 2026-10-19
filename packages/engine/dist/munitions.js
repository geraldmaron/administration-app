/**
 * Munitions as levels, never counts.
 *
 * No stock count for any of these systems is public (the CSIS page the seed
 * was read from says the inventories are classified), so every stock here is
 * an index where 1.0 is a notional full stock. The United States is held by
 * class, from `US_MUNITIONS`; every other government is one index, 1 at the
 * oath. A war week draws the stocks of everyone fighting it; what the United
 * States draws goes on order, its production line works the order book down
 * week by week, and whatever is still owed lands at the end of the general
 * lead. Every other government refills from its own industry.
 */
import { US_MUNITIONS } from "@admin/world";
import { addDays, compareDates } from "./clock.js";
import { elapsedDays } from "./pace.js";
import { selectActiveConflicts } from "./state.js";
import { hasProspectiveOrderAuthority, prospectiveOrderAuthority } from "./order-authority.js";
export const MUNITION_CLASS_IDS = ["air-defense", "naval-interceptors", "cruise-standoff", "precision-fires", "artillery-155"];
export const MUNITION_CLASS_LABELS = {
    "air-defense": "air-defense interceptors",
    "naval-interceptors": "naval interceptors",
    "cruise-standoff": "cruise and standoff missiles",
    "precision-fires": "precision fires",
    "artillery-155": "155mm artillery",
};
/**
 * One lead for every class: the CSIS figure of "about 24 months historically,
 * 36 or more now", taken at its current end. It is a general figure, not any
 * one system's, and the label travels with it so no surface prints it as one.
 */
export const GENERAL_RESTOCK_LEAD = { weeks: 156, label: "general" };
export const RESTOCK_PER_WEEK = { 1: 0.0008, 2: 0.0012, 3: 0.0016, 4: 0.0025 };
export const CLASS_RESTOCK_RANK = {
    "air-defense": 1,
    "naval-interceptors": 1,
    "cruise-standoff": 2,
    "precision-fires": 2,
    "artillery-155": 4,
};
/** A modeled supplier's priority access to a federal line, in stock-index units per week. */
export const DEFENSE_PRIORITY_CLASS = "precision-fires";
export const DEFENSE_PRIORITY_SUPPLIER = "Potomac Precision Works";
export const DEFENSE_PRIORITY_WEEKLY_INDEX = 0.0006;
/** What a week of fighting at full intensity takes out of a stock. A planning value. */
export const DRAW_PER_WAR_WEEK = 0.02;
/**
 * The industrial base every other government refills from, on the table's
 * ordinal (1 import-dependent, 5 the highest observed): Russia 5, China 4,
 * North Korea 3, Iran 2 (a placeholder the table flags), European NATO 3 as the
 * table's aggregate, the United States' other treaty allies 2. A government the
 * table has no row for is 1, which is a planning default, not a finding.
 */
const NPC_INDUSTRY = { RUS: 5, CHN: 4, PRK: 3, IRN: 2, JPN: 2, KOR: 2, AUS: 2, PHL: 2, CAN: 2 };
const NATO_EUROPE_INDUSTRY = 3;
const NPC_RESTOCK_PER_ORDINAL = 0.001;
/** Below this a class is too thin to carry the rung it supports. */
export const EXHAUSTED_STOCK = 0.02;
/** Below this a class is reported as running low. */
export const LOW_STOCK = 0.25;
/** Which classes each military rung spends, so a class at zero limits the rung it supports. */
export const RUNG_CLASSES = {
    3: ["naval-interceptors"],
    4: ["cruise-standoff"],
    5: ["artillery-155", "precision-fires"],
};
export { applyMunitions } from "./world-effects.js";
const round4 = (value) => Math.round(value * 10000) / 10000;
const clamp01 = (value) => Math.max(0, Math.min(1, value));
/** The stocks at the oath: each US class at its seeded planning level, nobody else drawn. */
export function openingMunitions() {
    const us = {};
    for (const id of MUNITION_CLASS_IDS) {
        const row = US_MUNITIONS.find((entry) => entry.munitionClass === id);
        us[id] = { count: row?.openingIndex ?? 1, onOrder: [] };
    }
    return { us, index: {} };
}
/** The stored stocks, or the oath's where nothing has been stored yet. A stock's `count` holds its index. */
export function munitionsOf(campaign) {
    return campaign.munitions ?? openingMunitions();
}
export function usClassLevel(state, id) {
    return state.us[id]?.count ?? 1;
}
function usLevel(state) {
    return MUNITION_CLASS_IDS.reduce((sum, id) => sum + usClassLevel(state, id), 0) / MUNITION_CLASS_IDS.length;
}
/** One government's stock as one index: the class average for the United States. */
export function munitionLevel(campaign, nation) {
    const state = munitionsOf(campaign);
    return nation === campaign.founding.nation ? usLevel(state) : (state.index[nation] ?? 1);
}
/**
 * What a side's stocks leave of its strength. A force with its magazines
 * empty still holds ground, so the floor is three quarters of full strength,
 * not zero; an army out of shells is weaker, not gone.
 */
export function munitionStrengthFactor(campaign, nation) {
    return 0.75 + 0.25 * munitionLevel(campaign, nation);
}
/**
 * What a rung is missing for want of munitions, or undefined. Only the
 * President's own stocks are held by class; every other government's single
 * index already prices its strength in the war tick.
 */
export function munitionsShortfall(campaign, actor, rung) {
    if (actor !== campaign.founding.nation)
        return undefined;
    const state = munitionsOf(campaign);
    const empty = RUNG_CLASSES[rung].filter((id) => usClassLevel(state, id) < EXHAUSTED_STOCK);
    if (empty.length === 0)
        return undefined;
    return `stocks of ${empty.map((id) => MUNITION_CLASS_LABELS[id]).join(" and ")}, which are spent until a restock arrives`;
}
function isParty(conflict, nation) {
    return (conflict.aggressor === nation ||
        conflict.defender === nation ||
        conflict.joined.aggressor.includes(nation) ||
        conflict.joined.defender.includes(nation));
}
/** How hard each belligerent fought this week: the sum of the intensities of the wars it is in. */
function warLoad(conflicts) {
    const load = new Map();
    for (const conflict of conflicts) {
        const parties = [conflict.aggressor, conflict.defender, ...conflict.joined.aggressor, ...conflict.joined.defender];
        for (const nation of new Set(parties))
            load.set(nation, (load.get(nation) ?? 0) + conflict.intensity);
    }
    return load;
}
function npcIndustry(campaign, nation) {
    const listed = NPC_INDUSTRY[nation];
    if (listed !== undefined)
        return listed;
    const runtime = campaign.nations[nation];
    const memberships = runtime?.memberships ?? runtime?.base.memberships ?? [];
    const european = runtime?.base.geo.region.endsWith("-europe") ?? false;
    return european && memberships.some((org) => org === "ORG-NATO") ? NATO_EUROPE_INDUSTRY : 1;
}
/** Every other government's index after the week: drawn by its wars, refilled by its industry, dropped once full. */
function nextNpcIndex(campaign, state, load) {
    const us = campaign.founding.nation;
    const nations = new Set([...Object.keys(state.index), ...load.keys()]);
    const next = {};
    for (const nation of [...nations].sort()) {
        if (nation === us)
            continue;
        const drawn = (state.index[nation] ?? 1) - DRAW_PER_WAR_WEEK * (load.get(nation) ?? 0);
        const level = round4(clamp01(drawn + NPC_RESTOCK_PER_ORDINAL * npcIndustry(campaign, nation)));
        if (level < 1)
            next[nation] = level;
    }
    return next;
}
/** The priority is available only against a federal replenishment entry already in the book. */
export function priorityOrder(campaign) {
    return munitionsOf(campaign).us[DEFENSE_PRIORITY_CLASS]?.onOrder.find((order) => order.count > 0 && !order.priorityContractId);
}
/** A named backlog still awaiting delivery under an unended priority contract. */
export function hasLiveDefensePriorityContract(campaign) {
    const book = munitionsOf(campaign).us[DEFENSE_PRIORITY_CLASS]?.onOrder ?? [];
    return campaign.orders.some((record) => record.order === "order-defense-production" && record.defenseContract
        && !record.remedyApplied && prospectiveOrderAuthority(campaign, record.id) !== "ended"
        && book.some((order) => order.priorityContractId === record.id && order.count > 0));
}
export function munitionContractBook(campaign, contractId) {
    const orders = munitionsOf(campaign).us[DEFENSE_PRIORITY_CLASS]?.onOrder ?? [];
    const target = priorityOrder(campaign);
    if (!target)
        throw new Error("A priority contract needs an outstanding precision-fires order.");
    let assigned = false;
    return orders.map((order) => {
        if (!assigned && order === target) {
            assigned = true;
            return { ...order, priorityContractId: contractId };
        }
        return order;
    });
}
/** The one named contract the weekly line is currently allowed to prioritize. */
export function activeDefensePriorityContractId(campaign) {
    const book = munitionsOf(campaign).us[DEFENSE_PRIORITY_CLASS]?.onOrder ?? [];
    const record = campaign.orders.find((entry) => entry.order === "order-defense-production"
        && entry.defenseContract && !entry.remedyApplied && hasProspectiveOrderAuthority(campaign, entry.id)
        && book.some((order) => order.priorityContractId === entry.id && order.count > 0)
        && !campaign.judiciary.proceedings?.some((matter) => matter.subject.kind === "statutory-authority" && matter.subject.recordId === entry.id && matter.partyRelief?.active));
    return record?.id;
}
/** What a week off the line fills of the order book, oldest order first; an order filled whole leaves the book. */
function workDownOrders(orders, delivered) {
    let left = delivered;
    return orders.flatMap((order) => {
        const filled = Math.min(order.count, left);
        left -= filled;
        const remaining = round4(order.count - filled);
        return remaining > 0 ? [{ ...order, count: remaining }] : [];
    });
}
/**
 * One US class's week: arrivals land, the war draws, the draw goes on order,
 * and the line refills. What it delivers each week comes off the order book.
 * Untagged legacy orders land any residual at the general lead; a named
 * priority contract keeps its residual on the book until bounded production
 * actually fulfills it.
 */
function nextClass(stock, id, intensity, today, priorityId) {
    const due = stock.onOrder.filter((order) => !order.priorityContractId && compareDates(order.arrives, today) <= 0);
    const waiting = stock.onOrder.filter((order) => order.priorityContractId || compareDates(order.arrives, today) > 0);
    const arrived = round4(due.reduce((sum, order) => sum + order.count, 0));
    const before = clamp01(stock.count + arrived);
    const drawn = Math.max(0, before - DRAW_PER_WAR_WEEK * intensity);
    const spent = round4(before - drawn);
    const contracted = waiting.find((entry) => entry.priorityContractId === priorityId)?.count ?? 0;
    const boost = priorityId && id === DEFENSE_PRIORITY_CLASS
        ? Math.min(DEFENSE_PRIORITY_WEEKLY_INDEX, contracted) : 0;
    const count = round4(clamp01(drawn + RESTOCK_PER_WEEK[CLASS_RESTOCK_RANK[id]] + boost));
    const order = spent > 0 ? [{ arrives: addDays(today, elapsedDays(GENERAL_RESTOCK_LEAD.weeks)), count: spent }] : [];
    const delivered = Math.max(0, count - drawn);
    const queued = [...waiting.filter((entry) => entry.priorityContractId === priorityId),
        ...waiting.filter((entry) => entry.priorityContractId !== priorityId), ...order];
    return { stock: { count, onOrder: workDownOrders(queued, delivered) }, arrived };
}
function nextUs(state, intensity, today, priorityId) {
    const us = {};
    const low = [];
    const restocked = [];
    for (const id of MUNITION_CLASS_IDS) {
        const stock = state.us[id] ?? { count: 1, onOrder: [] };
        const week = nextClass(stock, id, intensity, today, priorityId);
        us[id] = week.stock;
        if (stock.count >= LOW_STOCK && week.stock.count < LOW_STOCK)
            low.push(id);
        if (week.arrived > 0)
            restocked.push(id);
    }
    return { us, low, restocked };
}
function sameState(a, b) {
    return a !== undefined && JSON.stringify(a.us) === JSON.stringify(b.us)
        && JSON.stringify(a.index) === JSON.stringify(b.index);
}
function munitionsFeed(campaign, week) {
    const turn = campaign.turn + 1;
    const lines = [
        ...week.low.map((id) => MUNITIONS_LINES.low(MUNITION_CLASS_LABELS[id])),
        ...week.restocked.map((id) => MUNITIONS_LINES.restocked(MUNITION_CLASS_LABELS[id])),
    ];
    return lines.map((headline) => ({ turn, kind: "conflict", visibility: "intelligence", headline }));
}
/**
 * The week's draw on stocks and the restocks that arrive, for every
 * government at war and every stock still refilling. Runs after the war tick,
 * so it draws on the wars as this week left them.
 */
export const munitionsPhase = (campaign) => {
    const current = munitionsOf(campaign);
    if (current.lastProcessedTurn === campaign.turn)
        return [];
    const wars = selectActiveConflicts(campaign);
    const usIntensity = wars.filter((war) => isParty(war, campaign.founding.nation)).reduce((sum, war) => sum + war.intensity, 0);
    const week = nextUs(current, usIntensity, campaign.calendar, activeDefensePriorityContractId(campaign));
    const next = { us: week.us, index: nextNpcIndex(campaign, current, warLoad(wars)),
        lastProcessedTurn: campaign.turn };
    if (sameState(campaign.munitions, next))
        return [];
    const feed = munitionsFeed(campaign, week);
    const packet = {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        background: feed.length === 0,
        narration: { summary: feed[0]?.headline ?? MUNITIONS_LINES.ledger },
        effects: [{ kind: "munitions", set: next }, ...(feed.length > 0 ? [{ kind: "feed", items: feed }] : [])],
    };
    return [packet];
};
function bandOf(index) {
    if (index < EXHAUSTED_STOCK)
        return "spent";
    if (index < LOW_STOCK)
        return "low";
    return index < 0.9 ? "adequate" : "full";
}
function classReading(state, id) {
    const stock = state.us[id] ?? { count: 1, onOrder: [] };
    const next = [...stock.onOrder].sort((a, b) => compareDates(a.arrives, b.arrives))[0];
    return {
        id,
        label: MUNITION_CLASS_LABELS[id],
        index: stock.count,
        band: bandOf(stock.count),
        onOrder: round4(stock.onOrder.reduce((sum, order) => sum + order.count, 0)),
        ...(next ? { nextArrival: next.arrives } : {}),
    };
}
/** The President's stocks as the security room reads them: a level per class, what is on order, and when the next order lands. */
export function selectMunitions(campaign) {
    const state = munitionsOf(campaign);
    return { classes: MUNITION_CLASS_IDS.map((id) => classReading(state, id)), provenance: "planning value", lead: GENERAL_RESTOCK_LEAD };
}
/** The lines a munitions week can file. Levels only: no line prints a count, because none is sourced. */
export const MUNITIONS_LINES = {
    ledger: "Munitions stocks are drawn and refilled.",
    low: (label) => `Stocks of ${label} are running low, on the game's planning levels.`,
    restocked: (label) => `An order of ${label} placed during the fighting has been delivered.`,
    lead: "The general lead is about three years; a priority contract still awaiting production may be delayed past it.",
    banner: "Munitions levels are the game's planning estimates, not reported stocks: no stock count for these systems is public.",
};
