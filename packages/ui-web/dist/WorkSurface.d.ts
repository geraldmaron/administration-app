import { type ReactNode } from "react";
/** The phone sheet's resting heights. From a tablet up the surface is a side panel and has no detents. */
export type Detent = "peek" | "half" | "full";
/**
 * The work's relationship to the map, independent of its width. All surfaces
 * share a standard width; the player can explicitly expand any desktop file.
 */
export type SurfaceKind = "panel" | "workspace";
/** Internal composition boundary: modal work must not dock into an inert parent surface. */
export declare const SurfaceFootContext: import("react").Context<HTMLElement | null>;
/**
 * The surface's foot, below its scrolling body: where a verb docks so it stays
 * in the thumb's reach and never covers what scrolls above it. Null outside a
 * surface, where a part keeps its verb in place.
 */
export declare function useSurfaceFoot(): HTMLElement | null;
export type WorkSurfaceProps = {
    readonly label: string;
    readonly kind?: SurfaceKind;
    /** Wider analytical collections; narrative retains the standard reading measure. */
    readonly measure?: "standard" | "data";
    /** Where the phone sheet opens. A workspace opens at full. */
    readonly initialDetent?: Detent;
    /** The title row; on a phone it is also where the sheet is dragged from. */
    readonly header: ReactNode;
    /** The screen's verb, kept in reach at the bottom of the surface. */
    readonly footer?: ReactNode;
    /** Told when the sheet comes to rest, so the map can frame inside what is left. */
    readonly onSettle?: (detent: Detent) => void;
    readonly children: ReactNode;
};
/**
 * The opaque surface the work happens in, so text never sits on dots. On a
 * phone it is a bottom sheet with three detents, dragged from its handle and
 * header, with its content scrolling inside; from a tablet up it is a panel
 * docked beside the map, or a workspace that takes the room.
 */
export declare function WorkSurface({ label, kind, measure, initialDetent, header, footer, onSettle, children }: WorkSurfaceProps): import("react").JSX.Element;
