# World dynamics: fix methodology and challenge

Written by Codex (gpt-6.1-sol), read-only, on 2026-10-24, from the six domain reports in `domains/` and the probes in `packages/engine/src/__probes__/`. Codex did not rerun the probes, and primary-source retrieval was blocked in its run, so recent legal holdings and external empirical figures it cites are unverified. This file is the methodology every fix in this program follows.

## 1. Fix methodology

**Repair missing paths, wrong signs, accounting and clocks first. Calibrate magnitudes next. Increase event and NPC activity last.** Making every current probe pass would preserve several mistaken expectations and introduce new feedback loops.

I read all six domain reports and all six probe files, including the events report that arrived during this review. I checked implementation paths but did not rerun the probes or modify files. Numerical outcomes below are **reported audit results**, not independently reproduced results. Primary-source web retrieval was denied by the current approval policy; recent legal holdings and external empirical claims remain unverified here.

For compactness, unprefixed engine filenames below are under `packages/engine/src/`; `world/` means `packages/world/src/dataset/`; `player-core/` means `packages/player-core/src/`.

**A calibration contract for every break**

Before implementation, each break needs one record containing:

- The observed behavior and the public action path that produces it.
- The proposed causal explanation, including competing explanations.
- The benchmark's source, date, population, denominator, baseline, shock and horizon.
- Whether the benchmark is an observation, forecast, causal estimate or design judgment.
- The target type, tolerance, regression assertion, balance check and owning mechanism.
- Applicable DECISIONS rules, including any explicit amendment.

Choose the target this way:

| Target | Appropriate use | Acceptance tolerance |
|---|---|---|
| **Exact point or invariant** | Confirmed statutory deadlines, voting arithmetic, eligibility, conservation, duplicate prevention, replay identity | Exact calendar boundary or integer result. Floating-point arithmetic uses the existing module's declared precision. No "roughly a week" allowance for a legal deadline. |
| **Band** | Price response, output loss, recovery, approval response, election distribution | Use the source-supported range. **Proposed design fallback:** ±25% of the *causal change*, where a comparable causal benchmark exists. This is an implementation tolerance, not empirical confidence. Specify onset, peak and recovery bands separately. |
| **Ordering only** | Network influence, relative exposure, rivalry responses, weakly identified political effects | Assert the direction or ranking under controlled inputs. Do not invent a minimum effect merely to make a test numeric. |
| **Distribution or rate** | War onsets, mortality, disasters, litigation, departures | Count events over eligible exposure time; test the aggregate distribution across seeds. Do not require a rare event in every campaign. Distinguish onsets, ongoing cases, attempts and successful outcomes. |

When sources disagree, first reconcile definitions and horizons. Annual-average oil prices cannot validate a simulated weekly peak; active wars cannot validate new-war frequency; traded urea is not total nitrogen production. If comparable sources still disagree, preserve their range or separate scenarios. Do not average incompatible claims or select whichever supports the desired fix.

The game can aggregate institutions and events. It should preserve **direction, ordering, rough magnitude, constraints and consequences**. DECISIONS §4.10 concerns fictional people and outlets; it does not excuse incorrect institutional rules or accounting ([DECISIONS.md:185](../../../docs/DECISIONS.md:185)).

**Shared mechanisms to extend**

Use one mechanism per propagation kind, with domain-specific parameters. Do not build one universal simulator or a separate patch for each country.

| Mechanism | Implementation contract | Existing starting point |
|---|---|---|
| **Network influence** | Combine structural caucus, state-delegation and leadership edges with recorded contacts. Derive bounded reach from weighted connectivity; retain independent willingness at each recipient. Attenuate each hop, visit each recipient once and stop cycles. A connected person reaches more people, without acquiring automatic obedience. | `person-network-influence.ts:14–34,78–94`. Preserve the existing two-hop traversal; its current `.06/depth` attenuation can remain a provisional calibration. |
| **Build-up and decay** | Use a shared bounded approach-to-target form: `next = target + (current − target) × 2^(−elapsedDays / halfLifeDays)`. Give build-up and recovery separate half-lives. Separate transient favors/grievances from durable, cause-tagged structural changes. Time, not just record position, ages memory. | `relationships.ts:20–36,109–119`; exponential precedent in `opinion-war.ts:50` and `regime-acts.ts:52`. |
| **Physical flow and prices** | Derive delivered supply after production losses, route restrictions, usable bypass, inventories and constrained substitution. Feed that same accounting into world prices and national exposure. Export revenue follows **delivered quantity × price**, not price alone. Deduplicate overlapping war, sanction and route losses. | `commodity-shocks.ts:98–112,155–161`; `commodity-kernel.ts:58–84`; `commodity-pressure.ts:99–107`; `trade-volume.ts:115–154`. |
| **Third-party reaction** | A signed, bounded response reads the observer's ties to **both actor and target**, defense obligations, economic exposure, threat and the act's character. Existing participation in the same policy matters. Rivalry may produce neutrality; it must not automatically produce approval. | `resolution-ripples.ts:16–20,39–74,158–169`. Reuse this for sanctions, blockades, strikes and NPC acts through `resolveAction`. |
| **Legal exposure and procedure** | Separate exposure, filing, standing, interim relief, merits, appeal and remedy. Preserve legal authority and scope on the originating act. Use calendar or source-defined session clocks; processing-time distributions are different from filing deadlines. Link every representation of a dispute to one origin. | `orders.ts:490–500`; `court-procedure.ts:7–15`; `judicial-review.ts`; `tariff-orders.ts:105–134`. |
| **Event and response hazards** | Use dated, keyed hazards conditional on eligibility and state; a cooldown makes an event eligible, not inevitable. **Proposed form:** `p = 1 − exp(−λ × elapsedTime)`. Persistent crises belong in existing condition/record infrastructure. Separate simulated occurrences, meaningful presidential cases and feed presentation. | `world-events.ts`; `condition-onset.ts`; `foreign-politics.ts`; `operators.ts`. Mortality should reuse the underlying life-table machinery, without copying judge-specific adjustments to every officeholder. |

