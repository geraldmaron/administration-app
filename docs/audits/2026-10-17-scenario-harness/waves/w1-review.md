# W1 review record (BL-245, economy and war)

Reviewed October 17, 2026, from a session that did not decide or revise. Scope: the 33 scenarios that cleared regate job `w1-premise-economy-war`. The four that failed `unreachable-scenario` (`the-port-development-or-the-farming-subsidy`, `the-trade-terms-our-neighbor-wants`, `the-accounts-frozen-in-both-directions`, `the-tariff-that-answered-a-tariff`) are out of scope.

## Method

1. Diffed each `content/jobs/work/w1-premise-economy-war/*.out.json` against the same id in `content/corpus/shards/{economy,war}-000.jsonl`. Check (1) holds for all 33: the only differing key is `conditions` (5 gates, original conditions kept as an exact prefix, one condition appended) or the added `premise` (28). No prose, reply, price, cast or locus change.
2. Read every opening beat and the `context.standing` paragraph for all 33 against the decision's `presumes` line, then checked the engine meaning of the readings used (`warStateMet` and `belligerent` in `packages/content/src/scenario-cast.ts` and `scenario-counterpart.ts`; `CLASS_GATES` in `scenario-audit-premise.ts`).
3. Frequencies are the analyst's (2,508 harness weeks, 12 campaigns). I did not re-measure them. Replies, rejoinders and impact bands were not re-read: they are frozen and out of scope for this pass.

## Per-id verdicts

### Economy, gate (2)

- `the-fuel-price-spike`: approve. Crude elevated or spiking holds in 30.5% of weeks, 12/12 campaigns. It matches the supplier's price reopener and export tightening.
- `the-revenue-shortfall`: approve. `cyclePhase` in peak, contraction or trough holds in 47.5% of weeks, 12/12 campaigns. The cabinet's own question ("is the economy weakening?") is live in all three phases, and a clean expansion is excluded.

### Economy, universal (20)

- `the-audit-that-found-two-ledgers`: approve. An accountability week; no board state is presumed.
- `the-auditor-who-found-the-gap-in-the-harbor-fund`: approve. A personnel and integrity week.
- `the-clinics-that-never-got-the-difference-back`: approve. The `drew-the-clinics-line-for-rearmament` flag (aged 8) is the state it presumes.
- `the-difference-is-a-real-number`: approve. The `rebid-the-contract` flag (aged 6) supplies the rebid.
- `the-fleet-that-limped-on-half`: approve. The `split-the-budget-line` flag (aged 10) supplies the state.
- `the-fund-that-outlasted-the-chair-who-built-it`: approve. The `let-the-strike-run` flag (aged 5) supplies the dock settlement.
- `the-mill-that-cannot-make-payroll`: approve. The fiction is one state-owned firm missing one payroll in a one-employer town. That is a local failure and deals the same in any phase, so `universal` is true. The prose names no credit squeeze, layoffs or downturn. `introduces` would also be defensible; I would not change it.
- `the-north-gets-roads-or-the-south-gets-schools`: approve. A seasonal budget squabble; the first snow is the clock, not a board state.
- `the-pension-recalculation`: approve. An actuarial finding on longevity is demographic, not cyclical.
- `the-premium-the-dealers-kept-charging`: approve. The `paid-a-surcharge-to-close` flag (aged 6) and the Treasury politicization bound supply the arc state.
- `the-price-of-bread-in-the-north`: approve. A subsidy renewal that comes up with the budget; the prose names no price spike.
- `the-quota-that-emptied-the-docks`: approve. A quota set for the stock, not the cycle. The coastal geography gate already limits it to a coastline.
- `the-rearmament-line-draws-on-the-clinics-again`: approve. The week needs a counterpart request and tension, not a cycle state. Observation outside this pass: it is the arc opener (`arc-the-rearmament-line-draws-on-the-clinics-again`) yet says "again" and "last time", and no flag or condition supplies a prior draw. That is frozen prose, a BL-251 item, not a premise defect.
- `the-rearmament-line-that-ate-the-clinics`: approve. The `defense-rearmament` stance gate is exactly the state it presumes. `policyStance` is not an accepted economy reading, so `universal` is the right declaration.
- `the-second-charter-no-underwriter-will-cover`: approve. The war it needs ("while this war lasts") is established by `warState none`, which the engine meets only when a war runs that the player is not a party to. The `escorted-the-evacuation-convoy` flag (aged 7) supplies the escort. The reason is true.
- `the-surplus-that-came-back-to-argue`: approve. The `capped-the-withdrawals` flag (aged 6) supplies the reserve. The prose says outright that this is not a bad year.
- `the-tax-break-for-new-factories`: approve. An incentive request that any government gets; the prose names no unemployment level.
- `the-two-facilities-that-came-back`: approve. The `admitted-the-deficit` flag (aged 6) supplies the disclosure. The renewal terms need no standing condition.
- `the-two-reviews-that-disagree`: approve. The `ordered-a-second-ledger-review` flag (aged 5) supplies the state.
- `the-yard-that-builds-the-boats`: approve. A firm-level payroll failure with a supply argument. The bank "stopped returning calls" is about this firm, not a credit crunch, and it deals in any phase. The yard's capability claims (the only slipway in the country, four thousand jobs) are unsupported dataset facts under the doctrine's no-invented-capability rule; that is a BL-251 item, not part of this premise.

