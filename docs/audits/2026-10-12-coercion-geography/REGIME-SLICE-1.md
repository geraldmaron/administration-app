# Regime change, first slice: what was built and what 12 seeds show, 2026-10-14

Integration branch `codex/simulation-depth-completion`. Rule: DECISIONS §6.15. Design and verification: `REGIME-CHANGE.md`, `REGIME-VERIFY.md` §4.

## What was built

| Piece | Where | How it works |
|---|---|---|
| One covert regime rung, four operations | `regime-rung.ts`, `instruments.ts` (covert-5) | The act carries `regimeAct`: coup support (default), political action, capture, or a lethal operation. |
| Coup support | `regime-acts.ts#sponsoredCoupTerm`, hook in `foreign-politics.ts#coupTerms` and `coupHazard` | A decaying sponsored term (weight 0.0228, half-life 26 weeks) on the existing coup hazard, scaled by the target's proneness, its armed rival's ambition and its distance from full order. Readable above the 0.45 stability ceiling, where the country's own terms are zeroed. |
| Political action | `politicalActionPressure`, hooks in `electionResult` and `losesConfidence` | Lowers the sitting government's hold on its next selection by 0.12 and doubles its parliament's confidence-loss rate, both fading with the operation. |
| Leader removal | `regime-rung.ts#removalResolve` | Seats the charter successor through `successionPacket(..., "removed")`. Capture is always offered and always comes out. The lethal operation is offered only while `order-amend-targeting-prohibition` (Executive Order 12333, §2.11) is signed and in force; it comes out 60% of the time, and when the sponsor is the player it opens a story through the scandal path. |
| The amending order | `order-families.ts`, `order-subjects.ts` | Directed through the Director of National Intelligence; refused while no covert-action finding stands. Overreach 0.25: amending the office's own order is within its writ. |
| Exposure, lapse, fall | `regime-acts.ts#operationsWeek`, `regimePhase` | Weekly exposure hazard (base 0.006 × footprint × target and sponsor counter-intelligence); a player-run exposure opens a dated scandal flag. Lapses at 104 weeks. Closes as "fell" when the target government leaves office, leaving the successor's alignment +0.3 to +0.4 and trust +0.2 to +0.3 toward the sponsor. |
| Other governments | `regime-npc.ts`, `coercion-tempo.ts#NPC_REGIME_OPERATIONS` | A weekly 0.017 draw for whether any capital starts one; the coldest reachable pair among capitals that pass the rung's capability gate, through the shared resolver and the shared tempo ledger (6 a term, 104 weeks per pair). US treaty partners are targetable. |
| Nuclear refusal | `regime-acts.ts#nuclearArmed` | A target declaring warheads with a delivery triad is refused by data: USA, RUS, CHN, GBR, FRA, IND, PAK on the founding board. North Korea is not refused, because the data gives it no triad. |
| Player reach | `player-core/src/act/*`, `apps/web/src/world/nation/ActTerms.tsx` | The act screen offers the operation as a choice; the lethal option is listed only once the order stands. |

## Measurement (one process each, `probes/regime-slice-1/probe.mjs`)

### Other governments over a passive term (208 weeks, seeds regime-0 to regime-11)

Mean 1.17 operations a term, range 0 to 4 (owner band 1 to 6; three terms of twelve saw none, and the cap never bound). Political action 8, coup support 8, removals 0. Two fell and two were exposed across all twelve terms. Sponsors were Russia (Ukraine, Poland, Norway, Estonia) and Israel (Iran, Lebanon); none targeted the United States.

### The President's operations, 104 weeks, against a no-operation control on the same seed

| Target | Operation | Fell | Exposed | Coups with / without | Approval vs control |
|---|---|---|---|---|---|
| Haiti | coup support | 3/12 | 0 | 6 / 4 | -0.0001 |
| Haiti | political action | 0/12 | 2 | 4 / 4 | -0.0020 |
| Venezuela | coup support | 3/12 | 3 | 7 / 6 | -0.0012 |
| Venezuela | political action | 4/12 | 2 | 6 / 6 | +0.0008 |
| Cuba | coup support | 1/12 | 1 | 1 / 0 | +0.0004 |
| Cuba | political action | 0/12 | 0 | 0 / 0 | +0.0005 |
| Canada | coup support | 1/12 | 1 | 0 / 0 | -0.0021 |
| Canada | political action | 1/12 | 2 | 0 / 0 | -0.0026 |

"Fell" counts any change of government after the operation began, so it includes elections the incumbent lost on its own (Canada's one fall is its scheduled election). The coup columns are the cleaner reading: coup support adds coups where the state is fragile and none where it is not.

## Reading

- **Separation holds.** Canada and Cuba do not read like Haiti and Venezuela, without any per-country rule.
- **Below the design's target.** REGIME-VERIFY's C1 asks coup support against a government under the stability ceiling to fall it within 104 weeks in 30 to 55% of runs; Haiti and Venezuela measured 25%. Raising `coupSupportWeight` is the lever; it was not tuned here, because the slice's instruction was to measure before deciding.
- **Other governments' rate sits at the low end of the band**, carried by two capitals. Widening the capability gate or lowering the hostility floor (0.55) would spread it; neither was tuned.
- **No approval effect** at this exposure rate, as expected: the operations rarely came out in 104 weeks.

## Not built

Hold scores, contenders, recognition and occupation strategy (owner Q22: strategy, troop level a reading) remain for the next slice, after the owner reads these numbers.

## Commands

```bash
pnpm --filter @admin/engine run build
node docs/audits/2026-10-12-coercion-geography/probes/regime-slice-1/probe.mjs npc 208 12
node docs/audits/2026-10-12-coercion-geography/probes/regime-slice-1/probe.mjs player 104 12
```
