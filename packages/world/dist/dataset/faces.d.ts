import { FaceGenome } from "../schemas/face.js";
import type { Person } from "../schemas/person.js";
import { type PortraitFacets } from "../schemas/portrait.js";
export type FaceContext = {
    /** Their age when the facets were drawn: graying is solved against it. */
    readonly age: number;
    readonly nation?: string;
    /** The naming tradition the person's name was drawn from, where the bank records one. */
    readonly tradition?: string;
    /** The seats they can hold: the bench sits for its portrait in a robe. */
    readonly roles?: readonly string[];
    /** Traits the game shows. Only public character reaches the face. */
    readonly traits?: readonly string[];
};
type Draw = () => number;
/** A private stream per face, so drawing one never disturbs another. */
export declare function faceDraw(seed: string): Draw;
/** A whole face from a person's facets. Deterministic in the seed. */
export declare function generateFace(f: PortraitFacets, seed: string, ctx: FaceContext): FaceGenome;
export type FacedPerson = Pick<Person, "id" | "name" | "nationality" | "age" | "portraitRef" | "traits" | "eligibleRoles">;
/**
 * The face a person's record describes: the authored genome where the
 * portraitRef carries one, otherwise the one their facets, name, seats and
 * traits generate. Undefined for a ref that is neither, which is the President
 * before a face is chosen; the portrait draws their monogram.
 */
export declare function faceForPerson(person: FacedPerson): FaceGenome | undefined;
export {};