For relationship decay, the network report's **26–52-week favor half-life and grievances lasting 2–4 times longer are candidate planning values**, not established facts. Test them against campaign behavior before adoption. Reversion must not erase a treaty, war or severance by rebuilding the relationship from founding data.

For sanctions, the shared exposure record must retain sector, direction, authority and financial reach. `Coercion` currently drops sector entirely (`external-pressure.ts:99–104`); broadening its reach without repairing that contract risks making an oil sanction constrain unrelated commodities.

**Exploit resistance**

- Saturate benefits by recipient, purpose and remaining need. Switching instrument names must not reset habituation.
- Scale costs with resources delivered, operating duration, congestion and commitments. Arbitrary exponential aid prices are not a substitute for diminishing political returns.
- Preserve legitimate cumulative harm. Repeated aggression should not become harmless merely because favorable effects diminish.
- A reversal removes its own remaining wedge after the appropriate lag. It does not erase casualties, sunk costs or earned legal exposure.
- No cycle may manufacture trust, approval, fiscal authority or cash through duplicate credits. Genuine receipts must reconcile to a payer and their economic consequences.
- Test impose/lift/reimpose, aid spam, serial wars, repeated lobbying, overlapping sanctions and route restrictions, and authority renewal through changed countries or sectors.
- Keep preview and charge on the same snapshot, as required by §3.7.

**Proof required for each fix**

1. **Repair the probe's contract first.** Use the public act path, actual eligibility and the production day scheduler. Keep synthetic fixtures for isolated mechanism tests, but do not present them as proof of reachable gameplay.
2. **Convert it into a regression.** Assert the accepted point, band or ordering at explicit checkpoints, including recovery. Add an unaffected control and the relevant reversal or repeat case.
3. **Run matched campaigns.** Reuse the balance harness's existing 12-seed basis and three-party coverage (`balance.test.ts:16–25`). Add valid hyperactive strategies for the repaired mechanic; the existing "reckless" proxy is not a universal exploit test.
4. **Check integration and presentation.** Observe the real action, charged packet, subsequent world state, displayed explanation and save/reload continuation. Preserve pacing equivalence and byte-identical replay (`macro-balance.test.ts:344–358`).
5. **Run the repository gates at the stable integration checkpoint.** Build before typecheck, then lint, tests, every `scripts/verify-*.mjs` gate, and separately `pnpm --filter @admin/engine run test:balance`, following [CLAUDE.md:181](../../../CLAUDE.md:181). Verify the current `apps/player` surface and fresh `dist`.

Existing balance guards include passive/prudent removal rate zero, passive removal-beat rate ≤0.25, reckless ≥0.75, non-reckless treasury ratio >0.1 and all ratios <1.5 (`balance.test.ts:72–100,152–158`). Term checks currently limit absolute House/Senate swings to 45/12 (`term-balance.test.ts:137–148`). These are **existing game contracts**, not historical laws. Change one only through an explained recalibration, never merely to silence a failure.

Two test-suite hazards need handling in wave 0: ordinary Vitest includes `__probes__` (`vitest.config.ts:25–26`), and the events probe writes to a hardcoded scratch location (`__probes__/events.probe.test.ts:30,330`). Its engagement runs also mix source and potentially stale built packages. Do not hide these problems by bulk-skipping failures.

**DECISIONS constraints**

| Fix family | Rules to preserve; amendments to identify |
|---|---|
| **Every fix** | §§1.1–1.12: purity, keyed draws, sorted iteration, one `apply` gate, one `resolveAction` path, provenance, fixed phase order and derived readings. §§2.3–2.5: pacing equivalence and durations in days. §§4.2–4.4,4.11: consumers, units, reconciled aggregates and provenance. |
| Network B1–B9 | §4.8 directed memory. Document the transient/structural split there; preserve fictional casting under §4.10. |
| Economy B1–B11 | §§6.1–6.4: one macro evolution law, levels versus targets, no duplicate charges or self-exciting conditions. §§6.10,6.14: sourced flow and one war bill. Non-littoral naval denial requires an explicit §6.10 amendment. |
| Law | §§2.5,3.5–3.6,6.7: real clocks, defaults, hard cases and declared emergency authority. Extend the already accepted exogenous-docket direction in §13.12, rather than inventing a competing docket. |
| Opinion | Amend §5.16 if salience revision becomes contribution/sign-aware; amend §5.17 for rally fatigue. Preserve district-based elections, cohort/approval separation and issue caps under §§5.3,5.9,13.9. |
| Geopolitics | Retain §6.9's nuclear force refusal unless explicitly replaced. Preserve §6.13's **8 NPC force acts/208 weeks, 26-week pair rest, 2 strait closures/term and 104-week strait rest**. A new escalation path cannot bypass that ledger. |
| Events and attention | §§2.2,3.5–3.6,5.16,6.4–6.5: stop for actual matters, retain hard cases, fire salience on change, avoid self-excitation and use conditions for persistent trouble. Mortality-driven player termination needs a stated game rule. |

State/schema changes also require the corresponding SCHEMA and ARCHITECTURE updates in the same change.

## 2. Challenge of the approach and every reported break

**VERDICT: Accepted with controls.**

The strongest version of this approach repairs causal relationships with a small set of shared mechanisms, then calibrates them at the game's scale. It preserves explainability and determinism while allowing meaningful differences between governments, institutions and campaigns.

This is a shared-context challenge of my own methodology, not an independent review.

