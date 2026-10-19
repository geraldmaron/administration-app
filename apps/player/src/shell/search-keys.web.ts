import { useEffect, useRef } from "react";
import type { SearchKeys } from "./search-keys";

export type { SearchKeys } from "./search-keys";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The chord that opens search from anywhere, as the keyboard labels it. */
export const SHORTCUT_HINT = isMac ? "⌘K" : "Ctrl K";

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

/**
 * Cmd or Ctrl K, or "/" outside a field, opens search; while it is open the
 * arrows move through the results and Escape closes it. Enter belongs to the
 * field, which opens the chosen result.
 */
export function useSearchKeys(keys: SearchKeys): void {
  const latest = useRef(keys);
  latest.current = keys;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const { open, count, onOpen, onClose, onMove } = latest.current;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) onClose();
        else onOpen();
        return;
      }
      if (!open) {
        if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !typing(event.target)) {
          event.preventDefault();
          onOpen();
        }
        return;
      }
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowDown" && count > 0) {
        event.preventDefault();
        onMove(1);
      } else if (event.key === "ArrowUp" && count > 0) {
        event.preventDefault();
        onMove(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
