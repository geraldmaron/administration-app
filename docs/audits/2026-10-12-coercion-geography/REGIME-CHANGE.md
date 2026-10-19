# Regime change and the intervention family: design, 2026-10-12

> **Corrections recorded 2026-10-13 (REGIME-VERIFY §4 item 7).** O'Rourke reports no decay half-life for an installed regime's alignment; every half-life in this document is a design choice. The foreign-imposed regime change table cited below is Nomikos's, from the Downes and Monten correspondence, and it categorizes interveners, not targets. The unverified Venezuela operational details are dropped. The built first slice is described in `REGIME-SLICE-1.md` and DECISIONS 6.15.

Branch `codex/simulation-depth-completion`, engine and world `dist/` as committed. Read-only against source: no build, no workspace tests, no verify sweep, no Playwright, no balance harness. The probes and the arithmetic script are in `probes/` beside this file; their commands are in §16.

The owner's brief: "I'd imagine we'd be able to overthrow governments in our set of options too; think about what the US did in Iraq, Venezuela and more." Earlier: precedent is evidence, not a constraint; no backward compatibility; leave room for realistic, sometimes steep, impact.

This design is written against the sea-operations **VERIFY.md** (same folder), not only the AUDIT it checks. Three of its findings shape everything below: (1) the treasury is budget authority refilled by about $27.5B a week, so **dollars are not a binding limit** for the player; the limits that bind are force formations, readiness, munitions and the clandestine service's capability; (2) a war the board already carries is priced by `warOutlayShare`, the war tick and attrition, and a new cost model must not bill it again; (3) NPC repeat acts compound, so every new NPC-reachable act needs a per-pair cooldown and a per-term rate before it ships. It also recommends a smaller maritime change first; §11.1 says how this design sits on that smaller change.

Labels: **Fact** is read in source, observed in a probe, or read in a source opened this session (cited inline, listed in §15). **Inference** is a reading of facts that was not measured. **Recommendation** is a proposal. **Planning value** is a number this design chooses; it is a dial, not a finding.

---

## 0. Summary

**What exists today (fact).** The game cannot change another government on purpose. The covert ladder's top rung, "Covert Regime Action", lowers the target's `regimeStability` by about 0.15 once and sets a flag that only a congressional inquiry reads. Nothing in it seats anyone. A foreign chair changes only through the world's own machinery (elections, confidence votes, a stability-driven coup hazard, death, or a decisive military defeat), and in every case the successor is the target's own next figure, never the sponsor's candidate. In probes, five covert regime actions against Haiti drove its stability from 0.37 to 0.044 over 80 weeks with no change of government. An invasion of Venezuela was "won" in under six months while the engine counted 110,993 to 141,824 American casualties, left no occupation, no insurgency and no new government (a coup in the same week of the control run had already seated a junta), and Iraq, Afghanistan, Iran, Syria and Libya cannot be invaded at all for reach.

**Recommendation (one design).** Model regime change as a **contest over a government's hold**, carried as standing state per target, which any government can enter through six derived acts: political action, coup support, proxy support, recognition with pressure, decapitation, and air support to a rising, with invasion and occupation as the seventh, built on the existing war. Each target's **hold** is derived from data the dataset already carries (stability, legitimacy, security-force cohesion, elite cohesion, a patron). Each target carries **contenders** (civic opposition, armed movement, military faction), also derived. Acts grow contenders; the existing coup machinery gains one added weekly hazard driven by contender pressure against hold; a fall seats a successor drawn from the contenders, with the sponsor's alignment fading over two years, as O'Rourke's data says it does. Covert acts carry an exposure hazard that feeds the existing finding, scandal and inquiry paths. Invasion opens the existing war, and its aftermath is an **occupation** state with an insurgency, casualties and costs fitted to Iraq. Prices that bind are formations, readiness, munitions and the clandestine service, with dollars reaching the economy only through the existing war-outlay path. Approval moves only through the judgments it already reads.

**Verdict: needs validation** (§13). The structure is right and every parameter is labeled, but calibration is fitted to a handful of cases and must hold at 12 seeds in the harness before anything ships, and two prerequisites (the casualty model and the NPC tempo cap) are defects today.

**Top findings** (§1):

1. No act seats anyone; the covert top rung is a one-shot stability write (R1, R2).
2. The successor of any fall is the target's own figure, and a change of government moves no relationship toward the sponsor (R3).
3. The `destabilized:` flag the covert rung sets is read by the inquiry only; the coup hazard reads war and conditions instead (R4).
4. War casualties scale with the principal's **whole** active force: an American "aggressor" loses about 6,900 people a week at intensity 0.5 and even pressure, in any war (R7).
5. Invasion reach caps refuse Iraq and Afghanistan, the two cases the owner named (R6).
6. Covert regime action is priced as a share of US GDP ($18.5B to $28.1B), a pricing rule DECISIONS §6.8 already retired for force acts; the refill hides it anyway (R5).
7. No recognition act, no opposition government, no occupation, no post-change insurgency, no refugee flow (R8).
8. Keep: the findings object and its three states, the inquiry and scandal paths, the coup hazard's shape, `successionPacket`, the war tick, War Powers and force authorization, intelligence collection, and the single code path NPCs share (R11).

---

## 1. What exists today

### 1.1 The acts

**Fact.** `packages/engine/src/instruments.ts`:
- Covert rung 4 "Proxy Support" (`:207-224`): gate intel ≥ 0.5 and a shared border or a base abroad; effect: the target's `insurgencyPressure += 0.1·jitter` once, `militaryThreat += 0.1`, intel capability −0.05 (`capacity.ts:336-341`).
- Covert rung 5 "Covert Regime Action" (`:226-241`): gate intel ≥ 0.65, counter-intel ≥ 0.4, covert reach; effect: `regimeStability −= 0.15·jitter` once, trust −0.4, the flag `destabilized:<target>`, intel capability −0.1 (recovering 0.015 a week, so about 7 weeks).
- Military rung 5 "Expeditionary Invasion" (`instruments-military.ts:192-232`): opens or escalates a conflict, target readiness −0.3 and stability −0.2, a sustainment commitment.
- No diplomatic rung recognizes anyone (`instruments.ts:59-133`; grep for "recogni" in engine and world finds no act).

### 1.2 Who governs abroad

**Fact.** `foreign-politics.ts`:
- One change at most per nation per week, in the order death, scheduled selection, lost confidence, coup (`nationWeek`, `:483-494`).
- Coup hazard (`:236-316`): off at `regimeStability ≥ 0.45`; weekly rate = `0.006·fragility·proneness + 0.0008·rivalAmbition + 0.002·destabilization`, where `destabilization` is 1 at war, 0.5 with a live condition (`:274-283`, `coupHazard` `:303`). It does not read `destabilized:`.
- Successor in a coup: the most ambitious defense minister, intelligence director or junta chairman not holding office (`armedRival`, `:267-272`), seated partyless.
- Successor after decisive defeat (`war-outcomes.ts:138-143` → `successionPacket`, `:583-593`): the opposition leader of another party, or the governing party's next candidate.
- `applyLeadership` (`world-effects.ts:46-56`) writes the seat and the record only. A new government gets a program and a temperament offset; **no relationship edge moves**.

### 1.3 Law, exposure and the Record

