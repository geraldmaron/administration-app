import { selectNation } from "@admin/engine";
function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}
function jobsVital(unemployment) {
    const stance = unemployment < 0.05 ? "favorable" : unemployment < 0.08 ? "neutral" : unemployment < 0.15 ? "caution" : "adverse";
    const word = { favorable: "Plenty of work", neutral: "Some people out of work", caution: "Work is scarce", adverse: "Work is very scarce" }[stance];
    return { key: "jobs", caption: "Jobs", word, stance };
}
function pricesVital(costOfLivingIndex) {
    const stance = costOfLivingIndex < 0.9 ? "favorable" : costOfLivingIndex < 1.1 ? "neutral" : costOfLivingIndex < 1.3 ? "caution" : "adverse";
    const word = { favorable: "Cheaper than the country", neutral: "About the national average", caution: "Costlier than the country", adverse: "Far costlier than the country" }[stance];
    return { key: "prices", caption: "Cost of living", word, stance };
}
function crimeVital(crimeIndex) {
    const stance = crimeIndex < 0.25 ? "favorable" : crimeIndex < 0.45 ? "neutral" : crimeIndex < 0.65 ? "caution" : "adverse";
    const word = { favorable: "Quiet", neutral: "Ordinary", caution: "Rising", adverse: "High" }[stance];
    return { key: "crime", caption: "Crime", word, stance };
}
/**
 * A state's pulse: its jobs, its prices and its crime, each the country's own
 * current figure carried through the state's authored deviation from it.
 * Undefined only where the campaign carries no live reading for the nation
 * this presidency governs, which does not happen in a founded campaign.
 */
export function stateVitals(campaign, stateId) {
    const nation = selectNation(campaign, campaign.founding.nation);
    const runtime = campaign.states[stateId];
    if (!nation || !runtime)
        return undefined;
    const anchor = runtime.base.character.vitalAnchor;
    const unemployment = clamp01(nation.stats.economy.unemployment + anchor.unemployment);
    const costOfLivingIndex = nation.stats.economy.costOfLiving * (1 + anchor.costOfLiving);
    const crimeIndex = clamp01(nation.stats.security.crimeIndex + anchor.crimeIndex);
    return [jobsVital(unemployment), pricesVital(costOfLivingIndex), crimeVital(crimeIndex)];
}
