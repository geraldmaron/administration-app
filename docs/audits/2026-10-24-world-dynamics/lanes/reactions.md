# Lane: relationship reactions (Wave 2)

BL-282, plus threat reversion after a war ends (found in Wave 1R). Branch `lane/wd-memory`, based on `3c2ecd43d`.

## What changed

### One signed observer reading, in `resolution-ripples.ts`

The class-constant ripple (`RELATION_SENSITIVITY`, plus the trust 0.4 gate on "ally") is gone. Each candidate observer now gets a signed stance from its own ties: `observerStance(campaign, observer, actor, target, instrument)`.

**What an observer reads (`observerTies`):**

- **standing:** 0 if it distrusts the target, otherwise 1. An observer with no reading of the target counts as 1.
- **bond:** its trust in the target, clipped to 0..1.
- **obligation:** a defense body holding in the target's region, or a ratified bilateral alliance.
- **compactBreach:** a defense body shared with both actor and target.
- **exposure:** trade dependence on the target, scaled at 0.1, plus 0.25 when it is one of the target's top partners.
- **fearOfActor:** its military-threat reading of the actor.
- **fearOfTarget:** its military-threat reading of the target.
- **actorBond:** its trust in the actor.
- **sharedPolicy:** it already runs the same policy. That means it is at war with the target from the other side, has its own active pursuit against it, or stands in a severance with it.

A government with no reading of the target, no trade with it and no body in common is not an observer.

**How it objects to coercion:**

`(bound + standing × interested) × (1 − 0.6 × fearOfTarget) × (1 − 0.5 × actorBond)`, where

- `bound` = 0.4 × obligation + 0.6 × compactBreach
- `interested` = 0.5 × bond + 0.6 × exposure × character.exposure + 0.25 × fearOfActor × character.alarm + character.norm

The act's character weights (norm / exposure / alarm):

| Act | norm | exposure | alarm |
|---|---|---|---|
| diplomatic | 0 | 0.2 | 0.3 |
| economic | 0.05 | 1 | 0.3 |
| covert | 0.15 | 0.3 | 0.5 |
| military | 0.3 | 1 | 1 |

**How it reads assistance:** welcome = standing × (0.5 × bond + 0.4 × obligation + 0.3 × exposure). A government already working against the target objects instead.

**Stance:** `(sharedPolicy ? 0.3 : 0) − objection`.

- Rivalry produces neutrality, never approval. Approval comes only from shared policy. The `−sign(disposition)` rule is not used.

**Ripples:**

- Magnitude = severity × 0.1 × |stance|. A reaction under 0.0005 is not named.
- The relation label is read off the ties, for display only: bloc-partner, ally (obligation or bond ≥ 0.4), bloc-peer, trade-partner, or observer.
- Observers are iterated in sorted id order.

**What a ripple writes (`rippleContribution`):**

- **Objection:** charged in full every time (trust −m, tension +0.6m), so repeated coercion stays cumulative harm.
- **Approval:** `approves: true` on the ripple. It only closes the distance to `anchor.trust + APPROVAL_CEILING` (0.08) for that observer's reading of the actor, so it cannot be farmed.
- The old assistance sign flip is replaced by the stance itself.

All weights are planning values, chosen for ordering. None is a sourced coefficient.

### The world's weekly reading of an aggressor uses the same stance (`war-tick.ts#worldOpinionEffects`)

- **Trust:** a bystander's trust in the aggressor is pressed toward `anchor − 0.2 × heat × objection`, where objection is the bystander's military-act objection to the aggressor over the defender, capped at 1.5. So a friend of the victim condemns, and a rival of the victim does not.
- **Threat:** the threat rise stays 0.125 × heat for every bystander.
- **Why this file changed:** without it the economy probe's ordering could not hold. Eight weeks after a US blockade, the war's weekly pressure, not the act's ripple, moved China and Japan alike.

### Threat now reverts (`relationships.ts`)

- `structuralReading` already carried the threat (`StandingReading`). `DurableShift` now carries `militaryThreat` too:
  - war fought: +0.3, the size war entry writes
  - war scar after it ends: +0.05
  - treaty and severance: 0
