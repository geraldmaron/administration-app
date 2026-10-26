# Adversarial verification of TARGET-MODEL.md, 2026-10-13

Read-only against source and the design. Branch `codex/simulation-depth-completion` at `1629bf32a`. No build, typecheck, workspace test, verify sweep, Playwright or balance harness. Probes run one at a time from the repo root: the design's own `probes/extract-readers-writers.mjs` (once), and two typed probes of mine that live in the session scratchpad, not the repo (`$S = <scratch path>`): `typed-probe.mjs` and `typed-reader.mjs`. Both build a `ts.Program` for `packages/engine` with `noEmit`, `incremental: false`; a `find -name tsconfig.tsbuildinfo -newer TARGET-MODEL.md` before and after showed the same three pre-existing files (design, contracts, world), so neither wrote one. The blockade worktree (`../admin-app-blockade`) was read with `git status` and `git diff --stat` only.

## Bottom line

**Registry design: accepted with controls is too generous as written; REFUTED on its premise, PARTLY CONFIRMED on its mechanism.** The extractor approach works and is cheap (typed engine program 1.0 s, walk 0.1 s). But the design missed two registries already in the tree, one of which is the engine runtime registry it proposes to create, and several of its gate checks cannot pass on today's tree or cannot be computed from what the extractor sees. The headline evidence for "the registry rots like `stat-consumers.ts`" is mostly a probe artifact: of the 32 leaves with no syntax-confirmed reader, about 29 have real readers; two are actually dead.

**What holds:** the 0.1 corrections I1, I2 (count), I3, I5 and I6; the 82 `Campaign` fields and 79 `Effect` members; the phase count; the constants it quotes; the typed pass's feasibility and speed; the scenario-per-file benefit.

**What has to change before the registry build starts:** listed in §7, with a smaller R0 in §8.

---

## 1. Corrections to the inventory (§0.1)

