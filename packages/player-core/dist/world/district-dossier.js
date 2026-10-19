import { districtHolder } from "@admin/engine";
import { districtById, districtPlaceName, stateById } from "@admin/world";
export function assembleDistrictDossier(campaign, districtId) {
    const district = districtById.get(districtId);
    if (district === undefined)
        return undefined;
    const stateId = district.state;
    const state = campaign.states[district.state];
    const stateName = state?.base.name ?? stateById.get(district.state)?.name ?? stateId;
    const holder = districtHolder(campaign, district.id);
    const place = districtPlaceName(district.id);
    return {
        id: district.id,
        name: district.number === 0 ? `${stateName} at-large` : `${stateName}-${district.number}`,
        code: district.number === 0 ? `${stateId}-AL` : `${stateId}-${district.number}`,
        ...(place ? { place } : {}),
        stateId,
        stateName,
        number: district.number,
        population: district.population,
        lean: district.lean,
        incumbentParty: district.incumbentParty,
        ...(holder ? { holder } : {}),
        ...(state?.delegation?.house.seats !== undefined ? { houseSeats: state.delegation.house.seats } : {}),
        claims: state?.claims.length ?? 0,
        marks: state?.marks.length ?? 0,
    };
}
