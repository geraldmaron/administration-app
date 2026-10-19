// How often the country the player governs is actually struck, and where.
//
// The rate is the whole of this workstream's contact with balance, so it is
// measured here rather than asserted: a year of condition phases on each of the
// three harness Presidents, counting what opened at home. The world's own rate
// is measured in the same run and must not have moved, because the home rate is
// a separate constant and a change that reached the other fifty countries would
// be a change nobody asked for.
import { describe, expect, it } from "vitest";
import { STATE_DISASTER_ELIGIBILITY } from "@admin/world";
import { addDays } from "./clock.js";
import { ACUTE_CONDITIONS, isIncidentKind } from "./condition-kinds.js";
import { HOME_DISASTER_ONSET_RATE, claimOnsetSlots } from "./condition-onset.js";
import { conditionPhase } from "./conditions.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { placeUsOnset } from "./us-placement.js";
const WEEKS_IN_YEAR = 52;
// A whole term per President rather than one year, because a year of a seeded
// hazard is a noisy estimator of an annual rate: the same constant read 2 and 6
// on two of the three seeds over one year each. Four years and divide.
const YEARS = 4;
const USA = "USA";
const ACUTE = new Set(ACUTE_CONDITIONS);
/**
 * A year of condition phases, and nothing else.
 *
 * Only this phase, because only this phase opens a condition: driving whole
 * turns would measure the onset rate through eighty other rules and take
 * minutes per seed to say the same number. The calendar is stepped a week at a
 * time so the seasons are real — a hurricane count taken in a frozen January
 * would be zero and would prove nothing.
 */
