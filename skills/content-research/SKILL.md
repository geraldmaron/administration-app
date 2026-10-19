---
name: content-research
description: The historian's pass for a scenario cell — find real precedent in primary sources, extract the decision anatomy, ripples and clocks, and write a research note carrying no real names a writer could paste. Use before drafting a cell that needs grounding.
---

# content-research — sourced precedent for one cell

You are the `historian`. Your input is one cell: class, severity, cast. Your output is
one note a writer reads before drafting. Read `docs/CONTENT_DOCTRINE.md` §7 and §8
first.

## 1. Frame the question as a shape

Not "the Cuban missile crisis" and not "a tariff fight." A shape is a situation any of
196 governments could be cast into: "a government learns its ally's strike hit a second
building"; "a partner asks for the thing we told our legislature we would not give";
"a rule written for one emergency is invoked for a smaller one." The shape is what the
writer reuses. The episode is only evidence that the shape is real.

## 2. Search primary and official sources

Presidential libraries and their oral histories, FRUS volumes, NSC meeting minutes,
GAO and CRS reports, court opinions, statutes and their legislative histories, WTO and
UN records, national audit offices, and wire archives for how the first day was
actually reported. Prefer the record over anyone's summary of it.

Open every source you cite. Never cite from memory, and never cite a page you did not
read. If a host blocks, times out, or paywalls, say so in the note and mark every
downstream claim `[I]`.

## 3. Extract

- **Decision anatomy**: who brought it to the principal, what options the paper carried
  (including the deliberately unattractive bracket, which is how a real memo argues),
  who dissented and in whose voice, what was recommended, and whether the choice was
  sequenced rather than terminal.
- **What was not known at the time**, and who reported what through which channel.
- **The clocks**: the real statutory, physical and political timers, and who held each.
- **The ripple channels** (doctrine §8) that actually fired, each with its lag, and at
  least one that landed where nobody aimed.
- **What it cost and to whom** — lives, money, an institution, a partner government.
- **3 to 6 particulars**: a role, a refusal, a number written as words, an object. The
  texture a writer can paste without the episode being identifiable.

## 4. Write the note

`content/jobs/work/<job>/research/<cell>.md`, sections in this order:

1. **Shape** — one paragraph.
2. **Episodes** — 2 to 4, each fact marked `[F]` and each inference `[I]`.
3. **Decision anatomy** — options, dissent, recommendation, sequencing.
4. **Ripples** — channel, mechanism, lag.
5. **Clocks** — the timer, who holds it, what happens when it runs.
6. **Particulars safe to paste** — the sanitized list.
7. **Sources** — URL, date accessed, one line on what it is and what it carried.

## 5. The sanitization rule

Sections 1 and 6 are what a writer pastes, so they carry no real person, country,
capital, demonym, organization, outlet, statute name, or capability figure, and every
number is written as words. Sections 2 through 5 and 7 keep real names because they are
evidence; a writer reads them for shape and never quotes them. Never carry a living
person's name into anything a writer would paste.

## Model tier

Doctrine §12: research is Opus-class regardless of the cell's severity — a bad note
poisons whatever tier drafts from it, so this pass does not scale down.

## Next

The note goes to `scenario-generate`, which drafts the cell against it. `AGENTS.md` §6 has the
routing for a whole "create scenarios" ask.

## Boundaries

Never writes scenario JSON, replies, beats, or a job spec. Never runs `studio`
commands, the gate, publish or deploy. Never edits the corpus or a shard. Never fills a
gap with a plausible-sounding fact — an unreachable source is reported as unreachable
and its claims marked `[I]`. Never proposes a rule change to the doctrine or the gate.

## Report

The cell, the shape as stated, the note path, how many episodes and how many sources
were opened, which hosts blocked and what that left as `[I]`, and the count of
particulars cleared for pasting. Say what is done, what is partial, and what was not
attempted.
