import { US_ID, worldDataset } from "@admin/world";
import { administrationReach } from "./party.js";
// Opening city table, weekly drift and tax-holiday countdown, and the
// geography vote driver. Dataset rows are the founding snapshot; apply() is
// the only writer of live employment, holiday remaining, and US adminLean.
/** Signed US lean change is worth this much of a national vote. */
export const CITY_VOTE_LEVERAGE = 0.25;
/** Mean-reversion of US adminLean toward opening, per weekly turn. */
export const CITY_LEAN_DRIFT = 0.004;
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
/**
 * Opening signed lean toward the administration's caucus anchor. Foreign cities
 * have none. Anchored rather than presidential because how a city votes is a
 * fact about the city: the two tickets on its ballot are the same two whoever
 * won the presidency.
 */
export function openingAdminLean(city, caucusAnchor) {
    if (city.demShare === undefined)
        return undefined;
    const signed = caucusAnchor === "democrat" ? 2 * city.demShare - 1 : 1 - 2 * city.demShare;
    return round3(signed);
}
function seedCity(city, caucusAnchor) {
    const adminLean = openingAdminLean(city, caucusAnchor);
    return {
        base: city,
        employment: city.employment,
        taxBase: city.taxBase,
        taxHolidayTurns: 0,
        ...(adminLean === undefined ? {} : { adminLean }),
        ...(city.demShare === undefined ? {} : { demShare: city.demShare }),
    };
}
/**
 * Seed every dataset city. US rows get adminLean from the sealed anchor (or
 * `caucusAnchor` when founding has it before congress is on the object).
 */
export function openingCities(campaign, caucusAnchor) {
    const ticket = caucusAnchor ?? campaign.congress.caucusAnchor;
    const cities = {};
    for (const city of worldDataset.cities) {
        cities[city.id] = seedCity(city, ticket);
    }
    return cities;
}
export function selectCity(campaign, id) {
    return campaign.cities[id];
}
export function selectCitiesForNation(campaign, nation) {
    return Object.values(campaign.cities).filter((city) => city.base.nation === nation);
}
function popWeightedLean(cities, leanOf) {
    let mass = 0;
    let weighted = 0;
    for (const city of cities) {
        const lean = leanOf(city);
        if (lean === undefined)
            continue;
        weighted += lean * city.base.population;
        mass += city.base.population;
    }
    return mass === 0 ? 0 : weighted / mass;
}
/**
 * Population-weighted US lean change since founding, times leverage.
 * Opening lean is recomputed from dataset.demShare + the sealed anchor.
 *
 * Scaled by reach: the swing is measured on the partisan axis, and an
 * administration with no party banks less of a partisan swing than the party
 * that was on the ballot beneath it — including the swing it caused itself.
 */
export function selectUsCityVoteDriver(campaign) {
    const cities = selectCitiesForNation(campaign, US_ID);
    const anchor = campaign.congress.caucusAnchor;
    const current = popWeightedLean(cities, (city) => city.adminLean);
    const opening = popWeightedLean(cities, (city) => openingAdminLean(city.base, anchor));
    return ((current - opening) *
        CITY_VOTE_LEVERAGE *
        administrationReach(campaign.congress.administrationParty));
}
function cityWorldPacket(state, summary, effect) {
    return {
        source: "simulate",
        actor: "world",
        turn: state.turn,
        narration: { summary },
        effects: [effect],
    };
}
function holidayPackets(state) {
    const packets = [];
    for (const city of Object.values(state.cities)) {
        if (city.taxHolidayTurns <= 0)
            continue;
        const remaining = city.taxHolidayTurns - 1;
        const reason = `The ${city.base.name} tax holiday has ${remaining} weeks left.`;
        packets.push(cityWorldPacket(state, reason, {
            kind: "city",
            city: city.base.id,
            set: { taxHolidayTurns: remaining },
            reason,
        }));
    }
    return packets;
}
function leanDriftDelta(current, opening) {
    const distance = opening - current;
    if (distance === 0)
        return 0;
    const step = Math.sign(distance) * Math.min(CITY_LEAN_DRIFT, Math.abs(distance));
    return round3(step);
}
function driftPackets(state) {
    const packets = [];
    const anchor = state.congress.caucusAnchor;
    for (const city of Object.values(state.cities)) {
        if (city.adminLean === undefined)
            continue;
        const opening = openingAdminLean(city.base, anchor);
        if (opening === undefined)
            continue;
        const delta = leanDriftDelta(city.adminLean, opening);
        if (delta === 0)
            continue;
        const reason = `Partisan lean in ${city.base.name} drifts back toward the country's opening.`;
        packets.push(cityWorldPacket(state, reason, {
            kind: "city",
            city: city.base.id,
            deltas: { adminLean: delta },
            reason,
        }));
    }
    return packets;
}
export const cityPhase = (state) => [...holidayPackets(state), ...driftPackets(state)];
