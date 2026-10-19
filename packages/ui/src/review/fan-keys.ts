import type { KeyEntry } from "../data/key-entries";
import { peerInk } from "../data/series-ink";

export const BASELINE_DASH = "6 4";

/**
 * The projection's key: each option's line in its own color, the comparison
 * dashed in the secondary ink, and the shading that stands for the spread of
 * the runs. Every chart in a set of projections shares it, so a screen draws
 * it once for the set.
 */
export function fanKeyEntries(lines: readonly { readonly id: string; readonly label: string; readonly baseline: boolean; readonly index: number }[]): readonly KeyEntry[] {
  return [
    ...lines.map((line): KeyEntry =>
      line.baseline ? { id: line.id, kind: "dash", label: line.label, ink: "colorSecondary", weight: 2, dash: BASELINE_DASH } : { id: line.id, kind: "line", label: line.label, ink: { color: peerInk(line.index) }, weight: 2 },
    ),
    { id: "spread", kind: "line", label: "Shading: where most runs ended up", ink: "colorSecondary", weight: 2, band: true },
  ];
}