function yearsOfWeather(party, weeks = WEEKS_IN_YEAR * YEARS) {
    let working = foundedForBalance(`home-rate-${party}`, party).campaign;
    const opened = [];
    const before = new Set(Object.keys(working.conditions));
    for (let week = 0; week < weeks; week += 1) {
        working = {
            ...working,
            turn: working.turn + 1,
            calendar: addDays(working.calendar, 7),
        };
        working = conditionPhase(working).reduce((state, packet) => apply(state, packet), working);
    }
    for (const [id, condition] of Object.entries(working.conditions)) {
        if (!before.has(id))
            opened.push(condition);
    }
    return opened;
}
function homeAcute(opened) {
    return opened.filter((condition) => condition.nation === USA && ACUTE.has(condition.kind));
}
function median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
const PARTIES = ["democrat", "republican", "independent"];
const RUNS = PARTIES.map((party) => ({ party, opened: yearsOfWeather(party) }));
describe("how often the country is struck", () => {
    it("opens four to eight significant home conditions a year, as the median over the three Presidents", () => {
        const perYear = RUNS.map(({ opened }) => homeAcute(opened).length / YEARS);
        console.log(`home acute onsets a year, by President: ${JSON.stringify(Object.fromEntries(RUNS.map((run, at) => [run.party, perYear[at]])))}`);
        expect(median(perYear)).toBeGreaterThanOrEqual(4);
        expect(median(perYear)).toBeLessThanOrEqual(8);
    });
    it("raises the frequency through city-scope events, so the bill does not rise with the count", () => {
        const home = RUNS.flatMap(({ opened }) => homeAcute(opened));
        const cityScoped = home.filter((condition) => condition.scope === "city").length;
        expect(home.length).toBeGreaterThan(0);
        expect(cityScoped / home.length).toBeGreaterThan(0.6);
    });
    it("leaves the world's own rate where it was: the home rate is its own constant", () => {
        // Five times the world's, and the world's is untouched at 0.012.
        expect(HOME_DISASTER_ONSET_RATE).toBe(0.06);
        const abroad = RUNS.flatMap(({ opened }) => opened.filter((condition) => condition.nation !== USA && ACUTE.has(condition.kind)));
        // Two slots a week abroad over three seeded years: nowhere near saturated,
        // which is what says the home constant did not leak into the world's queue.
        expect(abroad.length).toBeLessThan(PARTIES.length * WEEKS_IN_YEAR * YEARS * 2 * 0.5);
    });
    it("opens a hurricane only between June and November", () => {
        const hurricanes = RUNS.flatMap(({ opened }) => opened.filter((condition) => condition.nation === USA && condition.kind === "cyclone"));
        for (const hurricane of hurricanes) {
            // The onset's month is the calendar the week it opened stood on, recorded
            // in the id's turn; the season gate is proven directly in
            // condition-seasons.test.ts, and this asserts the run agrees with it.
            expect(hurricane.beats[0].description).toMatch(/hurricane/);
        }
    });
    it("can have two of one kind open at once, in different places", () => {
        const byKind = new Map();
        for (const condition of RUNS.flatMap(({ opened }) => homeAcute(opened))) {
            const place = condition.place ?? "nation";
            const places = byKind.get(condition.kind) ?? new Set();
            places.add(place);
            byKind.set(condition.kind, places);
        }
        const concurrent = [...byKind.values()].filter((places) => places.size >= 2);
        expect(concurrent.length).toBeGreaterThan(0);
    });
    it("marks a tornado and a heat wave as incidents and nothing else", () => {
        for (const condition of RUNS.flatMap(({ opened }) => homeAcute(opened))) {
            expect(condition.lifetime === "incident", condition.kind).toBe(isIncidentKind(condition.kind));
        }
    });
});
describe("where a home condition lands", () => {
    const { campaign } = foundedForBalance("home-placement");
    function placements(kind, scope) {
        // Fifty evenly spread place rolls, so the answer is about the filter rather
        // than about one draw.
        return Array.from({ length: 50 }, (_, at) => placeUsOnset(campaign, USA, kind, scope, at / 50));
    }
    it("never lands a hurricane in Tulsa or Nashville", () => {
        const cities = placements("cyclone", "city").map((place) => place.city);
        expect(cities.every((city) => city !== undefined)).toBe(true);
        for (const city of cities) {
            expect(campaign.cities[city].base.name).not.toBe("Nashville");
            expect(campaign.cities[city].base.name).not.toBe("Tulsa");
        }
        expect(STATE_DISASTER_ELIGIBILITY.cyclone).not.toContain("OK");
        expect(STATE_DISASTER_ELIGIBILITY.cyclone).not.toContain("TN");
    });
    it("lands a hurricane only in a port, so it does not make landfall in Atlanta or Dallas", () => {
        for (const place of placements("cyclone", "city")) {
            expect(campaign.cities[place.city].base.kind).toBe("port");
        }
    });
    it("weights a city by its population, so the biggest eligible metro leads", () => {
        const cities = placements("wildfire", "city").map((place) => place.city);
        const counts = new Map();
        for (const city of cities)
            counts.set(city, (counts.get(city) ?? 0) + 1);
        const eligible = Object.values(campaign.cities).filter((city) => city.base.state && STATE_DISASTER_ELIGIBILITY.wildfire.includes(city.base.state));
        const largest = [...eligible].sort((a, b) => b.base.population - a.base.population)[0];
        const leader = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        expect(leader).toBe(largest.base.id);
    });
    it("never scopes a pandemic at home to one city", () => {
        // The floor is applied where the scope is decided, so the draw that would
        // have named a city names a region instead; placement itself is asked for a
        // region and answers with a state.
        for (const place of placements("pandemic", "region")) {
            expect(place.city).toBeUndefined();
            expect(place.state).toBeTruthy();
        }
    });
});
describe("the tie-break among same-week winners", () => {
    const rolled = (chance, roll, kind) => ({
        candidate: { nation: USA, kind, chance },
        roll,
    });
    it("keeps list order when no tie-break is supplied", () => {
        const tied = [rolled(0.5, 0.1, "earthquake"), rolled(0.5, 0.1, "wildfire")];
        expect(claimOnsetSlots(tied, 1)[0].kind).toBe("earthquake");
    });
    it("lets a seeded draw take the slot from the kind that sorts first", () => {
        const tied = [rolled(0.5, 0.1, "earthquake"), rolled(0.5, 0.1, "wildfire")];
        const draw = (candidate) => (candidate.kind === "wildfire" ? 0.1 : 0.9);
        expect(claimOnsetSlots(tied, 1, draw)[0].kind).toBe("wildfire");
    });
    it("still holds the budget at one, whoever wins the tie", () => {
        const tied = [rolled(0.5, 0.1, "earthquake"), rolled(0.5, 0.1, "wildfire"), rolled(0.5, 0.1, "tornado")];
        expect(claimOnsetSlots(tied, 1, () => 0.5)).toHaveLength(1);
    });
});
