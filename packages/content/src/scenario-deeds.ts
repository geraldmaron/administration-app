import { PRESS_HOSTILE_FLAG, SCANDAL_LIVE_FLAG, UNBOUND_DEED_PREFIXES } from "@admin/engine";
import { deskClosedFlag } from "./desk-window.js";
import { scenarioFiredFlag, type ScenarioDef, type ScenarioReply } from "./scenario.js";

// Two flags are stamped on every commit rather than authored, so a condition
// reading one is satisfiable without any reply writing it. Both prefixes are
// derived from the functions that mint them, so renaming either moves every
// exemption with it instead of quietly stranding a condition.
export const DESK_FLAG_PREFIX = deskClosedFlag(0).slice(0, -1);

// The unbound deed prefixes, colon-terminated so a name like `deed:eco` can
// never match a family called `economic` by accident. Sourced from the
// engine rather than restated, same as `DESK_FLAG_PREFIX` above.
const UNBOUND_DEED_PREFIX_MATCH: readonly string[] = UNBOUND_DEED_PREFIXES.map((prefix) => `${prefix}:`);

/**
 * Flags the engine sets and clears from the state of the board rather than
 * stamping for a deed. A hostile press is recomputed every week, so a scenario
 * may wait on it, but no reply ever writes it and it carries no age.
 */
export const ENGINE_STATE_FLAGS: ReadonlySet<string> = new Set([PRESS_HOSTILE_FLAG, SCANDAL_LIVE_FLAG]);

/**
 * Whether a flag is stamped by the engine rather than authored. Lives here, with
 * the metrics that count what content remembers of content: a scenario gating on
 * `desk:closed:3`, on another scenario's fired marker, or on a deed the engine
 * resolved is reading bookkeeping, not somebody's authored deed, and counting it
 * would inflate every ratio below with flags no writer ever chose — a deed flag
 * in particular can never appear in a `sets` array at all (`WritableFlag`
 * refuses it), so treating it as unwritten-by-content here would flag every
 * legitimate deed gate as unsatisfiable. The audit's flag rules take the same
 * view from here, so the line between an authored deed and engine bookkeeping is
 * drawn once.
 */
export function engineOwnedFlag(flag: string, ids: ReadonlySet<string>): boolean {
  if (flag.startsWith(DESK_FLAG_PREFIX)) return true;
  if (ENGINE_STATE_FLAGS.has(flag)) return true;
  if (UNBOUND_DEED_PREFIX_MATCH.some((prefix) => flag.startsWith(prefix))) return true;
  return [...ids].some((id) => flag === scenarioFiredFlag(id));
}

// The pool-scale question no per-scenario rule can answer: of everything this
// content remembers, how much of it is ever read back? Every audit rule around
// it is local — one scenario waiting on a flag nothing writes, one batch that
// reads nothing at all — and a corpus can pass all of them while almost every
// deed it stamps is remembered by nothing.
//
// Reported as a stat line rather than enforced as a finding. The ratio a
// healthy pool holds is not known yet: the corpus is young, and a threshold
// fitted against it would measure the sample rather than the content. Print
// the number, let it move, enforce it once there is a pool worth fitting to.

export type DeedsRemembered = {
  /** Distinct authored flags the replies stamp. */
  readonly set: readonly string[];
  /** Distinct authored flags the conditions gate on. */
  readonly read: readonly string[];
  /**
   * The flags read that the document reading them does not itself stamp: a
   * deed written somewhere else and answered here, which is the number that
   * says a batch joined the corpus rather than landing beside it. Asked of a
   * whole corpus at once there is no "elsewhere" left, and what remains is the
   * orphan reads `flag-condition-never-set` reports as errors.
   */
  readonly answered: readonly string[];
  /** Flags read over flags set, zero when nothing is set. */
  readonly ratio: number;
};

const sorted = (flags: Iterable<string>): readonly string[] => [...new Set(flags)].sort();

const withRatio = (set: readonly string[], read: readonly string[], answered: readonly string[]): DeedsRemembered => ({
  set,
  read,
  answered,
  ratio: set.length === 0 ? 0 : read.length / set.length,
});