### Economy, introduces (2)

- `the-branch-with-the-line-outside-it`: approve. The prose states the run spread by sight, not news, and names no standing condition. This is the doctrine's own example (a bank run in a boom). The declaration is accurate; no banking-stress reading exists in `CLASS_GATES`.
- `the-run-that-started-at-one-counter`: approve. The prose says the bank is solvent and the panic is not rational. Same reasoning as above.

### War, gate (3)

- `the-ally-asking-for-more-than-words`: **reject.** `warState none` is met by any war in the world the player is not in. The cast is `closest`, which ranks by trust, and nothing ties it to a belligerent. The prose asserts the counterpart's own fight ("a war that is entirely theirs to fight", matériel and advisors for it). On a board where the closest friend is at peace and some other war runs, the week deals and the first beat is false. The 18.6% figure measures "some war elsewhere", not "the ally is at war". Replacement I would accept: keep `warState none` and change the cast to `{ "pick": "belligerent" }` (it binds a principal of the hottest war the player is not fighting, per `belligerent()`), and re-measure reachability, since trust ≥0.45 on a belligerent will be well under 18.6%. Or keep the cast and rewrite the opening so the request is not for the counterpart's own war. Either is a cast or prose change, outside regate.
- `the-convoy-they-want-us-to-escort`: **reject.** Same defect, weaker. The week is the ally's convoy stalled because underwriters withdrew war-risk cover on "the water it has to cross". `warState none` plus a `closest` cast does not tie that water or ally to the war that runs, so a closest ally on the far side of the world gets a war-risk story about a war elsewhere. The analyst's evidence does not say how often the closest ally is a belligerent or borders the war. Replacement: `belligerent` cast (or a cast that binds the war's principals), re-measured. Accept as is only if a measurement shows the closest ally is a belligerent or adjacent in nearly all the 18.6% of weeks.
- `the-pause-that-was-never-offered`: approve, with a reachability flag. `warState any` (the player is a party) is the true reading: the House committee asks about a pause in a war the administration is fighting. It holds in only 8.6% of weeks and 6/12 campaigns, mostly reckless runs; prudent play rarely sees it. The week stays correct, and I accept the thin reach rather than declare it `universal`, which would be false. If the owner wants it reachable on more boards, the remedy is prose, not a looser gate.

### War, universal (2)

- `the-cooperation-agreement-that-stalled`: approve. The `named-the-shootdown` flag (aged 5) is the arc state. The stalled signing is a diplomatic delay, not a shooting war, and no war is presumed.
- `the-veterans-who-came-home-late`: **reject.** The reason is a dodge. The fiction presumes a past deployment: about eight thousand service members kept past written relief dates, and a demobilization center processing "the units kept past their promised relief". The gates (`turn` ≥4, `stability` ≤0.8) establish nothing about a deployment, and `stability` ≤0.8 is true on almost every board. "In peace or war" is true of a personnel office, but not of this week, whose event is a mission that overran. That is war-class state. A `warState` gate would not help, since the units are home and the war may be over. No deployment or relief flag exists in the corpus to gate on. Replacement I would accept: `{ "kind": "introduces", "what": "The late return is the incident: units kept past their written relief dates come home to an unresolved back-pay and referral backlog, which this week reports." }`. Better still would be a flag gate if a deployment-extension week is later written to set one.

### War, introduces (4)

- `the-capitals-that-stopped-answering`: approve, with a stated tradeoff. The fiction is a formal session about the player that the capitals convened. The accepted reading, `coalition` against the player, holds in 9.5% of weeks and, combined with the standing and trust bounds, in 6.5% of weeks and 3/12 campaigns. That would strand a critical week. The standing ≤0.35 and trust ≤0.3 bounds are a defensible proxy (19.6% of weeks), and the week itself announces the session. The week creates no engine coalition, so the gathering is narrative only. If a later pass wants the real reading, a `coalition against player` gate is the replacement, accepting the starvation.
- `the-column-on-the-border-road`: approve. A pre-war warning, no shots, no war state presumed. A `warState` or `coalition` gate would contradict the prose. `tension` ≥0.4 already gates the relationship.
- `the-fuel-stockpiled-at-the-rail-head`: approve. The prose says no unit has crossed anything. `militaryThreat` and `aggression` bounds gate the relationship.
- `the-massing-past-the-ridge`: approve. Satellite-read buildup, no shots. `militaryThreat` ≥0.4 and `tension` ≥0.3 gate the relationship.

## Starvation check on the five gates

| Gate | Weeks | Campaigns | Verdict |
|---|---|---|---|
| `the-fuel-price-spike` (crude) | 30.5% | 12/12 | fine |
| `the-revenue-shortfall` (cycle) | 47.5% | 12/12 | fine |
| `the-ally-asking-for-more-than-words` (`warState none`) | 18.6% | 6/12 | above the line, but half the worlds have no war in four years, and the cast defect above applies |
| `the-convoy-they-want-us-to-escort` (`warState none`) | 18.6% | 6/12 | same |
| `the-pause-that-was-never-offered` (`warState any`) | 8.6% | 6/12, mostly reckless | below 10%: reachability risk, accepted as the true reading |

## Counts

- Approve: 31 of 33 reviewed in the first pass plus the re-check below (30 first pass; the veterans re-check approved). Two rejections stand.
- Reject: 2 standing (3 in the first pass).
- By decision type: gate 5 (3 approve, 2 reject); universal 22 (21 approve, 1 reject); introduces 6 (6 approve).

## Rejections

1. `the-ally-asking-for-more-than-words`: `warState none` with a `closest` cast does not establish that the ally is at war. Use a `belligerent` cast and re-measure, or rewrite the ask.
2. `the-convoy-they-want-us-to-escort`: same cast defect; the war-risk water is not tied to the ally. Use a `belligerent` cast and re-measure, or measure that `closest` is nearly always a belligerent.
3. `the-veterans-who-came-home-late`: `universal` hides a presumed past deployment. Declare `introduces` with the text above.

The 30 approved items can publish as they are. The three rejected ones should stay on `PREMISE_DEBT_SHIPPED` until they are corrected and re-reviewed. Publish and the `PREMISE_DEBT_SHIPPED` edit stay with the integrating session.

## Re-check: `the-veterans-who-came-home-late` (October 17, 2026)

Revised output diffed against the shipped body in `war-000.jsonl`: the only differing key is `premise`, now `introduces` with the text I proposed. The old `universal` premise is gone. **Approve.** The prose reports units already home with a backlog, so the week itself is the incident; no unestablished deployment is asserted as standing board state.

Updated counts: 31 approve, 2 reject. The two standing rejections (`the-ally-asking-for-more-than-words`, `the-convoy-they-want-us-to-escort`) stay out of the wave pending a cast change.

## Re-check: warState rejections after bind job `w1b-bind-war-ally` (October 17, 2026)

Diffed `content/jobs/work/w1b-bind-war-ally/<item>.out.json` against the shipped body in `war-000.jsonl`. Prose, replies, context and locus are unchanged. Differences are `cast` (`closest` to `belligerent`) and `conditions` (the `relationship` trust floor removed), as described. Not as described: **`warState none` is not in either output.** The shipped bodies never had it (it was added only in the earlier regate outputs), and the bind outputs carry only the `counterpartTrait` reliability floor, with no `premise`.

- `the-ally-asking-for-more-than-words`: **reject.**
  1. The `belligerent` cast does make "a war that is entirely theirs" true: it binds a principal of the hottest war the player is not fighting, and leaves the week unbound when no such war runs.
  2. Dropping the trust floor makes the rest of the prose false. The beats call the counterpart a friend ("nothing about the friendship survives answering no") and say it's the first thing they have asked in nine years, in a summit side room. Reliability ≥0.25 is a character trait, not warmth, so a hostile or indifferent belligerent can now be cast as the "ally".
  3. With no `warState` or `coalition` condition and no premise, the week still fails `premise-class-ungated` (the cast does not count as a reading). It would have to stay on `PREMISE_DEBT_SHIPPED`.
- `the-convoy-they-want-us-to-escort`: **reject.** Same reasons. The cast now ties the convoy to a real war, which fixes the defect I raised. "The ally's relief convoy" asking for an escort "flag and all" still needs an actual friend, and the trust floor that said so is gone. Same missing gate and premise.

Replacement I would accept for both: restore `warState none` (redundant with the cast but the audit's accepted reading, and harmless), and put back a trust floor at the highest value the bind gate clears (try 0.3, then 0.2), instead of removing it. If no floor clears, the fiction cannot be satisfied by these casts: rewrite the opening so the asker is a belligerent the player has some standing with ("a government at war has asked us"), then declare it with `introduces` or the real gate. Do not publish either as it stands.

Updated counts after this re-check: 31 approve, 2 reject (the same two ids, now rejected on the new outputs).

## Re-check: `w1b-bind-war-ally` with `warState none` restored (October 17, 2026)

Diff against shipped for both ids: only `cast` (`belligerent`) and `conditions` differ. Conditions are now the reliability floor plus `warState none`; the trust floor is still removed. Prose, replies, context and locus are unchanged, and there is no `premise`.

- The earlier premise-class-ungated defect is fixed: `warState none` is an accepted war reading.
- The fiction defect stands. Both weeks still call the counterpart a friend or ally and nothing gates on warmth. Reliability is a trait, not trust. The bind session reported only that the trust-free version clears; it does not say a lower trust floor (0.3, 0.2) was tried.

`the-ally-asking-for-more-than-words`: **reject.** `the-convoy-they-want-us-to-escort`: **reject.**

Accept on either path: (a) add `relationship` trust at the highest floor that clears the gate, and show the floor tried; or (b) rewrite the opening so the asker is a government at war, not a friend, then re-review. Counts unchanged: 31 approve, 2 reject.