**Fact.**
- `findings.ts` models the covert-action finding with three states (written, contemporaneous, unwritten), notification tiers (full committees, gang of eight, withheld) and the two refusals the statute carries; a covert act with no standing finding is recorded as unfounded (`:308-344`).
- Exposure on success = `target.counterIntel × 0.25` (`covert-exposure.ts:7-9`); failure branches are exposure 0.5, asset lost 0.3, blowback 0.2 of the failure mass (`resolution.ts:474-478`).
- The intelligence committee opens an inquiry on a landed player covert rung 5 (`committee-inquiry.ts:68-80`); a failed covert act is a `covert-failure` scandal origin (`scandal-origins.ts:156`).

### 1.4 Probe results

All against committed `dist/`, passive Democratic proxy.

**P1, the menu (`probe-regime-menu.mjs regime-0`).** Bare requests, so military rung 5 prices the preferred package (VERIFY point 1); covert acts have no package and this is the price the screen shows.

| target | regime (data) | stability | covert-5 cost / odds / exposed if landed | invasion |
|---|---|---|---|---|
| Haiti | authoritarian | 0.37 | $20,544M / 0.53 / 0.0675 | $284.16M, 0.54 |
| Venezuela | authoritarian | 0.35 | $21,284M / 0.49 / 0.0875 | $294.4M, 0.49 |
| Cuba | one-party | 0.75 | $18,508M / 0.39 / 0.20 | $256M, 0.57 |
| Iran | theocracy | 0.60 | $27,207M / 0.29 / 0.175 | refused, reach |
| Iraq | authoritarian | 0.35 | $27,022M / 0.38 / 0.0625 | refused, reach |
| Afghanistan | theocracy | 0.50 | $28,132M / 0.35 / 0.075 | refused, reach |
| North Korea | one-party | 0.85 | $27,947M / 0.22 / 0.2375 | refused, reach |
| Canada | full democracy | 0.85 | $18,508M / 0.40 / 0.1375 | $256M, 0.45 |

Covert odds barely track the regime: Canada (0.40) is an easier covert target than Iran (0.29) and the spread from North Korea to Haiti is 0.22 to 0.53.

**P2, the coup ceiling (`probe-coup-pool.mjs regime-0`).** All 195 governments have an armed rival. The most a covert campaign can buy today is stability 0, where the weekly hazard is 0.00866 for Venezuela (36.4% within 52 weeks), 0.00666 for Haiti (29.4%), 0.00367 for Iran and Cuba (17.4%), 0.00306 for Panama.

**P3, covert regime action (`probe-regime-run.mjs`).**
- Haiti, seed regime-1, once: landed; stability 0.37 → 0.231 (control 0.37), 0.24 at week 10. Treasury against control: −$23M (t3), −$158M (t4), $0 (t10). The $20.5B is reserved at issue (`instrument-issued.ts:46`) and refunded at execution, and the weekly refill hides what remains (VERIFY point 3).
- Haiti, every 13 weeks to week 80: stability 0.044 against 0.363; the same president in both runs; four unfounded actions on record; standing 0.594 against 0.674; approval 0.574 against 0.579.
- Venezuela, seed regime-0, once: stability 0.004 by week 41 (control 0.10); no change of government.

**P4, invasion of Venezuela (`probe-regime-run.mjs regime-2 VEN military 5 104`).**
- Conflict opened at week 4; status `aggressor-victory` by week 28.
- Casualty bands at week 28: US 110,993–141,824; Venezuela 7,892–20,787.
- The chair: a junta chairman seated by a coup in April 2029, **which also happened in the control run**. The invasion changed nothing about who governs.
- No occupation; insurgency 0.25 → 0.238; Venezuela's trust toward the US −0.094 against about 0.008.
- Standing 0 against 0.728 (week 28); approval 0.488 against 0.545 (week 28) and 0.477 against 0.513 (week 80).

**P5, NPC tempo (`probe-npc-regime.mjs regime-0 104`).** Over 104 weeks no NPC took covert rung 4 or 5 or military rung 5 (covert rung 2: 9 acts, rung 3: 2). Of the last 24 changes of government on record (the window is capped at 24, `state-world.ts:141`), 22 were elections, 1 a coup (Somalia), 1 a resignation.

### 1.5 Findings

