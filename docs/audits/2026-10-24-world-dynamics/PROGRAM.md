# World dynamics program

Branch `feat/world-dynamics`. Opened 2026-10-24.

**Owner intent.** One concrete controls-and-policies framework, so a change ripples the way the world would carry it: influence travels by connectedness, favors and grudges build and fall off, a Hormuz closure transmits through prices and delivered volume, legal matters arise and run on real clocks, and other governments act on each other without the player. Realistic at the game's abstraction: right direction, right ordering, rough magnitude, playable and deterministic.

**Inputs.** Six domain audits in [`domains/`](domains/) (network, economy, law, opinion, geopolitics, events), each with its controls table, sources and breaks. [`METHODOLOGY.md`](METHODOLOGY.md) is Codex's fix method, its challenge of every break and the wave and ownership plan; it is binding for this program, and §8 below records where source disagreed with it. The probes are in `packages/engine/src/__probes__/` and `packages/player-core/src/__probes__/`.

## 1. Status

| Wave | Status |
|---|---|
| 0, measurement contracts | **Landed and committed, 2026-10-24** (`9b8ba9e59`). Probes repaired, isolated from the ordinary test run and rerun; the register in §3 carries the observed numbers. |
| 1, paths, signs, accounting, clocks | **Landed and integrated, 2026-10-25** (gate record [`gates/w1.md`](gates/w1.md)). Five lanes in two rounds (1 and 1R), merges `2485c85f9` to `3c2ecd43d`; doc amendments, backlog reconciliation, fresh `dist/` and the Hill golden re-capture in the integration commit. Ran: clean build, workspace typecheck and lint, engine and player-core tests, both probe suites (§3.7). Not run, by instruction: the full workspace test suite, the verify gates, the balance harness (Wave 4). BL-275, BL-276, BL-277, BL-278, BL-280 and BL-281 closed; BL-279 landed, awaiting the balance run. |
| 2, connect consumers | **Landed and integrated, 2026-10-25** (gate record [`gates/w2.md`](gates/w2.md)). The Hill lane (`43379d855`) was gated with Wave 1; the other seven lanes merged at `52bd5268d` to `f5fce5413` (economy, institutions, opinion, reactions, succession, litigation, NPC), and the integration commit carries the owner's rulings of 2026-10-25, the cross-lane fixes, the doc amendments, fresh `dist/` and the Hill golden re-capture. Ran: clean build, workspace typecheck and lint, engine, player-core and content tests, both probe suites (§3.8). Not run, by instruction: the full workspace suite, the verify gates, the balance harness (Wave 4). |
| 2R, review repairs | **Landed, 2026-10-25** (gate record [`gates/w2r.md`](gates/w2r.md)). Eight serious and one minor finding from the independent review of Wave 2, repaired in five lanes and merged `0cb88edee` to `d2d7649f7`, plus `727715986`. Ran: each lane's targeted tests and engine typecheck; 128 covering tests together on the merged tree. Not run: workspace build, full suites, verify gates, balance harness. |
| 3, coverage and calibration | **Landed and integrated, 2026-10-25** (gate record [`gates/w3.md`](gates/w3.md)). Nine lanes and the E27 build merged `15b9609c8` to `96acca4f3` (institutions BL-307; litigation BL-306; reactions BL-285; bodies BL-293 in part; economy BL-302, BL-105 in part, BL-290, BL-287; succession BL-309; NPC BL-292, BL-80, BL-308, BL-300 in part; opinion BL-146 midterms; home events BL-294 in part, BL-295, BL-296; E27, DECISIONS §6.10), and the integration commit `bd7da1cdc` carries the Vice President vacancy, SCO damping, the registry entry, the Security Council export, the doc amendments, the gate bookkeeping, the Hill golden re-take and a fresh `dist/`. Ran: clean build, typecheck, lint, the full suite, all 88 verify gates, both probe suites (eight fail by design, listed in the gate record). Not run: the balance harness on the integrated tree, browser checks. The independent review's findings are repaired (gate record addendum). Not started: the writers' room (BL-297, BL-310). Open: BL-300's 12-seed idle band (the per-pair floor is ruled and built), BL-296's rest clock. |
| 4, integrate and prove | Not started. |

What Wave 0 changed:

1. **Probes no longer ride the ordinary run.** `packages/engine/vitest.config.ts` and `packages/player-core/vitest.config.ts` exclude `src/__probes__/**`. Each package has `pnpm run test:probes` with its own `vitest.probes.config.ts`. A probe for an open break fails by design.
2. **The probes typecheck.** `npx tsc --noEmit -p packages/engine` and `-p packages/player-core` are clean with the probes in the program (the network `PersonId` index and the geopolitics `TurnPhases` errors are fixed). The probes stay inside each package's ordinary `tsconfig` like every other test, so the next clean build emits `dist/__probes__/` in both packages; commit it with the rest of `dist/`. Both `tsconfig.tsbuildinfo` files were deleted after the checks, so the next build is a full emit.
3. **The engine probe no longer breaks the engine's boundary.** The events probe imported `node:fs` and `player-core`/`content` source from inside `packages/engine`, which the engine lint rejects (`eslint.config.mjs`, `ENGINE_FORBIDDEN_IMPORTS`) and which also breaks `tsc -b` there (`rootDir: src`). Its engagement and corpus-coverage tests moved to `packages/player-core/src/__probes__/engagement.probe.test.ts`, which founds through the player's own `openingCampaign`, reads the corpus baked into the build (`bundledCorpusScenarios`) instead of a repo file, and whose probe config aliases `@admin/engine` and `@admin/content` to source. The hardcoded scratch path and its file write are gone.
4. **Censuses read records, not the capped feed.** `packages/engine/src/__probes__/census.ts` folds each advanced week into counts read off dated leadership changes (read weekly because that record keeps only 24), live organization rosters, judicial-seat vacancies and the ledger's uncapped narration. Both the events and the geopolitics probes count coups through it against one band (`COUPS_PER_YEAR`).
5. **The blockade runs through `resolveAction`.** Economy B5 now charges the act's ripples (`resolution.ts:840-843`); the rung resolver it used to call directly skipped them.
6. **Invalid targets were replaced** with the target type METHODOLOGY §2 names (an ordering, a consistency check, an existing contract band), or turned into an `it.todo` that states why the target is not yet sourced, beside a report-only test that still prints the reading. §3 lists each.

## 2. The framework

Six shared propagation mechanisms, each extended once with domain parameters (METHODOLOGY §1, "Shared mechanisms to extend"). Every control below names the rule the game must obey, its benchmark, the kind of target a probe asserts, and where the engine stands. Control ids are the domain audits' own (N network, E economy, L law, O opinion, G geopolitics, V events). Benchmarks marked *unverified* were not opened by the auditor.

Target types follow METHODOLOGY §1: **point** (exact invariant or statutory boundary), **band** (source-supported range, onset, peak and recovery separately), **ordering** (direction or ranking under controlled inputs), **rate** (count over eligible exposure, across seeds).

### 2.1 Network influence

Rule: reach comes from weighted standing connectivity plus recorded contacts, attenuates each hop, visits each recipient once, and leaves willingness to each recipient.

| Control | Benchmark | Target | Engine | Owning file |
|---|---|---|---|---|
| N1/N2 a leader brokers through standing caucus, state and leadership ties | Fowler 2006; CRS RS20881 | ordering: brokered request reaches more members than a direct call | missing | `person-network-influence.ts:14-34,78-94` |
| N4 influence attenuates per hop | design | ordering | held | `person-network-influence.ts:92` |
| N5 issue pressure capped and expiring | design | point | held | `member-votes.ts:45` |
| N15 a wronged member is harder to persuade, charged once | Baumeister et al. 2001 | ordering | contradicted | `ties.ts:107`; `lobbying.ts:270-284,344-353` |
| N16 being overruled costs more than being heeded pays | Baumeister et al. 2001 | ordering | held | `loyalty.ts:42-43` |
| N3 biography degree is heavy-tailed | Dunbar 1993 | n/a | won't fix (§6) | `person-network.ts:39` |

### 2.2 Build-up and decay

