import { checkSettlements } from "./settlement-checks.js";
// The dataset validator: shape, referential integrity, plausibility and unit
// consistency over a whole `WorldDataset`.
//
// Every check returns findings rather than throwing, so one run reports the
// whole dataset instead of stopping at the first bad row. Adding a check here
// is a change to what all authored data must satisfy — see `docs/SCHEMA.md`.
import { COHORT_AXES, MILITARY_BRANCHES, WorldDataset, } from "../schemas/index.js";
import { checkCostOfLivingOpening, checkDebtReproducesRatio, checkStateVitalAnchors, checkVitalRates, } from "./vitals-checks.js";
import { checkElectionTables } from "./election-checks.js";
import { checkNationPartySystem } from "./party-system-check.js";
import { checkLeaderConstraints } from "./leader-checks.js";
import { checkForceAssets, checkForceBoard } from "./force-checks.js";
import { checkForcePlacement } from "./placement-checks.js";
import { checkSites } from "./site-checks.js";
import { checkOrganizations } from "./org-checks.js";
import { checkElectionCalendar } from "./election-calendar-checks.js";
// gdpPerCapita is expected to be roughly gdp (USD millions) * 1e6 / population,
// within a tolerance — catches the classic mistake of entering gdpPerCapita in
// the wrong unit (e.g. thousands instead of dollars, or vice versa) even
// though each field individually passes its own range check.
const GDP_PER_CAPITA_TOLERANCE = 0.15;
function checkGdpPerCapitaUnit(nationId, stats) {
    const { gdp, gdpPerCapita } = stats.economy;
    const { population } = stats.demography;
    if (population <= 0)
        return null;
    const expected = (gdp * 1_000_000) / population;
    if (expected <= 0)
        return null;
    const ratio = gdpPerCapita / expected;
    if (ratio < 1 - GDP_PER_CAPITA_TOLERANCE || ratio > 1 + GDP_PER_CAPITA_TOLERANCE) {
        return {
            kind: "unit-mismatch",
            path: `nations.${nationId}.stats.economy.gdpPerCapita`,
            message: `gdpPerCapita (${gdpPerCapita}) is inconsistent with gdp (${gdp}M) / population (${population}) — expected roughly ${expected.toFixed(0)}. Check units (gdp is USD millions).`,
        };
    }
    return null;
}
/**
 * A defense budget is authored in the same USD millions the GDP beside it is,
 * and six nations were carrying raw-dollar-shaped figures against it — Yemen's
 * read as 13,500% of national output, Belarus's as 2,500%. Each field passed
 * its own range check, because neither has a range that a number in the wrong
 * unit violates; only the ratio between them says anything is wrong.
 *
 * The ceiling is set above the highest real defense burden a state sustains —
 * a war economy or a garrison state runs 20-25% of GDP, which North Korea and
 * wartime Ukraine both do in this dataset — so it catches a unit error and
 * never an authored extreme.
 */
const MAX_MILITARY_SHARE_OF_GDP = 0.35;
function checkMilitaryBudgetUnit(nationId, stats) {
    const share = stats.military.budget / stats.economy.gdp;
    if (stats.economy.gdp <= 0 || share <= MAX_MILITARY_SHARE_OF_GDP)
        return null;
    return {
        kind: "unit-mismatch",
        path: `nations.${nationId}.stats.military.budget`,
        message: `military budget (${stats.military.budget}) is ${(share * 100).toFixed(0)}% of gdp (${stats.economy.gdp}M) — check units (both are USD millions).`,
    };
}
/**
 * How far the branch headcounts may sum away from the aggregate above them.
 *
 * Real service strengths and real department totals disagree by a few percent
 * because they count the reserve components, the coast guard and the
 * civilian-in-uniform categories differently. Three percent is loose enough to
 * survive that and far tighter than any actual authoring error: a service
 * entered on the wrong scale, or a branch left out, misses by tens of percent.
 */
const ORDER_OF_BATTLE_TOLERANCE = 0.03;
/**
 * Which branch strength each service answers for.
 *
 * `land` covers the army and the marines together, because branch strength is
 * a reading about ground combat power and a marine corps is ground combat
 * power that arrives by sea.
 */
