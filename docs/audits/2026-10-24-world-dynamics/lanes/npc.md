# Lane: NPCs (Wave 2)

BL-298 (GEO-4, GEO-5). Branch `lane/wd-npc`, based on `3c2ecd43d`.

## What changed

1. **Response intent, read off the record** (`packages/engine/src/npc-response.ts`, new). A coercive act through `resolveAction` already writes its actor, target, instrument, rung, outcome and visibility to the ledger. `responseBook(campaign)` reads the last 13 weeks of it and gives every government a pending intent to answer each government that coerced it:
   - weight per act = `INSTRUMENT_COERCION × (0.4 + 0.12 × rung)`, × 0.6 if it failed; assistance and unseen covert acts count for nothing;
   - aged at a 42-day half-life (the shared `retained()` form), saturated as `1 − e^(−3 × pressure)`, so ten sanctions in one week ask for less than twice what one does;
   - scaled by `resolveToAnswer`: relative power tier, vengefulness, aggression, less the holder's trade exposure to the coercer (China vs the US about 0.7, Honduras about 0.04);
   - spent by answering: the holder's own coercive acts toward the coercer since the first act, at 1.5 × their weight;
   - an act that was itself an answer (the actor's stamp carries a positive `response` term, or the receiver had acted on the actor first inside the window) raises half the intent. That is the loop gain: each round of an exchange asks less than the one before;
   - the coerced government's three closest partners (alignment ≥ 0.5) get 0.35 × alignment of the pressure, measured against a protest one rung below the act, and only for a first move.
   No state was added: the reading is derived, so there is no save migration.
2. **Response term in the agent** (`npc-agent.ts`). `NpcScoreTerms.response`, weight 1.5, is the intent toward the candidate's target times `answerFit`: same instrument 1, protest 0.8, asymmetric 0.6, with height measured as pressure (`actWeight`) so an answer that presses harder than the act loses fit in proportion to the excess. A pending intent is a coercion cause in its own right. The answer goes through the existing `weigh` → `projectAction` → `resolveAction` path, so §6.13's tempo refusal comes before it is priced.
3. **Alignment restraint** (`npc-agent.ts`, `restraint`). `max(0, alignment) × (0.5 + 0.5 × reliability) × INSTRUMENT_COERCION[instrument]` joins the brake. Military pressure on a partner aligned at two thirds loses about half a point of score, and a protest about a tenth.
4. **Response opportunity in the actor draw** (`npc-turn.ts`). While a government holds an intent, its initiative rate gains `0.5 × strongest intent` (cap 0.9) and its draw order is moved ahead by the same amount. The three-actor cap, the per-nation keyed streams and the id tie-break are unchanged. The exported `initiativeRate` is still temperament only.

### Shared files outside the lane, all additive

- `packages/engine/src/willingness.ts`: `"response"` added to `TermKey` and to `QUESTION_TERMS["npc-act"]`.
- `packages/player-core/src/reasons/reason-lines.ts`: one `PHRASES` row for `response`.
- New files: `packages/engine/src/npc-response.ts` and `npc-response.test.ts`. They're inside the NPC domain but weren't on the lane's file list.

player-core reads `TermKey` from the engine's `dist`, so player-core will typecheck only after the integrator rebuilds the engine.

## Probes

Before = `3c2ecd43d` in a separate worktree. After = this branch.

| Probe | Before | After |
|---|---|---|
| geopolitics D, China answers in some seed within 12 weeks (3 seeds) | 0, 0, 0: **fail** | 1, 2, 1 (all economic, first answer in week 1, 2 and 4): **pass** |
| geopolitics D, China vs Honduras (3 seeds) | 0 vs 0: **fail** | 4 vs 1 (Honduras: one démarche): **pass** |
| geopolitics A2, partner vs neutral pressure per dyad (2 idle years, 2 seeds) | 5 of 47 at partners, all CHN→RUS m2; 0.00306 vs 0.00130: **fail** | 0 of 78 at partners; 0 vs 0.00117: **pass** |

**Six seeds of answers to US targeted sanctions** (12 weeks, the lane's own measurement; the probe's own seeds are 3):

| Target | Before | After |
|---|---|---|
| China | 0 in 6 seeds | answers in 5 of 6. Moves: e2,e2,e3 / m1,m1,m2 / e2 / e2,m2 / m1 / none. First answer in week 1 to 5. In kind and asymmetric, never above a show of force |
| Russia | 0 in 6 | 1 in kind (e3) in 3 of 6 |
| Honduras | 0 in 6 | one démarche in 1 of 6 |
| Mexico | 1 aid offer and 1 démarche | unchanged: Mexico's trade exposure to the US (0.48) holds its resolve near zero |

**A2 over the 5 npc-world seeds** (104 weeks): partner rate 0.00367 → 0, neutral rate 0.00197 → 0.00260.

**npc-world.probe.test.ts** (5 seeds × 104 weeks, 15/15 pass before and after):

| Figure | Before | After |
|---|---|---|
| NPC actions | 1302 | 1326 |
| at the President | 727 (0.558) | 605 (0.456) |
| selections top share / governments selected | 0.029 / 185 | 0.074 / 180 (the bound is 0.09) |
| by instrument m/a/d/e/c | 130/338/373/419/42 | 244/365/249/407/61 |
| pursuit rung reached 1/2/3/4/5 | 44/99/26/7/1 | 56/110/30/4/0 |
| NPC wars by seed | 1,2,0,2,0 | 1,2,0,2,0 |
| militaryThreat toward the President moved (idle) | 0,0,0,0,0 | 0,0,1,0,0 |
| initiative rates (static, temperament) | unchanged | unchanged |

§6.13: acts of force (military rung 3+) by NPCs in the 5 idle runs were 0 before and 0 after. Regime operations per seed were 1,1,2,4,2 before and after. Weeks at the cap were 104/104 before and after.

## Exploit checks

- **Saturation (unit and campaign):** ten US sanctions on China in one week gave 24 Chinese acts toward the US over 26 weeks across 6 seeds, against 12 for one sanction. The intent is capped at resolve. The later acts are China's own pursuit continuing (`focus`), not the response term.
- **No standing loop:** 26 weeks after one or ten US acts, no government holds any intent toward the US in any of the 6 seeds (`pendingTowardUs` empty).
- **NPC exchange gain:** a unit test asserts that the second round's intent per unit of resolve is below the first and below 0.5. Partners take up only first moves and are capped at three, so an exchange can't become a bloc's.
- **No restraint farming:** intent sums across instruments, so switching instrument does not reset it. An unseen covert act raises none, which is correct and not an exploit. The President's act after a government's own move is read as a reply (half), which a player can't get without first being coerced. The alignment brake does not stop an aligned government answering in kind: economic answers carry half the brake of military ones.

## Tests

New: `npc-response.test.ts` (16). Added to `npc-agent.test.ts`: the response term, a cause from the intent, the stamp key, and two alignment-brake tests. Added to `npc-turn.test.ts`: the coerced government is drawn more often and never past the cap. No existing test was changed. Also run: npc-tempo, regime-npc, willingness, coercion-tempo, red-lines, pursuits, engagement, god, divergence, turn-phases and player-core reason-lines. All pass.

## Risks and open items

- **NPC military rung-2 acts roughly doubled** (130 to 244 over 5 idle seeds). The extra acts are mostly in-kind answers to shows of force (about 35 answers a seed). Force acts, ladder heights, wars and the cap are unchanged. If the owner reads this as too much tempo, there are two dials: `ASYMMETRIC`/`SAME_INSTRUMENT` for military, or `WEIGHTS.response`. Both should be retuned only after BL-282's ripples land, per METHODOLOGY.
- Selection concentration rose (top share 0.074 against a 0.09 bound).
- Trade measures the President takes outside `resolveAction` (tariff orders) write no `commitment`, so nothing answers them yet.
- The wire doesn't yet name an answer as an answer, the way `keptPromiseLine` does for red lines (`wire.ts` is not this lane's).
- The balance harness was not run (lane rules).