Rule: `next = target + (current − target) × 2^(−elapsedDays / halfLifeDays)`, separate build and recovery half-lives, a transient layer and a durable cause-tagged layer; time, not record position, ages memory.

| Control | Benchmark | Target | Engine | Owning file |
|---|---|---|---|---|
| N6/N7 grievances outlast favors of the same size | Baumeister 2001; Klein, Goertz & Diehl 2006 | ordering now; half-life band after campaign tests (26-52 week favor half-life is a candidate, not a fact) | contradicted | `relationships.ts:20-37`; `effects.ts:248` |
| N8 remembered acts fade with elapsed time | inference | ordering | contradicted | `relationships.ts:109-119` |
| N10/N14 repeated favors saturate; relief needs a need | Dreher, Nunnenkamp & Thiele 2008 | ordering | contradicted | `instruments-economic.ts:383-389`; `relationships.ts:277` |
| O-C4/C5 a rally decays, and a public rallies once | Gallup; Morris 2026 (secondary) | band (existing §5.17 fit) plus ordering for serial wars | partial | `opinion-war.ts:42-50,89` |
| O-C16 salience is priced in after eight weeks | DECISIONS §5.16 | point | held | `opinion.ts:249` |
| O-C18 a scandal fades | DECISIONS (nothing pins a metric) | point | contradicted for undated flags | `press-scandal.ts:238-250` |
| O-C15 polarization is a bounded, reverting stock | §5.13 | point | held | `polarization.ts` |
| V-C17 attention fires on change | DECISIONS §2.2, §5.16 | point: one interruption per episode | contradicted | `player-core/summons/due-executive.ts:343-357`; `attention.ts:216-219` |
| E16 a shock fades without ratchet or oscillation | owner test 5 | band | held | `commodity-kernel.ts` |
| E21 a lifted tariff's wedge returns to baseline | Amiti, Redding & Weinstein 2019 | ordering | contradicted | `tariff-prices.ts:75-91` |

### 2.3 Physical flow and prices

Rule: delivered supply after production loss, route restriction, usable bypass, inventory and constrained substitution feeds both world prices and national exposure; export receipts are delivered quantity times price; overlapping losses are deduplicated.

| Control | Benchmark | Target | Engine | Owning file |
|---|---|---|---|---|
| E1 a strait moves a price only through sourced flow net of bypass | §6.10; EIA chokepoints 2026-03-03 | point | held | `commodity-shocks.ts:104` |
| E2 the Hormuz price path | EIA STEO 2026-10-06 (annual and quarterly, not weekly) | band, after flow calibration | partial | `commodity-shocks.ts:41,98-111` |
| E4 nitrogen fertilizer has a Hormuz route | UN/ITC 2026-08-04 (traded urea) | point (route), then band over total nitrogen supply | missing | `commodity-registry.ts:146` |
| E7 a stranded exporter fares worse than an unconstrained one | IEA via Hellenic Shipping News 2026-04-27 | ordering | contradicted | `commodity-pressure.ts:99-107` |
| E8 a stopped flag bears more shortage than a passed one | §6.10 | ordering | contradicted | `commodity-shocks.ts:104` (only reader of `passage.stopped`) |
| E10/E11 pump and CPI pass-through | EIA price components; BLS weights | band | held | `household-prices.ts`; `commodity-pressure.ts` |
| E15 blockade, release, reopen earns nothing | owner test 5 | point | held | `commodity-levers.ts:59` |
| E18 Black Sea grain disruption lifts wheat | FAO 2022 (not isolated from other causes) | band, after port and bypass data | contradicted | `commodity-shocks.ts:38` |
| E19 a Taiwan war constrains US output through chips | Bloomberg Economics 2024 (secondhand scenario model) | ordering, after a critical-input model | missing | `external-pressure.ts:236-246` |
| E20 tariff border pass-through near complete | Amiti, Redding & Weinstein 2019 | band | held | `trade-sectors.ts` |
| E22 tariffs divert trade over time, bounded by capacity | Fajgelbaum et al. 2020 (*unverified*) | ordering with a sourced delay | missing | `trade-volume.ts:115-154` |
| E23 standing retaliation reaches US output | USDA ERS 2022-03-07 | ordering (sign) | contradicted | `trade.ts:685,720`; `external-pressure.ts` |
| E25 a US measure's reach is the same in world supply and in the target's growth | World Bank WDI (not a coefficient) | ordering: US embargo hurts Iran at least as much as one by its largest buyer | contradicted | `external-pressure.ts:210-216` vs `commodity-shocks.ts:177-179` |
| O-C9 an oil shock reaches approval with a lag, through CPI | none sourced | band | lacks | `opinion.ts:637-644`; `commodity-pressure.ts:77-82` |

### 2.4 Third-party reaction

Rule: a signed, bounded response reads the observer's ties to both actor and target, defense obligations, economic exposure, threat and the act's character, and whether the observer already runs the same policy. Rivalry may yield neutrality, never automatic approval. Sanctions, blockades, strikes and NPC acts all go through `resolveAction`.

| Control | Benchmark | Target | Engine | Owning file |
|---|---|---|---|---|
| N11 observers react by their own ties; a government that distrusts the target does not cool toward its coercer | Maoz et al. 2007; EU Reg. 267/2012 Art. 11 | ordering | contradicted | `resolution-ripples.ts:39-74,158-169` |
| N12 an ally's reaction scales with closeness | inference | ordering | contradicted | `resolution-ripples.ts:16-20,63` |
| N13 NPC-on-NPC coercion ripples | as N11 | point | held | `resolution-ripples.ts` |
| E13 a blockade's observers differ by stake | China buys most Iranian crude (*unverified*) | ordering | held through `resolveAction`, thinly | `resolution.ts:840-843` |
| G1/G2 collective defense draws partners in, never to the aggressor | North Atlantic Treaty Arts. 5-6 | ordering | held | `war-join.ts:176-183`; `compacts.ts:354-376` |
| G4 restraint in a great-power proxy war | 2022-2026 record | point | held | `war-join.ts` |
| G16 designation needs no bilateral trade | OFAC program list 2026-10-24 | point | contradicted | `instruments-economic.ts:73-76` |
| G21 a capable government answers coercion in some form | USTR 2018 (*unverified*) | rate across seeds | contradicted | `npc-agent.ts:293-322`; `npc-turn.ts:111-126` |
| G23 partners are pressed less than neutrals | alliance record | ordering per dyad | contradicted | `npc-agent.ts:166-187,242-252` |
| G17 no full war between nuclear-armed pairs | nuclear-era record | point | held | `instrument-gates.ts:201-204` |
| G19 an undeclared arsenal still deters | SIPRI 2025 (count *unverified*) | point, after a dated estimate | contradicted | `world/nations.ts:1101` |
| G6/G7 UN Security Council with P5 veto; SCO | UN Charter Art. 27(3) | point (vote arithmetic), then effects | missing | `world/orgs-cradles.ts` |

### 2.5 Legal exposure and procedure

Rule: exposure, filing, standing, interim relief, merits, appeal and remedy are separate steps; authority and scope stay on the originating act; clocks are calendar or source-defined session clocks; a filing deadline is not a minimum wait; every representation of a dispute links to one origin.

