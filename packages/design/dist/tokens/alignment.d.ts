/**
 * Shared geometry for dense institutional layouts: label/value columns, face
 * slots, row heights, and context-rail widths. Prefer these over magic numbers
 * so Desk / World / Policy / Congress align on the same axes.
 */
export declare const alignment: {
    /** Fixed label column before a value (MetricRow and its cousins). */
    readonly labelCol: 128;
    /** Tabular value column width for percentage / money figures. */
    readonly valueCol: 72;
    /** Gap between label and value on one baseline. */
    readonly labelValueGap: 8;
    /** Vertical gap between stacked reading rows. */
    readonly rowGap: 4;
    /** Section axis gap (between chapter blocks). */
    readonly axisGap: 12;
    /** Face / icon / glyph slots so rows share a left edge. */
    readonly slot: {
        readonly face: 40;
        readonly faceCompact: 36;
        readonly icon: 28;
        readonly glyph: 22;
    };
    /** Row heights — visual, not touch (touch stays on `control.touchTarget`). */
    readonly rowHeight: {
        readonly compact: 44;
        readonly standard: 56;
        readonly comfortable: 64;
    };
    /** Persistent context rail on tablet/desktop. */
    readonly railWidth: {
        readonly compact: 280;
        readonly standard: 320;
        readonly wide: 360;
    };
    /** Baseline rhythm under a caption-above-reading pair. */
    readonly baselineGap: 4;
};
export type AlignmentToken = typeof alignment;