const BRANCH_STRENGTH_SERVICES = {
    army: "land",
    marines: "land",
    navy: "naval",
    air: "air",
    space: "space",
    cyber: "cyber",
};
/**
 * The decomposition against the aggregates it sits under.
 *
 * `branchStrength` is *checked* here rather than derived from the order of
 * battle, and the reason is that it is not a function of mass. Branch strength
 * is a quality reading — equipment, training, doctrine — and a Space Force of
 * nine thousand people is one of the strongest arms in the world while an army
 * of a million conscripts can be one of the weakest. Deriving it from
 * headcount would replace an authored judgment with an arithmetic that is
 * wrong in both directions. What headcount genuinely determines is whether the
 * service *exists*, so that is what is checked, and it fails loudly: a nation
 * claiming naval strength with no navy in it, or a navy with no strength, is
 * an authoring error in one of the two places and the dataset cannot tell
 * which.
 */
/**
 * What a nation's fidelity owes its authored layer. A `full` record is one
 * somebody researched: it states at least two agendas of its own and a red
 * line. A `standard` record states one agenda and a red line. A `thin` record
 * may take its archetype's agendas and state none.
 */
function checkFidelityDepth(nation) {
    const path = `nations.${nation.id}.traits`;
    const errors = [];
    if (nation.fidelity === "full" && nation.traits.agendas.length < 2) {
        errors.push({ kind: "shape", path: `${path}.agendas`, message: `"${nation.id}" is full fidelity and must author at least two agendas of its own` });
    }
    if (nation.fidelity === "standard" && nation.traits.agendas.length < 1) {
        errors.push({ kind: "shape", path: `${path}.agendas`, message: `"${nation.id}" is standard fidelity and must author at least one agenda of its own` });
    }
    if (nation.fidelity !== "thin" && nation.doctrine.redLines.length === 0) {
        errors.push({ kind: "shape", path: `nations.${nation.id}.doctrine.redLines`, message: `"${nation.id}" is ${nation.fidelity} fidelity and must state a red line` });
    }
    return errors;
}
function checkOrderOfBattle(nation) {
    const oob = nation.stats.military.orderOfBattle;
    const path = `nations.${nation.id}.stats.military.orderOfBattle`;
    if (!oob) {
        // The played nation is the one every screen reads and the one the engine
        // draws deployments out of, so its decomposition is required rather than
        // merely encouraged.
        return nation.playable
            ? [{ kind: "shape", path, message: `"${nation.id}" is playable and must carry a full order of battle` }]
            : [];
    }
    const errors = [];
    const total = MILITARY_BRANCHES.reduce((sum, branch) => sum + oob[branch].headcount, 0);
    const active = nation.stats.military.activeHeadcount;
    if (active > 0 && Math.abs(total - active) / active > ORDER_OF_BATTLE_TOLERANCE) {
        errors.push({
            kind: "unit-mismatch",
            path,
            message: `branch headcounts sum to ${total.toLocaleString("en-US")}, which is more than ${(ORDER_OF_BATTLE_TOLERANCE * 100).toFixed(0)}% away from activeHeadcount (${active.toLocaleString("en-US")}).`,
        });
    }
    for (const branch of MILITARY_BRANCHES) {
        const strength = nation.stats.military.branchStrength[BRANCH_STRENGTH_SERVICES[branch]];
        const headcount = oob[branch].headcount;
        if (headcount === 0 && strength > 0.05) {
            errors.push({
                kind: "plausibility",
                path: `${path}.${branch}.headcount`,
                message: `no personnel in the ${branch}, but branchStrength.${BRANCH_STRENGTH_SERVICES[branch]} reads ${strength} — one of the two is wrong.`,
            });
        }
        if (headcount > 0 && strength === 0) {
            errors.push({
                kind: "plausibility",
                path: `${path}.${branch}.headcount`,
                message: `${headcount.toLocaleString("en-US")} personnel in the ${branch}, but branchStrength.${BRANCH_STRENGTH_SERVICES[branch]} reads 0 — one of the two is wrong.`,
            });
        }
    }
    if (nation.playable) {
        for (const branch of MILITARY_BRANCHES) {
            if ((oob[branch].capabilities?.length ?? 0) === 0 || (oob[branch].units?.length ?? 0) === 0) {
                errors.push({
                    kind: "shape",
                    path: `${path}.${branch}`,
                    message: `the playable nation's ${branch} needs both named capabilities and units, not headcount alone`,
                });
            }
        }
    }
    return errors;
}
const US_CITY_FLOOR = 200;
const CAPITAL_COORD_TOLERANCE_DEG = 0.5;
function checkCities(dataset, nationIds) {
    const errors = [];
    const seen = new Set();
    for (const city of dataset.cities) {
        if (seen.has(city.id)) {
            errors.push({ kind: "shape", path: `cities.${city.id}`, message: `duplicate city id "${city.id}"` });
        }
        seen.add(city.id);
        if (!nationIds.has(city.nation)) {
            errors.push({
                kind: "dangling-reference",
                path: `cities.${city.id}.nation`,
                message: `references unknown nation id "${city.nation}"`,
            });
        }
    }
    errors.push(...checkCityCapitals(dataset));
    errors.push(...checkCityStates(dataset));
    return errors;
}
function checkCityStates(dataset) {
    const errors = [];
    const stateIds = new Set(dataset.states.map((state) => state.id));
    for (const city of dataset.cities) {
        if (city.nation !== "USA" || city.state === undefined)
            continue;
        if (!stateIds.has(city.state)) {
            errors.push({
                kind: "dangling-reference",
                path: `cities.${city.id}.state`,
                message: `references unknown state id "${city.state}"`,
            });
        }
    }
    return errors;
}
const MIX_SUM_TOLERANCE = 0.002;
function checkSectors(dataset) {
    const errors = [];
    for (const nation of dataset.nations) {
        const mix = nation.sectors.reduce((sum, entry) => sum + entry.mix, 0);
        if (Math.abs(mix - 1) > MIX_SUM_TOLERANCE) {
            errors.push({
                kind: "shape",
                path: `nations.${nation.id}.sectors`,
                message: `sector mix sums to ${mix.toFixed(4)}, expected 1`,
            });
        }
        const seen = new Set();
        for (const entry of nation.sectors) {
            if (seen.has(entry.sector)) {
                errors.push({
                    kind: "shape",
                    path: `nations.${nation.id}.sectors`,
                    message: `duplicate sector "${entry.sector}"`,
                });
            }
            seen.add(entry.sector);
        }
    }
    return errors;
}
// Two majors that sit on the same point in belief space make partyReading a
// no-op: every act reads the same for both caucuses. ≥ 0.3 on any one axis is
// enough separation that the filter can still move a disposition.
const PARTY_BELIEFS_DISTINCT_MIN = 0.3;
function checkPartyBeliefsDistinct(charterId, majors) {
    if (majors.length !== 2)
        return [];
    const [a, b] = majors;
    if (a === undefined || b === undefined)
        return [];
    const axes = ["economicLeftRight", "authLibertarian", "nationalistGlobalist"];
    const maxDelta = Math.max(...axes.map((axis) => Math.abs(a.beliefs[axis] - b.beliefs[axis])));
    if (maxDelta < PARTY_BELIEFS_DISTINCT_MIN) {
        return [
            {
                kind: "shape",
                path: `charters.${charterId}.parties`,
                message: `party-beliefs-distinct: major tickets differ by ${maxDelta.toFixed(3)} on every axis, need ≥ ${PARTY_BELIEFS_DISTINCT_MIN} on at least one`,
            },
        ];
    }
    return [];
}
/**
 * A bloc that is not a party cannot be more disciplined than one that is.
 * Independents are heterogeneous by definition, so a charter that authors them
 * as cohesive as its majors has described a third party, not the people who
 * joined neither.
 */
