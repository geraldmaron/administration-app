import { priorSubjectPlace } from "./scenario-subjects.js";
import { createRngStreams, distanceKm, familyPlace, flagPlace, pickWeighted, selectNation, } from "@admin/engine";
import { chokepoints, cityPlace, largestCityIn, placeAt, statePlace, worldCities, worldSettlements, settlementPlace, } from "@admin/world";
import { boundCondition } from "./scenario-cast-conditions.js";
import { seededState } from "./scenario-locus-draw.js";
import { boundPlace, renderText } from "./scenario-text.js";
// Degrees of deliberate imprecision for area sites in a nation the dataset
// does not map by state. Roughly 50–170 km: far
// enough from the capital to read as a different place, near enough to stay
// on the same landmass without coastline geometry to test against.
const AREA_OFFSET_MIN_DEG = 0.5;
const AREA_OFFSET_MAX_DEG = 1.6;
export function resolveLocus(campaign, def, counterpart) {
    const locus = resolveLocusPoint(campaign, def, counterpart);
    return locus ? { ...locus, descriptor: renderText(campaign, counterpart, def.locus.descriptor, boundPlace(campaign, def, counterpart, locus)) } : undefined;
}
function resolveLocusPoint(campaign, def, counterpart) {
    const locus = def.locus;
    const ground = locus.ground;
    const nationId = ground === "home" ? campaign.founding.nation : counterpart;
    const nation = selectNation(campaign, nationId)?.base;
    if (!nation)
        return undefined;
    // Rendered once, here, so neither return path can hand back raw braces.
    const descriptor = locus.descriptor;
    if (locus.settlement || locus.settlementId)
        return settlementLocus(campaign, def, nationId, descriptor);
    // The bind comes before the authored city and before the roll: a scenario
    // that says its place is wherever the thing is happening must not be placed
    // anywhere else, and an author who wrote both has said the same thing twice.
    if (locus.bind === "condition") {
        const bound = boundCondition(campaign, def, nationId);
        if (bound) {
            const placed = placeCondition(bound);
            if (placed)
                return { ...placed, descriptor, condition: bound.id };
            // A national or unlocated condition does not license inventing a state for its prose or effects.
            return { nation: nationId, lat: nation.geo.lat, lon: nation.geo.lon, placeName: nation.identity.name,
                precision: "area", descriptor, condition: bound.id };
        }
        // Nothing matching is running, or the record names no place inside the
        // country. Fall through to the ordinary resolution rather than refuse: a
        // nation-scope condition is a real condition, and the scenario is still
        // about it.
    }
    if (locus.city) {
        const pinned = pinCity(locus.city);
        if (pinned) {
            return { ...pinned, descriptor };
        }
    }
    const rng = createRngStreams(campaign.seed).stream("locus", def.id, campaign.turn);
    const earlier = ground === "home" && !locus.state && locus.site !== "capital" ? threadPlace(campaign, def) : undefined;
    const domestic = (site) => domesticSite(campaign, def, nationId, site, earlier);
    const frontier = locus.frontier === "home" && locus.site === "border" ? homeFrontier(campaign, nation, rng.next()) : undefined;
    const resolved = frontier ?? resolveSite(campaign, nation, locus.site, rng.next(), rng.next(), domestic, ground === "home");
    return { nation: nationId, descriptor, ...(locus.state ? { state: locus.state } : {}), ...resolved };
}
/** The resolved place as causal-stamp locale ids: the state, then the city. Abroad there is no state, so the city alone. */
export function locusLocales(locus) {
    if (!locus)
        return [];
    return [...(locus.state ? [locus.state] : []), ...(locus.city ? [locus.city] : []), ...(locus.settlement ? [locus.settlement] : [])];
}
/**
 * What a story's next scene inherits from this one: the state and city, when
 * the scene happened at home below the capital. Washington is not kept: a
 * meeting in the Oval Office says nothing about which town the next scene is in.
 */
export function storyPlace(locus, home) {
    if (!locus?.state || locus.state === "DC" || locus.nation !== home)
        return undefined;
    return { state: locus.state, ...(locus.city ? { city: locus.city } : {}), ...(locus.settlement ? { settlement: locus.settlement } : {}) };
}
/**
 * Where the earlier scene of this story happened, for a scenario that is the
 * next one: a later member of a running family returns to the opener's place,
 * and a scenario gated on a flag returns to where the answer that set it
 * happened. The family wins over a flag, because it is the tie an author
 * declared. Nothing where the earlier scene was in Washington or abroad, and a
 * scenario that authored its own state or city keeps it: what an author wrote
 * is never overruled by a draw or an inheritance.
 */
