# Coercion at sea and the geography of chokepoints: adversarial audit, 2026-10-12

Branch `codex/simulation-depth-completion`, engine and world `dist/` as committed (`packages/engine/dist/instruments-military.js` last committed 2026-10-10; no uncommitted engine or world source at probe time). Read-only: no source changed, no build, no workspace tests, no verify sweep, no Playwright, no balance harness. The probes are in `probes/` beside this file and their commands are in §7.

The owner's brief: precedent is evidence of intent, not a constraint; judge each part on what makes the best game; no backward compatibility.

Labels: **Fact** is read in source, observed in a probe, or read in a source opened this session (cited inline). **Inference** is a reading of facts that was not measured. **Recommendation** is a proposal. **Planning value** is a number this design chooses, not one a source gave.

---

## 0. Summary

**What the owner saw is what the code does.** In the probes, blockading Iran was priced at $18.31M up front for 8 destroyers, and the order the engine actually issued (re-sized to 5 destroyers against Iran) committed $7.78M a week. That is cheaper than an exercise ($27.18M) or a carrier presence ($41.96M) against the same target. The act lands 41% of the time. When it lands it writes Iran's imports down from $40,000M to $30,000M once, permanently. It leaves Iran's oil exports, Iran's growth, Brent, LNG, the pump and US inflation identical to a control run, opens no war, starts no War Powers clock, and moves approval by about a tenth of a point (−0.0013 at week 9 in the landed seed). When it fails, nothing happens beyond a line in the Record.

**Recommendation (one design, §5).** Replace military rung 3 with a **maritime operations family** whose acts are derived per actor-target pair from data. Make each of the twelve chokepoints a **contested state**: weekly flow, threat and mines, set by who is trying to deny it and who is guarding it, never by an owner. Route chokepoint flow and blockaded exports into the **commodity kernel the engine already has**. A probe shows the kernel lands near the 2026 Brent path when it is given the 2026 Hormuz supply loss. Price operations from the force cost anchors plus operating tempo and munitions under fire. Make a belligerent blockade an act of war in the engine (conflict, War Powers hostilities). Give NPC governments the same derivation, so Iran can close Hormuz and the Houthis can contest Bab el-Mandeb. Verdict: **accepted with controls** (§5.12).

**Top findings** (details in §3):

1. **No world effect.** A landed blockade of Iran left crude, LNG, the pump and US inflation identical to control in every probed week. A blockade is neither a trade measure nor a conflict, so the commodity shocks never see it (F3).
2. **Wrong economic lever.** The act cuts the target's *imports* by a one-shot stat write that never recovers. It doesn't touch Iran's oil exports, and Iran's growth matched control to four decimals (F2).
3. **No chokepoint act and no control.** Nobody can close, contest, escort or mine a strait. The only Hormuz shock is a side effect of a war with Iran or Oman as a party, and the custodians are hard-coded for Hormuz alone. Yemen, which halved Red Sea oil flows in 2024 (EIA), can't even blockade (F4, F5).
4. **The menu is one list for 196 governments.** The same five rungs are offered everywhere and only refused by gates. The US can blockade China for $18.93M while a strike on China is refused for reach. It can invade Canada for $256M, cheaper than striking Canada at $876.68M (F1, F8, F13).
5. **Priced at a peacetime destroyer's running cost.** Real anchors: about $1B in Navy munitions over six months of Red Sea defense (Navy Secretary, April 2024), and over $11.3B for the first six days of the 2026 Iran war (Pentagon briefing as reported, March 2026) (F7).
6. **Legally a lesser act.** A blockade is listed as an act of aggression in UN GA Resolution 3314, Art. 3(c). The engine treats it as "equipped for combat", outside `MAJOR_FORCE_RUNGS = [4, 5]`, and a first blockade opens no conflict (F10).
7. **What to keep:** the commodity kernel, the pump-to-CPI-to-prosperity chain, the SPR and fuel-waiver levers, the sourced force cost table, the commitment ledger that holds hulls, and the single ladder that NPCs share (F15).

---

## 1. The model as implemented

### 1.1 The act

**Fact.** `packages/engine/src/instruments-military.ts:133-160`. Rung 3, "Blockade", is one entry in a five-rung military ladder shared by every actor and target.

Gate (`:138-145`), all required:
- actor naval branch strength ≥ 0.3;
- `forceAvailable(ctx, 3)` and readiness ≥ `MILITARY_READINESS_GATES[3] = 0.3` (`capacity.ts:124-127`);
- munitions on hand for rung 3;
- four uncommitted `navy.surface-combatant` (`force-packages.ts:48-56`, `min: 4, preferred: 8`);
- `target.geo.coastline`;
- `projectionAccess(..., PROJECTION_CAPS[3] = 2)` (`instrument-gates.ts:156`).

Resolve (`:146-159`), on success:
- `target.stats.trade.imports *= 1 − blockadeBite · scale`, where `blockadeBite = 0.2 + 0.25 · chokepointExposure(target)` (`:41-43`) and `scale = forceScale(3, force) ∈ [0.2, 1.5]` (`force-packages.ts:135-154`). This is a one-time `setStats` write.
- relationship `militaryThreat += 0.25 · jitter · scale` and a `blockade` history entry (`:151-154`);
- a War Powers report obligation of kind `equipped-for-combat` (`war-powers-report.ts:205-210`);
- readiness `−= 0.05 · scale · jitter` on the actor's nation stat (`:56-61`, `capacity.ts:109-112`);
- `forceOnTheBoard`: escalates an existing war, or opens one only if force was already used between the pair in the window (`instrument-records.ts:74-79`);
- a standing `deployment` commitment billed weekly (`:83-100`).

Failure (`resolution.ts` risk branches): a `failed-*` history entry, tension `+0.1·severity`, a grudge, standing `−0.02·severity`.

**Fact.** `chokepointExposure` (`geography.ts:76-83`) sums `globalTrafficShare` over the closable chokepoints the target depends on, capped at 1. It ignores the per-nation dependence `weight` the dataset authors (`world/src/dataset/geography.ts`: IRN depends on Hormuz at 0.9; exposure reads 0.2).

### 1.2 The price

