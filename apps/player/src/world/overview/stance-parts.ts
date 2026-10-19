import type { Segment } from "@admin/ui/world";

type Tally = { readonly favorable: number; readonly neutral: number; readonly caution: number; readonly adverse: number; readonly unread: number };

/** Governments split by how they see the United States, in the order every bar and key draws them. */
export function stanceParts(counts: Tally): readonly Segment[] {
  return [
    { key: "f", count: counts.favorable, word: "trust you", valence: "good" },
    { key: "n", count: counts.neutral, word: "neutral", valence: "info" },
    { key: "c", count: counts.caution, word: "wary", valence: "watch" },
    { key: "a", count: counts.adverse, word: "hostile", valence: "bad" },
    { key: "u", count: counts.unread, word: "unread", valence: "neutral" },
  ];
}
