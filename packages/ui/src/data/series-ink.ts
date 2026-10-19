import { categorical } from "@admin/design";

/** A peer series' color by its place in the list: categorical, distinct by hue and lightness together. */
export function peerInk(index: number): string {
  return categorical[index % categorical.length] ?? categorical[0];
}

/** The dash pattern that keeps series apart without color: self solid, peers short dashes in turn, history long dashes. */
export function dashFor(kind: "self" | "peer" | "history", index: number): string | undefined {
  if (kind === "self") return undefined;
  if (kind === "history") return "8 5";
  return ["", "4 3", "2 3", "6 2 2 2"][index % 4] || undefined;
}
