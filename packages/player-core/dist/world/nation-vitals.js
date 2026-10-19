import { hasIntelOnNation, selectConditionsFor } from "@admin/engine";
import { stanceForRatio } from "../format/figures";
import { statDefinition } from "./stat-definition";
const LEVEL = { adverse: 1, caution: 2, neutral: 3, favorable: 4 };
function band(key, caption, stance, word, path) {
    return { key, caption, word, stance, level: LEVEL[stance], ...(path ? { definition: statDefinition(path) } : {}) };
}
function economyVital(growth) {
    const stance = growth < 0 ? "adverse" : growth < 0.015 ? "caution" : growth < 0.04 ? "neutral" : "favorable";
    const word = { adverse: "Shrinking", caution: "Stalling", neutral: "Growing", favorable: "Growing fast" }[stance];
    return band("economy", "Economy", stance, word, "economy.growth");
}
function pricesVital(inflation) {
    if (inflation < -0.005)
        return band("prices", "Prices", "caution", "Falling", "economy.inflation");
    const stance = inflation <= 0.03 ? "favorable" : inflation <= 0.06 ? "neutral" : inflation <= 0.15 ? "caution" : "adverse";
    const word = { favorable: "Steady", neutral: "Rising", caution: "Rising fast", adverse: "Out of control" }[stance];
    return band("prices", "Prices", stance, word, "economy.inflation");
}
function jobsVital(unemployment) {
    const stance = unemployment < 0.05 ? "favorable" : unemployment < 0.08 ? "neutral" : unemployment < 0.15 ? "caution" : "adverse";
    const word = { favorable: "Plenty of work", neutral: "Some people out of work", caution: "Work is scarce", adverse: "Work is very scarce" }[stance];
    return band("jobs", "Jobs", stance, word, "economy.unemployment");
}
function orderVital(campaign, nation, stability) {
    if (!hasIntelOnNation(campaign, nation))
        return { key: "order", caption: "Leaders' grip on power", word: "Unread", unread: true };
    const stance = stanceForRatio(stability);
    const word = { favorable: "Firm", neutral: "Holding", caution: "Shaky", adverse: "Failing" }[stance];
    return band("order", "Leaders' grip on power", stance, word, "politics.regimeStability");
}
const plain = (kind) => {
    const words = kind.replace(/-/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
};
/** The condition a country is living through that its file leads with: the newest, the worst on a tie. */
export function leadingCondition(campaign, nation) {
    return [...selectConditionsFor(campaign, nation)].sort((a, b) => b.startedTurn - a.startedTurn || b.severity - a.severity || a.id.localeCompare(b.id))[0];
}
function livingVital(campaign, nation) {
    const live = leadingCondition(campaign, nation);
    if (!live)
        return { key: "living", caption: "Trouble at home", word: "Nothing reported", stance: "favorable", level: 4 };
    const stance = live.severity >= 0.66 ? "adverse" : live.severity >= 0.33 ? "caution" : "neutral";
    const beat = live.beats.at(-1)?.description;
    return { key: "living", caption: "Trouble at home", word: plain(live.kind), stance, level: LEVEL[stance], ...(beat ? { line: beat } : {}) };
}
/** A foreign country's vitals, in the order its file reads them; empty for the player's own or an unknown id. */
export function nationVitals(campaign, nation) {
    const runtime = campaign.nations[nation];
    if (!runtime || nation === campaign.founding.nation)
        return [];
    const { economy, politics } = runtime.stats;
    return [
        economyVital(economy.growth),
        pricesVital(economy.inflation),
        jobsVital(economy.unemployment),
        orderVital(campaign, nation, politics.regimeStability),
        livingVital(campaign, nation),
    ];
}