function threadPlace(campaign, def) {
    if (def.family && def.family.role !== "opener") {
        const opened = familyPlace(campaign, def.family.id);
        if (opened)
            return opened;
    }
    for (const condition of def.conditions) {
        if (condition.kind !== "flag" || !condition.is)
            continue;
        const placed = flagPlace(campaign, condition.flag);
        if (placed)
            return placed;
    }
    return priorSubjectPlace(campaign, def);
}
function pinCity(cityId) {
    const place = cityPlace(cityId);
    if (!place?.city)
        return undefined;
    return {
        nation: place.nation,
        city: place.city,
        ...(place.state ? { state: place.state } : {}),
        lat: place.lat,
        lon: place.lon,
        placeName: place.name,
        precision: "exact",
    };
}
/**
 * Where a running condition actually is, for a scenario bound to it: the
 * dataset's one place resolver, so the week about a wildfire lands on the same
 * point as the wildfire's own pin. A record that names a city is pinned there;
 * one that names only a state is pinned at that state's largest city, or its
 * capitol where the gazetteer has none. A record
 * that resolves no finer than the nation — a nation-scope recession — has no
 * point here, and the caller falls back to placing the event the way an
 * unbound scenario is placed.
 */
function placeCondition(condition) {
    const place = placeAt({
        nation: condition.nation,
        ...(condition.state ? { state: condition.state } : {}),
        ...(condition.city ? { city: condition.city } : {}),
    });
    if (!place || place.level === "nation")
        return undefined;
    return {
        nation: place.nation,
        ...(place.city ? { city: place.city } : {}),
        ...(place.state ? { state: place.state } : {}),
        lat: place.lat,
        lon: place.lon,
        placeName: place.name,
        precision: "exact",
    };
}
/**
 * The counterpart's frontier with the player's own country, or nothing when
 * they do not touch. Only the player's side of the line is the player's to
 * speak of, so a week about "our trucks" at a checkpoint needs this and not
 * the roll's arbitrary neighbor.
 */
function homeFrontier(campaign, nation, roll) {
    const home = selectNation(campaign, campaign.founding.nation)?.base;
    if (!home || !nation.geo.neighbors.some((id) => id === home.id))
        return undefined;
    const t = 0.45 + roll * 0.15;
    return {
        lat: nation.geo.lat + (home.geo.lat - nation.geo.lat) * t,
        lon: nation.geo.lon + lonDelta(nation.geo.lon, home.geo.lon) * t,
        placeName: `${nation.identity.name}–${home.identity.name} frontier`,
        precision: "area",
    };
}
// Every branch falls back down the chain rather than failing: a landlocked
// nation's "coast" becomes a city, an island's "border" becomes its coast.
// Authored intent degrades gracefully instead of gating on geography the
// author cannot see. A nation the dataset maps state by state places every
// site but its capital and its straits inside one state first.
function resolveSite(campaign, nation, site, rollA, rollB, domestic, home) {
    // A strait on home ground is somewhere the country's own ships come in. The
    // only strait the dataset gives the United States is the Panama Canal, which
    // is not its ground, so a home fuel-price or quarantine week was datelined in
    // Panama. A nation mapped by state takes it at one of its own ports instead.
    const local = site === "chokepoint" && home ? "coast" : site;
    if (local !== "capital" && local !== "chokepoint") {
        const inState = domestic(local);
        if (inState)
            return inState;
    }
    const degrade = (to) => resolveSite(campaign, nation, to, rollA, rollB, domestic, home);
    switch (site) {
        case "capital":
            return { lat: nation.geo.lat, lon: nation.geo.lon, placeName: nation.identity.capital, precision: "exact" };
        case "chokepoint": {
            const nearest = nearestChokepoint(nation);
            if (!nearest)
                return degrade("coast");
            return { lat: nearest.lat, lon: nearest.lon, placeName: nearest.name, precision: "exact" };
        }
        case "border": {
            const neighbor = pickNeighbor(campaign, nation, rollA);
            if (!neighbor)
                return degrade(nation.geo.coastline ? "coast" : "interior");
            // The midpoint of the two capitals, pulled toward the frontier's own
            // side and jittered so two border scenarios do not stack pins.
            const t = 0.45 + rollB * 0.15;
            return {
                lat: nation.geo.lat + (neighbor.geo.lat - nation.geo.lat) * t,
                lon: nation.geo.lon + lonDelta(nation.geo.lon, neighbor.geo.lon) * t,
                placeName: `${nation.identity.name}–${neighbor.identity.name} frontier`,
                precision: "area",
            };
        }
        case "coast": {
            if (!nation.geo.coastline)
                return degrade("city");
            const port = foreignCity(nation, site, rollA);
            if (port)
                return port;
            const point = offsetFrom(nation.geo, rollA, rollB);
            return { ...point, placeName: `Coastal district, ${nation.identity.name}`, precision: "area" };
        }
        case "interior": {
            const town = foreignCity(nation, site, rollA);
            if (town)
                return town;
            const point = offsetFrom(nation.geo, rollA, rollB);
            // "Interior, Turkey", matching its siblings below — not "The Turkey
            // interior", which only parses for the handful of country names that
            // take a definite article.
            return { ...point, placeName: `Interior, ${nation.identity.name}`, precision: "area" };
        }
        case "city":
        default: {
            const town = foreignCity(nation, "city", rollA);
            if (town)
                return town;
            const point = offsetFrom(nation.geo, rollA, rollB);
            return { ...point, placeName: `Provincial city, ${nation.identity.name}`, precision: "area" };
        }
    }
}
/**
 * A city of the site's kind in a nation the dataset does not map by state,
 * drawn by population, where the gazetteer lists one. Never the capital: most
 * of the world's governments have only their capital in the gazetteer, and a
 * coastal or inland event put there is in the wrong place, so those keep the
 * nation-level area the caller falls back to.
 */
