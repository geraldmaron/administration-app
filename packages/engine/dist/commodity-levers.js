import { addDays } from "./clock.js";
import { marketQuote } from "./commodities.js";
import { commodityShocks, reserveReleasing } from "./commodity-shocks.js";
import { fuelWaiverStanding, oathPumpPrice, selectPumpPrice } from "./household-prices.js";
import { emptyMarkets } from "./markets.js";
// The two levers a President has on the price of fuel inside a term: drawing
// down the Strategic Petroleum Reserve, which adds barrels to the world market
// for half a year, and an emergency fuel waiver, which takes a few cents off
// the part of a gallon that is not crude. Neither writes a price. The release
// is a supply shock the kernel prices like any other; the waiver is read by the
// pump price. Each is refused where the law that grants it does not reach.
/** Planning value: a drawdown sells this share of the reserve's opening fill, over `RELEASE_WEEKS`. */
export const RELEASE_DRAW = 0.45;
/** Planning value: how long a drawdown's barrels flow. */
export const RELEASE_WEEKS = 26;
/** Planning value: how long an emergency fuel waiver stands. */
export const WAIVER_WEEKS = 20;
/** Planning value: how far crude must stand above where buyers expect it before a supply interruption is severe enough to find. */
export const SEVERE_INTERRUPTION = 0.1;
/** Planning value: the standing an emergency fuel waiver spends against the objection it draws. */
const WAIVER_STANDING_COST = 0.005;
/** Whether the world crude market is in a supply interruption the law recognizes: a standing shock, or crude well above its norm. */
export function severeInterruption(campaign) {
    const quote = marketQuote(campaign, "crude");
    const shocked = commodityShocks(campaign, "crude").some((shock) => shock.loss > 0);
    return shocked || quote.index >= quote.norm * (1 + SEVERE_INTERRUPTION);
}
function reserveFill(campaign) {
    return campaign.markets?.reserve?.fill ?? 1;
}
/** What a drawdown of the Strategic Petroleum Reserve would do, before it is ordered. */
export function projectReserveRelease(campaign) {
    if (reserveReleasing(campaign))
        return { ok: false, reason: "A drawdown is already flowing. The reserve cannot sell the same barrels twice." };
    if (reserveFill(campaign) < RELEASE_DRAW)
        return { ok: false, reason: "The reserve is too low for another full drawdown; refilling it takes an appropriation and years." };
    if (!severeInterruption(campaign)) {
        return { ok: false, reason: "A full drawdown needs a finding of a severe energy supply interruption, and crude is where buyers expect it." };
    }
    const left = Math.round((reserveFill(campaign) - RELEASE_DRAW) * 100);
    return {
        ok: true,
        cost: {},
        risks: [{ id: "reserve-depleted", chance: 1, description: `The reserve is drawn to ${left}% of its opening fill, and a later shock finds less of it.` }],
        until: addDays(campaign.calendar, RELEASE_WEEKS * 7),
    };
}
function withMarkets(campaign, patch) {
    return { ...(campaign.markets ?? emptyMarkets()), ...patch };
}
/** Order a drawdown of the Strategic Petroleum Reserve. */
export function releaseStrategicReserve(campaign) {
    const projection = projectReserveRelease(campaign);
    if (!projection.ok)
        return projection;
    const reserve = { fill: Math.round((reserveFill(campaign) - RELEASE_DRAW) * 1000) / 1000, release: { from: campaign.calendar, until: projection.until } };
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", systems: ["markets"], entities: ["INST-DOE"] },
            narration: { summary: "The President orders a drawdown of the Strategic Petroleum Reserve." },
            effects: [
                { kind: "markets", set: withMarkets(campaign, { reserve }) },
                {
                    kind: "feed",
                    items: [
                        {
                            turn: campaign.turn,
                            kind: "press",
                            visibility: "public",
                            headline: "The President orders oil released from the Strategic Petroleum Reserve.",
                            facts: { subject: "the Strategic Petroleum Reserve", topicTags: ["markets", "energy"], sceneFacet: { kind: "economy" } },
                        },
                    ],
                },
            ],
        },
    };
}
/** What an emergency fuel waiver would do, before it is issued. */
export function projectFuelWaiver(campaign) {
    if (fuelWaiverStanding(campaign))
        return { ok: false, reason: "An emergency fuel waiver is already in force." };
    if (selectPumpPrice(campaign) < oathPumpPrice() * (1 + SEVERE_INTERRUPTION) && !severeInterruption(campaign)) {
        return { ok: false, reason: "The waiver answers an emergency fuel shortage, and the pump is near where it stood at the oath." };
    }
    return {
        ok: true,
        cost: { standing: -WAIVER_STANDING_COST },
        risks: [{ id: "waiver-objection", chance: 1, description: `Clean-air groups object, and the waiver lapses after ${WAIVER_WEEKS} weeks.` }],
        until: addDays(campaign.calendar, WAIVER_WEEKS * 7),
    };
}
/** Issue an emergency fuel waiver. */
export function issueFuelWaiver(campaign) {
    const projection = projectFuelWaiver(campaign);
    if (!projection.ok)
        return projection;
    return {
        ok: true,
        packet: {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            provenance: { origin: "decision", systems: ["markets"], entities: ["INST-EPA"] },
            narration: { summary: "The administration issues an emergency fuel waiver." },
            effects: [
                { kind: "markets", set: withMarkets(campaign, { fuelWaiver: { until: projection.until } }) },
                { kind: "metric", deltas: projection.cost },
                {
                    kind: "feed",
                    items: [
                        {
                            turn: campaign.turn,
                            kind: "press",
                            visibility: "public",
                            headline: "The administration waives summer fuel rules to bring the pump price down.",
                            facts: { subject: "the pump price", topicTags: ["markets", "energy"], sceneFacet: { kind: "economy" } },
                        },
                    ],
                },
            ],
        },
    };
}
