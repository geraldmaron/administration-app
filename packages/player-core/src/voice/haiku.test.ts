import { describe, expect, it } from "vitest";
import { HAIKU, haikuLines, type HaikuId } from "./index.js";

// A rough English syllable count: vowel groups, less a silent final e or a
// silent -ed and -es. Words it gets wrong are listed by hand, so an edit that
// adds a word the rule miscounts fails until someone checks it and lists it.
const COUNTED_BY_HAND: Readonly<Record<string, number>> = {};

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  const byHand = COUNTED_BY_HAND[w];
  if (byHand !== undefined) return byHand;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) ?? []).length);
}

const lineSyllables = (line: string) => line.split(/\s+/).reduce((sum, word) => sum + syllables(word), 0);

const ids = Object.keys(HAIKU) as HaikuId[];

const NUMBER_WORDS = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|million|billion|half|third|quarter|percent|first|second|last week)\b/i;
const INSTRUCTION = /\b(?:press|click|tap|choose|pick|select|open|go to|read|sign|continue|try|you should|you must|don't|remember to)\b/i;

describe("the haiku registry", () => {
  it.each(ids)("keeps %s at five, seven and five syllables", (id) => {
    const declared = HAIKU[id].map((line) => line.syllables);
    expect(declared).toEqual([5, 7, 5]);
    expect(HAIKU[id].map((line) => lineSyllables(line.text))).toEqual(declared);
  });

  it.each(ids)("keeps figures and instructions out of %s", (id) => {
    for (const line of haikuLines(id)) {
      expect(line).not.toMatch(/\d|%|\$/);
      expect(line).not.toMatch(NUMBER_WORDS);
      expect(line).not.toMatch(INSTRUCTION);
      expect(line).not.toMatch(/[!;:—]/);
    }
  });

  it("counts a few known words the way a reader says them", () => {
    expect(["office", "nothing", "begins", "someone", "cleared"].map(syllables)).toEqual([2, 2, 2, 2, 1]);
  });
});