## Amendments for the integrator

**ARCHITECTURE.md, "npc-agent.ts owns…" paragraph on terms:** replace "a weighted sum of eleven named terms" with "twelve". In `restraint`, after "reliability against turning on a treaty partner", add "alignment against pressing a partner, scaled by the instrument's coercion and the actor's reliability". After `survival` 0.5, add: "and `response` 1.5 (the pending intent to answer what this target just did to it or a close partner, from `npc-response.ts`, by how well the move answers it)". In the stamp sentence, change "`agenda-fit` … `survival`" to "`agenda-fit` … `response`".

**ARCHITECTURE.md, after the "Red lines are mechanical" paragraph, add:**

> **Coercion is answered.** `npc-response.ts` reads the last 13 weeks of the ledger's coercive commitments into a `ResponseBook`: each government's pending intent to answer each government that coerced it. Each act is weighted by coercion, rung and outcome, aged at a 42-day half-life and saturated. The book is scaled by the holder's relative power, temper and trade exposure, and spent by the holder's own answers. An act that was itself an answer raises half as much, and only a first move reaches the coerced government's three closest partners, whose answer is measured against a protest. Nothing is stored: the book is derived from the record. The agent reads it as the `response` term, and `npcActorsThisTurn` reads the strongest intent as a bounded head start on initiative and draw order. The answer goes through the agent's ordinary path, so §6.13's ledger refuses before it prices.

