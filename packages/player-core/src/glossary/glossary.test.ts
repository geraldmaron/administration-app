import { describe, expect, it } from "vitest";
import { EXPLAINERS, GLOSSARY, glossaryEntry } from "./index.js";

const blank = (value: string | undefined) => value !== undefined && value.trim() === "";

describe("the glossary", () => {
  it("gives every glossary entry and explainer a unique id", () => {
    const ids = [...GLOSSARY.map((entry) => entry.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const explainers = EXPLAINERS.map((entry) => entry.id);
    expect(new Set(explainers).size).toBe(explainers.length);
  });

  it("points only at glossary entries that exist", () => {
    const dangling = [
      ...GLOSSARY.flatMap((entry) => (entry.related ?? []).map((id) => [entry.id, id] as const)),
      ...EXPLAINERS.flatMap((entry) => (entry.terms ?? []).map((id) => [entry.id, id] as const)),
      ...EXPLAINERS.flatMap((entry) => (entry.steps ?? []).flatMap((step) => (step.term ? [[entry.id, step.term] as const] : []))),
      ...EXPLAINERS.flatMap((entry) => (entry.cast ?? []).flatMap((member) => (member.term ? [[entry.id, member.term] as const] : []))),
    ].filter(([, id]) => glossaryEntry(id) === undefined);
    expect(dangling).toEqual([]);
  });

  it("writes no empty sentence", () => {
    const empty = [
      ...GLOSSARY.filter((entry) => blank(entry.term) || blank(entry.definition) || blank(entry.inGame)).map((entry) => entry.id),
      ...EXPLAINERS.filter(
        (entry) =>
          blank(entry.title) ||
          blank(entry.summary) ||
          (entry.steps ?? []).some((step) => blank(step.label) || blank(step.detail)) ||
          (entry.links ?? []).some((link) => blank(link.from) || blank(link.to) || blank(link.how)) ||
          (entry.examples ?? []).some((example) => blank(example.title) || example.lines.some((line) => blank(line))),
      ).map((entry) => entry.id),
    ];
    expect(empty).toEqual([]);
  });

  it("gives every explainer something to draw beyond its summary", () => {
    const bare = EXPLAINERS.filter((entry) => !entry.steps?.length && !entry.links?.length && !entry.examples?.length).map((entry) => entry.id);
    expect(bare).toEqual([]);
  });
});

// The owner's bar: a reader with no civics behind them learns from these, so
// every entry carries an everyday example and says what the game does, and
// every explainer ends in what the player can do. Citations live in the code
// comment beside an entry, never in the words a newcomer reads.
describe("written for a newcomer", () => {
  const CITATION = /U\.S\.C\.|C\.F\.R\.|\bv\. [A-Z]/;

  it("gives every glossary entry an example and an in-game note", () => {
    const thin = GLOSSARY.filter((entry) => !entry.example?.trim() || !entry.inGame?.trim()).map((entry) => entry.id);
    expect(thin).toEqual([]);
  });

  it("gives every explainer a worked example and something the player can do", () => {
    const thin = EXPLAINERS.filter((entry) => !entry.examples?.length || !entry.youCan?.length).map((entry) => entry.id);
    expect(thin).toEqual([]);
  });

  it("keeps statute and case citations out of the words a player reads", () => {
    const cited = [
      ...GLOSSARY.filter((entry) => CITATION.test(entry.definition) || CITATION.test(entry.example ?? "")).map((entry) => entry.id),
      ...EXPLAINERS.filter((entry) => CITATION.test(entry.summary) || (entry.steps ?? []).some((step) => CITATION.test(step.detail))).map((entry) => entry.id),
    ];
    expect(cited).toEqual([]);
  });
});

describe("the explainer template", () => {
  it("reads next only into explainers that exist", () => {
    const ids = new Set(EXPLAINERS.map((entry) => entry.id));
    const dangling = EXPLAINERS.flatMap((entry) => (entry.next ?? []).filter((id) => !ids.has(id)).map((id) => `${entry.id} -> ${id}`));
    expect(dangling).toEqual([]);
  });

  it("draws every threshold as a count that can be met", () => {
    const bad = EXPLAINERS.flatMap((entry) =>
      (entry.thresholds ?? []).filter((row) => !(row.needed > 0 && row.needed <= row.of) || row.note.trim() === "").map((row) => `${entry.id}: ${row.label}`),
    );
    expect(bad).toEqual([]);
  });
});
