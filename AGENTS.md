# AGENTS.md — The Administration

Entry point for any agent or harness (Codex, OpenCode, Cursor, Claude Code, or a
person with an editor) working in this repo. If you are here to write player-facing
content — scenarios, consequence cards, arc readers — read this file, then
`docs/CONTENT_DOCTRINE.md`, then go to §3 below. If you are here to write code, this
file still applies; also read `CLAUDE.md` for the full engineering conventions
(TypeScript strictness, file-size limits, the doc-sync contract, the build/test
commands, the `dist/` freshness trap).

## 1. What this project is

A multi-platform political simulation game: the player is the President of the
United States, briefed on one to three decisions on a week the desk deals,
among 195 other governments that act on their own; the game advances until
a decision is needed rather than stopping on a fixed weekly clock. The game is
played on one persistent dotted map (`docs/DESIGN.md`), and the standing rules are
in `docs/DECISIONS.md`. The workspace is a
pnpm monorepo: `packages/engine` (deterministic simulation), `packages/world` (the
dataset), `packages/content` (authored content schemas + validator), `packages/design`
(tokens), `packages/ui-web` (React DOM design system), `packages/player-core`
(presentation-independent player logic), `apps/web` (the Vite player), `apps/desktop`
(Electron host), `apps/studio` (internal content console), `studio-cli` (the
generation harness CLI), `services/api`.

## 2. The doctrine to load first

`docs/CONTENT_DOCTRINE.md` is the writers' room's constitution — every content
agent and skill loads it before doing anything. It says how content is researched,
priced, and reviewed, and why. Where it conflicts with a generation brief's gate
list, the gate wins: the validator is final and the doctrine never loosens it. For
engineering work, `CLAUDE.md` plays the same role.

## 3. The content room, in five steps

> **Hold lifted (owner, 2026-10-18).** The 2026-10-12 hold on drafting and publishing scenarios is lifted: reviewed repairs (BL-252) and the remaining scenario items publish through the path below. The owner's bar from the hold still applies to every scenario: open on how the situation came about, give the player a reason to be in that place among those people, and carry a named place or person forward (`docs/audits/2026-10-12-grounded-casting/`). Accepting the casting pilot's nine placement patches is a separate open decision (BL-147).

1. **Plan.** Measure the corpus, then choose cells (`class:cast:severity:count`):

   ```bash
   node studio-cli/dist/cli.js corpus stats
   node studio-cli/dist/cli.js corpus arcs
   node studio-cli/dist/cli.js consequences coverage
   ```

2. **Research.** For each cell that needs grounding, find real precedent and write a
   research note with no real names a writer would paste (`content/jobs/work/<job>/research/<cell>.md`).

3. **Build the job and materialize briefs**:

   ```bash
   node studio-cli/dist/cli.js scenarios job <job-id> <class>:<cast>:<severity>:<count> --driver session
   node studio-cli/dist/cli.js scenarios run <job-id>
   ```

   (Consequence cards use `consequences job` / `consequences run` instead; see
   `content/WRITERS_ROOM.md` for the full grammar of both.)

4. **Write.** For each `<item>.brief.md` in `content/jobs/work/<job-id>/`, write
   `<item>.out.json`. Read the brief in full, `docs/CONTENT_DOCTRINE.md`, and the
   research note first. Re-run `scenarios run <job-id>` until every item journals
   done; a rejection writes `<item>.findings.json` naming the defect.

5. **Review, then publish.** Hand the finished batch to a fresh, independent
   context (a subagent or a different session) for `scenarios review <job-id>` /
   `consequences review <job-id>`. The reviewer must not be the drafter — a
   self-review marks the batch `provisional` and blocks publish without the
   owner's explicit override. A reviewed scenario batch then finishes through the
   publish tail in `skills/scenario-ingest` (§5 has the rule).

Full procedure, per-skill detail, and the model-tier routing table:
`content/WRITERS_ROOM.md`.

### 3.1 Scenarios drafted outside the repository

A chat session with no repository access (any assistant, or a person) can write
scenarios from the authoring kit and hand back one JSON file. The kit is committed
at `content/kit/` (start at its `INSTRUCTIONS.md`; `NEEDS.md` says what to write
when nobody has said), the bake rewrites it, and `scripts/verify-kit-current.mjs`
fails when it is stale. After changing a rule it carries, regenerate it with
`node studio-cli/dist/cli.js scenarios kit` and commit it with the change.

**Recognize a dropped file.** If the owner points you at a file (often in
`content/inbox/`) whose top level is
`{ "kind": "administration-scenario-batch", "kitVersion": ..., "scenarios": [...] }`
and says "ingest it", follow `skills/scenario-ingest/SKILL.md`. It starts with
`node studio-cli/dist/cli.js scenarios ingest <file>` and ends with the batch
gated, reviewed, published into the local corpus, committed locally and cleaned
up, or returned to its author with a findings file.

## 4. The file contract (why any harness works here)

The contract is the filesystem, not the tool. A job command writes one
`<item>.brief.md` per cell; a drafter writes `<item>.out.json` beside it; running
the job command again is the gate, which writes `<item>.findings.json` on rejection
or journals the item done on acceptance. The journal is the one truth of what's
done — never a chat transcript. Any agent that can read a file, write a file, and
run `node studio-cli/dist/cli.js ...` from the repo root can sit at this desk.

## 5. Safety rules (apply to every agent, every harness)

- **Session driver only.** No OpenRouter or paid-driver spend without the owner's
  recorded authorization.
