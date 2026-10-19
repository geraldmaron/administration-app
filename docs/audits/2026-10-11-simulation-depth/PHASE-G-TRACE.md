# Phase G trace: variability

Requirement 7 of the simulation-depth program: "Variability: five named sources, exactness where it matters, keyed deterministic streams, no RNG in selectors." Read against source on `feat/map-first` on 2026-10-11, a read-only trace while other sessions edit `packages/engine` (the relationship ledger: `hill.ts`, `lobbying.ts`, `political-promises.ts`, effects, save and state) and trace Phase E. Line numbers are from that tree; re-grep before trusting one, especially in `lobbying.ts` and `save.ts`, which are moving.

Run during the trace, nothing else: `npx vitest run src/divergence.test.ts` (6 pass, 10 s, logged `divergence: 0.998 (bar 0.6) — traits 1, relationships 0.993, people 1, events 1`) and `npx vitest run src/modeling-projection.test.ts` (5 pass, 9 s). No build, typecheck, lint, gate, e2e or balance run.

Each claim below is tagged **Fact** (read in source, with the line), **Inference** (follows from facts but was not executed) or **Recommendation**.

## Finding dispositions

The finding texts for C12 and C13 are not in the repo: PROGRAM.md:29 names them only as "RNG and macro", the owner's brief is not checked in, and `git log --all --grep` finds no commit that quotes them. The verdicts below are against the most likely reading (the requirement's own words, and the code around `rng.ts` and `macro.ts`), and say so.

| Finding | Disposition | Evidence |
|---|---|---|
| C12, RNG (read as "keyed deterministic streams, no RNG in selectors") | **Architecture sound; three live defects and two latent hazards** | Streams are pure functions of seed and key with no stored position (`rng.ts:59-66`), so no read can consume another reader's draw. Defects: a player-core reading steps the live campaign's own future market draws (`lever-comparison.ts:61-79`); one macro stream feeds three separate laws in positional order (`macro.ts:184-190`); the regulatory docket's outcomes are not keyed by the seed (`docket.ts:193-201`). Detail in sections 1 to 3 |
| C13, macro (read as the macro shock model) | **Present as structure, not reproducible as a stated defect** | Weekly shocks are independent uniform draws per nation per week (`macro.ts:184-186`, `:259-275`, `MACRO_SHOCK` `:108`, `MACRO_JITTER` `:94`); no common world draw and no persistence in the shock itself; the equity draw is keyed by turn alone (`markets.ts:103`). The shared macro stream above is the one concrete hazard. Section 5 |
| Five named sources | **Named in NORTH_STAR, two of the five absent in code** | `docs/NORTH_STAR.md:7`: "stat jitter, trait and agenda rolls, relationship perturbation, the person-pool draw, and founding choices". Stat jitter and relationship perturbation have no draw; founding choices are player input, not a seeded source. Section 0 |
| DECISIONS §1.12 "no gate enforces this" | **Still true** | `docs/DECISIONS.md` §1.12 source check. Draw-free exact paths are listed in section 4; two places where noise reaches a sum or a tally are named there |
| §3.7, the price shown is the price charged | **Holds for immediate acts; drifts for scheduled acts** | `resolveAction` rolls against `projectAction` on the same state (`resolution.ts:810-840`). A scheduled operation is re-projected on the due date (`instrument-issued.ts:99`, `:103`); a lobbying ask is re-weighed on the due date (`lobbying.ts:571-574`). Section 2 |
| Modeling workbench isolation | **Holds** | `modeling-projection.ts:95-97`, `:127-133`; tests pass. One caveat: seed-free draws (the docket) come out the same in a projection as in the live future. Section 7 |
| C01, C06, C07, C18 | Not traced by this pass | Outside variability |
| C16, C17 (history windows, save versions) | **RNG half only: no stream state in a save** | Save is v63 (`save.ts:102`), reads v51+ (`:103`). The seed is a campaign field (`state-campaign.ts:435`); no stream position is stored or needed. The history-window half is not traced |

## 0. The five sources

**Fact.** NORTH_STAR names five seeded sources of divergence (`docs/NORTH_STAR.md:7`). Neither DECISIONS.md nor PROGRAM.md names five; DECISIONS §1.13 states only the divergence rule, and §4.7 calls trait rolls "a main source of divergence". The historical backlog entry on opening profiles records that a "fifth divergence source" (an opening profile) degenerated and was rescoped.

