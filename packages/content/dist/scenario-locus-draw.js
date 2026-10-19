import { ACUTE_CONDITIONS, createRngStreams, pickWeighted } from "@admin/engine";
import { SECTOR_AXIS, STATE_DISASTER_ELIGIBILITY, stateById, worldCities, } from "@admin/world";
// Only the topics that name an industry. The rest (fiscal, labor, trade,
// health and so on) happen in every state's economy, and reading an axis into
// them would be a guess the dataset cannot back.
const TOPIC_AXIS = {
    energy: "energy",
    tech: "tech",
    war: "defense",
};
// Pandemic is eligible everywhere, so it says nothing about where.
const PLACED_ACUTE = new Set(ACUTE_CONDITIONS.filter((kind) => kind !== "pandemic"));
export function stateFit(def) {
    const axes = new Set();
    if (def.locus.sector)
        axes.add(SECTOR_AXIS[def.locus.sector]);
    for (const topic of def.topics ?? []) {
        const axis = TOPIC_AXIS[topic];
        if (axis)
            axes.add(axis);
    }
    const acute = new Set();
    for (const condition of def.conditions) {
        if (condition.kind === "conditionActive" && condition.condition && PLACED_ACUTE.has(condition.condition)) {
            acute.add(condition.condition);
        }
    }
    const hazard = def.class === "disaster" || (def.topics ?? []).includes("disaster");
    return { axes: [...axes].sort(), hazard, acute: [...acute].sort() };
}
/** How many kinds of placed disaster the eligibility table lets strike this state. */
function exposure(state) {
    return [...PLACED_ACUTE].filter((kind) => STATE_DISASTER_ELIGIBILITY[kind].includes(state)).length;
}
function eligible(state, acute) {
    return acute.every((kind) => STATE_DISASTER_ELIGIBILITY[kind].includes(state));
}
export function stateWeight(state, fit) {
    if (!eligible(state.id, fit.acute))
        return 0;
    const economy = state.character.economy;
    const axis = fit.axes.length === 0 ? 1 : fit.axes.reduce((sum, name) => sum + economy[name], 0) / fit.axes.length;
    const hazard = fit.hazard ? exposure(state.id) : 1;
    return Math.sqrt(state.population) * axis * hazard;
}
/**
 * The state a home scenario that names none is about, from the campaign seed
 * and the scenario id, over the states with a city of the site's kind,
 * weighted by fit. Keyed on the scenario and not the turn, on its own stream,
 * so the same scenario in the same campaign is always about the same state and
 * this draw moves no other. Reads the dataset's authored states rather than the
 * campaign's runtime ones for the same reason: a weight that drifted week to
 * week would move a scenario between states mid-campaign.
 */
export function seededState(campaign, def, fits, availableStates) {
    const seen = Object.values(campaign.cases ?? {}).filter((item) => item.story?.place);
    const pinned = seen.find((item) => item.story?.scenario === def.id)?.story?.place?.state;
    if (pinned)
        return pinned;
    const uses = new Map();
    for (const item of seen) {
        const state = item.story.place.state;
        uses.set(state, (uses.get(state) ?? 0) + 1);
    }
    const candidates = [
        ...(availableStates ?? new Set(worldCities.filter((city) => city.state !== undefined && city.state !== "DC" && fits(city)).map((city) => city.state))),
    ]
        .sort()
        .map((id) => stateById.get(id))
        .filter((state) => state !== undefined);
    if (candidates.length === 0)
        return undefined;
    const fit = stateFit(def);
    // A gate the dataset says no candidate can meet is not a reason to place the
    // scenario nowhere: the scenario is still live, so it is weighted without it.
    const gated = candidates.some((state) => stateWeight(state, fit) > 0) ? fit : { ...fit, acute: [] };
    const roll = createRngStreams(campaign.seed).stream("locus-state", def.id).next();
    return pickWeighted(candidates, (state) => stateWeight(state, gated) / (1 + (uses.get(state.id) ?? 0)), roll).id;
}