| # | Claim | Evidence | Severity | Verdict |
|---|---|---|---|---|
| R1 | No act can replace a government; the covert top rung is a one-shot stability write | `instruments.ts:226-241`; P3 | Critical | Replace |
| R2 | Proxy support is a one-shot insurgency write with no standing proxy, no armed movement and no end | `instruments.ts:207-224` | High | Replace |
| R3 | Every successor is the target's own; a change of government moves no relationship | `foreign-politics.ts:174-190, 267-272`; `world-effects.ts:46-56` | Critical | Change |
| R4 | The coup hazard ignores the covert flag; its "destabilized" term reads war or conditions | `foreign-politics.ts:274-298` | High | Change |
| R5 | Covert cost is a GDP share ($18.5B–$28.1B), against §6.8's own reason for retiring it; the refill hides it | `resolution.ts:243, 275`; P1, P3 | Medium | Change: price in service capability, not dollars |
| R6 | Invasion reach cap 1.3 refuses Iraq, Afghanistan, Iran, Syria and Libya; Canada and Venezuela pass | `instrument-gates.ts:156`; P1 | High | Change: reach from basing and staging |
| R7 | Casualties are the principal's whole active force × 0.5 × 0.02 × intensity, so the US loses 1,388,484 × 0.5 × 0.02 × 0.5 × (0.5 + pressure), about 6,900 a week at intensity 0.5 and even pressure, against anyone | `war-attrition.ts:17, 26, 66-75`; P4 | Critical | Change: engaged = the committed package |
| R8 | No recognition, opposition government, occupation, post-change insurgency or refugee flow | grep; P4 | High | Add |
| R9 | A war the US fights as aggressor costs 2% of US GDP a year times intensity, whatever the target (about $275B a year at 0.5) | `fiscal-impulse.ts:119-133` (computed with the dataset's US GDP $27,498,847M) | Medium | Change: scale by the committed package |
| R10 | Covert odds hardly see the regime (Canada 0.40 > Iran 0.29) | P1 | Medium | Replace with the hold contest |
| R11 | Sound and reusable: the findings object, the inquiry and scandal origins, the coup hazard's shape and stream keys, `successionPacket`, the war tick and settlement, War Powers and force authorization, collection reports, NPCs on one ladder | as cited | — | Keep |

---

## 2. The real cases (sources opened, §15)

| Case | Act | What happened (fact) | What it calibrates |
|---|---|---|---|
| Iran 1953 | covert coup support | First attempt collapsed; on 19 August paid crowds, police and army units joined, about 24 tanks taken; Zahedi named by the Shah's decree (NSArchive EBB 435) | coup needs a seated alternative with a legal shell; a first failure is survivable |
| Guatemala 1954 | covert coup support | $2.7M budget authorized August 1953; Arbenz resigned 27 June 1954; CIA's own history says it "barely succeeded"; human-rights groups estimate more than 100,000 civilians murdered by military regimes 1954–1990 (NSArchive EBB 4). The CIA's 1953 paper wanted an 80% chance before pulling the trigger (FRUS Guatemala, editorial note) | low money, high consequence; decades-long aftermath |
| Chile 1964–73 | political action, then coup encouragement | $3M on the 1964 election; $8M from 1970 to the 1973 coup, more than $3M in FY1972; in 1970 the CIA tried directly to foment a coup and passed three weapons; the Committee found no evidence of direct involvement in 1973 (Church Committee staff report) | political action is cheap and slow; the sponsor can shape but not choose the moment |
| Bay of Pigs 1961 | exile invasion | Landed 17 April; defeated within 2 days; Castro declared socialism and moved toward Moscow; Mongoose followed and failed; the missile crisis came in October 1962 (history.state.gov) | high-hold target: failure strengthens the regime and invites the rival power |
| Nicaragua 1982–90 | proxy support | Boland (Dec 1982); funds cut Oct 1984 after harbor mining; $27M humanitarian (1985); $100M, 70% military (1986); Iran-Contra (Nov 1986); 1990 election seated Chamorro (history.state.gov) | Congress as a weekly risk to a proxy program; exposure ends funding |
| Afghanistan 1979–92 | proxy support | Through Pakistani intelligence; CIA aid ended 1992; Taliban rose; bin Laden returned in 1996 as its guest (NSArchive EBB 57) | the staging partner owns the proxy; blowback across a decade |
| Syria 2014–15 | proxy (train-and-equip) | $500M, goal 5,400 fighters; "four or five" in the fight by September 2015 (Defense News) | a proxy built from nothing fails against a rival armed movement |
| Venezuela 2019–26 | recognition + sanctions, then decapitation | 57 countries recognized Guaidó; Russia, China, Cuba, Turkey and Iran backed Maduro; security forces did not defect; economy −35% in 2019; 4.8M left by Dec 2019 (CRS IF10230, Jan 2020). On 3 Jan 2026 strikes and a raid captured Maduro and Flores, flown to New York on SDNY charges (WDET/NPR). Delcy Rodríguez, his vice president, became acting president; with US warships offshore her government agreed in August 2026 to a 100-year venture giving the US 55% of effective output; no text released (AP via PBS) | recognition alone fails against a patron-backed, loyal security force; decapitation seats the regime's next in line, whose alignment follows standing leverage |
| Panama 1989 | decapitation by invasion | About 27,000 troops from 20 Dec; 23 killed, 324 wounded; Noriega captured and tried in the US (army.mil; CRS RL32492) | small target, forces already in country, short war |
| Grenada 1983 | invasion | 25 Oct–1 Nov; about 7,300 US and 300 OECS against 1,500 Grenadian and 700 Cuban; 19 killed (USMC Museum; CRS RL32492) | days, not years, when the target is tiny and isolated |
| Libya 2011 | air support to a rising | UNSCR 1973 "all necessary measures"; US flew 1,206 of 1,990 Odyssey Dawn sorties; about $750M by mid-May (Air & Space Forces); Qadhafi killed 20 Oct (CRS RL33142, Oct 2011); by 2015 rival governments and no stable state (CRS RL33142, Aug 2015). Export loss 1.5 Mb/d, Brent +$15 in 12 days, 2011 average $111.26, IEA stock release (EIA) | fast fall, fragmented successor, a market shock from the target's own output |
| Afghanistan 2001–21 | invasion and occupation | $837B warfighting, $145B reconstruction; 2,443 US and 1,144 allied troops killed, 20,666 US injured; at least 66,000 Afghan troops and more than 48,000 civilians killed; "unrealistic timelines" (SIGAR 21-46-LL) | the long tail; successor that never stood alone |
| Iraq 2003–11 | invasion and occupation | 4,418 US deaths, 31,994 wounded (19 Mar 2003–31 Aug 2010) and 74 more in New Dawn (CRS RL32492); $806B appropriated through FY2011, peak $142.1B in FY2007 (CRS RL33110, Mar 2011); UK post-conflict planning "wholly inadequate", the coalition "failed to achieve the goals it had set", and events undermined regional stability "including by allowing Al Qaida space" (Iraq Inquiry, Executive Summary) | the occupation fit (§4.8) |

**Base rates (fact).**
- O'Rourke, 1947–1989: 64 covert and 6 overt US regime-change attempts; 25 covert successes and 39 failures (39%) against 66% for overt; offensive operations failed their first 18 attempts; preventive and hegemonic operations replaced the regime in about half; installed regimes were no less likely to have a militarized dispute with the US over the next decade and no more likely to vote with it; targets that survived were considerably more likely to have a dispute and to diverge; targeted states were more likely to see civil war or mass killing (H-Diplo/ISSF roundtable 13-3). Most operations failed to stay covert; 44 of 64 backed authoritarian forces (Preble, War on the Rocks).
- Downes and Monten as tabulated in the *International Security* correspondence: imposed regimes became consolidated democracies in 10 of 60 nondemocracy-initiated cases (0.17), 16 of 38 democracy-initiated (0.42), and 13 of 17 post-1918 foreign-imposed democratizations (0.76), with success concentrated where wealth, ethnic homogeneity and prior democracy were present; since 1944 civil war followed 10 of 39 regime changes; 57 of 63 modern regime changes did not lead to occupation and protracted counterinsurgency.

**Law (fact).** 50 U.S.C. § 3093: a covert action needs a written presidential finding, or a contemporaneous record reduced to a finding within 48 hours; it may not authorize an act already taken; it is reported to the intelligence committees before initiation, or to the leadership group in extraordinary circumstances, or late with reasons; it may not be "intended to influence United States political processes, public opinion, policies, or media". `findings.ts` already models all of this. Overt force runs through War Powers and an authorization (`war-powers-report.ts`, `force-authorization.ts`). A UN Security Council authorization existed for Libya (UNSCR 1973) and not for Iraq 2003.

---

## 3. The design: a contest over a government's hold

### 3.1 State

**Recommendation.** One new runtime record per target where a contest is live, `campaign.regimes[nation]`:

```
hold        H ∈ [0,1]   derived each week, never stored (DECISIONS §1.10)
contenders  { civic, armed, military } each { strength s ∈ [0,1], sponsors: NationId[], alignment a ∈ [−1,1] }
operations  [{ id, act, sponsor, scale ∈ {low, standard, high}, since, finding?, exposure ∈ [0,1] }]
aftermath?  { since, path, successor, legitimacy G', disbandedForces, occupation? { brigades, insurgency I } }
```

Founding: contenders are derived for all 195 governments from data (§4.2) and stored only once something moves them; a nation with no operation and no aftermath carries no record. The world's own coup and election machinery stays where it is.

### 3.2 The act family

Each act is a **standing operation** with a weekly effect and a one-verb lift, except decapitation (one shot) and invasion (opens the existing war). The binding costs follow VERIFY: formations, readiness, munitions, the clandestine service, standing, Congress. Dollars reach the economy through `warOutlayShare` re-based on the committed package (R9), never as a second treasury bill.

| Act | Real shape | Gates (derived) | Legal path | Binding cost | Effect each week | Failure and exposure |
|---|---|---|---|---|---|---|
| **Political action** | Chile 1964, 1970–73 | intel ≥ 0.25; target has a civic contender (a contest, an opposition person) | finding, committees | intel capability, small | civic s grows; regime legitimacy erodes slightly | exposure hazard low; exposed: integrity scandal, target grudge |
| **Coup support** | Iran 1953, Guatemala 1954 | intel ≥ 0.5; current collection on the target; an armed rival exists; hold < 0.6 | finding; gang-of-eight allowed | intel capability; one asset per week at risk | military s grows | exposure medium; a failed coup is a purge (military s → 0.2·s, hold +0.05) and a scandal |
| **Proxy support** | Contras, Afghanistan 1980s, Syria | intel ≥ 0.5; staging (shared border, a base, or a willing neighbor with alignment ≥ 0.3); armed contender s ≥ 0.1 or insurgency operator present | finding; appropriation (a hill vote each fiscal year); Boland-type cut-off risk while exposed | intel capability, munitions (small arms), the staging partner's patience | armed s grows; regime stability bleeds | exposure high (proxies talk); proxy may persist as a non-state operator after the war (existing `operators.ts`) |
| **Recognition and pressure** | Venezuela 2019 | diplomatic reach ≥ 0.35; a civic contender with a named person (opposition leader) | executive act; no finding | standing (a recognition coalition smaller than half the world costs standing), trade | civic s jumps once and grows; legitimacy falls; sanctions (existing economic rungs) bite security-force pay unless a patron replaces it | public by nature; the patron's counter-support raises hold |
| **Decapitation** | Panama 1989, Venezuela 2026 | current collection; a strike package or special forces reach (existing gates); target not nuclear-armed | War Powers hostilities report within 48 hours | readiness, munitions, a casualty risk | one shot: the leader is removed (captured or killed); hold −0.15; the charter's successor is seated (`successionPacket`) | failure: hostilities without the prize, a rally for the regime (hold +0.05) |
| **Air support to a rising** | Libya 2011 | armed contender s ≥ 0.2; strike reach; a UNSC basis or a coalition (lowers standing cost) | War Powers; AUMF after 60 days | sorties, munitions, readiness (existing strike costs) | armed s grows; security cohesion falls | a stalemate; a fragmented successor |
| **Invasion and occupation** | Grenada, Panama, Afghanistan, Iraq | existing invasion gates with reach from basing (R6) | War Powers and an authorization | brigades committed, readiness, casualties | existing war tick until the defender collapses; then occupation (§4.8) | quagmire; insurgency; refugees |

Bay of Pigs is not an act; it is the **failure of proxy support or coup support against a high hold**, which the equations must produce (§9 test C3).

### 3.3 The successor

**Recommendation.** At a fall, the successor is drawn from the contenders with weight `s_i²`, then seated through the existing seat writer with a new `LeadershipChange.kind = "overthrow"` (or `"imposed"` after an occupation, `"decapitation"` for the charter's successor). The successor's person comes from the existing pools: military → `armedRival`; civic → the opposition leader (`challengerFor`); armed → the insurgency's leader (a new person drawn from the pool, labeled as such). The successor carries the contender's alignment toward each sponsor, written as a **relationship delta** that decays (§4.6). Who takes power is therefore a function of who the sponsor built up, and the player can see it before committing.

---

## 4. Equations

Every coefficient below is a planning value unless marked otherwise. All are fixed-point dials in one file (`regime-dials.ts`), the way `contest-dials.ts` holds the odds dials.

### 4.1 Hold

```
K  = clamp01( 0.9 − 0.4·prone/1.5 − 0.3·corruption + 0.2·(doctrineQuality − 0.5) )   security-force cohesion
P  = max over p ≠ actor, target of  max(0, alignment_{p→t}) · powerTier_p/5 · (intel_p ≥ 0.5 ? 1 : 0.5)   patron
H  = clamp01( 0.30·S + 0.20·G + 0.25·K + 0.15·(1 − F) + 0.10·P )
```

`S` stability, `G` legitimacy, `F` factionalism, `prone` the existing `REGIME_PRONENESS` (`foreign-politics.ts:252-262`). Weights sum to 1, so `H ∈ [0,1]`. Fact, computed by `calc-regime.mjs` on the founded board: Mali 0.28, Iraq 0.323, Venezuela 0.346 (patron Russia, P = 0.217), Haiti 0.35, Nicaragua 0.46, Guatemala 0.472, Iran 0.547 (patron China, P = 0.413), Panama 0.555, Cuba 0.593, Chile 0.603, North Korea 0.621.

### 4.2 Contenders at founding

```
civic0    = clamp01( 0.5·protestPressure + 0.5·(1 − G) ) · open,    open = 0.6 for one-party or no-party systems, else 1
armed0    = insurgencyPressure
military0 = maxAmbition(armed rivals) · prone/1.5 · (1 − S)
Φ         = 1 − Π_i (1 − 0.5·s_i)                                   pressure on the regime
```

The 0.5 inside Φ keeps a founding world away from saturation: Haiti's three contenders (0.52, 0.33, 0.349) give Φ = 0.49 rather than 0.79.

### 4.3 The added fall hazard

```
p_c(Φ, H) = 0.06 · σ( 8 · (Φ − H − 0.15) )
p_add,t   = max(0, p_c(Φ_t, H_t) − p_c(Φ_0, H_0))
```

`p_add` is added to the existing coup hazard's weekly rate as a fourth term, `"contest"`, through the same `weigh` call and stream key (`foreign-politics.ts:303-316`), so a seed replays and the world's own coup rate is unchanged when nobody acts. Subtracting the founding value is what keeps the world's base rate where `COUP_*` already puts it. The ceiling 0.06 a week is the most a full contest adds (about 96% within a year at the ceiling; the ceiling is reached only when contender pressure exceeds hold by more than about 0.4).

**The cooldown and cap** (VERIFY point 4): one fall at most per target per 52 weeks (the existing `COUP_COOLDOWN_DAYS` = 364 extended to every fall kind); one standing regime operation per sponsor-target pair; an NPC may run at most two regime operations at once and start at most one per 52 weeks.

### 4.4 What each act does each week

```
political action:  Δcivic    = 0.02·m·(1 − civic),             ΔG_regime = −0.002·m
coup support:      Δmilitary = 0.05·cov·(1 − military) − 0.01·military·K
proxy support:     Δarmed    = 0.03·q·stage·(1 − armed),        ΔS_regime = −0.003·armed
recognition:       once civic += 0.10·R, G −= 0.05·R;  weekly Δcivic = 0.003·R·(1 − civic),
                   ΔK = −0.001·(1 − 2P) (sanctions on pay, cancelled by a patron at P ≥ 0.5),  ΔS = −0.001
air support:       Δarmed    = 0.04·a·(1 − armed),              ΔK = −0.02·a
decapitation:      p_success = clamp01( 0.9·cov − 0.3·counterIntel_t − 0.2·militaryTier_t/5 ); on success H −= 0.15
```

`m, q, a` are the operation's scale (0.5 low, 1 standard, 1.5 high). `cov ∈ [0,1]` is current collection on the target from `intelligence.ts` (planning: 0.6 with a current tasking, 0.2 without). `stage` is 1 with a shared border or base, 0.5 through a partner, 0 otherwise. `R` is the recognizing coalition's share of world GDP excluding the target, read from the trade data (planning until the coalition itself is modeled).

Repression: each week the regime may answer a contender above 0.4 by repression (existing domestic-coercion pattern for NPCs): that contender loses 0.03·K, regime legitimacy −0.005, and the sponsor's exposure hazard doubles for the week.

### 4.5 Exposure (covert acts only)

```
e_week = 0.006 · footprint · (0.5 + counterIntel_t) · (1.5 − counterIntel_actor)
footprint: political 0.5, coup 1, proxy 2 (and ×scale)
```

Fact, computed: US coup support against Haiti (counter-intel 0.27; US 0.85) gives about 0.0030 a week, 14.5% within 52 weeks; against Cuba (0.80) 23.2%. A standard proxy program against Venezuela (0.35) gives about 0.0066 a week, 29.5% within a year and 50% within two (inference from the formula). This meets "most failed to remain covert" over a multi-year program and keeps a short coup quiet more often than not. On exposure: the existing `covert-failure` origin is generalized to `covert-exposed` (integrity), the target's grudge (weight 0.6), the coercion ripples to third parties at `INSTRUMENT_COERCION.covert`, and an intelligence-committee inquiry if the act was unfounded or notification withheld.

### 4.6 Successor alignment and its decay

```
a_successor(0) = alignment of the winning contender toward the sponsor
                 (sponsor-built: +0.6; recognized civic: +0.4; unsponsored: half the old government's)
a(t) = a_base + (a(0) − a_base) · 2^(−t/104)        half-life two years
```

**Inference** from O'Rourke: installed regimes were no more likely to vote with the US or avoid disputes over a decade. O'Rourke gives no half-life; the two-year half-life is a design choice consistent with that finding (correction, REGIME-VERIFY D6), and it reproduces (an 8% residue after 7.3 years). The fitted half-life is a calibration target (§9 C5), not a fact.

Failure of an operation that ends without a fall: target grudge 0.6, alignment toward the sponsor −0.15, and the NPC agent's grudge term raises the target's coercion propensity against the sponsor (O'Rourke: survivors considerably more likely to dispute and diverge).

### 4.7 After the fall

```
G' (successor legitimacy) = coup 0.25 + 0.2·civic;  recognized civic 0.45 + 0.3·civic;
                            decapitation G_old − 0.05;  imposed by occupation 0.15 + 0.35·Q
Q (preconditions)         = 0.4·(wealthTier − 1)/4 + 0.3·(1 − F) + 0.3·[regime was a democracy]
P(consolidated democracy within 10 years) = 0.17 + 0.59·Q
P10(civil war)            = clamp(0.05, 0.7, 0.10 + 0.35·D + 0.25·F + 0.2·(1 − G'))
h_cw (weekly)             = −ln(1 − P10)/520
```

`D` is 1 when the old security forces are disbanded or left outside the new order, 0.2 otherwise. The democracy line is fitted to the correspondence table's two ends (0.17 at Q = 0, 0.76 at Q = 1). The civil-war line must average about 10/39 = 0.26 across the falls a 12-seed run produces (§9 C4). A civil war is a conflict on the board between the successor and the strongest losing contender, using the existing war tick.

Refugee outflow while violence lasts (planning, fitted to Venezuela's 4.8M by December 2019, CRS): `outflow_week = 0.0008 · pop · max(I, crisis)` where `crisis` is the economic-collapse reading (growth below −0.1). This writes `netMigration` on the target and the importer side through the existing demography path; the US share reaches immigration content.

### 4.8 Occupation

When an invasion ends in the defender's collapse, the war settles and an occupation opens:

```
T     = 9,000 · B            troops, B brigade-equivalents committed (repo anchor: CRS R40682 counts 9,000 to a brigade with support)
T*    = 0.004 · pop          planning force requirement
Gr    = 0.4·(1 − G') + 0.3·D + 0.3·F
I'    = clamp01( I + 0.03·Gr·(1 − I) − 0.02·(T/T*)·I ),   I(0) = 0.15
G''   = clamp01( G' + 0.0015·(1 − I) − 0.001·I )
US deaths per week = μ · I · T/1000,                         μ = 0.1446 (fitted, below)
cost per week      = B · brigade-year / 52                   brigade-year $7,200M FY2008 (repo anchor) = $11,091M in 2026 dollars by the repo's CPI rows
```

**Fact, computed (`calc-regime.mjs`).** With the dataset's Iraq row and a plan of 17 brigade-equivalents for four years, 20 in year five, then 15, 10 and 5, the fitted μ = 0.1446 reproduces 4,418 US deaths by week 388 (the OIF span). Cost over the first eight years is $1,308.7B in 2026 dollars. **Inference:** the FY2007 peak of $142.1B divided by the $7.2B brigade-year gives about 19.7 brigade-equivalents, so a 17–20 plan is the right order; the $806B appropriated through FY2011 is nominal and is not directly comparable to the 2026-dollar sum.

Dollars: the occupation's cost replaces `WAR_OUTLAYS.aggressor` for this conflict in `warOutlayShare` (one path per cause), so it reaches deficits, debt and the macro model, not a second treasury line. The binding limits for the player are brigades (the commitment ledger), readiness drawn by rotation, and the casualty stream.

R7 fix (prerequisite): `engagedPersonnel` for a principal becomes the committed package's personnel when the principal has one (the US and any NPC that committed formations), and the current active-force share only for a defender fighting at home.

### 4.9 Markets

No new market code. The target's own export loss enters the existing kernel through the producer-output term `warShocks` already uses, for the weeks a war or a civil war lasts, and through the smaller maritime change's export cut when a blockade is part of the pressure (§11.1). Calibration point: Libya lost 1.5 Mb/d of exports and Brent rose $15 from 18 February to 2 March 2011 (EIA); an equivalent fall of a mid-size exporter in a 12-seed run should move the crude index by +10% to +25% within four weeks.

### 4.10 Approval and the Record

No direct approval write. Each consequence reaches the President through an existing judgment, per the approval VERIFY's cheaper path:
- war, occupation and civil war → `warOpinionTerms` (rally, unease, casualties) and the `atWar` salience. A war the President starts should not rally at the full `RALLY_PEAK` (VERIFY item 11; owner question Q4);
- exposure → integrity, via the scandal;
- a failed operation → competence, via the existing failure record;
- oil → prosperity, via the pump;
- refugees → content (no opinion term).

The Record names each operation, its finding (or its absence), each week's contender reading, the fall, the successor and the aftermath, and keeps the forecast shown at authorization beside what happened (DECISIONS §7.11).

---

## 5. Per-target option derivation

`regimeOptions(campaign, actor, target)` returns every act as a row, eligible or refused with a reason. Nothing is authored per nation.

| Input (existing data unless marked) | Opens or shapes |
|---|---|
| target `partySystem.contest`, an opposition-leader person | political action, recognition (needs a named person to recognize) |
| armed rivals (`armedRival` pool), `REGIME_PRONENESS`, collection on the target | coup support and its odds |
| `insurgencyPressure`, an insurgency operator, shared borders, `basesAbroad`, neighbors' alignment | proxy support, staging, and the staging partner's ripple |
| actor diplomatic reach, the recognizing coalition (allies' alignment toward the contenders) | recognition's size R |
| strike reach (existing), collection, target counter-intel and military tier | decapitation |
| armed contender ≥ 0.2, strike reach, UNSC members' alignment (a veto from a patron among the five) | air support and its legal basis |
| invasion gates with reach from bases and staging partners (R6), target population for T* | invasion and the occupation the row forecasts |
| target `arsenal.warheads > 0` | refusal of decapitation, air support and invasion; coup support and political action stay open |
| patron P and its own options | the counter-row the patron can take (support to the regime: hold +) |

Worked menus (fact, computed holds; recommendation for the rows):
- **Haiti** (H 0.35): every row. Coup support standard: 42% within 52 weeks.
- **Cuba** (H 0.593, one-party): political action and coup support open but slow: 10.4% within 52 weeks.
- **Iran** (H 0.547, patron China 0.413): covert rows only; invasion refused by data (no staging) unless a partner grants it; a fall weights the civic contender (0.5) over the military (0.112).
- **North Korea** (H 0.621, 30 warheads): political action and coup support only; both near zero.
- **Canada** (full democracy): rows exist and carry the alliance ripple that already prices them (VERIFY F11); the honest answer.

---

## 6. Worked examples (`probes/calc-regime.mjs`, expected values)

### 6.1 Coup support in a fragile state: Haiti

Start (dataset): S 0.37, G 0.30, F 0.46, K 0.369, patron Dominican Republic 0.053, **H 0.35**; contenders civic 0.52, armed 0.33, military 0.349; Φ0 0.49.

Standard coup support, collection current (cov 0.6):

| week | military s | Φ | added hazard / week | fallen by | exposed by |
|---|---|---|---|---|---|
| 4 | 0.418 | 0.511 | 0.0026 | 0.7% | 1.2% |
| 13 | 0.544 | 0.55 | 0.0071 | 5.2% | 3.8% |
| 26 | 0.668 | 0.589 | 0.0114 | 16.4% | 7.5% |
| 52 | 0.799 | 0.629 | 0.0155 | 41.9% | 14.5% |

Successor at a week-52 fall: military 0.627, civic 0.266, armed 0.107. The player sees: a 42% chance the government falls within a year, a 63% chance the successor is the officer the operation built (alignment +0.6, halfway back to the old baseline in two years), a 15% chance of exposure, a civil-war risk at the fall of `P10 = 0.10 + 0.35·D + 0.25·0.46 + 0.2·(1 − G')`, with G' = 0.25 + 0.2·0.52 = 0.354 and D = 0.2 (forces kept), so 0.10 + 0.07 + 0.115 + 0.129 = 0.414 over ten years. Cost: intel capability and a finding. The same operation against Guatemala (H 0.472) reaches 36.9% in a year; against Cuba 10.4%. **Inference:** spread across targets of this kind the result lands inside O'Rourke's 39% covert and "about half" for preventive and hegemonic cases, and the high-hold targets reproduce the offensive failures.

### 6.2 Recognizing an opposition and squeezing a regime: Venezuela

Start: S 0.35, G 0.30, F 0.55, K 0.368, patron Russia 0.217, **H 0.346**; civic 0.625, armed 0.25, military 0.36.

Recognition with R = 0.3 (planning: the 2019 coalition of 57 governments), with sanctions in force (existing economic rungs) and a patron holding the floor:

| week | H | civic s | Φ | added hazard / week | fallen by |
|---|---|---|---|---|---|
| 13 | 0.337 | 0.659 | 0.519 | 0.0025 | 2.7% |
| 26 | 0.332 | 0.663 | 0.52 | 0.0033 | 6.3% |
| 52 | 0.32 | 0.671 | 0.523 | 0.0050 | 16.0% |

That is the 2019–2025 record: a recognized opposition, a squeezed economy, a regime that does not fall while its security forces hold and a patron pays. The forecast also shows sanctions' own cost on Venezuela's growth and the migrant outflow (§4.7).

Decapitation from that state (collection 0.7, counter-intel 0.35, military tier 2): `p_success = 0.9·0.7 − 0.3·0.35 − 0.2·0.4 = 0.445`. On success the charter's successor (the vice president) is seated; hold falls to 0.17; with standing leverage L = 0.6 (naval presence and sanctions held), the successor's alignment shifts toward the US by `0.5·L·(1 − H) = +0.25`. That is the 2026 shape: the regime's own next figure, cooperating under pressure, not the recognized opposition. The deal the US then signs is content (a scenario family keyed on `decapitation` aftermath), not an engine write.

### 6.3 An Iraq-style invasion and its following years

The conventional phase runs on the existing war tick, with R7 fixed so US losses come from the committed corps, not the whole Army. The occupation, on the dataset's Iraq row (pop 44M, F 0.75, Q 0.175, G' = 0.211, T* = 176,000), security forces disbanded:

| year | brigades | troops | insurgency | successor legitimacy | US deaths, cumulative | cost, cumulative ($B, 2026) |
|---|---|---|---|---|---|---|
| 1 | 17 | 153,000 | 0.544 | 0.235 | 483 | 188.5 |
| 2 | 17 | 153,000 | 0.584 | 0.238 | 1,140 | 377.1 |
| 3 | 17 | 153,000 | 0.588 | 0.240 | 1,815 | 565.6 |
| 4 | 17 | 153,000 | 0.588 | 0.242 | 2,492 | 754.2 |
| 5 | 20 | 180,000 | 0.552 | 0.246 | 3,254 | 976.0 |
| 6 | 15 | 135,000 | 0.610 | 0.248 | 3,854 | 1,142.4 |
| 7 | 10 | 90,000 | 0.693 | 0.239 | 4,303 | 1,253.3 |
| 8 | 5 | 45,000 | 0.802 | 0.218 | 4,561 | 1,308.7 |

Keeping the old army in the new order (D = 0.2) ends year 8 at insurgency 0.711, legitimacy 0.313 and 3,842 deaths. The withdrawal years show the steep part the owner asked for: insurgency climbs as troops leave, which is the setup for a civil-war hazard (§4.7) and a later return. **Limitation (inference):** the curve is flat through the surge; it does not reproduce the 2007–2008 fall in violence, which needs a co-option act (paying a contender to switch sides) that this design leaves for a later slice. Iraq is the fit; Afghanistan (2,443 US deaths over 20 years, SIGAR) is the out-of-sample check (§9 C6).

---

## 7. NPC symmetry

Every act is actor-agnostic and enters `everyRequest` (`npc-agent.ts:341`) as derived rows, so Russia can back a coup in a neighbor, Iran can run a proxy, and a rival can recognize an opposition against a US partner. The US side gets the answers: **support to a threatened government** (a new assistance row: hold +0.05·scale, security cohesion +, sourced from the existing stabilization package), counter-intelligence collection (raises the sponsor's exposure), and warning the sponsor (diplomatic). A US partner's fall to a rival-sponsored contender arrives as a hard attention stop with the forecast that preceded it.

Tempo controls, required before ship (VERIFY point 4): the cooldown and caps in §4.3; NPC propensity multiplied by `(1 − legalism)` as the covert scruple already is (`npc-agent.ts:201-206`); and a harness band (§9 N1).

---

## 8. Player surface

Following DECISIONS §8.9 and the results-list rule (rows with drawn readings, expand for detail, a **wait** baseline, no option-column tables), on the target's page, a **Government** section:

- **Hold gauge** for the regime, with its five parts as a stacked bar (stability, legitimacy, security forces, elite cohesion, patron), and the three contenders as meters with their faces (the officer, the opposition leader, the armed movement's leader) and their alignment toward the US.
- **Options as a results list.** Each row draws: chance of a fall within 13, 52 and 104 weeks (a dial with the staff forecast's band, §7.11); who would most likely take power (face, alignment arrow); chance of exposure; what it spends (intel capability weeks, brigades, readiness, munitions); legal path (finding, War Powers, authorization) as a chip; aftermath risk (civil war, refugees, insurgency) as readings. The wait row shows the world's own odds. Refused rows stay listed with the reason ("No current collection on Cuba"; "Nuclear-armed").
- **Terms** on expand: scale, finding text and notification tier (existing), coalition and partners, an end condition, rules for the decapitation (capture or kill).
- **Standing operation** in the Record and on the Security page: weeks running, contender readings, exposure risk this week, one-verb lift.
- **Occupation** page (a map where geography answers the question, §8.8): insurgency by region as a lens, brigades, the casualty stream, cost to date, the successor's legitimacy, and the withdrawal schedule as a row the player sets.

---

## 9. Build plan

Ordered slices; each lands with its tests. No slice starts before the prerequisites.

**Prerequisites (defects today).**
- **S0a R7 casualties.** `engagedPersonnel` reads the committed package. Test: a US invasion of Venezuela on the sized package loses under 2,000 US killed in the conventional phase across 12 seeds; Panama-scale (≈27,000 troops) under 100.
- **S0b R9 war outlay.** `warOutlayShare` for a principal with a committed package uses the package's brigade-year cost. Test: a Grenada-scale war bills under 0.05% of US GDP; Iraq-scale lands within 20% of the brigade-year sum.
- **S0c NPC tempo.** The per-pair cooldown that VERIFY asks for on blockades, generalized to every coercive rung.

**Slices.**
1. **Data and readings.** `regime-dials.ts`, `hold`, contenders and Φ as pure readings; the `stat-consumers.ts` entries for every field read (corruption, doctrineQuality, protestPressure, insurgencyPressure). Test: the holds in §4.1 to three decimals on the founded board.
2. **The contest hazard.** The `contest` term in `coupTerms` with founding subtraction; the fall kinds; successors from contenders; relationship deltas with decay. Tests: with no operations, a 12-seed passive term sees the same coups per term as today (±10%); the hazard is zero at founding for every nation.
3. **Covert acts** (political action, coup support, proxy) replacing covert rungs 4–5, with findings, exposure and the generalized scandal origin. Delete the GDP-share covert price; price in capability weeks.
4. **Recognition and pressure**, the regime-support counter-row, and the patron term.
5. **Decapitation and air support** on the existing strike path.
6. **Occupation** after a collapse, re-based outlay, civil-war hazard, refugees. Reach from basing (R6).
7. **NPC enumeration** of the derived rows, with caps.
8. **player-core view models, then the Government section and occupation page.**

**Calibration tests in the harness (12 seeds, scripted proxies).**
- C1 covert success: coup support at standard scale against governments with H < 0.45 falls them within 104 weeks in 30%–55% of runs; against H > 0.55, under 15% (O'Rourke: 39% overall; about half for preventive and hegemonic; 0 of the first 18 offensive).
- C2 exposure: proxy programs running 104 weeks are exposed in 40%–70% of runs (most failed to stay covert).
- C3 Bay of Pigs: a proxy or coup operation against H > 0.55 that ends in failure leaves hold higher and the target's alignment toward a rival patron higher than control.
- C4 aftermath: across all falls produced, civil war within 10 years (or the campaign's end, scaled) in 15%–35% (10 of 39); consolidated democracy rates fall within the correspondence table's 0.17–0.76 by Q.
- C5 alignment: installed regimes' alignment toward the sponsor is within 0.1 of control by week 312.
- C6 occupation: an Iraq plan lands at 3,500–5,500 US deaths by week 388 and $1.0T–$1.6T (2026 dollars) by year 8; an Afghanistan-sized plan on the Afghan row lands within a factor of 1.5 of 2,443 deaths over 20 years, extrapolated from the 8-year run.
- C7 recognition: recognition and sanctions against a patron-backed regime with K > 0.35 fall it in under 20% of runs within 52 weeks (Venezuela 2019).
- C8 Libya market: a fall with civil war in a producer with ≥ 1% of world crude moves the index +10% to +25% within four weeks.
- N1 NPC tempo: NPC-started regime operations per 208-week term between 1 and 6 worldwide (owner sets the band, Q3); no target faces more than one at a time.
- A1 approval: no file in the regime family emits `kind: "opinion"`; a gate greps for it.

---

## 10. Doc-sync surfaces (blocking)

- **World schema:** none required; every input is an existing field. The `stat-consumers.ts` registry gains the new readers.
- **Engine contract:** `Campaign.regimes`; new effect kinds (`regimeOperation`, `contender`, `occupation`); `LeadershipChange.kind` gains `overthrow`, `imposed`, `decapitation`; `ResolutionRequest` gains `regime: { act, scale, terms }`; `ActionProjection` gains `fall` (13/52/104-week odds), `successor`, `exposure`; `AttentionStop` gains a partner-at-risk stop and a fall stop; `coupTerms` gains `contest`; save version bump, no migration of old covert flags.
- **Docs:** `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change; `docs/DECISIONS.md` gains a rule ("a change of government abroad is a contest over hold; the sponsor builds contenders, never writes a seat") and amends §6.8 so covert acts are priced in capability, not money; `docs/DESIGN.md` gains the Government section and the occupation page; `CONTENT_DOCTRINE.md` gains the regime-change flags content may read.

---

## 11. Interactions

### 11.1 With the coercion redesign and its VERIFY

- Build on VERIFY's **smaller change** (blockade as hostilities; an export cut that ends with the blockade; route shocks for every chokepoint; weights carried). A blockade becomes one of the pressures in recognition-and-pressure without new code: its export cut bites the regime's revenue, which this design reads only through stability and security-force pay.
- **No dollar repricing** of anything here; the occupation re-bases `warOutlayShare` instead of adding to it, which is VERIFY item 10's rule.
- **NPC tempo** is a shared prerequisite (S0c).
- The war a regime-change act opens uses the same route-shock and kernel chain VERIFY shows working (`twice.mjs`).

### 11.2 With the approval redesign and its VERIFY

That VERIFY replaced the bloc model with six cheaper fixes. This design adds no mood writer, so it depends on: fix 4 (drags become target terms, a weekly mood budget), so an occupation's casualties and a scandal in the same month don't stack; and on the rally decision for self-started wars (VERIFY item 11 of the coercion check; Q4 here). Casualties reach approval through `warOpinionTerms`, not a new term.

### 11.3 With BL-142

BL-142 does not cover foreign policy. Its isolation, double-billing and symmetry gates apply unchanged: one owning system per cause (the occupation owns its casualties; content may not re-bill them). If the owner later wants interventionism as a contested issue, it enters as an `IssueDef` after BL-142's phase 1.

---

## 12. Scale and content

- **Compute.** Hold and Φ are readings over existing stats; the contest term adds one reading per nation per week only where a record exists. 195 nations × 416 weeks costs nothing measurable beside the existing coup check (inference).
- **Eight-year campaigns.** The decay half-life (two years), the 52-week cooldown and the occupation's multi-year curve are sized so one campaign can see an intervention, its aftermath and its reversal.
- **Content hooks**, all as deed flags the engine writes and content reads (DECISIONS §7.7): `covert-exposed:<target>` (the scandal family: leak, hearing, special counsel); `occupation:<target>:year-N` and `insurgency-rising:<target>` (quagmire family: a contractor scandal, a surge request, a governor's funeral); `decapitation:<target>` (the deal and the trial); `proxy-orphaned:<operator>` (the blowback family, years later); `recognized:<person>` (the exile government's asks). Volume: about five families at 20–40 scenarios each; content gates on the bands and flags, never on a nation id.

---

## 13. Strongest failure mode, best alternative, verdict

**Strongest failure mode.** The world churns. With 195 governments, a contest term in the coup hazard and NPCs that enumerate every derived row, governments fall every few weeks, half the board is in a fall's aftermath, and the President's term becomes a feed of coups that no decision caused. The fitted numbers make it worse: the 0.06 ceiling, the slope 8 and the threshold 0.15 were set on four rows, and the founding subtraction protects only the no-action case. A second risk: the calibration is fitted, not validated. The occupation curve reproduces Iraq's deaths by construction and misses the surge; the covert odds sit inside O'Rourke's band on three targets. And R7 means every war today is already wrong by two orders of magnitude, so any balance read before S0a is meaningless.

**Best alternative.** Keep the ladder and patch it: make covert rung 5 add a decaying term to the coup hazard and seat a sponsor-aligned successor; add a recognition rung on the diplomatic ladder; add an occupation flag after a decisive invasion victory that raises `insurgencyPressure`; fix R7. That is four small changes and gets "you can overthrow a government" into the game. It leaves the menu identical for every target (Canada and Haiti alike), no contenders and so no "who takes power" choice, no aftermath beyond a number, and a covert act that is still a coin flip.

**Verdict: needs validation.** Required before build:
1. S0a and S0b land first and are measured (casualties, outlay).
2. Calibration tests C1–C8 and N1 pass at 12 seeds with the dials as written or refitted; a refit is recorded in `regime-dials.ts` with the case it was fitted to.
3. The NPC tempo band (Q3) is set by the owner and enforced by the cooldown and caps.
4. The two VERIFY dependencies (the maritime smaller change, the approval mood budget) are in place, or this ships with recognition-and-pressure using only the existing economic rungs.

---

## 14. Owner questions

1. **Nuclear-armed targets.** Should coup support and political action against a nuclear power (North Korea, Russia, China) be offered at all, or refused as a matter of design?
2. **Assassination.** Decapitation as written offers capture or kill. The 1976 executive ban (from general knowledge, not opened here) is a rule a President can sign away. Should "kill" be offered, and with what legal path?
3. **NPC tempo.** How many NPC-started regime operations should a 208-week term see worldwide (a band, e.g. 1–6), and may a rival target a US treaty partner?
4. **Self-started wars and the rally.** Should a war the President starts rally the public at all, or only wars started against the US?
5. **Occupation control.** Should the player set the troop level each year (a row on the occupation page), or choose a strategy (light footprint, counterinsurgency, withdrawal by date) that sets it?
6. **The 2026 board.** Should the default founding carry Venezuela as it stands in October 2026 (an acting government under US naval pressure, a decapitation aftermath), or only the `world-2026` preset?

---

## 15. Sources opened this session

- 50 U.S.C. § 3093, Cornell LII. https://www.law.cornell.edu/uscode/text/50/3093
- H-Diplo/ISSF Roundtable 13-3 on O'Rourke, *Covert Regime Change*. https://issforum.org/roundtables/13-3
- Preble, "Covert Wars: To What End?", War on the Rocks, 2019. https://warontherocks.com/2019/08/covert-wars-to-what-end
- Nomikos; Downes and Monten, "Correspondence: Foreign-Imposed Regime Change", *International Security* 38:3 (2013/14), 184–195 (Yale-hosted PDF). https://politicalscience.yale.edu/sites/default/files/reevaluating_foreign-imposed_regime_change.pdf
- Senate Select Committee (Church), staff report, *Covert Action in Chile 1963–1973*, pp. 1–4. https://www.intelligence.senate.gov/sites/default/files/94chile.pdf
- National Security Archive EBB 4 (Guatemala). https://nsarchive2.gwu.edu/NSAEBB/NSAEBB4/
- National Security Archive EBB 435 (Iran 1953). https://nsarchive2.gwu.edu/NSAEBB/NSAEBB435/
- FRUS 1952–1954, Guatemala, editorial note (d1); FRUS Iran 1951–1954 2nd ed., preface. history.state.gov
- National Security Archive EBB 57 (Afghanistan). https://nsarchive2.gwu.edu/NSAEBB/NSAEBB57/us.html
- Office of the Historian, Bay of Pigs. https://history.state.gov/milestones/1961-1968/bay-of-pigs
- Office of the Historian, Central America 1981–1993. https://history.state.gov/milestones/1981-1988/central-america
- Defense News, 2015-09-21, Syria train-and-equip. https://www.defensenews.com/home/2015/09/21/was-syrian-train-and-equip-effort-always-a-mission-impossible/
- CRS IF10230, *Venezuela: Political Crisis and U.S. Policy*, 2020-01-30. https://www.everycrsreport.com/files/2020-01-30_IF10230_d8d85963d4b54a42aaf4899ec1bc1ae37aac1f66.html
- WDET (NPR), 2026-01-03, Maduro captured. https://wdet.org/2026/01/03/u-s-hit-venezuela-with-large-scale-strike-captured-nicolas-maduro/
- AP via PBS NewsHour, 2026-08-29/30, Venezuela oil deal. https://pbs.org/newshour/politics/what-we-know-about-trumps-deal-giving-u-s-access-to-vast-oil-reserves-in-venezuela
- army.mil, 2014, Operation Just Cause remembered. https://www.army.mil/article/139395
- National Museum of the Marine Corps, *Operation Urgent Fury* (PDF). https://usmcmuseum.com/uploads/6/0/3/6/60364049/operation_urgent_fury.pdf
- CRS RL32492, *American War and Military Operations Casualties*, 2020-07-29. https://www.everycrsreport.com/files/2020-07-29_RL32492_e7d48d4caf03cdd007922fe2dc0d50d2a5594721.html
- CRS RL33110, *The Cost of Iraq, Afghanistan, and Other GWOT Operations*, 2011-03-29. https://www.everycrsreport.com/files/20110329_RL33110_be1a00c99d668bee3b4ec4f6fc82e914f62c39f0.html
- SIGAR 21-46-LL, *What We Need to Learn* (govinfo copy). https://www.govinfo.gov/content/pkg/GOVPUB-S-PURL-gpo159506/pdf/GOVPUB-S-PURL-gpo159506.pdf
- *The Report of the Iraq Inquiry: Executive Summary*, HC 264, 2016. https://assets.publishing.service.gov.uk/media/5a80f42ced915d74e6231626/The_Report_of_the_Iraq_Inquiry_-_Executive_Summary.pdf
- CRS RL33142, *Libya: Transition and U.S. Policy*, 2011-10-25 (search summary of the opened page) and 2015-08-03. everycrsreport.com
- Air & Space Forces Magazine, 2011-06-03, Libya costs and sorties. https://www.airandspaceforces.com/?p=26911
- EIA, *Today in Energy* 4550 (2011 Brent brief). https://www.eia.gov/todayinenergy/detail.php?id=4550
- Repository anchors cited, not reopened: `brigade-year-in-theater` (CRS R40682) and the CPI rows in `packages/world/src/dataset/force-cost-anchors.ts`.

Used only as orientation, not relied on: search summaries of Afghan program totals, the CRS 2020-06 Guaidó raid note, Panama civilian estimates, Syria refugee counts, and per-troop cost studies (CSBA, 403).

## 16. Probe commands

From the repository root, against committed `dist/`. They change nothing.

```bash
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-menu.mjs regime-0
node docs/audits/2026-10-12-coercion-geography/probes/probe-coup-pool.mjs regime-0
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-1 HTI covert 5 10 0
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-1 HTI covert 5 104 13
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-0 VEN covert 5 52 0
node docs/audits/2026-10-12-coercion-geography/probes/probe-regime-run.mjs regime-2 VEN military 5 104 0
node docs/audits/2026-10-12-coercion-geography/probes/probe-npc-regime.mjs regime-0 104
node docs/audits/2026-10-12-coercion-geography/probes/calc-regime.mjs
```
