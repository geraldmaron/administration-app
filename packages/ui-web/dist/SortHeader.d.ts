import { type ReactNode } from "react";
export type SortDirection = "ascending" | "descending";
export type SortState<K extends string> = {
    readonly key: K;
    readonly direction: SortDirection;
};
/** A value a column sorts by. `undefined` is a missing reading and always sorts last, never as zero. */
export type SortValue = number | string | undefined;
/** Pressing the active column flips it; pressing another starts it in the direction that column reads best first. */
export declare function nextSort<K extends string>(current: SortState<K>, key: K, first?: SortDirection): SortState<K>;
/**
 * Rows ordered by one column. Missing values go last in either direction, and
 * ties fall back to `tiebreak` so the order is stable from one render to the next.
 */
export declare function sortRows<T, K extends string>(rows: readonly T[], sort: SortState<K>, value: Readonly<Record<K, (row: T) => SortValue>>, tiebreak?: (a: T, b: T) => number): readonly T[];
/**
 * Sort state that starts again from `initial` when `resetKey` changes, so a new
 * filter or selection opens in its own natural order.
 */
export declare function useSort<K extends string>(initial: SortState<K>, resetKey?: string | number): readonly [SortState<K>, (key: K, first?: SortDirection) => void, (next: SortState<K>) => void];
export type SortHeaderProps<K extends string> = {
    readonly label: ReactNode;
    /** A second line under the label, such as a unit. */
    readonly detail?: ReactNode;
    readonly sortKey: K;
    readonly sort: SortState<K>;
    readonly onSort: (key: K, first?: SortDirection) => void;
    /** The direction this column reads best first: highest first for a reading, A to Z for a name. */
    readonly first?: SortDirection;
    /** Numeric columns align to the end, with the arrow before the label. */
    readonly align?: "start" | "end";
    readonly className?: string;
};
/** A column header that sorts its table: the button announces the column and the header carries `aria-sort`. */
export declare function SortHeader<K extends string>({ label, detail, sortKey, sort, onSort, first, align, className }: SortHeaderProps<K>): import("react").JSX.Element;
export type SortOption<K extends string> = {
    readonly key: K;
    readonly label: string;
};
/**
 * The same sort as a select, for a table whose column headers are hidden
 * because it has stacked into blocks on a narrow screen. It measures its own
 * table rather than assuming a breakpoint, so it appears exactly when the
 * headers are gone, under any of the app's stacking rules. Place it directly
 * before the table, or before the wrapper that holds it.
 */
export declare function SortPicker<K extends string>({ options, sort, onSort, label, defaultLabel, alwaysVisible }: {
    readonly options: readonly SortOption<K>[];
    readonly sort: SortState<K>;
    readonly onSort: (next: SortState<K>) => void;
    readonly label?: string;
    readonly defaultLabel?: string;
    readonly alwaysVisible?: boolean;
}): import("react").JSX.Element;
