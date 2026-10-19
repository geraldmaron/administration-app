---
name: consequence-generate
description: Write authored consequence cards in this session — build a session-driver consequences job, draft aftermath beats per brief, and iterate until the gate clears every item. Use when asked to write, batch, or top up consequence cards.
---

# consequence-generate — the aftermath pool, against the gate

A consequence card is what the world does after the player commits an instrument.
`ConsequenceDef` lives in `packages/content/src/consequence.ts`. The matrix is
instrument (diplomatic / economic / covert / military / assistance) × rung band (low /
mid / high) × valence (success / partial / failure). Read `docs/CONTENT_DOCTRINE.md`
§3, §8 and §10 before drafting. There is no standing card-count target (the 300-card
target was pruned as a volume target on 2026-09-28). The 109-card floor is whole, so new
cards are depth, not rescue.

## Procedure

1. **Measure first**:

   ```bash
   node studio-cli/dist/cli.js consequences coverage
   ```

   It reports 45 cells with core plus corpus counts and flags empty and gated cells.
   Take the empty cells first, then the gated-only cells, then the lowest counts.

2. **Build the job** (cell grammar is `instrument[/persona]:band:valence:count[:steer]`;
   persona routing defaults to diplomatic and economic → `the-room`, assistance and
   military → `the-embed`, covert → `the-architect-of-dread`):

   ```bash
   node studio-cli/dist/cli.js consequences job <job-id> \
     covert:high:failure:6:"the asset is safe and the channel is not" \
     economic/the-room:mid:partial:6 --driver session
   ```

3. **Materialize the briefs**:

   ```bash
   node studio-cli/dist/cli.js consequences run <job-id>
   ```

   Briefs land in `content/jobs/work/<job-id>/`. Every item reports "open" until its
   output exists.

4. **Write `<item>.out.json` per brief** — a JSON array of `ConsequenceDef` objects.
   Read each brief in full first.

5. **Run the gate and iterate**:

   ```bash
   node studio-cli/dist/cli.js consequences run <job-id>
   ```

   Defects write `<item>.findings.json`. Fix the output and run again. Never hand-edit
   the progress journal. Do not stop while any item is open.

6. **Measure again** with `consequences coverage`, and hand the batch to
   `content-review` in a separate session.

## Craft

- **One to three beats**, in the fixed aftermath grammar: what happened, who it landed
  on, what it left behind. No fourth beat, no summary line.
- **Effects stay inside the schema.** A card reaches metric, relationship, grudge and
  feed. It cannot touch nation stats, the cabinet, or the removal arc, so it must not
  claim to in prose. Never promise a Secretary's seat or a vote on the Hill.
- **American vocabulary on the player's own government.** "The Secretary," "the
  Treasury," "Congress," "the Senate" — never "the minister," "the exchequer,"
  "parliament." A counterpart's own vocabulary ("their foreign minister") is correct
  and stays. Doctrine §10 has the full table; `parliamentary-vocabulary` rejects a
  miss on the player's own side as an error.
- **Financial scale matches the rung it's answering.** A `low`-rung card billing at
  `structural` scale is the same defect the scenario gate calls
  `financial-scale-exceeds-severity`; keep the card's cost inside what its rung and
  valence actually earned.
- **The feed line names its ripple channel in plain English** — alliance credibility,
  trade diversion, a third country's domestic politics, bloc cohesion, an institution
  or precedent, a legal clock, execution friction, escalation reservation,
  reputational contagion. Plain words, not the taxonomy's label pasted in.
- **NPC to NPC where the cell allows it.** Roughly a third of the feed lines should be
  about what a neighbor, a bloc, or a rival did in reply, with the player offstage.
  Most of the world's weekly traffic is talking, meeting, signing and complaining.
- **No real names.** A card is drawn for whichever pair of nations the act involved, so it is
  never a set-piece and can never name a country. No country, capital, demonym, outlet, institution, statute, or
  invented individual. People are roles. Numbers are written as words.
- **Register**: sharp newsroom, plain words a layman reads once, a particular in every
  beat that has one. No stock openers.
- **Valence is honest.** A `success` card still costs something; a `failure` card is
  not a disaster reel. A `partial` names precisely which half held.

## Model tier

Doctrine §12: consequence cards are Sonnet-class work by default; a card at `high`
rung and `success` or `failure` valence (the ones that carry the heaviest aftermath)
is Opus-class. Review is always Opus-class, in a separate session, regardless of
which tier drafted the card.

## Boundaries

Never reviews its own batch, publishes, builds or deploys. Never edits
`packages/content/src/packs/`, a shard, or the progress journal. Never runs a driver
other than `session`, and never authorizes spend. Never widens the effect schema or
weakens the gate to land a card. If a finding looks wrong, fix the card anyway or stop
and say so.

## Report

Coverage before and after, by cell. Items done and open, cards written per cell, the
work-directory path, and any finding that took more than one pass. Progress against
any target `docs/BACKLOG.md` names, if one exists. Say what is done, what is partial,
and what was not attempted.
