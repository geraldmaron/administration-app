import { debtToGdp } from "@admin/world";
import { shockEffect } from "./external-shocks.js";
import { emptyMarkets } from "./markets.js";
import { booksFor } from "./national-books.js";
import { createRngStreams } from "./rng.js";
import { DEFAULTS_WINDOW } from "./state-world.js";
import { noiseFrom, stampOf, weigh } from "./willingness.js";
/**
 * Planning values: how far a government's real interest bill, as a share of
 * output, can climb past where it stood at the founding before it is under
 * stress, by its rating now. No opened source gives a stress line; these follow
 * the order of the ratings and nothing more. Measured against the government's
 * own opening bill, so no government opens under stress: a default is
 * something a term does to a country, not something the dataset hands it.
 */
export const STRESS_MARGIN = {
    AAA: 0.04,
    AA: 0.035,
    A: 0.03,
    BBB: 0.025,
    BB: 0.02,
    B: 0.015,
    CCC: 0.01,
    D: 0.005,
};
/** Planning value: the share of the stock creditors write off in a default. */
export const DEFAULT_HAIRCUT = 0.3;
/** Planning value: the annual growth a default takes off its own economy while the shock stands. */
export const DEFAULT_GROWTH_HIT = -0.03;
/** Planning value: how long after a default a government cannot default again. */
export const DEFAULT_RESPITE_WEEKS = 208;
/**
 * Planning values: how long after a default the agencies re-rate a government
 * out of "D" once its restructuring is done, and the letter they give it. A
 * year for the exchange and the re-rating; the letter is the bottom of the
 * rated scale, because a government fresh out of a haircut is not an
 * investment-grade credit. Neither figure is sourced.
 */
export const DEFAULT_RERATE_WEEKS = 52;
export const RERATED_AFTER_DEFAULT = "CCC";
/** Planning values: the weighing's threshold and the half-width of the week's noise. */
export const DEFAULT_THRESHOLD = 1;
export const DEFAULT_NOISE = 0.5;
/** Planning values: how hard each term pushes: a point of output over the line, and a regime near collapse. */
const BURDEN_WEIGHT = 40;
const DESTABILIZED_WEIGHT = 0.6;
const SURVIVAL_WEIGHT = 0.4;
/** The real interest bill as a share of output: the books' effective rate net of expected inflation, on the stock. */
export function realInterestShare(campaign, runtime) {
    const books = booksFor(campaign, runtime);
    // The same expectation the books were anchored on, so a government at its opening reads exactly its opening bill.
    const expected = campaign.macro?.[runtime.base.id]?.expectedInflation ?? runtime.base.stats.economy.inflation;
    return realBill(books.rates.effective - expected, debtToGdp(runtime.stats));
}
/**
 * A real rate below zero is no bill: inflation is paying the debt down. Read
 * signed, the bill of a government at 200% inflation rose every week its prices
 * eroded the stock, so the erosion itself read as stress and high-inflation
 * governments defaulted in a world at rest, most of them in its first weeks.
 */
