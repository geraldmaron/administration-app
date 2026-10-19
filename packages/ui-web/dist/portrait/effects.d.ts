/** Blur radii, in frame units, named by what they soften. */
export declare const SOFT: {
    readonly edge: "e";
    readonly fold: "f";
    readonly form: "m";
    readonly glow: "g";
};
export declare const blurRef: (id: string, key: (typeof SOFT)[keyof typeof SOFT]) => string;
export declare function effectDefs(id: string): string;
/** Drawn last: the grain and the vignette that make the frame a photograph of a sitting. */
export declare function finish(id: string): string;
