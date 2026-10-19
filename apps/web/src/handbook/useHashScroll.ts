import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Brings the element named by the address hash into view. The surface body, not
 * the window, is what scrolls, so the browser's own jump to a fragment never
 * lands. `ready` holds the jump until the target has been drawn.
 */
export function useHashScroll(ready = true): void {
  const hash = useRouterState({ select: (state) => state.location.hash });
  useEffect(() => {
    if (!ready || !hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  }, [hash, ready]);
}
