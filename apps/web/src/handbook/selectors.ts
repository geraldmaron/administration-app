import { HANDBOOK, explainer, glossaryEntry, type GlossaryEntry, type HandbookChapter } from "@admin/player-core";

/** The terms a chapter teaches: those its explainers name, then its own, each once, in reading order. */
export function chapterTerms(chapter: HandbookChapter): readonly GlossaryEntry[] {
  const ids = [...chapter.explainers.flatMap((id) => explainer(id)?.terms ?? []), ...(chapter.terms ?? [])];
  return [...new Set(ids)].flatMap((id) => glossaryEntry(id) ?? []);
}

/** The chapter before and after this one, where they exist. */
export function chapterNeighbors(id: string): { readonly previous: HandbookChapter | undefined; readonly next: HandbookChapter | undefined } {
  const index = HANDBOOK.findIndex((chapter) => chapter.id === id);
  return { previous: index > 0 ? HANDBOOK[index - 1] : undefined, next: index >= 0 ? HANDBOOK[index + 1] : undefined };
}

const byTerm = (a: GlossaryEntry, b: GlossaryEntry): number => a.term.localeCompare(b.term, "en", { sensitivity: "base" });

/** Entries whose term or definition holds every word typed, A to Z. An empty query keeps them all. */
export function filterTerms(entries: readonly GlossaryEntry[], query: string): readonly GlossaryEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => {
      const text = `${entry.term} ${entry.definition}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort(byTerm);
}

export type LetterGroup = { readonly letter: string; readonly entries: readonly GlossaryEntry[] };

/** Entries already in A to Z order, grouped under their first letter. */
export function groupByLetter(entries: readonly GlossaryEntry[]): readonly LetterGroup[] {
  const groups: { letter: string; entries: GlossaryEntry[] }[] = [];
  for (const entry of entries) {
    const letter = entry.term.charAt(0).toUpperCase();
    const last = groups.at(-1);
    if (last?.letter === letter) last.entries.push(entry);
    else groups.push({ letter, entries: [entry] });
  }
  return groups;
}
