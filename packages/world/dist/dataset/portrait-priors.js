import { NATION_LEADER_CONSTRAINTS } from "./nation-leaders.generated.js";
import { nationLeadRole } from "./nation-titles.js";
import { worldNations } from "./nations.js";
/**
 * Seats the leader table says nothing about: a journalist is not a
 * government's appointee, so the cabinet's share would be a claim about the
 * press it never made. Balanced, and with no androgynous weight, because the
 * record abroad counts women and men only.
 */
const UNGOVERNED_ROLES = new Set(["role-journalist"]);
const EVEN = { masculine: 0.5, feminine: 0.5, androgynous: 0 };
const REGION_BY_NATION = new Map(worldNations.map((nation) => [nation.id, nation.geo.region]));
/**
 * The mean women-in-cabinet share of each region's governments, read off the
 * rows whose share describes the cabinet actually sitting.
 */
const REGION_MEAN_SHARE = (() => {
    const sums = new Map();
    for (const row of Object.values(NATION_LEADER_CONSTRAINTS)) {
        if (row.shareFlagged)
            continue;
        const region = REGION_BY_NATION.get(row.nation);
        if (region === undefined)
            continue;
        const entry = sums.get(region) ?? { total: 0, count: 0 };
        sums.set(region, { total: entry.total + row.womenCabinetShare, count: entry.count + 1 });
    }
    return new Map([...sums].map(([region, { total, count }]) => [region, total / count]));
})();
/**
 * The share a cabinet chair draws against.
 *
 * A flagged share predates the cabinet now sitting (Hungary's 0.0 is the
 * previous government's), so it is a prior with the region's mean as its
 * floor: a data lag must not become a government that seats no women. An
 * unflagged zero is a researched fact, and stays one: the Saudi cabinet seats
 * none.
 */
export function cabinetWomenShareFor(nation) {
    const row = NATION_LEADER_CONSTRAINTS[nation];
    if (!row)
        return undefined;
    if (!row.shareFlagged)
        return row.womenCabinetShare;
    const floor = REGION_MEAN_SHARE.get(REGION_BY_NATION.get(nation) ?? "") ?? 0;
    return Math.max(row.womenCabinetShare, floor);
}
/**
 * How a foreign government's chairs divide by presentation: the table's
 * leader for the lead chair, its women-in-cabinet share for every other.
 * Undefined where the table is silent, which leaves the draw on its global
 * weights.
 *
 * The lead chair never reads the cabinet's share: the Marshall Islands seats a
 * woman as President beside a cabinet the table records with none.
 */
export function nationGenderPriorFor(nation, role) {
    const row = NATION_LEADER_CONSTRAINTS[nation];
    if (!row)
        return undefined;
    if (nationLeadRole(nation) === role) {
        return row.sex === "F"
            ? { masculine: 0, feminine: 1, androgynous: 0 }
            : { masculine: 1, feminine: 0, androgynous: 0 };
    }
    if (UNGOVERNED_ROLES.has(role))
        return EVEN;
    const share = cabinetWomenShareFor(nation) ?? 0;
    return { masculine: 1 - share, feminine: share, androgynous: 0 };
}