**Fact.** `force-costs.ts:48-61` with `FORCE_COST_ANCHORS` (`world/src/dataset/force-cost-anchors.ts`). Rung 3 per hull = `destroyer-year-direct` ($60M FY2017, CBO force-structure primer as cited by the repo, not reopened this session) carried to 2026 dollars by CPI, divided by 365, times 7 days. That is $1.5569M up front (transit) and $1.5569M a week per hull (probe). Up front is multiplied by `reach = forceProjectionCost(...).multiplier` (1.47 for US→Iran). `INSTRUMENT_UNIT_COST.military` adds standing −0.014 and stability −0.01 at rung weight 1 (`resolution.ts:248, 266-282`).

The player reads this through `forceCostBasisWords` (`player-core/src/act/force-cost-words.ts:37-44`): "Priced from what a destroyer costs to run a day".

### 1.3 The markets and macro that exist but are not connected

**Fact.**
- `commodity-shocks.ts` derives each week's shocks from war (`warShocks`, producer output lost by belligerents), route (`routeShock`, `:83-95`: only a conflict with a listed custodian as a party; `loss = share · intensity · 0.5`, `risk = share · intensity · 0.3`), sanctions (`coercionsInForce`: the trade register and `embargo:` flags only, `external-pressure.ts:130-145`), conditions, and the SPR.
- `commodity-registry.ts:82-90`: the only routes are `HORMUZ_CRUDE` (share = the dataset's 0.2, custodians IRN and OMN) and `HORMUZ_LNG` (0.2, planning). No other chokepoint feeds any market.
- `commodity-kernel.ts`: a stock-and-flow partial-adjustment price per commodity, with spare capacity, inventory cover, demand elasticity, a weekly cap and a one-year norm.
- `commodity-pressure.ts`: prices reach US inflation through CPI weights (gasoline 0.02895, food at home 0.08325, piped gas 0.00773, electricity 0.02489, probe), and other economies through import bills and export rents.
- `household-prices.ts`: the pump follows crude with a lag. `pumpShock` raises the salience of prosperity ×1.25 (`opinion.ts:133-134, 275`).
- `commodity-levers.ts`: SPR release and fuel waiver.
- `geography.ts:50-58` `tradeVulnerability` (weighted, compounding) and `:136-141` `globalClosureSeverity` exist and have **no engine consumer** (grep: only tests, `stat-consumers.ts` and `apps/studio/world-views.mjs`).

### 1.4 Flow as built

```
 player / NPC agent
        │  military rung 3 "Blockade" (same 5 rungs for every target; gates refuse, nothing is derived)
        ▼
 gate: naval ≥ .3, 4 free destroyers, coastline, reach ≤ 2.0, readiness, munitions
        │
        ├── 59% ──► "forces held, nothing gained": history + tension + grudge + standing −.02·sev
        │
        └── 41% ──► target.trade.imports × (1 − bite)   ──► read by: bands.archetype, budget.economicLevel
                     (one-shot write, never restored)        (reserves/imports: the cut RAISES this reading)
                     relationship militaryThreat +            ╳ not read by: commodity shocks, macro pressure,
                     War Powers report (not hostilities)      ╳ target growth, trade register, conflicts
                     readiness −.05, deployment commitment ──► defense outlay $/week
                     conflict only if 2nd force act in window

 commodity kernel ◄── war (belligerent producers) ◄── conflicts
        ▲           ◄── route: Hormuz only, only if IRN/OMN is a war party
        │           ◄── sanctions: trade register, embargo flags      (a blockade is neither)
        │           ◄── conditions, SPR release
        ▼
 crude/LNG/gas/grains index ──► pump (lag 2–5 wk) ──► US CPI ──► prosperity judgment ──► approval
                             ──► importers' bills / exporters' rents ──► NPC growth, inflation
```

---

## 2. Probe evidence

### 2.1 Blockade of Iran vs control, three seeds, eight weeks (`probe-blockade.mjs`)

Passive proxy, Democrat, order issued at step 0 through `issueAction` (the path the app takes), control run identical without the order.

Projection (all three seeds): treasury −$18.31M, standing −0.014, stability −0.01, success 0.41, `conflict: null`, "first operational report in about 8 days", basis 8 hulls × $1.5569M × reach 1.47. `issueAction` re-sizes the package against Iran's naval strength 0.35 to 5 hulls (`instrument-issued.ts:31-38`, `force-packages.ts:107-115`), so the weekly commitment opened was **$7.78M**.

| seed | outcome (t3) | IRN imports t3–t9 | crude, LNG, US inflation, pump vs control | IRN growth vs control | approval vs control | conflict |
|---|---|---|---|---|---|---|
| coercion-0 | failed: "Iran's forces held and nothing was gained" | 40,000 = control | identical every week | identical | −0.0001 (t3) widening to −0.0008 (t9) | none |
| coercion-1 | landed: "Nothing is getting in or out by sea" | 30,000 vs 40,000, flat through t9 | identical every week | identical (0.0356 → 0.0225 in both) | +0.0084 at t2 (week of the order, before execution; not traced), then −0.0007 (t3) to −0.0013 (t9) | none |
| coercion-2 | failed | 40,000 = control | identical | identical | −0.0002 to −0.0008 | none |

Other observations, coercion-1: readiness 0.646 vs 0.688 at t3, back to 0.68 by t6. Treasury −114 vs control at t3, then a constant −61 from t4 to t9. **Inference:** the treasury metric is re-derived weekly and the commitment bills the defense outlay line (`national-books.ts:317-327`), so the weekly cost never accumulates on the figure the player watches. I did not trace this further. USA→IRN tension opens at 0.70 and militaryThreat at 0.705, so the act moved a relationship that is already hostile.

The carried board: in the seeded founding (2029-01-20) for `coercion-0`, `campaign.conflicts` was empty and `campaign.markets` undefined. The `world-2026` preset holds "the Iran front held, the United States absent" (`opening-world.ts:154-156`). No chokepoint state exists at the oath in either.

### 2.2 The menu across pairs (`probe-menu.mjs`)

Treasury cost and odds at founding, `coercion-0`:

| actor→target | Exercise | Presence | **Blockade** | Strike | Invasion | blockade bite / hulls |
|---|---|---|---|---|---|---|
| USA→IRN | $27.18M .46 | $41.96M .44 | **$18.31M .41** | $1,288.72M .37 | refused (reach) | .250 / 5 |
| USA→LUX | $24.04M | $37.11M | refused (landlocked) | $1,139.69M | **$332.8M** .35 | — |
| USA→CHN | $28.11M | $43.39M | **$18.93M .30** | refused (reach) | refused | .398 / 7 |
| USA→CAN | $18.49M | $28.54M | $12.46M .68 | $876.68M .62 | **$256M** .45 | .200 / 5 |
| USA→JPN (ally) | $27.74M | $42.82M | $18.68M .40 | $1,315.02M | refused | .368 / 6 |
| USA→YEM | $28.29M | $43.67M | $19.06M .46 | refused (reach) | refused | .253 / 4 |
| IRN→USA | $0.99M | refused | refused (reach) | $47.05M .08 | refused | — |
| IRN→ARE | $0.54M | refused | $0.36M .44 | $25.66M | refused | .250 / 5 |
| CHN→TWN | $4.74M | $7.32M | $3.19M .52 | $224.77M | $65.63M .42 | .368 / 5 |
| YEM→SAU | $0.28M | $0.44M | refused (naval < 0.3) | refused | refused | — |

### 2.3 The kernel can carry a real shock (`probe-kernel.mjs`)

Crude kernel parameters: sensitivity 2.5, speed 0.35, weekly cap 0.12, spare 0.03, cover 8 weeks, elasticity 0.08. Index 1.0 = $69 (`CRUDE_ANCHOR`, the 2025 Brent average); reference 1.0725 = $74.

| constant shock | w1 | w4 | w8 | w17 | w26 |
|---|---|---|---|---|---|
| engine's largest Hormuz shock today (IRN at war, intensity 1): loss 0.12, risk 0.06 | $83 | $98 | $102 | $104 | $105 |
| loss 0.05 | $75 | $77 | $77 | $78 | $78 |
| loss 0.11 (2026 May shut-in peak, 10.9 Mb/d) | $83 | $96 | $100 | $101 | $102 |
| loss 0.167 (2026 Q2 Hormuz drop, 21.6 → 4.9 Mb/d) | $83 | $107 | $113 | $116 | $118 |

**Fact** (EIA STEO, released 2026-10-06, opened): Brent averaged $85 in June, down $32 from the April 2026 peak. That puts the April monthly average at about $117 (inference from the two figures). Brent averaged $114 in September, with a daily peak of $131 on September 15. **Inference:** given the right supply loss, the existing kernel lands near the observed monthly path. It undershoots the daily spikes, which its weekly cap smooths by design. The problem is upstream: no act produces the loss.

---

## 3. Findings

| # | Claim | Evidence | Severity | Verdict |
|---|---|---|---|---|
| F1 | One generic menu for every target. The 196 governments get the same five rungs, refused by gates and never derived. Blockade has no parameters (no ports, cargo, chokepoint, duration or rules of engagement); only the strike has an objective. | `instruments-military.ts:102-234`; `player-core/src/act/catalogue.ts:120-139` (`ACT_OPTIONS` is static); `ResolutionRequest` (`resolution.ts:52-63`); probe-menu | High | Change |
| F2 | The blockade effect is a permanent one-shot cut to the target's **imports**. It never recovers when the force leaves, ignores exports (Iran's top export is `energy-oil`), and doesn't reach the target's growth. It also raises the target's stabilization reading, because `economicLevel = reserves / imports`. | `instruments-military.ts:150`; `budget.ts:344-347`; probe-blockade coercion-1: imports 30,000 through t9, IRN growth = control | Critical | Delete; replace with a derived weekly throttle on exports and imports |
| F3 | No market or macro propagation. A blockade is neither a conflict nor a trade-register measure, so `commodityShocks` and `externalMacroPressure` never see it. | `commodity-shocks.ts:102-116, 142-151`; `external-pressure.ts:130-145`; probe-blockade: crude, LNG, pump, US inflation identical to control | Critical | Change |
| F4 | Chokepoints don't feed markets except Hormuz, and only via a war with a hard-coded custodian (IRN, OMN). Eleven chokepoints have no commodity route. | `commodity-registry.ts:82-90, 94-128` | High | Change |
| F5 | There is no act against a strait, no notion of control, and no escort, mining or clearance. Denial capability isn't modeled: Yemen can't blockade at naval 0.1. Real 2024: Bab el-Mandeb oil flows fell from 8.7 Mb/d (2023) to 4.0 Mb/d (Jan–Aug 2024) after Houthi attacks, and Cape flows rose from 6.0 to 9.2 Mb/d (EIA, 2024-10-11, opened). Real 2026: Hormuz flows fell from 21.6 Mb/d (Q4 2025) to 4.9 Mb/d (Q2 2026) (EIA STEO via search summary; Q2 figure not on the page I opened); shut-ins peaked at 10.9 Mb/d in May (EIA STEO 2026-10-06, opened). | probe-menu YEM→SAU; `geography.ts`; sources §4 | Critical | Change |
| F6 | `chokepointExposure` sums world traffic shares and ignores the authored per-nation weights. IRN (weight 0.9) reads 0.2, CHN reads 0.79. The weighted functions (`tradeVulnerability`, `globalClosureSeverity`) have no consumer. | `geography.ts:50-58, 76-83, 136-141`; probe-menu | Medium | Change: consume weights; delete the unweighted reader |
| F7 | The cost is a peacetime destroyer's direct running cost: $1.56M per hull-week, $7.78M a week for the Iran package. There is no operating-tempo premium, no munitions under fire, no air cover, carrier or mine countermeasures, and no cost for ships lost or damaged. Real anchors: almost $1B in Navy munitions over about six months against more than 130 attacks (Navy Secretary Del Toro, April 2024, via Marine Insight, opened). More than $11.3B for the first six days of the 2026 Iran war, with about $5.6B of munitions in the first two days (Pentagon briefing as reported by NYT, via The Fiscal Times 2026-03-11, opened). | `force-costs.ts:48-61`; probe | High | Change |
| F8 | Cost ordering across the ladder is inverted. Blockade ($18.31M) < exercise ($27.18M) < presence ($41.96M) against Iran. Invading Canada ($256M) or Luxembourg ($332.8M) costs less than striking them. | probe-menu | Medium (adjacent) | Change; flag for a ladder pass |
| F9 | Success is one binary draw (41% vs Iran). A failed blockade "held" by Iran's forces gains nothing and costs almost nothing. A real blockade is a continuous contest: leakage, attrition and escalation, not a coin. | `resolution.ts:789-841`; probe | High | Change |
| F10 | Legal status is understated. A blockade of a state's ports is an act of aggression under GA Res. 3314 (XXIX), Art. 3(c), 1974-12-14 (UN, opened). The engine files it as `equipped-for-combat`, outside `MAJOR_FORCE_RUNGS`, so no authorization is needed and no 60-day hostilities clock starts. A first blockade opens no conflict. | `congress.ts:250`; `war-powers-report.ts:205-210`; `conflicts.ts:253-270` | High | Change |
| F11 | No retaliation model fits the act. Iran can't answer through Hormuz. IRN→USA blockade is refused for reach. IRN→ARE or OMN is allowed but only cuts their imports. The NPC agent enumerates the same five rungs (`npc-agent.ts:338-346`). | probe-menu; `npc-agent.ts` | High | Change |
| F12 | The public never feels it. After execution, approval ran −0.0001 to −0.0013 against control and standing −0.014, because no price, war or casualty is produced. This is consistent with the approval audit's F7 (rallies are a rounding error). | probe-blockade; `docs/audits/2026-10-12-approval-model/AUDIT.md` §0 | Medium | Change (via F3, F10, not via a direct approval write) |
| F13 | Sizing is a function of the target's naval strength alone: 5 destroyers vs Iran, 7 vs China. Blockade reach cap 2.0 exceeds strike reach 1.5, so a China blockade is open while a strike on China is refused. | `force-packages.ts:91-115`; `instrument-gates.ts:156`; probe-menu | Medium | Change |
| F14 | The chokepoint table has no littoral states, commodity mix, bypass capacity or provenance. Shares are unsourced labels on 12 rows. Only 61 nations carry authored dependence weights, while 134 of 196 carry a `chokepoints` list (probe). | `world/src/dataset/geography.ts:13-118`; `schemas/geography.ts` | Medium | Change (data) |
| F15 | Sound and reusable: the commodity kernel (§2.3), the pump→CPI→prosperity path with `pumpShock` salience, the SPR and fuel-waiver levers, the sourced force cost table with provenance, the commitment ledger that holds hulls, missile-reach gating (`withinMissileReach`, `instrument-gates.ts:89-108`), non-state operators on the board, and one ladder shared with NPCs. | as cited | — | Keep |
| F16 | The game's 2026 snapshot is the owner's frame. The carried-conflicts table records the 2026 Iran war, an Iranian Hormuz blockade and crude at $103.08 on 2026-09-23 (`world/sources/founding-data/carried-conflicts.tsv:9`). The seeded founding carries no conflict and no strait state. | probe; `opening-world.ts:154-156, 372-379` | Medium | Change: the oath should be able to open with a contested strait |