function foreignCity(nation, site, roll) {
    const kinds = SITE_CITY_KINDS[site];
    const candidates = worldCities
        .filter((city) => city.nation === nation.id && city.state === undefined && kinds.includes(city.kind))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (candidates.length === 0)
        return undefined;
    const city = pickWeighted(candidates, (candidate) => candidate.population, roll);
    return { lat: city.lat, lon: city.lon, placeName: `${city.name}, ${nation.identity.name}`, precision: "area", city: city.id };
}
// The dataset city kinds that can stand for each site. A "city" site is any
// population center but the national capital, because the capital is what the
// "capital" site is for.
const SITE_CITY_KINDS = {
    city: ["border", "financial", "industrial", "interior", "port"],
    coast: ["port"],
    interior: ["industrial", "interior"],
    border: ["border"],
};
/**
 * A site inside one state of a nation the dataset maps by state, placed at that
 * state's largest city of the site's kind, or its largest city of any kind. The
 * state is the authored one when the locus names it, then the earlier scene's
 * when this is a story's next one, and otherwise drawn by fit from the campaign
 * seed and the scenario id (`seededState`). An earlier scene's own city is
 * kept when it is of the site's kind, so a story returns to the same town and
 * not only the same state. An offset from the capital put every one of these
 * within a short drive of the White House, and an "interior" site in Virginia,
 * Maryland or the Atlantic. A state the gazetteer has no city in (Delaware,
 * Montana, Wyoming) stands at its capitol.
 *
 * Undefined for any other nation, so the caller keeps its own fallback.
 */
