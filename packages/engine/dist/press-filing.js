import { worldCities, worldStates } from "@admin/world";
import { NATIONAL_OUTLETS, PRESS_OUTLETS, outletDisposition, outletStance } from "./press-outlets.js";
import { reporterFor } from "./article-bylines.js";
import { hashFraction } from "./rng.js";
// The places a dateline can name, keyed by the name the wire prints. A state
// and a city are both datelines; a city is placed through its state.
const LOCALES = (() => {
    const regions = new Map(worldStates.map((state) => [state.id, state.region]));
    const entries = worldStates.map((state) => [state.name, { nation: "USA", region: state.region }]);
    for (const city of worldCities) {
        const region = city.state ? regions.get(city.state) : undefined;
        if (region)
            entries.push([city.name, { nation: city.nation, region }]);
    }
    return new Map(entries);
})();
/**
 * The census region a home story happened in, when it is one.
 *
 * A regional paper files the news from its own states and nothing else: a
 * condition with a dateline inside the country, read off the dateline the
 * condition system already writes. A story with no place, or a place abroad, has
 * no region and no regional desk.
 */
export function localeRegion(item) {
    if (item.kind !== "condition" || item.visibility === "intelligence")
        return undefined;
    const dateline = item.facts?.dateline;
    const locale = dateline ? LOCALES.get(dateline) : undefined;
    if (!locale)
        return undefined;
    if (item.target !== undefined && item.target !== locale.nation)
        return undefined;
    return locale.region;
}
// --- Which desk carries it ---------------------------------------------------
/**
 * How often a desk wins the stories it covers. The square root of its reach, so
 * the evening network files more than the opinion weekly without the biggest
 * audiences carrying every story between them.
 */
const deskWeight = (outlet) => Math.sqrt(outlet.reach);
/**
 * The desks that could carry a story, most likely first: a weighted draw
 * without replacement, keyed off the item's own content so the order is the
 * same however often it is taken.
 */
function rankedDesks(desks, key) {
    const ranked = [];
    let pool = [...desks];
    while (pool.length > 0) {
        const total = pool.reduce((sum, desk) => sum + deskWeight(desk), 0);
        let remaining = hashFraction(`${key}:${ranked.length}`) * total;
        const chosen = pool.find((desk) => (remaining -= deskWeight(desk)) < 0) ?? pool.at(-1);
        ranked.push(chosen);
        pool = pool.filter((desk) => desk.id !== chosen.id);
    }
    return ranked;
}
function candidateDesks(item) {
    const region = localeRegion(item);
    if (region)
        return PRESS_OUTLETS.filter((outlet) => outlet.region === region);
    const covering = NATIONAL_OUTLETS.filter((outlet) => outlet.coverage.includes(item.kind));
    return covering.length > 0 ? covering : NATIONAL_OUTLETS;
}
function itemKey(item) {
    const tag = item.facts?.topicTags?.[0];
    return tag ? `${item.turn}:${item.headline}:${tag}:outlet` : `${item.turn}:${item.headline}:outlet`;
}
export function pressOutletById(id) {
    return PRESS_OUTLETS.find((outlet) => outlet.id === id);
}
/**
 * Which masthead carries a public feed item.
 *
 * The desk it was filed at, once it has one. Before that, chosen by relevance:
 * a home story with a place goes to its region's paper, anything else to one of
 * the national desks that cover its kind, weighted by audience. Never by which
 * desk is hostile — a paper does not get a story because it dislikes the
 * government. The key is the item's own content, so the same headline lands on
 * the same desk however often it is reread.
 */
export function pickOutletForFeedItem(item) {
    if (item.visibility === "intelligence")
        return undefined;
    const filed = item.desk ? pressOutletById(item.desk.outletId) : undefined;
    return filed ?? rankedDesks(candidateDesks(item), itemKey(item))[0];
}
/**
 * The second desk that files the same story. Never the first one; for a home
 * story with a place, a national desk that covers disasters, because a fire
 * big enough for the regional paper is on the wire the same morning.
 */
export function secondOutletFor(item, first = pickOutletForFeedItem(item)) {
    if (item.visibility === "intelligence")
        return undefined;
    const stored = item.filings?.[0] ? pressOutletById(item.filings[0].outletId) : undefined;
    if (stored)
        return stored;
    if (!first)
        return undefined;
    const pool = localeRegion(item) ? NATIONAL_OUTLETS.filter((outlet) => outlet.coverage.includes("condition")) : candidateDesks(item);
    return rankedDesks(pool.filter((outlet) => outlet.id !== first.id), `${item.turn}:${item.headline}:second`)[0];
}
// --- Filing -----------------------------------------------------------------
/**
 * The most of one week's filings any desk carries. A corps where one masthead
 * writes most of the week is one voice with a roster attached, which is the
 * thing having eighteen desks is for avoiding.
 */
export const WEEK_SHARE_CAP = 0.4;
/**
 * Below this many filings a week, the cap is read as if the week were this
 * size: two stories out of three is not a desk dominating a week, but it would
 * be allowed to become three out of five.
 */
const WEEK_SHARE_FLOOR = 5;
function weekLoad(feed, turn) {
    const load = new Map();
    for (const item of feed) {
        if (item.turn === turn && item.desk)
            load.set(item.desk.outletId, (load.get(item.desk.outletId) ?? 0) + 1);
    }
    return load;
}
function withinCap(load, desk) {
    const filed = [...load.values()].reduce((sum, count) => sum + count, 0) + 1;
    return ((load.get(desk.id) ?? 0) + 1) / Math.max(filed, WEEK_SHARE_FLOOR) <= WEEK_SHARE_CAP;
}
function filed(campaign, item, load) {
    if (item.desk || item.visibility === "intelligence")
        return item;
    const ranked = rankedDesks(candidateDesks(item), itemKey(item));
    const first = ranked.find((desk) => withinCap(load, desk)) ?? ranked[0];
    if (!first)
        return item;
    const second = secondOutletFor(item, first);
    const stanceOf = (outlet) => outletStance(outletDisposition(campaign.press, outlet));
    const byline = reporterFor(first.id, item, campaign.seed);
    return {
        ...item,
        desk: { outletId: first.id, stance: stanceOf(first), ...(byline ? { byline } : {}) },
        ...(second ? { filings: [{ outletId: second.id, stance: stanceOf(second) }] } : {}),
    };
}
/**
 * A story as its desks file it: the masthead, the reporter, and what each desk
 * that filed thought of the administration at that moment.
 *
 * The stance is copied rather than read back later, because a paper that has
 * since come round did not write a friendlier story last month. The desk is the
 * most relevant one that is not already carrying more than its share of the
 * week. An item that already has a desk, or that no newspaper prints, is
 * returned unchanged.
 */
export function fileAtDesk(campaign, item) {
    return filed(campaign, item, weekLoad(campaign.feed, item.turn));
}
/** Several stories filed in one go, each counting the ones before it against the week's share. */
export function fileAtDesks(campaign, items) {
    const loads = new Map();
    return items.map((item) => {
        const load = loads.get(item.turn) ?? weekLoad(campaign.feed, item.turn);
        loads.set(item.turn, load);
        const result = filed(campaign, item, load);
        if (result.desk && result !== item)
            load.set(result.desk.outletId, (load.get(result.desk.outletId) ?? 0) + 1);
        return result;
    });
}
