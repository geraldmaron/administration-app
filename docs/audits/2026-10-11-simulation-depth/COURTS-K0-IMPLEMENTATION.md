# Courts K0 implementation draft

Status: implementation draft, 2026-10-12. Engine procedure and Court readings have changed; full workspace and live-surface verification are pending. This is a foundation for the execution brief's judicial requirements (§4 and acceptance 2–5, 10, 12); it does not count those cells complete.

## K0 invariants now encoded

- A newly contested order opens a separately identified proceeding at signature. Pending older saves without one enter the process at the next court tick, without a fabricated earlier lower judgment. Completed old opinions remain untouched.
- One autonomous stage advances per scheduled turn: threshold, interim relief, lower merits, discretionary appeal, and, when granted, Supreme Court merits. A lower judgment is recorded but enforcement is stayed pending appeal; the challenged order's final review status and remedy change once at final disposition.
- Interim relief can stay an unimplemented rule; the rulemaking phase cannot land it while stayed. A final judgment either cancels that rule or releases it back to pending implementation.
- A Supreme Court merits decision requires six participating justices. Each vote follows that justice's threshold under a shared case draw. Equal division records the votes and leaves the lower judgment as the outcome without a Supreme Court merits endorsement. With no quorum, review waits and no opinion is fabricated.
- Court screens read the stage and lower judgment. A forecast appears only at Supreme merits review and uses the same vote rule. Threshold dismissal is labeled as dismissal, not a merits ruling.

The remedy now records the realized non-debt movement of each order or final rule after bounds at application. Invalidations and congressional disapproval debit that contribution once through an idempotent effect, then record the actual amount removed after current bounds. Missing legacy contributions remain unquantified; they are not reconstructed from the catalog. The case page reads the actual removed amount after judgment. A negative test demonstrates the remaining limit: after another intervention saturates the same path, subtracting the recorded scalar can differ from the counterfactual without the first order. Strongest remaining failure mode: later clipped interventions remain unattributable. Best alternative: a compositional contribution ledger across all stat writers. Decision: **accepted with controls** for realized, once-only debits; full counterfactual restoration **needs validation** before acceptance 12 can close.

## Decision and legal basis

Build a general proceeding with a recorded lower-court judgment before replacing the Supreme Court vote model. The current order-only review cannot truthfully resolve an evenly divided appeal: it has no lower judgment to affirm. Do not encode a tie as the Court upholding the President's order. Do not preserve the current empty-bench per-curiam fallback.