function checkPartyCohesion(charterId, parties) {
    const majors = parties.filter((party) => party.kind === "major");
    const independents = parties.filter((party) => party.kind === "independent");
    if (majors.length === 0 || independents.length === 0)
        return [];
    const weakestMajor = Math.min(...majors.map((party) => party.cohesion));
    return independents
        .filter((party) => party.cohesion >= weakestMajor)
        .map((party) => ({
        kind: "shape",
        path: `charters.${charterId}.parties`,
        message: `party-cohesion: "${party.shortName}" is independent but reads as cohesive as a whipped caucus (${party.cohesion} ≥ ${weakestMajor})`,
    }));
}
function checkStates(dataset) {
    const errors = [];
    if (!dataset.nations.some((nation) => nation.id === "USA"))
        return errors;
    if (dataset.states.length !== 51) {
        errors.push({
            kind: "shape",
            path: "states",
            message: `United States overlay must have 50 states plus DC, has ${dataset.states.length}`,
        });
    }
    const ids = dataset.states.map((state) => state.id);
    if (new Set(ids).size !== ids.length) {
        errors.push({ kind: "shape", path: "states", message: "duplicate state id" });
    }
    const ev = dataset.states.reduce((sum, state) => sum + state.electoralVotes, 0);
    if (ev !== 538) {
        errors.push({
            kind: "shape",
            path: "states",
            message: `electoral votes sum to ${ev}, expected 538`,
        });
    }
    errors.push(...checkStateEconomies(dataset));
    errors.push(...checkStateCohorts(dataset));
    errors.push(...checkStateMass(dataset));
    errors.push(...checkDistricts(dataset));
    return errors;
}
/**
 * Districts are additive, and owe two things to the states they sit inside —
 * one level owns a fact, every coarser level is a sum of it. The district
 * count in a state equals its authored `houseSeats` (the figure
 * `delegations.ts`'s seat math already reads — a district table that disagreed
 * with it would be two answers to "how many seats does Ohio have"), and the
 * district populations in that state sum exactly to the state's own
 * population. Skips entirely when there is no USA to check against, the same
 * as `checkStates`.
 */
