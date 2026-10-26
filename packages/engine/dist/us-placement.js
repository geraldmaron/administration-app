import { CITY_TORNADOES_PER_YEAR, HAZARD_EXPOSURE_FLOOR, STATE_DISASTER_ELIGIBILITY, STATE_HAZARD_EXPOSURE, } from "@admin/world";
import { scopePhrase } from "./condition-impacts.js";
// Where a domestic condition lands. conditions.ts decides whether and what
// opens; this decides where, below the nation, in a city or a state, and which
// states a nationwide one actually reaches.
//
// Inside the eligibility gate a hazard lands where the record says it lands
// (`STATE_HAZARD_EXPOSURE`), not where people live: a population weight put one
// city-scope tornado in ten in New York City, which has seen ten tornadoes in
// thirty years. Heat and disease fall on people, so those two still read
// population, and so does every kind no hazard table describes.
// Hurricane landfall is coastal. Tulsa is in Oklahoma and Nashville is in
// Tennessee; Arkansas, Kentucky and Missouri are the same inland set. The
// dataset omits them. This filter keeps a hurricane out of those states when
// a build of the table still names them.
const NO_HURRICANE_LANDFALL = new Set(["AR", "KY", "MO", "OK", "TN"]);
function isHazard(kind) {
    return kind in STATE_DISASTER_ELIGIBILITY;
}
/**
 * Which states a condition of this kind may land in. Only a natural hazard is
 * gated, against the eligibility table, which is non-empty per kind; a standing
 * condition or a home event (a strike, an attack) is political or economic and
 * any state can be in one.
 */
function eligibleStates(kind) {
    if (!isHazard(kind))
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
/** Events a year this kind brings to this state, or undefined when no hazard table describes the kind. */
function recordedRate(kind, state) {
    if (!isHazard(kind))
        return undefined;
    const table = STATE_HAZARD_EXPOSURE[kind];
    if (!table)
        return undefined;
    return (table[state] ?? 0) + (HAZARD_EXPOSURE_FLOOR[kind] ?? 0);
}
/** How strongly a state draws this kind: its recorded rate, its people where no record applies, and evenly for drought. */
function stateWeight(kind, state) {
    const recorded = recordedRate(kind, state.base.id);
    if (recorded !== undefined)
        return recorded;
    return kind === "drought" ? 1 : state.population;
}
/**
 * How strongly a city draws a city-scope event. A tornado reads its own
 * touchdown record near the city; any other recorded hazard takes its state's
 * rate shared among that state's cities by population; everything else reads
 * population alone.
 */
function cityWeights(kind, cities) {
    if (kind === "tornado")
        return (city) => CITY_TORNADOES_PER_YEAR[city.base.id] ?? (HAZARD_EXPOSURE_FLOOR.tornado ?? 0);
    if (!isHazard(kind) || !STATE_HAZARD_EXPOSURE[kind])
        return (city) => city.base.population;
    const peopleByState = new Map();
    for (const city of cities) {
        const state = city.base.state;
        if (state)
            peopleByState.set(state, (peopleByState.get(state) ?? 0) + city.base.population);
    }
    return (city) => {
        const state = city.base.state;
        if (!state)
            return 0;
        return (recordedRate(kind, state) ?? 0) * (city.base.population / Math.max(1, peopleByState.get(state) ?? 0));
    };
}
function placeableCities(campaign, kind, eligible) {
    return byId(Object.values(campaign.cities).filter((city) => city.base.nation === "USA" &&
        city.base.state &&
        (!eligible || eligible.has(city.base.state)) &&
        cityEligible(kind, city.base)));
}
export function placeUsOnset(campaign, nation, kind, scope, roll) {
    if (nation !== "USA")
        return {};
    const eligible = eligibleStates(kind);
    const cities = placeableCities(campaign, kind, eligible);
    const states = byId(Object.values(campaign.states).filter((state) => !eligible || eligible.has(state.base.id)));
    if (cities.length === 0 || states.length === 0)
        return {};
    if (scope === "city") {
        const city = pickWeighted(cities, cityWeights(kind, cities), roll);
        return { city: city.base.id, state: city.base.state };
    }
    if (scope === "region") {
        const state = pickWeighted(states, (entry) => stateWeight(kind, entry), roll);
        return { state: state.base.id };
    }
    return {};
}
/**
 * The states a nationwide condition actually reaches.
 *
 * A nation-scope hazard names no single place, and reading that as all
 * fifty-one states filed a governor's request from Alaska for a heat wave. The
 * reach is the eligible states of one Census region, the region drawn through
 * the same weights a regional event uses, so a nationwide hurricane season is
 * the Gulf and Atlantic South and a nationwide heat wave is one region's
 * summer. Disease is the exception the gate already states: every state is
 * eligible for an epidemic, and a nationwide one is everywhere. A kind with no
 * geography (a recession, a strike) reaches the whole country.
 */
export function nationFootprint(campaign, kind, roll) {
    const eligible = eligibleStates(kind);
    const states = byId(Object.values(campaign.states).filter((state) => !eligible || eligible.has(state.base.id)));
    if (states.length === 0)
        return [];
    if (!isHazard(kind) || kind === "pandemic")
        return states.map((state) => state.base.id);
    const epicenter = pickWeighted(states, (entry) => stateWeight(kind, entry), roll);
    return states.filter((state) => state.base.region === epicenter.base.region).map((state) => state.base.id);
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
