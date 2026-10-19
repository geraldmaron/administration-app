import type { ReactNode } from "react";
export type AppFrameProps = {
    /** The map, drawn in the work canvas while a spatial screen is open. */
    readonly map: ReactNode;
    readonly bar: ReactNode;
    /** The main navigation; absent outside a presidency (the title, the founding). */
    readonly nav?: ReactNode;
    /** Search and other overlays, above the work. */
    readonly overlays?: ReactNode;
    readonly children: ReactNode;
};
/**
 * The player's layers, back to front: the map (shown only behind a spatial
 * screen), the navy masthead and navigation, the work surface, and the
 * overlays. On a phone the navigation is a bar under the work; from a tablet
 * up it is a drawer, a labeled rail, or the full list beside the work.
 */
export declare function AppFrame({ map, bar, nav, overlays, children }: AppFrameProps): import("react").JSX.Element;
