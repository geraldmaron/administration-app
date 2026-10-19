# The Writers' Room

The harness-neutral procedure for producing player-facing content for The
Administration: scenarios, consequence cards, and arc readers. Written so a person,
a Cursor session, a Codex session, an OpenCode session, or a Claude Code session can
all follow it and produce output the same validator accepts. Read
`docs/CONTENT_DOCTRINE.md` in full before drafting anything — it is the constitution
this file assumes.

Every command below runs from the repo root: `node studio-cli/dist/cli.js ...`. If
`studio-cli/dist` is stale or missing, build it first: `pnpm --filter @admin/studio-cli
run build`.

## 1. The six passes

The room has six roles. Each is a skill with its own detailed procedure
(`skills/<name>/SKILL.md`, tool-neutral; `.claude/skills/<name>` only points
there so Claude Code finds it); this file gives the shape of each without
Claude-specific tool names, so any agent can run the pass.

| Pass | What it does | Reads | Writes |
|---|---|---|---|
| **Plan** (`content-plan`) | Measures corpus coverage, cast mix, severity mix and arc debt; chooses which cells (`class:cast:severity:count`) close the biggest gap; prints the job command | `corpus stats`, `corpus arcs`, `consequences coverage`, `docs/CONTENT_PLAN.md` | `content/jobs/plans/<job-id>.md` |
| **Research** (`content-research`) | Finds real-world episodes with the same *shape* as a cell, extracts decision anatomy, ripple channels and clocks, sanitizes into a note with no real name a writer could paste | primary sources (transcripts, official records) | `content/jobs/work/<job>/research/<cell>.md` |
| **Write** (`scenario-generate` / `consequence-generate`) | Drafts the `ScenarioDef` or `ConsequenceDef` JSON against a materialized brief, iterated until the validator gate journals it done | the brief, the research note, the doctrine, the class shard | `<item>.out.json` per brief |
| **Wire** (`dispatch-editorial`) | Authors feed headlines, wire ledes, outlet voice, topic tags, and scene facet hints for `WireArticle` presentation (pairs with engine `composeArticle`) | `docs/CONTENT_DOCTRINE.md`, `WireArticle` in `packages/ui-web`, `PRESS_OUTLETS` | feed copy fields, article-bank proposals |
| **Continuity** (`arc-readers`) | Audits the arc ledger for flags nothing reads, plans one new reader decision per dead branch, hands drafting to the write pass | `corpus arcs`, `content/corpus/flags.jsonl` | a reader plan, then scenario JSON via the write pass |
| **Review** (`content-review`) | Reads every flagged and sampled item in a batch that cleared the gate, judges it against the doctrine's craft bar, corrects fixable defects in flight, records approve/reject | the batch, `content/reference/*.jsonl` | review decisions on the job, a review note per item |

Nothing here is a Claude-only tool call. Every pass is: read some files, run a CLI
command, write a file, run the CLI command again.

## 2. The file contract

This is the whole mechanism, and it is why any harness works:

1. A **job command** (`scenarios job` or `consequences job`) takes a list of cells
   and creates a job. Running the job's `run` command **materializes** one
   `<item>.brief.md` per cell in `content/jobs/work/<job-id>/`.
2. A **drafter** — any agent, any model, a person — reads the brief and writes
   `<item>.out.json` beside it: a JSON array of `ScenarioDef` or `ConsequenceDef`
   objects.
3. Running the **same run command again** is the gate. It validates every output
   against the schema and the audit rules. A rejected item gets
   `<item>.findings.json` naming each defect, with the offending field and why. An
   accepted item is **journaled done** in the job's progress file and never
   re-checked.
4. The **journal is the one truth** of what is done. Never hand-edit it. A session
   that stalls or hands off mid-batch loses nothing — the next session (any
   harness) reads the same job directory and picks up the open items.

Because the state that matters lives on disk as briefs, outputs, findings and a
journal — not in a chat transcript or a model's memory — a Cursor session can pick
up a batch a Claude Code session started, and a Codex session can review it.

**Without the repository.** A drafter with no repository access writes from the
authoring kit instead of a brief. It is committed at `content/kit/`, rewritten by
every bake and held current by `scripts/verify-kit-current.mjs`; after changing a
rule it carries, `scenarios kit` regenerates it. It holds an
`INSTRUCTIONS.md` to paste as instructions, the brief composed from the same
section builders the job brief uses, the cell catalog, the directors, the writer's
doctrine, the exemplars, a JSON Schema generated from `ScenarioDef`, the shipped
corpus's subjects, openers and deeds for de-duplication, and `NEEDS.md`: what the
corpus is short of, and the contested issues not open yet. The kit version is a hash
of its rules. The drafter returns one JSON file; `scenarios ingest <file>` refuses
a stale version, sorts the scenarios into a session-driver job by cell, writes the
outputs and runs this same gate. `skills/scenario-ingest` carries the rest:
mechanical fixes only, findings back to the author, independent review, publish.

## 3. The commands

**Scenarios:**