| Challenge | Finding and smallest control |
|---|---|
| **Strongest failure — serious** | Longer grudges, automatic rival warming, more NPC slots and clash escalation could jointly produce permanent polarization, repeated strait shocks and collapsing idle campaigns. Keep tempo limits until the combined response/recovery system passes campaign checks. |
| **Best alternative — serious** | A general graph/economy/event framework could consume the project without closing the actual defects. Extend the existing resolvers, commodity kernel, procedures and conditions; require evidence before introducing another subsystem. |
| **Load-bearing claims — serious** | Several "reproduced breaks" establish only that an assertion failed. The blockade probe bypasses ripples; the legal-volume run signed no orders; the two reports disagree sharply on coup frequency. Fix measurement before tuning. |
| **Assumption inversion — serious** | More activity may reduce realism and playability. Hundreds of incidents or court cases do not imply hundreds of presidential decisions. Test event incidence separately from case escalation and attention. |
| **Who pays — serious** | Existing campaigns bear migration errors; players bear unexplained difficulty changes; content writers inherit unstable constants. Preserve origin records, migrate saves explicitly and settle shared contracts before content expansion. |
| **Hostile expert — serious** | A lawyer will reject deadline-as-minimum reasoning; an economist will reject production/trade denominator mixing; a political scientist will reject active-conflict counts as onset rates. Each benchmark must survive those checks before becoming a gate. |

**Network — [report](../../../docs/audits/2026-10-24-world-dynamics/domains/network.md:41)**

| Break | Judgment, target and correct altitude |
|---|---|
| **B1: founding brokerage reaches nobody** | **Real.** Recorded contacts alone feed traversal (`person-network-influence.ts:14–20,80`). Standing leadership reach should exceed a direct call under comparable willingness. Use existing caucus/state/leadership facts. The proposed committee roster does **not** already exist: `state-legislature.ts:372–387` stores chair/ranking/balance, not membership. |
| **B2: display degree determines nothing** | Functional connectivity should affect influence. **Won't fix: abstraction** for making all 8,054 biographies obey a heavy-tailed social graph or Dunbar-sized network. The six-tie cap is explicitly a reading limit (`docs/ARCHITECTURE.md:480`). Build the functional Hill graph; do not enlarge the dossier graph to satisfy a statistical analogy. |
| **B3: short grudges, permanent favors** | **Real asymmetry.** Linear decay is `.12 × (1−vengefulness)`, minimum `.02` (`relationships.ts:20–36`); reported 0.25 grudges disappear in 3–6 weeks. Use transient and durable layers. Neither "every slight lasts a year" nor a universal permanent grudge floor is justified. |
| **B4: history ignores elapsed time** | **Real.** `historyPressure` has rank decay but no current date (`relationships.ts:109–119`). Apply the shared elapsed-time decay; retain bounded history and durable events. |
| **B5: coercion always cools observers** | **Real sign restriction.** `resolution-ripples.ts:158–169` supplies one direction. Reject the proposed automatic `−sign(target disposition)` rule: enemy-of-enemy alignment is conditional. The report's historical embargo example also cannot establish every government's current position. |
| **B6: ally strength is flat** | **Real.** Class constants and the trust `.4` cliff produce the reported identical `.048` response (`resolution-ripples.ts:16–20,63`). Scale through continuous ties and actual exposure inside B5's mechanism. |
| **B7: repeat relief buys alignment** | **Real.** Relief has credit/reserve gates and approximately `.04` trust per shipment, without need or habituation (`instruments-economic.ts:383–389`). Gate emergency relief on unmet need and saturate its benefit. Development assistance need not require a disaster. |
| **B8: personal grudges are write-only** | **Real.** Charge their decayed effect once in the willingness terms. The report's suggestion to add it to both terms and willingness would double-count: `memberWillingness` already consumes `memberTerms`, and success consumes willingness (`lobbying.ts:270–284,344–353`). |
| **B9: misleading trade-partner membership** | **Real semantic/data issue; actual near-zero flows unverified.** Repair `world/trade.ts:128–162`, which derives the list and appends partners before dependence rounding. Ripples should read economic magnitude. A sourced top-N display is not a replacement for the underlying flow model. |

**Economy — [report](../../../docs/audits/2026-10-24-world-dynamics/domains/economy.md:73)**