Status of each, against code:

| NORTH_STAR source | In code? | Evidence |
|---|---|---|
| Stat jitter | **No.** Nation stats open at their authored values | `founding.ts:353` builds every runtime with `stats: n.stats`. The comment at `state-campaign.ts:79` ("jittered-at-campaign-start, then live") is stale. Nearest substitutes: each nation's business-cycle phase is drawn at founding (`business-cycle.ts:73`, key `cycle-open:<nation>`), and weekly macro shocks move stats from week one |
| Trait and agenda rolls | Yes | `traits.ts:18`, `:31`, `:41` (keys `traits:<nation>:agenda:<i>`, `…:agenda-weight:<i>`, `…:<trait>`), called at `founding.ts:419` |
| Relationship perturbation | **No draw of its own** | `relationship-graph.ts:325-337` derives every edge from the two nations and overlays sourced dyads; it takes no streams. Relationships differ between seeds only through the rolled traits and NPC play (probe facet 0.993 after 12 turns) |
| Person-pool draw | Yes | `people.ts:383`, `:397`, `:421`, `:435`, `:456` (keys `people`, `background`, `birthplace`, `names`, `bios` by nation, role, index), called at `founding.ts:209` |
| Founding choices | Player input, not seeded | The seeded parts of the founding are: the mandate and the Congress swing (`founding-congress.ts:76`, `:119`), the electorate (state demographics `states.ts:54`, national `demographic-jitter.ts:40`, cohort baseline `cohort-baseline.ts:28`, cohort sensitivity `state-cohort-opinion.ts:52`), the opening war board (`opening-world.ts:161-168`, `fnv1a("opening-board::<seed>")`) and the inherited 13 weeks of metrics (`inheritance.ts:62`, `:77`, called at `founding.ts:590`) |

**Fact.** The divergence probe measures four facets (traits 0.2, relationships 0.25, people 0.15, events 0.4; `divergence.ts:13`, ARCHITECTURE.md:858) on a run of only the NPC, operator and grudge phases (`divergence.test.ts:56-65`). It does not see macro paths, the opening Congress or electorate, scenarios, conditions or act outcomes. ARCHITECTURE.md:860 still quotes 0.96; the measured figure today is 0.998.

**Inference.** The events facet scores 1 partly because ledger lines carry people's names (`divergence.ts` `eventFacet` compares descriptions), and the cast differs by seed. A probe that strips names would read lower and say more.

**Recommendation: the five sources, renamed to what the game actually varies.** Each is a stage of the game a player meets, each already has draws behind it except where marked, and each can be removed in a probe test to prove it carries weight:

1. **The opening world**: the war board, each economy's cycle phase, the inherited record, and (if the owner wants it) bounded stat jitter on estimated figures. Reason: it is the first thing a player reads, and today it varies only in the board and the cycle.
2. **The opening Congress and electorate**: the mandate, the seat swing, state demographics, cohort baseline and sensitivity. Reason: it sets the President's room and coalition before any act, and it is already the most heavily seeded part of the founding.
3. **The cast and their character**: the person pool and every nation's traits and agendas (relationships follow from these). Reason: DECISIONS §4.7 already calls it the main source, and the probe's removal test is built on it.
4. **The world's weather**: conditions and their onset, scenarios and the director, operators, world events, NPC initiative, foreign elections and coups, defaults, and macro and market shocks. Reason: these are the things the government could not have known (§1.12's allowed list), and they are what makes week 40 differ.
5. **The outcome of acts**: resolution rolls, lobbying, press, orders contested, bill stages, court rulings, war weeks, willingness noise. Reason: these are the "roll" a player takes knowingly, against odds they were shown.

Founding choices drop off the list because they are the player's, not the seed's. Relationship perturbation drops off unless G4 builds it (below).

## 1. RNG architecture

**Fact.** `createRngStreams(seed).stream(...parts)` joins the parts with `:` and seeds a fresh mulberry32 from `fnv1a("<seed>::<key>")` on every call (`rng.ts:59-66`). A stream holds no shared state: calling `stream(k)` twice gives two streams that produce the same sequence. Two keyed-hash helpers, `hashIndex` and `hashFraction` (`rng.ts:50-57`), exist for draws that must read the same however often a surface renders. Lint bans `Math.random` and `Date.now` in the engine (DECISIONS §1.2, ARCHITECTURE.md:55).