- **Never weaken the validator.** If a gate finding seems wrong, fix the content
  anyway or stop and say so. The gate's word is final.
- **Publish only after the gate and an independent review; never deploy or push.**
  The owner authorized on 2026-10-12 that an agent may publish a scenario batch
  into the local corpus, bake it and commit locally by path, through the publish
  tail in `skills/scenario-ingest`, in two cases:
  - **Ingested.** A batch drafted outside the repository, after the gate and a
    review by the ingesting agent, which did not draft it. If that agent rewrote
    it for craft, it is no longer independent: the batch stops before publish.
  - **Drafted here.** A batch this session drafted, only after a review by a
    fresh, independent context it did not draft in: a subagent or a separate
    session, at a model tier at least as strong as the drafter's. Where the
    harness cannot start one, the session stops before publish and leaves the
    batch ready for review with a one-line handoff.

  Uploading a content set, deploying and pushing stay the owner's.
- **Reviewer ≠ drafter, always.** Review runs in a context that did not write the
  batch (a subagent or another session), at a model tier at least as strong as
  the one that drafted it.
- **No real living people, no real outlets.** Never, anywhere a writer would paste.
  People in scenarios are roles, never a rank welded to an invented surname.
- **Casting neutrality, not world fiction.** The world is real: all 196 governments in
  `packages/world/src/dataset/nations.ts` are real countries and the player is the
  President of the United States. The player's charter is the US Constitution, so
  prose about the President's own government names its real institutions and titles
  (next bullet). What the validator enforces is that a foreign-facing scenario
  survives being cast onto whichever nation the live board picks: a scenario that
  has **not** declared itself a set-piece may not name a nation, its demonym or its
  capital, and may not quote a capability figure true of exactly one country. A
  declared set-piece (`cast.pick: "nation"` plus a real `setPiece.reason` and
  owner) may name its country — that is the one exception, and it has an owner.
  The deny-lists are generated from the dataset
  (`packages/content/src/audit-lexicon.ts`), so naming a nation starts failing the
  day it joins the dataset.
- **American vocabulary on the player's own government.** The playable seat is the
  US presidency: "the Secretary of Defense," "the Attorney General," "the
  Treasury," "the Pentagon," "Congress," "the House," "the Senate," "impeachment,"
  "censure" — never "the minister," "the chair," "parliament," or a "no-confidence
  motion" for the player's own administration. A foreign counterpart keeps its own
  government's real vocabulary ("their foreign minister" is correct — that is
  someone else's country). Full table: `docs/CONTENT_DOCTRINE.md` §10.

## 6. Skills, and which one an ask starts

The room's procedures are tool-neutral files in `skills/<name>/SKILL.md` (Agent
Skills format: `name` and `description` frontmatter, then the procedure). Any
agent reads them directly. `.claude/skills/<name>/SKILL.md` holds a pointer with
the same frontmatter so Claude Code discovers each one; the canonical text is
always the file under `skills/`.

| The ask | Chain |
|---|---|
| "Create scenarios about <topic>" | `content-plan` (map the topic to cells) → `content-research` where a cell needs grounding → `scenario-generate` → the publish tail in `scenario-ingest` (independent review, publish, bake, commit locally, finish) |
| "Create whatever content is needed" | the same chain, with `content-plan` taking cells from `content/kit/NEEDS.md` (arc readers first, through `arc-readers`) |
| "Ingest this file" | `scenario-ingest` |
| "Give an outside author what they need" | point them at `content/kit/` (`scenario-ingest` explains it) |
| "Review this batch" | `content-review`, from a context that did not draft it |
| Consequence cards, resolution sequences | `consequence-generate`, `resolution-sequence-generate` |

Contested issues (the list in `content/kit/NEEDS.md`) are not open for content
until the engine models them; a topic on that list is declined, not planned.

| Skill | Use it to |
|---|---|
| `content-plan` | turn NEEDS or a named topic into cells and a job spec |
| `content-research` | find sourced precedent for a cell and write the research note |
| `scenario-generate` | write scenarios in a session, against the job briefs and the gate |
| `scenario-ingest` | ingest a file drafted from the kit; holds the publish tail every batch finishes through |
| `consequence-generate` | write consequence cards against the consequence gate |
| `resolution-sequence-generate` | write resolution step sequences for empty coverage cells |
| `arc-readers` | plan and land readers for flags nothing reads |
| `content-review` | the independent review pass over a gated batch |
| `dispatch-editorial` | feed headlines, wire ledes and outlet voice |
| `player-tips` | in-game guidance copy |
| `game-art-direction` | scene and ambient-art generation briefs |

## 7. Engineering work

Not writing content? `CLAUDE.md` has the full engineering conventions: TypeScript
strictness, the React DOM / web-boundary rules for `apps/web`, the
doc-sync contract (`docs/SCHEMA.md` + `docs/ARCHITECTURE.md` update in the same
change as a dataset schema change), the code review checklist, and the full test
and proof-gate command list (`pnpm run build`, `pnpm run typecheck`, `pnpm run
lint`, `pnpm run test`, and the `scripts/verify-*.mjs` gates). Read the relevant
source before proposing changes; never implement on a guess.

Open work lives in `docs/BACKLOG.md` and the week-of status in `docs/PLAN.md`.
There is no other tracker; do not run `bd`.

## Agent coordination (Claude Code ↔ Codex)

The cross-agent coordination model and handoff protocol for this repo live in
`COORDINATION.md` — the single source of truth (do not duplicate it here). Read
`COORDINATION.md` at session start, and `HANDOFF.md` for live session state.