```bash
node studio-cli/dist/cli.js scenarios job <job-id> \
  <class>:<cast>:<severity>:<count>[:"<steer text>"] \
  --driver session
node studio-cli/dist/cli.js scenarios run <job-id>       # materialize, then re-run to gate
node studio-cli/dist/cli.js scenarios review <job-id>     # independent review pass
```

**Revising what already ships** (the scenario is rewritten in place; nothing is added to the corpus):

```bash
node studio-cli/dist/cli.js scenarios retime-baseline --out <path>      # the 3-gram baseline, once before a wave
node studio-cli/dist/cli.js scenarios retime <job-id> [--shard <class>]  # scenarios carrying a commit-time flash-forward
node studio-cli/dist/cli.js scenarios run <job-id>
node studio-cli/dist/cli.js scenarios review <job-id>
node studio-cli/dist/cli.js scenarios retime-report <job-id> --baseline <path>
node studio-cli/dist/cli.js scenarios upgrade-publish <job-id>
```

A retime may change only `context.inaction`, each reply's rejoinder text, `remembered` and `press`; a regate only `conditions` and `boosts`. The gate refuses any other field that moved, a changed field that still (or newly) carries a time finding, a countdown phrase in a routine or serious scenario, and any other audit error. `upgrade-publish` refuses a self-reviewed batch exactly as `corpus publish` does: a `provisional` batch needs `--allow-provisional` or an owner authorization.

`class` is one of the 18 `ScenarioClass` values. `cast` is `tensest | closest | band
| warCounterpart | belligerent | none | stricken | outlet | collectionReport | tradeMeasure | liveBill | judicialVacancy | pendingOrderCase`.
The two war casts bind only on a board carrying the right war. `collectionReport`
requires a matching issued-report condition and binds its target, share recipient,
or home government; the report's dated facts are frozen with the case. A `liveBill`
cast requires one `liveBill` gate: `markup` for a `billText.propose` reply, or
`conference` with a `responseText` matching `billText.recommend.text`. For a
conference where both chambers passed different text, `responseText: "both"`
requires one recommendation of each passed text: `billText.recommend.text` is
`"house"` or `"senate"`. `{{billHouseProvision}}` and `{{billSenateProvision}}`
render those frozen alternatives. The binder freezes the bill instance, stage
and text; `{{billTitle}}` and `{{billProvision}}` name a single proposal. A stale case is withdrawn, and
the engine rechecks the pinned bill at commit. A `judicialVacancy` cast requires one matching gate and a
two `judicialNomination.submit` replies, selecting `"first"` and `"alternate"`.
`{{judicialSeat}}`, `{{judicialNominee}}`, and `{{judicialAlternate}}` name the
frozen office and two eligible candidates; their `Record` tokens carry public
career and education facts. Submitting either name opens vetting; it never
promises Senate confirmation. A `pendingOrderCase` cast requires one matching
gate and an `orderRescission.rescind` reply. `{{courtOrder}}` and
`{{courtQuestion}}` refer to the filed proceeding. Rescission withdraws future
authority but neither dismisses the case nor repairs past injury. The engine
rechecks the proceeding and order before commit. `severity` is `routine | serious | critical`
(omit for `serious`). `--driver session` is mandatory — it means the session itself
drafts the content; no paid API spend.

**Consequence cards:**

```bash
node studio-cli/dist/cli.js consequences coverage
node studio-cli/dist/cli.js consequences job <job-id> \
  <instrument>[/<persona>]:<band>:<valence>:<count>[:"<steer text>"] \
  --driver session
node studio-cli/dist/cli.js consequences run <job-id>
node studio-cli/dist/cli.js consequences review <job-id>
```

`instrument` is `diplomatic | economic | covert | military | assistance`, `band` is
`low | mid | high` (the rung strength), `valence` is `success | partial | failure`.

**Arc ledger:**

```bash
node studio-cli/dist/cli.js corpus arcs
```

Lists lopsided arcs (a branch answered, siblings dead) and fully dead branches. Plan
one reader per dead branch — a new decision, not an epilogue — then draft it through
the scenario commands above, steering the cell at the branch it answers.

## 4. Model-tier routing

Doctrine §12 has the reasoning in full; this is the routing table. Tier follows
what is being drafted, never who happens to be available, and the reviewer is
always a tier at least as strong as the drafter — never the same tier by
coincidence, and never the same session.

| Tier | Drafts | Bar |
|---|---|---|
| **Haiku-class** (small, cheap models) | Routine-severity scenario cells; mechanical passes — an arc reader that re-points an existing flag to a new callback, press headlines, vocabulary migration on already-drafted text | The brief's scaffold ("write in this order": context, opening, replies, rejoinders, flags) plus its skeleton JSON shape, and the validator gate. A Haiku-class drafter is not expected to originate structure — only to fill the shape and clear the gate. |
| **Sonnet-class** (mid-tier models) | Serious-severity scenario cells; consequence cards | The gate plus the craft checklist: Meier's negative test, separable axes, band-vs-prose. |
| **Opus-class** (top-tier models) | Critical-severity cells; every punctuation-tier class (`tragedy`, `hostage`, `technology`, `culture`, `death`, `triumph`); set-pieces; **every independent review**, regardless of what tier drafted the batch | The gate, the craft checklist, and the judgment the checklist can't mechanize: does the tempting reply actually surprise, does the register read as a layman's single read. |

