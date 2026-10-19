import { arcDeletionImpact, arcLedger, arcUpstream, deedsRemembered, formatDeeds, type ArcUpstreamChain } from "@admin/content";
import { corpusPathsFor, readCorpusBodies, readCorpusBodiesReporting, reviseInCorpus } from "./shard-store.js";
import { readScenarioDir } from "../scenarios/validate.js";

/** Pull "--name value" out of the argument list in place, so what remains is positional. */
function takeFlag(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const value = args[at + 1];
  if (value === undefined) throw new Error(`${name} needs a value`);
  args.splice(at, 2);
  return value;
}

/** What `--from` prints: each generation of setters, oldest cause last, and where the chain runs dry. */
function printArcUpstream(chain: ArcUpstreamChain, asJson: boolean): number {
  if (asJson) {
    console.log(JSON.stringify(chain, null, 2));
    return 0;
  }
  if (chain.generations.length === 0) {
    console.log(`upstream of ${chain.from}: nothing in the pool sets it — root flag(s): ${chain.roots.join(", ") || "none"}`);
    return 0;
  }
  console.log(`upstream of ${chain.from}: ${chain.generations.length} generation(s)`);
  chain.generations.forEach((generation, index) => {
    console.log(`\ngeneration ${index + 1}:`);
    for (const node of generation) console.log(`  ${node.scenario} [${node.class}] — ${node.reply} sets ${node.flag}`);
  });
  if (chain.roots.length > 0) console.log(`\nroot flag(s) nothing in the pool sets: ${chain.roots.join(", ")}`);
  return 0;
}

/**
 * What `--check-delete` prints: whether the retire verb can remove this
 * scenario without silencing a reader still gated on it. Exits nonzero on an
 * unsafe deletion so the future retire verb can call it as a gate rather than
 * parse its own text output.
 */
function printArcDeletionImpact(impact: ReturnType<typeof arcDeletionImpact>, asJson: boolean): number {
  if (asJson) {
    console.log(JSON.stringify(impact, null, 2));
    return impact.safe ? 0 : 1;
  }
  if (impact.safe) {
    console.log(`${impact.scenario}: safe to retire — nothing else in the pool reads a flag it sets`);
    return 0;
  }
  console.log(`${impact.scenario}: UNSAFE to retire — ${impact.orphans.length} scenario(s) read a flag only it sets:`);
  for (const reader of impact.orphans) console.log(`  ${reader}`);
  return 1;
}

/**
 * `studio corpus retire <id>`: mark a scenario retired rather than delete it.
 *
 * Retirement is the same gate `--check-delete` runs, because the risk is the
 * same one — a flag only this scenario sets, still gated on somewhere else in
 * the pool. Where the future delete verb would remove the file, this flips one
 * field and rewrites the shard line through `reviseInCorpus`, the same
 * in-place rewrite the upgrade pass uses: the body, its flags, and the
 * aftermath a reader is written against all stay on disk. Excluding a retired
 * scenario from the draw is `memoryPool` in `packages/content`, one field this
 * command sets and the pool already knows how to read.
 */
export async function cmdRetire(rest: readonly string[], corpusRoot: string): Promise<number> {
  const args = [...rest];
  const asJson = args.includes("--json");
  const [id] = args.filter((arg) => arg !== "--json");
  if (!id) throw new Error("usage: studio corpus retire <id> [--json]");

  const paths = corpusPathsFor(corpusRoot);
  const corpus = await readCorpusBodies(paths);
  const target = corpus.find((def) => def.id === id);
  if (!target) {
    if (asJson) console.log(JSON.stringify({ scenario: id, retired: false, reason: "not-found" }, null, 2));
    else console.log(`${id}: not in the corpus — nothing to retire`);
    return 1;
  }
  if (target.retired) {
    if (asJson) console.log(JSON.stringify({ scenario: id, retired: true, alreadyRetired: true }, null, 2));
    else console.log(`${id}: already retired`);
    return 0;
  }

  const impact = arcDeletionImpact(corpus, id);
  if (!impact.safe) {
    if (asJson) console.log(JSON.stringify({ ...impact, retired: false }, null, 2));
    else {
      console.log(`${id}: UNSAFE to retire — ${impact.orphans.length} scenario(s) read a flag only it sets:`);
      for (const reader of impact.orphans) console.log(`  ${reader}`);
    }
    return 1;
  }

  await reviseInCorpus(paths, [{ ...target, retired: true }]);
  if (asJson) console.log(JSON.stringify({ scenario: id, retired: true }, null, 2));
  else console.log(`${id}: retired — pulled from the drawable pool; body and flags stay resolvable for readers already in flight`);
  return 0;
}