| Control | Benchmark | Target | Engine | Owning file |
|---|---|---|---|---|
| L-C1 to C4 War Powers clocks, override, impeachment arithmetic | 50 U.S.C. 1543-1544; Art. I | point | held | `war-powers-report.ts:77-80`; `congress.ts:65` |
| L-C10 Section 122's 150 days hold across reissue | 19 U.S.C. 2132 | point | contradicted | `tariff-orders.ts:105-134` |
| L-C11 a tariff carries legal exposure | *Learning Resources* 2026-02-20 | point (exposure exists), then rate | lacks | no court subject for trade (BL-190) |
| L-C12/C13 interim relief in days to weeks; merits on the October term | Fed. R. Civ. P. 65(b), Sup. Ct. R. 13 (recalled, *unverified*) | band after verification | partial | `court-procedure.ts:13-15`; `court-calendar.ts` |
| L-C15/C16 filing depends on salience, injury and plaintiffs, not lawfulness | standard practice (*unverified* counts) | ordering | contradicted | `orders.ts:486-500`; `state-suits.ts:1-7` |
| L-C17 NEA annual continuation | 50 U.S.C. 1622(d) | point | held | `emergency.ts:23-90` |
| L-C18/C19 an enacted sunset binds; Congress can end an emergency | 50 U.S.C. 1622(a); the act's own summary | point | contradicted | `legislative-acts.ts:335-345`; `emergency.ts:72-78` |
| L-C21 Impoundment Control Act, 45 days of continuous session | 2 U.S.C. 683-684 | point (session clock, not calendar) | lacks | BL-227 |
| L-C25 to C27 removal and directive law | *Trump v. Slaughter* 2026-06-29 (law-firm summary; primary *unverified*) | point after primary verification | contradicted | `institution-catalog.ts:147-161`; `directives.ts:209-217` |
| L-C28 IRS audit directive barred | 26 U.S.C. 7217 | point | held | `directives.ts:218-225` |
| L-C29 IG removal needs a case-specific account | 5 U.S.C. 403(b) as amended 2022 | point (structured account, legal exposure if deficient) | partial | `inspectors-general.ts:279-287` |
| L-C30/C31 AG supervises special counsel; Vacancies Act eligibility | 28 C.F.R. 600.7; 5 U.S.C. 3345-3349d | point | partial | `special-counsel.ts:21-28`; `appointments.ts:304-327` |
| L-C35 a strike-down costs what the act and remedy cost | *Learning Resources* | ordering | partial | `judicial-review.ts:33` |
| V-C11 an exogenous docket | DECISIONS §13.12 (accepted, not built) | rate, after a sourced benchmark | lacks | `court-calendar.ts`; `judicial-review.ts` |

### 2.6 Event and response hazards

Rule: dated, keyed hazards conditional on eligibility and state, `p = 1 − exp(−λ × elapsedTime)`; a cooldown makes an event eligible, not inevitable; persistent trouble is a condition; simulated occurrence, presidential case and feed presentation are counted separately.

| Control | Benchmark | Target | Engine | Owning file |
|---|---|---|---|---|
| V-C2 significant acute conditions at home, 4 to 12 a year | CRS IF12834 (decade averages) | rate | held | `condition-onset.ts:112` |
| V-C1 Stafford requests come from affected states | 42 U.S.C. 5170 | ordering | contradicted | `obligations.ts:101-146` |
| V-C3/C5/C6 hazard fatality, frequency and severity | AP on CDC certificates (secondary); NHC (no figures) | band, after a comparable incident series | contradicted / partial | `impact-catalog.ts:15`; `condition-onset.ts:662` |
| V-C4 placement follows hazard exposure, not population alone | SPC via The Weather Channel (*unverified*) | ordering | partial | `us-placement.ts:86-96` |
| V-C7/C8/C15 bank failures, strikes, mass-casualty attacks, hostage cases as home records | FDIC; BLS; GVA (mixed) | rate across seeds | missing | `condition-kinds.ts:15-29,99` |
| G12/V-C9 successful coups, from dated records | Powell & Thyne via RAND (*unverified*) | band 0.5 to 8 a year | held (2.6 to 5.2 a year) | `foreign-politics.ts:237-250` |
| G13 foreign elections on each calendar | IFES (*unverified*) | rate | held | `foreign-politics.ts:84-196` |
| V-C10 international bodies rarely lose members | OPEC exits (opened) | rate | contradicted | `world-events.ts:166-170,228-251` |
| V-C12 office-holders die at life-table rates | CDC life tables (already used for judges) | rate | contradicted | `judicial-vacancies.ts:75` is the only writer |
| V-C13 cabinet turnover inside the existing term bands | `term-balance.test.ts:105-111` (Brookings) | band | held | `cabinet*.ts` |
| G8 NPC war onsets | UCDP counts active conflicts, not onsets | rate after an onset benchmark | not established | `coercion-tempo.ts:21`; `conflicts.ts:261` |
| G10/G11 border clashes cluster in episodes, and a NATO-flank clash is an alliance event | Galwan, MID (*unverified*) | ordering and rate | contradicted | `world-events.ts:129-159`; `world-event-templates.ts:83-84` |
| V-BR07 scenario recurrence | `scenario-recurrence.test.ts:27-33` (56 days) | contract to be set | not established | `packages/content/src/scenario-director.ts` |

## 3. Break register

Verdicts are METHODOLOGY §2's after challenge, checked against source here: **real**, **real, needs calibration** (the defect is real, the magnitude is not sourced), **target-invalid** (the probe's target was wrong; the probe now asserts the corrected type), **won't-fix-abstraction** (§6), **not-proved**. Probe results are the Wave 0 run of 2026-10-24 (`pnpm run test:probes` in each package): **fail** reproduces the break, **pass** is a held control or a reading that clears its target, **todo**/**skip** means the target is not yet sourced or is ruled out. Sizes follow the domain audits where they gave one.

### 3.1 Network (`domains/network.md`)

| ID | Sev | Verdict | Mechanism | Fix | Model | Size | Wave | BL | Probe, observed |
|---|---|---|---|---|---|---|---|---|---|
| B1 | critical | real | `person-network-influence.ts:14-20,80` reads recorded contacts only | standing caucus, state-delegation and leadership edges; the committee roster does not exist yet (`state-legislature.ts:372-387`) | Opus contract, Codex consumer | M | 2 | BL-283 | fail: contacts 0, leader reach 8, responses 0, touched 1 |
| B2 | high | won't-fix-abstraction (biography graph); functional part folds into B1 | `person-network.ts:39` display cap | none for the dossier graph | n/a | n/a | n/a | n/a | skip; report: degree 3 and 6 both reach 2 |
| B3 | critical | real | `relationships.ts:20-36` linear decay; trust has no reversion | transient and durable layers, shared half-life form | Opus | M | 1 | BL-277 | fail: favor residual 0.102, grudge 0.000 after 13 weeks; 0.25 grudge clears in 3 to 6 weeks (report) |
| B4 | medium | real | `relationships.ts:109-119` rank decay only | elapsed-time decay on history | Opus (same lane) | S | 1 | BL-277 | fail: 0.06 for last week and ten years ago |
| B5 | critical | real (sign); the automatic `−sign(disposition)` rule is rejected | `resolution-ripples.ts:158-169` one direction | signed observer response | Opus | M | 2 | BL-282 | fail: 34 observers whose trust toward Iran is negative (SAU, ARE and ISR among them) cool toward the US by 0.017 to 0.021 |
| B6 | high | real | `resolution-ripples.ts:16-20,63` class constants, 0.4 cliff | continuous ties and exposure inside B5 | Opus | S | 2 | BL-282 | fail: 30 allies, one magnitude 0.048, trust 0.41 to 0.75 |
| B7 | high | real | `instruments-economic.ts:383-389` no need gate or saturation | need gate, habituation by recipient and purpose | Codex, Opus-reviewed spec | S | 2 | BL-284 | fail: 12 shipments, gains 0.037 to 0.044, total 0.412, flat cost |
| B8 | medium | real | `ties.ts:107` written, never read | charge decayed grudges once, in willingness terms | Codex | S | 2 | BL-120 (extended) | fail: 0.607 with and without five grudges |
| B9 | medium | real data issue; near-zero flows *unverified* | `world/trade.ts:128-162` | list from magnitude; ripples read magnitude | Sonnet | S | 2 | BL-285 | not probed directly; Iran's list has 41 entries including USA and ISR |

### 3.2 Economy (`domains/economy.md`)

