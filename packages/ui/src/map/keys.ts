/** What a key does on the map: move through the regions in rank order, open one, zoom, or frame the camera again. */
export type MapKeyAction =
  | { readonly kind: "focus"; readonly regionKey: string }
  | { readonly kind: "open"; readonly regionKey: string }
  | { readonly kind: "zoom"; readonly by: 1 | -1 }
  | { readonly kind: "reframe" }
  | { readonly kind: "clear" };

const STEP: Readonly<Record<string, number>> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * The map's keyboard: arrows walk the ranked rows (the same order as the
 * list), Home and End jump to its ends, Enter or Space opens the region the
 * keyboard is on, plus and minus zoom, 0 frames the camera again, Escape
 * lets go. Null for a key the map does not take, so the page keeps it.
 */
export function mapKeyAction(key: string, order: readonly string[], focused: string | undefined): MapKeyAction | null {
  const at = focused === undefined ? -1 : order.indexOf(focused);
  const pick = (index: number): MapKeyAction | null => {
    const regionKey = order[index];
    return regionKey === undefined ? null : { kind: "focus", regionKey };
  };
  if (key === "Home") return pick(0);
  if (key === "End") return pick(order.length - 1);
  const step = STEP[key];
  if (step !== undefined) return order.length === 0 ? null : pick(at < 0 ? (step > 0 ? 0 : order.length - 1) : (at + step + order.length) % order.length);
  if ((key === "Enter" || key === " ") && focused !== undefined && at >= 0) return { kind: "open", regionKey: focused };
  if (key === "+" || key === "=") return { kind: "zoom", by: 1 };
  if (key === "-" || key === "_") return { kind: "zoom", by: -1 };
  if (key === "0") return { kind: "reframe" };
  if (key === "Escape" && focused !== undefined) return { kind: "clear" };
  return null;
}
