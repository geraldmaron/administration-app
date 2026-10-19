# Contested issues across the three branches: plan (third pass)

Written 2026-10-12 against `codex/simulation-depth-completion` at `9c8dd8703`. Tracked as BL-142. Phase 0 (rules) landed: `DECISIONS.md` §13 and the accepted-not-built note in `CONTENT_DOCTRINE.md` §3. Phases 1 to 6 are not started. Owner decisions are in §13.

**Owner direction, in order:**
1. Every branch needs a deep pool to draw, cycle and decide from: executive orders, court cases, and policy to argue. It must include the polarizing issues (abortion, race, guns and others), modeled realistically.
2. *"I do not care about precedent. I want what is best for the application."* Existing rules and code patterns are inputs, not constraints.
3. *"Eventually there may be hundreds or even thousands of these things,"* drawn like the events and headlines that happen in other countries, such as terrorist attacks.
4. *"Consider the broader metric and impact system and interconnectedness to ensure scenario etc. generation properly and fully leverages this."*

**What each pass changed:**
- **The first pass** fixed the model: a cultural axis, a law of the land, backlash, and the adversarial findings.
- **The second** made contested issues world content at corpus scale.
- **This pass** makes them part of the whole simulation. The couplings that must always hold are engine rules. Content's reach widens so an item can move what the issue really moves. Generation is required to use those connections, and an audit enforces it.

---

## 1. Recommendation

Build contested issues as **three content layers over one shared issue state, wired into every system the issue really touches**:

1. **Issue state**: per issue, where the law stands federally, in the courts and in each state, and how hot the issue is right now.
2. **Occurrences** (thousands): what happens without asking the President, like headlines from abroad.
3. **Matters** (hundreds): decisions on the desk.
4. **Instruments** (hundreds): what the President can start.

All three layers are drawn by the existing director machinery and priced by engine tables, never by per-item numbers.

The interconnection has two halves:
- **Systemic couplings** are engine rules that run whether or not any content mentions them. Guns read the crime trend, immigration reads the labor market, a ruling moves state law and mobilization.
- **Authored reach**: each item declares its connections through a closed set of **levers**. Engine code turns the levers into real effects on Congress, people, the economy, services, states, foreign relations, the press and conditions.

Generation is handed each issue's connection map, and an audit refuses items that touch only their own issue.

---

## 2. What exists today (observed in source this session)

| Area | What exists | Gap for this work |
|---|---|---|
| Executive orders | 12, in code tables (`orders.ts:203`, `order-families.ts:36`). Sign, challenge, strike, rescind, and Congress can disapprove. | No social issues. No memoranda, enforcement priorities, pardons or inherited orders. |
| Courts | Nine justices, panels, district forums, recusal, vacancies, staged path (`state-judiciary.ts:21`). Nine matter kinds. | Every case comes from the President's own act. Justices vote on three ideology axes, with no doctrine. No amicus, decline-to-defend, compliance choice or court reform. Rulings move only standing, stability and press (`judicial-review.ts:32`). |
| Congress | Full bill lifecycle, cloture (`congress-votes.ts:180`), 535 voting members (`member-votes.ts`), 42 acts. | The social agenda leans one way. No riders, forced votes or shock windows. |
| Scenario corpus | 322 scenarios in 18 shards. The v2 target is about 2,000 (`CONTENT_PLAN.md`). | Zero hits for abortion, LGBTQ, drugs, student debt. |
| Non-decision events | Hazards, border incidents, external shocks, NPC acts, article banks, all in code (`impact-catalog.ts`, `border-incidents.ts`, `external-shocks.ts`, `npc-turn.ts`, `article-*.ts`). Feed capped at 12 a week and folded (`feed-cap.ts:33`). | No data-authored event layer. |
| Director | `rankCandidates` and `directorPicks` (`scenario-director.ts:388-469`): weight × recency × severity × pressure, class cooldown 6, desk cap 3, one per class, one critical a week. | No issue dimension. One-per-class can't pace hundreds of contested matters. |
| What content can move | A `position` reply reaches 8 effect kinds (metric, opinion, population toll, relationship with the counterpart, alignment, flags, a narrow conflict move, press), plus city, state and sector when the locus is bound (`CONTENT_DOCTRINE.md` §3). | **It can't move a Hill vote, a minister, a disaster or a third country.** The engine has about 40 effect kinds (`effect-types.ts`: bill, congress, person, cabinet, macroState, sector, state, operator, docket, order and more). Content reaches a fraction. |
| Voter groups | Ten cohort axes. Channels: civil rights, immigration, health access, disability programs, veterans (`cohort-channels.ts:13`). Turnout has mobilization and disillusion terms (`turnout.ts:40-52`). | No reproductive-care, firearms, schooling or policing channel. No religion axis. No backlash term. |
| Ideology | Three axes. Religiosity sits on authority–liberty (`cohort-motivation.ts`). | Can't place the US culture coalitions (§8.1). |
| Operators | cartel, insurgency, cyber-crew, private military, market actor (`operators.ts:24`). | No domestic violent-extremist operator. |
| Services | Includes federal cases, drug applications, fair-housing complaints, wage complaints, consular visas, disability claims (`service-catalog.ts`). | Not yet read by any contested-issue act. |