function checkDistricts(dataset) {
    const errors = [];
    if (!dataset.nations.some((nation) => nation.id === "USA"))
        return errors;
    if (dataset.districts.length === 0)
        return errors;
    const byState = new Map();
    for (const district of dataset.districts) {
        const state = district.state;
        byState.set(state, [...(byState.get(state) ?? []), district]);
    }
    for (const state of dataset.states) {
        const districts = byState.get(state.id) ?? [];
        // DC carries one non-voting delegate seat and 0 apportioned `houseSeats`
        // by this dataset's standing convention (states.ts's `houseSeats`
        // function) — the one place a district count is allowed to differ from
        // the seat figure, and only in that one direction.
        const expectedSeats = state.id === "DC" ? 1 : state.houseSeats;
        if (districts.length !== expectedSeats) {
            errors.push({
                kind: "shape",
                path: `districts.${state.id}`,
                message: `${state.id} has ${districts.length} districts but ${expectedSeats} expected`,
            });
        }
        const population = districts.reduce((sum, district) => sum + district.population, 0);
        if (districts.length > 0 && population !== state.population) {
            errors.push({
                kind: "shape",
                path: `districts.${state.id}.population`,
                message: `${state.id}'s districts sum to ${population} people, but the state is ${state.population}`,
            });
        }
    }
    const ids = dataset.districts.map((district) => district.id);
    if (new Set(ids).size !== ids.length) {
        errors.push({ kind: "shape", path: "districts", message: "duplicate district id" });
    }
    return errors;
}
/**
 * One level owns a fact; every coarser level is a sum of it.
 *
 * The states own the playable nation's mass and output, and the nation's own
 * `demography.population` / `economy.gdp` are written from them at assembly
 * (`applyStateMass`). This is what makes that derivation checkable rather than
 * merely intended: a hand-edit to either national figure, or a state figure
 * changed without the assembly rerunning, fails the dataset instead of
 * shipping two numbers that disagree about how many Americans there are.
 *
 * Exact rather than tolerant, unlike the mix sums above. A share is a rounded
 * quantity and deserves a tolerance; a headcount is a headcount, and the
 * assembly that writes it does the arithmetic in the same integers this check
 * does.
 */