**ARCHITECTURE.md, npc-turn paragraph:** after "with a bounded head start for a capital already carrying a standing campaign", add "and for a capital with a pending intent to answer".

**DECISIONS.md, new entry after 6.13:**

> ### 6.13a A coerced government answers through the agent, inside the ledger
> A government coerced by another holds a pending intent to answer it, derived from the ledger's last 13 weeks and decaying at a 42-day half-life. The intent is scaled by relative power, temper and trade exposure, and spent by answering. Answers to answers raise half as much, and the three closest partners take up only first moves. It raises the agent's score for proportionate answers and the government's chance of the week. It never bypasses §6.13's ledger or the three-actor cap. Restraint, protest, delay and asymmetric answers remain valid answers.
> **Why:** China answered US targeted sanctions zero times in twelve weeks on every seed, because nothing in the agent read being coerced.
> **Where:** `packages/engine/src/npc-response.ts`; `npc-agent.ts` (`response`, `restraint`); `npc-turn.ts` (`takesInitiative`, `npcActorsThisTurn`).

**BACKLOG.md:** BL-298 can close on this branch's commit with the proof above. The balance-harness rerun named in its acceptance is still owed at the integration checkpoint.

SCHEMA.md and CONTENT_DOCTRINE.md: no change. No schema, state or scoring constant from the CLAUDE.md list moved.

## Wave 2R repair: same-week exchanges

**Finding (Codex review, serious).** `isReply` needed the earlier act to fall in an earlier turn, but `answeredSince` counted acts from the same turn. One NPC phase applies each government's packet before the next one decides, so an exchange can happen inside a single week. With CHN→USA d2 followed by USA→CHN d2 in the same turn, the US act read as a first move: Russia got 0.0423 intent against the US on China's behalf, and China got none. Moving the second act to the next turn gave the correct reading.

**Fix (`npc-response.ts`).** Each `StatedAct` now carries `order`, its index in the ledger. `isReply` compares order, not turn. `Pressure.firstOrder` replaces `firstTurn`. `answeredSince` counts only the holder's acts recorded after the first act it is answering, so the holder's own earlier move in the same week no longer counts as its answer. Turns are still used for aging and the window.

**Regressions (`npc-response.test.ts`), both orders in one week:**
- Coercer's move first, then the President's: no partner intent, and China's intent equals the next-week case.
- The President first, then the answer: the partner intent stands, and the answer reduces the intent.

**Rerun on `d32595f27` plus the fix.** These figures also include the other Wave 2 lanes.
- geopolitics D passes: China 1, 3 and 1 answers; China 4 against Honduras 1.
- A2 passes: 0 of 88 military acts at partners; partner rate 0 against neutral 0.00242.
- npc-world passes 15/15: 1334 actions, 0.468 aimed at the President, top selection share 0.074, military 240, pursuit rungs reached 64/111/30/5, wars 1,2,0,2,1, militaryThreat toward the President moved in 1,0,1,0,0 edges.
- The engine's `tsc --noEmit` is clean.

# Wave 3: episodes, exits, idle hostility, tariff answers, undeclared arsenals

Branch `lane/wd-npc`, started at `d2d7649f7`. `feat/world-dynamics` (up to `20e13401c`, the bodies lane) was merged in before the last round of tests and probes.

## What changed

