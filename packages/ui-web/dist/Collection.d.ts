import { type ReactNode } from "react";
export type CollectionProps<T> = {
    readonly items: readonly T[];
    /** How many lead the first view; the order of `items` is the ranking. */
    readonly initial: number;
    /** What the rows are, plural, for the count and the control: "partners", "settled bills". */
    readonly noun: string;
    readonly render: (item: T, index: number) => ReactNode;
    /** The wrapper the rows sit in; a list by default. */
    readonly as?: "ul" | "ol" | "tbody" | "div";
    readonly className?: string;
    /** For `as="tbody"`: how many columns the table has, so the foot spans exactly the table. */
    readonly columns?: number;
    /** Said when there are no rows at all. */
    readonly empty?: ReactNode;
    /** Changes when the rows are a different set (a new filter or selection), which starts again at the first page. Defaults to the row count. */
    readonly resetKey?: string | number;
};
/** The page numbers a pager shows: the first, the last and the neighbors of the current page, with gaps marked. */
export declare function pageWindow(page: number, pages: number): readonly (number | "gap")[];
/**
 * A ranked collection that never hides its tail: rows come a page at a time
 * with the true total always in view, every page is one press away, and one
 * control shows every row at once. Use this instead of slicing a list for
 * display. A new set of items starts again at the first page.
 */
export declare function Collection<T>({ items, initial, noun, render, as, className, columns, empty, resetKey }: CollectionProps<T>): import("react").JSX.Element | null;
