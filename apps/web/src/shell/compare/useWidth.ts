import { useEffect, useRef, useState } from "react";

/** The width of the box a part sits in, so its layout follows the room it has rather than the window. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    setWidth(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return undefined;
    const watch = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    watch.observe(node);
    return () => watch.disconnect();
  }, []);
  return { ref, width };
}
