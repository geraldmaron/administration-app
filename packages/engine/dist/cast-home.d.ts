import { type City, type StateId } from "@admin/world";
/**
 * The places in one state a person can be from: the dataset's own cities there,
 * or the state itself where the dataset names none (Delaware, Montana and
 * Wyoming), since a President from Wyoming is still from Wyoming.
 */
export declare function birthplacesInState(state: StateId): readonly string[];
/** The dataset city a birthplace label names, if it names one. */
export declare function cityOfBirthplace(label: string | undefined): City | undefined;
/** The state a birthplace label names, if it names one. */
export declare function stateOfBirthplace(label: string | undefined): StateId | undefined;
/** The census region a state sits in. */
export declare function stateRegion(state: StateId | undefined): string | undefined;
