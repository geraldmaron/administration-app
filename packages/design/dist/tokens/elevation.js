// Depth for a dark ground.
//
// The scale this replaces was specified for porcelain: black at 6–12% opacity,
// offset downward, no highlight. On navy that is close to a no-op — the shadow
// is already the ground — so every surface in the product was left reading as a
// flat outlined box, with the hairline doing all the work.
//
// **The specular edge is the only cue that actually carries here.** An opaque
// pure-black shadow over `ground.base` reaches 1.10:1; there is no alpha that
// makes a cast read on a #001028 page. So the levels below are weighted
// accordingly rather than pretending all three cues are equal:
//
// 1. **A specular top edge**, drawn as a 1px inset highlight — the load-bearing
//    cue, and the only one that goes lighter and therefore has no ceiling. A
//    raised surface catches the implied light on its top edge. Composited over
//    the ground each level is drawn on it clears 1.3:1, which `tokens.test.ts`
//    asserts, because at the alpha this scale shipped with it did not.
// 2. **Ambient occlusion**, a tight line under the raised edge. Sits near its
//    arithmetic ceiling (~1.07:1) and is worth keeping at that — it stops the
//    edge floating — but it is not what makes the surface read as lifted.
// 3. **A cast with spread**, pulled in with a negative spread so it stays a
//    shadow under the object rather than a glow around it. Atmosphere. On this
//    ground it is the weakest of the three by a wide margin.
//
// A fourth cue, a raised surface being lighter than its ground, is carried by
// the navy ramp in color.ts, not here. Both are needed: the tonal step says
// which surface is on top, and these say there is light in the room.
//
// **Which level goes on which chrome.** The cast has a direction, so the edge
// a piece of chrome sits on decides its level, not its importance: the bottom
// dock throws its cast *up* (`dock`), a top header throws it *down*
// (`raised`), and a full-height vertical rail gets no cast at all — its cue is
// the ramp step and its hairline, because a floor-to-ceiling seam is a seam,
// not a slab hovering over the room.
//
// Colors are the `shadow` group in color.ts, on the navy axis. None of them
// carries information — the boundary a low-vision player navigates by is the
// hairline every raised surface still draws, which `contrast.border` replaces
// under increased contrast.
import { color } from "./color.js";
export const elevation = {
    /** No lift. The page itself, and anything drawn into it rather than onto it. */
    ground: { boxShadow: "none", elevation: 0 },
    /**
     * A well. Recessed *into* the surface it sits in: the occlusion moves to the
     * top inside edge and the light to the bottom, which is the inverse of a
     * raised plate and reads as depth going the other way.
     */
    inset: {
        boxShadow: [
            { offsetX: 0, offsetY: 1, blurRadius: 3, color: color.shadow.occlusion, inset: true },
            { offsetX: 0, offsetY: -1, blurRadius: 0, color: color.shadow.specular, inset: true },
        ],
        elevation: 0,
    },
    /** A routine plate on the room ground: a bento cell, a content card, a document. */
    card: {
        boxShadow: [
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: color.shadow.specular, inset: true },
            { offsetX: 0, offsetY: 1, blurRadius: 2, color: color.shadow.occlusion },
            { offsetX: 0, offsetY: 12, blurRadius: 32, spreadDistance: -12, color: color.shadow.cast },
        ],
        elevation: 2,
    },
    /** The screen's leading surface, and the functional layer that floats over the room. */
    raised: {
        boxShadow: [
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: color.shadow.specularStrong, inset: true },
            { offsetX: 0, offsetY: 1, blurRadius: 3, color: color.shadow.occlusion },
            { offsetX: 0, offsetY: 24, blurRadius: 56, spreadDistance: -18, color: color.shadow.cast },
        ],
        elevation: 6,
    },
    /**
     * The bottom bar. The room is *above* it and scrolls under its top edge, so
     * the cast throws upward onto that room and the occlusion sits on the same
     * edge the content passes under. A top header wants `raised` instead, whose
     * cast throws the other way.
     */
    dock: {
        boxShadow: [
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: color.shadow.specularStrong, inset: true },
            { offsetX: 0, offsetY: -1, blurRadius: 0, color: color.shadow.occlusion },
            { offsetX: 0, offsetY: -10, blurRadius: 24, spreadDistance: -6, color: color.shadow.cast },
        ],
        elevation: 8,
    },
    /** A tray or sheet over a scrimmed room — the deepest cast in the scale. */
    sheet: {
        boxShadow: [
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: color.shadow.specularStrong, inset: true },
            { offsetX: 0, offsetY: 1, blurRadius: 0, color: color.shadow.occlusion },
            { offsetX: 0, offsetY: 36, blurRadius: 88, spreadDistance: -24, color: color.shadow.castStrong },
        ],
        elevation: 12,
    },
    /**
     * The committing action's halo. Its fill is the light end of the action
     * ramp, so the light comes *off* it: a bloom outward, plus an occlusion so a
     * near-white control still reads as resting on the plate rather than cut out
     * of it.
     */
    glow: {
        boxShadow: [
            { offsetX: 0, offsetY: 1, blurRadius: 2, color: color.shadow.occlusion },
            { offsetX: 0, offsetY: 0, blurRadius: 20, spreadDistance: -2, color: color.shadow.bloom },
            { offsetX: 0, offsetY: 10, blurRadius: 24, spreadDistance: -8, color: color.shadow.cast },
        ],
        elevation: 10,
    },
};
