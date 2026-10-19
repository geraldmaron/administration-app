# The Administration — AI Development Guide

## Project

Multi-platform political simulation game.

**The game.** The player is the **President of the United States** among the 196 governments a President deals with (the 193 UN members plus Taiwan, Kosovo and Palestine). `docs/NORTH_STAR.md` is the intent and `docs/DECISIONS.md` holds the standing rules, each with its reason. The table below is the pnpm-workspace layout; `docs/BACKLOG.md` is what is left before ship; `docs/PLAN.md` is where the work stands; the current program is `docs/audits/2026-10-10-map-first/PROGRAM.md`.

**The player is one universal Expo app for iOS, Android and the web** (DECISIONS.md §8.1, owner direction 2026-10-16): `apps/player` (Expo Router) on the Tamagui design system in `packages/ui`. Electron packages the same app's web export for Windows/macOS and Steam. Phone, tablet and desktop have task parity: a President can investigate, compare, configure, review, authorize and observe the same work at any size. Compose 390×844 and 1440×900 together, then verify intermediate widths, 320px reflow, 1280×800 and 1920×1080. `apps/web` and `packages/ui-web` are the frozen legacy DOM player, deleted at parity; no new feature lands there. Engine, world, content, contracts, player-core and design never import a renderer (React, React Native, Expo, Tamagui); `packages/ui` never imports a router, a host or the simulation. `scripts/verify-renderer-boundary.mjs` and `eslint.config.mjs` enforce that. The rebuild program is `docs/audits/2026-10-16-universal-player/PROGRAM.md`.

**Visual direction.** Read `docs/DESIGN.md` before player UI work. The accepted operations workspace uses theme-aware analytical surfaces, institutional navigation, grouped tasks, full-data collections, formal documents and shared presidential review/confirmation. Read DECISIONS §8.9–§8.12 and the application-wide visual-layer contract in `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`; all routes, contextual help, target-only expansion, themes and processing states are in scope. Under DECISIONS §8.8, maps appear where geography answers the question; do not restore the retired persistent-map shell. Institutional emblems are authored, never official (§8.10); classified material carries the government's own banner convention (§8.11); every power cites the law that grants it (§8.12). Use the canonical app identity (`assets/player/brand/README.md`) and navy, red, white, blue and gold as anchors. Tokens (`packages/design`) and primitives (`packages/ui`) are shared implementation, not unchangeable aesthetic precedent. Update them when needed.

**Design workflow.** Current user instructions take precedence over earlier aesthetics. Implement and iterate within authorized scope without a separate proposal-approval loop or compulsory agent handoff. Verify the live result; a passing build is not visual approval. Role descriptions are expertise references, not permission to launch agents. Follow the user's delegation preference. Artifact-generation skills apply to their stated output types; print restraint and low-fi planning guidance do not govern the interactive player. A dashboard heuristic must not erase this product's identity as a game.

| Directory | Stack | Purpose |
|-----------|-------|---------|
| `packages/engine/` | TypeScript | Pure deterministic simulation engine. No I/O, no UI, no network. |
| `packages/world/` | TypeScript + zod | The dataset: Nation/Person/Relationship/etc. schemas + the dataset validator (shipped). |
| `packages/content/` | TypeScript | Authored content schemas, audit rule family, validator. |
| `packages/ui/` | TypeScript + React Native + Tamagui | The design system: theme from `packages/design`, primitives, shell, data, document and identity components. Source-only; no router, host or simulation imports. |
| `packages/ui-web/` | TypeScript + React DOM | Legacy DOM design system, frozen until cut-over. |
| `packages/design/` | TypeScript + CSS | Platform-neutral tokens. No renderer. |
| `packages/player-core/` | TypeScript | Presentation-independent player logic. Must not import DOM, React, React Native, Expo, Tamagui, Electron or Steam. |
| `packages/contracts/` | TypeScript | Shared API/DTO types. No logic. |
| `apps/player/` | Expo (Expo Router) + React Native + Tamagui | The player for iOS, Android and the web; its web export is the static deploy and what Electron hosts. |
| `apps/web/` | Vite + React DOM + TanStack Router | Legacy DOM player, frozen until `apps/player` reaches route parity. |
| `apps/desktop/` | Electron Forge | Host for the player's web export. Filesystem saves, Steam facade. |
| `apps/studio/` | Plain ES modules + a hand-written dev server | Internal content/dataset console. Not player-facing. No sign-in gate — single-operator, localhost-only. |
| `services/api/` | TypeScript | Accounts, the entitlement verifier port (no storefront verifier yet), and the starter-pack manifest audit. |
| `studio-cli/` | TypeScript | The generation harness CLI: jobs, drivers, validators, publish. |
| `scripts/` | Node (.mjs, plus a few .ts harnesses) | The proof gates (`verify-*.mjs`, most with a `-proof` twin), dataset bake and vendor scripts, measurement harnesses, and `scripts/dev/` tools. |

