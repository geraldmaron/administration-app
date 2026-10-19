import { describe, expect, it } from "vitest";
import { sealedCampaign } from "../__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "../__fixtures__/scenarios.js";
import { auditScenarios, corpusOverlapIndex } from "../scenario-audit.js";
import { drawSelector, liveSelectors, selectScenario } from "../scenario-cast.js";
import type { ScenarioDef } from "../scenario.js";
import { NearDuplicateIndex, jaccard } from "./near-duplicate.js";
import { combinedPool, drawFromResidentPool, memoryPool } from "./pool.js";
import { selectorOf } from "./selector.js";

const campaign = sealedCampaign();

// A pool of tens of thousands is the actual target, and every claim below is
// about behavior that only differs at that size. They are written against a
// synthetic corpus because the authored one is deliberately small — the point
// of the bundled floor is that it stays small.
const synthetic = (count: number) =>
  Array.from({ length: count }, (_, index) => {
    const base = FIXTURE_SCENARIOS[index % FIXTURE_SCENARIOS.length]!;
    return { ...base, id: `${base.id}-${index}` };
  });

describe("selection reads selectors, not prose", () => {
  it("draws without any body present at all", () => {
    const selectors = FIXTURE_SCENARIOS.map((def) => selectorOf(def, "core-000.jsonl"));
    const drawn = drawSelector(campaign, selectors);
    expect(drawn).toBeDefined();
    expect(drawn!.selector.shard).toBe("core-000.jsonl");
    expect(Object.keys(drawn!.selector)).not.toContain("opening");
  });

  it("agrees with the full-def draw, so the split changed cost and not outcome", () => {
    const bySelector = drawSelector(campaign, FIXTURE_SCENARIOS.map((def) => selectorOf(def)));
    expect(selectScenario(campaign, FIXTURE_SCENARIOS)?.def.id).toBe(bySelector?.selector.id);
  });

  it("binds each distinct cast once rather than once per scenario", () => {
    // Ten thousand candidates over five distinct casts must not cost ten
    // thousand rankings of the board. Measured rather than asserted about,
    // because this is a performance claim and nothing else would catch its
    // regression.
    //
    // Measured against a baseline in the same run rather than against a
    // wall-clock ceiling. A flat cap is the author's laptop written into an
    // assertion: this ran in 8ms here and would fail a loaded CI box for
    // reasons that have nothing to do with binding. The baseline is the same
    // call over the five distinct casts alone — the same five board rankings
    // this pool needs, and nothing else. Everything the large pool adds beyond
    // it is a map lookup.
    //
    // 50x is the discriminating margin: binding once per scenario instead of
    // once per cast would do 2,000 times the baseline's rankings, so a
    // regression cannot hide under it, and no machine is 50x noisier than
    // itself inside one test.
    const time = (count: number) => {
      const pool = synthetic(count).map((def) => selectorOf(def));
      const started = performance.now();
      const live = liveSelectors(campaign, pool);
      expect(live.length).toBeGreaterThan(0);
      return performance.now() - started;
    };

    const baseline = Math.max(time(FIXTURE_SCENARIOS.length), 0.01);
    expect(time(10_000)).toBeLessThan(baseline * 50);
  });
});