- The anchor sums it in the same total order, and the memory phase settles threat toward it: above the anchor at the grievance half-life (a fear fades as slowly as the grievance it came with), below it at the favor half-life.
- Every founding edge still opens exactly at its anchor, threat included, and a first week moves nothing (test).

### Shared contract edit (additive, minimal): `resolution.ts`

- `RippleRelation` gains `"observer"`.
- `Ripple` gains optional `approves?: true`.
- One net line, inside the file's recorded size ceiling; `verify-file-size` OK.
- `player-core` shows `RELATION_WORDS[...] ?? relation`, so the word "observer" displays as is. That is acceptable, but the integrator may add `observer: "observer"` to `player-core/src/act/assessment.ts`.

## Save migration

None. `Ripple` lives only in projections. The relationship shape is unchanged, and `DurableShift` is derived, never stored.

## Probes

| Probe | Before (3c2ecd43d) | After |
|---|---|---|
| network 3a, US sanction of Iran: no distruster of Iran cools toward the US | fail (SAU, ARE, ISR and others cooling) | pass: none cool, and one approver (shared policy) warms within the ceiling |
| network 3b, Russian strike on Poland: ally magnitudes differ when trust spans more than 0.2 | fail: 1 distinct magnitude over 30 allies (0.048) | pass: 26 distinct over 30 allies (for example ALB 0.065 at trust 0.45, CZE 0.093 at 0.51, DEU 0.094 at 0.52) |
| network 3c, NPC-on-NPC ripples (control) | pass: 40 ripples, 39 effects | pass: 39 ripples, 38 effects |
| economy B5, blockade of Iran, week 8: CHN cools more than JPN | fail at this base: CHN −0.0848, JPN −0.0885, every observer about −0.08 | pass: CHN −0.0914, RUS −0.0909, JPN −0.0074, KOR −0.0074, IND −0.0049 |

Network 1a, 4a and 4b still fail. They belong to other lanes: Hill brokerage, relief saturation and Hill grudges. Network 2b and 2c still pass.

## Exploit check

The exploit check is in `resolution-ripples.test.ts`.

- **Setup:** a government that distrusts Iran, runs its own pursuit against Iran, and starts at its standing reading with the US.
- **Action:** 30 US sanctions of Iran.
- **Result:** its trust in the US rises, but never past `anchor + APPROVAL_CEILING`.
- **Control:** three sanctions cost a government friendly to Iran more than 2.5 times what one does, so harm stays cumulative.

## Idle comparison: three seeds, 104 weeks, no one at the desk

Old is `3c2ecd43d` with this lane's four source files restored. Hostile means trust < −0.3. High threat means militaryThreat > 0.55.

| Seed | Week | Mean trust old / new | Hostile old / new | Disposition < −0.3 old / new | High threat old / new |
|---|---|---|---|---|---|
| memory-1 | 52 | 0.0823 / 0.0840 | 192 / 187 | 968 / 945 | 694 / 693 |
| memory-1 | 104 | 0.0801 / 0.0827 | 217 / 199 | 1002 / 967 | 700 / 692 |
| memory-2 | 52 | 0.0834 / 0.0840 | 169 / 170 | 1005 / 991 | 704 / 703 |
| memory-2 | 104 | 0.0801 / 0.0810 | 196 / 194 | 1039 / 1022 | 710 / 708 |
| memory-3 | 52 | 0.0879 / 0.0891 | 161 / 159 | 920 / 900 | 709 / 706 |
| memory-3 | 104 | 0.0791 / 0.0809 | 209 / 186 | 1003 / 1010 | 716 / 705 |

At week 0 the new code equals the old on every seed. The change does not push the world toward polarization. At week 104, hostile edges are lower on all three seeds and mean trust is higher. Disposition-hostile edges are lower on two seeds and up 7 on memory-3. High-threat edges grow less now that threat reverts. Mean trust toward the President is unchanged to four decimals.

## Tests

Run in this worktree:

