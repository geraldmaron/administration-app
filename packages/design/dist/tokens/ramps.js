import { color } from "./color.js";
// Data colors: what a choropleth, a diverging lens or a chart series may be
// filled with. They are kept apart from the stance and party ramps on purpose.
// A stance says whether a reading is good for the President and a party says
// who holds a seat; a data ramp only says "more" or "which one", and borrowing
// either meaning would make a map of trade volume read as a map of danger.
//
// Every step clears 3:1 against the ground it is drawn on, so no data class
// can vanish into the ocean or the chart canvas. ramps.test.ts holds that, and
// holds each ramp to the property its kind needs: lightness alone orders the
// sequential ramp (so the order survives every color-vision deficiency), the
// diverging arms stay level with each other, and categorical hues stay apart.
/** Low to high: slate to parchment, lighter at every step. */
const mapSequential = ["#4D6E9A", "#607F9E", "#8A9296", "#A8A58E", "#C4BA8A", "#DDD096", "#F2E6A8"];
/**
 * Far negative to far positive around a neutral midpoint at index 3. The arms
 * are the `position` poles, cool against warm and matched in lightness step
 * for step, so neither end of a trust or alignment lens looks like the side to
 * be on.
 */
const mapDiverging = [
    "#A9C8F0",
    color.position.low,
    "#6A87AE",
    "#6B7580",
    "#A08262",
    color.position.high,
    "#EEC592",
];
/** Named things with no order: regime types, blocs, commodity groups. Never drawn without a legend. */
// Held a step below full saturation so a legend of eight sits on the navy
// ground beside the red, white, blue and gold of the chrome instead of
// shouting over it, while each hue stays the 30 degrees from its neighbors
// that the test asks for.
const categorical = ["#D9826A", "#D4B860", "#94BE6E", "#5EBC98", "#5AB2D2", "#8494EC", "#AE88E0", "#D480AE"];
export const ramp = {
    mapSequential,
    mapDiverging,
    categorical,
    /**
     * Line and bar series, taken from the categorical ramp in an order that keeps
     * the first three furthest apart, since most charts draw two or three.
     */
    chartSeries: [categorical[4], categorical[0], categorical[2], categorical[6], categorical[1], categorical[7]],
    chartGrid: color.border.grid,
};
/**
 * The world and states boards' fills and edges, on the near-black navy ramp:
 * land a small step above the page, stance fills dark and desaturated so the
 * map reads as data on a quiet ground rather than a blue slab. Named so the
 * stylesheet can point at a token instead of restating a hex.
 */
export const mapBoard = {
    land: "#161E29",
    landEdge: "#2A3441",
    modeled: "#1E2835",
    modeledHover: "#283445",
    unmodeled: "#0F151D",
    unmodeledEdge: "#1C2430",
    favorable: "#2A8F6A",
    neutral: "#3A4E6B",
    caution: "#B8862F",
    adverse: "#B8455A",
    own: "#4F86D9",
    disputedEdge: "#5E6A7D",
    leanCenter: "#454A5C",
    /** An evenly split House delegation: the even mix of the two party colors. */
    split: "#8D6695",
};
