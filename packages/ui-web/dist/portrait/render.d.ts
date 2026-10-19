import type { FaceGenome, Mood, Treatment } from "./types";
export type RenderOptions = {
    readonly age: number;
    /** What the moment shows on the face; the genome's resting expression when absent. */
    readonly mood?: Mood;
    /** How the surface presents the person: an official portrait unless the record says otherwise. */
    readonly treatment?: Treatment;
    /** Prefix for clip and gradient ids, unique per face when several share a document. */
    readonly id?: string;
    readonly backdrop?: boolean;
};
/** A mood moves the expression genes for one rendering; it never touches the stored face. */
export declare function withMood(g: FaceGenome, mood: Mood | undefined): FaceGenome;
export declare function renderFace(genome: FaceGenome, options: RenderOptions): string;
