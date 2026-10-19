import { MARK_STYLE, type KeyEntry } from "@admin/ui";

/** The key for the tick that shows where a reading stood before the change being drawn, in the screen's own words for "before". */
export const beforeKey = (label: string): readonly KeyEntry[] => [{ id: "before", kind: "tick", label, ink: MARK_STYLE.historical.ink, weight: MARK_STYLE.historical.tick }];
