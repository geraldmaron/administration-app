import { type ReactNode } from "react";
import { type IconName } from "./Icon";
export type TabSpec = {
    readonly id: string;
    readonly label: string;
    readonly icon?: IconName;
    /** A count beside the label: open matters, rows in the view. */
    readonly count?: number;
};
export type TabsProps = {
    /** Names the set for a screen reader: "Views of Canada". */
    readonly label: string;
    readonly tabs: readonly TabSpec[];
    readonly selected: string;
    /** The screen keeps the choice (in its URL, so Back and reload keep the view). */
    readonly onSelect: (id: string) => void;
    /** Tighter tabs for a screen that sits the strip inside a panel or a narrow column. */
    readonly compact?: boolean;
    readonly children: ReactNode;
};
/** Source-owned shadcn Tabs with controlled URL state and automatic keyboard activation. */
export declare function Tabs({ label, tabs, selected, onSelect, compact, children }: TabsProps): import("react").JSX.Element;