| # | Claim | Verdict | Evidence |
|---|---|---|---|
| I1 | Content emits `populationToll` at `content/src/impact-model.ts:429`; correction strips it at `scenario-corrections.ts:24` | **CONFIRMED** | `impact-model.ts:424-433` inside `resolveImpact` (`:370`), called from `scenario-cast.ts:537`; strip filter at `scenario-corrections.ts:24`. `grep -rn populationToll packages --include=*.ts` (non-test, non-dist) finds only these plus the type (`effect-types.ts:139`) and handler (`effects.ts:584`). |
| I2 | 62 phases, not 64 | **CONFIRMED (count), citation wrong** | `grep -c "{ id:" turn-phases.ts` = 62, all inside `campaignPhaseSequence`. The sequence runs `turn-phases.ts:98-295`, not `98-206` as §0.1, §5.3 and §5.3 "Writer class" cite. The inventory's `98-295` was right. |
| I3 | At least eleven more dated stores | **CONFIRMED** | Every cited line holds a `dueDate`, `due`, `dueTurn`, `dueDay` or `dueAt` field (sed of each line). Note `case-families.ts:35` (`delayed-consequence`) has `clock: "none"`, no payload, and no producer in engine source (`grep -rn delayed-consequence packages`): it is a case kind, not a scheduled amount. |
| I4 | A second registry exists: `world/src/dataset/metrics.ts` | **CONFIRMED, and incomplete: there are four** | Missed: (a) `packages/engine/src/metric-registry.ts` (245 lines): `METRIC_REGISTRY: MetricNode[]` with `id, label, definition, unit, parents, children, weightsExport, provenance, updateCadence` for approval, polarization, appropriation, obligations, treasury, treasuryHealth, stability, readiness, standing, the six judgments, removal pressure and its six terms, congressional hostility and the instruments. The studio metrics page imports it beside `METRICS` (`apps/studio/metrics-view.mjs:2`, `:94-107`); the design cites `metrics-view.mjs:25-55` and missed line 2. The in-flight blockade change edits it (`git status` in the blockade worktree: `M packages/engine/dist/metric-registry.d.ts`). (b) `packages/world/src/metrics/` (1,188 lines): `MetricDefinition` with `kind: "stock" | "flow" | "rate" | "index" | "count" | "modeled-score"`, frequency, reference meaning, adjustment, price basis, and vendored US reference series with a compatibility and resampling layer (`definitions.ts:9-53`, `reference-pack.ts`, `compatibility.ts`), consumed by `player-core/src/economy/comparison.ts` and `peer-comparison.ts`. Its header says the engine graph "answers a different question ... and is not duplicated here" (`definitions.ts:1-6`). |
| I5 | `vitals.ts` header claims sole ownership of population; others also write it | **CONFIRMED, and wider** | Header at `vitals.ts:15-20`. My typed probe also finds four `nationStat` sites whose `setStats` is typed as the whole `DeepPartial<NationStats>` (`capacity.ts:400`, `budget.ts:662`, `policy-program.ts:43`, `order-lineage.ts:81`), so a typed extractor will list them as possible population writers until narrowed. |
| I6 | The paired test passes any `readBy` over three characters; `deathBaseline`/`birthBaseline` do not exist | **CONFIRMED** | `bands.test.ts:245-252`; comment at `:268-273`. `grep -rn "deathBaseline\|birthBaseline"` over packages, apps, scripts and studio-cli finds only `stat-consumers.ts:55, 61, 65, 71` and the test comment. `git log -S deathBaseline` returns one commit (`c7e481fc5`): the claim was written without the function ever existing. |
| new I7 | "`macroDriftPhase`, the sole writer of growth, inflation and unemployment" (§5.3; `INVENTORY.md:10, 63`) | **REFUTED** | The design's own probe prints `economy.inflation <- operators.ts` and `security.crimeIndex <- operators.ts`. `operators.ts:196` writes `inflation: Math.min(ceiling, stats.economy.inflation + BITE)` and `:185` writes `crimeIndex` directly. A second level writer of a "phase-law" rate exists today. |
| headline | "32 of 79 `NationStats` leaves have no confirmed reader" | **PARTLY CONFIRMED as a probe floor; REFUTED as evidence of registry rot** | Re-run reproduces 47 / 32 / 21. Grep shows real readers for about 29 of the 32: `birthRate`, `deathRate`, `netMigration` at `vitals.ts:132-134` (destructured `demography`); `gdpPerCapita` at `world/src/dataset/bands.ts:63`; `reserveHeadcount` at `bands.ts:39, 221, 240`; `deliveryTriad` at `bands.ts:43, 218`; `arsenal.declared` at `forces.ts:236`; `branchStrength.space` through `Object.values(m.branchStrength)` at `bands.ts:41`; `energy-oil` and `energy-gas` at `commodity-pressure.ts:100-101`; `energy-renewables` at `clean-power-purchasing.ts:49`; `orderOfBattle.<branch>` units, capabilities and headcount by computed key at `capacity.ts:139, 144`, `commitments.ts:217-218`, `forces.ts:154-170`. Only `medianAge` and `literacy` have no reader outside copy, units and fixtures; `energy-nuclear` was not found as a mix read (uncertain). Top risk 1 and §8.1 item 1 use the 32 as proof that hand claims drift. They mostly did not; the scan was blind. |

**Verdict for §0.1: PARTLY CONFIRMED.** Add I7, the two missed registries, and restate the 32 as "30 read through destructuring, computed keys or `Object.values`; 2 dead."

---

## 2. The registry (§5)

