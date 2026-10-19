---
name: player-tips
description: >-
  Writes, audits and rewrites the words a player reads in The Administration:
  standard interface copy and, above all, the teaching voice of its helpers
  (glossary entries and explainers in player-core's glossary module, help
  popovers, the Handbook, the first-run walkthrough, empty states, error
  messages, and the founding steps' "what this commits you to" lines). Use when
  adding or editing any player-facing text, auditing a screen, a directory or
  the whole application for voice, or keeping guidance aligned with NORTH_STAR
  and DESIGN.md.
---

# Player guidance

Guidance is not lore, not scenario prose, and not insider briefing voice. It teaches a new President how the game works in plain words, at the moment they need it. `docs/DESIGN.md` says where guidance appears: glossary terms are reachable from search and from inline term links, a 3–5 step walkthrough runs on the first decision, and each founding step shows what it commits the President to.

## Where guidance lives

Guidance is data in player-core; `apps/web` only renders it.

| Surface | Module | Shape | Job |
|---------|--------|-------|-----|
| Glossary (search and inline term links) | `packages/player-core/src/glossary/` (`desk.ts`, `government.ts`, `policy.ts`, `world.ts`, `record.ts`, joined in `index.ts` as `GLOSSARY`) | `GlossaryEntry { id, term, definition, inGame?, example?, icon?, related? }` | What a word means in the real government (`definition`) and what the simulation does with it (`inGame`) |
| Process explainers | the same files (`EXPLAINERS`) | `Explainer` with steps, cast, thresholds and links (`types.ts`) | How a part of government works, drawn as steps, people, counts and influences |
| First-run walkthrough | not built yet (W4 of the map-first program) | | Teaches the map, the lens control, the sheet and the comparison on the first decision |
| Founding "what this commits you to" | not built yet (W3); founding stages are `packages/player-core/src/campaign/founding-stages.ts` | | Why a founding choice matters and where it lands |

Every glossary entry states something true twice: true of the United States government as it works, and true of what this simulation does. Write the two apart (`definition` and `inGame`), and name the module that makes the in-game claim true in a comment beside the entry, so a change to the engine can find the sentence it would falsify. An explainer's `weight` comes from the engine's own weighting; an influence nobody can point to in source is not written.

Never type a figure into guidance: a number typed into guidance is a number nothing keeps true. Never fill a field with filler to make a surface look finished; an unwritten entry renders nothing.

After editing guidance, run:

```bash
pnpm --filter @admin/player-core exec vitest run src/glossary
```

## Two registers

Read `docs/CONTENT_DOCTRINE.md` §10.2 before writing. Every string is one of two kinds.

- **Interface copy** (headings, tabs, labels, buttons, column headers, status words, short descriptions, receipts) is standard application writing. Plain, conventional, neutral. It never plays a character.
- **Helper copy** (glossary, explainers, popovers, the Handbook, the walkthrough, empty states, messages that explain a failure, founding commitments) teaches in a good teacher's voice. Welcoming, patient, direct and respectful of a new reader. Fred Rogers and Barack Obama are the reference.

A string that sits between the two takes the interface register. When a helper sits beside a control, the control keeps its standard label and the helper does the teaching.

## Voice rules

1. **Layman first.** Name what something *does* before how the engine labels it. If the UI says "Standing," explain it as "how other nations read you."
2. **Consequence first.** Like `METRIC_MEANINGS` in `packages/player-core/src/format/figures.ts`: say what a low number costs, not what the variable stores.
3. **Name where it lands** in the words the player meets on screen ("the Record", "the Senate lens"), never a module or a field.
4. **No insider shorthand.** Refuse "the week's account," "assembled from the room," or briefing voice without a particular.
5. **No real people or outlets.** Fictional press only; American government vocabulary for the President's own seat (Secretary, Congress, impeachment, not minister or parliament).
6. **Scan length.** A definition or an answer is two or three short sentences, at most about 320 characters.
7. **Truthful to built mechanics.** Read `docs/NORTH_STAR.md`, the engine module behind the claim, and `METRIC_MEANINGS` before claiming a behavior. If a feature isn't reachable by the player, don't explain it.

## Auditing and rewriting existing text

Use this when asked to review the prose of a screen, a directory or the whole application. It is the same steps every time, so any session or agent can run it.

1. **Take the inventory.** `node scripts/verify-player-prose.mjs --inventory <path-prefix>` lists every prose string under a path with its file and line. Work one directory at a time. The glossary, the authority registry and the Handbook are the teaching core, so give them the most care and the smallest batches.
1b. **Take the plain-language worklist.** `node scripts/verify-player-prose.mjs --plain <path-prefix>` ranks the strings most likely to need a real rewrite: long sentences, hard words and the jargon list in §10.2. A rewrite that only removes semicolons is not done. Rewrite every helper, caption, empty state and error of seven or more words for a sixth-grade reader, and every label that uses an expert word. For each string you keep, note why in a few words.
2. **Sort each string into a kind** from the shape table in §10.2 (heading, label, button, caption, empty state, error, definition, helper). Mark it interface or helper.
3. **Rewrite in place.** Interface strings get standard wording. Helper strings follow "How a helper teaches." Keep the meaning and every figure. Read the engine before you change what a line claims. If you can't tell what a line means, record that as a finding and leave the line.
4. **Never rewrite machinery.** Don't touch ids, routes, test hooks, icon names, SVG paths, formal documents (orders, the oath, Record entries) or anything the engine composes from data you can't see. Keep every `{…}` placeholder and its meaning.
5. **Find the tests that read the old words.** Search the tests and the browser specs for the old string, update them, and run the specific test files. A copy change must not break a test silently.
6. **Run the gate.** `node scripts/verify-player-prose.mjs` must pass, then `--update-baseline` so the ratchet shrinks.
7. **Read it aloud.** The question is whether a patient teacher would say this to one person. Check three more things. No colon leads a label into a sentence. No two neighboring lines open the same way. No line restates the heading above it.
8. **Place haiku sparingly.** Only where the doctrine allows, from the authored registry, never in a form, error, warning or work surface.
9. **Report** the directory, the count of strings changed, the findings you left, and which tests you ran.

## Coverage checklist

- [ ] **founding**: every stage in `FOUNDING_STAGE_IDS` has a line saying what it commits the President to
- [ ] **core loop**: Continue, what stops the world, and the Brief's ranking
- [ ] **the map**: lenses, detachment, and what a dot's color and size mean
- [ ] **metrics**: what each reading means and what a low reading costs
- [ ] **decisions**: assessed bands, counsel, the do-nothing baseline, what a decision leaves on the Record
- [ ] **Congress**: bills, votes, the Speaker, divided government
- [ ] **world**: how other capitals read you, and what moves them
- [ ] **removal and elections**: the calendar, and the pressure that ends a presidency

Avoid duplicates that restate the same sentence with different words. Merge or sharpen instead.

## Authoring workflow

1. Name the player confusion this guidance removes (one glance question).
2. Find the module; add the entry there, never in a component.
3. Write the answer: a plain definition, then what happens if the player ignores it.
4. For founding, say where the choice lands, in the words the screens use.
5. Read it aloud: would a player who never opened the Record still know what to do?
6. Run the player-core tests, then look at the surface in the running game.

## Good vs bad

**Good:** `Every plank you run on becomes a promise with a date on it. Keep it and the voters it courted stay with you; break it and they remember.`

**Bad:** `The platform seal writes a PledgeLedger consumed by the weekly pledge phase.` (engine vocabulary, no player consequence)

## Anti-patterns

- Scenario flavor or current-memo text in guidance.
- God Mode or studio-only mechanics unless the player surface exposes them.
- Guidance that repeats an on-screen caption verbatim without adding meaning.
- Walls of text: if it needs four sentences, it is two entries.

## References

- Glossary module: `packages/player-core/src/glossary/`
- Founding stages: `packages/player-core/src/campaign/founding-stages.ts`
- Metric glosses: `packages/player-core/src/format/figures.ts` (`METRIC_MEANINGS`)
- Where guidance appears: `docs/DESIGN.md` (§1 shared patterns, "First run"; §2 search and founding)
- Product intent: `docs/NORTH_STAR.md`
