---
name: scenario-generate
description: Generate crisis scenarios for The Administration in this session — build a session-driver job with studio-cli, write ScenarioDef JSON against the embedded briefs, and iterate until the validator gate journals every item done. Use when asked to generate, write, or batch scenarios.
---

# scenario-generate — write scenarios in this session, against the gate

Scenarios are JSON documents (`ScenarioDef`, `packages/content/src/scenario.ts`), and every
generated batch — OpenRouter, Claude Code, Codex, OpenCode, human — clears the same validator.
This skill is the session path: the briefs land on disk, this session writes the outputs, the
gate decides. The scenarios in `CORE_SCENARIOS` (`packages/content/src/packs/core.ts`) are the
craft bar; two of them — one routine, one critical — are embedded in every brief.

Where this sits: a session asked to "create scenarios about <topic>" or "create whatever content is
needed" plans first (`skills/content-plan`, which reads `content/kit/NEEDS.md`), researches where a
cell needs grounding (`skills/content-research`), drafts here, and finishes through the publish tail in
`skills/scenario-ingest/SKILL.md`. `AGENTS.md` §6 has the routing.

A drafter with no repository access (a plain chat in any assistant, or a person) cannot run this
procedure. Give them the committed authoring kit in `content/kit/` instead: it carries the same brief
text, gates and exemplars as a job brief, and the file they return comes back through
`skills/scenario-ingest`.

## Procedure

1. **Build the job** (from the repo root; classes come from the 18-entry `ScenarioClass` enum,
   casts are `tensest | closest | band | warCounterpart | belligerent | none` (the last two are for
   war content and bind only on a board that carries the right war), severity is `routine | serious | critical`
   (optional — omitted means `serious`), steer is optional free text after the count):

   ```bash
   node studio-cli/dist/cli.js scenarios job <job-id> espionage:tensest:routine:3 hostage:closest:critical:2:"an embassy under siege" --driver session
   ```

   If `studio-cli/dist` is stale or missing, `pnpm --filter @admin/studio-cli run build` first.

2. **Materialize the briefs**:

   ```bash
   node studio-cli/dist/cli.js scenarios run <job-id>
   ```

   Briefs and a README appear in `content/jobs/work/<job-id>/`. Every item reports "open" —
   that means awaiting output, not broken.

3. **Before writing.** Load, in this order: `docs/CONTENT_DOCTRINE.md` in full; the cell's
   research note (`content/jobs/work/<job-id>/research/<cell>.md`) and calibration note if either
   exists; and the class's shard in `content/corpus/shards/`. Read 5 to 10 existing scenarios from
   that shard — subjects, opening lines, dilemma shapes — and write against them, not into them.
   A subject, an opener, or a phrase that already exists in the shard is a defect the gate cannot
   see. More than half the corpus opens on the word "The"; do not add to that.

4. **Write the scenarios.** For each `<item>.brief.md`, write `<item>.out.json`: a JSON array of
   ScenarioDef objects. Read the brief in full first — it carries the contract, the gates, the
   craft rules, and the two exemplars. Hold the line on craft: concrete detail over adjectives,
   officials who speak in operational sentences, restraint on hard subjects, American spelling,
   replies a head of government could say out loud, costs that match the fiction. Use conditions
   aggressively — relationship bounds, counterpart traits, player alignment, flags earned by
   earlier answers — because conditionality is what makes the pool feel alive.

5. **Run the gate, iterate until clean**:

   ```bash
   node studio-cli/dist/cli.js scenarios run <job-id>
   ```

   A rejected item gets `<item>.findings.json` naming each defect. Fix the output, run again.
   Done items are journaled and never re-checked. Do not stop while any item is open, and never
   hand-edit the progress journal — the gate is the only path to done.