function realBill(realRate, ratio) {
    return Math.max(0, realRate) * ratio;
}
function openingRealInterestShare(campaign, runtime) {
    const anchor = booksFor(campaign, runtime).anchor;
    return realBill(anchor.rate - anchor.expectedInflation, debtToGdp(runtime.base.stats));
}
/** How far a government's real interest bill runs past its opening one and its rating's margin; zero or less is no stress. */
export function debtStress(campaign, runtime) {
    return realInterestShare(campaign, runtime) - openingRealInterestShare(campaign, runtime) - STRESS_MARGIN[runtime.stats.economy.sovereignRating];
}
const round4 = (value) => Math.round(value * 10_000) / 10_000;
function defaultTerms(campaign, runtime) {
    const politics = runtime.stats.politics;
    return [
        { key: "debt-burden", source: "situation", value: round4(BURDEN_WEIGHT * debtStress(campaign, runtime)) },
        { key: "destabilized", source: "situation", value: round4(DESTABILIZED_WEIGHT * (1 - politics.regimeStability)) },
        { key: "regime-survival", source: "situation", value: round4(SURVIVAL_WEIGHT * (1 - politics.legitimacy)) },
    ];
}
function recentlyDefaulted(campaign, nation) {
    return (campaign.markets?.defaults ?? []).some((entry) => entry.nation === nation && campaign.turn - entry.turn < DEFAULT_RESPITE_WEEKS);
}
/** This week's weighing for one government, or nothing where it is not under stress or has just defaulted. */
export function weighDefault(campaign, runtime) {
    const nation = runtime.base.id;
    if (nation === campaign.founding.nation || recentlyDefaulted(campaign, nation) || debtStress(campaign, runtime) <= 0)
        return undefined;
    const draw = createRngStreams(campaign.seed).stream("default", nation, campaign.turn).next();
    return weigh("default-hazard", defaultTerms(campaign, runtime), { threshold: DEFAULT_THRESHOLD, noiseBound: DEFAULT_NOISE, noise: noiseFrom(draw, DEFAULT_NOISE) });
}
function defaultPacket(campaign, runtime, willingness, recorded) {
    const nation = runtime.base.id;
    const name = runtime.base.identity.name;
    const haircut = `${Math.round(DEFAULT_HAIRCUT * 100)}%`;
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        provenance: { origin: "world", systems: ["fiscal", "markets"], entities: [nation], decision: stampOf(willingness, nation, "default", "public") },
        narration: { summary: `${name} stops paying its creditors.` },
        effects: [
            { kind: "nationStat", nation, setStats: { economy: { debt: Math.round(runtime.stats.economy.debt * (1 - DEFAULT_HAIRCUT)), sovereignRating: "D" } } },
            shockEffect(campaign, nation, "default", { growth: DEFAULT_GROWTH_HIT }),
            { kind: "markets", set: { ...(campaign.markets ?? emptyMarkets()), defaults: recorded } },
            {
                kind: "feed",
                items: [
                    {
                        turn: campaign.turn + 1,
                        kind: "governance",
                        visibility: "public",
                        headline: `${name} defaults on its debt; creditors face a ${haircut} haircut.`,
                        target: nation,
                        facts: { subject: name, figure: haircut, topicTags: ["markets", "debt"], sceneFacet: { kind: "economy" } },
                    },
                ],
            },
        ],
    };
}
/** The government's latest default on record, where one is still kept. */
function lastDefault(campaign, nation) {
    return (campaign.markets?.defaults ?? []).filter((entry) => entry.nation === nation).at(-1);
}
/**
 * The re-rating a restructured government earns. Only a default this campaign
 * recorded is re-rated: a government the dataset opens in default has not
 * restructured on the record, and nothing here claims it has.
 */
function reratePacket(campaign, runtime) {
    const nation = runtime.base.id;
    const last = lastDefault(campaign, nation);
    if (runtime.stats.economy.sovereignRating !== "D" || !last || campaign.turn - last.turn < DEFAULT_RERATE_WEEKS)
        return undefined;
    const name = runtime.base.identity.name;
    return {
        source: "simulate",
        actor: "world",
        turn: campaign.turn,
        provenance: { origin: "world", systems: ["fiscal", "markets"], entities: [nation] },
        narration: { summary: `${name} is re-rated after its restructuring.` },
        effects: [
            { kind: "nationStat", nation, setStats: { economy: { sovereignRating: RERATED_AFTER_DEFAULT } } },
            {
                kind: "feed",
                items: [
                    {
                        turn: campaign.turn + 1,
                        kind: "governance",
                        visibility: "public",
                        headline: `${name} is re-rated ${RERATED_AFTER_DEFAULT} after restructuring its debt.`,
                        target: nation,
                        facts: { subject: name, figure: RERATED_AFTER_DEFAULT, topicTags: ["markets", "debt"], sceneFacet: { kind: "economy" } },
                    },
                ],
            },
        ],
    };
}
/** The week's defaults abroad: every government under stress weighed, each that tips over defaulting, and each restructured one re-rated. */
export const defaultPhase = (state) => {
    const ids = Object.keys(state.nations).sort((a, b) => a.localeCompare(b));
    const packets = [];
    let recorded = state.markets?.defaults ?? [];
    for (const id of ids) {
        const runtime = state.nations[id];
        const rerated = runtime ? reratePacket(state, runtime) : undefined;
        if (rerated)
            packets.push(rerated);
        const willingness = runtime ? weighDefault(state, runtime) : undefined;
        if (!runtime || !willingness?.acts)
            continue;
        recorded = [...recorded, { nation: id, turn: state.turn, haircut: DEFAULT_HAIRCUT }].slice(-DEFAULTS_WINDOW);
        packets.push(defaultPacket(state, runtime, willingness, recorded));
    }
    return packets;
};