---

## 3. How many, and where

These are planning figures. `CONTENT_PLAN.md` notes the stop rate is unmeasured.

| Quantity | Assumption | Figure |
|---|---|---|
| Decisions per term | 208 weeks × guess 1.5 realized (desk cap 3) | ~310 |
| Contested matters per term | guess 25% of those | ~80 |
| Contested headlines per term | 12-a-week feed cap; guess 5 after folding | ~1,000 |
| Freshness bar | about 12× eligible over consumed (`CONTENT_PLAN.md`) | none |

What follows:
- **Occurrences: 1,500–3,000 templates**, each bound at draw time to a state, member, court or city.
- **Matters: 600–900**, inside the corpus's existing ~2,000 target.
- **Instruments: 300–450**, as a menu of 15–25 per issue in both directions.

"Thousands" is a ceiling the coverage matrix earns (§10), not a quota.

---

## 4. Issue state

### 4.1 Issues

An `IssueDef` is a small, engineer-reviewed record. There are 15–20 of them, and adding one is a design decision. Each declares:

- **The question**, in plain words.
- **Its place on the four ideology axes**, per direction.
- **Its material channels.** Add `reproductiveCare`, `firearms`, `schooling` and `policingAndSentencing`.
- **A 0–6 law-of-the-land scale** with worded steps.
- **Its doctrine questions.**
- **Its connection map** (§6), which sets its systemic couplings and the levers content may use.

**Tier one:** abortion and reproductive care; guns; immigration enforcement; race and civil rights; voting and elections; LGBTQ; policing and criminal justice; religion and speech.

**Tier two:** drugs; education; climate regulation; labor; healthcare mandates; national symbols.

### 4.2 State

Per issue:

| Field | Meaning |
|---|---|
| `federalStatute` | Step on the scale. |
| `constitutionalRule` | The floor and ceiling states must stay within. |
| `stateRegimes` | Each state's step. Reverts toward an anchor derived from the state's lean, as state lean does (DECISIONS §5.5). |
| `heat` | 0–1, decays weekly. |
| `pendingSeeds` | State laws in court, petitions, and bills in a chamber. |

**Coherence rule:** a state law outside the current constitutional rule doesn't take effect. It becomes a challenge seed the docket picks up.

### 4.3 Flare-ups are conditions

A sustained surge persists, decays, bills weekly and raises related content. DECISIONS §6.5 calls that a `Condition`, so flare-ups reuse conditions. Heat is a new boost source, `issueHeat`.

---

## 5. Content layers

### 5.1 Occurrences (new, data-authored)

`OccurrenceDef` fields:

- **What it is:** issue, kind, direction, severity. The kinds are a closed set: state law, filing, lower ruling, circuit ruling, introduction, protest, violent incident, enforcement action, defiance, statement.
- **Gates:** the full `ScenarioCondition` union, plus `issueState` and a bind target (a state by lean and regime, a member, a circuit, or a city).
- **Effects:** declared levers (§7), priced by the engine.
- **Follow-ups:** it can seed a challenge, a bill, a matter flag or a flare-up condition.
- **Copy:** a headline, a dek and up to two particulars.

