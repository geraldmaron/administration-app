# Lane: relationship memory (Wave 1)

BL-277, with BL-230 settled alongside. Branch `lane/wd-memory`, based on `9b8ba9e59`.

## What changed

All of it is in `packages/engine/src/relationships.ts` and `packages/engine/src/relationship-graph.ts`. No shared contract file was edited: no state type, `save.ts`, `effects.ts`, `effect-types.ts`, `resolution.ts`, `index.ts` or `turn-phases.ts`.

1. **One aging form.** `approach(current, target, elapsedDays, halfLifeDays)` is `target + (current - target) * 2^(-elapsedDays / halfLifeDays)`, with `retained()` as its factor. Everything below goes through it, and two 7-day steps equal one 14-day step.
2. **Two half-lives, both planning values.** `FAVOR_HALF_LIFE_DAYS = 273` (39 weeks, the middle of the 26-52 week candidate range). `grievanceHalfLifeDays(v)` is `273 * (2 + 2v)`, so 2x at vengefulness 0 and 4x at vengefulness 1 (546 to 1,092 days).
3. **Transient layer: trust and tension now revert.** Each week `grudgeDecayPhase` moves every edge toward its standing reading. Trust above the anchor is a favor and fades at the favor half-life. Trust below it is an injury and recovers at the reader's grievance half-life. Tension works the other way round. Within 0.0005 of the anchor, an edge snaps to it and stops moving. Before this change, trust had no reversion at all.
4. **Grudges age by the calendar.** `Grudge.decayRate` now holds the share of the fading weight lost per day (`1 - 2^(-1/halfLife)`), still set from the aggrieved party's vengefulness at creation. `ageGrudge` applies it. A grudge with no durable floor is dropped below 0.005.
5. **`historyPressure(relationship, now)` takes the date.** Each classified act keeps its rank discount and is also aged: cooperative acts at the favor half-life, coercive acts at the mid-scale grievance half-life (819 days). `disposition()` passes `campaign.turn`. Without a campaign it reads the record as of its own newest entry.
6. **Durable, cause-tagged layer.** Reversion never erases these. The anchor is `structuralReading` plus the sum of `durableShifts`:
   - `structuralReading(from, to, player)` (relationship-graph.ts) reruns the founding derivation plus the sourced-dyad overlay on each nation's unmutated `base` record. Live `memberships` are substituted when a nation has joined or left a body, so leaving a compact moves the anchor itself. It is cached per pair of base records. A test asserts that every edge of a founded campaign opens exactly at its anchor, and that a week of the phase on a fresh founding moves nothing.
   - `treaty:<record id>`: a treaty record in force (`ratified`, `in-force-by-signature`) holds its own trust and tension terms in both directions. It drops out at `withdrawn`.
   - `severance`: a standing `severed-relations:<from>:<to>` flag holds trust -0.3 and tension +0.3 (the severance rung's own unjittered size).
   - `war:<conflict id>`: a war begun under this administration holds trust -0.3 and tension +0.35 while both sides are still fighting. Afterwards it leaves a permanent scar of trust -0.1 and tension +0.05. Wars carried into the oath are skipped, because the sourced dyads already price them.
   - A grudge whose cause starts `war:` fades toward `WAR_GRUDGE_FLOOR = 0.15` and never below it. All other causes fade to nothing, so there is no universal grudge floor.
7. **One packet a week.** It used to be one packet per relationship with grudges. With reversion that could be thousands of ledger lines a week, so the phase now emits one `background: true` packet ("Old favors and grievances between governments fade with time.") with every edge's effect and sorted entities. Edges are iterated in sorted key order.
8. **No import cycle.** `relationship-graph.ts` no longer value-imports `treaties.ts`. It restates the `compact:<OrgId>` grammar, which its tests already compare against `compactTreatyId`. `relationships.ts` restates the treaty terms, and a test pins every kind against `TREATY_TERMS`. Before this, the chain graph -> treaties -> effects -> national-books -> commitments -> relationships would have closed a cycle.

## Save migration

The stored shape is unchanged: `Relationship`, `Grudge` and the zod schema are untouched. Only the unit of `Grudge.decayRate` changed, from a flat weekly step to a daily rate.

- Old saves stored `0.12 * (1 - v)`, never below 0.02. The new daily rate is never above about 0.0013.
- `migrateGrudge` treats any rate at or above 0.01 as legacy, recovers `v = 1 - rate / 0.12`, and restates the rate. A current grudge comes back as the same object.
- `ageGrudge` runs it on every grudge, so an old save is migrated on its first week. Nothing else reads `decayRate`.
- Old saves need no relationship migration, because the anchor is derived from the records. If an old save's trust has already drifted, it starts reverting from wherever it stands.

## Probes (network.probe.test.ts)

| Probe | Before (9b8ba9e59) | After |
|---|---|---|
| 2b, favor vs grudge after 13 weeks (SAU, vengefulness 0.44) | favor 0.102, grudge 0.000: **fail** | favor 0.081 (< 0.09), grudge 0.093 (>= favor): **pass** |
| 2c, one relief act last week vs ten years ago | 0.06 and 0.06: **fail** | 0.0589 and 0.0000057: **pass** |
| 2d, five slights vs one (control) | pass | pass |

**2c's call was changed, and the assertion was not.** The probe called `historyPressure(rel)` with no date, which is the defect itself (the reader takes no current turn). It now calls `historyPressure(rel, 521)`, which reads a week after the newer act and ten years after the older one. `expect(b).toBeLessThan(a)` is untouched.

**2a's log line is now wrong.** It is report-only: it divides 0.25 by `grudgeDecayRate` and labels the result "weeks (linear decay)". The rate is now daily and the decay exponential, so the printed 206/249/325 are not weeks to clear. Its only assertion (`median > 0`) still holds. The integrator should retire 2a or relabel it.

Sections 1, 3 and 4 of the probe still fail. They belong to other items: centrality, observer ripples (Wave 2), relief saturation and Hill grudges. This lane did not touch them.

## Idle campaigns: 104 weeks, three seeds

Method: `foundedForBalance(seed)` plus `advanceTurn(c, campaignTurnPhases(charter))`, nobody at the desk, all 8,547 directed edges. "Hostile" means trust < -0.3, the founding-dyads band line. Disposition below -0.3 is also shown, because disposition includes grudges.

| Seed | Week | Mean trust before / after | Hostile edges before / after | Disposition < -0.3 before / after | Grudges before / after |
|---|---|---|---|---|---|
| memory-1 | 0 | 0.0920 / 0.0920 | 142 / 142 | 876 / 876 | 0 / 0 |
| memory-1 | 52 | 0.0431 / 0.0491 | 641 / 634 | 1353 / 1347 | 13 / 133 |
| memory-1 | 104 | 0.0274 / 0.0320 | 703 / 694 | 1419 / 1402 | 11 / 276 |
| memory-2 | 0 | 0.0919 / 0.0919 | 130 / 130 | 901 / 901 | 0 / 0 |
| memory-2 | 52 | 0.0425 / 0.0483 | 590 / 587 | 1350 / 1352 | 11 / 154 |
| memory-2 | 104 | 0.0341 / 0.0367 | 633 / 609 | 1404 / 1386 | 7 / 316 |
| memory-3 | 0 | 0.0919 / 0.0919 | 144 / 144 | 859 / 859 | 0 / 0 |
| memory-3 | 52 | 0.0778 / 0.0795 | 317 / 316 | 1054 / 1045 | 12 / 141 |
| memory-3 | 104 | 0.0455 / 0.0513 | 747 / 684 | 1464 / 1452 | 10 / 296 |

Mean trust toward the President after 104 weeks went from 0.213 / 0.215 / 0.192 to 0.192 / 0.193 / 0.171. Favors the world banked toward Washington now fade.

**Reading.** The change does not push the world toward polarization. On every seed, at weeks 52 and 104, hostile edges are equal or fewer and mean trust is higher. Grudges now persist for years instead of weeks (about 300 open across the graph at week 104, against about 10), and hostile-by-disposition counts are still slightly lower.

**The polarization drift is real, but memory does not cause it.** Hostile edges grow from about 140 to about 700 over two years under both the old code and the new. A trace on memory-3 attributed the trust written per phase over 104 weeks:

| Phase | Trust written | Writes |
|---|---|---|
| `blocPhase` | -283 | 14,164 (`FRACTURE_TRUST` every week to every bystander of a fracturing compact) |
| `conflictPhase` | -85 | 6,432 (war-tick on carried wars) |
| `npcActionPhase` | -82 / +12 | 7,999 |
| `worldEventPhase` | -8 / +3 | 246 |

None of the hostile edges at week 104 had an anchor below -0.3 beyond the founding 142, and none carried a durable shift. Their median gap below the anchor was 0.47. These are flat weekly decrements, which is exactly the shape the shared form replaces. A steady -0.02 a week overwhelms any grievance recovery between 0.4% and 0.9% of the gap a week. The fix belongs to the owners of `blocs.ts` and `war-tick.ts`: express a fracture or a running war as a target the reading approaches, or as a durable cause in this layer. A new backlog item is proposed below.

The half-lives held up here, but no band is asserted on them. This run is three seeds and idle. The 12-seed, three-party balance harness has not been run (lane rules), and it should be run at the integration checkpoint before the planning values are adopted.

## BL-230 (routine contact)

The "adds up without decay" half is fixed. Each call's and envoy's +0.02 now fades at the favor half-life, so steady contact settles instead of accumulating:

- One call every 4 weeks banks at most 0.02 / (1 - 2^(-28/273)), which is 0.29. Its average is about 0.28. A regression test runs four years of calls and holds it under that ceiling.
- Calls plus an envoy every 6 weeks average about 0.47 above the anchor. Before, they added about +1.7 over a term, clipped at the top of the scale.
- When contact stops, the gain fades: half in 39 weeks.

The "worth more than a treaty" half remains. A sustained maximum cadence still sits above an alliance's durable +0.18, though only while it is kept up. Whether to cut the call to +0.01 or saturate engagement is still the owner's decision, and it is an `engagement.ts` change, outside this lane. Proposed BL-230 text is below.

## Tests

Run in this worktree with targeted vitest only. `npx tsc --noEmit -p packages/engine` is clean (it includes the test files), and `tsconfig.tsbuildinfo` was deleted afterwards. `scripts/verify-file-size.mjs` reports OK.

- The first targeted command passed file paths that vitest read as filters, so it ran the whole engine suite (355 files): 4,648 passed and 6 failed. Five failures were in `relationships.test.ts`: four `historyPressure` cases with no date, and the 20-week "eventually removes it" case. Both now encode old behavior and are updated as described below. The sixth was `hill-ledger-golden.test.ts`, also below.
- After the updates: `relationships.test.ts`, `relationship-graph.test.ts`, `border-incidents.test.ts`, `npc-world.probe.test.ts`, `alignment.test.ts`, `alignment-isolation.test.ts`, `npc-agent.test.ts`, `npc-turn.test.ts`, `turn-phases.test.ts` and `divergence.test.ts`: 174 passed.

**Updated tests, with reasons:**

- `relationships.test.ts`, "reduces grudge weight each turn and eventually removes it". It asserted that a 0.3 grudge clears in 20 weeks, which was the defect. It now asserts the weight falls every week after the planting week, and that `ageGrudge` forgets a transient grudge after 30 years.
- `relationships.test.ts`, the attribution case. The line no longer names the pair, because it is one packet for the whole graph. It still matches `/fade with time/` and asserts no raw code.
- `relationships.test.ts`, the `historyPressure` cases. They now pass the read turn, since the reader takes one.
- `border-incidents.test.ts:139`. It passes `after.turn` to both sides of an equality that is otherwise unchanged.

**New regression tests:**

- `relationships.test.ts`, "relationship memory ages by the calendar", 10 cases:
  - the form and pace equivalence
  - half-life ordering
  - founding equals anchor, and a first week moves nothing
  - favor fades at its half-life and an equal injury recovers more slowly, with an unaffected control pair
  - routine contact is bounded (BL-230)
  - repeated injuries stay cumulative
  - a war grudge holds its floor while an ordinary grudge goes
  - legacy-save migration
  - every treaty kind is pinned to `TREATY_TERMS`, both ways, and drops out when withdrawn
  - a severance and a war are still below founding after five years
  - an active war outweighs its scar, and a carried war adds nothing
- `relationship-graph.test.ts`, 2 cases: the standing reading equals the founding edge, and leaving a compact lowers it.

**Not updated: `hill-ledger-golden.test.ts`.** The pinned 30-week capture moves because the world's relationship readings now differ. Hill figure readings shift by about 0.004, one bill count goes from 6 yeas to 5, and removal pressure moves by about 0.003. No code that counts votes, reads chambers or prices removal changed. The fixture is shared and every Wave 1 lane will move it, so it should be re-captured once at the integration checkpoint, with the cause added to the test's re-capture paragraph: "relationship memory came to age by the calendar, with trust and tension settling toward each pair's standing reading".

## Doc amendments (for the integrator)

### DECISIONS.md §4.8: replace the section body

> ### 4.8 Relationships are directed and remember
> A relationship runs from one nation to another. Its memory has two layers. The transient layer is every favor and slight: trust and tension settle back toward the pair's standing reading, and grudges fade, all by the one approach-to-target form `next = target + (current − target) × 2^(−elapsedDays / halfLifeDays)`. A favor fades at `FAVOR_HALF_LIFE_DAYS` (273 days). An injury, meaning trust below or tension above the standing reading, and a grudge fade at the grievance half-life, two to four times that, placed by the aggrieved party's vengefulness. A grudge carries a cause, weight, creation turn and a daily decay rate set from that vengefulness when it forms. The durable layer is cause-tagged and read off the campaign's own records: the founding derivation and sourced dyads, live compact memberships, a treaty in force, a standing severance, and a war fought under this administration, which holds the reading while it is fought and leaves a scar after it. A war's grudge fades to a floor (`WAR_GRUDGE_FLOOR`); no other cause has one. Time never erases a durable cause, and reversion never rebuilds a pair from founding data alone. The half-lives and durable sizes are planning values.
> **Why:** How one capital sees another isn't symmetric. A betrayal has to stay expensive for as long as that nation's character says it would, a kindness must not be a permanent deposit, and a war or a treaty is still on the record years later. The record says injuries outlast favors.
> **Where:** `packages/engine/src/relationships.ts` (`approach`, `grievanceHalfLifeDays`, `ageGrudge`, `durableShifts`, `relationshipAnchor`, `grudgeDecayPhase`); `relationship-graph.ts` (`structuralReading`); `relationships.test.ts`; `network.probe.test.ts` 2b and 2c.
> **Source check (2026-10-25):** the half-lives are the world-dynamics program's candidate planning values (favor 26-52 weeks, grievance 2-4×), checked on three idle 104-week seeds. Neither half-life is sourced, and the balance harness has not yet been run on them.

### CONTENT_DOCTRINE.md §2: add after the Alignment paragraph

> **What a government remembers.** Trust and tension that content moves on a foreign relationship do not stay where content puts them. Each week every relationship settles toward its standing reading: what the two countries' records, their compacts, any treaty in force, a standing breach of relations, and a war fought on this administration's watch say it should be. A favor fades by half in about 39 weeks. An injury takes two to four times as long, longer for a vengeful government. A grudge fades the same way, except a war's, which never drops below 0.15. Write a warm gesture as something that has to be kept up, and a wound as something that is still felt two years on. Neither is a permanent move unless it changes one of the durable records. The numbers are `FAVOR_HALF_LIFE_DAYS`, `GRIEVANCE_HALF_LIFE_MULTIPLE` and `WAR_GRUDGE_FLOOR` in `packages/engine/src/relationships.ts`, and they are planning values.

### CONTENT_DOCTRINE.md §7 rule 11: replace

> 11. Alliance damage recovers on a scale of years, not weeks and not never: an injury takes two to four times as long to heal as a favor takes to fade. A war, a treaty or a breach of relations stays on the record for as long as it stands. Write the recovery as well as the wound.

### SCHEMA.md: in the `Relationship` paragraph (line 759), replace "`grudges: Grudge[]` (each with a `decayRate`)" with

> `grudges: Grudge[]` (each with a `decayRate`: the share of its fading weight lost per day, `1 − 2^(−1/halfLifeDays)`, set from the aggrieved party's vengefulness; a stored rate at or above 0.01 is a pre-2026-10-25 weekly step and is restated on the first week by `migrateGrudge`; a grudge whose cause starts `war:` fades toward `WAR_GRUDGE_FLOOR` and never below it)

### ARCHITECTURE.md

- §3 phase table row 51: `| 51 | grudgeDecayPhase | One week of relationship memory: trust and tension settle toward each pair's standing reading (founding derivation plus durable causes), a favor faster than an injury; grudges fade toward their cause's floor. One background packet for the graph. |`
- Line 69, the Simulate row: replace "grudge decay" with "relationship memory (favors and grievances aging by the calendar toward each pair's standing reading)".

## BACKLOG reconciliation (proposed)

**BL-277: close.** All acceptance points are met:

- the shared form with separate favor and grievance half-lives
- the transient layer
- the cause-tagged durable layer: after five years a severance and a war leave the reading below founding, and a treaty in force holds its terms
- probes 2b and 2c pass
- half-lives tested in campaigns, with no band asserted
- save migration via `migrateGrudge`

The DECISIONS and CONTENT_DOCTRINE amendments land with the merge. The 12-seed balance harness run belongs to the integration checkpoint.

**BL-230: rewrite the question.**

> Steady contact no longer accumulates. Since relationship memory (BL-277), each call's and envoy's +0.02 fades at the 39-week favor half-life, so a call every four weeks holds about +0.28 and calls plus envoys about +0.47 above the pair's standing reading, both only while kept up. Before, it was +1.7 over a term. The open point is whether a sustained maximum cadence should still be worth more than an alliance in force (+0.18, durable). Options are unchanged: cut the call to +0.01 (halves the plateau), or saturate engagement in `engagement.ts`.

**New: flat weekly trust decrements outside the memory form.**

> `blocs.ts` (`FRACTURE_TRUST` every week to every bystander of a fracturing compact) and `war-tick.ts` (−0.02 × (0.5 + intensity) a week on carried wars) write constant per-week deltas. These drive an idle world from about 140 to about 700 hostile directed edges in 104 weeks under both the old and the new memory code (memory-3 trace: blocs −283, war-tick −85, NPC acts −82 trust over 104 weeks). Acceptance: each states its pressure as a target the reading approaches, or as a durable cause in `relationships.ts`'s `durableShifts`. An idle 104-week run then holds hostile edges within a band to be set from the balance harness. Owner: the blocs/events lane (BR-04 is adjacent).

**Noted, not in scope:**

- `deedPressure` never fades: landed-coercion flags are permanent, floored at −0.2.
- Relief still banks trust without need: probe 4a gains about 0.04 a shipment. That is B7 in `instruments-economic.ts`.

## Wave 1R repair (on feat/world-dynamics c09676065)

### Review finding 9 (serious): anchors depended on insertion order. Fixed.

- `buildDurableIndex` now sorts each pair's causes into one total order (cause string, then trust, then tension) before anything sums them, and the sorted index is cached per campaign state (`durableIndexOf`, a WeakMap).
- `historyPressure` used to break ties within one week by write order, and rank sets each act's weight. It now orders newest first, then by kind.
- `deedPressure` already sums in the declared family and band order, never the flag set's order. A comment now says so.
- New regression, "settles to the same bytes whatever order the records were written in". It builds the same campaign with four treaty records in forward and reverse insertion order, and a same-week history pair in both orders. It asserts an identical anchor and an identical `disposition`, `toEqual` packets from `grudgeDecayPhase`, and identical edges after 60 weeks. It failed before the fix (tension differed in the last bits) and passes after.

### Review finding 13 (minor): legacy migration is representative, not exact. Documented and tested.

The comment on `migrateGrudge` now says the migration is representative: every vengefulness from 5/6 up stored the same floored 0.02, so all of them come back as 5/6. New test: a 0.02 rate maps to `grudgeDecayRate(1 − 0.02/0.12)`, which is faster than the true vengefulness-1 rate.

### Codex 1b review (serious): entrants to a carried war got no durable shift. Fixed.

`warShifts` skipped every carried (`inherited`) conflict. It now skips only the founding principal pair (aggressor and defender), which the sourced dyads already price. A carried war always opens with nobody joined (`opening-world.ts#toConflict`), so every pairing a later entrant makes is new and is held like a war begun on this watch. `war-entry.ts` did not need to change.

Regression: a third government joins a carried war on the aggressor's side. It gets `war:<id>` toward the defender, and the defender gets a negative trust shift toward it. The principal pair still gets nothing. `war-party.test.ts` (the principal-check census) needed a row for the new principal check, and it has one: `relationships.ts#warShifts`, decision principal.

### The polarization drivers, restated as standing pressures

- New shared helpers in `relationships.ts`:
  - `PRESSURE_BUILD_HALF_LIFE_DAYS = 28` (planning value).
  - `pressDown` and `pressUp`: one week toward a level at the build half-life, never back past it.
  - `pressedTrustLevel(campaign, relationship, drop)`: the pair's anchor minus `drop`.
  - `pressedThreatLevel(campaign, relationship, rise)`: the structural threat plus `rise`.
  - `structuralReading` now also returns `militaryThreat` (type `StandingReading`).
- `blocs.ts#fractureEffects`: the flat −0.02 trust a week to every bystander pair is now `set: { trust: pressDown(trust, anchor − 0.12) }`, with `FRACTURE_TRUST_DROP = 0.12` as a planning value. The first week costs about 0.019, what the old step cost every week. A long fracture now holds the pair about 0.12 below where it stands instead of falling 1.04 a year. Two blocs fracturing over one pair in one week set the same level rather than charging twice. Once the fracture ends, memory repairs the pair at the grievance half-life.
- `war-tick.ts#worldOpinionEffects` (where `conflictPhase` lives; `conflicts.ts` holds no trust write): each week a bystander's trust in the aggressor fell by 0.02 × heat and its threat assessment rose by 0.02, where heat = 0.5 + intensity. Now trust is pressed toward anchor − 0.125 × heat, and `militaryThreat` toward structural threat + 0.125 × heat. Both are planning values. The first week moves the old step, and a war of any length settles. Nations are iterated in sorted order.
- Known gap: `militaryThreat` has no memory reversion, so once a war ends, the aggressor's raised threat stays where the war left it (bounded now, rather than climbing toward 1). Reverting threat would be a separate memory channel and was not added.

### Idle comparison, three seeds by 104 weeks

Old is `c09676065` with this lane's four source files restored from that commit; new is this repair. The method is the same as above.

| Seed | Week | Mean trust old / new | Hostile (trust < −0.3) old / new | Disposition < −0.3 old / new | Mean threat old / new |
|---|---|---|---|---|---|
| memory-1 | 0 | 0.0920 / 0.0920 | 142 / 142 | 876 / 876 | 0.2228 / 0.2228 |
| memory-1 | 52 | 0.0491 / 0.0823 | 634 / 192 | 1347 / 968 | 0.2257 / 0.2239 |
| memory-1 | 104 | 0.0320 / 0.0801 | 694 / 217 | 1402 / 1002 | 0.2261 / 0.2243 |
| memory-2 | 0 | 0.0919 / 0.0919 | 130 / 130 | 901 / 901 | 0.2237 / 0.2237 |
| memory-2 | 52 | 0.0483 / 0.0834 | 587 / 169 | 1352 / 1005 | 0.2246 / 0.2246 |
| memory-2 | 104 | 0.0367 / 0.0801 | 609 / 196 | 1386 / 1039 | 0.2251 / 0.2251 |
| memory-3 | 0 | 0.0919 / 0.0919 | 144 / 144 | 859 / 859 | 0.2229 / 0.2229 |
| memory-3 | 52 | 0.0795 / 0.0879 | 316 / 161 | 1045 / 920 | 0.2308 / 0.2247 |
| memory-3 | 104 | 0.0513 / 0.0791 | 684 / 209 | 1452 / 1003 | 0.2313 / 0.2251 |

Over two idle years, hostile directed edges now grow from about 140 to about 210 instead of to about 650. Mean trust holds near 0.08 instead of sliding to 0.03-0.05. Mean trust toward the President is unchanged to three decimals. The remaining growth comes from NPC acts and world events, which are other lanes' writers. The proposed backlog item "flat weekly trust decrements outside the memory form" is closed by this repair for `blocs.ts` and `war-tick.ts`.

### Tests (Wave 1R)

All targeted:

- 23 files, 384 tests: relationships, relationship-graph, border-incidents, blocs, coalition, conflicts, war-tick, war-party, war-entry, war-join, war-outcomes, war-calibration, warfighting, opinion-war, macro-balance (byte-identical replay), npc-world probe, alignment ×2, npc-agent, npc-turn, turn-phases, divergence, advance, week-identity. All pass after the census row was added.
- Network probes 2b and 2c still pass: favor 0.081, grudge 0.093; history 0.0589 against 0.0000057.
- `npx tsc --noEmit -p packages/engine` is clean, and `tsconfig.tsbuildinfo` was deleted afterwards. `verify-file-size` is OK.
- `hill-ledger-golden.test.ts` still fails. The capture has not been re-taken since `9b8ba9e59` and still needs one integrator capture.

New tests:

- `relationships.test.ts`: insertion-order bytes; the minimum legacy rate; `pressDown`/`pressUp` convergence and no reversal; the carried-war entrant.
- `blocs.test.ts`: a 104-week fracture settles within 0.001 of its level and never passes it.
- `war-tick.test.ts`: over 104 weeks of a founding war, a bystander's trust in the aggressor and its threat assessment both stay within the hottest-front level.

### Files edited beyond the lane's original two

`blocs.ts` and `war-tick.ts` (assigned for this repair; the coordinator named `conflicts.ts`, but `conflictPhase` and its world-opinion write are in `war-tick.ts`), `blocs.test.ts`, `war-tick.test.ts`, and `war-party.test.ts` (one census row). No shared contract file.

### Doc amendment additions

- DECISIONS §4.8 **Where:** add `blocs.ts#fractureEffects` and `war-tick.ts#worldOpinionEffects`. Add to the body: "A pressure that lasts for weeks — a compact fracturing around its members, a war the world watches — presses a reading toward a level below where the pair stands at `PRESSURE_BUILD_HALF_LIFE_DAYS` (28), never back past it, and memory repairs it after the pressure ends; no weekly writer takes a flat step off a relationship." And: "A carried war's hostility between its two principals is in the founding reading; a government that enters it later is held at the war's durable shift."
- ARCHITECTURE.md: in the bloc paragraph and the `conflictPhase` paragraph, replace "loses a little trust each week" and "third parties move against the attacker" with the pressed-level wording above.
