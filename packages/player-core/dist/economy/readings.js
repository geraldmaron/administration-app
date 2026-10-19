import { ECONOMIC_PAIN, NO_CYCLE, OPINION_CAUSE_LABELS, opinionCausesFor, selectNation } from "@admin/engine";
import { MACRO_ANCHORS } from "@admin/world";
import { place } from "../navigation/places";
const CAPTIONS = {
    inflation: "Inflation",
    unemployment: "Unemployment",
    growth: "Growth",
};
/** A tenth of a point: the precision every one of these figures is published to. */
const VISIBLE_MOVE = 0.0005;
const oneDecimal = (value) => (Math.round(value * 1000) / 10).toFixed(1);
function formatRate(key, value) {
    if (key === "growth")
        return `${value > 0 ? "+" : value < 0 ? "−" : ""}${oneDecimal(Math.abs(value))}%`;
    return `${oneDecimal(value)}%`;
}
/**
 * Prices and joblessness are read against where the term began, on the same
 * lines the public's own salience uses (`ECONOMIC_PAIN`): the tile turns red
 * exactly when the week is about it. Half that distance is the amber.
 */
function hardshipBand(key, moved) {
    const pain = ECONOMIC_PAIN[key];
    if (moved >= pain)
        return { stance: "adverse", word: key === "inflation" ? "Biting" : "Hurting" };
    if (moved >= pain / 2)
        return { stance: "caution", word: "Rising" };
    if (moved <= -pain / 2)
        return { stance: "favorable", word: key === "inflation" ? "Easing" : "Falling" };
    return { stance: "neutral", word: "Fair" };
}
function growthBand(now, start) {
    if (now < 0)
        return { stance: "adverse", word: "Shrinking" };
    if (now < start - 0.01)
        return { stance: "caution", word: "Slowing" };
    if (now > start + 0.005)
        return { stance: "favorable", word: "Picking up" };
    return { stance: "neutral", word: "Fair" };
}
function changeOf(key, moved) {
    if (Math.abs(moved) < VISIBLE_MOVE)
        return undefined;
    const up = moved > 0;
    return { text: `${up ? "+" : "−"}${oneDecimal(Math.abs(moved))} pts`, up, better: key === "growth" ? up : !up };
}
/**
 * Prices, jobs and growth as they stand this week, each read against the
 * economy the term began on. There is no stored economic history yet, so the
 * sparkline is honest about what it knows: where the term started and now.
 */
export function economyTiles(campaign) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    if (!runtime)
        return [];
    const now = runtime.stats.economy;
    const start = runtime.base.stats.economy;
    return ["inflation", "unemployment", "growth"].map((key) => {
        const moved = now[key] - start[key];
        const band = key === "growth" ? growthBand(now[key], start[key]) : hardshipBand(key, moved);
        const change = changeOf(key, moved);
        return {
            key,
            caption: CAPTIONS[key],
            figure: formatRate(key, now[key]),
            stance: band.stance,
            // "Steady" beside a printed "+0.3 pts" reads as a contradiction; a visible move inside the quiet band is little changed, not unchanged.
            stanceWord: band.stance === "neutral" && change ? "Little changed" : band.word,
            series: [start[key], now[key]],
            href: place.metric(key),
            ...(change ? { change } : {}),
        };
    });
}
export function isEconomyTileKey(id) {
    return id in CAPTIONS;
}
const SOURCE_NAMES = { wdi: "World Bank", bea: "BEA", bls: "BLS" };
/** The prosperity terms each rate owns: inflation owns both the pace of prices and where they have got to. */
const APPROVAL_TERMS = {
    inflation: ["inflation", "prices"],
    unemployment: ["unemployment"],
    growth: ["growth"],
};
export function economyReading(campaign, key) {
    const runtime = selectNation(campaign, campaign.founding.nation);
    const tile = economyTiles(campaign).find((entry) => entry.key === key);
    if (!runtime || !tile)
        return undefined;
    const anchor = MACRO_ANCHORS[campaign.founding.nation]?.[key];
    const causes = opinionCausesFor(campaign, "prosperity");
    return {
        tile,
        startFigure: formatRate(key, runtime.base.stats.economy[key]),
        ...(anchor ? { rest: { figure: formatRate(key, anchor.value), percent: Math.round(anchor.value * 1000) / 10, source: SOURCE_NAMES[anchor.source], year: anchor.year } } : {}),
        cycle: (campaign.cycles[campaign.founding.nation] ?? NO_CYCLE).phase,
        approval: APPROVAL_TERMS[key].flatMap((term) => {
            const cause = causes.find((entry) => entry.key === term);
            return cause ? [{ label: OPINION_CAUSE_LABELS[term], points: Math.round(cause.contribution * 1000) / 10, detail: cause.detail }] : [];
        }),
    };
}
// The markets readings live beside this module and reach the package barrel
// through it, so the integrator-held index needs no new line.
export * from "./markets";
export * from "./market-releases";
export * from "./market-levers";
export * from "./lever-comparison";
export * from "./state-economy";
