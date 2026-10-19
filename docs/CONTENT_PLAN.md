# Content plan

What content the game needs, at what volume, and what producing it actually costs. Content here is written per *shape* rather than per country.

## 1. What a unit of content is

One `ScenarioDef`: a subject, an opening of two to four beats, and two to four replies, each with a commitment that costs something. Schema in `packages/content/src/scenario.ts`, rules in `docs/ARCHITECTURE.md` §5. Measured against the pilot packs when this plan was written (19 scenarios), a scenario is **1,405–2,103 characters of JSON, averaging 1,775** (~444 tokens); the shipped corpus is 322 scenarios (`content/corpus/manifest.json`).

Content never names a country. It targets:

- **A cast** — `tensest`, `closest`, `band` (by archetype / power tier / military tier / stability band), or `none` for trouble at home. War content casts `warCounterpart` (whoever the player is actually fighting) or `belligerent` (a principal of a war the player is not in), because tension and belligerence are not the same fact. `nation` exists but is a declared, owner-attributed set-piece and is not part of corpus volume.
- **Conditions** — metrics, alignment, relationship state, counterpart traits, cabinet attributes, flags, turn, removal pressure, and charter institutions.

This is why the corpus is finite. Nearly two hundred governments do not need two hundred times the content; roughly ten archetypes cover the catalog, and the simulation supplies the variety that authoring would otherwise have to.

## 2. Volume: what "populated" costs

**The floor** is set by repetition inside one campaign. A turn is a week (`DAYS_PER_TURN = 7`, `packages/engine/src/turn-clock.ts`), a term is 208 turns with a midterm at 104, and a campaign is bounded at two terms (`TERM_LIMIT = 2`, `packages/engine/src/elections.ts`) — 416 turns at the outside — or ends earlier by removal or electoral defeat. That replaces the older monthly planning premise (a turn a month, ~60 turns, no fixed clock) this section used to state.

Turns are not the right denominator, though, and were never quite the right one even under the old premise: one decision does not reach the desk per turn. A week deals one to three documents (`MAX_DESK_CAPACITY`, `packages/content/src/scenario-director.ts`), and the game now advances until something needs the President or a horizon passes (`advanceUntilAttention`, `DEFAULT_HORIZON_DAYS`, `packages/engine/src/advance.ts`) rather than stopping every week on a fixed clock — so a quiet stretch serves nothing, and the honest floor input is **stops per term**, not turns per term. That figure is unmeasured until the balance harness's staged-week rate lands. Conditions and `once` still mean only part of the pool is live at any moment; assume half.

Pending that measurement, this section does not restate a floor number computed from the old ~60-turn assumption — 120 does not follow from 208 turns of unknown stop rate, and asserting it anyway would be exactly the false precision this correction exists to remove. What holds regardless of the exact stop rate: **730 stays the v1 authored target and 2,000 stays v2** (this file, the v1/v2 targets below), because 730 was sized against an *upper-bound* serving estimate (~200–250 per term, itself now known to be an upper bound rather than a schedule) with enough headroom that a lower, measured stop rate only widens the margin — it cannot make 730 too thin. The floor number this section used to state is retired until the probe lands; the target below is not.

**The target** is set by coverage. 18 classes × 4 authoring casts is 72 cells, but the classes are not equally weighted — a government has an economy every month and a hostage crisis rarely. Three tiers:

| Tier | Classes | Per class | Subtotal |
|---|---|---|---|
| Spine — happens constantly | `foreign-crisis`, `economy`, `unrest`, `institution`, `scandal` | 60 | 300 |
| Regular — happens often enough to need range | `terror`, `disaster`, `migration`, `public-health`, `justice`, `war`, `espionage` | 40 | 280 |
| Punctuation — rare on purpose, and cheapened by repetition | `tragedy`, `hostage`, `technology`, `culture`, `death`, `triumph` | 25 | 150 |
| | | **v1 corpus** | **730** |