The [Supreme Court's rules effective March 16, 2026](https://www.supremecourt.gov/filingandrules/2026rulesofthecourt_web.pdf), Rule 4, require six justices for a quorum and say the Court does not meet without one. The [Court's docket in No. 24-394](https://www.supremecourt.gov/docket/docketfiles/html/public/24-394.html) records a recusal and a judgment affirmed by an equally divided Court. In an [official account of the Court's work](https://www.supremecourt.gov/publicinfo/speeches/viewspeech/sp_07-22-11), Justice Ginsburg explained that an equal division affirms the judgment under review, gives no reasons, and establishes no precedent. The [Court's docket in No. 23-5856](https://www.supremecourt.gov/search.aspx?filename=%2Fdocket%2Fdocketfiles%2Fhtml%2Fpublic%2F23-5856.html) quotes 28 U.S.C. §2109 for a case that could not be heard at the next Term for lack of a quorum. These sources were opened 2026-10-12. They establish the constraint; whether this game waits for a quorum or applies §2109 after a later term is an explicit implementation choice requiring a case clock and prior judgment.

Strongest failure mode: a small vote patch leaves the order challenge as a fictional direct merits case, then silently treats a tie as approval of the order. Best alternative: represent filing, lower disposition and Supreme Court review first, then derive the final effect from procedural posture. Decision: **accepted with controls**. Keep the older order-review record readable through a deterministic migration or legacy adapter, without inventing a lower judgment that never existed.

## Existing owners and seams

| Concern | Current owner | Required K0 change |
| --- | --- | --- |
| Stored case | `packages/engine/src/state-judiciary.ts` `CourtCase` | Case identity independent of an order, challenged subject, parties, procedural stage, lower disposition, scope/remedy, participating bench, votes and historical basis. Optional fields must be case-type specific. |
| Order challenge | `packages/engine/src/state-orders.ts` `ExecutiveOrderRecord.review`; `orders.ts` signature; `judicial-review.ts` weekly phase | Link the order to a proceeding. A signature starts challenge risk; filing and judicial action have separate clocks. A court effect changes enforceability, not a generic sign reversal. |
| Decision calculation | `packages/engine/src/court-votes.ts`; `strike-odds.ts` | Eligibility, recusals and six-person quorum precede voting. Each justice's merits threshold contributes to the count, under one shared case uncertainty draw. The majority result comes from votes; a preview is computed from that rule, not from a separate aggregate holding roll. |
| Effects and history | `packages/engine/src/record-effects.ts` `applyCourtCase`; `judicial-review.ts`; `orders.ts` `negatedStatEffects` | Persist the disposition and remedy once, with causal references. Apply only the affected provision's remaining prospective effect, preserving sunk spending, debt and unrelated interventions. |
| Readings | `packages/player-core/src/judiciary/courts.ts`, `case-file.ts`, `case-effects.ts`; `apps/web/src/washington/courts/` | Show the path and prior judgment, identify when a tied appeal leaves it in force, and never label that as a Supreme Court merits endorsement. Pending nonquorum cases remain visible without repeated attention stops. |
| Compatibility | `packages/engine/src/save.ts`, `state-campaign.ts`, `docs/SCHEMA.md`, `docs/ARCHITECTURE.md` | Normalize old saves while preserving their recorded votes/holdings. Update both canonical docs in the same contract change. |

Today, `CourtCase` holds an order ID, `upheld | struck-down`, votes and generic opinion (`state-judiciary.ts:18-36`). `judicialReviewPhase` directly rules at `review.dueTurn` and reverses the order on strike-down (`judicial-review.ts:31-104`). `decideCase` first draws a holding and vote count, then ranks judges into those slots; it permits an empty-bench ruling and says an even split upholds (`court-votes.ts:77-115`). The tests currently lock in both behaviors (`court-votes.test.ts:25-95`). `courtDocket` and `caseFile` traverse order records (`player-core/src/judiciary/courts.ts:240-279`, `case-file.ts:115-125`).

## First integrated slice

1. Introduce a proceeding whose subject can be an order or another challengeable action, with a lower-court disposition and remedy recorded before Supreme Court review. Define stage transitions and clock/defaults on the existing turn loop and effect-packet path. A legacy completed order case stays completed and historically unchanged; a pending old challenge gains a declared conversion rule without fabricated past facts.
2. Add threshold/interim/lower-merits and review stages sufficient to create a real judgment under review. Do not send every filing to the Supreme Court. Preserve presidential attention only for an actual choice; autonomous court steps appear in the docket and record.
3. At Supreme Court merits stage, resolve participating justices, recusals and quorum. With fewer than six, do not produce a merits holding; record continued posture and the clock. With an equal division, record affirmance of the lower judgment without Supreme Court merits precedent. A later Court grant, stay or remedy is a separate procedural decision.
4. Derive the merits majority from individual justice votes against shared case uncertainty. Use legal authority, factual finding and posture as meaningful common inputs, then interpretive/issue traits and recorded precedent as judge inputs. Keep existing `Person` traits where they suffice; any new field needs a producer, validation, consumer and save plan. The displayed forecast must match the resulting vote algorithm over seeds.
5. Apply the recorded remedy to the challenged action and its affected scope only. Persist the bench, vote, legal/factual basis and exact effect once. Reconcile the Court and order pages, feed, implementation reading, and save/reload.

The later K slices add case families, district/circuit structure, appeal and remand options, vacancies, term calendar and Solicitor General standing. K0's type cannot make these impossible, but its first slice must prove one complete ordinary case path; an order-only direct-to-Supreme-Court path is not completion.

## Mandatory proof still open

| Acceptance | Required evidence before closing | Status |
| --- | --- | --- |
| 2, multiple families and connected case data | At least two materially different ordinary-play families, with parties, legal question, stage, facts, remedy, downstream effects and retained history | **Pending** |
| 3, merits, votes and eligibility | Matched cases and seed batch; each recorded vote causes the count; recusal, six-person quorum, equal division and no empty-bench ruling | **Pending** |
| 4, procedure and remedies | Reachable threshold dismissal, interim relief, appeal/remand, limited remedy and final decision, plus no-choice visibility | **Pending** |
| 5, vacancy to seating | Normal seeded vacancy, nomination, Senate consideration/confirmation, seating, unchanged historical votes | **Pending** |
| 10, once-only institutional action | Signature, rulemaking, implementation, judicial remedy and congressional disapproval across retries, reload and reissuance | **Pending** |
| 12, reversal accounting | Bounds, partial implementation, one-provision relief, unrelated later intervention, repeated cancellation and preserved sunk costs/debt | **Pending** |

Required integrated checks: focused engine tests and old-save round trips; the repository build, typecheck, lint, test and applicable verify gates in their documented order; balance and seed distributions; the live case path in browser at the repository's desktop, phone and narrow widths. This draft claims none of those checks passed.
