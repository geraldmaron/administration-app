---
name: resolution-sequence-generate
description: Write authored resolution step sequences in this session — take empty cells off the coverage matrix, draft the ordered steps a decision resolves through, and iterate until the reachability gate and the bank test clear every item. Use when asked to write, batch, or top up resolution beats, step sequences, or staged resolution prose.
---

# resolution-sequence-generate — the staged act, against the gate

A resolution sequence is what the room watches happen between the order and the
packet. `ResolutionSequenceDef` lives in `packages/content/src/resolution-beat.ts`
and the bank ships from `packages/content/src/packs/resolution-sequences/`, beside
the consequence packs. The key space is instrument (diplomatic / economic / covert /
military / assistance) × rung band (low / mid / high) × valence (success / partial /
failure) × the instrument's named failure branches (`RISK_IDS`, and only on a
failure). Read `docs/CONTENT_DOCTRINE.md` §5, §8, §10 and the step-sequence craft
section before drafting.

A consequence card is the aftermath told once the dust settles. A sequence is the
ordered steps played while it settles. **They never share a line.**

## Procedure

1. **Measure first** (needs `pnpm run build`, because both tools read the built package):

   ```bash
   node skills/resolution-sequence-generate/coverage.mjs
   ```

   It prints all sixty-nine cells with their sequence counts, names the empty ones in
   the order to take them, and flags every single-sequence cell. Take the empty cells
   first, then the single-sequence cells in the hottest valences (`success` and
   `partial` are drawn far more often than any one failure branch).

2. **Add the sequences.** `studio-cli` has no `sequences` subcommand (its groups are
   `scenarios`, `consequences` and `corpus`), so this family has no job or brief
   scaffold. Take the cells `coverage.mjs` names and append `ResolutionSequenceDef`
   objects to the instrument's bank file under
   `packages/content/src/packs/resolution-sequences/` (today `military.ts` and
   `covert.ts`). Diplomatic, economic and assistance have no bank:
   `core-resolution-sequences.ts` keeps them deliberately empty until an instrument can
   be filled whole. Opening one needs a new file spread into
   `CORE_RESOLUTION_SEQUENCES` there, which is outside this skill's boundary, so stop
   and ask the owner before starting a new instrument. Director persona by instrument:
   assistance and military → `the-embed`, covert → `the-architect-of-dread`,
   diplomatic and economic → `the-room`. Never invent a second job format.

3. **Write the sequences.** Read the bank file in full first, then draft each cell
   against the craft rules below.

4. **Run the gate and iterate**:

   ```bash
   pnpm run build
   node scripts/verify-resolution-beat-reachability.mjs
   pnpm --filter @admin/content test
   node scripts/verify-wire-bank-collapse.mjs
   ```

   The schema refuses most defects at parse time and names them; reachability refuses
   a sequence no resolution can draw; the bank test refuses an empty cell inside a
   claimed instrument and a line repeated anywhere in the bank. Fix the sequence and
   run again. Do not stop while a cell you took is still empty or any check fails.

5. **Measure again** with `coverage.mjs`, and hand the batch to `content-review` in a
   separate session.

## Craft

- **Two to five steps**, in the grammar of an act being carried out: the order, the
  movement, the contact, what it cost, what came back. The last step carries the
  result, and it is the only one that may.
- **Honest about an outcome already computed.** The packet is built before step one
  is read. A `success` sequence ends on a `gain`, a `partial` on a `mixed`, a
  `failure` on a `cost`, and the schema will not let you author otherwise. No step
  may imply the result is still open — that is jeopardy the packet has already
  contradicted, and a player who reads it twice stops believing the first read.
- **A step's own turn is settled too.** `held` is the part of the act with no local
  result yet (an order read out, a column on the road), not suspense. A `loss` costs,
  a `rescue` gains or is mixed and needs something lost earlier in the same sequence,
  a `stand-down` is where the act ends and nowhere else.
- **Named particulars come only through the four slots**: `{{actor}}`, `{{target}}`,
  `{{unit}}`, `{{person}}`. Every slot the line uses is declared and every declared
  slot is used, in both directions. A strike names `{{unit}}` and `{{target}}`; a
  loss names `{{unit}}`.
- **No real designation, ever.** Ordinal formations, ship prefixes and named
  special-operations units are refused by the schema. A designation arrives through
  the generated `{{unit}}` slot or it does not arrive. No real country, capital,
  demonym, outlet, statute or living person anywhere.
- **A particular in every step that has one**: a time on a clock, a rated ramp, a
  passport, a manifest, a phone that stops being answered. "The attack went in" is
  the generic line this whole family exists to avoid.
- **Register**: the newsroom voice, not a dry one — plain words a layman reads once,
  active, one idea per line. Numbers as words. American spelling and US customary
  units. American vocabulary on the player's own government; a counterpart keeps its
  own.
- **The restraint rule holds at the top of the ladder.** The camera is on the crews,
  the ramp, the manifest and the after-action note. Report what was counted, never
  what it looked like.
- **A sequence carries no effect and must not claim one.** It cannot move a nation
  stat, seat or unseat a Secretary, or touch the removal arc. Everything that bites
  landed through the packet before the first step played.
- **No two step lines anywhere in the bank.** A shared graf is how a bank of thirty
  documents becomes one document told thirty times.

## Model tier

Doctrine §12: a step sequence is Sonnet-class work by default; `high`-band military
and covert cells and any `failure` branch that ends a campaign's arc are Opus-class.
Review is always Opus-class, in a separate session, regardless of which tier drafted.

## Boundaries

Never reviews its own batch, publishes, builds a release or deploys. Never edits
`resolution-beat.ts`, `resolution-beat-reachability.ts`, their tests, the gates in
`scripts/`, or any pack outside `packs/resolution-sequences/`. Never authorizes spend.
Never widens the schema, relaxes an outcome rule, or weakens a gate to land a sequence.
If a finding looks wrong, fix the sequence anyway or stop and say so.

## Report

The coverage matrix before and after, by cell. Cells filled and still open, sequences
written per cell, the bank-file path, the reachability result, and any finding that
took more than one pass. Say what is done, what is partial, and what was not attempted.
