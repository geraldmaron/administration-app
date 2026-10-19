export type StatDefinition = {
    readonly path: string;
    /** What measures it, in plain words, from the metric registry. */
    readonly measures?: string;
    /** What it changes in this game, as plain names of the systems that read it. */
    readonly readBy: readonly string[];
};
/** The definition of one stats path — `economy.growth`, `politics.regimeStability`. */
export declare function statDefinition(path: string): StatDefinition;