1. **Border clashes come in episodes** (BL-292, `world-events.ts`, `world-event-templates.ts`).
   - The willingness gate stays as it was: whether a government is willing to clash at all.
   - When it clashes is now a weekly hazard, `p = 1 − exp(−λ)`, drawn on a stream keyed by the pair and the week. Before, the gate's draw was keyed by the pair alone, so a willing pair fired every time its 12-week cooldown lapsed.
   - `λ = 0.01 × (1 + 2.5 × episode) × damping`.
     - The episode is recent clashes and military rung-2+ acts between the two, read from the response book's window, each fading at a 56-day half-life over 26 weeks.
     - Damping is 0.1 where the side that would be hit sits under a defense treaty whose scope covers it and the attacker is outside. It is a further 0.5 if that body consulted over the same attacker in the past year.
   - The rest after a clash is the template cooldown, now 4 weeks. Each neighboring pair draws once a week, from its more willing side, so one incident is no longer filed from both sides.
   - A clash under a guarantee files one consultation per guarantor body. Each member gets a `world-event:consultation` marker toward the attacker and +0.02 tension, and the body files a feed item.
   - All rates are planning values. Branching is about 0.3 extra clashes per clash, so episodes end.
   - No clash-to-war path was added. No onset benchmark was opened, so the onset gate stays an `it.todo` per the acceptance.
2. **Leaving a body is a procedure** (BL-80, new `world-membership.ts`; admission moved here unchanged).
   - `LEAVER_TRUST` is unchanged. It is a precondition, not the decision.
   - A member first files a notice: a ledger entry with system `withdrawal-notice`, plus a feed item.
   - At the first summit after the body's notice period has run, the member weighs again. It either leaves, or files `withdrawal-notice-revoked`.
   - Notice periods, as planning values from the founding texts as commonly cited (none was opened this session): EU 104 weeks, CSTO 26, AU 52, Mercosur 9, CPTPP 26, OPEC+ 4, SCO 52. ASEAN, the GCC and BRICS have no clause, so leaving them is a repudiation: an extra 0.15 cost, and legalism weighs against it.
   - `withdrawalVoteTerms` now reads `WithdrawalReading`:
     - grievance, from mean trust and from grudges plus coercion members aimed at it inside the response window;
     - trade with the other members;
     - on a defense body, the guarantee's value, read as the worst threat from outside;
     - the exit's cost.
   - The withdrawal draw is keyed per summit, so a member that held at one summit weighs it afresh at the next.
