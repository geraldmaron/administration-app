import { STATE_IDS } from "../schemas/state.js";
import { CABINET_DEPARTMENT_INSTITUTIONS, FEDERAL_SITES } from "../dataset/federal-sites.js";
import { STATE_CAPITOLS } from "../dataset/state-capitols.js";
import { distanceToStateKm, stateContains } from "../maps/state-outlines.js";
// Where the government sits has to agree with the map it is drawn on: a
// headquarters or a capitol falls inside the state it names, every cabinet
// department has a point, and every state and DC has its capitol.
/**
 * How far off its state's drawn outline a sourced point may sit. The state
 * outlines are the Census Bureau's 1:500,000 cartographic boundaries,
 * simplified to 0.3 units of a plane where one unit is about six kilometers,
 * so a building on a harbor or a riverbank can fall a couple of kilometers
 * into the drawn water. Four kilometers admits that and still refuses a
 * transposed coordinate; a point that lands inside a different state is
 * refused whatever its distance. Every seeded point sits strictly inside its
 * own outline today, so the tolerance is headroom, not a hidden exception.
 */
export const SITE_TOLERANCE_KM = 4;
const MILES_PER_KM = 0.621371;
const miles = (km) => (km * MILES_PER_KM).toFixed(1);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SEEDED = { sites: FEDERAL_SITES, capitols: STATE_CAPITOLS, departments: CABINET_DEPARTMENT_INSTITUTIONS };
/**
 * A point inside its state, or in drawn water within the tolerance of its
 * outline; a message otherwise. A point inside another state's outline is
 * refused outright, so the tolerance never lets the Pentagon stand in DC.
 */
export function stateMiss(state, lat, lon, label) {
    const point = [lon, lat];
    if (stateContains(state, point))
        return undefined;
    const other = STATE_IDS.find((candidate) => candidate !== state && stateContains(candidate, point));
    if (other)
        return `${label} falls inside ${other}'s outline, not ${state}'s.`;
    const off = distanceToStateKm(state, point);
    if (off <= SITE_TOLERANCE_KM)
        return undefined;
    return `${label} is ${miles(off)} miles outside ${state}'s outline, past the tolerance of ${miles(SITE_TOLERANCE_KM)} miles.`;
}
function siteShapeErrors(site, path) {
    const hasPoint = site.lat !== undefined && site.lon !== undefined;
    if (site.location === "none") {
        if (hasPoint || site.state)
            return [{ kind: "shape", path, message: `${site.institution} has no location but carries a point; a location is never inherited.` }];
        if (site.reason.trim() === "")
            return [{ kind: "shape", path, message: `${site.institution} has no location and no reason.` }];
        return [];
    }
    if (!hasPoint || !site.state)
        return [{ kind: "shape", path, message: `${site.institution} is sourced but has no point or no state.` }];
    if (!/^https:\/\//.test(site.source) || !/^https:\/\//.test(site.hqSource) || !ISO_DATE.test(site.opened)) {
        return [{ kind: "shape", path, message: `${site.institution} has a point with no opened source for the coordinates or the headquarters.` }];
    }
    return [];
}
function siteRowErrors(site, path, listedBefore) {
    const shape = [
        ...siteShapeErrors(site, path),
        ...(listedBefore ? [{ kind: "shape", path, message: `${site.institution} is listed twice.` }] : []),
    ];
    if (shape.length > 0 || site.location !== "sourced")
        return shape;
    const miss = stateMiss(site.state, site.lat, site.lon, `${site.institution}'s headquarters`);
    return miss ? [{ kind: "plausibility", path, message: miss }] : [];
}
function siteErrors(tables) {
    const rows = tables.sites.flatMap((site, index) => siteRowErrors(site, `seed.federalSites[${index}]`, tables.sites.slice(0, index).some((other) => other.institution === site.institution)));
    const located = new Set(tables.sites.filter((site) => site.location === "sourced").map((site) => site.institution));
    const homeless = tables.departments.filter((department) => !located.has(department));
    const coverage = homeless.length > 0
        ? [{ kind: "dangling-reference", path: "seed.federalSites", message: `every cabinet department has a site; ${homeless.join(", ")} do not.` }]
        : [];
    return [...rows, ...coverage];
}
function capitolRowErrors(capitol, path) {
    if (!/^https:\/\//.test(capitol.source) || !ISO_DATE.test(capitol.opened)) {
        return [{ kind: "shape", path, message: `${capitol.capitol} (${capitol.state}) has no opened source.` }];
    }
    const miss = stateMiss(capitol.state, capitol.lat, capitol.lon, `${capitol.capitol} (${capitol.state})`);
    return miss ? [{ kind: "plausibility", path, message: miss }] : [];
}
function capitolErrors(capitols) {
    const rows = capitols.flatMap((capitol, index) => capitolRowErrors(capitol, `seed.stateCapitols[${index}]`));
    const listed = capitols.map((capitol) => capitol.state);
    const missing = STATE_IDS.filter((state) => !listed.includes(state));
    const twice = STATE_IDS.filter((state) => listed.filter((other) => other === state).length > 1);
    return [
        ...rows,
        ...(missing.length > 0 ? [{ kind: "dangling-reference", path: "seed.stateCapitols", message: `no capitol for ${missing.join(", ")}.` }] : []),
        ...(twice.length > 0 ? [{ kind: "shape", path: "seed.stateCapitols", message: `${twice.join(", ")} listed twice.` }] : []),
    ];
}
/**
 * The siting rules: every federal site is a sourced point inside its state or
 * an explicit no-location with a reason, every cabinet department has a point,
 * and the 50 states and DC each have one capitol inside their own outline.
 */
export function checkSites(tables = SEEDED) {
    return [...siteErrors(tables), ...capitolErrors(tables.capitols)];
}
