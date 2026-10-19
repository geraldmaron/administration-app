import type { MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";

/**
 * Hands a plain click on any link inside a drawing to the router, so a chart's
 * marks share one handler and a modified click still opens a tab. Marks that
 * stand for a person or a record are wrapped in `<a href>` with tabIndex -1;
 * the list or table beside the drawing reaches the same pages by keyboard.
 */
export function useDrawnLinks() {
  const navigate = useNavigate();
  return (event: MouseEvent<Element>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = (event.target as Element).closest("a[href]")?.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    void navigate({ href });
  };
}