| Claim | Verdict | Evidence |
|---|---|---|
| §5.1 "Three pieces exist ... None covers engine runtime state" | **REFUTED** | `engine/src/metric-registry.ts` is an engine runtime registry with a parent/child influence graph, cadence and weight-table links (I4 above). |
| §5.1 rec. 2: new `packages/engine/src/registry/runtime-metrics.ts` | **REFUTED (second variant)** | It duplicates `METRIC_REGISTRY`, which CLAUDE.md forbids ("never add a second variant; extend or defer to the original"). Rec. 1's new `world/src/dataset/metric-registry.ts` would also collide by name with the engine file. |
| §1.1 ten kinds as a fresh vocabulary | **PARTLY REFUTED** | `world/src/metrics/definitions.ts:9-10` already has `QuantityKind = stock / flow / rate / index / count / modeled-score`, used by the reference-series comparison. Two kind vocabularies for the same figures would disagree on the first `rate` vs `index` call. |
| §5.3 typed pass is feasible | **CONFIRMED, cost low** | `typed-probe.mjs`: program build 1.019 s, walk 0.122 s, 448 engine files. |
| §5.3 readers resolve to "a zod `z.object` property assignment in `packages/world/src/schemas/*.ts`" | **REFUTED as stated** | `typed-reader.mjs`: `vitals.ts:132 .birthRate`, `macro.ts:259 .growth`, `capacity.ts:139 .orderOfBattle` and the destructured `.mix` in `commodity-pressure.ts:100` all resolve to `packages/world/dist/schemas/nation.d.ts` property signatures, because `@admin/world` resolves through `dist` (`packages/world/package.json` `exports.types`). The extractor depends on a fresh world `dist`, contradicting §5.4 "no build needed", and must map several d.ts declarations of the same leaf to one path. `vitals.ts:57 .population` resolves to a local type at `vitals.ts:53`: a value passed through a locally declared shape loses its provenance. |
| §5.3 (c) walking `setStats`/`deltas` types resolves spreads | **PARTLY CONFIRMED** | It resolves `macro.ts:197` (helpers return narrow `NextEconomy` etc.). But 29 of 143 payload sites are widened (`typed-probe.mjs`): `metric` 20 of 67 (`Partial<MetricSet>` or `Partial<Record<keyof MetricSet, number>>`, e.g. `legislation.ts:284`, `orders.ts:648`, `appointments.ts:258, 428, 442`, `god.ts:127`), `opinion` 4 of 13, `nationStat` 5 of 45. Each needs a hand narrowing that only the checkpoint census confirms. |
| §5.3 (b) handler's returned literal gives the fields written | **REFUTED for per-key semantics** | `applyMetric` (`effects.ts:119-136`) skips `approval` and reroutes `militaryReadiness` onto the nation stat through `spendReadiness`. A payload key is not the field written. The extractor would list 20 widened `metric` sites as approval writers (check 3 fires) while the handler drops them, and would attribute readiness writes to `player.metrics.militaryReadiness` (a mirror) instead of `stats.military.readiness`. |
| §5.3 readers: computed access over a key union covers the hard cases | **PARTLY CONFIRMED** | Misses `Object.values` / `Object.entries` over a typed record (`bands.ts:41` is how `branchStrength.space` is read). Misses the corpus entirely: scenario gates are JSON (`{"kind":"metric","metric":"stability","atMost":0.85}` in `public-health-000.jsonl`; 32 `"kind":"relationship","field"` gates across shards). The `content-gate` reader class in §5.2 has no extractor. |
| §5.3 pass 2: "Exported `UPPER_CASE` numeric constants" | **REFUTED as scoped** | Engine has 403 exported numeric `UPPER_CASE` constants and 723 module-private ones (grep). The design's own examples `WEEKLY_CASUALTY_RATE` (`war-attrition.ts:26`), `LABOR_FORCE_RATE` (`effects.ts:328`), `FED_FULL_EMPLOYMENT` (`monetary.ts:19`) and `COUP_STABILITY_CEILING` (`foreign-politics.ts:236`) are not exported, and object tables (`WAR_OUTLAYS`, `PRESSURE_WEIGHTS`) are not numeric literals. A ratchet over roughly 1,100 constants is a registration backlog, not a gate. |
| §5.3 pass 3: Proxy census | **PARTLY CONFIRMED, with a hole** | Phases are pure `(state) => EffectPacket[]` (`turn-loop.ts:36`), so a wrapper is possible. But reads behind identity memos are invisible after the first caller: `WeakMap<Campaign, …>` in `state-cohort-opinion.ts:243`, `trade-volume.ts:186`, `governance.ts:649`; `WeakMap<Campaign["people"], …>` in `leader-index.ts:20`. The census must bypass the memos or attribute reads wrongly. Its runtime overhead over 12 × 208 weeks was not measured by anyone. |
| §5.4 check 4 "any state change outside `apply`" on at R1, "gate green on the tree" | **REFUTED** | `turn-loop.ts:89-95` `capTurnPolarization` writes polarization and recomputes approval outside `apply`, deliberately and documented. The week-close history writes are also outside packets. 45 engine files construct `{ ...state, }` or `{ ...campaign, }` copies (grep); separating handlers, bookkeeping and projections needs an allowlist the design does not mention. |
| §5.4 check 6 "two writers own the same cause id" | **REFUTED as computable** | `owns` is a metric-entry field in §5.2 ("cause ids this metric's writer bills") but sits on derived `writers` in the §5.7 population example, and derived fields are "never hand-authored". Cause ids are free strings no extractor can infer, so the check only catches two identical strings; two names for one cause (`war.killed→security`, `conflict.casualties→security`) pass. The dynamic double-billing test is the real control. Prior art: `verify-disposition-readers.mjs` and `verify-opinion-causes.mjs` (cause keys as a closed union with labels) already hold this kind of budget by construction. |
| §5.4 check 7 SCC needs a lagged and a bounded edge | **PARTLY REFUTED (false confidence)** | Any cycle through the six judgments passes, because revision is a declared lag and judgments clamp at 0..1. The check cannot see loop gain, which is what failed in the audits (polarization drained, standing clamped 126 of 208 weeks; approval VERIFY F13). |
| §5.4 check 9 calibration test id exists | **PARTLY REFUTED (false confidence)** | Most cases are `suite: "balance"`, which nothing runs automatically (CLAUDE.md, Test Commands). A case can read `calibrated` while its test has not run since the constant changed. The case needs the commit and result of its last run, or the status must lapse when its constants move. |
| §5.2 `CalibrationCase.tolerance` | **REFUTED (ambiguous)** | Three meanings in the worked entries: an absolute interval (`[0.90, 0.95]` around 0.928), a ± width (`0.0003`), and `tolerance: 0` with `target: [3, 2, 5]` meaning "at most". `naiveBaseline` is prose, so "must beat it" is not checkable. `ImpactSpec.calibration` (`impact-event.ts:45`, not `:44`) already names its fields `status / basis / sourceRefs`; reuse them. |
| §5.6 audits as registry diffs; §5.4 check 10 snapshot staleness | **REFUTED as designed** | `Site` carries `file:line`. Any edit that shifts lines anywhere in engine makes the committed snapshot and `docs/METRICS.md` stale, so every branch regenerates them and parallel sessions conflict on them, the same failure §6 cites for sidecars. An audit diff would be dominated by line moves. `scripts/rule-seam-census.json` already learned this: "Keyed by `path#declaration` ... never by line: moving a function must not reopen a decided site." |
| §5.4 proof twin | **CONFIRMED (pattern)** | DECISIONS §12.4; `verify-rule-seams.mjs` shows the fixture-dir twin pattern. The planted `deltas: { approval }` defect is a runtime no-op (handler drops it), so it proves the check, not a harm. |

