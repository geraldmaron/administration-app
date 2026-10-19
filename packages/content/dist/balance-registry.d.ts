/**
 * The layer a rebalance actually happens at, coarsest first. This is the
 * taxonomy the methodology is built on: a designer decides which layer a
 * problem lives at BEFORE touching a number, because the same symptom
 * ("the game feels too easy") has a different fix at each one, and the
 * `balance.test.ts` regression this registry was built to prevent is exactly
 * what happens when a fix at one layer is shipped without checking what it
 * does to the others.
 *
 * - `global`     — one number that reweights the whole score (OPINION_WEIGHTS,
 *                   PRESSURE_WEIGHTS). Touching this moves every campaign.
 * - `mechanic`    — one system's own internal constant (macro drift's
 *                   REVERSION_RATE, a condition's STANDING_PERSIST_SCALE, the
 *                   director's CLASS_COOLDOWN). Touching this moves one
 *                   system's behavior, felt everywhere that system fires.
 * - `catalogue`   — a per-row figure inside an authored table (a single
 *                   POLICY_STANCES entry's perTurn magnitude, a single
 *                   condition's IMPACTS row). Touching this moves one entry.
 * - `derivation`  — not itself a constant, but the formula that turns a raw
 *                   figure into a score (treasuryHealth's reference point).
 *                   Recorded because it behaves like a mechanic-layer knob
 *                   even though it is a function, not a number.
 */
export type BalanceLayer = "global" | "mechanic" | "catalogue" | "derivation";
export type BalanceEntry = {
    readonly id: string;
    readonly layer: BalanceLayer;
    /** What moves when this changes — the felt consequence, not the mechanism. */
    readonly governs: string;
    readonly file: string;
    readonly value: unknown;
};
/**
 * The methodology, in the order a rebalance should actually be run:
 *
 * 1. Name the symptom in harness terms (`formatBalanceReport`'s own columns —
 *    approval, range, stability, treasury×, success, removal — not a feeling).
 * 2. Find every entry below whose `governs` plausibly touches that column.
 *    Read them together before changing any one of them — this is the step
 *    the movementToDeltas fix skipped, and it is the step that would have
 *    caught the reckless.removalRate regression before it shipped.
 * 3. Change the NARROWEST layer that could produce the symptom.
 *    `catalogue` before `mechanic` before `global` — a global reweight fixes
 *    everything and breaks everything, a catalogue-row edit fixes one thing.
 * 4. Re-run `runBalanceHarness` (balance-harness.ts) and read the FULL report,
 *    not only the assertion that motivated the change — every `bySkill`
 *    figure, because a fix that repairs `prudent` and silently breaks
 *    `reckless` is not a fix, it is a transfer.
 * 5. Commit the constant AND the reasoning in its doc comment, same as every
 *    entry in this registry's source files already does. A number changed
 *    without a stated reason is a number the next rebalance cannot reason
 *    about either.
 */
export declare const BALANCE_REGISTRY: readonly BalanceEntry[];
