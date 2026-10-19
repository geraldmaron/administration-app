import type { ComponentType, MouseEvent, ReactNode } from "react";
import { type IconName } from "./Icon";
export type ModeNavItem = {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly icon: IconName;
    /** A count of what needs the President here; drawn as a badge and said in the name. */
    readonly attention?: number;
};
export type ModeLinkProps = {
    readonly href: string;
    readonly className: string;
    readonly "aria-current"?: "page";
    readonly "aria-label"?: string;
    readonly onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    readonly children: ReactNode;
};
export type ModeNavProps = {
    readonly items: readonly ModeNavItem[];
    readonly current: string | undefined;
    /** The app's router link. A plain anchor works too, at the cost of a full page load. */
    readonly Link?: ComponentType<ModeLinkProps>;
};
/** The five modes: a tab bar on a phone, a rail from a tablet up. */
export declare function ModeNav({ items, current, Link }: ModeNavProps): import("react").JSX.Element;