**Verdict for §5: needs validation.** Mechanism sound and cheap; premise wrong (it creates a second engine registry), four of ten checks are not computable or not green on today's tree, and line-keyed snapshots defeat the "audits as diffs" goal.

---

## 3. Kinds, timing classes and the queue (§1, §2)

| Claim | Verdict | Evidence |
|---|---|---|
| Ten kinds, write policy per kind | **PARTLY CONFIRMED** | The kinds are coherent and each cites a DECISIONS rule. They must be reconciled with `QuantityKind` (§2 above). Containers are not metrics: R0's "82 `Campaign` fields with kind and write policy" asks for a kind on `congress`, `press`, `macro`. Kind belongs on leaves. |
| `externalShocks` is "already a target-term contribution with a step kernel and a span" | **PARTLY REFUTED** | `ExternalShock` (`external-shocks.ts:16-24`) is a box: constant shift for `weeks` from `fromTurn`. The proposed kernel union (`step at`, `linear`, `decay`, `table`) has no box; `step` has no span. It carries no origin, while `ScheduledContribution.origin` is required. `withShock` merges same nation, kind and turn into one entry (`:50-58`), which erases per-origin identity the queue's "ring bound per origin" and "every entry visible through its origin" need. It is keyed by turn, the queue by date. |
| Save migration | **NOT ADDRESSED (gap)** | `CURRENT_SCHEMA_VERSION = 64`, `MIN_READABLE_SCHEMA_VERSION = 51` (`save.ts:107-108`). Saves 51 to 64 carry origin-less shocks; DECISIONS §9.3 forbids inventing the origin. The design has no migration line for Q1 or for the population ledger (P1), where an older save has no ledger and "absence reads empty" would mean zero people. Each needs a stated rule: synthesize a current stock from state totals (a present fact, not a history) or raise the readable floor. |
| Control 3: drained by date, "so day layout does not change results"; test 28 one-day steps vs one 28-day advance | **PARTLY REFUTED** | The test proves pacing (§2.3), not layout. DECISIONS §2.4's source check says a phase reads its own office day's date and the flat week can differ; `week-identity.test.ts` pins that. A date-drained queue inside a mid-week phase lands a different set under the flat week. Drain order within one date must be declared (§1.4): date, metric, origin id. |
| Control 4: entries "spend the metric's weekly budget at landing" | **REFUTED as specified** | The design never says what happens when the budget is spent: clip, carry, or drop. Today's only joint budget clips (`capTurnPolarization`, `turn-loop.ts:89-95`). Clipping silently loses a quoted amount (violates control 2's "never a silent skip"); carrying smooths a steep move. See §4 for the conflict with steep moves. |
| Generic queue vs bespoke stores | **PARTLY CONFIRMED** | Sound for distributed pass-throughs and rally impulses. The candidate list overreaches: `delayed-consequence` is an empty case kind; retaliation and WIA growth do not exist yet. Start the queue with the first new consumer (rally impulses or the crude-to-pump kernel), not by migrating `externalShocks`, which works and would need the save and origin rules above. |