| ID | Sev | Verdict | Mechanism | Fix | Model | Size | Wave | BL | Probe, observed |
|---|---|---|---|---|---|---|---|---|---|
| B1 | high | real, needs calibration (target-invalid as ≥1.5) | `commodity-shocks.ts:41,98-111` | calibrate lost flow, then the price path | Opus | M | 3 | BL-105 (extended) | report + todo: peak 1.381 |
| B2 | high | real (missing route); 1.15 unsupported | `commodity-registry.ts:146` `routes: []` | route plus supply-denominator conversion | Sonnet data, Opus contract | S | 3 | BL-105 (extended) | fail (route absent); report: peak 1.011 |
| B3 | critical | real | `commodity-pressure.ts:99-107` pays rent on price alone | receipts on delivered volume | Opus | M | 1 | BL-275 | fail: KWT +0.0092, QAT +0.0092, IRQ +0.0126 against NOR +0.0040 |
| B4 | high | real | `commodity-shocks.ts:104` only reader of `passage.stopped` | national physical-shortfall channel | Opus | M | 1 | BL-275 | fail: hit ratio 0.858 against price ratio 0.785 |
| B5 | medium | not-proved as a blockade defect; remainder belongs to network B5/B6 | probe bypassed `resolution.ts:840-843` | none separate | n/a | n/a | 2 | BL-282 | **pass** through `resolveAction`: 54 ripples; CHN −0.171 trust against JPN −0.161, every observer within 0.011 |
| B6 | high | real, needs calibration | `commodity-shocks.ts:38`; no Black Sea route | sourced port and bypass data | Sonnet | M | 3 | BL-105 (extended) | report + todo: peak 1.061 |
| B7 | critical | real (missing critical-input channel); −2-point floor unsupported | `external-pressure.ts:236-246` | semiconductor input with capacity and substitution | Opus | L | 3 | BL-290 | report + todo: −0.000124 |
| B8 | critical | real | `external-pressure.ts:210-216` vs `commodity-shocks.ts:177-179` | one scoped reach record (sector, direction, authority, financial reach) | Opus | M | 1 | BL-276 | fail: US embargo −0.000002 against a Chinese embargo −0.001519 |
| B9 | high | real (inconsistency; player profit not shown) | `tariff-prices.ts:75-91` | lifted wedge phases back out | Codex after contract | S | 2 | BL-286 | fail: held 0.000121, cycled 0.000484, cycled peak 0.000484 a year after the last lift |
| B10 | medium | real | `trade-volume.ts:115-154` | reallocation with capacity and delay | Opus | M | 2 | BL-287 | report + todo: VNM 69,371.79 before and after |
| B11 | medium | real | `trade.ts:685,720`; no macro reader | value-added channel; remove the one-week Treasury debit | Opus | M | 2 | BL-287 | fail: US growth change 0 |
| B12, C1 | n/a | controls | | | | | | | pass: crude 1.013 a year after reopening, low 0.987; second war 1.370 against 1.375; 2.31 cents a gallon per dollar |

### 3.3 Law (`domains/law.md`)

| ID | Sev | Verdict | Mechanism | Fix | Model | Size | Wave | BL | Probe, observed |
|---|---|---|---|---|---|---|---|---|---|
| L1 | high | real (filing and merits conflated); ≥0.75 uncalibrated | `orders.ts:486-500` | separate filing from merits | Opus | M | 2 | BL-123 (extended) | report + todo: border controls 0.17, entry suspension 0.442, emergency construction 0.594; range 0.085 to 0.594 over 12 orders |
| L2 | medium | real | `state-suits.ts:1-7` selector only | parties from injury and institutional authority | Opus | M | 2 | BL-123 (extended) | fail: the opened border-controls proceeding names no party |
| L3 | high | real (stages one turn apart); cert minimum target-invalid | `court-procedure.ts:13-15` | expedited relief separate from merits and appeal | Opus | M | 2 | BL-123 (extended) | fail: interim ruling at week 6 to 7 (threshold 0, interim 6, lower merits 7, final 13); cert check is now a todo |
| L4 | critical | target-invalid as a volume floor; missing exogenous docket real | no docket (§13.12) | aggregate background docket | Opus | L | 2 | BL-123 (extended) | report + todo: 197 weeks, 0 orders signed, 3 distinct disputes, all 3 not from a presidential act, 3 cases, 3 oversight matters |
| T1 | high | real | `tariff-orders.ts:105-134` | authority episode clock | Sonnet spec, Codex | S | 1 | BL-278 | fail: no live s122 measure at day 160, and a fresh 15% tariff accepted |
| T2 | high | real (no exposure); single-seed suit target-invalid | no trade court subject | exposure into the common proceeding | Opus, after BL-190's ruling | M | 2 | BL-190 (extended) | report + todo: 0 proceedings, 0 cases after 330 days |
| R1, R2 | high | needs primary legal verification | `institution-catalog.ts:147-161` | verify holding, scope, date, then correct | Sonnet | M | 2 | BL-225 (extended) | fail: SEC and FTC `for-cause`; the SEC enforcement directive refused |
| R3 | medium | real | `directives.ts:209-217` | route through AG judgment and willingness | Sonnet | M | 2 | BL-225 (extended) | fail: the DOJ investigation directive refused as if by statute |
| R4 | medium | real | `inspectors-general.ts:279-287` | structured account and exposure | Sonnet | S | 2 | BL-225 (extended) | fail: "changing priorities" accepted |
| E1 | high | real (definite) | `legislative-acts.ts:335-345`; `emergency.ts:72-78` | common authority clock reads the statute book | Sonnet | M | 1 | BL-278 | fail: still under the emergency at day 126 with the act in force |
| C1 | high | real (already BL-227); string probe is not behavioral | none | rescission, deferral, session clock | Opus | L | 2 | BL-227 (extended) | fail: no order or act names rescission, impoundment or deferral |
| X1 | medium | real | `judicial-review.ts:33` | consequence by act and remedy | Sonnet | M | 2 | BL-123 (extended) | code-read |
| X2 | medium | real | `special-counsel.ts:21-28` | AG supervision under 28 C.F.R. 600.7 | Sonnet | M | 2 | BL-225 (extended) | code-read |
| X3 | medium | real | `appointments.ts:304-327` | eligible classes, nominee rule, clocks | Sonnet | M | 2 | BL-225 (extended) | code-read |
| X4 | low | NEA termination real; pocket veto and Byrd rule won't-fix | `signing-window.ts:14-16` | joint-resolution termination | Sonnet | S | 1 | BL-278 | code-read |
| C7/C8, C34 | n/a | real (findings, no probe) | `strike-odds.ts:143-145` | separate legal grounds; misconduct into the exposure stream | Opus | M | 2 | BL-123 (extended) | code-read |

### 3.4 Opinion (`domains/opinion.md`)

| ID | Sev | Verdict | Mechanism | Fix | Model | Size | Wave | BL | Probe, observed |
|---|---|---|---|---|---|---|---|---|---|
| B1 | medium | real latent path; reachability and net gain unproved | `opinion-war.ts:42-50,89` | shared rally fatigue, after valid-act testing; amend §5.17 | Opus | M | 2 | BL-289 | fail: first lift 0.132, still 0.082 at week 56 (probe injects wars directly) |
| B2 | high | real (definite) | `opinion-causes.ts:313` `Math.max(0, growth) * 2` | bounded signed term | Sonnet | S | 1 | BL-279 | fail: 0.6254 at 0% and at −5% |
| B3 | medium | won't-fix-abstraction as a ≥6-point floor | `opinion-causes.ts` economy terms | none until a sourced series (BL-146 slice 6) | n/a | n/a | n/a | BL-146 | pass (direction): 0.604 to 0.581; todo for the band |
| B4 | high | real (salience accelerates recovery); weak pass-through not proved | `opinion.ts:637-644` | contribution-aware revision; amend §5.16; no second gas penalty | Sonnet rule, Opus check | S | 2 | BL-288 | fail: war arm 0.6073 against control 0.6033 at week 26 |
| B5 | high | real, needs calibration (−37 at 40% is too literal) | `election-seating.ts:62,78,148-168` | conditional distributions, starting seats, geography | Sonnet, owner balance run | M | 3 | BL-146 (extended) | fail: −18 at 0.39, −33 at the floor |
| B6 | high | real (definite latent defect) | `press-scandal.ts:238-250` | stamp centrally, migrate saves | Sonnet | S | 1 | BL-280 | fail: still live after 104 weeks; 3.4 points |
| controls | | | | | | | | | pass: floor 0.177, ceiling 0.801, rally 14.8 points falling to 4.9 at a year, Senate −5, re-election boundary, polarization 0.850 to 1.250, salience off after week 8 |