6. **Finish through the publish tail.** Steps 3 to 7 of `skills/scenario-ingest/SKILL.md`: review,
   publish, bake, commit locally by path, `scenarios finish <job-id>`, report. This session drafted the
   batch, so it may not review it. The review runs in a fresh, independent context it did not draft in:
   a subagent, or a separate session, at a model tier at least as strong as the drafter's, following
   `skills/content-review`. Publish only after that review. Where the harness cannot start one, stop
   before publish and leave a one-line handoff:
   `ready for review: node studio-cli/dist/cli.js scenarios review <job-id>`. Never append to
   `packages/content/src/packs/core.ts`; never push or deploy.

## Range and voice

- Severity is authored, per scenario, and must match the cell: `routine` is the connective
  tissue of governing (a budget squabble, an appointment, a provincial complaint), `serious` is
  a real crisis with room to think, `critical` is the rare week the building shakes. Plan a
  corpus at roughly 40% routine / 40% serious / 20% critical — routine weeks are what make the
  critical ones land.
- The manufactured-clock rule: countdown phrasing ("you have until", "by tonight", "the clock
  is", and similar) in a routine scenario's opening or replies is an error; in a serious one it
  is a warning. Only a critical week earns an ultimatum, and only for physical reasons.
- Callbacks: a flag condition takes optional `agedAtLeast: N` — the flag must have been set at
  least N turns earlier. A consequence next week reads as a script; one that comes back cold is
  a callback. When a batch sets a flag, consider writing the delayed reader for it.
- The cabinet speaks like real colleagues: contractions, plain words, short sentences, nobody
  narrating their own dread. "We can't fund both", never "fiscal constraints preclude dual
  allocation".

## Craft checklist

Run this over every scenario before the gate sees it. The gate cannot check any of it.

- **Meier's test.** No reply dominates, no reply is always right, and the set is not a coin
  flip. A reasonable adviser can argue for each reply in one sentence.
- **Separable axes.** Two to four replies, each different on speed, breadth, who pays, or who
  is told. Two replies at the same point on the axis: cut one.
- **The tempting reply.** One reply looks safe and proves not to be, in the rejoinder.
- **Status quo is a real bracket.** The do-little reply is present and the room argues it is too
  little too late; `context.inaction` says what it costs.
- **A sequencing option.** Roughly one set in three offers "do X now, hold Y ready."
- **Room versus memo voice.** The room speaks in contractions and short operational sentences;
  the `context` block is full sentences, named offices, no contractions. Never mixed.
- **Clocks as fact.** Every instrument's real clock, written as a fact about the world, never as
  a statute name. Only a critical week reads a clock aloud.
- **The flag's reader is named.** A reply may not set a flag unless this batch or the arc ledger
  names what reads it. Write the reader or point at one.
- **Reference length.** Write to `content/reference/*.jsonl`, roughly 500 to 1,400 words, not to
  the floors. The shipped corpus runs about a tenth shorter than the reference set and leans on
  fewer particulars; that is the defect, not the bar.
- **No stock openers or phrases.** Not "The [noun]…" as a first sentence, not "nobody in the
  room can," not "in about six weeks."
- **Ripples, in the fiction.** A `position` reply's effects reach the counterpart only and its
  board shows only the price, so spread lives in the text: the rejoinder, the press headline, a
  remembered line, a later reader. Name at least two channels with different lags (doctrine §8),
  one of them landing where the player did not aim, in plain English so the Record can repeat it.
  Never promise in prose an effect the engine cannot deliver.

## The audit rules to write against

Beyond the vocabulary rule above, the gate carries rules a draft has to survive on the first
read, not fix after a rejection:

- `financial-scale-exceeds-severity` — an `impact.financial` band has to fit the week's severity;
  a routine cell billing at `structural` scale is a mismatch even if the number is technically
  legal.
- `instrument-reply-contradicts-rung` — the reply's prose has to match the rung it commits. A
  reply that reads as "open talks" cannot commit a rung the engine calls a recall or a strike; say
  in the text what the commitment actually is.
- `press-missing-on-heavy-reply` — a reply weighty enough to matter needs a press headline. A
  critical week where none of the chosen replies files one is a finding.
- `cabinet-gate-unused` — if a cell's brief offers a `cabinetAttribute` condition, use it at least
  once across the batch; a corpus where no scenario ever gates on who the player appointed breaks
  the game's promise that appointments are legible in later decisions.

## Model-tier routing

Doctrine §12 has the full table. In short: a `routine` cell is Haiku-class work under supervision
(the scaffolded brief plus the gate is the craft bar); a `serious` cell is Sonnet-class; a
`critical` cell, a punctuation-tier class, or a set-piece is Opus-class. Whatever tier drafts a
batch, review always runs at Opus tier in a separate session — tier does not change who reviews,
only who drafts. The brief materializes with a "write in this order" scaffold (context, opening,
replies, rejoinders, flags) and a skeleton JSON shape specifically so a smaller model has a
structure to fill rather than a blank page to compose.

## Cast and reach

Prefer `band` casts until the mix recovers: the plan wants 35% band, the corpus sits at 6.6%, and
61% casts nobody. Two footguns strand a scenario where no preview board reaches it: an absolute
bound on a 0-to-1 scaled field (a treasury threshold as a raw figure), and a `band` cast
compounded with a tight relationship bound. Gate on what a real board can be.

## Hard rules

- Never weaken, bypass, or special-case the validator to make a batch pass.
- Never reuse a scenario id that exists in any pack or batch; ids read as deeds ("the-dawn-crossing").
- `cast: none` scenarios must not reference a counterpart anywhere, and cannot carry a transmission.
- A foreign government never speaks in the opening. Its words go in `transmission`
  (`relay` + `attribution` + `text`) and are drawn as a document attached to the channel, never
  as a message in it. The speaker kinds are `cabinet`, `player`, `narrator` — there is no other.
- Open on the stakes and the decision, never on a duty log. Clock times and counts of shifts,
  depots or crews go in `particulars` or below the stakes. The gate warns on it; the brief
  explains it with a worked example.
- Casting neutrality, not world fiction: the 196 governments are real, so a generic cell must
  survive being cast onto any of them. Name no real country, capital, demonym, institution, or
  news outlet, and quote no capability
  figure. A scenario is cast onto whichever nation the live board picks — the brief's gate list has
  the full rule and the placeholders to use instead.
- **American vocabulary on the player's own government, always** — the playable seat is the US
  presidency and nothing else. Write "the Secretary of Defense," "the Attorney General," "the
  Treasury," "the Pentagon," "the State Department," "Congress," "the House," "the Senate,"
  "impeachment," "censure." "The minister," "the chair," "parliament," "a no-confidence motion,"
  and "backbenchers" for the player's own administration are defects the `parliamentary-vocabulary`
  audit rule rejects as an error, not a stylistic option. A scenario with a counterpart still
  writes "their foreign minister," "their parliament" — that is someone else's government, and its
  own real vocabulary is correct. Doctrine §10 has the full British/parliamentary → American table.
- Invent no individual — no "General Marks", no "Dr. Reeves". People are drawn from a per-campaign
  name-pool roll at generation time, so a rank or honorific welded to a surname names someone who
  does not exist in almost any given campaign. Point at them by role or function instead ("the
  general who ran the facility"). The gate catches any title fused to a capitalized name anywhere
  in the document, not just cabinet chairs.
- If a finding seems wrong, fix the scenario anyway or stop and say so — the gate's word is final.

## Boundaries

Never reviews its own batch, and never publishes one that a fresh, independent context has not
reviewed. Never pushes or deploys. Never edits a shard, the corpus
manifest, the progress journal, or a shipped pack. Never runs a driver other than `session` and
never authorizes spend. Never weakens the doctrine or the gate to land a batch.

## Report

Items done and open, scenarios per class and cell, the work-directory path, findings that took
more than one pass, and every flag set with its named reader. Say what is done, what is partial,
and what was not attempted.