**Consequence (Fact, by construction).** One consumer's extra draw can shift another consumer's only when both pull from **the same stream object** in sequence. Separate keys cannot couple. So coupling is a property of individual call sites, listed here.

### Streams shared positionally by more than one consumer

| Stream | Consumers, in draw order | Risk |
|---|---|---|
| `macro:<nation>:<turn>` (`macro.ts:184-190`) | growth, inflation, unemployment shocks (`:259-275`); regime stability, legitimacy, protest pressure (`:335-346`); crime (`:310`). Seven draws, three laws | **Coupling.** A draw added to the economic law shifts every political and security shock in all 196 nations. §1.3 says a new draw takes a new key, but the three laws already share one |
| `conflict:<id>:<turn>` (`war-tick.ts:376-408`) | swing, intensity, terminal roll | Declared order in the comment at `:370-373`. One mechanism; acceptable if pinned |
| `condition:<id>:<turn>` (`conditions.ts:490`, `:503`) | severity step | One consumer today |
| `director:<turn>` (`scenario-director.ts:425`) | one draw per desk slot | One mechanism; the slot count (`deskCapacity`) decides how many draws, so a capacity change re-rolls later slots. Acceptable |
| `people:<nation>:<role>:<index>` (`people.ts:383`) | every attribute of one generated person | One generator; a new attribute draw re-rolls the cast of every existing seed. §1.3 applies |
| `founding:congress` (`founding-congress.ts:119`) | the seat swing | One consumer |

### Keys that read more than they say

| Site | Fact | Effect |
|---|---|---|
| `jitter()` (`instrument-gates.ts:116-118`), 49 call sites in `instruments*.ts` and `strike-mission.ts` | Key is `instruments:<actor>:<target>:<turn>`; each call opens a fresh stream and takes its first draw | **Every jitter inside one act returns the same multiplier**, and two different instruments or rungs by the same actor on the same target in the same week get the same multiplier when they resolve on the campaign seed (NPC acts, `npc-turn.ts:336`). Scheduled player acts are distinct because they resolve on `<seed>:<actId>` (`instrument-issued.ts:99`) |
| `strike-mission` (`strike-mission.ts:24`, `:28`) | Spec id carries `ctx.campaign.ledger.length` | The draw depends on how many ledger lines exist, so any unrelated ledger write earlier in the campaign re-rolls a strike's damage path. Phase E's file |
| `opponent:margin` (`opponent.ts:80`) | No turn or election in the key | One luck value for every race of the campaign. Inference: intended as the campaign's political weather, but undocumented |
| `will:<question>:<subject…>` (`willingness.ts:372-374`) | No turn, by design (`willingness.ts:13-16`) | The same question to the same actor gets the same noise every week. Correct and documented |
| Key joining (`rng.ts:62`) | Parts are joined with `:` and ids may contain `:` | Latent: `("a:b", c)` and `("a", "b:c")` are the same key. No live collision found |

**Fact.** Key roots collide nowhere in production code: every root in the `.stream(` list (68 sites in engine and content, `grep -rn '\.stream('`) is distinct or has a distinct arity. `npc-agent` at `npc-agent.ts:301` and `:480` differ only if no instrument is named `engagement`; none is.

**Fact.** Draws outside the stream system, all keyed: `opening-world.ts:161-168`, `scandal-response.ts:148`, `:183`, `scandal-origins.ts:255`, `counsel.ts:248`, `poll.ts:21`, `resolution-sequence.ts:105`, `strike-assessment.ts:38`, `:50`, `press-filing.ts:67`. Seed-free (identical in every campaign): `docket.ts:95-111`, `:193-201`; `court-votes.ts:100` (a tie-break); `sovereign.ts:423` (a review schedule); `leader.ts`, `dossier.ts`, `bio.ts`, `article-*.ts` (prose and faces).

## 2. Draw sites by source

"Where" is the kind of function the draw runs in: **step** (a weekly phase or day step), **apply** (a commit path an act runs), **reading** (a selector, projection or view). Readings are section 3.

### Opening world, Congress and electorate, cast (all at founding: `sealFounding`, `founding.ts:483`)

All step-once at founding, keyed by seed and a fixed label (keys in section 0). No projection is shown from any of them before they are drawn, so §3.7 does not arise.

### The world's weather (all weekly or daily steps)