// `selectorOf` reads five required fields and four optional ones, and read the
// optional `locus` as though it were required — `def.locus.state`, unguarded.
// `ScenarioDef.locus` is required, so that typechecked and every authored
// scenario satisfied it; what it did not survive was the shape `selectorOf`
// itself returns, where `locus` is optional. The throw landed inside
// `memoryPool`, which the root layout builds before any route renders, so the
// blast radius of one absent field was the whole app rather than one scenario.
describe("a selector is built from a def that may be missing its optional fields", () => {
  // Cast because the point is precisely the shape the type forbids and the
  // runtime can still be handed — from a selector read back off the index, or
  // from a def built before the schema made `locus` required.
  const withoutLocus = (() => {
    const { locus: _locus, ...rest } = FIXTURE_SCENARIOS[0]!;
    return rest as ScenarioDef;
  })();

  it("does not throw on a def carrying no locus at all", () => {
    expect(() => selectorOf(withoutLocus)).not.toThrow();
    expect(selectorOf(withoutLocus).locus).toBeUndefined();
  });

  // The crash reached the app through the pool, not through a direct call, so
  // the regression is pinned at the level that actually broke.
  it("builds a pool over such a def rather than taking down every route", () => {
    expect(() => memoryPool([withoutLocus])).not.toThrow();
    expect(memoryPool([withoutLocus]).selectors).toHaveLength(1);
  });

  // Totality over its own output: what `selectorOf` returns omits `locus`
  // whenever the def had no state, and that result is a shape callers hold.
  it("accepts the shape it produces, so a selector can round-trip", () => {
    const once = selectorOf(withoutLocus);
    expect(() => selectorOf(once as unknown as ScenarioDef)).not.toThrow();
  });

  it("still carries the locus state through when the def has one", () => {
    const located: ScenarioDef = { ...FIXTURE_SCENARIOS[0]!, locus: { ...FIXTURE_SCENARIOS[0]!.locus, state: "CA" } };
    expect(selectorOf(located).locus).toEqual({ state: "CA" });
  });
});

describe("a pool fetches one body per turn", () => {
  it("answers synchronously when bodies are resident, and declines when they are not", () => {
    expect(drawFromResidentPool(campaign, memoryPool(FIXTURE_SCENARIOS))).toBeDefined();
    // A pool whose bodies are not resident, stated inline: the interface still
    // permits one, and the resident draw must refuse it rather than block.
    const remote = {
      selectors: FIXTURE_SCENARIOS.map((def) => selectorOf(def)),
      peek: () => undefined,
      load: async () => undefined,
    };
    expect(drawFromResidentPool(campaign, remote)).toBeUndefined();
  });

  it("draws across mounted packs as one pool", () => {
    const [first, ...rest] = FIXTURE_SCENARIOS;
    const combined = combinedPool([memoryPool([first!]), memoryPool(rest)]);
    expect(combined.selectors).toHaveLength(FIXTURE_SCENARIOS.length);
    expect(drawFromResidentPool(campaign, combined)).toBeDefined();
  });
});

describe("a retired scenario is pulled from the draw without leaving the pool", () => {
  const retired: ScenarioDef = { ...FIXTURE_SCENARIOS[0]!, retired: true };
  const live = FIXTURE_SCENARIOS.slice(1);

  it("drops out of the selector list a draw actually consults", () => {
    const pool = memoryPool([retired, ...live]);
    expect(pool.selectors).toHaveLength(live.length);
    expect(pool.selectors.some((selector) => selector.id === retired.id)).toBe(false);
  });

  it("stays resolvable by id, so a reader elsewhere in the pool can still resolve what it set", () => {
    const pool = memoryPool([retired, ...live]);
    expect(pool.peek(retired.id)).toEqual(retired);
  });
});

