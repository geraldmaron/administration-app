import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Icon } from "./Icon";
import { SurfaceFootContext } from "./WorkSurface";

// Opening order handles both nested inspectors and globally mounted reviews.
// Unlike fixed z-indices, a later modal scrim also covers the earlier content.
let nextLayer = 0;
function useLayerOrder(open: boolean) {
  const [order, setOrder] = useState(0);
  useLayoutEffect(() => { if (open) setOrder(++nextLayer); }, [open]);
  return 80 + order * 2;
}

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
export function Sheet({ open, onClose, title, lead, placement = "center", dismissible = true, backdropDismiss = true, closeLabel = "Close", foot, className, returnFocus, children }: SheetProps) {
  const layer = useLayerOrder(open);
  const descriptionId = useId();
  const trigger = useRef<HTMLElement | null>(null);
  if (open && !trigger.current && typeof document !== "undefined") trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  return <SurfaceFootContext.Provider value={null}><DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next && dismissible) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="ui-sheet-overlay" style={{ zIndex: layer }} />
      <DialogPrimitive.Content data-slot="sheet-content" className={["ui-sheet", className].filter(Boolean).join(" ")} data-placement={placement} style={{ zIndex: layer + 1 }}
        onEscapeKeyDown={(event) => { if (!dismissible) event.preventDefault(); }}
        onInteractOutside={(event) => { if (!dismissible || !backdropDismiss) event.preventDefault(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); (returnFocus?.() ?? trigger.current)?.focus({ preventScroll: true }); trigger.current = null; }}
        aria-describedby={lead ? descriptionId : undefined}>
        <div className="ui-sheet__frame">
          <header className="ui-sheet__head"><div className="ui-sheet__heading">
            <DialogPrimitive.Title className="ui-sheet__title">{title}</DialogPrimitive.Title>
            {lead ? <DialogPrimitive.Description id={descriptionId} className="ui-sheet__lead">{lead}</DialogPrimitive.Description> : null}
          </div>{dismissible ? <DialogPrimitive.Close className="ui-sheet__close" aria-label={closeLabel}><Icon name="close" size={20} /></DialogPrimitive.Close> : null}</header>
          {children ? <div className="ui-sheet__body">{children}</div> : null}
          {foot ? <footer className="ui-sheet__foot">{foot}</footer> : null}
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root></SurfaceFootContext.Provider>;
}

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
export function Popover({ trigger, label, triggerClassName, className, triggerRef, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const layer = useLayerOrder(open);
  return <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
    <PopoverPrimitive.Trigger ref={triggerRef} className={["ui-popover__trigger", triggerClassName].filter(Boolean).join(" ")} aria-label={label} onClick={(event) => event.stopPropagation()}>{trigger}</PopoverPrimitive.Trigger>
    <PopoverPrimitive.Portal><PopoverPrimitive.Content aria-label={label} sideOffset={6} collisionPadding={8} className={["ui-popover", className].filter(Boolean).join(" ")} data-slot="popover-content" style={{ zIndex: layer + 1 }}>
      {typeof children === "function" ? children(() => setOpen(false)) : children}
    </PopoverPrimitive.Content></PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>;
}

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
export function Expandable({ title, children, expanded, lead }: ExpandableProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ui-expandable">
      {children}
      <button type="button" className="ui-expandable__open" aria-label={`Expand ${title}`} onClick={() => setOpen(true)}>
        <Icon name="expandPanel" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} placement="wide" title={title} {...(lead ? { lead } : {})}>
        {open ? (expanded ?? children) : null}
      </Sheet>
    </div>
  );
}