| Draw | Key | Where |
|---|---|---|
| Macro shocks | `macro:<nation>:<turn>` | step, `macro.ts:184` (via `macroPhase`, `:373`) |
| Business cycle | `cycle:<nation>:<turn>`; `cycle-open:<nation>` | step, `macro.ts:242`; `business-cycle.ts:73` |
| Commodities, equity | `commodity:<id>:<turn>`; `equity:<turn>` | step, `commodity-phase.ts:48`; `markets.ts:103`. Also stepped by a reading, section 3 |
| Condition onset and severity | `<queueKey>:<nation>:<kind>:<turn>`, `condition-onset-tiebreak:…`, `condition-open:…`, `condition:<id>:<turn>` | step, `conditions.ts:641-651`, `:490` |
| Impact events | `impact-event:<spec>:<elapsedDays>` | step, `impact-lifecycle.ts:68` |
| Operators | `operator-emerge:<id>:<kind>:<turn>`, `operator-act:<id>:<turn>` | step, `operators.ts:158`, `:288` |
| NPC initiative and order | `npc-initiative:<actor>:<turn>`, `npc-initiative-order:<id>:<turn>` | step, `npc-turn.ts:71`, `:117` |
| NPC choice jitter | `npc-agent:…:<turn>` | step, `npc-agent.ts:301`, `:480` |
| Foreign elections, confidence, coups | `foreign-election:<nation>:<date>`, `…:confidence:<date>`, `coup:<nation>:<date>` | step, `foreign-politics.ts:192`, `:230`, `:307` |
| Sovereign default | `default:<nation>:<turn>` | step, `sovereign-default.ts:119` |
| Coalition break | `coalition-break:<coalition>:<turn>` | step, `coalition-break.ts:106` |
| World events (sanctions, clashes, admissions, withdrawals, aid) | `will:<question>:…` through `decideVote` / `decideHostileAct` | step, `world-events.ts:73`, `:149`, `:204`, `:237` |
| Bill origination | `legislation-gap:<since>`, `legislation:<turn>` | step, `legislation.ts:669`, `:674` |
| Cabinet risk, voices, initiative, leaks, resignations | `cabinet:<person>:<turn>`, `cabinet-voice:…`, `will:minister-initiative:…`, `will:aim-leak:…`, `will:<question>:<person>:<role>` | step, `cabinet.ts:356`, `:367`; `cabinet-initiative.ts:283`; `cabinet-revolt.ts:217`; `minister-will.ts:142` |
| Scandal stories and evidence | `fnv1a("<seed>::leak-story::<event>")`, `…::scandal-evidence::…`, `…::scandal-read::…` | step, `scandal-origins.ts:255`; `scandal-response.ts:148`, `:183` |
| Scenario draw | `scenario:<turn>`, `director:<turn>`, `locus:<def>:<turn>`, `locus-state:<def>` | staging, `scenario-cast.ts:683`; `scenario-director.ts:425`; `scenario-locus.ts:114`, `:269` |
| Policy voice | `policy-voice:<turn>` | step, prose only, `policy.ts:583` |

### The outcome of acts