## Before Starting Any Task

1. Read `docs/NORTH_STAR.md` for invariant intent, `docs/PLAN.md` for active execution state, and the `docs/BACKLOG.md` items for the scope you are about to work.
2. Read the relevant source files before proposing changes
3. Validate assumptions; never implement on guesses
4. Use the recorded baseline and run short, targeted checks only where changed behavior or risk requires them during construction. Owner direction (2026-10-12): bulk workspace tests, proof sweeps, browser matrices and balance come at the stable integration checkpoint, not before or after every slice. See BL-137 and the local validation cadence in `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`. Required final checks remain required; documentation-only work does not need an application build.

## Doc layer cadence

| Doc | Purpose |
|---|---|
| `docs/NORTH_STAR.md` | Invariant intent. Changes only when the *intent* of the game changes. |
| `docs/STRATEGY.md` | Phased route to the North Star. Updated per phase gate. |
| `docs/PLAN.md` | Where the work stands: branches, waves, the last gate, what the owner is waiting on. |
| `docs/BACKLOG.md` | The one backlog: every open item with its full text, acceptance and evidence, plus a closed log. Changes in the same commit as the work that opens or closes an item. |
| `docs/DOC_SYNC_MAP.md` | The doc-sync contract read by change class. |
| `docs/IMPACT_MODEL.md` | Incident impact model contract (v1, provisional calibration). |
| `docs/IMAGE_GENERATION_SPEC.md` | Scene and ambient image rules. |
| `docs/ABOUT_THE_GAME.md` | Plain-words pitch. |
| `docs/CONTENT_PLAN.md` | What content the game needs, at what volume, and what it costs to produce. |
| `docs/CONTENT_DOCTRINE.md` | How authored content is researched, written, priced and reviewed: the score in plain words, what content can and cannot move, craft and realism rules, ripples, replay properties, the writers' room roster. Every content agent and skill loads it first. |
| `docs/DECISIONS.md` | The standing rules, each with its reason and where it is held. A rule changes only by an edit to this file. |
| `docs/SCHEMA.md` + `docs/ARCHITECTURE.md` | Canonical data shapes + system architecture. |
| `docs/DESIGN.md` | Single maintained player design brief: the map, screen classes, lenses, modes and screens. |
| `docs/audits/2026-10-10-map-first/` | The current program: `PROGRAM.md` (engine and data changes, waves, proof), the capability ledger and the gate records (`gates/`). |

Git history keeps every retired document. Don't cite a deleted document as authority; check the claim against `docs/DECISIONS.md` and source.

## Code Conventions

**TypeScript**
- Strict mode; no `any` without explicit justification
- Modern ES6+ syntax; async/await over raw promises
- Immutable patterns preferred; no in-place mutation
- Functions < 50 lines; files < 800 lines for logic, enforced by `scripts/verify-file-size.mjs`. Authored data tables (name banks, the nation roster, `packs/core.ts`) are exempt by name in that script — a flat data table's length is its content, not a design smell. A handful of logic files already over budget when the gate landed are grandfathered at their measured size (`LOGIC_DEBT` in the script) so today's debt cannot get worse while it waits to be split; anything else crossing 800 lines is a new violation and fails