An **occurrence draw** shares the director's ranking function, with its own budget, stream key and caps. The budget scales with total heat. Each issue has a weekly cap, and each template has a cooldown. The feed folds occurrences by issue and kind, the way it already folds foreign weather.

The schema is nation-agnostic, so foreign headline occurrences can use it later.

### 5.2 Matters (existing `ScenarioDef`, extended)

- An `issue` field.
- An `issueState` gate.
- An `issueHeat` boost.
- An issue cooldown.
- A weekly cap on contested matters.
- **Matter kinds** with fixed reply types: desk bill, rider, Solicitor General position, comply or defy, shock window, nomination question, cabinet split, state standoff.

### 5.3 Instruments (data templates over a closed set of mechanics)

| Mechanic | Engine process | Exists today |
|---|---|---|
| Order or memorandum | `signOrder` and the challenge pipeline | yes |
| Agency rule | `rulemaking.ts` | yes |
| Enforcement priority | New: a standing commitment that draws on a service's capacity | no |
| Clemency, individual or class | New act | no |
| Administration bill | `transmit` and the bill lifecycle | yes |
| Procedure act (filibuster carve-out, term limits, expansion, jurisdiction stripping) | Bill lifecycle plus a constitutional ground check | partly |
| DOJ suit against a state | New: opens a case | no |
| Nomination question | `judicial-nominations.ts` | partly |

Content can't invent a mechanic. Each template carries an authority citation with a source and date.

---

## 6. Interconnection: the systems an issue touches

This is the core of the third pass. Each issue's **connection map** lists which systems it reads and writes, split into **systemic** couplings (engine rules, always on) and **authored** ones (levers content may use). The engine supplies the map to content generation as data, so a brief for a gun occurrence already knows the crime trend, cartels and suburban women are in play.

### 6.1 System-by-system

