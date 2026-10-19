import { describe, expect, it } from "vitest";
import { runBalanceHarness } from "./balance-harness.js";
import type { AdministrationParty } from "./state-legislature.js";

// Which party each balance file measures.
//
// The weekly run repeats the balance gate once per party, but only one file
// reads the party it is given; the others measure one fixed party whatever the
// run asks for. Repeating those for a second and third party reprints the same
// numbers under a different heading. So a full measurement runs every file once
// and repeats only the file that reads the party, and this table is what keeps
// that shortcut honest: a file that starts reading the party, or a new balance
// file nobody placed in the table, fails here before the shortcut drops it.

declare global {
  interface ImportMeta {
    glob(pattern: string, options: { readonly query: "?raw"; readonly import: "default"; readonly eager: true }): Record<string, string>;
  }
}

// A file that measures every party itself, whatever the run asks for, is the
// third kind: the shortcut can run it once because it already repeats itself.
type Scope = { readonly readsParty: true } | { readonly fixed: AdministrationParty } | { readonly everyParty: true };

const SCOPE: Readonly<Record<string, Scope>> = {
  "balance.test.ts": { readsParty: true },
  "pledge-balance.test.ts": { fixed: "republican" },
  "term-balance.test.ts": { readsParty: true },
  "population-balance.test.ts": { fixed: "democrat" },
  "economy-balance.test.ts": { fixed: "democrat" },
  // R1.1 at thirty-six seeds, one party per file so the runner measures the
  // three side by side.
  "borrowing-democrat-balance.test.ts": { fixed: "democrat" },
  "borrowing-republican-balance.test.ts": { fixed: "republican" },
  "borrowing-independent-balance.test.ts": { fixed: "independent" },
  "macro-balance.test.ts": { fixed: "democrat" },
  "overruling-balance.test.ts": { fixed: "democrat" },
  // The person-behavior batteries: three repeat every party themselves, and the
  // two that read one government's diplomacy and the NPC world found under the
  // harness's default ticket.
  "ws-a-behavior-balance.test.ts": { everyParty: true },
  "ws-b-behavior-balance.test.ts": { fixed: "democrat" },
  "ws-c-behavior-balance.test.ts": { everyParty: true },
  "ws-d-behavior-balance.test.ts": { everyParty: true },
  "ws-e-behavior-balance.test.ts": { fixed: "democrat" },
};

/** Named before they are written, so the table is already right the day each lands. Any other entry must name a file. */
const NOT_YET_WRITTEN: ReadonlySet<string> = new Set<string>();

const SELF = "balance-party-scope.test.ts";
const PARTY_LITERAL = /["'](democrat|republican|independent)["']/g;

/** The balance run's own include, read as source; the keys are paths relative to this file. */
const SOURCES = import.meta.glob("./**/*balance*.test.ts", { query: "?raw", import: "default", eager: true });

const fileName = (key: string) => key.split("/").pop()!;
const withoutComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const files = new Map(
  Object.entries(SOURCES)
    .filter(([key]) => fileName(key) !== SELF)
    .map(([key, text]) => [fileName(key), withoutComments(text)] as const),
);

describe("which party each balance file measures", () => {
  it("places every file the balance run includes, and names no file that does not exist", () => {
    expect([...files.keys()].filter((name) => !(name in SCOPE))).toEqual([]);
    expect(Object.keys(SCOPE).filter((name) => !files.has(name) && !NOT_YET_WRITTEN.has(name))).toEqual([]);
  });

  it("finds the party variable read in exactly the files that say they read it", () => {
    for (const [name, text] of files) {
      const scope = SCOPE[name];
      if (scope) expect(text.includes("BALANCE_PARTY"), name).toBe("readsParty" in scope);
    }
  });

  it("finds each file that measures every party naming all three", () => {
    for (const [name, text] of files) {
      if (!("everyParty" in (SCOPE[name] ?? {}))) continue;
      const named = new Set([...text.matchAll(PARTY_LITERAL)].map((match) => match[1]));
      expect([...named].sort(), name).toEqual(["democrat", "independent", "republican"]);
    }
  });

  it("finds each fixed file naming only its own party, or none where its party is the harness's default", () => {
    const harnessDefault = runBalanceHarness([], 0).party;
    expect(harnessDefault).toBe("democrat");
    for (const [name, text] of files) {
      const scope = SCOPE[name];
      if (!scope || !("fixed" in scope)) continue;
      const named = new Set([...text.matchAll(PARTY_LITERAL)].map((match) => match[1]));
      const expected = scope.fixed === harnessDefault ? [[], [harnessDefault]] : [[scope.fixed]];
      expect(expected.map((list) => list.join())).toContain([...named].sort().join());
    }
  });
});
