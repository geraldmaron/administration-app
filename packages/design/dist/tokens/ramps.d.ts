export declare const ramp: {
    readonly mapSequential: readonly ["#4D6E9A", "#607F9E", "#8A9296", "#A8A58E", "#C4BA8A", "#DDD096", "#F2E6A8"];
    readonly mapDiverging: readonly ["#A9C8F0", "#7FA6D9", "#6A87AE", "#6B7580", "#A08262", "#D9A46A", "#EEC592"];
    readonly categorical: readonly ["#D9826A", "#D4B860", "#94BE6E", "#5EBC98", "#5AB2D2", "#8494EC", "#AE88E0", "#D480AE"];
    /**
     * Line and bar series, taken from the categorical ramp in an order that keeps
     * the first three furthest apart, since most charts draw two or three.
     */
    readonly chartSeries: readonly ["#5AB2D2", "#D9826A", "#94BE6E", "#AE88E0", "#D4B860", "#D480AE"];
    readonly chartGrid: "#26334F";
};
/**
 * The world and states boards' fills and edges, on the near-black navy ramp:
 * land a small step above the page, stance fills dark and desaturated so the
 * map reads as data on a quiet ground rather than a blue slab. Named so the
 * stylesheet can point at a token instead of restating a hex.
 */
export declare const mapBoard: {
    readonly land: "#161E29";
    readonly landEdge: "#2A3441";
    readonly modeled: "#1E2835";
    readonly modeledHover: "#283445";
    readonly unmodeled: "#0F151D";
    readonly unmodeledEdge: "#1C2430";
    readonly favorable: "#2A8F6A";
    readonly neutral: "#3A4E6B";
    readonly caution: "#B8862F";
    readonly adverse: "#B8455A";
    readonly own: "#4F86D9";
    readonly disputedEdge: "#5E6A7D";
    readonly leanCenter: "#454A5C";
    /** An evenly split House delegation: the even mix of the two party colors. */
    readonly split: "#8D6695";
};
export type RampToken = typeof ramp;
export type MapBoardToken = typeof mapBoard;