| Break | Judgment, target and correct altitude |
|---|---|
| **B1: Hormuz peak 1.381 instead of ≥1.5** | **Magnitude not established.** Full war intensity is not complete closure: `ROUTE_CLOSURE=.5`, selective passage and bypass remain (`commodity-shocks.ts:41,98–111`). The annual/quarterly forecast and peak comparison is mismatched. Calibrate lost physical flow first, then its price path. |
| **B2: nitrogen barely moves** | **Missing direct route is real; 1.15 is unsupported.** `commodity-registry.ts:146` has `routes: []`, although gas inputs can move nitrogen indirectly. Adding a TSV row alone will not connect it. Convert traded-urea exposure into the modeled commodity's supply denominator before wiring the route. |
| **B3: stranded exporters gain** | **Real accounting defect.** `commodity-pressure.ts:99–107` rewards price without checking delivered volume. Target net receipts/output under the actual loss, not "every Gulf exporter must lose." Replace the existing Kuwait-gains assertion in `commodity-hormuz.test.ts:94–98` where it contradicts the corrected accounting. |
| **B4: passage has no national quantity channel** | **Real missing channel.** Destination passage affects global loss only (`commodity-shocks.ts:104`). The proposed hit-ratio bound `.628` is arbitrary. Otherwise-equal passed cargo should suffer less physical shortage, while still paying the world price; substitution can narrow the difference. |
| **B5: blockade observers react identically** | **Not proved by this probe.** It calls `rungDefinition(...).resolve` directly (`__probes__/economy.probe.test.ts:119`), bypassing `resolution.ts:840–843` and its ripple contribution. Rerun through `resolveAction`; close any remaining issue through network B5/B6, not another blockade-only system. |
| **B6: wheat peaks at 1.061 instead of ≥1.15** | Missing grain transport exposure is plausible; the target is not isolated from other causes of the historical monthly price rise. Use sourced port/export restrictions and bypass. Do not treat a Black Sea export disruption as complete closure of the Turkish Straits. |
| **B7: Taiwan scarcely affects US output** | **Real critical-input gap.** Existing partner exposure reads export demand, not semiconductor availability (`external-pressure.ts:236–246`). The −2-point floor and quoted larger losses come from a secondhand scenario model, not a measured coefficient. Model constrained inputs, capacity and substitution; a single fungible chip price is insufficient. |
| **B8: sanctions barely hurt Iran** | **Real inconsistency.** National pressure reads bilateral exports (`external-pressure.ts:210–216`), while world supply gives US measures global reach (`commodity-shocks.ts:177–179`). Share scoped financial/trade exposure with GEO-3. Do not grant every designation a whole-economy secondary-sanctions effect or fit directly to total historical GDP contraction. |
| **B9: tariff cycles accumulate inflation pressure** | **Real inconsistency; player profit not demonstrated.** Lifted measures disappear from `tariff-prices.ts:75–91`, but sector shelf-price reversal already exists (`trade-effects.ts:147–167`). The probe sums an inflation target rather than observing actual cost of living. Correct target: a lifted wedge returns toward baseline; a held tariff retains its wedge. They should **not** end at the same level. |
| **B10: no diversion** | **Real.** `trade-volume.ts:115–154` reduces targeted flows without reallocating them. Reuse physical-flow accounting with supplier capacity, substitution costs and delays. Unchanged Vietnam imports are diagnostic; an immediate predetermined gain is not the target. |
| **B11: retaliation misses output** | **Real.** Exports fall, but the macro channel is absent; `trade.ts:685,720` instead charges a one-week private export loss to the Treasury. Model sector value-added/output effects and remove that incorrect debit. Gross lost exports are not dollar-for-dollar lost GDP. |

Additional economy findings:

- **E5/E6:** **Won't fix: abstraction** for separate helium, petrochemical and war-insurance markets. Add aggregated input/logistics effects where they materially change decisions; the report supplies no calibration for separate markets.
- **E14:** Limited SPR and collective-release authorities are legitimate scoped extensions after primary legal verification; reuse existing authority/levers.
- **E17:** Expand routes only with usable bypass and consistent units. Installed pipeline capacity is not spare capacity.
- **E26:** Time-varying evasion is reasonable, but its curve is a planning value until sourced.
- **E27:** Naval denial by a non-littoral actor requires a §6.10 rule change and capability/geography checks. "US blockade" cannot automatically mean "all Hormuz cargo stopped."
- Preserve the reported recovery/no-ratchet controls, while replacing controls that encode the exporter-accounting defect.

**Law — [report](../../../docs/audits/2026-10-24-world-dynamics/domains/law.md:70)**

| Break | Judgment, target and correct altitude |
|---|---|
| **L1: low challenge odds** | **Filing/merits conflation is real** (`orders.ts:490–500`). A universal ≥.75 filing chance is not calibrated. Model salience, injury, plaintiffs and venue separately from whether the challenged act is lawful. |
| **L2: no named state plaintiffs** | **Real missing representation.** `state-suits.ts:1–7` is a selector, not a proceeding producer. Opposition governors do not automatically supply AG authority or standing. Generate fictional parties from injury and institutional authority. |
| **L3: court timing** | **Real procedural compression.** `court-procedure.ts:13–15` advances successive stages by one turn. Separate expedited relief from merits/appeals. Reject "90 days to petition means no cert denial before eight weeks": a deadline is not a minimum wait. Verify the governing rules before selecting timing bands. |
| **L4: too few legal events** | A general/exogenous stream is missing, but the **25-event floor is invalid**. The cited "reckless" run signed **zero orders**, and adding proceedings, cases and oversight may count a dispute repeatedly (`__probes__/law.probe.test.ts:174–185`). Test exposures per actual act and distinct exogenous matters, not total docket volume. |
| **T1: Section 122 reset** | **Reset path confirmed** (`tariff-orders.ts:105–134`). Track the authority episode and statutory clock across reissued measures. A partner-specific cooldown is evadable and invents law. Verify treatment of genuinely new predicates; do not permanently ban future use by assumption. |
| **T2: tariffs cannot enter litigation** | **Real linkage gap.** Feed tariff exposure into the common proceeding mechanism with the correct venue and remedy. "Litigable" does not mean every tariff must generate a suit in one seed. |
| **R1: commission removal rule** | The current generic for-cause record is confirmed (`institution-catalog.ts:147–161`). **Legal staleness needs primary verification.** The report relies on recent secondary accounts of *Slaughter/Cook*. Do not bulk-flip institutions before checking holding, scope and effective date. |
| **R2: commission directives refused** | Same legal-verification dependency. Distinguish chair designation, commission membership, policy supervision and adjudication; changing removal protection alone does not settle every directive's legality. |
| **R3: DOJ directive auto-refused** | **Rule/reason conflation is real** (`directives.ts:209–217`). Route lawful requests through AG judgment and willingness, preserving statutory and constitutional constraints. It is not a presidential entitlement to a prosecution. Keep the separate IRS prohibition. |
| **R4: boilerplate IG removal** | **Real weak validation** (`inspectors-general.ts:279–287`). Require a structured case-specific account and legal exposure for deficient notices. A named judicial finding, regex or prose-length threshold would be another inaccurate rule. |
| **E1: promised 90-day sunset ignored** | **Definite contract violation.** The act promises ninety days but only blocks an order (`legislative-acts.ts:335–345`); lapse reads the renewal interval (`emergency.ts:72–78`). Enforce the enacted limit through the common authority clock. |
| **C1: impoundment absent** | **Real missing power/domain**, already BL-227. The probe's string search is not behavioral proof. Use the source-defined continuous-session clock; **45 continuous-session days are not simply 45 calendar days**. Model rescission, deferral and default release distinctly. |
| **X1: flat strike-down cost** | **Real oversimplification** (`judicial-review.ts:33`). Consequences should follow the affected act and adjudicated remedy. A tariff loss does not automatically imply universal refunds in every case. |
| **X2: special counsel unsupervised** | **Real missing AG path** (`special-counsel.ts:21–28`). Add supervision/countermand/removal under the verified governing process, not a generic presidential dismissal verb. |
| **X3: permissive acting appointments** | **Real eligibility gap** (`appointments.ts:304–327`). Model eligible classes, nominee exceptions and clocks; "no nominee may act" is also too broad. |
| **X4: NEA termination, pocket veto, Byrd rule** | Implement congressional emergency termination through legislation and authority expiry. **Won't fix: abstraction** for pocket veto while adjournment is absent (`signing-window.ts:14–16`), and detailed Byrd-rule adjudication while reconciliation uses a fixed eligible catalogue. The catalogue must still respect its stated legal constraints. |

