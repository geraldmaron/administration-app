# Decisions

These are the standing rules for The Administration. Each one is current and binding until a change to this file says otherwise. [DESIGN.md](DESIGN.md) governs what the player sees and does. [The map-first program](audits/2026-10-10-map-first/PROGRAM.md) governs build order. `CLAUDE.md` governs process, branches and gates. Where a rule and the source tree disagree today, the rule carries a **Source check** note with the date it was checked.

Each rule has a heading, the rule, and the reason. **Where** names the code or gate that holds it, when one exists.

## 1. Engine and determinism

### 1.1 The engine is pure
`packages/engine` depends on `packages/world`'s data and nothing else: no UI, renderer, network, platform or Node I/O module. Selection, resolution and simulation run in process, never as a network round trip.
**Why:** The player, the content validators and the balance harness run the same engine code, so it has to behave identically in all three.
**Where:** the `packages/engine` override in `eslint.config.mjs`; `scripts/verify-boundary-lint.mjs`.
**Source check (2026-10-10):** the lint pattern list doesn't name `@admin/content`. No engine file imports it today.

### 1.2 No wall clock and no unseeded randomness
Engine code never calls `Math.random()`, `Date.now()` or an argless `new Date()`. Every draw comes from `createRngStreams(seed).stream(...)`.
**Why:** The same seed and the same dated inputs have to produce the same world, or replay, bug reports and the balance harness mean nothing.
**Where:** `eslint.config.mjs` (`no-restricted-syntax`); `packages/engine/src/rng.ts`.

### 1.3 A new kind of draw takes its own stream key
Streams are keyed, not sequential. A mechanism that adds draws gets a new key rather than consuming more of an existing stream.
**Why:** Adding a draw to a shared stream changes every later draw on it, so existing saved campaigns would resolve differently.

### 1.4 Iteration order is declared
Engine code iterates a record over sorted keys or a declared id order (`STATE_IDS`), never over object insertion order. Any tie-break uses a full ordering, such as mark eviction on weight, then turn, then signature.
**Why:** Insertion order is an accident of construction, and an accident can't be replayed.

### 1.5 One mutation gate
Every state change flows through `apply(state, EffectPacket)`. That covers the player, NPC governments, operators, the weekly simulation and God Mode. Selectors, resolvers and simulators are pure functions that return packets.
**Why:** One path is one thing to audit, and nothing can change the world in a way normal play can't explain.
**Where:** `packages/engine/src/effects.ts` (`apply`).
**Presentation packets (2026-10-25, world dynamics Wave 1):** what the President has been shown also goes through `apply`, on a packet marked `presentation: true`. Today that is only the notice ledger (`Campaign.noticed`), written by an `attention` effect's `notice` and `forget`. `apply` folds a presentation packet and returns: no ledger entry, and no causal id taken from the ledger's length. Its provenance is the packet's own key (origin `world`, the matter ids as `entities`, the signatures in the effect). The simulation never reads what it writes.
**Why (presentation):** what was shown depends on the player's attention settings, and the causal ids are part of the result (2.3). A notice that took a number would shift every later record's id, and the keyed draws that read them, by a setting.
**Where (presentation):** `effect-types.ts` (`EffectPacket.presentation`, `AttentionEffect.notice`/`forget`); `effects.ts` (the early return in `apply`, `applyAttention`); `advance.ts` (`withNotices`).

### 1.6 Every change explains itself
Every `EffectPacket` carries a `source` and a `narration.summary`. `apply` rejects a packet with an empty summary.
A presentation packet (1.5) carries a summary like any other; it leaves no ledger entry, so the summary is never read on the Record.
**Why:** A state change the game can't explain to the player in fiction is a defect.
**Where:** `effects.ts` (`apply`); `effect-types.ts` (`EffectSource`, `NarrationRef`).

### 1.7 One commit path for acts
Every instrument act, by the player or an NPC government, resolves through `resolveAction`.
**Why:** Cost, odds, risk and ripples can't be skipped by a caller that only wants the effects.
**Where:** `packages/engine/src/resolution.ts`.

### 1.8 Helpers return effects; acts return packets
A function that compiles a declaration into effects (`routeDomestic`, the gazetteer compiler) returns `Effect[]` for its caller to splice into the caller's packet. Only a reachable act returns an `EffectPacket`.
**Why:** It keeps one act from becoming several packets, and it keeps the reachability census about acts rather than internal helpers.

### 1.9 The phase order is fixed and acyclic within a step
A week runs its phases in one declared order, and each phase reads what earlier phases wrote that week. Feedback crosses a turn boundary or a declared lag. No phase expects to be re-run within the same step.
The daily step advances the calendar, then applies emergency authority expiry (`emergencyExpiryPhase`) before executive-order expiry. It next resolves due lobbying, press work, treaties, force authorizations and issued instruments, in that order. After due instruments, `tariffAuthorityPhase` reconciles Section 122 measures to their shared authority deadline before `expireTradeMeasures` expires those measures and reverses their remaining price effects. Impact events and elections due that day follow, then the scheduled office-day work or weekly tick. The two authority hooks run on every calendar day, including days between weekly phases: an expired emergency cannot authorize later work that day, and a legacy tariff with an overlong deadline is corrected before the ordinary expiry reader sees it. Each hook reads earlier writes in this order; neither needs a phase to run twice within the step.
In the weekly sequence, `officeSuccessionPhase` runs after `judicialVacancyPhase` and before `institutionPhase` and `foreignPoliticsPhase`: a death in office empties the office before anything reads it, a Secretary's acting deputy is seated before the department's week, and a dead foreign leader's successor is seated the same week.
**Why:** A loop inside one step has no defined answer, and a reorder would silently change which write a reader sees.
**Where:** `packages/engine/src/turn-loop.ts`; `turn-phases.ts`; `day-step.ts` (`stepCalendar`); `succession.ts` (`officeSuccessionPhase`).

### 1.10 Derived readings are recomputed, never stored
A composite reading of the record is recomputed from the record every time it's read. Examples: removal pressure, the revealed-preference profile, cohort support, a state's lean anchor, whether a low-confidence briefing proves false. A composite that no rule or screen reads doesn't exist. What a reading *was* in a past week is a record, not a stored composite: the weekly history of approval, the economy, the opinion judgments, cohort and coalition support and trust between governments is written once at the week's close, never re-derived, and no rule reads it back as the current value.
**Why:** A stored composite is a second account of the campaign that can drift from the first. A past observation can't drift: it is what the reading said that week, and recomputing it from today's state would rewrite history.
**Where:** `revealed-preference.ts`; `packages/content/src/scenario-intel.ts`; the records in `economy-archive.ts`, `opinion-record.ts` and `relations-record.ts`.

### 1.11 Every durable record names its origin
Anything that outlives the turn that created it carries a reference to the decision that caused it: a mark, a strain, a condition, a flag, a commitment, a ledger entry. A consequence chain is derived by walking those references and is never stored as a graph.
**Why:** A stored graph could disagree with the records it describes. Walking origins can't.
**Where:** `packages/engine/src/causality.ts` (`CausalProvenance`).

### 1.12 Variance never touches a promise
Bounded, seeded jitter may model what the government couldn't have known: macro shocks, condition onset and severity steps, outcome rolls. It never applies to a sum, a band derivation, a gate evaluation, a figure quoted to the player before they decide, or recorded history.
**Why:** A quoted cost that changes after the player trusted it is the game lying. A jittering sum fails its own validator.
**Source check (2026-10-10):** no gate enforces this. Band hysteresis isn't built; condition onset has its own (`condition-onset.ts`).

### 1.13 Campaigns diverge by seed
Two campaigns run from different seeds under the same scripted decisions have to diverge past `DIVERGENCE_BAR` in served content and world state by a fixed turn.
**Why:** Variety has to come from the simulation, because content volume can't supply it.
**Where:** `packages/engine/src/divergence.test.ts`.

### 1.14 A system is modeled only when it can disagree with itself
A new system needs at least two parts that can want different outcomes, and the difference has to be visible to the player. A single scalar pushed in one direction doesn't count.
**Why:** A scalar can be pushed but can't argue, and a game made of scalars reads as dials rather than a country.

## 2. Time, attention and the term

### 2.1 Real time buys no world time
The world advances only when a present player advances the clock. Wall-clock time, speed, pauses and settings never write state. Restoring a save advances nothing.
**Why:** Absence must cost the player nothing, and a presidency can't be run out by closing a laptop.
**Where:** `packages/engine/src/advance.ts`; `packages/player-core/src/campaign/store.ts` (`restore`).

