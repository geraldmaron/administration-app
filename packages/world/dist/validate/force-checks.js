import { MILITARY_BRANCHES, forceAssetFor } from "../schemas/index.js";
import { CARRIED_CONFLICTS } from "../dataset/carried-conflicts.js";
import { US_BASING } from "../dataset/us-basing.js";
import { US_MUNITIONS } from "../dataset/us-munitions.js";
import { worldNations } from "../dataset/nations.js";
// What the catalog lets the validator say about an order of battle that the
// shape alone cannot: a holding parses as a catalog id whichever service it
// sits under, so the branch match is a dataset rule; and a count of hulls or
// brigades is a claim about people, which the service's own headcount has to
// be able to cover.
/**
 * Units' personnel may not exceed the service's headcount outright. The
 * catalog's establishments are rough, so the check is one-directional and has
 * no lower bound: a service whose named units account for a tenth of its people
 * is a service whose staff, training and support are simply not on the roster.
 */
export function checkForceAssets(nation) {
    const oob = nation.stats.military.orderOfBattle;
    if (!oob)
        return [];
    const errors = [];
    const root = `nations.${nation.id}.stats.military.orderOfBattle`;
    for (const branch of MILITARY_BRANCHES) {
        const service = oob[branch];
        const lists = [
            { field: "capabilities", ids: (service.capabilities ?? []).map((c) => c.name) },
            { field: "units", ids: (service.units ?? []).map((u) => u.type) },
        ];
        for (const { field, ids } of lists) {
            const seen = new Set();
            ids.forEach((id, index) => {
                const path = `${root}.${branch}.${field}[${index}]`;
                const spec = forceAssetFor(id);
                if (spec.branch !== branch) {
                    errors.push({ kind: "shape", path, message: `"${id}" belongs to the ${spec.branch}, but is filed under the ${branch}.` });
                }
                if (seen.has(id)) {
                    errors.push({ kind: "shape", path, message: `"${id}" is listed twice in ${field}; one row per holding, so the counts can be added.` });
                }
                seen.add(id);
            });
        }
        const personnel = (service.units ?? []).reduce((sum, unit) => sum + unit.count * forceAssetFor(unit.type).nominalPersonnel, 0);
        if (personnel > service.headcount) {
            errors.push({
                kind: "unit-mismatch",
                path: `${root}.${branch}.units`,
                message: `the named units need about ${personnel.toLocaleString("en-US")} people at the catalog's establishments, but the ${branch} has ${service.headcount.toLocaleString("en-US")} — a count on the wrong scale, or a headcount that is.`,
            });
        }
    }
    return errors;
}
/** The five US munition classes, named here so a seed row with a class nobody reads is refused. */
export const US_MUNITION_CLASS_IDS = ["air-defense", "naval-interceptors", "cruise-standoff", "precision-fires", "artillery-155"];
const SEEDED = { basing: US_BASING, conflicts: CARRIED_CONFLICTS, munitions: US_MUNITIONS };
function unsourced(row) {
    return row.source.trim() === "" || !/^\d{4}-\d{2}-\d{2}$/.test(row.opened);
}
function basingErrors(known, rows) {
    return rows.flatMap((row, index) => {
        const path = `seed.usBasing[${index}]`;
        if (unsourced(row))
            return [{ kind: "shape", path, message: `"${row.base}" cites no opened source, and a row without one is not seeded.` }];
        if (row.country === "USA")
            return [{ kind: "plausibility", path, message: `"${row.base}" is on US soil; the table is of forces stationed abroad.` }];
        if (!known.has(row.country))
            return [{ kind: "dangling-reference", path, message: `"${row.base}" is hosted by "${row.country}", which is not on the roster.` }];
        return [];
    });
}
function conflictErrors(known, rows) {
    return rows.flatMap((row, index) => {
        const path = `seed.carriedConflicts[${index}]`;
        if (unsourced(row))
            return [{ kind: "shape", path, message: `A ${row.kind} row cites no opened source, and a row without one is not seeded.` }];
        const missing = row.parties.filter((party) => !known.has(party));
        if (missing.length > 0)
            return [{ kind: "dangling-reference", path, message: `A ${row.kind} row names ${missing.join(", ")}, not on the roster.` }];
        if (row.kind === "interstate" && row.parties.includes("USA")) {
            return [{ kind: "plausibility", path, message: "The United States is never a belligerent at the oath; its part in a carried war is not seeded." }];
        }
        return [];
    });
}
function munitionErrors(rows) {
    const classes = US_MUNITION_CLASS_IDS;
    return rows.flatMap((row, index) => {
        const path = `seed.usMunitions[${index}]`;
        if (unsourced(row))
            return [{ kind: "shape", path, message: `"${row.munitionClass}" cites no opened source.` }];
        if (!classes.includes(row.munitionClass))
            return [{ kind: "shape", path, message: `"${row.munitionClass}" is not a munition class the engine reads.` }];
        const index01 = row.openingIndex;
        if (index01 !== null && (index01 < 0 || index01 > 1))
            return [{ kind: "unit-mismatch", path, message: `"${row.munitionClass}" opens at ${index01}, off the 0 to 1 index.` }];
        return [];
    });
}
const SHIPPED_ROSTER = new Set(worldNations.map((nation) => nation.id));
/**
 * The governments a seed row may name: this dataset's and the shipped
 * roster's. A row whose host the dataset leaves out is not seeded into a world
 * built from it (the board filters on the host), so a small world is not wrong
 * for lacking Japan; a row naming a government on neither is a typo.
 */
export function seedRosterOf(dataset) {
    return new Set([...SHIPPED_ROSTER, ...dataset.nations.map((nation) => nation.id)]);
}
/**
 * The board's force rules across the roster: installations abroad on a host
 * that exists, carried conflicts between governments on the roster and never
 * with the United States as a belligerent, munitions classes the engine knows
 * on the 0 to 1 index, and a source someone opened behind every row.
 */
export function checkForceBoard(dataset, tables = SEEDED) {
    const known = seedRosterOf(dataset);
    return [...basingErrors(known, tables.basing), ...conflictErrors(known, tables.conflicts), ...munitionErrors(tables.munitions)];
}