---

## 4. Real-world grounding (sources opened this session)

**Facts.**

- **Hormuz volume.** About 20 Mb/d of oil in 2024, about 20% of world petroleum liquids consumption, and about one-fifth of world LNG trade, mainly from Qatar. Bypass: the Saudi East-West line is rated 5 Mb/d and the UAE line 1.8 Mb/d; EIA estimates about 2.6 Mb/d of Saudi and UAE pipeline capacity available to bypass the strait. Destinations: Asian markets took 84% of Hormuz crude and condensate and 83% of its LNG; China, India, Japan and South Korea took 69% of the crude. (EIA, *Today in Energy*, "Amid regional conflict, the Strait of Hormuz remains critical oil chokepoint," 2025-06-16.)
- **The 2026 disruption.** Shut-in production of 10.9 Mb/d at the May peak, 5.8 in August and 4.8 in September, forecast 4.5 in Q4 2026. Global inventories fell 1.9 Mb/d on average in Q3. Attacks halted the Saudi East-West bypass for a time, with partial resumption by September 22. Brent averaged $81 (2024) and $69 (2025), with forecasts of $96 (2026) and $84 (2027). September 2026 averaged $114, with a $131 daily peak on September 15. EIA expects most regional output back by the end of Q2 2027. (EIA STEO, released 2026-10-06.)
- **Closure declared, transit disputed.** On 2026-06-10 Iran's joint military command declared the strait closed, saying "any vessel that will attempt passage will be shot at." The US military said commercial ships continued to transit. Brent rose $2.30 to $95.40. The war began 2026-02-28 and was paused in early April. US crude inventories, including strategic reserves, fell 79 million barrels after the war began. (Reuters via MarineLink, 2026-06-10.)
- **Law of the strait.** Hormuz is an international strait under UNCLOS Art. 37 with a right of transit passage that "shall not be impeded," widely regarded as customary law binding non-parties, including Iran and the US. Iran doesn't own the strait but can control traffic through proximity. Mining that denies neutral transit is widely understood to be unlawful. The DIA reportedly estimates 5,000 Iranian naval mines. The Navy has retired its Avenger-class minesweepers, and their replacement approach is untested. Unilateral US escort is "not viable at present." Insurance rates are rising. (Nevitt, *Just Security*, 2026-03-15.)
- **Red Sea.** Bab el-Mandeb oil flows fell from 8.7 to 4.0 Mb/d; Cape of Good Hope flows rose from 6.0 to 9.2 Mb/d. (EIA, *Today in Energy*, 2024-10-11.)
- **Blockade as aggression.** GA Res. 3314 (XXIX), Art. 3(c): "the blockade of the ports or coasts of a State by the armed forces of another State." (UN Audiovisual Library of International Law.)
- **Costs.** Del Toro, April 2024: almost $1B of munitions in six months, SM-2 about $2M each, more than 130 attacks countered (Marine Insight, 2024-04-17). First six days of the 2026 Iran war: more than $11.3B (The Fiscal Times, 2026-03-11, reporting NYT).