### 2.2 The world stops for a reason, measured in days
`advanceUntilAttention` runs until one of four things happens: a matter needs the President, a requested horizon in days is reached (default `DEFAULT_HORIZON_DAYS` = 28), a constitutional or statutory milestone arrives, or the presidency ends. It never stops on a tick count. `AdvanceResult` and `AttentionStop` are Doc Sync surfaces.
**Why:** The app and the balance harness drive the world through this one function, so its stop reasons define what every surface shows.
**Attention on change (2026-10-25, world dynamics Wave 1):** a matter that carries a signature stops the world once per signature. The engine keeps the signature it last stopped for in `Campaign.noticed`; a matter stops the world again only when its signature changes (a hard urgency, a worse stance, a nearer deadline stage, a new removal rung) or after it has left the desk and returned. A Desk row's signature is its urgency (hard, or one level for soft and ambient), its stance and its deadline stage (open, far, within 7 days, due). The removal summons is one stop per rung, and again only on a fresh approach. A deferral that lapses on an unchanged matter does not interrupt. A hard matter with no deadline (an unauthorized force) stops once per change of stance, no longer weekly after a deferral; the owner confirmed this behavior on 2026-10-25. A staged scenario carries a signature too: its level (hard, or open for soft and ambient). It stops the world once per occurrence and again only if it turns hard; its id names the occurrence, so a new episode is a new matter (world dynamics Wave 3). Continue and the Brief hold on the same eligibility the engine stops on (`withoutNoticed` over `withoutDeferred`); a noticed matter stays on the work list but no longer holds the clock. The notice ledger is written only by an `attention` effect on a presentation packet through `apply` (1.5), so what the President was shown never changes the numbering or the bytes of anything else, and the simulation never reads it.
**Why (attention):** a level that holds is not news. A President who deferred everything was stopped 34 times inside one removal episode.
**Proposed attention budget (not asserted by any test or gate):** for a President who defers everything, at most one stop per matter per signature; stops per 30 days in the single digits (measured 6.7 and 6.5 on the engagement probe's two seeds with scenario signatures on, 2026-10-25); no 30-day window without a stop or an ambient event (this last one the engagement probe already asserts). Scenario matters now carry signatures; the number is still the attention owner's to set.
**Where (attention):** `packages/engine/src/attention.ts` (`withoutNoticed`, `reviseNotices`); `advance.ts` (`lookForMatters`, `withNotices`); `packages/player-core/src/desk/attention.ts` (`signatureOf`, `presentedItems`); `packages/player-core/src/conversation/scripts.ts` (`scenarioMatterSource`); `summons/due-executive.ts` (`removalEpisode`); `packages/player-core/src/__probes__/engagement.probe.test.ts`.

### 2.3 Pacing never changes the result
A campaign is a pure function of the engine and corpus versions, the founding inputs, the seed, and the dated packets committed by the player or by the app on the player's behalf. One 28-day advance equals 28 one-day advances.
**Why:** How fast someone plays can't be a strategy.
**Where:** `packages/engine/src/advance.test.ts`.

### 2.4 One ordered week, cut into office days
Each weekly phase runs once every seven days, in the order `campaignPhaseSequence` declares. The seven office-day groups must cover that sequence exactly and in order.
**Why:** No Doc Sync constant may change meaning, and no draw may be re-keyed, because of how a week is laid out.
**Where:** `turn-phases.ts` (`weekGroups`, `simulateRuns`, which throws on a dropped or reordered phase).
**Source check (2026-10-10, W5):** the day cut is on wherever the game is played and measured: the campaign store builds `campaignTurnPhases(charter, true)` and the balance harness defaults `layout` on; only `advanceTurn` and tests that pass no layout run the flat week. Incidents step every calendar day on their own clock, not at the week's close. A phase reads its own office day's date, so a choice gated on a date window can differ from the flat week; `week-identity.test.ts` pins that. An incident a weekly phase opens (a condition's onset, a cyber crew's attack) is dated to the week's closing day (`weekCloseDate`), so its daily clock starts on the same day under either layout; `impact-week-clock.test.ts` holds it. The war powers phase bills a force kept past the sixty days as of the same closing day, so a clock that runs out mid-week is billed in the same week and at the same scale under either layout; `war-powers-report.test.ts` holds it. Still read on the office day: a weekly phase reading an incident's live disruption (`independentImpactPressure`, read by the economy's drift), which moves a struck nation's output by a few thousandths between layouts.

### 2.5 New durations are authored in days
A new window, lapse or horizon is declared in calendar days and converted to turns once, at the point of check.
**Why:** A bound in days means the same thing at any pace.
**Source check (2026-10-10):** newer constants are in days (`FAMILY_LAPSE_DAYS`, `horizonDays`). Older ones are still in turns (`EMERGENCY_RENEWAL_TURNS`, `AUTHORIZATION_TERM_TURNS`).

### 2.6 The term runs on the Constitution's calendar
Election dates come from the calendar (`presidencyElections`), never from a turn count. A presidency runs at most two terms (`TERM_LIMIT = 2`), with a midterm in each, and the second term ends the campaign as term-limited. Whether a charter holds elections at all is `holdsElections(charter)`.
**Why:** The dates are facts about the office, and an outcome has to be deterministic given the record.
**Where:** `packages/engine/src/elections.ts`.

## 3. Presidential cases

### 3.1 One durable source of pending truth
Every matter that asks the President to choose is a case in one registry. Desk, Brief and clock all read that registry and nothing parallel to it.
**Why:** Two queues let the screen show work that the advance loop doesn't consider pending.
**Where:** `packages/engine/src/cases.ts`, `case-types.ts`; `scripts/verify-case-source-unification.mjs`, `verify-case-contract.mjs`.

### 3.2 Raising a case freezes its identity
When a case is raised, its scenario version, subject, counterpart, place, participants, stakes, choices and content digest are pinned on it. Live projections, such as a whip count, may still move.
**Why:** A matter that changes or disappears because time advanced is lost state.

### 3.3 Dispositions are a closed set
A case declares which of `act`, `defer`, `delegate`, `decline` and `allow-default` it accepts. No surface invents another option, and there is no generic "continue anyway". Reading, opening, leaving a route, ending a session or advancing time is never a disposition.
**Why:** The Record has to be able to say what the President actually did about each matter.
**Where:** `case-types.ts` (`CaseDisposition`).

### 3.4 Inaction is an act of state
Choosing not to act writes a case transition, a causal record, narration, and any follow-on flag, grievance or callback. It writes no invented penalty.
**Why:** Not acting can matter, and the engine decides how much, never the UI.

### 3.5 Clocks must be real, and crossing one runs a declared default
A case only shows a countdown when the matter has a real window: statutory, operational, deteriorating or opportunity. Standing matters show age, not a countdown. A case with a deadline declares what happens when it passes: `none`, `declined`, `delegated`, `legal-default`, `escalated` or `failed`. No case simply evaporates.
**Why:** A fake deadline is manipulation, and a case that vanishes at its deadline is a silent skip.
**Where:** `case-defaults.ts`; `scripts/verify-no-silent-skip.mjs`.

### 3.6 Hard cases are never automated
Constitutional acts, use of force, removal, treaty commitments, budget lapses, emergency authorities and acts with irreversible human harm are never covered by an automation rule. Automation applies only where a case's contract opts into a specific rule. A standing delegation is an automation rule (amended 2026-10-11): a delegate may defer, decline, let a default stand or pick a decision's reply within the bounds the President sets, but never on a case in these categories and never on a critical-severity decision. The delegate may carry out the work inside a hard case, but the decision stays with the President.
**Why:** Those decisions are the presidency, and a broad toggle would let the game play itself. Most of them are also the President's alone in law: a veto, a pardon, a nomination, a treaty and the decision to use force can have their execution delegated, but not the decision. Once a delegate can pick replies, a severity ceiling the player could raise without limit would reopen the same toggle, so critical decisions always reach the President.
**Where:** `case-automation.ts`.

### 3.7 The price shown is the price charged
A priced act is built from the same campaign state its projection was shown on. Each projection returns what the realized week would produce under that state.
**Why:** A price that drifts between preview and commit breaks the player's trust in every number.

## 4. World dataset

### 4.1 Every nation is the same shape
The United States is a `Nation` record with `playable: true`. Every other government is the same record with `playable: false`. Nothing player-only is special-cased outside the record, and `playable` stays a per-nation field.
**Why:** One shape means one validator and one set of rules, and another nation could be opened by authoring rather than by architecture.
**Where:** `packages/world/src/dataset/nations.ts`, `usa.ts`.

### 4.2 Every authored field has a named consumer
Every field on `NationStats`, `Nation.geo`, `NationTraits`, `Person`, a state or a party needs a registry entry naming the rule or screen that reads it. Otherwise the paired test fails. This is a Doc Sync surface.
**Why:** A number nothing reads is depth the simulation doesn't have.
**Where:** `packages/world/src/dataset/stat-consumers.ts`.

### 4.3 Every number carries its unit
Each numeric field family maps to a `UnitSpec` in the units registry, and a test fails when a stat lacks one. Money is stored in USD millions. A figure never renders without its unit; one formatter chooses scale words; no simulation rule reads a display preference.
**Why:** Units by convention can't be validated or displayed correctly.
**Where:** `packages/world/src/dataset/units.ts`, `units.test.ts`.

### 4.4 Aggregates stay; decompositions sum to them
Aggregates such as headcount, trade totals, budget and approval stay authoritative for bands and rules. A decomposition authored beneath one (order of battle, trade partners, revenue and outlay lines) has to sum to it within tolerance. The United States gets full decomposition; other nations only where gameplay reads it.
**Why:** Decomposition adds a reading without creating a second number that can disagree with the first.

### 4.5 One level owns a fact
Each population fact is authored at exactly one level. Coarser levels are sums of it and finer levels are shares of it, and the validator proves the sums.
**Why:** Authoring the same fact at two levels guarantees they will eventually disagree.
**Where:** `packages/world/src/dataset/state-mass.ts`; `districts.test.ts`.

### 4.6 Bands are derived, and content targets them
`NationBands` is derived in `bands.ts` and never authored. Content declares applicability against bands and conditions, so a new nation needs a data record and no new content. A change to the band derivation is a Doc Sync surface.
**Why:** Content written against bands survives rebalances and roster growth. Content written against nation ids doesn't.

### 4.7 Stats say what a nation can do; traits say what it will do
Capability lives in `NationStats`. Disposition lives in `NationTraits`, rolled per campaign within an authored range. NPC decisions read traits, constrained by stats and geography.
**Why:** Rolling traits per campaign is a main source of divergence, and keeping them apart from stats keeps both honest.

### 4.8 Relationships are directed and remember
A relationship runs from one nation to another. Its memory has two layers. The transient layer is every favor and slight: trust, tension and military threat settle back toward the pair's standing reading, and grudges fade, all by the one approach-to-target form `next = target + (current − target) × 2^(−elapsedDays / halfLifeDays)`. A favor fades at `FAVOR_HALF_LIFE_DAYS` (273 days). An injury, meaning trust below or tension above the standing reading, and a grudge fade at the grievance half-life, two to four times that, placed by the aggrieved party's vengefulness (`GRIEVANCE_HALF_LIFE_MULTIPLE`). A grudge carries a cause, weight, creation turn and a daily decay rate set from that vengefulness when it forms. Remembered acts on the history age the same way, by elapsed time and not by their place in the record. The durable layer is cause-tagged and read off the campaign's own records: the founding derivation and sourced dyads, live compact memberships, a treaty in force, a standing severance, and a war fought under this administration, which holds the reading while it is fought and leaves a scar after it. A war fought holds military threat 0.3 above standing between the sides and leaves 0.05 after; threat above its anchor settles at the grievance half-life, below it at the favor half-life. A carried war's hostility between its two principals is in the founding reading; a government that enters it later is held at the war's durable shift. A war's grudge fades to a floor (`WAR_GRUDGE_FLOOR`, 0.15); no other cause has one. A pressure that lasts for weeks (a compact fracturing around its members, a war the world watches) presses a reading toward a level below where the pair stands at `PRESSURE_BUILD_HALF_LIFE_DAYS` (28), never back past it, and memory repairs it after the pressure ends; no weekly writer takes a flat step off a relationship. Time never erases a durable cause, and reversion never rebuilds a pair from founding data alone. Routine calls and envoys share the remaining room up to 0.06 trust above each directed relationship's anchor (`ROUTINE_TRUST_SURPLUS`, durable treaty shifts included); the increment shrinks with that room, and switching instrument or initiator does not reset it, while reception and tension relief keep their own rules. The owner kept the 0.06 ceiling on 2026-10-25. A person's grievances toward the President keep their cause, weight and creation turn; private Hill willingness reads their remaining weight through the same exponential decay at the midpoint grievance half-life, charged once inside the disposition term. Hill brokerage combines seated caucus, state-delegation and leadership ties with recorded issue contacts, visits each recipient once over at most two hops within a bounded effort, and leaves every recipient free to refuse. The half-lives, the durable sizes, the pressure levels and the Hill tie weights are planning values.
**Why:** How one capital sees another isn't symmetric. A betrayal has to stay expensive for as long as that nation's character says it would, a kindness must not be a permanent deposit, and a war or a treaty is still on the record years later. The record says injuries outlast favors. Flat weekly steps from fracturing blocs and watched wars drove an idle world from about 140 to about 700 hostile directed edges in two years; as pressed levels it reaches about 210.
**Where:** `packages/engine/src/relationships.ts` (`approach`, `grievanceHalfLifeDays`, `ageGrudge`, `migrateGrudge`, `durableShifts`, `relationshipAnchor`, `pressDown`, `pressUp`, `grudgeDecayPhase`); `relationship-graph.ts` (`structuralReading`); `blocs.ts` (`fractureEffects`); `war-tick.ts` (`worldOpinionEffects`); `engagement.ts` (`ROUTINE_TRUST_SURPLUS`); `ties.ts` (`personalGrudgeWeight`); `lobbying.ts` (the disposition term); `person-network-influence.ts`; `relationships.test.ts`; `network.probe.test.ts` 1a, 1b', 1d, 2b, 2c and 4b.
**Source check (2026-10-25):** the half-lives are the world-dynamics program's candidate planning values (favor 26 to 52 weeks, grievance 2 to 4 times that), checked on three idle 104-week seeds. Neither half-life is sourced, and the balance harness has not yet been run on them. Threat reverts after a war since Wave 2 (`DurableShift.militaryThreat`).

### 4.8a Third parties read a move by their own ties
A government watching a move between two others reacts with a signed, bounded reading of its own: how much it values the target, whether it is bound to defend it, what it trades with it, how much it fears the actor, how much it fears the target, how far it trusts the actor, and whether it already runs the same policy. A government that distrusts the target reads the move as none of its business: rivalry earns neutrality, never approval. Approval comes only from a government already pressing the target itself, and lifts it at most `APPROVAL_CEILING` (0.08) above where it stands with the actor, so it cannot be farmed. Objection settles toward a floor `OBJECTION_FLOOR` (0.25) below where the observer stands with the actor: each act is charged its magnitude times the share of that room still left, so a first act from the standing reading costs in full, every repeat still costs something, and one observer's reading of a frequent coercer plateaus. The floor is per observer and actor; another observer's reading is its own. A war's weekly verdict on its aggressor is read through the same objection. The weights are planning values.
**Why:** One flat reaction per relationship class made a rival of Iran resent a sanction on Iran exactly as Iran's partners did, and made every ally of Poland react identically whether it trusted Poland a little or a lot.
**Owner ruling (2026-10-25, BL-300):** "floor an observer's cooling toward a frequent coercer per observer-coercer pair, so it plateaus while each new act still costs something." Charged in full, objection to China, Russia, Egypt and Saudi Arabia's own coercion was the largest remaining writer of new hostile pairs in an idle world. With the floor, three idle 104-week seeds end with 195, 183 and 160 hostile directed edges (trust below −0.3) against 213, 197 and 195 without it, and mean trust 0.0866, 0.0861 and 0.0872 against 0.0851, 0.0844 and 0.0851. `OBJECTION_FLOOR` is a planning value.
**Where:** `packages/engine/src/resolution-ripples.ts` (`observerStance`, `projectRipples`, `rippleContribution`, `objectionDelta`, `OBJECTION_FLOOR`); `war-tick.ts#worldOpinionEffects`; `resolution-ripples.test.ts`; `network.probe.test.ts` 3a to 3c; `economy.probe.test.ts` B5.

### 4.9 One person pool serves every role
A seeded person pool supplies cabinet candidates, foreign heads of government and ministers, opposition figures and journalists. Candidates for a seat are filtered from that pool by eligible role. A person's bio is composed deterministically from their record. Amended 2026-10-13: a seat no pooled role staffs (a federal court, the Joint Chiefs) draws a bench once, when its vacancy opens, from the same generator under a vacancy-bench role, keyed on the seat and the day, and stores it with the campaign. It is never drawn by a selector, so waiting never yields a better candidate.
**Why:** One pool keeps faces familiar across surfaces, and generating it from a seed keeps every campaign reproducible. No charter seat is drawn from a judge's or a serving officer's life, so without the vacancy bench a court was offered politicians and the Joint Chiefs a civilian.
**Where:** `packages/engine/src/people.ts` (`generateWorldPool`, `candidatesForRole`); `bio.ts`; `appointment-bench.ts`; `packages/world/src/dataset/vacancy-bench-roles.ts`.

### 4.10 Fictional, faithful
No real living person is named anywhere a player can see. Each foreign leader gets an invented name that matches their real counterpart on the attributes in the leader table, and that table is never rendered. A successor the engine elects before or after the oath has no real counterpart and is held only to the seat's party rules. No real news organization appears in player-facing copy.
**Why:** The game is grounded in real governments without putting words in real people's mouths.
**Where:** `packages/world/src/dataset/real-names.ts`; `packages/world/sources/leader-table/`; `scripts/verify-leader-fidelity.mjs`; the content audit lexicon.

### 4.11 Every authored figure is sourced and dated
Authored figures come from public, checkable sources and carry their provenance. Provenance files live in `packages/world/sources/`. A derived figure says it is derived, and no screen presents a derived figure as if it were measured.
**Why:** The game may be wrong about the world. It may not be confidently wrong about which of its own numbers it made up.

### 4.12 One appointment pool and one nomination path
Every seat the Senate confirms, a cabinet chair included, is filled by a nomination through the Senate pipeline; there is no same-day appointment. Its candidates come from one pool that applies the seat's hard rules, then ranks by a life in what the seat hires, fit with the President and the record the Senate reads, and carries the reasons for each name, every one a fact the person's file already shows. A statutory rule is hard only once its text has been opened and cited; the legal-career floor for federal judges is the administration's standard and says so. A Supreme Court seat is never filled by default.
**Why:** Owner decision, 2026-10-13. Two processes for one chair priced the same act two ways, three rankings offered unfit names, and a preselected life appointment would let the game make the President's most lasting choice.
**Where:** `packages/engine/src/appointment-pool.ts`, `appointment-eligibility.ts`, `appointment-lens.ts`, `nomination.ts` (`openNomination`, `fillVacantOffices`); `packages/player-core/src/appointments/desk.ts`; sources in `docs/audits/2026-10-13-appointments/SOURCES.md`.

### 4.13 Office-holders die at life-table rates; the President does not die at random
A person in an occupied modeled office (a member of Congress, a governor, a cabinet officer, the head of a body below the cabinet, the Vice President, a foreign head of government) dies in office at the 2024 CDC/NCHS life-table rate for their age, scaled by the measured ratio for office-holders (0.35), drawn once per person and year on a keyed stream. Judges keep their own annual draw and are never drawn twice. Nobody without an office is drawn. Each office is then filled by its own lawful path: a House special election (which may change party, on the seat's lean and the national mood, calibrated to 19 of 132 specials since 2001), a Senate appointment or special election under the state's law, the state's line of succession (a successor elected on the governor's ticket keeps the governor's party; one elected separately, or a legislative leader, is of the party the state's lean gives), an acting first assistant for a cabinet or agency head where the law gives one (a board runs on its quorum), the Twenty-fifth Amendment's section 2 for the Vice President (the President nominates; the nominee takes office on confirmation by a majority of both houses; meanwhile nobody presides over the Senate or breaks its ties, and the Speaker is next in line), or the foreign government's own succession. A seat left empty counts as neither a yea nor a nay (5.18). White House staff are not drawn: no act in office hires a successor to a staff post. Foreign heads of government read the same US life table at the same ratio: no national life tables are carried, and at 0.35 the cast's 195 heads lose about 1.2 a year, under the 1.8 a year heads of state and of government died in office of natural causes since 2000, so the table is a check, not a fit. The President does not die at random.
**Why:** No one but a judge ever died, so no seat ever emptied and no margin ever moved. A random death of the President would end a campaign the player did nothing to lose; adding one is a separate design change. The vice presidency is never filled from the career bench: a career official seated there would be a Vice President nobody chose.
**Where:** `packages/engine/src/officeholder-mortality.ts`, `succession.ts` (`vicePresidentDied`, `agencyHeadDied`, `houseSpecialOdds`), `vacancy-law.ts` (`houseFlipChance`, `governorSuccessor`), `foreign-politics.ts` (`deathInOffice`), `judicial-vacancies.ts`; `cabinet.ts` (`CabinetDeparture` `"died"`, written through `appointments.ts#vacates`); the vice presidency in `institution-catalog.ts` (`OFF-VP`, `confirmedByBothHouses`), `nomination-stages.ts` (the House vote), `vice-president.ts` (`withVicePresident`, `withoutVicePresident`), `career-incumbents.ts#careerOffices`, `appointment-eligibility.ts` (the age of 35); `vice-presidency.test.ts`.

### 4.14 Removal follows the Court's holdings; directing Justice is the Attorney General's judgment
A commission's head is removable at will only where a holding says so: the FTC (*Trump v. Slaughter*, 2026-06-29) and the single-director CFPB (*Seila Law*, 2020). The SEC, FCC, CFTC, FDIC and NRC keep their protection and their refusal of direction, but Slaughter's reasoning (rulemaking with the force of law, enforcement and civil suits are executive power) reaches them, so the President may remove a member, with or without a stated cause, and each removal opens a legal exposure: the removed member decides within weeks whether to sue, and the merits are priced in the administration's favor (`REMOVAL_REINSTATEMENT_CHANCE`, 0.2, a design judgment). The Federal Reserve, the courts and adjudicators such as the NLRB keep their protection until the Court says otherwise. Directing the Department of Justice on casework is the Attorney General's judgment, not a statutory refusal; directing the IRS regarding a taxpayer stays barred (26 U.S.C. 7217).
**Why:** Owner ruling, 2026-10-25, on the institutional-powers lane's reading of *Slaughter*: the Court decided the FTC and said in terms that it did not decide the fate of officials not before it, so moving five other commissions to at will on its reasoning alone overstated the holding; refusing their removal outright would understate it.
**Amended 2026-10-25 (world dynamics Wave 3):** A removed member who sues (`REMOVAL_SUIT_CHANCE`, 0.85) opens one court case in the District of Columbia on the shared clocks: interim reinstatement is denied while the priced chance sits below even, the district court and the D.C. Circuit decide at the *Slaughter*-bound chance, and the Supreme Court's seated justices each vote at that chance spread by their own lean. A final win reinstates the member where the seat can be returned (alive, holding no other role, nobody confirmed to it) and otherwise declares the removal unlawful with back pay only; back pay carries no figure, since the data has no salaries. A member's final win costs the President 0.02 of standing, below an order struck down, and every final ruling writes a public feed line (a design value).
**Where:** `packages/engine/src/institution-catalog.ts` (`Reg.removalLaw`), `institutions.ts` (`OfficeDef.removalContested`, `InstitutionRuntime.contestedRemovals`), `career-incumbents.ts#removeOfficer`, `legal-exposure.ts` (`removalExposures`, `removalSuit`), `removal-court.ts` (`removalRemedy`), `directives.ts#isDirectionBarred`, `docket.ts` (`docketConstraint`); `law.probe.test.ts` R1 to R3.

## 5. Political geography and the electorate

### 5.1 A state's economic character is required and closed
Every state carries six economic axes summing to 1 ± 0.002 (`industrial`, `agricultural`, `energy`, `tech`, `services`, `defense`), plus `urbanization` and `federalDependence`. `SECTOR_AXIS` is exhaustive by type, so a new sector fails the build until it's assigned an axis.
**Why:** An optional field with 51 rows to fill gets filled by nobody, and an open vocabulary can't be validated.
**Where:** `packages/world/src/schemas/state.ts`; `packages/world/src/dataset/sector-axis.ts`.

### 5.2 Delegations are apportioned, never authored
The chamber composition is authoritative. Per-state delegations are apportioned from it by one writer, using largest remainder in `STATE_IDS` order, and must sum to it exactly.
**Why:** Two independent counts of the same seats is how a chamber ends up with a majority nobody voted for.
**Where:** `packages/engine/src/delegations.ts`.

### 5.3 Districts address content and the map, not the seat math
Congressional districts carry population, lean and holding party for the map, dossiers and content. Delegation seat math and vote counting never read them. A House special election reads its seat's lean (`seatLeans`), as the general election already does.
**Why:** A bill's vote count has never needed to know which district supplied which seat, and keeping districts out of it protects the vote math.

### 5.4 A state remembers, within a bound
A state carries at most `MAX_STATE_MARKS` grievance marks and `MAX_STATE_CLAIMS` claims. Eviction is fully ordered, `applyState` is the only writer, and marks decay.
**Why:** An unbounded log would grow every save and make every reader rescan history.
**Where:** `packages/engine/src/state-effects.ts`; `state-geography.ts`.

### 5.5 Lean reverts toward an anchor derived from marks
A state's lean reverts toward its founding lean plus `grievanceLean(marks)`, computed every week and never stored.
**Why:** One act is a shock that fades; a pattern of acts is a state that has changed. A derived anchor can't drift from the memory that justifies it.

### 5.6 Domestic acts declare who they hit
A domestic act carries a declared `DomesticSignature` (axes, sectors, urban, federal, values, magnitude, slug, reason) and is never inferred from prose. The type lives in the engine and content mirrors it. Routing is capped by `STATE_ROUTE_CAP` and `STATE_ROUTE_TURN_CAP`, with a movement floor below which nothing is written.
**Why:** Keyword-matching prose turns wrong data into plausible-looking wrong data. The caps and floor stop every act from nudging all fifty states a little.
**Where:** `packages/engine/src/domestic-signature.ts`; audit rules `unrouted-domestic-act`, `dead-grievance-gate`.

### 5.7 A party's beliefs are a reading, not a gate
Parties carry beliefs on the same three axes as a person's ideology, and the two majors must differ meaningfully on at least one axis. Beliefs feed dispositions, polarization and framing. No scenario condition gates on a party's platform.
**Why:** Content gated on a platform would go stale the day the platform is rebalanced, and nothing would show it.
**Where:** `packages/engine/src/party-beliefs.ts`; validator check `party-beliefs-distinct`.

### 5.8 Cohorts are material interests that overlap
The electorate is cohorts on overlapping axes. A person belongs to one cohort on each axis. A cohort exists only if a decision in Washington reaches its household through a named mechanism. On 2026-10-11 the owner added five axes to the original five (age, class, schooling, place, work): race and ethnicity, sex, nativity, disability and veteran status. They are drawn from published Census counts by state, and each new cohort is reached by a named policy channel (civil-rights enforcement, immigration, health and care access, disability programs, veterans' benefits, and the program reliance and exposure the Census data carries) rather than by a belief assigned to a kind of person. On 2026-10-12 the owner added religion as an eleventh axis with seven traditions (evangelical and mainline Protestant, Black Protestant, Catholic, other Christian, other faiths, unaffiliated). There is no Census source, so state shares come from the Cooperative Election Study 2020 and 2024 pooled, shrunk toward the Census division for thin states and raked by race to Pew's published composition (`docs/audits/2026-10-12-contested-issues/RELIGION-RESEARCH.md`). Status: accepted, not built.
**Why:** Policy lands differently on people in different circumstances, and a game about governing has to show where a program reaches and where it does not. The earlier rule (no race, sex or religion axes) was written to avoid cohorts defined by what a kind of person is like; that risk is kept by the guardrails below, not by leaving the dimensions out.
**Guardrails:** A cohort's politics come from its material channels (exposure, program reliance, attention, published turnout) and from what it has been measured to think (below), never from a belief vector inferred from identity. Its `spread` stays wide. No scenario or act is keyed to a demographic group by name; an act reaches a group only through a named mechanism in its domestic signature. §5.9 holds: no cohort, new or old, moves the headline approval figure. §5.10 holds: demography never derives a state's lean.
**Partisan baseline (owner, 2026-10-11):** each cohort starts from a measured partisan baseline: its two-party presidential vote share in sourced, dated survey data (the Cooperative Election Study, validated voters), applied relative to the President's party, with seeded per-campaign jitter inside the estimate's error. This is an observed outcome, not a belief vector inferred from identity: `beliefs` stay centered, and the baseline changes only where a cohort starts, never how an act reaches it. The baseline is calibrated so the share-weighted cohorts reproduce the headline, so §5.9 still holds.
**Why the baseline:** without it every group sat at the national figure, so a Republican President read the same among Black voters as among rural white voters, which no player would believe and no pollster would print.
**Measured issue positions (owner, 2026-10-12; amends the rule that a new cohort's beliefs sit at the center):** every cohort, on every axis, carries a measured position on each contested issue and a measured coordinate on the cultural axis (§13.1). Positions are the cohort's weighted support on survey items: the Cooperative Election Study 2020 and 2024 where both years ask the same question (abortion, guns, immigration, policing), and published survey figures by tradition where it asks nothing comparable (LGBTQ issues, religious refusals, school prayer, the death penalty, marijuana), labeled as outside estimates. The cultural coordinate is the mean progressive-side share across the abortion, gun and LGBTQ items, centered on all adults. Seeded jitter stays inside each estimate's error, as with the baseline. A contested act reaches a cohort through its measured position on the act's issue, weighted by attention; it still never reaches one by name. The positions are observed outcomes, not beliefs assigned to a kind of person, and figures are held to reasonable, not exact. Status: accepted, not built.
**Why measured positions:** with beliefs held at the center, the new cultural axis and the religion axis would never react to an abortion or same-sex-marriage act, which is the reason to model them. Religion separates groups on the cultural axis more than any other axis in the same data (`RELIGION-RESEARCH.md`, Results).
**Cohorts are mixtures of the blocs (2026-10-13; amends the calibration above):** each cohort is the national bloc composition (§5.12) tilted toward one party until the cohort's two-party vote at a neutral record equals its measured baseline. The baseline therefore falls out of the blocs; nothing adds it to the cohort's reading and nothing calibrates the cohorts back onto the headline. Across an axis the tilted mixtures re-aggregate to the national blocs only approximately (within 0.06 in the tests), which is a stated tolerance rather than a defect: a one-parameter tilt cannot match both the baseline and the aggregate, and the baseline is the measured fact.
**Where:** `packages/world/src/schemas/cohort.ts`; the baseline and the state-by-cohort reading in `packages/engine/src/state-cohort-sensitivity.ts` and `state-cohort-opinion.ts`; the tilt in `packages/engine/src/cohort-blocs.ts`.

### 5.9 Cohorts can't move the headline
The headline is the share-weighted sum of the five blocs (§5.12) and never reads a cohort. A cohort reaches an election only through turnout: harm to a cohort moves the turnout of the blocs it is made of, the President's own blocs staying home and the opposition's coming out, summed across axes and capped at 0.04 per bloc. The ballot weights each bloc's vote by its turnout at full size, and the turnout driver it reports is that ballot against the same ballot at habitual turnout.
**Why:** A cohort layer that could move approval would be a second electorate that disagrees with the number the player was shown all term. Turnout as composition is the one channel through which who was hurt decides an election, and the old displacement read 0.002 of the vote at most.
**Where:** `packages/engine/src/turnout.ts`; `cohort-blocs.ts#blocTurnoutShift`.

### 5.10 Geography and demography never derive each other
State lean and state cohort composition are authored independently. They cross once, in one direction: geography weights cohort strain, and cohorts never write lean.
**Why:** Deriving lean from demographics would claim demography predicts partisanship, and it would move lean twice for every routed act.

### 5.11 Every movement carries its reason
Every grievance mark and every cohort strain carries a mandatory reason sentence, and a cohort's top grievance can always be narrated.
**Why:** A figure that moves with no stated cause is a hidden number, and the game doesn't ship hidden numbers.

### 5.12 The electorate is five partisan blocs
The country is each party's identifiers and leaners plus the independents who lean neither. Their shares are drawn once per campaign inside a symmetric range around Gallup's 2025 party affiliation (identifiers 27 and 27, no lean 10, leaners 35 split by a leaned margin of up to 6 points either way), so neither party is favored on average. Every bloc reads one valence (the six judgments, weighted by salience, as logits) through one logistic formula whose partisan intercept and valence slope depend on the polarization stock (§5.13). The headline is the share-weighted sum of the blocs; the ballot is their turnout-weighted vote with party loyalty; the President's caucus reads their own identifiers. The engine keeps five blocs; a player is shown three (the President's party with its leaners, the independents, the other party with its leaners). The coalition figures (workers, business, elites) are retired.
**Why:** One scalar headline could not let the caucus read the President's own voters, could not let polarization act on the people it acts on, and could not carry issue agreement by party. The leaner share of partisanship is not identified by approval data, so five blocs are shown as three. The owner chose the symmetric seed, three shown blocs and retiring the coalitions on 2026-10-13.
**Where:** `packages/engine/src/electorate.ts`, `opinion.ts#selectElectorate`; fit and checks in `docs/audits/2026-10-12-approval-model/`.

### 5.13 Polarization is a bounded stock that reverts to the era
Polarization is the era's anchor (1.0 for the 2020s founding, the only founding for now) plus a drift between −0.15 and +0.25. A divisive week closes 2% of the room to the ceiling, a unifying one 2% of the room to the floor, and the drift halves every 104 weeks. One week's rise is capped at what one fully divisive week does. It no longer damps mood deltas or compresses the headline; it acts once, inside the bloc formula.
**Why:** The old figure decayed to zero on its own by about week 155, so every long campaign ended in a country with no division. A structural rise took two decades in Pew's series; one President should move it a little and not reverse it.
**Where:** `packages/engine/src/polarization.ts`; the weekly ceiling in `turn-loop.ts`.

### 5.14 An honest, failing President can be removed for inability
Besides the grave-charge ladder, a President whose own identifiers' approval stays below 0.70 for a season (91 days) faces a declaration of inability by the Vice President and a majority of the cabinet, and is removed if two thirds of each chamber uphold it. The President's caucus breaks by the same own-identifier reading the grave-charge path uses. A failed declaration cannot be repeated for 182 days. Both thresholds are design judgments with no roll-call anchor, labeled where they are declared.
**Why:** The owner asked on 2026-10-13 that pure incompetence be able to end a presidency. The Twenty-fifth Amendment's fourth section is the constitutional path for it; it has never been used, so nothing calibrates when a party would use it.
**Where:** `packages/engine/src/inability.ts`; `removal.ts#removalPhase`.

### 5.15 Force and sanctions divide the blocs by party
An administration's record of force (a war it is party to, invasions, blockades, strikes, embargoes and sanctions over the last 26 weeks) enters each bloc's approval as an issue term from the bloc's measured preference for military strength over diplomacy (Pew, September 2019: Republicans and leaners 46%, Democrats and leaners about 10%, all adults 26%; the no-lean figure is inferred). The term is centered on the share-weighted mean, so it divides the blocs and does not by itself make force unpopular; what force costs everyone arrives through the judgments.
**Why:** The owner chose a hawk/dove term now (2026-10-13). Positions on force are sourced before the term is weighted; the act weights are design judgments.
**Where:** `packages/engine/src/force-issue.ts`; caps under §13.9.

### 5.16 Salience fires on change, and recurring writers are budgeted
A story makes its judgment louder when it breaks or gets a quarter worse, and for eight weeks after; then the country has priced it in, and the level still bills its judgment through the targets. While a story is loud, its judgment revises at 0.20 a week instead of 0.06 only in the direction the story pushes it (`SALIENCE_PUSH`; every story in the table is bad news for its judgment, so the fast pace applies while the judgment is above its target). A loud judgment climbing back toward its target recovers at 0.06, so a fresh shock in one judgment cannot speed an unrelated recovery. The household price channel is unchanged: crude and pump shocks reach prosperity through CPI and the price-level scar (`commodity-pressure.ts`), and no separate gasoline term is added. The world's recurring background writers may move a judgment by at most 0.05 a week beyond the weekly revision; a decision's one-time consequence is not budgeted. Each cause reaches approval once: conditions bill their judgments through targets and salience only, and security bills order's change from its rest, not its level.
**Why:** Steep moves where warranted come from fast revision of what is on the front page, not from direct writes that sum without limit; a condition billed through five paths was the same cause charged five times.
**Where:** `packages/engine/src/opinion.ts#selectSalience`, `opinion.ts#SALIENCE_PUSH`, `opinion.ts#driftOpinion`; `turn-loop.ts#capTurnMood`; `opinion-causes.ts`.

### 5.17 A war's rally is an impulse on the record, not a security term
A war the country is party to adds a decaying impulse to the valence every bloc reads, so each bloc rallies by its own slope and a more polarized public rallies less. A war the country is drawn into adds 2.2 valence units halving over 20 weeks; a war this government opened by invading adds 1.86 halving over 7 weeks, the fit to Gallup's Iraq 2003 series; a war it opened by blockade or by force the other side answered adds nothing. Every live rally together is capped at 6 units. A public rallies less to each war after the first: the war's rally is divided by `1 + 1.0 × S`, where S sums, over every earlier war the country was party to that earned a rally (ended wars included), `0.5^(weeks between openings / 52)`. These are planning values, not fitted: the only anchor is ordering (Iraq 2003 rallied well below Afghanistan 2001). Nothing is stored; the factor is derived from the conflict ledger. Serial invasions are reachable only with a congressional authorization per war (an unauthorized second invasion is refused by the War Powers check) and are limited by readiness. Security no longer carries a rally term. The other rally classes (homeland attack, standoff, decisive operation, national emergency) are not built.
**Why:** The owner accepted the fitted rally sizes and asked for a damped, Iraq-fitted rally for a self-started war once the blocs landed (2026-10-13). A cheap act of war that bought a dozen points would make every blockade an approval purchase, so those openings keep no rally.
**Where:** `packages/engine/src/opinion-war.ts#rallyFor`, `opinion-war.ts#rallyFatigueFactor`, `opinion-war.ts#RALLY_FATIGUE`, `electorate.ts#valenceOf`.

### 5.18 Congress counts the members seated, and a limit on the President is counted against him
Both Houses decide by the members present and voting, so a seat left empty by a death counts as neither a yea nor a nay: majorities, the Constitution's two-thirds bars and Senate cloture are taken over the seated members (`seatedOf`). A measure whose effect is to take an authority from the President (a resolution terminating his emergency, a disapproval, a bar on force, a binding limit) is counted from the other end, whoever sponsors it: the yeas are members voting to bind him, the opposition votes for it on party lines and his own caucus defects only as the chamber turns against him.
**Why:** A vacancy counted as a nay moved a margin no real chamber would. And counted from the President's end, an opposition resolution to end a hurricane declaration drew 211 of the President's 224 House members (owner ruling, 2026-10-25).
**Where:** `packages/engine/src/congress.ts` (`seatedOf`, `floorThreshold`); `member-votes.ts`; `senate-tie.ts`; `bill-stages.ts#restrainsThePresident`; `congress-votes.ts` (`sharesAgainst`); `legislative-acts.test.ts`; `succession.test.ts`.

### 5.19 The midterm moves the House by a share of the seats at risk, fitted to the post-1946 record
The President's party's House change at a midterm is a bounded fraction of the seats it holds in competitive states (the opposition's, in a good year): `(ballot share − 0.61) × 1.4`, bent toward a ceiling of 0.31 of the seats at risk. The opinion lane measured about −30 seats at 40% approval, −10 at 60%, +6 at 70% and about −48 at the floor, at the ballot share of a term with six laws, across starting seats of 230 to 260 and the state map (−28 to −35 at 40%). The residual the record leaves (a standard deviation of about 17 seats) is not modeled; the check is a band. The Senate keeps its own sensitivity (0.05) and structural drag (0.04); presidential-year coattails are unchanged. Planning values, not causal estimates.
**Why:** The old 0.12 sensitivity, shrunk by state lean, gave −18 seats at 40% approval and −33 at the floor, below every postwar low-approval midterm but one, and ignored how many seats the party held (2010: 255 held, −63; 2014: 201 held, −13). Gallup's table of eighteen midterms, 1946 to 2014 (Jones, September 12, 2018), fits −97.7 + 1.41 seats per point of approval, r = .66.
**Where:** `packages/engine/src/election-seating.ts` (`HOUSE_MIDTERM`, `midtermHouseSeatsMoved`, `seatsAtRisk`); `elections.test.ts`; `opinion.probe.test.ts` 4.

## 6. Economy, conditions and emergencies

### 6.1 Rates have one law
`packages/engine/src/macro.ts` is the only module that computes a rate's next value from its previous value (`nextValue`).
**Why:** Two writers of a rate's evolution put the equilibrium in two places that can't see each other.

### 6.2 Acts write levels; standing programs move resting points
A discrete act may write a rate's level through `apply()`. A standing program shifts the target on the paths in `RESTING_POINT_PATHS` instead of writing the level each week. Any new rate path inherits that split.
**Why:** A weekly level write against proportional reversion settles at the authored figure divided by the reversion rate, not at the authored figure.
**Where:** `packages/engine/src/policy-stats.ts`; `policy-program.ts` (`policyRestingOffset`).

### 6.3 Sub-national readings steer; they never bill twice
A state or city reading may decide where a nationally billed effect lands, and may be shown to the player. It may never add a second charge for a cause already billed at the nation.
**Why:** Double billing makes one event cost twice.

### 6.4 A condition doesn't write what it's gated on
If a condition's onset reads a figure, its impact may not move that same figure. It bills the channels downstream instead. Every macro figure has one writing phase.
**Why:** A condition that writes its own trigger is a self-exciting loop that can never close.

### 6.5 A state the country lives through is a condition
Anything that persists across weeks, worsens, bills weekly and makes its own content more likely is a `Condition`. That covers economic and political states such as recession, a fiscal crisis or unrest, as well as disasters. It is never a bespoke mechanic.
**Why:** One mechanism keeps the flag, boost, director and Record behavior identical for every kind of trouble.
**Where:** `packages/engine/src/condition-kinds.ts`; `condition-onset.ts`.
**Amended 2026-10-25 (world dynamics Wave 3, home events):** a third family, home events (`HOME_EVENT_CONDITIONS`: cyberattack, work stoppage, bank failure, mass-casualty attack, wrongful detention), uses the same record. Each opens from a sourced base rate and an eligible cause read off the campaign, at home only, and only for the cases that reach a President; the ordinary run of each family (intrusions, strikes, bank closures, detentions) is the population the case is drawn from, not a record per event, so more incidence does not mean more stops. A home event is never Stafford-eligible and asks no state for relief unless it happened in one.
**Where (amendment):** `packages/engine/src/condition-home-events.ts`; `condition-kinds.ts` (`conditionFamily`); `operators.ts` (an intrusion crew picks its victim).

### 6.5a The home queue reads the country's own record
At home, an acute condition opens at the annual rate of its kind in the national record (`US_SIGNIFICANT_HAZARDS_PER_YEAR`: NOAA NCEI billion-dollar events 2005 to 2024, OpenFEMA earthquakes, HHS disease emergencies), cut to the costliest four in ten for the billion-dollar series (`HOME_SIGNIFICANT_SHARE`, 0.4, a design value), as a weekly hazard `1 − exp(−rate × 7/365)` times the season weight. Inside the eligibility gate a hazard lands where its record says (state and city exposure tables), not where people live, except heat and disease. A nationwide hazard reaches one Census region of eligible states; a nationwide epidemic reaches every state. Impact fatality and loss per event are fitted to the same series. Abroad is unchanged.
**Why:** a population weight put one city-scope tornado in ten in New York City, and a nationwide heat wave filed a governor's request from every state.
**Where:** `packages/engine/src/condition-onset.ts`; `us-placement.ts` (`nationFootprint`); `impact-catalog.ts`; `packages/world/src/dataset/state-hazards.ts`; `packages/world/sources/hazard-exposure-sources.md`.

### 6.5b A request is not a declaration
A governor asks for a major-disaster declaration only from a state the hazard reached, and only when the state's share of estimated public damage reaches half the statewide per-capita indicator ($1.94, 44 C.F.R. 206.48(b)(1)); the request carries a capacity finding when the damage reaches the indicator. Whether a declaration is lawful is decided when the President declares.
**Why:** one nationwide heat wave filed 51 requests.
**Where:** `packages/engine/src/obligations.ts` (`statesOwedBy`, `governorAsk`); `stafford.ts`.

### 6.6 Commitments are standing state
Aid, arms, deployments, basing, sustainment and programs are durable `Commitment`s. They are charged weekly through ordinary packets and read by finance, forces and content.
**Why:** One-shot effects can't leave the durable world the next decision finds, and scarcity of forces is the gameplay.

### 6.7 Emergency powers require a declaration
Emergency authority comes only from a declared emergency. A declaration is scoped to the nation or one state, is refused without a live condition there, carries a weekly standing cost, and lapses unless renewed. Suspending habeas corpus also requires the enacted act of Congress.
**Why:** The heaviest instruments in the game must be crossed by the President, never by the weather.
**Where:** `packages/engine/src/emergency.ts` (`declareEmergency`, `liveCauses`); `orders.ts` (`needsCongress`).
**Amended 2026-10-25 (world dynamics Wave 1, authority episodes):** authority belongs to an episode, not to the latest instrument. A statutory clock (`Campaign.authorityClocks`) keeps its opening date through reissued measures and changes of country, sector or declaration scope, and an emergency episode keeps every predicate it covered, so narrowing a national declaration to any state it already covered cannot open a fresh clock. Enacted limits bind issuance, renewal, authorization and lapse through that same clock. A genuinely new predicate can open another episode. For Section 122, the modeled national trade-deficit predicate must have a recorded recovery before recurrence can open another 150-day episode; this is a proxy for balance-of-payments distress, not a claim that a goods deficit establishes the statutory finding. A national emergency can be terminated by a joint resolution enacted through the ordinary signature, presentment-default or veto-override path, and the resolution's target is fixed at introduction. New declarations use civil anniversaries and a ninety-day continuation-notice window (50 U.S.C. 1622(d)). The Emergency Powers Limitation Act caps an episode at ninety days unless Congress renews the named episode; presidential reissue cannot reset that cap. Every reader of an emergency's deadline (the board, the calendar, renewal cases, action comparisons, construction issuance and later contracting) reads `authorityDeadline`; none computes its own.
**Why (episodes):** a President could reset Section 122's 150 days by reissuing the tariff (a fresh 15% measure was accepted at day 160), and a declaration ran on at day 126 under an enacted 90-day limit. Consumers that kept their own `renewedTurn + 52` arithmetic showed a January 2030 lapse for an authority that ended in April 2029.
**Where (episodes):** `emergency.ts` (`authorityDeadline`, `emergencyAuthorityClock`, `selectDeclaredEmergencies`, `emergencyExpiryPhase`); `tariff-orders.ts` (`tariffAuthorityPhase`); `legislation.ts` and `legislative-acts.ts` (`authorityDays`, target-pinned resolutions); `day-step.ts`; `order-subjects.ts`; `military-construction.ts`; `law.probe.test.ts` T1 and E1. The separate IEEPA register (`Campaign.externalEmergencies`) is not on this clock.

### 6.8 Force acts are priced from sourced operation costs
A military rung's money is the units it sends times what one costs, read from sourced, dated US operation costs in today's dollars: the exercise, the carrier group's and the destroyer's day, the strike sortie all-in, the brigade's move and its weekly cost in the field. A rung that keeps forces out bills its weekly cost as a standing commitment, and the act's own price covers only what the commitment does not. Another government pays the US price times its military spending per active service member over the US figure, a derived index. The distance factor applies to the up-front price only. The projection carries the basis (`costBasis`), and the screen states it beside the figure.
**Why:** A share of output times a rung weight priced a limited strike on Venezuela at $35 billion, more than a hundred times what its sorties cost. A price the player can check against the world is a price they can plan against.
**Where:** `packages/world/src/dataset/force-cost-anchors.ts` (with `packages/world/sources/force-costs-sources.md`); `packages/engine/src/force-costs.ts`; `packages/player-core/src/act/force-cost-words.ts`. The weekly bills of a federalized Guard and of active-duty troops sent into a state read the same table (`domesticGuardWeek`, `domesticBrigadeWeek`; §6.22).

### 6.9 A blockade is an act of war that stands only while the force does
Military rung 3 introduces forces into hostilities: it starts the War Powers clock and opens a war the first time it lands. What it stops of the target's trade is read each week off a standing record that lifts with the force (a recall, the war's end, or the force terminated), never written onto the target's stats, and a second blockade of a coast already held adds nothing. A failed act of force can end with the target hitting back, which opens a war, only where the target has the forces to answer; a failed exercise or forward deployment puts no force on the target to fire on and offers no hit-back. A war the country's own government opened by blockade, or by an act of force the target answered, buys it no rally. No act of force (blockade, strike or invasion) is offered by anyone against a government with a declared arsenal and the means to deliver it (`arsenal.declared` not false and `deliveryTriad`); below that line a nuclear defender stiffens the odds of all three rungs and the player may still take the bet.
**Why:** A blockade of a state's ports is an act of aggression under General Assembly Resolution 3314, Article 3(c), and the old one-time cut to imports never recovered and compounded under repeats (Russia's imports fell to 0.07 of founding after eleven blockades in one term). Once a blockade opens a war, a rally on that war would pay the President in approval for ordering it. The engine has no sourced outcome base for force against a nuclear power, and symmetric rules gave China a cheap blockade of the United States; the owner chose refusal by data over a hand list of countries (2026-10-13).
**Where:** `packages/engine/src/instruments-military.ts` (`blockadeEffects`); `blockades.ts`; `congress.ts` (`MAJOR_FORCE_RUNGS`); `war-powers-report.ts` (`INTRODUCTION_BY_RUNG`); `opinion-war.ts` (`ralliesTo`); `force-failure.ts` (`hitsBackHarder`); `instrument-gates.ts` (`outsideNuclearDeterrence`, and `declaresDeliverableArsenal`, the one test the force gate and `regime-acts.ts#nuclearArmed` both read); `resolution.ts` (`DETERRED_RUNGS`).

### 6.10 A strait reaches a price only through sourced flow and bypass
A chokepoint moves a commodity market only through a row in the world's chokepoint flow table, which states the commodity's share of world supply through the strait and the share a pipeline or sea detour can carry instead, each read off a dated page. A war with any government on its shores contests it, and the price path is charged on the flow that cannot go around. A strait with no sourced bypass has no price effect. Passage through a contested strait is decided flag by flag: each government on its shores fighting in the war lets through cargo bound for itself, its co-belligerents, a government aligned with it either way, or one it reads at a disposition of 0.3 or better, and never cargo bound for its enemies in the war; the price is charged only on the share of the strait's cargo it stops, read from the world's cargo-by-destination table. Cargo the source files under a region, and every strait with no split on file, is stopped with any ship.
**Why:** A gross drop in transits is not lost supply: in 2024 the Bab el-Mandeb lost more than half its oil flow and most of it went round the Cape with little effect on Brent. An invented share or bypass would put a made-up number into every price the player sees. A closing government can let friendly ships through, and the owner chose per-flag passage now (2026-10-13); the countries whose cargo it stops are the ones that lose the supply.
**Where:** `packages/world/src/dataset/chokepoint-flows.ts` (with `seed/chokepoint-flows.tsv`) and `chokepoint-cargo.ts` (with `seed/chokepoint-cargo.tsv`); `packages/engine/src/commodity-registry.ts` (`routesFor`); `commodity-shocks.ts` (`routeShock`); `strait-passage.ts`.
**Amended 2026-10-25 (world dynamics Wave 1):** what a strait stops reaches economies by quantity as well as price. An exporter is paid the price only on what it still delivers. Cargo a contested strait strands (its dependence on the strait, net of the bypass, times the closure and the share of the strait's cargo bound for stopped flags) is lost at the growth cost every lost sale carries, and a government closing the strait is not stranded by its own closure. An importer whose flag is stopped goes short by its dependence on the strait, net of the bypass (`SHORTFALL_COST`, a planning value). A flag let through gets its cargo and pays only the world price. A barrel already lost to a war, a blockade or a measure is not stopped again at the strait, in the world's supply or in a nation's books; the strait's upstream loss weights each shipper by its exported share, so an importer's own production never counts. The shortfall is sized by the dataset's `geo.chokepointDependence`, not by cargo over consumption, until a sourced oil consumption series exists. **Superseded (Wave 3):** an exporter's stranded share and an importer's shortfall now read the strait's loadings and cargo against the country's own crude production and oil consumption (`NATION_OIL_GAS`, `CHOKEPOINT_ORIGINS`); `geo.chokepointDependence` remains the fallback for LNG and for a nation a table does not name.
**Why (amendment):** paid on price alone, Kuwait, Qatar and Iraq, whose exports cannot leave Hormuz, gained growth from its closure (+0.009 to +0.013 against Norway's +0.004), and a flag let through bore the same shortage as one stopped, against this rule's own reason. The dataset's energy consumption is primary energy in TWh and reads Japan at 0.96 Mb/d of oil against a real figure near 3.3, so it cannot be the denominator.
**Where (amendment):** `packages/engine/src/commodity-pressure.ts` (`energyGrowth`, `strandedShare`, `shortfallShare`, `SHORTFALL_COST`); `commodity-shocks.ts` (`contestedRoutes`, `upstreamLoss`); `economy.probe.test.ts` B3 and B4; `commodity-hormuz.test.ts`.
**Amended 2026-10-25 (owner ruling, world dynamics Wave 3): denial by a navy that does not hold the shore.** A government with no coast on a strait can stop cargo through it only by a standing blockade of a littoral government. Its denial reaches only cargo bound to or from that government, never the strait as a whole, and only where its forces can reach the strait (the reach and naval branch strength the blockade rung already gates on). It stops no third country's ships unless it is at war with that country. A US blockade of Iran stops Iran's own loadings and Iran-bound cargo; China's crude from Saudi Arabia still passes unless Iran, the littoral party, stops it.
**Why (amendment):** before it, a US blockade of Iran left passage to Iran alone, so China's 26 percent of Hormuz crude passed and nothing stopped Iran's own loadings by sea. The opposite shortcut, reading "US blockade" as "all Hormuz cargo stopped", would let one act take a fifth of world supply off the market. The rule follows the law of naval blockade: a blockade is aimed at the blockaded party's ports and trade, and neutral shipping bound elsewhere passes.
**Where (amendment):** `packages/engine/src/strait-passage.ts` (`offshoreBlockades`, `blockaderLetsThrough`: offshore deniers scoped to their blockaded target and to governments they are at war with), `blockades.ts#blockadeReaches` (a blockade stands only while its navy keeps the rung's reach and branch-strength gates); `commodity-shocks.ts#blockadeShocks` (the blockaded party's own loadings are its blockade supply loss, counted once); regressions in `strait-passage.test.ts` through the real blockade act.
**Built 2026-10-25:** in the current data the ruling changes nothing on the Hormuz path for a US blockade of Iran (no cargo row names Iran or a US enemy as destination); it bites where a destination row names the blockaded government or a blockader's enemy, and where a blockader's reach or naval strength fails.

### 6.11 A war charges the people sent, against the enemy they meet
A war's losses and strength read the people each government has in the theater: the President's government what it committed (never less than a corps), another government its home share, scaled by its lift when it attacks away from a shared border, a joiner its committed formations. Losses also read the enemy: only as many people are in contact as the smaller side brings, and a better force inflicts more. The dead and the wounded are kept apart at a sourced ratio by how hot the fighting is, the rate is fitted to Iraq 2003 to 2011 with the Gulf War held out, and the dead leave the population. A held front, below the 0.2 line, loses at the Korean static line's rate instead (about 0.38 killed a week per thousand in contact, 6.36 wounded for each killed). Civilians die in the defender's country at 0.3 of the defending side's soldiers killed. The President's government loses hulls sent toward an enemy that can fire on ships, one at a time, by the register's name and class; the hull leaves the order of battle and its deployment, and its dead count with the war's own. A collapse or a decisive offensive needs three to one on the strength scale.
**Why:** Charging the whole active force made every US war cost about 6,900 killed and wounded a week whatever was sent and whoever fought back, and the public read all of them as dead. A strength reading that clamped near 1 for most states made any US invasion of a small state an even fight, so no war was ever decided and no successor seated. The fought-front rate scaled down to the held line put a front held between India and Pakistan at 230 to 610 killed a week; Korea's divisions on a static line lost about half the fought rate's figure. The owner ruled that US hulls can be lost by name and class with crews unnamed (2026-10-13).
**Where:** `packages/engine/src/war-forces.ts`; `war-attrition.ts`; `war-tick.ts` (`sideStrength`, `DECISIVE_RATIO`); `warfighting.ts` (`combatQuality`); `opinion-war.ts` (`casualtyCost`); `hull-losses.ts` (with `packages/world/src/dataset/us-hulls.ts`); `war-calibration.test.ts`.

### 6.12 Reach is measured from where force can be mounted
Projection cost is measured from the nearest of the actor's capital, its installations abroad on the basing table and the capitals of its treaty allies, with the trip to an ally's soil charged at the share lift cannot carry. Every reader of reach (the rung gates, price, odds, timing, a joiner's reach and the war week) uses the same staging. No country is named.
**Why:** Measured from capitals, the gate refused Iraq, Afghanistan, Kuwait, Saudi Arabia, Korea, Japan and Germany while allowing Canada and Venezuela, the opposite of where the United States has actually fought from.
**Where:** `packages/engine/src/staging.ts`; `geography.ts` (`forceProjectionCost`); `instrument-gates.ts` (`projectionAccess`).

### 6.13 Other governments' coercion is rationed per term
Other governments' acts are rationed by family on one dated ledger: a cap on how many acts of the family the world makes in any 208 weeks, and a rest after each act on the thing it was done to. Acts of force (military rungs 3 to 5) are capped at 8 a term with a pair of governments resting 26 weeks, both planning values for the owner to set; strait closures (a war newly opened with a government on a priced strait's shores, where no war already contests it) are capped at 2 a term with the strait resting 104 weeks. The agent refuses a rationed act before it prices it. The President is never rationed. A new family declares its own cap and cooldown and needs no edit to the ledger.
**Why:** Pricing alone did not hold the tempo: one passive term held Brent above $90 for 73 weeks on a single Chinese blockade of Russia, and weeks above $90 rose from 56 to 133 across twelve terms once a blockade opened a war. The owner set the strait rate (2026-10-13).
**Where:** `packages/engine/src/npc-tempo.ts`; `coercion-tempo.ts`; `npc-agent.ts` (`weigh`); `npc-turn.ts` (`npcTempoRecord`).

### 6.13a A coerced government answers through the agent, inside the ledger
A government coerced by another holds a pending intent to answer it, derived from the ledger's last 13 weeks and decaying at a 42-day half-life. The intent is scaled by relative power, temper and trade exposure, and spent by answering. Answers to answers raise half as much, and the three closest partners take up only first moves. It raises the agent's score for proportionate answers and the government's chance of the week. It never bypasses 6.13's ledger or the three-actor cap. Restraint, protest, delay and asymmetric answers remain valid answers. Alignment brakes pressure on a partner, scaled by the instrument's coercion and the actor's reliability.
**Why:** China answered US targeted sanctions zero times in twelve weeks on every seed, because nothing in the agent read being coerced, and aligned partners were pressed more per pair than neutrals.
**Where:** `packages/engine/src/npc-response.ts`; `npc-agent.ts` (`response`, `restraint`); `npc-turn.ts` (`takesInitiative`, `npcActorsThisTurn`).
**Source check (2026-10-25):** NPC military rung-2 acts roughly doubled over five idle seeds (130 to 244), mostly in-kind answers to shows of force; acts of force, wars and the cap are unchanged. The coordinator left that tempo for the balance checkpoint. The response weights are planning values.
**Amended 2026-10-25 (world dynamics Wave 3):** a US tariff order enters the book as an economic rung-2 act on its target, and the trade book's drawn answer to it (landed or pending) counts as the target's answer at once, so a tariff is answered once. An answer spends the intent in proportion to the pressure it answers (`intent × max(0, 1 − answered / pressure)`). Where the act to answer is the only cause, the agent's only candidates against the coercer are answers. The wire names an answer as one (`wire.ts#answerLine`).

### 6.13b Border clashes are an episode hazard, not a rhythm
A pair willing to clash clashes on a weekly hazard `1 − exp(−λ)`, drawn per pair and week: a base of 0.01 (`CLASH_BASE_RATE`), raised by an episode of recent clashes and shows of force between the pair (`EPISODE_GAIN` 2.5, fading at a 56-day half-life over 26 weeks), zero for 4 weeks after a clash, and damped to a tenth where the side that would be hit sits under a defense treaty whose scope covers it and the attacker is outside, half that again after a consultation in the past year. Each pair draws once a week, from its more willing side. A clash under a guarantee files one consultation per guarantor body, which marks each member against the attacker for a year. No clash opens a war; a clash-to-war path would be a new 6.13 family with its own cap. All rates are planning values.
**Why:** the gate's draw was keyed by the pair alone, so a willing pair fired every time its 12-week cooldown lapsed: India and Pakistan, Russia and Ukraine, Armenia and Azerbaijan clashed nine times each at a fixed interval, and NATO's flank saw about 50 clashes in two years. Idle worldwide clashes fell from about 55 to about 5.5 a year per seed; no armed-clash series was opened, so the base rate is the dial.
**Where:** `packages/engine/src/world-events.ts`; `world-event-templates.ts`; `geopolitics.probe.test.ts` A3.

### 6.13c Leaving an international body is a procedure
A member that wants out of a body first files a notice under the body's own exit clause (EU 104 weeks, CSTO 26, AU 52, Mercosur 9, CPTPP 26, OPEC+ 4, SCO 52); at the first summit after the notice has run it weighs again and either leaves or takes the notice back. The weighing reads grievance (mean trust, grudges and coercion from members inside the response window), trade with the other members, on a defense body the guarantee's worth against the worst outside threat, and the exit's cost. A body without an exit clause (ASEAN, the GCC, BRICS) is left only by repudiation, at an extra cost that legalism weighs against. A compact fractures on a war between members or an overt campaign past rung 2 between them, not on an ordinary quarrel.
**Why:** a member left any body the week its trust fell under the line, so OPEC+ lost 14 members and the EU 6 in four idle years.
**Where:** `packages/engine/src/world-membership.ts` (`NOTICE_WEEKS`, `withdrawalVoteTerms`); `blocs.ts#fracturesIn`; `events.probe.test.ts` BR-04.
**Source check (2026-10-25):** the notice periods are the founding texts as commonly cited; none was opened in this pass.

### 6.14 A war's money is billed once
A war the President's government pays for through a standing deployment toward the war or the enemy is billed through that deployment alone: no share of output on the fiscal statement on top, and no weekly draw on the President's authority in the war tick. A war it fights with nothing committed keeps the share of output, and so does every other government's war, whose commitments are never billed.
**Why:** The deployment is priced from the units sent (6.8) and drawn on authority inside the discretionary line, so the same dollars were also billed as 2% of output a year and as a weekly share of authority.
**Where:** `packages/engine/src/fiscal-impulse.ts` (`warOutlayShare`); `war-tick.ts` (`attritionEffects`); `commitments.ts` (`commitmentPhase`).

### 6.15 A government falls to an operation only through a path it could fall through anyway
Regime action runs one of four operations, and a fifth act, an indictment, makes one of them possible. Coup support adds a decaying sponsored term to the existing coup hazard, readable above the stability ceiling but scaled by the target's own proneness, its armed rival's ambition and its distance from full order, so a country at full order gives a sponsor nothing. Political action lowers the sitting government's hold on its next selection and raises its parliament's impatience. A lethal operation, offered only on a ground the law leaves open (an armed conflict with the target or an imminent threat from it, never a treaty ally, and a standing finding), seats the charter's successor through the existing succession; the order that once amended the ban on assassination (Executive Order 12333, §2.11) is gone. Capture is no longer covert and is not always offered: it is a use of force that serves an open indictment the Justice Department filed against the leader, needs the War Powers gate, opens the War Powers record and the 48-hour report, and is never secret; a treaty ally is out of reach unless a war stands between the two. Every standing operation carries a weekly exposure hazard (the President's own opens a story and the inquiry that follows it), lapses after 104 weeks, and closes when its target government falls, leaving the successor leaning toward the sponsor for a time. Other governments start at most six a term worldwide, at most one per pair in two years; US treaty partners may be targeted from the start. A government that declares an arsenal it can deliver is refused as a target; an undeclared arsenal (Israel's) is not refused, and stiffens the odds through the deterrence drag. Status: the first slice; hold, contenders, recognition and occupation strategy are not built.
**Why:** The owner asked for regime change through the right channel with a successor the player can see (2026-10-13: capture always, the lethal option only behind a signed order with exposure, inquiry and scandal; one to six foreign-started operations a term, allies targetable). Reusing the existing hazards keeps Canada and Haiti different without a new state machine.
**Amended 2026-10-18 (owner direction):** capture moves off the covert ladder onto an indictment record (the 1989 Panama and January 2026 Venezuela precedents were overt military operations carrying out an existing indictment); the lethal option raises counsel's opinion as a hard case on the assessment sheet.
**Where:** `packages/engine/src/regime-acts.ts` (`nuclearArmed`, through `instrument-gates.ts#declaresDeliverableArsenal`), `regime-rung.ts`, `regime-dials.ts`; the cap on the shared tempo ledger, `coercion-tempo.ts#NPC_REGIME_OPERATIONS`; hooks in `foreign-politics.ts`; the order in `order-families.ts`.

### 6.16 A scenario's money is priced from what the federal government has spent on weeks of its kind
A reply's financial band says how its money is authorized (the executive alone, a vote of Congress, an emergency designation, a standing program); the week's severity says how big it is. Each pairing is priced from one sourced appropriation of that kind and size, carried to the world's dollars by CPI-U (a routine supplemental is the Flint lead response, a critical one Harvey's first supplemental), times the horizon, and scaled by output for another government. A reply that states its own arithmetic (quantity times unit cost times weeks) is priced from that instead, and the audit warns when it lands an order of magnitude from its band. Every price, and a reply's authored treasury obligation, is drawn around its center from the campaign's seed, log-normal and skewed toward overrun, so the same program costs differently in two campaigns and the same on a replay. Values the game chose rather than read are labeled planning values.
**Why:** A band priced as a fixed share of output charged every supplemental $58.6 billion, the size of Sandy's package, so a six-month waiting-time program at one port cost the same as a hurricane, and every reply's cost was the same round figure in every campaign.
**Where:** `packages/world/src/dataset/scenario-cost-anchors.ts` (with `packages/world/sources/scenario-costs-sources.md`); `packages/content/src/scenario-cost.ts`; `packages/content/src/scenario-audit-cost.ts`; `packages/engine/src/scenario-accounting.ts`.
**Accounting extension (2026-10-14):** new authored borrowing is a rounded estimate before authorization. Successful commit makes a separate reproducible outturn draw and books it at national-books precision. Record retains the estimate, booked amount, variance and source. A stated basis sums separately sourced federal components and declares coverage/exclusions; incomplete coverage is rejected by the audit. The bounded variation remains explicitly labeled planning assumptions, not a fitted appropriation/outturn distribution. Fixed contractual borrowing and legacy frozen decisions keep their original terms; historical estimates are never reconstructed.

### 6.17 A measure reaches as far as its authority and its currency
An economic measure in force is one scoped record: the sector and goods it reaches (an embargo reaches the whole economy), the share of those goods' sales the companies it names carry, whose sales it stops, the authority it was taken under, and how far past the imposer's own market it reaches. World supply and the target's own economy both read that record, flow by flow: per imposer the heaviest measure on a flow, across imposers independent shares of what is left, so a measure is charged once per flow and cannot reach a seller's whole output in one place and only its sales to the imposer in the other. Only the administration's designations and two-way embargoes reach past its own trade (`DOLLAR_REACH`, a planning value), because they run through the currency most cross-border trade settles in; buyers divert only as far as the goods can be replaced elsewhere (their substitutability). An asset freeze blocks holdings and stops no third party's purchases. An import ban and another capital's measure reach only their own trade. An export control stops none of the target's sales; it costs the target the inputs denied and the imposer its own sales. Evasion wins reach back while a measure stands and outlasts a lift, read off the register's dates, so lifting and reimposing, or refiling under another sector, buys no fresh bite. A measure whose authority no longer stands (a blocked account whose emergency has ended or whose order has lost its authority) charges nothing and stays on the register. Targeted sanctions and asset freezes need the legal authority (an office holding the power, for the administration), either a trade lane or that reach, and a measure the register can file that does not duplicate one standing. Tariffs and embargoes keep the trade gate. No country is named. An inherited program is dated at the authority it rests on and scoped as its text scopes it; a list-based program designates people and moves no trade. Each economy is charged only the change since its published resting figure: what was in force at its growth anchor's vintage is already in its founding numbers.
**Why:** the trade gate refused US sanctions on Iran, North Korea, Cuba, Belarus and Nicaragua (117 of 195 governments had no US lane), while world supply gave a US measure the seller's whole output and the target's own growth read only its sales to the United States, so a US embargo cost Iran 0.000002 of growth. The record also dropped the measure's sector, so a sanction on one sector constrained every commodity the target sells, and inherited programs dated at the oath read as new and were charged on top of the founding figures that already carried them.
**Where:** `packages/engine/src/external-pressure.ts` (`Coercion`, `coercionsInForce`, `stoppedShare`, `measureCut`, `financialReachOf`, `evasionOn`, `embedded`, `DOLLAR_REACH`, `EVASION`); `commodity-shocks.ts` (`sanctionShocks`); `commodity-registry.ts` (`CommodityDef.sector`); `instruments-economic.ts` (`designationAuthority`, `designationReach`, `fileableMeasure`); `trade.ts` (`measuredSector`, `denialMeasureKind`); `opening-world.ts` (`INHERITED_PROGRAMS`); `order-authority.ts` (`isTradeMeasureEffective`); `economy.probe.test.ts` B8; `geopolitics.probe.test.ts` D0.
**Amended 2026-10-25 (world dynamics Wave 2):** a lifted measure's price wedge comes back out as it went in, over the same 26 weeks. A partner's answering tariff cuts American sales at `RETALIATION_RESPONSE` (6.2, fitted to ERS's 76 percent); the odds of that answer are read off the same cut, and the partner answers on salient goods its buyers can replace, where the answer bites. A measure that cuts a partner's sales to the United States frees `substitutability` of them to untouched suppliers over `DIVERSION_HALF_LIFE_DAYS` (91 since Wave 3, fitted to Census goods trade: about half of China's lost 2018-2019 sales to the United States were bought elsewhere within the year), capped by each supplier's export headroom. A Taiwan or Malaysia war constrains US output through semiconductors as a critical input (`external-pressure.ts#chipShortfall`): the US shortfall is each supplier's share of recorded US chip imports times what its wars and a blockade take of its output, times one less the substitutability (0.2), charged on the chip-dependent sectors. The sector list and the magnitude are planning values.
**Source check (2026-10-25):** `DOLLAR_REACH`, `EVASION` and the substitutability-as-diversion reading are planning values. Through the real rung-3 act, a designation on Iran costs it less growth than China's full embargo (−0.0020 against −0.0076); the flow-level ordering holds, the economy-wide one is B8's open magnitude. Russian metals are filed as an import ban (the exchange-services reach is not representable), and Myanmar's MOGE designation reads the whole LNG sector as covered.

### 6.18 Impoundment is by special message, on days of continuous session
Withholding appropriated money is a rescission or deferral message under 2 U.S.C. 681-688. A rescission holds the money while Congress considers it; Congress counts it once, on day 25 of continuous session, and unless a bill is enacted the money is released by default on day 45, after which the same line cannot be proposed for rescission again that fiscal year. A deferral is allowed only for contingencies, savings or as a law provides; the Comptroller General reports on every message and may sue for release of an unlawful one. A rescission whose 45 days would end after the fiscal year is a pocket rescission, shown as contested and costing the Hill more, and it lapses with the year. Days of continuous session follow current practice: pro forma sittings keep a recess in session, so the count runs on the calendar, and only a new Congress convening restarts it.
A second policy deferral of the same account in a fiscal year, after the Comptroller General has found one unlawful, costs the Hill 0.02 more for each earlier finding, capped at the first finding's 0.08 (`REPEAT_UNLAWFUL_DEFERRAL_STEP`, a design judgment).
**Why:** The President had no lawful way to withhold money. Owner ruling (2026-10-25): pro forma sittings count as continuous session, as they do today, so the window runs close to 45 calendar days.
**Where:** `packages/engine/src/appropriation.ts` (`proposeRescission`, `proposeDeferral`, `projectRescission`); `impoundment.ts`; `congressional-session.ts`; `budget.ts` (`selectSpendableBudget`, `budgetPhase`); `law.probe.test.ts` C1.

### 6.19 A tariff line is a partner and a category, and it carries its law, not odds
A tariff line is one partner and one category of goods. Leaving a category out of an order excludes all of it for that partner, and the screen says so; there are no product lines finer than a category. Each line names the statute it rests on and its citation, and carries no challenge odds: trade measures do not enter the litigation mechanism.
**Why:** Owner rulings on BL-190 (2026-10-25), option (a) for both. An invented challenge rate would break DESIGN.md's rule against fabricated probability, and a coverage share per line would need a product model the game does not have.
**Where:** `packages/engine/src/trade.ts` (`TradeMeasure.statute`), `tariff-statutes.ts` (`TARIFF_STATUTES`); `apps/player/src/world/act/PlanTerms.tsx`; `law.probe.test.ts` T2.

### 6.20 The petroleum reserve opens through two doors in the statute
A full drawdown of the Strategic Petroleum Reserve needs a finding of a severe energy supply interruption, or the United States' obligations under the International Energy Program (42 U.S.C. 6241(d)(1)). A limited drawdown needs no such finding: it answers a shortage of significant scope or duration and may not exceed 30 million barrels or 60 days, nor take the reserve below 252.4 million barrels (6241(h)), and it is allowed once per shortage. The reserve is carried in barrels from the week of 2026-10-16 (282.7 million, EIA). Other IEA members' barrels are not modeled. Neither drawdown earns receipts, and a reserve once drawn stays drawn.
**Why:** a lever that needed a severe interruption left the President nothing for a smaller shortage the statute lets him answer, and a release that could be repeated for one shortage would be a lever without a limit.
**Where:** `packages/engine/src/commodity-levers.ts` (`projectLimitedRelease`, `releaseLimitedReserve`, `LIMITED_DRAWDOWN`, `SPR_OPENING_BARRELS`); `state-world.ts` (`ReserveState.limitedFor`); `packages/player-core/src/economy/market-levers.ts`; `commodity-levers.test.ts`.

### 6.21 A Security Council resolution binds other governments and authorizes force abroad; it is never law at home or a result in the field
The Council adopts a substantive draft on nine votes with no permanent member voting no. An abstention is not a veto. A procedural question needs nine and carries no veto. A party to a dispute abstains on a recommendation. A recommendation binds no one, sanctions bind members, a force authorization permits member states to act and obliges none. No resolution gives the President authority inside the United States, which comes from Congress, and none changes the odds or the outcome of the force it authorizes. The Council is not mirrored onto `Nation.memberships`: sitting on it is not a bond between its members.
**Why:** Articles 25 and 27 of the Charter; Article 42 authorizes and the Article 43 agreements were never made; the Council sits in no chain of command. A resolution read as authority or as victory would pay the President for a vote.
**Where:** `packages/engine/src/security-council.ts`; `packages/world/src/dataset/orgs-cradles.ts` (`ORG-UNSC`, `Organization.council`).
**Status (2026-10-25):** the vote and its effects are built and exported; nothing in play calls them yet, and the member positions are planning values that the founding relationship graph does not yet support (`geopolitics.probe.test.ts` E).

### 6.22 Federal force at home moves only on its statute's predicate
Every coercive locale act (property surge, immigration operation, task force, Guard federalization, Insurrection Act proclamation and troops) signs a catalogue order behind the scenes, and that order record is the legal instrument. The Attorney General reviews it, a state or a private party can sue over it, an interim ruling can enjoin it, and the President can rescind it, on the same machinery every other order runs on. The orders live in `LOCALE_MISSION_ORDERS`, not in `EXECUTIVE_ORDERS`, so the policy desk never offers one on its own; each is reached only through its act and that act's predicate. Troops and a federalized Guard are real formations: the commitment is bound to the state and to the order record it was sent under (`authorizedBy`), and it lapses the next week if the order is enjoined, rescinded or struck down. Rescinding inside the first two weeks still bills the remainder; a court's pause or strike-down owes nothing.

- **Insurrection Act, two steps.** Troops need a proclamation (10 U.S.C. §254) issued an earlier week, still inside its four-week window, on one of three grounds, and the troops act reads that proclamation's ground. §251: the governor assents and unrest reaching the state is at 0.4 or worse. §252: unrest placed in the state is still at 0.3 or worse (the missions that made the suit possible also ease it while the court decides) and a federal court has granted Justice an injunction enforcing federal law that the state has let stand, with no state answer on the unrest since the grant. §253: unrest placed in the state is at 0.6 or worse, the governor does not assent and the state has not answered the unrest in the last six weeks. National unrest opens §251 only; §252 and §253 read unrest placed in the state. The Posse Comitatus Act (18 U.S.C. §1385) bars the troops past the mission the proclamation's section states.
- **The Guard, 10 U.S.C. §12406(3).** Following *Trump v. Illinois* (2025), federalizing opens only on an invasion (the United States is the defender in a war), a rebellion (insurgency pressure at 0.2 or worse), or the regular forces having been tried and unable: a live proclamation in the state, Insurrection Act troops there at least two weeks under an order still operating, and unrest still at 0.5 or worse. A declaration or a protest is none of them. The troops act stands in for the Insurrection Act's own call on the militia (§§252-253), which the game does not model separately. One federalized Guard and one troop mission per state, never both ordered the same week.
- **Surveillance stays refused.** "Order surveillance of residents" is refused in every case, citing 50 U.S.C. §1812 and Executive Order 12333 §2.3, and the desk shows it as the reason, not a button. The lawful neighbor is the investigative priority, a memorandum to the Attorney General that Justice may or may not carry (28 U.S.C. §509), and collection under a FISA or Title III order Justice obtained: "Conduct surveillance under the court's order" opens only while such an order granted for the state is running, and a narrowed order raises the incident odds.
- **Court orders are applied for through Justice, and the ruling stays hidden until the court gives it.** The President directs Justice to apply (a search warrant, a Title III interception order, a FISA order, or an injunction enforcing federal law); only a carried instruction files. The application leaves a flag naming its kind and state with the odds the desk showed, never the answer. The court's answer is drawn on its own clock, the week it gives it, and only then written as a ruling flag. A denial starts a four-week cool-down, and a sealed denial can leak. A lost or narrowed injunction counts toward the loss count legal exposure reads.
- **Weekly Guard and troop costs are read from sourced anchors,** not literals. The federalized Guard bills a 3,000-member call-up at the Congressional Budget Office's $18 million to $21 million per 1,000 members a month (midpoint $19.5 million, 2026 dollars), about $13.5 million a week. Troops bill the average weekly rate of the active-duty border deployment of November 2018 to January 2019 ($132 million over 12 weeks, 2018 dollars, carried to 2026 by CPI-U), about $14.5 million a week. "Ask the governor to deploy the Guard" is priced on the same Guard rate for 3,000 members over eight weeks. The call-up size, the 12 weeks, the up-front moves and every probability are planning values and are labeled so.
**Why:** Until this change the acts were locked, so a President facing unrest had only relief and requests. Opening them on a looser reading would make troops the cheap fix for unrest, and the courts have said the opposite: *Trump v. Illinois* reads §12406 as reaching only where the military could lawfully execute the laws and could not. Making each act a suable order means the cost of overreach arrives through the same suits, pauses and removal pressure as every other order, and keeping the predicates in the record means a protest or a declaration can never stand in for a statute. Hiding the court's answer until it rules keeps the game from showing an outcome the player could not yet have known.
**Where:** `packages/engine/src/locale-acts.ts` (the catalogue), `locale-missions.ts` (predicates, mission attention, `LOCALE_REFUSALS`), `locale-act-effects.ts` (`takeLocaleAct`, `takeHomeAct`, `localeActProjection`), `locale-mission-orders.ts` (`LOCALE_MISSION_ORDERS`), `court-orders.ts` and `court-order-records.ts` (applications, odds, rulings), `mission-interim-relief.ts` (the interim ruling against a mission order), `commitments.ts` and `state-commitments.ts` (`authorizedBy`, `MISSION_MINIMUM_WEEKS`), `order-subjects.ts` and `state-orders.ts` (the `locale-mission` subject), `force-costs.ts` (`domesticGuardWeek`, `domesticBrigadeWeek`); `packages/world/sources/force-costs-sources.md`.

## 7. Content and generation

### 7.1 No generation at runtime
All player-visible prose is generated or written ahead of time, audited, and shipped. The game makes zero model calls during play. If no authored content fits a slot, the surface shows an honest empty state.
**Why:** Determinism, offline play, bounded cost and content that can be checked before a player sees it all depend on this.

### 7.2 One gate for every driver
Every batch clears the same validator before it can publish, whatever produced it: the session driver, OpenRouter, an image backend or a human. Jobs are files under `content/jobs/`, with progress and spend journaled so an interrupted run resumes without spending again. Paid runs require typed owner confirmation.
**Why:** A gate one driver can skip isn't a gate, and spend stays a decision made at the moment of spending.
**Where:** `studio-cli` (`content validate`, `jobs/spend-authorization.ts`); `scripts/verify-publish-gate.mjs`.
**Externally drafted batches (owner, 2026-10-12):** a batch written outside the repository from the authoring kit (`studio scenarios kit`) enters through `studio scenarios ingest`, which refuses a file written against a stale kit and runs this same gate. The agent ingesting it may fix mechanical defects only, returns craft defects to the author, and may then review it independently, publish it into the local corpus, bake it and commit locally. A batch that agent rewrote for craft is no longer independently reviewed and stops before publish. **Batches drafted in the repository (owner, 2026-10-12):** a drafting session may publish the same way only after a review by a fresh, independent context it did not draft in, a subagent or a separate session at a model tier at least as strong as the drafter's; where the harness cannot start one, the session stops before publish and leaves the batch ready for review with a one-line handoff. Push and deploy stay the owner's in both cases. **Why:** independence is between drafting and reviewing contexts, not between people, so either case keeps it; and a batch should not wait on the owner for a step the gate and the review already decide. **Where:** `skills/scenario-ingest/SKILL.md` (the publish tail), `skills/scenario-generate/SKILL.md`; `studio-cli/src/scenarios/kit*.ts`, `ingest.ts`; the committed kit in `content/kit/`, held by `scripts/verify-kit-current.mjs`.

### 7.3 Content ships with the player
The scenario corpus is baked into the player build, so a fresh install is fully playable offline. The player doesn't depend on a live content service.
**Why:** Offline play and reproducible campaigns need the pool to be part of the build.
**Where:** `packages/player-core/src/content/bundled-corpus.generated.ts`.
**Source check (2026-10-10):** `packages/contracts/src/content.ts` still describes CDN shard paths that the player never fetches.

### 7.4 Every decision costs something
No option ships with no cost, no opponent and no ripple.
**Why:** A free option isn't a decision.
**Where:** audit rule `costless-position`.

### 7.5 Gate on bands and conditions, not raw figures
A scenario reads bands, conditions and derived readings rather than absolute bounds on figures a rebalance moves.
**Why:** An absolute bound, such as a treasury figure on a $27T economy, passes the audit and reaches no player.
**Source check (2026-10-10):** the audit refuses a set of absolute-bound shapes. A general refusal for any figure that has a band isn't built.

### 7.6 Content never names a nation unless it declares a set piece
Scenarios bind their counterpart at runtime. A scenario that names a specific nation has to declare `setPiece` with a reason and an owner, and generic text never names a nation.
**Why:** A nation-specific scenario can only be cast one way.
**Where:** `packages/content/src/scenario.ts` (`setPiece`); audit rules `undeclared-set-piece`, `nation-name-in-generic`.

### 7.7 The engine writes deed flags; content only reads them
Deed flags follow a closed grammar (`deed:` and `deed-received:` for content; `deed-toward:` and `deed-from:` for the engine only). The engine emits them at the act's commit point, and only for acts the player made or received. Content may gate on the unbound forms. It may never write a deed flag, and never gate on a bound one.
**Why:** A deed flag records an act the resolver actually resolved. One written by content is a forged record, and a misspelled gate is silently unreachable.
**Where:** `packages/engine/src/deeds.ts`, `resolution-deeds.ts`; `packages/content/src/scenario-deed-flags.ts`; `scripts/verify-deed-reachability.mjs`.

### 7.8 A family pins its cast at the opener
A scenario family is an arc whose counterpart and place are pinned the week its opener appears, not when it is answered (owner, 2026-10-13). Beats and the close bind to that pin and never re-rank. The pin exists from the raise but is not a running story: a beat whose family has not been answered isn't live, and the pin stays out of the Record's running arcs. An answer makes the thread live and keeps the place it was raised in. An opener that goes unanswered leaves a pinned thread, dropped (not closed, since nothing was dealt under it) once it is `FAMILY_LAPSE_DAYS` (112) old, so raised openers cannot accumulate over a 416-week campaign. A family that goes `FAMILY_LAPSE_DAYS` without a beat after it opened lapses as an ending nobody chose.
**Why:** A follow-up that re-ranks can arrive about a country the President never dealt with, and a story that changes town between scenes reads as a different story. Pinning at the raise means the story has one place whether the President answers, defers or ignores it.
**Where:** `packages/engine/src/scenario-families.ts`, `scenario-family-effects.ts`, `scenario-family-lapse.ts`; `packages/player-core/src/conversation/scenario-cases.ts` (the raise); audit rules `family-without-opener`, `family-two-openers`.

### 7.9 An unreliable briefing is played fair
Only a claim marked single-sourced or disputed can prove false. The tell always appears in the prose, the false rate is low and fixed, and a confirmed claim is never overturned. The reveal names the check that would have caught it, and the verdict is derived from the seed and scenario id rather than stored.
**Why:** Doubt that skill can't resolve is noise, and noise teaches players to stop reading.
**Where:** `packages/content/src/scenario-intel.ts`.

### 7.11 A projection is a staff forecast, not the future
A projection runs the real engine rules on a copy of what the government believes, never on the true campaign: hidden values (other governments' agendas and traits, unread nations, uncaught covert activity, true figures behind published ones) are replaced by the government's assessment, or by a draw from what is plausible for that kind of nation where there is none. The relevant adviser's competence and the government's intelligence coverage set how wide the forecast's band is, and an adviser's known bias may lean it, said in their dossier and played fair under §7.9. Every forecast names its source and confidence, and the Record keeps it against what happened. An exact projection from the true state exists only in God Mode.
**Why:** a forecast from the true state leaked what only God Mode may show, and let a player detect a hidden agenda by which way the runs broke. A real President decides on a staff's forecast, and the quality of the staff should show where the decision is made.
**Where:** `packages/engine/src/modeling-projection.ts`; the projection slot in `packages/ui-web/src/ChoiceList.tsx`.

### 7.12 Intelligence is issued evidence with explicit recipients
Collection stores a dated report with findings, confidence and gaps. A report
survives the end of its tasking without remaining current evidence forever.
Collection success and operational exposure are separate outcomes. Sharing
passes a particular report, including its uncertainty, to named recipients;
organization membership alone grants no access to a government's private
information. Domestic collection and dissemination require their own authority
and cannot be legitimized by a useful result. Person-level collection is bound to a person the campaign already holds and to a case the engine opened from an incident; a foreign person is taskable only through a pathway the authority manifest sources, and a person in the United States is never taskable by the President, only referred to the Attorney General.
**Why:** knowing one fact cannot reveal a whole government, and a later world
state cannot rewrite what the President or an ally was told.
**Where:** `intelligence.ts`, `collection-report.ts`, `security-effects.ts`,
`state-selectors.ts`; player-core's collection reports and the Security screen.

### 7.10 The glossary is authoritative and bundled
In-game definitions are the source of truth and ship with the build. They feed search and inline term links. An external page is never the source of a definition.
**Why:** An external page can change, die or contradict the game, and it doesn't say what a term means for the player's decisions.
**Where:** `packages/player-core/src/glossary/`.

### 7.13 A scenario recurs by what kind of matter it is
A unique incident (`once`) happens once a campaign. An arc member follows its family. An episode-bound scenario (one that binds a subject, such as a report, trade measure, bill, judicial vacancy, court case or oversight matter, or gates on a running condition) comes back only for a new episode and never inside the class cooldown. Recurring business rests ninety-one calendar days (thirteen weeks, `RECURRING_REST_DAYS`) from the later of its last raise and its last answer or explicit decline, so a President who sits on a matter still gets the full rest after dealing with it; deferral, expiry and withdrawal do not restart the rest (restarting on a deferral would reward deferring), and the days are counted on the calendar because thirteen turns can span as few as eighty-five. An answer that left no case behind rests from the end of the week it was given in. (Owner-delegated ruling, 2026-10-25, challenged by an independent review.)
**Why:** a template that could return six weeks after it was raised brought the same question back ten times inside ninety days in two years of answering everything.
**Where:** `packages/content/src/scenario-director.ts` (`recurrenceKind`, `recurrenceAllows`); `packages/player-core/src/conversation/scenario-recurrence.test.ts`.

## 8. Player platform and package boundaries

### 8.1 One universal Expo player: iOS, Android and the web, hosted by Electron on the desktop
The player is one Expo application (`apps/player`, Expo Router, React Native, Tamagui) that ships to iOS, Android and the web from one source tree. Electron packages the same app's web export for Windows, macOS and Steam. The legacy React DOM player (`apps/web`, `packages/ui-web`) is frozen and is deleted when the universal player reaches route parity; no new feature lands in it. Owner direction 2026-10-16 ("The application stack needs to enable delivery to ios, android, and web. I want to use Expo + Tamagui"), superseding the browser-first rule of 2026-10-08.
**Why:** A President must be able to play on a phone, a tablet and a desktop, and the stores are where phones get apps. One React Native tree with a web export serves all three without a second UI to keep in step, and the simulation never changes to suit the glass. The earlier Expo player was retired because Metro could not follow pnpm's isolated layout; the workspace now hoists (`.npmrc`) and pins one React (root `pnpm.overrides`), which is what that retirement lacked.
**Where:** `scripts/verify-renderer-boundary.mjs` and its proof, the `packages/ui` and `apps/player` blocks of `eslint.config.mjs`, `apps/player/metro.config.js`.

### 8.2 Package boundaries

| Package / app | May depend on | Must not depend on |
|---|---|---|
| `packages/engine` | `packages/world` | React, React Native, Expo, Tamagui, DOM, Node I/O, network, Electron, Steam, any other workspace package |
| `packages/world`, `packages/content` | platform-neutral TypeScript | renderers; neither owns the other |
| `packages/player-core` | engine, world, content, contracts, design | React, React Native, Expo, Tamagui, DOM, Electron, Steam |
| `packages/design` | nothing renderer-shaped | React, React Native, Tamagui, Electron |
| `packages/ui` | React, React Native, react-native-svg, Tamagui, design; Expo's font, haptics, blur, gradient and image modules | a router, Electron, Steam, engine, player-core: it draws view models it is handed |
| `apps/player` | player-core, design, ui, engine, world, content, Expo | Electron, Steam, React DOM, `packages/ui-web` |
| `apps/desktop` | Electron, player-core storage, steamworks.js in main only | any player UI of its own |
| `apps/web`, `packages/ui-web` | legacy, frozen until deleted at parity | React Native, Expo, Tamagui, Electron, Steam |

**Why:** These boundaries keep the simulation portable and the host thin, and keep the design system reusable by any screen without knowing where its data came from.

### 8.3 Electron is a locked-down host
Renderer windows run with `contextIsolation: true`, `nodeIntegration: false` and `sandbox: true`. Desktop capabilities reach the renderer only through the typed `window.administrationDesktop` bridge.
**Why:** Electron's security guidance forbids Node in the renderer.
**Where:** `apps/desktop/src/main.ts`.

### 8.4 Steam is additive
`steamworks.js` lives only in Electron's main process. The browser build and a non-Steam desktop build remain fully playable, including offline.
**Why:** The store is a distribution channel, not a dependency of play.

### 8.5 Layout adapts on width, never on platform
There is one route tree. Phone, tablet and desktop differ in layout, never in what can be done. Screens never branch on a platform flag; layout reads the width through the design system's media tokens (`phone` below 768, `tablet` from 768, `desktop` from 1024, `wide` from 1440). Where a platform genuinely draws differently (the map's GL engine, the animation driver, the device vault) the difference lives in a `.native.ts(x)` / `.web.ts(x)` pair inside `packages/ui` or `apps/player/src/host`, behind one interface. [DESIGN.md](DESIGN.md) governs everything visual.
**Why:** A platform fork in a screen is two products to keep in step; a fork behind one interface is one product with two drawings.

### 8.6 The studio is not the player
`apps/studio` is a localhost-only internal console built from plain ES modules and a hand-written dev server, with no sign-in. It shares engine, world, content and studio-cli code, never the player's runtime.
**Why:** The studio is one operator's tool and has no reason to carry the player's stack.

### 8.7 Single player, no ads
Each campaign is one player's world. There is no multiplayer and no advertising.
**Why:** The game is a private presidency, not a shared or ad-funded space.

### 8.8 One map, drawn in the page where geography answers the question
Every map in the player is one `MapView` with one lens registry and one palette, set inside the page as a framed panel with its legend as the key, a list view built from the same lens rows, and every region a door to its own screen. A screen shows at most one. The lens registry is renderer-neutral and lives in `packages/player-core`; `MapView` lives in `packages/ui` with two drawings behind one interface: MapLibre GL on the web (`maplibre-gl`) and MapLibre Native on iOS and Android (`@maplibre/maplibre-react-native`, which needs an Expo development build rather than Expo Go). A new reading on a map is a new lens in the registry, never a new renderer. Tile grids, hand-drawn SVG geography, per-screen map components and a full-canvas background map behind a narrow inspector stay retired. Owner direction 2026-10-12, renderer split owner direction 2026-10-16.
**Why:** Five map patterns had grown, each with its own colors, scale and interaction, so the same reading looked different from screen to screen and the numbers beside a map could disagree with it. One lens contract read by both drawings keeps the map and its table on the same rows on every device. A lens scale must fit the data it draws.
**Where:** the lens registry in `packages/player-core`; `MapView` in `packages/ui`. Until the universal player's map lands, the legacy web `MapView.tsx` and `map/lenses/` remain the reference.

### 8.9 Visual-first layers and deliberate presidential authorization
Owner direction, 2026-10-12. Every player route and nested state is in scope: visual models lead analytical work; consistent contextual help and target-only detail layers preserve surrounding context; System/Light/Dark is discoverable and persisted locally. Icons and accent encode meaning, and broader simulation data provides temporal, geographic and institutional context with honest uncertainty.

Consequential acts require a distinct review and explicit confirmation. An explicit terms review and visible task-specific resolution/recorded-result log provide presidential presence. The owner removed the simulated biometric/body-temperature ceremony on 2026-10-14; reviews open immediately and always require the named confirmation. No biometrics, sensor permission or paid service is required. Logs reflect actual recorded votes/events or labeled replay, never invented computation or premature outcomes. Existing deterministic simulation, access boundaries, exactly-once commit and save-only recovery remain authoritative.

**Where:** `DESIGN.md` and the application-wide contract/route inventory in `audits/2026-10-11-simulation-depth/PROGRAM.md`. Status: required implementation, not completed. This supersedes earlier light-only or inline-single-click interpretations. Current user experience requirements take precedence over aesthetic precedent; implementation remains local and incurs no additional cost.

### 8.10 Institutional emblems are authored, never official
Every institution, international organization and outlet the player meets carries an emblem: a seal for a department, agency, court or council, an emblem for an alliance or bloc, a masthead for an outlet. Each is an authored drawing in the player's own hand, faithful in what it signifies (the eagle, the shield, the scales, the motto, the colors an informed player expects) and never a copy of the official artwork. The player states once, in the Handbook and on the first seal screen, that the emblems are illustrations and imply no endorsement. Owner decision 2026-10-16.
**Why:** The real seals are recognizable and teach the player which institution acts, which is the point. Their official renderings carry legal restrictions on use that imply endorsement (18 U.S.C. §713 for the Great Seal and the President's seal; Paris Convention art. 6ter for intergovernmental emblems), and a commercial game sold through app stores must not appear to speak for any of them.
**Where:** the drawings in `packages/ui/src/seals/` (a parametric heraldic system of 49 devices), the registry in `packages/player-core/src/seals/` (129 bodies and 18 outlet mastheads), and `scripts/verify-seal-coverage.mjs` with its proof.

### 8.11 Classified material is marked the way the government marks it
A document the fiction treats as classified carries its level as a banner at top and bottom, in the conventional colors (green UNCLASSIFIED, blue CONFIDENTIAL, red SECRET, orange TOP SECRET, yellow TOP SECRET//SCI), with portion marks on paragraphs whose level differs from the banner. The level is the engine's (`ClassificationLevel` in `packages/engine/src/documents.ts`); the player never invents one. Classified material sits on the situation-room surface.
**Why:** The convention is recognizable at a glance and teaches something real about how the executive handles information (Executive Order 13526 and 32 C.F.R. part 2001). A marking that disagreed with the engine would claim a sensitivity the simulation never assigned.
**Where:** `packages/design/src/tokens/classified.ts` (contrast-tested) and `packages/ui/src/document/` (`Document`, `ClassificationBanner`, `PortionMark`).

### 8.12 Every power the President uses cites the law that grants it
A helper, a Handbook entry, a decision's terms and an order's face name the specific authority an act rests on: the constitutional clause, the statute by title and section (the War Powers Resolution, 50 U.S.C. §§1541–1548, not "presidential war powers"), the regulation, or the executive order. Each authority is one record in player-core's authority registry with its citation, plain-words summary, what it enables, what limits it, and a public source link; every citation in the player resolves to a record. Where the engine models an act as needing Congress, the record says which act would have to pass.
**Why:** The game teaches how power actually works. A paraphrase hides the limit that makes the decision hard; the citation lets the player read the text and see that the game is honest about it.
**Where:** `packages/player-core/src/authority/` (65 records; the Handbook chapter "The law"), `OrderAuthority` in `packages/engine/src/orders.ts`, and `scripts/verify-authority-citations.mjs` with its proof. Every order and directive citation resolves except the independent-commission memoranda (BL-165). The source links still need a manual check (BL-166). The federal-force acts add their own authorities: each mission order in `packages/engine/src/locale-mission-orders.ts` (`LOCALE_MISSION_ORDERS`: 40 U.S.C. §1315, 8 U.S.C. §1357, 28 U.S.C. §533, 10 U.S.C. §12406, §254, §251 and §§252-253), the acts that carry their own citation in `locale-acts.ts` (28 U.S.C. §509, 50 U.S.C. §1812 and §1805 with 18 U.S.C. §2518, 32 U.S.C. §502(f)), and each court-order kind in `court-order-records.ts` (`COURT_ORDER_KINDS`: Fed. R. Crim. P. 41, 18 U.S.C. §2518, 50 U.S.C. §1805, 28 U.S.C. §§1331 and 1345).

### 8.13 Today is the baseline; keeping things the same is not a choice
No screen offers "Do nothing", "Keep the same", "Leave it in place" or any other status-quo option as something to pick. Every option is drawn as its change from today: money from $0, each move from a line that stands for today, the odds as the chance the change happens. Not acting is approving nothing. Where waiting has its own consequence on a clock (an offer that expires, a story that runs), the screen says it as a line beside the options, not as one of them. A reply that is a real act in the story's own words (silence in a scandal, which the press reads) stays a reply. Options can be compared with each other across every goal, so the comparison a President makes is between paths, not between one path and standing still. Owner direction, 2026-10-16: "as a pattern keep the same I wouldn't expect an explicit choice for keeping the same; it's an inaction isn't it?"
**Why:** a status-quo card is a press that does nothing, so it adds a step, sits beside real options as if it were one, and takes the place where a second real option should be compared. Drawing every reading from today says the same thing without the extra choice.
**Where:** every comparison in the universal player draws on `packages/ui/src/review/Results.tsx`: the act workspace (`apps/player/src/world/act/`) and the shared `CompareAuthorize`, `ActChooser`, `CompareChoices` and `ActCompare`, none of which takes a baseline. The player-core producers (`ActComparison`, `ChoiceTable`, `PricedOption`, `DecisionComparison`, the shortlist, the lever and stance comparisons) carry no do-nothing column and say a clock as `waiting`. The forecast keeps one run with nothing approved (`modeling/choices.ts` `UNTOUCHED`) as the zero its alternatives are read from; no screen offers it. Status: in force (BL-233).

## 9. Saves

### 9.1 The engine owns the save format
Serialization is the engine's (`createSave`, `loadSave`). `SaveStore` and `StoragePort` live in `packages/player-core`. The browser stores saves in IndexedDB. Electron writes atomic files to `saves/manifest.json` and `saves/campaigns/`, with settings stored outside `saves/` so Steam Cloud can sync campaigns without machine preferences.
**Why:** One format serves every host, and preferences shouldn't travel with campaigns.
**Where:** `packages/engine/src/save.ts`; `apps/desktop/src/file-storage.ts`.

### 9.2 Five active administrations
A player holds at most `MAX_ACTIVE_CAMPAIGNS` = 5 active campaigns.
**Why:** Owner decision. It bounds storage and keeps the library legible.
**Where:** `packages/player-core/src/persistence/save-store.ts`.

### 9.3 Absence in a save reads honestly
A new campaign field is optional on load, and its absence is read as what an older save truthfully means: an empty memory, no history recorded, nothing moved. A migration never reconstructs a history the save didn't record.
**Why:** Inventing a past is worse than starting a memory on the week the save loads.

### 9.4 The readable window is explicit
`CURRENT_SCHEMA_VERSION`, `MIN_READABLE_SCHEMA_VERSION` and `SUPPORTED_SCHEMA_VERSIONS` define exactly which saves load. Where a cheap migration exists, the window widens rather than refusing a save.
**Why:** A save either loads correctly or is refused clearly. It never half-loads.

### 9.5 The local save is the only copy
There is no cloud save. Steam Cloud may sync the save folder on its own terms.
**Why:** The game has no account-bound campaign storage to secure or reconcile.

## 10. God Mode, entitlements and services

### 10.1 God Mode is one entitlement-gated settings row
God Mode appears as a single row in `/settings`, shown only to players who hold the entitlement (owner decision, 2026-10-10).
**Why:** The sandbox is a disclosed option, not a separate product surface.

### 10.2 Every rule has one seam
Every world setting is a `RuleDef` in `RULES`, with one seam declaration and an exact list of the readers allowed to reach it. Rule values are read only through `ruleValue`. Projections touched by a rule return the ruled outcome with the unruled figure beside it.
**Why:** One seam is what keeps a projection and the week it projects from disagreeing, and what makes a rule's description checkable.
**Where:** `packages/engine/src/rules.ts`; `scripts/verify-rule-seams.mjs`.

### 10.3 Behavior never reads a mode flag
Behavior code never branches on `isGodMode`, `campaignStatus`, `GodModeState` or `Campaign.rules` directly. It reads a specific rule through its seam.
**Why:** A single flag with many meanings can't be suspended, explained or measured one rule at a time.

### 10.4 Status only rises
Campaign status runs Standard, then Story, then Sandbox, and never falls. Any paid option makes a campaign Sandbox for good; a Sandbox campaign is marked on the Record and never ranked. "Challenge" is a reading of current settings, not a stored status.
**Why:** The sandbox sells freedom, not a competitive advantage.

### 10.5 The engine never reads an entitlement
Whether a device holds the entitlement is a question for the app shell. The shell writes a dated suspension or resume packet through `apply()`. While suspended, paid rules read their default value, and nothing is deleted.
**Why:** The engine stays pure, and losing an entitlement mustn't destroy a campaign.

### 10.6 God Mode changes go through apply
Every God Mode change, including a direct world edit, is an `EffectPacket` with `source: "godmode"` through the ordinary gate. Sandbox rules may reach states normal play can't, which is why the campaign is marked.
**Why:** There is no second mutation path to audit or exploit.

### 10.7 Settings respect how actors decide
A setting reaches a decision only as an input (what an actor is or starts with), a slot (how many actors act), or, in Sandbox, a force applied after the actor's own decision, with the real figure shown beside it. It never multiplies an argmax score. It never writes a person's ideology, traits or immutable readings. It never gives a Doc Sync constant a per-campaign value.
**Why:** Every actor has to keep deciding from its own traits, or the world stops being explainable.
**Where:** `scripts/verify-biography-immutability.mjs`.

### 10.8 Rule ids are permanent
A rule id is never reused. An unknown, retired or out-of-range value reads as the rule's default, and a save is never refused for it.
**Why:** Saves outlive rule catalogs.

### 10.9 An entitlement is verified, never asserted
The client never grants itself an entitlement. A cached answer states its source, and an unreachable store never grants. Steam is the only storefront. A development override exists for testing, labels itself as such, and must be honored only in development builds.
**Why:** A self-asserted unlock is free, and an outage mustn't look like a purchase.
**Where:** `packages/contracts/src/entitlements.ts`; `packages/player-core/src/entitlement/entitlement-store.ts`.
**Source check (2026-10-10):** two things are unresolved. First, the contracts describe server verification of a Steam ticket through `services/api`, while a client-side Steam ownership check is unbuilt; the owner must choose one before the settings row ships. The development override is honored only in development builds (the W3 shell, `3f318133e`).

### 10.10 services/api stays narrow
`services/api` holds accounts, the entitlement verifier port and the starter-pack manifest audit. Logic that spans records or must be auditable lives there. It holds no simulation and serves no live content.
**Why:** The game is a static client, and a backend that grows game logic becomes a second engine.

### 10.11 Contracts are types only
`packages/contracts` holds shared API and DTO types and no logic. It depends on nothing app-specific.
**Why:** Shared types without logic can't make the client and server disagree on behavior.

## 11. Portraits

### 11.1 Faces are drawn from the record
Every face is a genome rendered at runtime to SVG. Generated people derive their genome deterministically from their portrait facets, seeded by their id. The President's face is stored in `portraitRef` as a versioned `face:` code. No image assets ship for faces.
**Why:** The pool has no ceiling, there's no generation spend, and a face can't disagree with the dossier beside it.
**Where:** `packages/world/src/schemas/face.ts`, `face-code.ts`; `packages/world/src/dataset/faces.ts`.
The renderer and the face-builder control model live in `packages/ui-web/src/portrait/` (`@admin/ui-web/portrait`).

### 11.2 The record decides the face
Facets render exactly. Nation and name tradition set dress, covering and headwear; the seat sets robes and uniforms. Only public traits shape expression, and hidden stats never show.
**Why:** A portrait that leaks a hidden attribute gives away information the player is supposed to work for.

### 11.3 A person ages without becoming someone else
Age, mood and treatment are render inputs. A person's genes never change during a campaign.
**Why:** A President who turns sixty in office should look older, not like a different person.

### 11.4 Face registries are append-only
Every registry the face codec stores positions in is append-only for as long as saves exist.
**Why:** Reordering a registry would silently re-dress every saved President.

## 12. Tooling, secrets and gates

### 12.1 Secrets come from 1Password through the existing launchers
Secrets are resolved at runtime with `op run`. Use `scripts/run.sh` (backed by `~/.config/claude/.env.op`) or `scripts/with-secrets.sh` (backed by `scripts/secrets.env`). References use vault and item ids, never titles or values. The standard is `~/Developer/Guides/Secrets-1Password.md`.
**Why:** It's one convention, rotation happens in one place, and no plaintext secret lands in the repo.

### 12.2 An image run names its model
An image job fails closed unless `IMAGE_MODEL` is set for that run. The runner records the model per item as `producer`. A journaled `spendUsd` is an estimate, never an actual bill.
**Why:** A resumed job mustn't silently spend on a model chosen months earlier, and a catalog mixing models has to be detectable.
**Where:** `studio-cli/src/cli.ts`; `studio-cli/src/jobs/runner.ts`.
**Source check (2026-10-10):** no surface in DESIGN.md consumes generated images today.

### 12.3 New registries follow the consumer-registry shape
Any new registry that keeps a growing surface honest (fields, units, metrics, rules) is walked against the schema by a paired test that fails on an unregistered entry.
**Why:** The pattern already works for consumers and units, and a different pattern is a different thing to maintain.
**Where:** `stat-consumers.ts`, `units.ts`, `metrics.ts`.

### 12.4 A gate ships with a proof twin
A new `scripts/verify-*.mjs` gate ships with a `-proof` twin that fails it on a planted fixture.
**Why:** A green gate has to mean the gate ran, not that it found nothing to read.

### 12.5 Reachability is checked by call site
Engine reachability is judged by where an act is called from, keyed by function and its discriminating parameter. Each row is due by a named wave.
**Why:** Matching on a return-type name lets a whole subsystem ship unreachable just because of what its result type is called.
**Source check (2026-10-10):** `scripts/verify-engine-reachability.mjs` still matches by return-type name; W0a step 6 rewrites it.

## 13. Contested issues

These rules govern the contested-issues program: how contested political issues enter the simulation as world content wired into the whole metric and impact system.

### 13.1 The ideology vector has a fourth, cultural axis
The ideology vector gains `culturalTraditionalProgressive`, and religiosity moves onto it off authority–liberty. It applies to persons, parties, cohorts, justices and alignment pulls. Foreign leaders read 0 and nothing consumes their value until a sourced leader-table column exists; this is a deliberate one-wave exception to §4.2, recorded here. Saves migrate by derivation under a version bump.
**Why:** Three axes put an abortion limit and a gun-control law on the same axis direction, so the real US coalitions cancel out.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §8.1.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.2 An issue is a small reviewed definition
An issue is an `IssueDef`, an engineer-reviewed record. There are 15 to 20 of them, and adding one is a design decision, not content. Each carries a plain-words question, a four-axis placement per direction, material channels, a 0–6 law-of-the-land scale, doctrine questions and a connection map.
**Why:** A small closed set keeps every issue modeled with care and lets the engine, the audits and the briefs all read the same definition.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §4.1.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.3 Issue state is standing state
Per issue the world keeps a federal statute step, a constitutional rule (floor and ceiling), per-state regimes, heat and pending seeds. State regimes revert toward an anchor derived from the state's lean, as in §5.5, and heat decays weekly. A state law outside the constitutional rule does not take effect; it becomes a challenge seed. A sustained flare-up is a Condition (§6.5); the issue itself is not.
**Why:** The law of the land is what content gates on and what rulings change, so it has to be state the engine owns, and flare-ups already have a home in conditions.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §4.2–§4.3.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.4 Contested content is three layers over issue state
The layers are occurrences (non-decision events, data-authored, shown as headlines), matters (`ScenarioDef` decisions on the desk) and instruments (player-initiated templates). Occurrences share the director's ranking function but have their own budget, stream key (§1.3), per-issue weekly cap and per-template cooldown. The feed folds them by issue and kind.
**Why:** The pool has to reach thousands of items, drawn the way foreign events are, and a one-pick-per-class desk cannot pace that.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §5.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.5 Instruments compile into a closed set of mechanics
An instrument is an order or memorandum, an agency rule, an enforcement priority, clemency, an administration bill, a procedure act, a DOJ suit against a state, or a nomination question. Content cannot invent a mechanic. Each template carries an authority citation with its source and date.
**Why:** Player-initiated acts must run through processes the engine already audits (§1.5), and a cited authority keeps a template from claiming a power the President does not have.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §5.3.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.6 Content declares qualitative levers and the engine prices them
The levers are issue step, heat (trigger kinds only), member pressure on a named live bill, primary risk, cabinet strain, service load, sector signature, third-party reaction, operator fuel, condition odds, scandal origin and pledge. The engine prices each from tables keyed by kind, severity and band, and no item carries numbers. Each lever obeys the mechanism-sentence rule, and each has a weekly cap per target. An item carries at most two levers beyond issue state, and every item declares `ImpactAgency`.
**Why:** Widening content's reach to Congress, people and foreign relations is safe only if writers never size an effect, and blame has to follow who acted.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §7.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.7 Every issue declares a connection map
The map lists systemic couplings (engine rules, always on, never authored) and the levers content may use. An item that gates only on its own issue and writes only its own issue is refused (`isolated-issue-item`). An item whose lever re-bills a systemic coupling is refused. Each cause has one owning system, which applies §6.3.
**Why:** Without the map a thousand gun items all become "Congress argues about guns", and a coupling authored twice bills the same cause twice.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §6, §10.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.8 The heat loop closes
An occurrence gated on an issue's heat may not raise that issue's heat; this applies §6.4. Only declared trigger kinds raise heat: violent incidents, rulings, the calendar and capped cross-issue spillover. Occurrence-driven movement of issue state, heat, cohort strain and state lean is capped per issue per week with a floor, following the `STATE_ROUTE_CAP` pattern.
**Why:** Heat feeds occurrences and occurrences feed heat, which left alone is a self-exciting loop.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §6.3, §9.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.9 Contested issues score mainly outside headline approval
Headline approval moves through the six judgments and, under a cap, through issue agreement. Each bloc's issue terms together may move it at most 0.30 in logits, and the issue terms together may move the headline at most one point either way: when a consensus act would pass each bloc's cap and still move the headline more, every term is scaled down until it does not. Issue approval polls and mobilization are derived readings, never stored (§1.10). A backlash term mobilizes a cohort by how far law moved from it times heat, damped by economic pain and war, with a floor so culture always carries some mobilization. There is no seventh "values" judgment.
**Why:** A culture act rarely moves a President's overall approval, but it decides turnout, Congress and the next election, and it does move the President's own party and the other one. The owner amended this rule on 2026-10-13 to per-bloc caps plus a cap on the headline effect, because per-bloc caps alone let an act everyone agreed with move the headline nearly two points.
**Where:** `packages/engine/src/opinion.ts#selectElectorate`, `electorate.ts#cappedIssue`. The first issue term is force (§5.15); the contested issues follow in docs/audits/2026-10-12-contested-issues/PLAN.md §6.1, §9.

### 13.10 Every issue is symmetric
Every issue ships at least one real move in each direction in every branch, plus a status-quo defense. A gate (`verify-issue-symmetry`) and a both-sides review record hold this. Disputed empirical effects are shown as adviser ranges (§7.11), never as the narrator's verdict.
**Why:** A game about governing cannot lean one way on contested questions, and a lecture on disputed facts would do exactly that.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §11, §12.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.11 The campaign opens on seeded law
Each campaign starts from a seeded variant of a sourced, dated law-of-the-land anchor. Each issue sits at most one step from the anchor and draws on its own stream key (§1.3). State regimes stay consistent with lean, and one judicial-era draw keeps the Court coherent across issues. Founding shows the inherited law in plain words.
**Why:** Replays need different starting law, but a random draw per issue would produce a country that never existed.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §8.3.
**Status (2026-10-12):** accepted by the owner, not built.

### 13.12 The courts bring cases to the President
An exogenous docket takes petitions from challenge seeds each October term, and rulings arrive in a June season. Justices vote on named doctrine questions with a philosophy correlated with but distinct from ideology. The case file shows each justice's record, never a hidden number. Case captions and parties are fictional; real clauses and statutes may be named.
**Why:** Today every case comes from the President's own act, and justices vote on ideology alone, which cannot produce the rulings a real term brings.
**Extended (2026-10-25):** every dispute about a presidential act runs through one legal-exposure stream, with exposure, filing, standing and parties, interim relief, merits, appeal and remedy as separate steps. Filing reads the act's salience, who it injures and who has authority to sue (a state through its attorney general); merits read the grounded reach, the bench and precedent; stage waits are drawn inside sourced bands. Each representation of a dispute links to one origin. Public misconduct findings enter as referrals with a dated charging decision, never as indictments by themselves. A removal from a contested commission seat is an exposure of its own (4.14). Tariffs carry their citation and no exposure (6.19). A background-docket ruling is a case between other parties: it moves later merits on its doctrine and is never read as a ruling against this President.
**Where:** `packages/engine/src/background-docket.ts` (aggregate term, six modeled doctrines, consequential rulings recorded as `CourtCase` with subject `background-docket`; precedent shifts later merits through `doctrineShift`), per-act exposure in `legal-exposure.ts` and `order-exposure.ts`, stage bands in `court-procedure.ts`. Doctrine voting on named questions with a philosophy distinct from ideology is still not built; justices vote by ideology distance from the doctrine's executive-power position.
**Status (2026-10-25):** aggregate docket and per-act exposure for executive orders, misconduct referrals and contested removals built (world dynamics Wave 2); a contested removal's suit runs as one proceeding to a remedy (Wave 3, 4.14); emergencies, directives and force at home still answer only through the orders that carry them.

### 13.13 The President may defy a final ruling
The President may comply, comply narrowly, or openly defy a final ruling. Defiance is a hard case (§3.6) and takes integrity under the partisan-base test, with a running story. It opens an impeachment beat and makes later orders in that domain arrive contested.
**Why:** Defiance is a real option in a game about the presidency, and it has to cost what it would cost.
**Where:** not built; planned in docs/audits/2026-10-12-contested-issues/PLAN.md §13.
**Status (2026-10-12):** accepted by the owner, not built.

### Story-subject continuity and accounting additions, 2026-10-14

The existing case registry owns durable story bindings. A case may retain its scenario/family, resolved state/city and subjects from the existing entity registry, seated governor or institution catalog. Explicit inherited slots and family/flag callbacks reuse recorded identities; succession never changes who an earlier record names. New subject references are causal entities and source-case decisions are causal parents. Cases and ledger entries preserve these identities after closure and save/load. There is no parallel simulation entity registry and no implicit facility capacity. Repeated scenario placement keeps its first recorded state; new unplaced scenes discount states already used by prior cases. Fit weights and this pacing discount remain planning choices, not measured geographic facts.

The approved locality/official extension uses a sourced Natural Earth size tier and separately evidenced port/road-border flags, not inferred rural industries. City mayors materialize through the existing fictional person generator and person effect only when introduced; other local figures remain offices. Declared governor/member/mayor letters and readouts bind to the actual official, while explicit inheritance retains the original person. Native person/institution identities connect unrelated cases without rewriting earlier records. No municipal elections, facility capacities or crop model are implied.