A batch drafted at Haiku or Sonnet tier is never treated as sufficient because the
gate passed it. Review still runs, at Opus tier, in a separate session — same as
any other batch.

## 5. American vocabulary

The playable seat is the US presidency and only the US presidency. Write the
player's own government in real American terms: "the Secretary of Defense," "the
Secretary of State," "the Attorney General," "the Department of the Treasury," "the
Pentagon," "the State Department," "Congress," "the House," "the Senate,"
"impeachment," "censure." "The chair," "the minister," "parliament," and "a
no-confidence motion" for the player's own cabinet are defects the
`parliamentary-vocabulary` audit rule rejects as an error, not a stylistic choice —
there is no non-playable charter left to hedge for. A foreign counterpart keeps its
own government's real vocabulary: "their foreign minister," "their parliament" are
correct, because that is someone else's country. `docs/CONTENT_DOCTRINE.md` §10 has
the full British/parliamentary → American table.

## 6. The craft bar the gate cannot check

The validator proves a batch is structurally sound. It cannot tell you a set is a
coin flip, the price is illegible, or three scenarios are the same week reworded.
Every drafter and every reviewer holds these, from `docs/CONTENT_DOCTRINE.md` §6,
§7 and §10:

- **Meier's negative test.** If one reply dominates, if a careful player always
  picks the same one, or if the choice is a coin flip, the set is not finished.
- **Separable on a named axis.** Two to four replies, each different on speed,
  breadth, who pays, or who is told.
- **The tempting reply costs something the player did not anticipate**, arriving in
  the rejoinder.
- **No moral verdict from the room.** Counsel argues interests and odds; the moral
  is the player's.
- **Two registers, never mixed.** The room speaks in contractions and short
  operational sentences; `context` is memo voice — full sentences, named offices,
  no contractions.
- **No stock openers.** More than half the shipped corpus opens on the word "The."
  Do not add to it.
- **Every flag set names its reader** — in the batch, or pointed at an existing arc.
- **Reference length**, not the character floor: write to `content/reference/*.jsonl`
  (roughly 500–1,400 words), which runs about a tenth longer than the shipped
  corpus's median.

## 7. The review protocol

Review runs in a **fresh, independent context** the drafter did not write in — a
subagent or a different session, at a model tier at least as strong as the
drafter's. A self-reviewed batch is marked `provisional` and `studio corpus
publish` refuses it without the owner's explicit `--owner-review` override.

1. Run `scenarios review <job-id>` or `consequences review <job-id>`. Three tiers
   come back: **flagged** (a warning the gate let through), **sampled** (a seeded
   random draw), **clean** (ships on the gate alone).
2. Read every flagged and every sampled item in full — every reply, every
   rejoinder, every remembered line, not just the opening.
3. Judge against §6 above, plus: band-vs-prose (nineteen dead is `dozens`), no
   promised consequence the engine cannot deliver, no jargon left unexpanded, no
   repetition against the class shard.
4. **Correct fixable defects in flight**, re-check, and record the before and
   after. Send back what needs a real rewrite. Stop and say so if the batch cannot
   meet the bar without weakening a rule.
5. Record approve or reject with a one-line note per item, either way.

## 8. Safety, standing

- Session driver only — no OpenRouter or paid-driver spend without the owner's
  recorded authorization.
- Never weaken, bypass, or special-case the validator to land a batch. If a finding
  seems wrong, fix the content anyway or stop and say so.
- Never publish into a shipped pack (`packages/content/src/packs/core.ts`). Run
  `studio corpus publish` / `studio corpus build` only through the publish tail in
  `skills/scenario-ingest`, as the owner authorized on 2026-10-12: into the local
  corpus, baked, committed locally by path, after the gate and an independent
  review. An ingested batch is reviewed by the ingesting agent, which did not
  draft it, and stops before publish if that agent rewrote it for craft. A batch
  drafted here is reviewed by a fresh, independent context the drafting session
  did not draft in (a subagent or a separate session, at least the drafter's
  tier); where none can be started, the session stops before publish and leaves
  a one-line handoff. Push and deploy stay the owner's.
- The reviewing session is never the drafting session.
- No real living person's name and no real news outlet anywhere a writer would
  paste — research notes sanitize before handoff.
- Casting neutrality, not world fiction: the 196 governments are real and the
  player is the US President, but a scenario that has not declared itself a
  set-piece may not name a nation, demonym or capital, and no scenario may name a
  charter institution or hardcode a cabinet chair. A declared set-piece
  (`cast.pick: "nation"` with a stated reason and owner) is the one exception.
- If a gate finding seems wrong, it is fixed anyway or the work stops and says so —
  never suppressed to hit a count.
