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
export declare function cmdRetire(rest: readonly string[], corpusRoot: string): Promise<number>;
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
export declare function cmdArcs(rest: readonly string[], corpusRoot: string): Promise<number>;
