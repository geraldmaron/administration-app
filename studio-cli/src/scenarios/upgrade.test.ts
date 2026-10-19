import { mkdir, mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ScenarioDef } from "@admin/content";
import { ADDED_KEYS, buildUpgradeBrief, courtesyWaived, needsUpgrade, PRESERVED_KEYS, preservationFindings, selectUpgradeCandidates, upgradeJob } from "./upgrade.js";
import { referenceExemplars } from "./reference.js";
import { gateResult } from "../jobs/gate.js";
import { corpusPathsFor, publishToCorpus, readCorpusBodies, reviseInCorpus } from "../corpus/shard-store.js";

// The reference set is the fixture on purpose: it is the only content in the
// repo that already carries both fields, so a test that strips them from a
// real exemplar and asks for them back is testing the pass the corpus will
// actually run rather than a shape invented here.
function exemplar(): ScenarioDef {
  const [first] = referenceExemplars();
  if (!first) throw new Error("the reference set is empty — upgrade tests have no fixture");
  return first;
}

/**
 * An exemplar with a financial band on at least one position, for the rules
 * about the treasury figure the band replaces. Found rather than hard-coded:
 * naming one pins these tests to a file that can be re-approved at any time.
 */
function pricedExemplar(): ScenarioDef {
  const found = referenceExemplars().find((def) =>
    def.replies.some((reply) => reply.commitment?.kind === "position" && reply.commitment.impact?.financial?.scale),
  );
  if (!found) throw new Error("no reference exemplar declares a financial band — the treasury rules have no fixture");
  return found;
}

/**
 * The exemplar as it would look before the pass: the two fields taken back
 * off, and the treasury figure the financial band replaced put back on. A
 * shipped scenario priced its money as a number, which is exactly what the
 * band is there to replace.
 */
function stripped(def: ScenarioDef): ScenarioDef {
  const { context: _context, ...rest } = def;
  return ScenarioDef.parse({
    ...rest,
    replies: def.replies.map((reply) => {
      if (reply.commitment?.kind !== "position") return reply;
      const { impact, ...commitment } = reply.commitment;
      const priced = impact?.financial?.scale !== undefined && impact.financial.scale !== "none";
      return { ...reply, commitment: priced ? { ...commitment, cost: { ...commitment.cost, treasury: -120 } } : commitment };
    }),
  });
}

describe("what an upgrade is allowed to change", () => {
  const original = stripped(exemplar());

  it("accepts the two fields being added and nothing else", () => {
    expect(preservationFindings(original, exemplar())).toEqual([]);
  });

  it("accepts the treasury figure being replaced by the band that carries it", () => {
    expect(preservationFindings(stripped(pricedExemplar()), pricedExemplar())).toEqual([]);
  });

  it("refuses a rewritten opening, however much better it reads", () => {
    const revised = ScenarioDef.parse({
      ...exemplar(),
      opening: exemplar().opening.map((beat, index) => (index === 0 ? { ...beat, text: `${beat.text} And it is worse than that.` } : beat)),
    });
    expect(preservationFindings(original, revised).join(" ")).toContain('"opening" changed');
  });

  it("refuses a reply whose text moved, even with the impact correctly added", () => {
    const revised = ScenarioDef.parse({
      ...exemplar(),
      replies: exemplar().replies.map((reply, index) => (index === 0 ? { ...reply, text: `${reply.text} We are done here.` } : reply)),
    });
    expect(preservationFindings(original, revised).join(" ")).toContain("changed outside its impact");
  });

  it("refuses a dropped reply rather than reporting every survivor as misaligned", () => {
    const revised = ScenarioDef.parse({ ...exemplar(), replies: exemplar().replies.slice(0, -1) });
    const findings = preservationFindings(original, revised);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toContain("may not add or drop one");
  });

  it("requires the treasury figure to go when a financial band arrives to carry it", () => {
    const keptBoth = ScenarioDef.parse({
      ...pricedExemplar(),
      replies: pricedExemplar().replies.map((reply) => {
        if (reply.commitment?.kind !== "position" || !reply.commitment.impact?.financial) return reply;
        return { ...reply, commitment: { ...reply.commitment, cost: { ...reply.commitment.cost, treasury: -120 } } };
      }),
    });
    expect(preservationFindings(stripped(pricedExemplar()), keptBoth).join(" ")).toContain("bills the same money twice");
  });

  it("refuses a treasury figure dropped with no band to carry it", () => {
    const dropped = ScenarioDef.parse({
      ...pricedExemplar(),
      replies: pricedExemplar().replies.map((reply) => {
        if (reply.commitment?.kind !== "position") return reply;
        const { impact: _impact, ...commitment } = reply.commitment;
        return { ...reply, commitment };
      }),
    });
    expect(preservationFindings(stripped(pricedExemplar()), dropped).join(" ")).toContain("without declaring a financial band");
  });

  it("refuses a scenario carrying a field the preservation contract has never heard of", () => {
    // Not a ScenarioDef — the point is what happens when the schema grows and
    // this file is not updated, which is a field arriving unpoliced.
    const revised = { ...exemplar(), aftermath: "something a later schema added" } as unknown as ScenarioDef;
    expect(preservationFindings(original, revised).join(" ")).toContain("not covered by the preservation contract");
  });
});