| System | What reads it (gates and couplings) | What writes it | Systemic coupling (engine, always on) |
|---|---|---|---|
| **Approval's six judgments** (`opinion.ts`) | Matters gate on judgment bands | Through existing channels only: unity (divisive acts), integrity (pledges, defiance, a switched position, clemency for allies), competence (struck orders, botched rollouts), security (violent incidents, crime), services (care access, case backlogs) | Issue heat raises the salience of the judgment its incidents feed. A run of violent incidents raises security's weight, the way a scandal raises integrity's. |
| **Economy** (`macro.ts`, `sectors`, `household-prices.ts`, pulse bands) | Gates on unemployment, inflation and the crime trend (`scenario-pulse.ts:55`) | Sector and axis signatures: immigration enforcement hits farm, construction and services labor; firearms rules hit the gun industry; climate rules hit energy prices; a state boycott hits a state's sector | **Salience competition:** economic pain (`ECONOMIC_PAIN`) and an active war damp culture heat's effect on mobilization. When prices hurt, fewer people vote on guns. |
| **Budget and services** (`budget.ts`, `service-catalog.ts`) | Gates on service backlogs | Enforcement priorities draw service capacity (federal cases, fair-housing complaints, wage complaints, consular visas, drug applications). Bills carry costs and offsets through the existing fiscal path. | An enforcement priority that exceeds a service's capacity lengthens its backlog, and the backlog feeds the services judgment. Choosing what to enforce has a real price. |
| **States and governors** (`state-effects.ts`, `governors.ts`, state lean) | Binding by lean and regime; governor party and integrity | State regimes; grievance marks with reasons | A governor of the other party in a state that just lost a regime becomes a likely bind target for defiance and suits. State lean reverts toward an anchor that reads grievance marks, so a pattern of acts against a state moves it. |
| **Cohorts and turnout** (`route-cohorts.ts`, `turnout.ts`) | `cohortStrain` gate | Channels and values through the domestic signature | **Backlash:** mobilization grows with how far law moved from a cohort's position, times heat. Cohorts never move the headline (DECISIONS §5.9). |
| **Congress** (`member-votes.ts`, bills) | `liveBill` and `legislationAvailable` gates; member party and seat | Levers: member pressure on a named bill, a primary-risk mark, a seeded desk bill | Heat multiplies conviction and constituency in member votes. Primary-risk marks feed later votes and retirements. High polarization lowers cloture odds. |
| **Courts** (`judicial-review.ts`, docket) | `pendingOrderCase` and `judicialVacancy` gates; circuit | Challenge seeds, petitions, the Solicitor General position | Rulings write issue state, strike state regimes outside the new rule, set heat and can open a flare-up. Justices read the administration's record on each doctrine question. |
| **People** (cabinet, members, justices, governors, press) | `cabinetAttribute` gates; four-axis ideology | Person levers: a cabinet member's standing, loyalty or departure risk; a member's rapport | A cabinet member far from the President on an issue the President is acting on moves toward the existing revolt and departure logic (`cabinet-revolt.ts`). The Attorney General and Homeland Security Secretary are read first. |
| **Party beliefs** (`party-beliefs.ts`) | none | Belief split through the domestic signature | Already systemic: a divisive act splits beliefs and adds polarization (`BELIEF_SPLIT_POLARIZATION`). |
| **Pledges** (`pledges.ts`) | `plank:<id>` gates | Kept or broken through the act a plank names | One plank per direction for each tier-one issue, with real deliverables. |
| **Press and scandal** (`press-beliefs.ts`, `press-scandal.ts`) | `press` gate | A press headline; a scandal origin (a leaked memo, a switched position, clemency for an ally) | Outlets frame contested acts by their own beliefs, so the same act reads differently by audience. |
| **Security and operators** (`operators.ts`, conditions) | `operatorPressure`, `conditionActive` (unrest) | Violent incidents; the unrest condition's odds | **Add a domestic violent-extremist operator**, grown from polarization and grievance the way cartels grow from weak border control. Guns read cartels too: trafficking southbound is a real channel. |
| **Foreign relations** (relationships, standing, blocs, assistance) | Relationship and bloc gates | Third-party reaction levers, by band: allies on civil-rights and asylum acts, origin nations on deportation, aid recipients on reproductive-health funding conditions abroad | Standing reads the civil-rights record and defiance of courts. Deportation and entry acts move relationships with the nations of origin. |
| **Intelligence and surveillance** (BL-117, BL-135) | Collection reports | Surveillance of protest movements as a lever, with its oversight cost | Surveillance aimed at Americans opens the existing oversight and inspector-general path. |
| **Removal and elections** (`removal.ts`, `elections.ts`) | `removalPressure` gate | Only through integrity, scandal and defiance | Mobilization and turnout feed the midterm and the re-election result. |
| **Forecasts** (`modeling-projection.ts`) | none | none | Issue state, backlash and the couplings above run inside projections, so the forecast shows a ruling's electoral cost before the President commits. |

### 6.2 Couplings between issues

Couplings between issues are systemic, declared on the `IssueDef`s, and capped per week:

- Policing ↔ race and civil rights, through the civil-rights channel and the unrest condition.
- Immigration ↔ labor and the economy, through the labor market.
- Guns ↔ crime trend ↔ policing.
- Drugs ↔ cartels ↔ policing ↔ foreign relations.
- Abortion ↔ health access, through services.
- Voting ↔ elections and integrity.
- Religion and speech ↔ press freedom and technology platforms.
- LGBTQ ↔ schooling and religion.

Heat spills over by a declared fraction, so a policing flare-up raises civil-rights heat without anyone authoring the link.

### 6.3 Loops that must close (DECISIONS §6.4 applied)

Heat feeds occurrences and occurrences feed heat. Left alone, that's a self-exciting loop. **Rule:** an occurrence that gates on an issue's heat may not raise that issue's heat. Only declared trigger kinds raise heat: violent incidents, rulings, the calendar (campaign season, the June decision season) and cross-issue spillover. Everything else writes law, state, people or other systems. Heat decays every week, and spillover is capped per week.

### 6.4 One cause, one bill (DECISIONS §6.3 applied)

A violent incident bills security once, at the nation. State and city readings steer where it lands; they never charge it again. A ruling's cost to mobilization isn't also charged as an approval hit. The pricing tables declare which system owns each cause, and a test fails if two writers bill the same cause.

