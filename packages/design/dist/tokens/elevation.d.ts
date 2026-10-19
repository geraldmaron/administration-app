export declare const elevation: {
    /** No lift. The page itself, and anything drawn into it rather than onto it. */
    readonly ground: {
        readonly boxShadow: "none";
        readonly elevation: 0;
    };
    /**
     * A well. Recessed *into* the surface it sits in: the occlusion moves to the
     * top inside edge and the light to the bottom, which is the inverse of a
     * raised plate and reads as depth going the other way.
     */
    readonly inset: {
        readonly boxShadow: readonly [{
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 3;
            readonly color: "rgba(1,3,10,0.7)";
            readonly inset: true;
        }, {
            readonly offsetX: 0;
            readonly offsetY: -1;
            readonly blurRadius: 0;
            readonly color: "rgba(226,184,102,0.24)";
            readonly inset: true;
        }];
        readonly elevation: 0;
    };
    /** A routine plate on the room ground: a bento cell, a content card, a document. */
    readonly card: {
        readonly boxShadow: readonly [{
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 0;
            readonly color: "rgba(226,184,102,0.24)";
            readonly inset: true;
        }, {
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 2;
            readonly color: "rgba(1,3,10,0.7)";
        }, {
            readonly offsetX: 0;
            readonly offsetY: 12;
            readonly blurRadius: 32;
            readonly spreadDistance: -12;
            readonly color: "rgba(1,3,12,0.62)";
        }];
        readonly elevation: 2;
    };
    /** The screen's leading surface, and the functional layer that floats over the room. */
    readonly raised: {
        readonly boxShadow: readonly [{
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 0;
            readonly color: "rgba(240,206,140,0.34)";
            readonly inset: true;
        }, {
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 3;
            readonly color: "rgba(1,3,10,0.7)";
        }, {
            readonly offsetX: 0;
            readonly offsetY: 24;
            readonly blurRadius: 56;
            readonly spreadDistance: -18;
            readonly color: "rgba(1,3,12,0.62)";
        }];
        readonly elevation: 6;
    };
    /**
     * The bottom bar. The room is *above* it and scrolls under its top edge, so
     * the cast throws upward onto that room and the occlusion sits on the same
     * edge the content passes under. A top header wants `raised` instead, whose
     * cast throws the other way.
     */
    readonly dock: {
        readonly boxShadow: readonly [{
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 0;
            readonly color: "rgba(240,206,140,0.34)";
            readonly inset: true;
        }, {
            readonly offsetX: 0;
            readonly offsetY: -1;
            readonly blurRadius: 0;
            readonly color: "rgba(1,3,10,0.7)";
        }, {
            readonly offsetX: 0;
            readonly offsetY: -10;
            readonly blurRadius: 24;
            readonly spreadDistance: -6;
            readonly color: "rgba(1,3,12,0.62)";
        }];
        readonly elevation: 8;
    };
    /** A tray or sheet over a scrimmed room — the deepest cast in the scale. */
    readonly sheet: {
        readonly boxShadow: readonly [{
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 0;
            readonly color: "rgba(240,206,140,0.34)";
            readonly inset: true;
        }, {
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 0;
            readonly color: "rgba(1,3,10,0.7)";
        }, {
            readonly offsetX: 0;
            readonly offsetY: 36;
            readonly blurRadius: 88;
            readonly spreadDistance: -24;
            readonly color: "rgba(1,3,12,0.78)";
        }];
        readonly elevation: 12;
    };
    /**
     * The committing action's halo. Its fill is the light end of the action
     * ramp, so the light comes *off* it: a bloom outward, plus an occlusion so a
     * near-white control still reads as resting on the plate rather than cut out
     * of it.
     */
    readonly glow: {
        readonly boxShadow: readonly [{
            readonly offsetX: 0;
            readonly offsetY: 1;
            readonly blurRadius: 2;
            readonly color: "rgba(1,3,10,0.7)";
        }, {
            readonly offsetX: 0;
            readonly offsetY: 0;
            readonly blurRadius: 20;
            readonly spreadDistance: -2;
            readonly color: "rgba(111,168,255,0.38)";
        }, {
            readonly offsetX: 0;
            readonly offsetY: 10;
            readonly blurRadius: 24;
            readonly spreadDistance: -8;
            readonly color: "rgba(1,3,12,0.62)";
        }];
        readonly elevation: 10;
    };
};
export type ElevationToken = typeof elevation;
