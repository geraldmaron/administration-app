# Lane: attention and recurrence (BL-281)

## Mechanism

`AttentionMatter` gains an optional `signature`: what the matter looks like to the President now. `advanceUntilAttention` keeps a notice ledger (`Campaign.noticed`, matter id to signature). A matter is presented only when its signature differs from the ledger entry; presenting records it. An entry is dropped when its matter is no longer asked about, or asks with another signature. A matter without a signature behaves as before (every look). Scenario matters carry none in this change.

Signatures (player-core `desk/attention.ts`): every Desk row is `urgency|stance|deadline stage` (stage: open, far, week = 7 days or fewer, due). The removal summons is `rung:<next rung>`, from `removalEpisode` in `summons/due-executive.ts`. The Desk row and the summons clock stay level readings; only the stop is an edge. A deferral lapsing does not re-interrupt an unchanged matter. A deteriorating case changes stance or reaches a nearer stage and stops again. Idle exposure is untouched: nothing here writes pressure.

## Save compatibility

`Campaign.noticed` is optional and additive. A save without it loads as nothing noticed, so the first look after load may stop once for matters already on the desk, then the ledger fills. No schema version bump, no migration, `normalizeCampaign` unchanged. Saves written by this build load in older builds (the field is ignored).

## Shared-contract edits

`packages/engine/src/state-campaign.ts`: one optional field `noticed`. Nothing else shared.

## Proof

Probe `engagement.probe.test.ts` "interrupts at most once per removal-pressure episode": passes on ev-1 and ev-2 (`cd packages/player-core && npx vitest run --config vitest.probes.config.ts src/__probes__/engagement.probe.test.ts`). ev-1 removal summons stops by episode: before 34 inside the 0.45 episode, after `{1@0.45: 1, 2@0.45: 1}` (two separate approaches, one stop each). ev-2: none.

