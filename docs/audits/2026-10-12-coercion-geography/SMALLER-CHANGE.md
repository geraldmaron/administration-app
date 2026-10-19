# The smaller change: blockade as an act of war, measured, 2026-10-13

Branch `feat/blockade-smaller`, based at `38f028039` (the tip of `codex/simulation-depth-completion` when the work began). This is VERIFY.md's recommendation item 10, "the smaller change first", built and measured before any maritime family. VERIFY.md is the source of truth; where AUDIT.md and VERIFY.md disagree, this follows VERIFY.

## Outcome

A first blockade of Iran is now an act of war. It starts the War Powers clock, opens a US–Iran war, and stops 72.5% of Iran's seaborne trade while the force is on station. Through the war's contest of Hormuz it lifts Brent from about $74 to $85–$97 by turn 10 in the seven seeds where it lands, against no move at all before the change. The pump follows, rising $0.26 to $0.53 by turn 14. Approval runs 0.037 to 0.066 under control by turn 27, against about 0.001 before. The imports ratchet is gone: across twelve passive terms no nation ends with imports below founding, against sixteen before.

**Top risk: a long war between producers.** NPC governments now weigh a blockade as they weigh a strike, so NPC blockades fell from 54 to 7 across the twelve passive terms and NPC-opened wars held level (13 before, 12 after: 5 opened by a blockade, 7 by a target hitting back). But the few blockades left now open wars, and one of them is China on Russia: in coercion-6 that war keeps Brent above $90 for 73 weeks where it never got there before. Across the twelve terms, weeks above $90 rose from 56 to 133 of 2,496 and mean Brent from $75.86 to $76.79; mean approval at the end of a term moved from 0.4712 to 0.4708. VERIFY asked for exactly this measurement before any further step.

## What changed

| Item | Change | Where |
|---|---|---|
| 1. A first blockade is an act of war | Rung 3 is in `MAJOR_FORCE_RUNGS` and reports as `hostilities`. It is gated by `warPowersStanding`, writes the unilateral-force record the way a strike does, starts the sixty-day clock, and opens or heats a war through `openOrEscalate` with `opening: "blockade"`. | `instruments-military.ts#blockadeEffects`, `congress.ts`, `war-powers-report.ts`, `conflicts.ts` |
| 1. No free rally | A war whose aggressor is the country's own government and which carries an `opening` (blockade or retaliation) gives no rally. The country still rallies when it is the one blockaded. | `opinion-war.ts#ralliesTo` |
| 2. A standing blockade, not an imports write | The rung writes a `Blockade` record and nothing onto the target's trade. The record is in force while its war, its deployment commitment and its War Powers introduction all stand; a recall, the war's end or `terminateForce` lifts it that week. While in force it takes the target's founding exports-to-output share times the cut off growth (under the shared coercion cap) and keeps the target's supplier share times the cut off each commodity market. A government cannot blockade a coast its own blockade holds; two navies off one coast count as the heavier blockade. | `blockades.ts`, `external-pressure.ts#blockadeBite`, `commodity-shocks.ts#blockadeShocks` |
| 3. Every sourced strait reaches the price | The Hormuz-only custodian constant is gone. Routes come from the world's `CHOKEPOINT_FLOWS` table (littoral governments, the commodity's share of world supply, the share that can bypass). A war with any littoral party contests the strait, charged on `share × (1 − bypass)`. A strait with no sourced bypass has no price effect. | `world/dataset/chokepoint-flows.ts` (+ `seed/chokepoint-flows.tsv`), `commodity-registry.ts#routesFor`, `commodity-shocks.ts#routeShock` |
| 4. Dependence weights carried through | `applyGeography` writes `geo.chokepointDependence` beside `geo.chokepoints`. `chokepointExposure` reads the weights (compounded over closable straits): Iran reads 0.9, not 0.2. The exposure sets the blockade's cut: `(0.5 + 0.25 × exposure) × forceScale`, capped at 0.9. | `world/dataset/geography.ts`, `world/schemas/nation.ts`, `engine/geography.ts`, `blockades.ts#blockadeCut` |
| 5. "Hits back harder" is real | A failed blockade or strike spends readiness and reports an introduction into hostilities either way. The `escalation` branch is the target firing on the force: a `strike` on its own edge and a war opened with `opening: "retaliation"`, which reaches the market through any strait the target holds a shore of. It is offered only against a target that can answer (readiness at the rung-3 gate and a navy or air arm of at least 0.3); against Djibouti the failure mass is all "held". | `force-failure.ts`, `resolution.ts#risksFor` |
| Naval odds | The rung-3 contest swaps the ground (0.26) and sea (0.13) layer weights, so a blockade is decided at sea. US-on-Iran odds move 0.41 → 0.42. | `contest.ts#domainWeight` |
| NPC restraint | The NPC agent's `restraint` term weighs a military blockade at a strike's height: the same legal scruple and the same assembly drag, since both are now a use of force that opens or feeds a war. Without it, NPC-opened wars tripled (13 → 42 over the twelve terms) and one held-war balance case (H8) lost its control world to a Polish blockade-war on Russia. | `npc-agent.ts#restraint` |

