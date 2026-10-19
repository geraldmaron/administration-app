import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  STANCE_CUTS,
  attributeVerdict,
  loyaltyWord,
  metricVerdict,
  metricStanceWord,
  polishCompactFigure,
  roleTitle,
  stanceForRatio,
  stanceForTrust,
  dispositionLabel,
} from "./figures";

describe("roleTitle", () => {
  // The only playable seat is the US presidency, so a screen handed no charter
  // titles still reads American: the id-derived "Foreign Minister" is the
  // dataset's vocabulary, never a reader's.
  it("falls back to the American title when no charter titles are supplied", () => {
    expect(roleTitle("role-foreign-minister")).toBe("Secretary of State");
  });

  it("still derives a title from the id for a seat no American title covers", () => {
    expect(roleTitle("role-culture-minister")).toBe("Culture Minister");
  });

  it("prefers a charter's authored title over the derived one", () => {
    expect(roleTitle("role-foreign-minister", { "role-foreign-minister": "Secretary of State" })).toBe(
      "Secretary of State",
    );
  });

  it("falls back to the American title for a chair the charter does not title", () => {
    expect(roleTitle("role-defense-minister", { "role-foreign-minister": "Secretary of State" })).toBe(
      "Secretary of Defense",
    );
  });

  // The role ids are the engine's cross-charter contract and stay generic;
  // what the player reads is the charter's own title for the seat. A screen
  // that types "Secretary of State" as a literal reads correctly today and
  // lies the moment a campaign runs under any other charter — including the
  // derived fallback — so the literal is the thing to catch, not the wording.
  it("is the only route a screen has to a seat's title", () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
    const offenders: string[] = [];
    const dirs = [join(root, "src")];
    const web = join(root, "..", "..", "apps", "web", "src");
    if (existsSync(web)) dirs.push(web);
    for (const file of dirs.flatMap((dir) => (existsSync(dir) ? sourceFiles(dir) : []))) {
      // The one sanctioned place a title is typed: roleTitle's own American
      // fallback table, which every screen reaches through roleTitle.
      if (relative(root, file) === "src/format/figures.ts") continue;
      // The baked corpus is authored prose that happens to live in a .ts file.
      // An official quoted saying "Secretary of State" in a scenario is the
      // writers' room naming a person, not a screen labeling a seat, and it
      // answers to the content gate rather than to this one.
      if (relative(root, file) === "src/content/bundled-corpus.generated.ts") continue;
      // The glossary teaches what the real offices are, so it names
      // them the way a civics text does; it labels no seat on any screen.
      if (relative(root, file).startsWith("src/glossary/")) continue;
      const source = readFileSync(file, "utf8");
      for (const [index, line] of source.split("\n").entries()) {
        // A comment is not a screen. Continuation lines of a block comment
        // already start with "*"; a one-line doc comment starts with "/*" and
        // was slipping through, so a docstring naming a seat as its example
        // read as a violation.
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
        if (HARDCODED_TITLE.test(line)) offenders.push(`${relative(root, file)}:${index + 1}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

// A quoted seat title, which only the charter is allowed to author.
const HARDCODED_TITLE =
  /["'`](Secretary of [A-Z]|Director of National Intelligence|Prime Minister|Foreign Minister|Defense Minister|Treasury Minister|Interior Minister)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".test.")) return [];
    return [full];
  });
}

describe("polishCompactFigure", () => {
  it("drops a spurious .0 before a scale suffix", () => {
    expect(polishCompactFigure("$43.0B")).toBe("$43B");
    expect(polishCompactFigure("$468.0B")).toBe("$468B");
    expect(polishCompactFigure("$3.90T")).toBe("$3.9T");
  });

  it("keeps meaningful fractional precision", () => {
    expect(polishCompactFigure("$43.2B")).toBe("$43.2B");
    expect(polishCompactFigure("$3.89T")).toBe("$3.89T");
    expect(polishCompactFigure("334.9M")).toBe("334.9M");
  });
});

