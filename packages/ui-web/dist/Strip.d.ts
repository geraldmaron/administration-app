import type { ReactNode } from "react";
export type StripItem = {
    readonly key: string;
    readonly label: string;
    /** 0..1 along the axis. */
    readonly at: number;
    /** What the value says: "58% approve". */
    readonly valueText: string;
    /** Written inside the dot where it fits: a state's postal code. */
    readonly short?: string;
    /** 0..1, how much the item weighs: the dot's area grows with it. */
    readonly weight?: number;
    /** Which side of the axis's middle mark it reads as. */
    readonly side?: "for" | "against" | "even";
};
/** What the caller spreads onto the element it renders for each dot. */
export type StripDotProps = {
    readonly className: string;
    readonly style: React.CSSProperties;
    readonly "data-side": "for" | "against" | "even";
    /** The name and value, shown beside the dot on hover and keyboard focus. */
    readonly "data-tip": string;
    readonly "data-tip-align": "start" | "center" | "end";
    readonly children: ReactNode;
};
export type StripProps = {
    readonly label: string;
    readonly items: readonly StripItem[];
    /** The axis's ends, said under it: "Under 35%", "65% or more". */
    readonly ends: readonly [string, string];
    /** A reference on the axis: half approve, an even call. */
    readonly mark?: {
        readonly at: number;
        readonly label: string;
    };
    /** Each dot is a door: the caller supplies the link, so the router owns navigation. */
    readonly renderDot: (item: StripItem, dot: StripDotProps) => ReactNode;
    readonly onFocusItem?: (key: string | null) => void;
    /** How the sides are colored: a party's lean, or the public's standing behind the President (slate to gold). */
    readonly scale?: "partisan" | "standing";
};
/** The plot is drawn in these units and scaled to the container, so the swarm is the same at every width. */
export declare const STRIP_WIDTH = 320;
export type SwarmDot = {
    readonly key: string;
    readonly x: number;
    readonly y: number;
    readonly r: number;
};
/**
 * Lay dots along one axis, each at its value, stacking any that would
 * overlap above and below the line in turn, biggest first so the heavy
 * ones sit on the axis where they are read first.
 */
export declare function swarm(items: readonly StripItem[], width?: number): readonly SwarmDot[];
/**
 * Every member of a set on one axis as a dot sized by its weight: the
 * spread, the outliers and where the heavy ones sit, at a glance. Each dot
 * opens its own screen, and focusing one tells the caller, so the map can
 * show where it is.
 */
export declare function Strip({ label, items, ends, mark, renderDot, onFocusItem, scale }: StripProps): import("react").JSX.Element;
