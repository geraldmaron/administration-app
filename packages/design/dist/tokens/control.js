import { spacing } from "./spacing.js";
/**
 * One density contract for every control family. The visual control may be
 * smaller than a finger target, but the interactive target never is.
 *
 * The scale is a step taller than a desktop admin tool's. Every one of these
 * heights is also a phone control, and a committing act on a phone is pressed
 * with a thumb while the player is deciding something — 48px was the floor, not
 * a comfortable size.
 */
export const control = {
    height: {
        compact: 34,
        standard: 44,
        segmented: 38,
        icon: 40,
        block: 54,
        hold: 54,
    },
    row: {
        compact: 44,
        standard: 56,
    },
    touchTarget: 44,
    paddingInline: {
        compact: spacing.md,
        standard: spacing.lg,
        block: spacing.xl,
    },
};
/** Extra hit area needed on each side to meet the 44px touch floor. */
export function controlHitInset(height) {
    return Math.max(0, Math.ceil((control.touchTarget - height) / 2));
}