### 3.5 Geopolitics (`domains/geopolitics.md`)

| ID | Sev | Verdict | Mechanism | Fix | Model | Size | Wave | BL | Probe, observed |
|---|---|---|---|---|---|---|---|---|---|
| GEO-1 | high | target-invalid (active conflicts are not onsets) | `coercion-tempo.ts:21`; `conflicts.ts:261` | measure onsets, durations and occupancy; any escalation path inside §6.13 | Opus | M | 3 | BL-292 | todo; report: 0.125 NPC war onsets a year (1 in 8 seed-years), 0.45 NPC war-years running a year |
| GEO-2 | high | real | `world-events.ts:129-159`; `world-event-templates.ts:83-84` | episode-conditioned clash hazard; alliance consultation on a member's border | Opus (lane shared with BR-04) | M | 3 | BL-292 | fail: IND-PAK, RUS-UKR, ARM-AZE 9 clashes each at one 12-week gap; 50 NATO-flank clashes in two years once each pair-week counts once; 76 clashes a year worldwide |
| GEO-3 | critical | real (definite) | `instruments-economic.ts:73-76` | designation authority and financial reach for rungs 3-4 | Codex gate, Opus contract | S | 1 | BL-276 | fail: IRN, PRK, CUB, BLR, NIC refused for "a live trade channel"; 117 governments have no US channel |
| GEO-4 | high | real; same-instrument retaliation in every seed is too rigid | `npc-agent.ts:293-322`; `npc-turn.ts:111-126` | bounded response intent and actor-draw opportunity | Opus | M | 2 | BL-298 | fail: 0 answers by China in 12 weeks on 3 seeds, by any instrument; Honduras 0 too, so the ordering is empty; China's top candidate after US sanctions is military pressure on Russia (2.449) |
| GEO-5 | medium | real; ≤10% share arbitrary | `npc-agent.ts:166-187,242-252` | alignment restraint in scoring | Opus (same lane) | S | 2 | BL-298 | fail: 8 of 47 military rung-2+ acts at aligned partners (all CHN to RUS); per-dyad rate 0.0049 at partners against 0.00091 at neutrals |
| GEO-6 | high | won't-fix under §6.9 | `instrument-gates.ts:201-204` | owner amendment first | n/a | n/a | n/a | n/a | skip |
| GEO-7 | medium | real data defect; count *unverified* | `world/nations.ts:1101`; `regime-acts.ts:199-202` | dated estimate; reconcile nuclear predicates with §6.15 | Sonnet data, Opus predicate | S | 3 | BL-293 | fail: Israel `{ warheads: 0, deliveryTriad: false, declared: false }` |
| GEO-8 | high | real; presence proves no voting | not modeled | vote arithmetic, veto, effects | Opus design, Codex build | L | 3 | BL-293 | fail: no UN body |
| GEO-9 | low | real, low priority | `world/orgs-cradles.ts` | sourced political body | Sonnet | S | 3 | BL-293 | fail: no `ORG-SCO` |
| GEO-10 | medium | won't-fix-abstraction as stated | `npc-turn.ts:41,125` | none; relax only after tempo measurements | n/a | n/a | n/a | n/a | report: not re-measured this run (the audit: cap bound 104 of 104 weeks) |
| controls | | | | | | | | | pass: NATO joins Estonia 12, 7 and 11 in four weeks, none to Russia; no NATO forces in Ukraine over a year; hedger edges within 0.3; no nuclear-pair war; 6.25 third-party sanctions a year; 44.6 elections a year; coups 2.625 a year (records) |

### 3.6 Events (`domains/events.md`, engine and player-core probes)

| ID | Sev | Verdict | Mechanism | Fix | Model | Size | Wave | BL | Probe, observed |
|---|---|---|---|---|---|---|---|---|---|
| BR-01 | critical | real; random player death excluded | `judicial-vacancies.ts:75` only writer of `alive: false` | life-table mortality for occupied offices, once per person | Opus | L | 2 | BL-291 | fail: 0, 0 and 0 people dead other than judges in three idle four-year runs |
| BR-02 | critical | real (blanket absence false: cyber has an operator path, `operators.ts:260-300`) | `condition-kinds.ts:15-29,99` | trace each family; extend operators and incidents | Opus design, Codex families | L | 3 | BL-294 | fail: no home record of a cyber incident, mass-casualty attack, work stoppage, bank failure or hostage case in three runs; no record kind exists for the last four |
| BR-03 | high | partly real: investigations and leaks exist; governor-legislature, Fed and primary events do not appear | no domestic-actor phase | trace consumers; reuse willingness, calendar, oversight | Opus | L | 3 | BL-294 | fail for governor-legislature 0, Fed 0, primary 0; **pass** for investigations (6 committee inquiries into leaks) and cabinet leaks (5); the audit's zeros for these two were feed artifacts |
| BR-04 | high | real (raising `LEAVER_TRUST` has the wrong sign) | `world-events.ts:166-170,228-251` | body-specific procedure, benefits, grievances, costs | Opus (NPC lane) | M | 3 | BL-80 (extended) | fail: most exits in any run OPEC+ 14, BRICS 7, EU 6, GCC 4, AU 1; accessions EU 3 to 5 |
| BR-05 | high | real UX defect; rate needs multi-seed confirmation | `attention.ts:97,216-219` | unchanged deferred matters ambient | Opus contract | M | 1 | BL-281 | report + todo: ev-1 9.37 stops per 30 days, median 3 days; ev-2 6.58, median 4 |
| BR-06 | high | real (definite level trigger) | `due-executive.ts:343-357` | one interruption per rung episode | Sonnet | S | 1 | BL-281 | fail: ev-1 removal summons on 35 of 114 stops, 34 inside one episode at the 0.45 rung |
| BR-07 | medium | recurrence contract not set | `scenario-director.ts`; `scenario-recurrence.test.ts:27-33` | episode-sensitive contract | Sonnet | S | 3 | BL-296 | report + todo: 134 answered, 1 repeat within 56 days, 12 within 90; seeds share 0.186 of first-year scenarios (pass) |
| BR-08 | high | real gaps, weak targets | `impact-catalog.ts:3-5,15`; `condition-onset.ts:662`; `us-placement.ts:86-96` | fit exposure, vulnerability, footprint; cite sources | Opus design, Sonnet data | M | 3 | BL-295 | fail: NYC 0.098 of city tornadoes; catalog `sourceRefs` empty; report + todos: severity 0.300 to 0.700, heat 0.17 deaths a year against tornado 68.6, hurricanes 0, 1, 3 per run |
| BR-09 | medium | real (overbroad requests; heat may lawfully be requested) | `obligations.ts:101-146` | affected states, state capacity, eligibility at the declaration | Sonnet | S | 3 | BL-295 | fail: 51 requests from 51 states for one nation-scope heat wave |
| BR-10 | medium | content gap; every-class-every-campaign won't-fix | baked corpus | readers for reachable causes | writers' room | M | 3 | BL-297 | fail: `cyclone`, `wildfire`, `tornado` have no gated scenario |
| BR-11 | medium | coups: **not a defect**, the 0.083 was a headline artifact; fiscal crisis: referent undefined | `foreign-politics.ts:237-250`; `condition-onset.ts:370` | coups none; fiscal: define the referent first | Sonnet | S | 3 | BL-295 | **pass**: 5.17 successful coups a year from records (23, 15, 24 per four-year run) and 2.63 in the geopolitics runs, both inside 0.5 to 8; report + todo: 20.8 fiscal-crisis spells a year |
| BR-12 | medium | real, accepted in §13.12 | none | merged with law L4 | Opus | L | 2 | BL-123 (extended) | see L4 |
| C12b | n/a | **not a defect**: the audit's 2 to 3 vacancies were capped headlines | `judicial-vacancies.ts` | none | n/a | n/a | n/a | n/a | pass: 13, 15 and 14 judicial seats vacated per four-year run |
| controls | | | | | | | | | pass: 4.67 significant acute conditions a year at home; passive cabinet 8 departures and 9 leaks, inside the term bands; every 30-day window has a stop or ambient event |

