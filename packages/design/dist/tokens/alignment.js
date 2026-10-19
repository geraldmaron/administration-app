import { control } from "./control.js";
import { spacing } from "./spacing.js";
/**
 * Shared geometry for dense institutional layouts: label/value columns, face
 * slots, row heights, and context-rail widths. Prefer these over magic numbers
 * so Desk / World / Policy / Congress align on the same axes.
 */
export const alignment = {
    /** Fixed label column before a value (MetricRow and its cousins). */
    labelCol: 128,
    /** Tabular value column width for percentage / money figures. */
    valueCol: 72,
    /** Gap between label and value on one baseline. */
    labelValueGap: spacing.sm,
    /** Vertical gap between stacked reading rows. */
    rowGap: spacing.xs,
    /** Section axis gap (between chapter blocks). */
    axisGap: spacing.md,
    /** Face / icon / glyph slots so rows share a left edge. */
    slot: {
        face: 40,
        // Matches avatar-data.ts's FACE_DIMENSIONS.small (36) — PersonRow is the
        // one consumer, and every real caller draws a `size="small"` face there.
        // A slot narrower than the face it holds clips or overflows the frame; the
        // slot has to track the face size, not the other way around.
        faceCompact: 36,
        icon: 28,
        glyph: 22,
    },
    /** Row heights — visual, not touch (touch stays on `control.touchTarget`). */
    rowHeight: {
        compact: control.row.compact,
        standard: control.row.standard,
        comfortable: 64,
    },
    /** Persistent context rail on tablet/desktop. */
    railWidth: {
        compact: 280,
        standard: 320,
        wide: 360,
    },
    /** Baseline rhythm under a caption-above-reading pair. */
    baselineGap: spacing.xs,
};
