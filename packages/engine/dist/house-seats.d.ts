import { type District, type StateId } from "@admin/world";
import type { StateRuntime } from "./state.js";
import type { ChamberComposition, UsMajorParty } from "./state-legislature.js";
/** A state's House seats by party. `other` is the independents and the vacancies. */
export type HouseSeats = {
    readonly democrat: number;
    readonly republican: number;
    readonly other: number;
};
type Target = {
    readonly democrat: number;
    readonly republican: number;
};
/** Every district of a state, most Democratic first, the id breaking ties so every machine agrees. */
export declare function districtsOf(state: StateId): readonly District[];
/** A state's seat leans as an election reads them, most Democratic first. */
export declare function seatLeans(state: StateId): readonly number[];
/** The roster's delegation for a state. DC's delegate does not vote on the floor, so it has none. */
export declare function rosterSeats(state: StateId): HouseSeats;
/** A seated delegation, read back from the administration's axis into parties. */
export declare function seatsOfDelegation(house: ChamberComposition, anchor: UsMajorParty): HouseSeats;
/** The seats as held before this election: the live delegation, or the roster where none is seated yet. */
export declare function heldHouseSeats(states: Readonly<Record<StateId, StateRuntime>>, anchor: UsMajorParty): readonly HouseSeats[];
/**
 * The House an election returns, from the seats as they were held.
 *
 * Every seat is on the ballot, so the vacancies are filled; what is left once
 * both parties hold their counts is the chamber's independents.
 */
export declare function electHouse(held: readonly HouseSeats[], target: Target): readonly HouseSeats[];
/** The chamber's party counts, read off the administration's axis. */
export declare function partyTarget(chamber: ChamberComposition, anchor: UsMajorParty): Target;
/** One state's elected seats on the administration's axis, every seat filled. */
export declare function houseComposition(row: HouseSeats, anchor: UsMajorParty): ChamberComposition;
export {};