| Draw | Key | Where | Shown odds equal the rolled odds? |
|---|---|---|---|
| Act resolution | `resolution:<actor>:<target>:<instrument>:<rung>[:<count>]:<turn>` | apply, `resolution.ts:829-838` | **Yes** for an immediate act: `resolveAction` calls `projectAction` on the same state and rolls against its `successChance` (`resolution.ts:810-840`); `projectAction` draws nothing (gates draw nothing either: no `gate:` uses `jitter` or a stream) |
| Consequence card | `consequence:<actor>:<target>:<instrument>:<rung>:<turn>` | apply, `resolution.ts:763` | After the branch is known; dressing only |
| Effect magnitude | `instruments:<actor>:<target>:<turn>` | apply, `instrument-gates.ts:116` | Magnitudes are not previewed (`def.resolve` runs only at `resolution.ts:846`) |
| Scheduled operation | `resolution:…` on seed `<seed>:<actId>` | step, `instrument-issued.ts:99` | **No, by re-projection.** The chance quoted at issue is stored (`:54`); at the due date the act is re-projected on the live state and the stored chance is overwritten with the new one (`:103`). Inference: if the world moved in between, the player is rolled at odds they were not shown |
| Lobbying ask | `lobbying-outcome:<day>:<post>` | step, `lobbying.ts:571` | **No, by re-weighing.** The member's answer is weighed on the due-date campaign (`:574`, `memberAnswer`); the quoted chance is used only when the seat is empty. With `ASK_BAND = 0.5` (`:205`) the two agree exactly on the same state, so the drift is only what changed between ask and answer. ARCHITECTURE.md:688 says it "rolls against the frozen `chance`", which is not what the code does. **In flight: `lobbying.ts` is being rewritten by the relationship-ledger session** |
| Press engagement | `press-outcome:<day>:<action>:<desk>` | step, `press-issued.ts:203` | Rolled against the projection handed in |
| Executive order contested | `executive-order:<order>:<turn>` | apply, `orders.ts:594` | Yes, same state (`:593`), and the odds are stored |
| Bill stage, swing | `bill-stage:<bill>:<turn>`, `bill-swing:<bill>:<turn>` | step, `bill-stages.ts:313`, `:315` | The floor is a count, not the draw (`:350-358`) |
| Court ruling | `judicial-review:<record>` | step, `judicial-review.ts:46` | The tally is derived from the same draw (`court-votes.ts:59-68`), section 4 |
| Docket challenge and outcome | `hashFraction("docket-challenge:<id>")`, `"docket-outcome:<id>"` | reading, `docket.ts:193-201` | Seed-free, section 3 |
| War week | `conflict:<id>:<turn>` | step, `war-tick.ts:376` | — |
| Joining, peace | `will:<question>:<nation>:<conflict>` | step, `war-join.ts:222`; `peace.ts:161` | — |
| Engagement received, treaty accepted, governor consent | `will:receive-engagement:…`, `will:accept-treaty:…`, `will:governor-consent:…` | apply, `engagement.ts:305`; `treaty-counterpart.ts:213`; `governors.ts:444` | `projectWillingness` is the same sum without the draw (`willingness.ts:18-21`) |
| Civilian harm, strike damage | `strike-civilian-harm:…:<turn>:<count>`; `strike-mission:<spec>` | apply, `strike-outcomes.ts:35`; `strike-mission.ts:28` | Phase E's files |
| Coercion incident | `coercion-incident:<state>:<turn>:<run>` | apply, `domestic-coercion.ts:177` | The receipt reads the same draw back off the pre-act campaign (ARCHITECTURE.md:1391) |
| Opponent | `opponent:margin`; `opponent:nominee:<person>` | step, `opponent.ts:80`, `:94` | — |

## 3. Selectors and readings that draw

The rule's purpose (DECISIONS §1.2, §1.12, §7.11) is that a reading neither changes the world, nor reads differently on a second render, nor shows the player what only the future knows. Because streams have no state, the first two hold everywhere by construction. The third does not.

