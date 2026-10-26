import { StateDisasterEligibility, type CityId, type DisasterKind, type StateId } from "../schemas/index.js";
export declare const STATE_DISASTER_ELIGIBILITY: StateDisasterEligibility;
export declare const US_SIGNIFICANT_HAZARDS_PER_YEAR: Readonly<Record<DisasterKind, number>>;
export declare const US_HAZARD_RATE_SERIES: Readonly<Record<DisasterKind, "noaa-billion-dollar" | "fema-declaration" | "hhs-phe">>;
export type StateHazardExposure = Readonly<Partial<Record<DisasterKind, Readonly<Partial<Record<StateId, number>>>>>>;
export declare const STATE_HAZARD_EXPOSURE: StateHazardExposure;
/**
 * What an eligible state with no event in the record still carries, in events a
 * year: half an event over the record's span (add-half smoothing). Without it a
 * state the gate admits but twenty quiet years never named could never be
 * struck, which would make the record a second, stricter gate.
 */
export declare const HAZARD_EXPOSURE_FLOOR: Readonly<Partial<Record<DisasterKind, number>>>;
export declare const CITY_TORNADOES_PER_YEAR: Readonly<Record<CityId, number>>;