---

## 7. Authored reach: levers

Content can't write effects directly; it declares **levers** and the engine prices them. This widens what content can do without letting it bypass the engine (DECISIONS §1.5, §1.7).

| Lever | Engine effect kind | Priced by |
|---|---|---|
| `issueStep` (state, statute, rule) | issue state | kind and severity |
| `heat` (trigger kinds only) | issue state | kind and severity |
| `memberPressure` on a named live bill | congress or bill | heat and the member's seat |
| `primaryRisk` on bound members | person | heat |
| `cabinetStrain` on the officer whose department owns the issue | person or cabinet | axis distance |
| `serviceLoad` | services | magnitude band |
| `sectorSignature` | sector and macro, through the domestic signature | magnitude band |
| `thirdPartyReaction` by bloc or band | relationship | severity |
| `operatorFuel` | operator | severity |
| `conditionOdds` (unrest, a flare-up) | condition onset | severity |
| `scandalOrigin` | press scandal | charge gravity (`SCANDAL_GRAVITY`) |
| `pledge` | pledges | the plank's deliverable |

Each lever follows the doctrine's mechanism rule (`CONTENT_DOCTRINE.md` §3 rule 4): the item's own text must complete *"this moves X because ___"*, or the lever comes off. The doctrine's "cannot move a Hill vote or a minister" changes to "can, through a declared lever". `CONTENT_DOCTRINE.md` §3 and SCHEMA are updated in the same change.

**Agency for blame.** Every item declares `ImpactAgency` (`our-doing`, `on-our-watch`, `inherited`, `acted-upon`; `impact.ts:107`). An occurrence is `on-our-watch` or `acted-upon`; an instrument is `our-doing`. Blame and the Record follow agency, so a state's law costs the President less than the President's own order does.

---

## 8. Model fixes (owner-approved)

### 8.1 Cultural axis

Add a fourth axis, `culturalTraditionalProgressive`, and move religiosity onto it. It applies to every person, party, cohort, justice and alignment pull. Foreign leaders sit at 0 until a sourced column exists, a recorded one-wave exception to DECISIONS §4.2. The save version bumps.

### 8.2 Religion cohort axis

Added: CES 2020 and 2024 state shares for seven traditions, raked by race to Pew, with measured issue positions for every cohort (DECISIONS §5.8, amended 2026-10-12; `RELIGION-RESEARCH.md`).

### 8.3 Seeded starting law

The starting law is a plausible variant of a sourced, dated anchor:

- Each issue moves at most one step from the anchor.
- State regimes stay consistent with each state's lean.
- One "judicial era" draw keeps the Court coherent across issues.
- Each issue draws on its own stream key.

The inherited law is shown at founding.

---

## 9. Scoring

| Reading | Moves through |
|---|---|
| **Headline approval** | Existing judgments only (§6.1). One ordinary culture act is worth under a point. Incident runs raise security's salience. |
| **Issue approval** (new, derived) | One poll per issue, weighted by heat. |
| **Mobilization** | Backlash, damped by salience competition with the economy and war. |
| **Congress, courts, people, states, foreign relations, services** | The couplings and levers in §6–7. These are where most of a contested act's consequences land. |

**Aggregation:** occurrence-driven movement is capped per issue per week, with a floor, following the `STATE_ROUTE_CAP` pattern (`domestic-signature.ts:68-70`).

**Pricing:** every lever is priced from tables keyed by (kind, severity, band). Balance tunes the tables once against the `wedge`, `careful` and `investment` policies. No item carries numbers.

---

## 10. Generation: making content use the connections

The content pipeline exists: `content-plan` → `content-research` → analyst → writer → independent review. Five changes make it use the whole system:

