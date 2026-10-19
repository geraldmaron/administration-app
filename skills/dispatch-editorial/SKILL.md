---
name: dispatch-editorial
description: >-
  Authors wire articles, feed headlines, and diplomatic readouts with modern
  newsroom layout grammar — outlet voice, lede, dek, dateline, topic tags, and
  scene facet hints for photography. Use when writing dispatch copy, press feed
  lines, article banks, or enriching FeedItem/ArticleFacts for immersive
  presentation. Loads docs/CONTENT_DOCTRINE.md first; pairs with news-editor
  for consequence cards.
---

# dispatch-editorial — wire copy that reads like a newsroom

Player-facing news is composed at read time from `FeedItem` records
(`packages/engine/src/article.ts`). This skill governs how that copy is
**authored** so it lands with weight: masthead, dek, byline, reading time,
topic tags.

Read `docs/CONTENT_DOCTRINE.md` in full before drafting. The piece renders on
the dispatch screen (`docs/DESIGN.md`, `/record/press/dispatch/:id`), which the
map-first player has not built yet.

## Outlet voice

Fictional mastheads only. `PRESS_OUTLETS` in `packages/engine/src/press-outlets.ts`
is the roster: each outlet's name, its beliefs on the three ideology axes, and
the posture toward the executive derived from them. Read it there rather than
from a copy. The outlets are fictional analogues of the real landscape by
format, lean and reach; foreign outlets and state media are in
`packages/engine/src/press-foreign.ts`.

Match lede register to outlet lean. A hostile masthead does not print "officials
said" without a skeptical frame.

## Article anatomy

Every wire piece needs:

1. **Headline** — specific, active, names the actor and act (not "tensions rise").
2. **Standfirst (dek)** — one sentence: stakes + why the desk cares.
3. **Lede** — first body paragraph, ≤35 words, answers who/what/where.
4. **Graf 2–3** — particulars: figures, institutions, clocks. No filler texture.
5. **Byline** — `By the {desk} · filed week {n}` or `From {capital}, week {n}`.
6. **Topics** — 1–2 tags: Security, Trade, Congress, World, Media, Domestic.

For scenario-tied stories, set `scene` on `ScenarioDef` per `packages/content/src/scene.ts`.
No player module resolves scene stills yet, and `docs/DESIGN.md` doesn't
currently place photography on a screen.

## Hard rules

- No real outlets, people, countries, or landmarks.
- American vocabulary for the player's government (doctrine §10).
- Every paragraph must be about the headline event — no interchangeable texture.
- Figures where the story has magnitude; band-vs-prose per analyst calibration.
- Intelligence visibility: hedged language, moderate confidence, no omniscient claims.

## Procedure

1. Identify the cell: feed kind, actor/target nations, visibility, facts payload.
2. Pick outlet from hash or press standing (engine already does this for `press` kind).
3. Draft headline + standfirst + 2–3 paragraphs + byline + topics.
4. If authoring `ArticleFacts` extensions, keep fields JSON-safe and validator-clean.
5. Hand to `content-review` in a separate session if part of a publish batch.

## Pairs with

- **news-editor** — consequence cards and aftermath feed lines
- **scenario-writer** — decision room copy (memo voice, not wire voice)
- **content-research** — precedent for realistic ripple and clock language

## Commands

Feed items are engine-produced, not job-file authored today. When extending the
schema:

```bash
node studio-cli/dist/cli.js corpus stats
pnpm --filter @admin/engine test -- article
```

Scene still batches:

```bash
node studio-cli/dist/cli.js scene-batch --help
```

## Checklist

- [ ] Headline names actor + act
- [ ] Standfirst states stakes in one line
- [ ] Lede ≤35 words, specific
- [ ] No real outlet/person/country
- [ ] Outlet voice matches masthead lean
- [ ] Topics tagged (1–2)
- [ ] American vocabulary on player's government
- [ ] Scene facet honest for the story severity