Additional law findings:

- **C7/C8:** An authorized act is not immune from constitutional challenge. Separate legal grounds; do not add a generic ideological penalty labeled "major questions" or *Loper Bright*.
- **C24:** **Won't fix: abstraction** for arbitrary free-form appropriations riders.
- **C26/C32/C33:** Fed removal, domestic force, clemency and privilege should extend the existing BL-224/225/227/228 work, not create parallel implementations (`docs/BACKLOG.md:49–90`).
- **C34:** Domestic misconduct belongs in the shared legal-exposure stream; a scandal is not automatically an indictment.
- Keep legal background activity aggregated. **Won't fix: abstraction** for presenting an entire real federal docket as presidential cases.

**Opinion — [report](../../../docs/audits/2026-10-24-world-dynamics/domains/opinion.md:50)**

| Break | Judgment, target and correct altitude |
|---|---|
| **B1: serial-war rally renewal** | **Latent refresh path is real** (`opinion-war.ts:42–50,89`). The probe injects eight invasions and does not establish their reachability or net advantage. Use shared rally fatigue only after valid-act testing; the proposed `.5` fatigue per prior rally is unverified. Amend §5.17 explicitly. |
| **B2: contraction costs nothing directly** | **Definite sign defect.** `Math.max(0, growth) * 2` at `opinion-causes.ts:313` treats zero and −5% growth identically. Use a bounded signed contribution. The suggested smaller downside coefficient has no evidence. |
| **B3: inflation should cost ≥6 approval points** | **Not established. Won't fix: abstraction** for matching a President's total historical decline through inflation alone. The report admits causal attribution is unverified. Its observed 2.3-point loss may need calibration, but neither doubling the coefficient nor adding a second misery channel is justified yet. |
| **B4: oil shock increases approval** | **Salience interaction is real; pass-through claim is not proved.** Revision speeds both directions (`opinion.ts:637–644`). Fix contribution-aware revision so a negative shock cannot accelerate unrelated recovery. Crude +40% is not gasoline +40%; household conversion and CPI weights already exist (`commodity-pressure.ts:77–82`). Do not add another gas penalty on top of CPI and price-level effects. Recheck through the full campaign, not three selected phases. |
| **B5: mild midterms** | **Probable compression; proposed target is too literal.** `.12` sensitivity is further reduced by state lean (`election-seating.ts:62,78,148–168`). A historical mean of −37 below 50% approval is not a requirement at 39% in every seed. Calibrate conditional distributions, starting seats and geography; `.25` is an unverified candidate. |
| **B6: undated scandal never fades** | **Definite latent engine defect** (`press-scandal.ts:238–250`). Shipped use was not established in the report; the searched pack/corpus paths did not reveal such flags. Stamp once centrally, migrate old saves and retain causal identity. A content lint alone misses other flag writers. |

**Geopolitics — [report](../../../docs/audits/2026-10-24-world-dynamics/domains/geopolitics.md:83)**

| Break | Judgment, target and correct altitude |
|---|---|
| **GEO-1: too few wars** | **Target invalid.** Reported `.125` new wars/year is compared with **2–4 active conflicts/year**. Measure onsets, durations and occupancy separately. A crisis/escalation mechanism may be warranted; a higher onset floor is not yet justified. Preserve §6.13. |
| **GEO-2: mechanical border clashes** | **Real timer/self-excitation defect.** Threshold `.55`, cooldown 12 weeks and persistent willingness produce repeated clashes (`world-event-templates.ts:83–84`; `world-events.ts:129–159`). Use episode-conditioned hazards and meaningful consultation consequences. Count bilateral event records once; do not turn every clash into war. |
| **GEO-3: sanctions require bilateral trade** | **Definite gate defect** (`instruments-economic.ts:73–75`). Separate designation authority, financial reach and actual effect. Repair alongside economy B8. Do not add an OFAC country whitelist or fabricate trade lanes to make the gate pass. |
| **GEO-4: China does not respond** | **Missing reciprocity and scheduling opportunity are real** (`npc-agent.ts:293–320`; `npc-turn.ts:111–126`). Add bounded response intent and opportunity. Same-instrument retaliation within eight weeks in every seed is too rigid; diplomacy, delay and restraint remain valid responses. |
| **GEO-5: coercing strategic partners** | **Real scoring skew**, given the reported 8/47 acts toward Russia. Add alignment/commitment restraint to existing scoring. The ≤10% target is arbitrary; partners can disagree or coerce one another. |
| **GEO-6: India–Pakistan limited force refused** | **Won't fix: abstraction under current §6.9.** The hard refusal is deliberate (`instrument-gates.ts:201–204`). Limited nuclear-dyad warfare requires a new bounded outcome model and rule amendment. The report's proposed NPC permission while retaining special protection against the President's opponents violates the shared-rule intent. |
| **GEO-7: Israel has zero arsenal** | **Data defect relative to the report's armed-but-undeclared premise** (`world/nations.ts:1101`). Obtain a dated estimate before editing; opacity must not mean zero capability. Rename/split `deliveryTriad` only through a schema migration and consumer audit. Do not insert the unverified "90" figure. |
| **GEO-8: UNSC missing** | **Real institutional gap**, but an ID-presence test proves no voting behavior. Implement verified substantive/procedural voting, veto and abstention distinctions, and explicit effects. A mandate must not automatically become domestic authorization or military success. Reuse organization and coalition machinery. |
| **GEO-9: SCO missing** | **Real, low-priority data omission.** Add a sourced political body through the existing roster; do not invent a mutual-defense obligation. |
| **GEO-10: three-actor cap always binds** | **Binding is not itself a defect.** `npc-turn.ts:41,125` implements a legibility budget. Fix starvation and response opportunity first. **Won't fix: abstraction** for requiring every willing government to coerce every week. Any relaxation follows combined tempo/balance measurements, with feed and simulation budgets separately defined. |