1. **Briefs carry the connection map.** When `content-plan` materializes a cell, the brief includes the issue's systemic couplings (so the writer doesn't re-bill them), the allowed levers, and the live gates that make the cell reachable. The analyst picks the item's reads and levers before any prose is written.
2. **The coverage matrix has a connection dimension.** Cells are issue × layer × kind × direction × severity × bind type × **primary connected system**. Without the last dimension, a thousand gun items will all be "Congress argues about guns". With it, the planner asks for the gun item that reaches cartels, the one that reaches a state's economy, the one that strains the Attorney General.
3. **An isolation audit.** A new rule, `isolated-issue-item`, refuses an item that gates only on its own issue and writes only its own issue. A matter must read at least one other system, or carry at least one lever into one. Occurrences are allowed to be narrow; the corpus-level check is that every issue's occurrences reach every system on its map.
4. **A double-billing audit.** It refuses a lever that re-bills a systemic coupling (§6.4), such as an incident item that also charges security by hand.
5. **A reachability check per cell.** It uses the existing reachability machinery to prove every item can fire in a seeded campaign. The scenario-dead-gate trap (absolute bounds, band × relationship filters that reach no player) is the known failure here.

---

## 11. Scaling the machinery

| Problem | Fix |
|---|---|
| Every corpus body is resident in one generated file | A size budget per layer and a gate. Occurrences are small. Shard loading only if the budget fails. |
| All-pairs near-duplicate check | MinHash and locality-sensitive hashing. |
| Batch floors tuned for 8–40 items | The corpus-wide coverage matrix from §10. |
| One pick per class on the desk | A two-stage draw (issue, then item), an issue cooldown and a contested cap. |
| Symmetry at volume | `verify-issue-symmetry`: direction ratio per issue and layer, plus a status-quo defense in every branch. |
| Contradictory headlines | Issue-state gates, template cooldowns, and a cooldown per bound state per issue. |
| Review capacity | Full reads for matters and instruments; stratified sampling for occurrences; batches sized to the review rate. |

---

## 12. Adversarial findings

### Carried