3. **Idle hostility** (BL-300). I traced which writers push each edge from not hostile at founding to hostile at week 104, phase by phase:
   - `blocPhase`: a compact "fractured" on any active pursuit between two members, a tariff dispute or a démarche included. That alone took 29 pairs below the line in memory-1. `fracturesIn` now counts only wars and overt pursuits past rung 2 (`blocs.ts`).
   - `worldEventPhase`: about 8 newly hostile pairs a seed, all from the clash timer. Fixed by item 1.
   - `npcActionPhase`: every newly hostile edge it causes is an observer cooling toward a coercer, from the third-party ripple in `resolution-ripples.ts`. That ripple is charged in full by design ("repeated coercion is repeated harm", reactions lane; METHODOLOGY's "preserve legitimate cumulative harm"). It lands on the governments that coerce most: China, Russia, Egypt and Saudi Arabia lead every seed. I left it as the intended reading and did not edit the reactions lane's file. If the owner wants a bound, it belongs in `rippleContribution` as a level per observer–actor pair.
4. **Tariff orders draw an answer once** (BL-308, `npc-response.ts`).
   - A US tariff measure inside the window is read as an economic rung-2 act on its target, ordered at its ledger entry.
   - An answer the trade book has drawn for it (`trade.retaliation`, whether landed or pending) counts as the target's answer straight away, so the agent does not answer the same tariff a second time.
   - Discharge is now proportional: `intent × max(0, 1 − answered / pressure)`. Answering as much pressure as was received spends the intent.
   - Where the act to answer is the only cause, the agent's only candidates against the coercer are answers (response above zero, or assistance). Being sanctioned is a reason to answer, not to blockade.
   - The wire names an answer as an answer (`wire.ts#answerLine`): "China answers the United States' higher tariffs." and "Russia takes China's side against …". `NpcCandidate.responding` carries the intent.
5. **Undeclared arsenals** (bodies lane note, `regime-acts.ts`).
   - One predicate now serves both readers: `instrument-gates.ts#declaresDeliverableArsenal(arsenal)` is `warheads > 0 && declared !== false && deliveryTriad`.
   - `outsideNuclearDeterrence` and `regime-acts.ts#nuclearArmed` both call it. Coups, captures and operations against Israel's undeclared arsenal are no longer refused.

### Shared files outside the lane

- `instrument-gates.ts`: the new exported predicate, which the existing force gate now calls. The behavior there is unchanged.
- No state, save or effect type changed. The notice and the consultation are ledger and history records, so there is no save migration.

## Tests

- **Updated, because they encoded the old timing:** `world-events.test.ts` "is decided…" and "files a wire item…" now walk the weeks to the first clash instead of assuming the first week. "waits out its cooldown" became "rests after a clash". `border-incidents.test.ts` "does not file a deliberate clash on the same pair and week" puts the pair mid-episode, so a deliberate clash is drawable.
- **New tests:**
  - `world-events.test.ts`: the episode raises the hazard and the rest blocks it; no fixed interval over a long run; one clash per pair a week; damping under a treaty; consultation markers that deter the next clash.
  - `world-membership.test.ts`: notice first; leaving after the notice runs; the EU's two years; the notice taken back once the quarrel mends; a trusting member stays.
  - `blocs.test.ts`: an ordinary quarrel is not a breach.
  - `npc-response.test.ts`: a tariff with no drawn answer leaves an intent; a drawn answer spends it.
  - `npc-agent.test.ts`: answer-only candidates.
  - `npc-turn.test.ts`: the answer bulletin.
  - `wire.test.ts`: both answer lines.
  - `regime-acts.test.ts`: an undeclared arsenal against a declared one, and the dataset's Israel.
- **Run, all passing on the merged tree** (28 files, 501 tests): world-events, world-membership, border-incidents, blocs, npc-response, npc-agent, npc-turn, npc-tempo, wire, article-coherence, coercion-tempo, red-lines, pursuits, engagement, god, willingness, regime-npc, regime-acts, relationships, turn-phases, divergence, trade, tariff-orders, world-events-aid, compacts, war-join, conflicts.
- `tsc --noEmit` on the engine and eslint on the changed files are clean.
- The world package was rebuilt locally so the engine could read the new Israel data. That `dist` was restored and not committed.

## Probes

The base is `d2d7649f7`; "head" is `feat/world-dynamics` at `20e13401c` without this lane's changes; "after" is this branch, post-merge. Idle runs are 104 weeks.

| Probe | Base | After |
|---|---|---|
| geopolitics A3, no fixed-interval pair | IND-PAK and RUS-UKR each 9 clashes at a 12-week gap: **fail** | none: **pass** |
| geopolitics A3, NATO-Russia clashes in two years (≤1) | 48: **fail** | 0: **pass** |
| geopolitics A, border clashes a year | 87 | 5.4 |
| geopolitics A, NPC war onsets a year / active war-years a year | 0.125 / 0.41 | 0 / 0.41 |
| geopolitics A2 and D | pass | pass |
| events BR-04, most exits per body in 4 years (≤2) | OPEC+ 1: pass | SCO 1 (a body new in the merge): pass |
| npc-world | 15/15 | 15/15 |

**Five idle seeds** (memory-1..3, geo-1, geo-2), my measurement, head against after:

| Figure | Head | After |
|---|---|---|
| Clashes per seed in two years | 107, 113, 106, 112, 115 | 10, 12, 12, 7, 11 |
| Fixed-interval pairs | 4–7 per seed | 0 |
| NATO-flank clashes | 48–51 | 2, 0, 0, 0, 0 |
| Consultations | none | 3, 0, 2, 0, 0 |
| War onsets / active war-weeks | 0,0,0,0,0 / 104, 0, 142, 65, 62 | unchanged |
| Exits | OPEC+ 2 and 1 | none in two years (notices: Pakistan and India, SCO, geo-2) |
| Military rung-2 acts by NPCs | 75, 51, 34, 45, 55 (260) | 44, 51, 60, 44, 55 (254) |
| npc-world military-2 | 230 | 226 |
| §6.13 ledger | regime operations 3,2,1,1,2; force 1 (geo-2) | regime operations unchanged; force 2 (geo-2), inside 8 a term |

**Hostile directed edges** (trust below −0.3), founding → week 104:

| Seed | Head | After |
|---|---|---|
| memory-1 | 147 → 213 | 147 → 213 |
| memory-2 | 130 → 218 | 130 → 197 |
| memory-3 | 154 → 200 | 154 → 195 |
| geo-1 | 151 → 217 | 151 → 207 |
| geo-2 | 140 → 200 | 140 → 198 |

**Mean trust at week 104:**

| | memory-1 | memory-2 | memory-3 | geo-1 | geo-2 |
|---|---|---|---|---|---|
| Head | 0.0798 | 0.0789 | 0.0841 | 0.0822 | 0.0773 |
| After | 0.0851 | 0.0845 | 0.0851 | 0.0886 | 0.0825 |

Newly hostile edges caused by the bloc and world-event phases fell from 37/16/8/11/15 to 2/1/2/1/2 per seed. What remains is NPC observer objection (item 3).

**Known failure, not this lane's:** geopolitics E, "passes a draft on nine votes when a permanent member abstains", fails on `feat/world-dynamics` head as well, with 0 drafts passing. It reads only the founding graph.

## Risks and open items

- Clashes fell from about 55 to about 5.5 a year per seed. No armed-clash series was opened, so the base rate (`CLASH_BASE_RATE`) is a planning value. If the owner wants more, that is the dial.
- BL-300 is not closed. The residual hostility comes from third-party objection to repeated NPC coercion, which the reactions lane charges in full by design. I need an owner call on whether to bound it per observer–actor pair.
- NPC war onsets in the 4-seed geopolitics A run went from 1 to 0. No path that opens a war was changed; read it as seed drift until onsets are measured against a benchmark.
- The exit-clause figures were not opened this session.
- India and Pakistan file notices to leave the SCO in one seed. Their grievance is with each other, inside the body.
- The balance harness was not run.

## Amendments for the integrator

**ARCHITECTURE.md, world events (border clash):** replace the timer description with: "A border clash keeps its willingness gate, but fires on a weekly hazard `1 − exp(−λ)`, drawn per pair and week: a base of 0.01, raised by an episode of recent clashes and shows of force between the pair (56-day half-life), zero for 4 weeks after a clash, and damped to a tenth where the side that would be hit sits under a defense treaty the attacker is outside (half that again after a consultation in the past year). Each pair draws once a week. A clash under a guarantee files one consultation per body (`world-event:consultation`), which deters the attacker against the members for a year."

**ARCHITECTURE.md, roster:** "Leaving a body is a procedure (`world-membership.ts`): a notice under the body's own exit clause, filed on the ledger, decided again at the first summit after it has run, and taken back if the grievance mends. The weighing reads grievance (trust, grudges, coercion from members), trade, a defense guarantee's worth, and the exit's cost; a body without an exit clause costs a repudiation."

**ARCHITECTURE.md, blocs:** "A compact fractures on a war between members or an overt campaign past rung 2 between them, not on an ordinary quarrel."

**ARCHITECTURE.md, response book:** add "Tariff orders enter the book as economic rung-2 acts; the trade book's drawn answer counts as the target's answer at once. Answers spend the intent in proportion to the pressure they answer. Where the act to answer is the only cause, only answers are candidates. The wire names an answer (`answerLine`)."

**DECISIONS.md 6.9/6.15, Where:** add "`instrument-gates.ts#declaresDeliverableArsenal` is the one test, read by the force gate and `regime-acts.ts#nuclearArmed`."

**DECISIONS.md, new entry beside 6.13:** "Border clashes are an episode hazard, not a rhythm: a willing pair clashes on a weekly hazard raised by recent clashes and shows of force, rests after each, and is damped under a defense treaty, whose members consult. No clash opens a war; a clash-to-war path would be a new §6.13 family with its own cap."

**BACKLOG.md:**
- BL-292: acceptance met for A3, the counting and consultation. Onsets are reported, and the onset gate is still waiting on a sourced benchmark.
- BL-80: the procedure, benefits and costs are in place, and BR-04 passes. The exit-clause figures need opening.
- BL-308: closes.
- BL-300: stays open on observer objection, owner call.
- New item: geopolitics E fails on head.
