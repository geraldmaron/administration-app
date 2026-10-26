import { describe, expect, it } from "vitest";
import { ACUTE_CONDITIONS, commitReply, createRngStreams, daysBetween, selectRemoval, type Campaign } from "@admin/engine";
import { CLASS_COOLDOWN, recurrenceKind, rememberReply } from "@admin/content";
import { openingCampaign } from "../__fixtures__/opening";
import { createCampaignStore } from "../campaign/store";
import { createMemoryStorage, createSaveStore } from "../persistence/save-store";
import { deskMatterSource, matterFor, presentedItems } from "../desk/attention";
import { pendingConversations, scenarioMatterSource, BUNDLED_CONSEQUENCES } from "../conversation/scripts";
import { deferMatterPacket } from "../campaign/stop-brief";
import { bundledCorpusScenarios } from "../content/bundled-corpus";
import { nextRung, removalDue } from "../summons/due-executive";

// Engagement and content coverage through the production attention loop: the
// campaign store, the Desk and scenario matter sources, deferral, and the
// corpus baked into this build. Moved here from the engine's events probe
// because the engine may not import player-core (DECISIONS §1.1). Run with
// `pnpm --filter @admin/player-core run test:probes`, whose config points
// `@admin/engine` and `@admin/content` at source so the run never mixes this
// tree with a stale build. Benchmarks: docs/audits/2026-10-24-world-dynamics/
// domains/events.md; verdicts: METHODOLOGY.md §2 and PROGRAM.md.

type Stop = {
  readonly day: number;
  readonly elapsed: number;
  readonly presented: readonly (readonly [source: string, urgency: string, id: string])[];
  readonly ambient: number;
  /** The removal rung within summons reach at this stop, if any: one approach to one rung is one episode. */
  readonly removalEpisode: number | undefined;
};
type Run = { readonly stops: readonly Stop[]; readonly answered: readonly { readonly id: string; readonly cls: string; readonly day: number }[] };

function episodeOf(campaign: Campaign): number | undefined {
  return removalDue(campaign) ? nextRung(selectRemoval(campaign).pressure) : undefined;
}

async function playStore(seed: string, answer: boolean, days: number): Promise<Run> {
  const campaign = openingCampaign({ seedText: seed });
  const store = createCampaignStore({ saves: createSaveStore(createMemoryStorage()), matterSources: [(c, d) => deskMatterSource(c, d), scenarioMatterSource] });
  await store.begin(campaign);
  const ready = (): Campaign => {
    const state = store.getState();
    if (state.status !== "ready") throw new Error(`the store is ${state.status}, not ready`);
    return state.campaign;
  };
  const start = ready().calendar;
  const stops: Stop[] = [];
  const answered: { id: string; cls: string; day: number }[] = [];
  for (let guard = 0; daysBetween(start, ready().calendar) < days && guard < 2000; guard += 1) {
    if (answer) {
      for (const cast of pendingConversations(ready())) {
        const basis = ready();
        const option = cast.script.options[0]!;
        const result = commitReply(basis, cast.script, option, createRngStreams(basis.seed), { consequences: BUNDLED_CONSEQUENCES });
        if (!result.ok) continue;
        await store.commit(rememberReply(basis, result.packet, cast, option.id), { basis });
        answered.push({ id: cast.def.id, cls: cast.def.class, day: daysBetween(start, basis.calendar) });
      }
    }
    for (let pass = 0; pass < 20; pass += 1) {
      const items = presentedItems(ready(), {});
      if (items.length === 0) break;
      for (const item of items) {
        const basis = ready();
        await store.commit(deferMatterPacket(basis, matterFor(item, basis.calendar)), { basis });
      }
    }
    const before = ready();
    await store.continueUntilAttention(28);
    const state = store.getState();
    if (state.status !== "ready") break;
    if (!state.stop) throw new Error("continueUntilAttention returned ready with no stop");
    stops.push({
      day: daysBetween(start, state.campaign.calendar),
      elapsed: daysBetween(before.calendar, state.campaign.calendar),
      presented: state.stop.presented.map((m) => [m.source, m.urgency, m.id] as const),
      ambient: state.stop.ambient.length,
      removalEpisode: episodeOf(state.campaign),
    });
    if (state.stopReason === "ended") break;
  }
  return { stops, answered };
}

const lazyRuns = new Map<string, Promise<Run>>();
const lazy = (seed: string) => {
  const cached = lazyRuns.get(seed) ?? playStore(seed, false, 365);
  lazyRuns.set(seed, cached);
  return cached;
};
let answeringRun: Promise<Run> | undefined;
const answering = () => (answeringRun ??= playStore("ev-1", true, 730));
const LAZY_SEEDS = ["ev-1", "ev-2"];