/**
 * What a batch remembers. Engine-owned flags are excluded from both halves:
 * they are bookkeeping every scenario could read, and counting them would make
 * a pool that remembers nothing look like one that remembers plenty.
 */
export function deedsRemembered(defs: readonly ScenarioDef[]): DeedsRemembered {
  const ids = new Set(defs.map((def) => def.id));
  const set = sorted(defs.flatMap((def) => def.replies.flatMap((reply) => reply.sets ?? [])));
  const read = sorted(
    defs.flatMap((def) =>
      def.conditions.flatMap((condition) =>
        condition.kind === "flag" && !engineOwnedFlag(condition.flag, ids) ? [condition.flag] : [],
      ),
    ),
  );
  const stamped = new Set(set);
  return withRatio(set, read, read.filter((flag) => !stamped.has(flag)));
}

/**
 * The corpus-level view: the same metric over several batches, unioned rather
 * than averaged. A ratio per file says nothing on its own — one document
 * reading another document's flag is exactly the case a per-file number cannot
 * see, and `answered` stays each part's own answer so a flag one file stamps
 * and another reads still counts as a deed answered from outside.
 */
export function mergeDeeds(parts: readonly DeedsRemembered[]): DeedsRemembered {
  return withRatio(
    sorted(parts.flatMap((part) => part.set)),
    sorted(parts.flatMap((part) => part.read)),
    sorted(parts.flatMap((part) => part.answered)),
  );
}

/**
 * One door out of a week: a reply that stamps something, and what it left the
 * player holding.
 *
 * `remembered` and `rejoinder` ride along because they are what a reader is
 * actually written against — the sentence the campaign keeps, and the beat the
 * room played after the player committed. A writer answering a dead branch from
 * the flag id alone cannot tell whether they are extending that aftermath or
 * quietly contradicting it.
 */
export type ArcBranch = {
  readonly reply: string;
  readonly tone: ScenarioReply["tone"];
  readonly text: string;
  readonly flags: readonly string[];
  readonly remembered?: string;
  readonly rejoinder?: string;
};

/** A setter and its doors, split by whether anything in the pool answers each one. */
export type Arc = {
  readonly scenario: string;
  readonly class: ScenarioDef["class"];
  readonly subject: string;
  readonly answered: readonly ArcBranch[];
  readonly dead: readonly ArcBranch[];
};

/**
 * Every arc in a pool, sorted into the three states a chain can be in.
 *
 * `arc-branch-unread` reports only the middle one, and for a good reason — a
 * setter nothing has answered yet is not a defect, because packs compose. But
 * that makes the warning count a poor measure of the flag economy: closing a
 * promise *raises* it, since answering one branch moves an arc out of `silent`
 * and into `lopsided` where the rule can finally see it. The ledger reports all
 * three so the shape of the pool is legible without reading the rise as damage.
 */
export type ArcLedger = {
  /** At least one branch answered and at least one dead — what a player experiences as unfairness. */
  readonly lopsided: readonly Arc[];
  /** No branch answered at all. A volume problem, invisible to the audit by design. */
  readonly silent: readonly Arc[];
  /** Every branch answered. */
  readonly whole: readonly Arc[];
  /** Dead branches across the lopsided arcs — the reader worklist's length. */
  readonly deadBranches: number;
};

const branchAftermath = (reply: ScenarioReply): Pick<ArcBranch, "remembered" | "rejoinder"> =>
  reply.commitment.kind === "position"
    ? { remembered: reply.commitment.remembered, rejoinder: reply.commitment.rejoinder.text }
    : {};

/**
 * The flags a pool gates on, which is what makes a branch answered.
 *
 * `is: false` is not a read. A scenario that only stands where a deed was *not*
 * done never tells the player who did it that it mattered, and the player who
 * took that door is the one this whole measure is about.
 */
function flagsRead(defs: readonly ScenarioDef[]): ReadonlySet<string> {
  return new Set(
    defs.flatMap((def) =>
      def.conditions.flatMap((condition) => (condition.kind === "flag" && condition.is !== false ? [condition.flag] : [])),
    ),
  );
}