**Not opened, used only as orientation.** These figures are not relied on:
- the EIA Q2 2026 Hormuz flow of 4.9 Mb/d against 21.6 Mb/d in Q4 2025 (search summary of the August STEO; used in two probes as a labeled calibration point);
- later cumulative 2026 war cost figures;
- a CRS insight on Houthi attacks (403).

The 1962 quarantine (cargo-specific interdiction of offensive weapons, framed short of a blockade) is cited from general knowledge, not a source opened here.

**Inferences.**
- A chokepoint with a detour (Bab el-Mandeb → Cape) mostly turns closure into freight cost and delay. A chokepoint without one (Hormuz, beyond about 2.6 Mb/d of pipe) turns it into lost supply. The 2024 and 2026 episodes show both shapes.
- "Control" in practice means denial capability against transit, plus the other side's capacity to escort and clear. It can swing week to week. Ownership is never the variable.
- Blockading Iran's exports removes most of what Iran itself loses by closing Hormuz. That is the escalation logic the owner intuited.

---

## 5. Recommended redesign: maritime operations and contested chokepoints

### 5.1 Act taxonomy (replaces military rung 3)

A **maritime** family beside the military ladder, every act parameterized. Rungs 1–2 (exercise, presence) stay on the ladder; rungs 4–5 stay. Each act carries a legal class, which drives War Powers, conflict and standing.