Stops per 30 days over 365 days of deferring everything: ev-1 9.37 to 7.89 (96 stops); ev-2 6.58 to 6.58 (80 stops, no removal episode). Before numbers are the Wave 0 run, not re-measured here. What remains is mostly arrivals: in ev-1, 55 of 96 stops are scenarios (BL-296's lane), 21 disasters, 16 bill signatures, 11 governor requests. Relief cases stop at far, week and due, which are declared milestones.

The B2 probe still fails by design (BL-297).

## Test changes

- `engine/src/advance.test.ts`: new block for the ledger (unchanged signature silent, changed signature stops, leave-and-return re-arms, unsigned matter unchanged, cap-held matter not recorded).
- `player-core/src/desk/attention-notice.test.ts`: removal once per rung, next rung, fresh approach.
- `player-core/src/campaign/store.test.ts` "byte-identical campaigns under one-day steps": now compares the campaign without `noticed`. The ledger records what stopped each run, which is what the settings change; the simulation never reads it.

## Caveat on running tests

Ordinary player-core vitest resolves `@admin/engine` to its committed `dist`, which is stale until the integrator builds. The tests above were run with an alias to engine source (config outside the repo); `tsc --noEmit -p packages/player-core` reports `noticed` missing on `Campaign` until engine is rebuilt. `tsc -p packages/engine` is clean. Engine `advance`/`attention` tests: 58 passed. Player-core desk, summons, campaign, persistence, conversation: 511 passed against source. Full suite, lint, gates and balance not run (lane rules).

## Doc amendments for the integrator

DECISIONS §2.2, append: "A matter that carries a signature stops the world once per signature. The engine keeps the signature it last stopped for in `Campaign.noticed`; a matter stops the world again only when its signature changes (a worse stance, a nearer deadline stage, a new removal rung) or after it has left the desk and returned. The removal summons is one stop per rung and again only on a fresh approach. A deferral that lapses on an unchanged matter does not interrupt. Matters without a signature (scenarios) stop on every look until their own contract lands.
**Why:** a level that holds is not news; a President who defers everything was interrupted 34 times in one removal episode.
**Where:** `packages/engine/src/attention.ts` (`withoutNoticed`, `reviseNotices`), `advance.ts` (`lookForMatters`), `packages/player-core/src/desk/attention.ts` (`signatureOf`), `summons/due-executive.ts` (`removalEpisode`)."

Proposed attention budget (not asserted anywhere): for a President who defers everything, no more than one stop per matter per signature; stops per 30 days in the single digits (measured 6.6 to 7.9 today, median 3 to 4 days apart); no 30-day window without a stop or an ambient event (already asserted by the probe). Set a number only after scenario signatures land, since scenarios are most of the remaining stops.

ARCHITECTURE: in the attention loop section, add the notice ledger and `AttentionMatter.signature` as above, and state that `AdvanceResult.campaign` now carries `noticed`. The `AttentionStop` shape and `advanceUntilAttention` signature are unchanged. SCHEMA: list `Campaign.noticed` (optional, id to signature string) beside `deferrals`.

## Risks and not done

- Hard matters with no deadline (for example an unauthorized force) now stop once per urgency/stance change, not weekly after a deferral. That is the requested behavior but removes a re-ask the engine docs promised for hard matters; the integrator should confirm.
- A condition flipping between ambient and soft re-arms every flip (ambient is a signature change). Seen once in ev-1 (Syracuse unrest, 8 stops); not investigated further.
- Scenario matters have no signature (BL-296).
- No browser or UI check: the Desk list is unchanged by design (it still lists what the stop presented), only the world's stopping changed.

## Wave 1R repair

1. Continue and the Brief now use the engine's eligibility. `presentedItems` (what holds Continue and sets `holds` on a Brief row, through `useAttention`, `ContinueButton` and `ContinueNotice`) composes over `withoutNoticed(withoutDeferred(...))`, the same filter `advanceUntilAttention` applies. `owedItems` is unchanged, so a noticed matter stays on the work list but no longer holds the clock, and a lapsed deferral cannot restore the hold. No app files needed editing.
2. The ledger goes through `apply()` without touching the causal sequence. `AttentionEffect` gains `notice` and `forget`; `EffectPacket` gains `presentation?: boolean`. `apply` folds a presentation packet and returns, with no ledger entry and no number from `ledger.length`, because what was shown depends on the player's settings and the causal ids are part of the result (DECISIONS 2.3). Provenance is the packet's own key: origin `world`, the matter ids as `entities`, signatures in the effect. `advance.ts#withNotices` sends it; a look that changes nothing writes nothing. Shared-contract edits: `effect-types.ts` (two optional fields on `AttentionEffect`, `presentation` on `EffectPacket`) and `effects.ts` (one early return in `apply`, plus `applyAttention`).
3. Rule text to append to DECISIONS §2.2 (and §1.5 note): "The notice ledger is written only by an `attention` effect on a presentation packet through `apply`. A presentation packet leaves no ledger entry and takes no causal id, so what the President was shown never changes the numbering or the bytes of anything else. The simulation never reads it."
4. The byte-identical store test (DECISIONS 2.3) is restored over the whole campaign, excluding only `noticed`, which legitimately differs with the settings.
5. Syracuse unrest (8 stops on ev-1): not a threshold flap. The condition row is `soft` for the week of each new beat and `ambient` after, and the first signature counted soft against ambient as a change. The signature now treats soft and ambient as one level (only `hard` differs), so a beat at an unchanged stance no longer stops the world; a worse stance, a nearer deadline stage or hard urgency still does. No cooldown was added.

Wave 1R probe run (same command): ev-1 7.89 stops per 30 days (96 stops, median 3 days apart, removal summons stops by episode `{1@0.45: 1}`, top repeated matter now a relief case at 5, Syracuse unrest gone from the top); ev-2 6.90 (84 stops, none for removal). Both seeds satisfy the episode assertion. The ev-1 stop count held at 96 because suppressed condition pulses were replaced by other arrivals in the same year; the repeated-matter maximum fell from 8 to 5. Tests: engine advance, attention, effects, save, causality 159 passed, `tsc -p packages/engine` clean; player-core desk, summons, campaign, persistence, conversation 514 passed against engine source.

Second repair run: ev-1 7.97 stops per 30 days (97 stops; removal summons once in each of three approaches, `{1@0.45, 2@0.52, 3@0.45}`), ev-2 6.66 (81 stops; one removal stop). Both pass the episode assertion.

Why ev-2 moved from 6.58 (80 stops, Wave 0 tree) to 6.90 (84) in the first repair: trajectory divergence, not extra interruptions from the ledger. A control run on the current tree with signatures removed (no notice at all) gives 79 stops; with notices 84 when each notice took a ledger number and 81 once it no longer did. The same seed moving 84 to 81 by a change in causal-id numbering alone shows the count is sensitive to the world path (ids feed keyed draws and the probe's own deferral commits also shift the ledger). Three Wave 1 merges also changed the world since Wave 0. Treat 79 to 84 as the noise band for one seed; the ledger does not add stops on ev-2. The remaining repeated ids on ev-2 are bill, relief-case and budget-case rows stepping through far, week and due stages.