| Site | Draws | Verdict |
|---|---|---|
| `player-core/src/economy/lever-comparison.ts:61-79` (`marketsAhead`, read by `leverComparison` for the economy room's levers) | Runs the engine's `commodityPhase` six weeks forward on the **live** campaign, so `commodity:<id>:<turn>` and `equity:<turn>` for future turns are drawn from the live seed | **Violation.** The "Wait" column's six-week crude and pump outlook carries the campaign's true future market shocks. Every other forecast uses a detached seed (`modeling-projection.ts:95-97`, `projection-belief.ts:48`). Fix: run it on a projection seed and show a range |
| `engine/src/docket.ts:193-201`, read by `selectActiveDocket` / `selectDocketItem` (`:230-240`) | `hashFraction` keyed by `docket:<institution>:<cycle>`, no seed | **Violation of divergence, not of purity.** Every campaign's rulemaking docket has the same leans, challenges and court outcomes for the same alignment. It also means a modeling run sees the true docket future |
| `engine/src/poll.ts:21` (`trackingPoll`, read by `player-core/polling/polls.ts:41`) | `hashFraction("<seed>:poll:<turn>")` | Allowed: a published sample with its error, stable per week |
| `engine/src/counsel.ts:248` (`perceivedOdds`) | `hashFraction("<seed>::counsel-odds::…")` | Allowed in intent (a minister's read, blurred by competence, `:236-242`). Inference: it is a figure the player sees before deciding, so it needs to be labeled as the minister's read and not the odds; not checked on screen |
| `content/src/scenario-intel.ts:64` | `intel-confidence:<def>` | Allowed: DECISIONS §7.9 derives the verdict from seed and scenario id |
| `engine/src/strike-assessment.ts:38`, `:50` (inside `projectAction`) | `hashIndex` keyed by seed and request | Allowed: the same context is read at projection and commit |
| `player-core/src/act/preview.ts:107`, `act/build.ts:92`, `:111`; `apps/web` `Decision.tsx:89`, `acts.ts:52`, `OrderScreen.tsx:90`, `EmergencyActs.tsx:98` | Pass `createRngStreams(campaign.seed)` | Preview paths (`projectAction`, `openConversation`) draw nothing; build paths are commits. No violation |
| `player-core/src/geo/force-placement.ts:232`, `geo/zone-slots.ts:37`, `conversation/counsel-lines.ts:87` | Keyed hashes | Presentation only (map slots, phrasing). No violation |
| `player-core/src/persistence/save-store.ts:539` | `Math.random()` | A save-record id, not simulation. §1.2 binds the engine only. No violation, noted |

## 4. Exactness where it matters

**Fact.** No draw of any kind (`createRngStreams`, `.stream(`, `hashFraction`, `hashIndex`, `fnv1a`, `mulberry32`, `willDraw`, `noiseFrom`, `jitter(`) appears in: `congress-votes.ts`, `senate-tie.ts`, `hill.ts`, `removal.ts`, `removal-votes.ts`, `budget.ts`, `appropriation.ts`, `national-books.ts`, `commitments.ts`, `elections.ts`, `election-seating.ts`, `treaties.ts`, `turnout.ts`, `political-promises.ts`. The bill floor is a count that overrides the stage roll (`bill-stages.ts:350-358`). The removal ladder, vote counts, budget arithmetic, treaty thresholds and promise settlement are therefore exact given their inputs.

Noise that reaches an exact quantity anyway, through its inputs:

1. **Aid totals are jittered sums.** An assistance act's treasury charge is deterministic (`resolution.ts:269`, `INSTRUMENT_UNIT_COST.assistance` `:247`), but the aid it records is a fixed authored figure times `jitter` (60, 240, 700, 400, 900 × 0.9–1.1; `instruments-economic.ts:370`, `:387`, `:403`, `:432`, `:459`), written into `aidGiven` and `aidReceived` (`:318-325`). `national-books.ts:629-632` adds a donor's new `aidGiven` to its debt ratio, and `:376` prices it as foreign-affairs outlay. So a government's books carry an amount that is neither what was charged nor a fixed figure. This is noise in a sum, which §1.12 forbids.
2. **A court's tally is drawn, not counted.** `strikeVotes` (`court-votes.ts:59-68`) turns the outcome draw into a margin, and justices are then assigned to sides by propensity rank (`:94-104`). The ruling is an outcome roll (allowed); the 5–4 against 9–0 is noise rather than a count of justices. Phase K replaces this.
3. **Bill momentum carries the swing draw into the floor count.** `bill-swing` moves momentum (`bill-stages.ts:399-403`), and `projectPassage` reads momentum (`:180`). The count is exact for the state it reads; the state carries a draw. Acceptable (an outcome roll feeding a later count), noted so nobody mistakes it for a jittered count.
4. **The inherited record is a seeded random walk** (`inheritance.ts:58-90`) shown as the predecessor's last quarter (`player-core/src/record/inheritance.ts:27-60`). §1.12 forbids jitter on "recorded history". Inference: it is labeled as inherited and never re-derived, so it is a fiction the game authored once rather than history rewritten; the owner should say whether that is acceptable.

## 5. C12 and C13

Neither finding's text is in the repo. Verdicts are against the program requirement and the files PROGRAM.md:29 points at.

**C12 (RNG).** Read as "keyed deterministic streams, no RNG in selectors":

- Keyed deterministic streams: **holds** (`rng.ts:59-66`; save and load in section 6).
- No RNG in selectors: **one violation** (`lever-comparison.ts`), **one seed-free reading** (`docket.ts`).
- §1.3 discipline: **one shared stream across three laws** (`macro.ts:184-190`) and one key that depends on unrelated state (`strike-mission.ts:24`).
- Verdict: **still present, in part.** None of it threatens replay; all of it threatens either honesty (the outlook) or divergence (the docket) or future edits (the macro stream).

**C13 (macro).** Read as "the macro shock model":

- Fact: each nation's weekly shock is three independent uniform draws on the economic rates (`MACRO_SHOCK`, `macro.ts:108`, applied additively at `:259-275`) and a ±40% scaling of the political and crime reversion step (`MACRO_JITTER`, `:94`, `nextValue` `:176`). There is no common world draw, and the shock has no memory of last week's shock. Persistence comes from the reversion law and the business cycle (`macro.ts:242-247`), and cross-nation correlation only from the deterministic drivers (`external-pressure.ts`, not traced).
- Fact: the U.S. equity index takes one draw a week keyed by turn alone (`markets.ts:103`); commodities one per commodity per week (`commodity-phase.ts:48`).
- Verdict: **not reproducible as a defect without the finding's text.** The structure above is a defensible model. What is a defect is the shared stream (C12) and, if the finding was about realism, the lack of a common shock; that is a modeling change with a balance cost and is not proposed without the owner's word.

## 6. Divergence and reproducibility

**Fact.** Two seeds diverge: the probe passes at 0.998 against a bar of 0.6 over several seed pairs, and the removal test (traits stripped) fails as it should (`divergence.test.ts:75-150`, run today).

**Fact.** What differs by seed, by source (section 0): the cast, traits and agendas, the war board, cycle phases, the electorate, the Congress swing and mandate, and every weekly draw. What does not differ: nation stats at the oath, the derived relationship graph beyond what traits move, and the regulatory docket.

**Fact.** A seed is reproducible across save and load because no draw depends on anything but the seed and its key: streams have no position (`rng.ts:59-66`), `Campaign.seed` is saved like any field (`state-campaign.ts:435`), and `save.ts` stores no RNG state. The proof is `macro-balance.test.ts:344-357`: a seed replayed to week 208 is byte-identical, and a save reloaded at week 100 continues to the same bytes. That file belongs to the balance harness and was **not run** in this trace. `advance.test.ts:222` covers a resumed election week against seven one-day steps (DECISIONS §2.3). Neither was run here.

**Inference.** The probe would not notice if the Congress, electorate, opening world, macro or outcome sources were removed, because its run never reads them. A per-source probe is the missing proof for "five named sources".

## 7. The modeling workbench

**Fact.** `projectRun` builds the detached copy as `{ ...believedCampaign(campaign, member, basis), seed: projectionSeed(campaign.seed, member) }` (`modeling-projection.ts:131`), with `projectionSeed` = `<seed>::projection::<member>` (`:95-97`); the alternative is built on `createRngStreams(detached.seed)` (`:133`), applied to the copy, and advanced with `advanceUntilAttention` on the copy (`:116-126`). Belief draws use `<seed>::belief::<member>` (`projection-belief.ts:48`). Every engine draw reads `campaign.seed` from the state it is handed, so inside a run it reads the projection seed.

**Fact.** Because streams have no state, there is nothing of the live campaign's to touch. `modeling-projection.test.ts` asserts the live campaign is save-serialized byte-identical before and after, that members run on distinct keys never equal to the live seed, and that members disagree (5 pass today).

**Caveat (Inference).** Draws not keyed by the seed (the docket, section 3) come out the same in every projection member as in the live future, so the workbench sees true docket outcomes. Fixed by the same change that seeds the docket.

## Proposed slice plan

Order: G1 and G2 change no draw and move no balance, so they can land while the harness is red and while I and E are moving numbers. G3 and G4 move numbers and land one at a time, each with a before/after harness on fixed seeds.

| Slice | Scope | Files | Moves balance? | Proof | Collisions |
|---|---|---|---|---|---|
| **G1** Readings and the gate | (a) Run the lever outlook on a detached seed (`projectionSeed(seed, m)` or an `::outlook::` key) over a few members and show a range. (b) A verify gate, `verify-rng-routing.mjs`, with a baseline of every stream key root and its owner, that fails on: a draw in `packages/player-core` or `apps/web` outside an allowlist of presentation hashes; an engine phase stepped from player-core on the live seed; a new key root not in the baseline; a draw in the exact-path files of section 4. (c) Seed-invariance tests for the exact paths: the same state under two seeds through vote counts, the Senate tie, removal, budget, appropriations, treaties and promise settlement gives identical results. (d) Docs: the stale `state-campaign.ts:79` comment, ARCHITECTURE.md:688 (lobbying) and :860 (probe figure) | `player-core/src/economy/lever-comparison.ts`, `scripts/verify-rng-routing.mjs` and its `-proof` twin, `scripts/baselines/`, new engine tests, `docs/ARCHITECTURE.md`, `state-campaign.ts` (comment only) | No (the outlook figure changes; no campaign state does) | The gate's proof twin fails on a planted selector draw; the lever test shows the outlook no longer equals the live future's crude path; seed-invariance tests | `state-campaign.ts` is in the relationship-ledger session's set: leave the comment fix until it lands. `scripts/baselines/hazard-draws.json` already exists (ARCHITECTURE.md:878): extend that baseline rather than add a second one |
| **G2** Per-source divergence probe | Extend `divergence.ts` to five facets named after the five sources (opening world, Congress and electorate, cast, weather, outcomes), measured on a run that includes the macro, condition and scenario phases; strip names from the events facet; one removal test per source; amend NORTH_STAR:7 and DECISIONS §1.13 to the five sources | `divergence.ts`, `divergence.test.ts`, `docs/NORTH_STAR.md`, `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` | No | Each removal test drops its facet to near zero and the score below the bar where the source carries weight; the probe logs the figure per facet | None in code. The run is longer than today's 10 s; keep it under the suite's budget or move the longer run to the harness |
| **G3** Exactness repairs | (a) Aid recorded equals aid charged: drop `jitter` from `aidFlow` amounts, or derive them from the charged treasury. (b) Decide and implement one rule for scheduled acts: roll against the quoted chance, or re-quote at the due date and tell the player before it executes. Apply it to `instrument-issued.ts` and `lobbying.ts` alike. (c) Pin the macro stream's seven-draw order with a test and a comment; any new macro draw takes a new key | `instruments-economic.ts`, `instrument-issued.ts`, `lobbying.ts`, `macro.ts` (comment), a new test | **Yes** for (a) and (b): NPC debt ratios and some act outcomes. (c) no | Harness before and after on the same seeds; golden saves compared at week 52 and 208; a test that the aid on the books equals the charge; a test that a scheduled act's rolled chance equals the chance on its card | `lobbying.ts` is being rewritten by I1: (b) waits for I1 to land. `instrument-issued.ts` and `strike-mission.ts` sit in Phase E's force and strike path: coordinate (b) with E, and leave the strike key's ledger-length dependence to E |
| **G4** The missing sources | (a) Seed the docket: add the seed to `docket.ts` keys. (b) Owner decision on stat jitter and relationship perturbation (below); if yes, bounded founding jitter on estimated, non-aggregate nation figures only, keeping every decomposition summing to its aggregate (§4.4), and a small seeded perturbation on derived edges only, never on sourced dyads. Each on its own key (§1.3) | `docket.ts`, `founding.ts`, `relationship-graph.ts`, `docs/SCHEMA.md`, `docs/ARCHITECTURE.md` | **Yes**, broadly | Harness before and after; golden saves; dataset validator on a jittered founding; G2's removal tests now see the new sources | `founding.ts` and the save files are touched by the relationship-ledger work: land after it. Phase E reads nation military stats for basing and posture; jittering them would move E's numbers, so exclude military stats or land after E |

The courts' drawn tally (section 4, item 2) is left to Phase K, which replaces the court model.

### Strongest failure mode

Re-keying or adding draws changes the future of every existing campaign and every balance baseline at once. Landing G3 or G4 while the harness is already red (PROGRAM.md:58) and while I and E also move numbers would make it impossible to say which change moved which outcome, and §1.3's own reason (saved campaigns resolve differently) would be paid with nothing measured. The controls are the order above (G1 and G2 first, no draw changes), one number-moving slice at a time, and a recorded harness run before and after each on the same seeds.

### Best alternative

Skip G4(b). The probe already reads 0.998, and stat jitter is the one source that can break a sum (GDP decompositions, budget totals) if it is done carelessly. Adopt the five sources of section 0 as the game's actual list, seed the docket, and spend Phase G on G1 to G3: honesty in readings, a gate for §1.12, and exactness. **Recommendation: accepted with controls.** Take the alternative unless the owner wants nations to open on different figures; that is a design choice, not a defect.

## Not done in this trace

- C01, C06, C07, C18; the history-window half of C16 and C17.
- The finding texts of C12 and C13 (not in the repo); verdicts are against the requirement's words.
- Whether the counsel odds blur is labeled as the minister's read on screen.
- Whether `external-pressure.ts` correlates shocks across nations.
- Running the save-reload replay (`macro-balance.test.ts:344`) or the balance harness.