function checkStateMass(dataset) {
    const errors = [];
    const usa = dataset.nations.find((nation) => nation.id === "USA");
    if (!usa)
        return errors;
    const population = dataset.states.reduce((sum, state) => sum + state.population, 0);
    if (population !== usa.stats.demography.population) {
        errors.push({
            kind: "shape",
            path: "states.population",
            message: `state populations sum to ${population}, but USA.stats.demography.population is ` +
                `${usa.stats.demography.population} — the nation's figure is derived from the states, ` +
                `so one of the two was edited without the other`,
        });
    }
    const grp = dataset.states.reduce((sum, state) => sum + state.grp, 0);
    if (grp !== usa.stats.economy.gdp) {
        errors.push({
            kind: "shape",
            path: "states.grp",
            message: `state products sum to ${grp} USD millions, but USA.stats.economy.gdp is ` +
                `${usa.stats.economy.gdp} — the nation's figure is derived from the states`,
        });
    }
    errors.push(...checkCitiesFitTheNation(dataset));
    return errors;
}
/**
 * The country's metros cannot hold more people than the country.
 *
 * Checked against the nation and deliberately not against the `state` each
 * city names, which is where this check was first written and where it was
 * wrong. `City.population` is a metropolitan-area figure, and a metro is not
 * contained by the state it is filed under: the Washington metro spans
 * Maryland and Virginia, New York's spans New Jersey, Connecticut and
 * Pennsylvania, and Providence's reaches into Massachusetts. All three failed
 * a per-state containment rule while being entirely correct, because
 * `City.state` answers "whose politics does this metro sit in" rather than
 * "which state's population does it come out of".
 *
 * The nation is therefore the finest level at which containment is actually
 * true, so it is the level the rule is written at. A tighter rule would have
 * to model which share of each metro falls in which state, and nothing in the
 * game reads that.
 */