describe("the preservation contract itself", () => {
  it("covers every field the schema has, so a field added later cannot arrive unpoliced", () => {
    // The guard in preservationFindings catches this at run time and refuses
    // the batch. This catches it at test time, which is where a schema change
    // should hear about it — it found three real fields the first time it ran.
    const covered = new Set([...PRESERVED_KEYS, ...ADDED_KEYS, "replies"]);
    expect(Object.keys(ScenarioDef.shape).filter((key) => !covered.has(key))).toEqual([]);
  });
});

describe("which scenarios a run picks up", () => {
  it("wants a scenario with no context", () => {
    expect(needsUpgrade(stripped(exemplar()))).toBe(true);
  });

  it("leaves a scenario that already carries both alone, so a second run does no work twice", () => {
    expect(needsUpgrade(exemplar())).toBe(false);
  });
});

describe("--topic and --before narrow the pending set", () => {
  const base = stripped(exemplar());
  const trade = { ...base, id: "pending-trade", topics: ["trade" as const] };
  const labor = { ...base, id: "pending-labor", topics: ["labor" as const] };
  const untopicked = { ...base, id: "pending-untopicked" };
  const pool = [trade, labor, untopicked];

  it("--topic selects only scenarios carrying that tag, leaving an untagged one out", () => {
    expect(selectUpgradeCandidates(pool, "trade").pending.map((def) => def.id)).toEqual(["pending-trade"]);
  });

  it("with no --topic given, every pending scenario passes through", () => {
    expect(selectUpgradeCandidates(pool).pending).toHaveLength(3);
  });

  it("--before selects dated content whose staleAfter falls before the cutoff", () => {
    const early = { ...base, id: "dated-early", eraAssumption: "dated" as const, staleAfter: "2026-01-01" };
    const late = { ...base, id: "dated-late", eraAssumption: "dated" as const, staleAfter: "2027-06-01" };
    const selection = selectUpgradeCandidates([early, late], undefined, "2026-06-01");
    expect(selection.pending.map((def) => def.id)).toEqual(["dated-early"]);
  });

  it("--before excludes evergreen and undated content, and reports how many it left out rather than matching everything", () => {
    const dated = { ...base, id: "dated", eraAssumption: "dated" as const, staleAfter: "2026-01-01" };
    const selection = selectUpgradeCandidates([dated, untopicked], undefined, "2030-01-01");
    expect(selection.pending.map((def) => def.id)).toEqual(["dated"]);
    expect(selection.undated).toBe(1);
  });

  it("--topic and --before compose", () => {
    const datedTrade = { ...trade, eraAssumption: "dated" as const, staleAfter: "2026-01-01" };
    const selection = selectUpgradeCandidates([datedTrade, labor], "trade", "2030-01-01");
    expect(selection.pending.map((def) => def.id)).toEqual(["pending-trade"]);
  });
});

describe("the upgrade brief", () => {
  const brief = buildUpgradeBrief(stripped(exemplar()));

  it("teaches both fields it is asking for", () => {
    expect(brief).toContain("CONTEXT — what is on the table");
    expect(brief).toContain("IMPACT — what the decision did to people and to money");
  });

  it("shows the scenario to upgrade and the bar to upgrade it to", () => {
    expect(brief).toContain(exemplar().id);
    expect(brief).toContain("THE SCENARIO TO UPGRADE");
    expect(brief).toContain("THE BAR");
  });

  it("names the preservation rule, since the gate refusing it after the fact is a wasted call", () => {
    expect(brief).toContain("Do not fix a typo");
  });
});

