import type { ReactNode } from "react";
import { type IconName } from "./Icon";
export type EmptyStateProps = {
    readonly icon?: IconName;
    readonly title: string;
    readonly children?: ReactNode;
    /** Set while something is being read, so the state is announced as work rather than absence. */
    readonly busy?: boolean;
};
/** Where a reading or a list has nothing to show: what is absent, and what would fill it. */
export declare function EmptyState({ icon, title, children, busy }: EmptyStateProps): import("react").JSX.Element;
