import { type CampaignSeed } from "./rng.js";
import type { FoundingMandate } from "./state-founding.js";
import type { AdministrationParty, ChamberComposition, UsMajorParty } from "./state-legislature.js";
/**
 * How far toward the President's party each mandate moves the national
 * environment, in the same margin units a state's lean is written in. A
 * landslide on the scale of 2008 carries about forty House seats; winning the
 * electoral count while losing the popular vote carries none and costs a few.
 */
export declare const MANDATE_ENVIRONMENT: Readonly<Record<FoundingMandate, number>>;
export type PartySeats = {
    readonly democrat: number;
    readonly republican: number;
    readonly independent: number;
};
export type OpeningSeats = {
    readonly house: PartySeats;
    readonly senate: PartySeats;
};
/** The mandate the founding opens on: the one declared, or the seed's own. */
export declare function openingMandate(seed: CampaignSeed, declared: FoundingMandate | undefined): FoundingMandate;
/**
 * The seats each party holds on the first morning.
 *
 * An Independent President carries in only the part of a mandate their reach
 * extends to, toward the caucus they sit nearest: nobody ran on a ticket below
 * them.
 */
export declare function openingSeats(seed: CampaignSeed, mandate: FoundingMandate, administrationParty: AdministrationParty, caucusAnchor: UsMajorParty): OpeningSeats;
/** The same seats, counted along the administration's own axis. */
export declare function compositionFromSeats(seats: PartySeats, caucusAnchor: UsMajorParty): ChamberComposition;
