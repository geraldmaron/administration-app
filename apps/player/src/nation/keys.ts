import type { KeyEntry } from "@admin/ui";
import { TRACK_INK, type TrackTone } from "@admin/ui/nation";

// The key reads the same table the track draws from, so a color-vision setting reaches both.
const INK = TRACK_INK;

type Tone = TrackTone;

/** The key for a track's fill: one swatch per tone it draws, in the words of what that tone says on this reading. */
export function toneKey(words: Readonly<Partial<Record<Tone, string>>>): readonly KeyEntry[] {
  return (Object.keys(INK) as Tone[]).flatMap((tone) => (words[tone] ? [{ id: `tone:${tone}`, kind: "swatch" as const, label: words[tone]!, ink: INK[tone] }] : []));
}

/** A line laid across a track at a named level: a majority, a gate, the national figure. */
export const markEntry = (id: string, label: string): KeyEntry => ({ id: `mark:${id}`, kind: "tick", label, ink: "color", weight: 3 });
