import { PRESS_HOSTILE_FLAG, SCANDAL_LIVE_FLAG, UNBOUND_DEED_PREFIXES } from "@admin/engine";
import { deskClosedFlag } from "./desk-window.js";
import { scenarioFiredFlag } from "./scenario.js";
// Two flags are stamped on every commit rather than authored, so a condition
// reading one is satisfiable without any reply writing it. Both prefixes are
// derived from the functions that mint them, so renaming either moves every
// exemption with it instead of quietly stranding a condition.
export const DESK_FLAG_PREFIX = deskClosedFlag(0).slice(0, -1);
// The unbound deed prefixes, colon-terminated so a name like `deed:eco` can
// never match a family called `economic` by accident. Sourced from the
// engine rather than restated, same as `DESK_FLAG_PREFIX` above.
const UNBOUND_DEED_PREFIX_MATCH = UNBOUND_DEED_PREFIXES.map((prefix) => `${prefix}:`);
/**
 * Flags the engine sets and clears from the state of the board rather than
 * stamping for a deed. A hostile press is recomputed every week, so a scenario
 * may wait on it, but no reply ever writes it and it carries no age.
 */
export const ENGINE_STATE_FLAGS = new Set([PRESS_HOSTILE_FLAG, SCANDAL_LIVE_FLAG]);
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
export function engineOwnedFlag(flag, ids) {
    if (flag.startsWith(DESK_FLAG_PREFIX))
        return true;
    if (ENGINE_STATE_FLAGS.has(flag))
        return true;
    if (UNBOUND_DEED_PREFIX_MATCH.some((prefix) => flag.startsWith(prefix)))
        return true;
    return [...ids].some((id) => flag === scenarioFiredFlag(id));
}
const sorted = (flags) => [...new Set(flags)].sort();
const withRatio = (set, read, answered) => ({
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
export function deedsRemembered(defs) {
    const ids = new Set(defs.map((def) => def.id));
    const set = sorted(defs.flatMap((def) => def.replies.flatMap((reply) => reply.sets ?? [])));
    const read = sorted(defs.flatMap((def) => def.conditions.flatMap((condition) => condition.kind === "flag" && !engineOwnedFlag(condition.flag, ids) ? [condition.flag] : [])));
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
export function mergeDeeds(parts) {
    return withRatio(sorted(parts.flatMap((part) => part.set)), sorted(parts.flatMap((part) => part.read)), sorted(parts.flatMap((part) => part.answered)));
}
const branchAftermath = (reply) => reply.commitment.kind === "position"
    ? { remembered: reply.commitment.remembered, rejoinder: reply.commitment.rejoinder.text }
    : {};
/**
 * The flags a pool gates on, which is what makes a branch answered.
 *
 * `is: false` is not a read. A scenario that only stands where a deed was *not*
 * done never tells the player who did it that it mattered, and the player who
 * took that door is the one this whole measure is about.
 */
function flagsRead(defs) {
    return new Set(defs.flatMap((def) => def.conditions.flatMap((condition) => (condition.kind === "flag" && condition.is !== false ? [condition.flag] : []))));
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
export function arcLedger(defs, corpusReads = new Set()) {
    const ids = new Set(defs.map((def) => def.id));
    const read = flagsRead(defs);
    const isRead = (flag) => read.has(flag) || corpusReads.has(flag);
    const lopsided = [];
    const silent = [];
    const whole = [];
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
        if (branches.length < 2)
            continue;
        const answered = branches.filter((branch) => branch.flags.some(isRead));
        const dead = branches.filter((branch) => !branch.flags.some(isRead));
        const arc = { scenario: def.id, class: def.class, subject: def.subject, answered, dead };
        if (answered.length === 0)
            silent.push(arc);
        else if (dead.length === 0)
            whole.push(arc);
        else
            lopsided.push(arc);
    }
    return { lopsided, silent, whole, deadBranches: lopsided.reduce((total, arc) => total + arc.dead.length, 0) };
}
/** The flags a single scenario's conditions read — the same rule `flagsRead` applies pool-wide, one document at a time. */
function readsOf(def, ids) {
    return def.conditions
        .filter((condition) => condition.kind === "flag" && condition.is !== false)
        .map((condition) => condition.flag)
        .filter((flag) => !engineOwnedFlag(flag, ids));
}
/**
 * Walks a scenario or flag back to its setters, one generation at a time.
 *
 * A cycle (two scenarios each reading a flag the other's reply sets) is
 * possible in principle and would otherwise loop forever, so a scenario is
 * only ever added to the frontier once — its second appearance is where the
 * chain stops rather than where it repeats itself.
 */
export function arcUpstream(defs, from) {
    const ids = new Set(defs.map((def) => def.id));
    const byId = new Map(defs.map((def) => [def.id, def]));
    const settersByFlag = new Map();
    for (const def of defs) {
        for (const reply of def.replies) {
            for (const flag of reply.sets ?? []) {
                if (engineOwnedFlag(flag, ids))
                    continue;
                const nodes = settersByFlag.get(flag) ?? [];
                settersByFlag.set(flag, [...nodes, { scenario: def.id, class: def.class, subject: def.subject, reply: reply.id, flag }]);
            }
        }
    }
    const startFlags = byId.has(from) ? readsOf(byId.get(from), ids) : [from];
    const visited = new Set(byId.has(from) ? [from] : []);
    const generations = [];
    const roots = new Set();
    let frontier = startFlags;
    while (frontier.length > 0) {
        for (const flag of frontier)
            if (!settersByFlag.has(flag))
                roots.add(flag);
        const nodes = frontier.flatMap((flag) => settersByFlag.get(flag) ?? []);
        const fresh = nodes.filter((node) => !visited.has(node.scenario));
        if (fresh.length === 0)
            break;
        for (const node of fresh)
            visited.add(node.scenario);
        generations.push(fresh);
        frontier = [...new Set(fresh.flatMap((node) => readsOf(byId.get(node.scenario), ids)))];
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
function readersOf(defs, target, ids) {
    const stamped = new Set(target.replies.flatMap((reply) => (reply.sets ?? []).filter((flag) => !engineOwnedFlag(flag, ids))));
    if (stamped.size === 0)
        return [];
    const remaining = defs.filter((def) => def.id !== target.id);
    const stillSet = new Set(remaining.flatMap((def) => def.replies.flatMap((reply) => (reply.sets ?? []).filter((flag) => !engineOwnedFlag(flag, ids)))));
    const orphanedFlags = new Set([...stamped].filter((flag) => !stillSet.has(flag)));
    if (orphanedFlags.size === 0)
        return [];
    // A retired reader is out of the drawable pool, so it is no longer a live
    // reader the retire would strand; counting it made an arc impossible to retire
    // once its close had been.
    return remaining.filter((def) => def.retired !== true && readsOf(def, ids).some((flag) => orphanedFlags.has(flag))).map((def) => def.id);
}
export function arcDeletionImpact(defs, scenario) {
    const target = defs.find((def) => def.id === scenario);
    if (!target)
        return { scenario, safe: true, orphans: [] };
    const ids = new Set(defs.map((def) => def.id));
    const orphans = readersOf(defs, target, ids);
    return { scenario, safe: orphans.length === 0, orphans };
}
/** The stat line a validate run prints. One line, no verdict — there is no threshold yet. */
export function formatDeeds(remembered) {
    const percent = Math.round(remembered.ratio * 100);
    return (`deeds remembered: ${remembered.read.length} distinct flag(s) read against ${remembered.set.length} set (${percent}%), ` +
        `${remembered.answered.length} of them written outside the document that reads them`);
}
