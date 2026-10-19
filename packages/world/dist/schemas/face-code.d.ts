import { FaceGenome } from "./face.js";
export declare const FACE_REF_PREFIX = "face:";
export declare function encodeFace(genome: FaceGenome): string;
export declare function decodeFace(code: string): FaceGenome;
/** The `portraitRef` an authored face is stored as. */
export declare function faceRef(genome: FaceGenome): string;
export declare function isFaceRef(ref: string): boolean;
export declare function parseFaceRef(ref: string): FaceGenome;
