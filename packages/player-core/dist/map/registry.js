import { neutralLens } from "./contract.js";
import { delegationWarmthLens } from "./lenses/congress-lens.js";
import { circuitsLens } from "./lenses/court-lenses.js";
import { deltaLens, weekLens } from "./lenses/delta-lens.js";
import { homesLens } from "./lenses/home-lens.js";
import { dependenceLens, jobsLens, outputLens, pricesLens } from "./lenses/economy-lenses.js";
import { houseHexLens, houseLens, senateLens, whipLens } from "./lenses/house.js";
import { governorLens } from "./lenses/governor-lens.js";
import { forcesLens, populationLens, relationsLens } from "./lenses/nation-lenses.js";
import { pressReachLens } from "./lenses/press-lens.js";
import { setLens } from "./lenses/set-lenses.js";
import { approvalLens, callLens, leanLens, statePopulationLens } from "./lenses/state-lenses.js";
import { tradeShareLens } from "./lenses/trade-share-lens.js";
import { worldReadingLens } from "./lenses/world-lenses.js";
import { conditionsLens } from "./lenses/conditions-lens.js";
import { shareDomainOf, shareLens } from "./lenses/share-lens.js";
/** Every lens id a directive may name. Anything else is the neutral lens. */
export const LENS_IDS = ["neutral", "approval", "delta", "lean", "call", "relations", "forces", "house", "house-hex", "senate", "press-reach", "population", "jobs", "prices", "output", "federal-dependence", "conditions", "governors", "state-population", "trade-share", "world-trend", "world-alignment"];
export function isLensId(id) {
    return id !== undefined && LENS_IDS.includes(id);
}
const LISTED = {
    neutral: () => neutralLens(),
    approval: (campaign, palette) => approvalLens(campaign, palette),
    delta: (campaign, palette, baseline) => deltaLens(baseline, campaign, palette),
    lean: (campaign, palette) => leanLens(campaign, palette),
    call: (campaign, palette) => callLens(campaign, palette),
    relations: (campaign, palette) => relationsLens(campaign, palette),
    forces: (campaign, palette) => forcesLens(campaign, palette),
    house: (campaign, palette) => houseLens(campaign, palette),
    "house-hex": (campaign, palette) => houseHexLens(campaign, palette),
    senate: (campaign, palette) => senateLens(campaign, palette),
    "press-reach": (campaign, palette) => pressReachLens(campaign, palette),
    population: (_campaign, palette) => populationLens(palette),
    jobs: (campaign, palette) => jobsLens(campaign, palette),
    prices: (campaign, palette) => pricesLens(campaign, palette),
    output: (campaign, palette) => outputLens(campaign, palette),
    "federal-dependence": (campaign, palette) => dependenceLens(campaign, palette),
    conditions: (campaign, palette) => conditionsLens(campaign, palette),
    governors: (campaign, palette) => governorLens(campaign, palette),
    "state-population": (campaign, palette) => statePopulationLens(campaign, palette),
    "trade-share": (campaign, palette) => tradeShareLens(campaign, palette),
    "world-trend": (campaign, palette) => worldReadingLens("trend", campaign, palette),
    "world-alignment": (campaign, palette) => worldReadingLens("alignment", campaign, palette),
};
/** The lenses whose id names their subject: a bill's whip count (`whip:<chamber>:<bill id>`), a set (`sides:`, `body:`, `parties:`), a ticket's homes and a closed week. */
function subjectLens(id, campaign, palette) {
    return whipLens(id, campaign, palette) ?? setLens(id, campaign, palette) ?? homesLens(id, palette) ?? weekLens(id, campaign, palette);
}
/**
 * The lens an id names, built over the campaign (or none, before a campaign
 * exists). The delta lens also reads the campaign before the last change. An
 * unknown id is neutral, never an error.
 */
export function resolveLens(id, campaign, palette, baseline = null) {
    if (id === undefined)
        return neutralLens();
    // A policy domain's share lens is one lens per domain, named `share-<domain>`.
    const shareDomain = shareDomainOf(id);
    if (shareDomain)
        return shareLens(shareDomain, palette);
    const subject = subjectLens(id, campaign, palette);
    if (subject)
        return subject;
    // Lenses a page chooses for its own map; they are not layers of a lens chooser, so they stay out of LENS_IDS.
    if (id === "circuits")
        return circuitsLens(campaign, palette);
    if (id === "delegation-warmth")
        return delegationWarmthLens(campaign, palette);
    return isLensId(id) ? LISTED[id](campaign, palette, baseline) : neutralLens();
}
/** The lenses a page chooses for its own map, outside the screen-wide list. */
export const PAGE_LENS_IDS = ["circuits", "delegation-warmth"];