Two readings in this table want a check in Wave 4 rather than an item now: the coup rate over four-year runs (5.2 a year) is about twice the two-year rate (2.6), on different seeds, which may be accumulating instability; and RAND's reading of Powell and Thyne (1.65 successes a year, unverified) sits at the band's low end.

**Wave 0 totals.** Engine probes: 124 tests, 50 pass, 53 fail, 2 skipped, 19 todo (the full run plus the events rerun after the narration fix). Player-core engagement probes: 8 tests, 4 pass, 2 fail, 2 todo.

### 3.7 Wave 1 probe run (2026-10-25)

Run on the integration tree (`43379d855` plus the integration commit: Wave 1 and Wave 1R merged, the Wave 2 Hill lane merged), Node 22.23.1, after a clean build: `pnpm --filter @admin/engine run test:probes` and `pnpm --filter @admin/player-core run test:probes`.

| Suite | Tests | Pass | Fail | Skipped | Todo | Wave 0 (pass / fail / skip / todo) |
|---|---|---|---|---|---|---|
| Engine probes | 124 | 67 | 37 | 2 | 18 | 50 / 53 / 2 / 19 |
| Player-core engagement probes | 8 | 5 | 1 | 0 | 2 | 4 / 2 / 0 / 2 |

The engine todo count fell by one because network B2's functional-connectivity `it.todo` became an ordering test (sparse 2, connected 4).

**Fail to pass (18):** economy B3 ×3 (KWT −0.0393, QAT −0.0651, IRQ −0.0332 against NOR +0.0040), B4 (hit ratio 0.573 against price ratio 0.786), B8 (US embargo −0.0261 against China −0.0076), B11 (−0.000016, direction only); geopolitics D0 (none refused); law T1 and E1; network 1a (8 responses, 9 people pressured), 2b (favor 0.081, grudge 0.093), 2c (0.0589 against 0.0000057), 4b (call chance 0.607 → 0.408); opinion 3a (0.6254 against 0.5254), 7a (no live scandal), 7b (0.6043 both); engagement "once per removal-pressure episode" (ev-1 `{1@0.45: 1, 2@0.52: 1, 3@0.45: 1}`). Two came in as side effects: events "no body loses more than two members in four years" (OPEC+ 1, was 14; BL-80 stays open) and events "cabinet leak or infighting" (already a pass in the Wave 0 events rerun).

**Pass to fail (1):** economy B5, China −0.0848 against Japan −0.0885 (was −0.171 against −0.161); recorded on BL-282.

**Still failing, by item:** economy B2 (BL-105), B9 (BL-286); network 3a and 3b (BL-282), 4a (BL-284); law R1 to R4 (BL-225), C1 (BL-227), L2 and L3 (BL-123); opinion 2 (BL-289), 4 ×2 (BL-146), 10 (BL-288); geopolitics A2, D ×2 (BL-298), A3 ×2 (BL-292), C (BL-293), E ×2 (BL-293); events A ×3 (BL-295), B ×5 (BL-294), C ×4 (BL-294, BL-291); engagement B2 (BL-297, fails by design).

Readings moved since Wave 0: B1 crude peak 1.381 → 1.377; network 1d now isolates its authored chain (depth 1 at 0.06, depth 2 at 0.03); 2a now reports a half-life (median 98 weeks; a 0.25 grudge is forgotten after a median of 555 weeks); stops per 30 days for a deferring President ev-1 9.37 → 7.97 (97 stops), ev-2 6.58 → 6.58 (80 stops); border clashes 85.4 a year in the geopolitics idle run (the Wave 0 register gave 76).

### 3.8 Wave 2 probe run (2026-10-25)