| Act | What it is | Scope parameters | Legal class |
|---|---|---|---|
| **Escort** | Accompany named traffic through a chokepoint | chokepoint; whose flags; partners | lawful (defense of navigation) |
| **Clear mines** | Mine countermeasures in a strait or approach | chokepoint | lawful |
| **Interdict** | Visit, search and seize a named cargo class at sea | cargo: arms / WMD / named sanctioned goods; area | needs a basis (UNSC resolution, flag consent); else standing cost |
| **Quarantine** | Declared interdiction of one cargo class bound to one state, all flags (the 1962 shape) | cargo; ports; duration | contested; equipped-for-combat |
| **Blockade** | Belligerent closure of named ports or coast, in and/or out | ports (all / energy terminals); direction (exports / imports / both); duration; rules of engagement | act of war → hostilities, opens a conflict |
| **Mine** | Lay mines in a target's ports or a strait | where; density | act of war; in a strait, unlawful against neutrals |
| **Seize** | Board and hold individual ships (tit-for-tat) | flag or owner | coercive incident |
| **Contest a chokepoint** | Threaten or attack transit with missiles, drones, small boats or mines | chokepoint; selective (hostile flags only) or total | act of war against each state whose ships are hit |
| **Hold a chokepoint open** | Suppress the denier's launch sites and boats | chokepoint | a strike campaign against the denier → hostilities |

Rules of engagement (on blockade, quarantine and interdict): *warn and turn back* / *disable* / *sink*. They raise leakage control and raise escalation and casualty risk in the same step.

### 5.2 Chokepoint control as state