describe("stance cuts", () => {
  it("matches STANCE_THRESHOLDS in reading.ts", () => {
    expect([STANCE_CUTS.caution, STANCE_CUTS.neutral, STANCE_CUTS.favorable]).toEqual([0.25, 0.45, 0.65]);
  });

  it("names the band on the upper side of each cut", () => {
    expect(stanceForRatio(0.249)).toBe("adverse");
    expect(stanceForRatio(0.25)).toBe("caution");
    expect(stanceForRatio(0.449)).toBe("caution");
    expect(stanceForRatio(0.45)).toBe("neutral");
    expect(stanceForRatio(0.649)).toBe("neutral");
    expect(stanceForRatio(0.65)).toBe("favorable");
  });
});

// The dossier draws a person's readings as figures with a word beside them,
// and the cabinet screen draws the same readings as colored bars. The word and
// the color are two renderings of one judgment, so they are derived from one
// set of thresholds — a Secretary called strong on one screen and drawn amber on
// the other is the defect this pins shut.
describe("attributeVerdict", () => {
  it("changes exactly where the stance does", () => {
    const boundaries = [0, 0.24, 0.25, 0.44, 0.45, 0.64, 0.65, 1];
    const words = new Map<string, string>();
    for (const value of boundaries) {
      const stance = stanceForRatio(value);
      const existing = words.get(stance);
      if (existing) expect(attributeVerdict(value)).toBe(existing);
      words.set(stance, attributeVerdict(value));
    }
    expect(new Set(words.values()).size).toBe(words.size);
  });

  it("reads high as good, because every attribute drawn with a verdict is one where it is", () => {
    expect(attributeVerdict(0.9)).toBe("Strong");
    expect(attributeVerdict(0.1)).toBe("Poor");
  });
});

describe("loyaltyWord", () => {
  it("is not the Hill disposition vocabulary", () => {
    expect(loyaltyWord(stanceForRatio(0.9))).toBe("Loyal");
    expect(loyaltyWord(stanceForRatio(0.1))).toBe("Disloyal");
    expect(loyaltyWord("favorable")).not.toBe("With you");
    expect(loyaltyWord("adverse")).not.toBe("Against");
  });
});

describe("metricVerdict", () => {
  it("changes exactly where the stance does", () => {
    const words = new Map<string, string>();
    for (const value of [0, 0.24, 0.25, 0.44, 0.45, 0.64, 0.65, 1]) {
      const stance = stanceForRatio(value);
      const existing = words.get(stance);
      if (existing) expect(metricVerdict(value)).toBe(existing);
      words.set(stance, metricVerdict(value));
    }
    expect(new Set(words.values()).size).toBe(words.size);
  });

  it("uses office language, not the person-attribute vocabulary", () => {
    expect(metricVerdict(0.9)).toBe("Good");
    expect(metricVerdict(0.5)).toBe("Fair");
    expect(metricVerdict(0.3)).toBe("Low");
    expect(metricVerdict(0.1)).toBe("At risk");
    expect(metricStanceWord("adverse")).toBe(metricVerdict(0.1));
    expect(metricVerdict(0.9)).not.toBe(attributeVerdict(0.9));
  });
});

// A relationship's word and its bar's color run off the same trust cuts, so a
// track drawn favorable can never be labeled hostile.
describe("relationship verdicts", () => {
  // The roster's trust bunches near zero, so the health cuts made Russia wary.
  it("reads the capitals whose trust is lowest as hostile and the treaty allies as trusting", () => {
    expect(stanceForTrust(-0.5)).toBe("adverse");
    expect(stanceForTrust(-0.27)).toBe("caution");
    expect(stanceForTrust(0.02)).toBe("neutral");
    expect(stanceForTrust(0.4)).toBe("favorable");
    expect(dispositionLabel(-0.5)).toBe("Hostile");
    expect(dispositionLabel(0.4)).toBe("Trusts you");
  });
});