### Sourced figures

Every figure was read on 2026-10-13 from the page cited beside it in `packages/world/src/dataset/chokepoint-flows.ts`.

| Strait | Commodity | Share of world supply | Bypass | Basis |
|---|---|---|---|---|
| Hormuz | crude (all liquids) | 0.20 | 0.124 | 20.9 of 104.4 Mb/d in 1H25 ([EIA, World Oil Transit Chokepoints](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/), Table 1); 2.6 Mb/d of spare Saudi and UAE pipeline capacity ([EIA TIE 2025-06-16](https://www.eia.gov/todayinenergy/detail.php?id=65504)) |
| Hormuz | LNG | 0.20 | 0 | "around one-fifth of global liquefied natural gas trade" (TIE 2025-06-16); the bypass pipelines EIA names are crude lines |
| Bab el-Mandeb | crude (all liquids) | 0.085 | 0.68 | 8.7 Mb/d in 2023 ([EIA TIE 2024-10-11](https://www.eia.gov/todayinenergy/detail.php?id=63446)) of 102.6 Mb/d world supply (WOTC Table 1); in 2024 the strait lost 4.7 Mb/d and the Cape gained 3.2 (TIE 2024-10-11) |

Left without a price effect, because EIA gives a flow but no capacity for the alternative: Malacca (Sunda and Lombok detours), Suez and SUMED (the Cape detour is shared with Bab el-Mandeb in the 2024 episode, so it cannot be used twice), Panama (the Trans-Panama pipeline carries crude only and the canal is mostly products), the Turkish straits (the alternative pipelines are named without capacities) and the Danish straits (the Kiel Canal takes small product tankers only, and the strait's flow mixes Russian exports with Baltic imports, so it is not all lost supply). Taiwan, Sunda, Gibraltar, Dover and the Cape have no EIA flow row.

### Calibration

The route term is charged on net loss after bypass, not on the gross drop in transits. That is the right input for the kernel, whose `loss` is supply lost before inventories respond, but it reads short of 2026: EIA's May 2026 shut-in peak of about 11 Mb/d is 0.11 of world supply, and the kernel holding 0.11 reaches about $100 Brent by week 8 against an April monthly average near $117 (VERIFY.md, "What the sources do to the calibration"), an undershoot of about 15%. The kernel was not retuned here; that is VERIFY's required change (b) and it moves every commodity. At full intensity a Hormuz war's route term is 0.2 × (1 − 0.124) × 0.5 = 0.088, before the war's own lost barrels. A full-intensity war on the Bab el-Mandeb is 0.085 × 0.32 × 0.5 = 0.014, inside the kernel's spare output, so it moves crude only through the risk premium: under 5% in twelve weeks, which matches 2024, when the strait's oil flow halved and Brent stood at $79 to $81 that October (TIE 2024-10-11).

Iran's own barrels can be counted by three terms at once (the war's lost output, the blockade, and the Hormuz route). The blockade term takes only what the war has not already taken. At a new war's intensity of 0.5 the three come to 0.010 + 0.019 + 0.009 = 0.038 of world supply against Iran's 0.04 share (arithmetic on the constants, not a probe reading), so the overlap does not count a barrel Iran does not have; at higher intensity the route term can push the sum past it, and the shared 0.6 loss cap is the only bound.

## Results

All runs: passive proxy, Democrat, founded by `foundedForBalance` on seeds `coercion-0` to `coercion-11`. "Before" is the engine `dist/` committed at `38f028039`; "after" is this branch. The blockade is ordered at the first step through `issueAction`, the path the app takes, against a control run with no order. A turn is a week.

### The blockade of Iran: markets and trade

| Seed | Outcome | Brent turn 10, act / control | Brent turn 27, act / control | LNG index turn 10 | Pump turn 14, act / control | US inflation turn 27, act / control | Iran exports turn 14 (cut) | Iran exports turn 27 |
|---|---|---|---|---|---|---|---|---|
| coercion-0 | failed: held | $73.95 / $73.95 | $74.4 / $74.4 | 1.01 | $3.21 / $3.21 | 0.0282 / 0.0282 | 45,000 (0) | 45,000 |
| coercion-1 | landed | $85.88 / $74.96 | $80.67 / $74.86 | 1.108 | $3.503 / $3.235 | 0.0404 / 0.0368 | 12,375 (0.725) | 12,375 |
| coercion-2 | failed: held | $73.89 / $73.89 | $74.31 / $74.31 | 1.006 | $3.211 / $3.211 | 0.0356 / 0.0356 | 45,000 (0) | 45,000 |
| coercion-3 | landed | $88.56 / $75.81 | $77.05 / $75.81 | 1.148 | $3.552 / $3.253 | 0.0305 / 0.0267 | 12,375 (0.725) | 45,000 |
| coercion-4 | landed | $97.44 / $74.33 | $75.27 / $74.28 | 1.273 | $3.759 / $3.227 | 0.039 / 0.0339 | 12,375 (0.725) | 45,000 |
| coercion-5 | failed: held | $75.04 / $75.04 | $74.86 / $74.86 | 1.006 | $3.234 / $3.234 | 0.0301 / 0.0301 | 45,000 (0) | 45,000 |
| coercion-6 | landed | $93.3 / $73.96 | $74.48 / $73.37 | 1.219 | $3.649 / $3.214 | 0.0395 / 0.0347 | 12,375 (0.725) | 45,000 |
| coercion-7 | landed | $85.1 / $73.08 | $81.55 / $73.09 | 1.113 | $3.458 / $3.197 | 0.031 / 0.0274 | 12,375 (0.725) | 12,375 |
| coercion-8 | failed: held | $74.07 / $74.07 | $74.48 / $74.48 | 0.989 | $3.222 / $3.222 | 0.0324 / 0.0324 | 45,000 (0) | 45,000 |
| coercion-9 | landed | $90.26 / $73.62 | $75.23 / $74.31 | 1.184 | $3.581 / $3.208 | 0.0318 / 0.0272 | 12,375 (0.725) | 45,000 |
| coercion-10 | landed | $88.27 / $73.44 | $74.63 / $73.53 | 1.158 | $3.568 / $3.214 | 0.0353 / 0.0309 | 12,375 (0.725) | 45,000 |
| coercion-11 | failed: hit back | $79.64 / $74.27 | $77.04 / $73.16 | 1.076 | $3.331 / $3.21 | 0.0363 / 0.0336 | 45,000 (0) | 45,000 |

### The blockade of Iran: war, War Powers and approval

| Seed | Odds, before → after | War at turn 14 (opening, intensity) | War Powers at turn 14 | Approval vs control turn 5 / 14 / 27 | Before the change, turn 27 |
|---|---|---|---|---|---|
| coercion-0 | 0.409 → 0.421 | none | hostilities, -21 days left | -0.0010 / -0.0043 / -0.0099 | -0.0012 |
| coercion-1 | 0.409 → 0.42 | blockade, 0.37 | hostilities, -21 days left | +0.0046 / -0.0287 / -0.0660 | -0.0009 |
| coercion-2 | 0.412 → 0.423 | none | hostilities, -21 days left | -0.0011 / -0.0041 / -0.0098 | -0.0008 |
| coercion-3 | 0.411 → 0.423 | blockade, 0.46 | hostilities, -21 days left | +0.0040 / -0.0260 / -0.0367 | -0.0006 |
| coercion-4 | 0.409 → 0.421 | blockade, 0.45 | hostilities, -21 days left | -0.0009 / -0.0407 / -0.0435 | -0.0005 |
| coercion-5 | 0.412 → 0.424 | none | hostilities, -21 days left | -0.0010 / -0.0041 / -0.0097 | -0.0010 |
| coercion-6 | 0.411 → 0.423 | blockade, 0.43 | hostilities, -21 days left | +0.0038 / -0.0333 / -0.0412 | -0.0007 |
| coercion-7 | 0.41 → 0.422 | blockade, 0.19 | hostilities, -22 days left | +0.0037 / -0.0243 / -0.0536 | -0.0006 |
| coercion-8 | 0.409 → 0.42 | none | hostilities, -21 days left | -0.0010 / -0.0043 / -0.0089 | -0.0009 |
| coercion-9 | 0.412 → 0.424 | blockade, 0.45 | hostilities, -20 days left | +0.0037 / -0.0349 / -0.0426 | -0.0010 |
| coercion-10 | 0.41 → 0.422 | blockade, 0.52 | hostilities, -21 days left | +0.0045 / -0.0258 / -0.0424 | -0.0007 |
| coercion-11 | 0.408 → 0.419 | retaliation, 0.18 | hostilities, -21 days left | +0.0046 / -0.0286 / -0.0619 | -0.0016 |

### NPC blockades over a passive term (208 weeks), 12 seeds

| Seed | Blockades, before → after | Busiest pair, before → after | Imports below founding, before → after (lowest) | Wars opened, before → after (by blockade / by hit-back) | Brent mean, before → after | Brent max, before → after | Weeks Brent > $90, before → after | Approval at the end, before → after |
|---|---|---|---|---|---|---|---|---|
| coercion-0 | 11 → 1 | CHN>RUS:11 → CHN>RUS:1 | 1 (RUS:0.07) → 0 | 2 → 2 (1 / 1) | $74.25 → $78.56 | $77.83 → $87.94 | 0 → 0 | 0.4459 → 0.4449 |
| coercion-1 | 5 → 0 | ISR>LBN:4 POL>RUS:1 → - | 2 (LBN:0.352) → 0 | 2 → 0 (0 / 0) | $74.46 → $74.46 | $77.68 → $77.68 | 0 → 0 | 0.422 → 0.4204 |
| coercion-2 | 6 → 0 | ISR>LBN:6 → - | 1 (LBN:0.208) → 0 | 2 → 0 (0 / 0) | $74.17 → $74.17 | $77.11 → $77.11 | 0 → 0 | 0.5471 → 0.5442 |
| coercion-3 | 7 → 2 | PAK>IND:4 CHN>RUS:3 → CHN>RUS:2 | 2 (IND:0.187) → 0 | 1 → 3 (2 / 1) | $74.64 → $76.33 | $77.68 → $91.62 | 0 → 4 | 0.4584 → 0.458 |
| coercion-4 | 6 → 2 | CHN>RUS:3 MMR>CHN:2 POL>RUS:1 → CHN>MMR:1 MMR>CHN:1 | 2 (CHN:0.363) → 0 | 1 → 2 (1 / 1) | $76.64 → $76.81 | $84.18 → $84.34 | 0 → 0 | 0.4482 → 0.4482 |
| coercion-5 | 0 → 0 | - → - | 0 (-) → 0 | 0 → 0 (0 / 0) | $76.48 → $76.48 | $96.26 → $96.26 | 9 → 9 | 0.4802 → 0.4803 |
| coercion-6 | 9 → 1 | CHN>RUS:6 ISR>LBN:3 → CHN>RUS:1 | 2 (RUS:0.234) → 0 | 3 → 1 (1 / 0) | $80.18 → $85.55 | $89.93 → $102.67 | 0 → 73 | 0.458 → 0.456 |
| coercion-7 | 0 → 0 | - → - | 0 (-) → 0 | 0 → 0 (0 / 0) | $74.66 → $74.66 | $80.76 → $80.76 | 0 → 0 | 0.5391 → 0.5391 |
| coercion-8 | 3 → 0 | POL>RUS:3 → - | 1 (RUS:0.484) → 0 | 1 → 0 (0 / 0) | $74.74 → $74.53 | $78.2 → $77.89 | 0 → 0 | 0.4692 → 0.4727 |
| coercion-9 | 2 → 1 | MMR>CHN:2 → CHN>MMR:1 | 1 (CHN:0.363) → 0 | 0 → 3 (0 / 3) | $74.31 → $74.35 | $76.76 → $77.34 | 0 → 0 | 0.4511 → 0.4511 |
| coercion-10 | 3 → 0 | POL>RUS:2 MMR>CHN:1 → - | 2 (CHN:0.603) → 0 | 1 → 1 (0 / 1) | $74.57 → $74.35 | $78.3 → $76.99 | 0 → 0 | 0.4758 → 0.4759 |
| coercion-11 | 2 → 0 | PAK>IND:1 ISR>LBN:1 → - | 2 (IND:0.658) → 0 | 0 → 0 (0 / 0) | $81.27 → $81.27 | $96.63 → $96.63 | 47 → 47 | 0.4593 → 0.4592 |

Reading the tables:

1. **The landed blockade reaches the market through the war it opens.** Iran's own barrels are inside the kernel's spare output; the move comes from the contested strait, as VERIFY's `twice.mjs` showed for a second act. The price comes back as the war cools: by turn 27 Brent is within $1.50 of control in five of the seven landed seeds.
2. **The cut lifts with the force.** Where the war ended inside the 26 turns (coercion-3, -4, -6, -9, -10), Iran's exports are back to 45,000 at turn 27 with no lingering write. Where the war still runs and the passive proxy never recalls the hulls (coercion-1, -7), the blockade is still on station.
3. **The War Powers clock starts on the first act**, landed or not. The passive proxy never terminates the force, so every seed is past the sixty days by turn 14 and paying the weekly standing and goodwill cost, which is most of the approval gap in the failed seeds (about −0.009 by turn 27 against −0.001 before).
4. **No rally, but a short salience lift.** The rally is zero in every blockade war. Approval still runs about +0.004 above control in the first weeks of the war in seven of the eight seeds that opened one (+0.014 in coercion-7, whose blockade landed on turn 2), because being at war raises the weight of the security judgment (`selectSalience`, `atWar` ×1.7) while security still reads well. It is negative by turn 10 in every seed and ends 0.04 to 0.07 under control. It is the approval model's lag, not the rally, and it is not changed here. (coercion-1's +0.0084 on turn 2 is the week the order was given, before it executed, and is the same before the change.)
5. **The hit-back branch is a different week from a plain failure.** coercion-11 failed by escalation: a retaliation war, Brent $79.64 against $74.27 at turn 10, and approval −0.062 by turn 27. The three seeds that failed by "held" show no war and no price move.
6. **NPC repeats no longer compound.** Russia's imports ended at 0.07 of founding before and at founding after; no nation's imports moved in any seed. The busiest pair fell from 11 blockades a term (China on Russia) to 1: a held coast refuses a second blockade until its war ends, and the agent now prices a blockade as a strike.
7. **NPC wars held level, and changed kind.** Before, the 13 NPC wars all came from second acts of force; after, 5 of the 12 were opened by a blockade and 7 by a target hitting back (coercion-9's three came from failed acts of force with no blockade behind them). A war with an oil producer as defender takes up to half its share of world crude off the market (Russia holds 0.11), which is why China on Russia puts 73 weeks above $90 in coercion-6 and 4 in coercion-3. A version of this change without the NPC restraint row measured 42 NPC wars and 143 weeks above $90 over the same terms.

## Proof

New and changed tests (all in `packages/engine/src` unless named):

| Test | What it proves |
|---|---|
| `blockades.test.ts` | First blockade opens a war marked `blockade`; starts the War Powers clock (`hostilities`, clock running, unauthorized record); writes nothing onto the target's trade; growth cut while in force and restored to the same-war-without-blockade value on recall; lifted on war end and on `terminateForce`; a second NPC blockade refused while the first stands; target imports at founding after repeated blockades; two navies read as the heavier cut; no rally for a self-started blockade war; a rally for a blockaded country |
| `force-failure.test.ts` | Held vs hit back: both spend readiness and report hostilities; only hit back opens a war (`retaliation`) and records the target's fire; only hit back reaches crude; no rally for the President who moved first; the branch is offered against Iran and not against Djibouti |
| `commodity-chokepoints.test.ts` | Bab el-Mandeb contested by an Eritrea–Djibouti war, charged net of bypass; crude rises above rest and under +5% in twelve weeks, and a Hormuz war moves it more than three times as far; Hormuz charged net of its pipelines; Malacca (no row) moves nothing |
| `geography.test.ts` | Iran's exposure reads its 0.9 weight; Oman (no authored row) carries its derived 0.4 Hormuz weight through assembly |
| `contest.test.ts` | The rung-3 contest weighs sea above ground; rung 4 keeps the dials' weights |
| `conflicts.test.ts` | Changed: rung 3 used to be pinned as "says nothing about the war ledger"; a first blockade now projects "This starts a war", and rung 2 takes its place in the nothing-happens check |
| `congress.test.ts` | Changed: rung 3 used to be pinned `not-applicable` under War Powers; it is now `unilateral` on a first use, and rungs 1–2 stay `not-applicable` |
| `war-party.test.ts` | Changed: the census of principal-only war checks records `ralliesTo`, a new aggressor check |
| `hill-ledger-golden.test.ts` | Re-pinned, with the reason in its header: the whole-campaign digest moves from the first week because nations carry their chokepoint weights, and removal pressure moved by under 0.000005 on two runs; no vote, chamber reading or room moved |
| `npc-agent.test.ts` | Poland's restraint toward Russia brakes a blockade exactly as hard as a strike, and harder than a deployment by at least its legal scruple |
| `world/dataset/seed-tables.test.ts`, `world/dataset/metrics.test.ts` | The flow table is held to its vendored TSV; the new `geo.chokepointDependence` field is described |

## Commands

From the worktree root (`.-blockade`):

```bash
# The "before" engine: the dist committed at 38f028039, beside this tree's world package
B=$TMPDIR/baseline-38f028039
mkdir -p $B && git archive 38f028039 packages/engine/dist | tar -x -C $B
mkdir -p $B/packages/engine/node_modules/@admin
ln -s "$PWD/packages/world" $B/packages/engine/node_modules/@admin/world
ln -s "$PWD/node_modules/zod" $B/packages/engine/node_modules/zod

P=docs/audits/2026-10-12-coercion-geography/probes/smaller-change/probe.mjs
node $P blockade "" 26 > after-blockade.json        # this branch
node $P blockade $B/packages/engine/dist 26 > before-blockade.json
node $P npc "" 208 > after-npc.json
node $P npc $B/packages/engine/dist 208 > before-npc.json
```

The old engine reads the new world package, which adds two fields it never reads (`geo.chokepointDependence` and the flow table), so the "before" columns are the old behavior. They reproduce VERIFY.md's numbers exactly: China blockaded Russia eleven times in `coercion-0` and Russia's imports ended at 0.070 of founding; Israel blockaded Lebanon four times in `coercion-1` and Lebanon ended at 0.352.

## Validation run

In the worktree, after the last source change, in this order:

| Command | Result |
|---|---|
| `find . -name tsconfig.tsbuildinfo -not -path '*/node_modules/*' -delete && pnpm run build` | pass |
| `pnpm run typecheck` | pass |
| `pnpm run lint` | pass |
| `npx vitest run` in `packages/engine` | 334 files, 4,465 tests, all pass |
| `npx vitest run` in `packages/world` | 61 files, 534 tests, all pass |
| `npx vitest run` in `packages/player-core` | 1,440 tests pass; `shell/doors.test.ts` cannot load because `apps/web/tests/.fixtures/` (gitignored, written by the e2e setup) does not exist in a fresh worktree |
| `for g in scripts/verify-*.mjs; do node "$g"; done` on the committed tree | all pass but `verify-publish-gate` (speaker-department warnings on `the-crowd-at-the-gate` and `the-line-item-with-two-names`, content this change does not touch; it fails the same way at `38f028039`). `verify-rule-seams` passed once the two new conflict-opening sites were classified |
| `node scripts/verify-dist-freshness.mjs` on the committed tree | pass ("forced rebuild produced no diff") |
| `pnpm --filter @admin/engine run test:balance` | 134 pass, 4 fail, 4 skipped. All four fail the same way at `38f028039`, where each was run on its own: the cabinet founding check (`independent balance-10: cohesion NaN`), H3 (`310404` against `319721`, identical), and R1.1 as a democrat (0.0241 here, 0.0254 at the base) and as an independent (0.0313 here, 0.0299 at the base), each against a 0.02 ceiling. Run before the NPC restraint commit, H8 also failed (aggressor 0.17 points against a 0.3 floor) because its control world held a Polish blockade-war on Russia; after it, H8 reads 0.96 (0.84 at the base) and passes. No balance-pinned constant was changed; the harness was run because NPC war tempo moved |

## What this does not do

- **NPC tempo is priced, not capped.** The agent weighs a blockade as a strike, which brought NPC blockades from 54 to 7 across the twelve terms, but there is no per-term base rate or per-pair cooldown (VERIFY (d)). One China–Russia war is enough to hold Brent above $90 for most of a year and a half.
- **The kernel is not recalibrated on net loss** (VERIFY (b)). The 15% undershoot is documented above, not tuned away.
- **Deterrence is not extended to rung 3.** `DETERRED_RUNGS` is still `[4, 5]`, so a blockade of a nuclear power projects no nuclear drag although it now starts a war.
- **The salience lift in the week a war opens** is the approval model's, and is left for the approval program.
- **A failed blockade starts the sixty-day clock** with no force on station, as a failed strike already did; the President discharges it with `terminateForce`.
- **Rungs 1 and 2 still carry the "hits back harder" label** with no effect behind it; only acts of force (rungs 3 to 5) were made real.
- **The blockade's cut on imports is reported, not priced.** The macro term prices what the target cannot sell, the way sanctions are priced; the import side has no separate inflation term.
- **Older saves** carry nations without `chokepointDependence`, so their blockades cut at the 0.5 base rather than the exposure-weighted rate.
- **The maritime family** (strait acts, escort, mines, a contest per week, repricing) is VERIFY's second step and was not started.