| Finding | Verdict | How it's handled |
|---|---|---|
| Three axes can't place the US culture coalitions | Fixed | The fourth axis |
| Approval barely moves on culture issues | Accepted (it's realistic) | Visible readings, plus consequences landing in other systems |
| The culture war could be a dominant strategy | Needs validation | The `wedge` policy must not beat `careful` at 12 seeds. On the critical path. |
| Content leans one way | Gated | Symmetry gate and a both-sides review |
| Disputed facts read as a lecture | Handled | Adviser ranges; effects stay material |
| Real case names | Handled | Fictional captions and parties |
| Defying the Court | Included | At full cost |
| Thousands of items make the world louder, not richer | Accepted with controls | Heat-scaled budget, folding, a share-of-feed ceiling measured in the harness |
| Raw volume is the wrong target | Accepted | Coverage cells, not raw counts |
| Occurrences become a hidden second simulation | Controlled | Origin recorded, caps, regimes revert to an anchor |
| Templates lose per-item accuracy | Controlled | Authority citations, a closed mechanic set |
| Review is the bottleneck | Controlled | Sampling, batch sizing |

### New in this pass

**1. Widening content's reach lets content break the simulation.** Levers into Congress, people and foreign relations hand writers power the doctrine withheld on purpose.

- **Controls:**
  - Levers are priced by the engine, never sized by the writer.
  - The mechanism-sentence rule applies.
  - Every lever has a weekly cap per target. A bound member can't be pressured by three items in one week.
  - The double-billing audit applies.
- **Verdict:** accepted with controls.

**2. Coupling everything to everything makes cause unreadable.** If a gun item moves cartels, a state's economy, the Attorney General and Mexico, the player can't trace why.

- **Controls:**
  - Each item gets **at most two levers** beyond its issue state.
  - Systemic couplings are few and declared per issue.
  - Every movement carries its reason sentence (DECISIONS §5.11), so the Record can always say why.
- **Verdict:** accepted with controls. The cap of two is a starting rule; revise it only from playtest evidence.

**3. Systemic couplings can make content redundant.** If the engine already moves cartels when gun heat rises, an authored lever doing the same bills twice.

- **Fix:** the double-billing audit, plus briefs that list the systemic couplings as "already happening, don't charge it".
- **Verdict:** accepted.

**4. Salience competition could make culture irrelevant in hard times.** That's realistic in kind, but at full strength a recession would erase a whole layer.

- **Fix:** damping has a floor, so culture always carries some mobilization, and the harness measures it.
- **Verdict:** needs validation.

**5. A domestic extremist operator is a sensitive mechanic.** Growing violence from polarization risks reading as editorial about one side.

- **Controls:**
  - It grows from grievance and polarization regardless of which direction produced them.
  - Incidents are written about the decision, not the gore, and attack no group by name.
  - Symmetry applies to its content.
- **Verdict:** accepted with controls.

---

## 13. Owner decisions (2026-10-12)

1. **Fourth (cultural) axis:** accepted.
2. **Religion cohort axis:** accepted; the data held (`RELIGION-RESEARCH.md`). DECISIONS §5.8 amended 2026-10-12, with measured cohort issue positions in place of centered beliefs.
3. **Starting law:** seeded variants around a sourced anchor.
4. **Defying the Court:** included, at full cost.
5. **Contested issues are world content at corpus scale,** drawn like foreign events.
6. **Contested issues are wired into the whole metric and impact system;** generation must use those connections (this pass).

The turnout cap (3 points) stays until `wedge` is measured.

---

## 14. Build order

This lands after the current integration checkpoint, because BL-112, BL-123 and BL-106 touch the same files. Checks follow BL-137: targeted while building, full sweeps at integration.

| Phase | Scope | Exit proof |
|---|---|---|
| **0. Rules** | DECISIONS gets the axis, issue state, the layers, the mechanic set, levers, the connection-map and isolation rules, the loop and billing rules for issues, symmetry, defiance and seeded law. `CONTENT_DOCTRINE.md` §3 is rewritten for levers. The backlog item is opened. | Rules written with reasons |
| **1. Substrate and couplings** | The cultural axis and save migration. Channels. `IssueDef` with connection maps. Issue state, heat, coherence, flare-ups. Backlash plus salience competition. The systemic couplings in §6.1–6.2. The domestic extremist operator. Pricing tables and weekly caps. Issue approval and mobilization readings. Projection coverage. The `wedge` policy. | Engine tests, including the double-billing and loop tests. 12 seeds: `wedge` doesn't beat `careful`. Re-baseline. SCHEMA and ARCHITECTURE synced. |
| **2. Layers, levers, processes** | `OccurrenceDef` and the occurrence draw. Feed folding by issue. Matter kinds, gates and the boost. The lever set with its caps. Instrument templates and the new mechanics. The exogenous docket, doctrine voting, the June season and court positions. Inherited orders. | **Vertical slice, guns:** about 60 occurrences, 15 matters and 15 instruments reaching at least six systems on its map, played across a term in the harness and the browser. The Record traces every movement. |
| **3. Generation and scale machinery** | Briefs carry connection maps. The connection dimension in the coverage matrix. Isolation, double-billing, symmetry, size-budget and reachability gates. LSH near-duplicates. Stratified review. | Gates green on the slice. A synthetic 3,000-item load test. |
| **4. Research and content** | Historian anchors for tier one. Content by coverage cell in review-sized batches. | Tier-one cells filled; review records |
| **5. Surfaces** | An issue page with the law-of-the-land scale, a state map where the patchwork is the answer, live items per branch, issue approval and mobilization, **and a "what this touches" view drawn from the connection map**. The Courts June season. Desk bills and riders. Inherited orders. | Six widths, inspected captures, a fresh-player comprehension check |
| **6. Balance and close** | Full harness at 12 seeds, all policies. Tune the tables, the share-of-feed ceiling and the salience floor. Tier two. | Gate record, backlog reconciled |

**Critical path:** `wedge` in phase 1, then the guns slice in phase 2. The slice's test is interconnection: if guns can't honestly reach crime, cartels, a state's economy, the Attorney General and Congress, the connection model is wrong, and it's cheap to find out with 90 items rather than 3,000.

---

## 15. Parking lot

- Foreign headline occurrences on the same schema.
- Migrating the existing security and economic orders onto instrument templates.
- State legislatures as full agents (occurrences cover state action until playtests say otherwise).
- Constitutional amendments as a late-game set piece.
- `case-families.ts:49-50`: default phrases nothing executes.
