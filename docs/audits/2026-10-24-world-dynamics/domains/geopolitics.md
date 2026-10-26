# Geopolitics and NPC-to-NPC behavior: controls, breaks, fixes

Audit date: 2026-10-24. Probe: `packages/engine/src/__probes__/geopolitics.probe.test.ts`, run with
`cd packages/engine && npx vitest run src/__probes__/geopolitics.probe.test.ts`.
Last run: 22 tests, 11 failed (each a reproduced break), 11 passed (held controls, report-only
probes and two diagnostics). No other source file was edited; no build, typecheck, lint, full
suite or balance run was made.

## Summary

The alliance layer is the strongest part of this domain. A Russian invasion of Estonia draws 7 to
12 NATO governments in with forces inside four weeks, nobody joins the aggressor, and in the
carried 2026 world no NATO member enters the war in Ukraine over a year. Coups (2.6 a year) and
foreign elections (45 a year) sit inside the real range.

The breaks sit around that layer:

1. **The world barely starts wars and stages border clashes like a timer.** It opens 0.125
   interstate wars a year against a UCDP record of 2 to 4 active interstate conflicts a year. At
   the same time it fires about 75 border clashes a year on a fixed 12-week cycle, about 31 of
   them in two years on NATO's border with Russia, and none of them ever escalates.
2. **A great power does not answer the President.** China, hit with US targeted sanctions, made
   no move against the United States in 8 weeks across 3 seeds. Its best-scored move each week
   was military pressure on Russia, its closest partner.
3. **Sanctions and deterrence refuse what the real record shows.** The United States cannot
   sanction Iran, North Korea, Cuba, Belarus or Nicaragua, all of which have OFAC programs.
   India cannot strike Pakistan, which it did in May 2025. Israel's arsenal reads as zero.
4. **Two institutions are missing.** The UN Security Council and its P5 veto aren't modeled, and
   neither is the SCO.

## Sources opened in this session

| Ref | Source | Used for |
|---|---|---|
| S1 | North Atlantic Treaty, Articles 5 and 6 (nato.int, official text) https://www.nato.int/cps/en/natohq/official_texts_17120.htm | Article 5 response language; Article 6 treaty area (Europe, North America, Turkey, North Atlantic islands north of the Tropic of Cancer) |
| S2 | UN Charter, Chapter V, Article 27(3) https://www.un.org/en/about-us/un-charter/chapter-5 | Nine votes including concurring votes of the permanent members |
| S3 | Davies et al., "Organized violence 1989-2024", Journal of Peace Research 62(4), 2025 https://academic.oup.com/jpr/article/62/4/1223/8324565 | 4 interstate conflicts in 2024, 2 in 2023; 22 interstate conflict-years in the last decade |
| S4 | VOA, "By The Numbers: Coups in Africa" (Powell and Thyne data, as of October 2023) https://projects.voanews.com/african-coups/ | 492 attempted or successful coups worldwide since 1950 (about 6.6 a year); 4 successful in Africa in 2021 |
| S5 | US Treasury OFAC, Sanctions Programs and Country Information (read 2026-10-24) https://ofac.treasury.gov/sanctions-programs-and-country-information | Active programs for Belarus, Cuba, Iran, Nicaragua, North Korea, Venezuela, Russia and others |
| S6 | Al Jazeera, "Why did India strike Pakistan? All we know about Operation Sindoor", 2025-05-07 https://www.aljazeera.com/news/2025/5/7/why-did-india-strike-pakistan-all-we-know-about-operation-sindoor | India struck sites inside Pakistan; Pakistan said it was replying |
| S7 | SIPRI Yearbook 2025 press release https://www.sipri.org/media/press-release/2025/nuclear-risks-grow-new-arms-race-looms-new-sipri-yearbook-out-now | Israel does not acknowledge its arsenal and is modernizing it. The press page gives no per-country count; the roughly 90-warhead figure comes from secondary coverage and is **unverified** here |

**Unverified in this session** (searched, but no primary page opened): the Galwan clash of
June 2020 (20 Indian and 4 Chinese dead, news reports only); North Korean troops fighting beside
Russia in 2024; China's same-week tariff retaliation in 2018; national election counts for 2024
(IFES returned 403); the MID base rate (about 12 a year averaged over 1816 to 2014, from search
snippets only); Armenia's 2022 request to the CSTO.

