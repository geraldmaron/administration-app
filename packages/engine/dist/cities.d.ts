import { type City, type CityId, type NationId } from "@admin/world";
import type { Campaign, CityRuntime } from "./state.js";
import type { UsMajorParty } from "./state-legislature.js";
import type { TurnPhase } from "./turn-loop.js";
/** Signed US lean change is worth this much of a national vote. */
export declare const CITY_VOTE_LEVERAGE = 0.25;
/** Mean-reversion of US adminLean toward opening, per weekly turn. */
export declare const CITY_LEAN_DRIFT = 0.004;
/**
 * Opening signed lean toward the administration's caucus anchor. Foreign cities
 * have none. Anchored rather than presidential because how a city votes is a
 * fact about the city: the two tickets on its ballot are the same two whoever
 * won the presidency.
 */
export declare function openingAdminLean(city: City, caucusAnchor: UsMajorParty): number | undefined;
/**
 * Seed every dataset city. US rows get adminLean from the sealed anchor (or
 * `caucusAnchor` when founding has it before congress is on the object).
 */
export declare function openingCities(campaign: Pick<Campaign, "congress">, caucusAnchor?: UsMajorParty): Readonly<Record<CityId, CityRuntime>>;
export declare function selectCity(campaign: Campaign, id: CityId): CityRuntime | undefined;
export declare function selectCitiesForNation(campaign: Campaign, nation: NationId): readonly CityRuntime[];
/**
 * Population-weighted US lean change since founding, times leverage.
 * Opening lean is recomputed from dataset.demShare + the sealed anchor.
 *
 * Scaled by reach: the swing is measured on the partisan axis, and an
 * administration with no party banks less of a partisan swing than the party
 * that was on the ballot beneath it — including the swing it caused itself.
 */
export declare function selectUsCityVoteDriver(campaign: Campaign): number;
export declare const cityPhase: TurnPhase;
