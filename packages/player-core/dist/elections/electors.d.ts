import { type Campaign } from "@admin/engine";
import type { FinaleChamber, FinaleContest } from "./finale";
export type ElectorBlock = {
    readonly party: "democrat" | "republican";
    readonly label: string;
    readonly seats: number;
};
export type ElectorsReading = {
    readonly parties: readonly ElectorBlock[];
    readonly majority: number;
    readonly total: number;
    readonly verdict: string;
    /** States the night split between the two sides: Maine and Nebraska, by district. */
    readonly splitStates: number;
};
/** The electoral college of a decided night, administration and opposition seated by party, Democrats on the left. */
export declare function electorsReading(campaign: Campaign, contest: FinaleContest): ElectorsReading;
export type ClosestCall = {
    readonly state: string;
    readonly name: string;
    readonly electoralVotes: number;
    readonly forYou: boolean;
    /** "Carried by 1 point" or "Lost by 2 points", in whole points of the two-way vote. */
    readonly margin: string;
};
/** Every state the night was counted in, narrowest margin first. */
export declare function closestCalls(contest: FinaleContest): readonly ClosestCall[];
/** A chamber the next President meets, seated by party from the left, as the hemicycle draws it. */
export declare function finaleChamberParties(chamber: FinaleChamber): readonly {
    readonly party: "democrat" | "republican" | "independent";
    readonly seats: number;
    readonly label: string;
}[];
