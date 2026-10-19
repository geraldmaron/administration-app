import { districtHolder, type Campaign, type UsMajorParty } from "@admin/engine";
import { districtById, districtPlaceName, stateById } from "@admin/world";

// District drill-ins read from the authored House district row plus the live
// state memory that can accumulate during a campaign.

export type DistrictDossier = {
  readonly id: string;
  readonly name: string;
  /** The short form a map writes and a reader recognizes: "PA-7", "AK-AL". */
  readonly code: string;
  /** The place the seat is known by ("Allentown", "Chicago area"), so a seat is never only a number. */
  readonly place?: string;
  readonly stateId: string;
  readonly stateName: string;
  readonly number: number;
  readonly population: number;
  readonly lean: number;
  /**
   * The authored sign-of-lean this district was drawn with. `holder` is the
   * one a screen states as fact — it is the delegation's own count, so it
   * cannot say a seat is held by a party the chamber no longer credits it to.
   */
  readonly incumbentParty: "democrat" | "republican";
  /** Undefined where the delegation has not apportioned the state, or the seat sits with an independent. */
  readonly holder?: UsMajorParty;
  readonly houseSeats?: number;
  readonly claims: number;
  readonly marks: number;
};

export function assembleDistrictDossier(campaign: Campaign, districtId: string): DistrictDossier | undefined {
  const district = districtById.get(districtId);
  if (district === undefined) return undefined;
  const stateId = district.state as string;
  const state = campaign.states[district.state];
  const stateName = state?.base.name ?? stateById.get(district.state)?.name ?? stateId;
  const holder = districtHolder(campaign, district.id);
  const place = districtPlaceName(district.id as string);
  return {
    id: district.id as string,
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
