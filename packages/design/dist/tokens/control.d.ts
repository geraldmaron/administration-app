/**
 * One density contract for every control family. The visual control may be
 * smaller than a finger target, but the interactive target never is.
 *
 * The scale is a step taller than a desktop admin tool's. Every one of these
 * heights is also a phone control, and a committing act on a phone is pressed
 * with a thumb while the player is deciding something — 48px was the floor, not
 * a comfortable size.
 */
export declare const control: {
    readonly height: {
        readonly compact: 34;
        readonly standard: 44;
        readonly segmented: 38;
        readonly icon: 40;
        readonly block: 54;
        readonly hold: 54;
    };
    readonly row: {
        readonly compact: 44;
        readonly standard: 56;
    };
    readonly touchTarget: 44;
    readonly paddingInline: {
        readonly compact: 12;
        readonly standard: 16;
        readonly block: 24;
    };
};
export type ControlSize = keyof typeof control.height;
/** Extra hit area needed on each side to meet the 44px touch floor. */
export declare function controlHitInset(height: number): number;