- Targeted vitest: 28 engine files, 597 tests, all passed. They cover:
  - resolution and the new resolution-ripples tests
  - coalition, counsel, stewardship, engagement, consequences
  - npc-turn, npc-agent, npc-world probe, divergence
  - war-tick, war-entry, war-join, war-outcomes, war-calibration, war-party
  - blockades, conversations, macro-balance (byte-identical replay)
  - relationships, relationship-graph, blocs, conflicts
  - advance, week-identity, border-incidents, alignment
- player-core `src/act`: 6 files, 92 tests, all passed.
- `npx tsc --noEmit -p packages/engine` is clean, and `tsconfig.tsbuildinfo` was deleted afterwards.
- `verify-file-size` OK.

**Updated tests, with reasons** (both in `resolution.test.ts`):

- "does not mistake a trade treaty for a defense alliance" used to assert no ripple at all from a neutral that trades with the target. Exposure now counts, so it asserts the reaction is not labeled ally under a trade treaty, and is ally under an alliance.
- "moves the recipient and its neighbors in opposite directions for a strike and relief" now starts the three neighbors at their standing reading of the actor. Aid approval closes the distance to a ceiling above that reading, and the fixture's hand-set 0.2 already sat above it.

**New tests:**

- `resolution-ripples.test.ts` (7):
  - no cliff in objection across trust 0.4, and ordering by trust
  - rivalry gives exactly zero for economic and military acts
  - approval only with shared policy
  - military objects more than diplomatic, and a trusted actor is damped
  - the farm bound
  - cumulative objection
  - same ripples whatever the nations' insertion order
- `relationships.test.ts`: threat is held while a war is fought, falls back after it ends but stays above the no-war control, and its trend is founding-exact.

**Not run:** `hill-ledger-golden.test.ts`. It is still pending its single integration re-capture, and this lane moves world readings again.

## Doc amendments (for the integrator)

**DECISIONS:** add §4.8a, or extend §4.8:

> **Third parties read a move by their own ties.** A government watching a move between two others reacts with a signed, bounded reading of its own: how much it values the target, whether it is bound to defend it, what it trades with it, how much it fears the actor, how much it fears the target, how far it trusts the actor, and whether it already runs the same policy. A government that distrusts the target reads the move as none of its business: rivalry earns neutrality, never approval. Approval comes only from a government already pressing the target itself, and lifts it at most `APPROVAL_CEILING` above where it stands with the actor, so it cannot be farmed. Objection is charged in full each time. A war's weekly verdict on its aggressor is read through the same objection. The weights are planning values.
> **Why:** One flat reaction per relationship class made a rival of Iran resent a sanction on Iran exactly as Iran's partners did, and it made every ally of Poland react identically whether it trusted Poland a little or a lot.
> **Where:** `packages/engine/src/resolution-ripples.ts` (`observerStance`, `projectRipples`, `rippleContribution`); `war-tick.ts#worldOpinionEffects`; `resolution-ripples.test.ts`; `network.probe.test.ts` 3a-3c; `economy.probe.test.ts` B5.

**DECISIONS §4.8 body:** add "trust, tension and threat" wherever it says "trust and tension". Add: "a war fought holds threat up by 0.3 between the sides, and leaves 0.05 after".

**SCHEMA.md:** the `Ripple` paragraph gains `approves?: true` and the relation `"observer"`.

**ARCHITECTURE.md:**

- In the resolution paragraph that reads "Ripples reach the target's treaty allies, bloc peers and top trade partners (cooling their trust in the actor)", replace it with: "Ripples reach every government with a stake in the target (a reading of it, trade with it, or a body in common), each reacting by the signed stance its own ties give: objection cools it toward the actor; approval, only from a government already running the same policy, warms it up to a ceiling."
- Phase table row 51: add threat.

**CONTENT_DOCTRINE §8 (ripples):**

> Other governments react by their own interests. A rival of the target stays silent rather than cheering. A government already pressing the target may welcome the move, a little and only once. The target's friends, treaty partners and trading partners object, in proportion to how much they have at stake.

## Risks and what's left

