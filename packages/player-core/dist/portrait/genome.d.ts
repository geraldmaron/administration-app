import type { Campaign } from "@admin/engine";
import { type FaceGenome, type FaceMood, type FaceTreatment, type FacedPerson } from "@admin/world";
export type PortraitOptions = {
    /** The campaign the person is seen in: it sets their age today. Absent, the record's own age. */
    readonly campaign?: Campaign;
    readonly mood?: FaceMood;
    readonly treatment?: FaceTreatment;
};
export type PortraitSpec = {
    /** Stable for one person at one age, mood and treatment, so a renderer can cache on it. */
    readonly key: string;
    readonly genome: FaceGenome;
    readonly age: number;
    readonly mood?: FaceMood;
    readonly treatment?: FaceTreatment;
};
/** What to draw for this person on this surface, or undefined when they have no face yet and get a monogram. */
export declare function portraitSpecFor(person: FacedPerson, options?: PortraitOptions): PortraitSpec | undefined;
/** One or two initials for a person drawn without a face. */
export declare function monogramFor(name: string): string;
