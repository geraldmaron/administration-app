import { STATE_DISASTER_ELIGIBILITY } from "@admin/world";
import { isStandingCondition } from "./condition-kinds.js";
import { scopePhrase } from "./condition-impacts.js";
// Where a domestic condition lands. conditions.ts decides whether and what
// opens; this decides where, below the nation, in a city or a state. City
// and region rolls are weighted by population.
// Hurricane landfall is coastal. Tulsa is in Oklahoma and Nashville is in
// Tennessee; Arkansas, Kentucky and Missouri are the same inland set. The
// dataset omits them. This filter keeps a hurricane out of those states when
// a build of the table still names them.
const NO_HURRICANE_LANDFALL = new Set(["AR", "KY", "MO", "OK", "TN"]);
/**
 * Which states a condition of this kind may land in. A standing condition
 * (unrest, recession, and the rest) is political or economic, not geographic,
 * so any state can be in one. Only an acute kind is gated, against the
 * eligibility table. That table is non-empty per kind.
 */
function eligibleStates(kind) {
    if (isStandingCondition(kind))
        return undefined;
    const listed = STATE_DISASTER_ELIGIBILITY[kind];
    if (kind !== "cyclone")
        return new Set(listed);
    return new Set(listed.filter((state) => !NO_HURRICANE_LANDFALL.has(state)));
}
/**
 * Which cities inside an eligible state a kind may actually land in.
 *
 * The state list is a gate on the state, and a state is a big place: Georgia is
 * hurricane country and Atlanta is two hundred miles inland, Texas is hurricane
 * country and Dallas is four hundred. A landfall is coastal, so at city scope a
 * hurricane may only take a port — which is the dataset's own word for a city on
 * the water, and the reason this filter needs no second table beside the states'.
 *
 * Every other kind takes any city in an eligible state: a tornado, a fire, a
 * freeze and an outbreak are not choosy about the coast.
 */
function cityEligible(kind, city) {
    return kind !== "cyclone" || city.kind === "port";
}
function byId(items) {
    return [...items].sort((left, right) => (left.base.id < right.base.id ? -1 : left.base.id > right.base.id ? 1 : 0));
}
/**
 * One item drawn in proportion to its weight off a roll in [0, 1). Negative
 * weights count as nothing, and a list whose weights are all nothing is drawn
 * evenly rather than refused, so a caller with no signal still gets a pick.
 */
export function pickWeighted(items, weightOf, roll) {
    const weights = items.map((item) => Math.max(0, weightOf(item)));
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const bounded = Math.min(1, Math.max(0, roll));
    if (total <= 0)
        return items[Math.min(items.length - 1, Math.floor(bounded * items.length))];
    const target = bounded * total;
    let cursor = 0;
    for (let index = 0; index < items.length; index += 1) {
        cursor += weights[index];
        if (weights[index] > 0 && cursor >= target)
            return items[index];
    }
    return items[items.length - 1];
}
export function placeUsOnset(campaign, nation, kind, scope, roll) {
    if (nation !== "USA")
        return {};
    const eligible = eligibleStates(kind);
    const cities = byId(Object.values(campaign.cities).filter((city) => city.base.nation === "USA" &&
        city.base.state &&
        (!eligible || eligible.has(city.base.state)) &&
        cityEligible(kind, city.base)));
    const states = byId(Object.values(campaign.states).filter((state) => !eligible || eligible.has(state.base.id)));
    if (cities.length === 0 || states.length === 0)
        return {};
    if (scope === "city") {
        const city = pickWeighted(cities, (entry) => entry.base.population, roll);
        return { city: city.base.id, state: city.base.state };
    }
    if (scope === "region") {
        const state = pickWeighted(states, (entry) => entry.population, roll);
        return { state: state.base.id };
    }
    return {};
}
export function placeCaption(campaign, place, scope, population) {
    const city = place.city ? campaign.cities[place.city]?.base.name : undefined;
    const state = place.state ? campaign.states[place.state]?.base.name : undefined;
    if (city && state)
        return `in ${city}, ${state}`;
    if (state)
        return `in ${state}`;
    return scopePhrase(scope, population);
}
