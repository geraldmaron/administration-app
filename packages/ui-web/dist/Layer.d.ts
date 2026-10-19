import { type ReactNode } from "react";
export type SheetProps = {
    readonly open: boolean;
    /** Called on Escape, the close button or a press on the backdrop, when `dismissible`. */
    readonly onClose: () => void;
    readonly title: ReactNode;
    readonly closeLabel?: string;
    /** A line under the title: what this layer is about. */
    readonly lead?: ReactNode;
    /** "side" an inspector, "center" a focused task, "wide" a focused view of a chart or map. */
    readonly placement?: "side" | "center" | "wide";
    /** False while a step must be answered with a named control rather than escaped. */
    readonly dismissible?: boolean;
    /** False where a stray press outside, such as the second half of a double-click that opened it, must not close it. */
    readonly backdropDismiss?: boolean;
    /** Controls fixed at the foot, outside the scrolling body. */
    readonly foot?: ReactNode;
    readonly className?: string;
    /** Where focus goes on close when the control that opened it will be gone, such as a button inside a popover. */
    readonly returnFocus?: () => HTMLElement | null;
    readonly children: ReactNode;
};
/** Source-owned shadcn Sheet/Dialog composition. Radix owns trapping, inertness and Escape. */
export declare function Sheet({ open, onClose, title, lead, placement, dismissible, backdropDismiss, closeLabel, foot, className, returnFocus, children }: SheetProps): import("react").JSX.Element;
export type PopoverProps = {
    /** The trigger's content; the trigger itself is drawn here so the layer can anchor to it. */
    readonly trigger: ReactNode;
    /** What a screen reader hears for the trigger. */
    readonly label: string;
    readonly triggerClassName?: string;
    readonly className?: string;
    /** Handed the trigger element, for a layer opened from inside the popover that must return focus to it. */
    readonly triggerRef?: (element: HTMLButtonElement | null) => void;
    /** Rendered only while open, so a closed popover costs nothing. */
    readonly children: ReactNode | ((close: () => void) => ReactNode);
};
/** Source-owned shadcn Popover; collision-aware placement replaces manual viewport math. */
export declare function Popover({ trigger, label, triggerClassName, className, triggerRef, children }: PopoverProps): import("react").JSX.Element;
export type ExpandableProps = {
    /** Names the view in the expand control and the expanded layer's heading. */
    readonly title: string;
    /** The view as it sits in the page. */
    readonly children: ReactNode;
    /** A larger rendering for the expanded layer; the same view when absent. */
    readonly expanded?: ReactNode;
    /** A line under the expanded heading: what the view shows, its unit and date. */
    readonly lead?: ReactNode;
};
/**
 * A view that can be opened on its own. Only this view expands: the page
 * behind keeps its size, scroll, selection and anything typed, and closing
 * returns focus to the expand control.
 */
export declare function Expandable({ title, children, expanded, lead }: ExpandableProps): import("react").JSX.Element;