Other geopolitics qualifications:

- **G3:** Territory-by-territory treaty geography can remain an abstraction, but the UI/rules must not promise coverage for unsupported overseas cases.
- **G5/G9/G22/G24:** Empty aggressor joins, one observed war duration, zero responses and nearly static hedger ties are insufficient calibration evidence.
- **G14/G20:** Check shared nuclear predicates before changing data. The report overstates the regime filter: `regime-acts.ts:200–202` checks both warheads and delivery capability, not warheads alone; it also omits the `declared` check named by its comment. Reconcile predicates with §6.15 rather than patching individual countries.

**Events — [report](../../../docs/audits/2026-10-24-world-dynamics/domains/events.md:68)**

The events audit needs the most measurement repair. Feed headlines are not a census: feed writes pass through a cap (`record-effects.ts:256–262`; `feed-cap.ts:33`). Its source/built-package mismatch also limits confidence in the exact engagement figures.

| Break | Judgment, target and correct altitude |
|---|---|
| **BR-01: no nonjudicial mortality** | **Missing normal mortality producer confirmed in the traced engine.** `foreign-politics.ts:456–463` consumes an already-dead leader; `judicial-vacancies.ts:75` supplies the located death writer. Reuse life-table machinery for occupied offices, drawing once per person and avoiding duplicate judge hazards. Judge-specific `.2/.25/.6` adjustments (`judicial-vacancies.ts:25–29`) are not universal politician mortality. **Won't fix: abstraction** for simulating mortality across every unused biography. Recommend excluding unpreventable random player death from the baseline repair; adding that campaign-ending rule is a separate design change. |
| **BR-02: whole event families absent** | **Partly real; blanket absence is false.** Cyber operators already iterate all nations and generate impacts, including home effects (`operators.ts:148–156,203–205,260–300`). Zero matching headlines does not prove no generator. Trace each family's trigger→record→response path; extend existing operators/incidents before creating another system. Aggregate ordinary incidence and escalate presidentially significant cases. |
| **BR-03: no domestic NPC conflict** | Broad actor-driven coverage is a plausible gap, but regex absence does not establish every missing path. Reuse willingness, the election calendar, oversight and legal exposure; do not create an independent domestic actor simulator before tracing those consumers. Autonomous investigations and primary challenges need actual eligible causes. |
| **BR-04: membership erosion** | **Real mechanism concern**, with reported OPEC+14/BRICS7/EU6 exits. `world-events.ts:228–248` repeatedly applies a low-trust exit rule without a dispute process. The proposed **raising** of `LEAVER_TRUST` has the wrong sign: eligibility is `trust <= threshold`, so raising it admits more leavers. Model benefits, grievances, costs and organization-specific procedure. A two-year body cooldown and symmetrical accession/withdrawal rules are unjustified patches. |
| **BR-05: excessive interruption** | **Credible UX defect; exact rate needs rebuilt multi-seed confirmation.** Reported 9.04 stops/30 days and median 3 days are not realism benchmarks. Keep unchanged deferred matters ambient; interrupt on arrival, material change and declared notice/default milestones. "Only arrival or deadline crossing" is too narrow for deteriorating hard cases. |
| **BR-06: recurring removal summons** | **Source-confirmed level trigger.** `player-core/summons/due-executive.ts:343–355` creates a due summons whenever pressure remains within `.08` of the next rung. Track an episode/rung transition and meaningful re-arming. Do not grant idle Presidents immunity: §5.14 permits inability, and the balance harness permits some passive removal beats. |
| **BR-07: repeated scenarios** | **Recurrence-policy concern, not yet a missing mechanism.** The report distinguishes 44 repeated IDs from **9 repeats within 90 days**. Existing `player-core/conversation/scenario-recurrence.test.ts:27–33` explicitly permits a new occurrence after 56 days. Set an episode-sensitive recurrence contract before merely raising a global floor or expanding to 1,500 items. Recurring crises and unique incidents need different policies. |
| **BR-08: hazard calibration** | **Several real gaps, several weak targets.** Onsets are uniformly `.3–.7` (`condition-onset.ts:662`), but absence of an onset ≥.9 does not prove no catastrophic eventual outcome. Population-only placement is inadequate inside eligibility gates (`us-placement.ts:88–94`), but area alone is not a hazard model either. Fit hazard exposure, vulnerability and event footprint. The 500-heat-death and one-hurricane floors lack comparable primary benchmarks; aggregate death-certificate counts cannot directly calibrate selected acute incidents. Empty provenance in `impact-catalog.ts:3–5` is definite. |
| **BR-09: universal Stafford requests** | **Overbroad request generation is real** (`obligations.ts:133–144`). However, a request is not a declaration; "heat is rarely declared" does not establish "no heat request is lawful." Use affected geography and state capacity, then verified legal eligibility at the appropriate decision. The report also overstates four hardcoded prerequisites: capacity is computed from severity; the other three are literal `true`. |
| **BR-10: missing hazard readers** | **Content coverage gap**, with the report naming cyclone, wildfire and tornado. Existing governor-request matters mean these events are not silent. Add readers for reachable causes after the event contract stabilizes. **Won't fix: abstraction** for requiring every content class in every two-year campaign or limiting pandemic-gated health content to an arbitrary 34%. |
| **BR-11: fiscal crises and coups miscalibrated** | **Do not retune yet.** Events reports `.083` coups/year; geopolitics reports `2.6`. The former searches headlines (`__probes__/events.probe.test.ts:215`); the latter counts dated coup records (`__probes__/geopolitics.probe.test.ts:72–76`). Reconcile the census first. Fiscal-crisis spells are not sovereign defaults; 20.8 versus a default benchmark does not identify the proper coefficient. |
| **BR-12: no independent docket** | **Real and already accepted in §13.12.** Merge with law L4. **Won't fix: abstraction** for generating 56–67 individually playable Supreme Court cases each term. Simulate an aggregate background docket and select consequential rulings that change modeled law. |