describe("near-duplicate detection scales and stays exact about its verdicts", () => {
  const shingles = (text: string) => {
    const words = text.split(" ");
    return new Set(words.slice(0, Math.max(0, words.length - 2)).map((_, i) => words.slice(i, i + 3).join(" ")));
  };

  it("finds a genuine near-duplicate", () => {
    const index = new NearDuplicateIndex();
    const original = shingles("the patrol crossed the line before dawn and sat there for two hours waiting");
    index.add("original", "war", original);
    const echo = shingles("the patrol crossed the line before dawn and sat there for two hours idling");
    expect(index.matches("echo", "war", echo)).toHaveLength(1);
  });

  it("does not report unrelated scenarios, and never on the strength of banding alone", () => {
    const index = new NearDuplicateIndex();
    index.add("a", "war", shingles("the patrol crossed the line before dawn and sat there"));
    const unrelated = shingles("the currency lost a twelfth of its value before the banks opened");
    expect(index.matches("b", "war", unrelated)).toEqual([]);
    // Whatever banding proposes, the reported similarity is the exact Jaccard.
    for (const match of index.matches("b", "war", unrelated)) {
      expect(match.similarity).toBe(jaccard(unrelated, unrelated));
    }
  });

  it("keeps scenarios of different classes out of each other's buckets", () => {
    const index = new NearDuplicateIndex();
    const text = shingles("the same words entirely in both of these two scenarios here");
    index.add("a", "war", text);
    expect(index.matches("b", "economy", text)).toEqual([]);
  });

  it("survives a round trip through persisted sketches, which is what makes it incremental", () => {
    const built = new NearDuplicateIndex();
    const text = shingles("the patrol crossed the line before dawn and sat there for hours");
    built.add("original", "war", text);

    const reloaded = new NearDuplicateIndex();
    for (const entry of built.entriesForPersist()) reloaded.addSignature(entry.id, entry.bucket, entry.signature);
    expect(reloaded.candidates("echo", "war", text)).toContain("original");
  });

  it("audits a large corpus of distinct scenarios in linear time", () => {
    // Distinct prose, because a corpus of identical scenarios genuinely does
    // contain quadratically many duplicate pairs and reporting them all is
    // quadratic however the search is done. The claim being measured is about
    // a real corpus, where near-duplicates are rare.
    const distinct = (count: number) =>
      Array.from({ length: count }, (_, index) => {
        const base = FIXTURE_SCENARIOS[index % FIXTURE_SCENARIOS.length]!;
        const salt = (text: string) => text.replace(/\b(\w{4,})\b/g, (word) => `${word}${index}`);
        return {
          ...base,
          id: `${base.id}-${index}`,
          subject: salt(base.subject),
          opening: base.opening.map((beat) => ({ ...beat, text: salt(beat.text) })),
          replies: base.replies.map((reply) => ({ ...reply, text: salt(reply.text) })),
        };
      });

    const time = (count: number) => {
      const pool = distinct(count);
      const started = performance.now();
      auditScenarios(pool);
      return performance.now() - started;
    };

    const small = time(500);
    const large = time(2_000);
    // Four times the corpus, not sixteen times the work: the index is the
    // claim, and a pairwise scan would be quadratic.
    expect(large).toBeLessThan(small * 8);
    // A per-scenario budget rather than a wall-clock cap on this size. A flat
    // cap is the author's laptop written into an assertion — the audit costs
    // about 5ms per scenario, so 2,000 of them run to ten seconds on slower
    // hardware and the test fails for reasons that have nothing to do with the
    // code.
    //
    // 25ms is five times the observed cost, which still catches a rule that
    // blows up by an order of magnitude while surviving a loaded CI box. What
    // it protects: the publish gate audits the whole v1 corpus of 730 at once,
    // and this budget keeps that under twenty seconds.
    expect(large / 2_000).toBeLessThan(25);
  });

  it("sees a batch's collision with content already shipped, which a batch-local check cannot", () => {
    const installed = corpusOverlapIndex(FIXTURE_SCENARIOS);
    const reprint = [{ ...FIXTURE_SCENARIOS[0]!, id: "a-different-id" }];
    expect(auditScenarios(reprint, [], {})).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ kind: "template-overlap" })]),
    );
    const againstCorpus = auditScenarios(reprint, [], { overlapIndex: installed });
    expect(againstCorpus.some((finding) => finding.kind === "template-overlap")).toBe(true);
  });

  it("refuses an id the corpus already holds", () => {
    const clash = [{ ...FIXTURE_SCENARIOS[0]! }];
    const findings = auditScenarios(clash, [], { installedIds: [FIXTURE_SCENARIOS[0]!.id] });
    expect(findings.some((finding) => finding.kind === "duplicate-scenario-id")).toBe(true);
  });
});

describe("the bundled floor stays a floor", () => {
  // Everything in the core pack is compiled into the app binary and parsed at
  // boot. That is right for an offline floor and ruinous for a corpus: at the
  // pack's own average size, ten thousand scenarios would be tens of megabytes
  // of JavaScript. Growth belongs in shards the app loads on demand, so this
  // is the tripwire on the wrong kind of growth.
  it("is small enough to bundle", () => {
    expect(FIXTURE_SCENARIOS.length).toBeLessThanOrEqual(50);
    const bytes = Buffer.byteLength(JSON.stringify(FIXTURE_SCENARIOS));
    expect(bytes).toBeLessThan(512 * 1024);
  });
});
