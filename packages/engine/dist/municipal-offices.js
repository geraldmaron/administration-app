import { MAYOR_ROLE, PersonId, RoleId, US_ID, fnv1a, personPoolSpecs, worldCities } from "@admin/world";
import { generateRolePerson } from "./people.js";
import { newNameLedger } from "./naming.js";
import { createRngStreams } from "./rng.js";
/** Stable city identity. No municipal election or service capacity is implied. */
export function cityMayorSeat(campaign, cityId) {
    const city = worldCities.find((entry) => entry.id === cityId && entry.nation === US_ID);
    const spec = personPoolSpecs.find((entry) => entry.nation === US_ID);
    if (!city || !spec)
        return undefined;
    const id = PersonId.parse(`PER-USA-city-mayor-${cityId.replace("CITY-USA-", "")}`);
    const existing = campaign.people[id];
    if (existing)
        return existing.alive && existing.currentRole === MAYOR_ROLE && existing.municipalCity === cityId ? { person: existing, effects: [] } : undefined;
    const names = newNameLedger();
    // Other cities' introduction order must not re-deal this city's name.
    for (const runtime of Object.values(campaign.people).filter((entry) => !entry.municipalCity)) {
        names.full.add(runtime.base.name);
        names.given.add(runtime.base.name.split(" ")[0]);
    }
    const drawn = generateRolePerson(spec, "United States", MAYOR_ROLE, fnv1a(cityId), createRngStreams(campaign.seed), names);
    const base = { ...drawn, id };
    const person = { base, alive: true, currentRole: RoleId.parse(MAYOR_ROLE), municipalCity: city.id,
        ...(city.state ? { state: city.state } : {}) };
    return { person, effects: [{ kind: "person", person: id, create: person, changes: {} }] };
}