**World data** (`Chokepoint`, sourced or labeled planning). For each of the 12 rows:
- `littoral: NationId[]`;
- `commodityShare: Partial<Record<CommodityId, number>>` (Hormuz crude 0.20 and LNG 0.20 from EIA; Bab el-Mandeb crude 8.7/100 ≈ 0.087, from EIA 2023 flow over the about 100 Mb/d world implied by EIA's "20 Mb/d ≈ 20%", inference);
- `bypassShare` per commodity (Hormuz crude 2.6/20 = 0.13, EIA);
- `detour: { days, freightPremium }` for straits with a sea alternative (planning);
- `provenance`.

Per nation, use the authored `chokepointDependence.weight`. Derive weights for the 135 nations without authored geography from region and trade (a build step, labeled planning).

**Campaign state** (new, `campaign.maritime.chokepoints[id]`):

```
flow    ∈ [0,1]   share of normal transits this week          (1 at peace)
threat  ∈ [0,1]   credible danger to shipping                  (drives the risk premium)
mines   ∈ [0,1]   laid density, decays only by clearance and time
deniers:   [{ actor, effort ∈ [0,1], selective: boolean, since }]
guardians: [{ actor, escort ∈ [0,1], clearance ∈ [0,1] }]
```

**Denial capability**, derived, for actor `a` at chokepoint `k`:

```
D(a,k) = prox(a,k) · clamp01( 0.45·M(a,k) + 0.30·N(a) + 0.25·X(a) )
prox   = 1 if a ∈ littoral(k); else exp(−dist(a,k) / 1500 km)            [planning]
M      = 1 if withinMissileReach(a, k) else 0                            [existing gate]
N      = branchStrength.naval
X      = asymmetric sea-denial (mines, small boats, drones), authored per littoral actor
         and per non-state operator; ~20 rows, not per nation               [new data, planning]
```

**Weekly flow.** Effort from each denier compounds. Guardians reduce it only partly, because insurers and owners decide whether to sail, not navies:

```
threat_k = 1 − Π_a (1 − effort_a · D(a,k))
guard_k  = 1 − Π_b (1 − escort_b · G(b,k)),   G = naval_b · prox(b,k) · basingAccess(b,k)
mines'_k = mines_k · (1 − clear_k) − 0.02 + laid_k,  clear_k = Σ_b clearance_b · MCM_b    [planning]
flow_k   = clamp01( 1 − threat_k · (1 − ε · guard_k) − μ · mines_k ),  ε = 0.2, μ = 0.8   [fit, planning]
```

Calibration targets for ε, μ, D and X:
- **Red Sea 2024:** flow ≈ 4.0/8.7 = 0.46 with a Houthi denier and a coalition escort.
- **Hormuz Q2 2026:** flow ≈ 4.9/21.6 = 0.23 (from a search summary; must be re-opened before calibration).

With ε = 0.2: D_Houthi ≈ 0.6 and guard ≈ 0.6 gives 0.53; D_Iran ≈ 0.85 and guard ≈ 0.3 gives 0.20. A selective denier (hostile flags only) multiplies `threat` by the share of traffic it targets.

**Control changes hands** by these variables alone. A denier's capability falls with strikes on launch sites (the "hold open" act degrades `M` and `X` for N weeks). Mines persist until cleared. Effort is a weekly decision. Nothing is owned.

### 5.3 Target-specific option derivation

`maritimeOptions(campaign, actor, target)` returns rows, each eligible or refused with a reason. Nothing is authored per nation.

| Input (existing data unless marked) | Opens / shapes |
|---|---|
| `target.geo.coastline` | port acts at all |
| target energy `production > consumption` and `topExports` contains `energy-*` | "Blockade energy exports" row, sized by `supplierShare(crude/lng, target)` |
| target `trade.imports`, top import sectors | "Blockade imports" and "Interdict arms" rows |
| chokepoints where target ∈ `littoral` | target can contest them; actor gets "Hold open" and "Escort" |
| target `chokepointDependence` | "Distant blockade at k" (stop target-bound energy at a far strait, e.g. Malacca for China) |
| actor reach (`projectionAccess`), naval, basing, missiles | force package size and odds; refusal reasons |
| treaties and alliance between actor and target | an alliance-rupture cost on every coercive row |
| target `arsenal.warheads` | escalation ceiling; odds of compliance fall |
| third parties' dependence on the affected strait (`weight × imports`) | the ripple list: who objects and how much |

Worked menus (eligible rows only):

- **Iran**: interdict arms; quarantine; blockade energy exports; blockade all ports; mine ports; seize tankers; escort or clear in Hormuz; hold Hormuz open. Iran's own rows against the world: contest Hormuz (D high, littoral), seize ships, proxy contest of Bab el-Mandeb through an operator.
- **Luxembourg**: no maritime rows. Landlocked, no littoral straits. Economic instruments only.
- **Canada**: interdict, quarantine, blockade; each with an alliance-rupture cost; no chokepoint rows.
- **China**: under the proposed sizing (§5.4), a close blockade would need more hulls than are free against naval 0.75 and is refused (inference, not probed). A distant blockade at Malacca is offered: Malacca weight 0.9 and Hormuz 0.5 for China, with large world-market ripples and a nuclear ceiling. China's rows against others include contesting the Taiwan Strait and quarantining Taiwan.
- **Japan (ally)**: the same mechanics, with the alliance cost dominant. The rows exist, which is the honest answer.

### 5.4 Cost model

Weekly bill for a package of units `u` (US prices, `costIndex` for others as today):

```
weekly = Σ_u n_u · day_u · 7 · tempo                      tempo = 1.5 under contest, 1.2 otherwise  [planning]
       + munitions = attacks_k · interceptsPerAttack · unitCost    (only while a denier is active)
       + losses: E[ships damaged] · repair or replacement            (from the contest draw)
upFront = Σ_u n_u · day_u · transitDays · reach            (as today)
readiness = −0.004 per hull-week committed, regenerating at today's rate                   [planning]
```

- `day_u` comes from existing anchors: destroyer $0.2224M per day; carrier group per day = (carrier + air wing)/365 + 5 escorts × destroyer-day. In probe units, $28.54M up front and $28.54M a week for one group.
- New unit types needed: mine countermeasures and maritime patrol aircraft. Both need a sourced anchor before build.
- Munitions under fire: one opened anchor gives almost $1B over about six months (Del Toro). **Inference:** about $38M a week at that tempo ($1B / 26 weeks). This is a calibration point for `attacks × intercepts × cost`, not a constant.
- **Package for a blockade of Iran's energy terminals:** 1 carrier group plus 8 surface combatants. Direct cost $28.54M + 8 × $1.557M = $41.0M a week; at tempo 1.5 that is $61.5M. Contested, add about $38M. Total about **$60–100M a week, $3–5B a year**, against today's $7.78M a week. Show it on the treasury the player watches (F2.1 inference).
- **Sizing** reads the target's sea-denial strength `D(target, own coast)` and the number of port groups (`ports` needs data: a count per coastal nation, or a planning proxy from `trade.exports`), not naval strength alone.

### 5.5 Market and economy propagation

All through the existing kernel and `externalMacroPressure`. There are no direct writes to prices or stats.

```
Supply loss, commodity c, week t:
loss_c = min(0.6,  Σ_k  S_{c,k} · (1 − flow_k) · (1 − B_{c,k}) · hasNoDetour_k              (strait closure)
                 + Σ_n  s_{c,n} · cutX_n · (1 − leak_n)                                     (blockaded exporters)
                 + existing war, sanction, condition and SPR terms )
risk_c = Σ_k S_{c,k} · threat_k · 0.3                                                       (existing ROUTE_RISK)
spare_eff,c = spare_c · (1 − Σ_k behind_{c,k} · (1 − flow_k))                               (Gulf spare stranded behind Hormuz)
freight_k   = 1 + φ_k · (1 − flow_k) · hasDetour_k + 0.5 · threat_k                         [planning φ from detour days]
```

Here `cutX_n` is the export share a blockade stops: `scope × effectiveness(rules of engagement, package vs D)` (§5.6). `leak_n` is 0.3 at "warn", 0.15 at "disable" and 0.1 at "sink" (planning). The existing double-count guard holds: a war already sets `routeShock` for the same strait, so the route term moves from conflicts to `flow_k`, and `routeShock` is deleted. One path per shock, as `commodity-pressure.ts` already insists.

Importer landed cost, nation `n` (feeds `abroadInflation` and the energy import bill):

```
landed_n = Σ_k weight_{n,k} · ( (freight_k − 1) · 0.1 + (1 − flow_k) · (1 − B) · 0.5 )        [planning]
```

This is how Japan, Korea, India and China feel Hormuz beyond the world price.

Blockaded target `n` (a new term in `coercionPressure`, recovering the week the act lifts):

```
growthShift_n = −0.5 · (exports_n / gdp_n) · cutX_n − 0.3 · (imports_n / gdp_n) · cutM_n         [planning]
inflShift_n   = +0.4 · (imports_n / gdp_n) · cutM_n                                              [planning]
cap: |growthShift| ≤ 0.08 a year at full blockade
```

Iran: exports 45,000 / GDP 388,000 = 0.116 (dataset). A 70% export cut shifts the growth target by about −4.1 points a year.

**United States:** unchanged path. Crude → pump (2–5 week lag) → CPI gasoline weight 0.02895 → inflation → prosperity judgment, with `pumpShock` salience; gas → home energy. Ships hit or sailors killed → the impact model's rally term (approval audit §8.1 item 9). War → the security judgment through `warOpinionTerms`.

**Decay.** Flow returns as deniers stop and mines clear. Prices return through the kernel's stocks and norm (the norm moves 1/52 a week), so a long closure resets expectations, as 2026 did.

### 5.6 Contest, escalation and retaliation

Replace the single success draw with a weekly contest for each standing operation:

```
effectiveness = clamp01( P_force / (P_force + 0.6 · D(target, coast)) )          P_force = Σ hulls · quality, normalized  [planning]
weekly draw: incidents ~ Poisson( λ · D(target) · effort_target ),  λ = 0.5        [planning]
each incident: damage risk, munitions spent, a Record entry, a press beat
```

Escalation for the target, or any affected NPC, uses the agent's existing terms plus four new ones:

```
P(contest strait k this week) = σ( −3 + 2.0·regimeThreat + 1.0·grudge + 1.5·D(target,k)
                                    − 2.5·ownExposure_k · (1 − cutX_target)        ← "nothing left to lose"
                                    − 1.0·patronDependence_k )                      (China's Hormuz weight 0.5)   [planning]
```

Only the shape of these coefficients is argued. They need a balance pass (§5.11).

- **Legal and political.** Blockade, mining and contest are `hostilities`: rung-4-class War Powers standing, with the 60-day clock and an authorization requirement once the window passes. They open a conflict on the first act. Interdiction with a UNSC basis carries little standing cost; without one, the cost scales with the neutral traffic stopped. Allies whose imports run through the strait carry a ripple scaled by `weight × imports`.

### 5.7 NPC symmetry

`maritimeOptions` is actor-agnostic. The NPC agent's candidate list (`npc-agent.ts:338-346`) enumerates derived rows instead of the five rungs. Non-state operators enter as deniers through the authored `X` rows (Houthis at Bab el-Mandeb). With that in place:
- Iran contesting Hormuz,
- China quarantining Taiwan,
- a Houthi Red Sea campaign,
- and a US distant blockade at Malacca

all run on one code path. The player's escort and clearance acts are their answer.

### 5.8 Player surface

Following DESIGN "compare and authorize" with a **wait** baseline, and the results-list rule (rows with drawn cost, odds and effects; expand for detail; no option-column tables):

- **Target page → Sea.** The derived rows for this pair. Each row draws:
  - weekly cost (bar, $/week, with the up-front figure);
  - odds of reaching the effect (dial);
  - projected effects as readings: target exports %, Brent band at 4 and 12 weeks, US gallon;
  - escalation (dial: chance the target contests a strait within 4 weeks);
  - legal class chip (lawful / contested / act of war), with War Powers status.

  Refused rows stay listed, collapsed, with the reason ("Landlocked"; "Needs 14 free surface combatants, 9 free"). Expanding a row shows its terms: scope (ports, cargo, direction), duration (weeks or until lifted), rules of engagement, partners, and an end condition. The live preview recomputes every reading.
- **Chokepoint page** (from the map, where geography answers the question, DECISIONS §8.8): a flow gauge, threat and mines meters, who is denying and who is guarding (faces and flags), the commodity shares at stake, and a 26-week price strip. Acts: escort, clear, hold open, or, for the player as denier, contest or distant-blockade.
- **Standing operation** in the Record and on the forces page: its week, incidents, cost to date, and a one-verb lift.

### 5.9 Worked example (`probe-worked.mjs`; kernel and pump read from committed dist)

**Stage A — US blockade of Iran's energy exports, rules of engagement "disable", 1 carrier group plus 8 surface combatants.**
- `cutX_IRN` ≈ 0.7; leak 0.3 → loss = 0.04 (IRN crude share, dataset) × 0.7 = 0.028.
- Brent $74.7 (w1), $75.4 (w4), $75.5 (w13–26). Spare 0.03 absorbs it.
- Iran's growth target falls about 4.1 points a year.
- Cost about $61.5M a week before any Iranian fire.
- War Powers hostilities clock starts, and a US–Iran conflict opens.

**Stage B — from week 3, Iran contests Hormuz** (effort 1, D ≈ 0.85, weak guard).
- Closure fit to 2026: flow 4.9/21.6 → closure 0.773; bypass 0.13; loss 0.2 × 0.773 × 0.87 = 0.1345, plus Stage A; risk 0.06.
- Brent: $95 (w4), $111 (w8), $114 (w13), $116 (w26).
- With Gulf spare stranded (spare 0.005): $99, $117, $120, $124.
- LNG index: 1.3 (w4), 1.5 (w8), 1.6 (w13–26).
- US gallon (pump formula, no lag smoothing): $3.70 (+15.2%) at w4, $4.06 (+26.2%) at w8, $4.13 (+28.4%) at w13 against $3.22.
- CPI gasoline term +0.44, +0.76 and +0.82 points.
- `pumpShock` fires, and prosperity salience rises ×1.25.
- Operation cost rises to about $100M a week with munitions under fire.
- Japan, Korea, India and China take the landed-cost term on their Hormuz weights. China's patron term argues for restraint and is outweighed.

**Read.** Blockading Iran alone barely moves oil. Blockading Iran is what makes Iran close Hormuz, and that is the expensive part. The game should show both the cheap first-order effect and the expensive second-order one before the player commits. It does this with the escalation dial and the conditional Brent band ("if Iran contests the strait: $110–120 by week 8").

### 5.10 Engine contract, data and doc-sync surfaces

- **World schema (blocking doc sync).**
  - `Chokepoint` gains `littoral`, `commodityShare`, `bypassShare`, `detour`, `provenance`.
  - A new sea-denial table: actor or operator × chokepoint `X`.
  - Port count per coastal nation (or a proxy).
  - New force assets: MCM and maritime patrol, with cost anchors.
  - The `stat-consumers.ts` entries for `geo.chokepoints` and the dependence weights now name the new readers.
  - Update `docs/SCHEMA.md` and `docs/ARCHITECTURE.md`.
- **Engine contract (blocking).**
  - `Campaign.maritime` (chokepoint runtime, standing operations).
  - New `Effect` kinds (`maritimeOperation`, `chokepointEffort`).
  - `ResolutionRequest` gains `maritime: { act, ports?, cargo?, direction?, chokepoint?, roe, weeks? }`.
  - `ActionProjection` gains `escalation` and `marketForecast`.
  - `AdvanceResult` and `AttentionStop` gain a chokepoint stop (flow crosses 0.75 or 0.4).
  - `MAJOR_FORCE_RUNGS` becomes a function of legal class.
  - `routeShock` is deleted in favor of `flow_k`.
  - Save version bump with no migration of old blockades (owner: no backward compatibility).
- **Content.** Consequence cards keyed on `military` rung band 3 need re-keying to maritime acts. Check scenario conditions that read `blockade` history.
- **Docs.** `docs/DECISIONS.md`:
  - a new rule: chokepoints are contested state; a blockade is an act of war;
  - §8.8: a chokepoint page is a geography-answers-the-question map.

  `docs/DESIGN.md` gets the Sea rows and the chokepoint page.

### 5.11 Build steps and balance acceptance

**Build steps:**
1. Data: chokepoint fields and sources (re-open the EIA Q2 2026 figure); the denial table; ports; unit anchors.
2. Engine: `maritime-state.ts` (flow, threat, mines), `maritime-options.ts` (derivation), `maritime-acts.ts` (resolve and weekly contest), cost extension in `force-costs.ts`, shock wiring in `commodity-shocks.ts`, `coercionPressure` term, War Powers class, NPC candidates. Each file under 800 lines.
3. Delete military rung 3, `blockadeBite`, `chokepointExposure` and the Hormuz custodian constant.
4. player-core view models, then the web Sea rows and chokepoint page.
5. Seed the `world-2026` preset with Hormuz in contest.

**Balance acceptance** (12 seeds, the harness plus a scripted maritime proxy):
1. **Calibration.** Iran contesting Hormuz with a weak guard gives flow 0.15–0.30 and Brent +45% to +75% over its pre-shock level by week 8–12. Houthi-type denial with escort gives Bab el-Mandeb flow 0.35–0.6 and Brent under +10%.
2. **First order is small.** A blockade of Iran's exports with no Iranian response moves Brent under +5%.
3. **Lifting restores.** Target trade within 5% of control 8 weeks after lifting, and no permanent stat writes.
4. **Cost ordering.** Exercise < presence-week < blockade-week < strike. A contested blockade of Iran costs $50–200M a week at US prices. Invasion is never cheaper than strike for the same target.
5. **Menus.** Luxembourg has zero maritime rows. Iran has at least 6. Every row against a treaty partner carries an alliance cost. The Houthi operator can contest Bab el-Mandeb.
6. **NPC tempo.** Chokepoint contests started by NPCs per 208-week term within a band the owner sets (Q3); no chokepoint below flow 0.5 for more than 52 consecutive weeks without a party at war.
7. **Approval.** A Hormuz closure reaches US approval only through prosperity, security and impact terms, within the approval audit's weekly mood budget. No direct approval write exists in maritime code.
8. **Record.** Every price move names its chokepoint and act as cause.

### 5.12 Strongest failure mode, best alternative, verdict

**Strongest failure mode.** NPC chokepoint closures become the most common shock in the game, and every term turns into an oil crisis. A seeded world with Iran, the Houthis and China each able to contest a strait, and coefficients fit to one bad year (2026), could put Brent above $100 for a third of every campaign. Prosperity would be swamped, and a domestic-agenda President would have no game. A second risk: the derivation is only as good as the denial table and port data. If those are thin, Iran and Oman look alike.

**Best alternative.** Keep the ladder and patch it:
- write blockades into `coercionsInForce` as an export embargo with `stopsImposerSales`;
- add a generic "route" shock for every chokepoint whose littoral state is at war;
- add an `exports` cut and a weekly recovery;
- reprice with tempo and munitions.

That is cheap and touches about four files. It fixes F2, F3, F4 and F7. It leaves F1, F5, F9, F10 and F11: no strait acts, no escort, no control that can change, the same menu everywhere, and no Iranian closure as an answer. That last one is the realism the owner asked for.

**Verdict: accepted with controls.**
- (1) The NPC contest probability carries a hard rate cap per term and a cool-down per chokepoint until the balance band in test 6 holds.
- (2) The denial table, port data and Q2 2026 calibration figure are sourced and dated before build.
- (3) Calibration tests 1 and 2 gate the merge.
- (4) The approval redesign's weekly mood budget is in place first, or this ships behind the existing pump path only, with no new mood writers.

### 5.13 Interaction with the approval redesign and BL-142

- **Approval.** This design adds **no** approval or mood writer. It produces prices, wars and casualties, which the approval model reads through the judgments. It depends on the approval audit's recommendations:
  - §8.1 item 7, the weekly direct-mood budget (a Hormuz closure plus a war plus casualties in one month must not stack beyond it);
  - item 8, salience on change (`pumpShock` already fits);
  - item 9, the rally term (sailors killed in the strait);
  - item 6, one bill per cause (a closure reaches prosperity once, through the pump, not again through a condition).

  Under the bloc model, valence `V` carries the price shock to all three blocs. Whether use of force also carries a partisan `I_b` term is an owner question (Q5).
- **BL-142.** BL-142 does not cover maritime coercion. It shares two rules: isolation and double-billing (one path per cause, enforced by a gate), and priced levers with weekly caps. If the owner wants hawk/dove positions to matter, force and sanctions acts would enter as an issue under BL-142's `IssueDef`, after its phase 1 and after the bloc layer, not inside this change.

---

## 6. Owner questions

1. **Selective or total closure.** Should a denier be able to close a strait only to hostile flags (Iran letting some ships through for a price or a flag), which needs per-flag flow? Or is one flow per strait enough for the first build?
2. **The opening world.** Should the default founding open with Hormuz contested, as the 2026 snapshot records? Or should the seeded board stay calm, with the contested strait only in the `world-2026` preset?
3. **How often may the world close a strait?** Name a band of NPC-started contests per term (for example 0–2). This sets the cap in control (1).
4. **Distant blockade of a great power.** Should the US be able to stop China-bound energy at Malacca at all, with a nuclear-armed target, or should that row be refused as a matter of design?
5. **Partisanship of force.** Should a blockade or strike move the President's own and opposition blocs differently (an `I_b` hawk/dove term under BL-142), or only through outcomes (prices, casualties, war)?
6. **Losses.** Can US ships be sunk in the game, with names and crews in the Record, or only damaged and withdrawn?

---

## 7. Probe commands

All run from the repository root against committed `dist/`. They change nothing.

```bash
node docs/audits/2026-10-12-coercion-geography/probes/probe-blockade.mjs coercion-0 IRN 8   # failed draw
node docs/audits/2026-10-12-coercion-geography/probes/probe-blockade.mjs coercion-1 IRN 8   # landed
node docs/audits/2026-10-12-coercion-geography/probes/probe-blockade.mjs coercion-2 IRN 8   # failed draw
node docs/audits/2026-10-12-coercion-geography/probes/probe-menu.mjs coercion-0             # menus, costs, odds across 13 pairs
node docs/audits/2026-10-12-coercion-geography/probes/probe-kernel.mjs                      # crude kernel under constant losses
node docs/audits/2026-10-12-coercion-geography/probes/probe-worked.mjs                      # worked example arithmetic
```
