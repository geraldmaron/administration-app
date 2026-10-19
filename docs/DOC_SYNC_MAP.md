# Doc sync map

CLAUDE.md's Doc Sync Contract says which surfaces must move together and that drift is a blocking review finding. It is written as a list of surfaces. This file reads the same contract from the other end: given the kind of change you are about to make, what has to move with it and which gate fails if it doesn't.

It names files and symbols, never line numbers. A line number in a map like this is stale within a week, and a reader who finds one wrong stops trusting the rest.

Four change classes cover most of what breaks. A change that fits none of them still answers to the contract in CLAUDE.md.

---

## A loop change

Wiring a matter source, changing what stops the world, adding a field to `Campaign`, changing what a press of Continue buys.

**Trigger symbols:** `packages/engine/src/advance.ts`'s `AdvanceResult` and `advanceUntilAttention`, and `packages/engine/src/attention.ts`'s `AttentionStop`: the one function the player and the balance harness both drive the world with, and its return shape.

**Canonical docs, same commit**
- `docs/ARCHITECTURE.md`: the "Game time, attention and the one advance" section, and the save paragraph if the format moves.
- `docs/SCHEMA.md`: the `Campaign` field list, if the state shape changes.
- `docs/CONTENT_DOCTRINE.md` §2, if the change moves a scoring constant a writer reasons about.

**Code registries**
- `packages/engine/src/save.ts`: `CURRENT_SCHEMA_VERSION`, if the save shape moves. A new field is optional on load and its absence reads as what an older save truthfully means; widen `SUPPORTED_SCHEMA_VERSIONS` rather than refusing saves where a cheap migration exists (DECISIONS.md §9.3, §9.4). Say so in the commit message.

**Gates that will fail**
`verify-case-contract` and `verify-case-source-unification` if a matter bypasses the case registry, `verify-no-silent-skip` if a clock lapses without a declared default, `verify-one-day-counter` if a second day counter appears; a moved scoring constant is checked against `CONTENT_DOCTRINE.md` §2 by hand.

---

## A fiscal change

Anything that moves money: what an act costs, what an appropriation binds, what the treasury means.

**Canonical docs, same commit**
- `docs/ARCHITECTURE.md`: the fiscal statement section, and "the economy kept rather than derived" for the books, credit and the debt limit.
- `docs/SCHEMA.md`: the appropriation section if `Campaign` state moves, and the economy's three kept records (`macro`, `books`, `debtLimit`) if a record's shape moves, including `NationBooks.trail` and `ChoiceBorrowingEffect`. A reply or an order that borrows is `choiceBorrowing`, booked onto `choiceDebt`, not a `nationStat` write of `economy.debt`.
- `docs/CONTENT_DOCTRINE.md` §2, if the treasury reference moves: every authored scenario prices against it.

**Code registries**
- `packages/world/src/dataset/stat-consumers.ts`: a new field on `NationStats`, `Nation.geo`, `NationTraits` or `Person` needs an entry naming its consumer, or the paired test fails.
- `packages/world/src/dataset/units.ts`: a new numeric field needs a `UnitSpec`.
- `packages/world/src/dataset/metrics.ts` and `metric-copy.ts`: a metric without a description and scale-end words fails the build.
- `packages/world/src/dataset/bands.ts`: changing a derivation changes what all authored content targets.
- `packages/content/src/balance-registry.ts`: the derivation layer entry.

**Gates that will fail**
`verify-fiscal-authority`, `verify-us-units`, `verify-american-spelling`, and in the balance run `economy-balance.test.ts` (the books' bands and the investment approval bound, measured for all three parties) and `macro-balance.test.ts` (the cycle's shape).

**A seam not to close by accident.** ARCHITECTURE records that folding the national balance into the presidential treasury is rejected on the arithmetic, and `fiscal.ts` states the same thing above `selectFiscalOutlook`. A fiscal change either honors that or supersedes it explicitly in both places.

---

## A world dataset change

A new or changed field on a world schema, a new validator check, a change to the band derivation, a new provenance source.

**Canonical docs, same commit**
- `docs/SCHEMA.md`: the schema's section and, for a validator check, §7.
- `docs/ARCHITECTURE.md` §4, if the change alters how the dataset is assembled or what the engine reads from it.
- `docs/DECISIONS.md`, only if the change breaks a standing rule in §4 or §5; then the rule changes in the same commit.

**Code registries**
- `packages/world/src/dataset/stat-consumers.ts` and `units.ts`, as above.
- `packages/world/sources/`: a sourced figure carries its provenance file (DECISIONS.md §4.11).

**Gates that will fail**
`verify-world-coverage`, `verify-leader-fidelity` for leader attributes, `verify-person-relationship-provenance` for sourced ties; `dist/` rebuilt and committed is checked by hand (`git status --short -- '*/dist/*'` after the commit).

---

## A player change

A map-first screen, lens, camera rule or shared pattern.

**Canonical docs, same commit**
- `docs/DESIGN.md`, if the change alters what the player sees or does. It is the single design brief.
- `docs/ARCHITECTURE.md` §7, if the change alters what exists in source (a new player-core module, a new renderer layer).
- `scripts/capability-ledger.json` and `docs/audits/2026-10-10-map-first/capability-ledger.md` (generated from it with `--write-md`), when a screen first reaches an engine act.

**Gates that will fail**
`verify-renderer-boundary` (+ proof), `verify-css-architecture`, `verify-icon-registry`, `verify-unused-primitives` (+ proof), `verify-adhoc-color-lint`, `verify-file-size`.

---

## The habit that makes this work

Tick the Code Review Checklist's "Doc sync" box against the specific lines above, not against the contract in general. Doc drift starts as a change that satisfies the contract in spirit and never opens the file.