The remaining event checks should not become new gates unchanged. The reported passive cabinet result (8 departures and 9 leaks) already fits the existing 2–8 departure and 6–15 leak term bands (`term-balance.test.ts:105–111`). A-team turnover is not cabinet turnover. Likewise, a reckless campaign's scandal rate should depend on actual exposed misconduct, not a mandatory annual quota.

**Verification record**

- Steelman stated: answered — "shared mechanisms, then calibrates them at the game's scale."
- All six run: answered — findings from all six challenges above.
- Findings concrete: answered — six serious methodology findings; no fatal or minor methodology findings.
- VERDICT: accepted with controls.
- Self-review: answered — shared-context, disclosed.
- No improvement drift: answered — challenge findings identify failure and the smallest required control; implementation recommendations are separately identified.

## 3. Recommended fix order, models and exclusive ownership

**Critical path:** measurement contracts → physical exposure/accounting and memory → signed reactions and response opportunity → calibrated hazards and opinion → campaign verification.

Repair attention repetition and legal clock violations alongside the first engine work. They need not wait for commodity calibration. Event breadth must wait for attention, lifecycle and response contracts.

| Wave | Work and exit condition | Recommended model |
|---|---|---|
| **0 — Establish valid contracts** | Correct bypassed action paths, capped-feed censuses, denominator errors and unsupported thresholds. Reconcile coup counts. Verify recent legal authorities. Record applicable rule amendments and preserve open failures explicitly. Establish the current built/source baseline. | **Opus** integration lead; **Codex** for precisely specified probe/census repairs. |
| **1 — Close incorrect paths and signs** | Economy B3/B4/B8 with GEO-3; network B3/B4; law T1/E1; opinion B2/B6; events BR-05/06. Exit: reachable acts, correct accounting/signs, clocks enforced, unchanged summons no longer repeatedly interrupt, saves migrate. | **Opus** physical exposure, memory and attention contracts. **Sonnet** scoped opinion/clock changes. **Codex** tariff reset and tariff-wedge repair once contracts are settled. |
| **2 — Connect consumers** | Network B1/B5/B6/B7/B8/B9; legal L1/L2/L3/L4/T2 and confirmed institution corrections; economy B9–B11; GEO-4/5; opinion B4/B1; officeholder mortality BR-01. Exit: meaningful propagation through real actions, no duplicate charges, bounded repeats and valid succession/vacancies. | **Opus** reaction, NPC, legal and succession integration. **Codex** Hill/grudge consumers with fixed specifications. **Sonnet** scoped institutional rules. |
| **3 — Add coverage and calibrate** | Fertilizer/grain/critical inputs, sourced route data, hazard calibration/Stafford, membership process, elections, UNSC/SCO and missing domestic event families. Retune clash/onset rates only after the earlier mechanisms settle. Add hazard/content readers and repair recurrence after cause identities are stable. | **Opus** critical-input, hazard and institutional design. **Sonnet** sourced data and bounded calibration. **Codex** self-contained event families and voting mechanics after specifications. Content follows the existing writers-room procedure. |
| **4 — Integrate and prove** | Matched idle/prudent/reckless and mechanic-specific hyperactive campaigns, all parties, reversal/recovery, save migration/replay, real player journeys, full repository gates and fresh built output. Review changes to balance bands explicitly. | **Opus** owns the integration decision; a scoped independent review follows the repository coordination model. |

**File ownership**

These are persistent ownership lanes across waves. The same file does not acquire a second writer because a later wave needs it. Each lane owns its corresponding ordinary regression tests; the integration owner alone edits audit probes and aggregate balance tests.