describe("the upgrade gate", () => {
  const original = stripped(exemplar());
  const job = upgradeJob("upgrade-test", "session", [original]);
  const item = job.items[0];
  if (!item) throw new Error("upgradeJob produced no item");

  const gate = (output: unknown) => gateResult(job.kind, item, { itemId: item.id, status: "done", spendUsd: 0, output });

  it("passes a revision that only added the two fields", () => {
    expect(gate(exemplar()).status).toBe("done");
  });

  it("fails a revision that rewrote the scenario, which every other scenario rule would pass", () => {
    const rewritten = ScenarioDef.parse({
      ...exemplar(),
      opening: exemplar().opening.map((beat) => ({ ...beat, text: `${beat.text} The room went quiet at that.` })),
    });
    const result = gate(rewritten);
    expect(result.status).toBe("failed");
    expect(result.error).toContain('"opening" changed');
  });

  it("fails output that is not a scenario at all", () => {
    expect(gate({ id: "not-a-scenario" }).status).toBe("failed");
  });

  it("carries the original on the job item, since preservation cannot be checked without it", () => {
    const orphan = { ...item, payload: { prompt: item.payload.prompt } };
    const result = gateResult(job.kind, orphan, { itemId: item.id, status: "done", spendUsd: 0, output: exemplar() });
    expect(result.status).toBe("failed");
    expect(result.error).toContain("no parseable original");
  });
});

describe("the full repair gate", () => {
  const original = exemplar();
  const item = { id: "repair-test", payload: { original } };
  const gate = (output: unknown) => gateResult("scenario-repair", item, { itemId: item.id, status: "done", spendUsd: 0, output });

  it("allows a changed briefing under the same shipped identity and decision ids", () => {
    const revised = ScenarioDef.parse({
      ...original,
      opening: original.opening.map((beat, index) => index === 0
        ? { ...beat, text: `${beat.text} The briefing carries the latest count from the desk.` }
        : beat),
    });
    expect(preservationFindings(original, revised, "scenario-repair")).toEqual([]);
  });

  it("refuses a replacement that changes the shipped identity or drops a decision", () => {
    const renamed = ScenarioDef.parse({ ...original, id: "a-different-week" });
    expect(gate(renamed).error).toContain("shipped identity");
    const fewer = ScenarioDef.parse({ ...original, replies: original.replies.slice(1) });
    expect(gate(fewer).error).toContain("reply ids or order changed");
  });

  it("holds a full repair to the fresh-draft binding contract", () => {
    const unbound = ScenarioDef.parse({ ...original, conditions: [] });
    expect(gate(unbound).error).toContain("unbound-week");
  });
});

describe("writing an upgrade back over the corpus", () => {
  async function corpusWith(defs: readonly ScenarioDef[]) {
    const root = await mkdtemp(path.join(tmpdir(), "upgrade-corpus-"));
    await mkdir(root, { recursive: true });
    const paths = corpusPathsFor(root);
    await publishToCorpus(paths, defs);
    return paths;
  }

  it("replaces the body in place rather than leaving the corpus holding both", async () => {
    const paths = await corpusWith([stripped(exemplar())]);

    const outcome = await reviseInCorpus(paths, [exemplar()]);

    expect(outcome.revised).toEqual([exemplar().id]);
    expect(outcome.missing).toEqual([]);
    const bodies = await readCorpusBodies(paths);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]?.context).toBeDefined();
  });

  it("rebuilds the derived sidecars, since the pass exists to add prose they are computed from", async () => {
    const paths = await corpusWith([stripped(exemplar())]);
    const before = await readFile(paths.overlapPath, "utf8");

    await reviseInCorpus(paths, [exemplar()]);

    expect(await readFile(paths.overlapPath, "utf8")).not.toEqual(before);
  });

  it("reports an id the corpus does not hold rather than appending it", async () => {
    const paths = await corpusWith([stripped(exemplar())]);
    const stranger = ScenarioDef.parse({ ...exemplar(), id: "a-scenario-this-corpus-never-shipped" });

    const outcome = await reviseInCorpus(paths, [stranger]);

    expect(outcome.revised).toEqual([]);
    expect(outcome.missing).toEqual(["a-scenario-this-corpus-never-shipped"]);
    expect(await readCorpusBodies(paths)).toHaveLength(1);
  });

  it("refuses a revision that would belong in another shard", async () => {
    const paths = await corpusWith([stripped(exemplar())]);
    const reclassed = ScenarioDef.parse({ ...exemplar(), class: exemplar().class === "scandal" ? "justice" : "scandal" });

    await expect(reviseInCorpus(paths, [reclassed])).rejects.toThrow(/may not change class/);
  });

  it("leaves the shard untouched when nothing in it was revised", async () => {
    const paths = await corpusWith([stripped(exemplar())]);
    const shard = path.join(paths.shardsDir, (await readdir(paths.shardsDir))[0] ?? "");
    const before = await readFile(shard, "utf8");

    await reviseInCorpus(paths, []);

    expect(await readFile(shard, "utf8")).toEqual(before);
  });
});

