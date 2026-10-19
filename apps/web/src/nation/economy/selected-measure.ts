import { useEffect, useRef } from "react";

/** A measure a door named: marked, and scrolled into view once it renders. */
export function useSelectedMeasure<T extends HTMLElement>(selected: boolean) {
  const root = useRef<T | null>(null);
  useEffect(() => {
    if (selected) root.current?.scrollIntoView({ block: "center" });
  }, [selected]);
  return { ref: root, "data-selected": selected ? "true" : undefined, "aria-current": selected ? ("true" as const) : undefined };
}
