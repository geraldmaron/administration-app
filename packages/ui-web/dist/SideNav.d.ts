import { type ComponentType, type MouseEvent, type ReactNode } from "react";
import { type IconName } from "./Icon";
export type NavItem = {
    readonly id: string;
    readonly label: string;
    readonly href: string;
    readonly icon: IconName;
    /** How many things here are new to the President: drawn as a red badge and said in the name. */
    readonly attention?: number;
    /** How many things here still need the President, new or already seen: drawn quietly once none of them is new. */
    readonly waiting?: number;
};
export type NavGroup = {
    readonly id: string;
    /** The group's heading in the full list, and its name in the compact rail and the phone bar. */
    readonly label: string;
    readonly icon: IconName;
    readonly items: readonly NavItem[];
};
export type NavLinkProps = {
    readonly href: string;
    readonly className: string;
    readonly "aria-current"?: "page";
    readonly "aria-label"?: string;
    readonly onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
    readonly children: ReactNode;
};
export type SideNavProps = {
    readonly groups: readonly NavGroup[];
    /** Destinations kept apart from the work at the foot of the list: saves, settings. */
    readonly utilities?: readonly NavItem[];
    /** The id of the item the player is on; its group is the current group. */
    readonly current: string | undefined;
    /** The groups the phone bar names directly; the rest are behind More. */
    readonly phoneGroups?: readonly string[];
    /** Settings that belong with navigation when the bar has no room for them, drawn at the foot of the drawer. */
    readonly drawerFoot?: ReactNode;
    /** The app's router link. A plain anchor works too, at the cost of a full page load. */
    readonly Link?: ComponentType<NavLinkProps>;
};
/**
 * The main navigation. Wide screens list every destination under its group;
 * a laptop width shows one labeled entry per group; a tablet opens the full
 * list as a drawer; a phone keeps a bar of the main groups and More.
 */
export declare function SideNav({ groups, utilities, current, phoneGroups, drawerFoot, Link }: SideNavProps): import("react").JSX.Element;