**Verdict for §1-§2: needs validation.** Taxonomy accepted with the `QuantityKind` merge; queue accepted only with the box kernel, a budget-exhaustion rule, a save rule, and a declared drain order.

---

## 4. The domain model, budgets and graph (§3, §4)

Spot checks that hold (file:line read this session): `OPINION_WEIGHTS` `opinion.ts:79-86`; `PRESSURE_WEIGHTS` `removal.ts:77-84`; `MAX_TURN_POLARIZE` `opinion.ts:539`; `RALLY_PEAK` 0.15, 6 weeks, `CASUALTY_WEIGHT` 0.08, `CASUALTY_CAP` 0.25 `opinion-war.ts:13-25`; strike severity and the direct `metric` and `opinion` writes `strike-outcomes.ts:59-61`; `WAR_OUTLAYS.aggressor` 0.02 × intensity `fiscal-impulse.ts:119-131`; `STATE_ROUTE_CAP` / `TURN_CAP` `domestic-signature.ts:68-70`; `LABOR_FORCE_RATE` `effects.ts:328`; `COUP_STABILITY_CEILING` `foreign-politics.ts:236`; `REVERSION_RATE` `macro.ts:80`; `DRAW_PER_WAR_WEEK` `munitions.ts:63`; `FED_FULL_EMPLOYMENT` `monetary.ts:19`; F20 loop gain 0.11 (approval `VERIFY.md:36`); readiness drain −0.056 a week (coercion `VERIFY.md:66`); casualty anchors (REGIME-VERIFY `:75, :100`); population grain 51 × 6 × 2 = 612 (RESEARCH-SOCIETY `:380`).