- The weights are planning values tuned for ordering, with no sourced calibration. The 12-seed balance harness has not been run.
- Where an observer's trust in the target crosses zero, its reaction steps from neutral to objecting. The step is small, since at zero trust only trade, the norm and fear of the actor remain. The probe's ordering requires that line.
- The relation word "observer" has no friendly label in `player-core` yet.
- Assistance approval is now bounded by the same ceiling. Relief to the recipient itself is unchanged (B7, `instruments-economic.ts`).

## Wave 3: BL-285, the magnitude half (on d2d7649f7)

### What changed

Both trade readers now read `tradeDependence` magnitude continuously. Neither gives a bonus for membership in a country's top five any more.

- **`relationship-graph.ts#laneMagnitude(ours, theirs)`** is the one formula both readers use: `0.65 × own dependence + 0.35 × the counterpart's`.
- **`tradeTie`** = `lane + LANE_PRESENCE × (1 − e^(−lane / LANE_SCALE))`, with `LANE_PRESENCE = 0.12` and `LANE_SCALE = 0.005`, both planning values.
  - The flat 0.12 for being on the short list becomes a part that grows smoothly with the lane: about two-thirds built at half a percent of the economy, which is the dataset's median named partner (lane quantiles: q50 0.0078, q90 0.0495).
  - The reasoning: a lane is a relationship before it is a large one. That is what the old bonus stood for, but it was triggered by list membership instead of by the flow.
- **`tradesWith` / `hasStandingLink`** opens a trade link only on a lane in the reader's own books (`tradeDependence > 0`). The list no longer opens one.
  - Reading the counterpart's books too was tried and rejected. It opened about 2,400 edges (8,535 to 10,910) between small economies and distant buyers, and dropped founding mean trust to 0.054 with hostile pairs about 310.
- **`resolution-ripples.ts#observerTies`**: exposure is `laneMagnitude(observer's live dependence on the target, the target's live dependence on the observer) / 0.05`, clipped to 1. The +0.25 for being in the target's top five is gone.
  - Live means the relationship's `tradeDependence`, which an embargo sets to zero. The founding books are used where no edge exists.
  - An observer with no edge counts only if the lane is nonzero or it shares a body with the target.
  - The "trade-partner" label now means any nonzero exposure.

### The founding shift: corrected in part, explained for the rest