describe("the job an upgrade run works from", () => {
  it("is one item per scenario, so a dropped one is named rather than silently missing", () => {
    const job = upgradeJob("upgrade-test", "session", [stripped(exemplar()), stripped(exemplar())]);
    expect(job.items).toHaveLength(2);
    expect(job.kind).toBe("scenario-upgrade");
  });

  it("gives every item the original it will be checked against", () => {
    const job = upgradeJob("upgrade-test", "session", [stripped(exemplar())]);
    expect(ScenarioDef.safeParse(job.items[0]?.payload.original).success).toBe(true);
  });
});

describe("the rejoin and arc revisions", () => {
  // An exemplar with an order in it, found rather than named, for the same
  // reason `pricedExemplar` is.
  function orderExemplar(): ScenarioDef {
    const found = referenceExemplars().find((def) => def.replies.some((reply) => reply.commitment.kind !== "position"));
    if (!found) throw new Error("no reference exemplar carries an instrument or join reply — the rejoin rules have no fixture");
    return found;
  }
  const line = { speaker: { kind: "narrator" as const }, text: "The order is signed and the first of it is already moving where everyone can see it." };

  it("lets a rejoin add the room's answer to an order and nothing else", () => {
    const original = orderExemplar();
    const revised = {
      ...original,
      replies: original.replies.map((reply) =>
        reply.commitment.kind === "position" ? reply : { ...reply, commitment: { ...reply.commitment, rejoinder: line } },
      ),
    } as ScenarioDef;
    expect(preservationFindings(original, revised, "scenario-rejoin")).toEqual([]);
    const retouched = { ...revised, subject: `${revised.subject}, again` } as ScenarioDef;
    expect(preservationFindings(original, retouched, "scenario-rejoin")).toContain('"subject" changed — a scenario-rejoin may not move it');
  });

  it("refuses a rejoin that rewrites a position's shipped rejoinder", () => {
    const original = exemplar();
    const revised = {
      ...original,
      replies: original.replies.map((reply) =>
        reply.commitment.kind === "position" ? { ...reply, commitment: { ...reply.commitment, rejoinder: line } } : reply,
      ),
    } as ScenarioDef;
    expect(preservationFindings(original, revised, "scenario-rejoin").length).toBeGreaterThan(0);
  });

  it("lets an arc revision move the family, the endings and the flags, and refuses prose", () => {
    const original = exemplar();
    const revised = {
      ...original,
      family: { id: "arc-test", role: "opener" as const },
      replies: original.replies.map((reply) => ({ ...reply, sets: ["test-arc-flag"] })),
    } as ScenarioDef;
    expect(preservationFindings(original, revised, "scenario-arc")).toEqual([]);
    const reworded = { ...revised, replies: revised.replies.map((reply, index) => (index === 0 ? { ...reply, text: `${reply.text} Now.` } : reply)) } as ScenarioDef;
    expect(preservationFindings(original, reworded, "scenario-arc").length).toBeGreaterThan(0);
  });

  it("leaves standing debt to the gate: inherited time findings and, for arcs, the family pairing", () => {
    expect(courtesyWaived("scenario-rejoin", "commit-time-flash-forward")).toBe(true);
    expect(courtesyWaived("scenario-retime", "commit-time-flash-forward")).toBe(false);
    expect(courtesyWaived("scenario-arc", "family-without-close")).toBe(true);
    expect(courtesyWaived("scenario-regate", "family-without-close")).toBe(false);
  });
});
