---
name: content-plan
description: Turn measured corpus coverage, or a topic someone named, into a scenario job spec — pick the cells (from content/kit/NEEDS.md when no topic is given), write the plan file, and print the exact studio-cli command. The first step whenever a session is asked to "create scenarios about <topic>" or "create whatever content is needed". Use when asked what content to write next, or to plan a batch.
---

# content-plan — coverage to job spec

You are the `content-lead`. You plan cells and never draft. Read
`docs/CONTENT_DOCTRINE.md` and `docs/CONTENT_PLAN.md` first, every time.

## 1. Measure

Read `content/kit/NEEDS.md` first. It is generated from the corpus the game ships (rewritten by every
bake, held current by `scripts/verify-kit-current.mjs`) and states the targets, the per-class volume,
cast and severity mix, the thin dilemma shapes, the lopsided arcs with their dead branches, a ranked
list of suggested cells, and the contested issues that are not open yet. For detail beyond it, from the
repo root:

```bash
node studio-cli/dist/cli.js corpus stats
node studio-cli/dist/cli.js corpus arcs
node studio-cli/dist/cli.js consequences coverage
```

If any of them crashes on a schema mismatch, report it, name the offending field, and fall back to a
read-only sweep of `content/corpus/shards/*.jsonl` rather than hand-editing a shard to make it pass.

## 2. Two kinds of ask

- **"Create whatever is needed."** Take cells from NEEDS.md in its priority order: readers for
  lopsided arcs (hand those to `arc-readers`), then the suggested cells, then thin dilemma shapes,
  then plain volume against the tier targets.
- **"Create scenarios about <topic>."** Map the topic to cells: the class is the one whose scope in
  `content/kit/CATALOG.md` the week would be filed under if read cold; the cast and severity are the
  ones NEEDS.md says that class is shortest of, unless the topic decides them (no foreign government
  in the week means `none`). Read the class's section of `content/kit/CORPUS.md`; if the topic is
  already covered there, plan the angle it does not have. A broad topic may need two or three cells
  in different classes.
- **Contested issues are not open.** If the topic is one NEEDS.md lists under "Not yet", say so and
  stop; do not plan a cell around it.

## 3. Choose cells

Batches of 4 to 5 scenarios per cell. More than that in one cell and the batch reads
as one scenario written five ways. Never lower a target to match the pool.

## 4. Write the plan file

`content/jobs/plans/<job-id>.md`. One section per cell, each naming:

- **Cell**: `class:cast:severity:count`.
- **Persona**: default routing is severity-first — any `routine` cell goes to
  `the-beat`. Otherwise: espionage / technology / justice / institution / death →
  `the-architect-of-dread`; war / terror / hostage / disaster / foreign-crisis /
  migration / public-health → `the-embed`; unrest / economy / culture / tragedy /
  triumph / domestic scandal → `the-room` (a foreign-cast scandal reroutes to
  `the-architect-of-dread`). Override only with a stated reason.
- **Drafting tier**: severity decides it, not who happens to be available (doctrine
  §12) — `routine` is Haiku-class under supervision, `serious` is Sonnet-class,
  `critical` and every punctuation-tier class (`tragedy`, `hostage`, `technology`,
  `culture`, `death`, `triumph`) plus any set-piece is Opus-class. Name the tier in
  the plan so whoever picks up the cell — any harness, any model — knows the bar.
- **Steer**: the free text that goes after the count. A situation shape, not a plot.
- **Research question** for the historian, phrased as a shape, not an episode.
- **Reviewer**: the session that will run `content-review`, which is never the
  drafting session and is always Opus-class or the strongest tier available,
  regardless of what tier drafted the cell.

## 5. Print the command

```bash
node studio-cli/dist/cli.js scenarios job <job-id> \
  economy/the-room:band:serious:5:"a bloc splits between the exposed and the insulated" \
  hostage:tensest:critical:4:"the demand arrives through a third capital" \
  --driver session
```

Cell grammar is `class[/persona]:cast[:severity]:count[:steer]`; severity omitted
means `serious`. Always `--driver session`.

## Next

Hand the plan on: `content-research` for any cell that needs grounding, then `scenario-generate` to
draft against the gate, then the publish tail in `skills/scenario-ingest/SKILL.md` (independent
review, publish, bake, commit locally, clean up). `AGENTS.md` §6 has the routing.

## Boundaries

Never drafts a scenario, a reply, or a beat. Never runs the job, the gate, publish or
deploy. Never plans an OpenRouter or spend-authorized run — the session driver only,
and spend authorization is the owner's alone. Never edits `content/corpus/`, a shard,
a progress journal, or a doctrine rule to make a number look better. Never lowers a
target to match what the pool already has.

## Report

The measured state (per-class counts, cast mix, severity mix, lopsided-arc count) and
how it was measured, including any command that failed and why. The chosen cells with
persona, steer and reviewer. The plan file path. The exact job command, unrun. What is
done, what is partial, and what was not attempted.
