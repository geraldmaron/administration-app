// Compiles authored gazetteer recipes and domestic signatures into engine
// effects. City / state / sector recipes land on the place the scenario was
// resolved to; domestic signatures route systemically through routeDomestic.
// A reply may carry either or both.
import { TURNS_PER_YEAR, routeCohorts, routeDomestic, } from "@admin/engine";
function cityGazetteerEffect(city, recipe, reason) {
    const deltas = {
        ...(recipe.cityEmployment === undefined ? {} : { employment: recipe.cityEmployment }),
        ...(recipe.taxBase === undefined ? {} : { taxBase: recipe.taxBase }),
        ...(recipe.adminLean === undefined ? {} : { adminLean: recipe.adminLean }),
    };
    const set = recipe.taxHolidayYears === undefined ? undefined : { taxHolidayTurns: recipe.taxHolidayYears * TURNS_PER_YEAR };
    if (Object.keys(deltas).length === 0 && set === undefined)
        return undefined;
    return {
        kind: "city",
        city,
        ...(Object.keys(deltas).length > 0 ? { deltas } : {}),
        ...(set === undefined ? {} : { set }),
        reason,
    };
}
/**
 * The city and state come from the resolved locus when there is one, so the
 * effect lands where the briefing was datelined: the authored place, the bound
 * condition's, the story's earlier scene or the drawn one. Without a resolved
 * locus they fall back to what the scenario authored. A resolved locus abroad
 * names no home city or state, so the authored ones stand.
 */
export function gazetteerEffects(campaign, def, recipe, reason, locus) {
    const effects = [];
    const home = locus === undefined || locus.nation === campaign.founding.nation;
    const cityId = (home ? locus?.city : undefined) ?? def.locus.city;
    const stateId = (home ? locus?.state : undefined) ?? def.locus.state;
    if (cityId) {
        const city = cityGazetteerEffect(cityId, recipe, reason);
        if (city)
            effects.push(city);
    }
    if (recipe.stateLean !== undefined && stateId) {
        effects.push({ kind: "state", state: stateId, deltas: { lean: recipe.stateLean }, reason });
    }
    if ((recipe.sectorEmployment !== undefined || recipe.sectorLaborPressure !== undefined) && def.locus.sector) {
        effects.push({
            kind: "sector",
            nation: campaign.founding.nation,
            sector: def.locus.sector,
            deltas: {
                ...(recipe.sectorEmployment === undefined ? {} : { employment: recipe.sectorEmployment }),
                ...(recipe.sectorLaborPressure === undefined ? {} : { laborPressure: recipe.sectorLaborPressure }),
            },
            reason,
        });
    }
    return effects;
}
/**
 * Compiles a domestic signature into state lean/marks plus cohort strain.
 * Same spine as nations (Grudge) and places (GrievanceMark): one signature,
 * many subjects. routeCohorts needs the state effects that actually landed
 * so geography weighting follows who was moved, not every state on the map.
 */
export function domesticSignatureEffects(campaign, signature) {
    const routed = routeDomestic(campaign, signature);
    const cohorts = routeCohorts(campaign, signature, routed);
    return [...routed, ...cohorts];
}