/**
 * The arc ledger: which doors a pool opens and never comes back down.
 *
 * `arc-branch-unread` already warns about a lopsided arc one scenario at a
 * time, and that is the right shape for a gate — but it is the wrong shape for
 * the work, which is a worklist of dead branches sorted by how much of a week
 * is going unanswered. It also cannot say how large the silent majority is,
 * because an arc no branch of which is answered is invisible to it by design.
 * Both numbers come off the same `arcLedger`, so this command and the warning
 * can never disagree about the same pool.
 *
 * `--dir` measures a pending batch as part of the corpus it is joining, which
 * is the only honest way to read a batch's arcs: a reader answering a shipped
 * setter is the case a batch-against-itself count cannot see.
 *
 * `--from` and `--check-delete` are the reverse of the downstream ledger
 * above and read the same pool, off the same setter/reader relationship —
 * they trace a chain backward instead of forward, so a continuity editor
 * never has to grep flag names across the corpus by hand.
 */
export async function cmdArcs(rest: readonly string[], corpusRoot: string): Promise<number> {
  const args = [...rest];
  const dir = takeFlag(args, "--dir");
  const from = takeFlag(args, "--from");
  const checkDelete = takeFlag(args, "--check-delete");
  const asJson = args.includes("--json");
  const all = args.includes("--all");
  // A body a newer rule refuses is named and left out rather than refusing the
  // whole ledger: the ledger is how the room measures, and a measurement that
  // cannot run is worse than one that says what it could not read.
  const read = await readCorpusBodiesReporting(corpusPathsFor(corpusRoot));
  for (const stale of read.unparseable) console.error(`ledger skips ${stale.id}: ${stale.reason}`);
  const corpus = read.bodies;
  const batch = dir ? await readScenarioDir(dir) : { defs: [], unreadable: [] };
  for (const file of batch.unreadable) console.error(`skipped unreadable document: ${file}`);
  const defs = [...corpus, ...batch.defs];

  if (from) return printArcUpstream(arcUpstream(defs, from), asJson);
  if (checkDelete) return printArcDeletionImpact(arcDeletionImpact(defs, checkDelete), asJson);

  const ledger = arcLedger(defs);
  const deeds = deedsRemembered(defs);
  // Worst first: an arc with three dead branches is three players' weeks, and
  // ties fall back to the id so two runs over the same pool print the same list.
  const lopsided = [...ledger.lopsided].sort((a, b) => b.dead.length - a.dead.length || (a.scenario < b.scenario ? -1 : 1));

  if (asJson) {
    console.log(JSON.stringify({ lopsided, silent: all ? ledger.silent : undefined, deeds }, null, 2));
    return 0;
  }

  const scope = dir ? `${corpus.length} shipped + ${batch.defs.length} from ${dir}` : `${corpus.length} shipped`;
  console.log(
    `arcs across ${defs.length} scenario(s) (${scope}): ${ledger.lopsided.length} lopsided carrying ` +
      `${ledger.deadBranches} dead branch(es), ${ledger.silent.length} fully silent, ${ledger.whole.length} whole`,
  );
  console.log(formatDeeds(deeds));
  for (const arc of lopsided) {
    console.log(`\n${arc.scenario} [${arc.class}] — ${arc.subject}`);
    console.log(`  answered: ${arc.answered.map((branch) => `${branch.reply} (${branch.flags.join(", ")})`).join(", ")}`);
    for (const branch of arc.dead) console.log(`  DEAD:     ${branch.reply} (${branch.flags.join(", ")})`);
  }
  // Named rather than listed: the silent arcs are a volume problem the corpus
  // target subsumes, and printing several hundred of them here would bury the
  // list that is actually actionable.
  if (all) for (const arc of ledger.silent) console.log(`\nsilent: ${arc.scenario} [${arc.class}] — ${arc.dead.length} branch(es), none read`);
  return 0;
}
