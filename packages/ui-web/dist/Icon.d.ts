import { type IconName } from "./assets/icons/icon-data.js";
export type { IconName } from "./assets/icons/icon-data.js";
/**
 * Duotone lays a faint fill under the stroke, which gives a glyph body on the
 * navy without a second color; regular is the plain stroke, for dense rows
 * where a filled shape would compete with the figures beside it.
 */
export type IconWeight = "regular" | "duotone" | "bold" | "fill";
export type IconProps = {
    readonly name: IconName;
    /** Pixel size of the square: 16–20 in rows and controls, 24–32 for a section's identity. */
    readonly size?: number;
    readonly weight?: IconWeight;
    /** Given only when the glyph carries meaning no visible text beside it does. */
    readonly label?: string;
    readonly className?: string;
};
/** Whether a string names a glyph the set draws, for data that carries icon names as plain text. */
export declare function isIconName(value: string | undefined): value is IconName;
/**
 * A glyph from the set, drawn inline so it takes the surrounding text color
 * and scales with it. Decorative unless labeled: an icon beside a word says
 * nothing a screen reader needs twice.
 */
export declare function Icon({ name, size, weight, label, className }: IconProps): import("react").JSX.Element;
export type IconBadgeTone = "blue" | "gold" | "red" | "neutral";
export type IconBadgeProps = {
    readonly name: IconName;
    /** Blue for where you go, gold for the institution and current state, red for force and risk. */
    readonly tone?: IconBadgeTone;
    /** The tile's side: 28 beside a row, 36 beside a card's title, 48 beside a screen's title. */
    readonly size?: 28 | 36 | 48;
    readonly label?: string;
    readonly className?: string;
};
/** A glyph set in a tinted tile: the identity mark of a section, a card or an office. */
export declare function IconBadge({ name, tone, size, label, className }: IconBadgeProps): import("react").JSX.Element;
