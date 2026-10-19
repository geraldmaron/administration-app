import type { FaceGenome, FaceMood, FaceTreatment } from "@admin/world";
import { type FaceRegion } from "./portrait/crop.js";
export type PortraitSize = "sm" | "md" | "lg" | "xl";
export type PortraitProps = {
    readonly name: string;
    readonly redacted?: boolean;
    /** The drawn face, as a URI. Absent, the person is shown by their initials. */
    readonly src?: string;
    readonly monogram?: string;
    readonly size?: PortraitSize;
    /** A portrait beside the person's own name adds nothing for a screen reader. */
    readonly decorative?: boolean;
    /** A thin ring in a party's color, for a seat whose party is the point. */
    readonly party?: "democrat" | "republican" | "independent";
};
/**
 * A face as an image URI, drawn once per genome, age, mood and treatment.
 * The face is all a portrait shows: it never carries a reading the player
 * has not earned.
 */
export declare function faceSource(genome: FaceGenome, age: number, options?: {
    readonly mood?: FaceMood;
    readonly treatment?: FaceTreatment;
    readonly key?: string;
    readonly region?: FaceRegion;
}): string;
/** A person's face in an editorial frame, or their initials when they have no face yet. */
export declare function Portrait({ name, src, monogram, size, decorative, party, redacted }: PortraitProps): import("react").JSX.Element;