describe("D. engagement for a President who defers everything", () => {
  it("reports stops per 30 days, the median gap and the most repeated matter, per seed (report only)", async () => {
    for (const seed of LAZY_SEEDS) {
      const run = await lazy(seed);
      const gaps = run.stops.map((s) => s.elapsed).sort((a, b) => a - b);
      const counts = run.stops.flatMap((s) => s.presented.map((p) => p[2])).reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {});
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      console.log(`[engagement:D] ${seed} stops/30d`, run.stops.length / (365 / 30), "median days between", gaps[Math.floor(gaps.length / 2)],
        "top matter", top, "of stops", run.stops.length);
    }
    expect(lazyRuns.size).toBe(LAZY_SEEDS.length);
  }, 2_400_000);
  it.todo("an attention budget (stops per month, quiet spells): DECISIONS §2.2 sets no number; define it with the attention contract in Wave 1, then assert it across seeds");

  // DECISIONS §5.16: salience fires on change. A removal summons is due while
  // pressure sits within reach of the next rung (due-executive.ts), a level and
  // not an edge, so it re-interrupts every week the level holds. An approach to
  // one rung is one episode; it may interrupt once, and again only on a new
  // rung or a fresh approach after pressure left reach.
  it("interrupts at most once per removal-pressure episode", async () => {
    for (const seed of LAZY_SEEDS) {
      const run = await lazy(seed);
      const byEpisode = new Map<string, number>();
      let episode = 0;
      run.stops.forEach((stop, i) => {
        const previous = run.stops[i - 1]?.removalEpisode;
        if (stop.removalEpisode !== undefined && stop.removalEpisode !== previous) episode += 1;
        if (stop.presented.some((p) => p[2].startsWith("summons:removal"))) {
          const key = `${episode}@${stop.removalEpisode ?? "out-of-reach"}`;
          byEpisode.set(key, (byEpisode.get(key) ?? 0) + 1);
        }
      });
      console.log(`[engagement:D] ${seed} removal summons stops by episode`, Object.fromEntries(byEpisode));
      expect(Math.max(0, ...byEpisode.values()), `${seed}: removal summons stops within one episode`).toBeLessThanOrEqual(1);
    }
  }, 2_400_000);

  it("keeps every 30-day window supplied with at least one stop or ambient event (idle weeks still change the world)", async () => {
    const run = await lazy("ev-1");
    const busy = Array.from({ length: 12 }, (_, i) =>
      run.stops.some((s) => s.day >= i * 30 && s.day < (i + 1) * 30 && (s.presented.length > 0 || s.ambient > 0)));
    expect(busy.every(Boolean)).toBe(true);
  }, 2_400_000);

  it("varies across seeds: two seeds share under 40% of their first-year scenarios", async () => {
    const ids = async (seed: string) => new Set((await lazy(seed)).stops.flatMap((s) => s.presented.filter((p) => p[0] === "scenario").map((p) => p[2].replace(/@\d+$/, ""))));
    const a = await ids("ev-1");
    const b = await ids("ev-2");
    const shared = [...a].filter((x) => b.has(x)).length;
    const jaccard = shared / (a.size + b.size - shared);
    console.log("[engagement:D] scenario overlap (Jaccard)", jaccard, a.size, b.size);
    expect(jaccard).toBeLessThan(0.4);
  }, 2_400_000);
});

describe("D2. a President who answers everything for two years", () => {
  it("reports scenario repeats within 56 and 90 days and the classes staged (report only)", async () => {
    const run = await answering();
    const within = (days: number) => run.answered.filter((a, i) =>
      run.answered.slice(0, i).some((b) => b.id === a.id && a.day - b.day < days)).length;
    const classes = run.answered.reduce<Record<string, number>>((acc, a) => ({ ...acc, [a.cls]: (acc[a.cls] ?? 0) + 1 }), {});
    const staged = new Set(run.answered.map((a) => a.cls));
    const unstaged = [...new Set(bundledCorpusScenarios().map((s) => s.class as string))].filter((c) => !staged.has(c));
    console.log("[engagement:D2] answered", run.answered.length, "repeats<56d", within(56), "repeats<90d", within(90), "classes", classes, "never staged", unstaged);
    expect(run.answered.length).toBeGreaterThan(0);
  }, 2_400_000);
  // DECISIONS 7.13: recurring business rests thirteen weeks, a unique incident
  // happens once, and an episode-bound scenario returns only for a new episode,
  // never inside the class cooldown.
  it("keeps the recurrence contract: no routine or unique scenario back within 91 days, and an episode-bound one only after the class cooldown", async () => {
    const run = await answering();
    const kinds = new Map(bundledCorpusScenarios().map((s) => [s.id as string, recurrenceKind(s)]));
    const repeats = run.answered.flatMap((a, i) => {
      const prior = run.answered.slice(0, i).filter((b) => b.id === a.id).at(-1);
      return prior && a.day - prior.day < 91 ? [{ id: a.id, gap: a.day - prior.day, kind: kinds.get(a.id) }] : [];
    });
    console.log("[engagement:D2] repeats within 91 days", repeats);
    expect(repeats.filter((r) => r.kind !== "episode")).toEqual([]);
    expect(repeats.every((r) => r.gap >= CLASS_COOLDOWN * 7)).toBe(true);
  }, 2_400_000);
});

describe("B2. the baked corpus reads the hazards that open at home", () => {
  it("has a scenario gated on every acute condition kind that can open at home", () => {
    const gated = new Set(bundledCorpusScenarios().flatMap((s) => s.conditions.flatMap((c) => (c.kind === "conditionActive" ? [c.condition as string] : []))));
    const missing = (ACUTE_CONDITIONS as readonly string[]).filter((k) => !gated.has(k));
    console.log("[engagement:B2] acute kinds with no gated scenario", missing);
    expect(missing).toEqual([]);
  });
});