/**
 * An arc is a scenario with at least two branches: one door is a decision the
 * week ends on, and there is no unfairness in a week that ends the same way
 * however it is answered.
 *
 * `corpusReads` is the pool a batch is joining. Omitted, an arc is judged
 * against the documents in hand, which is right for a standalone directory and
 * wrong for anything measured against the shipped corpus.
 */
export function arcLedger(defs: readonly ScenarioDef[], corpusReads: ReadonlySet<string> = new Set()): ArcLedger {
  const ids = new Set(defs.map((def) => def.id));
  const read = flagsRead(defs);
  const isRead = (flag: string) => read.has(flag) || corpusReads.has(flag);
  const lopsided: Arc[] = [];
  const silent: Arc[] = [];
  const whole: Arc[] = [];

  for (const def of defs) {
    const branches = def.replies
      .map((reply) => ({
        ...branchAftermath(reply),
        reply: reply.id,
        tone: reply.tone,
        text: reply.text,
        // A reply stamping several flags is answered if any one of them is
        // read: the deed came back, whatever it was filed under.
        flags: (reply.sets ?? []).filter((flag) => !engineOwnedFlag(flag, ids)),
      }))
      .filter((branch) => branch.flags.length > 0);
    if (branches.length < 2) continue;
    const answered = branches.filter((branch) => branch.flags.some(isRead));
    const dead = branches.filter((branch) => !branch.flags.some(isRead));
    const arc: Arc = { scenario: def.id, class: def.class, subject: def.subject, answered, dead };
    if (answered.length === 0) silent.push(arc);
    else if (dead.length === 0) whole.push(arc);
    else lopsided.push(arc);
  }

  return { lopsided, silent, whole, deadBranches: lopsided.reduce((total, arc) => total + arc.dead.length, 0) };
}

/** The flags a single scenario's conditions read — the same rule `flagsRead` applies pool-wide, one document at a time. */
function readsOf(def: ScenarioDef, ids: ReadonlySet<string>): readonly string[] {
  return def.conditions
    .filter((condition) => condition.kind === "flag" && condition.is !== false)
    .map((condition) => (condition as { flag: string }).flag)
    .filter((flag) => !engineOwnedFlag(flag, ids));
}

/** One hop of an upstream chain: the reply that set a flag a later scenario reads. */
export type ArcUpstreamNode = {
  readonly scenario: string;
  readonly class: ScenarioDef["class"];
  readonly subject: string;
  readonly reply: string;
  readonly flag: string;
};

/**
 * Every generation upstream of a scenario or flag, oldest cause last.
 *
 * `--dir`'s downstream ledger asks "what does this leave dead"; retiring a
 * scenario asks the opposite question first — "what made this reachable at
 * all", so a continuity editor tracing a reader back to its cause does not
 * have to eyeball flag names across the whole corpus by hand. `generations[0]`
 * is the immediate setters; `generations[1]` is what set *those* setters'
 * conditions, and so on, so a chain several batches deep still prints in one
 * call instead of one manual lookup per hop.
 *
 * `roots` are flags nothing in the pool sets — either engine bookkeeping
 * already filtered out of the chain, or a flag this pool never authored,
 * which is the same "orphan read" `flag-condition-never-set` already treats
 * as an error, surfaced here as where the chain runs out rather than a fault.
 */
export type ArcUpstreamChain = {
  readonly from: string;
  readonly generations: readonly (readonly ArcUpstreamNode[])[];
  readonly roots: readonly string[];
};

/**
 * Walks a scenario or flag back to its setters, one generation at a time.
 *
 * A cycle (two scenarios each reading a flag the other's reply sets) is
 * possible in principle and would otherwise loop forever, so a scenario is
 * only ever added to the frontier once — its second appearance is where the
 * chain stops rather than where it repeats itself.
 */