Run on the integration tree (all eight Wave 2 lanes merged, `f5fce5413`, plus the integration commit), Node 22.23.1, after a clean build: `pnpm --filter @admin/engine run test:probes` and `pnpm --filter @admin/player-core run test:probes`. The full engine run came first; C1's assertion was then rewritten to the message's own date (a message is dated at the week's sitting, so its 45th day of session is campaign day 52, not 45) and `law.probe.test.ts` rerun alone: 21 of 21.

| Suite | Tests | Pass | Fail | Skipped | Todo | Wave 1 (pass / fail / skip / todo) |
|---|---|---|---|---|---|---|
| Engine probes, full run | 128 | 92 | 21 | 2 | 13 | 67 / 37 / 2 / 18 |
| Engine probes, with the C1 rerun | 128 | 93 | 20 | 2 | 13 | |
| Player-core engagement probes | 8 | 5 | 1 | 0 | 2 | 5 / 1 / 0 / 2 |

Four entries were added, two of them at integration (network 4a split in two: relief without need is refused, development grants saturate; and events "kills 4 to 16 members of Congress in office in each four-year run"), and five todos became tests: law L1, L3 cert and L4 (litigation lane), T2 (BL-190's ruling) and economy B10 (the diversion ordering).

**Fail to pass:** economy B5 (China −0.0903 against Japan −0.0074 toward the United States eight weeks after a blockade of Iran) and B9 (held 0.000121; four lifted cycles end at about 0); network 3a (no distruster of Iran cools; one shared-policy approver), 3b (27 distinct magnitudes over 30 allies, trust 0.40 to 0.75) and both halves of 4a (relief refused with no condition; twelve grants, six land, late mean 0.0183 against the first 0.0645); law R1 to R4 (R1 and R2 rewritten to the owner's commission ruling), L2, L3 and C1 (rewritten to the pro forma ruling: released on campaign day 54, in the week of the 45th day of session); opinion 2b (lift at week 56 0.037, was 0.082); geopolitics A2 (0 of 87 military acts at aligned partners, 0.0024 per neutral pair) and D ×2 (China answers in all three seeds, first in weeks 1, 2 and 4; China 4 against Honduras 1); events "someone other than a judge dies" (16, 14, 19 per run). **New, passing:** law L1 (filing 0.587 against merits 0.31 for border controls), L3 cert (14 weeks), L4 (68 orders, 24 filed against 24.6 expected, 6 terms, 3 consequential rulings), T2 (each tariff line carries its statute and citation, no proceeding), economy B10 (Vietnam 69,372 → 69,774 at the half-life → 70,125 at 104 weeks; US total 498,395 → 491,938), events Congress deaths (9, 8, 14 per run).

**Pass to fail:** none.

**Still failing, by item:** economy B2 (BL-105); opinion 4 ×2 (BL-146) and 10 (BL-288: the war arm now sits below the control, 0.6029 against 0.6033, but by 0.0005 rather than 0.01, and the probe's war registers no pump shock); geopolitics A3 ×2 (BL-292), C (BL-293), E ×2 (BL-293); events A ×3 (BL-295), B ×5 (BL-294), C ×3 (BL-294); engagement B2 (BL-297, fails by design).

Readings beside them: B11 −0.000062; network 1a 8 responses, 9 people pressured; 2b favor 0.081, grudge 0.093; 4b 0.607 → 0.408; judicial seats vacated 13, 15, 14 (unchanged); coups 5.17 a year; most exits per body OPEC+ 1; border clashes 87 a year in the geopolitics idle run; stops per 30 days for a deferring President ev-1 8.14 (99 stops), ev-2 6.66 (81), one removal stop per episode on both.

## 4. Waves and lanes

Order and models are METHODOLOGY §3's; file ownership is its lane table, which is persistent across waves (a file never gains a second writer because a later wave needs it). Only the integration owner edits the probes, `census.ts`, the balance tests, state type modules, `resolution.ts`, `effects.ts`, `docs/DECISIONS.md`, `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, the backlog and `dist/`.

| Wave | Work | Exit condition | Items |
|---|---|---|---|
| 0 | Measurement contracts | probes run on demand, typecheck, read records, use the public act path, assert valid target types; register carries observed numbers | this document |
| 1 | Paths, signs, accounting, clocks | stranded receipts and per-flag shortage; scoped sanctions reach; relationship memory layers; authority clocks; signed growth; dated scandals; attention on change | BL-275, BL-276, BL-277, BL-278, BL-279, BL-280, BL-281 |
| 2 | Connect consumers | signed reactions; Hill network; relief saturation; trade-partner semantics; tariff wedge; diversion and retaliation; NPC response; salience and rally; mortality; litigation and institutions | BL-282 to BL-289, BL-291, BL-298, BL-120, BL-123, BL-190, BL-225, BL-227 |
| 3 | Coverage and calibration | routes and critical inputs; hazards and Stafford; memberships; midterms; UNSC/SCO and nuclear data; clashes and onsets; domestic event families; recurrence; hazard readers | BL-290, BL-292 to BL-297, BL-105, BL-80, BL-146 |
| 4 | Integrate and prove | matched idle, prudent, reckless and mechanic-specific hyperactive campaigns, all parties; reversal and recovery; save migration and replay; player journeys; full repository gates; fresh `dist/` | gate record |

Lanes (METHODOLOGY §3, "File ownership"), with this program's items:

| Lane | Files | Items |
|---|---|---|
| Integration and shared contracts (Opus) | `effects.ts`, `effect-types.ts`, `record-effects.ts`, state type modules, `save.ts`, `resolution.ts`, `turn-loop.ts`, `turn-phases.ts`, `index.ts`, `__probes__/`, balance harness and tests, shared world schemas, docs, `dist/` | every item's contract requests |
| Physical economy (Opus) | `commodity-shocks.ts`, `commodity-pressure.ts`, `external-pressure.ts`, `strait-passage.ts`, `commodity-kernel.ts`, `commodity-registry.ts`, `commodities.ts`, `trade-volume.ts`, `trade.ts`, `trade-effects.ts`, `commodity-hormuz.test.ts` | BL-275, BL-276 (pressure half), BL-287, BL-290, BL-105 |
| Tariff-price projection (Codex) | `tariff-prices.ts` and its test | BL-286 |
| Economic instrument gates and assistance (Codex, Opus spec) | `instruments-economic.ts` | BL-276 (gate half), BL-284 |
| Relationship memory and reactions (Opus) | `relationships.ts`, `relationship-graph.ts`, `resolution-ripples.ts` | BL-277, BL-282 |
| Hill influence (Codex) | `person-network-influence.ts`, `member-outreach.ts`, `member-votes.ts`, `lobbying.ts`, `lobbying-person.ts`, `ties.ts` | BL-283, BL-120 |
| Litigation (Opus) | `orders.ts`, `judicial-review.ts`, `court-procedure.ts`, `court-calendar.ts`, `state-suits.ts`, `strike-odds.ts` | BL-123, BL-190 |
| Authority clocks and legislation (Sonnet; Codex for Section 122) | `emergency.ts`, `tariff-orders.ts`, `tariff-statutes.ts`, `legislative-acts.ts` | BL-278 |
| Institutional powers (Sonnet) | `institution-catalog.ts`, `directives.ts`, `inspectors-general.ts`, `appointments.ts`, `special-counsel.ts` | BL-225, BL-227 |
| Opinion and elections (Opus; Sonnet handoffs) | `opinion.ts`, `opinion-war.ts`, `opinion-causes.ts`, `press-scandal.ts`, `election-seating.ts` | BL-279, BL-280, BL-288, BL-289, BL-146 |
| NPCs and international bodies (Opus) | `npc-agent.ts`, `npc-turn.ts`, `world-events.ts`, `world-event-templates.ts`, `coercion-tempo.ts`, `npc-tempo.ts`, `conflicts.ts`, `war-join.ts`, `compacts.ts`, `regime-acts.ts`, `regime-npc.ts` | BL-298, BL-292, BL-80, BL-293 (predicates) |
| People and succession (Opus) | `judicial-vacancies.ts`, `foreign-politics.ts`, `succession.ts`, `congress-members.ts` | BL-291 |
| Domestic conditions and impacts | `condition-*.ts`, `us-placement.ts`, `impact-*.ts`, `obligations.ts`, `operators.ts` | BL-294, BL-295 |
| Attention and recurrence (Opus; Sonnet fixes) | engine `attention.ts`, `advance.ts`; player-core summons, desk attention, store, save store; `scenario-director.ts`; `scenario-recurrence.test.ts` | BL-281, BL-296 |
| World data (Sonnet) | `world/trade.ts`, `world/nations.ts`, `world/orgs-cradles.ts`, `world/commodity-producers.ts`, `world/chokepoint-*.ts`, seed TSVs, `world/state-hazards.ts` | BL-285, BL-293 (data), BL-105 (data) |
| Content and presentation | corpus by job; `apps/player/` | BL-297 |

Two lane notes from this pass. Wave 0 added `packages/player-core/src/__probes__/` and `packages/player-core/vitest.probes.config.ts`, which belong to the integration owner like the engine probes. The physical-economy lane owns `commodity-hormuz.test.ts:94-98`, whose Kuwait-gains assertion encodes the exporter-accounting defect; BL-275 replaces it.

**Carried to the Wave 4 balance checkpoint (2026-10-25).** None of these is a defect to fix before the balance run; each is a magnitude Wave 2 moved that the 12-seed harness has to read.

1. **NPC tempo (coordinator's call, accepted by the owner).** With coerced governments answering (BL-298), NPC military rung-2 acts roughly doubled over five idle 104-week seeds (130 to 244), mostly in-kind answers to shows of force; acts of force, ladder heights, wars and the three-actor cap are unchanged, and selection concentration rose to a top share of 0.074 against the npc-world probe's 0.09 bound. Left as is for the balance checkpoint. The dials are `npc-response.ts`'s `ASYMMETRIC`/`SAME_INSTRUMENT` and `npc-agent.ts`'s `WEIGHTS.response` (1.5).
2. **The founding world after BL-285.** Five top partners in place of every lane lowers founding mean directed trust from 0.092 to 0.085 and raises hostile pairs (trust below −0.3) by 9 to 17 on three seeds; `tradeTie`'s 0.12 partner bonus and the reactions' top-partner exposure still read list membership (BL-285).
3. **Litigation.** Loud orders are now sued more often and the filing cost is smaller, so the removal and press readers of `contested` fire more.
4. **Retaliation.** The answer's odds now read the cut it would make (`RETALIATION_CUT_WEIGHT` 0.6, mean founding odds at a 25 percent tariff 0.42 against 0.43 before), and partners answer where the answer bites (China on row crops, not aircraft).
5. **Aid.** Relief needs a need and aid saturates (`AID_SATURATION` 1); the hyperactive proxy still needs BL-284's exploit check.
6. **Hotter crude (Wave 3).** `ROUTE_CLOSURE` 0.68 and the crude kernel refit (sensitivity 6, speed 0.8, weekly cap 0.16) make every oil shock faster and higher, so US inflation and approval run hotter.
7. **The chip channel (Wave 3).** It binds the US in any full-intensity Taiwan or Malaysia war; sector list and magnitude are planning values.
8. **Faster diversion (Wave 3).** The 91-day half-life lets third countries gain from tariffs sooner.
9. **New nuclear and political weight (Wave 3).** Israel's 90 warheads now feed deterrence drag, war-entry premiums and the relationship graph's nuclear weight; the SCO feeds trade gravity and affinity (India now outranks Turkey as Iran's partner; damp at integration).
10. **Midterm refit (Wave 3).** House midterm swings fitted to Gallup 1946-2014 reach −46 to −52 at the approval floor; `term-balance.test.ts`'s 45-seat coattail cap still passes.
12. **Two term-balance regressions from earlier in the program (found 2026-10-25, not caused by the midterm refit: identical with it reverted).** `term-balance.test.ts` "removes a reckless President within the term" (expected >0, got 0) and "puts careful play ten points clear of doing nothing" (0.556 vs 0.559). Tracked as BL-311. First datum: at Wave 1 the reckless removal rate was already 0 and the careful-play gap was still 0.106, so the two regressions have different origins. Bisect across the remaining merges before any retune; these are the first balance contracts the program has broken.
11. **Clash rate (Wave 3).** `CLASH_BASE_RATE` gives about 5.4 border clashes a year, an unsourced planning value.

## 5. Rule amendments needed in DECISIONS

Each lands in the same change as the work that needs it. **Landed with Wave 2 (2026-10-25):** item 2 (§5.16), item 3 (§5.17), item 9 (§13.12, extended rather than replaced), item 10 (new §4.13), and beside them §1.9 (`officeSuccessionPhase`), §4.8 (threat reverts; owner kept the 0.06 routine-contact ceiling), new §4.8a (third parties), new §4.14 (removal law and Justice direction, with the owner's commission ruling), new §5.18 (counts of the seated, and limits on the President counted against him), new §6.13a (coerced governments answer), §6.17 (unwinding wedges, retaliation and diversion), new §6.18 (impoundment, pro forma practice) and new §6.19 (tariff lines carry their law, not odds). Items 5, 6 and 7 are open. **Landed with Wave 1 (2026-10-25):** item 1 (§4.8, two-layer memory, pressed levels, plus the Hill lane's routine-contact ceiling, personal grudges and brokerage), item 4's first half (§6.10, delivered volume and stopped-flag shortage; the non-littoral naval-denial half stays with BL-105), item 8 (§2.2, attention on change, with a proposed budget that no test asserts), item 11 (§6.7, authority episodes), and three not listed here: the presentation-packet rule (§1.5, §1.6), the daily authority hooks (§1.9) and a new §6.17 (sanctions reach). Items 2, 3, 5, 6, 7, 9 and 10 are open.

1. **§4.8 Relationships are directed and remember.** State the two layers: transient favors and grievances decaying toward a target by elapsed time, with separate build and recovery half-lives, and durable cause-tagged changes (treaty, war, severance) that reversion never erases. Today the rule covers grudges only, and trust has no decay at all (BL-277; see BL-230's open question on routine contact).
2. **§5.16 Salience fires on change.** Make revision contribution-aware: a loud story speeds the judgment toward its target only on the side the story pushes, so bad news cannot accelerate an unrelated recovery (BL-288).
3. **§5.17 A war's rally.** Add rally fatigue across successive wars the country enters, once valid-act testing shows serial wars are reachable and net-positive (BL-289).
4. **§6.10 A strait reaches a price only through sourced flow.** Extend "the countries whose cargo it stops are the ones that lose the supply" to a national delivered-quantity channel and receipts on delivered volume (BL-275). Naval denial by a non-littoral actor (a US blockade stopping Hormuz cargo) needs its own amendment with capability and geography checks (BL-105, E27).
5. **§6.9 A blockade is an act of war.** Only if the owner wants limited force between nuclear dyads (GEO-6): a bounded outcome model first, and the refusal stays symmetric for the President's opponents. Recommendation: leave §6.9 as is for this program.
6. **§6.13 Other governments' coercion is rationed per term.** Any clash-to-war escalation path (BL-292) is a new family that declares its own cap and cooldown on the same ledger; the ledger's existing numbers stay.
7. **§6.15 regime operations.** Reconcile the nuclear predicates: `regime-acts.ts:199-202` checks warheads and delivery but not the `declared` flag its comment names, while `instrument-gates.ts:201-204` checks all three (BL-293).
8. **§2.2 The world stops for a reason.** Give the attention contract a stated budget or rule set: interrupt on arrival, material change and declared notice or default milestones; an unchanged deferred matter is ambient (BL-281).
9. **§13.12 The courts bring cases to the President.** Extend, not replace: an aggregate background docket and the selection of consequential rulings, plus per-act legal exposure for tariffs, emergencies, removals, directives and force (BL-123, BL-190).
10. **A new rule for mortality of office-holders** (BR-01): who can die, at what rate, how succession runs, and an explicit statement that the President does not die at random in the baseline (BL-291).
11. **A new rule for authority episodes** (T1, E1): a statutory clock follows the authority episode across reissued measures, and an enacted limit binds the common authority clock (BL-278).

## 6. Won't fix: abstraction

| Break | Why it stays abstract |
|---|---|
| Network B2 | The six-tie cap is a dossier reading limit (`docs/ARCHITECTURE.md:480`). Functional reach comes from standing Hill edges (BL-283), not from making 8,054 biographies obey a heavy-tailed graph. |
| Economy E5/E6 | No separate helium, petrochemical or war-insurance markets; aggregate input and logistics effects where they change a decision. |
| Law X4 (part) | No pocket veto while Congress never adjourns (`signing-window.ts:14-16`); no Byrd-rule adjudication while reconciliation is a fixed catalog. The catalog must still respect its stated constraints. |
| Law C24 | No free-form appropriations riders. |
| Law, background docket | No real federal docket presented as presidential cases; the docket is aggregate. |
| Opinion B3 | No ≥6-point inflation floor reproducing a President's whole decline through inflation; BL-146's economy refit is the calibration route. |
| Geopolitics GEO-6 | §6.9's refusal of force against a declared, deliverable arsenal stands unless the owner amends it (§5 item 5). |
| Geopolitics GEO-10 | The three-actor cap is a legibility budget; fix starvation and response opportunity first (BL-298) and relax only after tempo measurements. |
| Events BR-01 (part) | No mortality across every unused biography; occupied offices only. |
| Events BR-10 (part) | No requirement that every content class appear in every two-year campaign, and no cap on pandemic-gated health content. |
| Events BR-12 (part) | No 56 to 67 individually playable Supreme Court cases a term. |

## 7. What was not checked

- Nothing here was built, linted, run through the full suite, the verify gates or the balance harness. Wave 0's scope excluded them; Wave 4 runs them.
- Every probe ran one deterministic pass; seeds per probe are as written (mostly one to four). No variance estimate beyond that.
- The engagement probes now found through `openingCampaign` (the player's founding path), not `foundedForBalance`, so their seeds differ from the events audit's; the numbers in §3.6 are this run's.
- Primary legal sources for *Trump v. Slaughter*, *Trump v. Cook*, Fed. R. Civ. P. 65(b) and Sup. Ct. R. 13 and 15 were not opened in this pass. R1, R2 and the L3 bands wait on that.
- Every benchmark the domain audits marked unverified is still unverified.
- The domain audits' own "not checked" lists stand.

## 8. Where METHODOLOGY disagreed with source, or missed something

Every file:line claim in METHODOLOGY §2 and §3 that this pass opened held, including its corrections of the domain audits (the committee roster does not exist; cyber has an operator path; raising `LEAVER_TRUST` admits more leavers; the ninety-day emergency promise is unenforced; the regime filter checks warheads and delivery, not warheads alone; `memberWillingness` already consumes `memberTerms`). Where the rerun or source went further:

1. **The events probe broke the engine's own build and lint, not only its measurement.** METHODOLOGY flagged the scratch path and the stale-dist mix. The same file imported `node:fs` (rejected by the engine lint) and `player-core`/`content` source from under `packages/engine/src` (outside `rootDir`, so `tsc -b` would refuse it). Moving the engagement half to player-core fixed all three.
2. **Economy B5 resolves to a pass once measured correctly.** Through `resolveAction` the blockade's 54 ripples apply and China cools further than Japan; what remains is that every observer cools by nearly the same amount (−0.160 to −0.171 over eight weeks), which is network B5/B6's flat class constants, not a blockade defect. This confirms METHODOLOGY's "not proved".
3. **The capped feed hid more than coups.** METHODOLOGY named the coup census. The same headline counting also produced the audit's 2 to 3 judicial vacancies in four years (records: 13 to 15) and its zero congressional investigations (records: 6 committee inquiries). Neither is a break.
4. **The ledger's narration is not a superset of the wire.** A packet's summary is not its headline: cabinet leaks never say "leak" in the ledger and do on the wire. `census.ts` and the events probe read both; any later census must too.
5. **Law L4's "general/exogenous stream is missing" is slightly overstated.** All three disputes in the reckless proxy term came from matters that answer no presidential act (the specialized fair-housing, wage-hour, surveillance and election-access subjects in `state-judiciary.ts:30-36`). A narrow exogenous stream exists; the general docket §13.12 accepted does not.
6. **Coup reconciliation.** The record count is 2.6 a year over two-year runs and 5.2 a year over four-year runs, both inside one band; METHODOLOGY's instruction not to retune before reconciling was right, and there is nothing to retune yet.