| Claim | Verdict | Evidence |
|---|---|---|
| Citation accuracy | **PARTLY CONFIRMED** | Off by a few lines: `impact-event.ts:44` is `accounting`, calibration is `:45`; outbreak is `:30`, not `:31`; `damageShare .15, recoveryDays 14` is `strike-outcomes.ts:54`, not `:58`; phase sequence `98-295`. |
| W1 includes "war outlay by package (S0b)" as a verified first slice | **PARTLY REFUTED** | S0b is in REGIME-CHANGE (`:404`), not in REGIME-VERIFY's required list (§4 items 1-9). REGIME-VERIFY confirms the defect (R9) but did not verify the fix's tests. |
| C10 "No edge from approval or sentiment back to output" | **REFUTED** | `congress.ts:440-453`: chamber disposition drifts to `0.25 + approval·0.55`; disposition passes laws; laws move the program shift that sets the fiscal impulse (`fiscal-impulse.ts` header: "its program, its laws"); impulse → output → unemployment → prosperity → approval. An eleventh cycle, missing from §4.3 and from the mermaid graph (`VOTES` has no outgoing edge). |
| 30 edges, 10 cycles | **PARTLY CONFIRMED** | 30 and 10 as listed; one cycle missing (above). C6 is honestly "untraced". |
| Weekly budgets vs steep, realistic moves | **PARTLY REFUTED** | DESIGN §2.5 item 4 says "steep moves do not need direct writes, because targets plus fast revision deliver them" (`DESIGN.md:188`). But revision is 0.06 a week, so a −0.30 Katrina services target moves the judgment about 0.018 in week 1 and about 0.066 in four weeks. TARGET then makes every queue entry carry a `budgetKey` and spend at landing, so a target-term delivered through the queue can be clipped too. Required: budgets bound direct writes only; target terms are bounded by the law's own revision speed and a target cap; and each budget names its exhaustion rule. Steep moves the owner wants (rally, crude shocks) must be shown passing a scripted test, e.g. a Hormuz closure doubling crude within eight weeks and the 9/11 rally within 1.8 RMSE, with budgets on. |
| One owner per cause | **PARTLY CONFIRMED** | Sound as a rule (DECISIONS §6.3); not mechanically enforceable as designed (§2 check 6). |
| Population ledger cost and order | **PARTLY CONFIRMED** | 612 cells is cheap in state. Unpriced costs: a new founding dataset (state × age × sex counts, age-specific fertility and mortality) the world package does not have; the save rule (§3); age shares feeding the cohort age axis after A1 calibrated on static shares (small within a term, about 0.5 point a year per RESEARCH-SOCIETY). Phase order works: war tick (`conflictPhase`) and daily impacts precede `vitalsPhase`. |
| Strike pipeline | **CONFIRMED as a map of today's code** | Stages cite real sites; stage 9's "strike writes `opinion` and `metric` directly" confirmed at `strike-outcomes.ts:61`. |

**Verdict for §3-§4: needs validation**, as the design itself says. Fix C10, the budget semantics and the S0b provenance.

---

## 5. Scenario storage (§6)

