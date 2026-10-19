import type { StateId } from "../schemas/state.js";
export type DistrictFigure = {
    readonly id: string;
    readonly state: StateId;
    readonly number: number;
    readonly population: number;
    readonly lean: number;
    readonly incumbentParty: "democrat" | "republican";
};
export declare const DISTRICT_FIGURES: readonly DistrictFigure[];