Three seeds at week 0. "Pre-cut" is `42821cfe6` (the old 41-entry list, from BL-285's record); "at base" is `d2d7649f7` (top-five list, list bonuses intact); "now" is this change.

| Seed | Mean trust: pre-cut / at base / now | Hostile pairs: pre-cut / at base / now | Disposition < −0.3: at base / now | Mean trust toward the US: at base / now | Edges: at base / now |
|---|---|---|---|---|---|
| memory-1 | 0.0920 / 0.0850 / 0.0899 | 142 / 157 / 147 | 999 / 925 | 0.1873 / 0.1879 | 8,535 / 8,535 |
| memory-2 | 0.0919 / 0.0848 / 0.0898 | 130 / 139 / 130 | 1008 / 939 | 0.1889 / 0.1894 | 8,535 / 8,535 |
| memory-3 | 0.0919 / 0.0848 / 0.0898 | 144 / 161 / 154 | 986 / 902 | 0.1663 / 0.1669 | 8,535 / 8,535 |

- **Corrected:** about 70% of the mean-trust drop and most of the hostile-pair rise. The cut took the flat 0.12 tie away from about 36 of 41 lanes per country, and those lanes now get a share sized to their flow.
- **What remains, and why:** about 0.002 of mean trust and 0 to 10 hostile pairs. This is the old list paying the full 0.12 to trace lanes (q10 lane 0.0012, which now earns about 0.03). Paying full credit to a trace lane was the defect, so this residue is not restored.
- **North Korea's 12 lost edges:** they stay lost, deliberately. North Korea keeps 32 edges on every seed, before and after. The 12 lost at the cut were other governments' edges toward North Korea that existed only because North Korea was on their old 40-entry list: their own dependence on North Korea rounds below the dataset's floor (0.0001), meaning no measurable flow in their own books. North Korea's own lanes (28 partners, CHN 0.0624 down to USA 0.0001) still open its outward edges, and its neighbors and sourced dyads are unaffected.
- **Edges unchanged:** the top-five list opened no edge that a lane didn't already open, so the count stays 8,535.

### Probes

Both pass after the change:

| Probe | Result |
|---|---|
| network 3a | pass: no government that distrusts Iran cools. The ripple list shrinks to governments with a real lane or a shared body. CHN 0.010 bloc-peer; ISR 0.013 approves (shared policy). |
| network 3b | pass: 29 distinct magnitudes over 30 allies (26 before) |
| network 3c | pass: 39 ripples, 38 effects |
| economy B5 | pass: CHN −0.0861, RUS −0.0767, JPN −0.0074, KOR −0.0074, IND −0.0049 |

### Idle comparison: three seeds, 104 weeks (at base / now)

| Seed | Mean trust w52 | Mean trust w104 | Hostile w52 | Hostile w104 | Disposition < −0.3 w104 |
|---|---|---|---|---|---|
| memory-1 | 0.0838 / 0.0882 | 0.0764 / 0.0802 | 174 / 169 | 219 / 213 | 1093 / 1011 |
| memory-2 | 0.0776 / 0.0819 | 0.0764 / 0.0795 | 193 / 187 | 212 / 212 | 1093 / 1029 |
| memory-3 | 0.0836 / 0.0878 | 0.0806 / 0.0846 | 172 / 168 | 209 / 199 | 1085 / 1049 |

The founding gain carries through two idle years. Hostile edges are equal or lower on every seed.

### Tests

**New, in `relationship-graph.test.ts` (3):**
- A derived relationship is identical whether or not the partner is on the short list.
- Alignment rises monotonically with the lane and has no step at the scale (0.0049 vs 0.0051 differ by less than 0.002).
- A listed partner with no lane in the reader's books opens no trade link.

**New, in `resolution-ripples.test.ts` (1):**
- An observer's stance is identical whether or not it is on the target's short list.

**All four fail on the base code and pass on the new code.**

**Passing after the change:**
- Covering vitest: 190 tests across relationship-graph, resolution-ripples, resolution, relationships, coalition, blocs, npc-world probe and macro-balance (byte-identical replay).
- The new tests above: 27 across relationship-graph and resolution-ripples.
- `npx tsc --noEmit -p packages/engine` is clean, and `tsconfig.tsbuildinfo` was deleted afterwards.
- `verify-file-size`: OK.

`blocs.ts` was not edited.

### Amendments for the integrator

- **`packages/world/src/dataset/stat-consumers.ts`** (world file, outside this lane):
  - `trade.topPartners` no longer has an engine reader. Turn its entry into `owedBy: "a display of a country's named partners, or the sanctions-targeting rule; no engine rule reads list membership, by design (magnitude lives in tradeDependence)"`, or name a display consumer if one exists.
  - Add to `trade.tradeDependence.readBy`: `packages/engine/src/relationship-graph.ts#tradeTie`, `#tradesWith` and `#laneMagnitude`, and `packages/engine/src/resolution-ripples.ts#observerTies`.
  - The registry test checks only that the named declarations exist. It would still pass unedited, but its claim would be false.
- **SCHEMA.md**, `topPartners` comment: add "No engine rule reads membership in this list; ties, links and observer exposure read `tradeDependence`."
- **ARCHITECTURE.md**, relationship-graph paragraph: "trade ties read lane magnitude (own dependence 0.65, the counterpart's 0.35), with an early-saturating presence term up to 0.12; a trade link opens on a lane in the reader's own books."
- **BACKLOG BL-285:** close the magnitude half with the numbers above. The remaining "balance check of the founding world" belongs to the integration checkpoint's balance harness run.

### Risks

- `LANE_PRESENCE`, `LANE_SCALE` and the ripple exposure saturation (0.05) are planning values.
- The 12-seed balance harness has not been run.
- The one-directional link rule leaves some lanes visible from only one side, which the founding graph already did.
