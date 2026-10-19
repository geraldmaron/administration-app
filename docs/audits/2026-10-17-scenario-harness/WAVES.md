# Content waves for BL-245 (premise debt) and BL-251 (standing corpus errors)

Plan written October 17, 2026. Both items edit shipped scenarios, so each wave is one decision pass, one revision job, one independent review and one publish. The owner publishes and deploys (`docs/CONTENT_DOCTRINE.md` §11).

## The path

1. **Decide (read only).** An analyst reads each id and records one decision in `waves/<wave>-decisions.json`:
   - `gate`: one or more conditions appended to `conditions` (additive), from the class's accepted readings (`CLASS_GATES` in `scenario-audit-premise.ts`). The decision must say how often the gated state occurs on the harness boards, because a gate the state rarely satisfies is an unreachable scenario.
   - `universal`: a `premise` of kind `universal` with a reason that is true of this week.
   - `introduces`: a `premise` of kind `introduces` naming the incident that creates the state.
   - `hold`: the scenario needs a rewrite or retirement; it stays on the list with a one-line reason.
2. **Revise.** Gates and premise travel as a `scenario-regate` job (conditions, boosts, and the additive `premise` key). Prose, replies, prices and context are frozen. Reachability is checked by the regate gate.
3. **Review.** A separate session that did not decide or revise reads every changed scenario with its decision (`content-review` skill) and writes the review record.
4. **Publish.** `corpus upgrade-publish` writes the reviewed batch over the corpus; the same commit removes the ids from `PREMISE_DEBT_SHIPPED`; bake and commit `dist/`. Owner publishes.

## Waves

| Wave | Scope | Shipped ids | Also in packs, reference, fixtures |
|---|---|---|---|
| W1 | economy and war | 26 + 11 | economy/war ids in `packs/core.ts`, `packs/pilot.ts`, `content/reference/*`, `plant-holiday` fixture |
| W2 | unrest, disaster, public-health | 14 + 10 + 8 | the rest of the 15 off-shard ids |
| W3 | BL-251: 62 errors in 52 scenarios, by kind (`commit-time-flash-forward` 43 through `retime`; `family-without-opener`, `locus-ground-mismatch`, `manufactured-clock`, `generic-place`, `nation-name-in-generic` through `upgrade` or `bind`) | | |

Scenarios in `packs/*.ts` and the fixture are TypeScript, edited by hand in the integrating session, not through the corpus path.

## Done when

`PREMISE_DEBT` is empty and its test passes with the list deleted, and `existingCorpusErrors` returns zero.

## W1 status (October 17, 2026)

Decisions: 5 gate, 24 universal, 8 introduces, 0 hold. Regate job `w1-premise-economy-war`: 33 cleared the gate; 4 failed `unreachable-scenario` on the original body (the premise does not change liveness), so they stay on the debt list with a separate defect: `the-port-development-or-the-farming-subsidy`, `the-trade-terms-our-neighbor-wants`, `the-accounts-frozen-in-both-directions`, `the-tariff-that-answered-a-tariff`. Review (independent session, `w1-review.md`): 31 approve, 2 reject (`the-ally-asking-for-more-than-words`, `the-convoy-they-want-us-to-escort`: need a `belligerent` cast via a bind job). The first review rejected `the-veterans-who-came-home-late` for a dodged universal reason; it was changed to `introduces` and approved on re-check. Published locally with `upgrade-publish`; 31 ids left `PREMISE_DEBT_SHIPPED`; corpus re-baked.

## W1 war-ally weeks (October 17, 2026)

Bind job `w1b-bind-war-ally` (cast `belligerent`, `warState none`): reachable only without a trust condition; with any `relationship` trust floor, including 0, unreachable on all gate boards. The independent reviewer rejected the trust-free version (prose still names a friend). Outcome: both stay on the debt list as rewrite items. Job and outputs are scratch and unpublished.
