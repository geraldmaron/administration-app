import { type ReactNode } from "react";
import { type IconName } from "./Icon";
export type PaletteItem = {
    readonly id: string;
    /** The heading the item is listed under: "Places", "Glossary". */
    readonly group: string;
    readonly title: string;
    readonly detail?: string;
    readonly icon?: IconName;
    /** What the item says when it is the active one: a definition, a place's purpose. */
    readonly body?: ReactNode;
    /** Absent, choosing the item only opens its body. */
    readonly onSelect?: () => void;
};
export type CommandPaletteProps = {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly query: string;
    readonly onQueryChange: (query: string) => void;
    /** Already filtered and ranked for the query. */
    readonly items: readonly PaletteItem[];
    readonly placeholder?: string;
};
/** Search across places and the glossary: type, move with the arrows, Enter to go, Escape to close. */
export declare function CommandPalette({ open, onClose, query, onQueryChange, items, placeholder }: CommandPaletteProps): import("react").JSX.Element;
