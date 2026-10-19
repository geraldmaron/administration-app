import type { SegmentOption } from "../../shell/compare/Segmented";

type Window = { readonly id: string; readonly label: string; readonly available: boolean };

/** The years of a window as its short name ("2017–2019"), its era left to a caption under the control. */
export function windowYears(label: string): string {
  return (label.split(" · ")[0] ?? label).replace(" to ", "–");
}

/** Every preset stretch as a segment; one the record does not cover stays visible and says why it cannot be picked. */
export function windowOptions(windows: readonly Window[], missing: string): readonly SegmentOption<string>[] {
  return windows.map((window) => ({ value: window.id, label: windowYears(window.label), ...(window.available ? {} : { unavailable: missing }) }));
}

/** The era a stretch is known by, sentence-cased for the caption under the selector. */
export function eraOf(label: string): string | undefined {
  const era = label.split(" · ")[1];
  return era ? era.charAt(0).toUpperCase() + era.slice(1) : undefined;
}