export function arcUpstream(defs: readonly ScenarioDef[], from: string): ArcUpstreamChain {
  const ids = new Set(defs.map((def) => def.id));
  const byId = new Map(defs.map((def) => [def.id, def]));
  const settersByFlag = new Map<string, ArcUpstreamNode[]>();
  for (const def of defs) {
    for (const reply of def.replies) {
      for (const flag of reply.sets ?? []) {
        if (engineOwnedFlag(flag, ids)) continue;
        const nodes = settersByFlag.get(flag) ?? [];
        settersByFlag.set(flag, [...nodes, { scenario: def.id, class: def.class, subject: def.subject, reply: reply.id, flag }]);
      }
    }
  }

  const startFlags = byId.has(from) ? readsOf(byId.get(from)!, ids) : [from];
  const visited = new Set<string>(byId.has(from) ? [from] : []);
  const generations: ArcUpstreamNode[][] = [];
  const roots = new Set<string>();
  let frontier = startFlags;

  while (frontier.length > 0) {
    for (const flag of frontier) if (!settersByFlag.has(flag)) roots.add(flag);
    const nodes = frontier.flatMap((flag) => settersByFlag.get(flag) ?? []);
    const fresh = nodes.filter((node) => !visited.has(node.scenario));
    if (fresh.length === 0) break;
    for (const node of fresh) visited.add(node.scenario);
    generations.push(fresh);
    frontier = [...new Set(fresh.flatMap((node) => readsOf(byId.get(node.scenario)!, ids)))];
  }

  return { from, generations, roots: [...roots].sort() };
}

/**
 * The scenario ids left reading a flag nobody else in the pool would still
 * set once the target is gone — the true before/after, not just "does
 * anything currently read this". A flag two setters both stamp survives the
 * target's removal and orphans nobody; only a flag the target stamps alone
 * does.
 */
function readersOf(defs: readonly ScenarioDef[], target: ScenarioDef, ids: ReadonlySet<string>): readonly string[] {
  const stamped = new Set(target.replies.flatMap((reply) => (reply.sets ?? []).filter((flag) => !engineOwnedFlag(flag, ids))));
  if (stamped.size === 0) return [];
  const remaining = defs.filter((def) => def.id !== target.id);
  const stillSet = new Set(remaining.flatMap((def) => def.replies.flatMap((reply) => (reply.sets ?? []).filter((flag) => !engineOwnedFlag(flag, ids)))));
  const orphanedFlags = new Set([...stamped].filter((flag) => !stillSet.has(flag)));
  if (orphanedFlags.size === 0) return [];
  // A retired reader is out of the drawable pool, so it is no longer a live
  // reader the retire would strand; counting it made an arc impossible to retire
  // once its close had been.
  return remaining.filter((def) => def.retired !== true && readsOf(def, ids).some((flag) => orphanedFlags.has(flag))).map((def) => def.id);
}

/**
 * Whether removing a scenario from the pool orphans a live reader.
 *
 * The retire verb deletes a document; nothing else in the pipeline notices
 * that a flag it alone stamped is still gated on somewhere downstream, and
 * `flag-condition-never-set` only runs against the pool that is left *after*
 * the deletion, by which time the file is already gone. This is the
 * before/after in one call: run it before the delete, not after.
 */
export type ArcDeletionImpact = {
  readonly scenario: string;
  readonly safe: boolean;
  readonly orphans: readonly string[];
};

export function arcDeletionImpact(defs: readonly ScenarioDef[], scenario: string): ArcDeletionImpact {
  const target = defs.find((def) => def.id === scenario);
  if (!target) return { scenario, safe: true, orphans: [] };
  const ids = new Set(defs.map((def) => def.id));
  const orphans = readersOf(defs, target, ids);
  return { scenario, safe: orphans.length === 0, orphans };
}

/** The stat line a validate run prints. One line, no verdict — there is no threshold yet. */
export function formatDeeds(remembered: DeedsRemembered): string {
  const percent = Math.round(remembered.ratio * 100);
  return (
    `deeds remembered: ${remembered.read.length} distinct flag(s) read against ${remembered.set.length} set (${percent}%), ` +
    `${remembered.answered.length} of them written outside the document that reads them`
  );
}
