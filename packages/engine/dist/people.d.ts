import { Person, type BenchParty, type City, type Charter, type Nation, type Party, type PersonPoolSpec, type PortraitFacets, type PortraitGenderPresentation } from "@admin/world";
import { type NameLedger } from "./naming.js";
import type { RngStream, RngStreams } from "./rng.js";
export declare function rollPortraitFacets(stream: RngStream, nation: string, role: string, age: number, gender: PortraitGenderPresentation, party?: BenchParty): PortraitFacets;
/**
 * A place said the way somebody from there would say it.
 *
 * A US metro takes its state, because three Springfields and two Portlands are
 * three and two different hometowns, and because naming the state is how an
 * American answers the question at all. Everywhere else the city stands alone:
 * the dataset holds no second tier of place outside the United States, and
 * inventing one would be the fabrication this field exists to avoid.
 */
export declare function birthplaceLabel(city: City): string;
/**
 * The places a person from this nation may be said to be born in — empty where
 * the dataset does not name enough of them to clear `MIN_BIRTHPLACES`.
 *
 * Exported because the player's own person is composed rather than drawn and
 * has to answer the same question off the same list (leader.ts).
 */
export declare function birthplacePool(nation: string): readonly string[];
export declare function generateRolePerson(spec: PersonPoolSpec, nationName: string, role: string, index: number, streams: RngStreams, taken?: NameLedger, parties?: readonly Party[], forcedParty?: Party): Person;
export declare function generateNationPool(spec: PersonPoolSpec, nationName: string, streams: RngStreams, parties?: readonly Party[]): Person[];
export declare function generateWorldPool(nations: readonly Nation[], specs: readonly PersonPoolSpec[], streams: RngStreams, charters?: readonly Charter[]): Person[];
export declare function candidatesForRole(pool: readonly Person[], nation: string, role: string): Person[];