**Expo + Tamagui (apps/player, packages/ui)**
- One route tree (Expo Router, `apps/player/app`); adapt on width through the theme's media tokens, never on a platform flag in a screen. A genuine platform difference is a `.native.tsx`/`.web.tsx` pair behind one interface in `packages/ui` or `apps/player/src/host` (DECISIONS §8.5)
- One design system in `packages/ui`, themed from `packages/design`. Style values name theme roles and tokens (`color="colorSecondary"`, `gap="md"`); Tamagui v3 takes them bare, with conditional states as objects (`backgroundColor={{ default: "surface", hover: "surfaceHover" }}`). No raw hex outside `packages/ui/src/theme`
- A screen composes `@admin/ui` and reads player-core view models; `packages/ui` never reads the engine or player-core
- Expo Router treats `apps/player/src/app` as the routes folder if it exists, so app code lives in `src/device`, `src/host`, `src/shell` and feature folders, never `src/app`

**React DOM (apps/web)** is the frozen legacy player. Fix only what blocks the cut-over.

**All Languages**
- Why-comments only — no point-in-time comments, no name-restating doc comments
- Explicit error handling; never silently swallow errors
- Handle errors at every layer; don't let them propagate as unknowns

## Agent Roles

Full specs: `.claude/agents/<role>.md` (indexed in `.claude/agents.md`)

| Agent | Owns |
|-------|------|
| `orchestrator` | Complex multi-step coordination, sequencing specialists |
| `architect` | Data models, module contracts, world dataset schema, API design |
| `engineer` | TypeScript implementation across engine, world, content, player and services |
| `ai` | Prompt engineering, model selection, LLM evaluation, context architecture |
| `design` | UI components, design system, motion, Tamagui + `packages/ui` |
| `accessibility` | Semantic HTML and ARIA, desktop screen readers (VoiceOver, NVDA, JAWS), keyboard and focus, text scaling and zoom, cognitive load |
| `qa` | Test strategy, coverage analysis, regression — Vitest |
| `ops` | OWASP security, CVEs, GDPR/App Store compliance |
| `reviewer` | Correctness, logic, conventions — pre-merge gate |

The writers' room (authored content; doctrine in `docs/CONTENT_DOCTRINE.md` §11):

| Agent | Owns |
|-------|------|
| `content-lead` | Planning cells against coverage, cast mix, severity and arc debt; sequencing the room; never drafts |
| `historian` | Sourced real-world precedent for a cell: decision anatomy, ripples, clocks, safe-to-paste particulars |
| `analyst` | Conditions and casts a cell can honestly gate on, magnitudes, band-vs-prose, reachability |
| `scenario-writer` | ScenarioDef JSON against the brief, the doctrine and the research note, through the gate |
| `news-editor` | Consequence cards, feed and press lines, aftermath framing |
| `continuity-editor` | The arc ledger: dead branches, flags nothing reads, monoculture across batches |
| `content-reviewer` | The independent layman's read in a session that did not draft; the review record |

When the user authorizes specialist delegation, suggested routing for most tasks: `engineer` → `qa` → `reviewer`
With authorized delegation, cross-cutting changes: `orchestrator` → `architect` → `engineer` → `qa` → `reviewer` → `ops`
Content batches: `content-lead` → `historian` → `analyst` → `scenario-writer` / `news-editor` → `content-reviewer` (separate session); publish and deploy stay with the owner

## Doc Sync Contract (BLOCKING)