| Claim | Verdict | Evidence |
|---|---|---|
| 322 scenarios, 18 shards, 1.7 MB; largest war line 6,266 | **CONFIRMED** | `manifest.json`; `du -sh` 1.7M; awk max line `war-000.jsonl` 6,266 (7,543 across all shards). |
| `SHARD_LIMIT` 500; append-only header; edits rewrite in place | **CONFIRMED, overstated** | `shard-store.ts:37`. The store documents the in-place exception itself (`reviseInCorpus`, `:319-340`), so it is a declared exception, not a hidden contradiction. |
| "Thirteen files under `scripts/` and five studio-cli corpus modules" | **REFUTED (undercount)** | 18 script files read the shard layout (17 `.mjs` including five proof twins whose fixtures are JSONL trees, plus `scripts/sim/corpus-pool.ts`, the balance harness's pool). Studio-cli: 6 corpus modules plus `scenarios/kit.ts`, `kit-commands.ts`, `brief.ts`, `revision-commands.ts` and `cli.ts`. Also `apps/studio/library-view.mjs` and `prod-status.mjs`. No consequence corpus exists on disk, so "the same for consequences" migrates nothing. |
| The diff and conflict problem is real | **PARTLY CONFIRMED** | Real in kind (one 6 KB line per reply change; adjacent-line edits and sidecars conflict). No shard has changed since `15a5a4505` (2026-08-07), and drafting is held (`53109ecb3`, 2026-10-12), so it is not costing anything now. |
| Runtime parsing and determinism unchanged | **CONFIRMED with one control** | The draw sorts by score then `selector.id` before the seeded roll (`content/src/scenario-director.ts:418, 442`), so corpus order does not change campaigns. Shard bytes and digests will change if order or key order changes (`BUNDLED_SHARD_DIGESTS`, `bundled-corpus.ts:42-44`); prove parsed-set identity, not byte identity. |

**Verdict for §6: accepted, rescoped.** It is independent of the registry; count about 30 touched files, not 18.

---

## 6. Build order (§7)

| Claim | Verdict | Evidence |
|---|---|---|
| R0 depends only on "checkpoint closed" | **REFUTED** | The blockade worktree has uncommitted edits to the exact R0 files: `world/src/dataset/metrics.ts`, `stat-consumers.ts`, `metric-copy.ts`, `schemas/nation.ts`, `engine/src/state-campaign.ts`, `effect-types.ts`, `effects.ts` (`git status`, read-only). `feat/blockade-smaller` has no commits past `38f028039`, an ancestor of HEAD. R0 must start after B1 merges, or seed against it. |
| W1 and A1 depend on R1 | **PARTLY REFUTED** | REGIME-VERIFY makes S0 a prerequisite for any regime work, and DESIGN-VERIFY lets approval slices 0 to 2 start under controls. Neither verdict needs a registry gate. Blocking them behind R1 delays verified defect fixes for a gate that has not been proven green. Let them land and register on landing, as B1 does. |
| BL-143 next free | **CONFIRMED** | `docs/BACKLOG.md:5`. |
| Critical path R0 → R1 → W1 → A0 → A1 → A2 → E1 | **PARTLY CONFIRMED** | A0 has no dependency (table says "—"), so it need not sit after W1. |

**Verdict for §7: needs validation.**

---

## 7. Required changes before the registry build starts

1. **Extend, don't add.** Runtime entries go into `packages/engine/src/metric-registry.ts` (`MetricNode` gains optional `kind`, `writePolicy`, `timing`, `display`, `path`). World entries extend `MetricSpec` in `world/src/dataset/metrics.ts`. The kind vocabulary is one type shared with `world/src/metrics/definitions.ts` `QuantityKind`. No `runtime-metrics.ts`, no second file named `metric-registry.ts`.
2. **Key derived sites by `path#declaration`**, never `file:line`, as `rule-seam-census.json` does. Without this, the snapshot and `METRICS.md` go stale on every edit and audits cannot be diffs.
3. **State the extractor's build dependency.** Either the gate requires a fresh world `dist` (and runs after `verify-dist-freshness`), or it builds its program with `paths` pointing `@admin/world` at `src`. Drop "no build needed".
4. **Model handler semantics explicitly.** A small table, payload key → field actually written, for the handlers that skip or reroute (`applyMetric`: approval dropped, readiness rerouted). Better still, make write policy a type: `MetricEffect.deltas: Partial<Omit<MetricSet, "approval">>` turns check 3 for approval into a compile error.
5. **Narrow or accept the 29 widened payload sites** before checks 3 and 5 can be enforced.
6. **Add a corpus reader pass** for JSON gates (`kind: metric | relationship | conditionActive …` in `ScenarioDef` gates), or mark `content-gate` readers out of scope.
7. **Rescope pass 2** to all `UPPER_CASE` numeric and table constants, exported or not, with a ratchet that starts from the full count and only tracks constants a writer reasons about first (the Doc Sync list).
8. **Drop or defer checks 4, 6 and 7 from R1.** Check 4 needs an allowlist (`capTurnPolarization`, history writes, projections). Check 6 needs cause ids as a closed union (`verify-opinion-causes.mjs` pattern), not strings. Check 7 adds no assurance until it reads loop gain from the census.
9. **Fix the calibration case schema**: one tolerance semantics with an explicit `accept` kind; reuse `ImpactSpec.calibration` field names; record last run (commit, value) so a `calibrated` balance case lapses when its constants change.
10. **Fix the record:** I7 (operators write inflation and crime), the 32 → 2 restatement, C10's missing cycle, the four citation lines, S0b's provenance, the queue's box kernel, budget-exhaustion rule, drain order and save rules for Q1 and P1.
11. **Sequence R0 after B1 merges.**

## 8. Recommended R0 (smaller, most of the value)

What actually rotted: two false reader claims, a test that checks string length, and nothing that ties a claim to code. R0 fixes that and builds the extractor's floor. R0 is not budgets, causes, calibration or the queue.

1. Correct `stat-consumers.ts:55, 61, 65, 71`. Pin `medianAge` and `literacy` as owed (the pinned-owed test at `bands.test.ts:274-278` exists for this).
2. Replace "names a real rule" (`bands.test.ts:245-252`) with claimed-reader resolution: every `module.symbol` token in `readBy` must name an exported symbol. This is §5.3's "would have caught I6", at test cost.
3. Make approval unwritable by type (item 4 of §7).
4. Add optional `kind` (shared vocabulary) and `writePolicy` to `MetricNode` and `MetricSpec`, filled for the nodes that exist today (about 40 engine nodes plus the `NationStats` leaves), not 82 containers.
5. Typed extractor in report mode: writers and readers per registered leaf, keyed by `path#declaration`, printed and not committed, with the 29 widened sites and the corpus gates listed as known blind spots. Promote it to a gate (R1) only once the report is clean enough to ratchet, and only checks 1, 2, 5 and 10.

That delivers provable reader claims, a type-level write policy for the headline, one kind vocabulary and a working extractor, with no generated artifact that goes stale on every edit. `METRICS.md`, the graph, budgets, cause ids and calibration cases follow when the first slice (W1 casualties) needs a calibration case to hold.

## 9. Commands run (from the repo root)

```bash
node docs/audits/2026-10-12-data-model/probes/extract-readers-writers.mjs        # 0.6 s; 47 / 32 / 21 reproduced
node $S/typed-probe.mjs "$PWD"      # typed engine program: 1.0 s build, 29 of 143 widened payload sites
node $S/typed-reader.mjs "$PWD"     # symbol resolution of five stat reads -> world/dist d.ts
find . -name tsconfig.tsbuildinfo -not -path '*/node_modules/*' -newer docs/audits/2026-10-12-data-model/TARGET-MODEL.md   # before and after: unchanged
grep -rnE "<leaf>" --include='*.ts' packages/{engine,content,player-core,world}/src apps/web/src   # per unconfirmed leaf
grep -rn "deathBaseline\|birthBaseline" packages apps scripts studio-cli; git log -S deathBaseline
grep -c "{ id:" packages/engine/src/turn-phases.ts; awk (end of sequence at line 295)
grep -rn METRIC_REGISTRY ...; ls packages/world/src/metrics
grep -o '"kind":"<k>"' content/corpus/shards/*.jsonl
grep -rln "corpus/shards\|shards/\|\.jsonl" scripts; grep -rln "content/corpus\|shard-store" studio-cli/src apps
git -C ../admin-app-blockade status --short; git diff --stat (blockade worktree, read-only)
sed -n of every file:line cited in the tables above
```

Not run: build, typecheck, lint, workspace tests, verify sweep, Playwright, balance harness, the dynamic census.