function checkCitiesFitTheNation(dataset) {
    const errors = [];
    const byNation = new Map();
    for (const city of dataset.cities) {
        const nation = city.nation;
        byNation.set(nation, (byNation.get(nation) ?? 0) + city.population);
    }
    for (const nation of dataset.nations) {
        const cities = byNation.get(nation.id);
        if (cities === undefined)
            continue;
        const population = nation.stats.demography.population;
        if (cities > population) {
            errors.push({
                kind: "plausibility",
                path: `cities.${nation.id}`,
                message: `metros in ${nation.id} hold ${cities} people, more than the nation's ${population}`,
            });
        }
    }
    return errors;
}
function checkStateEconomies(dataset) {
    const errors = [];
    for (const state of dataset.states) {
        if (!state.character)
            continue;
        const { economy } = state.character;
        const sum = economy.industrial + economy.agricultural + economy.energy + economy.tech + economy.services + economy.defense;
        if (Math.abs(sum - 1) > MIX_SUM_TOLERANCE) {
            errors.push({
                kind: "shape",
                path: `states.${state.id}.character.economy`,
                message: `economy axes sum to ${sum.toFixed(4)}, expected 1`,
            });
        }
    }
    return errors;
}
function checkStateCohorts(dataset) {
    const errors = [];
    for (const state of dataset.states) {
        if (!state.character?.cohorts)
            continue;
        const cohorts = state.character.cohorts;
        for (const axis of COHORT_AXES) {
            const cells = Object.values(cohorts[axis]);
            const sum = cells.reduce((a, b) => a + b, 0);
            if (Math.abs(sum - 1) > MIX_SUM_TOLERANCE) {
                errors.push({
                    kind: "shape",
                    path: `states.${state.id}.character.cohorts.${axis}`,
                    message: `cohort ${axis} axes sum to ${sum.toFixed(4)}, expected 1`,
                });
            }
        }
    }
    return errors;
}
function checkCityCapitals(dataset) {
    const errors = [];
    const byNation = new Map();
    for (const city of dataset.cities) {
        const nation = city.nation;
        byNation.set(nation, [...(byNation.get(nation) ?? []), city]);
    }
    if (dataset.nations.some((nation) => nation.id === "USA")) {
        const usCount = (byNation.get("USA") ?? []).length;
        if (usCount < US_CITY_FLOOR) {
            errors.push({
                kind: "shape",
                path: "cities",
                message: `United States must have at least ${US_CITY_FLOOR} cities, has ${usCount}`,
            });
        }
    }
    for (const nation of dataset.nations) {
        errors.push(...checkNationCapital(nation, byNation.get(nation.id) ?? []));
    }
    return errors;
}
function checkNationCapital(nation, cities) {
    if (cities.length < 1) {
        return [{ kind: "shape", path: "cities", message: `"${nation.id}" has no cities` }];
    }
    const capitals = cities.filter((city) => city.kind === "capital");
    if (capitals.length !== 1) {
        return [
            {
                kind: "shape",
                path: "cities",
                message: `"${nation.id}" must have exactly one capital city, has ${capitals.length}`,
            },
        ];
    }
    const capital = capitals[0];
    const errors = [];
    if (capital.name !== nation.identity.capital) {
        errors.push({
            kind: "shape",
            path: `cities.${capital.id}.name`,
            message: `capital name "${capital.name}" does not match identity.capital "${nation.identity.capital}"`,
        });
    }
    const delta = Math.hypot(capital.lat - nation.geo.lat, capital.lon - nation.geo.lon);
    if (delta > CAPITAL_COORD_TOLERANCE_DEG) {
        errors.push({
            kind: "plausibility",
            path: `cities.${capital.id}`,
            message: `capital coords are ${delta.toFixed(2)}° from Nation.geo (max ${CAPITAL_COORD_TOLERANCE_DEG})`,
        });
    }
    return errors;
}
export function validateDataset(input) {
    const parsed = WorldDataset.safeParse(input);
    if (!parsed.success) {
        return parsed.error.issues.map((issue) => ({
            kind: "shape",
            path: issue.path.join("."),
            message: issue.message,
        }));
    }
    const dataset = parsed.data;
    const errors = [];
    const nationIds = new Set(dataset.nations.map((n) => n.id));
    const orgIds = new Set(dataset.organizations.map((o) => o.id));
    const charterIds = new Set(dataset.charters.map((c) => c.id));
    const requireNation = (id, path) => {
        if (!nationIds.has(id)) {
            errors.push({ kind: "dangling-reference", path, message: `references unknown nation id "${id}"` });
        }
    };
    const requireOrg = (id, path) => {
        if (!orgIds.has(id)) {
            errors.push({ kind: "dangling-reference", path, message: `references unknown org id "${id}"` });
        }
    };
    for (const nation of dataset.nations) {
        if (!charterIds.has(nation.identity.government)) {
            errors.push({
                kind: "dangling-reference",
                path: `nations.${nation.id}.identity.government`,
                message: `references unknown charter id "${nation.identity.government}"`,
            });
        }
        const budgetUnit = checkMilitaryBudgetUnit(nation.id, nation.stats);
        if (budgetUnit)
            errors.push(budgetUnit);
        nation.geo.neighbors.forEach((id) => requireNation(id, `nations.${nation.id}.geo.neighbors`));
        nation.doctrine.alignmentPull.forEach((id) => requireNation(id, `nations.${nation.id}.doctrine.alignmentPull`));
        nation.memberships.forEach((id) => requireOrg(id, `nations.${nation.id}.memberships`));
        Object.keys(nation.stats.trade.tradeDependence).forEach((id) => requireNation(id, `nations.${nation.id}.stats.trade.tradeDependence`));
        const unitError = checkGdpPerCapitaUnit(nation.id, nation.stats);
        if (unitError)
            errors.push(unitError);
        errors.push(...checkOrderOfBattle(nation));
        errors.push(...checkFidelityDepth(nation));
        errors.push(...checkForceAssets(nation));
        // Money is stored in USD millions, so a nation whose currency *is* the
        // dollar converts at one — a rate saying otherwise is a unit error that
        // would restate every figure on screen by a factor nobody chose.
        const { currency, currencyPerUsd } = nation.identity;
        if (currency === "USD" && currencyPerUsd !== undefined && currencyPerUsd !== 1) {
            errors.push({
                kind: "currency-rate-mismatch",
                path: `nations.${nation.id}.identity.currencyPerUsd`,
                message: `"${nation.id}" holds USD, which is the unit money is already stored in, but declares a rate of ${currencyPerUsd} — expected 1 or no rate at all.`,
            });
        }
    }
    for (const rel of dataset.relationships) {
        requireNation(rel.from, `relationships[${rel.from}->${rel.to}].from`);
        requireNation(rel.to, `relationships[${rel.from}->${rel.to}].to`);
    }
    for (const org of dataset.organizations) {
        org.members.forEach((id) => requireNation(id, `organizations.${org.id}.members`));
        org.conflictsWith.forEach((id) => requireOrg(id, `organizations.${org.id}.conflictsWith`));
        // A blank line would render as two leads; the dossier reads one paragraph.
        if (/\n\s*\n/.test(org.history.trim())) {
            errors.push({
                kind: "shape",
                path: `organizations.${org.id}.history`,
                message: "org.history must be a single paragraph",
            });
        }
    }
    // Institution kinds are what content resolves its tokens through, so a
    // charter that leaves one ambiguous would render the wrong body's name at
    // the player. Exactly one assembly is required rather than merely allowed:
    // a government the player can be removed from always has some standing body
    // doing the removing, and `{{assembly}}` is the one token content may use
    // without gating on the charter it lands under.
    for (const charter of dataset.charters) {
        const byKind = new Map();
        for (const institution of charter.institutions) {
            if (!institution.kind)
                continue;
            byKind.set(institution.kind, [...(byKind.get(institution.kind) ?? []), institution.name]);
        }
        for (const [kind, names] of byKind) {
            if (names.length > 1) {
                errors.push({
                    kind: "shape",
                    path: `charters.${charter.id}.institutions`,
                    message: `two institutions claim kind "${kind}" (${names.join(", ")}) — a token cannot resolve to both`,
                });
            }
        }
        if (!byKind.has("assembly")) {
            errors.push({
                kind: "shape",
                path: `charters.${charter.id}.institutions`,
                message: 'no institution has kind "assembly" — every charter needs the standing body content can always name',
            });
        }
        // A display title for a chair the charter does not seat is a defect: the
        // title would never render, and its presence implies a role set the
        // charter does not have.
        const seated = new Set(charter.cabinetRoles);
        for (const roleId of Object.keys(charter.roleTitles ?? {})) {
            if (!seated.has(roleId)) {
                errors.push({
                    kind: "shape",
                    path: `charters.${charter.id}.roleTitles`,
                    message: `titles role "${roleId}", which is not one of this charter's cabinetRoles`,
                });
            }
        }
        const parties = charter.parties ?? [];
        const partyIds = new Set();
        const shortNames = new Set();
        for (const party of parties) {
            const id = party.id;
            if (partyIds.has(id)) {
                errors.push({
                    kind: "shape",
                    path: `charters.${charter.id}.parties`,
                    message: `duplicate party id "${id}"`,
                });
            }
            partyIds.add(id);
            if (shortNames.has(party.shortName)) {
                errors.push({
                    kind: "shape",
                    path: `charters.${charter.id}.parties`,
                    message: `duplicate party short name "${party.shortName}"`,
                });
            }
            shortNames.add(party.shortName);
        }
        errors.push(...checkPartyCohesion(charter.id, parties));
        const majors = parties.filter((party) => party.kind === "major");
        const independents = parties.filter((party) => party.kind === "independent");
        if (majors.length !== 0 && majors.length !== 2) {
            errors.push({
                kind: "shape",
                path: `charters.${charter.id}.parties`,
                message: `a named-ticket charter must author two major parties or none, not ${majors.length}`,
            });
        }
        if (independents.length > 1) {
            errors.push({
                kind: "shape",
                path: `charters.${charter.id}.parties`,
                message: `at most one independent ticket, not ${independents.length}`,
            });
        }
        errors.push(...checkPartyBeliefsDistinct(charter.id, majors));
    }
    errors.push(...checkCities(dataset, nationIds));
    errors.push(...checkSettlements(dataset));
    errors.push(...checkNationPartySystem(dataset));
    errors.push(...checkLeaderConstraints(dataset));
    errors.push(...checkStates(dataset));
    errors.push(...checkSectors(dataset));
    errors.push(...checkVitalRates(dataset));
    errors.push(...checkCostOfLivingOpening(dataset));
    errors.push(...checkDebtReproducesRatio(dataset));
    errors.push(...checkStateVitalAnchors(dataset));
    errors.push(...checkElectionTables(dataset));
    errors.push(...checkOrganizations(dataset));
    errors.push(...checkElectionCalendar(dataset));
    errors.push(...checkForceBoard(dataset));
    errors.push(...checkForcePlacement(dataset));
    errors.push(...checkSites());
    return errors;
}