When any of the following change, you **MUST** update `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change. Doc drift is a **blocking review finding** — no exceptions. `docs/DOC_SYNC_MAP.md` reads this contract by change class.

- World dataset schemas (`packages/world/src/schemas/` — `Nation`, `NationStats`, `NationTraits`, `NationBands`, `Relationship`, `Person`, `Organization`/`Cradle`/`Charter`, `WorldDataset`)
- The dataset validator's check set (`packages/world/src/validate/dataset-validator.ts`)
- The engine's public contract once shipped (`packages/engine` — `EffectPacket`, `Campaign` state, `apply()`)
- The loop's public contract (`packages/engine/src/advance.ts`'s `AdvanceResult` and `advanceUntilAttention`, `packages/engine/src/attention.ts`'s `AttentionStop`) — this is the one function the app and the balance harness both drive the world with; a change to what it returns or when it stops changes what every surface that reads a stop or a digest is showing
- The dependency-direction lint rule (`eslint.config.mjs`'s `packages/engine` override)
- The band derivation (`packages/world/src/dataset/bands.ts`) — a change to how a band is computed changes what all content targets
- The authored-field consumer registry (`packages/world/src/dataset/stat-consumers.ts`) — adding a field to `NationStats`, `Nation.geo`, `NationTraits` or `Person` requires a registry entry naming its consumer, or the paired test fails
- The scoring constants a writer reasons about (`packages/engine/src/opinion.ts`'s `OPINION_WEIGHTS`/salience multipliers/`MAX_TURN_POLARIZE`/`POLARIZATION_DECAY`, `packages/engine/src/removal.ts`'s `PRESSURE_WEIGHTS`/`BEAT_THRESHOLDS`) — update `docs/CONTENT_DOCTRINE.md` §2 in the same change. The gate that compared them was removed in `8caf5b441`, so the reviewer checks it.
- The cabinet-sweep constants the person dossier states as prose (`packages/engine/src/cabinet.ts`'s `CHALLENGE_AMBITION_FLOOR`/`CHARISMATIC_AMBITION_DISCOUNT`/`INTEGRITY_RESTRAINT`) — `packages/player-core/src/dossier/attribute-consequence.ts` restates them to generate the sentences a player reads, so retuning one without the other tells the player a number the simulation no longer uses. `scripts/verify-person-consequence-alignment.mjs` fails on the drift.

Player metrics and removal logic are documented in `docs/ARCHITECTURE.md` §3, the live source of truth.

## Code Review Checklist

Every PR must pass before merge:

- [ ] TypeScript strict — no new `any`, types correct throughout
- [ ] Tests added or updated for all changed behavior
- [ ] No hardcoded secrets, credentials, or tokens
- [ ] No silent error swallowing (`catch` blocks must handle or rethrow)
- [ ] Functions < 50 lines, files < 800 lines
- [ ] Immutable patterns — no direct object/array mutation
- [ ] **Doc sync** — `docs/SCHEMA.md` + `docs/ARCHITECTURE.md` updated if any listed surface changed
- [ ] Every `docs/BACKLOG.md` item this change closes has its acceptance met, with the proof recorded on the item

## Key Contracts

Understand these before touching the engine, the world dataset, or the harness:

| File | Purpose |
|------|---------|
| `docs/DECISIONS.md` | The standing rules: engine, time, cases, dataset, geography, economy, content, platform, saves, God Mode, portraits, tooling. Read first. |
| `docs/DESIGN.md` | Single maintained player design brief and acceptance |
| `docs/ARCHITECTURE.md` | End-to-end system architecture |
| `docs/SCHEMA.md` | World dataset schema — authoritative |
| `docs/NORTH_STAR.md` | Player-facing intent |
| `packages/world/src/schemas/index.ts` | Nation/Person/Relationship/Organization/Cradle/Charter zod schemas |
| `packages/world/src/validate/dataset-validator.ts` | Dataset validator: shape, referential integrity, plausibility, unit consistency |
| `eslint.config.mjs` | The `packages/engine` dependency-direction lint |

## Branches and the merge flow

Written down 2026-09-10, because until then it existed only as assertions inside
CI comments — and the one thing it asserted was already false: `staging` had
fallen twelve commits **behind** `main`, which is the one state this flow exists
to prevent.

```
feat/* | fix/*  ──merge──▶  staging  ──merge──▶  main
  the work          (integration)      (what ships)
```

**`staging` is the integration branch and must never be behind `main`.** Every
working branch merges into it, and it is the branch a regression reaches first.
If `git rev-list --count staging..main` is not zero, that is a defect to fix
before anything else — merge `main` into `staging` and find out how it happened.

**`main` is what ships.** It moves only from `staging`.

**Merge with `--no-ff`.** A fast-forward erases the boundary of a wave, and this
repository reverts by the wave. Staging's history is merge commits for exactly
this reason.

**What must be green before a working branch merges into `staging`** — in this
order, because the order is load-bearing:

```bash
find . -name tsconfig.tsbuildinfo -not -path '*/node_modules/*' -delete
pnpm run build        # ALWAYS before typecheck; see the dist/ note below
pnpm run typecheck
pnpm run lint
pnpm run test
for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done
pnpm --filter @admin/engine run test:balance   # by hand; nothing runs it automatically today (see the Test Commands note)
```

Then rebuild and commit `dist/`. No gate compares the committed `dist/` with
source any more (`8caf5b441` removed the freshness gate with the other
internal-only gates), so check it by hand: after a clean build and the commit,
`git status --short -- '*/dist/*'` prints nothing.

**A wave close-out is part of the gate, not paperwork after it.** WL landed
through four merges and was never gated: `docs/PLAN.md` went on saying "not
landed, do not start W4" while the code was in the branch, `plan.md` said W4
had landed, and the merged tree carried five typecheck errors, two lint errors,
eight failing tests and ten red verify gates — every one a collision between
two lines that each passed their own gate. So at every landing, in the same
commit as the work:

1. Write `docs/audits/<program>/gates/<wave>.md` and report what was actually
   run. "Recorded separately once run" is refused; if a step was not run, say
   so and say why.
2. Give the wave one status in `docs/PLAN.md`, measured against source rather
   than against what any doc already claims. "Partly landed, not closed" is a
   legitimate status and is not a close-out.
3. Reconcile `docs/BACKLOG.md` for the scope that just landed, against source,
   because earlier passes contain false verdicts. Move every item the wave
   finished to `## Closed` with its commit and proof; rewrite every item the
   wave touched but did not finish so its text matches the tree; give every
   deferred item a named new home; and add what the wave found.

No gate holds any of these. `8caf5b441` removed the close-out gate and the pin
ledger it read, so all three are by hand.

**Branch protection is unavailable on this repository's plan** (a private repo on
Free gets 403 from the protection endpoint, which is the plan declining the
feature rather than the setting being off). Nothing above is enforced by GitHub.
It is convention, and the gates are what actually hold it. If the plan ever
offers it, require the `build-test` status check (rebuild-ci.yml's job) on main.

**Two standing prohibitions, both learned the hard way** — see the memory notes
of the same names: never `git add -A` in this repository (parallel sessions share
one tree, and an add-all plus a reset orphaned 61 commits), and never `git stash`
(old stashes from dead branches resurrect deleted files). Pin anything you are
about to move under `refs/safety/` first; it costs nothing and this repository
has lost work twice.

## Test Commands

```bash
# The rebuild workspace (packages/, apps/, services/, studio-cli — pnpm)
pnpm install
pnpm run build        # every package, one command
pnpm run typecheck
pnpm run lint          # includes the packages/engine dependency-direction rule
pnpm run test
# The balance harness is NOT in `pnpm run test`. It simulates whole campaigns
# over 4-12 seeds. .github/workflows/balance-harness.yml would run it weekly, but
# a schedule fires only from the default branch; as of 2026-10-08 that file is
# not on main and every workflow is disabled on GitHub, so nothing runs it
# automatically. Run it by hand before anything that depends on the numbers (a
# retune of opinion, removal, the impact model, the ladder, or the cabinet):
pnpm --filter @admin/engine run test:balance

# The proof gates: every scripts/verify-*.mjs, found by glob, after the build.
# scripts/README.md explains gates, their -proof twins and the ratchet baselines.
for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done
pnpm --filter @admin/web run test:e2e   # legacy player until cut-over
pnpm --filter @admin/player run typecheck
pnpm --filter @admin/player run export:web      # then serve dist/ and drive it with Playwright
pnpm --filter @admin/player run export:native   # bundles iOS and Android; no simulator runs in CI or the cloud container

```

**`dist/` is tracked in git for every `tsc -b` package.** `tsc -b` is incremental
against `tsconfig.tsbuildinfo` and emits nothing while exiting 0 when that file
is stale, so a build can silently no-op and a commit can carry source without
its compiled output — which every cross-package consumer then imports. Commit
regenerated `dist/` alongside the source change, and if a build looks like it
did nothing, delete the package's `tsconfig.tsbuildinfo` and build again.

**Never run `pnpm run typecheck` before `pnpm run build` when you intend to
commit `dist/`.** Every package is `composite: true`, and `tsc --noEmit` on a
composite project still writes `tsconfig.tsbuildinfo`, recording a program that
was checked but never emitted. The next `tsc -b` believes it and emits
incrementally, producing different declaration bytes than a full emit for the
schema-heavy modules — zod enums and objects come out with their keys in another
order. The result is a handful of `.d.ts` files that look stale on every machine
that happened to typecheck first, and clean on every machine that did not. If a
clean build changes `dist/` files you never touched, delete every
`tsconfig.tsbuildinfo` and rebuild before believing it. CI builds first for this
reason.

## Backlog and tracking

Work is tracked in tracked files and nowhere else.

- **`docs/BACKLOG.md` is the one backlog.** Every open item lives there with its full text: what is wrong or missing, its acceptance criteria, its evidence (file:line, test or capture), what blocks it, and the wave or program that owns it. Work that is not in `docs/BACKLOG.md` is not tracked.
- **`docs/PLAN.md` is the week-of view:** the wave table and the current status. It names backlog items by id and does not restate them.
- **Item ids of the form `admin-…` are legacy labels.** The items still open on 2026-10-08 moved into `docs/BACKLOG.md` under those ids, so a citation of one resolves there. Any other `admin-…` id in an older commit message no longer resolves: read what the citing text says, and check the claim against source.
- **Do not run `bd` here.** The retired tracker's `bd init` and `bd setup` write their own instruction blocks into AGENTS.md, CLAUDE.md and the Claude settings, and `bd prime` and `bd onboard` print workflow text meant to be hook-injected or pasted. None of them runs in this repo. No other tracker, Construct's `work` ledger included, runs beside `docs/BACKLOG.md`.
- **Memory is recall, not status.** Auto-memory notes hold cross-session knowledge only and never track work.

### Working the backlog

1. Before non-trivial work, read the `docs/BACKLOG.md` items for the scope you are about to touch and check each against source; earlier passes contain false verdicts.
2. Open an item in the same commit that finds the work; a new item takes the next free `BL-<n>` id.
3. Close an item in the same commit as the work that finishes it: move it to `## Closed` with the date, the commit and the proof. A close that cites a commit which is not an ancestor of the current branch is not a close.
4. One writer per file: in a parallel wave the integrator is the only session that edits `docs/BACKLOG.md`.
5. Code comments never cite a backlog item id; say the reason inline.
6. The backlog moves with its branch and is pushed only when the owner asks.

## Agent coordination (Claude Code ↔ Codex)

Cross-agent roles, rules, and handoff protocol for this repo are the single source of
truth in `COORDINATION.md` (imported below). Read `HANDOFF.md` for live session state.

@COORDINATION.md