| Exclusive lane | Files owned | Model/scope |
|---|---|---|
| **Integration and shared contracts** | `effects.ts`, `effect-types.ts`, `record-effects.ts`, state **type** modules including `state.ts`, `state-legislature.ts`, `state-judiciary.ts`, `save.ts`, `resolution.ts`, `turn-loop.ts`, `turn-phases.ts`, `index.ts`; `__probes__/`; `balance-harness.ts`, `balance-proxies.ts`, `balance.test.ts`, `term-balance.test.ts`, `macro-balance.test.ts`; shared world schemas/registries; `docs/DECISIONS.md`, `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, plan/backlog/handoff and generated `dist` | **Opus.** Specialists submit contract requests; they do not edit these files. `state-suits.ts` is behavior and belongs to the legal lane below. |
| **Physical economy** | `commodity-shocks.ts`, `commodity-pressure.ts`, `external-pressure.ts`, `strait-passage.ts`, `commodity-kernel.ts`, `commodity-registry.ts`, `commodities.ts`, `trade-volume.ts`, `trade.ts`, `trade-effects.ts`, `commodity-hormuz.test.ts` | **Opus.** One owner for shared quantity, price and macro accounting. |
| **Tariff-price projection** | `tariff-prices.ts`, `tariff-prices.test.ts` | **Codex**, after the physical-economy contract specifies repeal and recovery behavior. |
| **Economic instrument gates and assistance** | `instruments-economic.ts` | **Codex** with an Opus-reviewed specification. Sanctions gates and relief habituation share this owner. |
| **Relationship memory and reactions** | `relationships.ts`, `relationship-graph.ts`, `resolution-ripples.ts` | **Opus.** Owns the common memory and observer-response formulas. |
| **Hill influence** | `person-network-influence.ts`, `member-outreach.ts`, `member-votes.ts`, `lobbying.ts`, `lobbying-person.ts`, `ties.ts` | **Codex** after memory/edge contracts; no independent biography-graph rewrite. |
| **Litigation** | `orders.ts`, `judicial-review.ts`, `court-procedure.ts`, `court-calendar.ts`, `state-suits.ts`, `strike-odds.ts` | **Opus.** One proceeding/exposure mechanism for law L4 and events BR-12. |
| **Authority clocks and legislation** | `emergency.ts`, `tariff-orders.ts`, `tariff-statutes.ts`, `legislative-acts.ts` | **Sonnet** owner; Section 122 is suitable for a sequential **Codex** implementation handoff after legal specification. Never concurrent edits to this lane. |
| **Institutional powers** | `institution-catalog.ts`, `directives.ts`, `inspectors-general.ts`, `appointments.ts`, `special-counsel.ts` | **Sonnet**, after primary legal verification and Opus integration design. |
| **Opinion and elections** | `opinion.ts`, `opinion-war.ts`, `opinion-causes.ts`, `press-scandal.ts`, `election-seating.ts` | **Opus** owns integration; signed-growth, scandal aging and specified election tuning suit sequential **Sonnet** handoffs by file. |
| **NPCs and international bodies** | `npc-agent.ts`, `npc-turn.ts`, `world-events.ts`, `world-event-templates.ts`, `coercion-tempo.ts`, `npc-tempo.ts`, `conflicts.ts`, `war-join.ts`, `compacts.ts`, `regime-acts.ts`, `regime-npc.ts` | **Opus.** Membership erosion and border clashes both touch `world-events.ts`; do not assign them to separate parallel writers. |
| **People and succession** | `judicial-vacancies.ts`, `foreign-politics.ts`, `succession.ts`, `congress-members.ts` | **Opus.** Own mortality, foreign succession and corrected coup measurement/consumers. Coordinate appointment contracts with the institutional lane. |
| **Domestic conditions and impacts** | `condition-onset.ts`, `condition-kinds.ts`, `conditions.ts`, `condition-seasons.ts`, `us-placement.ts`, `impact-catalog.ts`, `impact-calculation.ts`, `impact-lifecycle.ts`, `impact-adapters.ts`, `obligations.ts`, `operators.ts` | **Opus** for lifecycle design; **Sonnet/Codex** for sequential, specified families or calibrations. |
| **Attention and recurrence** | Engine `attention.ts`, `advance.ts`; `player-core/summons/due-executive.ts`, `player-core/desk/attention.ts`, `player-core/campaign/store.ts`, `player-core/persistence/save-store.ts`; `packages/content/src/scenario-director.ts` and its tests; `player-core/conversation/scenario-recurrence.test.ts` | **Opus** attention contract; **Sonnet** scoped summons/recurrence fixes. Owns BR-05/06/07 together. |
| **World data** | `world/trade.ts`, `world/nations.ts`, `world/orgs-cradles.ts`, `world/commodity-producers.ts`, `world/chokepoint-flows.ts`, `world/chokepoint-cargo.ts`, their seed TSVs, and `world/state-hazards.ts` | **Sonnet**, one data writer. Supply/source/schema changes go through integration; do not hand-edit values that assembly overwrites. |
| **Content and player presentation** | Authored corpus changes are allocated by distinct job/item through the writers-room process. A separate presentation owner reserves `apps/player/` and affected player-core readers outside the attention lane. | **Sonnet** for scoped presentation; content uses the repository's drafting/review route. No parallel edits to generated corpus outputs or shared exports. |

Any newly necessary file is reserved by the integration owner before work begins. No contributor expands their file set unilaterally. Follow [COORDINATION.md:34](../../../COORDINATION.md:34): sequential work by default; separate worktrees for actual parallelism; one branch merged at a time.

**Source checks, including claims that did not hold:**

- **Held:** the blockade probe bypasses shared ripples — [probe:119](../../../packages/engine/src/__probes__/economy.probe.test.ts:119), [resolver:840](../../../packages/engine/src/resolution.ts:840).
- **Did not hold:** a committee membership roster already exists — [CommitteeSeat:372](../../../packages/engine/src/state-legislature.ts:372) contains leadership and balance only.
- **Did not hold:** cyber events have no home engine path — [operators.ts:260](../../../packages/engine/src/operators.ts:260) explicitly handles player and NPC hosts.
- **Held:** raising the proposed withdrawal threshold would admit more leavers — [world-events.ts:235](../../../packages/engine/src/world-events.ts:235).
- **Held:** the ninety-day emergency promise lacks its enforcement — [act:339](../../../packages/engine/src/legislative-acts.ts:339), [lapse:72](../../../packages/engine/src/emergency.ts:72).

No files changed; no tests rerun.

---
