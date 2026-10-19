import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from "@tanstack/react-router";
import { GLOSSARY, HANDBOOK, handbookChapter } from "@admin/player-core";
import type { ReactNode } from "react";
import { ChapterView } from "./ChapterView";
import { chapterNeighbors, chapterTerms, filterTerms, groupByLetter } from "./selectors";

const escaped = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

async function render(node: ReactNode): Promise<string> {
  const router = createRouter({ routeTree: createRootRoute({ component: () => node }), history: createMemoryHistory({ initialEntries: ["/"] }) });
  await router.load();
  return renderToString(<RouterProvider router={router} />);
}

describe("ChapterView", () => {
  const chapter = handbookChapter("congress");
  if (!chapter) throw new Error("the Congress chapter is missing");

  it("draws every explainer under its own anchored heading, then the terms and the screens", async () => {
    const html = await render(<ChapterView chapter={chapter} onOpen={() => undefined} />);
    for (const id of chapter.explainers) expect(html).toContain(`id="${id}"`);
    expect(html.match(/class="hb-section__title"/g)?.length).toBeGreaterThanOrEqual(chapter.explainers.length + 2);
    expect(html).toContain("Terms in this chapter");
    for (const entry of chapterTerms(chapter)) expect(html).toContain(escaped(entry.term));
    expect(html).toContain("Where you use this");
    expect(html).toContain('href="/washington/congress"');
  });

  it("links to the chapter on either side", async () => {
    const { previous, next } = chapterNeighbors(chapter.id);
    const html = await render(<ChapterView chapter={chapter} onOpen={() => undefined} />);
    expect(html).toContain(`/handbook/${previous?.id}`);
    expect(html).toContain(`/handbook/${next?.id}`);
  });
});

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
});

describe("A to Z", () => {
  it("keeps every entry for an empty query, in order", () => {
    const all = filterTerms(GLOSSARY, "  ");
    expect(all).toHaveLength(GLOSSARY.length);
    expect(all.map((entry) => entry.term)).toEqual([...all.map((entry) => entry.term)].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  });

  it("matches the term or its definition, every word", () => {
    const veto = filterTerms(GLOSSARY, "VETO");
    expect(veto.some((entry) => entry.id === "veto")).toBe(true);
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
