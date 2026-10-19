import { type Campaign, type UsMajorParty } from "@admin/engine";
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
export declare function assembleDistrictDossier(campaign: Campaign, districtId: string): DistrictDossier | undefined;