Within each class, target roughly **35% band-cast, 25% tensest, 10% closest, 30% domestic (`none`)**. Band-cast is the largest share deliberately: it is the content that scales with the dataset instead of against it. The `closest` share is smallest because a scenario that needs a genuine friend is only live for players who have made one.

730 gives a long campaign about twelve times more eligible content than it can consume, which is the point at which two campaigns founded differently stop feeling like the same month twice.

**The v2 target is ~2,000, decided 2026-08-08.** The bar it answers to is replay: ten campaigns should each still feel fresh, and at 730 the tenth campaign shares a meaningful fraction of its weeks with the first. Scaling the same tier ratios: spine ~165 per class, regular ~110, punctuation ~70. 730 remains the phase-1 milestone on the way there, the production order below is unchanged, and the punctuation tier stays hand-slow at both sizes. Two things gate the climb past 730 rather than volume itself: the pool-scale audit rules (the deferred diversity/monoculture family), and a flag economy that is actually read — at the 2% review-sample floor the audit is the whole quality bar for what a human never sees, and a corpus that writes flags nothing reads is paying for memory it does not have.

**Severity mix, orthogonal to the class tiers.** Every scenario also declares an authored `severity` (`routine` / `serious` / `critical`), and the corpus targets roughly **40% routine / 40% serious / 20% critical** within every class tier — a spine class has routine weeks (a budget squabble is `economy` at low volume) exactly as a punctuation class does. Routine is the connective tissue that makes a critical land: the director spaces criticals out at runtime, but it can only stage the quiet weeks the corpus actually contains, and a corpus written all at one volume plays at one volume whatever the pacing does. The audit's `severity-monotone` warning holds batches to this.

**Charter coverage.** The player's charter is the US Constitution; domestic content names Congress, the courts and the cabinet in American vocabulary (CONTENT_DOCTRINE §10). The `{{assembly}}`-style tokens and the pilot pack remain valid but are no longer a coverage target.

## 3. Cost: generation is cheap, and that is the surprising part

Measured, not estimated. The generation brief is **11,222 characters (~2,806 tokens)** and is sent once per batch. A batch of five is the efficient unit: larger batches lose per-scenario quality, smaller ones re-pay the brief.

| | Batches | Prompt tokens | Completion tokens |
|---|---|---|---|
| 730 scenarios, batches of 5 | 146 | 410k | 324k |
| With 30% gate-rejection and repair | ~190 | 533k | 421k |

At published rates for a full corpus **including repair**:

| Model tier | Cost |
|---|---|
| Sonnet-class ($3/M in, $15/M out) | **~$7.90** |
| Opus-class ($15/M in, $75/M out) | **~$39.60** |
| The driver's own conservative flat estimate ($10/M) | **~$9.50** |

The whole v1 corpus costs less than a month of any SaaS subscription in the stack. **Token spend is not the constraint on this corpus, and planning as though it were would be planning against the wrong number.**

The real cost is **review**. At three minutes of human reading per scenario — which is fast for prose that has to carry a game's voice — 730 scenarios is **about 37 hours**. That is the number to manage, and it is roughly five thousand times the dollar cost.

### The three lanes a batch can run in

Every batch is generated in exactly one of three lanes, and a batch plan names its lane and its reviewer before it starts. All three write the same job file, resume from the same journal, and clear the same gate — what differs is who does the drafting and who is paying.

**(a) In-session driver — the cost-optimal default.** `studio scenarios job <id> … --driver session` then `studio scenarios run <id>` materializes each item's brief into `content/jobs/work/<id>/`; the session writes `<item>.out.json` beside it; the next run validates and journals. It is a plain filesystem contract with no API key and no SDK, so the drafter can be **Claude Code, Codex, OpenCode against an open-weight model, or a person with an editor** — the harness cannot tell and does not care. Worked non-Claude example, start to finish:

```bash
studio scenarios job aug-econ economy:band:routine:5 --driver session
studio scenarios run aug-econ          # writes 1 brief + a README into content/jobs/work/aug-econ/
opencode run --model <open-weight-model> \
  "Read content/jobs/work/aug-econ/README.md and every *.brief.md there, \
   then write each <item>.out.json exactly as the README specifies."
studio scenarios run aug-econ          # gate: journals done, or writes <item>.findings.json to fix
studio scenarios review aug-econ       # hand to a session that did NOT draft the batch
```

**API spend in this lane is zero.** The drafting is paid for by whatever subscription is already running the session, and open-weight models make that free at the margin. Review is unchanged and still has to be independent: the reviewing session must not be the drafting one, whatever tool either is.

**(b) OpenRouter API driver — volume the owner pre-approves.** `--driver openrouter` reaches any OpenRouter-listed model, open-weight ones included, with per-stage model selection via `OPENROUTER_STAGE_MODELS` (a cheap drafter, a stronger repair pass). It earns its spend when the batch is large enough that babysitting a session is the real cost — the dollar figures above say a whole corpus is well under a hundred dollars, so the thing being bought is unattended throughput, not capability. It is spend-gated: an attended run types the job id back at the prompt.

**(c) Scheduled unattended — the same API driver with nobody watching.** Cron, launchd, or a scheduled agent re-invoking `studio scenarios run <job>` on a job that is resumable by construction: done items are never re-run or re-spent, and the budget ceiling is read from the journal so an interrupted run resumes into the same budget rather than a fresh one. The spend gate cannot be a prompt here, so it is a recorded pre-authorization:

```bash
studio scenarios run aug-econ --authorize-spend aug-econ --as "Gerald Dagher"
```

which refuses if the id does not name the job actually loaded, and otherwise journals who approved it, when, and the estimate, before the first request. Subsequent scheduled invocations run under that recorded authorization; a scheduled run that never had one refuses and says which flag it wanted. Reach for this lane only for volume the owner has actually pre-approved — it is the one lane where money moves with no one in the room.

Which makes the validator the actual production lever. Every rule in the audit is review time removed: 26 rules that a person no longer has to check by eye, on every one of 730 scenarios. It also means the pool-scale rules that were deferred (tone monoculture, framing monoculture, template overlap thresholds) matter far more at 730 than they did at 13 — monoculture is invisible in a small pack and glaring in a large one, and it is exactly the failure a reviewer reading scenarios one at a time will not catch.

## 4. Production order

1. **Spine classes, band and domestic casts first** (~300). These carry the most months and prove the targeting model at volume. Any monoculture shows up here first, while it is still cheap to fix the brief.
2. **Regular classes** (~280), interleaving casts so no class ends up single-shaped.
3. **Punctuation classes** (~150), written last and slowest — these are the ones a player remembers, and they are the least suited to bulk generation.
4. **Charter-gated domestic content** throughout rather than as a phase, so no charter's content arrives as an afterthought.

Set-pieces sit outside this order entirely: they are written deliberately, name their owner, and are counted separately.

## 5. What would change these numbers

- **Campaign length.** A campaign is bounded at two 208-turn terms (`TERM_LIMIT = 2`) or ends earlier by removal or defeat — not the open-ended "~60 turns, no fixed clock" this section used to assume. Volume still scales with how many *stops* a campaign actually runs, not with its outside turn cap; a campaign that is removed or defeated at the midterm sees roughly half the stops of one that serves two full terms, and the coverage target does not move with either, because coverage is about variety across campaigns, not length of one.
- **More than one decision per stop, or more than one stop per turn.** Both multiply the floor directly and are both already true: a week can deal up to three documents (`MAX_DESK_CAPACITY` = 3), and not every turn stops the world for one at all. See §2 — the floor has not been re-run against either, pending the measured stop rate.
- **A new charter or a new institution kind.** Costs a data record and a small amount of gated domestic content, not a new corpus.
- **A new nation.** Costs nothing. That is the whole design.
