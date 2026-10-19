import {
  GLOSSARY,
  HANDBOOK,
  PLACES,
  authoritiesForGlossaryTerm,
  authorityView,
  explainer,
  glossaryEntry,
  lawSectionAuthorities,
  type Authority,
  type Explainer,
  type GlossaryEntry,
  type HandbookChapter,
  type LawChapter,
  type LawSection,
} from "@admin/player-core";
import type { ChapterLink, ContentsEntry, GlossaryCardView, LawCardView, NamedRef } from "@admin/ui/handbook";

// The Handbook's reading order and its A to Z, as the screens draw them. The
// words are player-core's records; this file only orders and joins them.

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
  return entries.reduce<readonly LetterGroup[]>((groups, entry) => {
    const letter = entry.term.charAt(0).toUpperCase();
    const last = groups.at(-1);
    return last?.letter === letter ? [...groups.slice(0, -1), { letter, entries: [...last.entries, entry] }] : [...groups, { letter, entries: [entry] }];
  }, []);
}

export function isLawChapter(chapter: HandbookChapter): chapter is LawChapter {
  return Array.isArray((chapter as Partial<LawChapter>).sections);
}

export function lawCard(authority: Authority): LawCardView {
  const view = authorityView(authority);
  return {
    id: view.id,
    cite: view.cite,
    title: view.title,
    kindLabel: view.kindLabel,
    summary: view.summary,
    enables: view.enables,
    limits: view.limits,
    sourceLabel: view.sourceLabel,
    inForce: view.inForce,
    ...(view.lapsed ? { lapsed: view.lapsed } : {}),
  };
}

/** A section of the chapter on the law: its records in reading order, each as its card. */
export function lawSectionCards(section: LawSection): readonly LawCardView[] {
  return lawSectionAuthorities(section).map(lawCard);
}

/** One glossary entry as its card, with the law it rests on beside it. */
export function glossaryCard(entry: GlossaryEntry): GlossaryCardView {
  return {
    id: entry.id,
    term: entry.term,
    definition: entry.definition,
    ...(entry.inGame ? { inGame: entry.inGame } : {}),
    ...(entry.example ? { example: entry.example } : {}),
    ...(entry.icon ? { icon: entry.icon } : {}),
    related: (entry.related ?? []).flatMap((id) => {
      const other = glossaryEntry(id);
      return other ? [{ id: other.id, label: other.term }] : [];
    }),
    law: authoritiesForGlossaryTerm(entry.id).map(lawCard),
  };
}

export function glossaryCardById(id: string): GlossaryCardView | undefined {
  const entry = glossaryEntry(id);
  return entry ? glossaryCard(entry) : undefined;
}

export function termRefs(ids: readonly string[]): readonly NamedRef[] {
  return ids.flatMap((id) => {
    const entry = glossaryEntry(id);
    return entry ? [{ id: entry.id, label: entry.term }] : [];
  });
}

export function explainerRefs(ids: readonly string[]): readonly NamedRef[] {
  return ids.flatMap((id) => {
    const item: Explainer | undefined = explainer(id);
    return item ? [{ id: item.id, label: item.title }] : [];
  });
}

export const TERMS_ID = "terms";

export function chapterHref(id: string): string {
  return `/handbook/${encodeURIComponent(id)}`;
}

/** The rail: every chapter by its number, then the A to Z. */
export function chapterLinks(): readonly ChapterLink[] {
  return [
    ...HANDBOOK.map((chapter, index) => ({ id: chapter.id, mark: String(index + 1), title: chapter.title, href: chapterHref(chapter.id) })),
    { id: TERMS_ID, mark: "A", title: "All terms, A to Z", href: "/handbook/terms" },
  ];
}

function countWords(chapter: HandbookChapter): string {
  if (isLawChapter(chapter)) {
    const records = chapter.sections.reduce((sum, section) => sum + section.authorities.length, 0);
    return `${chapter.sections.length} sections · ${records} laws cited`;
  }
  return chapter.explainers.length === 1 ? "1 explainer" : `${chapter.explainers.length} explainers`;
}

/** The contents page's cards, the law standing out as the chapter every power cites. */
export function contentsEntries(): readonly ContentsEntry[] {
  return [
    ...HANDBOOK.map((chapter, index) => ({
      id: chapter.id,
      mark: String(index + 1),
      title: chapter.title,
      opens: chapter.opens,
      count: countWords(chapter),
      href: chapterHref(chapter.id),
      ...(isLawChapter(chapter) ? { feature: { icon: "law" as const, label: "The law behind every power" } } : {}),
    })),
    { id: TERMS_ID, mark: "A", title: "All terms, A to Z", opens: "Look up any word the game uses. If it comes from a law, you'll see that law beside it.", count: `${GLOSSARY.length} terms`, href: "/handbook/terms" },
  ];
}

export type TermDoor = { readonly id: string; readonly title: string; readonly href: string; readonly icon: string };

/** The chapters that teach a term and the screens where those chapters apply, each once, so a word leads back to where the game uses it. */
export function termDoors(termId: string): { readonly chapters: readonly TermDoor[]; readonly screens: readonly TermDoor[] } {
  const teaching = HANDBOOK.filter((chapter) => chapterTerms(chapter).some((entry) => entry.id === termId));
  const keys = [...new Set(teaching.flatMap((chapter) => chapter.places))];
  return {
    chapters: teaching.map((chapter) => ({ id: chapter.id, title: chapter.title, href: chapterHref(chapter.id), icon: "info" })),
    screens: keys.map((key) => ({ id: key, title: PLACES[key].title, href: PLACES[key].href, icon: PLACES[key].icon })),
  };
}
