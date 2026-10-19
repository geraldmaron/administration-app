---
name: arc-readers
description: Plan and land reader scenarios for the corpus's dead branches — find lopsided arcs, write one new decision per dead branch, and verify the branch is read. Use when asked to close flag promises, answer dead branches, or fix the flag economy.
---

# arc-readers — answer the branches the corpus opens

The corpus writes far more flags than it reads; `corpus arcs` gives today's numbers. A
lopsided arc is one where at least one branch of a decision was answered later and the
others were not: the player who picked the answered branch got a callback and everybody
else got silence. The work is a content-track item in
`docs/BACKLOG.md`; measure today's count with `corpus arcs` rather than trusting a figure
written here. You are the `continuity-editor`: you plan and verify, and hand the
drafting to `scenario-generate`.

## 1. Get the ledger

```bash
node studio-cli/dist/cli.js corpus arcs
```

The shard migration has run, so this reads the full shipped corpus cleanly. If it ever
crashes on a schema mismatch again, fall back to a per-session ledger script — a short
read-only sweep over `content/corpus/shards/*.jsonl` plus any pending job work dir,
collecting `replies[].sets` as writes and `conditions[].kind === "flag"` as reads, then
printing each lopsided arc with its answered and its dead branch ids. Never hand-edit a
shard to make the command pass.

## 2. Pick

Lopsided arcs first, always. Fully silent arcs are a volume problem the 2,000 target
subsumes; chasing them ahead of the lopsided ones authors readers for deeds nothing yet
competes with. Within lopsided arcs, prefer the setter scenarios a player meets often:
spine classes, common casts.

## 3. Plan one reader per dead branch

A reader is a **new decision**, not an epilogue. Rules:

- It may change class and desk. The consequence of a covert choice can arrive as an
  institution week or a justice week; that is what makes it feel like the world moved
  rather than a script resuming.
- It gates on the setter's flag with `agedAtLeast` varied across 4 to 10 turns, and
  takes the `flagAge` director boost. Do not give a batch of readers the same age.
- Where it can, it quotes the player's remembered line back in a hostile or indifferent
  mouth. Someone who does not care that the President said it is more effective than
  someone who does.
- It must not contradict the setter's shipped rejoinder. Read the setter in full,
  including every reply's rejoinder and remembered line, before writing a word. This is
  the failure that sank scenarios in `promises-kept-01`.
- It carries its own dilemma. If the only choice is how to feel about the past, it is
  an epilogue and it does not ship.

## 4. Build the job

The reader rides the class cell as a steer on the branch it answers:

```bash
node studio-cli/dist/cli.js scenarios job <job-id> \
  institution:none:serious:4:"months after the memo was published, the body it created asks for more" \
  --driver session
```

Then run it through `scenario-generate`: materialize the briefs, write the outputs, and
iterate until the gate journals every item done.

## 5. Verify

Re-run the arc ledger (or the fallback script) and confirm each targeted branch now has
a reader. Expect `arc-branch-unread` to **rise**: the audit can only see an arc once one
of its branches is answered, so closing promises exposes arcs it previously could not
count. That is progress, not damage. Never "fix" a rising count by disconnecting a
reader.

## Model tier

Doctrine §12: re-pointing an existing flag's reader to a new callback is a mechanical
pass — Haiku-class, supervised by the scaffolded brief and the gate. Planning which
branch gets a reader and drafting a genuinely new decision (step 3) still follows the
severity of the class it lands in, same as any other scenario cell.

## Boundaries

Never drafts the scenario JSON itself — that is `scenario-generate`. Never reviews its
own readers; review runs in a separate session. Never edits a shard, the corpus
manifest, a shipped rejoinder, or the progress journal. Never publishes, builds or
deploys. Never disconnects an existing reader, and never retires a flag to make a
warning count fall.

## Report

Lopsided arcs and dead branches before and after, how the ledger was obtained
(command or fallback, and why), the branches targeted with their setter ids and chosen
`agedAtLeast` values, the job id and work-directory path, and the new
`arc-branch-unread` count with the note that a rise is expected. Say what is done, what
is partial, and what was not attempted.
