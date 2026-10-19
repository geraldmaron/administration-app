---
name: content-review
description: The independent review pass over a validated scenario or consequence batch, run from a session that did not draft it — read the flagged and sampled items, judge them against the doctrine, and record approve or reject with a note. Use when a batch has cleared the gate and needs a human read.
---

# content-review — the layman's read, from a session that did not draft

The gate proves a batch is structurally sound. It cannot tell you the set is a coin
flip, the price is illegible, the room is preaching, or three scenarios are the same
week reworded. That is this pass. Read `docs/CONTENT_DOCTRINE.md` in full first.

**This session must not be the session that drafted the batch.** A fresh, independent context the
drafter did not write in counts: a subagent the drafting session starts, or a separate session, at a
model tier at least as strong as the drafter's. Self-review marks a
batch `provisional`, and `studio corpus publish` refuses a provisional batch without
`--owner-review`, which only the owner gives.

## Procedure

1. **Open the tiers**:

   ```bash
   node studio-cli/dist/cli.js scenarios review <job-id>
   node studio-cli/dist/cli.js consequences review <job-id>
   ```

   Three tiers come back: **flagged** (a warning the gate let through), **sampled**
   (seeded random draw), **clean** (ships on the gate alone).

2. **Read every flagged and every sampled item in full.** Not the opening and a
   reply — every reply, every rejoinder, every remembered line, the transmission, the
   `context` block, the press headline, and for a consequence card every beat and its
   feed line. Skimming one branch and assuming the others match is how a bad branch
   ships.

3. **Judge.** A finding is anything a player would notice:

   - **Meier's test.** Does one reply dominate? Would a careful player always pick the
     same one? Is it a coin flip?
   - **Separable axes.** Do two replies sit at the same point on speed, breadth, who
     pays, or who is told?
   - **Jargon.** Any term of art a layman must decode is a defect unless the sentence
     using it expands it.
   - **Legibility of price.** Can the player tell what each option buys and whom it
     costs, before committing? Is the direct price shown and the aftermath honestly
     hidden?
   - **Complete federal accounting.** Does financial.basis count every component promised by the choice,
     with separately sourced quantities/rates/durations and explicit coverage/exclusions? A per-person
     grant alone must not masquerade as the whole federal cost. Planning inputs are labeled; no fitted
     uncertainty is implied. Compare the pre-commit estimate with the separately booked Record amount.
   - **Persistent subjects.** Render a callback after its predecessor and after save/load. Does it name
     the same registered organization/person/place, with an origin in Record? An earlier governor is
     not silently replaced by today's governor. No introduced facility gains an unsupported capacity.
   - **Band versus prose.** Nineteen dead is `dozens`. Does every impact band match
     what the text actually said, with `agency` declared? Is anything billed twice
     (`cost.treasury` beside `impact.financial`)? Does the financial band's scale fit
     the week's severity (`financial-scale-exceeds-severity`)?
   - **American vocabulary on the player's own government.** "The Secretary of
     Defense," not "the minister"; "the Treasury," not "the exchequer"; "Congress,"
     not "parliament"; "impeachment" or "censure," not "a no-confidence motion." A
     counterpart's own vocabulary ("their foreign minister") is correct and stays —
     the rule is about whose government the sentence names, not a blanket ban on the
     words. This is what `parliamentary-vocabulary` is meant to catch as an error;
     read for it by eye too, since a pattern rule misses paraphrases.
   - **Commitment matches the reply's own prose.** Does the text say what the
     commitment actually does (`instrument-reply-contradicts-rung`)? Does a reply
     heavy enough to matter carry a press headline (`press-missing-on-heavy-reply`)?
     Across the batch, does at least one scenario use a `cabinetAttribute` condition
     where the brief offered one (`cabinet-gate-unused`)?
   - **Plausibility.** Can this cast plausibly do this, on this clock, with capability
     described as what it can do this week rather than as inventory?
   - **Room versus memo voice.** Contractions and short operational sentences in the
     room; full sentences and named offices in `context`. Never mixed.
   - **Promised consequence the engine cannot deliver.** A reply that says it will cost
     a chair their seat, move a vote, or start a war is a lie unless a later scenario
     reads the flag and makes it so.
   - **Repetition.** Compare against the class shard in `content/corpus/shards/`: same
     subject, same opener, same distinctive reply line.
   - **Stock phrases.** "The [noun]…" as an opener, "nobody in the room can," "in about
     six weeks."

4. **Decide `approve` or `reject`, one line of note each**, either way. A bare approve
   is useless six months later when someone asks why an item is in the pool.

5. **Correct a reject in flight.** The standing pattern: fix the item yourself, re-check
   it against the same tests, and record both the defect and the correction. Do not
   escalate a defect you can repair, and do not weaken a rule to let one pass. If a
   correction would need a decision that is not yours, stop and say so.
   A batch that arrived through `scenario-ingest` is the exception: its author is outside
   the repository, so a reject goes back to them through the findings file rather than
   being corrected here, and a correction would make the reviewer an author.

6. **Record the decisions** where the review command expects them for the job, and note
   in the report whether the batch is provisional.

## Model tier

Doctrine §12: review always runs at Opus tier, whatever tier drafted the batch. A
routine batch drafted Haiku-class still gets a full Opus-class read; tier is about who
reviews, never a reason to skim.

## Boundaries

Never drafts the batch it reviews, and never reviews a batch this session drafted.
Never publishes: `studio corpus publish` and `corpus build` are the owner's steps, not
this skill's. Never passes `--owner-review`. Never edits a shard, the corpus manifest, a
shipped pack, or the progress journal. Never weakens the doctrine, the gate, or an
audit rule to clear a finding. Never lets a finding stand uncorrected and unreported
because the batch is otherwise good.

## Report

Items in each tier and how many were read in full. Approvals and rejections with the
one-line note for each rejection, plus what was corrected in flight and re-checked.
Defect patterns worth a `docs/BACKLOG.md` entry. Whether the batch is provisional and
why. The job id and paths. Say what is done, what is partial, and what was not
attempted. State plainly that publishing and deploying were not attempted.