function domesticSite(campaign, def, nationId, site, earlier) {
    const kinds = SITE_CITY_KINDS[site];
    const fits = (city) => city.nation === nationId && kinds.includes(city.kind);
    const state = def.locus.state ?? earlier?.state ?? seededState(campaign, def, fits);
    if (!state)
        return undefined;
    const saved = earlier?.state === state && earlier.settlement ? worldSettlements.find((place) => place.id === earlier.settlement) : undefined;
    const port = saved ?? (!earlier ? worldSettlements.find((place) => place.state === state && (site === "coast" && place.commercialPort || site === "border" && place.roadBorderCrossing)) : undefined);
    if (port)
        return { lat: port.lat, lon: port.lon, placeName: settlementPlace(port.id).name, precision: "area", state, settlement: port.id };
    const kept = earlier?.state === state && earlier.city ? worldCities.find((city) => city.id === earlier.city) : undefined;
    const city = (kept && fits(kept) ? kept : undefined) ?? largestCityIn(state, fits) ?? kept ?? largestCityIn(state, (candidate) => candidate.nation === nationId);
    const place = city ? cityPlace(city.id) : statePlace(state);
    if (!place || place.nation !== nationId)
        return undefined;
    return { lat: place.lat, lon: place.lon, placeName: place.name, precision: "area", state, ...(city ? { city: city.id } : {}) };
}
// Prefer the neighbor the player is most entangled with, the same instinct
// band-casting uses; a frontier incident on a calm border is a weaker story
// than the same incident on a watched one. Falls back to a seeded pick so a
// nation with quiet neighbors still resolves deterministically.
function pickNeighbor(campaign, nation, roll) {
    const neighbors = nation.geo.neighbors
        .map((id) => selectNation(campaign, id)?.base)
        .filter((candidate) => candidate !== undefined)
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    if (neighbors.length === 0)
        return undefined;
    return neighbors[Math.min(neighbors.length - 1, Math.floor(roll * neighbors.length))];
}
// Only the straits this nation actually holds. Falling back to the world's
// nearest chokepoint — which is what this did — put an "exact" pin on a real
// foreign strait whenever the cast nation owned none of its own: a nation
// with no strait of its own had every chokepoint scenario on its ground
// datelined the Bosphorus, in Turkey, hundreds of kilometers off the
// territory the map draws.
// A nation with no strait of its own has no chokepoint site; the caller
// degrades it to coast or interior like every other unavailable geography.
function nearestChokepoint(nation) {
    const owned = new Set(nation.geo.chokepoints.map((id) => id));
    const candidates = chokepoints.filter((cp) => owned.has(cp.id));
    if (candidates.length === 0)
        return undefined;
    return [...candidates].sort((a, b) => distanceKm(nation.geo, a) - distanceKm(nation.geo, b) || String(a.id).localeCompare(String(b.id)))[0];
}
function offsetFrom(origin, rollA, rollB) {
    const angle = rollA * 2 * Math.PI;
    const radius = AREA_OFFSET_MIN_DEG + rollB * (AREA_OFFSET_MAX_DEG - AREA_OFFSET_MIN_DEG);
    const lat = Math.max(-85, Math.min(85, origin.lat + Math.sin(angle) * radius));
    const lon = wrapLon(origin.lon + Math.cos(angle) * radius);
    return { lat, lon };
}
// The short way round: interpolating Alaska to Chukotka must not cross the
// whole plate.
function lonDelta(from, to) {
    let delta = to - from;
    if (delta > 180)
        delta -= 360;
    if (delta < -180)
        delta += 360;
    return delta;
}
function wrapLon(lon) {
    if (lon > 180)
        return lon - 360;
    if (lon < -180)
        return lon + 360;
    return lon;
}
/** Sourced settlement context never borrows a metro's population or fabricates a village. */
function settlementLocus(campaign, def, nation, descriptor) {
    if (nation !== "USA")
        return undefined;
    const earlier = !def.locus.state && !def.locus.settlementId ? threadPlace(campaign, def) : undefined;
    const condition = def.locus.bind === "condition" ? boundCondition(campaign, def, nation) : undefined;
    if (condition && !condition.state)
        return undefined;
    const state = condition?.state ?? def.locus.state ?? earlier?.state;
    const candidates = worldSettlements.filter((place) => (!state || place.state === state) &&
        (!def.locus.settlementId || place.id === def.locus.settlementId) &&
        (def.locus.settlement === undefined || (def.locus.settlement === "commercial-port" ? place.commercialPort : def.locus.settlement === "road-border" ? place.roadBorderCrossing : place.population <= 100000)));
    const kept = earlier?.settlement ? candidates.find((place) => place.id === earlier.settlement) : undefined;
    const chosenState = state ?? seededState(campaign, def, () => true, new Set(candidates.map((place) => place.state)));
    const local = candidates.filter((place) => place.state === chosenState);
    const rng = createRngStreams(campaign.seed).stream("scenario-settlement", def.id);
    const found = kept ?? (local.length ? local[Math.floor(rng.next() * local.length)] : undefined);
    if (!found || earlier?.settlement && !kept)
        return undefined;
    return { nation, state: found.state, settlement: found.id, lat: found.lat, lon: found.lon,
        placeName: settlementPlace(found.id).name, descriptor, precision: "area",
        ...(condition ? { condition: condition.id } : {}) };
}
