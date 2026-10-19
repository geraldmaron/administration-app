import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { MapInsets } from "../map/camera";

type Box = { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };

/** A sheet's height transition, reported under the physical name by some engines and the logical one by others. */
const SIZE_PROPERTIES = new Set(["block-size", "height"]);

const NONE: MapInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** The chrome the map frames around: the top bar, the mode navigation and the work surface. */
const CHROME = ".ui-frame__bar, .ui-frame__nav, .ui-surface";

/**
 * What a set of chrome boxes covers of the viewport, edge by edge. A box as
 * wide as the viewport covers the top or the bottom, whichever half its
 * middle is in (the bar, the tab bar, a phone sheet); a narrower one covers
 * the side it sits on (the rail, the docked panel). Reading the boxes rather
 * than the breakpoints keeps one source for where the chrome is: the sheets
 * that lay it out.
 */
export function insetsFromBoxes(boxes: readonly Box[], viewport: { readonly width: number; readonly height: number }): MapInsets {
  return boxes.reduce<MapInsets>((insets, box) => {
    if (box.right - box.left <= 0 || box.bottom - box.top <= 0) return insets;
    if (box.left <= 1 && box.right >= viewport.width - 1) {
      return (box.top + box.bottom) / 2 < viewport.height / 2
        ? { ...insets, top: Math.max(insets.top, Math.round(box.bottom)) }
        : { ...insets, bottom: Math.max(insets.bottom, Math.round(viewport.height - box.top)) };
    }
    return (box.left + box.right) / 2 < viewport.width / 2
      ? { ...insets, left: Math.max(insets.left, Math.round(box.right)) }
      : { ...insets, right: Math.max(insets.right, Math.round(viewport.width - box.left)) };
  }, NONE);
}

/**
 * The map no longer runs under the masthead and the navigation; it fills the
 * canvas beside them. So each chrome box is read in the map's own coordinates
 * and clipped to it: chrome that sits beside the map covers none of it, and
 * only what lies over the map (the inspector, a phone sheet) is framed around.
 */
function measure(): MapInsets {
  const map = document.querySelector(".ui-frame__map")?.getBoundingClientRect();
  const frame = map ?? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const boxes = [...document.querySelectorAll(CHROME)].map((element) => {
    const box = element.getBoundingClientRect();
    return {
      left: Math.max(0, box.left - frame.left),
      right: Math.min(frame.width, box.right - frame.left),
      top: Math.max(0, box.top - frame.top),
      bottom: Math.min(frame.height, box.bottom - frame.top),
    };
  });
  return insetsFromBoxes(boxes, { width: frame.width, height: frame.height });
}

function same(a: MapInsets, b: MapInsets): boolean {
  return a.top === b.top && a.right === b.right && a.bottom === b.bottom && a.left === b.left;
}

/** The work surface tells the shell its sheet has come to rest. */
export const SheetSettledContext = createContext<() => void>(() => undefined);

export function useSheetSettled(): () => void {
  return useContext(SheetSettledContext);
}

/**
 * The chrome's insets for the map, measured when the layout can have moved:
 * on resize, when `layoutKey` changes (the mode navigation came or went), when
 * a sheet settles at a detent, and when the sheet's height transition ends.
 * Never during a drag: the sheet disables its transition while dragged, and
 * nothing here watches its size.
 */
export function useChromeInsets(layoutKey: string): { readonly insets: MapInsets; readonly settled: () => void } {
  const [insets, setInsets] = useState<MapInsets>(NONE);
  const update = useCallback(() => {
    const next = measure();
    setInsets((current) => (same(current, next) ? current : next));
  }, []);
  const settled = useCallback(() => {
    requestAnimationFrame(update);
  }, [update]);
  useEffect(() => {
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const transitioned = (event: TransitionEvent) => {
      if (SIZE_PROPERTIES.has(event.propertyName) && event.target instanceof Element && event.target.matches(".ui-surface")) update();
    };
    later();
    window.addEventListener("resize", later);
    document.addEventListener("transitionend", transitioned);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", later);
      document.removeEventListener("transitionend", transitioned);
    };
  }, [update, layoutKey]);
  return { insets, settled };
}