## Controls

Status: **held**, **partial**, **missing** or **contradicted**.

| Id | Control (realistic rule) | Benchmark | Engine status | Evidence |
|---|---|---|---|---|
| G1 | Collective defense: an attack on a party in the treaty area brings partners in, with discretion ("such action as it deems necessary") | S1 Art. 5 | held | `war-join.ts:176-183` `owedTo`, `compacts.ts:354-376`. Probe B: RUS->EST drew 12, 7 and 11 NATO joiners in 4 weeks (3 seeds) and 0 on the aggressor side |
| G2 | A defense treaty never obliges joining an ally's attack | S1 Art. 5 is defensive | held | `compacts.ts:366-376` (`victimRegion` only for the victim) |
| G3 | Treaty area limits (Art. 6: Europe, North America, Turkey, North Atlantic islands north of the Tropic of Cancer) | S1 Art. 6 | partial | NATO is `parties-territory` everywhere (`packages/world/src/dataset/orgs-cradles.ts:89`). Nation-level geography can't hold an overseas department, so a French Pacific territory would read as covered |
| G4 | Restraint toward an ongoing great-power proxy war (no NATO forces in Ukraine) | 2022 to 2026 record (no source opened) | held | Probe B: world-2026 preset, one year, `joined.defender = []` |
| G5 | Co-belligerents that do join on the aggressor's side (DPRK beside Russia) | Unverified | missing | Same probe: `joined.aggressor = []` |
| G6 | UNSC: substantive resolutions need nine votes and no P5 veto; sanctions and force mandates run through it | S2 Art. 27(3) | missing | No UN body in `organizations` (probe E). The only UN reference is GA Res. 3314 in a comment (`congress.ts:235`) |
| G7 | SCO beside the CSTO as the Eurasian security bodies | Owner list | missing | `orgs-cradles.ts` holds 15 bodies and no SCO (probe E) |
| G8 | Interstate war onset at the UCDP rate (2 to 4 active interstate conflicts a year in 2023 and 2024) | S3 | contradicted | Probe A: 1 onset in 8 seed-years (0.125 a year). Caps: `coercion-tempo.ts:21` (8 acts of force a term, 26-week pair rest); `conflicts.ts:261` (a strike opens a war only on a second act of force) |
| G9 | Wars end through exhaustion, settlement or decision | COW/UCDP duration data (not opened) | partial | `war-tick.ts:100-116`, `peace.ts:438`. Only one NPC war in the sample (it ended), so the duration distribution isn't measured |
| G10 | Border clashes are bursty, cluster in crises, and sometimes escalate | Galwan 2020 (unverified); MID record (unverified) | contradicted | `world-events.ts:110-160`, `world-event-templates.ts:83-84` (threshold 0.55, cooldown 12). Probe A3: IND-PAK, RUS-UKR and ARM-AZE each clash 9 times at a fixed 12-week gap. About 75 clashes a year, none of them opens a war |
| G11 | An armed clash with a NATO member is an alliance event (Art. 4 consultations at least) | S1 | contradicted | Probe A3: 63 clash entries (both edges, so about 31 clashes) between Russia and POL, EST, LVA, LTU, FIN and NOR in two years, with no alliance consequence |
| G12 | Coups at the Powell and Thyne rate (about 6.6 attempts a year since 1950, recent years 2 to 6 successes) | S4 | held | `foreign-politics.ts:237-250`. Probe A: 2.6 successful coups a year (21 in 8 seed-years). Failed attempts aren't recorded |
| G13 | Foreign elections on each country's calendar | IFES (not opened) | held | `foreign-politics.ts:84-196`. Probe A: 44.6 elections a year |
| G14 | Foreign-sponsored regime operations happen, rarely | DECISIONS §6.15 (owner band of 1 to 6 a term) | held, with a skew | `regime-npc.ts:27-83`. The target list drops every state with any warhead (`regime-npc.ts:52`), including PRK, which has no deliverable triad. Only the single most hostile pair is tried each week |
| G15 | Sanctions between third parties | S5 shows the US alone runs about 20 country programs | held | Probe A: 6.25 NPC-to-NPC economic acts at rung 3 or higher a year; EU packages via `world-events.ts` (sanctions-package) |
| G16 | A government can sanction any state its law designates; designations need no bilateral trade | S5 | contradicted | `instruments-economic.ts:73-76` (`tradeAccess` reads the actor's own `tradeDependence[target] > 0`). The US table rounds to 4 decimals, so 117 of 195 states have no channel. Probe D0: IRN, PRK, CUB, BLR and NIC refused |
| G17 | Nuclear deterrence: no full war between nuclear states | Nuclear-era record | held | Probe A: 0 wars between nuclear-armed pairs |
| G18 | Stability-instability paradox: limited force between nuclear dyads happens (Kargil, Galwan, Balakot, Sindoor) | S6 | contradicted | `instrument-gates.ts:202-205` (`outsideNuclearDeterrence`) refuses every rung-3 to 5 act against a triad holder, and the dataset gives PAK and IND `deliveryTriad: true` (`nations.ts:910,941`). Probe C: IND->PAK limited strike refused. World-event clashes do still fire between nuclear pairs (9 to 17 per 2 years) |
| G19 | Undeclared arsenals still deter | S7 | contradicted | `nations.ts:1101` gives ISR `warheads: 0, declared: false`. Probe C: Israel reads as non-nuclear, so attackers get no deterrence drag (`resolution.ts:338-344`) |
| G20 | `deliveryTriad` means a triad | Public force structures (UK is submarine-only; Pakistan has no SSBN; unverified here) | partial | GBR, FRA and PAK are marked `deliveryTriad: true` (`nations.ts:941,1488,1522`). The field is used as "can deliver", so the label misleads data authors |
| G21 | Graduated, in-kind answer to the President by a capable actor (China answered US tariffs within days in 2018, unverified) | Reciprocity in trade disputes | contradicted | Probe D: 0 answers by CHN in 8 weeks (3 of 3 seeds) and in 12 weeks (3 of 3). `npc-agent.ts:293-322` has no reciprocity term; only authored red lines (`redLinePull`) answer an act |
| G22 | Actor-appropriate scaling of answers (CHN vs a small state) | Same | not measurable | Probe D: both CHN and HND gave 0 answers, so the comparison is empty. Breaks G21 and G16 hide it |
| G23 | Coercion aims at rivals, not at strategic partners | Alliance record | contradicted | `npc-agent.ts:166-187,242-252`. Probe A2: 8 of 47 NPC military rung-2+ acts (17%) were CHN->RUS, at alignment >= 0.5. The diagnostic shows CHN's top candidate after US sanctions is RUS military 2 (score 2.449) over USA economic 2 (1.980) |
| G24 | Hedgers keep ties to both poles | Reviewer judgment; no source opened | partial | Probe B2 passes: no hedger edge moved more than 0.3 in a war year (the edges barely move at all). The authored starting points don't read as hedging: TUR->RUS alignment -0.758, SAU->CHN -0.289, IND->USA -0.206 |
| G25 | The world's attention isn't rationed below the number of governments wanting to act | Legibility vs realism | contradicted (a design choice) | `npc-turn.ts:41` (`MAX_NPC_ACTIONS_PER_TURN = 3`). Probe A: the cap bound in 104 of 104 weeks in all 4 seeds, about 129 world acts a year for 195 governments. In the China trace, CHN got 1 slot in 8 weeks |
| G26 | Distance and reach limit who can fight where | DECISIONS §6.12 | held | `war-entry.ts:72-90` (`joinCapability`), used by `war-join.ts:256` |
| G27 | Removal and nuclear red lines are answered at the named rung | Authored doctrine | held | Existing `red-lines.test.ts` (Iran answers a strike at rung 4 or higher) |

## Breaks

Numbers are from the last run of the probe file.

### GEO-1 Interstate wars almost never start (high, reproduced)
- **Expected:** 0.5 to 4 NPC-to-NPC war onsets a year, in line with S3's 2 to 4 active interstate
  conflicts a year.
- **Observed:** 1 onset in 4 seeds by 104 weeks (`npcWarOnsets` 0, 0, 0, 1), so 0.125 a year.
- **Mechanism:** `coercion-tempo.ts:21` caps acts of force at 8 a term with a 26-week pair rest.
  `conflicts.ts:261` opens a war on a strike only after a second act of force inside the window.
  The border-clash path (`world-events.ts:110-160`) never links to `openConflict`.
- **Fix:** add an escalation hazard from clashes to war. Each clash adds to a pair's crisis stock,
  and a decaying stock gives a small weekly war-onset hazard calibrated to UCDP onset. Then retune
  the tempo cap against that rate instead of using it as the brake. **opus** (engine and
  integration; the balance harness has to be rerun). Depends on GEO-2.

### GEO-2 Border clashes run on a 12-week timer and never escalate (high, reproduced)
- **Expected:** bursty clashes, rare on NATO's eastern flank, sometimes escalating.
- **Observed:** IND-PAK, RUS-UKR and ARM-AZE each clash 9 times with one gap, 12 weeks. About 75
  clashes a year worldwide. 63 entries (about 31 clashes) on Russia's borders with six NATO
  members in two years, with no alliance response.
- **Mechanism:** `world-events.ts:144-160` uses a persistent willingness. Once a hostile dyad
  clears 0.55 it clears again the moment the 12-week cooldown (`world-event-templates.ts:84`)
  lapses. Each clash raises tension (`world-events.ts:129-140`), which keeps it above the bar.
  Nothing reads a NATO member as a special subject.
- **Fix:** turn the clash into a weekly Poisson hazard keyed on the week, scaled by tension and
  driven by crisis episodes, with a longer rest after each clash. Damp it where the subject is
  under a defense body with the aggressor's opponent (Article 4 deterrence), and fire an
  alliance consultation event when it does happen. **sonnet** (scoped to `world-events.ts` and
  the template table).

### GEO-3 The US cannot sanction the countries it actually sanctions (critical, reproduced)
- **Expected:** targeted sanctions offered against every OFAC program country (S5).
- **Observed:** refused for IRN, PRK, CUB, BLR and NIC with "a live trade channel with the
  target". 117 of 195 nations have no US trade channel in the dataset.
- **Mechanism:** `instruments-economic.ts:73-76` reads `actor.stats.trade.tradeDependence[target]`,
  and the US table drops partners below 0.0001 of output. The same gate applies to every
  government, so no NPC can sanction a small economy either.
- **Fix:** gate rungs 3 and 4 (targeted sanctions, asset freeze) on financial reach (the actor's
  currency or market share, or a designation authority) rather than bilateral trade. Keep the
  trade gate for tariffs and embargo. Store small dependences as an exact figure, not a rounded
  key. **codex** (self-contained gate change with a clear spec), with a **sonnet** follow-up on
  the dataset table.

### GEO-4 China does not answer US sanctions (high, reproduced)
- **Expected:** an in-kind economic answer within 8 weeks.
- **Observed:** 0 acts by CHN toward the US in 8 weeks (3 seeds) and in 12 weeks (3 seeds).
  CHN's best candidate every week was RUS military 2 (2.449 to 2.852). Its best US option was
  military 2 (2.060), then economic 2 (1.980). CHN got 1 of 24 actor slots in 8 weeks.
- **Mechanism:**
  1. `npc-agent.ts:293-322` has no reciprocity term: being sanctioned adds nothing to an answer
     against the sanctioner unless an authored red line covers it.
  2. `npc-agent.ts:262` `propensity` for economic action toward the US is 0.0013.
  3. `npc-turn.ts:41` caps the world at 3 actors a week, and the actor draw ignores who was just
     hit.
- **Fix:** add a reciprocity term to the scoring, raised by acts received from the target in a
  decaying window and weighted toward the same instrument and rung, and give a just-coerced
  government priority in the actor draw, the way `CAMPAIGN_PRIORITY` does for standing
  campaigns. **opus** (changes the core agent; balance and the npc-world probe must be rerun).

### GEO-5 Strategic partners are coerced (medium, reproduced)
- **Expected:** at most 10% of NPC military rung-2+ acts aimed at governments the actor reads as
  aligned at 0.5 or better.
- **Observed:** 8 of 47 (17%), all CHN->RUS military 2. CHN->RUS alignment is 0.655.
- **Mechanism:** `intentMatch` (`npc-agent.ts:176-187`) reads hostility through `disposition`,
  which gives a partner about 0.3 hostility, and alignment never brakes it. `salience`
  (`npc-agent.ts:242-252`) favors the bordering great power.
- **Fix:** add an alignment brake to `restraint`, scaled by the instrument's coercion level.
  **sonnet**.

### GEO-6 Force is refused between India and Pakistan (high, reproduced)
- **Expected:** a limited strike offered, priced with the deterrence drag (S6).
- **Observed:** refused: "missing a target without a declared nuclear arsenal it can deliver".
- **Mechanism:** `instrument-gates.ts:202-205` refuses every act of force against a declared
  triad holder, and `nations.ts:910,941` give IND and PAK the triad flag. DECISIONS §6.9 records
  this as an owner choice made because the engine has no outcome base for force against a nuclear
  power.
- **Fix:** allow rungs 3 and 4 between two nuclear states with a heavy drag and a bounded,
  no-invasion outcome (a stability-instability band), and keep the wall at rung 5 and against the
  President's opponents. This changes a recorded owner decision, so it needs an owner ruling
  first. **opus**.

### GEO-7 Israel reads as non-nuclear (medium, reproduced)
- **Expected:** an undeclared arsenal still deters.
- **Observed:** `{ warheads: 0, deliveryTriad: false, declared: false }`.
- **Mechanism:** `packages/world/src/dataset/nations.ts:1101`. The `declared` flag exists to hold
  opacity but is paired with zero warheads.
- **Fix:** author the estimated count (sourced and dated per DECISIONS §4.11) with
  `declared: false`. Rename or split `deliveryTriad` into a "can deliver" field so GBR, FRA and
  PAK aren't labeled with a triad they lack. **sonnet**, after a sourced estimate is opened.

### GEO-8 No UN Security Council or P5 veto (high, reproduced as missing)
- **Expected:** a body that takes resolutions on sanctions and force, nine votes and no P5 veto
  (S2 Art. 27(3)).
- **Observed:** no UN or UNSC id in `organizations`.
- **Mechanism:** not modeled.
- **Fix:** an architect pass first, on what a resolution does (legitimacy multiplier on odds,
  standing costs, coalition joins). Then implement a small vote model reading P5 alignment toward
  the sponsor, with the veto deciding. **opus** for the design; **codex** for the implementation
  once specified.

### GEO-9 No SCO (low, reproduced as missing)
- **Expected:** the SCO as a political body (no mutual-defense clause).
- **Observed:** absent.
- **Fix:** add it to `orgs-cradles.ts` with its members and a dated, sourced row as a political
  body. **sonnet**.

### GEO-10 The 3-actor cap binds every week (medium, reproduced)
- **Expected:** most governments that want to act in a week get to. If legibility needs a limit,
  the limit belongs on what reaches the feed, not on what happens.
- **Observed:** the cap bound in 104 of 104 weeks in every seed, and the world makes about 129
  acts a year.
- **Mechanism:** `npc-turn.ts:41,116`.
- **Fix:** split simulation from narration. Let every government that clears initiative act, and
  cap feed items instead. This touches pacing, the tempo ledger and balance. **opus**.

## Held controls worth keeping as regression probes

- Article 5 joins for Estonia (G1, G2).
- No NATO forces in Ukraine (G4).
- No war between nuclear-armed pairs (G17).
- Coup rate (G12) and election rate (G13).
- Third-party sanctions present (G15).

## What I did not check

- Hormuz and commodity price paths (another domain; the existing `commodity-hormuz.test.ts` was
  not rerun).
- The person-network influence path: whether influencing a well-connected person spreads further
  (another domain).
- War durations and how wars end: only one NPC war appeared in 8 seed-years, so there's no
  sample.
- Failed coup attempts, which the engine doesn't record.
- CSTO behavior when a member is attacked. Armenia is not on the CSTO roster in the dataset, and
  the 2022 precedent wasn't opened.
- Whether the US-Japan, US-Korea, US-Philippines and ANZUS treaties draw their partners in when
  the President's war is called (`compacts.ts` call path).
- The Article 6 overseas-territory edge cases beyond the scope note in G3.
- The NPC-to-NPC treaty and alliance formation rate. Accession events fire (11 to 18 membership
  changes in 2 years); I did not check them against a real accession rate.
- Rates with the player active rather than idle.
- Seed variance beyond 4 seeds (A) and 3 seeds (B, D). The balance harness was not run.
