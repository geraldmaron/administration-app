import { describe, expect, it } from "vitest";
import { AUTHORITIES, GLOSSARY, HANDBOOK, LAW_CHAPTER, authoritiesForGlossaryTerm, handbookChapter } from "@admin/player-core";
import { chapterLinks, chapterNeighbors, chapterTerms, contentsEntries, filterTerms, glossaryCard, groupByLetter, isLawChapter, lawSectionCards, termDoors } from "./selectors";

describe("chapter selectors", () => {
  it("lists each term once", () => {
    for (const chapter of HANDBOOK) {
      const ids = chapterTerms(chapter).map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("has no previous chapter at the start and no next at the end", () => {
    expect(chapterNeighbors(HANDBOOK[0]!.id).previous).toBeUndefined();
    expect(chapterNeighbors(HANDBOOK.at(-1)!.id).next).toBeUndefined();
  });

  it("links every chapter and the A to Z from the rail and the contents", () => {
    expect(chapterLinks().map((link) => link.id)).toEqual([...HANDBOOK.map((chapter) => chapter.id), "terms"]);
    expect(contentsEntries()).toHaveLength(HANDBOOK.length + 1);
    expect(contentsEntries().find((entry) => entry.id === LAW_CHAPTER.id)?.feature?.icon).toBe("law");
  });
});

describe("the chapter on the law", () => {
  it("is in the Handbook and is told apart from an explainer chapter", () => {
    const law = handbookChapter(LAW_CHAPTER.id);
    expect(law && isLawChapter(law)).toBe(true);
    expect(HANDBOOK.filter(isLawChapter)).toHaveLength(1);
  });

  it("draws every authority in the registry exactly once, with its citation, powers, limits and source", () => {
    const cards = LAW_CHAPTER.sections.flatMap(lawSectionCards);
    expect(cards.map((card) => card.id).sort()).toEqual(AUTHORITIES.map((authority) => authority.id).sort());
    for (const card of cards) {
      expect(card.cite.length).toBeGreaterThan(0);
      expect(card.enables.length + card.limits.length).toBeGreaterThan(0);
      expect(card.sourceLabel.length).toBeGreaterThan(0);
    }
  });
});

describe("glossary cards", () => {
  it("set the law beside every term the registry rests on, and only those", () => {
    for (const entry of GLOSSARY) {
      const cites = glossaryCard(entry).law.map((law) => law.cite);
      expect(cites).toEqual(authoritiesForGlossaryTerm(entry.id).map((authority) => authority.cite));
    }
    const war = glossaryCard(GLOSSARY.find((entry) => entry.id === "war-powers-resolution")!);
    expect(war.law.some((law) => law.cite === "50 U.S.C. §§1541–1548")).toBe(true);
  });

  it("names only related terms that exist", () => {
    for (const entry of GLOSSARY) expect(glossaryCard(entry).related).toHaveLength((entry.related ?? []).length);
  });
});

describe("A to Z", () => {
  it("keeps every entry for an empty query, in order", () => {
    const all = filterTerms(GLOSSARY, "  ");
    expect(all).toHaveLength(GLOSSARY.length);
    expect(all.map((entry) => entry.term)).toEqual([...all.map((entry) => entry.term)].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });

  it("matches the term or its definition, every word", () => {
    expect(filterTerms(GLOSSARY, "VETO").some((entry) => entry.id === "veto")).toBe(true);
    const sample = GLOSSARY[0]!;
    const word = sample.definition.split(/\s+/).find((candidate) => candidate.length > 4)!;
    expect(filterTerms(GLOSSARY, `${sample.term} ${word}`).some((entry) => entry.id === sample.id)).toBe(true);
    expect(filterTerms(GLOSSARY, "zzzzqqqq")).toEqual([]);
  });

  it("groups by first letter without splitting a letter", () => {
    const groups = groupByLetter(filterTerms(GLOSSARY, ""));
    expect(new Set(groups.map((group) => group.letter)).size).toBe(groups.length);
    expect(groups.reduce((sum, group) => sum + group.entries.length, 0)).toBe(GLOSSARY.length);
  });
});

describe("where a term comes up", () => {
  it("leads a term a chapter teaches to that chapter and to the screens it applies to", () => {
    const chapter = HANDBOOK.find((candidate) => chapterTerms(candidate).length > 0)!;
    const term = chapterTerms(chapter)[0]!;
    const doors = termDoors(term.id);
    expect(doors.chapters.map((door) => door.id)).toContain(chapter.id);
    expect(doors.screens.map((door) => door.href).length).toBeGreaterThan(0);
    expect(new Set(doors.screens.map((door) => door.id)).size).toBe(doors.screens.length);
  });

  it("offers nothing for a word no chapter teaches", () => {
    expect(termDoors("not-a-term")).toEqual({ chapters: [], screens: [] });
  });
});
