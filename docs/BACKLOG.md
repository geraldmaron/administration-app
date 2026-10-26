# Backlog

This is the one backlog for this repository. The rules for opening, starting, closing and deferring an item are in `CLAUDE.md`, "Backlog and tracking". `docs/PLAN.md` is the week-of view and names items here by id. During a parallel wave the integrator is the single writer of this file.

Items migrated from Beads keep their old ids (`admin-…`), so the audits, gate records and commit messages that cite them still resolve here. New items take the next free `BL-<n>`. **The next free id is BL-319.** BL-170 was never assigned.

Beads was retired on 2026-10-08 and its history before that date was not kept. The 27 items still open, in progress or deferred that day are below with their full text. A closed bead survives only where this file restates it: the folded scope under each open parent, the re-verify list, and the cut list near the end. Any other bead id in an older doc or commit no longer resolves; read what the citing doc says and check the claim against source.

## How an item is written

Each item is a third-level heading with its id and a plain title, then these fields:

- **Status:** `open`, `in progress`, `deferred`, or `landed, awaiting proof` (code is in, the proof run is not), with the priority and kind where a migrated item had them.
- **Owner:** the wave or program that owns it, and its parent item if it has one.
- **Missing:** what is wrong or not there yet.
- **Acceptance:** what done means, in terms someone can check.
- **Evidence:** file:line at a named commit, a commit, a test, a capture or a record.
- **Blocked by:** what has to happen first, or "nothing".

A decision the owner has to make (under "Owner tasks and decisions") carries **Question**, **Options** (each with what it costs) and **Recommendation** in place of Missing, Acceptance and Evidence, and **Unblocks** where other items wait on it. It closes when the answer is recorded.

Then the full description and notes. Migrated text is kept, except where it taught the retired phone-era runtime; those passages are rewritten for `apps/web` and say so. Line numbers are as of `612d23cf0` unless another commit is named, and the tree moves, so re-grep before trusting one.

An item closes by moving to `## Closed` with the date, a commit that is an ancestor of the branch, and the proof.

## Presidential authority program

A legal and political review of every player act and authored reply against real presidential power, law and recent practice (2026-10-16). Synthesis and ranking: `docs/audits/2026-10-16-presidential-authority/00-SYNTHESIS.md`; the four reviews beside it are cited below as "review 01" to "review 04". Nothing in this section is built. These items come before the control plane's CP1 because BL-221 changes what CP1's tariff package builds on.

### BL-222 The lethal option, covert findings and capture

- **Status:** landed in the working tree (October 18, 2026), not yet closed: scenario replies that run covert or surveillance acts without a finding or warrant (review 04, pattern 7) remain, and belong to BL-226.
- **Owner:** presidential authority program.
- **Landed:** the amend-the-prohibition order is deleted. The lethal operation is offered only while the President is on the opposite side of a live war from the target or the target has an eligible security pursuit against the United States, never against a treaty ally (`regime-rung.ts#lethalRefusal`), and its copy cites EO 12333 §2.11 and 18 U.S.C. §1116. Covert rungs 2 to 5 refuse the President's own government without a standing finding on the target (`finding-gate.ts`), a finding signed on the 48-hour path counting, and rung 2 now writes its record. Capture is off the covert ladder: the Justice Department files an indictment against a foreign leader (`indict`, the `indictment` effect, `Campaign.regimeOperations.indictments`), and `capture` is a force act that needs an open indictment, the War Powers gate at rung 4 and no treaty ally unless a war stands between the two; it writes the War Powers record and the 48-hour report in place of a covert record, serves the indictment, and no longer spends tradecraft or needs a finding. The player meets them as "Seek an indictment of its leader" (Pressure, Justice Department) and "Apprehend an indicted leader" (Force), and DECISIONS 6.15 no longer says capture is always offered. The assessment sheet raises counsel's opinion on the lethal operation (ground, section 2.11, section 1116, no modern precedent, a hard case that no delegation covers) and carries a targeting-review row on every strike; the "Infrastructure" objective is now "Dual-use targets" in law-of-war terms. Tests: `regime-acts.test.ts`; the Hill golden capture was re-taken for the finding gate (ninth note in `hill-ledger-golden.test.ts`) and was not moved again by capture.
- **Missing:** (1) the capture is one raid with no custody or trial beats afterward, and head-of-state immunity for a leader the United States recognizes is stated in the authority record but not modeled. (2) Counsel's opinion is a row on the review sheet and a refusal, not a separate confirmation step; the lethal act uses the review sheet's own confirmation. (3) The capture has no force package of its own: it is gated on branch strength and reach and writes the War Powers record at rung 4. (4) Scenario replies that run covert or surveillance acts without a finding or warrant (review 04, pattern 7) are not touched.
- **Acceptance:** capture is a force act gated on an indictment (met); the lethal option raises counsel's opinion as a hard case (met as a sheet row); strike objectives carry a targeting-review line (met).
- **Evidence:** review 01 highest-priority fixes 1 to 3 and 8; review 04 pattern 7.
- **Blocked by:** nothing.

### BL-223 Emergency, sanctions and spending gates

- **Status:** open · high · engine, copy.
- **Owner:** presidential authority program.
- **Missing:** sanctions, freezes and embargoes need no declared IEEPA emergency (review 02, S2-S4). NEA and Stafford declarations are tangled, and a declaration makes a state consent (E1). Direct federal relief needs no Stafford declaration (E7, E8). Strategic nationalization needs no act of Congress (B5, *Youngstown*). Recurring program spending needs no appropriation (B4). About 15 scenario replies spend money no appropriation covers (review 04, pattern 5).
- **Acceptance:** the sanctions ladder requires `activeExternalEmergency`. A hazard at a state is a Stafford §401 or §501 act and never implies the state's consent. Relief draws on the Disaster Relief Fund after a declaration. Nationalization and recurring spending become requests to Congress. Tests cover each refusal and its words.
- **Evidence:** review 02 highest-priority fixes 2 to 5 and 7; review 04 patterns 3 and 5.
- **Blocked by:** nothing.

### BL-224 Domestic force as gated, contested acts

- **Status:** open · high · engine, copy.
- **Owner:** presidential authority program.
- **Missing:** the game refuses Guard federalization outright and hides the refused verbs, while scenario replies let the President clear squares and seal neighborhoods (review 01, N50-N53; review 04, pattern 2). The law in between is real: the Insurrection Act (10 U.S.C. §§251-255) and §12406, read narrowly in *Trump v. Illinois* (2025), and the Posse Comitatus Act.
- **Acceptance:** the Insurrection Act and §12406 are gated, contested acts showing counsel's view, the courts and the political cost. The federal law-enforcement surge is enabled with the existing coercion pricing. The federalization glossary entry and row naming are corrected. Replies that promise a federal clearance route through these acts or become requests to a governor.
- **Evidence:** review 01 highest-priority fixes 4 to 6; review 04 pattern 2.
- **Blocked by:** nothing.

### BL-225 Executive branch law: removals, treaties, the Justice Department and vacancies

- **Status:** open · high · engine, copy, registry.
- **Owner:** presidential authority program; folds BL-165's independence memorandum defect.
- **Reconciled (2026-10-25, Wave 2 integration, owner ruling):** the institutional-powers lane (`0c50ff3fb`, merge `02c0f13fa`) landed R1 to R4, X2 and X3 against the primary texts of *Trump v. Slaughter* and *Trump v. Cook* (opened 2026-10-25; sources in `lanes/institutions.md`). The owner then ruled on R1 (coordinator's call, accepted): only the FTC (Slaughter's holding) and the CFPB (Seila Law) are at will; the SEC, FCC, CFTC, FDIC and NRC keep their protection in the catalog, a removal there goes through with or without a cause and opens a legal exposure priced in the administration's favor (`removalContested`, `contestedRemovals`, `legal-exposure.ts#removalExposures`); the Fed and the NLRB stay protected. Direction follows protection, so policy supervision reaches the FTC and CFPB only. DECISIONS 4.14; `docket.ts`'s constraint copy now says which of the three a body is. Probes R1 (rewritten to the ruling), R2 (rewritten to it), R3, R4, X2 and X3 pass on the integrated tree. Still open: treaty withdrawal (22 U.S.C. §1928f), Fed governor removal for cause with notice and court review, registry records for *Slaughter*, *Seila Law*, *Collins*, *Wilcox* and *Cook*, the glossary's independence copy, the surfaces that collect an IG-notice account and invoke `superviseSpecialCounsel` (no act wiring yet), a `Question` of the Attorney General's own (casework reuses `certify-order`'s phrases), the at-will commissions' exemption from OMB review (Executive Order 14215, unopened), and BL-306 and BL-307.
- **Extended (2026-10-24, world dynamics program, Wave 2, institutional-powers lane, Sonnet):** law R1, R2, R3, R4, X2, X3 reproduced by `law.probe.test.ts`: SEC and FTC chairs `for-cause` (`packages/engine/src/institution-catalog.ts:147-161`), the SEC enforcement directive and the DOJ investigation directive refused (`directives.ts:209-217`), and "changing priorities" accepted as an inspector general removal reason (`inspectors-general.ts:279-287`); special counsel unsupervised (`special-counsel.ts:21-28`) and any national accepted as an acting officer (`appointments.ts:304-327`) by code read. R1 and R2 wait on the primary text of *Trump v. Slaughter* and *Trump v. Cook* (the audits read law-firm summaries): verify holding, scope and effective date before flipping any institution. R3 routes through the Attorney General's judgment and willingness, keeping statutory and constitutional limits and the IRS bar. R4 needs a structured case-specific account with legal exposure for a deficient notice, not a regex or a length rule. X3: eligible classes, the nominee exception and clocks, not "no nominee may act".
- **Missing:** independent commissions are treated as protected, though *Trump v. Slaughter* (2026-06-29) made most members removable at will (review 03, R7, R13). Treaty withdrawal is refused, though only NATO is protected by statute (22 U.S.C. §1928f) (R32, R29). Directing the Justice Department is refused as if by statute rather than policy (R10). The Vacancies Act's eligible classes, nominee bar and clock aren't enforced (R3). Inspector general removal needs no case-specific rationale (R9). There is no Fed governor removal for cause, and the chair's tenure is shown as settled (R8, review 02 M3).
- **Acceptance:** commissions are at will with a political price, and the independence memorandum covers only the Fed, courts, Congress and states. Treaty and organization withdrawal is an act, with NATO refused under §1928f. Directing the Justice Department is an Attorney General decision with a hard case and downstream risks. Acting officers follow the Vacancies Act. Inspector general removal needs a rationale, and generic notices show as unlawful. Fed governor removal is a for-cause path with notice, a chance to respond and court review, and the chair copy says the question is open. Registry records exist for *Slaughter*, *Seila Law*, *Collins*, *Wilcox* and *Cook*.
- **Evidence:** review 03 highest-priority fixes 1 to 4, 6, 7, 9; review 02 M3.
- **Blocked by:** nothing.

### BL-226 Scenario reply content pass

- **Status:** open · high · content.
- **Owner:** presidential authority program; the writers' room (`content-lead`, then `content-reviewer` in a separate session).
- **Missing:** 125 statement-only replies promise something the President can't do (judging, warrants, elections, spending without an appropriation, seating judges, deposit guarantees, strike requisitions), and the nine clemency scenarios follow another country's procedure (review 04, patterns 1 to 8).
- **Acceptance:** every reply listed as flagged in review 04 is rewritten to what a President can do, routed to a gated act, or removed, and the clemency scenarios follow U.S. procedure. The corpus validator passes, and a content review record names each reply's disposition.
- **Evidence:** review 04, "Every flagged reply" (scenario, reply id and shard line).
- **Blocked by:** BL-227's clemency act for the nine clemency scenarios; BL-221 to BL-224 for the act-triggering replies.

### BL-227 Missing presidential powers, first set

- **Status:** open · high · engine, player-core, UI.
- **Owner:** presidential authority program.
- **Reconciled (2026-10-25, Wave 2 integration, owner ruling):** the impoundment line landed (institutional-powers lane `0c50ff3fb`, merge `02c0f13fa`): `proposeRescission`, `proposeDeferral`, the weekly clock in `budgetPhase`, the count on day 25, default release on day 45, no second proposal, pocket rescission shown as contested, deferral purposes and the Comptroller General's report and suit. The owner ruled that pro forma sessions count as continuous session (current practice), so `congressional-session.ts` no longer leaves recesses out and the 45 days run close to 45 calendar days; DECISIONS 6.18. Probe C1 passes, rewritten to the ruling: the message is dated at the week's sitting (January 27 for one sent on the oath), its 45th day of continuous session is the 45th calendar day (campaign day 52), and the money is released on day 54, in that week. Still open: clemency, a lawful strike on a non-state group, Congress forcing a War Powers vote, the veto, and an act, review entry and surface for rescission and deferral (none invokes them yet).
- **Extended (2026-10-24, world dynamics program, Wave 2, institutional-powers lane, Opus):** law C1 confirms the impoundment gap (`law.probe.test.ts` C1: no order or act names rescission, impoundment or deferral); that probe is a string search and is replaced by a behavioral test when the act lands. The 45-day hold counts days of continuous session (2 U.S.C. 683), not calendar days; rescission, deferral and release by default are distinct.
- **Missing:** clemency (Art. II, §2, cl. 1) (review 03, R38); rescission and deferral under the Impoundment Control Act, with pocket rescission shown as contested (review 02); a lawful targeted strike on a non-state group and non-state targets for strikes and authorizations (review 01, missing capabilities 1 and 2); Congress forcing a War Powers vote, and the veto (review 01).
- **Acceptance:** each is an act with its legal basis in the registry, its procedure and cost computed in the engine, a review entry and a Record entry, with tests.
- **Evidence:** the "Critical capabilities missing" sections of reviews 01 to 03.
- **Blocked by:** nothing.

### BL-228 Missing presidential powers, second set

- **Status:** open · medium · engine, player-core, UI.
- **Owner:** presidential authority program.
- **Missing:** executive privilege, recess appointments (with pro forma sessions), signing statements, declassification, recognition of governments, the refugee ceiling and TPS (review 03); the arms sale notice under the Arms Export Control Act and the security-assurance relabel (review 01, N37, N38); trade agreements on the trade promotion authority path and the executive-agreement copy (review 03, R26, R28, R29).
- **Acceptance:** as BL-227.
- **Evidence:** review 03 highest-priority fixes 8 and 10; review 01 highest-priority fix 10.
- **Blocked by:** nothing.

## World dynamics program

A realism audit of how changes ripple through the world (2026-10-24): six domain audits, Codex's fix methodology and challenge, and probes that state each real-world expectation. Program record and break register: `docs/audits/2026-10-24-world-dynamics/PROGRAM.md`; method, verdicts and file lanes: `METHODOLOGY.md` beside it. Probes run with `pnpm --filter @admin/engine run test:probes` and `pnpm --filter @admin/player-core run test:probes`; a probe for an open item fails until the item lands. Each item below is one fix unit in one lane; "Probe" names the assertion its acceptance turns green. Items that extend an older backlog entry are marked on that entry instead.

### BL-279 A contraction costs approval

- **Status:** landed, awaiting proof · high · engine. Merged at `ff03c33b4`, integrated 2026-10-25: the growth term is `clamp(growth, ±0.1) × 2` (`opinion-causes.ts`, `GROWTH_WEIGHT`, `GROWTH_READING_LIMIT`), and probe `opinion.probe.test.ts` 3a passes (prosperity target 0.6254 at 0% against 0.5254 at −5%). It moved nothing in the Hill golden's four 30-week runs, whose US growth stays positive. Open: the acceptance's balance-harness run and report (Wave 4 checkpoint).
- **Owner:** world dynamics program, Wave 1; opinion lane (Sonnet handoff, Opus reads the balance run).
- **Missing (as of Wave 0):** the growth term is `Math.max(0, growth) * 2` (`opinion-causes.ts:313`), so zero growth and −5% give the same prosperity target.
- **Acceptance:** a bounded signed contribution, with no asymmetric coefficient unless sourced. Probe `opinion.probe.test.ts` 3a (ordering: −5% growth lowers the prosperity target by more than 0.02 against 0%) passes; the balance harness is run and the change reported.
- **Evidence:** Wave 0 run: 0.6254 at both.
- **Blocked by:** nothing.

### BL-284 Relief needs a need, and repeated aid saturates

- **Status:** landed, awaiting proof · high · engine. Economy lane `ce6519916` (merge `52bd5268d`), integrated 2026-10-25. Relief gates on `unmetNeed`, is sized to what it delivers, and aid goodwill saturates by giver, recipient and purpose (`aidReception`, `AID_SATURATION` 1, a planning value). Probe network 4a is split as the lane asked: relief to Pakistan with no condition is refused ("missing a disaster or crisis at the target that relief from us is not already answering"), and of twelve weekly development grants six land, with the late mean 0.0183 under the first 0.0645. `instruments-economic.test.ts` holds the aid-spam bound. Open: the acceptance's impose/repeat exploit check in the balance harness's hyperactive proxy (`balance-proxies.ts`; suggested: land a grant or relief on one recipient every eligible week and assert the term's trust gain stays under four times the first act's), Wave 4.
- **Owner:** world dynamics program, Wave 2; economic-instruments lane (Codex, Opus-reviewed spec).
- **Missing:** an emergency relief shipment gates on credit and reserves only and adds about +0.04 trust every time (`instruments-economic.ts:383-389`); no repeat term covers assistance (`relationships.ts:277`).
- **Acceptance:** emergency relief gates on unmet need at the target (development assistance need not); its benefit saturates by recipient and purpose so switching instrument names does not reset it; costs scale with what is delivered. Probe `network.probe.test.ts` 4a (ordering: the late landed shipments average less than the first) passes, and an impose/repeat exploit check is added to the balance harness's hyperactive proxy.
- **Evidence:** Wave 0 run: 12 shipments to Pakistan, gains 0.037 to 0.044, total +0.412, flat cost.
- **Blocked by:** BL-277 (decay supplies the other half).

### BL-285 Trade-partner lists read flow magnitude

- **Status:** open, in part · medium · dataset, engine. The data half landed (economy lane `ce6519916`, merge `52bd5268d`) and so did the magnitude half (reactions lane `1eafee1c8`, merge `eaef82bed`) and the registry entry (integration `bd7da1cdc`). Remaining: the founding-world balance check, which has not been run.
- **Wave 3 (2026-10-25):** `topPartners` is the five largest modeled shares (`TOP_PARTNERS = 5`, the WITS Trade Summary's cut), and a world test pins Iran's list. `relationship-graph.ts#laneMagnitude` now feeds `tradeTie`, `tradesWith`, `hasStandingLink` and `observerTies`, so list membership no longer sets a bonus, an exposure or a link (`relationship-graph.test.ts` "ignores whether a partner made the short list", "warms continuously with the lane, with no step anywhere along it", "opens a link only on a lane in the reader's own books"; a lane test in `resolution-ripples.test.ts`). Founding mean trust 0.0899, 0.0898 and 0.0898 and hostile pairs 147, 130 and 154 on memory-1..3. At integration the Shanghai Cooperation Organisation stopped adding trade pull (`trade.ts#NO_TRADE_PULL`), so Iran's list is now CHN, TUR, IND, IRQ and SAU (`trade.test.ts`), and `trade.topPartners` has its `stat-consumers` entry. Hostile-pair and trust figures above predate the SCO change.
- **Owner:** world dynamics program, Wave 2; world-data lane (Sonnet).
- **Missing:** the founding-world balance check over 12 seeds is the only clause left. The first half of the original text (the list held every nonzero flow) is fixed.
- **Acceptance:** the list derives from magnitude with a sourced cut and citation (DECISIONS §4.11); ripples read dependence magnitude rather than list membership (lands with BL-282). A dataset test pins Iran's list.
- **Evidence:** `network.probe.test.ts` 3a log line.
- **Blocked by:** nothing.

### BL-286 A lifted tariff's price wedge phases back out

- **Status:** landed, awaiting proof · high · engine. Economy lane `ce6519916` (merge `52bd5268d`), integrated 2026-10-25: a lifted tariff's passed-through share phases back out over 26 weeks (`tariff-prices.ts`, `TariffPriceMove.unwinding`). Probe economy B9 passes: held 0.000121; four lifted cycles end at about 0 (6.8e-21) with a peak of 0.000121. Open: the acceptance's Wave 4 end-to-end check of the household cost-of-living reading.
- **Owner:** world dynamics program, Wave 2; tariff-price lane (Codex, after the physical-economy contract states repeal and recovery).
- **Missing:** lifted measures drop out of `projectTariffPrices` (`tariff-prices.ts:75-91`) and nothing reverses the inflation pressure they already fed the macro target (`external-pressure.ts:259`), so four impose-and-lift cycles leave four times one held tariff's price rise. The sector shelf price does reverse (`trade-effects.ts`, BL-184), so the two readings disagree.
- **Acceptance:** on lift, the share already passed through phases back out over the same 26 weeks; a held tariff keeps its wedge, so the two do not end equal. Probe `economy.probe.test.ts` B9 (ordering: a year after the last lift the cycled level sits below the held one and below its own peak) passes, and Wave 4 checks the household cost-of-living reading end to end.
- **Evidence:** Wave 0 run: held 0.000121, cycled 0.000484, cycled peak 0.000484.
- **Blocked by:** BL-275 (the physical-economy contract).

### BL-288 Salience speeds revision only the way the story pushes

- **Status:** open, in part · high · engine. Opinion lane `243e7b5b0` (merge `e6924e8ec`), integrated 2026-10-25: a loud judgment revises fast only in the direction its story pushes (`opinion.ts#SALIENCE_PUSH`); no second gas term; DECISIONS 5.16 amended. Probe opinion 10 still fails on magnitude: the war arm's headline now sits below the control at week 26 (0.6029 against 0.6033; at Wave 0 it sat above), but by 0.0005, not the 0.01 asked; the probe's Iran–Saudi war registers no pump shock in either arm, so its price channel needs a look before the magnitude can be read. Open: probe 10's magnitude, then the acceptance's recheck over a full campaign (Wave 4 balance run).
- **Wave 3 (2026-10-25):** no Wave 3 lane claims this item. At the Wave 3 integration probe opinion 10 reads 0.6026 against 0.6033 (a 0.0007 gap against the 0.01 target); the war arm's pump shock does not persist, the same reading as Wave 2R (`gates/w3.md`).
- **Owner:** world dynamics program, Wave 2; opinion lane (Sonnet rule, Opus checks the campaign).
- **Missing:** a loud driver revises at 0.20 a week in both directions (`opinion.ts:637-644`), so a Gulf war's pump shock, landing while prosperity sits below its target, speeds prosperity's recovery: the war arm reads higher than the control.
- **Acceptance:** revision is contribution-aware, and no second gas penalty is stacked on CPI and price-level effects. Probe `opinion.probe.test.ts` 10 (ordering: the war arm's headline sits more than 0.01 below the control at week 26) passes and the result is rechecked over a full campaign, not three phases. DECISIONS §5.16 amended.
- **Evidence:** Wave 0 run: week 13 prosperity 0.672 against 0.622; week 26 headline 0.6073 against 0.6033.
- **Blocked by:** nothing.

### BL-290 A Taiwan war constrains output through semiconductors

- **Status:** open, in part · critical · engine, dataset.
- **Wave 3 (2026-10-25):** economy lane `62585cefa`, merge `1178040a4`, integrated at `bd7da1cdc`: a Taiwan war cuts US chip supply by Taiwan's 23 percent share net of substitution, charged on a stated list of chip-dependent sectors (`external-pressure.ts#chipShortfall`, `criticalInputCut`, `CHIP_DEPENDENT_SECTORS`); probe B7 moved from −0.000124 to −0.0186. Asserted by `external-pressure.test.ts` "costs American output more in a war on Taiwan than in a war on no chip supplier" and "stops costing it the week the war ends". The sector list and magnitude are planning values, and partner economies have no chip channel.
- **Owner:** world dynamics program, Wave 3; physical-economy lane (Opus), data in the world-data lane.
- **Missing:** (as of Wave 3) the ordering is built, but there is no Taiwan Strait row in `chokepoint-flows.tsv` (though `geography.ts` names the strait); the shortfall does not read `inputIntensity` (`trade-sectors.ts`, 0.7 for semiconductors) and uses a stated sector list; `economy.probe.test.ts:181` still carries the `it.todo` the ordering test was meant to replace; partner economies have no chip channel; and no band exists, correctly, since no sourced causal estimate does. Wave 0 text: no critical-input channel existed, and a full China-Taiwan war moved US growth pressure by −0.000124.
- **Acceptance:** met: an ordering test (US output hit under a Taiwan war larger than under a war with no critical-input supplier), in `external-pressure.test.ts`. Open: the shortfall read through `inputIntensity`, a Taiwan Strait route with sourced flow, and the probe's `it.todo` converted or deleted; a band only from a sourced causal estimate (the Bloomberg Economics figures are a secondhand scenario model). Content for the scenario family goes to the writers' room.
- **Evidence:** Wave 0 run: −0.000124.
- **Blocked by:** BL-275.

### BL-293 The Security Council, the SCO and nuclear-arsenal data

- **Status:** open, in part · high · dataset, engine.
- **Wave 3 (2026-10-25):** bodies lane `48439a78e` (merge `20e13401c`) and NPC lane `ec9cbbd74`, integrated at `bd7da1cdc`: `ORG-UNSC` with Article 27 voting in `security-council.ts` (`security-council.test.ts`; `orgs-cradles.test.ts` seats five vetoes and ten elected members), `ORG-SCO` as a political body with no defense clause, Israel at 90 warheads undeclared (SIPRI Yearbook 2026, table 8A.10), and one nuclear predicate (`instrument-gates.ts#declaresDeliverableArsenal`, used by `regime-acts.ts`; `regime-acts.test.ts`). The SCO adds no trade pull at integration (`trade.ts#NO_TRADE_PULL`), which was the damping clause. The sourced-estimate blocker is cleared. Probe C (Israel reads as nuclear) passes. Probe E (a permanent member abstaining on a nine-vote draft) fails by design: under the current vote margins no draft both passes and draws a Russian or Chinese abstention, so it needs a planning-value retune or a probe re-cut on a constructed position set (`gates/w3.md`).
- **Owner:** world dynamics program, Wave 3; data in the world-data lane (Sonnet), voting and predicates in the NPC lane (Opus design, Codex build).
- **Missing:** no UN Security Council or P5 veto and no SCO among the 15 bodies (`packages/world/src/dataset/orgs-cradles.ts`). Israel's arsenal is `{ warheads: 0, declared: false }` (`nations.ts:1101`), so attackers get no deterrence drag. `deliveryTriad` is used as "can deliver" and set for GBR, FRA and PAK. `regime-acts.ts:199-202` checks warheads and delivery but not the `declared` flag its comment names, while `instrument-gates.ts:201-204` checks all three.
- **Still open (Wave 3):** (1) the delivery field is neither renamed nor split, and `lanes/bodies.md` recommends leaving it and renaming in prose, which contradicts the acceptance, so the owner either accepts that (the acceptance is edited) or funds the schema migration; (2) a path from play into the Council (a President cannot put a draft to a vote); (3) probe E as above; (4) other political bodies still add trade pull pending a balance run. Data questions the bodies lane left outside this item are BL-314.
- **Acceptance:** UNSC with verified substantive and procedural voting, veto and abstention, whose resolutions have explicit effects and never become domestic authorization or military success by themselves; the SCO as a sourced political body with no defense clause; a dated, sourced Israeli estimate with `declared: false`; the delivery field renamed or split through a schema migration and consumer audit; nuclear predicates reconciled with §6.15. Probes `geopolitics.probe.test.ts` E (presence) and C (Israel reads as nuclear) pass, and a voting test replaces the presence check.
- **Evidence:** Wave 0 run: both E tests and C fail as written.
- **Blocked by:** nothing (the sourced Israeli estimate landed).

### BL-294 Home event families and domestic conflict without the player

- **Status:** open, in part · critical · engine, content.
- **Wave 3 (2026-10-25):** home lane `766ce081f` (merge `dbc64f539`), integrated at `bd7da1cdc`: cyber emergence fixed (alphabetical rooting in `operators.ts`) and a third home condition family (`condition-home-events.ts`: cyberattack, work stoppage, large bank failure, mass-casualty attack, wrongful detention) with rates from BLS, FDIC, Mother Jones and Foley, asserted by `condition-home-events.test.ts` and probe B (one `it` per family). Remaining: probe B's labor-strike case fails by design (0.33 a year; METHODOLOGY forbids lifting a rate to meet a floor), so the probe floor needs a justified rewrite; probe C's governor-versus-legislature, Federal Reserve independence and primary-challenge families have no trigger-to-record path (traces in `lanes/home.md`, files outside the lane); and a Desk matter and institutional response path per family were not verified.
- **Owner:** world dynamics program, Wave 3; domestic-conditions lane (Opus design, Codex per family), writers' room for readers.
- **Missing:** at home the engine records only weather, pandemic and macro conditions plus cyber impact events (`condition-kinds.ts:15-29,99`; `impact-adapters.ts:39`); no record kind exists for bank failures, major work stoppages, mass-casualty attacks or hostage cases, so none can occur whatever the run length. No governor-versus-legislature, Fed-independence or primary-challenge event appears in the ledger's narration or the filed wire of three idle four-year runs; regex absence does not trace every path. Cyber has a path (operators, `operators.ts:260-300`) but struck the United States in none of the three runs.
- **Acceptance:** each family traced trigger to record to response first; families added as incidents or conditions with sourced rates, eligibility read from state, an institutional response path and a Desk matter, aggregated at ordinary incidence with presidentially significant cases escalated; domestic actor conflict reuses willingness, the election calendar, oversight and the legal-exposure stream rather than a new simulator. Probes `events.probe.test.ts` B (one home record of each family across seeds, a rate) and C (domestic families in the record) pass family by family.
- **Evidence:** Wave 0 run: no home record of any of the five families in three idle four-year runs; governor-legislature 0, Fed 0, primary 0 in the ledger and the filed wire, while committee inquiries (6) and cabinet leaks (5) do occur, so those two are not part of this item.
- **Blocked by:** BL-281 (attention), BL-123 (exposure stream).

### BL-295 Home hazard calibration and Stafford eligibility

- **Status:** open, in part · high · engine, dataset.
- **Wave 3 (2026-10-25):** home lane `766ce081f` (merge `dbc64f539`), integrated at `bd7da1cdc`: onsets from NOAA, OpenFEMA and HHS records; placement from SPC tracks and OpenFEMA declarations ("almost never puts a city-scope tornado in New York City", `us-placement.test.ts`); per-event tolls fitted to NOAA means; Stafford requests only from reached states, capacity read against the $1.94 per-capita indicator (`obligations.test.ts`); the impact catalog cites sources (`state-hazards.test.ts`); onset severity carries a tail (`condition-onset.test.ts`). Probe A passes except its three `it.todo`s. Remaining: the hurricane landfall rate, heat mortality and severity tail todos (`events.probe.test.ts:124-126`); earthquake, outbreak, cyber and strike impacts are unfitted; the fiscal-crisis condition's real-world referent is not written (probe C todo at `:241`).
- **Owner:** world dynamics program, Wave 3; domestic-conditions lane (Opus design, Sonnet data).
- **Missing:** onset severity is uniform 0.3 to 0.7 (`condition-onset.ts:662`); heat fatality is `.00002` (`impact-catalog.ts:15`); city placement inside a hazard's state gate is by population (`us-placement.ts:86-96`), putting about one in ten city-scope tornadoes in New York City; the impact catalog's calibration has `sourceRefs: []` (`impact-catalog.ts:3-5`, against DECISIONS §4.11). A nation-scope condition files a Stafford request from every state, with three prerequisites literal `true` and capacity read from severity alone (`obligations.ts:101-146`). Fiscal-crisis spells abroad (about 20 a year) have no defined real-world referent.
- **Acceptance:** hazard exposure, vulnerability and footprint fitted to comparable incident series, with sources in the catalog; placement weighted by hazard exposure; requests only from affected states with capacity read from the state, and legal eligibility checked at the declaration, not at the request. Probes `events.probe.test.ts` A (NYC tornado share under 0.02; fewer Stafford requests than states for a nation-scope heat wave; catalog cites a source) pass, and each A `it.todo` becomes a band once its series is sourced. The fiscal-crisis condition's referent is written down before any rate is asserted.
- **Evidence:** Wave 0 run: New York City takes 0.098 of city-scope tornado placements; 51 Stafford requests from 51 states for one nation-scope heat wave; `sourceRefs` empty; onset severity 0.300 to 0.700 over 4,000 draws; 0.17 heat deaths a year against 68.6 tornado deaths; 0, 1 and 3 hurricanes in three four-year runs; 20.8 fiscal-crisis spells a year abroad.
- **Blocked by:** sourced series.

### BL-296 An episode-sensitive scenario recurrence contract

- **Status:** open · medium · content, player-core. The contract is built and written (DECISIONS 7.13) but its probe assertion fails on the integrated tree, so the item stays open.
- **Wave 3 (2026-10-25):** home lane `766ce081f` (merge `dbc64f539`), integrated at `bd7da1cdc`: `scenario-director.ts#recurrenceKind` and `recurrenceAllows` (unique once, arc members by family, episode-bound per episode after the class cooldown, routine business rests `RECURRING_REST_TURNS` = 13 weeks), asserted by `scenario-recurrence.test.ts`; `scenarioMatterSource` gives each scenario matter an attention signature, which changes only when urgency turns hard or the occurrence changes, not on a new beat or nearer window stage. Stops per 30 days fell 8.14 to 6.74 and 6.66 to 6.49 (lane measure; DECISIONS 2.2). Probe `engagement.probe.test.ts` D2 replaced the `it.todo` and fails (`gates/w3.md`): three recurring scenarios come back 73, 81 and 84 days after the last answer. The cause is inferred, not logged: the probe measures answer to answer, while `recurrenceAllows` rests 13 weeks from the day the scenario was last raised (`since = campaign.turn - prior`), so a late answer shortens the measured gap.
- **Owner:** world dynamics program, Wave 3; attention-and-recurrence lane (Sonnet).
- **Missing:** the contract and the probe disagree on what 13 weeks is measured from. Either (a) align the probe to raise day (measure each repeat from the previous occurrence's raise), or (b) the owner rules that rest should key to the answer turn, which is a change to `recurrenceAllows` and to DECISIONS 7.13 (it says a routine matter rests thirteen weeks). Until one is chosen D2 fails. Original text: a President who answers everything meets the same scenario again (44 ids twice in 135 answers in the events audit, 9 within 90 days); the only stated contract was that a template may recur 56 days after its last occurrence settles (`scenario-recurrence.test.ts`); a recurring crisis and a unique incident were not told apart.
- **Acceptance:** a written recurrence contract by kind of scenario (recurring crisis, unique incident), then a probe assertion against it; the `engagement.probe.test.ts` D2 `it.todo` becomes that assertion.
- **Extended (2026-10-25, Wave 1 integration):** scenario matters carry no attention signature (`AttentionMatter.signature` is set only by the desk projection, `desk/attention.ts#signatureOf`), so each one stops the world on every look, outside the once-per-signature rule in DECISIONS §2.2. They are most of the remaining stops: on ev-1, 55 of 96 stops over a deferring year were scenarios. Acceptance adds: `scenarioMatterSource` gives each staged matter a signature that changes only on a material change (a new beat, a nearer window stage), the engagement probe reports stops per 30 days with scenario signatures on, and only then does DECISIONS §2.2's proposed attention budget get a number.
- **Evidence:** Wave 0 run (`openingCampaign` seed ev-1, two years answering everything): 134 answered, 1 repeat within 56 days, 12 within 90.
- **Blocked by:** the choice between (a) and (b); BL-294's cause identities for the episode-bound part.

### BL-297 Readers for the hazards that open at home

- **Status:** open · medium · content.
- **Owner:** world dynamics program, Wave 3; writers' room (`content-lead`, then `content-reviewer` in a separate session).
- **Missing:** no baked scenario gates on `cyclone`, `wildfire` or `tornado`, though each opens at home; the governor-request Desk matter still surfaces them, so they are not silent.
- **Acceptance:** scenarios gated on each reachable acute kind, through the corpus gate; probe `engagement.probe.test.ts` B2 (every acute kind has a gated scenario in the baked corpus) passes.
- **Evidence:** Wave 0 run: `cyclone`, `wildfire` and `tornado` have no gated scenario in the baked corpus.
- **Blocked by:** BL-295's event contract.

### BL-298 Other governments answer coercion, and press partners less than neutrals

- **Status:** landed, awaiting proof · high · engine. NPC lane `70556d58d` (merge `f5fce5413`), integrated 2026-10-25: a derived response intent (`npc-response.ts`), the `response` term and an alignment restraint in the agent, and a bounded head start in the actor draw; DECISIONS 6.13a. Probes geopolitics D (China answers US targeted sanctions within twelve weeks in all three seeds, first in weeks 1, 2 and 4, all economic; China 4 acts against Honduras 1) and A2 (0 of 87 military acts at aligned partners; per-dyad 0 against 0.0024 at neutrals) pass; the lane reran the npc-world probe (15 of 15). Open: the acceptance's balance-harness rerun (Wave 4). NPC military rung-2 acts roughly doubled over five idle seeds (130 to 244, mostly in-kind answers to shows of force); the coordinator left that tempo for the balance checkpoint (PROGRAM.md §4).
- **Owner:** world dynamics program, Wave 2; NPC lane (Opus).
- **Missing:** being coerced adds nothing to a government's answer against the coercer unless an authored red line covers it (`npc-agent.ts:293-322`), and the weekly draw of three actors ignores who was just hit (`npc-turn.ts:111-126`), so China answers US targeted sanctions with nothing in twelve weeks on three seeds and its best-scored move is military pressure on Russia. Alignment never brakes hostility in scoring (`npc-agent.ts:166-187,242-252`), so aligned partners are pressed more per pair than neutrals.
- **Acceptance:** a bounded response intent raised by acts received from the target in a decaying window (any instrument, delay and restraint allowed), an opportunity in the actor draw for a government just coerced, and an alignment restraint scaled by the instrument's coercion; §6.13's ledger untouched and the three-actor cap kept (a legibility budget). Probes `geopolitics.probe.test.ts` D (rate: China answers in some seed within twelve weeks; ordering: China answers more than Honduras, not both zero) and A2 (ordering per dyad: partners pressed less than neutrals) pass; the npc-world probe and the balance harness are rerun.
- **Evidence:** Wave 0 run: 0 answers from China and from Honduras on three seeds; 8 of 47 military rung-2+ acts at aligned partners, all China to Russia, 0.0049 per partner pair against 0.00091 per neutral pair.
- **Blocked by:** BL-282.

### BL-300 Idle hostility still grows from NPC acts and world events

- **Status:** open · medium · engine.
- **Wave 3 (2026-10-25):** NPC lane (merge `2c0c2e562`): bloc fracture now needs a war or an open campaign past rung 2, and the clash timer is gone; the bloc and world-event share of new hostile pairs fell from 8-37 to 1-2 per seed. Owner ruling 2026-10-25, built at integration (`bd7da1cdc`): `resolution-ripples.ts#OBJECTION_FLOOR` (0.25, a planning value) floors an observer's cooling toward a frequent coercer per observer-actor pair (DECISIONS 4.8a; `resolution-ripples.test.ts` "plateaus above a floor below where the pair stands" and "still charges every new act something, less as the floor nears"); three idle 104-week seeds end with 195, 183 and 160 hostile directed edges against 213, 197 and 195 without it. Every remaining writer is now traced and is a pressed level, a durable cause or a discrete act. The only open clause is the band "set from the 12-seed balance harness", which needs the balance run.
- **Owner:** world dynamics program, Wave 2; NPC lane (Opus), with BL-298 and BL-292.
- **Reconciled (2026-10-25, Wave 2 integration):** not worked in Wave 2. The reactions lane's idle comparison (three seeds, 104 weeks) put hostile directed edges at 199, 194 and 186 against 217, 196 and 209 before signed reactions; the NPC lane's answers to coercion add NPC acts (military rung 2 roughly doubled), which this item's trace has to read. Idle 104 weeks on the integrated tree, three seeds (memory-1..3): hostile directed edges 219, 211 and 209, from 157, 139 and 161 at founding.
- **Missing:** with relationship memory and the bloc and war pressures restated as pressed levels, hostile directed edges (trust below −0.3) in an idle world grow from about 140 at founding to about 210 at 104 weeks on three seeds (was about 650). The remainder comes from `npcActionPhase` (−82 / +12 trust over 104 weeks on memory-3 before the repair) and `worldEventPhase` (−8 / +3), which write flat per-act deltas the memory layer then has to repair at the grievance half-life.
- **Acceptance:** each remaining writer is traced and either expressed as a durable cause or a pressed level, or shown to be a discrete act whose recovery at the grievance half-life is the intended reading. An idle 104-week run holds hostile edges inside a band set from the 12-seed balance harness, not from this item's three seeds.
- **Evidence:** memory lane 1R idle table (memory-1/2/3: 217, 196, 209 hostile edges at week 104 against 694, 609, 684 before); `docs/audits/2026-10-24-world-dynamics/lanes/memory.md`.
- **Blocked by:** nothing; read with BL-298, which changes NPC response.

### BL-301 Russian metals reach and Myanmar's MOGE share are approximations

- **Status:** open · low · engine data.
- **Owner:** world dynamics program, Wave 3; physical-economy lane with world-data lane.
- **Missing:** `opening-world.ts#INHERITED_PROGRAMS` files the 2024 Russian metals determinations as an import ban only (`direction: "imports"`, no financial reach), although OFAC FAQ 1168 also bans exchange services for covered metals; the engine cannot represent a services ban's reach. Myanmar's MOGE designation (EO 14014 Directive 1, effective 2023-12-15) is filed against all of `energy-gas-lng` with no `covered` share, because MOGE's share of the projects' sales was not opened; this overstates the reach.
- **Acceptance:** either a sourced `covered` share for MOGE and a representation of exchange-services reach for Russian metals, or a recorded decision that both stay approximations, with the founding drag on RUS and MMR reported before and after.
- **Evidence:** economy lane 1R notes, "Program dates and scope" and "Risks"; merged at `3c2ecd43d`.
- **Blocked by:** nothing.

### BL-302 A sourced oil consumption series for the strait shortfall

- **Status:** open · medium · world data, engine. Crude landed at Wave 3 (economy lane `62585cefa`, merge `1178040a4`, integrated at `bd7da1cdc`); LNG and the registry clause remain.
- **Wave 3 (2026-10-25):** `NATION_OIL_GAS` (`nation-oil-gas.ts`: EIA international bulk data, 189 nations, thousand barrels a day of oil and bcm of gas, dated 2026-10-25) and `CHOKEPOINT_ORIGINS` (`chokepoint-origins.ts`: EIA Figure 5, Hormuz crude, first half of 2025). `commodity-shocks.ts#cargoDependence` and `originDependence` feed `commodity-pressure.ts#shortfallShare` and `strandedShare`. Probe `economy.probe.test.ts` B3 and B4 assert the readings. The world package `dist/` must be rebuilt before engine tests see the tables.
- **Owner:** world dynamics program, Wave 3; world-data lane (Sonnet), then physical-economy lane.
- **Missing:** crude only. `cargoDependence` returns undefined for any other commodity, so the LNG shortfall still reads the authored `geo.chokepointDependence` and the `gas_bcm` column has no reader. The origin table covers Hormuz crude only. No unit test asserts the cargo-over-consumption or origin-over-exports arithmetic directly (B3 and B4 are probes). The two tables are not in `stat-consumers` (they are not `NationStats` fields; their readers are named in the file headers), so the acceptance's registry clause needs either a registry entry for table consumers or an edit to the acceptance.
- **Acceptance:** a sourced, dated crude and LNG consumption-by-nation series in Mb/d (and bcm) and a per-exporter strait-origin table, each with its consumer named; the shortfall reads cargo over consumption (LNG reads bcm) and stranding reads the origin table; B3 and B4 still pass; a unit test asserts the two readers.
- **Evidence:** economy lane notes, "Deviation from the acceptance text"; `commodity-pressure.ts` at `3c2ecd43d`.
- **Blocked by:** nothing.

### BL-303 Inherited-program baseline offset rests on three assumptions

- **Status:** open · low · engine.
- **Owner:** world dynamics program, Wave 4 checkpoint; physical-economy lane.
- **Missing:** each economy is charged only the change since its `MACRO_ANCHORS` growth vintage (`external-pressure.ts#embedded`). Three assumptions are untested: a program only partly felt by the anchor year is treated as fully embedded; `COERCION_CAP` applies separately to the current and the embedded cut, so an economy whose embedded cut exceeds the cap nets differently from one under it; and old saves keep their oath-dated inherited records, which are not embedded and are charged as before.
- **Acceptance:** the balance harness reports founding growth pressure on RUS, VEN, PRK, IRN, CUB and COD with and without the offset; the cap is applied to the net change, or the asymmetry is recorded as a decision; the old-save behavior is stated in DECISIONS §9 or migrated.
- **Evidence:** economy lane 1R notes, "Risks"; founding table (VEN +0.00008, RUS −0.0048, PRK −0.000004 at week one).
- **Blocked by:** nothing.

### BL-304 A loaded emergency renewal case is replaced once under its new id

- **Status:** open · low · player-core.
- **Owner:** world dynamics program, Wave 4 checkpoint; authority-clocks lane.
- **Missing:** renewal case ids now carry the effective calendar deadline instead of a synthetic lapse turn (`desk/family-emergency.ts`). On an old save, `seatFamilyCases` closes the old-id case and raises the new one, so a deferral or attention entry on the old case is lost once; the declaration and its authority are unchanged. Separately, the universal and legacy emergency screens still carry generic annual and presidential-continuation captions that do not name a congressional limit.
- **Acceptance:** either the old id's deferral carries to the new id on first seat, or the one-time replacement is recorded as accepted in DECISIONS §9; the emergency screen captions match `authorityDeadline`'s reading, checked on the running player at 390×844 and 1440×900 against a save holding a limited declaration.
- **Evidence:** clocks lane 1R notes, "Save and case compatibility" and "Residual integration work"; merged at `9dc233c41`.
- **Blocked by:** nothing.

### BL-305 A termination resolution arises for every national declaration

- **Status:** open · medium · engine.
- **Owner:** world dynamics program, Wave 3; authority-clocks and legislation lane.
- **Reconciled (2026-10-25, Wave 2 integration, owner ruling):** the vote half is fixed. The owner ruled that opposition-sponsored limits on the President take their sponsor's side in the vote model: `bill-stages.ts#restrainsThePresident` now counts a resolution terminating an emergency in the `against` frame, with the war-powers bar, disapprovals and binding limits that already were, so it splits on party lines and the President's caucus defects only as the chamber turns against him (DECISIONS 5.18). Regression: `legislative-acts.test.ts` "counts a termination resolution on party lines" pins the sign (the President's caucus under a quarter, the opposition above it, in both chambers). The `emergency-renewal` door fixture no longer vetoes anything: over the same 40 weeks no termination resolution is introduced, and the declaration is in force at its window.
- **Missing:** `act-emergency-termination` (`legislative-acts.ts`) is still on the agenda for every national declaration in force (`emergencyTarget(campaign, "terminate")` has no salience, contest or majority condition), whether or not anyone contests it.
- **Acceptance:** the termination resolution arises only for a contested declaration (a salient or legally exposed one), and the declaration's own politics move its appeal; the door fixtures still build.
- **Evidence:** reproduced 2026-10-25 on `43379d855` plus the Wave 1 integration tree (`bill:act-emergency-termination:31`, 211 of 224 administration House members for it); after the Wave 2 fix the projected count in `legislative-acts.test.ts`.
- **Blocked by:** nothing.

### BL-307 An acting officer's clock ignores a pending nomination

- **Status:** open · low · engine. Wave 3 (institutions lane `8975b019e`, merge `15b9609c8`, integrated at `bd7da1cdc`): the clock tolls and restarts.
- **Wave 3 (2026-10-25):** `appointments.ts#actingClockEffects` tolls the 210 days on a first or second submitted nomination and restarts them from the day on a rejected, withdrawn or returned one (5 U.S.C. 3346(a)(2), (b)); a third nomination changes nothing; wired at `nomination.ts` (withdraw and phase). A displaced acting is replaced by the next eligible officer; repeat unlawful deferrals cost 0.02 × prior findings, capped 0.08. Asserted by `appointments.test.ts` "tolls the 210 days when a first nomination is submitted, and restarts them from a withdrawal" and "restarts nothing for a nomination withdrawn before it was submitted, or for a third nomination".
- **Owner:** presidential authority program (parent BL-225); institutional-powers lane.
- **Missing:** "a test for each event" is not met. Rejected and returned restarts are not asserted (they share the `ends` branch with withdrawal), and no test drives `nominationPhase` into `actingClockEffects`. The restart is stamped as `day + limit` inside `actingClockEffects` and is not read back through `actingLapseDay`. First-assistant tenure is still assumed for the bench's first name.
- **Acceptance:** the nomination life cycle extends and restarts the acting clock as 3346 does, read through `actingLapseDay`, with a test for each event.
- **Evidence:** institutional-powers lane notes, "X3" and "Follow-ups outside this lane" item 3.
- **Blocked by:** nothing.

### BL-310 Shipped replies that send emergency relief where nothing has happened

- **Status:** open · medium · content.
- **Owner:** world dynamics program, Wave 3; the writers' room (`content-lead`, then `content-reviewer` in a separate session).
- **Missing:** since BL-284, emergency relief (assistance rung 1) needs an active condition at the recipient that the giver's relief is not already answering. Four shipped replies commit relief: `send-a-relief-shipment`, `decline-follow-on` (in `shared-warning-recipient-support`, "Send a relief shipment to {{reportRecipient}} now"), `send-emergency-relief-only` and `send-the-invaded-state-relief-instead`. Where the recipient lives through nothing, the reply is shown and refused with the engine's need sentence. `scenario-report.test.ts` now lets that one refusal through and asserts every other option still commits.
- **Acceptance:** each of the four is gated on a condition at its recipient, rerouted to a development grant (rung 2) with its words changed to match, or removed, through the corpus gate and a review record; the test's exception is then deleted.
- **Evidence:** `packages/content/src/scenario-report.test.ts` (issued-report-decisions-2026-10-12-0002); `packages/player-core/src/content/bundled-corpus.generated.ts`.
- **Blocked by:** nothing.

### BL-311 Two term-balance contracts broke during the world-dynamics program

- **Status:** open · high · engine balance. Found 2026-10-25; bisected 2026-10-25: the two failures have different origins (below).
- **Owner:** world dynamics program, Wave 4 (balance checkpoint); an Opus session reads the runs.
- **Missing:** `packages/engine/src/term-balance.test.ts` fails "removes a reckless President within the term" (removal rate 0, expected above 0) and "puts careful play ten points clear of doing nothing" (prudent 0.556 vs passive 0.559, needs a gap above 0.1). Both fail identically with the Wave 3 midterm refit reverted.
- **Acceptance:** each contract passes on the integrated tree, or the owner rules the contract itself out of date with the reason recorded in DECISIONS; the cause is named as a merge or a constant, not tuned around.
- **Evidence:** a harness run at the Wave 1 integration (`42821cfe6`, 4 electoral seeds, Democrat, Node 22, 1,908 s): reckless removal rate 0 and beat rate 1, so the reckless regression is at or before Wave 1; prudent contest share 0.557 vs passive 0.451, a 0.106 gap, so the careful-play contract still held at Wave 1 and broke between Wave 1 and the head (`d03dc39c9`). Later runs, same harness: before the program (`4edb2c520`) and Wave 0 (`9b8ba9e59`) give reckless removal 0 and a 0.104 gap (identical), Wave 2 and 2R 0.097, the head 0.085. So reckless removal predates the program (whether the test file itself passed at `4edb2c520` is unmeasured), and the careful-play contract crossed the 0.1 line at the Wave 2 integration and fell further in Wave 3. Detail: `docs/audits/2026-10-24-world-dynamics/gates/w3.md`.
- **Blocked by:** nothing.

### BL-312 Removal-suit surfaces unchecked in a browser, and back pay is not charged

- **Status:** open · medium · player, engine.
- **Owner:** world dynamics program, Wave 3b; litigation lane.
- **Missing:** the removal-suit surfaces (the Courts docket row, the case file, the Officers screen's removal rows in `apps/player/src/oversight/Officers.tsx`) were checked by tests only, not on the running player. Back pay awarded by a removal judgment (`removal-court.ts#removalRemedy`) is a stated remedy and is not charged to the Treasury.
- **Acceptance:** the three surfaces are exercised on the running player at 390×844 and 1440×900 against a save holding a removal suit at each stage, with captures inspected; back pay either draws on the Treasury or DECISIONS 4.14 records why it does not.
- **Evidence:** litigation lane `251c425d5`, `f7a8f5d92`; `gates/w3.md` ("Not run").
- **Blocked by:** nothing.

### BL-313 Planning values from Wave 3 that wait for sources

- **Status:** open · low · engine.
- **Owner:** world dynamics program, Wave 4 checkpoint; NPC lane and economy lane. Carries what BL-292 and BL-287 left when they closed.
- **Missing:** `CLASH_BASE_RATE` (0.01), `EPISODE_GAIN` (2.5) and the episode half-life in `world-events.ts` are planning values, with no armed-clash series opened. The war-onset benchmark is an `it.todo` (`geopolitics.probe.test.ts:187`). `COERCION_BITE` is 0.5 (`external-pressure.ts`) against ERS's 0.73. Diversion carries no substitution price: substitution is the sector's `substitutability` share (`trade-volume.ts`).
- **Acceptance:** each value is sourced or recorded in DECISIONS as a design value with its reason; the onset todo becomes an assertion once UCDP or COW onsets are matched to this game's definition of war.
- **Evidence:** NPC and economy lane notes; the stale comment at `economy.probe.test.ts:272` still says the diversion delay is 182 days, though the constant is 91 (`trade-volume.ts`); correct it with the work.
- **Blocked by:** sourced series.

### BL-314 Nuclear arsenal data left outside BL-293

- **Status:** open · low · world data.
- **Owner:** world dynamics program; world-data lane.
- **Missing:** North Korea's arsenal is `{ warheads: 30, deliveryTriad: false }` (`nations.ts`) against SIPRI's 60 for January 2026, and the United Kingdom and Pakistan carry `deliveryTriad: true` without three legs (`lanes/bodies.md`).
- **Acceptance:** each is sourced and dated or left with a recorded reason; if the field must tell a submarine-only arsenal from a triad, that is the schema question BL-293 holds.
- **Evidence:** `docs/audits/2026-10-24-world-dynamics/lanes/bodies.md`.
- **Blocked by:** nothing.

### BL-315 Runs after the home-events merge may be slower

- **Status:** open · low · engine performance.
- **Owner:** world dynamics program, Wave 4 checkpoint.
- **Missing:** an attribution run found each run taking about 330 seconds after the home-events merge (`dbc64f539`) against 75 to 125 seconds before, but only under four-way parallel load. The re-taken Hill golden runs in about 90 seconds on a quiet machine, so the slowdown is unconfirmed.
- **Acceptance:** the first step is to re-measure on a quiet machine, before and after `dbc64f539`; if the slowdown is real, name the cost and fix it or record why it stays.
- **Evidence:** `docs/audits/2026-10-24-world-dynamics/gates/w3.md`, "The Hill".
- **Blocked by:** nothing.

### BL-320 Non-military action prices are planning values, not sourced

- **Status:** open · medium · engine and world data. Opened 2026-10-25 from the action-value audit.
- **Owner:** world dynamics program.
- **Missing:** the diplomatic, economic and covert ladders bill `INSTRUMENT_UNIT_COST` shares of the acting nation's output, recalibrated on 2026-10-25 so a United States rung-3 act costs about $20M, $60M and $150M. Those figures are planning values at the scale of a diplomatic corps, a sanctions office and a covert program; none is read from a source the way `FORCE_COST_ANCHORS` is. Assistance is billed at the amount delivered (`aid-amounts.ts`), but those five amounts (60, 240, 700, 400, 900) are also unsourced, and a relief shipment is billed at its full 60 even when the disaster needs less.
- **Acceptance:** each ladder's price is read off sourced anchors with dollar years, as force acts are (DECISIONS §6.8); a relief shipment is billed at what it delivers; the arms-transfer and guarantee follow-on commitments cite a per-aircraft operating cost.
- **Evidence:** `packages/engine/src/resolution.ts` `INSTRUMENT_UNIT_COST`; `packages/engine/src/aid-amounts.ts`; `packages/engine/src/instruments-economic.ts` arms and guarantee commitments.
- **Blocked by:** nothing.

### BL-321 Consequence, feed and press banks cannot hold a state-level act

- **Status:** open · medium · engine and content. Opened 2026-10-26 from the domestic force acts.
- **Owner:** world dynamics program.
- **Missing:** the consequence banks in `packages/content/src/packs/consequences/` are keyed by foreign `instrument` and rung bands, with nation-to-nation tokens. Property surge, task force, investigative priority, the proclamation, troops, the Guard and a court-order ruling leave no authored aftermath, and no content-side feed or press bank carries them.
- **Acceptance:** a locale-act family in `ConsequenceInstrument` with a state token and a domestic target kind, keyed by the state's unrest tier and valence, wired through `consequence-compile.ts` and `consequence-audit.ts`; every act has at least one authored card per valence band, reviewed in a separate session.
- **Evidence:** `docs/audits/2026-10-25-domestic-force/gates/domestic-force.md`.
- **Blocked by:** nothing.

### BL-322 Two interim-relief bands miss for lighter missions

- **Status:** open · low · engine. Opened 2026-10-26.
- **Owner:** world dynamics program.
- **Missing:** when a suit reaches interim relief, property-surge is enjoined at about 0.26 and section 251 troops at about 0.22, against bands of at most 0.15 and 0.10. The formula `merits x (0.5 + 0.5 x harm)` with merits 0.23 for section 251 cannot go below about 0.115 whatever the harm; the state-plaintiff bonus alone uses most of the property-surge band. The bands hold only read as unconditional (times the filing chance 0.13 and 0.02).
- **Acceptance:** the owner rules which reading is intended; if conditional, lower the merits on the two mission orders in `locale-mission-orders.ts` or change the interim formula in `mission-interim-relief.ts`, and re-run the balance probe.
- **Evidence:** `packages/engine/src/mission-interim-relief.ts`; the gate record.
- **Blocked by:** an owner ruling.

### BL-323 An unrest declaration counts as rebellion for the legislative acts

- **Status:** open · medium · engine. Opened 2026-10-26.
- **Owner:** world dynamics program.
- **Missing:** `underRebellionOrInvasion` in `packages/engine/src/legislative-acts.ts` treats a National Emergencies Act declaration over unrest as rebellion. The Guard act no longer reads it (it reads insurgency pressure), but the legislative acts still do, and the audit reads rebellion as an armed uprising, not a protest.
- **Acceptance:** the predicate names the armed-uprising reading or is replaced by `federalServiceGround`; the tests that rely on the old reading are updated.
- **Evidence:** `docs/audits/2026-10-25-domestic-force/DESIGN.md`.
- **Blocked by:** nothing.

### BL-324 The Los Angeles and Chicago deployment sizes and the CBO letter are unopened

- **Status:** open · low · world data. Opened 2026-10-26.
- **Owner:** world dynamics program.
- **Missing:** `guard-domestic-thousand-month` reads the CBO figure from OPB/NPR and CBS because cbo.gov returned 403; the Los Angeles June 2025 order size and the Portland and Chicago head counts are recalled, not opened; the FBI $305k and ICE $208.08k per-officer figures were not opened.
- **Acceptance:** open the CBO letter and the DoD comptroller statement, replace the press-reported source lines in `force-cost-anchors.ts` and `force-costs-sources.md`, and confirm or correct the two weekly rates.
- **Evidence:** `packages/world/sources/force-costs-sources.md`, "What is thin".
- **Blocked by:** access to cbo.gov.

### BL-316 The acting-officer clock reads a counter, not a stored vacancy date

- **Status:** open · medium · engine. Opened 2026-10-25 from the Wave 3 review repairs.
- **Owner:** world dynamics program, Wave 4; institutions lane.
- **Missing:** the nomination clock (`appointments.ts#vacancyNominations`) finds a vacancy's nominations with `day - vacantDays - 14`, because the weekly `vacantDays` counter is phased differently from the nomination phase and the runtime stores no vacancy date. The skew window can in principle admit a submitted, ended, unconfirmed nomination from an earlier vacancy of the same office opened within about 21 days of the new one. After a lapse the original acting person is not recorded, so a restored acting is the current deputy, who may differ from the original.
- **Acceptance:** the institution runtime stores the day its vacancy opened (an additive field, with load-time derivation for older saves); the window reads it; a test seeds two vacancies of one office inside 21 days and shows the first one's nomination does not toll the second.
- **Evidence:** `packages/engine/src/appointments-acting-clock.test.ts`; the Opus validation of the repairs.
- **Blocked by:** nothing.

### BL-317 Counterpart-ground scenarios check episode freshness against home

- **Status:** open · low · content. Opened 2026-10-25.
- **Owner:** world dynamics program; content director.
- **Missing:** `selectorOf` (`packages/content/src/corpus/selector.ts` ~69-75) keeps `locus.bind` but drops `ground` unless the scenario has a calendar condition or a settlement, so `recurrenceAllows` checks a counterpart-bound scenario against the home nation's condition. Either it never recurs, or a new home flood reopens a question about a foreign flood that has not changed. The liveness check in `scenario-cast.ts` ~401 shares the gap. Whether any shipped scenario is both counterpart-grounded and condition-bound is unchecked.
- **Acceptance:** the pool carries the ground, or the freshness check reads the scenario's own locus; a test with a counterpart-bound scenario.
- **Evidence:** `packages/content/src/scenario-director.ts#freshEpisode`; `scenario-director-recurrence.test.ts`.
- **Blocked by:** nothing.

### BL-318 Residual lifecycle gaps from the Wave 3 review

- **Status:** open · low · engine. Opened 2026-10-25.
- **Owner:** world dynamics program.
- **Missing:** (1) a departure recorded before the withdrawal-notice fix carries no `withdrawal-completed` tag, so an older save's stale notice still works after re-entry (`world-membership.ts#standingNotice`); (2) `succession.ts` overlays acting assignments between same-week deaths but not `work.people`, so a head who died earlier in the week may still look alive in the second death's candidate search (unverified whether `selectAppointableFor` can return them); (3) `world-events-filing.ts` `liveMembers` follows `Object.keys(campaign.nations)` order and the withdrawal loop takes the first match, so a reordered save could change which member leaves first (inherited, not shown to occur); (4) the recurrence tests 1, 3 and 4 in `scenario-director-recurrence.test.ts` pass on the old code and guard rather than prove.
- **Acceptance:** each either shown not to occur by a test, or fixed with one.
- **Evidence:** the independent review `scratchpad/codex-w3-review.md` and the Opus validation of its repairs, 2026-10-25.
- **Blocked by:** nothing.

## Connected control plane program

The program that makes selection, staging and inline management one control plane across the player: several targets in one interface, rule-bound feedback computed in player-core, one presidential review per package, and amend or cancel where an effect shows. Program record, wave ledger and audit coverage: `docs/audits/2026-10-16-control-plane/PROGRAM.md`. The five audits it reconciles sit beside it (`01-act-catalog.md` to `05-interaction-patterns.md`), cited below as "audit 01" to "audit 05". File:line references are copied from the audits unless marked as read on 2026-10-16.

### BL-220 Verification gaps from the local continuation

- **Status:** open · P1 · verification.
- **Reconciled (October 18, 2026):** Status: open · P1 · verification (runs only). Missing: the Not-run list in gates/local-continuation.md and backlog-pass.md: full balance harness (seven files passed before stop), native bundles/devices, text zoom, 320 and 1920 px, committing an act end to end, screen reader pass. Drop the fixtures and Node-pin sentences (landed). Checked against: scripts/fixtures/{treaty-ratified,treaty-pending,covert-finding-closed,emergency-renewal,confirmed-nominee,contested-nominee}.mjs exist; packages/engine/src/hill-ledger-golden.test.ts:80 PINNED_NODE_MAJOR gate; .nvmrc=22 (local node is v24.19.0).
- **Progress (2026-10-16):** the full build, typecheck, lint, workspace tests and every proof gate pass (`gates/backlog-pass.md` in the universal player audit). The Hill digest check runs only on Node 22 and is skipped by name elsewhere. Fixtures for a ratified treaty, a closed covert finding and an emergency renewal were added; a nominee in review and removable officers were already covered. Still open: the full balance harness (seven files passed before it was stopped), native bundles and devices, text zoom, 320 and 1920 px, committing an act end to end, and a screen reader pass.
- **Missing:** the items in `docs/audits/2026-10-16-universal-player/gates/local-continuation.md` under Not run: the full engine suite and balance harness after the last engine edits, the whole proof-gate sweep after the five fixes, native bundles and device runs, text zoom, 320 px and 1920 px, screens needing data no fixture has, committing an act end to end, and a screen reader pass. `hill-ledger-golden` passes only on Node 22.
- **Acceptance:** each item run and recorded in a gate record, or named with a reason. Pin the test runtime (`.nvmrc` says 22; the local default is 24) so the Hill snapshot cannot read as a failure. Add the missing fixtures (ratified treaty, closed covert finding, declared emergency, nominee, removable officer) to `scripts/fixtures/`.
- **Evidence:** the gate record above; `scripts/fixtures/`.

### BL-219 Metro reports about 25 require cycles in the engine, content and player-core builds

- **Status:** open · P2 · tooling, engine structure.
- **Progress (2026-10-16):** there were 77 warnings from 7 groups of linked files, not about 25. `7e9d35bbd` removed all 24 re-exports inside cycles and the one load-time read, moved five helpers to leaf modules, and every built engine and content module now loads as its own entry point. Metro prints 44, all safe (each side calls the other only inside function bodies): the 86-file engine group, `temperament`↔`foreign-leader` and `commodities`↔`commodity-registry`. What's left is either splitting that group, which moves files the metric-registry report keys by path, or a Metro ignore pattern.
- **Missing:** `conflicts -> war-tick -> effects -> national-books -> fiscal-impulse`, `commodities` with its registry, shocks, levers and phase files, `opinion` with its causes and movement files, `monetary` with `markets`, `lobbying`, `scenario` files and `desk/family-*`. One of them (`national-books` re-exporting from `fiscal-impulse`) already crashed the dev server through React Refresh and was broken at its re-export.
- **Acceptance:** each cycle either removed or recorded as safe with the reason; no re-export sits inside a cycle; Metro prints none in dev.
- **Evidence:** the Metro "Require cycle" warnings on `pnpm --filter @admin/player web`; commit 2ced38100.

### BL-218 Layout defects left after the whole-card sweep

- **Status:** landed, awaiting proof · P2 · UI.
- **Reconciled (October 18, 2026):** Status unchanged (landed, awaiting proof). Missing: only recheck ChoiceList heights, TermLine end marks, /catalog overflow at 390 and ArticleCard headline-only press; drop the work-done-bar inks sentence. Evidence: executive/present.ts:18. Checked against: apps/player/src/executive/present.ts:18 BUILT_INK now capacity "color", staffing "infoInk"; BL-237 sweep per item note.
- **Progress (2026-10-17, BL-237):** TermTimeline numbers its marks when names cannot sit at them. The Emergency map slot draws the map with its key. Panel law citations sit in the shared `LawHelp`. The harness sweep finds no page scrolling sideways at 320, 390 or 1440 on 18 routes after the pass (`docs/audits/2026-10-17-ui-uniformity/gates/ui-uniformity.md`). ChoiceList heights, the work-done bar inks and ArticleCard were not rechecked.
- **Progress (2026-10-16):** `ChoiceList` heights and `TermTimeline` placement changed in `a61962809` (with a type fix). The overlap detector has not been rerun at the four widths.
- **Missing:** `ChoiceList` cards have uneven heights; `TermLine` and `TermTimeline` end marks overflow by 2 to 6 px and the timeline labels do not sit under their marks; one element in `/catalog` runs off the page edge at 390; the work-done bars use the same blue for capacity and staffing (`executive/present.ts:18`); `Panel` law citations leave the help icon alone on a line in a narrow panel (`packages/ui/src/world/Panel.tsx`); the `/nation/emergency` map slot draws a list; `ArticleCard` headline-only press may remain (`ui/news/ArticleCard.tsx`).
- **Acceptance:** the overlap detector in the sweep brief is clean at 390, 768, 1066 and 1440 on each; whole-card checks pass.
- **Evidence:** the agent reports of the 2026-10-16 sweep.

### BL-217 Follow-ups to the rebuilt /nation

- **Status:** open · P2 · UI.
- **Reconciled (October 18, 2026):** Missing: drop governors lens and map-chunk sentences; remaining unverified: Opinion cards side by side, Alaska frame, phone pins, committed state-act journey at 390/1440 (BatchActs exists, no journey test seen). Evidence: apps/player/src/nation/home/, packages/player-core/src/map/lenses/governor-lens.ts. Checked against: packages/player-core/src/map/lenses/governor-lens.ts exists; apps/player/src/map/governor-lens.ts does not (test -f); MapSlot.tsx lazy chunk exists (apps/player/src/map/MapSlot.tsx:55).
- **Progress (2026-10-16):** the governors lens moved into player-core's lens list in `a61962809` (`packages/player-core/src/map/lenses/governor-lens.ts`). The other sub-points are open.
- **Missing:** the governors lens is built in the app and should live in player-core's lens list; Opinion cards cannot sit side by side on wide screens; Alaska's frame shows too much empty map; phone builds draw no pins and do not follow the section nav; a state act has been taken to the review but never committed in a test; the map is not a separate download chunk; whole-row press on its tables waits on BL-213.
- **Acceptance:** each fixed or deliberately kept, with the committed-act journey (select state, act, review, confirm, receipt, Record entry, reload) run once at 390 and 1440.
- **Evidence:** `apps/player/src/nation/home/`, `apps/player/src/map/governor-lens.ts`, `apps/player/src/batch/`.

### BL-216 Figures typed into copy and claims the engine may not hold

- **Status:** open · P2 · copy, engine truth.
- **Missing:** "2 to 5 weeks" for the pump-price delay (`nation/economy/Levers.tsx`), "5 lines" in the Budget heading, "700,000 MWh" and "$94 million" (`nation/policy/OrderFollowups.tsx`), "three days" and "tomorrow" in outreach (`dossier/PersonActs.tsx`), "60% holds, 40% fails" (`executive/ExecutivePulse.tsx`, meaning unclear), "Nothing moves a twentieth of a point" (`decision/projection/ProjectionParts.tsx`); two clean-power lines that may contradict (`nation/budget/Books.tsx`, `nation/policy/OrderFollowups.tsx`); `security/pdb.ts:64` prints a raw nation id where a name belongs; which metric "standing" moves when an unsigned bill becomes law (`player-core/congress/congress-acts.ts`); which court "the Court" means in `decision/choices.ts`.
- **Acceptance:** each figure read from the engine or removed; each claim confirmed against its engine file or reworded; the raw id fixed.
- **Evidence:** the 2026-10-16 wording agents' reports.

### BL-215 Wording that differs between screens

- **Status:** open · P3 · copy.
- **Missing:** "Unread" (`player-core/world/world-readings.ts`) against "unknown" on the World screen; "desk" in player-core text against "news outlet" in Press; metric names (International standing, Budget authority) kept for the glossary and not renamed to everyday words; "Steady" in `world-readings.ts` and `nation-vitals.ts` against "Fair" elsewhere; "Accept the lower judgment" in three files; "since the oath" in the market rows is stripped by a regex in `nation/economy/Markets.tsx`; "No administration is open" in `nation/act.ts` against the reworded line in `review/authorize.ts`; the digest labels "Operators", "Drift", "Pursuits", "Blocs", "Governance" (`desk/digest-view.ts`) whose meaning is unclear; the sections of `player-core` still using "Suspended" or "Wound down".
- **Acceptance:** one word each, with the choice recorded in `docs/CONTENT_DOCTRINE.md` section 10.2's table where it is a rule.
- **Evidence:** the wave 2 agents' reports.

### BL-214 The glossary, the Handbook and the registry had one mechanical pass, and haiku has not been placed

- **Status:** open · P1 · copy.
- **Reconciled (October 18, 2026):** Missing: finish plain-language pass on glossary/government.ts and glossary/world.ts and the authority/ records after the authority program; confirm haiku placed in title, empty state, oath wait, end of term (Haiku.tsx covers title only: unverified). Evidence: player-plain.json entries. Checked against: packages/player-core/src/voice/haiku.ts(+test), apps/player/src/title/Haiku.tsx; scripts/baselines/player-plain.json: only glossary/government.ts and glossary/world.ts remain (other 18 entries are apps/web).
- **Progress (2026-10-16):** the haiku registry, its syllable test and its placed moments landed in `a61962809`. The glossary and law rewrite waits on the presidential authority review (`docs/audits/2026-10-16-presidential-authority/00-SYNTHESIS.md`), so its legal text is rewritten once, from those findings.
- **Missing:** `packages/player-core/src/glossary/*.ts` and `authority/*.ts` were cleaned of semicolons, label lead-ins and staged phrasing and five engine-fact corrections were made, but they have not had the plain-language rewrite the screens and composed messages had (`docs/CONTENT_DOCTRINE.md` section 10.2, Plain language). No haiku registry exists. The title welcome, an empty state with nothing to teach, the oath wait and the end of a term are the named places.
- **Acceptance:** `node scripts/verify-player-prose.mjs --plain packages/player-core/src/glossary` leaves no jargon; each entry reads for a sixth-grade reader and keeps its figures and citations; a haiku registry with a syllable-count test and at most one use per screen; the four before and after lines in the doctrine are the review bar.
- **Evidence:** `scripts/baselines/player-plain.json` (20 entries left); `skills/player-tips/SKILL.md`.

### BL-213 Tables and a few lists still open only from a name

- **Status:** landed, awaiting proof · P1 · UI.
- **Reconciled (October 18, 2026):** Status: landed, awaiting proof. Missing: 390/1440 keyboard walk of those rows; check the act workspace's goods table (the old World tariff compare table is gone). Checked against: apps/player grep rowPress: security/Operations.tsx, Intel.tsx, world/overview/GovernmentsTable.tsx, nation/home/StatesTable.tsx, Groups.tsx, nation/economy/Panels.tsx; "all kinds of goods" string no longer found.
- **Progress (2026-10-17, BL-237):** the family agents report `rowPress` on StatesTable, Groups, Panels and the Governments, Intel and Operations tables. The lead did not walk these rows at 390 and 1440 with the keyboard.
- **Progress (2026-10-16):** the listed tables pass `rowPress` in `a61962809`; workspace tests pass. The 390 and 1440 browser check has not been run.
- **Missing:** `SortTable` and `DataTable` now take `rowPress` and `selected`, and no screen passes them: `security/Operations.tsx`, `security/Intel.tsx`, `world/overview/GovernmentsTable.tsx`, `nation/home/StatesTable.tsx`, `nation/home/Groups.tsx`, `nation/economy/Panels.tsx`, and the World tariff "Compare all kinds of goods" table has no way to choose a row on desktop.
- **Acceptance:** whole-row press with a label on each, Enter and Space, a selected state where selection applies, sorting unchanged, checked at 390 and 1440.
- **Evidence:** `packages/ui/src/world/SortTable.tsx`, `packages/ui/src/nation/DataTable.tsx`.

### BL-212 Classification marks are built and wired into one screen

- **Status:** landed, awaiting proof · P1 · UI, owner decision.
- **Progress (2026-10-16):** marks wired into more screens in `a61962809`; workspace tests pass. Not yet checked in the running app, and the SCI question is still the owner's.
- **Missing:** the shell banner and `useMarking(level)` exist and read UNCLASSIFIED on every screen, because only the person page calls it. `docs/DECISIONS.md` 8.11 and the owner's answers require decisions marked by severity and intelligence, assessment and covert material marked by document family, using the engine's `classificationForSeverity` and `defaultClassificationForFamily`. The engine has no SCI compartment, so the convention's TOP SECRET//SCI is not shown.
- **Acceptance:** a decision, a collection report, an assessment and a covert finding each set the banner to the engine's level and release it on leaving; portion marks where a paragraph differs; the owner decides whether an SCI notion is added to the engine.
- **Evidence:** `apps/player/src/shell/classification.tsx`, `packages/player-core/src/classification/`, `packages/engine/src/documents.ts`.

### BL-211 Press responses carry their story, and the one-engagement rule

- **Status:** open, UI, with an owner decision.
- **Owner:** control plane program, CP6.
- **Missing:** "Respond to the press" on a dispatch opens the generic Respond tab and drops the story (audit 04 gap 21). A press action is limited to one engagement a week by `pressSlotTaken`, so an interview or a leak cannot go to several outlets in one sitting (audit 01 G13, F11). Audit 01 recommends keeping the rule and showing a ranked outlet list.
- **Acceptance:** The dispatch door opens the framing comparison for that story. The owner rules on the weekly limit and the ruling is recorded here. If the rule stays, the outlet list is ranked and says when the week's slot is spent. If it changes, the engine rule changes with a test and a balance run.
- **Evidence:** audit 04 `src/news/Dispatch.tsx:92`. Audit 01 `press-issued.ts:57-62`, `press-issued.ts:89`, `press-office.ts:179`.
- **Blocked by:** the owner's ruling, for the rule half only.

### BL-210 Command palette and keyboard paths that start acts

- **Status:** open, player-core and UI.
- **Reconciled (October 18, 2026):** Missing: command search that starts a staged act ("tariff steel China"), empty state of actionable inbox items with Start, player-core commandIndex and InboxItem.intent. Evidence: shell/Search.tsx, search-keys.web.ts. Checked against: apps/player/src/shell/Search.tsx, shell/search-keys.web.ts; grep commandIndex|CommandPalette: 0 hits.
- **Owner:** control plane program, CP6.
- **Missing:** The universal player has no command search. The only palette is in the frozen legacy package. There are no shortcuts beyond the founding radio group's roving focus. Inbox items open a place but cannot start the answer (audit 05 §2.10, audit 04 cross-cutting 1 and 5).
- **Acceptance:** ⌘K, Ctrl+K or a shell button opens the palette at 390×844 and 1440×900. Typing "tariff steel China" offers a start that opens the surface with the line staged, never committed. The empty state lists actionable inbox items, each with "Start." Every result is reachable by keyboard and announced. Player-core gains `commandIndex(campaign)` and `InboxItem.intent`.
- **Evidence:** audit 05 `packages/ui-web/src/CommandPalette.tsx`, `packages/player-core/src/notifications/inbox.ts:21-33`. Audit 04 `src/founding/parts.tsx:80`.
- **Blocked by:** BL-172, BL-182, BL-209.

### BL-209 The Brief, clocks, calendar and bell start the answer, and the rail shows counts

- **Status:** open, UI.
- **Reconciled (October 18, 2026):** Missing: drop the nav-badges sentence; keep: the answer opens in a sheet over the list with defer/decline on the row from Brief rows, clocks, calendar rows and bell (progress note says not built). Checked against: apps/player/app/(game)/_layout.tsx:58-59 useWaitingCounts -> navGroups(counts); commits 30e131db9, 3a1574bd5 (ancestors of HEAD).
- **Progress (2026-10-17, BL-237):** calendar and inbox rows name their people and places as doors. A held Continue says its reason in the bar and opens the matter. A clock's owner and a case's context are doors. The answer in a sheet over the list is not built.
- **Owner:** control plane program, CP6.
- **Missing:** Brief rows are links and the lead has "Take it up". A clock's "Your answer" navigates to the act. Calendar rows are links. Bell rows navigate only. The same urgent item has four routes (audit 04 gaps 4, 24, 26, cross-cutting 7). Nav badges are never populated: the layout calls `navGroups()` with no counts although `NavCounts` is defined (audit 04 gap 25). Nation's Attention list, which selects the state and scrolls to its card, is the model to copy.
- **Acceptance:** From a Brief row, a clock, a calendar row or the bell, the answer opens in a sheet over the list, with defer and decline on the row, and focus returns to the row on close. A clock opens the act, not a dossier. The rail shows counts from `briefMatters` grouped by place, following BL-140's seen rule. Observed at both sizes.
- **Evidence:** audit 04 `src/brief/Matters.tsx:54,55,77`, `src/decision/ClockScreen.tsx:60`, `app/(game)/calendar/index.tsx`, `src/calendar/rows.ts`, `src/shell/InboxButton.tsx:34-42`, `app/(game)/_layout.tsx:39`, `src/shell/nav.ts:25`.
- **Blocked by:** BL-171, BL-182.

### BL-208 Directives, officer removals and inspector notices to several agencies

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP6.
- **Missing:** Each of the three acts picks one agency from a `Select`. The engine already keeps several distinct: directive ids embed institution, kind and turn, and removals and notices are per institution (audit 01 G09, E8 to E10).
- **Acceptance:** An agency table with row selection and a subject per row, folded through the plan and authorized in one package review. A barred institution shows as a refused line with the engine's words.
- **Evidence:** audit 01 `oversight/Directives.tsx:62`, `oversight/Officers.tsx:45`, `oversight/Inspectors.tsx:51`, `directives.ts:455`, `career-incumbents.ts:271`, `inspectors-general.ts:264`.
- **Blocked by:** BL-172, BL-173.

### BL-207 Bills and members: sign or veto from the desk row, the whip on the row, lobby several within the daily slots

- **Status:** open, UI, with an owner decision.
- **Owner:** control plane program, CP6.
- **Missing:** A desk row that says "waiting for you" offers nothing, and the Bills view says no member has promised a vote while the bill page has the whip count. The members list has no lobby action. Lobbying picks one post from a `Select`. The engine allows two outreach slots a day (a broker costs two) and one lobbying per post per week (audit 04 gap 11, audit 01 G10, F3, F4). Whether the engine has a per-member whip order is UNCONFIRMED (audit 05 §1.3, §3.6-3). Which `BillActs.tsx` line carries the bill-text acts is UNCONFIRMED (audit 01).
- **Acceptance:** Sign, veto and the whip count sit on the desk row, and several bills can be signed or vetoed in one review. Member rows multi-select with a slot meter, and picks beyond it are disabled with the reason. The owner rules on the slot cap and on a whip order, recorded here. A whip order, if wanted, opens as its own engine item. The two UNCONFIRMED points are checked and recorded.
- **Evidence:** audit 04 `src/congress/Bills.tsx:21,37`, `BillScreen.tsx:80-95`, `Rosters.tsx:76`, `PostScreen.tsx:39`. Audit 01 `BillActs.tsx:137-153`, `lobbying-person.ts:223-229`, `lobbying.ts:553-556`, `member-outreach.ts:18`. Audit 05 `congress/Aisle.tsx:54-89`, `hill.ts:128-599`.
- **Blocked by:** BL-171, BL-173. The owner's ruling, for the lobbying half.

### BL-206 Appointments on the plan, from every place a seat shows

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP6.
- **Missing:** The Executive inspector offers only "Open the office", three steps from a vacancy to a nomination (audit 04 gap 9). Nominating has three separate paths (audit 04 cross-cutting 8). The Congress Nominations tab cannot send or withdraw the names it lists (gap 10). Acting heads are named one chair at a time (audit 01 G11, E3). A policy area with no chair says so and offers nothing (gap 14). The appointments comparison is rows by columns (audit 05 §1.3).
- **Acceptance:** `deskPlan` is re-expressed as the plan's `nomination` kind with its existing tests kept. One shared seat row serves the Executive inspector, Oversight, Courts, the Congress Nominations tab (send and withdraw) and the Policy chair, with an acting mode. Several seats go in one package review. The comparison is a results list (BL-195).
- **Evidence:** audit 05 `packages/player-core/src/appointments/desk.ts:213-225,252-268`, `apps/player/src/oversight/Appointments.tsx:84-90`. Audit 04 `src/executive/OfficeInspector.tsx:100`, `ChairActs.tsx:68`, `src/congress/Rosters.tsx:12-37`, `src/nation/policy/PolicyScreen.tsx:45,138`. Audit 01 `ChairActs.tsx:96-113`, `appointments.ts:365`.
- **Blocked by:** BL-172, BL-173, BL-195.

### BL-205 Inline settings in readings, and levers beside what they move

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP5.
- **Missing:** A setting shown in a reading cannot be changed there (audit 05 BL-181 proposal). The four "Run the country" lever cards on Nation all navigate (audit 04 gap 5). Economy levers sit on a different tab from the prices they move (gap 13). The reserve release, fuel waiver and Fed lean are one per commit (audit 03 P13). The budget editor has no bulk edit or presets (audit 03 §6). No commodity purchase or refill act exists (audit 03 §2.2, §6), pending an owner decision.
- **Acceptance:** An `InlineSetting` on a budget line, a country's tariff rate, a command's posture and each Nation lever card: edit in place, a ghost mark from the current value to the new one with its computed effect, then "Add to plan" or "Review now". Nothing commits without the review. The relevant lever sits beside each commodity chart. The reserve release and fuel waiver are authorized together against waiting, with the combined pump outlook. Budget gains bulk edits and presets (the last enacted budget, the request). A refill shows as a locked reason until the owner rules.
- **Evidence:** audit 05 `apps/player/src/nation/budget/BudgetScreen.tsx:68-108`, `apps/player/src/security/CommandActs.tsx:63-83`. Audit 04 `src/nation/home/Levers.tsx`, `NationHome.tsx:108`, `src/nation/economy/EconomyScreen.tsx:17`. Audit 03 `apps/player/src/nation/economy/Levers.tsx:58-60`, `market-levers.ts:57-78`, `lever-comparison.ts:107`, `BudgetScreen.tsx:72,91`, `commodity-levers.ts:52`.
- **Blocked by:** BL-172, BL-173, BL-182.

### BL-204 An "In motion" panel: what the President set going, and what can still change

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP5.
- **Missing:** No panel lists pending and recent acts (orders, measures, nominations, deployments, declarations). The Record is a timeline to read, not a place to change things (audit 04 gap 7, cross-cutting 3 and 6).
- **Acceptance:** An "In motion" panel on Nation, the Brief and the Record. Each row carries the Change and End controls from BL-203 and groups under its package header where one exists. Observed at both sizes.
- **Evidence:** audit 04 `src/world/act/Manage.tsx:28`, `src/nation/policy/OrderFollowups.tsx:22`, `src/courts/Nominations.tsx:12`.
- **Blocked by:** BL-203.

### BL-203 Amend or cancel from where the effect shows

- **Status:** open, UI and player-core.
- **Reconciled (October 18, 2026):** Evidence: replace `world/act/Manage.tsx` with the workspace's manage handling (ActWorkspace.tsx); "Manage.tsx becomes the one-line case" -> "the workspace's manage branch". Checked against: apps/player/src/world/act/ has no Manage.tsx (deleted in a19cce042); callers: world/nation/Views.tsx:190, Diplomacy.tsx:51, world/act/ActReceipt.tsx:63.
- **Owner:** control plane program, CP5.
- **Missing:** Ending a measure or an operation means visiting a separate `?manage=` desk, one row per visit, and nothing can be amended (audit 05 BL-178 proposal). Lift is one measure per review (audit 03 P8). A Record entry cannot lift, amend or rescind (audit 04 gap 22). A court case page cannot rescind the challenged order (gap 23). Several pending operations cannot be stood down together (audit 01 A10, A11). Where the Docket's "You need to respond" rows land is UNCONFIRMED (audit 04).
- **Acceptance:** Under-way rows, trade measure rows, commitment rows, pending Record entries and the court case page offer Change and End. End stages an `end` plan line. Change stages an end plus a new line as one package. Both go through the one review. Several measures lift in one review under one package entry. A whole package stands down through its header. `Manage.tsx` becomes the one-line case. No engine change: grouping is the header packet and `causeIds` (BL-174), not a stored plan id. The Docket landing is checked and recorded.
- **Evidence:** audit 05 `apps/player/src/world/act/Manage.tsx:14-52`, `apps/player/src/world/nation/Views.tsx:186`, `apps/player/src/world/nation/Diplomacy.tsx:48`, `packages/player-core/src/record/record-entry.ts:261`. Audit 03 `trade.ts:609-652`. Audit 04 `src/record/RecordDetail.tsx:92-105`, `src/courts/CaseParts.tsx:122,155-156`, `src/courts/Docket.tsx:19`. Audit 02 `instrument-issued.ts:68-78`.
- **Blocked by:** BL-172, BL-174, BL-182.

### BL-202 Single-target engine limits the owner has to rule on

- **Status:** open, engine, owner decisions first.
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: packages/engine/src/force-packages.ts (one unitType per package); aid constants unverified at the old lines.
- **Owner:** control plane program, CP4.
- **Missing:** Four limits that a multi-target surface runs into and that only an engine change lifts:
  - Aid has no amount. Each assistance rung moves a fixed constant (60, 240, 700) (audit 01 A6, G03).
  - One force package is one unit type, so a carrier group with escorts cannot be sent (audit 02 BL-183 proposal, §1.2).
  - One collection element takes one tasking a day, and `TaskingRequest` names one target (audit 01 G08b).
  - Treaties are bilateral only (audit 01 G14).
- **Acceptance:** The owner rules on each and the ruling is recorded here, and in DECISIONS where it sets a rule. Each adopted change is additive and optional on its request type, loads old saves unchanged, has a deterministic test, a balance run where it moves outcomes, and updates `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` in the same change. A rejected one is recorded with its reason.
- **Evidence:** audit 01 `instruments-economic.ts:370,387,403`, `intelligence.ts:400,483-487`, `treaties.ts:268`. Audit 02 `force-packages.ts:15-26,38-73`.
- **Blocked by:** the owner's rulings.

### BL-201 Redeploy a standing deployment

- **Status:** open, engine, owner decision first.
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: grep redeployCommitment: 0 hits.
- **Owner:** control plane program, CP4.
- **Missing:** Moving forces means ending a commitment, which charges a withdrawal grudge, then ordering a new act. Status changes are the only edits to a deployment, and nothing moves forces from one country to another (audit 02 §1.5, §1.11-3, BL-176 proposal, audit 01 G02).
- **Acceptance:** An owner rule is recorded in DECISIONS: does a move count as withdrawal from the old host, and does it open a new War Powers obligation? Then `redeployCommitment` is implemented with deterministic tests, a balance run, and SCHEMA and ARCHITECTURE updated.
- **Evidence:** audit 02 `commitments.ts:299-330`, `instruments-military.ts:139-160`. Audit 01 `commitments.ts:68-72`.
- **Blocked by:** the owner's rule, BL-180.

### BL-200 Moves between combatant commands have no simulation effect

- **Status:** open, engine defect, owner decision first. Confirmed by reading on 2026-10-16.
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: packages/engine/src/combatant-commands.ts:159,172; players of them: player-core/src/security/command-board.ts only.
- **Owner:** control plane program, CP4.
- **Missing:** `reassignForces` changes a command's branch share, and the screen reads as moving troops. Read on 2026-10-16: the share is written at `packages/engine/src/security-effects.ts:118-122` and read only by `assignedFormations` and `assignedShare` (`combatant-commands.ts:159-179`), which reach only the command board's formation count (`packages/player-core/src/security/command-board.ts:96`) and the act's own share lookup (`packages/player-core/src/security/command-acts.ts:132`). Gates, availability, placement, odds and war weeks ignore it (audit 02 §1.8, §1.11-4, BL-180 proposal).
- **Acceptance:** The owner chooses. (a) The share feeds availability or reach for that theater: a test shows a reassigned share changing it, a balance run is recorded, ARCHITECTURE is updated. (b) The act and its help are relabeled as administrative, and the prose gate passes. Until the ruling, no plan surface presents reassignment as moving troops.
- **Evidence:** audit 02 `combatant-commands.ts:159-176,392-446`, `security-effects.ts:118-122`, `command-board.ts:96`, `CommandActs.tsx:64-93`. Audit 01 `CommandActs.tsx:85-87`, `command-acts.ts:127`.
- **Blocked by:** the owner's ruling.

### BL-199 Command posture and commitments on one board

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP4.
- **Missing:** Posture is set per command, one sheet each (audit 01 G08a, C1). Commitment status takes one id (G12, C5). The country page says to change its promises on the national security screen (audit 04 gap 20). The command page has no before and after of both commands (audit 04, Command row).
- **Acceptance:** A theater board lists the 11 commands, each with a staged posture and the combined weekly readiness bill. A commitments table takes row selection and one status. Each commitment on a country page has an inline status control. One package review covers the set. Reassignment shows per BL-200's ruling.
- **Evidence:** audit 01 `combatant-commands.ts:549,593-597`, `security/CommandActs.tsx:19-33`, `commitments.ts:299`. Audit 04 `src/world/nation/Diplomacy.tsx:78`, `src/security/CommandScreen.tsx:114`. Audit 02 `security/Operations.tsx:58-71`.
- **Blocked by:** BL-172, BL-173.

### BL-198 Share a report with several governments, and stop or share several taskings

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP4.
- **Missing:** The engine's `shareCollectionReport` already takes a set of recipients, but the screen offers one `Select` and tells the player "one decision at a time" (audit 01 G07, C12, read on 2026-10-16 at `apps/player/src/security/CollectionActs.tsx:141`). Taskings, reports and findings are one row, one act (audit 04 gap 27).
- **Acceptance:** Recipients are a `SelectList` with each government's sharing limit as its status. `shareReportOrder` uses the array form. One review lists each recipient and the findings each gets. Taskings and reports take row selection with "Stop selected" and "Share selected". Covert lines on one target in one turn show as a conflict until BL-197 is ruled. Built with BL-161's `apps/player` collection control, which owns the same screen.
- **Evidence:** audit 01 `security/CollectionActs.tsx:113-147`, `intelligence.ts:575-593`, `collection-reports.ts:70`. Audit 05 `apps/player/src/security/CollectionActs.tsx:113-152`. Audit 04 `src/security/Intel.tsx:60,85`, `Operations.tsx:26`.
- **Blocked by:** BL-172, BL-173.

### BL-197 Several acts on one target in one turn share ids and dice

- **Status:** open, engine defect, owner decision for part 3. Confirmed by reading on 2026-10-16, not yet run.
- **Owner:** control plane program, CP4.
- **Missing:**
  1. `tariffOrderIds` takes the next free ordinal from the campaign it is given (`trade.ts:362-371`). Two tariff packets built on one basis share the retaliation id `retaliation:<target>:<turn>`, and the measure id when the sector matches. Applied in sequence, the reducer replaces the measure under its id and appends a second retaliation record with the same id (`packages/engine/src/trade-effects.ts`, read 2026-10-16). The fold in BL-172 avoids this.
  2. Non-rate measure ids are `<kind>:<target>:<turn>` with no ordinal (`trade.ts:537`), so two of one kind on one target in one turn collide even when folded. Whether issue paths can reach this past the one-pending-act guard (`instrument-issued.ts:29-30`) is UNCONFIRMED.
  3. `jitter` opens `stream("instruments", actor, target, turn)` (`instrument-gates.ts:119-121`), seeded only by the campaign seed and key (`rng.ts:59-66`). Two acts on one target in one turn that resolve at once, or are projected on one basis, draw identical numbers. Timed acts re-seed by act id at execution (`instrument-issued.ts:99`), so their execution draws are independent.
- **Acceptance:** A test shows each case today. (1) A fold test asserts distinct ids for two lines on one partner. (2) New non-rate measures take the ordinal scheme, old ids are kept, a save round trip passes, ARCHITECTURE notes the id format. (3) The owner rules between the plan conflict rule (no engine change) and a discriminator in the stream key, which changes existing draws and needs a recorded balance run.
- **Evidence:** audit 05 §1.6, §3.2, §3.6-2, `packages/engine/src/instrument-gates.ts:120`, `packages/engine/src/rng.ts:59-66`, `packages/engine/src/trade.ts:362-371`. Audit 03 §2.1 identity rules, `trade.ts:537`. Audit 01 item 3.
- **Blocked by:** the owner's ruling, for part 3 only.

### BL-196 Sanctions, freezes, embargoes, aid and engagement on several countries

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP4.
- **Missing:** The act route is per country, so a coalition sanction on five governments is five complete flows (audit 01 G03). The partners toggles mean "who joins", not "who is targeted" (audit 03 §3.2). The Org page reaches out to one member at a time, World rows are links, and Compare cannot act on what it compares (audit 04 gaps 19 and 28, World row).
- **Acceptance:** From the World table, an organization's members, a Compare selection or the act desk, the President selects several countries in a `SelectList` (with the map where geography answers it). Each country shows its odds, cost and status, folded in order so treasury, reserves, intelligence capability and munitions are spent line by line. Refused countries are named under "Won't be sent". One review authorizes the package. A line that needs Congress or an emergency cites the authority record. No engine change: the fold replaces audit 03's proposed `issueActionPackage` (PROGRAM.md §3.8).
- **Evidence:** audit 01 `app/(game)/world/nation/[id]/act.tsx`, `instrument-issued.ts:29-30`. Audit 03 `instruments-economic.ts:115-230,362+`, `Terms.tsx:113-136`, `preview.ts:97-106`. Audit 05 `packages/player-core/src/act/catalogue.ts:24-29,189-206`, `apps/player/src/world/act/ActDesk.tsx:113-154`. Audit 04 `src/world/sets/OrgScreen.tsx:136-145`, `src/compare/CompareWorkspace.tsx:114`, `src/world/overview/MapPanel.tsx:65`.
- **Blocked by:** BL-172, BL-173, BL-179. Same-kind ids per BL-197.

### BL-195 Retire options-as-columns comparisons in the universal player

- **Status:** open, UI and docs.
- **Reconciled (October 18, 2026):** Missing: drawn cost/odds on rows; delete or rename CompareChoices into shared review pieces (7 callers); fix DESIGN.md line 194 (biometric text) and reconcile Shared patterns. Appointments comparison unverified. Checked against: packages/ui/src/nation/CompareChoices.tsx; callers EmergencyScreen, LocaleDesk, StateActs, OrderScreen, Levers, PolicyScreen, Request; docs/DESIGN.md:194.
- **Owner:** control plane program, CP3. Carries BL-128's acceptance into `apps/player`.
- **Missing:** `CompareChoices` and the appointments comparison draw options as columns with prose cells, which the owner rejected on 2026-10-11 for a results list (audit 05 BL-179 proposal). `CompareAuthorize` still draws options as cards. DESIGN.md line 194 still describes the biometric presentation that DECISIONS §8.9 removed on 2026-10-14 (read on 2026-10-16).
- **Acceptance:** LocaleDesk, Levers, StateActs, EmergencyScreen and Appointments use results-list rows: drawn cost, odds and effects on one axis, the baseline as a reference row. `CompareChoices` has no callers and is deleted. DESIGN.md "Shared patterns" is reconciled with the results-list rule and line 194 corrected.
- **Evidence:** audit 05 `packages/ui/src/nation/CompareChoices.tsx:24-31`, `apps/player/src/nation/state/LocaleDesk.tsx:34`, `apps/player/src/nation/economy/Levers.tsx:84`, `apps/player/src/nation/home/StateActs.tsx:133`, `apps/player/src/nation/emergency/EmergencyScreen.tsx:5`, `apps/player/src/oversight/Appointments.tsx:84-90`, `docs/DESIGN.md:194,201`.
- **Progress (BL-233, 2026-10-16):** `CompareChoices` no longer draws options as columns: each option is a results-list row with its verdict, and the picked one's terms are read line by line below it; there is no baseline row (DECISIONS §8.13 replaces "the baseline as a reference row" in the acceptance above: a wait with a clock is a line beside the options). LocaleDesk, Levers, StateActs, EmergencyScreen, the order and policy screens and the budget request draw that way now. Still open here: drawn cost and odds on those rows (their producers give prose, not figures), deleting or renaming `CompareChoices` into the shared review pieces, and DESIGN.md line 194.
- **Progress (options readings, 2026-10-17):** the act page's option list sets the pattern the rest should follow. Every reading in a results row is one `Metric` cell in `packages/ui/src/review/Results.tsx` (label, figure in its meaning's ink with a glyph and a solid edge, a drawn track at one height), so chance, cost, timing, each change, warnings and the staff's findings read the same. Figures replace words: the engine's own chance where it computes one (`OptionPreview.odds.chance`, added in `packages/player-core/src/act/preview.ts`), else the band a likelihood word stands for, and acceptance as which side of even; cost as dollars with `$0` for free acts; each change as signed points of a hundred. Desktop rows carry sticky column heads that sort the list (`sticky.web.ts`, with `SectionNav.web.tsx` publishing `--section-nav-height`); a phone gets sort chips. Filters (helps more than it hurts, costs nothing, can do now), a for-and-against split under each name, compare as a leading check, and Details as the card's last line opening every finding in the same cells. Checked live at 390x844 and 1440x900 on `/world/nation/BHR/act`; not yet checked on the Congress chooser and the executive comparison, which share `MoneyBar`, `OddsSteps` and `ChangeBar`. Still open from this: the other screens' rows (above) take the `Metric` cell once their producers give figures.
- **Blocked by:** BL-173.

### BL-194 Policy program across domains in one review

- **Status:** open, UI.
- **Owner:** control plane program, CP3.
- **Missing:** The Policy screen adopts one stance at a time through `enactPolicy`, though the engine prices and commits a multi-domain program through `projectPolicyDraft` and `enactPolicyDraft`, which nothing in `apps/player` or `packages/player-core` calls (grep on 2026-10-16). A "Protective tariffs" stance and an actual tariff are two unlinked levers (audit 01 G06, D11, audit 03 P12, §2.3, audit 04 gap 15).
- **Acceptance:** A stance is staged per domain on one screen, with the combined outlook from `projectPolicyDraft` and the statute blockers per line, and enacted in one review through `enactPolicyDraft`. The trade line links to the trade workspace (BL-183) and says in plain words that a stance does not set tariffs.
- **Evidence:** audit 01 `nation/policy/PolicyScreen.tsx:85`, `policy-draft.ts:123,421`. Audit 03 `policy-draft.ts:49,349-353,392,421-433,513`, `policy-catalog.ts:183-230`. Audit 04 `src/nation/policy/PolicyScreen.tsx:75-99`.
- **Blocked by:** BL-171, BL-173.

### BL-193 Executive orders signed for several subjects, and several ready orders signed together

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP3.
- **Missing:** The subject picker is one `Select`, so relief for four states or blocks on three governments means four or three order flows (audit 01 G04, D1). The order pipeline's "ready to sign" rows are links (audit 04 gap 30).
- **Acceptance:** An order page lists its eligible subjects as rows with per-subject cost and challenge odds. "Sign for N" opens one review listing each signature, priced in order. Each subject keeps its own record, so a court stay on one leaves the others operative. Ready orders take row selection and one review. No engine change: record ids already embed the subject and only the same subject twice is refused, so audit 03 P14's `subjects[]` is not adopted (PROGRAM.md §3.8).
- **Evidence:** audit 01 `order-subjects.tsx:63-66`, `orders.ts:392-394,534-540,578`, `order-subjects.ts:41-51`. Audit 03 `order-authority.ts:6-42`. Audit 04 `src/nation/policy/OrderPipeline.tsx:14`.
- **Blocked by:** BL-172, BL-173.

### BL-192 Emergencies, Stafford declarations and the Guard across several states

- **Status:** open, UI and player-core.
- **Reconciled (October 18, 2026):** Status: partly landed. Missing: Emergency screen multi-select declare/renew/end in one review; declared pins on the map after BL-187; Guard answer only after commit. Blocked by: BL-191 landed in part. Checked against: apps/player/src/nation/home/BatchActs.tsx (BATCHABLE), batch/selection.ts, batch/package.ts (commit 5c8e37efe); nation/emergency/ has no batch use.
- **Owner:** control plane program, CP3.
- **Missing:** Declaring an emergency, a Stafford disaster or a Guard request is one state per flow and review, though ids embed the state and turn so several are distinct. "Time to renew" on several cards means several flows. The emergency map is a list (audit 01 G05, D3, D8, D9, audit 04 gap 18).
- **Acceptance:** States multi-select on the emergency screen. Declare, renew or end several in one review, with per-state cost and the governor's answer in rows. A Guard request's drawn answer appears only after commit. Declaration pins on the real map once BL-187 lands.
- **Evidence:** audit 01 `emergency.ts:39,152,204,226`, `stafford.ts:18`, `guard-federalization.ts:72`. Audit 04 `src/nation/emergency/EmergencyScreen.tsx:83,123-126,185`.
- **Blocked by:** BL-191.

### BL-191 States as a set on the Nation stage, and the State page acting inline

- **Status:** open, UI and player-core.
- **Reconciled (October 18, 2026):** Status: partly landed (5c8e37efe). Missing: State page hosting StateActs inline and the ?act=/?power=1 desks deleted (b9f6fd674 moved act desk to its own address; legacy params still redirect), per-state change in the receipt, keyboard-only completion check at both sizes. Blocked by: BL-172, BL-173 (shared SelectList). Checked against: apps/player/src/nation/home/NationHome.tsx:6,89-111 (selection in address), BatchActs.tsx, SelectionPanel.tsx; app/(game)/nation/state/[id]/index.tsx:10-18 still accepts act/power params (redirect); "isn't ready yet" string no longer found.
- **Owner:** control plane program, CP3. Builds on the `/nation` rebuild (the map as the stage with inline state management), which commits separately.
- **Missing:** The Nation map and States table select one state, and every locale act is a per-state flow with its own review, so a hurricane across three states is three flows (audit 01 G05, D10, audit 04 gap 17). The State page's acts navigate to `?act=` and `?power=1` sub-desks, duplicating the Nation path with different data visible (gap 16, cross-cutting 8). The LocaleDesk receipt says the per-state change map "isn't ready yet" (audit 05 §1.3). The inline Nation work is uncommitted in this tree (audit 04 cross-cutting 12).
- **Acceptance:** Shift-click or check-select on the map and the table, with the selection a set carried in the address. A group card lists each act once, with per-state cost and the governor's assent in rows, and one review. The State page hosts `StateActs` inline, and the `?act=` and `?power=1` desks are deleted. The receipt shows the per-state change. Observed at both sizes with keyboard-only completion through the table.
- **Evidence:** audit 01 `StatesTable.tsx:132`, `home/search.ts`, `locale-acts.ts:205-212,228,286,361`. Audit 04 `src/nation/home/StatesTable.tsx:162`, `StageMap.tsx`, `src/nation/state/StateScreen.tsx:44,86`, `StateViews.tsx:214,256`, `SelectionPanel.tsx:68`. Audit 05 `apps/player/src/nation/state/LocaleDesk.tsx:76`. Audit 02 §3.10.
- **Blocked by:** the `/nation` rebuild commit, BL-172, BL-173, BL-181.

### BL-189 The direct tariff path skips the competence gate, and trade treaties bind nothing

- **Status:** open, engine, owner decision on the treaty half.
- **Reconciled (October 18, 2026):** Evidence: tariff-orders.ts:125, instruments-economic.ts:125,147, conversation-report-actions.ts:73 (a second caller of imposeTariff without the gate). Checked against: packages/engine/src/tariff-orders.ts:125 (no tariffCompetence call; grep shows only instruments-economic.ts:147 gate); treaties.ts:86 text; second search grep tariffCompetence non-test: instrument-gates.ts:80 and instruments-economic.ts only.
- **Owner:** control plane program, CP2.
- **Missing:** Ladder rung 2 applies the customs-union and FTA competence gate, but `imposeTariff`, which the act desk calls, does not. A ratified trade agreement's "Tariff schedules bound at their current levels" is never read. The US holds no customs-union or FTA membership in the dataset, so whether the first half matters today is UNCONFIRMED (audit 03 §4.3, P6).
- **Acceptance:** `imposeTariff` and every tariff line refuse with the competence reason where rung 2 would. A line against a ratified trade-treaty partner shows a breach caution in the preview. The owner rules whether the breach blocks or costs trust, and the ruling is recorded here and implemented with a test.
- **Evidence:** audit 03 `instrument-gates.ts:72-84`, `instruments-economic.ts:132`, `build.ts:129`, `treaties.ts:86`, `orgs-cradles.ts:166-173`.
- **Blocked by:** the owner's ruling, for the treaty half.

### BL-188 Force plans: entry points, staging points and likely joiners

- **Status:** open, UI, player-core and one pure engine function.
- **Owner:** control plane program, CP2.
- **Missing:** The act desk, the war file and the command file each dead-end in a single act. Asking Congress for an authorization and ordering force cannot be staged together. A plan cannot show where a leg stages from, because reach uses a fixed basing table the player cannot see. A plan cannot say who would join a war a leg would open (audit 02 §2.3-4, §2.3-6, BL-175, BL-179 and BL-181 proposals).
- **Acceptance:** "Add to a plan" on the act desk carries the chosen rung and package into a line. The war file stages "authorization, then strike". The command file stages a posture line. Back returns to the origin. Each leg shows its staging point, read-only. A pure engine `projectOpeningJoiners(campaign, actor, target)` returns the same `LikelyJoiner[]` that `likelyJoinersOf` returns for the conflict the leg would open, with a deterministic test. Navy legs toward an enemy that can fire on ships are flagged as ships at risk each war week.
- **Evidence:** audit 02 `ActDesk.tsx:84-85`, `WarScreen.tsx:222-248`, `CommandActs.tsx:18-35`, `staging.ts:38-67`, `instruments-military.ts:143-148`, `war-join.ts:428-452`, `conflicts.ts:218`, `hull-losses.ts:74-81`.
- **Blocked by:** BL-180, BL-181.

### BL-187 The map drawn where geography answers the question: World, Security, Command, Emergency and War

- **Status:** open, UI.
- **Reconciled (October 18, 2026):** Missing: map selection (chosen/additive) feeding the plan lines beside each list (needs BL-172), list-twin check per DECISIONS §8.8, 390/1440 observation. Treaty/Country mounts unverified. Checked against: apps/player/src/security/SecurityScreen.tsx:53, CommandScreen.tsx:118, nation/emergency/EmergencyScreen.tsx:223, world/war/WarScreen.tsx:297, world/sets/OrgScreen.tsx:168, world/overview/MapPanel.tsx:77.
- **Owner:** control plane program, CP2. Coordinated with the universal player's UP7.
- **Missing:** Only Nation and the State dossier have a real map. World, Security, Command, Country, Org, Treaty, War, Emergency and the locale desk use a list under a heading, and selection on a map drives acts only on Nation (audit 04 gap 3, question (f), audit 02 §2.3-3).
- **Acceptance:** The shared `MapView` is mounted in World, Security, Command, Emergency and War, and its selection feeds the same plan lines as the list beside it. Each map has its list twin from the same lens rows (DECISIONS §8.8). Observed at both sizes, with the list completing every task alone.
- **Evidence:** audit 04 `src/security/SecurityScreen.tsx:53`, `CommandScreen.tsx:118`, `src/world/nation/NationScreen.tsx:30`, `src/world/war/WarScreen.tsx:275`, `src/nation/emergency/EmergencyScreen.tsx:185`, `src/world/sets/OrgScreen.tsx:159`, `TreatyScreen.tsx:135`, `src/world/overview/MapPanel.tsx:65`. Audit 02 `apps/player/src/nation/MapPanelSlot.tsx:29-48`.
- **Blocked by:** BL-181.

### BL-186 Tariff package engine contract: one retaliation per partner

- **Status:** open, engine, owner decision first.
- **Reconciled (October 18, 2026):** Evidence: replace "version 66 at save.ts:125" with "67 at save.ts:131"; acceptance "Saves at version 67 load". Checked against: packages/engine/src/save.ts:131 CURRENT_SCHEMA_VERSION = 67.
- **Owner:** control plane program, CP2.
- **Missing:** Under the fold (BL-179, BL-183) each tariff line against one partner queues its own retaliation on the same salient US export, each at 0.8 times its rate with no ceiling. That is what N separate acts already do today, so CP1 keeps it. Audit 03 argues a package should draw one answer per partner on the weighted rate, with one relationship effect per partner (audit 03 §5.4, P1).
- **Acceptance:** The owner rules on retaliation for a package, recorded here. If adopted, audit 03 P1's acceptance holds. One call with K lines across M partners returns one packet with K separately liftable measures and at most M retaliation records. A one-line package equals `imposeTariff`. Line order does not change the result. Any invalid line refuses the package and names it. Preview totals equal the effects applied. Saves at version 66 load. SCHEMA and ARCHITECTURE are updated. The code goes in a new `trade-package.ts`. A balance run is recorded.
- **Evidence:** audit 03 `trade.ts:52-89,331-337,362-463`, `trade-effects.ts:38-45`. `CURRENT_SCHEMA_VERSION = 66` at `packages/engine/src/save.ts:125` (read 2026-10-16). Whether `normalizeCampaign` validates trade state strictly is UNCONFIRMED.
- **Blocked by:** BL-178, the owner's ruling.

### BL-185 Show what tariffs do to households and jobs

- **Status:** open, UI (selectors exist).
- **Owner:** control plane program, CP2.
- **Missing:** `appliedTariffPrices` has no caller in either player. Domestic gain, input-cost rise and the employment effect are computed by `tariffIncidence` and never shown. Customs receipts in the Books do not link to the measures that produce them (audit 03 §4.4, P7, §3.2).
- **Acceptance:** The national Economy screen lists each tariff in force with its price step and phase-in weeks. Trade lines show the employment effect and input-cost rise. Each row and the customs line in the Books link to the line in the trade workspace.
- **Evidence:** audit 03 `packages/player-core/src/economy/tariff-prices.ts:25`, `trade.ts:270-278,738-748`, `assessment-ties.ts:97-104`, `national-books.ts:224`.
- **Blocked by:** BL-183.

### BL-183 Trade workspace: several goods from several countries, with bulk edit and presets

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP2.
- **Missing:** Tariffing one good from five countries takes five act desks. The national partner table tells the player to set tariffs on each country's page and has no rate column. Every trade door sends the player elsewhere (audit 03 §3.1, §3.2, P2, P3, audit 04 gaps 1 and 12, audit 01 G01).
- **Acceptance:** One workspace at `/world/trade`, also rendered as the act desk's tariff option, so there is one tariff surface. Desktop selects on a goods by partners grid, phone on partner chips then a goods list. Lines are a results list with rate in force, added rate, duration and drawn readings. Bulk edit sets or raises rates and durations with per-line clamping, and lists clamped lines. Presets are built from data. Exclusion is cell deselection, said plainly (BL-190). The national partner table, a country's goods row and a Diplomacy measure row each open the workspace pre-filled. Observed at 390×844 and 1440×900: 3 goods from 2 partners, one rate for all, one line at 90 days, one excluded cell, readings that update on each change, one review, a receipt listing every line. Checked at 320, 1280 and 1920. One-category copy retired.
- **Evidence:** audit 03 `apps/player/src/world/act/Terms.tsx:41,63-79,84-102`, `world/nation/Economy.tsx:82-86`, `nation/economy/Panels.tsx:101,117`, `world/nation/Diplomacy.tsx:48`, `act/config.ts:20-60`, `modeling/acts.ts:44-66`, `parts.tsx:113`, `catalogue.ts:134`, `docs/DESIGN.md:201,266`.
- **Blocked by:** BL-179, BL-182, BL-184.

### BL-182 Plan dock and plan persistence across surfaces

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP2.
- **Missing:** There is no staged plan outside the budget editor and the appointments plan, so related decisions on different screens cannot be gathered and reviewed together (audit 04 gap 6, cross-cutting 2). Nothing staged survives a reload outside the act desk's address (audit 05 §1.6).
- **Acceptance:** A `PlanDock` mounted once in the frame: a sticky right rail on desktop, a bottom bar within the lowest 112 pixels on a phone that expands to a sheet. Lines are grouped by kind with status, an "edit where it came from" door, and remove. The plan persists in a sidecar beside the sitting, keyed by campaign id, versioned by player-core and never written into `Campaign`. A plan drafted on an older turn is kept and read as moved. Draft edits undo and redo. A plan staged on one screen survives navigation to another and a reload, observed at both sizes. The draft cap is an owner value (PROGRAM.md decision 14).
- **Evidence:** audit 05 §2.5, §2.6, `packages/player-core/src/persistence/save-store.ts:145-151`, `docs/DESIGN.md:205`, `apps/player/src/world/act/ActDesk.tsx:136`. Audit 02 §3.2, §3.5 (Stale).
- **Blocked by:** BL-172, BL-173.

### BL-181 MapView multi-select, force marks and arcs

- **Status:** open, UI.
- **Reconciled (October 18, 2026):** Missing: per-region badges, force cluster marks as buttons with list twins, staging-to-target arc layer, press-to-assign; drop "no multi-select" and "one selected string". Blocked by BL-163 only. Checked against: packages/ui/src/map/types.ts:87-96,112-116; apps/player grep clusterForces|placeForces: 0 hits.
- **Owner:** control plane program, CP2.
- **Missing:** `MapView` holds one `selected` string and draws pins only of kind `needs` or `declared`, with no force marks and no multi-select. `placeForces` and `clusterForces` exist in player-core but nothing in `apps/player` uses them (audit 02 §2.3-3, BL-177 proposal, audit 05 §2.6 `AssignMap`).
- **Acceptance:** `MapView` gains `selectedKeys`, `onToggle` and per-region badges, keeping `selected` and `onSelect`. Force cluster marks are real buttons with glyph and count, each with a list twin. A staging-to-target arc layer exists. Regions stay out of the tab order where the paired list is present, and the list is the keyboard path. Press-to-assign works on every size, drag only as a web enhancement. The web and native drawings behave the same. Observed at 390×844 and 1440×900. Built on the committed version of `packages/ui/src/map/types.ts`, which the uncommitted `/nation` work modifies.
- **Evidence:** audit 02 `packages/ui/src/map/types.ts:63-68,87`, `player-core/src/geo/force-placement.ts:192-224`, `force-clusters.ts:51`, `packages/ui/src/icons/custom/unit-glyphs.tsx:8-67`. Audit 05 `packages/ui/src/map/types.ts:73-101`.
- **Blocked by:** UP7 `MapView` wiring (BL-163), the `/nation` rebuild commit.

### BL-180 Forces to several countries in one reviewed order

- **Status:** open, UI and player-core (list path first).
- **Owner:** control plane program, CP1.
- **Missing:** A force order is one country per page with one package slider. Nothing carries over between countries: availability, escrow and War Powers standing are re-read from the committed campaign, and there is no running total of readiness, money or exposure (audit 02 §2.1, §2.3-1, BL-178 proposal, audit 01 G02, audit 04 gap 2, audit 05 BL-176 proposal).
- **Acceptance:**
  - From the act desk's military family, the President adds several countries from a `SelectList`, each marked open, needs Congress or deterred from the projection, and sets a package count per country with a `NumberStepper` bounded by the engine's force terms.
  - Per leg and combined, from the fold: odds, escrow, weekly bill, readiness after execution against each gate, War Powers verdicts, reports due, wars opened or escalated.
  - An illegal leg shows the engine's reason inline. A leg that needs Congress is held with its citation (50 U.S.C. §§1541-1548).
  - One review, each leg its own titled block with its law, danger tone at rung 3 or higher. The receipt lists each issued act and its due date. The draft survives a reload through the address.
  - Observed at 390×844 and 1440×900: two strikes on two countries plus a carrier presence on a third, the second strike refused before review (proving BL-176 reaches the screen), completed by keyboard and screen reader through the list.
  - Whether the review machine can require per-leg acknowledgment for more than one hostilities leg is checked. If not, the owner rules (PROGRAM.md decision 14). Whether `forcePackageFor(...).levels` belongs on the leg editor is checked (audit 02 §5).
- **Evidence:** audit 02 `apps/player/src/world/act/ActDesk.tsx:84-85,117-154`, `Terms.tsx:104-141`, `apps/player/src/review/authorize.ts:18,75-77`, `player-core/src/world/nation-forces.ts:212-224`. Audit 05 `packages/player-core/src/act/workspace.ts:23-73`.
- **Blocked by:** BL-171, BL-172, BL-173, BL-174, BL-176, BL-177.

### BL-179 Tariffs on several goods in one reviewed order

- **Status:** open, UI and player-core.
- **Owner:** control plane program, CP1.
- **Missing:** A tariff order covers one kind of goods and one added rate, and the form says so. Three goods mean three passes through the act desk, three reviews and three receipts. The goods comparison sheet already lists every tariffable good, but its "Choose" replaces the one pick (audit 05 BL-173 proposal, §1.2, audit 03 §1, §3.1, audit 01 G01, audit 04 gap 1).
- **Acceptance:** On a country's tariff option the goods list is a `SelectList`. The President ticks several goods, sets a rate per good with a stepper or one rate for all from the bulk bar, and sees each good's booked revenue (per BL-178), shelf price rise, import fall, retaliation chance and status, with the combined effect at the foot, all from the fold. A good over the 100% ceiling is excluded with the engine's words. One review numbers every good and signs once. The receipt lists each good, and the Record shows one package entry whose consequences are the per-good orders. A fold test shows two goods on one partner taking distinct measure and retaliation ids. "One kind of goods" copy is retired on this surface. Completed by keyboard alone, observed at 390×844 and 1440×900.
- **Evidence:** audit 05 `apps/player/src/world/act/Terms.tsx:35-102`, `packages/player-core/src/act/catalogue.ts:170-186`, `apps/player/src/world/act/Done.tsx:46-47`. Audit 03 `trade.ts:373-401`, `apps/player/src/world/parts.tsx:113`, `catalogue.ts:134`.
- **Partly landed (2026-10-16, with BL-234):** the act workspace's tariff option now takes several goods from one country in one order: tick any goods, set one rate for all or a rate per good, and each good shows its law, room, revenue, shelf price rise, import fall and retaliation odds, priced as a fold (`packages/player-core/src/act/tariff-package.ts`). One review numbers every good and signs once; the packets commit as one run. Still missing against this item's acceptance: the shared `SelectList` and stepper (BL-173; the list is built locally in `apps/player/src/world/act/PlanTerms.tsx`), the general plan model (BL-172), one package entry in the Record with the goods as its consequences (BL-174; today each good writes its own entry), booked revenue matching the preview (BL-178), and a law chosen per good (one law covers the order).
- **Blocked by:** BL-221 (each good's line needs a statutory authority), BL-171, BL-172, BL-173, BL-174, BL-178.

### BL-175 Engine package marker on packets, only if the header test fails

- **Status:** open, engine, conditional.
- **Owner:** control plane program, CP1.
- **Missing:** Needed only if BL-174 shows that an effect-less header packet is refused by `apply()` or distorts the ledger. `apply()` checks only the narration, so this is UNCONFIRMED until a test applies one (audit 05 load-bearing choice 2, BL-180 proposal).
- **Acceptance:** An optional `bundle` on `EffectPacket` and `ActionRecord`, omitted when absent. Old saves load unchanged. SCHEMA and ARCHITECTURE updated in the same change. If BL-174's test passes, this item closes as not needed, with that test as the proof.
- **Evidence:** audit 05 `packages/engine/src/effect-types.ts:540-584`, `packages/engine/src/effects.ts:723-726,757-770`.
- **Blocked by:** BL-174's finding.

### BL-174 Package entries in the Record, receipts and the delta lens

- **Status:** open, player-core and UI.
- **Owner:** control plane program, CP1.
- **Missing:** A run of packets writes unrelated Record entries the same day. The receipt keeps only the newest event id. The delta lens remembers one selection (audit 05 §1.5, §1.6, BL-175 proposal).
- **Acceptance:** A committed package writes a header entry first, and each line's entry lists it as its cause through `provenance.causeIds`. The package receipt opens the header and each line. The delta lens recolors every region a package touched. A test applies an effect-less header packet through `apply()` and records whether BL-175 is needed. Builders that omit `provenance` are listed, and their lines link through `subjects` until fixed.
- **Evidence:** audit 05 `packages/engine/src/effects.ts:723-780`, `packages/engine/src/causality.ts:46-49,129-135`, `packages/player-core/src/record/record-entry.ts:209-272`, `apps/player/src/review/authorize.ts:93`, `apps/player/src/review/last-change.ts:9-18`.
- **Blocked by:** BL-172.

### BL-173 Selection and package components in packages/ui

- **Status:** open, UI.
- **Owner:** control plane program, CP1.
- **Missing:** The catalog has no multi-select list (`CheckCard` leaves selection to the caller with no count, bulk or keyboard handler), no numeric stepper (`Stepper` is a progress indicator), and review and receipt for one act only, with lines keyed by label so two lines with one label collide (audit 05 §1.1, BL-174 proposal, audit 01 item 6, E2, E3).
- **Acceptance:** `SelectList` (whole-row toggle, separate subject door, drawn readings in solid ink, sort and paging from `sortRows`, a bulk bar), `NumberStepper` (a `spinbutton` with value text), `PackageReview` as a `ReviewSheet` mode (numbered lines keyed by id, a "Won't be sent" block, the combined effect) and `PackageReceipt`. All render in the `/catalog` route in light, dark and high contrast at both sizes. The keyboard map in audit 05 §2.11 works, and axe is clean on the web export. `PlanDock` follows in BL-182.
- **Evidence:** audit 05 `packages/ui/src/forms/ChoiceList.tsx:128-137`, `packages/ui/src/forms/Stepper.tsx:8-10`, `packages/ui/src/world/SortTable.tsx:27-37,111-179`, `packages/ui/src/review/ReviewSheet.tsx:44`, `packages/ui/src/review/types.ts:68-87`, `packages/ui/src/review/Receipt.tsx:50`.
- **Blocked by:** nothing to build. BL-172 to feed.

### BL-172 Plan model and fold reader in player-core

- **Status:** open, player-core.
- **Owner:** control plane program, CP1.
- **Missing:** There is no way to stage several acts. Pricing each against the same campaign is wrong when they interact through ids, forces, treasury or reservations, because builders read standing state (audit 05 BL-172 proposal, §2.2 to §2.4, audit 01 item 3, E1, audit 02 BL-173 proposal).
- **Acceptance:** `packages/player-core/src/plan/` exports `Plan`, `PlanLine`, `PLAN_KINDS` (`act`, `nomination` and `end` at minimum), `readPlan`, `packagePlan` and an in-memory `createPlanStore`. `readPlan` folds lines in `(rank, seq, id)` order over a scratch campaign with the engine's `apply()`, and returns per-line status and reasons, the combined effect and a fingerprint. Tests show that two tariffs on one country and two sectors build distinct measure and retaliation ids, a refused line does not advance the fold, two rolled instruments on one target in one turn are a `conflict`, an over-budget package names the lines that tip it, the same plan on the same campaign gives identical packets twice, and a plan read on a moved campaign reads as `moved`. `deskPlan`'s existing tests pass with it expressed as the `nomination` kind. Which selector gives remaining budget authority is settled and named (audit 05 marks it UNCONFIRMED).
- **Evidence:** audit 05 `packages/player-core/src/appointments/desk.ts:252-268`, `packages/engine/src/trade.ts:362-371`, `packages/engine/src/instrument-gates.ts:120`, `packages/player-core/src/act/build.ts:147`, `packages/player-core/src/budget/draft-consequence.ts:74`. Audit 01 `trade.ts:345,363,373`, `instrument-issued.ts:26-47`, `instruments-military.ts:149`.
- **Blocked by:** nothing. Wiring needs BL-171.

### BL-171 One presidential review path for every act

- **Status:** open, UI.
- **Owner:** control plane program, CP1. Supersedes BL-169's second bullet.
- **Missing:** Four commit paths each open their own review sheet with different copy, tiers and controls: `authorizeAct` and `useAuthorize`, `useNationAct` with its own sheet, the Washington `useActCommit` with its own sheet, and `useChairActs` with an "I've read" toggle. A package review cannot be built four times. `PresidentialReviewProvider` refuses a second open while one is open, so a plan must be reviewed as one package (audit 05 §1.4, BL-171 proposal, audit 04 cross-cutting 10).
- **Acceptance:** Every act in `apps/player` commits through `authorizeAct` and the frame's `ReviewSheet`, mounted once in `app/(game)/_layout.tsx`. `presidential-review-seam.tsx`, `review-seat.tsx` and `useChairActs`'s sheet are deleted. Review and receipt lines are keyed by a stable id rather than by label. A grep for `new Promise<boolean>` review seams outside `src/review` returns nothing. The review-machine tests still pass, and one test commits a two-packet run through it. Stale-terms refusal is kept.
- **Evidence:** audit 05 `apps/player/src/review/authorize.ts:100-131`, `apps/player/src/review/use-authorize.ts:15-40`, `apps/player/src/review/PresidentialReview.tsx:37-38`, `apps/player/src/nation/act.ts:56-90`, `apps/player/src/nation/presidential-review-seam.tsx:26-60`, `apps/player/src/congress/commit.tsx:47-84`, `apps/player/src/congress/review-seat.tsx:21-60`, `apps/player/src/executive/acts.tsx:77-140`, `packages/ui/src/review/ReviewSheet.tsx:44`. The three seam files exist (checked 2026-10-16).
- **Blocked by:** nothing.

## Universal player program

The program that rebuilds the player as one Expo + Tamagui app for iOS, Android and the web (DECISIONS §8.1–§8.12). Plan and wave ledger: `docs/audits/2026-10-16-universal-player/PROGRAM.md`.

### BL-273 Move every screen onto the desk design system

- **Status:** in progress · P1 · UI. The screens, drafts, portraits, reference components and keyboard activation are in; the mixed draft journey passes on the web by keyboard and the Brief, a decision and the budget run in the iOS Simulator. Android, a driven screen reader, the deadline and comparison journeys, and more draft kinds are not done.
- **Owner:** universal player program.
- **Done (feat/desk-tokens, 2026-10-24):**
  - Tokens, four themes, five zones and the first components (`aa39ac51a`).
  - Shell and shared layout: no gold rules or navy icon chips; slim unclassified marking (full banners on classified screens); command bar with the attention pip (clear, waiting, held) from one derivation that Continue also reads; static attention light; pill-selected rail and dock (`360c93e92`).
  - Every screen moved to `Pane`, `Reading` and `Tag` with situation-led page heads, in five file-partitioned worktrees: Brief and decision (`360c93e92`), outside the modes (`a11ca14bf`), Record and news (`640384d59`), Nation (`0404a96a9`), Washington (`e36c0afcb`), World, security and compare by Codex (`577b9e63a`). Budget lines edit in place with `InlineField`.
  - `Badge`, `Stat` and `Panel` adapters deleted; review fixes from an independent Codex pass (reading links, spoken status words, step-checked fields, nominee count, tariff and war copy, attention after the ending) (`fccc33732`).
- **Done (claude/desk-drafts-3eb83c, 2026-10-24):**
  - The draft model in player-core (`src/drafts/`): drafts keyed by subject, grouped by the authority that acts on them, with a `CampaignStamp` basis that survives a reload, a priced preview citing the law, a frozen review whose packets `sign` commits through `commit`/`commitAll` against that campaign (stale and revised terms refused), a signing mark kept before the act so a reload never signs twice, and persistence beside the save bound to a named slot (`772003dea`). The design and the diff were each challenged by Codex gpt-6.1-sol; all five design findings and all nine diff findings were fixed and the P1s have tests.
  - `DraftsTray`, `DraftsButton` and `SignOff` in `packages/ui`; `Sheet` phone detents as buttons; every `Sheet` now keeps the page's theme on the web (it rendered Day under Night); `InlineField`'s step grid runs through today's value, which had refused every stepped budget line not on a round step (`5183f9ec5`).
  - Wired: the command bar's brass Drafts count opens the tray; budget lines draft as edited and "Send budget to Congress" opens their sign-off; the tariff dock's "Add to drafts", and a drafted order's Review opens its sign-off (`9455def70`).
- **Done (feat/desk-gaps, 2026-10-24):**
  - Keyboard: every button-role control answers Enter and Space (BL-274) (`c20c5444a`, `03892a3dd`).
  - The situation room's primary action is amber with a dark label: `situationActionFill`, its hover and `onSituationAction` in all four themes; a red fill carries its own `dangerInk` (`65b0c14d9`).
  - Portraits: the record-driven renderer ported to `packages/ui/src/portrait` as `Portrait` on react-native-svg, limited to filter primitives it draws on native (no grain or weave; the wire treatment as one color matrix); one `PersonFace` in the player, ringed in the person's party, in the dossier, quick look, connections, counsel, the decision's officer plates, the scandal's named official, the executive roster and office, and the founding cards (`aed85e6e9`, `16b912878`, `03892a3dd`).
  - Reference components: `MatterCard` and `Deadline` lead the Brief (priority words stay the engine's clocks: Due, Soon, Ongoing); `Wire` lists stories on the Brief ("From the wire"), the feed and the front page; `SortTable` (the DataGrid) stacks into labeled rows under 520px of its own width and keeps a sort control; the search (the CommandPalette) gained a Do group of verbs that open the view holding their act, matches marked in the accent, and arrows that follow the drawn order (`b28f6b063`, `95fe5ee99`, `03892a3dd`). `Counsel` stays in the app: only the decision uses it.
  - Copy: instruction-voice strings went from 87 to 57; what is left is press hints on marks, help steps that teach, verb button labels and nouns ("Press corps") (`bbc807a73`, `95fe5ee99`).
  - The published design system: Pane titles use `heading` and OptionCard titles `title` as the player does, the bundle rebuilt, the amber action added to its tokens, and Adoption records what landed (artifact version 7).
  - An independent Codex gpt-6.1-sol review of the whole diff found six defects (a Space latch kept across blur, three search verbs opening the wrong view, a lost sort control, unsupported SVG filters on native, a false "newest first"); all six were confirmed and fixed (`03892a3dd`) and re-checked.
- **Missing:**
  - More draft kinds: only budget lines (congressional) and the tariff order (executive) draft today; no "Needs the Senate" kind exists yet. Other `InlineField` edits (the tariff's per-good rates) still change the act's terms rather than a stored draft until the order is added.
  - A draft signed while the device refused the save is cleared by the tray's "Save again"; a retry from Settings saves the campaign but leaves the draft showing Not saved until it is pressed (harmless, applies nothing).
  - The deadline and comparison journeys (BL-273's acceptance) were not run.
  - Android: an emulator image exists on the machine (`admin_phone_api34`) but was not built or run. VoiceOver was not driven; the accessibility tree was audited instead (see Evidence).
  - `packages/ui/src/dossier/Network.tsx` (the TieMap) still draws monograms: its nodes carry no face.
  - The Brief's lead matter shows no person: `BriefMatter` carries no one who brought it.
  - `ios/` is generated by `expo prebuild` and ignored; the debug app was pointed at a worktree Metro with `RCT_jsLocation`.
- **Acceptance:** the four journeys (a mixed executive and congressional draft, a deadline, a comparison, each at 320px and 1920px) on Brief, and iOS, Android, keyboard and screen-reader operation; the remaining items above done or moved to their own items.
- **Evidence:** full workspace gate on the merged tree before `fccc33732` (build, typecheck, lint, every package's tests, all 88 verify gates, no dist drift) and targeted ui and player checks after it. Viewed at 320, 390, 1440 and 1920 in Night and Day: Brief, a SECRET decision, Congress, Budget, World, Settings, Record, the dock. Not run: native iOS and Android, screen reader, the balance harness (no engine change). Keyboard: see BL-274.
- **Evidence (drafts, 2026-10-24):** player-core `src/drafts/drafts.test.ts` 13/13 (grouping, subject keying, one-at-a-time signing with the other going stale, persistence across a reload, another administration's drafts dropped, failed-save retention and save-only retry, lost act pending again on reload, revised terms refused, unsaved signing mark refuses the act, switching administrations keeps each one's drafts, a refused revision keeps the draft). Full gate in order on the final tree before the last string fix: build, typecheck and lint pass; tests pass except two failures that are this worktree's environment and fail or pass identically without the change (`packages/content` premise test needs the gitignored `content/corpus/shards`; `apps/web` 80 tests hit a duplicate-React "Invalid hook call" in this worktree's install, and the same suite with this change applied to a fresh worktree at `926039b67` passed 79/79 files, 472 tests); 87 of 88 verify gates pass and the 88th (`verify-player-prose`) passed after the fix. Viewed in the running Expo web player (`/dev/seed`): an executive and a congressional draft in flight together, each signed on its own, the second going Out of date and repriced, at 1920 Night, 320 Day, 320 Night (the tray after a reload) and 1920 Day; captures in the side-session notes folder. Not run: native iOS and Android, a screen reader, the balance harness (no engine change). Keyboard: BL-274; the tray and sign-off are operable by pointer and touch, and their buttons share BL-274's Enter defect.
- **Evidence (desk gaps, 2026-10-24):** see the gate record `docs/audits/2026-10-24-desk/gates/desk-gaps.md`. In short: the mixed journey (a budget line drafted by keyboard and a tariff order added to drafts, both in the tray, each signed on its own by Enter, the budget going Out of date after the tariff signs and then repriced) passes at 1920 and 320 in Night and Day with no sideways scroll and no page errors. The accessibility tree of the Brief, a decision, the budget and a dossier has one h1 each, no skipped heading level and no unnamed control or image. The Brief, a SECRET decision and the budget render and navigate in the iOS Simulator (iPhone 17 Pro, iOS 26.5), the first native run of the player.
- **Blocked by:** nothing.

### BL-274 Enter and Space do nothing on the player's button controls

- **Status:** landed on the web; open only for the Electron check · P1 · accessibility.
- **Owner:** universal player program.
- **Done (feat/desk-gaps, 2026-10-24):** `packages/ui/src/primitives/key-activation.ts` gives a view drawn as `role="button"` a native button's keys: Enter as it goes down (not on a held repeat), Space as it comes up (claimed on the way down so the page does not scroll, forgotten on blur), only when the key is aimed at the control itself, never for a link or a disabled control, and after the caller's own key handlers. `withButtonKeys` applies it to `PressableFrame` (so `Pressable` without an `href`, `InlineField`'s read state and `Reading` with `onPress`), `Button`, `Select`'s trigger and `Stepper`'s doors; radio groups check the focused option on Space (`c20c5444a`, `03892a3dd`).
- **Proof:** `packages/ui/src/primitives/key-activation.test.ts` covers the handler and `Button`, a disabled `Button`, `Pressable` without and with an `href`, `InlineField`'s read state and `Reading` with `onPress`. Keyboard walk with real key presses (Playwright keyboard input, not synthetic events) on the Expo web player: Brief ("Briefing history" opens on Enter and on Space), a decision (Space and Enter pick answers), the budget (Enter opens a line's editor; the draft kept with Space), and the tray and sign-off in the mixed draft journey (Enter on "Sign the order" and "Send to Congress").
- **Still missing:** the same walk in Electron. It hosts the same web export, so the code path is shared, but it was not run.
- **Was missing:** on the web build, a `Button` (and any `PressableFrame` without an `href`) renders a `div` with `role="button"` and `tabIndex=0` and responds to clicks only. Pressing Enter on a focused "Briefing history" button does nothing (observed 2026-10-24 with real key presses in the browser pane on `feat/desk-tokens`); controls that render as links (`Pressable` with `href`) work. Keyboard players cannot act.
- **Acceptance:** Enter activates every button-role control and Space activates it on key up, on web and in Electron; a test in packages/ui covers `Button`, `Pressable` without `href`, `InlineField`'s read state and `Reading` with `onPress` only; keyboard walk of Brief, a decision and the budget.
- **Evidence:** `packages/ui/src/primitives/Button.tsx` (Frame is a `View` with `role="button"`), `PressableFrame.tsx`.
- **Blocked by:** nothing.

### BL-237 UI uniformity pass: readings that say what they are, names as doors, one result, journeys without wasted steps

- **Status:** landed, awaiting the owner's visual review · P1 · UI, player-core.
- **Owner:** universal player program; branch `claude/ui-uniformity` (worktree `.claude/worktrees/ui-uniformity`).
- **Missing (owner, 2026-10-17):** visualizations without keys or a way to read them; uneven type and design-system use; flat surfaces; interaction chains with wasted steps, dead ends and names the player could not open.
- **Done:** audit, journey map, rulings and gate record in `docs/audits/2026-10-17-ui-uniformity/`; the rule in `docs/DESIGN.md` §1, "Readings say what they are, and every name is a door".
  - Shared layer: `ReadingFrame`, `Key`, `Peek`, `ResultView`, `ScrollStrip`, `Loading`/`Empty`/`ErrorState`; keyed Meter, Sparkline, FanChart, TermTimeline, MonthGrid, TieMap, RollChart, PositionRidges, BenchArc, ShareBar, BarRow; one Panel, ShareBar and LawHelp; depth levels; citations in the interface face.
  - Every route family framed and keyed. Names open a quick look. Back pops or opens a declared parent. One result view per act. A state's act desk at `/nation/state/:id/act`. Continue stays put and its held reason sits in the bar. Search (Cmd/Ctrl-K). The briefing history at `/brief/digest`. Settings, Administrations and Handbook keep the frame.
  - Twenty-nine Brief and notification doors land on their matter.
  - A second round answered an independent reviewer's ten defects.
- **Proof:**
  - `pnpm -r --filter '!@admin/web'` build, typecheck and lint pass. Every `scripts/verify-*.mjs` passes, including the new `verify-reading-keys` (184 unframed readings to 4), `verify-heading-levels` (5 to 0) and `verify-spacing-tokens` (22 to 2), and `verify-attention-anchors`, which now reads the player.
  - Tests: player-core 1669/1669, player 210/210, ui 60/60, engine 4640/4640, content 1047/1047, world 560/560. studio-cli 360/360, with one load timeout passing alone.
  - Captures of 31 routes at 1440 and 390 in both themes and at 320, 768, 1280 and 1920. The final 320/390/1440 sweep shows no page scrolling sideways and no console errors.
- **Open within it:** nothing from the program itself; BL-243 is a regression the door work found. BL-238 and BL-239 to BL-242 closed.

### BL-243 A table row link wraps a link in its cells

- **Status:** open · P2 · apps/player, found 2026-10-17 while verifying BL-240.
- **Missing:** BL-241 made a `DataTable` row a real link (`rowPress.href`) and a cell inside it can be a link too. On `/nation` (Groups in each state, `HeatCell` in `apps/player/src/nation/home/Groups.tsx`) React reports `<a> cannot contain a nested <a>` and a hydration error, and the app's error toast shows "2".
- **Acceptance:** no row link contains another link on any table; the console is clean on `/nation` at 390 and 1440. A cell door stays pressable without nesting (a row's link covers only the non-door area, or the row is a pressable with the name as its one anchor).
- **Evidence:** the `shoot-screens.mjs --app player` run on `/nation` at 1440×900 and 390×844 reports the error in both themes.

### BL-260 Founding: quick start, person cards, a Cabinet laid out by purpose, and the assessment dots explained

- **Status:** landed, awaiting the owner's review (committed 2026-10-17 in the reconcile of the day's sessions) · P1 · apps/player, packages/ui.
- **Owner:** universal player program.
- **Missing (owner, 2026-10-17, on `/founding`):** (1) a quick start that still asks for the first step's details but picks the running mate and the rest at random within the game's rules; (2) the people cards (running mate, Cabinet shortlists) read as dated text blocks rather than the site's picture-first components; (3) the Cabinet step is one flat grid of 16 seats with no structure; (4) the four-mark assessment (three dots and a diamond) has no key on the founding screens and no quick way to see which mark is which.
- **Done:**
  1. Quick start is the first of three setup cards (`SetupChoice.tsx`). It runs as the short path with `FoundingDraft.quickStart`: About you, then the oath. The forward button needs a name, then draws the team (`quick-start.ts` `drawTeam`, `seal.ts` `drawPlayableTeam`): every Cabinet chair, the running mate and every White House post from its own shortlist, nobody seated twice, poor fits left out unless they are all there is, and a random mandate. A draw the seal refuses for the team's sake is redrawn up to six times, then falls back to the shortlists' defaults. The oath shows the drawn team (`stages/DrawnTeam.tsx`) with "Pick again" and "Change them myself" (back to the short path with the draw kept). Two glyphs were added to the set: `quickStart` (fast-forward) and `shuffle`.
  2. The candidate card (`founding/parts.tsx`) leads with the portrait and name, draws fit as four steps (`BandSteps`), puts party, age and place in icon chips, and sets the card's readings in a band below. The running mate's band draws beliefs and age as two marks with the gap between them filled, and experience as steps (`TicketBalance.tsx`); the home state moved into the place chip.
  3. The Cabinet step groups seats by purpose (`cabinet-groups.ts`: Safety and the world, Money and jobs, Services at home), opens on a framed reading of how the whole Cabinet reads with the key for the marks, and the shortlist panel steps seat by seat (Previous, Next seat). On desktop the panel stays in view while the seats scroll (`Sticky` gained `reserve`; `StageGrid` gained `stickySide`); on a phone it is the sheet, with the same stepper.
  4. The founding screens now use the in-game `ChairReadBadge` and `ChairReadKey` instead of their own copy of the badge. Shortlist cards spell the four marks out with `TraitReadout` (new in `@admin/ui/dossier`, with `PipMark`): each mark beside its trait and word.
- **Proof:** `pnpm --filter @admin/player run typecheck` passes; eslint on the changed files exits 0; player tests 219/219 (new `quick-start.test.ts`, `cabinet-groups.test.ts`); ui tests 70/70; `verify-icon-registry`, `verify-reading-keys`, `verify-file-size`, `verify-renderer-boundary`, `verify-spacing-tokens` and `verify-heading-levels` pass. Seen on the running player (port 8083): the three setup cards at 1440 and 390; a quick start from name to the oath with the team drawn and "Pick again" changing it; a presidency founded from a drawn team; the running mate card and the grouped Cabinet at 1440 (dark and light) and 390 (dark, with the sheet); no sideways scroll at 390 and no console errors.
- **Not run:** the full workspace build, test and gate sweep, the balance harness (no engine change), 320, 768, 1280 and 1920 widths, the in-game Executive roster after the shared badge refactor (same output, not re-shot).

### BL-261 Decision answers drawn as answer cards

- **Status:** landed, awaiting the owner's review (committed 2026-10-17 in the reconcile of the day's sessions) · P1 · packages/ui.
- **Owner:** universal player program.
- **Missing (owner, 2026-10-17, on a decision's "Compare the answers"):** the answer panel needed rebuilding to the same picture-first, keyed standard as BL-260. At medium widths the generic results row spread three readings across the card with wide gaps, colored left rules and a floating "Largest move" label; the odds carried a glyph that read as an image; the answer's own words sat at the foot; nothing keyed the bars; "Brings in" over "$38M in" said the direction twice.
- **Done:** `CompareAuthorize` draws each answer as an `AnswerCard` (`packages/ui/src/review/AnswerCard.tsx`): the answer's mark in a gold disc, its name, a Recommended badge and its words up top, the radio mark at the right; one bordered band of readings in the same places on every card (chance it works as five steps, money as a bar on the list's shared scale, then every reading any answer moves, each on a bar from a middle "today" line with the largest tagged); the for-and-against tally under it; what could go wrong, the forecast and the foot open beneath once picked. One key above the list says what the steps, the middle line and the three inks mean. Money coming in reads "Brings in · $38M". On a phone the moves stack under the odds and money inside the band. The act workspace's `ResultRow` is unchanged.
- **Proof:** `@admin/ui` and `@admin/player` typecheck; eslint on `packages/ui/src/review` clean; ui 70/70 and player 219/219; `verify-reading-keys`, `verify-file-size`, `verify-renderer-boundary`, `verify-spacing-tokens`, `verify-heading-levels`, `verify-icon-registry` pass. Seen on `/brief/decision/the-trade-terms-our-neighbor-wants` at 1440 (unpicked, picked, and with the 4-week forecast on), 1024 and 390, with no sideways scroll.
- **Not run:** the scandal screen, which uses the same panel; light theme; native.

### BL-262 Government papers drawn as the papers they are

- **Status:** landed, awaiting the owner's review (committed 2026-10-17 in the reconcile of the day's sessions); three engine follow-ups open · P1 · packages/ui, apps/player.
- **Owner:** universal player program.
- **Missing (owner, 2026-10-17):** "I would expect bills to look like bills and other government artifacts implied to look like government artifacts they are to represent." Ten artifact kinds shared one `Document` frame (centered seal, issuer, kind, title), so a bill, an executive order, a court opinion and a treaty looked alike, and the paper carried the staff's analysis ("Summary", "Trade-offs", chances, costs) as if the document said it.
- **Done:** a sheet (`Paper`, `Stamp`, `Caps`, `RunIn`, `SignLine` in `packages/ui/src/document/Paper.tsx`) and five forms in `packages/ui/src/document/forms/`, each holding only the document's own words, with the staff's reading moved beside it:
  - `BillPaper` on `/washington/congress/bill/:id`: the introduced print (Congress and session, H. R. or S. number, the chamber, how it came in, "A BILL", long title, enacting clause, numbered sections with margin numbers) and, once law, the enrolled print ("One Hundred Twenty-first Congress…", "AN ACT", the Speaker's and Vice President's lines, and the President's signature only when signed; otherwise "Became law without the President's signature." or "Passed over the President's veto."). The Congress, session, origin chamber and number come from `congress/bill-paper.ts` (the date, the first floor vote, a stable hash of the bill id). Trade-offs and effects moved to "Your staff's estimate".
  - `OrderPaper` on the order screen: the number once signed, the title in capitals, the authority clause, Section 1 to Sec. 6 (purpose, policy, implementation, effective date, authority with its citation, the standard general provisions), the signature line and "THE WHITE HOUSE,". Cost, changes, states, the chance of a challenge and the shutdown exception moved to "Staff notes on this order".
  - `OpinionPaper` on `/washington/courts/case/:id`: the slip opinion (term, court, docket number, "In re …" caption, decided date, judgment, "JUSTICE X delivered the opinion of the Court.", the dissent).
  - `TreatyPaper` on `/world/treaty/:id`: the parties' flags, the title, the preamble naming the Governments, numbered articles (undertakings, entry into force by signature or ratification), "Done at Washington", a signature block for each party. The effect estimate and the binding note sit under the paper with the parties as links.
  - `ReleasePaper` for White House notices: the seal, "Office of the Press Secretary", "FOR IMMEDIATE RELEASE", the kind over the headline, the body, "###".
  - A clerk's stamp (Draft, Signed, Awaiting signature, Became law, Vetoed, Struck down) marks each paper's state.
- **Proof:** `@admin/ui` and `@admin/player` typecheck; eslint clean on the changed files; ui 72/72 (new `ordinals.test.ts`) and player 221/221 (new `bill-paper.test.ts`); the six reading, size, boundary, spacing, heading and icon gates pass. Seen with `shoot-screens.mjs --app player --port 8083`: an enrolled law and a moving bill (week-30), a bill on the desk (housing-enrolled), a draft order (day-one-orders), a pending treaty (treaty-pending, light and dark) and a Supreme Court ruling (court-overview-recorded), at 1440 and 390 with no overflow.
- **Second pass (2026-10-17, side session):** the sheet takes the engine's marking (`Paper` `level`/`caveat`: banners top and bottom on the situation-room surface, per DECISIONS §8.11) and a `HeadLine` for memo headings, and six more forms land in `packages/ui/src/document/forms/`, each with only the document's own words on the paper:
  - `MemoPaper` for the decision memo (`decision/Situation.tsx`): letterhead with the raising office's emblem, "WASHINGTON", the filed date, "MEMORANDUM FOR THE PRESIDENT", FROM (the preparing officer) and SUBJECT (the matter), the engine's marking; severity and kind tags moved above the paper. The counsel memorandum (`oversight/Directives.tsx`) uses the same form, FROM counsel's office, SUBJECT "Lawfulness of the President's proposed instruction", stamped "Not yet sent"; the plain-words warning sits above it and the citation below.
  - `BriefPaper` for the President's Daily Brief (`security/Intel.tsx`): title, date, "For the President Only", numbered items under the engine's SECRET//NOFORN//ORCON; the staff's urgency labels moved to a "Your staff's triage" line keyed by item number.
  - `VetoPaper` on a vetoed bill (and on a law passed over a veto): "To the House of Representatives:", "I am returning herewith without my approval H. R. …", the objections read back from the veto's Record line (`congress/bill-paper.ts` `vetoMessage`, tested), the signature and "THE WHITE HOUSE," with the date from `Bill.resolvedTurn`. The enrolled print's approval line now carries that date too.
  - `ProclamationPaper` behind "Read the proclamation" on each declaration (`nation/emergency/Proclamation.tsx`): the title, "By the President of the United States of America / A Proclamation", the NOW, THEREFORE finding under the National Emergencies Act naming where and why, the Federal Register line, and the witness clause spelled from the declaration date (`witnessDate`, tested: "twentieth day of January, in the year of our Lord two thousand twenty-nine, and of the Independence of the United States of America the two hundred fifty-third").
  - `FindingPaper` behind "Read the finding" for each open finding (`security/FindingFile.tsx` under Operations): the section 503 heading, the statutory determination, SCOPE, DESCRIPTION and the signature with the signed date; how the committees were told and the actions under it stay on the row.
  - `CalendarPaper` in Congress, Nominations: today's Senate Executive Calendar listing the nominations before the Senate with their committee and stage. Appointments stays the composer.
- **Proof of the second pass:** ui and player typecheck; eslint clean; ui 73/73, player 223/223; reading, size, boundary, spacing, heading and icon gates pass. Captured with a scratch Playwright script (fixture import, route, presses) against port 8083 at 1440×900 and 390×844, no overflow and no console errors: the decision memo (decision-critical, CONFIDENTIAL), the Daily Brief and a finding (security-desk), the counsel memo (courts-and-oversight), the Executive Calendar (contested-nominee), a veto and a proclamation from scratch saves built with the engine's own `vetoBill` and `declareEmergency` (housing-enrolled, wildfire-colorado). The scratch saves and script are not in the repo.
- **Open within it:** covert findings carry no classification banner because the engine assigns none (`DocumentFamily` in `packages/engine/src/documents.ts` has only the Daily Brief and the decision memo); a real finding is classified, so a `covert-finding` family is an engine change for its own slice. Intelligence dispatches and act receipts were not reached. The veto message depends on the Record line's wording ("The President vetoes … and returns it to Congress."); storing the objections on the bill would be sturdier (engine). Bill, order and docket numbers are stable within the game but not recorded by the engine.

### BL-232 Force acts are priced on the wrong measure and headline only their first charge

- **Status:** open · high · engine, player-core.
- **Reconciled (October 18, 2026):** Status: open, engine. Missing: only (2) geography-chosen force unit (no carrier against a landlocked target; sourced rotation price) and (3) deployment price = what deploying adds, anchors in FORCE_COST_ANCHORS; plus the sourcing pass for covert/embargo/assistance up-front prices. (1) is done in UI (up-front and weekly drawn together); verify once on a capture. Needs owner agreement on (3). Checked against: packages/player-core/src/act/preview.ts:87,178; packages/ui/src/review/Results.tsx:382-398; packages/player-core/src/act/force-cost-words.ts:43-44; packages/engine/src/force-costs.ts:51-57.
- **Owner:** universal player program, beside BL-231; the engine half needs the balance harness.
- **Missing:** the owner (2026-10-16): "Forward Deploy against Belarus: $29M spent. First results in about 6 days. It goes on your Record. This dollar amount feels low." Traced in `docs/audits/2026-10-16-act-workspace/impact-audit.md`, "Force acts": the $29M is one carrier strike group's first week (`transit-days` 7) at CBO's peacetime *direct* operating cost (carrier $470M, air wing $330M, five destroyers at $60M, FY2017, carried to 2026 by CPI: about $4.1M a day). After that it bills about $28.5M a week while it stays out. The card and the review headline show only the first charge; the weekly bill appears only in the plan's caption (`act/force-cost-words.ts`). That also makes an Expeditionary Invasion ($129M up front, four brigades' shipping, then about $853M a week) read cheaper than a Limited Strike ($235M, priced whole). And rung 2 always sends a carrier, even against landlocked Belarus.
- **Acceptance:** (1) every force card and review states the up-front charge and the weekly bill together ("$29M now, then $29M a week"), and the compare row draws both, so no recurring act reads cheaper than a one-time one by leaving its bill out. (2) The rung's unit is chosen by geography: against a landlocked target, a fighter squadron or an armored brigade at a consenting neighbor's bases, with a sourced rotation price (CRS IF10946: FY2019 Army rotational forces $921.3M for an ABCT and enablers). (3) The deployment price is what deploying adds, per the audit's recommendation (about $1.5M a day for a strike group, a small transit charge, a repair bill on return that grows with time deployed, munitions only when fired), with each anchor sourced in `FORCE_COST_ANCHORS`. The balance harness passes after (3).
- **Evidence:** `engine/src/force-costs.ts` `usRungPrices`; `packages/world` `FORCE_COST_ANCHORS`; the probe in the audit (Belarus rung 2: units 1 carrier, upFront 28.83, weekly 28.54; rung 5: 4 brigades, upFront 129.28, weekly 853.15).
- **Found by BL-231 (2026-10-16):** reading every goal at once puts other prices beside the force rungs. Against Belarus and France on the opening campaign, the covert rungs charge $1.1B to $18.7B up front (covert-3 about $5.3B, covert-5 about $18.7B), the embargo (economic-5) about $24.7B and the Stabilization Package (assistance-3) about $11.9B. Each is far above anything sourced for a single act, and in one list they shrink every other money bar to a sliver. The act workspace therefore draws money on one scale per goal group in the full list and one shared scale in the comparison; the prices themselves need the same sourcing pass as the force rungs. Measured with `actWorkspace(...).sections[].families[].options[].preview.money` on `openingCampaign({ seedText: "act-workspace" })`.
- **More owner evidence (2026-10-16):** a capture of the rebuilt force rows shows a Blockade at $8M plus $8M a week under Forward Deploy at $29M plus $29M a week, and an Expeditionary Invasion at $96M plus $640M a week. With every option's assessment read, Public Statement (diplomatic-2) costs about $1.06B, Relief Shipment (assistance-1) about $2.37B and Influence Operation (covert-2) about $2.40B up front against Belarus.
- **Blocked by:** nothing for (1); (2) and (3) need the owner's agreement that the price is what deploying adds, not what the force costs to own.

### BL-168 Choice projection takes minutes on the main thread in the universal player

- **Status:** open, performance.
- **Reconciled (October 18, 2026):** Status: open, performance. Missing: web worker under Metro (or measured chunking budget) so a four-week run matches the legacy time; the 110 s figure is unre-measured since the per-job yield; nation/executive/press comparisons not wired to the hook. Blocked by: Metro worker setup. Checked against: apps/player/src/decision/projection/useProjection.ts:20-45; grep useProjection: only ChoiceProjection.tsx; no Worker in apps/player/src/decision/projection.
- **Owner:** universal player program, UP3.
- **Missing:** The legacy web player ran projection in up to six module workers. `apps/player/src/decision/projection/` runs one job per task on the main thread: a four-week run took about 110 seconds in headless Chromium. Hermes has no worker.
- **Acceptance:** A four-week projection finishes in the time the web player took, on the web through a worker under Metro, and without freezing the interface on a phone (chunked or yielded). The Nation, executive and press comparisons, which have no projection at all yet, share the one hook.
- **Evidence:** the decisions agent's measurement; `apps/player/src/decision/projection/useProjection.ts`.
- **Blocked by:** a Metro worker setup.

### BL-169 Decision, executive and press follow-ups from the universal player

- **Status:** open.
- **Reconciled (October 18, 2026):** Missing: drop "no shared Flag"; keep no shared Portrait, scenario replies without authority, courts' missing Article III/28 USC 518/1254 records, first-run walkthrough not ported (only its setting exists), unexercised sign/veto, case, roll-call and oversight paths. Move bullet 2 wholly to BL-171. Checked against: packages/ui/src/world/Flag.tsx:26; grep Portrait packages/ui/src: none; app/(game)/_layout.tsx has no Review provider; authority registry has no Article III / certiorari / §518 (grep of packages/player-core/src/authority) ; legacy FirstRun: only a settings toggle in apps/player/src/settings/MapAndGuidance.tsx.
- **Owner:** universal player program.
- **Missing:**
  - Scenario replies carry no `authority` field, so many answers show no citation; only order, consultation and directive-refusal authorities are tied.
  - `PresidentialReviewProvider` is not mounted once in `app/(game)/_layout.tsx`; each screen mounts its own boundary, and the Congress and executive screens keep their own review sheets (`src/congress/review-seat.tsx`, `src/executive/acts.tsx`).
  - No shared `Portrait` or `Flag` in `@admin/ui`; screens use monograms and icons.
  - The legacy `FirstRun` walkthrough is not ported.
  - The authority registry lacks Article III, 28 U.S.C. §518 and certiorari (28 U.S.C. §1254), so the courts cite 28 U.S.C. §509 and Youngstown instead.
  - Sign and veto, case screens, roll-call charts and most oversight acts were never exercised in a browser.
- **Acceptance:** one review mount, every act through it; citations on every act that rests on a law; the missing records added and checked; the unexercised paths driven in a browser.
- **Evidence:** the agents' reports, summarized in `docs/audits/2026-10-16-universal-player/HANDOFF.md`.
- **Blocked by:** nothing.
- **See BL-171** for the second bullet (one review mount, every act through it), which the control plane program now owns.

### BL-167 The baked world outline splits Russia into two rings that close across Siberia

- **Status:** open, defect.
- **Owner:** world dataset (map bake); found by the universal player's title plate.
- **Missing:** In `COUNTRY_PATHS.RUS` (`packages/world/src/maps/world-geometry.ts`, baked by `scripts/bake-map-geometry.mjs`), two rings (903 and 263 points) are halves of one outline split near the antimeridian. Each closes with a jump of about 92 plate units back to its start. Drawn as stored they rule a filled wedge across eastern Siberia. Point-in-shape tests built on the same rings (`outlines.ts` `onLand`, `nationOutline`) may misclassify points inside the wedge.
- **Acceptance:** The bake emits each country's rings closed within a few units. A test over every `COUNTRY_PATHS` entry asserts that no ring's closing segment exceeds 20 units. `onLand` is checked at a point inside the former wedge.
- **Evidence:** a scan of `COUNTRY_PATHS` at `cea91e52d` found exactly those two RUS rings. `apps/player/src/title/WorldPlate.tsx` rejoins them at draw time as a stopgap.
- **Blocked by:** nothing.

### BL-165 Engine citation and wording defects found by the authority registry

- **Status:** open, defect.
- **Owner:** universal player program, UP5 (Washington surfaces show these strings).
- **Missing:**
  - `directives.ts` `independenceMemorandum` treats Congress, the courts, the states and the Chief Justice as independent commissions. That produces "the organic statute of the The States", among others.
  - `order-amend-targeting-prohibition` tags EO 12333 as `kind: "constitution"`.
  - `order-energy-leasing` cites boem.gov rather than the Code.
  - `force-package-brief.ts` `authorityNote` names no statute: "war-powers reporting" should name the War Powers Resolution and Art. II §2 cl. 1.
  - Each independent commission's organic statute is missing from the institution catalog.
- **Acceptance:**
  - Memoranda are produced only for actual independent agencies, and each names its organic statute through the authority registry.
  - Every `authority` and `authorityNote` string resolves in `player-core/authority`.
  - `DIRECTIVE_AUTHORITY_EXEMPTIONS` is empty.
  - `verify-authority-citations` passes without the exemption.
- **Evidence:** the authority registry's report on `13373cf83`; the `DIRECTIVE_AUTHORITY_EXEMPTIONS` list in `packages/player-core/src/authority/registry.ts`.
- **Blocked by:** nothing.

### BL-166 Verify the authority registry's citations and source links by hand

- **Status:** open.
- **Reconciled (October 18, 2026), owner decision still open:** stays open; owner/human task. Checked against: packages/player-core/src/authority/records-*.ts.
- **Owner:** universal player program, UP5; a person with web access.
- **Missing:** No source link in `player-core/authority` was fetched when the registry was written, because the cloud network policy refused every legal host. These are the least certain:
  - the Justia URLs for Trump v. Hawaii and Dept. of State v. Muñoz (602 U.S. 899);
  - the archives.gov paths for EO 13526 and EO 12866, and EO 11030's codification link;
  - the Economic Stabilization Act PDF;
  - whether the Defense Production Act sunset (50 U.S.C. §4564) was extended past September 2025;
  - the Case-Zablocki reporting deadline after the 2022 amendments;
  - the notice period under 10 U.S.C. §161(b);
  - the nato.int and un.org treaty texts.
- **Acceptance:** Every `sourceUrl` resolves to the cited text. The uncertain facts above are confirmed or removed. The review is recorded on this item with the date and the reviewer.
- **Evidence:** `packages/player-core/src/authority/records-*.ts` at `13373cf83`.
- **Blocked by:** network access to the legal hosts.

### BL-163 Rebuild the player as one universal Expo + Tamagui app

- **Status:** in progress (UP0 landed; see the wave ledger).
- **Reconciled (October 18, 2026):** Status: in progress (UP0, UP3, UP5, UP9 landed; UP4/6/7/8/10 partial; UP1, UP2, UP11 not started per PROGRAM.md ledger, check that ledger is itself current). Checked against: docs/audits/2026-10-16-universal-player/PROGRAM.md:48-59; ls apps packages.
- **Owner:** universal player program, waves UP0–UP11.
- **Missing:** The player is a React DOM web app (`apps/web`, `packages/ui-web`) with no iOS or Android build. Benchmark comparison against simulated nations, a unified calendar and inbox, an authority registry that helpers and the Handbook cite, authored emblems for every institution and organization, and classification banners do not exist as product surfaces.
- **Acceptance:** `apps/player` reaches route parity with `apps/web` on the `packages/ui` design system. Each item in PROGRAM.md's wave table meets its acceptance with a gate record. Electron hosts the player's web export. `apps/web` and `packages/ui-web` are deleted. Native builds are proved by bundle and prebuild, with on-device runs stated as the owner's.
- **Evidence:** `apps/player/`, `packages/ui/`, `scripts/verify-renderer-boundary.mjs` and its proof; gate records under `docs/audits/2026-10-16-universal-player/gates/`.
- **Blocked by:** nothing.

## Map-first program

The program that rebuilds the player around one context-aware dotted map. Plan: `docs/audits/2026-10-10-map-first/PROGRAM.md`. Design: `docs/DESIGN.md`. It supersedes the decision-grade UI program; the items it replaces close in BL-60's W0 commit.

### BL-85 Measure district leans

- **Status:** open · world data
- **Owner:** world dataset
- **Missing:** after BL-84, district holders are right, but each state's leans are its old values re-dealt by party, an unmeasured spread. The House Clerk feed can't say how safe a seat is.
- **Acceptance:** leans from a sourced partisan index, with provenance, keeping each state's party ordering.
- **Wave:** W8.

### BL-87 Office records miss appointments and dismissals

- **Status:** open · engine and player-core
- **Owner:** engine records
- **Missing:** appointment and dismissal records don't name the department, so an office's Record list on `/washington/office/:id` can't include them.
- **Acceptance:** the records carry the office, and the office Record lists them.
- **Wave:** W8.

### BL-88 Export controls withhold every US commodity

- **Status:** open · engine · balance-sensitive
- **Owner:** engine (external pressure)
- **Missing:** after BL-82, a US export control still takes the whole US share off every commodity market; there is no commodity-to-trade-sector mapping to narrow it.
- **Acceptance:** a sourced mapping, with the balance harness run before and after.
- **Wave:** W7.

### BL-89 Verify the force-cost change and R1.1 at twelve seeds

- **Status:** open · engine · balance · P0 for closing W7
- **Reconciled (October 18, 2026):** Status: landed, awaiting proof record. Missing: record per-seed R1.1 (12 seeds) and medians, the H1/H4/R1 comparison with the pre-change numbers (137/1, H1 drift 1.477, interest share 5.468, H4 Argentina 0.064, newly CCC 2), and how population-balance "somebody can lose" now passes (owner design question may be resolved implicitly; confirm). Then close. Checked against: docs/audits/2026-10-11-simulation-depth/gates/integration-2026-10-14.md:29 (gate doc last commit cc7610417); docs/audits/2026-10-10-map-first/gates/merge-w7-w8.md:29.
- **Owner:** engine
- **Missing:** force-act prices were re-based on sourced operation costs (`packages/world/sources/force-costs-sources.md`; a limited strike on Venezuela fell from $35.14B to $232M; a one-carrier forward deploy from $7.91B to $33M up front) and R1.1 now reads twelve seeds, but the balance harness has not been read after either change. Decisions by the owner on 2026-10-10: more seeds first, and re-base on real outlays. Several anchors are press reports quoting officials rather than budget documents; two are planning values (2 sorties per aircraft, a 7-day passage); the weekly running costs are full peacetime costs, so they overstate what a deployment adds.
- **Finding (2026-10-10, from the engine agent's partial post-change run, `balance-after.log`):** `population-balance.test.ts` "leaves somebody in the population able to lose" now fails; it passed before the change. The assertion needs at least one skill proxy to have a non-zero removal rate over a term. Cheap realistic force costs removed the channel by which reckless and hawk play lost (treasury and budget authority run out). The harness's remaining files (`economy-balance`, `macro-balance`, `balance.test`) had not finished. This is a design decision for the owner, not a number to retune: with sourced force costs, what makes a reckless presidency fail (war weariness, casualties, escalation, the wider economic and diplomatic cost, legislative and public backlash) has to come from somewhere, or the sourced costs have to be paired with a stated cost the engine does not yet bill.
- **Full run (2026-10-10, after the change, at `4fb846e31`'s engine):** `pnpm --filter @admin/engine run test:balance` completed: 13 files, 136 passed, 2 failed, 4 skipped. (1) R1.1 democrat over 12 seeds: investment over careful −0.037, 0.036, 0.033, 0.014, 0.022, 0.033, 0.016, 0.03, 0, 0.032, 0.046, 0.019, median 0.0257 against the 0.02 ceiling (fails); republican median 0.0196 and independent 0.0156 (pass); every party clears the floor over idle (medians 0.12 to 0.13). (2) `population-balance` "leaves somebody in the population able to lose": every skill proxy's removal rate is 0 (fails). The policy-driven reckless proxy elsewhere is removed in 1 of 12 runs. Both wait on the owner.
- **Acceptance:** `pnpm --filter @admin/engine run test:balance` run to completion with per-seed R1.1 values and medians, every H1, H4 and R1 figure compared with the pre-change numbers (137 passed, 1 failed; H1 drift 1.477, H1 interest share 5.468, H4 Argentina 0.064, H4 newly CCC 2); any bound that moved diagnosed, not retuned; the owner told if R1.1 is still red.
- **Evidence:** commits `864267846`, `c80b8ab6f`, `5f56ad443`, `1b2b71867` and DECISIONS.md §6.8.
- **Wave:** W7 close.

### BL-108 Budget lines drawn as the capabilities they buy

- **Status:** open · P2 · government performance readings
- **Reconciled (October 18, 2026):** Status: open, partly done. Missing: ladder with every rung as a tick named by its act and a ghost marker for the requested level (currently only next-rung progress and weeks-to-open), a note when a request crosses a tick, and the domestic line's funding adequacy linked to /washington delivery rows. Drop apps/web DraftProjection.tsx evidence. Checked against: apps/player/src/nation/budget/Draft.tsx:61-95; packages/player-core/src/budget/draft-consequence.ts:116-146.
- **Owner:** operations redesign, after BL-107
- **Missing:** `/nation/budget` shows each of the five lines as a share of national income in a text box. What a line buys is already in the engine: `CAPABILITY_MILESTONES` (`packages/engine/src/budget.ts`) names the capability each statecraft line raises and the level at which each escalation rung opens (Foreign service reach 0.35 opens Recall Ambassador, 0.50 Coalition Pressure). The screen states this only as a sentence in the projection (`apps/web/src/nation/budget/DraftProjection.tsx`). The domestic line has no ladder; what it pays for is the funding adequacy of the agencies under it.
- **Acceptance:** each statecraft line draws as a ladder: the capability now as a marker, the requested level as a ghost marker, each milestone rung as a tick named by its act; moving the request across a tick says which act it opens or closes. The domestic line shows the funding adequacy of the bodies it pays for, linked to their delivery rows on `/washington`. Checked at 1440 and 390.
- **Evidence:** review captures, 2026-10-11 session (`/nation/budget` at 1440×900: a table of percentages with no consequence drawn).
- **Blocked by:** nothing.

### BL-109 Approval drawn as the judgments it is made of

- **Status:** open · P2 · government performance readings
- **Reconciled (October 18, 2026):** Status: open, nearly done. Missing: link from the services and competence judgments to the delivery reading on /washington; confirm weekly movement and polarization sit beside each judgment at 1440 and 390. Checked against: apps/player/src/nation/home/Topline.tsx:17-64; apps/player/src/nation/home/Opinion.tsx:24-52; grep washington in Topline.tsx: none.
- **Owner:** operations redesign, after BL-107
- **Missing:** the Nation home shows approval as one figure. The engine settles it from six public judgments and polarization (`PublicMood`, `packages/engine/src/state-campaign.ts`), and keeps per-state approval history. "Services" and "competence" are where the branch's delivery reaches the public, and nothing on either screen says so.
- **Acceptance:** the Nation home draws the six judgments as one comparable set with each one's weekly movement and polarization beside it; "services" and "competence" link to the delivery reading on `/washington`. Checked at 1440 and 390.
- **Evidence:** review captures, 2026-10-11 session (`/nation` at 1440×900).
- **Blocked by:** nothing.

### BL-110 Policy domains show how well the program is landing

- **Status:** open · P2 · government performance readings
- **Reconciled (October 18, 2026):** Status: open. Missing: only the stance comparison placed on its AlignmentVector axis with the administration's position marked; the delivery meter and chair reason are done. Checked against: apps/player/src/nation/policy/PolicyScreen.tsx:21-53,146; grep AlignmentVector in apps/player/src packages/ui/src: none.
- **Owner:** operations redesign, after BL-107
- **Missing:** the domain list on `/nation/policy` shows each domain's stance name and chair only. `executionQuality` (`packages/engine/src/policy.ts`) already prices how much of each domain's program lands, from its chair, and `packages/player-core/src/cabinet/scorecard.ts` states it as text on the office page only. The stance comparison is four columns of prose; the stances sit on an `AlignmentVector` axis the screen never draws.
- **Acceptance:** each domain card carries a meter of its program's delivery with the chair as the reason; the comparison places the stances on their axis with the administration's current position marked. Checked at 1440 and 390.
- **Evidence:** review captures, 2026-10-11 session (`/nation/policy` at 1440×900).
- **Blocked by:** nothing.

### BL-111 Branch delivery has no history, and two Washington loose ends

- **Status:** open · P3 · government performance readings
- **Reconciled (October 18, 2026):** Status: open, P3. Missing: (1) bounded delivery series beside metricHistory drawn as a Trend under the dial, with SCHEMA.md and ARCHITECTURE.md updated; (2) check roster/economy tabs at 320 and 390 with shoot-screens --app player (unverified in player). Drop (3). Checked against: packages/engine/src/institutions.ts:419; grep deliveryHistory/capacityHistory in packages/engine/src: none; apps/player/src/executive/Delivery*.tsx has no trend.
- **Owner:** operations redesign, after BL-107
- **Missing:** (1) the delivery dial on `/washington` reads this week only: `selectExecutiveCapacity` is derived and no series of it is kept, so whether the branch is recovering or decaying is not visible. (2) At 390 the roster scope tabs on `/washington` (and the tabs on `/nation/economy`) run wider than the work surface (`scripts/dev/shoot-screens.mjs` reports `button.ui-tabs__tab` spilling). (3) `apps/web/tests/washington.spec.ts` targets `.exec-node__row`, which the roster table no longer renders.
- **Acceptance:** (1) a bounded delivery series kept beside `metricHistory`, drawn as a `Trend` under the dial, with `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` updated in the same change (campaign state is a doc-sync surface); (2) no tab spill at 320 or 390; (3) the spec asserts the current roster and the delivery rows and passes.
- **Evidence:** 2026-10-11 session captures; `apps/web/tests/washington.spec.ts:24-45`.
- **Blocked by:** nothing.

### BL-102 Foreign trust is clumped and the rivals start unread

- **Status:** open · P1 · engine and dataset
- **Owner:** engine (relationship derivation, intelligence gates)
- **Missing:** measured on an opening campaign (seed `world-board`, 2026-10-10): of 195 governments' trust in the United States, 99 sit between 0.05 and 0.15, with 125 distinct values from −0.6 to 0.85. They are not a default: `deriveRelationship` (`packages/engine/src/relationship-graph.ts`) compresses every pair with no shared compact and no doctrine pull into that narrow slightly-positive span, and many members of one compact land on one identical value (much of Europe at a single point). Separately, China, Russia, Iran, India and Israel are unread at the start (`hasIntelOnNation`: no shared compact and counterintelligence the US does not out-read), so the World says "None are hostile" while Russia, Iran and North Korea derive near −0.5. The World's axis now draws both plainly: the hostile half is empty and 59 governments sit in the unread tray.
- **Acceptance:** the derivation's spread for non-aligned pairs is widened or sourced dyads are added (a row only once its source is opened), with the balance harness run before and after and the change to NPC behavior reported; and a decision recorded in `docs/DECISIONS.md` on whether a great power's view of the US is public record from day one.
- **Evidence:** the measurement above; `apps/web/src/world/nation/StandingStrip.tsx` live at `/world`.
- **Blocked by:** nothing.

### BL-103 Complete the presidential experience audit and Short/Long setup

- **Status:** in progress · P1 · W9/W10; no acceptance closure claimed.
- **Reconciled (October 18, 2026):** The audit and Short/Long setup were done on the frozen `apps/web`; the player's founding was rebuilt under BL-260 (`apps/player/src/founding/SetupChoice.tsx`, `quick-start.ts`). Open for the player: confirm the founding answers are saved, replayed and move the simulation as the profile says. The rest of the experience audit is BL-136. Checked against: apps/player/src/founding/SetupChoice.tsx, quick-start.ts; docs/audits/2026-10-10-map-first/EXPERIENCE-AUDIT.md.
- **Owner:** current experience pass.
- **Evidence:** `docs/audits/2026-10-10-map-first/EXPERIENCE-AUDIT.md` inventories routes and nested states. Owner's office-screen screenshot on 2026-10-10 confirms the text-and-meter pattern remained after initial work.
- **Working tree:** explicit Short/Long paths, twenty trade-off questions, final edits and oath review, party/career/style/age/school choices, existing appointments, saved answers, deterministic composition and legacy defaults. Office performance now precedes chair actions in the existing dossier frame; person and country assessments use bands; continuous readings no longer resemble editable sliders; all screen headers carry stars and the flag rule.
- **Acceptance:** every ledger row has phone/desktop visual evidence plus keyboard, empty/error and applicable contrast checks; each finding names a shared owner and resolution. Both setup paths seal and reload at all supported sizes; changes to answers require reapplication; final choices and appointees survive save/replay. Include evidence of profile effects through existing consumers, not only a profile label. Coordinate with BL-99/100/101 rather than closing those from a shared CSS change.
- **Follow-up:** World now has Situation/Governments views with named searchable rows, active conflicts first and honest unknown counts. Shared panel dimensions, explicit expansion, adaptive single-row choices and shared file navigation address the owner's wrapping/size regressions. Congress agenda depth is BL-106.
- **Missing:** exhaustive rendered-state acceptance and remaining surface-specific corrections; see the audit's per-surface statuses.
- **Verification:** 106 browser journeys passed across 390/1440; 30 targeted setup, Nation, map-resize and recovery checks passed across all six sizes; final compact recovery passed six further checks. Commands and inspected renders are in the audit. Normal workspace build/types/lint/tests passed; existing proof-gate and balance failures remain, so this is not release acceptance.
- **Blocked by:** nothing; historical matching is separately BL-104.

### BL-106 Broaden and validate the contextual legislative agenda

- **Status:** in progress · P1 · W9/W10; no release acceptance claimed.
- **Reconciled (October 18, 2026):** Status: in progress. Missing: balance calibration of declared fiscal assumptions and an adversarial acceptance run on the player (review -> transmission -> receipt -> floor at six widths). Replace web spec evidence with player checks. Checked against: packages/engine/src/legislative-acts-domestic.ts; packages/engine/src/legislative-agenda.test.ts; apps/player/src/congress/Bills.tsx:63-83; apps/web/tests/legislative-agenda.spec.ts (frozen).
- **Owner:** current experience and legislative pass.
- **Problem:** the owner found only an infrastructure proposal, presented in the same weak comparison pattern, with no credible program across healthcare, rights, race and other domestic priorities.
- **Working tree:** eighteen additional fictional proposals use the existing registry, congressional calendar, committee/floor/signature lifecycle, fiscal offsets and domestic/cohort reactions. Includes healthcare, racial discrimination enforcement, voting, policing, justice, housing, training, paid leave, business, energy, privacy, ethics, recovery, unemployment, veterans and border adjudication. Congress offers a subject-filtered agenda and focused review with annual funding and trade-offs. Eligibility thresholds are never rendered.
- **Acceptance:** opening and stressed campaigns offer different relevant agendas; no off-agenda transmission; one administration slot; no premature benefits; ongoing costs survive saves and expire on time; rights bills use the ordinary Senate track; review → transmission → receipt → floor works at all six widths. Preview must disclose cost, competing interests and current counts, while keeping engine predicates hidden.
- **Limits:** aggregate political/economic simulation, not measured health coverage, individual discrimination cases, construction completions or group-level voting predictions. Fiscal values are declared game assumptions and need dedicated balance calibration before realism/release claims. Full model depth and adversarial acceptance remain open.
- **Evidence:** `packages/engine/src/legislative-agenda.test.ts`, `apps/web/tests/legislative-agenda.spec.ts`, and the follow-up record in `docs/audits/2026-10-10-map-first/EXPERIENCE-AUDIT.md`. No separate corpus publication is involved; bills are static engine tables per CONTENT_DOCTRINE §5.

### BL-104 Research and calibrate fifty historical leadership references

- **Status:** open · P1 · follow-on to BL-103.
- **Owner:** leadership research and simulation calibration.
- **Missing:** fifty source-backed, period-specific profiles, readable summaries, policy/behavior evidence, disagreements and confidence, and transparent comparison to questionnaire dimensions. Barack Obama and Justin Trudeau are requested examples; the wider roster must represent regions, institutions and eras. No fifty-profile dataset is implemented or claimed verified.
- **Acceptance:** opened primary sources for every factual summary; separate documented acts from design inference; no invented precise integrity/competence scores. Matches explain similarities and differences without endorsement or moral equivalence. Extend existing foreign-leader, disposition, temperament and governance consumers; show domestic treatment and foreign choices changing in controlled paired simulations, constrained by institutions and capability. Preserve fictional campaign casting and saved/reproducible inputs. Balance and causal checks must pass before claiming realistic calibration.
- **Blocked by:** research and calibration, not owner approval for read-only research.

### BL-105 Model maritime disruption as actors, capacity and recovery

- **Status:** open · P1 · world simulation.
- **Wave 3 (2026-10-25):** economy lane `62585cefa` (merge `1178040a4`) and the E27 build `13c6534af` (merge `96acca4f3`), integrated at `bd7da1cdc`. Landed: B1 Brent fitted to lost flow (`ROUTE_CLOSURE` 0.68, kernel refit to EIA weekly Brent, peak 1.646 against a sourced 1.746) with the August-2026 floor back at 1.15 (`commodity-hormuz.test.ts`); B2 urea through Hormuz; E14 the limited SPR drawdown under 42 U.S.C. 6241(h) (`commodity-levers.test.ts`); E17 each bypass stated as spare, observed or none (`naval-tables.test.ts`); E27 an offshore navy denies only the blockaded party's cargo, and only while it reaches (`strait-passage.ts`, `blockades.ts`, DECISIONS 6.10). Still open: operators and legal regimes, residual capacity and recovery per strait, non-war causes (Panama drought), player-inspectable cause, actor and uncertainty, rows beyond Hormuz and Bab el-Mandeb (`chokepoint-flows.tsv` holds Hormuz crude, LNG and nitrogen and Bab el-Mandeb crude only), B6 Black Sea (no sourced bypass; todo at `economy.probe.test.ts:167`), and IEA partner barrels (the IEA pages were refused).
- **Reconciled (October 18, 2026):** Status: open. Missing: operators/legal regimes, residual capacity and recovery curves, non-war causes (Panama drought), player-inspectable cause/actor/uncertainty, rows for chokepoints beyond those with sourced flow. Checked against: packages/world/src/dataset/chokepoint-flows.ts:34; packages/engine/src/commodity-chokepoints.test.ts (258a9f04b) ; commodity-registry.ts generic Hormuz share.
- **Owner:** transit and commodity modeling.
- **Extended (2026-10-24, world dynamics program, Wave 3, physical-economy lane with world-data lane):** economy B1, B2, B6, E14, E17, E27. B1: calibrate the flow a full-intensity Hormuz war actually removes (`ROUTE_CLOSURE = 0.5`, per-flag passage and bypass at `commodity-shocks.ts:41,98-111`) against the 2026 shut-in series before fitting a price band; annual and quarterly STEO averages cannot validate a weekly peak (Wave 0: peak 1.381, report only). B2: nitrogen has no route (`commodity-registry.ts:146`); add one only after converting traded-urea exposure into total nitrogen supply (probe `economy.probe.test.ts` B2, point: the route exists; Wave 0: fails, peak 1.011). B6: Black Sea grain needs sourced port and export restrictions and bypass, not a Turkish Straits closure (Wave 0: wheat 1.061, report only). E17: further routes only with usable bypass in consistent units; installed pipeline capacity is not spare capacity. E27: naval denial by a non-littoral actor needs a DECISIONS §6.10 amendment with capability and geography checks. E14: the limited SPR drawdown and IEA collective action, after primary legal verification, through the existing levers.
- **Extended (2026-10-25, world dynamics Wave 1 integration):** B1, Brent under-pricing, stays here. The Wave 1 economy lane's exporter-only upstream deduplication and diversion bounded by substitutability left the rebuilt August-2026 month at 1.144 of reference, so the 1R repair lowered the `commodity-hormuz.test.ts` band floor from 1.15 to 1.10 ("lands inside a band around August 2026's $91 Brent"). That loosens a calibration band to fit a known under-price; it is not a fit. Acceptance adds: once the lost physical flow is calibrated (B1), the floor goes back to 1.15 or a sourced band replaces it. The B1 report-only peak moved 1.381 (Wave 0) → 1.343 (Wave 1) → 1.377 (1R).
- **Evidence:** twelve authored chokepoints already exist in `packages/world/src/dataset/geography.ts`; `closableByOneState` is not an authority or operating model. `commodity-registry.ts` reuses Hormuz's generic traffic share for crude and lists shore states as custodians. The denominator and closure assumptions need primary-source verification.
- **Acceptance:** sourced cargo-specific exposure, operators, geography, legal regimes, capabilities, residual capacity, alternate routes and recovery. Distinguish drought/accident/maintenance, attack/blockade and carrier avoidance; Hormuz disruption is an uncertain attempt with countermeasures, while Panama operating restrictions can arise without war. Conditions affect trade, commodity prices, exposed households and NPC responses without double-counting. Player can inspect cause, actor, uncertainty, effects and recovery. Cover Suez/Bab el-Mandeb, Malacca and other existing points according to evidence rather than copying Hormuz values.
- **Related:** global event coverage and implausible churn in BL-80; existing conditions/events remain authoritative.
- **Blocked by:** sourced parameters and integration work; no deployment or content publication authorized.

### BL-80 Implausible world churn in idle runs


- **Status:** open, in part · engine
- **Wave 3 (2026-10-25):** NPC lane `59f88c751` (merge `2c0c2e562`), integrated at `bd7da1cdc`: withdrawal is a procedure in `world-membership.ts` (notice under each body's `NOTICE_WEEKS`, decided again at a later summit, taken back when the quarrel is mended; weighs trade, guarantee value, grudges, coercion and exit cost; a body with no exit clause means repudiating the treaty). Asserted by `world-membership.test.ts` ("gives notice first and leaves nobody the same summit"; "goes at the first summit after the body's notice has run"; "waits out a long notice: two years under the EU's"; "takes the notice back if the quarrel is mended before it runs out"; "leaves a member that still trusts the others in its seat") and probe BR-04 "lets no international body lose more than two members in four years" (the lane reports at most one exit per body). Remaining: the notice periods are planning values (treaty texts not opened), the harness report of bloc-membership drift is not built (only the events probe counts exits), and accession rates were not re-diagnosed.
- **Owner:** engine (NPC agency, blocs)
- **Extended (2026-10-24, world dynamics program, Wave 3, NPC lane, Opus):** events BR-04. Every 13 weeks any member whose mean trust toward the others is at or below `LEAVER_TRUST = -0.05` may leave (`packages/engine/src/world-events.ts:166-170,228-251`), with no dispute, cost or procedure, and trust across large bodies sits near zero, so the gate is always open. Raising `LEAVER_TRUST`, as the events audit proposed, admits more leavers, since eligibility is `trust <= threshold`. Acceptance adds: withdrawal reads the member's benefits, grievances and costs under each body's own procedure (no blanket two-year cooldown, no forced symmetry with accession), shares `world-events.ts`'s single writer with BL-292, and probe `events.probe.test.ts` "lets no international body lose more than two members in four years" (rate, a design bound against OPEC's three exits in eight years) passes. Wave 0 run, from live rosters: most exits in any four-year run OPEC+ 14, BRICS 7, EU 6, GCC 4, AU 1; accessions EU 3 to 5.
- **Reconciled (2026-10-25, Wave 1 integration):** the events probe "lets no international body lose more than two members in four years" now passes (most exits in any run: OPEC+ 1, against OPEC+ 14, BRICS 7, EU 6 at Wave 0; accessions EU 3 to 5, unchanged). Nothing in `world-events.ts` changed; the likely cause, inferred and not traced, is relationship memory holding mean trust near 0.08 instead of sliding toward zero, so fewer members sit at or below `LEAVER_TRUST`. The acceptance's procedure, benefits and costs per body are still missing, so the item stays open; the passing probe is a side effect, not the fix.
- **Missing:** idle balance runs show France leaving the EU and OPEC+ losing about 15 members in four years (seen by the W1-debt workstream, 2026-10-10).
- **Acceptance:** accession and withdrawal rates are diagnosed against the trait and bloc rules, and the harness reports bloc membership drift inside a plausible bound.
- **Wave:** W7 (world).

## New finding

### BL-75 W10: parity and acceptance

- **Status:** open · P1 · wave
- **Reconciled (October 18, 2026):** Status: open · P1 · acceptance retargeted to apps/player; Owner: universal player program (BL-163); Blocked by: BL-163 waves, not BL-71..74 or BL-90..94. Checked against: BACKLOG.md:971-979, :1623; PLAN.md:207.
- **Owner:** the map-first program (`feat/map-first`)
- **Missing:** Not proven.
- **Acceptance:** The capability ledger is complete (each row reached or explicitly dropped). The full task suite passes at 320, 390×844, 768, 1280×800, 1440×900 and 1920×1080. axe passes. Reduced motion and transparency, forced colors and throttled-phone performance pass. The final `DESIGN.md` is written. `staging` is merged in, then the branch goes `--no-ff` into `staging`.
- **Carried in from the previous program's proof items (closed 2026-10-10):** (1) the seventeen representative flows, each driven on the real surface with a player-visible assertion: new presidency to the first matter; resolve, Continue, the next meaningful stop; several simultaneous matters with priority and defer; the no-matter horizon return; the appropriation and budget process; nomination to Senate to seating; bill to Congress to President to implementation; executive order to implementation to legal challenge; foreign escalation to the congressional clock; emergency and federal-state interaction; cabinet conflict and dismissal; investigation and oversight; an election milestone; removal-pressure escalation; press reaction and a later callback; a world action that does not involve the player; God Mode revealing what normal play does not (if BL-42 has shipped it). (2) A blind first session, written up, answering from the surface alone: where am I, why did the game stop, what needs me, what happens if I do nothing, what can I do, where is more context, who is advising me, what is fact and what is forecast, how do I continue. (3) An adversarial review by a context that did not build the player, recorded with a verdict per attempt.
- **Evidence:** PROGRAM.md, Verification.
- **Blocked by:** BL-71 to BL-74, and the W9 visual pass (BL-90, BL-92 to BL-94)

### BL-112 Presidential simulation depth and visual modeling

- **Status:** in progress (phase A)
- **Reconciled (October 18, 2026):** Status: in progress, simulation-depth completion lane merged 2026-10-14 (759316b3f); Blocked by: nothing (baseline measured, gates green); delete the "Current integration" paragraph and keep scope extension + visual-first pass; remaining proof is on apps/player, not apps/web. Checked against: integration-2026-10-14.md (build, typecheck, lint, test, 89/89 gates, balance 138/0); PLAN.md:133 says in progress, full scope open.
- **Owner:** simulation-depth program, `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`
- **Missing:** immutable release vintages and a comparison system with a reference pack; service-level executive delivery; party and caucus semantics without "yours"; spatial bases, formations and access; selective variability; an isolated alternatives workbench.
- **Acceptance:** brief §13.1 tests MET-01 to INT-02 pass, the three integrated playthroughs are recorded, touched screens are inspected at phone and desktop sizes.
- **Evidence:** program record above; finding dispositions are in it.
- **Blocked by:** a measured baseline (PLAN.md reports red gates).

The owner's brief is restated in the program record. Phases are A to H, plus I to K (people, Congress and the courts), added by the owner on 2026-10-11 and designed in `docs/audits/2026-10-11-simulation-depth/PEOPLE-CONGRESS-COURTS.md` (BL-120 to BL-124).

**2026-10-12 scope extension:** the owner authorized `docs/audits/2026-10-11-simulation-depth/INSTITUTIONS-EXECUTION-BRIEF.txt` in full. Its mandatory matrix and source findings are in `INSTITUTIONS-EXECUTION.md`. General judicial proceedings, meaningful individual votes and quorum, substantive amendments, authority/funding predicates, scoped reversal, corpus recurrence/coverage, influence/privacy, trust consistency and full-campaign proof all remain required. Existing I/J/K and BL-86/102/106 ownership is retained; none is closed by a narrow fix. The prior baseline is superseded by checks on this dirty checkout.

**Current integration:** Build18c build, typecheck and lint passed; the Build18 full workspace suite passed (engine 4,435, player-core 1,361, content 987, CLI 345, web 372; all others passed, one content file skipped). The eight Build16 fixture failures are resolved and the invariant-checked Hill pin passes. Later test additions require rebuilt scoped checks. The current handoff is `docs/audits/2026-10-11-simulation-depth/HANDOFF-2026-10-11.md` (updated 2026-10-12). Bounded historical Record additions passed 20/20 focused tests, but coordinated Build19 and store duplicate/retry checks remain pending. Build12 prebuilt browser checks passed graph 6, court response 12, graft 6, executive 24 and intelligence 24 journeys across the supported widths, followed by six additional intelligence privacy journeys. Visual evidence differs by surface: graph captures all inspected; court/graft representative captures inspected; representative executive lower delivery-panel captures inspected in Build15; intelligence phone scrolling/receipt and desktop report inspected. Thirty-nine independently approved artifacts cover thirty-eight unique definition IDs, none mounted/published; a replacement supersedes one earlier narrow retime. Later source corrects authority retries, first-strike and covert attribution and implements district-forum and circuit-panel process, Supreme term scheduling, and government litigation conduct. Focused executive authority/accounting tests passed 24/24 across three commands; surveillance/oversight/court-breadth tests passed 32/32 in a separate command. The full-scope matrix remains open. Current overview/Washington browser proof passed 36/36 and stay/calendar/circuit-vacancy proof passed 24/24 at six widths, with four inspected detail-capture checks. Both forty-seed Build8 forecast measurements are descriptive (120/160 held and 102/160 continuing results in displayed ranges), not confidence calibration. Full balance still fails population removals at 52 weeks and the Democrat investment-versus-careful median approval gap (0.02603843048432669 against 0.02); no thresholds were loosened.

**Required visual-first pass (owner correction, 2026-10-12):** BL-112 and its Courts/Congress/people/intelligence surface owners remain open for visual presentation. The concrete contract in `docs/audits/2026-10-11-simulation-depth/PROGRAM.md` requires linked court jurisdiction/bench/case flow, dated case paths and real vote layouts; chamber/procedure/provision comparisons; funding-to-delivery flow; evidence-to-recipient intelligence flow; directed relationship views; and observed-history/forecast/causal Record compositions. Prose-led screens with incidental charts are insufficient. Reuse existing primitives and prove actual linked actions and meaningful visuals at all six widths, with inspected captures and a fresh-player comprehension record. Previous functional passes do not close this acceptance.

### BL-136 Application-wide visual layers and presidential interaction

- **Closeout corrections 2026-10-15:** persisted Economy country/year context, symmetric branding, store-ready Settings layout and shared focus/motion controls are committed locally. Final build/typecheck/lint passed. Integrated affected browser run35/36 exposed a test reflow race; strict corrected enlarged-text checks passed4/4. Emergency's actual settled camera journey passed4/4 with inspected phone/desktop captures. Evidence: `docs/player-rebuild/SHADCN-INTEGRATION.md`, `SHADCN-EMERGENCY-CAMERA.md` and `evidence/closeout/`. Current serialized workspace aggregate was interrupted for the stable handoff and is not a pass; manual assistive-technology, cross-browser, complete contrast and loading-performance controls keep this item open.
- **Shadcn execution 2026-10-15:** five persistent isolated streams are reconciled locally. Shared vendor controls and duplicated evidence/native dialog implementations are pruned; Brief/calendar, Congress, judicial/accountability and Nation/World families are substantively restructured. Canonical navy/white tokens retained. Root integration verification and remaining route/state gaps are recorded in `docs/player-rebuild/SHADCN-INTEGRATION.md`; this item stays open. Generic unsupported domestic-force executors now refuse, and Guard support coordination uses USD-million units without asserting deployment. No whole-application completion from representative checks.
- **Continued source integrated 2026-10-15:** Office/Person workspaces, decision/clock/legislative flows, Budget/Policy/Emergency, compact country views, contextual Security actions, Press workspaces and exact Record evidence are locally checkpointed. Economy now synchronizes selected signals with inline benchmark/history/country evidence; published and simulated performance share axes (`bc184940a`). Receipt return preserves original country/category independently of changed tariff goods (`60dc7ac63`). Unused Radar implementation and styles are retired (`5ffd6c7b2`). The stable41-address ×six-width ×two-theme mounted-route sweep passed12/12; source-specific flow/visual records are in the integration document. Complete conditional-state, assistive-technology, branding and performance acceptance remain open; these results are not a release approval.
- **Owner correction 2026-10-15:** rebuild the persistent checkout around the intended workflows rather than reproduce the missing temporary implementation pixel for pixel. Shared Material foundation and foreign action/tariff/conflict slice are implemented with bounded verification (36 six-width/two-theme browser checks and 12 final/lifecycle checks); no whole-application acceptance or restoration claim. Evidence: `docs/player-rebuild/VERIFICATION.md`. Sequence, dependency/data contracts, adversarial controls and observable acceptance: `docs/player-rebuild/EXECUTION.md`. Earlier temporary-worktree test results are historical only.

- **Audit 2026-10-13:** [Player visual audit and implementation specification](audits/2026-10-13-player-visual-audit/README.md) at `011d0c042fbb2e4e1bbb52c7b5b7b3d17e165fbb`. Six prioritized findings, annotated light/dark directions, 46-route ledger and explicit unverified states. Targeted direction/valence, commodity identity/link and chart-context repairs precede shared hierarchy refinement; map preference propagation remains BL-138. Broad desktop wrapping was not reproduced. Audit/specification only; no redesign implemented and BL-136 remains open.

- **Status:** open · shared foundations and representative visual families implemented; full visual acceptance pending
- **Reconciled (October 18, 2026):** Status: open; Owner: player shell/design system on packages/ui; acceptance VL-1..VL-5/S01-S19 re-proved on apps/player; legacy progress notes collapsed to one line; consider folding into BL-163/BL-237. Checked against: tailwind/@radix-ui only in apps/web/package.json (grep -l over apps/web, apps/player, packages/ui package.json); universal player route tree under apps/player/app.
- **Correction 2026-10-14:** owner rejected Congress’s oversized number/bar composition despite removed borders. Rebuilt its weekly summary as a shared-axis ledger and linked workload; migrated shared comparison consumers and remaining country/state stat bands. Evidence: `docs/player-visual-overhaul/READING-LEDGER.md`. Full visual acceptance remains open.
- **Attention-family correction 2026-10-14:** migrated shared destination attention plus Brief, Oversight, country, bill and nomination queues; country subject navigation now preserves history and focus. The owner explicitly rejected treating screenshots as isolated fixes. Family scope, retained evidence and verification: `docs/player-visual-overhaul/ATTENTION-SYSTEM.md`. Full application visual acceptance remains open.
- **Owner:** player shell/design system and route-family migration; coordinated with BL-112, BL-120–124 and BL-135.
- **Outcome:** every player route and nested state offers useful visual context, consistent subject help, focused expansion, meaningful icons/accent and selectable themes; consequential acts receive deliberate presidential review and visible local resolution.
- **Scope:** `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Application-wide visual layers and presidential interaction,” is the detailed contract and complete file-route inventory. Includes entry/founding/saves/settings, Brief/decisions, Nation/economy/electorate/budget/policy/emergency, all Washington/World surfaces, Record/press/legacy/ending and shared loading/error/help/confirmation states. Developer galleries support local checks; Studio is not player scope.
- **Acceptance:** VL-1–VL-5 and S01–S19 are implemented or explicitly justified as retained after actual inspection. Target expansion preserves parent layout/scroll/inputs and returns focus. System/Light/Dark is visible and persists; every overlay/chart/state themes correctly. Compare→terms review→explicit confirmation→actual progress or labeled result replay→subject result/Record is consistent. The owner removed the simulated biometric ceremony on 2026-10-14; immediate review never bypasses confirmation; cancel/stale/refusal/save-error paths are distinct; no duplicate commit or private-data leak. Named votes appear only from actual recorded votes. All final route-family evidence includes real populated/empty/unknown/error states, both themes, phone/desktop and accessibility checks.
- **Evidence:** 2026-10-12 source/import/layer census and live Courts viewport in the execution record. Existing functional passes do not certify this work.
- **Sequence:** shared layers first, Courts plus one consequential flow next, then all families. Best local outcome takes precedence over old presentation choices; no paid dependency/service or sensor collection.
- **Progress 2026-10-12:** VL-3 themes implemented in `92ca751b5` (tokens, preference, boot hint, Settings, masthead popover, phone drawer); per-surface dark inspection of paper, charts and map overlays remains. Owner chose tiered review: full presidential review for irreversible or high-stakes acts, a short inline confirmation for routine plays, none for filing and navigation; the tier list and the other plan corrections are in PROGRAM.md, "Plan validation and owner decisions." Interim full checkpoints now follow the shared layers plus Courts and each batch of four or five families. Shared layers (`b0026aeab`) and the tiered review on every authorize site (`1ac6a9b0b`) landed with unit and Chromium proof; the oath has its review; open: e2e specs adopting `confirmReview` (`foundQuickly` done), help rollout (no screen used `HelpTip` before), family-specific resolution logs, Safari/Firefox and assistive-technology passes. Detail in PROGRAM.md, "Shared layers and tiered review landed." The Courts overview and case detail are the first redesigned family (PROGRAM.md, "Courts overview redesigned" and "Court case detail redesigned"). Found there: three fixture generators (`day-one-orders`, `judicial-breadth`, `statutory-court`) fail on engine state and break full e2e global setup. The Congress overview is the second (PROGRAM.md, "Congress overview redesigned"): one page with each fact in one place, party marks, member-level seats, district and Senate maps, the President's position among the members, the term's roll-call record and the people; tabs are working lists only. Open for S11: the bill page. Polish pass (BL-141): one panel inset and section-title step across every family, whole-card targets, open detail and role records on the person dossier.

- **2026-10-14 separate worktree:** shared palette/depth, responsive recorded-history replay, connected commodity workspace, context-restoring Doors, Brief evidence, Security readiness, office mandate and Record orientation implemented locally. Material 3 inspired adaptive chrome, shape/type refresh, area/ring/diverging readings and supply relationship flow now extend the core slice. Logo work deferred until last. Final six-width verification record: `docs/player-visual-overhaul/VERIFICATION.md`. Remaining family/nested-state acceptance stays open; no global visual completion claim. Executive rebuild verification is recorded in `docs/player-visual-overhaul/EXECUTIVE-REBUILD.md`; the prior card attempt is superseded. Person dossiers and the scan removal remain pending under the owner’s Executive-first priority. Latest office and Executive evidence revision: `docs/player-visual-overhaul/INSTITUTION-REVISION.md`; full application acceptance remains open.

- **2026-10-14 surface expansion:** compact shared reading strips replace oversized metric cards; action impacts use honest qualitative/numeric encoding; scan-free confirmation and live map theme updates are verified. Fifteen surfaces, 210 layout checks and named action journeys are recorded in `docs/player-visual-overhaul/SURFACE-EXPANSION.md`. Aggregate unit run timed out once in CLI; unchanged-limit file rerun passed. Full route/state visual acceptance remains open.

### BL-137 Efficient local validation and balance

- **Status:** open · implementation/profiling pending
- **Reconciled (October 18, 2026):** Status: open · implementation/profiling pending; drop "two balance failures remain open"; keep the 2026-10-13 note that the workflow times out at 60 min. Checked against: integration-2026-10-14.md "Balance" row; package.json:14 test script has --workspace-concurrency=1 --maxWorkers=2 --minWorkers=1; 099c5a6f0 ancestor; .github/workflows/balance-harness.yml:57 timeout-minutes 60.
- **Owner:** existing validation scripts, fixture builders and engine balance harness; no second harness.
- **Outcome:** short build feedback and a measured final validation pass avoid repeated expensive runs without weakening correctness or balance criteria.
- **Acceptance:** record same-machine before/after workload timings and output equivalence; retain unit/balance separation; reuse bounded fixtures/prebuilt browser bundle; investigate duplicate seed/report work, attribution/serialization and worker costs. Any cache/resume/shard includes source/content/seed/proxy/party/horizon fingerprint and deterministic aggregation. Targeted diagnostics precede relevant final full populations. Keep assertions, seed counts, horizons and failures visible. No cached result from another build can certify the final build.
- **Cadence:** short affected checks while building; coordinated full workspace/regression/safe-gate/browser checks at stable integration; balance only for simulation-relevant changes, with final required balance on the final relevant binary. Do not overlap heavy browser/build/balance workloads. Existing two balance failures remain open.
- **Constraint:** local only, no additional cost; no fabricated speedup target. Detailed plan is PROGRAM's “Local build and validation cadence.”
- **Closeout scheduling control:** root `pnpm run test` now adds `--workspace-concurrency=1`, matching existing CI package serialization. All packages and no-bail behavior remain; no budget, timeout or assertion changed. Exact diagnosis and pending settled controls: `docs/player-rebuild/VALIDATION-SCHEDULING.md`. The original full run completed with two failing packages; preventive scheduling is implemented but not certified fixed until its current-source rerun.
- **Current control:** Vitest pools also use the existing two-worker/one-minimum bound (`099c5a6f0`). The current-source aggregate was interrupted for the requested stable handoff, without an aggregate result. Original borrowing workers were resumed at23:52:32UTC and then stopped; no suspended test workers remain. Their suspension is excluded from any speedup claim. No original timing failure is erased by this scheduling change.
- **Observed 2026-10-15 integration run:** concurrent full workspace/balance/browser validation exceeded the unchanged person-network budget (5,058.85ms vs3,000ms), while the identical isolated4-test rerun passed (budget callback1,880ms, including founding). Three direct builds preserved graph/hash output at1,395.22/1,323.34/1,470.99ms. The original cause is not proven. No assertion, seed, timeout or budget was relaxed. Overlapping these heavy jobs violated the cadence control above; do not repeat that scheduling for the final aggregate. Preserve the running jobs and distinguish their failures/results from settled-load validation.
- **Observed 2026-10-14 readiness run:** the workspace aggregate failed the graph-speed check (3,318ms against its unchanged 3,000ms bound) and the session repair case (90-second timeout). Isolated unchanged reruns passed 4/4 and 7/7 respectively; the latter case took 48,590ms. These are retained failures, not a claim of an aggregate pass. Generating every navigation fixture also includes a full two-term campaign; its setup lifetime is separate from the unchanged route-check limits. Follow-up profiling/scheduling remains here.
- **Measured 2026-10-12:** the read-only R1.1 attribution (`scripts/dev/balance-attribution.mjs`, two 208-week campaigns per seed) ran 12 seeds in 246 s wall at four processes, 0.85 to 1.09 GB resident each. Findings in `docs/audits/2026-10-11-simulation-depth/BALANCE-ATTRIBUTION-2026-10-12.md`; both balance failures stay open.

- **2026-10-13 (owner):** removal is checked over a full term (`1593ff4da`); a pace shift converts to whole days the same way in both directions, an engine fix (`90669b94f`); R1.1 runs 36 seeds per party in three files the runner executes in parallel, so the full harness took 4,480 s wall (`d43a3db4c`). H3 is the one remaining balance failure. `.github/workflows/balance-harness.yml` still times out at 60 minutes, shorter than one R1.1 file.

### BL-135 Surveillance produces useful, uncertain intelligence that can be shared

- **Status:** in progress · P1 · engine and player
- **Owner:** simulation-depth program, BL-112; access/foreign trust coordination with BL-102
- **Implemented, final proof pending:** issued findings and no-result reports, archive, dated uncertainty, per-finding recipient snapshots, additive dated receipts, a bounded economic-support consumer and a warned-recipient diplomatic-willingness consumer; foreign surveillance can obtain intelligence despite mission failure/exposure. DHS public-state OSINT has a separate lawful tasking. Blanket presidential resident surveillance now refuses because no investigative basis or process is modeled. Private domestic investigative collection and broader access auditing remain missing. Exact disclosure retries are inert; later disclosure preserves prior receipts.
- **Acceptance:** dated, persisted findings based on actual runtime evidence; confidence/gaps distinct from outcome likelihood; useful results with or without exposure and explicit no-result; domestic and foreign targets; archive survives closure and loading without inventing past knowledge; current assessment support expires; chosen recipients receive a particular report with limits and recorded consequence; sharing and retry idempotency; no omniscient unlock or fabricated personal allegation; actual desktop/phone action-to-report-to-share journey plus seeded, save/load and direct resolver tests.
- **Evidence and proof:** `docs/audits/2026-10-11-simulation-depth/INSTITUTIONS-EXECUTION.md` (working record, not complete).
- **Collection depth:** a seeded topic-interleaved pool rotates actual pursuits, force/support commitments, conditions and imposed retaliatory tariffs within discipline access. Build12 browser proof includes fresh tasking through actual Continue interruptions, a generated sourced report, separate Canada/Germany disclosure and reload at all six widths. Six additional journeys check ordinary dossier/search/graph privacy. Desktop report and actual phone lower-sheet scrolling were inspected. The raw internal support-weight percentage was replaced in later source by qualitative report confidence; its rebuilt visual proof remains pending. Broader access/save proof remains open.
- **Content checkpoint:** four independently reviewed report-bound decisions are ready locally, including a no-result case with an actual active-tasking gate. They have not been published or mounted. Report-action browser integration and broader coverage remain under verification.
- **Blocked by:** no external blocker; implementation and verification pending. Domestic legal authority expansion is part of BL-112 and must not be implied by useful information.

### BL-113 U.S. demographic cohorts: race and ethnicity, sex, nativity, disability, veteran status

- **Status:** in progress (data, schema, motivations, opening variation and channel routing landed; a dedicated disability act and a balance comparison remain)
- **Owner:** simulation-depth program, `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`; DECISIONS 5.8 amended 2026-10-11
- **Missing:** the five axes and their cells in `packages/world/src/schemas/cohort.ts`, authored per-state shares from Census counts, `COHORT_MOTIVATION` entries from material channels (beliefs centered), domestic-signature terms and act routing so each cohort is reached by a named mechanism, validator checks, screens that show an act's reach by group, and doc sync.
- **Acceptance:** each new axis sums to 1 per state; every new cohort is routed by at least one named mechanism and the audit finds no unrouted cohort; the boundary laws (lens centering, spread floor, no headline movement) hold; the balance harness is run; screens show reach by group with source and universe stated.
- **Evidence:** DECISIONS 5.8; `demos.ts` motivation table; `route-cohorts.ts`.
- **Blocked by:** nothing. Nativity, disability and veteran shares are approximations (no Census API key); replace them with ACS counts if a key is supplied.

### BL-114 Acting Secretaries are read inconsistently

- **Status:** landed, awaiting proof (uncommitted, 2026-10-11): `ministerFor`, `budgetChair` and `appropriationQuality` now read `selectChairRunner`, with a test in `department-ownership.test.ts`. Not changed: `counsel.ts` still treats an acting chair as vacant, because that decides who sits in the room and moving it changes counsel; it needs its own decision. The balance harness run is deferred to the end-of-program gate at the owner's direction.
- **Reconciled (October 18, 2026):** Status: landed 2e4925b13, balance run recorded; open only for the counsel.ts decision (acting chair counted in counsel or not). Owner decision if kept open. Checked against: commit 2e4925b13 (ancestor); stewardship.ts:116 selectChairRunner; department-ownership.test.ts:143-154; counsel.ts:367-368 and :545-546 use selectCabinetHolder; balance green in integration-2026-10-14.md.
- **Owner:** simulation-depth program, Phase C3 (`docs/audits/2026-10-11-simulation-depth/PHASE-C-TRACE.md`)
- **Missing:** `selectChairRunner` (confirmed Secretary, else acting) is read by `policy.executionQuality`, `execution.ts` and `order-review.ts`, but `ministerFor` (`stewardship.ts`) reads only the confirmed one, so an acting Secretary does not count for stewardship odds, war command, budget quality or counsel.
- **Acceptance:** one reader for who runs a department; a test that an acting Secretary counts everywhere a confirmed one does; the balance harness run, because stewardship odds and war attrition move.
- **Evidence:** PHASE-C-TRACE.md, "Acting Secretaries are read inconsistently".
- **Blocked by:** nothing.

### BL-115 Service outcomes and targets

- **Status:** open
- **Owner:** simulation-depth program, Phase C3 and Phase F
- **Missing:** nothing outside the executive screen reads a department service (claims, visas, returns, arms transfers), so a backlog moves no opinion, standing or economic figure; and no `PortfolioGoal` target type exists (GOV-06: lowering a target must leave an audit trail and not rewrite past performance), because nothing produces targets yet.
- **Acceptance:** at least one service outcome feeds a named mechanism with a perturbation test; targets exist with revision history once delegation or goals create them.
- **Evidence:** `packages/engine/src/services.ts`; PHASE-C-TRACE.md.
- **Blocked by:** the scoring decision (a service outcome moving an existing figure is a rebalance), and Phase F for delegated work.

### BL-120 People remember the President: the relationship ledger

- **Status:** in progress. Slice I1 landed uncommitted on 2026-10-11 and awaits the end-of-build gate: the `Tie` ledger on `PersonRuntime`, the `tie` effect, `HillFigure.disposition` and `PoliticalPromise` replaced, save v63, and a golden capture taken before the change that the new code matches exactly. I2 (the acts: a repeat-call cost, cross-party trade resentment, the public-appeal gate and grudge, shared credit, campaigning at home) landed uncommitted the same day; the golden capture was deliberately re-taken once, and every moved number is traced to the gate and the trade resentment. Still open: I3, grudge decay, resentment that outlasts the weekly drift, and the aisle-crossing penalty; also the primary challenge (after I3) and the recommended appointment (Phase J). Record: PROGRAM.md, "Phase I, slice I1".
- **Reconciled (October 18, 2026):** Status: in progress; I1 (1213445ca) and I2 committed; open: I3, primary challenge, recommended appointment. Checked against: 1213445ca (Tie ledger, ties.ts), 5a5366f84 (court one member at a time), both ancestors; lobbying.ts imports repeatCallPenalty/resentmentsFor; ties.ts has no decay (grep -n decay: none); no crossing penalty in congress-votes.ts.
- **Owner:** simulation-depth program, Phase I (parent BL-112)
- **Reconciled (2026-10-25, Wave 2 integration):** nothing in the merged Wave 2 lanes touched the relationship ledger beyond the Hill lane's grudge reader (already recorded above). Still open: I3, the aisle-crossing penalty, the primary challenge and the recommended appointment.
- **Extended (2026-10-24, world dynamics program, Wave 2, Hill-influence lane, Codex):** network B8. `tie.grudges` are written (`packages/engine/src/ties.ts:107`) and read by nothing, so the public-appeal grudge is cosmetic. Acceptance adds: the decayed grudge weight is charged once, in the willingness terms (`memberTerms` feeds `memberWillingness`, which feeds `successChance`, `lobbying.ts:270-284,344-353`, so adding it at two of those steps double-counts), with decay from BL-277's shared form; probe `network.probe.test.ts` 4b (ordering: five 0.2 grudges lower the minority leader's call chance) passes. Wave 0 run: 0.607 with and without.
- **Reconciled (2026-10-25, Wave 2 Hill lane, `43379d855`):** the network B8 extension's grudge reader landed: `ties.ts#personalGrudgeWeight` ages each `TieGrudge` by elapsed turn-days at the midpoint grievance half-life (819 days), and `lobbying.ts`'s disposition term deducts 0.2 × that weight (capped at 1) once, so preview and resolution read the same term; public appeals keep their constituency terms. Probe `network.probe.test.ts` 4b passes (five 0.2 grudges lower the call chance 0.607 → 0.408). Still open here: I3, the primary challenge and the recommended appointment.
- **Missing:** no person holds anything toward the President. Only `loyalty` moves (`packages/engine/src/effects.ts:411`); ties between people are derived once (`person-network.ts:287`) and change nothing; grudges exist between nations only. Courting is three lobbying plays on about eight post holders (`lobbying.ts:75-103`), remembered as `HillFigure.disposition` and `PoliticalPromise`. Polarization reaches approval but no vote.
- **Acceptance:** a directed `Tie` on `PersonRuntime` (rapport, trust, a two-way favor ledger, grudges with cause and decay) written only through `apply()`, with every change naming its cause; `HillFigure.disposition` and `PoliticalPromise` replaced, not kept alongside; the acts in the design's §2 table, each with its cost and who resents it; an aisle-crossing penalty set by polarization and the President's record with the other party; tests show a divisive President losing crossovers a bridge-builder keeps; SCHEMA, ARCHITECTURE, the consumer registry and the save version updated.
- **Evidence:** design §1 and §2, verified against source 2026-10-11.
- **Blocked by:** Phase C3 (ordering only).

### BL-121 All 535 members of Congress are people who vote

- **Status:** open
- **Owner:** simulation-depth program, Phase J (parent BL-112)
- **Implemented, final proof pending:** 535 persistent seated people, member decisions and recorded roll calls, separate Senate cloture/final passage, elections and prospective old-save migration. Dated issue outreach uses the actual calendar and shared attention budget. **Remaining:** complete procedural and matched-actor proofs, member/bloc balance and full-term performance comparison; the broader acceptance below remains open.
- **Acceptance:** a vendored per-seat party map with source and date; every seat filled from the person pool (new roles `representative` and `senator`), fictional and checked by the real-name guard; a deterministic vote per member and question from ideology distance, whip, exposure at home, the BL-120 tie, cues from the people they follow and the crossing penalty; `congress.disposition` kept as a derived reading; removal and confirmation counted by member; elections replace members; the balance harness run with the bloc counter and the member count over the same seeds, with results reported as measured; step time measured against the current p50; an older save migrates deterministically.
- **Evidence:** design §1 and §3; `packages/world/src/dataset/house-delegations.ts` (Clerk member data, 2026-09-02).
- **Blocked by:** BL-120; Phase D's caucus fix (C08 in the program record).

### BL-122 A Congress screen built from its members

- **Status:** open
- **Owner:** simulation-depth program, Phase J screens, verified in Phase H (parent BL-112)
- **Implemented, final proof pending:** searchable actual members and recorded votes, ordinary member dossiers, actionable issue outreach and public relationship scopes. Six-width member/roll-call proof passed at an earlier checkpoint; outreach authorization, reload and actual response passed at desktop. The latest issue-edge filter and broader design acceptance below still need integration proof.
- **Acceptance:** the design's §5 Congress list (seat chart with party, projected vote and tie colorings; district map; persuadables plot; whip board of faces with what holds each; factions; member file with the acts compared), composed at 390×844 and 1440×900 and checked at the other widths with a realistic fixture; a browser journey where courting a member moves their face on the whip board.
- **Evidence:** design §5.
- **Blocked by:** BL-121; BL-107 committed.

### BL-123 The courts as a process: lower courts, a case's path, vacancies

- **Status:** open
- **Reconciled (2026-10-25, Wave 2 integration):** the litigation lane (`23b0d5b7e`, merge `7c894b54a`) built the extension's L1, L2, L3 (interim and cert), L4/BR-12, X1 and C7/C8 as one exposure stream (`legal-exposure.ts`, `order-exposure.ts`, `background-docket.ts`, `court-procedure.ts` `COURT_TIMING_DAYS`); probes L1 (filing 0.587 against merits 0.31 for border controls; entry suspension 0.916 against 0.47), L2, L3 (interim relief within three weeks), L3 cert (14 weeks from circuit judgment to cert decision) and L4 (68 orders over two seeds, 24 filed against 24.6 expected, 6 docket terms, 3 consequential rulings) pass on the integrated tree. C34 is in part: a public misconduct finding becomes a referral with a dated charging decision, and a charge has no consequence yet (no criminal proceeding, no effect on the person's office). T2 is settled by BL-190's ruling (no trade exposure). At integration a removal from a contested commission seat became an exposure origin (BL-306), and `congress.ts#struckRecently` stopped counting the background docket's rulings as rulings against the President (they had cut the Hill's mood 0.05 each in the Hill golden's runs). Still open here: emergencies, directives and force at home as exposure origins of their own; doctrine voting distinct from ideology; a charge's consequence; the threshold step (decided the week before the interim ruling, so a standing dismissal can come within three weeks of filing); and the Courts screen and summons checked only through player-core unit tests (BL-124).
- **Owner:** simulation-depth program, Phase K (parent BL-112); absorbs BL-86
- **Extended (2026-10-24, world dynamics program, Wave 2, litigation lane, Opus):** law L1, L2, L3, L4, X1, C7/C8, C34 and events BR-12, as one proceeding and exposure mechanism. L1: whether a suit is filed and whether the act is lawful are one number today (`challengeChance` from overreach, `packages/engine/src/orders.ts:486-500`); separate filing (salience, injury, plaintiffs, venue) from merits. L2: `state-suits.ts:1-7` selects but produces no proceeding; generate fictional parties from injury and institutional authority (an opposition governor is not an attorney general's standing). L3: successive stages advance one turn apart (`court-procedure.ts:13-15`); separate expedited relief from merits and appeal, and set cert timing only from verified Supreme Court rules (a 90-day petition deadline is not a minimum wait). L4 and BR-12: the aggregate background docket of DECISIONS §13.12 and per-act exposure for tariffs, emergencies, removals, directives and force, each dispute linked to one origin and counted once. X1: a strike-down's cost follows the act and the remedy, not one constant (`judicial-review.ts:33`). C7/C8: separate legal grounds; an authorized act can still face a constitutional challenge; no generic ideological penalty. C34: domestic misconduct enters the same exposure stream (a scandal is not automatically an indictment). Probes `law.probe.test.ts` L2 (point: a named state plaintiff) and L3 (interim relief within 3 weeks) pass, and the L1, L3-cert and L4 `it.todo`s become assertions once their benchmarks are verified. Wave 0 run: challenge chance 0.085 to 0.594 (border controls 0.17); the border-controls proceeding names no party; interim ruling at week 6 to 7; a 197-week reckless proxy signed no order and saw 3 distinct disputes, none from a presidential act.
- **Implemented, final proof pending:** order challenges record district threshold/merits, circuit appeal and panel vote, Supreme review/merits, interim relief, recusal/quorum/tie and fixed history. District forums use sourced aggregate bench snapshots; light circuit seats become named judges when drawn onto panels, with ordinary vacancies and Senate nominations. Supreme argument/opinion timing uses an October term calendar, and Solicitor General standing affects review/stay odds. Adverse lower judgments pause prospective order operation; a separate court-controlled application can stay the judgment pending review. Statutory-authorization, final-agency-procedure and federal/state grant matters, ordinary seeded Supreme vacancies, prior-government-review recusal, remand and scoped remedies are implemented. Relative contribution lineage preserves later saturation and unrelated interventions; missing legacy or invalidated attribution stays unknown. **Remaining:** other required dispute families, broader counsel strategy across judicial families, sourced vacancy/retirement and balance checks, and complete integrated browser/full-suite proof.
- **Acceptance:** sourced and dated research first (judgeships by circuit and district with appointing party, a mortality table, strategic retirement, the current law on universal injunctions, the term calendar); circuits as light seats that become people only when drawn onto a visible panel; districts as aggregate benches; the six stages in the design's §4, each a matter with a real clock and a declared default; challenges to rules, enforcement, emergency declarations and force at home as well as orders; vacancies by age and strategic retirement; circuit nominations counted by Senate member; a Solicitor General standing that moves stay and review odds; the balance harness run.
- **Evidence:** design §1 and §4; `packages/engine/src/judiciary.ts`, `court-votes.ts`, `judicial-review.ts`.
- **Blocked by:** BL-120 (strategic retirement reads it). Senate counts by member are better after BL-121, but the process itself does not need it.

### BL-124 A Courts screen that shows how the courts operate

- **Status:** open
- **Owner:** simulation-depth program, Phase K screens, verified in Phase H (parent BL-112)
- **Implemented, final proof pending:** case files expose recorded stages, parties, legal facts, remedies, district forum and circuit panel/votes, quorum and completed votes; ordinary vacancy nomination/seating and statutory-case journeys passed across six widths. The Courts screen now has a circuit map and bench mix, a stage-count pipeline, justice agreement, scheduled-term dates and Solicitor General standing. District forums appear in case files as aggregate sourced snapshots. The new overview/Washington views passed 36 browser checks and stay/calendar/circuit-vacancy paths passed 24 at six widths; four focused phone/desktop detail captures were inspected. Broader cross-family process and final integration remain open.
- **Acceptance:** the design's §5 Courts list (circuit map with live cases pinned, case pipeline with counts per stage, bench spread, justice agreement with age and tenure, term calendar, vacancies and nominations with a member-by-member Senate projection, the Solicitor General's standing), composed at both sizes and checked at the other widths; a browser journey taking a case from filing to a decision.
- **Evidence:** design §5.
- **Blocked by:** BL-123; BL-107 committed.

### BL-125 The demographic model had no screen

- **Status:** landed, awaiting proof (uncommitted, 2026-10-11)
- **Reconciled (October 18, 2026):** Status: landed (first in 1213445ca-era wiring, rebuilt in apps/player ed0cadd4f); Missing: ReachBars on bill acts; six-width check on apps/player. Checked against: apps/player/app/(game)/nation/electorate.tsx; apps/player/src/nation/state/{People,Demographics}.tsx (DemographicProfile); nation/policy/OrderScreen.tsx (ReachBars, reachLines); player-core electorate/electorate.ts uses opinionTrends; ReachBars absent from apps/player/src/congress (grep).
- **Owner:** simulation-depth program (parent BL-112)
- **Missing:** the owner could not find the demographic data anywhere. Verified: `crosstabs()` and `mostImportantProblem()` in player-core had no screen consumer, an act's reach by group was collapsed into one sentence of at most four names, and no screen showed a state's composition.
- **Done:** `/nation/electorate` (Public opinion: topline with error band, six judgments with weights, ranked problems, coalitions; ten crosstab cuts on one shared axis with each group's share; what each group remembers; a state tile map with each state's demographic profile); `electorateView`, `stateDemographics`, `rankedProblems`, `OrderDesk.reachLines`, with tests; `DemographicProfile` and `ReachBars` components.
- **Acceptance:** the screen reachable from navigation; `DemographicProfile` mounted on the state screen and `ReachBars` on the order desk and bill acts; checked at six widths; trends drawn once BL-127 lands.
- **Evidence:** `apps/web/src/nation/electorate/`, `packages/player-core/src/electorate/`.
- **Blocked by:** the wiring pass (navigation, mounts).

### BL-126 Modeling workbench: project a choice's alternatives before deciding

- **Redirected (owner, 2026-10-11):** no separate modeling screen. The standalone `/brief/model` page and its navigation entry are being retired, and projection is embedded in each screen's own data interface: a projection slot in the shared results list (decisions and every other choice whose alternatives player-core can build), the order desk, and the budget sliders (the draft against the book in force). The engine half below stands. Landed the same day (uncommitted): `/brief/model`, the workbench page, `ModelIt`, the nav row and `place.model` removed; `ChoiceList`/`CompareAuthorize` take a `projection` slot (an on-demand 4/13/26/52-week control, a per-row projected approval change with run range and path, and small multiples, moves and groups under the picked row); wired on the scenario decision, the order desk and the budget (the draft against the book in force, rerun 0.7 s after a slider stops). Not wired yet, because player-core does not build their alternatives from the same call the commit uses: instrument acts, congress acts, chair acts (`PricedCompare`), economy levers, oversight, nominations, scandal, God Mode, the state's locale acts. Known defect: a flat series repeats its axis ticks (Military Readiness reads 72%, 72%, 71%).

- **Status:** landed, awaiting proof (uncommitted, 2026-10-11). `/brief/model`: `packages/engine/src/modeling-projection.ts` (per-run derived seeds, never the live one; alternatives in a run share it), player-core `modeling/`, a worker pool with progressive first paint. Proven: the live save is byte-identical before and after; same inputs give a deep-equal projection; partial views pair only runs every alternative finished. Browser timings on the dev server: a four-reply decision at 13 weeks paints in about 5 s and finishes in about 10 s; an order at 52 weeks in about 8 s and 16 to 18 s. Not done: the production worker bundle and Electron's module-worker scheme, statehood, war and nominee choices, multi-line budget changes, the four other widths, and the entry point on the decision screen (the order desk has it).
- **Reconciled (October 18, 2026):** Status: landed 3b2f0c529, awaiting wider proof; open: production worker bundle and Electron module-worker, statehood/war/nominee and multi-line budget choices, widths; perf under BL-168. Checked against: 3b2f0c529 (modeling-projection.ts, projection-belief.ts); packages/player-core/src/modeling/*; apps/player/src/decision/projection/ChoiceProjection.tsx, nation/policy/OrderScreen.tsx, courts/CaseScreen.tsx.
- **Owner:** simulation-depth program, requirement 8, pulled forward from Phase F at the owner's direction (parent BL-112)
- **Missing:** an analytical President cannot see where a choice's alternatives lead before committing.
- **Acceptance:** each alternative projected N weeks on a detached copy through the real engine rules with a small keyed seed ensemble (median and band); the live campaign provably unchanged; same inputs give the same projection; small-multiple charts and horizon deltas per metric and group; an entry point mounted on decision and order screens; perf measured.
- **Evidence:** `packages/engine/src/projection*.ts`, `packages/player-core/src/modeling/`, `apps/web/src/modeling/`.
- **Blocked by:** nothing.

### BL-130 Doors that lead nowhere or to the wrong place

- **Status:** landed, awaiting proof (uncommitted, 2026-10-11). Seventeen door kinds that landed on a front page or a dead route now open their own office (with `#office-actions`), case, treaty, War Powers paper, approval reading, incident or markets view (`packages/player-core/src/shell/office-of.ts`, the desk and summons producers). `shell/doors.test.ts` holds every matter, row, counsel and clock door on all 51 fixtures to a real route that resolves its subject and never a mode's front page. `scripts/dev/crawl-doors.mjs` followed 303 doors on six fixtures with 0 failures. Disabled controls now name their reason (`TimeControls`, the shared authorize button). Later the same day: declaration renewal opens `/nation/emergency?declaration=<id>` and each data release opens its measure (`?measure=`), both held by `doors.test.ts`. `crawl-doors.mjs --press` now presses every control in a throwaway profile; a partial run (stopped at the owner's direction, no long runs mid-build) found 29 failures on engagement-week (digest 13, Record selects 9, settings, `?judge=`, one relief clock) and 1 on week-30 (`/nation/state/AL`), none fixed yet, plus unconfirmed ones on the budget's disabled snap, the decision's "Principled" authorize, and command posture. Next: run `node scripts/dev/crawl-doors.mjs --press --fixtures engagement-week,treaty-pending,removal-open,court-challenge` (about 15 minutes) at the end-of-build gate and fix from its table.
- **Reconciled (October 18, 2026):** Status: doors landed (0387af24f, 3a1574bd5); open: re-run crawl-doors.mjs --press against apps/player and fix the failures it lists. Checked against: commits 0387af24f, 3a1574bd5, 4d72fcae9 (ancestors); packages/player-core/src/shell/doors.test.ts; scripts/dev/crawl-doors.mjs exists.
- **Owner:** visual pass 2 (parent BL-107)
- **Missing:** the owner pressed "Open it" on a Secretary's proposal on the Brief and did not reach the proposal. Verified: `ministerInitiativeItem` (`packages/player-core/src/desk/attention-cabinet.ts:75`) sends it to the generic Washington page, not the office that answers it, and several other matter producers use the same generic door (`place.washington()`, `place.courts()`, `place.press()`, and `place.brief()` from the Brief itself).
- **Acceptance:** every door a player can press resolves to a route that exists and presents that specific subject (deep-linked where the page holds many); no handler that does nothing; no page without a way onward; a player-core test that every attention kind resolves to a real route naming its subject; `scripts/dev/crawl-doors.mjs` run over the fixtures with no failures.
- **Evidence:** the owner's screenshot, 2026-10-11; the lines above.
- **Blocked by:** nothing.

### BL-132 Composed news prose that says nothing, or says it wrong

- **Status:** composer pass landed, awaiting proof (uncommitted, 2026-10-11). Every bank line now needs its particular or prints nothing; figures print only with a label; foreign conditions get `article-condition.ts`; extent words sized by population (`scopePhrase`); outlet sourcing lines only over the administration's own act. Over 15,634 sampled stories, unlabeled figures, invented sourcing, contradictions, mood lines, bad slot fills and US-stake lines went from thousands to 0; extent words remain only in headlines already stored in saves. `article-coherence.test.ts` guards the checkable classes and 70 retired phrases and pins the Barbados piece. Also landed: impact headlines (no stray stops or raw ids), the fold headline, pursuit headlines, recession wording, and "why it matters" naming a real US tie or dropped (was empty filler on 3,060 stories). Remaining: leadership-change headlines in `foreign-politics.ts` (the coherence test skips them); whether recessions and price shocks may be city-scoped at all (a balance decision, `scopeFor` in `condition-onset.ts`); headlines already in saves keep old wording; a fresh full re-sample; an independent content review in a session that did not write it.
- **Reconciled (October 18, 2026):** Status: composer pass landed 053e02525; open: leadership-change headlines, city-scoped recession balance call, fresh sample, independent review. Checked against: 053e02525 (ancestor); packages/engine/src/article-coherence.test.ts, article-condition.ts; condition-onset.ts:609 scopeFor still decides scope.
- **Owner:** content (engine article composer)
- **Missing:** the owner found a world-feed story that made no sense: "Barbados is struck by civil unrest across a region", "The number attached to this is 1", "Confirmed by two officials; the administration has not commented" on a story about another country, and mood lines with nothing behind them. The composer stitches bank lines into slots without checking that each line has a particular to carry (`packages/engine/src/article.ts` ~179, ~244, ~509, ~663; `condition-impacts.ts:314`). That breaks NORTH_STAR §6.
- **Acceptance:** a sampling harness over fixtures, seeds and every article kind; defect counts before and after against a stated taxonomy (unlabeled figures, scope words that don't fit the place, sourcing claims without basis, headline-deck-body contradictions, mood with no particular, bad slot grammar, overused tells, US-stake lines without a stake); lines gated on the particulars they need; a test that fails on the mechanically checkable defects; an independent content review of a fresh sample.
- **Evidence:** the owner's screenshot, 2026-10-11.
- **Blocked by:** nothing.

### BL-134 Projections as staff forecasts

- **Status:** landed, awaiting proof (uncommitted, 2026-10-11). Projections start from a believed copy on their own key: an unread government is an independent draw from its public trait profile (a test proves a hidden hostile agenda yields identical paths), a read one keeps its traits with an analyst's error, the home economy uses the last published figures, the six judgments carry polling error; God Mode alone projects from the truth. Every error scales with the responsible adviser's competence (an empty chair is its career staff at 0.35); on four founded campaigns the 4-week approval band runs about 0.019 to 0.024 with the weakest staff and 0.008 to 0.016 with the strongest. Each forecast names its adviser and confidence. An authorized option's forecast is filed on the Record; `adviserTrackRecords` summarizes how often each adviser's range held. Save version 62. No adviser bias applied (no existing trait describes it). Remaining: draw the track record on the person dossier. Every choice screen except God Mode now carries the projection slot (God Mode changes no world state, so both paths would match).
- **Reconciled (October 18, 2026):** Status: landed 3b2f0c529; Missing: adviser track record on the person dossier in apps/player. Checked against: 3b2f0c529; packages/engine/src/projection-belief.test.ts:42,59,68,95; player-core modeling/forecast.ts.
- **Owner:** simulation-depth program (parent BL-126)
- **Missing:** projections run on copies of the true campaign, so in normal play they leak hidden agendas, unread nations, uncaught covert activity and true figures, and they are as good under a weak staff as a strong one.
- **Acceptance:** projection starts from a believed copy (assessment where intelligence reads, plausible draws where it does not), keyed and deterministic; band width set by the responsible adviser's competence and intelligence coverage, and any bias a known trait of that adviser, said in their dossier; every forecast labeled with source and confidence; the Record keeps forecast against outcome per adviser; God Mode projects from the truth; tests that a hidden agenda cannot be read off the ensemble, that a stronger adviser narrows the band, and that the live campaign is untouched.
- **Evidence:** the owner's question and decision, 2026-10-11.
- **Blocked by:** the projection wiring in progress on BL-126.

### BL-139 Player text, drawn help and the Handbook

- **Status:** in progress · P1 · simulation-depth program
- **Reconciled (October 18, 2026):** Status: in progress; retarget help/Handbook checks (320px, light theme, ExplainerNote placement) to apps/player; open: independent review of the sweep, corpus/news banks. Checked against: `node scripts/verify-player-prose.mjs` exit 0 (184 findings, within baseline); apps/player/app/(game)/handbook/*; packages/ui/src/handbook/ExplainerBody.tsx, GlossaryCard.tsx; commits 03a82cadf, 35fc8bd2e.
- **Owner:** this session (2026-10-12)
- **Found:** owner review 2026-10-12. Player copy read as written by a model: insider words leaked from the writers' room ("the room" in counsel, the press office, the receipt and the glossary), em dashes and clause-joining colons, metaphors standing in for mechanics. Help existed as data (104 glossary entries, 35 explainers; 25 with cast and influence links, 10 with thresholds) but `apps/web/src/shell/ExplainerNote.tsx` printed text only and drew none of it. No handbook explained the game end to end.
- **Done:** the rule (`docs/CONTENT_DOCTRINE.md` §10.2); the gate `scripts/verify-player-prose.mjs` with its proof and ratchet baseline `scripts/baselines/player-prose.json` (202 findings at first count, 8 after the sweep, all in families not yet redesigned); the owner-approved pilot (counsel lines, press office, receipt, Courts screens; "the room" gone from player text); the sweep over player-core's composed lines, the glossary, `packages/ui-web`, the web shell, shared screens and the Congress overview; glossary screen references renamed to the navigation's names; the covert-finding entry no longer promises a 48-hour deadline the engine does not enforce. The drawn help renderer (`apps/web/src/help/`): `ExplainerView` draws cast, step track with exits, threshold bars, influence rows and worked examples; `ExplainerNote` opens it in the side sheet; `GlossaryTip` opens `GlossaryCard`; `/dev/help` shows all 35 explainers and 104 terms. Checked on the Congress page with a fixture save at 1024 and 375 wide, in dark and light themes.
- **Done (Handbook):** `/handbook`, `/handbook/:chapter` and `/handbook/terms` (`apps/web/src/handbook/`), built from `packages/player-core/src/glossary/handbook.ts`: twelve chapters that between them teach all 35 explainers (held by `handbook.test.ts`), each with what it lets you do, its terms and doors to its screens; every term A to Z with a filter. In the utilities beside Settings, in search, and as "Read the chapter" in every explainer sheet. Works without a loaded campaign. Seen at 1440 dark (contents, chapter, filtered terms); the building agent checked 1440, 390 and 320 for overflow. `docs/DESIGN.md` names it under "Outside the modes."
- **Missing:** the help sheet and the Handbook at 320 inspected by eye, and the Handbook in light theme; `ExplainerNote` placed on more screens (BL-99); screen text in families not yet redesigned (Brief, Nation, World, Record, founding, the bill page), which meet §10.2 and the gate when rebuilt; the authored corpus and news banks (a separate writers'-room batch under §10.2 and §10); an independent review read of the sweep. Lines the sweep left because their meaning or mechanic is unverified: "Counsel will paper it" and "has paper behind it" (`security/covert-reading.ts`, pinned with `FindingActs.tsx` and `world-security.spec.ts`), "Keep the book" (`modeling/choices.ts` with `nation/budget/Request.tsx`), "every week past that costs more than the last" (`congress/congress-acts.ts`, `congress-reading.ts`; no escalating cost found in the engine), "A war nobody at home wants ends regardless of the map" (`world/board-state.ts`), "The desk takes no new decision until next week" (`conversation/scenario-dispositions.ts`), "Answered where it lives" and "The case registry follows the desk" (`desk/family-cases.ts`), "A document that came up with the silence waits for its next call" (`campaign/store.ts`), "The body runs at its worst until somebody does" (`cabinet/shortlist.ts`), "Unread: the services have no read on their view" (`map/lenses/nation-lenses.ts`), "Nothing moves a twentieth of a point" (`modeling/ChoiceProjection.tsx`).
- **Acceptance:** the gate passes with its baseline shrunk to what remains in families not yet redesigned; every explainer's cast, steps, thresholds, links and examples draw in the help inspector at 390 and 1440 in both themes; the Handbook reaches every glossary term and explainer; a reader who did not write the copy signs off a sample.
- **Blocked by:** nothing.

### BL-140 Notifications tied to the section that shows them, cleared once seen

- **Status:** in progress · P1 · simulation-depth program
- **Reconciled (October 18, 2026):** Status: in progress; anchors done (4d72fcae9); Missing: seen ledger, red-to-quiet badges and arrival light in apps/player. Checked against: `node scripts/verify-attention-anchors.mjs` exit 0 ("31 anchor(s)... drawn as an id in the web player"; scripts/verify-attention-anchors.mjs:31 scans apps/player, apps/player/app, packages/ui); grep seen-store|AttentionWatch|WaitingHere in apps/player, packages/ui, player-core: no match.
- **Owner:** this session (2026-10-12)
- **Found:** owner review 2026-10-12. A nav badge counted Desk matters and standing work by destination but led only to the page, never to the part of it that showed the item, and it stayed red until the work was done, so a badge could not say what was new. One notification link (`#state-governor`) named a section no page draws.
- **Decision (owner, 2026-10-12):** seen clears the alert, work stays marked. Red for unseen; a quiet count for seen and still waiting; new again when its deadline or urgency changes. Nothing with a deadline disappears because it was glanced at.
- **Done:** `apps/web/src/shell/attention/` (`marks.ts` counts and versions, `seen-store.ts` per-seed seen ledger in browser storage, `AttentionWatch.tsx` dwell-to-seen, "New" markers and the arrival light); `standing-attention.ts` returns marks with sections; `WaitingHere` lists everything a destination's badge counts with links to sections; nav items lead to it while anything is new; ui-web `SideNav` draws red and quiet counts and says both to a screen reader; the Brief's rows and lead card count as seen targets. Tests: `marks.test.ts` (7), `AttentionWatch.test.tsx` (3, dwell, glance, seen), `modes.test.ts`, the SideNav case in `primitives.test.tsx`. Seen in the browser on Policy: badge to hub, arrival light, row to the Orders tab's order board, red to quiet after viewing.
- **Done (anchors):** every Desk matter source links to the section that shows it through `anchored()` in `packages/player-core/src/navigation/places.ts` (29 anchors; the dead `#state-governor` now has its section). A nomination now leads to the nominee, where withdrawal lives; a national condition goes straight to the Nation states view instead of through a redirect that dropped the hash. `scripts/verify-attention-anchors.mjs` and its proof refuse a link whose `#id` no web page draws; the one template-built anchor (`measure-…`) is skipped and was checked by hand. Tests: `desk/attention-anchors.test.ts` and the updated href pins.
- **Residual:** `#war-join` draws only while the United States is outside the war; the AUMF link's `#war-powers` draws on a country page only when a report is owed; removal pressure is anchored to the approval topline on Nation because the pressure itself is drawn on the Brief; several ids sit on the section heading because `aria-labelledby` already used them, so the "New" marker draws on the heading.
- **Missing:** the dwell check by eye on a visible tab across the other destinations, phone width, and both themes for the "New" marker and the quiet badge; e2e coverage once BL-138's specs are rebuilt.
- **Acceptance:** every nav badge's items are listed on its destination with a link that lands on the section showing each; that section is lit on arrival and marked until seen; the badge turns quiet once each has been on screen and red again when one changes; no notification link names a section that does not exist (the gate).
- **Blocked by:** nothing.

## Landed engine work awaiting proof

The previous presidency-depth program landed this engine, content and player-core work in its W5 and W6 sessions, but no proof run exists on any of it: every test, balance and browser run was deferred to one owner test pass that never ran. The screens these items had are deleted (W0); where an item still has a screen clause, it names the map-first wave that rebuilds that screen. What is left to prove is the engine: `pnpm -r --no-bail run test` and `pnpm --filter @admin/engine run test:balance`, first run at W1's engine gate. The likely reds are BL-20 (unit failures) and BL-21 (balance). The wave briefs, notes, decisions and gate records these items cite (the W4, W5 and W6 briefs, `gates/w4.md`, `gates/w5.md`) were deleted with the old audits in `1211e624e`; read them from `1211e624e^` when a detail is needed.

### `admin-owca.6.10` W5 first task: land W4's carry-overs, then turn the reds green

- **Status:** landed, awaiting proof · P0 · task
- **Reconciled (October 18, 2026):** Status: landed, awaiting proof. I21, I22 and I24 hold in tests (`85e25c1db`: `signing-window.test.ts`, `house-seats.test.ts`, `cabinet-transition.test.ts`) and the unit suite and balance are recorded green in `docs/audits/2026-10-11-simulation-depth/gates/integration-2026-10-14.md`. Missing: a test that holds I23 (one matter per relief request); none was found in `packages/engine/src`.
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** The carry-overs landed in `85e25c1db`. What remains is to confirm I21-I24 against source and by test. The two Playwright reds it carried out of W4 were in the suite W0 deleted.
- **Acceptance:** I21 (the signing clock counts from presentment, Sundays excepted), I22 (House delegations come from the real 119th Congress roster), I23 (one matter per relief request) and I24 (cabinet departures run 2 to 8 a term, ordinary exits announced) each hold in source and in a test that exercises them. The unit suite and the three-party balance are green on one commit.
- **Evidence:** `85e25c1db` (I19-I24, `press.scandalResponses`, the `/world` hover on a cached rect, the forces spec's locator, the FiscalPriceRow copy); the W4 gate record's carry-over list.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description (residual).** W4 closed on 2026-09-28 with work stopped mid-flight, and its carry-overs (the I19 CBO spend-out and I20 performance patch, I24 from the in-flight patches, I21-I23 from the partial patch, the `/world` axe role, 4I.1 AC6's 56 ms pointer event, six Playwright reds, 4E.2's `press.scandalResponses` field and the FiscalPriceRow copy) were handed to W5 as its first task. All of them landed in `85e25c1db`. Three of the patches had never been gated in their worktrees (I21-I23 and I24), so their acceptance has to be confirmed against source rather than assumed from the commit.

**Notes.** 2026-09-29 W5 session: code complete, not closed. Landed `85e25c1db` (I19-I24, scandalResponses, the hover, the forces spec, FiscalPriceRow). Static checks (build, typecheck, lint) were green on the built commits; tests and balance were never run. Close on a green unit and balance run.

### `admin-owca.6.1` W5 5A: NPC agency

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, proof recorded 2026-10-14; Missing: pattern-break counter-play, to be split into its own item then close this one. Checked against: npc-world.probe.test.ts:353,363,370 (no intra-union tariffs, calls/summits, India-Pakistan adverse); grep -i "pattern.break|patternBreak" over packages: no match, revealed-preference.ts has no premium/reset; presidencyExposure in npc-agent.ts:458 delivers the standing half of zp6.17.
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** the proof run. Not built: `admin-llf`'s pattern-break counter-play.
- **Acceptance:** the 5A acceptance in the W5 brief (an idle 52 weeks shows no intra-union tariffs, calls and summits on the wire, and India and Pakistan adverse), green in the proof run. The pattern-break counter-play is either built or split into its own item.
- **Evidence:** `468364952` (5A), wired `b541ae012`, review fixes `1f02b5dd4` (the RUS→SVK edge crash), the President's engagement acts mounted in `f6d67a7f2`. Baseline reds in its files: `npc-agent.test.ts` (8), `blocs.test.ts` (1), see BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W5 brief's 5A. The world takes the player's measure; a presidency on the brink is a cheaper target abroad.

**Notes.** 2026-09-29 W5 session: code complete, not closed. 5A landed `468364952`; wired `b541ae012`; review fixes `1f02b5dd4`; the President's engagement acts mounted `f6d67a7f2`. `admin-llf`'s pattern-break counter-play is not built. The old tracker said WLD-20 folded into 5E, but 5A built it (decisions Q5). Static checks were green on the built commits; tests and balance were never run.

**Folded scope** (closed into this item on 2026-09-28):
- `admin-llf` engine.revealed-preference. Derive a per-campaign profile of how the President behaves under pressure (concedes, escalates when tested, honors friends) from the flags and ledger the engine already keeps, recomputed and never stored. NPC agents price probes by it (opportunists probe a government that pays more cheaply; vengeful states move earlier on one that abandons allies), and intelligence lets the player read that their measure has been taken. A pattern-breaking reply costs more this turn but resets the world's pricing. Acceptance: the profile derives purely from the record; NPC probe frequency measurably responds; the player can see it in intelligence; the pattern-break premium is asserted in the balance harness. Its source proposal was never accepted and was deleted in W0; the profile itself is built (`docs/DECISIONS.md` §1.10), and only the pattern-break counter-play is owed.
- `admin-zp6.17` regime.reaches-npc-agent. Fold the presidency's standing (and, as first filed, the regime level) into NPC probe pricing so a presidency on the brink is a cheaper target abroad. As of 2026-09-27, `probePricingMultiplier` (`revealed-preference.ts:228`) read only the revealed-preference profile and the counterpart's traits, called from `npc-agent.ts:421`. The 2026-09-23 reconciliation moved the standing term to 5A and recorded the regime half as superseded by the program register's decision D57 (the register was deleted in `1211e624e`). Check which half 5A delivered.

### `admin-owca.6.2` W5 5B: foreign politics and press

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, proof recorded; Missing: confirm a death-hazard test and the 5J cap, then close. Checked against: packages/engine/src/foreign-politics.ts:456 deathInOffice (f16533e4f); foreign-politics.test.ts:49,103,129; press-foreign.test.ts:66 echo; suite green per integration-2026-10-14.md.
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** the proof run. Not built: a foreign leader's death hazard.
- **Acceptance:** 5B's acceptance (real election calendars over 208 weeks) and 5J's (state media echoes its government, and the term is capped), green in the proof run.
- **Evidence:** `f16533e4f` (5B), wired `b541ae012`, review fixes `1f02b5dd4` (succession seating, month precision in "in office since", the v53 election burst).
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W5 brief's 5B (with 5J).

**Notes.** 2026-09-29 W5 session: code complete, not closed. 5B landed `f16533e4f`; wired `b541ae012`; review fixes `1f02b5dd4`. No foreign death hazard. Static checks were green on the built commits; tests and balance were never run.

### `admin-owca.6.3` W5 5C.1: alliance decisions

- **Status:** landed, awaiting proof · P1 · task
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** the proof run; the SEC-28 battery (AC1, AC2) was never measured.
- **Acceptance:** what a compact binds is enforced, not metadata; victory moves standing and NATO answers [test]; the SEC-28 battery measured; green in the proof run.
- **Evidence:** `65dea175d` (5C.1), wired `b541ae012` (H1, H2), review fixes `1f02b5dd4` (fogged forecasts, commitment release); "Leave the war" and "Call on allies" mounted in `f6d67a7f2`. Baseline reds: `customs-union.test.ts` (1), `war-party.test.ts` (2), see BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W5 brief's 5C.1. What a compact binds is enforced, not metadata.

**Notes.** 2026-09-29 W5 session: code complete, not closed. 5C.1 landed `65dea175d`; wired `b541ae012` (H1, H2); review fixes `1f02b5dd4`; Leave the war and Call on allies mounted `f6d67a7f2`. SEC-28 battery (AC1, AC2) unmeasured. Static checks were green on the built commits; tests and balance were never run.

**Folded scope** (closed into this item on 2026-09-28):
- `admin-esfw` world.compact-obligations. Defense compacts were mechanical (an attack on a treaty ally opens a call on the President; silence past three weeks costs trust and alignment with every member; an act at rung two or above answers it), but economic and political compacts bound nothing, and `compactKind` had no caller. Give each family its own obligation shape (a common external tariff for a customs union, a shared table position for a political compact), never the mutual-defense mechanic, with mechanical readers and durable cases.

### `admin-owca.6.4` W5 5C.2: war outcomes and the opening board

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, suite green; Missing: a harness measuring war length against the owner's band (D14 chosen from sources, unmeasured). Checked against: opening-world.test.ts, war-outcomes.test.ts exist; grep war duration in engine tests/balance files finds none; integration-2026-10-14.md balance 138/0.
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** the proof run. D14's war durations were chosen from sources, not measured.
- **Acceptance:** wars last inside the owner's band [harness]; the opening wars and posture are visible on the World map (screen: W7, BL-73); D3 and D14 at their recorded defaults; green in the proof run.
- **Evidence:** `b28fed637` (5C.2), wired `b541ae012` (I1, I6, I7), review fixes `1f02b5dd4` (aftermath after the final week, one restock path). Baseline red: `opening-world.test.ts` (1), see BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W5 brief's 5C.2, D3 and D14 at their recorded defaults.

**Notes.** 2026-09-29 W5 session: code complete, not closed. 5C.2 landed `b28fed637`; wired `b541ae012`; review fixes `1f02b5dd4`. D14 durations chosen from sources, not measured. Static checks were green on the built commits; tests and balance were never run.

### `admin-owca.6.6` W5 5E: markets and the household bill (the one commodity implementation)

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, suite and balance green; Missing: OD-E2 table sourced or cut, 208-week commodity no-oscillation check; remove the Fed double-file sentence. Checked against: monetary-acts.test.ts:113 "files one meeting per date" (e05c778a8); economy-records.ts:53 withPublicDebtRebase is US-only; economy-balance.test.ts:394 "oscillating" is a play-style case, not price oscillation.
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** the proof run, the full-term balance and the 208-week no-oscillation harness. OD-E2's debt-rebase table is empty because no IMF figure was opened. The opening board files two Fed meetings on 2029-01-18 (the reading dedupes them; the engine writer does not).
- **Acceptance:** a Gulf war lifts crude, then the pump price 2-5 turns later; a market crash stops Continue; releases arrive on their dates (screens: W4 Brief and W5 Nation economy, BL-70 and BL-71); approval names gasoline after a pump shock; the full-term balance holds; the Fed calendar files one meeting per date; the OD-E2 table is sourced or the row is cut with a reason.
- **Evidence:** `54b28587d` (5E: eleven commodities, the kernel, shocks, pump and grocery and power bills, SPR and fuel-waiver levers, the Fed on its dates, `commodity-hormuz.test.ts`); wired `b541ae012`; review P2s `1f02b5dd4`; economy recomposed `f6d67a7f2` (a deleted screen); the W5 5E notes. Baseline reds in its area: `economic-releases.test.ts` (2), `opinion-war.test.ts` (1), `tariff-prices.test.ts` (2), player-core `economy/markets.test.ts` (1), `desk/opinion-causes.test.ts` (2), see BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W5 brief's 5E, absorbing the commodity spine as acceptance criteria (the causal-edge registry around it was cut; `docs/DECISIONS.md` §1.9): a commodity registry, country exposure from the W5 data tables, a simple market kernel (supply, demand, inventory, price), chokepoint, war and sanction shocks, pump and grocery pass-through, SPR and relief levers, the Hormuz worked proof, a full-term balance check, and the vitals coupling closed first. Iran answers through missile and proxy reach. The sparse input-output network is cut.

**Notes.** 2026-09-29 W5 session: code complete, not closed. 5E landed `54b28587d`; wired `b541ae012`; review P2s `1f02b5dd4`; economy recomposed `f6d67a7f2`. OD-E2 rebase table empty (no IMF source opened). Fed meeting double-filed at 2029-01-18 by the engine writer. Static checks were green on the built commits; tests and balance were never run.

2026-10-08: checked against source. 5E delivered the spine (registry, kernel, shocks, lagged pass-through, levers, Hormuz test); the 5E notes record exposure as the dataset's energy balance plus the producer and exporter table, with no per-country authored profiles. What remains of the spine is this item's balance run and the OD-E2 table.

**Folded scope** (closed into this item on 2026-09-28):
- `admin-k5j.8.10` sim.commodity-transmission. A bounded physical commodity spine from production, consumption, inventory, routes, conflict, sanctions and policy to world prices and availability, then to each country's macro, fiscal, sector, household and political consequences. Acceptance: the Hormuz, staple-food, gas-fertilizer and critical-mineral worked proofs pass end to end; the commodities are chosen on evidence; full terms stay bounded, performant, strategically plural and causally explainable.
- `admin-k5j.8.10.1` research and inclusion. Judge crude, refined fuels, gas and LNG, coal, uranium, the grains, fertilizer, copper, aluminum, iron and steel feedstock, lithium, nickel and rare earths on household transmission, country exposure, strategic bottleneck and decision value. Acceptance: a committed inclusion and rejection matrix, a source ledger and parameter bands; every included commodity has a distinct mechanism and a decision.
- `admin-k5j.8.10.2` registry and schema. Commodity ids and definitions, market-region, chokepoint and transport mappings, units, storage, substitution and calibration references, kept apart from the sector and tariff taxonomies. Acceptance: the validator rejects unknown or duplicate ids, invalid mappings, missing units, sources or icons, and impossible market shapes.
- `admin-k5j.8.10.3` country exposure. Production capacity, normal consumption, import direction, source concentration, reserves, pass-through and route exposure. Acceptance: exporters and importers differ materially, low-exposure countries do not pay full runtime and save cost, and the US and the worked-case countries reproduce source ranges.
- `admin-k5j.8.10.4` market kernel. Supply, demand, inventory cover, spare capacity, route availability, risk premium and a deterministic partial price adjustment. Acceptance: the same seed, state and shocks reproduce; the inventory identity balances; equilibrium is stable without freezing the shock response.
- `admin-k5j.8.10.5` routes and shocks. Shared chokepoint state and typed shock producers (capacity loss, route restriction, harvest, export ban, sanctions, demand shift, processing bottleneck, reserve release). Acceptance: a shock moves only the affected markets and countries; recovery is deterministic.
- `admin-k5j.8.10.6` domestic transmission. Landed and consumer prices by exposure, route cost, trade policy, taxes, reserves and category lag. Acceptance: household, input and fiscal contributions reconcile; the one-writer and no-double-billing gates pass; commodity moves reach readings and cases after honest lags.
- `admin-k5j.8.10.8` presidential levers. Reserve release and build, tax and fee waivers, relief, procurement, route security, sanctions and export controls, appropriations and long-lag investment. Acceptance: missing authority is visible; a valid act moves a registered mechanism and leaves a causal record; no lever writes GDP, a price or approval directly. 5E built the SPR and the fuel waiver.
- `admin-k5j.8.10.12` worked proofs. Deterministic end-to-end fixtures for the four chains. Acceptance: all four pass with bounded values; removing a required edge or adding a duplicate charge fails. 5E wrote the Hormuz test and a three-edge chain test (gas to nitrogen, nitrogen to wheat and corn, potash to soybeans); check the staple and critical-mineral proofs.
- `admin-k5j.8.10.13` full-term balance and performance. No permanent shortage, runaway price or single dominant reserve or subsidy strategy; bounded case frequency; save and turn budgets hold. Deferred to the proof run (5E notes, item 14).
- `admin-k5j.8.10.14` doc sync and calibration ledger. Schema, architecture, doctrine, metric definitions and the calibration ledger match the commodity system; every coefficient traces to a source or a labeled prior.
- `admin-k5j.8.9` vitals convergence. The vitals (business cycle, population, GDP, debt and cost identities, coupling, gameplay reach, multi-era balance) had to close on current code before commodity pass-through. The coupling's money edge never did: see BL-1.
- `admin-bmj` engine.trade-shocks. A war or a closed chokepoint has to move trade: as filed, `tradeDependence` was computed at founding and frozen. Economic rungs 3-5, conflicts and chokepoint closures move trade stats over turns, and conditions such as famine feed back. Its anchors predate the web port; re-check against source.
- `admin-hijs` engine.missile-and-proxy-reach. Iran could answer a strike on its nuclear sites only through an asset freeze, because a strike read air branch strength and proxies needed a shared border or a base. Built: the missile half landed in 5A (`468364952`, `packages/engine/src/missile-reach.ts`, one sourced operational range per government); the proxy half already existed as `proxyReach` in `standoff-strike.ts`. See "Re-verify against source".

### `admin-owca.6.8` W5 5K: the election finale, turnout and coattails

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, proof recorded; Missing: governor agendas and AG suits, to be built or split out. Checked against: engine/src/state-suits.ts header: "standing condition, not evidence of a filed lawsuit... Nothing is written"; grep agenda in governors.ts: none; turnout.ts, momentum.ts, finale.test.ts exist.
- **Owner:** engine, landed in the previous program's W5 (parent `admin-owca.6`)
- **Missing:** the proof run. POL-22 is partial: governor agendas and attorney-general suits are not built.
- **Acceptance:** one turnout channel; turnout follows alignment and grievance; the President's standing lifts or sinks the ticket; recent shocks swing the map; a named opponent with a margin band; governor agendas and AG suits built or split out; green in the proof run.
- **Evidence:** `ec9aba79f` (5K); opponent frozen at the seal and the House deadlock `1f02b5dd4`. Baseline red: player-core `elections/finale.test.ts` (1), see BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W5 brief's 5K. One turnout channel: turnout follows alignment and grievance, the President's standing lifts or sinks the ticket, recent shocks swing the map.

**Notes.** 2026-09-29 W5 session: code complete, not closed. 5K landed `ec9aba79f`; opponent frozen at the seal and the House deadlock `1f02b5dd4`. POL-22 partly: governor agendas and AG suits not built. Static checks were green on the built commits; tests and balance were never run.

**Folded scope** (closed into this item on 2026-09-28):
- `admin-546.9` demos.turnout-model. Cohort alignment against the party's beliefs scaled by the cohort's spread, disillusion and mobilization terms, a turnout formula clamped between a floor and a ceiling, `selectCohorts` and `weakestCohort`. Acceptance: no history of strain can pin any cohort at the floor or the ceiling (with a minimum spread of 0.35, no alignment exceeds 0.65). As of 2026-09-27 `demos.ts:534` said there was no turnout term yet.
- `admin-546.10` demos.turnout-vote-driver. A vote driver in `projectVote` for who turns out. Acceptance: the driver is algebraically zero whenever turnout is uniform, on every election fixture.
- `admin-871` elections.turnout-as-referendum. High grievance suppresses a state's turnout, low grievance mobilizes it, and the election becomes a verdict on governing. Merged into the one turnout channel; no parallel referendum mechanic.
- `admin-a5f` elections.coattails. The President's standing moves House and Senate outcomes at midterms and generals, so Congress is partly the player's doing. As of 2026-09-27 a coattails term existed only in the founding fallback (`congress.ts:175`), and governors had none.
- `admin-cln` elections.momentum. Recent scandals, military outcomes and economic news swing the map apart from the four-year record and decay over weeks, without overwhelming the material-conditions model.

### `admin-owca.6.9` W5 content track: arcs that close, dead gates, rejoinders and reachability

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, proof recorded; Missing: H6 only (backfill rejoinders then make required); delete the "baseline reds" list. Checked against: scenario.ts:488 rejoinder still `.optional()`; `node scripts/verify-family-closure.mjs` and `verify-deed-reachability.mjs` exit 0; scenario-outlet.test.ts passes in suite.
- **Owner:** content, landed in the previous program's W5 content track (parent `admin-owca.6`)
- **Missing:** the proof run. H6 (a rejoinder required on instrument and join replies) is deferred until a reviewed job covers the reference set and the fixtures. The tests for a masthead as the counterpart (I12, `scenario-outlet.test.ts`) are red at `612d23cf0`.
- **Acceptance:** arc families end and say how they ended (the engine lapse, and the Record's finished list in W8, BL-74); the three dead-gate scenarios reach a board; escalatory rejoinders written; the deed reachability gate passes; scenarios gate on the pulse, disaster, public health and unrest; shipped scenarios use the arc system; arc readers answer dead branches; a culpable reply opens a named scandal; green in the proof run.
- **Evidence:** `4619c8a54` (84 revised and 19 new scenarios, bundle revision 21, 322 scenarios), docs `439f3371d`, the W5 gate record §3. Baseline reds in content: `scenario-outlet.test.ts` (3), `scenario-pulse.test.ts` (4), `scenario-cast.test.ts` (1), `scenario-oversight.test.ts` (2), `scenario-audit-speakers.test.ts` (2), `scenario-intel.test.ts` (1), `packs/core-consequences.test.ts` (1); player-core `desk/family-commodity.test.ts` (1). See BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** Arc families end and say how they ended (engine lapse and the Record's finished list); three dead-gate scenarios; escalatory rejoinders; the deed reachability gate; scenarios gating on the pulse, disaster, public health and unrest; the arc system used by shipped scenarios; arc readers. Commodity case factories and the content contract live here.

**Notes.** I12 (2026-09-28): a fictional outlet as scenario counterpart needs the counterpart type widened beyond nations; build it here. 2026-09-29 W5 session: code complete, not closed. Content track landed and published locally `4619c8a54` (84 revised, 19 new, bundle revision 21); docs `439f3371d`. H6 (rejoinder required) deferred. Static checks were green on the built commits; tests and balance were never run.

**Folded scope** (closed into this item on 2026-09-28):
- `admin-5c7` arcs.close-the-unit. The container for the arc lifecycle: a family that opens has to end, say how it ended, and show up when it does. It began as the question of what a session-sized, closeable unit of satisfaction is in a 208-week campaign.
- `admin-5c7.2` content.family-disposition. A resolving arc member's replies say `held` or `lost` (`lapsed` is engine-only); every resolving member carries at least one of each; an arc title names no country; replies cannot write an arc's closed flag.
- `admin-5c7.4` engine.family-lapse. An arc open past the lapse window closes as lapsed, written by one phase only; no other phase writes an arc flag; the boundary is tested in fiction-days, not turns.
- `admin-5c7.5` content.family-must-close. Audit errors for an arc without both an opening and a resolving member, for mismatched titles, and for a resolving member gated on anything but a single wait.
- `admin-5c7.7` player.record-finished. The Record's "What finished": one row per closed arc with week spans computed from the markers, the disposition at equal weight for held and lost, an honest empty state, and the open docket. An arc closing announces itself in the stop brief, close before week in screen-reader order (merged from `admin-5c7.8`).
- `admin-5c7.9` qa.verify-family-closure. A proof gate with five bad fixtures that must fail (no resolving member; a resolving member gated on a band; a reply hand-writing a closed flag; a resolving member whose replies all hold; a non-lapse phase writing an arc flag), plus harness cadence checks (median gap between closes under the quiet window, no 168 fiction-days without a close, lapsed closes under a quarter). `scripts/verify-family-closure.mjs` and its proof exist now; confirm they cover all five fixtures.
- `admin-tke` content.dead-gates. Five shipped scenarios reached no preview board: `the-asset-under-watch`, `the-final-assignment`, `the-review-only-our-exporters-face`, `our-people-in-their-province`, `the-deal-that-leaves-one-behind`. Re-gate them with relative bounds or a wider cast. The upgrade-job harness waives `unreachable-scenario` for upgrade jobs only.
- `admin-i30r.10` content.instrument-rejoinder-backfill. 77 of 78 instrument and join replies returned no rejoinder. Write them through the writers' room, then make the field required on those two reply kinds (H6).
- `admin-3go.18` deed.verify-deed-reachability-gate. Every shipped deed flag is either gated on by content or allowlisted with an owner and a reason, and every deed flag content gates on is one the engine can emit. `scripts/verify-deed-reachability.mjs` and its proof exist now. The deed grammar is `docs/DECISIONS.md` §7.7.
- `admin-3pt5.8` vitals.content-conditions. Scenario conditions on the inflation band, unemployment band, crime trend, cycle phase and cost-of-living strain, with reachability rules, a doctrine section, and a deliberate dead-gate fixture that is rejected.
- `admin-0z1` content.dynamism-gates. Author condition-gated disaster, public-health and unrest scenarios. As of 2026-09-27 the disaster shard had one gated item and public health and unrest had none; the mechanism exists and this is authoring.
- `admin-po1d.17.3` arc families in the corpus. Every multi-part story declares a family; a beat or close binds only through `familyCounterpart`; no flag-gated scenario that binds a foreign counterpart by rule sits outside a family; `/record` shows an open arc in a typical 20-week run. Eight ARC_DEBT pairs each need an author's call. Related: BL-49.
- `admin-vss` content.arc-readers. Author reader scenarios for the dead branches of lopsided arcs (2026-08-11: 99 dead branches across 50 arcs). A rising `arc-branch-unread` count after a fix is the audit seeing more arcs, not damage. Merged from `admin-i30r.11`: two critical scenarios whose replies honestly set `named-the-shootdown` and `paid-the-ransom`, which shipped scenarios read and nothing sets.
- `admin-k5j.8.10.9` commodity.case-factories. Durable cases from market thresholds: reserve use, route security, emergency relief, allied supply requests, export controls, sourcing compacts and delayed implementation reports. Acceptance: bounded, non-duplicate cases; decline, defer, delegate and default each have consequences; no critical decision lives only in the feed.
- `admin-k5j.8.10.11` commodity.content-contract. Writers gate on registered commodity and exposure bands and trigger registered shocks and levers, never write prices. Acceptance: invalid ids, direct price deltas, unreachable gates and a missing decline or default fail publish.

### `admin-owca.7.2` W6 6D: the order catalog, on real authority

- **Status:** landed, awaiting proof · P1 · task
- **Reconciled (October 18, 2026):** Status: landed, proof recorded; Missing: per-family harness row; cite BL-166 for authority citations. Checked against: orders.test.ts, order-authority.ts, authority-boundaries.test.ts, executive-authority.test.ts exist; BL-165/BL-166 at BACKLOG.md:~620-640.
- **Owner:** engine, landed in the previous program's W6 (no parent: `admin-owca.7` closed 2026-10-10)
- **Missing:** the proof run.
- **Acceptance:** a harness row per order family; every order rests on a lawful US authority; green in the proof run. The day-one order stage is a founding screen now (W3, BL-69; the capability ledger's `signOrder` row).
- **Wave:** W3 for the day-one order stage; the engine half is proof only.
- **Evidence:** `c53ee767a` (6D, landed in the W5 session per E7); docs and the civil-emergency-powers stance `1f02b5dd4`. Baseline red: `orders.test.ts` (2), see BL-20.
- **Blocked by:** nothing; it closes on a green unit suite and balance run (BL-20, BL-21).

**Description.** The W6 brief's 6D (PRS-1, FND-14). Decision W6-Q3: asset seizure becomes IEEPA blocking, price controls only through a bill, emergencies under the National Emergencies Act; press restriction, rule by decree and emergency detention are deleted (no lawful US authority; 18 U.S.C. 4001(a)).

**Notes.** 2026-09-29 W5 session: code complete, not closed. 6D landed `c53ee767a` in the W5 session (E7); docs and the civil-emergency-powers stance `1f02b5dd4`. Static checks were green on the built commits; tests and balance were never run.

## Open

### BL-269 Scenarios that state a trade fact the ledger does not hold

- **Status:** open · P1 · content, audit.
- **Owner:** scenario harness program; the writers' room for the rewrites.
- **Missing:** `the-trade-terms-our-neighbor-wants`, `the-tariff-that-answered-a-tariff`, `the-factory-shutdown-spreads` and `the-counterpart-is-gone` state a tariff that nothing in the campaign establishes. Their declared premises cleared BL-245's audit, but a premise declared as `universal` or `introduces` writes no measure, so the player's trade screen can contradict the memo. The content-review checklist has no question asking whether a reply's prose matches its mechanical effect.
- **Acceptance:** each scenario either gates on `tariffInForce` or a `tradeMeasure` cast and names the bound measure through its tokens, or has an `introduces` premise that writes the measure it introduces, or is retired. An audit rule refuses trade-state wording (our tariff, their duty, the quota) without a trade gate or a writing premise. The content-review checklist adds "the prose and the effect agree" and "the stated state is on the board". An independent review record covers the changed scenarios.
- **Evidence:** `docs/audits/2026-10-17-scenario-harness/FIDELITY-2026-10-19.md` §2 and §5.
- **Also from BL-268's review (October 19, 2026):** `the-trade-terms-our-neighbor-wants` is the one id in `TRADE_ACT_DEBT` (`packages/content/src/scenario-trade-act-debt.ts`): its grain cut has no US grain tariff to lift. Two replies promise a condition no engine event resolves: `the-counterpart-is-gone/use-transition-to-renegotiate-terms` ("until the coastal arrangement is signed") and `the-factory-shutdown-spreads/retaliate-economically` ("until they drop theirs"), and no later scenario reads the flags they set. `the-offer-to-lift-both-duties-together`'s mutual lift is always honored, so a low-trust sibling close where their customs still collects would let the gamble bite. `six-at-the-checkpoint/condemn-and-sanction` sends "the file on the executions" while the six are still alive. Record: `content/reviews/trade-acts-2026-10-19/REVIEW.md`.
- **Blocked by:** nothing for the gate-on-the-measure path. An `introduces` premise that writes the measure it introduces does not exist; BL-268 routes replies, not premises, so that option needs its own engine slice.

### BL-271 The studio is laid out by task, and Runs shows every job

- **Status:** open · P2 · studio.
- **Owner:** scenario harness program.
- **Missing:** the seven revision kinds render since BL-270 (`job-kinds.test.ts` fails on a gated kind with no descriptor); three `*.ingest` receipts in `content/jobs/` are still listed as "jobs the console cannot render" because the job listing reads them as job files. Two pages browse scenarios (`/explore` and `/library`), and Runs lives at `/scenarios`. Explorer's 368 and the corpus's 330 differ with no explanation shown. Metrics says "no registered reader" for `sectors` and lists 165 fields against the registry report's 284.
- **Acceptance:** the rail groups pages by task: scenarios (find, read, preview, repair), runs (every job kind, by status and age), tuning (read-only constants with their readers and the doc that restates them, balance results by run, and a sandbox that tries overrides on seeded campaigns or a short balance run and compares them with the baseline, never writing source; owner's choice in BL-272) and the dataset. Each job kind the CLI defines renders, and a test fails when a kind has no descriptor. Every count says what it counts. The Metrics page reads the same registry as `scripts/report-metric-registry.mjs`. The studio stays plain ES modules on its own server (the existing pattern). Observed in the running studio.
- **Evidence:** `docs/audits/2026-10-17-scenario-harness/FIDELITY-2026-10-19.md` §3.
- **Blocked by:** nothing.

### BL-143 Metric registry and the target data model

- **Status:** in progress · P0 · engine, world, tooling · approved by the owner 2026-10-13. **R0 landed** (`28ff5d2ef`, `dfcd21345`): approval unwritable by the metric effect's type (28 sites narrowed, no runtime change); every authored reader is a `path#declaration` site checked against code by `stat-consumers.test.ts` (fixtures reject a missing file, a missing declaration, a type and the old prose); the false claims fixed (`macro.deathBaseline`/`birthBaseline`, `player.vitals-reading`, `geography.greatCircleDistance`, `player.country-panel`, deleted `districtCohorts` readers, writers listed as readers) and owed set to `medianAge`, `literacy`, `Person.affiliation` and 29 district skews, each pinned with its reason; kind and write policy on every NationStats field and engine registry node (`QuantityKind` gains `level` and `ordinal`); the typed extractor `scripts/report-metric-registry.mjs` writes `scripts/metric-registry-report.json` (284 fields, 2,350 reader and 430 writer sites, 207 claimed readers unconfirmed, 87 of them cohort shares it cannot see, 6 loosely typed patches), deterministic and keyed by declaration. Proof: clean build, typecheck, lint, full workspace suite (engine 4,469, world 550), dist-freshness and ten other gates.
- **Reconciled (October 18, 2026):** Missing: "Next only: narrow the 20 opaque payloads; policies for the 193 fields outside NationStats and the engine nodes; separate projections from writes; then weekly budgets, cause ids, calibration cases as tests and docs/METRICS.md (absent), each its own slice." Drop the "Superseded by R2" and R0 acceptance text. Checked against: all of 28ff5d2ef dfcd21345 b6026fa0d c3920230b 6fa05ec4d 4e6ba66e7 685f4d9c1 937bf9505 are ancestors; scripts/verify-metric-registry.mjs and scripts/report-metric-registry.mjs exist; docs/METRICS.md does not (test -f).
- **Owner:** the data-model program, `docs/audits/2026-10-12-data-model/` (TARGET-MODEL.md, TARGET-VERIFY.md).
- **Missing:** the model's metrics and their links are only partly registered. Three registries already exist and must be extended, not duplicated: `packages/engine/src/metric-registry.ts` (`METRIC_REGISTRY`: runtime metrics with parent/child, cadence and weight links, read by `apps/studio/metrics-view.mjs:2`), `packages/world/src/dataset/stat-consumers.ts` (authored fields and readers) and `packages/world/src/metrics/` (the `QuantityKind` vocabulary and reference series). The authored registry claims four readers that do not resolve (`macro.deathBaseline`, `macro.birthBaseline` and two more), and its paired test only checks that a claim is longer than three characters; `medianAge` and `literacy` are read by nothing in the simulation. `applyMetric` silently drops an `approval` write (`effects.ts:119-136`) instead of the type refusing it.
- **Acceptance (R0):** the false `readBy` claims fixed and `medianAge`/`literacy` pinned as owed; the string-length test replaced by one that resolves every claimed reader to a real export; `approval` unwritable by the effect type; kind (from `QuantityKind`) and write policy added to the existing registries; a typed extractor running in report mode, keyed by `path#declaration` (as `rule-seam-census.json` already is), listing writers and readers per field with the leaky sites named. Deferred to later slices by TARGET-VERIFY: weekly budgets, cause ids, calibration cases as tests, generated `docs/METRICS.md`, and the scheduled-effect queue.
- **Evidence:** INVENTORY.md, RESEARCH-*.md, TARGET-MODEL.md, TARGET-VERIFY.md.
- **R1 landed** (`b6026fa0d`, `c3920230b`, `6fa05ec4d`, `4e6ba66e7`): `verify-metric-registry` and its proof fail on an unregistered field, a field with no reader or no writer its policy promises, a stale report, or a new unconfirmed claim (ratchet: 89 forgiven, all named blind spots); the six loose patches are typed.
- **Owner answers (Q25-Q29, 2026-10-13):** a full population ledger for the US and national rates for the other 195, with a save rule; reported figures by default and the truth in the Record and God Mode; one slow, hidden checks measure seen through events and yearly report cards; the pandemic rate researched from primary sources first; labeled design bounds on traits until sourced.
- **R2 landed** (merge `685f4d9c1`; `937bf9505` regenerated it over the integrated tree): metric effects credited to their 77 senders, computed-key patches resolved, scenario gates read from the 346 dealt scenarios (18 fields), founding-only policies checked against campaign writers (5 corrected, service units made effect-written for hull losses), a blind-site ratchet at 20; `docs/audits/2026-10-12-data-model/R2.md`. The dead `approval` entry was already gone (R1).
- **Superseded by R2:** write policies disagree with the code (28 founding-only fields have writers, including budget-written military and soft-power fields); `metric` effects are credited to `applyMetric`, not their 39 senders; `policy-program.ts#statEffect` builds its patch with computed keys the walk neither reads nor flags; turn the report into a failing gate on the checks TARGET-VERIFY kept (unregistered field, field with no writer or reader, authored entry disagreeing with code); narrow the six loosely typed patches; teach the extractor scenario gates in the JSON corpus; delete the dead `approval` entry in `ASSESSED_METRICS` (`position-assessment.ts`); then budgets, cause ids, calibration cases as tests and `docs/METRICS.md`, each as its own slice.
- **Next:** narrowing the 20 opaque payloads; policies for the 193 fields outside `NationStats` and the engine nodes; telling projections from writes; then budgets, cause ids, calibration cases as tests and `docs/METRICS.md`, each as its own slice.
- **Blocked by:** nothing.

### BL-153 Appointments follow-ups

- **Status:** open · P2 · engine, world, ui
- **Owner:** the appointments plan, `docs/audits/2026-10-13-appointments/PLAN.md`.
- **Missing:** founding is untouched, so sitting justices at founding lack legal careers, the founding Joint Chiefs chair is a civilian, and the founding cabinet stage can still seat a serving officer as Secretary of Defense; elevating an associate justice to Chief Justice is not modeled; inspectors general and White House staff are never refilled; regulator terms never expire; holds, blue slips and recess appointments are not modeled; district judges, U.S. attorneys and ambassadors are not seats; generated judges and officers use the cabinet's portrait mix (unsourced); no glossary copy for the desk; on a phone a seat's "Default" tag sits beside a different, preselected name, which reads as contradictory.
- **Acceptance:** each item built with tests, or declined with a reason recorded here; founding changes re-pin the seeded-cast tests deliberately.
- **Evidence:** BL-152's report; the desk captures at 390 and 1440.
- **Blocked by:** nothing.

### BL-161 Person-level intelligence collection lacks jurisdiction and identity predicates

- **Status:** partly landed (2026-10-15), open · P1 · engine/data, security workflow. Engine contract, player-core selectors, tests and docs are in the tree. The control is not restored: the legacy DOM player (`apps/web`) is frozen by owner direction, so the picker and referral act will be rebuilt in `apps/player`. No browser journey was run.
- **Reconciled (October 18, 2026):** Evidence: replace apps/web/src/world/security/CollectionActs.tsx with apps/player/src/security/CollectionActs.tsx (no lead picker, CIA tasking or AG referral act there yet). Rest of Status/Still owed stands. Checked against: apps/player/src/security/CollectionActs.tsx:17-18,70 refuses person targets ("Not available. The game can't target one person here."); personLeadRows/referChoices are used only in packages/player-core/src/security/collection-reading.ts and person-leads.test.ts.
- **Landed:** a person-level request now names an `IntelSubject` `{ personId, snapshotDay, basis }` (`packages/engine/src/intel-authority.ts`). The engine derives the only eligible people from state it already holds: the seated leader of a government with an active pursuit of the United States, and the person a public inspector-general graft finding names. Nobody is invented. `taskCollection` hard-rejects a missing subject, an unknown or dead person, a closed or changed case, a snapshot older than 28 days, a wrong-jurisdiction case, and a foreign-person focus other than external intent. Requests with no sourced pathway take the existing logged `BoundaryRefusal` path. The only sourced foreign pathway is CIA human-source collection abroad (50 U.S.C. §3036(d)(1), (3)); `INTEL_AUTHORITY` cites only keys present in `docs/player-rebuild/authority-sources/manifest.json`, checked against the text by `packages/content/src/intel-authority-sources.test.ts`. A person in the United States is refused for every element and is only referred to the Attorney General (`referToAttorneyGeneral`, one per case and person, cites U.S. Const. art. II, §3, directs nothing). The subject is copied into products and share snapshots; `agReferrals`, `closedReason` and the subject fields are optional so older saves load; open person taskings are revalidated on load and weekly and closed with a recorded reason, including legacy free-text person taskings. Player-core exposes `personLeadRows` (engine-derived leads only), `referChoices`/`referOrder` (a referral, never a tasking, for a domestic person) and person-aware `taskChoices`/`collectionReading`. SCHEMA, ARCHITECTURE and DECISIONS 7.12 updated.
- **Proof run:** engine tests (`intel-authority.test.ts`: accept, unknown, stale, closed case, unauthorized, domestic refusal and referral, save/reload, legacy close, weekly close, report share), player-core `person-leads.test.ts`, the authority-source test, and the build/typecheck/lint/gate results recorded in the landing commit message.
- **Still owed:** (1) the control in `apps/player` (lead picker, CIA tasking, domestic referral) and the actual report journey on that surface: pick a lead, task CIA, advance to a filed report, share it, reload, and the referral at 390x844 and 1440x900; nothing was opened in a browser for this change. (2) Residence is not modeled: a foreign leader's presence abroad is assumed from being the seated head of a foreign government, and no other foreign person (an operative, a financier) has a case, so those stay unavailable. (3) Only a graft finding binds a domestic person; other domestic incidents (border, surveillance) name no person on record, and the Attorney General does nothing in response to a referral yet. (4) A person-level product reports only the pursuit finding behind the case.
- **Evidence:** `apps/web/src/world/security/CollectionActs.tsx`, `packages/engine/src/intel-authority.ts`, `packages/engine/src/intelligence.ts`, and `docs/player-rebuild/SHADCN-WORLD.md`.

### BL-160 Publication location gates block bridge callbacks and report wildfire

- **Status:** open · P2 · content, place binding.
- **Missing:** the current approved bridge callback `the-crossing-we-decided-not-to-rebuild` and new `wildfire-public-report-federal-offer` introduce seeded-state findings under `node scripts/verify-scenario-dc-fallback.mjs`. The callback can inherit `flagPlaces` at runtime, but the gate cannot prove an actual originating place; the wildfire report identifies a state while its raw locus still draws a state. No exemption was added. All five bridge revisions were restored to their exact prepublication bodies to preserve the existing chain, and the unshipped wildfire addition was withheld. The two chronology repairs remain independently valid.
- **Acceptance:** prove that the callback returns to its actual originating location after save/reload and refuses unsupported origin claims; make the report map, rendered state, action target, case and Record refer to the same issued-report state. Exercise multiple originating states and stale/missing evidence. Publish only after independent content review and the unchanged location gate, or a stricter gate that observes the real journey, passes. Do not replace this with a fixed invented state or an enlarged baseline.
- **Evidence:** `docs/audits/2026-10-14-worktree-reconciliation/RECOVERY-PREFLIGHT.json`, `LOCATION-ROLLBACK.json`, and `PUBLICATION-REVIEW.json`. Scratch rebuild used the existing corpus store, preserved the prior corpus, verified 327 unique ids and equality of the other 322 bodies. No hand editing of shards.
- **Blocked by:** nothing; withheld from this publication.

### BL-159 Typed court responses need native Record links and pending status

- **Status:** open · P2 · engine, player presentation.
- **Owner:** connected Record/BL-136; found during the limited content pilot.
- **Missing:** actual `orderReview` commands execute against the right proceeding and survive reload, but their conversation event indexes only `USA` and `INST-DOJ`; the proceeding and signed-order ids remain in frozen cases/command/effect payloads rather than the event's entity index. Record renders “Done: in effect” and “Resolved: in effect” for seeking review with a still-pending stay. The receipt narration correctly says the judgment remains in force pending the court's answer, but there is no corresponding pending lifecycle label.
- **Acceptance:** preserve the native proceeding/order identities and judicial/order systems when composing the conversation event; connect its Record receipt to that exact case/order; distinguish a completed filing from the unresolved appeal and stay application. Prove accept, seek, seek-with-stay, reload, department-subject retention, and stale-case refusal without new invented costs or fabricated historical links. Verify the other existing typed command families for the same composition loss.
- **Evidence:** `docs/audits/2026-10-12-grounded-casting/content-pilot-2026-10-14/runtime-proof.json`, `pass-evidence.json`, and inspected phone/desktop captures. The existing preview signs an actual order and runs court phases; all three branches execute after reload. Source cause for the index omission: `positionPacket` in `packages/engine/src/conversations.ts` composes action effects but takes new `decisionProvenance`, which names governments and declared subjects rather than the bound command's record ids. Browser journeys passed 12/12 after temporary probe corrections; that does not certify the misleading lifecycle presentation.
- **Blocked by:** nothing. The owner subsequently authorized publication and an integration-branch push. The approved pilot is included in the publication pass; this known Record limitation remains open.

### BL-157 Scenario money is realistic only where the arithmetic is stated

- **Status:** open · content, engine · follows BL-81's scenario half (merge `465290c37`).
- **Reconciled (October 18, 2026):** Missing: "(1) No shipped scenario declares financial.basis; run the sourced corpus pass and resolve or record financial-basis-off-band warnings. (2) Add the every-federal-component check to the content-review checklist (BRIEF.md already says it). Items 3 and 4 are decided/implemented; drop them from Missing." Acceptance (1),(2 reviewer half) only. Checked against: content/kit/BRIEF.md:576-580 tells writers to state components, coverage and exclusions; corpus shards declare no financial.basis (grep of financial objects shows only scale/horizon, e.g. culture-000.jsonl); packages/content/src/scenario-cost.ts and scenario-audit-cost.ts exist.
- **Missing:**
  1. **Band-only pricing is too coarse.** A band prices from one anchor per severity, so a week declared by band alone can land orders of magnitude from its real cost. Measured on `d53e2a776` for the United States: a metoprolol purchase guarantee declared `supplemental` on a serious week prices like the Zika supplemental ($1.53B center); opening Morganza declared `emergency`, `multi-year` on a critical week prices off Sandy ($129B center). The real cases ran tens of millions and low single-digit billions. The fix is `financial.basis` (quantity × unit cost × weeks) on the reply, and none of the 322 shipped scenarios declares one.
  2. **Coverage contract implemented; corpus application remains.** Basis components and explicit coverage/exclusions are supported and audited; the doctrine, brief and reviewer checklist require complete federal accounting. **A stated basis is only as complete as what the writer counts.** The refugee example (2,000 × the FY2023 Reception and Placement grant, $2,275) prices at $4.5M, which is only the State Department's per-refugee grant; ORR benefits, health screening and the rest of the federal cost are missing. Writers need guidance, and a reviewer check, that a basis names every component it prices.
  3. **Implemented (2026-10-14):** the choice shows a rounded estimate, successful position commit books a separate deterministic outturn, and Record retains estimate/booked/variance at actual national-books precision. Untagged contractual costs and old frozen decisions remain fixed; historical estimates are not fabricated. Browser proof and controlled debt paths are recorded in READINESS-2026-10-14.md.
  4. **Decision: retain explicitly labeled planning values, not a fitted distribution.** Bias 0.08, band spread 0.35, basis spread 0.15 and the treasury jitter are set against the transport-project overrun record (28% average, Flyvbjerg, Holm and Buhl, 2002); the widely cited "86% of projects overrun" was not found in any opened source and is not used. No fitted distribution exists for transfers, grants or disaster appropriations.
- **Acceptance:** (1) a sourced corpus pass adding `financial.basis` wherever the fiction states arithmetic, run through the `content-research` historian step, with the `financial-basis-off-band` warnings resolved or recorded; (2) the doctrine and the brief tell a writer to count every federal component in a basis, and the content-review checklist asks for it; (3) built (estimate at cast, actual drawn at commit, Record showing both and the overrun) or declined with a reason; (4) the jitter fitted against a sourced set of appropriation estimates against outturns, or kept as labeled planning values with that decision recorded; the balance harness run after (1) and (3).
- **Evidence:** `packages/content/src/scenario-cost.ts`, `packages/world/sources/scenario-costs-sources.md`; the four-campaign demonstration in the 2026-10-14 session (Seagirt basis $6.6M center; metoprolol band $1.53B; Morganza band $129B; refugee basis $4.5M).

### BL-158 Regime change: tuning and the next slice

- **Status:** open · P2 · engine · follows BL-148's first slice.
- **Reconciled (October 18, 2026), owner decision still open:** leave open. Checked against: docs/audits/2026-10-12-coercion-geography/REGIME-SLICE-1.md:16,23,43,49 matches the figures (1.17 ops/term, 25% coup fall, NK not refused); engine regime-acts.ts/regime-npc.ts exist.
- **Owner:** the coercion program, `REGIME-SLICE-1.md`.
- **Missing:** coup support falls a fragile government within 104 weeks in 25% of runs (Haiti, Venezuela) against REGIME-VERIFY C1's 30-55%; other governments start 1.17 operations a term (range 0-4, three terms of twelve none) against the owner's 1-6, carried by Russia and Israel; North Korea is not refused as a target because the data gives it no delivery triad; hold scores, contenders, recognition and occupation strategy (owner Q22) are not built.
- **Acceptance:** the owner decides the two rates and the North Korea question; the dials retuned and re-measured at 12 seeds; the next slice built after that decision.
- **Evidence:** REGIME-SLICE-1.md.
- **Blocked by:** owner decisions above.

### BL-146 The electorate as blocs, and the economy reaching approval through perception

- **Status:** open · P1 · engine, player-core · **the bloc electorate landed** (merges `759316b3f`, `69c90873f`; `26029aef1`, `ba5a60960`); the economy refit and slice 3's other events remain.
- **Owner:** the approval program, `docs/audits/2026-10-12-approval-model/` (DESIGN.md's "Build status, 2026-10-13" lists built and remaining).
- **Extended (2026-10-24, world dynamics program, Wave 3, opinion lane, Sonnet with the owner's balance run):** opinion B5 belongs to slice 4's seat refit. `SWING_SENSITIVITY.house = 0.12` and `MIDTERM_PENALTY = 0.04` (`packages/engine/src/election-seating.ts:62,78`), further shrunk by state lean, give −18 House seats at 39% approval and −33 at the floor against Gallup's −37 average below 50%. The target is a conditional distribution with starting seats and geography, not −37 in every seed; `.25` is an unverified candidate. Probes `opinion.probe.test.ts` 4 (−30 near 40%, −40 at the floor) are provisional and are replaced by the distribution check when it is set. Opinion B3 (a ≥6-point inflation floor) is not opened as an item: slice 6's economy refit is its calibration route (world dynamics PROGRAM.md §6).
- **Landed:** DESIGN-VERIFY's nine required changes recorded in DESIGN.md; five partisan blocs with party shares seeded inside a symmetric range around Gallup 2025 (owner Q5); headline as their share-weighted sum; a polarization stock reverting to the 2020s anchor (DECISIONS 5.13); cohorts as tilted mixtures of the blocs and turnout as bloc composition in the ballot (5.8, 5.9); the coalition figures and their break event retired (Q8); three blocs shown, five kept (Q10); the caucus break on the President's own identifiers and removal for inability (5.14, owner Q7); a hawk/dove force term from Pew 2019 positions with per-bloc and headline caps (5.15, 13.9 amended, Q9, Q11); salience on change with fast revision, conditions billing once, recurring background writers budgeted, security billing order's change from rest, standing reverting (5.16); the war rally as a valence impulse, Iraq-fitted and damped for a self-started war, none for a blockade-opened one (5.17, Q1, Q6); `VALENCE_MIDPOINT` measured (0.60 puts careful play at 0.506 against 0.571 at 0.52) and held at 0.52, because at 0.60 the national-books checks H2 and H3 fail while the headline's readers are calibrated on the old level; save v66. Proof: the integration gate record of 2026-10-14 (build, typecheck, lint, the full suite, 89 of 89 gates, balance), `electorate.test.ts` (Gallup headline-only party splits within 4.5/3/5 points RMSE, mirror symmetry, identifier gap 74-88 at reachable stocks, a quiet term holding the anchor), `removal.test.ts` (2020, 2021 and 1999 Senate counts).
- **Missing:** slice 6, the economy refit through consumer sentiment and real income against the 1991-92 and 2021-22 replays (RESEARCH-ECONOMY.md), which gates every economic balance claim; slice 3's other rally classes (homeland attack, standoff, decisive operation, national emergency), credibility debt and inquiry exposure; slice 4: the midterm House seat refit landed at Wave 3 (opinion lane `605d28c7c`, merge `0f783e447`, integrated at `bd7da1cdc`; fitted to Gallup's 1946-2014 table, not the Clerk's vote; `election-seating.ts#HOUSE_MIDTERM`; `elections.test.ts` "loses more House seats the less popular the President, holding the map fixed" and the opinion probe's section 4; DECISIONS 5.19), while the midterm turnout differential, per-caucus Congress disposition and removal's `congress` term remain; state approval by tilt; leaner drift with own-side approval (Q5 "drift later"); the rest of slice 9's harness acceptance list; the unanchored inability thresholds (0.70 for 91 days) await a sizing decision; moving `VALENCE_MIDPOINT` to its fitted 0.60 once Congress's disposition, removal pressure and the scenario director read the blocs or are recalibrated.
- **Acceptance:** the economy refit passes the two replays without breaking the scandal and rally fits; each remaining slice built or declined with a reason; the harness acceptance list run.
- **Evidence:** AUDIT.md, VERIFY.md, DESIGN.md, DESIGN-VERIFY.md.
- **Blocked by:** nothing.

### BL-147 Scenarios placed and cast for a reason, and kept there

- **Status:** open · P1 · content, engine, player-core. **The owner lifted the 2026-10-12 drafting and publishing hold on October 18, 2026** (asked in session: "Lift it"), so BL-252's reviewed repairs and the other scenario items publish; `AGENTS.md` §3 records it. The owner accepted the pilot's nine placement patches on October 18, 2026. Eight are applied and baked; the ninth is held (see Remaining).
- **Owner:** the grounded-casting program, `docs/audits/2026-10-12-grounded-casting/`.
- **First change landed** (merge `73e19ad2e`): fit-weighted state draw, arcs returning to the opener's place, the place reaching effects and the Record.
- **Second change landed** (merge `bca5a9efc`, `445d40789`): a thread's place is pinned when the opener is raised (owner Q13; DECISIONS 7.8 amended; an unanswered pin is kept 112 days and is not live); an answer moves the bound governor by a capped step (0.04) and leaves a remembered tilt (cap 0.12, 26-week half-life) that moves where the governor settles (owner Q19; senators declined: their seats are party placeholders the vote code reads directly).
- **Pilot:** `PILOT.md`. Twenty scenarios read in three places: 12 of 20 read right in all three against 10 before (the agent's rule, for the owner to re-read); deal rate unchanged; one campaign in three put about a quarter of its seeded scenarios in Texas. That pilot preceded the readiness extension below; its fruit-belt premise still lacks supporting data. **Applied October 18, 2026:** eight of the nine placement patches (`node scripts/patch-corpus-locus.mjs docs/audits/2026-10-12-grounded-casting/pilot-placements.json`, then `corpus build --content-set admin-2026w34`, manifest revision 44). `the-rearmament-line-draws-on-the-clinics-again` left the seeded-state baseline. The ninth, `the-fuel-price-spike` (site coast, sector energy-oil), was removed from the patch file: it moves the scenario into a seeded state, which `verify-scenario-dc-fallback` refuses to raise, and authoring a state and city for it fails the audit (`missing-city-token`, `unrouted-domestic-act`) until its opening and replies are rewritten. All 88 verify gates and the content tests pass on the result.
- **Readiness extension (2026-10-14):** the owner answered Q14–Q18 in OWNER-QUESTIONS.md. Implemented: used-state discount with existing-place pins; Natural Earth locality context; evidenced Newark port and International Falls road crossing; persistent named city mayors through the existing person effect; declared governor/member/mayor documents; native subject identities, inheritance and Record tracing. Schema, doctrine and authoring kit carry the contracts. Verification is recorded in READINESS-2026-10-14.md.
- **Remaining:** owner review of the pilot before corpus migration; case-specific supported premise repair/retirement, sourced cost arithmetic, the fuel-price-spike placement (author state and city, write the city token, route a reply as gazetteer or domestic, through a regate job with review), governor-tilt sizing by balance and the three `seeded-state:` keys. These remain migration/measurement work, not unanswered owner decisions. A small locality is not evidence of a fruit belt or facility capacity.
- **Acceptance:** the owner accepts the pilot (done for the placement patches); then the 322 migrate.
- **Evidence:** AUDIT.md, VERIFY.md, PILOT.md.
- **Blocked by:** nothing.

### BL-149 Scenario authoring kit and drop-in ingest: the unproven tail

- **Status:** landed, awaiting proof · P2 · studio-cli, content
- **Reconciled (October 18, 2026):** Status: landed, awaiting proof. Missing: "verify-kit-current no longer exists (deleted 8caf5b441); fix exemplar 1 (add topics), make NEEDS skip casts that cannot carry the class, prove publish/bake/dist-freshness on the next ingest." Acceptance: drop verify-kit-current. Blocked by: BL-147 only if the hold is real. Checked against: git log shows verify-kit-current.mjs deleted in 8caf5b441; content/kit/EXEMPLARS.json first entry the-strike-that-hit-the-second-building has no topics key; content/kit/NEEDS.md:34; d4fd08c04 re-baked the kit and corpus.
- **Owner:** the content pipeline (`skills/scenario-ingest`, `content/kit/`).
- **Missing:** the kit, NEEDS file, ingest, tool-neutral skills and their gates landed (`9faec480c`, `864777f9d`, `d56b9a97a`, `82e9d3e99`); publish, bake and commit were proved only in a throwaway copy, never in this repository with the player-core rebuild. None of the 17 `CORE_SCENARIOS` passes today's gate as a new batch (no `topics`, no `binding.mechanisms`), and the quoted exemplar `the-strike-that-hit-the-second-building` fails `topics-missing`, teaching authors to omit topics. NEEDS suggests `hostage:none:routine`, a cast that cannot carry its class.
- **Acceptance:** the first real ingest after the drafting hold lifts publishes, bakes, rebuilds player-core and passes `verify-dist-freshness` and `verify-kit-current`; the quoted exemplars pass the gate; NEEDS picks casts its class can carry.
- **Evidence:** studio-cli vitest 360/360; `verify-kit-current` and its proof pass.
- **Blocked by:** BL-147 (the drafting hold).

### BL-142 Contested issues across the three branches

- **Status:** open · P1 · engine, content, ui. Phase 0 (rules) landed in `b641c553a`. Phase 1 research landed in `76506f026` and `b7188f96f`: state shares for seven religious traditions raked by race, each tradition's vote, every cohort's measured position on abortion, guns, immigration and policing, and published toplines for the issues CES lacks (`docs/audits/2026-10-12-contested-issues/RELIGION-RESEARCH.md`, `PUBLISHED-TOPLINES.md`). Phase 1 engine work and phases 2 to 6 not started; no contested content exists.
- **Owner:** contested-issues program, `docs/audits/2026-10-12-contested-issues/PLAN.md`. Starts after the simulation-depth integration checkpoint, because BL-112, BL-123 and BL-106 touch the same court and bill files.
- **Missing:** no executive order, bill, court matter or scenario covers abortion, LGBTQ issues, drugs or student debt, and none of the 12 orders touches a social issue. The four social bills come from one direction only. Courts only review the President's own acts. Three ideology axes put an abortion limit and a gun-control law on the same axis direction. A scenario reply reaches 8 of the engine's effect kinds and can't move a Hill vote or a minister. Non-decision events are code tables, not data.
- **Acceptance:**
  - DECISIONS §13 is built as written: the cultural axis with save migration; `IssueDef` with connection maps; issue state, heat and flare-up conditions; the occurrence, matter and instrument layers; the closed mechanic set; priced levers with weekly caps; the isolation, double-billing, loop and symmetry rules; seeded starting law; the exogenous docket with doctrine voting; compliance and defiance.
  - A `wedge` balance policy doesn't beat `careful` on median approval or re-election at 12 seeds.
  - A guns vertical slice (about 60 occurrences, 15 matters and 15 instruments) reaches at least six systems on its map across a full term in the harness and the browser, and the Record traces every movement.
  - Isolation, double-billing, symmetry, size-budget and reachability gates are green with proof twins, and a synthetic 3,000-item load test passes.
  - Tier-one coverage cells are filled with review records.
  - Issue pages pass six widths with inspected captures.
  - SCHEMA, ARCHITECTURE and `CONTENT_DOCTRINE.md` §3 match the shipped behavior.
- **Evidence:** the inventory in PLAN §2 (`orders.ts:203`, `order-families.ts:36`, `judicial-review.ts:32`, `cohort-motivation.ts`, `cohort-channels.ts:13`, `scenario-director.ts:388-469`, `feed-cap.ts:33`, `CONTENT_DOCTRINE.md` §3), at `9c8dd8703`.
- **Blocked by:** the integration checkpoint is done (2026-10-13 gate record). Its issue scoring now waits on the electorate work in BL-146 (contested issues land through measured cohort positions grouped into blocs) and on the metric registry (BL-143), so each issue metric is registered with its calibration. The owner amended DECISIONS §5.8 on 2026-10-12 (religion axis; measured cohort issue positions), so the phase 1 design is settled.

### BL-117 Force and surveillance aimed at Americans, with incidents and tempo

- **Status:** landed, awaiting proof · P1 · engine
- **Owner:** engine and the state desk (`/nation/state/:id`).
- **Missing:** the owner asked that a President can send agents or troops into U.S. cities and order surveillance of citizens, that this can go wrong (a civilian shot, protests, inquiries, impeachment under the right circumstances) with interplay across the metrics, and that back-to-back acts read as erratic and weigh heavier. Calibration is provisional: no playtest and no balance run exercises these acts.
- **Acceptance:** the three acts are reachable against unrest and unprovoked (`?power=1`); an incident moves opinion, stability and `protestPressure`, a grave one opens a scandal, surveillance opens an intelligence inquiry under a hostile panel; tempo raises odds and weight; a playtest or harness run that takes them confirms the odds and costs are neither free nor a certain spiral.
- **Evidence:** this commit. `packages/engine/src/domestic-coercion.ts` and its test (12), the three acts and `takeHomeAct` in `locale-acts.ts`, `committee-inquiry.ts` (`surveilling-domestic:`); live, four agent surges in one week in New York ran the odds 14%, 22%, 31%, 39% and the fourth drew a killing (approval −0.7, stability −5.1). The balance harness does not take locale acts, so it was not run.
- **Blocked by:** nothing.

### `admin-owca.6` presidency.depth W5 a world that moves

- **Status:** open · P1 · epic
- **Owner:** engine; the previous program's W5 (no parent: `admin-owca` closed 2026-10-10)
- **Missing:** every child is landed and awaiting its proof run.
- **Acceptance:** `admin-owca.6.1` to `.6.4`, `.6.6` and `.6.8` to `.6.10` closed on the proof run (`.6.5` and `.6.7` closed 2026-10-10 as superseded screens). The W5 playtest's engine situations (Russia and Ukraine at war, a Gulf oil shock, a foreign election, deployments, munitions, a foreign masthead) reproduce in the balance or NPC-world harness. Their screens are W7's (BL-73).
- **Evidence:** code complete at `f6d67a7f2`; the W5 gate record (read from `1211e624e^`).
- **Blocked by:** nothing.

**Description.** Foreign governments, wars, markets, leadership turnover and the foreign press move without the President, and the opening world carries the conflicts the transition found. The children are `.6.1` 5A NPC agency, `.6.2` 5B leadership turnover and foreign press, `.6.3` 5C.1 alliance decisions, `.6.4` 5C.2 war outcomes and the opening board, `.6.6` 5E markets, `.6.8` 5K the election finale, `.6.9` the content track and `.6.10` the W4 carry-overs. The W5 prep folded 5J into 5B, 5H into 5E and a trimmed 5I into 5A, and moved W6's trimmed 6B into W5 as 5K.

### BL-77 Wire or delete the engine's narrative state no player reads

- **Status:** open · P1 · engine and player-core
- **Reconciled (October 18, 2026):** Missing: remove computeRegimeScore from the admin-vbul row; re-count readings with no reader before acting; keep the IgReferral and causeIds rows. Checked against: grep computeRegimeScore across packages/apps returns nothing; packages/engine/src/intelligence.ts:124 IgReferral; only 21 non-test engine files mention causeIds.
- **Owner:** engine; each row's reader lands in the map-first wave that builds its screen. Carried from `admin-owca.7.3` (closed 2026-10-10).
- **Missing:** engine state and readings that reach no player, and producers that stamp no cause. The four folded rows below.
- **Acceptance:** each row is wired to a named screen in `docs/DESIGN.md` §2 or deleted with the decision recorded here; no narrative-record export is left with zero player consumers and no decision beside it. Wiring is proved by rendering the screen, not by the import existing; the capability ledger (`docs/audits/2026-10-10-map-first/capability-ledger.md`) is where an act's reachability is held.
- **Evidence:** the rows' own anchors, which predate the rebuild; re-derive each against source.
- **Blocked by:** nothing for the engine half. Overlaps decision BL-43.

The rows:
- `admin-eayi.2` dynamics.ig-referral-absorption. `IgReferral` in `packages/engine/src/intelligence.ts` should emit a Matter where it builds a referral, and the type and its field should go. The game is pre-release, so no transition selector is owed.
- `admin-po1d.10.3` narrative state no player surface reads. As filed: the other chairs' stances in the counsel record (only the primary is stamped), the room beyond four voices, scandals as objects, consequence-card flags no scenario gates on, deed flags no shipped content reads, authored reply flags read by nothing, a grudge's cause, the unfiled half of each relationship record (including what the President said to that government), and the rival faction.
- `admin-vbul` engine.unwired-readings. As of 2026-09-03 a sweep found engine readings with no player reference: `computeRegimeScore`, the fragility model, `readPlayerCommitments`, the player's alignment drift, government quality and character, warfighting profiles, coercion propensity and leverage, party beliefs and delegation grievance, committee-inquiry ownership, and more.
- `admin-917f` engine.causal-callsites. Most packet producers supply no `causeIds` (on 2026-09-27, 52 of the 66 engine files that emit a packet named no cause), so the causal graph is two levels deep. Sweep producers phase by phase; never backfill an invented cause. BL-11 needs it.

### BL-78 Engine proofs carried from the previous program's final wave

- **Status:** open · P1 · engine
- **Reconciled (October 18, 2026):** Missing: two rows only (demos legibility + savesize; content pin). Close row admin-3pt5.7 with R1 commits b6026fa0d..4e6ba66e7. Checked against: scripts/verify-metric-registry.mjs and stat-consumers.test.ts enforce reader coverage (BL-143 R0/R1); pinContent/content-pin absent (grep returns nothing); packages/engine/src/demos.test.ts has no 208-turn or save-size test; safety ref refs/safety/lost-content-pin-32dbaabc1 exists, commit not an ancestor.
- **Owner:** engine. Carried from `admin-owca.7.4` (closed 2026-10-10).
- **Missing:** three engine proofs that were folded into a browser-suite item and never run.
- **Acceptance:** each row below holds in a test or the balance harness.
- **Evidence:** as listed.
- **Blocked by:** nothing.

The rows:
- `admin-546.17` demos.legibility-savesize-suite. Against real authored composition: after a heavy signature, the top cohort's movement is at least four times the median cohort's and the top three movers span two axes; the strain bound holds over a 208-turn campaign; the save stays inside its size bound.
- `admin-3pt5.7` vitals.gameplay-reach. Every vital has a player-consequential reader (elections and turnout, removal and regime pressure where allowed, the weekly brief, treasury planning) with no new double count; `stat-consumers.ts` enforces it.
- `admin-xto` content pin. `Campaign.content`, `pinContent`, `content-pin.ts` and the dangling-fuse audit rule are on no shipped branch (still absent from `packages/engine/src` on 2026-10-10); the only commit with them, `32dbaabc1`, is pinned at `refs/safety/lost-content-pin-32dbaabc1`. Rebuild or recover them, record the pin in `sealFounding` (`packages/engine/src/founding.ts`), and re-pin where delivered content mounts. This is a Campaign-shape change under the Doc Sync Contract.

### `admin-suy.11.2` release.playtest: full campaigns on the browser and Steam (Electron) builds, with owner sign-off, not self-certification

- **Status:** open · P0 · task
- **Reconciled (October 18, 2026), owner decision still open:** leave open. Checked against: find docs -iname '*playtest*' returns nothing; BL-75 still "open" at BACKLOG.md:971.
- **Owner:** the owner, after the map-first program's W9 (no parent: `admin-owca.7.4` closed 2026-10-10)
- **Missing:** no playtest protocol document and no owner sign-off record exist.
- **Acceptance:** the protocol is documented and run with findings logged in `docs/BACKLOG.md`; the owner has personally played a full campaign on the browser and the Electron builds and signed off; blocking findings are fixed and retested; self-certification is not a pass.
- **Evidence:** none yet.
- **Blocked by:** BL-75 (the rebuilt player has to pass its own acceptance first).

**Description.** Define and run the playtest protocol: full campaigns to a term horizon on the browser build and the Electron/Steam build (`docs/DECISIONS.md` §8.1), across Democratic, Republican and Independent foundings, at phone and desktop sizes, checking that decisions feel weighty, consequences connect to causes, the world feels alive and the numbers are legible. The owner signs off and the sign-off is recorded; it is never self-certified. Each map-first wave's live checks feed it; the final run follows W9.

**Notes.** 2026-09-09 reconciliation: one charter (`charter-usa-constitution`) and one cradle (CRADLE-POTOMAC), at least two founding personas, and both a survived and a removed term. 2026-09-25: real play across seeds and strategies; log findings in `docs/BACKLOG.md` and block release on P0 contradictions. 2026-10-10: the browser suite it waited on was deleted with the previous player; it now waits on BL-75.

### `admin-owca.11` WR: world rules and God Mode (deferred to post-ship)

- **Status:** deferred · P2 · epic
- **Owner:** WR (no parent: `admin-owca` closed 2026-10-10)
- **Missing:** free world settings, the paid God Mode entitlement and its suspension of rules.
- **Acceptance:** world settings and God Mode work under `docs/DECISIONS.md` §10 (one seam per rule, status only rises, the engine never reads an entitlement, changes go through `apply`), reached from the one `/settings` row (BL-76), on a grant path the owner has decided (BL-42).
- **Evidence:** `docs/DECISIONS.md` §10; the capability ledger's `enableGodMode` row.
- **Blocked by:** decision BL-42, and the settings screen (W3, BL-69).

**Description.** Free world settings, the paid God Mode, entitlement and suspension. Deferred by decision on 2026-09-28: it stays off launch day.

**Notes.** Children: `admin-suy.8.2` and `admin-3yv.1`, both deferred.

### `admin-suy.8.2` god.omniscience: expose NPC agendas, decision scoring and pending branches under god mode

- **Status:** deferred · P1 · task · gap WLD-21
- **Owner:** WR (parent `admin-owca.11`)
- **Missing:** hidden NPC agendas, NPC decision scoring and the branch structure of a pending decision have no selector or surface under god mode. The leak this item was retitled for in 2026-09 no longer holds against source (below); propose closing that half.
- **Acceptance:** hidden agendas, true stats, in-flight covert activity and NPC decision scoring are all visible under god mode and correctly hidden without it. Revealing information changes no state. Intelligence limits for normal play are proven intact by the same suite.
- **Evidence (re-derived 2026-10-08 at `612d23cf0`):** `NpcScoreTerms` is declared at `packages/engine/src/npc-agent.ts:29`, and nothing in `god.ts` or `packages/player-core` reads it. The phone-era `nation-behavior.ts` and its `driverLine`, `programLines` and `characterAxes` are gone from the tree. NPC act and engagement stamps are recorded as intelligence reads (`npc-agent.ts:633` and `:650`). `explainNpcDecision` (`:656`) has only test callers.
- **Blocked by:** WR and decision BL-42.

**Description.** The intelligence-layer capability: reveal hidden NPC agendas and true stats, expose covert activity in progress, show the NPC agent's own scoring for a decision, and reveal the full branch structure of a pending decision. This is the capability that most needs the engine to have been built inspectably.

**Notes.** 2026-08-10 partial: the omniscience bypass in the read path is done (`hasIntelOnRelationship` short-circuits the intel comparison under god mode, and covert activity nobody caught reads as intelligence, never public). Tests assert that the reveal changes no state and that ordinary intelligence limits hold. Not done: hidden NPC agendas, NPC decision scoring and the pending decision's branch structure.

2026-09-09 and 2026-09-10 reconciliations: they found the NPC government's own weighting terms printed to every player through the phone-era nation behavior reading, a leak rather than a gap, and later half closed (the character axes became intel-gated). 2026-09-23: folded into WLD-21 and rehomed under WR; the gating half is no longer a paid capability. 2026-09-27: verified still open as a god-mode capability.

2026-10-08, against `apps/web` and the current engine: the leak as described no longer exists. The reading that printed the terms is gone, and NPC stamps are recorded as intelligence. One check remains before closing the leak half: confirm that a player without intelligence on a relationship does not see an NPC stamp's terms. The screens that could show them are rebuilt as `/world/nation/:id` and `/record/press` (W7 and W8), so the check runs there. The god-mode exposure stays here, deferred with WR.

### BL-248 Open-matter lifecycle

- **Status:** open (engine, player-core, apps/player).
- **Owner:** scenario harness program.
- **Missing:** answering a memo closes the decision case, not the dispute. There is no view of the disputes the President's decisions left open, and prose-only organizations cannot be retrieved later as entities. Only 23 of 327 scenarios belong to a family and 797 of 878 authored reply flags (90.8%) are read by nothing.
- **Acceptance:** a matter opened by a decision carries opened, escalated, resolved or lapsed with its cause; the Record owns transitions, the Brief shows actionable changes, the Calendar shows deadlines, Executive shows workload by office and country files show bilateral matters. Every flag a reply sets has a reader or the gate fails.
- **Evidence:** assessment finding 3; `packages/content/src/scenario-memory.ts`, `packages/engine/src/scenario-family-lapse.ts`, `packages/player-core/src/calendar/sources-pending.ts`.
- **Blocked by:** nothing.

### BL-249 A declared responsible office for a decision memo

- **Status:** partly landed (content schema, letterhead, audit); open for Executive workload and the authority citation, and for authoring the field on shipped scenarios.
- **Reconciled (October 18, 2026):** Missing: "one shipped scenario (the-rescue-nobody-will-share) declares the field; the rest still use speaker order; Executive workload and authority citation do not read it.". Checked against: python scan of content/corpus/shards: only the-rescue-nobody-will-share (foreign-crisis-000.jsonl) carries it; scenario.ts:595; apps/player/src/decision/letterhead.ts:42.
- **Owner:** scenario harness program.
- **Landed:** `ScenarioDef.responsibleOffice` (a speaker role hint) resolves through `responsibleRole` to a seat in the seated cabinet; `decisionLetterhead` issues from it and prepares under that chair when the chair speaks; `speaker-not-responsible-office` warns when the first cabinet speaker is another office. Tests: `scenario-audit-speakers.test.ts`, `decision.test.ts`. Upgrades may add the field (`ADDED_KEYS`).
- **Missing:** no shipped scenario declares the field yet (speaker order still decides their letterhead); Executive workload by office and the authority citation do not read it (both belong with BL-248's matter ledger).
- **Acceptance:** the shipped scenarios whose first speaker is not the owning department declare the office; Executive workload and the authority citation read it.
- **Evidence:** `apps/player/src/decision/letterhead.ts`; `packages/content/src/scenario-cast-bodies.ts` `responsibleRole`.
- **Blocked by:** BL-248 for the workload half.

### BL-250 Template tier for scenarios assembled from live state

- **Status:** open (design, then content and engine).
- **Reconciled (October 18, 2026):** Blocked by: BL-248. Checked against: BACKLOG.md:2270 BL-244 "Closed: October 17, 2026".
- **Owner:** scenario harness program.
- **Missing:** every dealt scenario is hand-authored. The engine already produces cases, conditions, incidents, assessments and ledgers that casting could bind, but no authored skeleton fills typed slots from one source occurrence.
- **Acceptance:** a pilot class (natural disasters) deals a template scenario from a live source, validated by the same gate, with seeded stable selection, frozen versions in saves, single-owner impact accounting and reviewed compositions. Decision recorded in DECISIONS.md §7.1 that deterministic assembly from audited parts is allowed.
- **Evidence:** assessment finding 4.
- **Blocked by:** BL-244, BL-248.

### BL-253 Scenarios filed in the wrong class

- **Status:** open (content).
- **Owner:** scenario harness program.
- **Missing:** the repair path cannot change a scenario's class. `the-rescue-nobody-will-share` was moved by hand from triumph to foreign-crisis. Candidates reported by writers: `the-broadcasting-choice` (culture) and `the-medical-school-question` (public-health), both filed under triumph. A reviewer pass should list every scenario whose speakers' departments are not in its class's room.
- **Acceptance:** a supported reclass command (shard, index, flags and phrase carriers rewritten together) and every misfiled scenario moved with the owner's approval.
- **Blocked by:** nothing.

### BL-254 Stored fields with no reader

- **Status:** open (world, engine).
- **Owner:** scenario harness program.
- **Missing:** `Person.bio` is generated and stored but only the removed studio console read it, so the registry test for readers fails without it. Remove the field (schema, `bio.ts`, `leader.ts`, `people.ts`, fixtures, metric copy, `SCHEMA.md`) or give it a player reader. A wider dead-code sweep (`knip` over the workspace) is also pending.
- **Acceptance:** the stat-consumer test passes with no studio console; the sweep's findings are fixed or recorded.
- **Blocked by:** nothing.

### BL-255 Public repository

- **Status:** prepared, not applied.
- **Reconciled (October 18, 2026), owner decision still open:** leave open. Checked against: git ls-files shows 4080 tracked dist files, 292 under studio-cli+apps/studio, 30 under .claude.
- **Owner:** owner.
- **Landed in the tree:** the nested-anchor warning is fixed in `PressRow`; the root and `scripts/` READMEs are public-facing; 18 internal gates, the cover-lock and reference-set code and tests are deleted; the authority-source fixtures and an issued-report fixture moved into the packages and `scripts/fixtures`.
- **Missing:** untrack the internal set (agent tooling, planning docs, `content/`, `studio-cli`, `apps/studio`, secrets scripts) and every `dist/`; rewrite CI; scrub personal paths and the 1Password reference; one clean-copy build, typecheck, lint and test run; then a single initial commit force-pushed over the GitHub repository and set public. The scratch run of this plan built, typechecked and linted clean, and its only test failures were the ones fixed above.
- **Acceptance:** a fresh clone builds and passes; nothing internal is tracked.
- **Blocked by:** BL-252 and BL-254.

### BL-256 The decision memo leads with the wrong paragraph

- **Status:** open (apps/player).
- **Owner:** universal player program.
- **Missing:** `lede()` in `apps/player/src/decision/Situation.tsx` puts one paragraph on the memo's face: the first beat the narrator speaks, else the standing context. In 144 of 330 shipped scenarios the narrator's first line is not the first beat, so the memo opens on a later and often reactive line ("Members of the other party are already rehearsing...") and the beats that say what happened sit behind the Background tab.
- **Acceptance:** the memo face states how the situation came about and what happened before any reaction (the standing context and the incident beat, or every opening beat in order); a test covers a scenario whose narrator speaks last; seen on the running player at 390 and 1440.
- **Evidence:** `the-ruling-at-sundown` as shipped; the count from a corpus scan on 2026-10-17.
- **Blocked by:** nothing.

### BL-257 Craft and plain-language pass over the corpus

- **Status:** open (content).
- **Owner:** scenario harness program.
- **Missing:** the alignment repairs (BL-252) fix what the audit measures and nothing else, so audit-clean scenarios still drop the reader mid-story, have no person at stake, make the honest answer free, restate the premise under "If you wait", list unknowns that change nothing, and use insider words (directorate, collection, exchanges, stay, warrant, contempt). The owner's bar: open on how the situation came about; put a person in it; every answer costs something real; "If you wait" names a concrete consequence; "What we don't know" is an unknown that changes the choice; plain words a layman reads.
- **Acceptance:** a written craft rubric with these tests used by every writer and reviewer; every shipped scenario passes it in an independent review; `the-ruling-at-sundown` (rewritten 2026-10-17) is the reference example.
- **Blocked by:** nothing; runs alongside BL-252's review.

### BL-258 Name the real agencies, courts and places

- **Status:** partly landed.
- **Owner:** scenario harness program.
- **Landed:** commit `4e206d563`: the invented-name rule accepts every body in the engine's institution catalog, every US state and every dataset city; `unplaced-city-name` keeps a field week's named city bound to the map; the writer brief says to name the real agency and the court that rules. Commit `fad13fe22`: `{{opposition}}`, `{{oppositionAdjective}}`, `{{caucus}}`, `{{caucusAdjective}}`, and the audit refuses "the other party".
- **Missing:** the shipped corpus still carries invented stand-ins (for example "security directorate" 6, "the border service" 3, and generic "the agency" and "intelligence service" lines that may mean a US body); the 12 scenarios that write `{{judiciary}}` render "the Federal Judiciary", which is the court system's formal name but never the body that rules; `the-last-building-on-the-block` trips `unplaced-city-name`.
- **Acceptance:** every US body, court and place in shipped prose is named as it is in reality (FBI, NSA, FEMA, a federal appeals court, the Supreme Court, the city and state), or bound through a token that renders it; a corpus scan for the stand-in phrases returns nothing.
- **Blocked by:** nothing; folds into BL-257's rewrite.

### BL-259 Reality check: legal and process accuracy

- **Status:** open (content).
- **Owner:** scenario harness program.
- **Missing:** scenarios can be well written and still wrong about how the government works. `the-ruling-at-sundown` (2026-10-17 review) has an NSA recording every call in three cities (the real programs collected records, not content, and a domestic program would be FBI-led); the NSA briefed through Homeland Security instead of the DNI and the Defense Secretary; a three-hour court deadline (courts set compliance windows); officials refusing to stop rather than refusing to continue without written authority; "emergency powers" that let a President set a court order aside (no statute does); a warrant that cannot come before morning, when the Attorney General can authorize emergency surveillance at once and apply to the court afterward (FISA, 50 U.S.C. 1805(e); to verify against the statute); and a plaintiff whose standing would be hard to show. The realistic dilemma is that the emergency warrant rests on the program just ruled illegal.
- **Acceptance:** a reality-check step in the review (who in the real government acts, under what authority, on what timetable, by what process), with citations verified against primary sources and recorded on the item; `the-ruling-at-sundown` rewritten to the realistic version and reviewed; the step applied to every scenario whose prose turns on a legal process or a named agency.
- **Evidence:** the 2026-10-17 reality check in this session; precedent *ACLU v. Clapper* (2d Cir. 2015) and the USA FREEDOM Act (2015), both to verify.
- **Blocked by:** nothing.

## Carried from the 2026-10-01 person-behavior handoff

Open work and the parking lot of the person-behavior handoff. W0 and W1 of that program are committed at `612d23cf0`. Its design and handoff (the person-behavior audit folder) were deleted in W0 (`1211e624e`); read them from `1211e624e^` for the section numbers cited below. The handoff's dossier rebuild (BL-3) and foreign-action workspace (BL-4) closed on 2026-10-10 as superseded screens.

### BL-2 Person behavior W2 and the program close-out

- **Status:** in progress; graft source implements annual department purchasing opportunity, saved original-actor attribution and IG disclosure; integrated privacy and balance proof pending
- **Reconciled (October 18, 2026):** Acceptance (1) done. Missing: "(2) colleague backing in counsel (C4); (3) dossier copy for graft and new behaviors; (4) docs/registry; (5) person-behavior-balance.test.ts; gate record, test:balance, NPC-world on/off comparison (scripts/dev/zz-npc-world-seeds.mjs never committed), adversarial review." Blocked by nothing. Checked against: packages/engine/src/cabinet-graft.ts (steer-contracts at :84-85) from 2076406a5 (ancestor), disclosure journey 80935f80a; no person-behavior-balance.test.ts, no docs/audits/*person-behavior* dir, no graft line in attribute-consequence.ts.
- **Owner:** the person-behavior program, coordinated with BL-112
- **Missing:** W2, the program's gate record and an independent review.
- **Acceptance:** (1) WS-D graft: `steer-contracts` (the design's §5 D3) in a new `cabinet-graft.ts`, run in the cabinet agenda week, concealed until an inspector general finds it through `inspectors-general.ts`, the finding naming the person who steered. (2) WS-C colleague backing in counsel (§5 C4) behind its band. (3) Dossier copy: `attribute-consequence.ts` lines for every new behavior (the foreign-leader lean now includes the starting leader; trait effects on foreign leaders; deference, principle, boldness and craft effects per seat), with any restated constant added to `verify-person-consequence-alignment` and to `CLAUDE.md`'s person-consequence list. (4) Docs and the authored-field registry. (5) A `person-behavior-balance.test.ts` carrying the design's §7 rows. Then the full `CLAUDE.md` gate in order, `test:balance`, the NPC-world comparison with personality on and off, `measure-performance` (p50 up 2 ms at most), and an independent adversarial review of the whole program. Effect sizes are reported as measured; no weight is tuned to a band edge.
- **Evidence:** `612d23cf0` (W0 and W1); the handoff's NPC-world table (15 seeds × 104 weeks).
- **Blocked by:** nothing.

**Description.** The program's gate record is a single file, never a `gates/` directory, so it can't be mistaken for a map-first wave's record by `verify-wave-closeout` (BL-24). Its old folder is deleted; write it as `docs/audits/<date>-person-behavior/gate.md`.

The war-length result needs validation at more seeds: the new-war median length moved from 9 to 15 weeks with personality on, which trips the design's ±2-week rejection rule on paper, but it rests on 4 against 5 different wars, and "on" sits inside the harness's own 10-20-week band while "off" sat below it. The seed-configurable personality-off probe the handoff used (`scripts/dev/zz-npc-world-seeds.mjs`) was never committed, so the comparison needs a way to switch personality off again.

### BL-5 Person-behavior WS-D measurements sit at their band edges

- **Status:** open
- **Owner:** the person-behavior program (with BL-2's balance rows)
- **Missing:** the initiative count runs high on one seed (32 a term against an 8-30 band, median 24), and the Hill advocate's spread sits at the band floor (about 1.07 points). Measured, not tuned.
- **Acceptance:** BL-2's balance test carries both rows, and both sit inside their bands across the seed set, or the bands are revised with a stated reason.
- **Evidence:** the handoff's parking lot.
- **Blocked by:** BL-2.

### BL-6 `committees.ts` says "a third of the way" while `PANEL_GRAVITY` is 0.5

- **Status:** open
- **Reconciled (October 18, 2026):** Evidence: committees.ts:238 and :269. Fix is to change the comment to "halfway" (constant is justified in the :232-237 comment), no balance run needed. Checked against: packages/engine/src/committees.ts:238 PANEL_GRAVITY = 0.5; comment at :269 says "a third of the way".
- **Owner:** engine
- **Missing:** the doc comment at `packages/engine/src/committees.ts:268` says a panel pulls a third of the way from the room's position; `PANEL_GRAVITY` at `:237` is 0.5 (re-checked 2026-10-10).
- **Acceptance:** the comment and the constant agree, and if the constant is the one that is wrong, the balance harness is run.
- **Evidence:** `committees.ts:237` and `:268` on `feat/map-first`, 2026-10-10.
- **Blocked by:** nothing.

### BL-7 Re-check whether `Person.affiliation` is authored but unread

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** owner decides delete vs owe. Checked against: packages/world/src/schemas/person.ts:84; packages/world/src/dataset/stat-consumers-people.ts:207 owedBy text; cabinet-alignment.ts:242, cabinet-faction.ts:105,151,237 read only the runtime badge.
- **Owner:** engine and world
- **Missing:** the handoff says the authored `Person.affiliation` (`packages/world/src/schemas/person.ts:84`) is read by nothing and asks the owner to delete it or owe it. The engine does read a runtime affiliation: `cabinet-alignment.ts:242` turns any affiliation into a rival break, and `cabinet-faction.ts:105`, `:151` and `:237` read, set and clear it. Whether the authored field seeds that runtime value is what has to be checked.
- **Acceptance:** either the authored field reaches the runtime affiliation and the registry (`stat-consumers.ts`) names that consumer, or the field is deleted with SCHEMA and ARCHITECTURE updated under the Doc Sync Contract.
- **Found 2026-10-10:** `docs/SCHEMA.md:115` already records the answer to the first half: `Person.affiliation` is registered with a `readBy` saying the authored field is read by nothing, because the rules read the runtime badge (`PersonRuntime.affiliation`, written when a cabinet challenge forms). What is left is the decision: delete the authored field, or owe it a reader.
- **Evidence:** the lines above at `612d23cf0`.
- **Blocked by:** nothing.

### BL-8 The dossier says governor integrity is unread, but the engine reads it

- **Status:** open
- **Reconciled (October 18, 2026):** Evidence/Missing: governors.ts:425; the wave tag (W6/BL-72) is closed (BACKLOG.md:2441), drop it. Checked against: packages/engine/src/governors.ts:425 reads person.base.integrity (was :412); attribute-consequence.ts:207,225,245,265,281 governor: NO_READER.
- **Owner:** player-core dossier
- **Wave:** W6 (the person screen, BL-72)
- **Missing:** `packages/engine/src/governors.ts:412` reads `person.base.integrity` into the governor's character term, and `packages/player-core/src/dossier/attribute-consequence.ts` still gives `governor` the no-reader text for every attribute (`:207`, `:224`, `:243`, `:262`; re-checked 2026-10-10).
- **Acceptance:** the dossier describes what integrity does for a governor, and `verify-person-consequence-alignment` holds.
- **Evidence:** `governors.ts:412` at `612d23cf0`; the handoff's parking lot.
- **Blocked by:** nothing.

### BL-9 The Chief of Staff and Press Secretary dossiers don't describe their real effects

- **Status:** open
- **Owner:** player-core dossier
- **Wave:** W6 (the person screen, BL-72)
- **Missing:** the two dossiers do not say what the roles actually do in the engine (the Chief of Staff's triage, the Press Secretary's discipline and podium).
- **Acceptance:** each dossier names its role's engine effects in plain words, read from the engine rather than restated.
- **Evidence:** the handoff's parking lot.
- **Blocked by:** nothing.

The handoff's last two parking items: the failing `units.test.ts` for `military.arsenal.declared` is part of BL-20; the session probe `scripts/dev/zz-npc-world-seeds.mjs` was never committed, so there is nothing to delete.

## Carried from docs/PLAN.md and plan.md

### BL-10 Steam App ID and Auto-Cloud setup

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** owner. Checked against: apps/desktop/forge.config.ts:17 only filters steam_appid.txt; apps/desktop/src/steam.ts:29 init(appId?) takes an optional id.
- **Owner:** the owner (account setup, not code)
- **Missing:** the packaged Electron app has no Steam App ID, and Auto-Cloud is not configured. Steamworks stays optional in Electron main.
- **Acceptance:** an App ID registered and wired into the desktop build's configuration through the existing secret launchers; Auto-Cloud configured for the save directory (`userData/saves/`); a packaged build seen to sync a save.
- **Evidence:** the follow-up list in `docs/PLAN.md` before its map-first rewrite (`1211e624e^`); `docs/DECISIONS.md` §8.4 (Steam is additive).
- **Blocked by:** the owner.

### BL-11 Record provenance graph

- **Status:** open
- **Reconciled (October 18, 2026):** Status: partly landed. Missing: "gaps shown as gaps" not demonstrated and producers still lack causeIds (BL-77); prove on the running player at 390 and 1440. Checked against: apps/player/app/(game)/record/event/[id].tsx; apps/player/src/record/RecordDetail.tsx:122-132 Chain (causes, roots, downstream count).
- **Owner:** the map-first program
- **Wave:** W8 (BL-74)
- **Missing:** the Record cannot draw where an entry came from as a graph of causes.
- **Acceptance:** `/record/event/:id` (`docs/DESIGN.md` §2, "cause link and downstream links") opens the chain of causes the engine stamped for the entry, with gaps shown as gaps. Depends on producers supplying `causeIds` (`admin-917f`, now under BL-77).
- **Evidence:** the follow-up list in `docs/PLAN.md` before its map-first rewrite (`1211e624e^`).
- **Blocked by:** `admin-917f`'s sweep, for depth.

### BL-12 Controller focus layer

- **Status:** open
- **Owner:** unassigned (desktop and Steam)
- **Missing:** the player cannot be driven with a game controller.
- **Acceptance:** every route can be navigated and every act committed with a controller through one focus layer, without a second navigation model.
- **Evidence:** the follow-up list in `docs/PLAN.md` before its map-first rewrite (`1211e624e^`).
- **Blocked by:** nothing.

## Re-verify against source

### BL-1 The vitals money edge was never built

- **Status:** open
- **Owner:** engine (the vitals coupling)
- **Missing:** `admin-3pt5.5` (vitals.coupling-phase: prices, jobs and crime move each other, with the money edge waiting for budget authority) was folded into W4 4A.2 and closed with it, but the money edge was never built. The chain is growth → city employment and `taxBase` drift → `budgetPhase` forgone receipts, plus an audit rule refusing a tax holiday that is billed twice. The city drift moves only `adminLean`.
- **Acceptance:** growth moves each city's employment and tax base over turns; the budget reads the city tax base, so a holiday or a slump shows as receipts forgone; an audit rule refuses content that bills a holiday twice; the balance harness is run, and the Doc Sync Contract is honored if a scoring constant or the engine's contract moves.
- **Evidence (re-checked 2026-10-10):** `packages/engine/src/cities.ts`, where the drift writes only `deltas: { adminLean: delta }` (`:149`); `budget.ts` reads no `taxBase`.
- **Blocked by:** nothing. Unblocks the folded `admin-k5j.8.9` convergence under `admin-owca.6.6`.

### BL-14 Re-verify the 34 beads folded into W4 when it closed mid-flight

- **Status:** open
- **Owner:** the next reconciliation
- **Missing:** on 2026-09-28 the one-backlog pass folded 34 open beads into the W4 key beads, and those keys closed on their commits when the owner stopped W4 mid-flight. Each key's own scope was gated; the folded scope was never checked bead by bead.
- **Acceptance:** each id below is checked against source at the branch tip. Where its scope holds, the evidence goes into `## Closed`; where it does not, a BL item takes the residual. `admin-3pt5.5` is already BL-1. Only engine and player-core scope needs checking: the screen halves (case components, the live map's per-territory support, election night, the Congress room, surfaces for the statute book and the pulse) were in the player W0 deleted, and their screens are in `docs/DESIGN.md` §2.
- **Evidence:** the W4 gate record §1 (the keys and their commits; deleted in `1211e624e`, read it from `1211e624e^`).
- **Blocked by:** nothing.

The ids, by the W4 key that carried them:
- 4H-finish (`admin-owca.5.1`, `790c82062` and `4a1c54a36`): `admin-k5j.7` durable presidential cases and explicit inaction; `admin-k5j.7.3` frozen cases persist safely; `admin-k5j.7.4` the director raises frozen authored cases; `admin-k5j.7.6` delegation (authority, capacity, obligations, callbacks); `admin-k5j.7.9` the case proof gates (contract, source unification, no silent skip); `admin-3go.15` a due fuse reaches the President through the attention queue, not a second slot.
- 4A.2 (`admin-owca.5.2`, `3b1d257f4`): `admin-3pt5.5` the money edge (BL-1); `admin-u7t.7` a standing commitment is rationed the way the budget is; `admin-uv1i.19` the balance harness votes a budget.
- 4E.1 (`admin-owca.5.4`, `3b1d257f4`): `admin-ij4` the press battlefield (outlets with minds, content reads them, the room says why); `admin-ij4.4` content can gate on what the press is doing; `admin-ij4.6` why each masthead sits where it does; `admin-d7gi.11` press causality; `admin-po1d.15.1` the President's own acts reach the wire.
- 4F.1 (`admin-owca.5.6`, `3b1d257f4`): `admin-5t8` a minister's record of contested calls on the person file; `admin-d7gi.20` competence has downward pressure; `admin-tvqm` a President can break up a bloc they have lost.
- 4F.2 (`admin-owca.5.7`, `4a1c54a36`): `admin-d7gi.27.3` case components; `admin-d7gi.9` the Program noun retired and the OMB discount surfaced; `admin-k5j.7.5` institutional case families (bills, nominations, budget, emergencies, world requests); `admin-k5j.7.8` one queue, one disposition grammar, one continuation preview.
- 4I.1 (`admin-owca.5.8`, `ae1b76291` and `4a1c54a36`): `admin-nny.8` per-territory support on the live map; cities and named places appear in play.
- 4I.2 (`admin-owca.5.9`, `3b1d257f4`): `admin-po1d.10.4` the other side of a foreign crisis is a country, not a person.
- 4J (`admin-owca.5.10`, `ae1b76291` and `4a1c54a36`): `admin-39z.3` an election result and a term ending reach a surface; `admin-39z.6` the statute book reaches a surface; `admin-3pt5.9` state and city dossiers show the pulse; `admin-72i.20` the decision memo shows how a domestic act splits the caucuses; `admin-d7gi.8` the Congress room draws the chamber, and the Executive accepts a subject; `admin-nny.2` milestones on the campaign with a milestone condition; `admin-po1d.15.6` election night as a ceremony.
- sync-balance (`admin-owca.5.11`, `ae1b76291`): `admin-3pt5.10` the vitals are winnable and losable (its "three eras" premise is superseded by D1's one start); `admin-k5j.7.10` bounded case workload and finishable terms; `admin-suy.11.1` balance for fun as well as realism; `admin-xcn7` the careful proxy no longer spends a fixed share of the current treasury every turn.

**Two more checks from the same reconciliation:**
- `admin-hijs` (Iran's missile and proxy reach) is **built**, in 5A rather than 5E: `468364952` added `packages/engine/src/missile-reach.ts` (one sourced operational range per government), and the proxy half already existed as `proxyReach` in `standoff-strike.ts`. Prove it in the proof run under `admin-owca.6.6`. One prune candidate in BL-38 lists `standoff-strike.ts` as reached only by tests; check whether `missile-reach.ts` replaced it before deleting either.
- `admin-3yv.1` is **deferred, not closed**. Its entry is under "Open".

## Found by the 2026-10-08 cleanup

### BL-17 Reach fiscal strain through play and show the fiscal attention rows

- **2026-10-10 (W5, `d2e3efbda`):** the three rows are built in `attention-fiscal.ts` (rating cut since the oath, borrowing rate up 25 bp in 13 weeks, interest past a quarter of revenue), with tests. Still owed: a fixture that reaches the strain through play (an investment-program run), and its e2e.

- **2026-10-10 (W4) source check:** `player-core/src/desk/attention-fiscal.ts` builds none of the three rows this item names (rating cut, coupon jump, interest share); it builds the negative-outlook and debt-limit rows as background notices, and says the missing rows need history the engine does not keep. Re-scope before building: either the engine keeps that history (engine item) or the rows are dropped.

- **Status:** open
- **Reconciled (October 18, 2026):** Status: open. Missing: no fixture under scripts/fixtures reaches a rating cut, a 25 bp coupon jump or interest past a quarter of revenue through the engine, so the three built rows are only unit-tested. Acceptance: add that fixture (walk seeds as decision-critical.mjs does) and show the three rows on the player's /brief. Drop the W5/BL-70 wave wording and the 2026-10-10 W4 "re-scope" paragraph. Checked against: `packages/player-core/src/desk/attention-fiscal.ts:95-149`; `ls scripts/fixtures` has no fiscal/rating fixture; `/brief` route exists at apps/player/app/(game)/brief/index.tsx.
- **Owner:** engine fixtures and player-core's attention rows
- **Wave:** W5 (fiscal screens, BL-71), after the re-scope
- **Missing:** `packages/player-core/src/desk/attention-fiscal.ts` builds three attention rows: a rating cut since the oath, the coupon market rate up 25 basis points or more in 13 weeks, and interest passing a quarter of revenue. No fixture reaches the strain through play; the old stub sealed the oath under its own seed and stopped, and was deleted on 2026-10-08.
- **Acceptance:** a fixture under `scripts/fixtures/` reaches a rating cut and a coupon jump of 25 basis points or more through the engine (walking seeds as `decision-critical.mjs` does), never by writing the record; `/brief` shows all three rows on it; the W4 task suite asserts them.
- **Evidence:** `attention-fiscal.ts` and its test; `scripts/fixtures/decision-critical.mjs`.
- **Blocked by:** nothing for the fixture; BL-70 for the screen.

### BL-18 Write `-proof` twins for the gates that have none

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: four gates have no proof twin: verify-disposition-readers, verify-locus-ground, verify-map-registration, verify-trade-measure-kinds (map-registration's own comment says it has no available failing fixture). Inline-fixture gates left to confirm: adhoc-color-lint, boundary-lint, resolution-beat-reachability, us-units, wire-bank-collapse (publish-gate and shipped-content-parses are gone). Evidence: `ls scripts/verify-*.mjs` at 84e7e85d7. Checked against: `git show --name-status 8caf5b441` (D verify-doctrine-metric-alignment.mjs, verify-publish-gate.mjs, verify-shipped-content-parses.mjs); `ls scripts/verify-{disposition-readers,locus-ground,map-registration,trade-measure-kinds}*` -> one file each, no -proof; DECISIONS.md:624 (12.4).
- **Owner:** scripts
- **Missing:** five gates have neither a `-proof` twin nor an inline fixture that proves they can fail: `verify-disposition-readers`, `verify-doctrine-metric-alignment`, `verify-locus-ground`, `verify-map-registration` and `verify-trade-measure-kinds` (re-checked 2026-10-10; the other two on the original list, `verify-decision-legacy` and `verify-image-provenance`, were deleted in W0). `docs/DECISIONS.md` §12.4 makes a twin the rule for new gates.
- **Acceptance:** each has a proof that plants the defect it exists to catch and fails on it, in this order: web-boundary first, then the other five. Seven more gates without a twin carry inline fixtures (`adhoc-color-lint`, `boundary-lint`, `publish-gate`, `resolution-beat-reachability`, `shipped-content-parses`, `us-units`, `wire-bank-collapse`); confirm each of those fixtures can fail while writing these.
- **Evidence:** `ls scripts/verify-*.mjs` on `feat/map-first`, 2026-10-10.
- **Blocked by:** nothing.

### BL-27 Decide what CI runs when pushing resumes

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: balance-harness.yml has never been on main; main still holds the deleted-on-branch branch-protection-check.yml and sync-pages.yml. Blocked by: the owner's decision to promote staging to main. Checked against: `git ls-tree --name-only origin/main .github/workflows/` -> branch-protection-check.yml, rebuild-ci.yml, sync-pages.yml; `ls .github/workflows` -> balance-harness.yml, rebuild-ci.yml. Whether workflows are still disabled on GitHub: unverified (no network).
- **Owner:** the owner
- **Missing:** every GitHub workflow has been disabled manually since 2026-09-27. The balance harness has never fired on its schedule, because a schedule runs only from the default branch and the workflow is not on `main`. Main's older branch-protection check failed every week from 2026-08-17 to 2026-09-21; the cleanup deletes it (D17).
- **Acceptance:** when the no-push rule lifts, the workflows the project wants are re-enabled, `balance-harness.yml` reaches `main`, and one run of each is seen green.
- **Evidence:** the workflow states read by the audit on 2026-10-08.
- **Blocked by:** the end of the no-push rule.

### BL-28 Correct ARCHITECTURE's measured weeks, and plan its split

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: ARCHITECTURE.md:527 says "1,040 measured weeks" for a 5-seed x 104-turn run (520 weeks); the file is 2,192 lines. Evidence line numbers updated. Checked against: `grep -n "measured weeks" docs/ARCHITECTURE.md` -> :527 "1,040 measured weeks"; `wc -l` 2192; npc-world.probe.test.ts:37 SEEDS = 5, :38 TURNS = 104.
- **Owner:** docs
- **Missing:** `docs/ARCHITECTURE.md:469` says "1,040 measured weeks" for a measurement of 5 seeds × 104 turns, which is 520 weeks. The file is 1,736 lines after the W0 rewrite (re-checked 2026-10-10).
- **Acceptance:** the figure is corrected from the measurement's source; a split of the file is proposed along its sections, keeping the Doc Sync Contract's references valid.
- **Evidence:** `docs/ARCHITECTURE.md:469` on `feat/map-first`, 2026-10-10.
- **Blocked by:** nothing.

### BL-29 Re-measure the corpus rates in CONTENT_DOCTRINE

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: rates measured 2026-09-02 on 303 scenarios; corpus is 327 at revision 23. Evidence: the two lines above. Checked against: docs/CONTENT_DOCTRINE.md:7 ("all 303 shipped scenarios"); docs/audits/2026-10-14-worktree-reconciliation/PUBLICATION.md:5 (327 corpus scenarios).
- **Owner:** the content lead
- **Missing:** `docs/CONTENT_DOCTRINE.md`'s corpus rates were measured on 2026-09-02 against 303 scenarios; the corpus is now 322 (bundle revision 21).
- **Acceptance:** each rate is re-measured on the current corpus with its date, or marked as dated.
- **Evidence:** `4619c8a54` (bundle revision 21: 322 scenarios across 18 shards); `docs/CONTENT_DOCTRINE.md:7` still cites the 303-scenario measurement (re-checked 2026-10-10).
- **Blocked by:** nothing.

### BL-30 One `Confidence` type

- **Status:** open
- **Reconciled (October 18, 2026):** "moderate" | "high"'`: engine/state-legislature.ts:237, engine/intelligence.ts:168, engine/projection-record.ts:10 (ForecastConfidence), content/scenario-report.ts:23, player-core/security/collection-reading.ts:80; the one type is assessments.ts:38 | Missing: the confidence union is redeclared as literals in state-legislature.ts:237, intelligence.ts:168, projection-record.ts:10 (ForecastConfidence), scenario-report.ts:23 and collection-reading.ts:80 beside assessments.ts:38; impact-event.ts:66 and state-world.ts:109 use a different "medium" union (decide if that is a second type). Checked against: `git grep '"low".
- **Owner:** engine
- **Missing:** the confidence union (`"low" | "moderate" | "high"`) is redeclared as literals in `packages/engine/src/state-legislature.ts:238`, beside `Confidence` in `assessments.ts:38`, and no gate refuses another copy. The second copy this item named, in `apps/web/src/press/Podium.tsx`, was deleted in W0 (re-checked 2026-10-10).
- **Acceptance:** `state-legislature.ts` imports the one type; a lint or gate refuses a redeclaration, so the rebuilt player can't add one.
- **Evidence:** the lines above, 2026-10-10.
- **Blocked by:** nothing.

### BL-34 Delete two brand rasters nothing loads

- **Status:** open
- **Owner:** assets
- **Missing:** `assets/player/brand/loading-backdrop.webp` and `assets/player/materials/overlays/paper-fiber-overlay.png` reached the old bundle only through an eager glob in `apps/web/src/media/`, which W0 deleted. On 2026-10-10 no code names either file; only `assets/player/brand/README.md:30` describes the backdrop (`--ui-texture-paper-fiber` in `packages/design/src/tokens.css:213` is an inline SVG, not the PNG).
- **Acceptance:** each is drawn by a rebuilt surface or deleted, with the README row.
- **Evidence:** `git grep -n 'loading-backdrop\|paper-fiber-overlay'`, 2026-10-10.
- **Blocked by:** nothing.

### BL-35 Wire or delete the W5 readings that never got a screen

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: still without a production caller: rungFiscalEffects (act-prices.ts:35), boardPanelsReading (world/board-panels.ts:109), selectInheritedWorld (engine/opening-world.ts:405). Wired since: foreignPressReading, foreignLeadershipReading, projectEngagement. Re-check selectCohortTurnout (used by demos.ts). Drop the "W7/W8" wave names. Checked against: `git grep -nw` results: rungFiscalEffects only act-prices.ts:35; boardPanelsReading only board-panels.ts + tests; selectInheritedWorld only opening-world.ts + test; foreignPressReading press-board.ts:292.
- **Owner:** player-core, with the map-first wave that owns each screen
- **Missing:** `scripts/engine-internal-readings.json`, which forgave W5 readings "until the workstream draws", was deleted in W0a (`1c2089461`). The readings it forgave still have no production caller on 2026-10-10: `rungFiscalEffects` (`packages/player-core/src/economy/act-prices.ts:35`), `boardPanelsReading` (`world/board-panels.ts:109`) and `foreignPressReading` (`press/foreign-coverage.ts:62`) are reached only by their tests. Its other held-until-drawn entries (`foreignLeadershipReading`, `projectEngagement`, `selectInheritedWorld`, `selectCohortTurnout` and others) are in the same position; the full list is in `1c2089461^`.
- **Acceptance:** each is consumed by its screen (the act workspace's price preview in W7, the World board in W7, `/record/press` in W8), proven live, or deleted with its export.
- **Evidence:** the lines above; `git show 1c2089461^:scripts/engine-internal-readings.json`.
- **Blocked by:** nothing.

### BL-36 `.git` housekeeping

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: `.git/cursor` (17 MB) and `.git/lost-found` (2.6 MB) still present; 26 loose objects; 790 MiB packed. Evidence: those commands 2026-10-18. Checked against: `git count-objects -vH`; `du -sh .git/lost-found .git/cursor`.
- **Owner:** the owner
- **Missing:** 243 loose objects (23.6 MiB), a `lost-found` from July and 17 MB of Cursor data sit in `.git`.
- **Acceptance:** `git gc` run after the ref pruning in BL-48, never while a gate is running; the Cursor data and `lost-found` reviewed and removed if unneeded.
- **Evidence:** the audit's `git count-objects` on 2026-10-08.
- **Blocked by:** BL-48.

### BL-38 Unconfirmed prune candidates

- **Status:** open
- **Reconciled (October 18, 2026):** wc -l`=152, `git ls-files | grep -c 'dist/.*\.test\.'`=1522 | Rewrite: remove candidates 16 and 23 (and 14's verify-dist-freshness clause), annotate 22 with the sim/play.ts caller; keep the rest. Checked against: commands in this pass: `git grep advanceTurn`, `ls`, `git ls-files packages/ui-web/dist.
- **Owner:** the next cleanup pass
- **Missing:** the audit found these but did not act, because each needs one more check first. Each line says what would confirm it.
- **Acceptance:** each candidate is either done, with the confirmation recorded, or dropped with a reason.
- **Evidence:** the audit's deferred list, 2026-10-08.
- **Blocked by:** as listed.

The candidates:
1. **Present-tense nation counts in ARCHITECTURE and SCHEMA.** (The line numbers below are from before W0 rewrote both files; re-grep.) ARCHITECTURE lines 382, 494, 623, 811, 817, 1139 and 1510 (optionally 805) and SCHEMA lines 195, 449 and 875 state a nation count in the present tense. Confirm: after the cleanup's doc edits land, check each line is still present tense. Leave the dated lines 500 and 913, and every use of fifty states, fifty-two offices or fifty seeds.
2. **Status lines for two research docs.** `docs/research/TRADE-CALIBRATION.md` ("Source record for trade-sectors.ts") and `COUNTRY-DEPTH-SCORING.md` ("partly applied": the score chose the eleven nations after Australia; its tiers were not adopted). Confirm: re-read `nations.ts:20` and `:2349` and `trade-sectors.ts:15`.
3. ~~**Status lines for three accepted decision records.**~~ Moot: the records were deleted in W0 (`1211e624e`); their still-valid rules are in `docs/DECISIONS.md`.
4. **The no-push rule in `CLAUDE.md`, and the merge-history claim.** Add the no-push rule, and correct "Staging's history is merge commits" (only 6 of 63 first-parent commits are merges). Confirm: the owner wants a rule that lives only in memory committed to `CLAUDE.md`.
5. **SCHEMA §1 index rows for twelve schema files** (background, cohort, district, election, face, face-code, flag, force-asset, leader, leader-constraint, platform, state-hazards). Confirm: run `grep '^export const'` per file and map each export to its existing section; write new prose only for the FACE_* and LeaderSeat and LeaderSex exports, after checking §5c-i.
6. **Tracker-sense "ticket" wording in code.** `reference-set.test.ts:51-52`, `demos-boundary-proof.test.ts:9-13`, `instruments-military.ts:37` and `vitals.ts:24`. Confirm: D15 was answered A (tracker ids and tracker wording), which covers these if each "ticket" means a work item, as it appears to; reword each to say what the code owns instead.
7. ~~**A tracker-id rule in `verify-no-legacy-runtime`.**~~ Moot: `verify-no-legacy-runtime` is deleted; `verify-no-history-references` carries the bead-id pattern (PROGRAM.md W0b step 5).
8. **Three one-shot prose scripts.** `scripts/patch-corpus-prose.mjs`, `report-prose-findings.mjs` and `report-shorthand-passages.mjs` (the August prose pass; no references). Confirm: no content workflow still plans to reuse them.
9. **`.claude/settings.json`.** Its PostToolUse hook reads an environment variable that is never set, its `mcpServers` block is not loaded, and its allow list is empty. Confirm: the user-level JSON validation hook covers this repo, and the owner does not want the Playwright MCP here (if they do, add it to `.mcp.json`).
10. **The orchestrator agent's mandatory chain.** `.claude/agents/orchestrator.md:37` makes the full specialist chain mandatory, against `CLAUDE.md`'s delegation rule. Confirm: the owner's delegation preference; then use "Dispatch only the specialists a task needs, and only when the user has authorized delegation; name any stage you skip and why."
11. **Editor and MCP leftovers.** Rebind `.cursor/mcp.json` (its legacy unbound `construct-mcp` entry) after BL-46; in `.vscode/settings.json`, stop disabling `.claude/agents` and drop the `construct.config` associations; remove the empty `.github/agents`, `.github/prompts` and `.codex/agents`. Confirm: decision BL-45 and the owner's editor use.
12. **Baseline-forgiven exports reached only by tests.** Confirm per symbol with `git grep -lw`, with the matching doc edits in SCHEMA and ARCHITECTURE (the old line numbers predate the W0 rewrite). Keep `createMemoryStorage` (a shared test helper), `selectCity` and `selectFamilyRun` (fixture oracles) and the causality family (decision BL-43). `selectInquiriesFor` and `committeeIsInvestigating` go together or not at all.
13. **About 80 engine functions reached only by tests** and outside the reachability gate's naming pattern. Confirm: triage with LSP find-references. Delete the lost features (`materialDecisionGate`, `bundlePolicyStance`, `standoff-strike.ts` once checked against `missile-reach.ts`, `case-automation.ts`, the metric-registry helpers, `runNpcTurn` and others) and update `scripts/rule-seam-census.json` in the same change; keep the invariant constants tests rely on.
14. **Stop tracking `packages/ui-web/dist`** (158 files on 2026-10-08, 42 after the W0 deletion; its exports point at `src`). Confirm: no consumer resolves `ui-web` through `dist`; then switch its build to `noEmit` and drop it from `verify-dist-freshness`'s project list.
15. **Stop emitting compiled tests into `dist`** (1,126 files) with per-package `tsconfig.build.json`. Confirm: scripts that import `__fixtures__` from `dist` still resolve, and `verify-dist-freshness` agrees.
16. **A comment in `advance.ts`.** Lines 21 and 27 say "advanceTurn is still the tick"; it may be `tickWeek`. Low confidence. Confirm: the `day-step.ts` call graph.
17. **Collapse `LegacyFoundingFields` into the fixed US founding.** Confirm: as its own reviewed change, with the balance harness, the Doc Sync Contract (the Campaign founding shape) and a save-compatibility check.
18. **Dead flag-bake scripts.** `scripts/bake-state-flags.mjs` and `bake-nation-flags.mjs` write `ui-web` files that do not exist and nothing reads. W0a step 4 re-targeted them to the rebuilt ui-web's asset home, so first check whether anything now reads their output (on 2026-10-10 only the scripts themselves name `STATE_FLAG_PNGS` and `NATION_FLAG_SVGS`). Confirm: that grep stays empty; then also edit `vendor-nation-flags.mjs` (lines 3, 74, 79), `vendor-state-flags.mjs` (lines 3, 111, 115) and `scripts/vendor/*/SOURCE.md`, which tell users to run them, and drop the `bake:nation-flags` and `bake:state-flags` aliases from `package.json`.
19. ~~**Duplicate logo trees and unread design directories.**~~ Moot: W0 deletes `design/` except `brand-kit/logos` and `brand-kit/icons` (PROGRAM.md W0b step 4).
20. ~~**Archive two content audits.**~~ Moot: both were deleted in W0 (`1211e624e`); `docs/CONTENT_DOCTRINE.md:7` now cites the grounding audit as "in git history".
21. ~~**A no-move note for the leader-table audit.**~~ Moot: the table and the seed provenance now live under `packages/world/sources/` (map-first W0a), outside any archive sweep.
22. **`mountDeliveredScenarios` and its delivery state** (`packages/player-core/src/conversation/scripts.ts`). Confirm: decision BL-42 on content delivery and `services/api`; then delete it with `deliveredIds`, `memoryPool(delivered)`, its paragraph in `ARCHITECTURE.md` (`:1259` on 2026-10-10) and the comment at `scripts/sim/corpus-pool.ts:48`.
23. ~~**Exports nothing reads and nothing tests.**~~ Done 2026-10-17. Every exported name in engine, world, content, player-core, ui and apps/player was counted with `rg -w` across `packages/*/src`, `apps/player`, `apps/web`, `apps/studio`, `apps/desktop`, `services`, `studio-cli`, `scripts` and `docs`. Names whose only occurrence was their own declaration, with no test naming them, were deleted, then the helpers and imports they left unused. Removed: player-core `BROWSER_CAPABILITIES`, `CABINET_BAND_ORDER`/`_LABEL`/`_LEAD`, `cabinetBandOf`, `GENRES`, `ModelingChoiceKind`, `WORLD_LENS_NAMES`, `isWorldLens`, `WORLD_READING_NAMES`, `clockSpoken`, `counselStanceVerdict`, `isMapModeId`, `leadershipArticles`, `officeDossier`, `officeOversightReading`, `recordedContactReach`, `regionLabel`, `statFigure`, `relationshipStepsOf`, `seatDeliveryScan`, `seatMoves`, `seatFacts`, `treatiesWith`, `vetoInstrument` and all of `government/seat-calendar.ts`; apps/player `BlockTitle`, `isPast`, `useReducedMotion`; engine `DEFAULT_PROJECTION_WEEKS`, `PROJECTION_COHORT_METRICS`, `PROJECTION_JUDGMENT_METRICS`, `HOUSING_TARGETED_ACT`, `assessmentsAbout`, `selectElections`, `selectMatters`, `ApprovalCoalition`; world `VACANCY_BENCH_ROLES`, `EnergyMixSector`; content `FIXTURE_FLAGS`. Not touched: names reached only by tests (candidates 12 and 13, decision BL-43), `rungFiscalEffects` (BL-35 wants it wired), and `packages/design` token types. No contract doc named any removed symbol.

### BL-39 Fixes owed upstream in the Construct tool

- **Status:** open
- **Reconciled (October 18, 2026):** Update line refs (:478-493, project.ts:132) and skill version; reword defect 1. Checked against: `grep -n tracker ~/.claude/skills/construct/SKILL.md` empty; SKILL.md frontmatter version 3.2.0; onboarding.ts:478.
- **Owner:** the owner (these are changes to the Construct repository, not this one)
- **Missing:** three defects in Construct that this repository works around.
- **Acceptance:** each is filed or fixed in the Construct repository.
- **Evidence:** the audit, 2026-10-08.
- **Blocked by:** nothing here.

The three:
1. **The skill overrides a project's declared tracker.** The global Construct skill (`~/.claude/skills/construct/SKILL.md` v2.6.0, lines 69-74) tells agents to use Construct's `work` ledger and "Do not use an external tracker", with no exception. It should defer to a tracker the project declares (in `CLAUDE.md`, `AGENTS.md` or a field in `.construct/project.json`) and stand its ledger down there; otherwise every repository with a tracked backlog has to override it every session.
2. **Refresh keeps retired statements.** `composeConstitution` (`src/kernel/project/onboarding.ts:348-366`) merges the on-disk constitution's lists with the confirmed statements, and `construct project refresh` passes the existing file in as the base (`src/cli/project.ts:100`), so a retired or rejected statement survives every refresh and can only be removed by hand-editing the JSON. Refresh should rebuild the lists from the store, or drop what the store has retired.
3. **No cleanup for output from Construct's own retired versions.** Orphans include `.claude/commands/**` files that begin "You are Construct"; `.cursor/rules/construct-*.mdc` files ("synced from the tool"), two of which prescribe typecheck before build and a `pnpm build` Stop hook; `.opencode/opencode.json` (its host was deleted in Construct's `27b010b7`) with a tracker prompt; the Copilot "BEGIN/END CONSTRUCT AGENTS" block (its generator removed in `a69f9622`), which names nonexistent `.github/prompts` files; a legacy unbound `construct-mcp` entry in `.cursor/mcp.json`; and the Construct-v2 `.gitignore` block (`config.env`, `embed.yaml`, an unanchored `plan.md`, `inbox/`). `construct doctor` or `construct migrate` should detect these and offer to remove them. (This repository deleted its own copies on 2026-10-08.)

### BL-54 Follow-ups the 2026-10-08 cleanup found but did not act on

- **Status:** open
- **Reconciled (October 18, 2026):** Rewrite with the above. Checked against: `git grep` commands in this pass.
- **Owner:** the next cleanup pass, except where a line names another owner
- **Missing:** the cleanup's executors and checkers reported these while working. Each is either outside what the cleanup was allowed to touch or needs a decision.
- **Acceptance:** each line is done, moved into its own item, or dropped with a reason.
- **Evidence:** the cleanup branch `fix/retire-beads-and-prune` (merged by `4e431910d`) and its gate record (deleted in `1211e624e`; read it from `1211e624e^`).
- **Blocked by:** as listed.

1. **The covert-findings 48-hour rule has no engine reader.** The covert-action glossary (now `packages/player-core/src/glossary/world.ts`, around `:234`) and the header of `packages/engine/src/findings.ts` describe it, but nothing moves a finding to unwritten or reads its age. `overdueFindings`, which had no caller, was the only code that read it, and the cleanup deleted it. Wire the transition in `findings.ts` or soften the player-facing copy.
2. **Write-only Campaign fields.** `CityRuntime.lastMovedTurn` and `lastMovedReason` (`state-campaign.ts:92-93`) are still written by `effects.ts` and `founding-leader-hooks.ts`, but no production code reads them now that `selectCityLastMoved` and `selectCitiesMovedSince` are gone. Removing them is a Campaign-shape change under the Doc Sync Contract, with a save migration.
3. **Exports left with only a test consumer, or none:** `downstreamOf` (`trade-sectors.ts`, test-only now that `selectDownstreamOf` is gone); `GradientToken` (`packages/design/src/tokens/color.ts`, no consumer now that `activeGradient` is gone); the multi-currency branch in `format/money.ts` and `format/figures.ts` (`MoneyDisplay.perUsd`, `symbolFor`'s authored-currency path, the optional money formatter on `metricTiles` and `bill-reading.ts`), which no caller exercises.
4. ~~**Stale doc passages the cleanup's specs did not cover.**~~ Moot: W0 rewrote ARCHITECTURE and SCHEMA (`1211e624e`); on 2026-10-10 neither names `apps/player`, Expo Router or `ticketsForPerson`, and SCHEMA no longer ends with governance sections.
5. **`CONTENT_PLAN.md:7` cites `content/corpus/manifest.json` (322 scenarios), which is gitignored.** ARCHITECTURE now agrees on 322 (`:1259`, re-checked 2026-10-10); what remains is to cite a tracked source for the count.
6. **`.claude/agents.md` names `studio corpus deploy` at lines 478, 724 and 845** (re-checked 2026-10-10). No such command exists.
7. ~~**The `fixture-import.spec.ts` comment overstates the rule.**~~ Moot: the spec was deleted with `apps/web/e2e` in W0.
8. **Unused brand rasters.** Now BL-34.
9. **The feed repeats a running war's weekly line** (from BL-56 item 1). On `wildfire-colorado`, "The war between Russia and Ukraine grinds on." came back as a brief beside the lead, and "The front between Israel and Lebanon holds." appeared twice: weekly lines from separate turns are separate feed items, and player-core's `rankedFeed` (`packages/player-core/src/world/feed-rank.ts`) does not fold them. Fold them before `/record/press` is built (W8).
10. **`notableNonJoiners` withholds a publicly reported refusal** (from BL-56 item 15) from the war file when the refusing government is unread (`packages/player-core/src/world/war-file.ts`). A public refusal is public; fix before the war file is rebuilt (W7).

## Owner tasks and decisions

### BL-42 Decide D7: how God Mode's entitlement is verified

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** Update Question: the "make devOverride development-only" half is done (3f318133e per DECISIONS 10.9); the open point is only which verifier ships. Checked against: apps/player/src/device/device-settings.ts:74; packages/player-core/src/entitlement/entitlement-store.ts:59; docs/DECISIONS.md:573-578.
- **Owner:** the owner
- **Question:** where God Mode lives is decided (one entitlement-gated `/settings` row, BL-76; `docs/DECISIONS.md` §10.1), and the rules are written (§10). How the entitlement is verified is not. `docs/DECISIONS.md` §10.9's source check records two open points: the contracts describe server verification of a Steam ticket through `services/api`, while a client-side Steam ownership check is unbuilt; and `packages/player-core/src/entitlement/entitlement-store.ts` honors `devOverride` in any build. `services/api` has no runtime host, and its accounts and entitlement code runs only in tests. Nine God Mode authoring tools in `engine/god.ts` had no caller on 2026-10-08.
- **Options:** a client-side Steam ownership check in the desktop host: no backend, but the browser build has no purchase path and the `services/api` verifier text goes. Or server verification through the `services/api` verifier port: one verifier for every build, but it needs a deployed backend, which conflicts with the no-deploy rule until ship. Or defer verification with WR: God Mode stays off launch day (as `admin-owca.11` already says), and the settings row ships hidden; this decides nothing early but leaves §10.9 open.
- **Recommendation:** defer with WR, and in the meantime make `devOverride` development-only (§10.9 already requires it), so no build can grant itself the entitlement before the decision.
- **Unblocks:** `admin-owca.11`, `admin-suy.8.2`, BL-38 item 22, flow 17 of BL-75's carried flows.

### BL-43 Decide D8: wire or delete the tested features no player reaches

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: `git grep -nw composeDossier`, `git grep sequences -- apps/player/src packages/player-core/src` (only `commitReply(... { consequences })` in acts.ts:63, choices.ts:84); packages/content/src/packs/pilot.ts exists.
- **Owner:** the owner
- **Question:** several tested features never reach a player. Wire or delete each family: staged resolution sequences (about 2,000 lines; the resolver accepts `extras.sequences` but nothing passes it), the engine's `composeDossier` (405 lines, guarded by the required `verify-biography-immutability` gate, no caller), seven pilot scenarios, the country-reference prose, the announced-fuse digest lead, the causality "why did this move" readers with `selectMetricDelta`, and the God Mode authoring tools (BL-42). The rebuilt player is the natural point to decide: each family that is wired names its `docs/DESIGN.md` §2 screen and wave.
- **Options:** wire each family as a backlog item with a target screen, at the cost of integration work per family plus a live check on the real surface. Or delete them with their tests, gates, skill and doc paragraphs, losing authored, gated content along with the gates and the resolution-sequence skill that guard it. Or leave them, so a required gate keeps guarding text nobody reads and the exports stay in the reachability debt.
- **Recommendation:** wire the resolution sequences, ship the pilot scenarios into `CORE_SCENARIOS`, and wire the fuse lead, the country-reference prose and the causality readers, which NORTH_STAR's "a player can always trace why" needs. Wire `composeDossier` only if `/washington/person/:id` (W6, BL-72) wants a long-form record; otherwise delete it with its gate. Record each choice as a BL item.

### BL-45 Decide D11: keep Construct bound to this repository, and its primary outcome

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** Question: keep the binding (already working) and supply a current primary outcome; unbind option is the only alternative. Checked against: .construct/project.json; .construct/constitution.json primaryOutcome.
- **Owner:** the owner
- **Question:** should Construct stay bound here, and if so, what is the project's primary outcome? Today its MCP cannot bind, because the state is format 3 and Construct expects 4.
- **Options:** run `construct migrate` (it backs the store up first), correct the profile and constraints, and supply a current primary outcome: a few minutes in a terminal (BL-46). Or unbind: remove `.construct/`, the construct entries in `.mcp.json` and `.cursor/mcp.json`, and `enabledMcpjsonServers`, so Construct's remember, review and workflow features stop working here.
- **Recommendation:** migrate and keep it. The primary outcome has to come from the owner; a candidate drawn from `docs/PLAN.md`: "Rebuild the player around the map (the map-first program, W0 to W9) to phone and desktop parity, with no push, PR or deploy until the owner lifts the no-push rule." Construct's `work` ledger stays unused either way (D1).
- **Unblocks:** BL-46, BL-38 item 11.

### BL-46 Run `construct migrate` and correct the constitution

- **Status:** open
- **Reconciled (October 18, 2026):** Missing: constitution purpose ("50 real countries"), primaryOutcome and the palette constraint (packages/ui/src/tokens) are stale; drop acceptance step 1 and the "Vite React DOM" purpose wording (it should say Expo + Tamagui universal player). Blocked by: BL-45's outcome sentence. Checked against: .construct/constitution.json (python read); `ls packages/ui/src/tokens` -> not found; git log -3 for the file: last change fa3df899d (2026-09-03).
- **Owner:** the owner (in a terminal; only if BL-45 keeps Construct)
- **Missing:** the Construct state is in format 3, so the MCP refuses to bind, and `.construct/constitution.json` still describes the phone-era project.
- **Acceptance:** (1) `construct migrate` run in the repository root. (2) The profile purpose set to "A political simulation game in which the player is President of the United States among 196 real countries, built on a pure deterministic TypeScript engine with a Vite React DOM web player packaged by Electron for Windows, macOS and Steam." (3) `primaryOutcome` set to the owner's sentence from BL-45. (4) The confirmed constraint that names the deleted phone-era token directory as the only palette retired, and "Colors, spacing, radii and type come from the packages/design tokens; apps/web and packages/ui-web never inline them (enforced by verify-adhoc-color-lint)." confirmed in its place. (5) The stale proposed statements rejected: the one that calls phones the primary player surfaces, the one that names the old token path as the palette, and the "studio corpus deploy" principle. (6) Because refresh merges the lists already in the file (BL-39 item 2), the old constraint string is deleted from `.construct/constitution.json` by hand first, then `construct project refresh` runs. (7) The MCP binds with no "older format" message, and a grep of the constitution for the phone-era platform names, the old token path, "50 real" and the retired design catalog's name comes back empty. (8) `.construct/constitution.json` staged by explicit path, plus any other tracked `.construct/*.json` that migrate rewrote, if accepted.
- **Evidence:** the Construct MCP's bind refusal ("This Construct state is in an older format than this version reads"), 2026-10-08.
- **Blocked by:** BL-45.

### BL-47 Decide D12: the portrait batches and the corpus

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** Update 630 MB to 699 MB. Checked against: `du -sh content/jobs/images content/corpus`; `git check-ignore` both ignored.
- **Owner:** the owner
- **Question:** `content/jobs/images` holds 630 MB of portrait, bake and smoke batches from the photo-portrait pipeline that drawn faces replaced (`docs/DECISIONS.md` §11.1). They were paid generations and cannot be reproduced. The authored corpus also exists only on this disk; the 2026-10-08 cleanup plan tarballs it either way, so confirm the tarball exists before acting. What happens to the portraits, and should the corpus become tracked?
- **Options:** archive the portrait batches outside the repository and keep the corpus untracked, protected by the tarball: an instant, reversible move on the same volume, though the corpus stays on one disk apart from the tarball. Or archive the portraits and also start tracking `content/corpus` (2.1 MB), reversing the `.gitignore` decision that the corpus is a build artifact. Or delete the portrait batches, an irreversible loss of paid output.
- **Recommendation:** the first. Keep the `scene-*` images and every progress journal: `verify-image-provenance` is deleted, but they are still the only record of paid scene output.

### BL-48 Decide D13: how much git ref clutter to prune

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** wc -l` = 254; `git for-each-ref refs/salvage refs/codex | wc -l` = 11 | Update numbers; recommendation unchanged. Checked against: `git for-each-ref refs/safety.
- **Owner:** the owner
- **Question:** what happens to 83 `refs/safety` refs, 2 `refs/salvage` refs and 2 Codex turn-diff tree refs? Together they hold only 24.5 MB, 22.7 MB of it the Codex trees.
- **Options:** leave everything: 83 names of noise, though 16 of them were cited in docs (most of those docs were deleted in W0). Or write the name-to-sha table to a tracked file (for example under `docs/audits/2026-10-10-map-first/`); delete the 64 safety refs whose commits are already on branches, the 2 salvage refs (superseded phone-era work), the 2 Codex trees, `pre-probe-removal` and `dolt-remote-info`; and keep the other 13 unmerged safety refs and the 4 HEAD-only ones until the codex merge. Codex loses its diff view for two turns, and any ref can be recreated from the table. Or delete everything except the 15 unmerged safety refs, so the HEAD-only pins are gone before the codex merge has landed.
- **Recommendation:** the second (the codex branch merged on 2026-10-09, BL-41), plus `refs/safety/pre-map-first`, which the map-first program needs until W9; then `git gc` while no gate is running (BL-36). Keep `refs/safety/lost-content-pin-32dbaabc1` (`admin-xto` needs it).

### BL-49 Decide D18: the family migration and the scene work list

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: `node scripts/migrate-scenario-families.mjs --check` (read-only) -> "would write 19 family declaration(s) across 9 arc(s)"; both scripts present.
- **Owner:** the owner with the content lead
- **Question:** two scripts have unfinished work. `scripts/migrate-scenario-families.mjs --check` reports 19 family declarations across 9 arcs not yet bound in the local corpus. `scripts/scene-worklist.mjs` counts scene demand over `CORE_SCENARIOS` only, so it undercounts. Run, fix or delete? Both scripts stay until this is answered.
- **Options:** have the content lead review and run the migration, rebuild the corpus, then delete the script, and delete `scene-worklist`; the cost is one review and a corpus rebuild, and buying a scene batch later means rebuilding the work list. Or retire the migration now and author families by hand, and rewire `scene-worklist` to the baked corpus (about 20 lines); those 9 arcs keep re-ranking their counterpart country, which is the defect families exist to fix.
- **Recommendation:** run the migration after review, then delete it. Delete `scene-worklist` unless a scene-image batch is on the ship plan. Related: `admin-po1d.17.3` under `admin-owca.6.9`.

### BL-51 Retire the local `plan.md`

- **Status:** open
- **Reconciled (October 18, 2026):** Acceptance: owner confirms; file deleted; `/plan.md` rule stays. Remove the BL-24 clause. Checked against: `test -f plan.md` exists; .gitignore:107 `/plan.md`.
- **Owner:** the owner
- **Missing:** the gitignored root `plan.md` still exists (2026-10-10). It is a third planning surface, out of date ("Branch `staging`, clean"; "Beads only: 23 open and 3 deferred") and invisible to fresh clones. D4 retired it once the redesign session was done with it; that session's program (BL-57) closed on 2026-10-10.
- **Acceptance:** the owner confirms no session needs it; the file is deleted; the anchored `/plan.md` rule stays in `.gitignore`; BL-24's dead branch is then removed.
- **Evidence:** `plan.md` in the main checkout.
- **Blocked by:** the owner's confirmation.

### BL-52 Finish the GitHub-side CI cleanup (D17)

- **Status:** open
- **Reconciled (October 18, 2026), owner decision still open:** absorbs BL-26's stray workflow registration. Checked against: `ls .github/workflows`; `git ls-tree origin/main .github/workflows/`.
- **Owner:** the owner (account settings, not pushes, so the no-push rule does not hold them)
- **Missing:** the cleanup deleted `branch-protection-check.yml`, but three things live on GitHub: the `PAGES_DEPLOY_KEY` deploy key and its secret, the mirror repository `the-administration-pages`, and a registered `deploy-player-web.yml` that exists in no local ref.
- **Acceptance:** the deploy key revoked and the secret deleted; the mirror repository archived, not deleted; the stray workflow registration removed.
- **Evidence:** the audit's GitHub read, 2026-10-08.
- **Blocked by:** nothing.

### BL-53 Delete the tracker's refs on origin at the next authorized push (D2)

- **Status:** open
- **Reconciled (October 18, 2026):** Blocked by: the owner's next authorized push (a push to the integration branch already happened); keep the acceptance `git ls-remote origin 'refs/dolt/*'` empty. Checked against: CLOSEOUT.md:3 (what the publish deleted); local `refs/safety/pre-prune/dolt-remote-info` still exists.
- **Owner:** the owner
- **Missing:** origin still carries `refs/dolt/data`, `refs/dolt/recovery-completion-2026-09-25` and `refs/dolt/archive-before-completion-2026-09-25`. Until they go, a `bd bootstrap` on a fresh clone could turn them back into a live tracker, which the 2026-09-25 workflow did once.
- **Acceptance:** at the first push the owner authorizes, `git push origin --delete refs/dolt/data refs/dolt/recovery-completion-2026-09-25 refs/dolt/archive-before-completion-2026-09-25` runs, and `git ls-remote origin 'refs/dolt/*'` returns nothing.
- **Evidence:** `git ls-remote origin`, read by the audit on 2026-10-08.
- **Blocked by:** the no-push rule.

## Cut by name; reopen only from playtest evidence

On 2026-09-28 the one-backlog pass closed these as cut: each added machinery, texture or polish without a decision with a trade-off or a readable consequence. The Beads history was dropped on 2026-10-08, so these lines are the remaining record. Reopen one only when a playtest shows the player missing it, as a new BL item that names this entry.

- **The causal-graph program.** `admin-k5j.8` and `admin-k5j.8.1` to `admin-k5j.8.8`: it governed the simulation without giving the player a decision or a consequence, and double billing was already guarded by tested coherence work. Its commodity child went to 5E.
- **The realism ladder.** `admin-k5j.8.11` and `admin-k5j.8.11.1`, `.3` to `.10`: subsystems with no home in W4 to W6. (`admin-k5j.8.11.2` was closed as landed: the Fed decides on real FOMC weeks.)
- **Deed-flag machinery.** `admin-3go` and `admin-3go.5`, `.7`, `.9`, `.11`, `.12`, `.14`, `.16`, `.17`, `.19`: flag machinery without a decision. The one needed gate (`admin-3go.18`) and the fuse arrival (`admin-3go.15`) were kept.
- **Institutions texture.** `admin-eayi` and `admin-eayi.6` to `.10`: executive-branch texture with no player decision. Its one cleanup (`admin-eayi.2`) moved to 6E.
- **Variance tails.** `admin-3yv.3` storyteller profiles (director variance with no decision); `admin-3yv.4` typed ledger events (bookkeeping with no surface need); `admin-3yv.6` pack pinning (a duplicate of `admin-xto`); `admin-3yv.7` seed sharing (not needed to ship).
- **Polish and the rest.**
  - Economy and opinion: `admin-k5j.8.10.7` (the sparse input-output network, a second economic model for no decision 5E does not already give); `admin-546.4` (cohort validator debt, no player-visible effect); `admin-546.12` (a cynicism discount the opinion model does not need); `admin-546` (epic emptied: turnout to 5K, the legibility suite to 6F, the rest cut).
  - Cases, world and people: `admin-k5j.7.7` (player-authored automation rules; the Chief of Staff handoff covers the need); `admin-u7t.10` (domestic revealed preference; 5A covers it); `admin-7ct` (operator variety); `admin-a58x` (the thin-trait fit review: a data review with no player-visible defect named).
  - Surfaces and copy: `admin-d7gi.27.1` (an audit of the redesign it served); `admin-d7gi.27.8` (the 320-width matrix, cut when the player was desktop-only; the map-first program requires 320 again, under BL-75); `admin-d7gi.14` (an authorization dossier route); `admin-h3w3` (the approval dossier's division drawing); `admin-ous` (a contributor-list mandate, retired with the old composition rules); `admin-p4i` (phrasing variance); `admin-q9p` (unused context detail); `admin-qk1.6` (a pre-commit weight line); `admin-qk1.7` (welcome threshold copy).
  - Content: `admin-2ye.7` (consequence depth past the floor, a volume target); `admin-87i` (a pool skeleton rewrite, superseded by the content track); `admin-i30r` (the content lifecycle epic: tags, eras, lineage; its rejoinder backfill went to the content track); `admin-i30r.5` (oversight scenarios, covered by the condition-gated batches); `admin-9oe` (a sibling-origin reopen, folded into the arcs-must-close rule).
  - Tooling and process: `admin-c061` (a causal-share gate, governance of a metric); `admin-dqo` (an intel-skill harness proof); `admin-po1d.10.7` (three low-severity tail findings with no owner); `admin-poh` (file splits; both files are grandfathered and cannot grow); `admin-puaf` (a branch's mergeability); `admin-suy.9.6.2` (buying scene coverage, post-ship); `admin-suy.9.7` (a studio imagery review UI, post-ship); `admin-ij4` (epic folded into W4 4E.1 and 4E.2).

## Closed

### BL-306 A removal from a contested commission seat reaches no court

- **Closed:** 2026-10-25, litigation lane `251c425d5` and `f7a8f5d92` (merges `7e636d644`, `b5428a89a`), integrated at `bd7da1cdc`.
- **Proof:** `removal-court.test.ts` ("opens one proceeding in the District of Columbia once the member decides to sue, and never a second"; "opens nothing before the member decides, for a member who declines, or for an at-will commission"; "runs on the shared court clocks: interim relief in weeks, merits months after filing"; "votes on Slaughter's terms: the bench as a whole near the priced chance, spread by each justice's position"; "reinstates a living member to a seat nobody has been confirmed to"; "awards back pay only when the seat has been filled"; "applies the remedy when the final judgment goes for the member, and none when it goes for the President"), `oversight-board.test.ts` (the Officers board says what removing a protected commissioner risks in court and shows one row per removal) and `courts.test.ts` (the docket names the removal suit and reads its case file). Build, typecheck, lint, the full suite and all 88 verify gates pass on `bd7da1cdc` (`docs/audits/2026-10-24-world-dynamics/gates/w3.md`). The balance harness was not run on the integrated tree. Not checked in a browser, and back pay is a stated remedy, not a Treasury charge: both carried to BL-312.
- **Status:** closed (was open · medium · engine, player-core)
- **Owner:** world dynamics program, Wave 3; litigation lane with the institutional-powers lane.
- **Missing (as opened):** removing the chair of the SEC, FCC, CFTC, FDIC or NRC records a `ContestedRemoval` and an exposure (`legal-exposure.ts#removalExposures`): the removed member decides within one to four weeks whether to sue (`REMOVAL_SUIT_CHANCE` 0.85) and the merits are priced once (`REMOVAL_REINSTATEMENT_CHANCE` 0.2). No `CourtProceeding` opens, so nothing decides the suit, no reinstatement or back pay can follow, and no screen shows the exposure. Both chances are design judgments.
- **Acceptance:** a filed removal suit opens a proceeding through the common mechanism (a removal subject, venue in the District of Columbia, interim relief and merits on the sourced clocks), its merits read Slaughter's reasoning and the bench, a loss for the administration reinstates the member or ends in a stated remedy, and the officers board shows the exposure; tests for each step.
- **Evidence:** owner ruling 2026-10-25 (BL-225); `legal-exposure.test.ts` "a removal from a contested seat is a legal exposure".

### BL-287 Trade diverts, and standing retaliation reaches output

- **Closed:** 2026-10-25, economy lane `ce6519916` (merge `52bd5268d`), `c09676065` (Wave 1) and `62585cefa` (merge `1178040a4`), integrated at `bd7da1cdc`.
- **Proof:** `trade-volume.test.ts` ("replaces about half of a tariffed partner's lost sales within the year"; retaliation fitted to ERS's 76 percent), probe `economy.probe.test.ts` B10 ("diversion: Vietnam's sales rise within the half-life ... and Vietnam gains no more than China lost") and B11 ("lowers US growth pressure while China's retaliatory tariff on row crops stands"). Diversion reuses supplier headroom with `DIVERSION_HALF_LIFE_DAYS` 91, fitted to Census 2018-19 trade (42 percent replaced at one year, `trade-volume.ts`); the Treasury debit is gone (`c09676065`); retaliation reaches US growth through `external-pressure.ts#retaliationCut`. Build, typecheck, lint, the full suite and all 88 verify gates pass on `bd7da1cdc` (`docs/audits/2026-10-24-world-dynamics/gates/w3.md`). The balance harness was not run on the integrated tree. Two planning values remain, carried to BL-313: substitution is the sector's `substitutability` share with no substitution price, and `COERCION_BITE` 0.5 sits below ERS's 0.73.
- **Status:** closed (was open, in part · medium · engine)
- **Owner:** world dynamics program, Wave 2; physical-economy lane (Opus).
- **Missing (as opened):** a tariff on one partner reduces that flow and reallocates nothing (`trade-volume.ts:115-154`). China's standing retaliation on US row crops never reaches US growth; `trade.ts:685,720` charges one week of private export loss to the Treasury instead.
- **Acceptance:** diversion reuses the physical-flow accounting with supplier capacity, substitution cost and a sourced delay; retaliation reaches sector value added, not gross exports dollar for dollar, and the Treasury debit is removed. Probe `economy.probe.test.ts` B11 (ordering: US growth pressure falls while the retaliation stands) passes, and B10's `it.todo` becomes an ordering test (Vietnam's share rises within the delay, bounded by capacity).
- **Evidence:** Wave 0 run: B11 change 0; Vietnam 69,371.79 before and after.
- **Reconciled (2026-10-25, Wave 1 integration):** the Treasury debit half landed early in the economy lane's 1b (`c09676065`): `tradePhase` no longer charges a landed answer to the Treasury, and `external-pressure.ts#retaliationCut` takes the answer's export cut off US growth under the coercion cap, with stacked answers compounded once (`trade-volume.ts#retaliationLeft`). B11 passes on direction only (−0.000016). What remains here is diversion (B10) and the output magnitude: row crops' `volumeFall` is about 0.06, far below ERS's $13.2 billion a year.

### BL-292 Border clashes come in episodes, and war onsets are measured

- **Closed:** 2026-10-25, NPC lane `59f88c751` (merge `2c0c2e562`), integrated at `bd7da1cdc`.
- **Proof:** `world-events.test.ts` ("rests after a clash, then runs hotter for a season than a quiet pair does"; "does not run a pair on one fixed interval"; "files one clash for the pair in a week, though both sides are willing"; "is far less likely where the side that would be hit sits under a defense treaty"; "brings the guarantors to consult, and the consultation deters the next one") and probe `geopolitics.probe.test.ts` A3 ("does not fire the same pair on one fixed interval"; at most one clash on NATO's border with Russia in two years). The lane measured clashes falling from about 87 a year to 5.4. Build, typecheck, lint, the full suite and all 88 verify gates pass on `bd7da1cdc` (`docs/audits/2026-10-24-world-dynamics/gates/w3.md`). The balance harness was not run on the integrated tree. The onset gate stays an `it.todo` (`geopolitics.probe.test.ts:187`) until a benchmark is sourced, as the acceptance says; that and the planning values (`CLASH_BASE_RATE` 0.01, `EPISODE_GAIN` 2.5, the half-life) are BL-313.
- **Status:** closed (was open · high · engine)
- **Owner:** world dynamics program, Wave 3; NPC lane (Opus; one writer for `world-events.ts`, shared with BL-80).
- **Missing (as opened):** a hostile dyad above the 0.55 threshold clashes again as soon as its 12-week cooldown lapses, each clash raising the tension that keeps it above the bar (`world-events.ts:129-159`; `world-event-templates.ts:83-84`): IND-PAK, RUS-UKR and ARM-AZE clash 9 times each at one 12-week gap, and Russia clashes 50 times in two years with six NATO members with no alliance consequence. War onsets were compared with active conflicts, so the onset rate has no valid target yet.
- **Acceptance:** an episode-conditioned weekly hazard (`p = 1 − exp(−λt)`) with a rest after each clash, damped by a defense body on the subject's side and firing an alliance consultation when it happens; bilateral records counted once. Probes `geopolitics.probe.test.ts` A3 (no pair on one fixed interval; at most one NATO-flank clash in two years, a design bound) pass. Onsets, durations and occupancy are reported separately, and an onset gate is added only with a sourced onset benchmark; any clash-to-war path is a new §6.13 family with its own cap.
- **Evidence:** Wave 0 run: 76 clashes a year; 0.125 NPC war onsets a year and 0.45 NPC war-years a year (report).

### BL-308 Tariff orders draw no answer from the response book, and the wire does not name an answer

- **Closed:** 2026-10-25, NPC lane `59f88c751` (merge `2c0c2e562`), integrated at `bd7da1cdc`.
- **Proof:** `npc-response.test.ts` (a tariff order "leaves its target an intent to answer when the trade book drew no answer"; "is answered once: an answer the trade book has drawn spends the intent"), `wire.test.ts` ("an act made as an answer") and `npc-turn.test.ts` ("an answer on the wire"). Build, typecheck, lint, the full suite and all 88 verify gates pass on `bd7da1cdc` (`docs/audits/2026-10-24-world-dynamics/gates/w3.md`). The balance harness was not run on the integrated tree.
- **Status:** closed (was open · low · engine)
- **Owner:** world dynamics program, Wave 3; NPC lane, with the trade owner.
- **Missing (as opened):** `npc-response.ts` reads coercive commitments `resolveAction` writes; a tariff the President imposes through `tariff-orders.ts` writes none, so no government holds an intent to answer it beyond `trade.ts`'s own retaliation draw. The wire reports an NPC's answer as an ordinary act and does not say what it answers, as `keptPromiseLine` does for red lines.
- **Acceptance:** a tariff order enters the response book once (no double answer with the trade retaliation draw), and the wire names an answer as an answer; tests for both.
- **Evidence:** NPC lane notes, "Risks and open items".

### BL-309 Succession gaps: the Vice President, staff and agency heads, and party never changing

- **Closed:** 2026-10-25, succession lane `021d1339e` (merge `7616e4d08`) and the Vice President path in integration commit `bd7da1cdc`.
- **Proof:** `succession.test.ts` (a House special flips about one in seven at an even mood and a close seat more often than a safe one; a separately elected lieutenant governor may be of the other party; Oregon's secretary of state; an agency's first assistant acts; "never draws White House staff, who have no successor path in office"), `vice-presidency.test.ts` ("empties the office, the Senate's chair and the line's first place together"; "is never filled from the career bench"; "can be sent up only once the office is empty, and only at thirty-five or older"; "needs the House as well as the Senate"; "takes office on confirmation: presides over the Senate and stands first in line"). White House staff and foreign leaders on the US life table are recorded as abstractions with their reasons in DECISIONS 4.13. Build, typecheck, lint, the full suite and all 88 verify gates pass on `bd7da1cdc` (`docs/audits/2026-10-24-world-dynamics/gates/w3.md`). The balance harness was not run on the integrated tree.
- **Status:** closed (was open · low · engine)
- **Owner:** world dynamics program, Wave 3; people-and-succession lane.
- **Missing (as opened):** the Vice President is never drawn (filling the office needs the Twenty-fifth Amendment's section 2 nomination); White House staff and the 40 agency heads are not drawn; a House special election never changes party (districts carry no lean); a governor's successor is always of the governor's party, though 17 states elect the lieutenant governor separately and four seat a legislative leader; foreign leaders read the US life table.
- **Acceptance:** each gap either gets its lawful path with a test, or is recorded in DECISIONS 4.13 as an abstraction with its reason.
- **Evidence:** succession lane notes, "Left undone, with reasons".

### BL-190 Trade exclusions finer than a category, and legal exposure for trade measures

- **Closed:** October 25, 2026, on the owner's rulings of 2026-10-25, recorded in the commit that carries this entry. Exclusions: option (a), whole-cell deselection; the act workspace's tariff terms now say a kind of goods is a whole category and leaving one out leaves all of it from that partner out (`apps/player/src/world/act/PlanTerms.tsx`). Legal exposure: option (a), the authority and citation per line with no challenge odds; trade measures do not enter the litigation mechanism (DECISIONS 6.19). The goods-by-partners grid where a cell is deselected is BL-183's, whose acceptance already says so.
- **Proof:** probe `law.probe.test.ts` T2 is now an assertion and passes: every US tariff line on the record carries its statute and a U.S.C. citation, and after 330 days under a 15% Section 122 tariff no proceeding answers it and `selectLegalExposures` holds no exposure (the law probe file, 21 of 21 on the integrated tree). The litigation lane's primary-source record of the IEEPA and Section 122 litigation and the wiring option (b) would have needed stay in `docs/audits/2026-10-24-world-dynamics/lanes/litigation.md`.
- **Status:** closed (was open, owner decisions first, then engine if (b)).
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: packages/engine/src/trade.ts exclusions still cell-level; no trade court subject.
- **Owner:** control plane program, CP2.
- **Extended (2026-10-24, world dynamics program, Wave 2, litigation lane):** law T2. A tariff carries no legal exposure at all: 330 days under a 15% Section 122 tariff open no proceeding and no case (Wave 0 run). Whichever ruling the owner records here, the probe `law.probe.test.ts` T2 `it.todo` becomes its assertion: with (b), the measure feeds BL-123's common proceeding mechanism with the Court of International Trade as venue and its own remedy, and the filing rate is asserted across seeds, never "a suit in one seed".
- **Missing:** There are no product lines, so an exclusion can only drop a partner and category cell (audit 03 P9). Trade measures have no court subject or challenge odds, and inventing one breaks DESIGN.md's rule against fabricated probability (audit 03 P10).
- **Acceptance:** For exclusions, the owner chooses (a) cell deselection with copy that says it excludes a whole category for that partner, or (b) a `coverage` share per line applied to revenue, volume and price, with `verify-trade-measure-kinds` green. For legal exposure, (a) the authority and citation per line with no odds, or (b) a trade-proceeding court subject with sourced challenge rates designed separately. BL-183 ships (a) for both until the rulings are recorded here.
- **Evidence:** audit 03 `trade.ts:40-44,245-297,416`, `court-procedure.ts:8`, `apps/player/src/world/law.ts:54`, `docs/DESIGN.md:193`.
- **Blocked by:** the owner's rulings.

### BL-230 Decide: should routine diplomatic contact stop adding up to more than a treaty

- **Closed:** October 25, 2026: the owner kept the 0.06 shared routine-contact ceiling above standing; implementation `43379d855` (Wave 2 Hill lane), integrated at Wave 1. DECISIONS 4.8 records the ruling.
- **Proof:** `engagement.test.ts` over 208 weekly checkpoints on a controlled pair: calls bank 0.049, calls and envoys 0.052, against a mutual defense treaty's durable +0.18. The act workspace's presentation of a call's shrinking benefit stays with BL-229; matched whole-world campaigns with Wave 4.
- **Status:** closed (was open, an owner decision).
- **Reconciled (October 18, 2026), owner decision still open:** -. Checked against: packages/engine/src/engagement.ts:67-68; docs/audits/2026-10-16-act-workspace/impact-audit.md; BL-229 exists at BACKLOG.md:2393.
- **Reconciled (2026-10-25, world dynamics Wave 1 and Wave 2 Hill lane, against `43379d855`):** both halves now have an implementation; the owner's answer is still not recorded, so the item stays open. Relationship memory (BL-277, `c3bbbf6ec`) makes each call's and envoy's gain fade at the 39-week favor half-life. The Wave 2 Hill lane (`43379d855`) then saturates routine contact: calls and envoys share the remaining room up to `engagement.ts#ROUTINE_TRUST_SURPLUS` (0.06) above each directed `relationshipAnchor`, durable treaty shifts included, with the increment shrinking as the room fills, and switching instrument or initiator does not reset it. Measured over 208 weekly checkpoints on a controlled pair (`engagement.test.ts`): calls bank 0.049, calls plus envoys 0.052, against a mutual defense treaty's durable +0.18; first gain 0.020, late gains 0.002 to 0.004. Before this program, steady contact added about +1.7 over a term. That is the first option below in substance (the cap is 0.06 above standing rather than per 52 weeks, and the call stays +0.02), implemented without the owner's ruling. Not measured: matched whole-world campaigns, and how the act workspace now shows a call's shrinking benefit (BL-229).
- **Decision still needed:** confirm the 0.06 shared ceiling above standing, or choose another option; on confirmation this item closes with `43379d855`.
- **Owner:** the owner
- **Question (narrowed 2026-10-25):** is a shared ceiling of 0.06 trust above a pair's standing reading the right bound on routine calls and envoys? The original framing follows. A phone call every 4 weeks and an envoy every 6, each +0.02 trust with no decay, add about +0.43 trust a year to one capital and about +1.7 over a term. That is enough to take any capital from Hostile to the top of the scale, and five months of calls is worth more than a mutual defense treaty (+0.18). The precedent audit (`docs/audits/2026-10-16-act-workspace/impact-audit.md`, finding 3) found nothing in the record that supports it. The owner's own read on 2026-10-16 was the opposite, that the steps look too small.
- **Options:** cut the call's trust from +0.02 to +0.01 and cap the trust calls and envoys can add at +0.06 per relationship per 52 weeks, after which they only hold tension down. This is realistic, but it makes the smallest option smaller and changes every government's diplomacy, since other governments use the same engagement path; it needs a mechanics change in `engine/src/engagement.ts`, the balance harness and a CONTENT_DOCTRINE check. Or cut the call alone to +0.01: a number change, and it halves the problem. Or leave it: no work, and steady calls stay the strongest way to build trust over a term.
- **Recommendation:** the first, with the workspace's shared scale (BL-229) showing the President why a call is small.
- **Unblocks:** nothing waits on it.

### BL-282 Third parties react by their own ties, signed and scaled

- **Closed:** October 25, 2026, reactions lane `15b596067` (merge `d93e479fe`), integrated in the commit that carries this entry. Each observer reacts by a signed, bounded stance read off its own ties (`resolution-ripples.ts#observerStance`); rivalry yields neutrality, approval only from a government already running the same policy and capped at `APPROVAL_CEILING`; the war tick's verdict on an aggressor reads the same objection. The relation word `observer` has a plain label in player-core (`act/assessment.ts`, "has a stake").
- **Proof:** probes network 3a (no government that distrusts Iran cools toward the United States after a US sanction on Iran; one government already pressing Iran warms within the ceiling), 3b (27 distinct magnitudes over 30 allies of Poland whose trust toward it spans 0.40 to 0.75), 3c (20 ripples, 19 effects toward Russia) and economy B5 (eight weeks after a US blockade of Iran, China −0.0903 trust toward the United States, Japan −0.0074) pass on the integrated tree. `resolution-ripples.test.ts` holds the farm bound and cumulative objection. Idle 104 weeks on three seeds (memory-1..3), the merge before and after: hostile directed edges 226, 199, 212 → 207, 202, 201.
- **Status:** closed (was open · critical · engine).
- **Owner:** world dynamics program, Wave 2; relationship-reactions lane (Opus).
- **Missing:** every coercive ripple cools its observer toward the actor (`resolution-ripples.ts:158-169`), so governments that distrust Iran, Saudi Arabia, the UAE and Israel among them, cool toward a US sanction on Iran the way Iran's partners do. Reaction strength is a class constant with a trust 0.4 cliff (`resolution-ripples.ts:16-20,63`): all 30 allies of Poland react to a Russian strike at 0.048 whether their trust is 0.41 or 0.75. Through `resolveAction` a US blockade of Iran moves China and Japan within 0.011 of each other (economy B5's remainder).
- **Acceptance:** a signed, bounded response reading the observer's ties to actor and target, defense obligations, exposure, threat and whether it already runs the same policy; rivalry may yield neutrality, never automatic approval (the `−sign(disposition)` rule is rejected). Probes `network.probe.test.ts` 3a (ordering: no government that distrusts the target cools toward the coercer) and 3b (ordering: ally magnitudes differ when ally trust spans more than 0.2) pass, 3c (NPC-on-NPC ripples) still passes, and economy B5 still orders China below Japan.
- **Evidence:** Wave 0 run: 3a fails with SAU, ARE and ISR among the cooling rivals; 3b one magnitude over 30 allies; blockade CHN −0.171, JPN −0.161, every observer between −0.160 and −0.171.
- **Reconciled (2026-10-25, Wave 1 integration):** economy B5, which passed at Wave 0 (China −0.171 against Japan −0.161 trust toward the US eight weeks after a blockade of Iran), now fails: China −0.0848 against Japan −0.0885. The likely cause, inferred from the mechanism and not traced: relationship memory (BL-277) reverts each injury toward its anchor at the reader's own grievance half-life, roughly halving both readings, while the ripple itself is still the flat class constant this item replaces, so the ordering rides on the two readers' vengefulness rather than on their stake. Acceptance adds: B5 passes again through signed, stake-scaled responses, not by tuning the half-lives.
- **Blocked by:** BL-277 (the memory the reaction writes into).

### BL-291 Office-holders die, and succession runs

- **Closed:** October 25, 2026, people-and-succession lane `291d00892` (merge `eea5c2009`), integrated in the commit that carries this entry, with two integration fixes the lane asked for: a cabinet death now goes through `appointments.ts#vacates` with the new `CabinetDeparture` `"died"` and writes its departure flags, and an empty seat counts as neither a yea nor a nay (`congress.ts#seatedOf`, DECISIONS 5.18). DECISIONS 4.13, SCHEMA (`CongressMember.vacancy`, `electionDue`) and ARCHITECTURE updated; no save migration is needed (optional fields; a save-and-reload test keeps an open vacancy byte-equal).
- **Proof:** events probe on the integrated tree: people dead other than judges per four-year idle run 16, 14 and 19 (Wave 0: 0, 0, 0); members of Congress dead in office 9, 8 and 14, inside the new band of 4 to 16 a run set from the observed 3.6 to 5.5 a Congress; judicial seats vacated 13, 15 and 14, unchanged, which is the double-draw check. `officeholder-mortality.test.ts` holds the twelve-seed Congress rate inside 2.5 to 6.5; `succession.test.ts` covers the House special, Senate law by state, governors, Secretaries (now with the `died` departure flag), foreign leaders and an empty seat in a count.
- **Status:** closed (was open · critical · engine).
- **Owner:** world dynamics program, Wave 2; people-and-succession lane (Opus), appointments contract with the institutional lane.
- **Missing:** `judicial-vacancies.ts:75` is the only writer of `alive: false`, so no member of Congress, cabinet officer, governor or foreign leader ever dies; `foreign-politics.ts:456-463` consumes a death nothing produces.
- **Acceptance:** life-table mortality for occupied offices, one keyed draw per person and year, without copying the judge-specific adjustments (`judicial-vacancies.ts:25-29`) and without a second hazard for judges; succession, vacancies and special elections run. The President does not die at random in the baseline, stated as a rule (PROGRAM.md §5 item 10). Probe `events.probe.test.ts` "lets someone other than a judge die in four years" (rate across seeds) passes. SCHEMA, ARCHITECTURE and save migration.
- **Evidence:** Wave 0 run: 0, 0 and 0 people dead other than judges in three idle four-year runs.
- **Blocked by:** nothing.

### BL-299 A raised military threat never reverts after a war ends

- **Closed:** October 25, 2026, reactions lane `15b596067` (merge `d93e479fe`), integrated in the commit that carries this entry. `DurableShift` carries `militaryThreat` (a war fought +0.3, its scar +0.05); the memory phase settles threat above its anchor at the grievance half-life and below it at the favor half-life (planning values).
- **Proof:** `relationships.test.ts` (threat held while the war is fought, falling back after it ends but staying above the no-war control, founding-exact). Idle 104 weeks on three seeds (memory-1..3), the reactions merge before and after: mean directed military threat 0.2255, 0.2263, 0.2263 → 0.2251, 0.2261, 0.2257; edges above 0.55 threat 708, 717, 724 → 700, 716, 714.
- **Status:** closed (was open · medium · engine).
- **Owner:** world dynamics program, Wave 2; relationship-memory lane (Opus).
- **Missing:** a watched war now presses each bystander's `militaryThreat` toward the aggressor up to a bounded level (`war-tick.ts#worldOpinionEffects`, `WAR_ALARM_RISE` 0.125 × (0.5 + intensity)), but threat has no memory reversion: once the war ends, the raised reading stays where the war left it for the rest of the campaign. Trust and tension settle toward the pair's anchor (DECISIONS §4.8); threat does not.
- **Acceptance:** threat settles toward `structuralReading`'s `militaryThreat` after the pressure ends, by the same approach-to-target form, with its own half-life labeled a planning value; a regression shows a war's raised threat falling back after the armistice and staying above structural while the war runs. Idle 104-week mean threat reported before and after.
- **Evidence:** memory lane 1R notes (`docs/audits/2026-10-24-world-dynamics/lanes/memory.md`, "Known gap"); merged at `c3bbbf6ec`.
- **Blocked by:** nothing.

### BL-289 A public rallies once to serial wars

- **Closed:** October 25, 2026, opinion lane `243e7b5b0` (merge `e6924e8ec`), integrated in the commit that carries this entry. The valid-act test came first: `opinion-war.test.ts` "reaches the ledger only through congressional authorization, one vote per war" shows serial invasions are reachable only with an authorization per war (an unauthorized second invasion is refused by the War Powers check). Rally fatigue then divides each later war's rally by `1 + 1.0 × S` over earlier rallied wars, ended ones included (`opinion-war.ts#rallyFatigueFactor`, planning values); DECISIONS 5.17 amended.
- **Proof:** probe `opinion.probe.test.ts` 2b passes: first rally lift 0.132, the lift held at week 56 by a war every seven weeks 0.037, inside the 0.04 asked (Wave 0: 0.082).
- **Status:** closed (was open · medium · engine).
- **Owner:** world dynamics program, Wave 2; opinion lane (Opus).
- **Missing:** each new war restarts its own rally and the stock takes the maximum (`opinion-war.ts:42-50,89`), so wars opened seven weeks apart hold the lift up. The probe injects wars directly; whether a player can open them through the act path, and gain on net, is not established.
- **Acceptance:** first, a valid-act test of serial wars through `resolveAction` and the War Powers path; if reachable and net-positive, a shared rally-fatigue stock with DECISIONS §5.17 amended. Probe `opinion.probe.test.ts` 2b (the lift at week 56 at most 0.04) passes, or is rewritten to the act path if the injected case is unreachable.
- **Evidence:** Wave 0 run: first lift 0.132, still 0.082 at week 56.
- **Blocked by:** nothing.

### BL-275 Export receipts on delivered volume, and the shortage on the flags a strait stops

- **Closed:** October 25, 2026, merges `a4eacc45b`, `c09676065` and `3c2ecd43d` (economy lane rounds 1, 1b and 1R), integrated in the commit that carries this entry. Receipts follow delivered volume, stranded cargo costs what a lost sale costs, a stopped flag goes short, and losses are deduplicated per flow and upstream (DECISIONS §6.10 amendment).
- **Proof:** probe `economy.probe.test.ts` B3 passes (week 12 of full closure: KWT −0.0393, QAT −0.0651, IRQ −0.0332 against NOR +0.0040) and B4 passes (Japan's growth-hit ratio passed/stopped 0.573 against the crude-rise ratio 0.786); the B12 controls hold (crude 1.013 a year after reopening, low 0.987; identical wars peak 1.371 and 1.366). `commodity-hormuz.test.ts`'s Kuwait-gains assertion is replaced. **Deviation from the acceptance text:** the shortfall is sized by `geo.chokepointDependence`, not `CHOKEPOINT_CARGO` over consumption, because the dataset's consumption is primary energy in TWh and cannot serve; the sourced series is BL-302. The August-2026 band floor was lowered from 1.15 to 1.10 (recorded on BL-105). Gate: `docs/audits/2026-10-24-world-dynamics/gates/w1.md`.
- **Status:** closed (was open · critical · engine).
- **Owner:** world dynamics program, Wave 1; physical-economy lane (Opus).
- **Missing:** a supplier's export rent is paid on price alone (`packages/engine/src/commodity-pressure.ts:99-107`), so Kuwait, Qatar and Iraq, whose exports cannot leave Hormuz, gain growth from its closure. Passage decided flag by flag moves only the world price: `passage.stopped` is read solely for global loss (`commodity-shocks.ts:104`), so a flag that is let through bears the same national shortage as one that is stopped, against DECISIONS §6.10's own reason.
- **Acceptance:** receipts follow delivered quantity times price, and a stopped destination carries a physical shortfall sized from `CHOKEPOINT_CARGO` over its consumption, deduplicated against war and sanction losses. Probe `economy.probe.test.ts` B3 (ordering: KWT, QAT and IRQ fare worse than NOR at week 12) and B4 (ordering: Japan's growth-hit ratio passed/stopped below the crude-rise ratio) pass. `commodity-hormuz.test.ts:94-98`'s Kuwait-gains assertion is replaced, the recovery and no-ratchet controls (B12) still pass, and the §6.10 amendment in PROGRAM.md §5 lands with SCHEMA and ARCHITECTURE.
- **Evidence:** Wave 0 run: KWT +0.0092, QAT +0.0092, IRQ +0.0126 against NOR +0.0040; hit ratio 0.858 against price ratio 0.785.
- **Blocked by:** nothing.

### BL-276 Sanctions reach: designation, financial reach and the target's own economy

- **Closed:** October 25, 2026, merges `a4eacc45b`, `c09676065` and `3c2ecd43d`, integrated in the commit that carries this entry. Rungs 3 and 4 gate on designation authority, reach and a fileable non-duplicate measure; one scoped `Coercion` record, read flow by flow, feeds world supply and the target's growth; evasion grows off the register's dates; inherited programs are dated and scoped from their texts and netted from each economy's baseline vintage (new DECISIONS §6.17).
- **Proof:** probe `geopolitics.probe.test.ts` D0 passes (no target refused among IRN, PRK, CUB, BLR, NIC, VEN, RUS) and `economy.probe.test.ts` B8 passes (Iran's growth-pressure change: US embargo −0.0261 against China's embargo −0.0076; US sanctions alone −0.0020). B11's Treasury-debit half landed here too (BL-287). Through the real rung-3 act a designation alone still costs Iran less than China's full embargo; that magnitude is B8's open todo. Left as approximations: BL-301 (Russian metals, Myanmar MOGE), BL-303 (baseline offset assumptions).
- **Status:** closed (was open · critical · engine).
- **Owner:** world dynamics program, Wave 1; gate in the economic-instruments lane (Codex, Opus-reviewed spec), pressure in the physical-economy lane (Opus).
- **Missing:** targeted sanctions and asset freezes need a bilateral trade channel (`instruments-economic.ts:73-76`), and the US table rounds small partners away, so 117 of 195 governments, Iran, North Korea, Cuba, Belarus and Nicaragua among them, cannot be sanctioned by the United States, and no government can sanction a small economy. Separately, world supply gives a US measure the seller's whole output through the dollar (`commodity-shocks.ts:177-179`), while the target's own growth reads only its sales to the imposer (`external-pressure.ts:210-216`), so a US embargo costs Iran 0.000002 of growth. `Coercion` also drops the measure's sector (`external-pressure.ts:99-104`).
- **Acceptance:** rungs 3 and 4 gate on designation authority and financial reach, tariffs and embargoes keep the trade gate, and one scoped reach record (sector, direction, authority, financial reach) feeds both world supply and the target's pressure. Evasion that grows with time is a labeled planning value (economy E26). Probes: `geopolitics.probe.test.ts` D0 (point: targeted sanctions offered on IRN, PRK, CUB, BLR, NIC, VEN, RUS) and `economy.probe.test.ts` B8 (ordering: a US embargo hurts Iran at least as much as an embargo by China, its largest buyer). No OFAC country whitelist and no invented trade lanes.
- **Evidence:** Wave 0 run: D0 refuses IRN, PRK, CUB, BLR and NIC with "a live trade channel with the target"; B8 US embargo −0.000002 against Chinese embargo −0.001519.
- **Blocked by:** nothing.

### BL-277 Relationship memory in two layers, aged by elapsed time

- **Closed:** October 25, 2026, merges `8bc3c4320` and `c3bbbf6ec` (memory lane rounds 1 and 1R), integrated in the commit that carries this entry. One approach-to-target form, favor and grievance half-lives, a cause-tagged durable layer (structural reading, compacts, treaties, severance, wars with a scar), order-independent anchors, and the bloc and war pressures restated as pressed levels (DECISIONS §4.8, CONTENT_DOCTRINE §2 and §7 rule 11).
- **Proof:** probe `network.probe.test.ts` 2b passes (SAU after 13 weeks: favor 0.081, grudge 0.093) and 2c passes (historyPressure 0.0589 for last week against 0.0000057 for ten years ago); `relationships.test.ts` covers the form, founding equals anchor, five-year durable floors, insertion-order bytes and legacy migration (`migrateGrudge`). Three idle 104-week seeds hold hostile edges at about 210 rather than about 650. The half-lives are planning values, untested by the balance harness (Wave 4). Left: BL-299 (threat never reverts), BL-300 (remaining idle hostility). BL-230 is rewritten.
- **Status:** closed (was open · critical · engine).
- **Owner:** world dynamics program, Wave 1; relationship-memory lane (Opus).
- **Missing:** grudges decay linearly at `0.12 × (1 − vengefulness)`, floor 0.02 (`relationships.ts:20-36`), so the median government clears a 0.25 grudge in 3 weeks, while trust has no reversion anywhere (`effects.ts:248`), so a favor is a permanent deposit. `historyPressure` decays by rank and takes no date (`relationships.ts:109-119`), so an act from ten years ago weighs what last week's does.
- **Acceptance:** the shared form `next = target + (current − target) × 2^(−elapsedDays / halfLifeDays)` with separate build and recovery half-lives; a transient layer for favors and grievances and a durable, cause-tagged layer that reversion never erases (a war, treaty or severance leaves a floor after five years). Probes `network.probe.test.ts` 2b (ordering: after 13 weeks the grudge's residual is at least the favor's, and the favor has faded below 0.09) and 2c (ordering: an act ten years old weighs less than last week's) pass. The half-lives are tested in campaigns before any band is asserted (the 26-52 week favor half-life is a candidate). DECISIONS §4.8 and CONTENT_DOCTRINE §2 amended in the same change; save migration. Settle BL-230 alongside, since routine contact adding trust without decay is the same defect.
- **Evidence:** Wave 0 run: favor residual 0.102, grudge 0.000 after 13 weeks (SAU); 0.25 grudge clears in 3 to 6 weeks; historyPressure 0.06 and 0.06.
- **Blocked by:** nothing.

### BL-278 Authority clocks follow the episode and the statute book

- **Closed:** October 25, 2026, merges `e3733750f` and `9dc233c41` (clocks lane rounds 1 and 1R), integrated in the commit that carries this entry. Authority belongs to an episode clock that survives reissue and keeps every covered predicate; enacted ceilings bind it; NEA termination and congressional renewal run through the bill, veto and override path; every deadline reader reads `authorityDeadline` (DECISIONS §6.7 amendment, §1.9 daily hooks).
- **Proof:** probe `law.probe.test.ts` T1 passes (no live Section 122 measure at day 160, reissue refused) and E1 passes (no emergency authority at day 126 under the enacted act). Integration found and fixed two test-side defects: POL-4's pinned list lacked the two new resolutions, and the `emergency-renewal` door fixture assumed a 52-week year and an unopposed declaration. Not proven on the rendered player; left: BL-304 (renewal case id, screen captions) and BL-305 (the termination resolution's vote).
- **Status:** closed (was open · high · engine).
- **Owner:** world dynamics program, Wave 1; authority-clocks lane (Sonnet; Section 122 by sequential Codex handoff after the legal spec).
- **Missing:** a Section 122 tariff can be reimposed on the same partner the day after its 150 days lapse (`tariff-orders.ts:105-134`). The Emergency Powers Limitation Act's summary promises a ninety-day sunset, but its `constrains` carries only `blocksOrders` (`legislative-acts.ts:335-345`) and lapse reads the renewal interval (`emergency.ts:72-78`). Congress cannot end an emergency by joint resolution (50 U.S.C. 1622(a)).
- **Acceptance:** one authority clock tracks the episode across reissued measures and reads enacted limits; a genuinely new predicate is checked rather than banned forever; a partner-specific cooldown is not the fix. NEA termination by joint resolution, with veto exposure. Probes `law.probe.test.ts` T1 (point: no live s122 measure at day 160 and the reimposition refused) and E1 (point: the emergency is no longer active at day 126 under the enacted act) pass. The authority-episode rule in PROGRAM.md §5 item 11 lands.
- **Evidence:** Wave 0 run: T1 and E1 fail as written.
- **Blocked by:** nothing.

### BL-280 Undated scandal flags age like dated scandals

- **Closed:** October 25, 2026, merges `ff03c33b4` and `61158b040` (opinion lane rounds 1 and 1R), integrated in the commit that carries this entry. `scandalPhase` dates an unstamped authored flag once, in a background packet, reading the board as dated so `scandal:live` agrees the same week; the story id stays the flag's.
- **Proof:** probes `opinion.probe.test.ts` 7a passes (no scandal live 104 weeks after an unstamped flag) and 7b passes (headline 0.6043 clean and flagged, mood at target). Old saves are dated on their next simulated week; no version bump (SCHEMA, CONTENT_DOCTRINE §2).
- **Status:** closed (was open · high · engine).
- **Owner:** world dynamics program, Wave 1; opinion lane (Sonnet).
- **Missing:** a `scandal:` flag set without a turn stamp becomes a scandal at intensity 1 that never fades (`press-scandal.ts:238-250`): still live 104 weeks later, a permanent 3.4 points off the headline. Whether shipped content sets one was not established.
- **Acceptance:** the engine stamps an unstamped scandal flag once, centrally, the first week it sees it, keeping its causal identity, and old saves migrate. Probes `opinion.probe.test.ts` 7a (point: no live scandal 104 weeks after an unstamped flag) and 7b (the headline gap under 0.02 once opinion has caught up) pass. A content lint alone is not enough, since other flag writers exist.
- **Evidence:** Wave 0 run: one scandal live, stage developing, intensity 1; 0.604 clean against 0.570 flagged.
- **Blocked by:** nothing.

### BL-281 Attention on change: the removal summons and unchanged deferred matters

- **Closed:** October 25, 2026, merges `2485c85f9` and `88718dba1` (attention lane rounds 1 and 1R), integrated in the commit that carries this entry. A matter with a signature stops the world once per signature through the notice ledger `Campaign.noticed`, written by presentation packets that take no causal id; the removal summons is one stop per rung; Continue and the Brief hold on the engine's own eligibility (DECISIONS §1.5, §1.6, §2.2).
- **Proof:** probe `engagement.probe.test.ts` "interrupts at most once per removal-pressure episode" passes on both seeds (ev-1 removal stops by episode `{1@0.45: 1, 2@0.52: 1, 3@0.45: 1}`, ev-2 none). Stops per 30 days for a President who defers everything: ev-1 7.97 (97 stops), ev-2 6.58 (80), median 3 days apart, against 9.37 and 6.58 at Wave 0. The attention budget is written into §2.2 as proposed, not asserted. The owner confirmed on 2026-10-25 the one behavior change: a hard matter with no deadline stops once per change, no longer weekly after a deferral (DECISIONS 2.2). Scenario matters still carry no signature (BL-296).
- **Status:** closed (was open · high · player-core, engine).
- **Owner:** world dynamics program, Wave 1; attention-and-recurrence lane (Opus contract, Sonnet fixes).
- **Missing:** the removal summons is due whenever pressure sits within 0.08 of the next rung (`packages/player-core/src/summons/due-executive.ts:343-357`), a level and not an edge, so it interrupts a deferring President again and again while the level holds. Deferred matters return after 7 days (hard) or 14 (soft), up to three per stop (`packages/engine/src/attention.ts:97,216-219`), whether or not anything about them changed.
- **Acceptance:** interruptions on arrival, material change and declared notice or default milestones; an unchanged deferred matter is ambient; the removal summons fires once per rung episode and re-arms only on a new rung or a fresh approach after pressure left reach. Idle Presidents keep their exposure (DECISIONS §5.14 still applies). Probe `engagement.probe.test.ts` "interrupts at most once per removal-pressure episode" (point) passes on both seeds; the stops-per-30-days reading is reported across seeds and an attention budget is written into DECISIONS §2.2 before any rate is asserted. `AttentionStop` and `advanceUntilAttention` doc sync if their contract moves.
- **Evidence:** Wave 0 run (player-core probe, `openingCampaign` seeds): ev-1 9.37 stops per 30 days, median 3 days apart, `summons:removal-beat` on 35 of 114 stops, 34 of them inside one episode at the 0.45 rung; ev-2 6.58 per 30 days, median 4.
- **Blocked by:** nothing.

### BL-283 Standing Hill ties carry a leader's brokerage

- **Closed:** October 25, 2026, Wave 2 Hill lane merge `43379d855`, gated with Wave 1 in the commit that carries this entry. Standing caucus (0.02), state-delegation (0.5) and leadership (0.75) ties beside recorded issue contacts (1), strongest per pair, two hops, one visit, bounded effort, willingness at each recipient.
- **Proof:** probe `network.probe.test.ts` 1a passes (founding: recorded contacts 0, downstream responses 8, people pressured 9); the functional-connectivity `it.todo` is now an ordering test (matched willingness, no recorded contacts: sparse 2 against connected 4, roster order irrelevant); 1d was re-scoped to an isolated authored chain and passes (depth 1 at 0.06, depth 2 at 0.03, no third hop). `person-network-influence.test.ts` holds direct 1 against brokered 9 through the day scheduler. Tie weights are planning values.
- **Status:** closed (was open · critical · engine).
- **Owner:** world dynamics program, Wave 2; Hill-influence lane (Codex consumer after an Opus edge contract).
- **Missing:** propagation travels only over contacts the player's own lobbying recorded (`person-network-influence.ts:14-20,80`), and at founding there are none, so a coalition request through the Senate Majority Leader moves the same single member a direct call does. Committee membership rosters do not exist (`state-legislature.ts:372-387` stores chair, ranking and balance only).
- **Acceptance:** standing edges from caucus, state delegation and leadership-to-caucus whip ties (committee rosters only once they exist), weighted, beside recorded contacts; two-hop traversal and its per-hop attenuation kept; willingness at each recipient. Probe `network.probe.test.ts` 1a (ordering: the leader's brokered request reaches more than zero downstream members on a fresh campaign) passes and 1d (attenuation) still passes; the `it.todo` for functional connectivity becomes an ordering test against the new edge set. No rewrite of the biography graph.
- **Evidence:** Wave 0 run: contacts 0, leader reach 8, responses 0, one person touched.
- **Blocked by:** BL-277's edge and memory contract.

### BL-270 The studio shows what a reply does

- **Closed:** October 19, 2026, in the commit that carries this entry. `previewScenario` (`packages/content/src/scenario-reply-preview.ts`) finds every reachability board where the scenario is live and, on the chosen one, runs each reply through `projectReply` and `commitReply`, applies the packet to a copy and diffs it. The diff covers metrics, public judgments, the counterpart relationship, weekly customs, trade measures laid and lifted, flags, the packet's effects and the beats, with the engine's refusal for a reply it will not take. The studio's library and run-item pages render it as "What each reply does" with a board and counterpart picker (`apps/studio/reply-effects-view.mjs`). The page title uses the cast subject. Neither the preview nor the simulator offers the United States as a counterpart. The seven scenario revision kinds now render on Runs (part of BL-271), so a repair can be previewed before publish. The preview found a defect in BL-268's shipped repair of `the-offer-to-lift-both-duties-together`: its lift removed the original tariff while its words were about the ten-percent tariff laid back in kind. Fixed here: `tariffLift.which` and `tariffInForce.of` (`response`), and the scenario repaired under job `trade-acts-response-2026-10-19`, independently reviewed (rejected for one particular and one context sentence, then approved) and baked.
- **Proof:** the running studio on port 4401 shows the repaired scenario lifting `tariff:CAN:food-processing` and the pinned retaliation, with customs falling from $27M to $3M a week. `six-at-the-checkpoint` shows the rescue reply quoted at $912M and $242M booked at commit. Tests: `scenario-trade-acts.test.ts` (response lift, its audit, the preview), `apps/studio/src/reply-effects.test.ts`, `apps/studio/src/job-kinds.test.ts`. Gate: `docs/audits/2026-10-17-scenario-harness/gates/bl-270.md`.
- **Status:** closed.
- **Owner:** scenario harness program.
- **Missing:** the Library's decision tree prints only the authored `cost` and flags. It does not show the resolved impact, an instrument rung's effects, a tariff's measure and customs change, or treasury in dollars. "Play it" offers the United States as its own counterpart, and the page title shows a raw `{counterpart}`.
- **Acceptance:** for each reply, on a chosen seeded campaign and counterpart, the studio shows the effects the engine would apply. It runs the same path as commit (`positionPacket` and the instrument resolver) on a copy of the campaign, never a second formula. The list covers each metric's before and after, trade measures created or lifted, treasury, flags set, and refusals with the engine's own words. Every line names its cause. The preview never casts the founding nation, and titles render their tokens. Observed in the running studio on one tariff, one instrument and one impact-band reply. This stays a developer view. The owner confirmed on October 19, 2026 that impact stays a studio and Record view; the player still does not see it before choosing.
- **Evidence:** `docs/audits/2026-10-17-scenario-harness/FIDELITY-2026-10-19.md` §3; `apps/studio/library-view.mjs`, `apps/studio/scenario-view.mjs`.
- **Blocked by:** nothing. BL-268 closed, so the studio can show the new trade commands.

### BL-268 Scenario trade acts go through the trade engine

- **Closed:** October 19, 2026, in the commit that carries this entry. Engine `tariffAction` lays a reply's tariff on the counterpart or answers a pinned retaliation; `tariffLiftAction` lifts the answered tariff through `liftMeasure`, and with `theirs` the retaliation too. Content schema, cast and command rules carry both, and a lift may price stability and standing but never treasury. `scenario-audit-trade.ts` adds `unrouted-trade-act`, `trade-act-terms-mismatch` and `unstated-trade-act`. The decision screen cites the statute. Seven shipped scenarios were repaired, independently reviewed (four rejected, then all approved) and baked. `CONTENT_DOCTRINE.md` §10 is amended and the 2026-10-17 no-lift rule retired. The pause act was not built, because the engine has no timed pause, so the words say lift. The sanction route stays the economic ladder's third rung, and the one sanction reply had its sanctions removed instead, because a reply runs one commitment.
- **Proof:** `docs/audits/2026-10-17-scenario-harness/gates/bl-268.md`: clean build, typecheck, lint, 9,380 tests (1 skipped), 88 of 88 verify gates, 0 trade-act findings in the corpus outside the one `TRADE_ACT_DEBT` id (BL-269). New tests: `packages/content/src/scenario-trade-acts.test.ts` (fold tests for the lift, the mutual lift and the direct tariff, with the customs line falling, plus the audit cases), `conversation-report-actions.test.ts` (lift and direct-tariff refusals), `apps/player/src/decision/decision.test.ts` (statute citation). Balance not rerun.
- **Status:** closed.
- **Correction (October 19, 2026, BL-270):** the shipped lift in `the-offer-to-lift-both-duties-together` removed the arc's original tariff, not the in-kind one its words describe; fixed under BL-270.
- **Owner:** scenario harness program (`docs/audits/2026-10-17-scenario-harness/FIDELITY-2026-10-19.md` §1).
- **Missing:** a reply can impose a real tariff only when it answers a foreign retaliation the cast pinned (`conversation-report-actions.ts:60-75`). Economic rung 2 posts a fixed 10% on the tariffable goods the U.S. imports most from the partner, whatever the prose names (`instruments-economic.ts:82-125`). No reply can lift or pause a tariff, though the engine has `liftMeasure`. No reply can impose a sanction on a named sector. Replies whose prose does any of these book only stability, standing or treasury deltas, and no audit compares the act a reply's prose states with what its commitment does.
- **Acceptance:** two tiers, by the owner's direction that discrete trade acts and diffuse effects may be handled apart. (1) A discrete act (impose, lift or pause a tariff on a named sector, rate and counterpart; a sectoral sanction) is a typed field on the reply. It runs the same engine call as the act workspace (`imposeTariff`, `liftMeasure`, the sanction rung), with its statute check, its refusal text and its customs and price effects. (2) Diffuse effects stay on impact bands and `cost`. (3) An audit rule (error for new content) fires when a reply's prose states a trade act its commitment does not carry, or states a sector or rate that differs from the one it carries. (4) The replies listed in the note's §1 are rerouted or rewritten, and the grain-cut sign error is fixed. (5) A fold test for each act shows the measure in `campaign.trade.measures` and the customs line moving. (6) `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` are updated for the reply contract.
- **Evidence:** `docs/audits/2026-10-17-scenario-harness/FIDELITY-2026-10-19.md` §1; `packages/content/src/scenario.ts:448`; `grep -rh unrouted- packages/content/src` returns only `unrouted-domestic-act`.
- **Blocked by:** nothing. BL-221's statutes already exist.

### BL-272 Tuning and weights in the studio: read-only, a sandbox, or editable

- **Closed:** October 19, 2026, answered in session: "tuning goes with the sandbox option for BL-272". Option (b): read-only constants and balance results, plus a sandbox that tries overrides on seeded campaigns without writing source. The build work is BL-271's tuning group.
- **Owner:** the owner; then the scenario harness program.
- **Question:** the owner asked for a studio that manages game tuning and weights. Today nothing in `apps/studio` reads `OPINION_WEIGHTS`, `PRESSURE_WEIGHTS`, `BEAT_THRESHOLDS`, the cabinet constants, the impact model or scenario `weight` and `boosts`, and no balance run is listed. Should the studio show these, let a developer try changed values, or write them back to source?
- **Options:** (a) Read-only: every constant with its value, where it is read and the doc that restates it, plus balance-harness results by run. Cheapest; changes still go through code and doc sync. (b) Read-only plus a sandbox: try overrides on seeded campaigns or a short balance run without writing source, and compare the result with the baseline. Moderate cost; nothing can drift from `docs/CONTENT_DOCTRINE.md` §2 or `attribute-consequence.ts`. (c) Editable: the studio writes the constants back to source. Highest risk: an edit that skips the doctrine update, the person-consequence alignment gate or a balance run changes what the player is told.
- **Recommendation:** (b). Writes stay in code, where the doc-sync contract and the gates hold them.
- **Unblocks:** the tuning group of BL-271.

The decisions below are the ones the 2026-10-08 audit left open; each says what it asks, the options with what each costs, and what the audit recommended. The owner already answered the rest on 2026-10-08: `docs/BACKLOG.md` is the one backlog and Construct's ledger is not used here (D1); the local Beads store is removed and the remote refs go at the next authorized push (D2); the gitignored `plan.md` is retired once no session needs it (D4); the leftover Construct commands and Cursor rules are deleted (D10); the presidency-depth audit folder stays until that program closes (D14, overtaken: W0 deleted it on 2026-10-10); the code-comment scrub removes tracker ids and wording only (D15); the AI attribution trailers on two unpushed commits stay (D16); `branch-protection-check.yml` is deleted (D17). BL-10 (the Steam App ID) and BL-26, BL-27 and BL-36 are also the owner's.

Each entry: the date, the id and title, a commit that is an ancestor of the branch, and the proof.

### BL-245 Burn down the premise debt list

- **Closed:** October 19, 2026, in the commit that carries this entry. The last two ids left `scenario-premise-debt.ts`, which is now empty. `the-run-on-the-currency` (core pack): the standing paragraph no longer asserts borrowing or a failed bond sale (the `paid-the-winter-wages` flag carries neither), and it declares an `introduces` premise. `four-counties-quoting-the-flood-bridge`: bind job `bl245-flood-bind` added `conditionActive flood` and `locus.bind "condition"`, published with `upgrade-publish`. Earlier waves: W1 to W3 and BL-267 (`docs/audits/2026-10-17-scenario-harness/waves/`).
- **Proof:** independent review by a separate content-reviewer session (`content/reviews/bl245-flood-bind/review.json`, approve; the pack scenario approved with one wording fix, applied): the earlier W3 reject is cleared. Job gate (reachability, bindings) clean for the flood bind. `scenario-premise-binding.test.ts` "holds the shipped debt to ids that still need it" passes with both lists empty. `pnpm run build`, `typecheck`, the `packages/content` suite (1110 passed) and every `scripts/verify-*.mjs` pass; `verify-scenario-dc-fallback` baseline shrank by the flood id, now bound to the running flood. Corpus rebaked at manifest revision 47 (`admin-2026w34`, 330 scenarios).

### BL-267 Strip the shipped gates that are true on every audit board

- **Closed:** October 18, 2026, in the commit that carries this entry. Regate job `bl267-inert-gate-regate` (37 corpus scenarios) plus two hand edits in `packages/content/src/packs/pilot.ts`. Measured first: on the 65 corpus reachability boards institution delivery and politicization, stability, approval and protest each split on one or two boards, treasury never splits, and unemployment is `normal` on 63, so a replacement bound would admit only the stress board. The default was removal. Twenty-four weeks keep a real gate (a flag, a hazard, the pandemic, `warState`, insurgency). The two coast gates on foreign weeks moved to the counterpart's coast (`the-fishing-rights-nobody-wrote-down`, `the-request-for-a-neutral-port`). Weight boosts lean nine weeks toward the state their story turns on (instability on six unrest weeks, removalPressure on the dormitory fire, warIntensity on the late veterans, pandemic severity on the overflowing ward). `the-shaft-the-state-crew-cannot-reach` gates on INST-STATES delivery at most 0.62 with an `institutionStrain` boost, after the reviewer rejected an instability boost. `the-corridor-workers-want-widened` declares its stoppage as an `introduces` premise, and the universal reasons on `the-premium-the-dealers-kept-charging` and `the-quota-that-emptied-the-docks` were restated without the removed gates. The pilot `the-provinces-the-writ-does-not-reach` keeps a protest floor of 0.45, which splits the pilot boards. Ten routine or serious weeks are now declared universal (doctrine §6.2 rule 2) and carry a `gate-on-nothing` warning by design, with each reason in `docs/audits/2026-10-17-scenario-harness/waves/bl267-inert-gate-decisions.json`.
- **Proof:** all 37 cleared the regate gate, reachability included (the shaft re-gated after its revision). The independent review (`waves/bl267-review.md`, by a reviewer that neither decided nor revised the batch) approved 39 of 39 after one reject was fixed and re-checked, 8 of them with notes. `upgrade-publish` revised 37 in place; the rebake gives 330 scenarios, and `corpus stats` prints no findings. `INERT_GATE_DEBT` is empty and `scenario-grounding-baseline.test.ts` passes. Gate run in a side worktree on 26deca03d plus these changes: build, typecheck, lint and the engine tests (4,647) passed, and the content tests passed after `pilot.test.ts` was reseeded; the full gate of record on the combined tree had not finished when this was committed, and its result is not recorded here. Balance was not rerun for the content change.
- **Status:** closed.
- **Owner:** scenario harness program.

### BL-252 Repair every scenario with an audit finding (alignment program)

- **Closed:** October 18, 2026. All 322 repairs (33 `align-*` jobs) cleared the repair gate, were independently reviewed by three sessions that did not draft them (128, 95 and 99 items; every item approved, about 140 corrected in review and re-gated), and were published with `upgrade-publish`; the corpus is baked into `bundled-corpus.generated.ts` in the commit that carries this entry. Integration fixes: six repairs whose added conditions no board satisfied (listed in the October 18 status this replaces), two arc callbacks re-pointed or rewritten by a follow-up session with its own independent review, the flash-forward in `the-week-the-line-held` ("in the fourth week" to "this week"), and the stripped determiner in four openings. A follow-up session added two audit rules: `inert-gate` (a gate true on every audit board) and `decapitated-opening` (doctrine §6.1). The corpus health report stopped counting every id twice (`existingCorpusErrors` now audits against the revision context). Warnings the reviewers kept are recorded as intentional in each job's review record. The inert-gate debt the new rule found in the shipped corpus moves to BL-267.
- **Proof:** `studio corpus stats`: 330 scenarios, zero error findings. Full workspace build, typecheck, lint and test (9,362 tests) and all 88 verify gates green on the integrated tree; after the last four opening fixes and rebake, content (1,110) and player-core (1,671) tests and all 88 gates rerun green. `DECAPITATED_DEBT` and the time-baseline `SHIPPED_DEBT` are empty. Balance not rerun for the content change.
- **Status:** closed.
- **Owner:** scenario harness program.
- **Missing:** a clean gate pass on every job; the strip of added gates that are true on every audit board (stability, approval and standing at most 0.75 to 0.9, "judiciary present", the player's own coast); an independent review of all 322 with these checks: the opening establishes how the situation came about, every `sets` flag a writer removed (about 25) is justified, price changes still match the prose, no death was added only to price a life (terror added three), `cost: {}` replies read correctly, a flag a condition reads was not renamed; then `upgrade-publish`, the premise-debt list emptied (15 ids) and a re-bake.
- **Acceptance:** the audit reports zero findings on all 330 shipped scenarios except those a reviewer records as intentional.
- **Evidence:** `existingCorpusErrors`; per-job `*.findings.json`; `waves/` records.
- **Blocked by:** nothing.

### BL-251 Errors the shipped corpus already carries

- **Closed:** October 18, 2026. Every remaining error was inside a BL-252 repair job and was fixed there.
- **Proof:** `existingCorpusErrors` returns zero (`studio corpus stats` prints no findings), October 18, 2026.
- **Status:** closed.
- **Owner:** scenario harness program.
- **Landed:** the 43 `commit-time-flash-forward` scenarios were rewritten through `retime`, independently reviewed (9 rejected and replaced from the reviewer's text) and published; `existingCorpusErrors` dropped from 62 to 11 after it also stopped raising five false `family-without-opener` errors (the standing check now reads the bundled core pack's families).
- **Missing:** `generic-place` 1, `locus-ground-mismatch` 2, `manufactured-clock` 2, `nation-name-in-generic` 1, and the families that still read as orphaned in isolation. All are inside the repair jobs of BL-252.
- **Acceptance:** `existingCorpusErrors` returns zero.
- **Blocked by:** BL-252 review and publish.

### BL-177 The readiness gate ignores force orders still waiting to execute

- **Closed:** October 18, 2026. `forceAvailable` nets the readiness the actor's pending rung 3 to 5 military acts will spend (`committedReadiness` in `packages/engine/src/instrument-gates.ts`), in `ebc6559a2`.
- **Proof:** `instrument-issued.test.ts` "readiness promised to orders that have not executed" (another capital at 0.50 readiness: a rung-4 strike passes with no orders, is refused with one rung-4 order pending; rung 3 refused once three are pending). Note against the acceptance below: at 0.50 the *second* rung-4 strike is refused, not the third, since one pending strike leaves 0.42 against the 0.45 gate. Full workspace tests and all 88 verify gates green. Balance harness on October 18, 2026, all 16 files passed: 13 in the combined run (balance 32 with 4 skipped, term 12, macro 18, economy 28, population 13, pledge 5, overruling 1, party-scope 4, and the ws-a to ws-e behavior files); that run hung with idle workers on the three borrowing files, which passed when rerun alone (democrat, independent, republican, 1 test each, about 3.4 hours each).
- **Status:** closed.
- **Owner:** control plane program, CP1.
- **Missing:** `forceAvailable` reads live readiness (`packages/engine/src/instrument-gates.ts:198-205`, read 2026-10-16), and readiness is spent only at resolution. Three timed strikes at 0.50 readiness each pass the 0.45 gate at issue. After the first spends about 0.08, the others are refused at execution as "did not execute" (`instrument-issued.ts:95-106`, read 2026-10-16), after the player was shown them as legal (audit 02 §1.11-2, BL-172 proposal).
- **Acceptance:** `forceAvailable` subtracts the expected spend of the actor's pending rung 3 to 5 acts at no jitter. A test issues three strikes at 0.50 readiness and the third is refused at issue. Existing single-act tests are unchanged. The balance harness is run by hand (`pnpm --filter @admin/engine run test:balance`) and the result recorded here, since NPC acts pass the same gate. How often NPC military acts are timed rather than immediate is measured with it (audit 02 §5).
- **Evidence:** audit 02 `instrument-gates.ts:198-205`, `instruments-military.ts:52-57`, `capacity.ts:109-128`.
- **Blocked by:** nothing.

### BL-178 Booked customs revenue is lower than the tariff preview shows

- **Closed:** October 18, 2026. `selectCustomsReceipts` charges duty once on the live flow, and the order's revenue is net of `customsCollectionShare`, in `ebc6559a2`; ARCHITECTURE's customs paragraph updated in the same commit.
- **Proof:** `executive-work.test.ts` "books a year of duty equal to the revenue the order showed" (25% on Chinese consumer electronics, within 0.5%). Full workspace tests and all 88 verify gates green. Balance harness on October 18, 2026, all 16 files passed: 13 in the combined run (balance 32 with 4 skipped, term 12, macro 18, economy 28, population 13, pledge 5, overruling 1, party-scope 4, and the ws-a to ws-e behavior files); that run hung with idle workers on the three borrowing files, which passed when rerun alone (democrat, independent, republican, 1 test each, about 3.4 hours each).
- **Status:** closed.
- **Owner:** control plane program, CP1.
- **Missing:** The preview prints `tariffIncidence(...).revenue`, which is the basis edge's imports times the rate times one minus the volume fall (`trade.ts:257`). The weekly books recompute `tariffIncidence` on the live campaign (`trade.ts:349-360`). Read on 2026-10-16: the live edge comes from `sectorFlow`, which already multiplies imports by one minus the fall for each tariff in force (`packages/engine/src/trade-volume.ts:115-155`, read by `tradeEdge` at `trade.ts:149-168`). So the fall is applied twice, then scaled by a collection share of 0.6 to 1.0 (`trade.ts:350-351`). Booked is about base × rate × (1 − fall)² × share against a shown base × rate × (1 − fall). This breaks DECISIONS §3.7, and a combined figure across many lines multiplies it (audit 03 §4.1, P4).
- **Acceptance:** A test signs a 25% tariff and asserts that next week's annualized `selectCustomsReceipts` equals the shown revenue times the shown collection share, within rounding. The preview shows the net figure or labels the collection share. ARCHITECTURE is updated where it describes customs. A balance run is recorded, since treasury moves.
- **Evidence:** audit 03 `trade.ts:257,349-360`, `trade-volume.ts:149-153`, `assessment-ties.ts:99`, `docs/DECISIONS.md:138-140`.
- **Blocked by:** nothing.

### BL-266 The Courts summary card centers its empty state between left-aligned readings

- **Closed:** October 18, 2026, in the commit that carries this entry. Found by the owner from a capture: "Next court date" sat on the card's left edge while "No cases are waiting on you" centered itself across the card. `Empty` is the whole-panel placeholder every other screen uses to fill a region; this card used it inline between a `StatGrid` and a caption. `apps/player/src/courts/CourtsScreen.tsx` now shows "Waiting on you" as a reading in the same grid at zero ("None"), and the inline `Empty` is removed.
- **Proof:** live dev server `/washington/courts` on the sealed sample administration: desktop shows "Waiting on you: None", "Seats filled: 9 / 9", "Next court date: Not scheduled" in one row on one left edge; at 375×812 the three readings wrap to two columns, every row starts at x = 36, and `scrollWidth` equals the viewport (375). `@admin/player` typecheck clean.
- **Status:** closed.
- **Owner:** universal player program.

### BL-184 Expiring tariffs leave their price increase behind

- **Closed:** October 18, 2026. Taken in this session's engine commit. `expireTradeMeasures` now lifts with the same `priceMove` a manual lift uses (`liftPriceMove` in `packages/engine/src/trade-effects.ts`, rounded in tariffIncidence's two steps so a lapsed line returns the shelf exactly); retaliation it drew stays recorded.
- **Proof:** `tariff-orders.test.ts` "takes a lapsed tariff's price increase back off the shelf, and keeps the answer it drew": a Section 201 safeguard's price is unchanged the day before its term ends and back to baseline on the day, every US line lifted, retaliation unchanged. Full workspace test pass and all 88 verify gates green on October 18, 2026.
- **Status:** closed.
- **Reconciled (October 18, 2026):** Status: open, engine defect, now live (no longer "harmless today"). Acceptance: drop "A tariff line with a duration gets expiresDate" (landed with BL-221); keep the sectorPrice reversal and test the expiry week for a §122 tariff. Checked against: packages/engine/src/trade-effects.ts:145-152 lifts with no priceMove; tariff-orders.ts:134 sets expires for clockDays statutes (s122 150 days, s201 4 years); trade.ts:632 liftMeasure does reverse.
- **Owner:** control plane program, CP2.
- **Missing:** `expireTradeMeasures` lifts a measure with `{ kind: "trade", lift }` and no `priceMove` (`packages/engine/src/trade-effects.ts:125-138`, read 2026-10-16), while `liftMeasure` reverses the move (`trade.ts:636`). The reducer changes `sectorPrice` only when a `priceMove` is present. Harmless today because the only expiring measure has rate 0. It becomes wrong when a tariff line carries a duration, which the trade workspace adds (audit 03 §4.2, P5).
- **Acceptance:** A tariff line with a duration gets `expiresDate`. On expiry, `sectorPrice` returns by the amount `liftMeasure` would remove. Retaliation answering the expired line stays recorded. A test covers the expiry week.
- **Evidence:** audit 03 `trade-effects.ts:116-138`, `trade.ts:636`.
- **Blocked by:** nothing.

### BL-176 The War Powers second-front check ignores force orders still waiting to execute

- **Closed:** October 18, 2026. Taken in this session's engine commit. `warPowersStanding` (`packages/engine/src/congress.ts`) counts the President's issued rung 3 to 5 military acts still waiting to execute, with no authorization against their target, as an open front. The resolver's own view marks the executing act resolved, so an order never blocks itself. No save shape changes; ARCHITECTURE's War Powers paragraph says so.
- **Proof:** `instrument-issued.test.ts` "counts an issued unilateral strike as an open front before it executes" (a rung-4 strike against B is refused with the second-front reason while one against another country waits) and "lets the pending strike itself execute" (status `reported`, unauthorized record written). Existing congress, war-powers-report and war-entry suites unchanged and green. Full workspace test pass and 88 gates green, October 18, 2026.
- **Status:** closed.
- **Owner:** control plane program, CP1.
- **Missing:** `warPowersStanding` requires an authorization only for expired obligations and for entries in `congress.unauthorized` (`packages/engine/src/congress.ts:298-343`, read 2026-10-16). Those entries are written at resolution by `warPowersRecord` (`instrument-records.ts:102-106`, read 2026-10-16), not at issue. So two unilateral rung-4 acts against two countries can both be issued, and the later one is refused at execution with its escrow returned, long after the player was shown it as legal (audit 02 §1.11-1, BL-171 proposal).
- **Acceptance:** With one pending unilateral rung-4 act against A, `projectAction` for rung 3, 4 or 5 against B returns `ok: false` with the second-front reason. A new engine test covers issue A, then B refused. Existing single-act tests are unchanged. The War Powers section of ARCHITECTURE is updated. The derived read changes no save shape.
- **Evidence:** audit 02 `congress.ts:298-343`, `instrument-records.ts:102-106`, `instrument-issued.ts:99-103`.
- **Blocked by:** nothing.

### BL-265 Instructions and the doc-sync map cite gates that no longer exist

- **Closed:** October 18, 2026. Taken in this session's docs commit. CLAUDE.md and `docs/DOC_SYNC_MAP.md` no longer name `verify-dist-freshness`, `verify-wave-closeout`, `verify-engine-reachability`, `verify-doctrine-metric-alignment` or `scripts/pin-ledger.json`. The merge flow says committed `dist/` is checked by hand (`git status --short -- '*/dist/*'` after the commit), the close-out section says no gate holds its three steps, and the doctrine constants are checked by the reviewer. Decision: no replacement freshness gate, since `8caf5b441` removed it on purpose with the internal-only gates.
- **Proof:** Every `verify-*` name in CLAUDE.md and DOC_SYNC_MAP.md resolves to a file under `scripts/` (checked by loop on October 18, 2026).
- **Status:** closed.
- **Owner:** whoever next edits CLAUDE.md; no program.
- **Missing:** `8caf5b441` removed `scripts/verify-wave-closeout.mjs`, `verify-dist-freshness.mjs` and `verify-engine-reachability.mjs`, but CLAUDE.md still tells a session to confirm `verify-dist-freshness` passes before a merge and says `verify-wave-closeout` holds the close-out steps, and `docs/DOC_SYNC_MAP.md` names `verify-dist-freshness` and `verify-engine-reachability`. A session following the merge flow is told to run a gate it cannot find, and the wave close-out steps 1 to 3 are now held by nothing.
- **Acceptance:** CLAUDE.md and `docs/DOC_SYNC_MAP.md` name only gates under `scripts/`, and the close-out section says plainly which steps a gate holds and which are by hand. Decide whether `dist/` freshness needs a replacement check; if not, say so where the merge flow is written.
- **Evidence:** `test -f scripts/verify-dist-freshness.mjs` and the two others fail at `84e7e85d7`; `grep -n verify-dist-freshness CLAUDE.md docs/DOC_SYNC_MAP.md`. Found by the backlog reconciliation on October 18, 2026.
- **Blocked by:** nothing.

### BL-86 Court seats never open in play

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Merged into BL-123. Vacancy engine now exists: judicialVacancyPhase is wired in turn-phases with a CDC life table, retirement hazard and Senate nomination path; item itself says close when BL-123's vacancy half lands.
- **Proof:** packages/engine/src/judicial-vacancies.ts:12-45; turn-phases.ts:177; git log -S judicialVacancyPhase -> 2076406a5 (ancestor); BACKLOG.md:1111 BL-123 "ordinary seeded Supreme vacancies ... implemented".
- **Status:** closed.
- **Owner:** engine (courts)
- **Missing:** no engine path empties a seat (no death, retirement or resignation), so judicial nomination is reachable only from a fixture that stages a death.
- **Acceptance:** a sourced, seeded vacancy process (age-based retirement and mortality), with the balance harness run.
- **Wave:** W7.
- **2026-10-11:** absorbed into BL-123 (Phase K of the simulation-depth program), which adds strategic retirement and lower-court vacancies. Close this item when BL-123's vacancy half lands.

### BL-90 Fill the map ground; keep dots where they mean something

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Targets the legacy apps/web MapLibre map (fills, coast glow, terrain) and its six-width perf budget; DECISIONS 8.8 puts the one MapView in packages/ui with web and native drawings. superseded by: universal-player map (BL-163 UP7, BL-181). Carry forward only a frame-time/phone measurement of the player MapView if none is tracked.
- **Proof:** docs/DECISIONS.md:481-484; packages/ui/src/map/MapView.tsx; apps/web/src/map/gl exists (frozen).
- **Status:** closed.
- **Owner:** W9 visual pass
- **Missing:** the frame-time budget and the six widths have not been measured on the lit ground (fills, coast glow, terrain relief). The terrain's render cost was measured in the page: 27 ms at the world view, 147 ms at the blended US view, spread a few rows a frame. A slow cold load seen in session was the hidden test pane delivering no animation frames (`visibilityState: hidden`, 0 frames a second), not the game.
- **Acceptance:** 4×-throttle frame times on `/dev/map` and `/world` within DESIGN.md's budget (60fps desktop, 45fps throttled phone), with the terrain job on; the plate decode measured on a phone profile (it runs after the first frame); live checks at 320, 390×844, 768, 1280×800, 1440×900, 1920×1080 show the lit ground, terrain, dither dots only in mixed regions, centroid rings on tiny regions, and the glowing dotted texture on a detached selection.
- **Evidence:** `32033bd5e` (fill pass), `4fb846e31` (sea, coast glow, terrain relief with the blend's Newton inverse, saturated ramps, glass frame, display face), `705e4a58f` (lifted places on the Brief, lit tiles); `detach.test.ts`, `projection.test.ts` "the blend's inverse", `relief.test.ts`, `color.test.ts`; screenshots in session at 1440×900.
- **Blocked by:** nothing.

### BL-92 Map cards: surfaces laid on the map at a place

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Map cards laid over a full-screen map in apps/web; §8.8 retires the persistent-map shell and per-screen map components in favor of a framed MapView panel with a list twin. superseded by: DECISIONS 8.8 / BL-181 (MapView multi-select, marks and arcs).
- **Proof:** docs/DECISIONS.md:482; apps/web/src/map/MapCards.tsx (frozen).
- **Status:** closed.
- **Owner:** W9 visual pass
- **Missing:** the card layer (`apps/web/src/map/MapCards.tsx`, placement in `map/cards/placement.ts`) is built, with the Brief's matters and a war's two sides as cards. Not yet: a state quick card on Nation, a nation card on World with standing and the act door, command cards on Security, the receipt's delta callouts ("Ohio ▲3") after an authorize, cards joining the marks' roving keyboard group, and the phone rail checked against the verb in the lowest 112px at 320×568.
- **Acceptance:** each use above live at 390×844 and 1440×900; a Playwright check that a card is placed beside its anchor and held back when its place leaves the visible map; the rail never covers the sheet's verb.
- **Evidence:** `7d6aa5ff6`, `0ad0e7568`; `map/cards/placement.test.ts` (4 tests).
- **Blocked by:** nothing.

### BL-93 Readings by kind instead of bar lists

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Names apps/web one-off meters and @admin/ui-web Trend/Strip; the player now has keyed Meter, Sparkline, ShareBar etc. under ReadingFrame, gated by verify-reading-keys. superseded by: BL-237 (and BL-136 for remaining visual acceptance).
- **Proof:** BL-237 Done list; BACKLOG.md:521-526.
- **Status:** closed.
- **Owner:** W9 visual pass
- **Missing:** `Trend` and `Strip` are in `@admin/ui-web`, and the list meter is a bead on a slim track. The Brief (Now strip, judgments, clocks, standing) and the Nation home (state strip) use them. Not yet: headline readings on Washington (office, person, Congress), World (nation dossier, organization), Security (commands, readiness) and Record; the seven one-off meters in `apps/web` (`BandMeter`, `CountMeter`, `MoveMeter`, `SenateMeter`, `StrikeMeter`, `MovedMeter`, and the icon/text clock meter) folded into the primitives.
- **Acceptance:** no screen reads as a column of bars; each reading with a history draws as a `Trend`; a set of members on one scale is a `Strip`; the primitives' tests cover each; the screens' specs still pass at six widths.
- **Evidence:** `7d6aa5ff6`, `966fef584`; `packages/ui-web/src/primitives.test.tsx` (Trend and Strip); the unused Ring and Lines primitives were removed after the operations surfaces replaced them.
- **Blocked by:** nothing.

### BL-94 Spatial panels that leave the map room

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Concerns the legacy wide Spatial panel on /world/war and /world/treaty in apps/web; the retired map shell is gone and the player pages are framed panels. superseded by: DECISIONS 8.8; BL-136.
- **Proof:** docs/DECISIONS.md:482; apps/web/src/world/war/WarScreen.tsx (frozen).
- **Status:** closed.
- **Owner:** W9 visual pass
- **Missing:** `/world/war/:id` and `/world/treaty/:id` always take the wide panel (65% of the room), so the war's own map is a strip (`apps/web/src/world/war/WarScreen.tsx`, `treaty/TreatyScreen.tsx`, `wide`). Their comparisons need the room only while the President is deciding.
- **Acceptance:** a Spatial screen opens at the docked width and widens only while a comparison is open or a receipt shows; `world-sets.spec.ts` updated and passing at six widths.
- **Evidence:** screenshot at 1440×900 in session, 2026-10-10.
- **Blocked by:** nothing.

### BL-96 Map ground: provinces, places, sea, seams and a steady terrain

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Province lines, city pins, sea and terrain for the legacy apps/web map. The player MapView at packages/ui/src/map is a separate implementation (relief, style, worker). superseded by: BL-163 UP7 / BL-181. Note: no player-side BL covers province lines or a bathymetry plate; open one only if the owner wants them.
- **Proof:** packages/ui/src/map/style.ts, apps/player/src/map/relief.ts; apps/web/src/map/provinces.ts (frozen).
- **Status:** closed.
- **Owner:** W9 visual pass
- **Done in the working tree (2026-10-10, owner review of the live build):** a selected foreign government draws its first-level divisions as inner lines on its lifted face and names them (`scripts/bake-map-provinces.mjs` from Natural Earth admin-1, 184 governments, 783 KB, one lazy file each; `apps/web/src/map/provinces.ts`; label tier `province`); its capital and cities from the dataset are pinned (`nationPlaceMarks`, shown whatever event layers a screen turns off); the US outline is drawn under the Census states so no sea shows along Canada and Mexico (`scene.underlay`); the sea has a soft swell and a shelf band (`map/sea.ts`); a re-center waits for its new terrain before swapping and only the first terrain fades in (`ReliefLayer.settled`); the terrain lights the lifted selection and fades out past zoom 4.5–6.5 where the 50m plate is only blur.
- **Missing:** the province layer gives no data per province, by decision (geography only; the game keeps none); a bathymetry plate for the sea (Natural Earth ocean-bottom relief) was not vendored; a finer terrain plate for city zoom was not vendored; a pin seen drawn over the wrong state once after a wheel zoom was not reproduced; frame-time budget on the new layers unmeasured.
- **Acceptance:** `provinces.test.ts` and `marks.test.ts` pass (they do); live checks of Iran and Canada selected at 390×844 and 1440×900; 4×-throttle frame times on `/world/nation/CAN` within DESIGN.md's budget.
- **Evidence:** screenshots in session 2026-10-10 (Iran with provinces, terrain and cities on the Brief; US–Canada seam at Minnesota).
- **Blocked by:** nothing.

### BL-97 Readings and cards with depth: tags, radar, chair cards, briefing memo

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. The item itself says superseded in part by BL-136; Radar was deleted; the rest is @admin/ui-web and dist rebuild. superseded by: BL-136.
- **Proof:** BACKLOG.md:~842 "Current reconciliation (October 15)"; ui-web frozen.
- **Status:** closed.
- **Owner:** BL-136 player rebuild; the W9 descriptions below are historical.
- **Current reconciliation (October 15):** the ordinal-area radar call sites were replaced by explicit value/band/confidence and contribution comparisons. Integration source search proved no player Radar consumer remained; its unused implementation, exports, styles and component-only tests were deleted. Tag and current contextual card/memo capabilities remain. The current shadcn route and state verification lives in `docs/player-rebuild/SHADCN-INTEGRATION.md`; historical captures do not certify this tree.
- **Done in the working tree (2026-10-10, owner review):** `Tag` and `Radar` in `@admin/ui-web`; severity and kind as tags on the Brief's top matter (now a whole-card door) and the decision (`decision/ScenarioTags.tsx`); approval's six judgments as a radar on the Brief and the approval screen, each judgment a lit tile with its mark; one `PersonCard` (`washington/card/`) with band, share and lean dials for the executive chairs, the bench and the Hill's leaders; the decision's situation set as a Situation Room memorandum (precedence banner, masthead, to/from/date/place, numbered sections, a mark per party pressing).
- **Missing:** the `ui-web` `dist/` rebuild and commit; Playwright at six widths after the decision memo change; the Series chart on the approval screen still draws a nearly empty plot in an early term; the committee ledger on Congress is not yet a card.
- **Acceptance:** `pnpm run build`, `verify-dist-freshness` and the Washington, congress, courts and loop specs pass at six widths.
- **Evidence:** `primitives.test.tsx` (Tag, Radar); screenshots in session 2026-10-10.
- **Blocked by:** nothing.

### BL-107 Operations redesign of the player

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. "Operations redesign" was an uncommitted apps/web/ui-web pass; its grouped nav, Collection/Document/valence cues and authorize hook were rebuilt in the universal player and DESIGN.md already describes the accepted workspace. superseded by: BL-136 + BL-163. Note one residual: confirm findings.md items are carried; unverified.
- **Proof:** docs/audits/2026-10-11-operations-redesign/; CLAUDE.md visual direction; apps/web/src/app/use-authorize.ts frozen.
- **Status:** closed.
- **Owner:** operations redesign (`docs/audits/2026-10-11-operations-redesign/`)
- **Done (uncommitted, 2026-10-11):** light tokens with chrome and map scopes; Source Sans 3 and Source Serif 4; grouped navigation at four widths; map only on spatial screens (DECISIONS §8.8); `Tabs`, `Collection`, `Document`, valence cues and whole-row targets; one authorize hook (`apps/web/src/app/use-authorize.ts`, 7 tests); custom domain glyphs and `/dev/icons`; every screen family restructured to the brief; press room, dispatch, ending and legacy restored from the unmerged `w8a-record` commit by file copy; institutional language. Build and typecheck passed after the screen restructures; later polish not typechecked.
- **Open:** finish the polish round; e2e specs updated for renamed headings and tabs; full gates; `docs/DESIGN.md` and `docs/ARCHITECTURE.md` rewritten for the new shell; `after/` evidence; findings closed in `findings.md`; commit.
- **Acceptance:** every route in `routes.md` checked at 1440 and 390 against `CONTRACT.md`; gates green in CLAUDE.md order; DESIGN.md matches the shell; findings register closed or carried with evidence.
- **Evidence:** `docs/audits/2026-10-11-operations-redesign/HANDOFF.md`, `README.md`, `findings.md`.
- **Blocked by:** nothing.

### BL-98 Rebuild the map on MapLibre GL

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. MapLibre rebuild of the legacy apps/web map (steps 1-2 uncommitted there; remaining steps are deleting the old apps/web renderer). The player has its own MapLibre web + native MapView, which DECISIONS 8.8 records. superseded by: DECISIONS 8.8 / BL-163 UP7 / BL-181. Remaining legacy-only items (insets on Canvas, scripts/measure-map-spike) die with apps/web at UP11.
- **Proof:** apps/player/package.json:26,42 (maplibre native + gl); packages/ui/src/map/MapCanvas.web.tsx/.native.tsx; docs/DECISIONS.md:481.
- **Status:** closed.
- **Owner:** W9 visual pass
- **Done (steps 1 and 2, uncommitted 2026-10-10):** `maplibre-gl@6.11.2` pinned exact. `MapLayer` now mounts the GL map (`apps/web/src/map/gl/`): world-hi, states-hi and (lazily) districts-hi from the baked topologies, feature id = region index; every lens painted by feature state (`lens-paint.ts`; a dither draws its largest share) on the layer its level reads; the selection lifted with a glow edge and the rest faded; every camera key framed through `resolveCameraKey` inside the chrome's visible area by our own Mercator fit (`fitCamera`; MapLibre's own fit declines on the globe under a wide panel's padding), the world view floored so the globe fills it; plus, minus, re-frame (`0`) and globe controls placed clear of the panel or sheet; the title screen's turn; terrain from the Natural Earth relief baked to Mercator tiles (`scripts/bake-map-relief-tiles.mjs`, zoom 0 to 4, 341 tiles, 6.1 MB under `apps/web/public/map/relief/`), drawn over land at 82% opacity; the graticule; the selected government's province lines. The overlays (cards, labels, pins, arcs) read a `MapView` (`map/view.ts`) that `gl/gl-view.ts` supplies from MapLibre's camera, so pins sit within 0.3px of their point at rest and mid-flight. Shapes that cross the antimeridian (Russia, Fiji) are cut at ±180° (`splitAtAntimeridian`), which removed the pale bands around the pole. The worker is a same-origin file, so the CSP is unchanged. Proof: `gl.test.ts` (10 tests), the web unit suite (204 at the time), `map.spec.ts` 8/8 at 390 and 1440; moving-frame p50/p95 8.3/8.9 ms in a wheel burst and a flight at 390×844 on a 120Hz display.
- **Open:** the Alaska and Hawaii insets still draw on the old Canvas renderer (`UsInsets.tsx`); the hex House is unchanged; state and nation names are the old DOM label layer (symbol layers need an offline glyph set); the world view centers on longitude 0; no 4× CPU-throttle measurement; Electron's `administration://` scheme untested with the module worker; `scripts/measure-map-spike.mjs` still reads `__mapHarness.renderer`, which is now `runtime`; Playwright not yet run at the other four widths or on the other screen specs. Step 3 (delete the old renderer), 4 (DEM hillshade, if the relief tiles are not enough), 5 (docs) and 6 (proof) remain.
- **Missing:** the hand-built Canvas 2D map zooms in jumps with no bounds, keeps coarse shapes when zoomed in, rebuilds its projection after every move, lets pins drift from the land (Oklahoma City drawn over Mexico), blurs its terrain up close, and has no plus, minus or reset. Owner decision 2026-10-10: replace it with MapLibre GL JS. Plan, causes by file, carried-over requirements and order of work: `docs/audits/2026-10-10-map-first/MAPLIBRE-REBUILD.md`.
- **Acceptance:** the plan's six steps done; smooth wheel and pinch zoom with controls; every screen frames its subject; no pin drift; frame-time budget met at phone and desktop; the old renderer deleted; DESIGN.md, DECISIONS.md and ARCHITECTURE.md updated; specs at six widths.
- **Evidence:** owner screenshots 2026-10-10 (Oklahoma City pin over Mexico, spiky Texas coast).
- **Blocked by:** nothing.

### BL-101 Text-heavy screens get marks, flags and drawn stages

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Marks, flags and drawn stages for text-heavy screens in the legacy app (Record rail, Oversight stages, Security items); the player's equivalent is the keyed-reading and uniformity work. superseded by: BL-237 / BL-136. unverified whether Record/Oversight/Security in the player are as rich; owner may want a visual re-review.
- **Proof:** BL-237 Done list; apps/player/src/record/RecordSections.tsx.
- **Status:** closed.
- **Owner:** W9 visual pass
- **Missing:** owner review 2026-10-10: several screens are still prose and lists with no icons or visual readings. A survey by text length against glyphs drawn put the Record (no glyphs), Oversight, Security, the press office, the budget, a nation's file and Settings worst.
- **Done in the working tree:** the Record is a dated rail, each entry with a mark for the subsystem it moved (`record/entry-mark.ts`), gold for your acts, blue for the world's, red for force, a flag per foreign government it names, and arrowed change chips (`recordRows` now carries `systems` and `nations`; the weekly fading of grievances between governments now stamps both governments, `engine/src/relationships.ts`); Oversight's inquiry stages are numbered nodes on one line with count bubbles, and each inspector general carries their office's emblem; Security's morning items carry an urgency glyph and each covert finding its target's flag.
- **Acceptance:** each named screen leads with a drawn reading or marked list before prose; checked at 390 and 1440.
- **Blocked by:** nothing.

### BL-99 A short description and a help tip for every area

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Item's own 2026-10-17 note says the player's readings carry a one-line measure and a "How to read this" with Handbook door (verify-reading-keys); HelpTip/GlossaryTip named are ui-web and frozen. superseded by: BL-237.
- **Proof:** BACKLOG.md:~884 Progress note; scripts/verify-reading-keys.mjs.
- **Status:** closed.
- **Progress (2026-10-17, BL-237):** in the universal player every drawn reading carries a one-line measure and a "How to read this" with a Handbook door (`verify-reading-keys`). The legacy app is frozen.
- **Owner:** W9 visual pass
- **Done:** `HelpTip` (ui-web, a toggletip: click, tap or Enter, announced through a polite status region, closes on Escape, click-away or blur) and `GlossaryTip` (reads `glossaryEntry`); the Nation screen's lens switch says what the chosen lens shows; the state strip's dots carry postal codes and a name-and-figure tip on hover and focus.
- **Missing:** the same on the Brief, Washington, World, Security and Record; a `HelpTip` test.
- **Acceptance:** every section that names a reading or a process has a visible one-line description, and a `GlossaryTip` where the glossary has the term; keyboard and touch both open every tip.
- **Blocked by:** nothing.

### BL-100 Official dossiers, a richer World and a staged act flow

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Dossier frame, World standing strip and act-desk stages for apps/web; the player has dossier/Network in packages/ui, a rebuilt World, and the act workspace (BL-231). superseded by: BL-136 (visual acceptance) and BL-231. Residual "office, judge, nation, state files on same frame; relationship map" unverified in player.
- **Proof:** packages/ui/src/dossier/{Dossier,Network,Readings}.tsx; apps/web/src/shell/dossier frozen.
- **Status:** closed.
- **Owner:** W9 visual pass
- **Missing:** the owner's review of 2026-10-10: every dossier (office, person, judge, nation, state) reads as plain lists without official framing, icons or ratings drawn as readings; the person relationship map is poor; `/world` is weak; the act flow after "Act on …" is clunky. Brief with the pieces to reuse and the order: `docs/audits/2026-10-10-map-first/DOSSIERS-AND-WORLD-BRIEF.md`.
- **Done toward it:** a flag-colored rule under every screen header; `DoorTile` as the one navigation pattern, used for Washington's Congress, Courts and Oversight. In the working tree (2026-10-10): the shared dossier frame (`apps/web/src/shell/dossier/`: seal banner with the keeping house and handling mark, ID plate with a corner-marked photo frame, file number and date read, vitals each with a mark, numbered sections), applied to the person file: standing and party tags, the five readings as a radar with a mark per reading over their meters, the circle as a map of faces around the subject (line weight for strength, blue warm, red broken cold; every tie still listed in a fold), the career as bands along the years with a mark per field, counsel with a stance mark.
- **World home and act flow (2026-10-10):** the owner called a first decorated pass gimmicky; the version in the tree is set like a briefing. World: a standing bar in the map's own stance colors with a legend that is the count, the six regions (`worldOverview`, `world-regions.ts`, State Department bureau grouping) as a filter, the watchlist as ruled rows with a flag or mark and a stance mark, and every government on one axis by region (`StandingStrip.tsx`), each a flag coin where its trust sits inside its band (the word stays the band's; `STANDING_BANDS` draws the cuts), with unread governments in their own tray; the ranked list is behind "As a list" and answers every search. Act desk: target plate with stepped readings and a door to the file, a four-stage rail (Objective, Act, Terms, Authorize), objective tiles with a mark and the open count, act cards with the odds as five pips and money and wait each with a mark, "Who acts" as cards. The comparison draws its answers: chances as five pips, each cost as a red or blue arrow chip, the governments that react or stand with you as flags, each failure branch with its pips, the offices consulted with their department marks, a mark per row, long reasons folded under "Why" (`AssessmentCell.items` and `likelihood` in player-core; `consulteeEmblem`). The strike's civilian-harm basis no longer prints the site's internal assessment id. Proof: player-core 1136 tests and the new region, standing and assessment-item tests; engine 4027; live at 390 and 1440. `world.spec.ts` at 390 and 1440 is 15/16 in the shared tree; the one failure, the act receipt at 390, passes 3/3 on HEAD and 3/3 on HEAD with only this pass's files, so it comes from other uncommitted work in the tree, not from this pass.
- **Still to do from the brief:** the office, judge, nation and state files on the same frame; the relationship map.
- **Acceptance:** each screen in the brief verified live at 390×844 and 1440×900; its specs passing at six widths.
- **Blocked by:** nothing.

### BL-81 Check the large prices some decisions show

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Merged into BL-157. Both halves are landed (force acts: DECISIONS 6.8; scenario money: merge 465290c37, ancestor); what remains (no shipped scenario declares financial.basis, before/after debt-path comparison) is exactly BL-157's acceptance.
- **Proof:** git merge-base --is-ancestor 465290c37 HEAD: yes; grep '"basis"' content/corpus shards: only unrelated "basis":"governor-request"; BACKLOG.md:1471 BL-157.
- **Status:** closed.
- **Force acts: landed.** Re-based on sourced operation costs (DECISIONS §6.8, `force-costs.ts`, `force-cost-anchors.ts`). The 2026-10-10 "in progress" line was stale.
- **Scenario money: landed, merge `465290c37` (`d53e2a776`).** A reply's `impact.financial` was a fixed share of output, so every `supplemental` cost the United States $58.6B (a routine supplemental was about 250 times the Flint response). It is now priced from a sourced appropriation for the band at the week's severity, carried to 2026 dollars by CPI-U (`SCENARIO_COST_ANCHORS`, `packages/world/sources/scenario-costs-sources.md`). A reply can state its own arithmetic as `financial.basis`. Every price, and the authored `cost.treasury`, is drawn per occurrence from the campaign seed, log-normal and skewed toward overrun (DECISIONS §6.16). Proof: `scenario-cost.test.ts` (15 tests: CPI carry, determinism, distinct draws across campaigns, over-center share 0.55-0.70, median within 0.1 of e^0.08, bounds, basis arithmetic, treasury jitter to cents with fewer than 10 of 200 round, both audit findings); `impact-model.test.ts` rewritten for anchors and the city step-down; the content suite 1,014 passed with the four fixture-dependent files passing once their gitignored job files were present (29/29), player-core 1,450 of 1,451 (the one failure reproduces at 445d40789), studio-cli 360/360; `seed-tables.test.ts` 15/15.
- **Readiness extension (2026-10-14):** separate estimate and successful-commit outturn, actual-books receipts, visible rounded borrowing estimates and sourced multi-component coverage are implemented. The four-seed, 26-week controlled debt-path comparison is recorded in `audits/2026-10-12-grounded-casting/READINESS-2026-10-14.md`. Variation is explicitly retained as planning assumptions.
- **Remaining:** no shipped scenario declares a `basis`; the next sourced corpus pass must supply case-specific arithmetic. This item stays open with BL-157 until that migration and its balance evidence exist.
- **Balance:** the 2026-10-14 integration checkpoint ran the harness with these amounts (`docs/audits/2026-10-11-simulation-depth/gates/integration-2026-10-14.md`); a before/after comparison of the debt path is still owed.
- **Acceptance:** the debt path compared before and after; (1) and (2) built or declined with a reason; a sourced corpus pass for (3).

### BL-65 E5: decision places stop defaulting to Washington

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Merged into BL-147. Item says it is superseded in scope by BL-147 and closes with it; BL-147 is open at BACKLOG.md:1501.
- **Proof:** BACKLOG.md:929-938, :1501.
- **Status:** closed.
- **Owner:** BL-147 (grounded casting).
- **2026-10-10 (W8 review, `82646e2c5`):** all 286 home-ground scenarios without an authored place were read (`docs/audits/2026-10-10-map-first/e5-places-review.md`). None names a dataset city or a state; about ten hint at a region but each fits several states; 14 `capital` sites aren't the seat of government.
- **2026-10-13 correction:** the owner rejected the even seeded state draw this item's acceptance allowed (a scenario must be placed for a reason). The grounded-casting audit and its verification (`docs/audits/2026-10-12-grounded-casting/AUDIT.md`, `VERIFY.md`) measured 104 home-ground, non-capital scenarios placed by a draw that filters by site kind but ignores industry and hazard, and found the "260 of 322" figure stale.
- **Missing:** see BL-147.
- **Acceptance:** BL-147's acceptance replaces this one; this item closes with it.
- **Evidence:** `adversarial-review.md` E-M2; the grounded-casting audit and verification.
- **Blocked by:** BL-147.

### BL-66 E6: player-core selectors the new screens need

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. All eight selectors exist, are tested and are consumed by apps/player screens.
- **Proof:** whipCount packages/player-core/src/congress/whip-count.ts (2076406a5) + whip-count.test.ts, used apps/player/src/congress/BillScreen.tsx; floorSchedule floor-schedule.ts + test, Bills.tsx; collectionReading security/collection-reading.ts (4c2ee4b25), CollectionActs.tsx; assessmentRows security/assessment-reading.ts, tested in security.test.ts, used via security-board; bilateralTradePartners world/trade-partners.ts (0e140f27a) + test; policyPortfolio policy/portfolio.ts + test, PolicyScreen.tsx; orderPipeline policy/order-pipeline.ts + test, OrderPipeline.tsx; appointmentDesk appointments/desk.ts + desk.test.ts, apps/player/src/oversight/Appointments.tsx. Suite green per integration-2026-10-14.md.
- **Status:** closed.
- **Owner:** the map-first program (`feat/map-first`), W4–W7
- **Missing:** Selectors that don't exist yet: whip count, floor schedule, covert, collection and assessment readings, bilateral trade partners, domain portfolio, order pipeline, appointment shortlist. (Impact reports and the six-judgment breakdown landed in W4, `3f318133e`.)
- **Acceptance:** Each is built, tested and consumed by its screen in its wave. A judge's vote record ships only if the engine models one.
- **Evidence:** PROGRAM.md, E6.
- **Blocked by:** nothing

### BL-73 W7: World and security

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Map-first W7 on the frozen apps/web; every named World/security route now exists in apps/player and the leftover acceptance (Playwright, screenshots, merge-w7-w8 issues) is legacy-web work superseded by BL-163. superseded by BL-163; BL-89 stays on its own.
- **Proof:** apps/player/app/(game)/world/{index,nation/[id]/index,nation/[id]/act,org/[id],war/[id],treaty/[id],security/index,security/command/[id]}.tsx; BL-163 at BACKLOG.md:660.
- **2026-10-10 (merged, not closed):** `/world`, `/world/nation/:id` and its act workspace, `/world/org|war|treaty/:id`, `/world/security` and `/world/security/command/:id` are built and merged. All 159 capability rows are reached. Remaining before close: BL-89, Playwright at six widths for the world specs, regenerated screenshots, and the open issues in `gates/merge-w7-w8.md`.

- **Status:** closed.
- **Owner:** the map-first program (`feat/map-first`)
- **Missing:** Not built.
- **Acceptance:** Every World screen is built. Organization, war and command set detachment and force clusters are proven. The ledger rows due in W7 are reached.
- **Evidence:** DESIGN.md §2.
- **Blocked by:** BL-62, BL-70

### BL-74 W8: Record, ending, legacy

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Map-first W8 on frozen apps/web; /record, /record/event/[id], /record/press, /ending, /legacy all exist in apps/player; its only non-legacy clause (E5 content backfill) is BL-65/BL-147. superseded by BL-163; E5 content clause lives in BL-147.
- **Proof:** apps/player/app/(game)/record/*, ending.tsx, legacy.tsx.
- **2026-10-10 (merged, not closed):** `/record` with filters and pulses, `/record/event/:id`, `/record/press` and dispatch, `/ending` and `/legacy` are built and merged; the finale pin is resolved. Remaining before close: Playwright at six widths, regenerated screenshots, and the E5 content pass (BL-65).

- **Status:** closed.
- **Owner:** the map-first program (`feat/map-first`)
- **Missing:** Not built.
- **Acceptance:** Every Record screen and the finale are built. Event pulses and the electoral lens are proven. The E5 content backfill is reviewed.
- **Evidence:** DESIGN.md §2.
- **Blocked by:** BL-70

### BL-138 One map, rebuilt surfaces and readings that say what they compare

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. All landed and open work is the legacy apps/web MapView and tile/css (label placer, electorate.css, MetricReading on web panels); the map pattern is a standing decision (DECISIONS §8.8) and apps/player has its own map. superseded by BL-163 (map in universal player); BL-167 covers the baked outline.
- **Proof:** text cites apps/web/src/map; apps/player/src/map and app/(game)/dev-map exist; commits 402012e89 etc. are ancestors.
- **Status:** closed.
- **Owner:** player shell, map engine (`apps/web/src/map/`), Nation/World/Security/Press/Executive/Digest surfaces; coordinated with BL-136.
- **Outcome (owner direction 2026-10-12):** one map pattern across the app (DECISIONS §8.8), labeled; no standalone metric or approval pages (each reading lives on the screen that owns it); Digest, Executive, World, Security and Press rebuilt in the workspace family; Public opinion folded into Nation; nav badges per destination; comparisons that name what they compare.
- **Landed in the tree:** `MapView` (inline GL map: lens registry, key, list view, Alaska/Hawaii insets, flat projection, pins/marks and region pins, `onChoose`, labels with direct value figures and rank-salience priority); tile grids, delegation tiles, the hand-drawn court map and the background map behind workspaces retired (title globe kept); `/brief/metric/:id` redirects through `place.metric`; `/nation/electorate` and `/record/press` redirect; Nation pairs the map with an open compact states table (pin to light a state, map choice pinned above the pages); `WaitingHere` strip and per-destination nav counts (plus Policy orders to sign and Budget funding alarm); execution quality worded as over/under the written effect; demographic rows as one bar with a U.S. tick, both figures printed and the gap named "vs U.S.", sex shares in tenths; own-country address redirects to Nation; week-move lens scale fitted to the week; projection-aware far-side culling and world fit.
- **Evidence:** `pnpm run build`, `typecheck`, `lint` green (whole workspace); `pnpm run test`: web 422/422, player-core 1426/1427 (the one failure, the door test, fixed after: desk/navigation/doors 151/151), all other packages green except `engine` `hill-ledger-golden` snapshot and a `studio-cli` snapshot, neither touched by this work (no engine or studio-cli diff). Verify gates fixed this session: `opinion-causes` (re-pointed to `nation/electorate/Topline.tsx`; approval build names its heaviest pull), `engine-reachability` (ledger md regenerated), `css-architecture` new findings (court-system, world-overview). Still red and not from this work: `css-architecture` `map.css::surface` (from `2030ab252`; fixed 2026-10-12 in the polish pass, BL-141), `no-history-references` (fixture and audit doc), `publish-gate` (two content arcs without a close), `dist-freshness` (needs a commit). Rendered checks inspected at 1440×900 and 390×844 (light; dark for World and Digest).
- **Open:** the e2e reconciliation is done: Playwright at all six widths passes (interim gate record, 2026-10-13). Remaining: the label placer's salience applies to MapView only; dead tile-map rules in `electorate.css`; `MetricReading` adoption on World and Security panels; Policy/Budget badge thresholds are the Nation home's; page-map palette defect fixed in the separate visual-overhaul worktree (2026-10-14): saved preferences, palette/contrast attributes and actual lean-map colors checked through reload. Market journeys run in both themes at six widths; full family dark-theme acceptance remains open.

### BL-127 Opinion and relationship history

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. Opinion and relationship history are committed with tests for ring/fold, save round trip, no invented history and recording-on/off equivalence; selectors feed the electorate view; docs updated; full suite green.
- **Proof:** fab87a51f (ancestor); packages/engine/src/opinion-record.test.ts:70,83,98 and relations-record.test.ts:64,83,91; player-core polling/opinion-trends.ts used by electorate/electorate.ts; SCHEMA.md/ARCHITECTURE.md mention opinionRecord (grep -c 4/2); integration-2026-10-14.md tests exit 0.
- **Status:** closed.
- **Owner:** simulation-depth program (parent BL-112)
- **Missing:** the engine kept weekly history only for approval, state approval and the economy, so judgments, group support, coalitions and trust between governments had no trend.
- **Acceptance:** recorded once a week at a fixed phase, a bounded weekly ring folded monthly, no draws consumed, older saves get no invented history, save round trip exact, SCHEMA and ARCHITECTURE updated; series selectors for the electorate screen and the country file.
- **Evidence:** `packages/engine/src/opinion-record.ts`, `relations-record.ts`.
- **Blocked by:** nothing.

### BL-128 Choices drawn as a results list, not a comparison table

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Merged into BL-195. Item itself says BL-195 carries its acceptance into the universal player; ChoiceList in ui-web is legacy.
- **Proof:** BACKLOG.md:1167 "See BL-195"; BL-195 at BACKLOG.md:305.
- **Status:** closed.
- **Owner:** visual pass 2 (`docs/audits/2026-10-11-operations-redesign/VISUAL-PASS-2.md`); supersedes BL-116
- **Missing:** the owner rejected options-as-columns comparison on every screen as clunky. After an adversarial review the owner chose a results list: one row per option with drawn cost, chance, per-metric effect on one shared axis and a one-line worst case; the default as a reference row; the selected row expands for the rest.
- **Acceptance:** `ChoiceList` in ui-web fed by player-core's typed `ChoiceOutcome`; every `CompareAuthorize` caller renders as the list, and every producer with engine numbers fills the drawn columns; cost, odds, effect and worst case never collapse; no sideways scroll at any of the six widths.
- **Evidence:** the owner's screenshot of the press plays, 2026-10-11.
- **Blocked by:** nothing.
- **See BL-195**, which carries this acceptance into the universal player (`apps/player`).

### BL-131 Opinion by group within each state

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. State-by-group reading is committed, calibrated and tested, and drawn in apps/player (People tab and states-by-groups grid); balance since green.
- **Proof:** fab87a51f; state-cohort-opinion.test.ts:74-150 (calibration, direction, determinism, old saves, zero-sensitivity); cohort-baseline.ts + test (COHORT_PARTISAN_BASELINE); apps/player/src/nation/home/Groups.tsx:149 StateGroups, nation/state/People.tsx; SCHEMA.md 12 mentions; balance 138/0 in integration-2026-10-14.md.
- **Status:** closed.
- **Owner:** simulation-depth program (parent BL-112)
- **Missing:** the engine had no per-state, per-group opinion. State approval is solved from lean and record, so the state file's People tab could show only each group's national figure. The owner rejected that as a cop-out.
- **Acceptance:** a derived state × cohort support reading in the multilevel-regression-with-poststratification style: group effect plus state intercept plus a sourced, dated, group-specific sensitivity to the state's partisan context, raked in logit space so each state reproduces its approval and each group its national figure (residuals reported); seeded per-campaign jitter on the sensitivities; state-routed acts weigh on that group in those states; tests for the calibration identities, direction, determinism and older saves; SCHEMA and ARCHITECTURE updated; the People tab and a states-by-groups heatmap draw it.
- **Evidence:** the owner's direction, 2026-10-11.
- **Blocked by:** nothing.

### BL-133 Budget lines edited with a number box

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Item's acceptance is the apps/web e2e budget specs; the slider exists in the universal player. superseded by BL-163 (slider rebuilt); low confidence: six-width check of the player's budget screen not located.
- **Proof:** apps/player/src/nation/budget/Allocation.tsx:53 uses packages/ui Slider; apps/web/.../AllocationEditor.tsx is legacy.
- **Status:** closed.
- **Owner:** visual pass 2 (parent BL-129)
- **Missing:** the owner found the requested-share number boxes with spinner arrows too rigid.
- **Done:** each line is a slider from nothing to the congressional cap (a native range underneath, so drag, arrow keys and screen readers work), with the line in force and the level that holds the account marked, the change filled, the request read out with its change, and snaps to "In force" and "Hold level"; checked at 1440 and 390. `apps/web/src/nation/budget/AllocationEditor.tsx`, `budget.css`.
- **Acceptance:** the e2e budget specs updated for the slider; checked at the other four widths.
- **Evidence:** the owner's screenshot, 2026-10-11.
- **Blocked by:** nothing.

### BL-129 Visual pass 2: icons, drawn readings and rich data

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Redraw of legacy apps/web/packages/ui-web screens ("consolidated into ui-web"); universal-player visual work is tracked by BL-163/BL-237. superseded by BL-237 / BL-163.
- **Proof:** item text cites ui-web, apps/web; BL-237 at BACKLOG.md:518.
- **Status:** closed.
- **Owner:** visual pass 2 (parent BL-107)
- **Missing:** several screens leaned on text with too few icons, visualizations and data, for a President who expects a modern consumer-grade product.
- **Done in the working tree:** Brief, decision, Record, Nation, World and Washington executive redrawn (countdowns, level and share bars, flags and portraits on rows, org chart, posture board, stage steppers); shared component fixes and pruning (`Strip` and three unused icons deleted); the drawn marks consolidated into ui-web; player-core fields for the data gaps (country power and economy, numeric press reach, department heads, command forces, act figures).
- **Acceptance:** every route in the redesign's `routes.md` checked at the six widths; no new findings from `verify-css-architecture` or `verify-unused-primitives`; reported data gaps drawn or recorded as engine gaps.
- **Evidence:** `docs/audits/2026-10-11-operations-redesign/VISUAL-PASS-2.md`; the agents' before and after captures (session scratchpad, not kept).
- **Blocked by:** the wiring pass and BL-128.

### BL-150 Relief-order signing lost its end-to-end coverage

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. The spec is the frozen legacy apps/web Playwright suite; apps/player has no e2e specs at all, so there is nothing to restore there. superseded by the universal-player test plan (BL-75 parity / BL-195); if relief-order signing coverage is still wanted, open it against apps/player at that time.
- **Proof:** apps/web/tests/nation-policy.spec.ts is the only copy (find); apps/player has no *.spec.ts; engine still offers relief via order-subjects.ts:107-110 and tests mention act-disaster-recovery in orders.test.ts/executive-authority.test.ts.
- **Status:** closed.
- **Owner:** the e2e suite.
- **Missing:** `nation-policy.spec.ts`'s "sign an order" journey can no longer sign the relief order: `hurricane-request` stages a governor's claim but no enacted `act-disaster-recovery` bill, so `reliefOrderSubjects` (`packages/engine/src/order-subjects.ts`) never offers it; the spec signs the clean-energy order instead.
- **Acceptance:** a fixture with an enacted recovery act, built through the real bill stages, and the spec signing the relief order end to end at six widths.
- **Evidence:** the spec-repair report, 2026-10-13.
- **Blocked by:** nothing.

### BL-116 Decision panels drawn as a hand of cards

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Superseded by BL-128 (owner rejected option-column comparison, cards included) and its acceptance targets frozen packages/ui-web CompareAuthorize and apps/web e2e. superseded by BL-128/BL-195.
- **Proof:** BACKLOG.md:1550 states the supersession; BL-128 line 1159 "See BL-195" carries the work into apps/player.
- **Status:** closed.
- **Was:** landed, awaiting proof · P1 · ui
- **Owner:** map-first program; the shared compare pattern (`docs/DESIGN.md` §1 "Compare and authorize").
- **Missing:** the owner found every decision panel a wall of prose with no color, icons or character, and asked that none scroll sideways at any width. The full Playwright run on the rebuilt panels was stopped at 238 of 240 tests.
- **Acceptance:** every `CompareAuthorize` consumer draws options as cards (emblem, accent, verdict chips, lead row, row icons, signed readings as `Movement` bars on one scale per row); no panel scrolls sideways at 320, 390, 768, 1280, 1440 or 1920 (`expectComparisonFits` now asserts it at every width); `pnpm --filter @admin/web run test:e2e` passes in full.
- **Evidence:** this commit. `packages/ui-web/src/CompareAuthorize.tsx`, `Movement.tsx`, `styles/acts.css`; `ChoiceMove` in `packages/player-core/src/policy/choice-table.ts`; unit tests (ui-web 44, player-core 1210) green. The stopped e2e run had 2 failures, both at 1920px and both a sidebar link click timing out before any panel (`states.spec.ts:112`, `washington.spec.ts:82`), not re-run.
- **Blocked by:** nothing.

### BL-118 Status inks unreadable on the dark set

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. Dark status inks are defined and held at AA by tests, and the Tamagui dark theme reads them.
- **Proof:** commit ecae40f1d (ancestor) added dark.status; packages/design/src/tokens/color.ts:140-147; packages/design/src/tokens/color.test.ts:33 "holds every dark status ink at AA on the dark grounds and on its own fill"; packages/ui/src/theme/from-design.ts:254-258 consumes dark.status.
- **Status:** closed.
- **Owner:** `packages/design`.
- **Missing:** `[data-surface="dark"]` never redefined `--status-*`, so every good-or-bad cue on a dark surface kept its light ink and fell to 1.9:1 to 2.7:1.
- **Acceptance:** each dark status ink holds 4.5:1 on every dark ground and on its own fill, held by `color.test.ts` and the CSS parity test; the panels rendered in the dark set show no text under 4.5:1 apart from a disabled control.
- **Evidence:** this commit. `dark.status` in `packages/design/src/tokens/color.ts` and `tokens.css`; design tests 20 of 20; a contrast audit of the decision, policy and federal-power panels in the dark set found none under 4.5:1.
- **Blocked by:** nothing.

### `admin-3yv.1` variance.opening-profile: seeded start variants in FoundingConfig

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. Each half of OpeningProfile is delivered elsewhere or cut: seeded opening board and mandate exist, economic era is fixed by DECISIONS 2.6, pacing half was cut. superseded by the seeded opening board (opening-world.ts) and founding mandate; the item's own acceptance allows closing with each half's disposition.
- **Proof:** packages/engine/src/founding.ts:137-139 (mandate seeded default; openingPreset absent -> board drawn from the seed), opening-world.test.ts:75-82 "returns the same board for one seed", founding-congress.ts:35,73 seeded mandate; no OpeningProfile/pacingOf anywhere (grep -l returns nothing).
- **Status:** closed.
- **Owner:** WR (parent `admin-owca.11`)
- **Missing:** `OpeningProfile` is absent (no `OpeningProfile`, `pacingOf` or `pinContent` at HEAD as of 2026-09-23). Deferred, not closed.
- **Acceptance:** whatever of the seeded opening variance survives the rescope below is built under the Doc Sync Contract, or the item is closed with each half's disposition recorded.
- **Evidence:** the 2026-09-23 reconciliation note below.
- **Blocked by:** WR.

**Description.** Restore the degenerated fifth divergence source: a seeded OpeningProfile (inherited crisis deck, economic era, director pacing profile) slotted into FoundingConfig. Doc Sync Contract applies.

**Notes.** 2026-09-23 reconciliation: reopened into the opening-world work (W5 5C). The close had been against the lost `wave1/engagement` branch. Rescoped: the inherited-crisis half is WLD-10 (opening wars, posture and inherited sanctions, "the world as the transition found it", delivered by 5C.2); the economic-era half is superseded by the one fixed start on January 20, 2029 (`docs/DECISIONS.md` §2.6); the Congress half went to the previous program's founding work (a seeded swing plus mandate); the pacing half was `admin-3yv.3`, cut on 2026-09-28. Moved under WR on 2026-09-28. With 5C.2 landed, check whether anything is left beyond the cut pacing half; if not, close it with that evidence.

### BL-20 Turn the baseline unit failures green

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. The 72-failure baseline is gone: the 2026-10-14 integration checkpoint ran `pnpm run test` to exit 0 (engine 4,601, player-core 1,456, content 1,029, world 557, studio-cli 360 ...), and the 2026-10-16 continuation ran player-core 1,612, player 203, ui 41 all passing. Caveat: full workspace suite not re-run at HEAD (engine suite after the last engine edits is listed as not run).
- **Proof:** docs/audits/2026-10-11-simulation-depth/gates/integration-2026-10-14.md:25 ; docs/audits/2026-10-16-universal-player/gates/local-continuation.md:11-13,23; commit cc7610417 (ancestor).
- **Status:** closed.
- **Owner:** each failing file's workstream; W0 pins every inherited failure with a due wave (PROGRAM.md W0b step 7)
- **Missing:** on 2026-10-08 at `612d23cf0`, 72 unit tests failed across five packages: world 9, engine 31, content 14, player-core 8 and studio-cli 10. On 2026-10-09 the Playwright repair turned two player-core tests green (`family-commodity`, `war-powers-reading`), so 70 remain, player-core at 6. `pnpm run test` stops at the first failing package, which is why earlier records reported only the nine World failures. Build, typecheck and lint were green at the same commit; 22 of the 81 verify gates were red (BL-55). W0 deleted the old player's tests and pins what remains, so re-count with `pnpm -r --no-bail run test` before trusting the by-file list below.
- **Acceptance:** `pnpm -r --no-bail run test` is green, or every remaining red has its own item with a diagnosis. A fix to a test that encodes a balance bound runs the balance harness.
- **Evidence:** the cleanup's baseline run on 2026-10-08 at `612d23cf0`. Its per-test list was not committed, so the by-file counts below are the record; `pnpm -r --no-bail run test` at that commit reproduces the names.
- **Blocked by:** nothing.

The failing tests, by package and file:
- **world (9):** `src/validate/dataset-validator.test.ts` (5: a well-formed dataset with no errors; roleTitles for seated chairs only; a nation nobody plays with no order of battle; a thin record with no agenda; a thin record taking its archetype's agendas); `src/dataset/units.test.ts` (2: a unit for every schema leaf, and formatting every shipped figure; the 2026-10-01 handoff traced this to `military.arsenal.declared`); `src/schemas/org-cradle-charter.test.ts` (2: the shipped dataset valid with the new fields absent; an authored body with no trade competence or defense scope).
- **engine (31):** `src/npc-agent.test.ts` (8); `src/week-identity.test.ts` (3: the idle staggered week against the one-shot week on three fixtures); `src/causality-depth.test.ts` (2); `src/economic-releases.test.ts` (2); `src/orders.test.ts` (2); `src/tariff-prices.test.ts` (2); `src/war-party.test.ts` (2); and one each in `src/blocs.test.ts`, `src/customs-union.test.ts`, `src/feed-cap.test.ts`, `src/fiscal-authority.test.ts`, `src/law-books.test.ts`, `src/law-eight.test.ts`, `src/legislation.test.ts`, `src/opening-world.test.ts`, `src/opinion-war.test.ts` and `src/trade.test.ts`.
- **content (14):** `src/scenario-pulse.test.ts` (4); `src/scenario-outlet.test.ts` (3); `src/scenario-audit-speakers.test.ts` (2); `src/scenario-oversight.test.ts` (2); and one each in `src/packs/core-consequences.test.ts`, `src/scenario-cast.test.ts` and `src/scenario-intel.test.ts`.
- **player-core (8):** `src/desk/opinion-causes.test.ts` (2); and one each in `src/campaign/hand-off.test.ts`, `src/campaign/store.test.ts`, `src/desk/family-commodity.test.ts`, `src/economy/markets.test.ts`, `src/elections/finale.test.ts` and `src/world/war-powers-reading.test.ts`.
- **studio-cli (10):** `src/jobs/drivers/session-driver.test.ts` (3); `src/scenarios/review.test.ts` (3); `src/corpus/content-manifest.test.ts` (2); `src/scenarios/review.snapshot.test.ts` (1); `src/scenarios/scenarios.test.ts` (1: the publish gate passes the shipped core pack byte for byte).

### BL-21 Triage the four balance-harness reds

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. `test:balance` ran 138 passed, 4 skipped, 0 failed (H1/H4 economy reds, H2, H3 included) on the integrated tree; the valence midpoint was held at 0.52 with the measurement recorded; Brent/commodity measurement and regime-change runs recorded. Caveat: PUBLICATION.md notes the later balance completion loaded earlier source, not a fresh certificate for the published corpus.
- **Proof:** integration-2026-10-14.md:29 and "Measurements behind the closes"; commits 0e29da729, 0a288b7dd (ancestors); docs/audits/2026-10-14-worktree-reconciliation/POSTCOMMIT-VERIFICATION.json (16 files, 138 passed).
- **Status:** closed.
- **Owner:** engine; first run at W1's engine gate, which runs the balance harness for E1 and E2
- **Missing:** `test:balance` carries four failures, all in `economy-balance.test.ts` (H1, the idle President: the debt ratio's drift and interest's share of revenue; H4, the world at rest: Argentina's ratio and the credit-rating letters). They were red before the person-behavior work and unchanged by the 2026-10-08 cleanup and the 2026-10-09 Playwright repair. Two more balance questions joined on 2026-10-10: the commodity calibration (by week 3 of an idle campaign crude reads 1.36 and natural gas 1.27, every quote citing United States export restrictions, likely the sanctions-shock reading of inherited sanctions programs), and the foreign-action terms the closed BL-4 landed (support requests, protection, objectives), which never had a balance run.
- **2026-10-10 (W5, `d2e3efbda`):** H1 drift 1.477, H1 interest share 5.468, H4 Argentina 0.064, H4 newly CCC 2: all four green. One new red: R1.1 democrat 0.023 against 0.02 on a 4-seed median; the owner chose to run more seeds first (in progress).
- **2026-10-10 (W1):** the import-only-measure fix (`4e2f7b866`) moved H1 ratio drift 0.828 → 1.041 (band 1.4–2.4) and H1 interest share 6.869 → 6.306 (ceiling 6); H4 Argentina 0.257 → 0.259 (ceiling 0.1) and H4 newly CCC 6 (ceiling 3) are unchanged. Inherited US sanctions still count as US export restrictions in every commodity market (BL-82), the likely next lever for H1.
- **Acceptance:** each is fixed with the balance harness green, or has its own item with a diagnosis, recorded in the wave's gate record. Never retune a number to pass without the harness run that justifies it.
- **Evidence:** `612d23cf0`'s message ("test:balance carries only HEAD's four economy-balance failures").
- **Blocked by:** nothing.

### BL-55 Turn the red verify gates green

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. All 88 `scripts/verify-*.mjs` exit 0 at the current tree (including the specific reds the item lists: file-size, fiscal-authority-proof, foreign-truth, icon-registry, leader-fidelity, one-day-counter, rule-seams, scenario-arc-families, unused-primitives); engine-reachability and publish-gate were deleted in 8caf5b441.
- **Proof:** Ran `for g in scripts/verify-*.mjs; do node "$g" >/dev/null 2>&1 || echo FAILED: $g; done` -> no FAILED lines (read-only run, 2026-10-18, HEAD 84e7e85d7 clean tree); 8caf5b441 is an ancestor.
- **Status:** closed.
- **Owner:** each gate's owner
- **Missing:** on 2026-10-08 at `612d23cf0`, 22 of the 81 `scripts/verify-*.mjs` gates exited non-zero; `verify-american-spelling` went green on 2026-10-09. W0 then deleted some of the red gates (`verify-no-legacy-runtime`, `verify-screen-truth`, with their proofs) and rewrote or re-pointed others (`verify-engine-reachability`, `verify-icon-registry`, `verify-unused-primitives`, `verify-file-size`), resetting their baselines with the reason recorded. The W0 gate record lists every gate's state with its due wave; this list is the 2026-10-08 starting point.
- **Acceptance:** `for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done` prints nothing, or each remaining red is listed with its due wave in the current wave's gate record.
- **Evidence:** the 2026-10-08 cleanup's gate record had the per-gate cause (deleted with the old audits; read it from `1211e624e^`).
- **Blocked by:** nothing.

The red gates and their causes at `612d23cf0`, less the ones W0 deleted:
1. `verify-engine-reachability` and its proof: 16 new unreached readings. W0a rewrote it to read call sites against the capability ledger, due by wave (`docs/DECISIONS.md` §12.5).
2. `verify-file-size`: `studio-cli/src/scenarios/brief.ts` is 1,417 lines, past its recorded ceiling of 1,412.
3. `verify-fiscal-authority-proof`: the proof can no longer plant its fixture in `packages/engine/src/orders.ts` (the `treasuryOfGdp` text it edits has moved).
4. `verify-foreign-truth` and its proof: one stale forgiven `governments-read-at-founding` (104 found, 105 forgiven); shrink with `--update-baseline`.
5. `verify-icon-registry` and its proof: stale entries `approve`, `paused` and `reject`. W0b re-points it to the new icon set.
6. `verify-leader-fidelity` and its proof: 258 findings, mostly leader age bands and parties that disagree with the leader table (now `packages/world/sources/`), for example AGO and AND, and the proof misses two planted cases.
7. `verify-one-day-counter`: 8 week-to-day conversions outside their one home; the examples named (`OfficeFileSections.tsx`, `SeatCalendarChapter.tsx`) were in the deleted player, so re-run it.
8. `verify-publish-gate`: the CLI refuses the bundled core pack (13 scenarios), for example `gate-on-nothing` on `the-station-past-the-road`.
9. `verify-rule-seams` and its proof: classified sites that no longer exist (`war-tick.ts#conflictPacket`, `conversations.ts#commitReply`, `npc-turn.ts#runNpcTurn`) and unclassified new ones.
10. `verify-scenario-arc-families`: the script itself did not parse (a `SyntaxError` at line 44, a missing comma in a string list), so it checked nothing.
11. `verify-unused-primitives` and its proof: `EmptyReading`, `Folio` and `MetricRow` had no consumer; those parts are deleted and W0b re-points the gate to the new system.

### BL-24 Remove `verify-wave-closeout`'s dead `plan.md` branch

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. The gate this item edits was deleted (verify-wave-closeout.mjs and its proof), so there is no dead `plan.md` branch left to remove. grep -i wave` empty | Superseded by deletion in 8caf5b441. Also fix CLAUDE.md:220 which still names it.
- **Proof:** `test -f scripts/verify-wave-closeout.mjs` -> absent; `git show --name-status 8caf5b441` D scripts/verify-wave-closeout.mjs, verify-wave-closeout-proof.mjs; `ls scripts.
- **Status:** closed.
- **Owner:** scripts
- **Missing:** the item's first premise is false against source (checked 2026-10-10): the gate no longer takes the newest `docs/audits/*/gates` directory blindly. `gatesDir` (`scripts/verify-wave-closeout.mjs:59-68`) picks the newest folder holding a record for a wave in `docs/PLAN.md`'s table. Its residual weakness is a wave-name collision: two programs whose tables reuse the same wave keys can't be told apart, which is why `docs/PLAN.md` carries one program's table only. What remains: when `plan.md` is retired (BL-51), the gate's "PLAN DISAGREES" branch and proof case 5 become dead code.
- **Acceptance:** the dead `plan.md` branch and its proof case are removed once BL-51 is done, and the proof still passes.
- **Evidence:** `scripts/verify-wave-closeout.mjs:20`, `:37`, `:59-68`.
- **Blocked by:** BL-51.

### BL-26 Find out how the remote moved under the no-push rule

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Superseded or out of scope. The reconciliation is done: 3561b6670 is an ancestor of HEAD and equals origin/staging (staging contains it); the shannon branch was merged (f49f99197) and deleted; the owner has since authorized pushes (c601bef81, 2026-10-14), so "how did it move under the no-push rule" is moot. The stray deploy-player-web.yml registration remains and is already held by BL-52. merge into BL-52 (workflow registration).
- **Proof:** `git merge-base --is-ancestor 3561b6670 HEAD` ok; `git rev-list --count staging..origin/staging` = 0; docs/audits/2026-10-14-worktree-reconciliation/CLOSEOUT.md:3,11.
- **Status:** closed.
- **Owner:** the owner
- **Missing:** nothing was to be pushed until the program is done, yet origin's `staging` is at `3561b6670`, which this clone does not have; a remote branch `claude/admiring-shannon-xxw7vb` exists (2026-10-01); and GitHub registers a `deploy-player-web.yml` that exists in no local ref.
- **Acceptance:** each is explained (which session or tool pushed it, and what it carries), and `3561b6670` is reconciled with local `staging`. Reconciled 2026-10-09: `3561b6670` and `bbd57ad44` are two content commits (scenario-pack polish and four new scenarios), authored by a Claude cloud session on 2026-09-30, merged by `0dd4ef7bf`; the remote branch carries two chart-color commits from 2026-10-01 by the same kind of session (BL-58). Still open: which session pushed them, given the no-push rule.
- **Evidence:** `git ls-remote origin`, as read by the audit on 2026-10-08.
- **Blocked by:** nothing; the fetch ran 2026-10-09.

### BL-58 Decide: delete the remote branch `claude/admiring-shannon-xxw7vb`

- **Closed:** October 18, 2026, in the backlog reconciliation commit that carries this entry. Done. Both commits were merged with the ours strategy (f49f99197) and the owner-authorized publish deleted the redundant remote feature branches and verified them absent; the tracking ref is pinned under refs/safety/publish-prune-20261014/remotes-origin-claude-admiring-shannon-xxw7vb (96cb39969).
- **Proof:** docs/audits/2026-10-14-worktree-reconciliation/CLOSEOUT.md:3,11; `git merge-base --is-ancestor f49f99197 HEAD` ok; `git for-each-ref.
- **Status:** closed.
- **Owner:** the owner
- **Question:** may the remote branch `claude/admiring-shannon-xxw7vb` (two commits from 2026-10-01: "Charts and categorical data draw in the brand's colors" and "Force counts draw in the chart's blue and gold") be deleted from GitHub? It conflicts with today's tokens in `packages/design/src/tokens.css`, `tokens/ramps.ts` and their `dist`.
- **Options:** delete it at the next authorized push, after W3 (BL-69) has weighed its intent (chart and categorical series in brand colors; counts in neutral blue and gold, not good and bad inks) for the new tokens; this costs nothing but the push. Or merge it, which means resolving token conflicts in files W3 replaces anyway. Or leave it, and it stays a stale branch outside `staging` and `main`.
- **Recommendation:** the first. Its commits stay reachable under `refs/safety/` locally before deletion.
- **Unblocks:** the branch policy (only `staging` and `main` outside work in flight).

### BL-264 The studio would not start after the cover pipeline was removed

- **Closed:** October 18, 2026, in the commit that carries this entry. `8caf5b441` dropped `cover-package.ts` and `cover-locks.ts` with the internal-only gates, but the studio's Articles workflow imports them (`apps/studio/articles-view.mjs`, `article-publish.mjs`, `article-store.mjs`), and `dev-server.mjs` loads that view at startup, so the whole studio failed to load and `apps/studio` failed typecheck and its articles test. The two modules and their tests are restored from `8caf5b441^` and `cover-package` is back in the `@admin/content` barrel. The code is the press feature's cover pipeline, not an internal-document gate, and the lock data it reads (`content/cover-locks/v1`) was kept, so restoring adds no asset. Decided by the integrator at the owner's request; reverse it by deleting the studio Articles workflow along with the modules, not the modules alone.
- **Proof:** `@admin/studio` typecheck passes; studio tests 92 passed; `cover-locks` and `cover-package` tests 16 passed; `import("./dev-server.mjs")` loads.
- **Same reconcile, gates made green:** `verify-no-history-references` allows the live `2026-10-17-scenario-harness` audit; `scenario-audit-place.ts` drops the British spelling of harbor from its maritime pattern; the coastline gate is credited to its real reader (`scenario-cast-bodies.ts#geographyMet`) in `scripts/lib/content-gates.mjs`, and the metric-registry report is regenerated; four prose lines rewritten (the bill's introduction line, the finding's authority line, the compare key's middle-line label, an appointments note in the legacy player); the player-prose and scenario-DC-fallback baselines shrunk; the premise debt list lost the 13 ids the new corpus bake pays down (see BL-245); the covert-exposure comparison test picks a reply tone the dealt decision does not already use.

### BL-263 One name per shared piece, and text set only by the ramp

- **Closed:** October 17, 2026, in the commit that carries this entry. `scripts/baselines/shared-components.json` forgives nothing: 0 of the 18 player shadows and 0 of the 7 `<Text>` overrides in `packages/ui` remain. Thin adapters folded into the shared piece: the decision screens use `Section`, which now takes an optional `id` defaulting to its title's slug; the 20 Congress, Courts and Oversight panels use `Card`, which gains a `help` slot set after its actions. Locals that differ were named for the difference: `SpecimenGroup` (catalog), `EntryPart` (Record entry), `FilePart` (person file), `RecordArea`, `PulseTile`, `FractionSegments`, `FoundingStages`, `FactChip`, `OathLine`, `BalanceTrack`, `CitedLawHelp` (resolves cites; 14 importers), `ChooserReceipt`, `SecurityView`, `SearchHit`, `PendingWith`, `WarReport`. `Text` gains a `caps` modifier (uppercase, tracked 1.2) for the stamp, the classification banner, a form's fixed headings and a capitals nameplate; the article dateline is `eyebrow`; both monograms pick a ramp step from the disc's size (`initialsVariant`) instead of a computed font size. `StatGrid` moved from `apps/player/src/world/parts.tsx` to `packages/ui/src/data/Stat.tsx`, and the root `@admin/ui` index exports `Stat`, `StatGrid`, `Fact`, `FactGrid`, `Facts`, `FigureBand` (nation's `Fact` type as `TermFact`); the sub-barrel exports stay for existing importers.
- **Proof:** `node scripts/verify-shared-components.mjs` (0 forgiven) and its proof pass; `verify-file-size` and `verify-renderer-boundary` pass; `@admin/ui` and `@admin/player` typecheck and eslint clean; ui tests 73 passed, player tests 223 passed. Seen on the running player (port 8081, week-30 fixture) at 390x844 and 1440x900: Congress (cards with the help button after their actions), Oversight and Courts (`StatGrid` from `@admin/ui`), Executive, the Record, the China file, Security, the Catalog, a person file (monogram at the heading step) and the Brief render as intended. The harness flags elements wider than the surface at 390 on Congress, Oversight, Washington, China and the Catalog (and at 1440 on China); on the China file that is the scrolling tab strip, and none was compared against a capture from before this change.
- **Left:** two `Monogram` components in `packages/ui` (`dossier/Readings.tsx`, `review/Voice.tsx`) draw the same initials disc with different fills; one should go. The founding flow, a decision, clock and scandal screen, an article and a war file were typechecked but not shot (no fixture route reaches them directly).

### BL-244 Recheck a scenario's premise at deal, display and commit

- **Closed:** October 17, 2026, in the commit that carries this entry. `castStillBound` now re-reads the board-state gates (`BOARD_STATE_GATES`: war state, the pulse bands, cycle phase, commodity, operator pressure, grievance, cohort strain, `tariffInForce`) against the cast's counterpart, so the existing display withdrawal (`withWithdrawnScenarioCases`) and the commit refusal both drop a memo whose premise has ended, with no silence charge. Flags, turn windows and relationships are deliberately not re-read: a reply or the passing of time moves them without making the memo wrong.
- **Proof:** `scenario-premise-binding.test.ts` "premise recheck after the deal" covers a contraction memo opened after recovery and a pause-the-tariff draft whose answered tariff was lifted; the full content suite (1073 tests) and player-core conversation and modeling suites pass.

### BL-246 Families that span cast cells, and standalone family members

- **Closed:** October 17, 2026, in the commit that carries this entry. `planCells` keys every scenario that carries a `family` into one `arc:<family>` cell (spec from the opener), so a family spanning classes, casts and severities is gated as one batch. A standalone beat or close was already admitted against an installed opener (installed-family context in the arc audit, `withFamiliesOpened` orphan opening); a test now pins it.
- **Proof:** `ingest.test.ts` "keeps a family in one cell"; `scenario-reachability.test.ts` "a family member written alone".

### BL-247 One premise declaration

- **Closed:** October 17, 2026, in the commit that carries this entry. The durable `premise` field is the only place a universal week is declared: the binding gate counts it toward the universal ceiling and refuses `binding.universal` with `premise-in-sidecar`, naming the field. `premise` is an allowed addition for upgrades. BRIEF, INSTRUCTIONS and the kit were regenerated.
- **Proof:** `binding.test.ts` (premise accepted, sidecar refused, ceiling counts premises); the studio-cli scenarios suite (181 tests) passes; `verify-kit-current` passes.

### BL-240 Chart and map pieces the uniformity pass could not reach

- **Closed:** October 17, 2026, in the commit that carries this entry. Proof: `pnpm run build`, `typecheck` and `lint` pass; ui, player-core and player tests pass (the ui suite gains `map/style.test.ts` and the vision-theme tests for the new roles). Seen on the running player (`player-expo`, week-30 fixture) at 390 and 1440 in light and dark: the trust chart's line in gold with its own key (`/world/nation/GBR`), the Catalog's "Healthy range" band with both edges drawn, the compare matrix with an edge arrow and no second heading, the pin key as a solid dot and a hollow ring, the Emergency map key and the severity bars both reading minor, serious and severe, the bench ordered in cool and warm inks, and the map-lens and peer-set `Segmented` bars with full words.
- **Status:** closed · P2 · packages/ui, player-core.
- **Done:**
  - `ChartSeries.ink` (a theme role) sets a line's ink, its end label and its key entry; the relationship trust chart uses it so its line is no longer the "steady" blue.
  - `BenchmarkChart` draws a band's two edges at full strength under the see-through fill, and the band's key sample shows the edges.
  - `CompareMatrix` sits in a `ScrollStrip` (new `noun` prop names the arrows) so hidden columns show an edge arrow, and it no longer draws a heading that repeats its frame's title.
  - Map pins: a solid amber dot for a state waiting and a hollow gold ring for a declaration (`pinLayers`, `PinKey`). Both are circle layers, so the web and native styles need no sprite.
  - The Emergency map lens has three running bands (minor under 40%, serious 40% to 69%, severe 70% and over) in the inks and at the lines of the severity bars: `MapPalette.minor` and `.serious`. Serious is orange on the standard and tritan palettes (clear of the declared gold) and the diverging brown under protan and deutan.
  - `ReadBadge` draws ambition as a diamond (`PipView.shape`); the founding badge matches.
  - `Segmented` wraps onto further lines instead of ending a word with an ellipsis, which fixes the map-lens "Color by" bar and every other bar at 390.
- **Not seen live:** a declared-emergency ring on a map, because the week-30 fixture holds no declaration; it is covered by the style test and the key. Native rendering of the pins was not run.

### BL-239 The color-vision setting does not reach charts or party inks

- **Closed:** October 17, 2026, in the commit that carries this entry. Proof: party inks seen under protan on `/washington/congress` (earlier commit); the bench seen under protan (dark) and tritan (light) on `/washington/courts` in cool and warm inks, with the key following; `vision-themes.test.ts` holds the new roles for every vision, scheme and section.
- **Status:** closed · P2 · packages/ui.
- **Done:** four theme roles. `divergeCool` and `divergeWarm` are the diverging palette's steps 1 and 5 for the setting, and `goodInk` and `badInk` are success and danger on the standard palette and the same two steps under protan, deutan and tritan, where green and red do not separate. `Track` tones, `Diverging`, `Sparkline` and its key, the state-group heat cells, the nation tone keys (`toneKey` now reads `TRACK_INK`), the courts bench and its key follow them.
- **Not done:** the other 80 or so `successInk` and `danger` uses (status badges, text tones, meter inks) keep green and red. They are status, not data diverging, and each also prints a word or a sign.

### BL-241 Doors are pressables, not links

- **Closed:** October 17, 2026, in the commit that carries this entry. Proof: on the running web player the decision page has 24 anchors, all with an href and a name, and Congress 53, with no `div role=link` left; `doors-and-readings.test.ts` covers ordinary and modified clicks; build, typecheck, lint, `verify-renderer-boundary` and the ui and player tests pass.
- **Status:** closed · P2 · UI and accessibility.
- **Missing:** content doors navigate on press and carry no `href`.
- **Acceptance:** whole-row and name doors render as links with an href on the web build, keep whole-row press, and every link has a name.

### BL-242 Comparison rows show a different reading in the same column

- **Closed:** October 17, 2026, in the commit that carries this entry. Proof: `outcome-moves.ts` gives every option the same readings in the same order and marks the largest move in place; the test covers differing largest moves and flat outcomes; on `/brief/decision/the-ground-families-know` all three rows read Chance, Cost, Largest move in the same places. Not captured at 390 and 1440 in both themes.
- **Status:** closed · P2 · UI.
- **Acceptance:** rows share the same readings in the same places (DESIGN §1, "Rows line up").

### BL-238 The legacy web app does not build

- **Closed:** October 17, 2026, in `ca2d72286` (branch `claude/bl-238-web-baseline`, cut from `claude/ui-uniformity` at `40cbe5618`). Proof, all on the committed tree: `pnpm run build` exit 0 (every package, `@admin/web` included); `pnpm run typecheck` exit 0; `pnpm run lint` exit 0; `pnpm --filter @admin/web run test` 79 of 79 files, 472 of 472 tests; `pnpm --filter @admin/ui-web run test` 7 of 7 files, 93 of 93 tests; `cd apps/web && npx tsc --noEmit` clean (71 errors before); `verify-dist-freshness` ("dist/ matches src/ in all 9 tsc projects"), `verify-file-size`, `verify-american-spelling`, `verify-unused-primitives` and `verify-adhoc-color-lint` pass. The legacy desks dropped the baseline column the way the universal player did: options read as their change from today, nothing picked to begin with (a lone open option starts picked in `HillAct`, `SetAct` and the executive `ActCompare`), and a wait with a clock said as the line beside the options from the producer's `waiting` or `silenceLine`. The web-local do-nothing columns went too (appointments, judicial nominations, directives, inspectors, notices, officers, person and chair acts, scandal silence, the act workspace and its manage desk). `packages/ui-web` `CompareAuthorize` takes an optional baseline and an unpicked selection, verb off until a pick; `baselineOf` now refuses only two baselines. Also fixed: `places.test.ts` failed on the base because `place.stateAct` (`b9f6fd674`) built `/nation/state/:id/act` with no legacy route; `routes/nation.state.$id_.act.tsx` redirects it to the state page's existing `?act=`/`?power=` desk. Not run: the browser e2e suite and the legacy app in a browser (it is frozen and slated for deletion at BL-163), and the gates `verify-no-legacy-runtime`, `verify-screen-truth` and `verify-grail-reconciled`, which CLAUDE.md lists but this branch does not carry.
- **Status:** closed · P1 · apps/web, found 2026-10-17.
- **Missing:** `4c2ee4b25` removed the keep-the-same option from player-core (`BUDGET_KEEP`, `WAIT_OPTION_ID`, `withWaitBaseline`, `WAIT_LEVER`, `EMERGENCY_WAIT`, `ORDER_WAIT`, `localeWaitBaseline`, the `baseline` column field), and about 40 call sites in `apps/web` still use it. `pnpm run build` fails at `@admin/web`. The break predates `claude/ui-uniformity`'s base `f681d3f04`.
- **Acceptance:** `pnpm run build` and `pnpm --filter @admin/web exec tsc --noEmit` pass. Either the legacy desks drop the baseline column the way the universal player did, or the legacy app is retired at parity (BL-163).
- **Evidence:** `apps/web/src/decision/Decision.tsx:5`, `nation/budget/Request.tsx:3`, `washington/congress/ActCompare.tsx:45`.
- **Blocked by:** nothing. It blocks merging any branch into `staging` under the gate in `CLAUDE.md`.

### BL-236 A presented desk row can hold Continue with no way to clear it

- **Closed:** October 17, 2026, in `d4433e998`. Proof: `desk/continue-trap.test.ts` 3 of 3 (a war the United States entered this week presents a soft row; that row carries a put-off on the Brief and the put-off releases it; putting off every presented row from the Brief alone leaves nothing holding Continue), and all 24 player-core `desk/` test files plus `campaign/stop-brief` pass (172 tests). `@admin/player` typecheck shows no error in these files (three remain in `world/act/readings.tsx`, another session's uncommitted work); eslint on the changed files is clean; `verify-american-spelling`, `verify-player-prose`, `verify-file-size`, `verify-renderer-boundary` and `verify-us-units` pass. Live on a `/dev/seed` campaign: after the first decision, a scandal breaking that week held Continue ("1 waiting on you"); at 390×844 the lead card showed "Put off until February 3, 2029", the review sheet said when it comes back and that it no longer stops time, and confirming left the Brief empty with Continue live and "Put off: …" on the Record. Continue then ran five days to the next stop, a Secretary of State proposal whose put-off was capped at its own due date (January 27). At 1440×900 the queue row ("Also waiting") carries its put-off beside the row, and at 390 a compact "Put off"; no horizontal scroll at either size. Not run: the full build, test and gate sweep, `verify-dist-freshness` (the tree carries other sessions' uncommitted `dist/`), and the browser e2e suite. Also fixed on the way: the Brief route had no presidential review mounted, so any act from it failed to open its review; it now sits in `ReviewBoundary`.
- **Status:** closed · high · player-core, apps/player.
- **Owner:** universal player program.
- **Missing:** found by the BL-235 design review and confirmed 2026-10-17. Continue is held while `presentedItems` is non-empty (`apps/player/src/shell/ContinueButton.tsx`). Several desk rows are `soft` only in the week their fact moves (`justHappened` in `desk/attention-row.ts`: a war the United States is in, a condition at home, a court ruling on an order, removal pressure, a scandal as it breaks). Only a turn makes that fact old, and a held Continue spends no turn. The universal Brief (`apps/player/src/brief/Matters.tsx`) drew no put-off, although `briefMatters` already carried each row's `putOff` matter and ARCHITECTURE says a matter is put off from its own row. The only way out was the player's per-kind attention settings, which a player has no reason to look for. Reproduced in `desk/continue-trap.test.ts` (a war entered this week presents a soft row) and live on `/dev/seed`, where a scandal breaking after the first decision held Continue.
- **Acceptance:** every row that can hold Continue offers a put-off on the Brief, both the lead card and the queue, saying the day it comes back; the put-off is the engine's own `deferMatterPacket` through the presidential review, so it lands on the Record (DECISIONS §3.3 allows `defer` and forbids a generic "continue anyway", which is why soft rows keep holding Continue rather than being let through); a test proves that putting off every presented row from the Brief alone always releases Continue; checked live at 390 and 1440.
- **Evidence:** `packages/player-core/src/desk/brief-matters.ts` `putOffOf`; `apps/player/src/brief/Matters.tsx` `PutOff`; `apps/player/app/(game)/brief/index.tsx` (`ReviewBoundary`); `packages/player-core/src/desk/continue-trap.test.ts`.
- **Blocked by:** nothing.

### BL-233 Remove the keep-the-same choice from every comparison

- **Closed:** October 16, 2026, in `4c2ee4b25`. Proof: no comparison in `apps/player`, `packages/ui` or `packages/player-core` offers a status-quo option (the `baseline` field is gone from every option type, so the compiler found every site, and a sweep for "Do nothing", "Keep …", "Leave …", "Wait", "Don't …" labels and "compared with doing nothing" copy came back clean). `CompareAuthorize`, `ActChooser`, `CompareChoices` and `ActCompare` draw results-list rows with a `waiting` line, and `baselineOf` is deleted; the act assessments dropped their baseline cells. Tests: a Codex run (report only) gave `@admin/ui` 41 of 41, `@admin/player` 203 of 203 and the player typecheck clean, and found 8 player-core failures, 7 of them tests still indexing past the removed column; those were fixed and re-run (38 of 38). The one other, `lapse-source`, timed out under load and passes alone (2 of 2), as does `campaign/store` (49 of 49), which stalled the same way; every other player-core file passed across two runs, and `shell/doors` (which builds fixture saves, budgeted at 40 minutes) passed 5 of 5 on its own. Lint on every changed directory clean after removing four unused names; `verify-american-spelling`, `verify-player-prose`, `verify-file-size` and `verify-renderer-boundary` pass. In the running app at 1440 and 390 with a clean console: the waiting decision (three answers as rows, the silence clock as a line, a picked answer drawing every move and its worst case, no overflow at 390), Oversight appointments and officers (the empty-seat cost as a line, a lone option starting picked), economy levers (the Fed date as a line, no Wait row, also at 390), the budget request (shutdown clock as a line, a locked lone option saying nothing can be approved yet), fiscal policy (no "Keep" row; a locked stance can still be opened and read), a command's alert level ("Surge, from routine", no hold row), the press Respond tab (odds and moves drawn, the six-week silence clock as a line) and the Secretary of State's dismissal (no "Keep" row). Fixed on the way: column heads that reserved the Compare column for rows without it (`ResultsList` `controls`), a picked row repeating its biggest move, verdict arrows pointing up on a price fall, and disposition text that still pointed at "the first row". Not run: the full build, test and gate sweep, `verify-dist-freshness`, and confirming any act (it would change the owner's save). Kept on purpose: the decision dispositions are acts that close or defer the case, now "Close it unanswered"; the scandal's "Stay silent" had no engine act behind it and is a waiting line; the forecast keeps one hidden run with nothing approved as its zero (`modeling/choices.ts` `UNTOUCHED`).


- **Status:** open · high · apps/player, packages/ui, player-core.
- **Owner:** universal player program, with the control plane's results-list work (BL-195).
- **Missing:** the owner, 2026-10-16: "as a pattern keep the same I wouldn't expect an explicit choice for keeping the same; it's an inaction isn't it?" DECISIONS §8.13 now says today is the baseline and no screen offers a status-quo option. The act workspace follows it (BL-231). The shared `CompareAuthorize` still throws without exactly one baseline card (`packages/ui/src/review/CompareAuthorize.tsx` `baselineOf`), and these surfaces still offer one, found by a scan of `baseline: true` on 2026-10-16:
  - Oversight: `oversight/Officers.tsx` (Keep them), `Inspectors.tsx` (Leave them in office), `Directives.tsx` (Don't send it), `Notices.tsx` (Keep holding it back), `Appointments.tsx` (Leave them empty).
  - People and chairs: `dossier/PersonActs.tsx` (Keep, Let it run, Don't reach out), `executive/ChairActs.tsx` (Keep), `executive/AgendaActs.tsx` (Don't answer yet, Do nothing).
  - Courts and Congress: `courts/CaseParts.tsx` (Decide later), `courts/Nominations.tsx` (Keep the nomination), `congress/BillActs.tsx` (Leave the bill as it is, Keep the usual process).
  - Nation: `nation/budget/Request.tsx` (Keep the current budget), `nation/state/locale-acts.tsx` (Wait), `nation/economy/Levers.tsx` with player-core `economy/lever-comparison.ts`, `nation/choice.tsx`.
  - Security, from player-core: `security/collection-reading.ts` (Don't task it, Keep it running, Don't refer it), `assessment-reading.ts` (Don't ask, Leave it as written), `covert-reading.ts` (Don't sign, Leave it open), `command-acts.ts` (Hold at the current posture, Keep the commander).
  - Decisions and press: `decision/choices.ts`, `decision/scandal-model.ts` (Stay silent), `news/PressAct.tsx`, `world/acts.tsx`.
- **Acceptance:** no surface offers a status-quo option; each reads its options as changes from today on the shared results list (`packages/ui/src/review/Results.tsx`). A wait that has its own consequence on a clock is said as a line beside the options. Silence that is a real reply in a story stays a reply, worded as the reply, never as "do nothing". `baselineOf` and the gate it implies are removed, and the player-core assessments drop their baseline cells where nothing reads them. Checked at 390 and 1440 on each surface with a clean console.
- **Evidence:** the scan above; DECISIONS §8.13; DESIGN.md "Compare and authorize".
- **Blocked by:** nothing. Overlaps BL-195 (results lists in place of options-as-columns), which should land with it.

### BL-235 Count down everything the game is waiting on, and draw the eye to where it is

- **Closed:** October 16, 2026, in `8848bbbd5`. Proof: player-core 207 of 208 test files passed with no failures (the full run was killed before the last); `shell/doors.test.ts` was not run, because it builds the whole fixture-save set (a 40-minute setup) and long runs were being killed on the shared machine. New tests: `desk/pending.test.ts` 6 of 6 (countdown, every supplier's page, progress against the day counter, ambient row never holds Continue, the run stops once the day the finding lands, the calendar entry); engine `congress.test.ts` adds the one-time stop on Congress's vote (passes), and `advance.test.ts` plus `attention.test.ts` 53 of 53. A Codex run (report only): `@admin/player` typecheck passes; lint shows 2 errors, both in files this change does not touch, and none in its files; `verify-file-size`, `verify-renderer-boundary`, `verify-one-day-counter`, `verify-american-spelling`, `verify-us-units` and `verify-no-history-references` pass. Live on a `/dev/seed` campaign at 1440×900 and 390×844: a Section 232 investigation ordered on China shows as a ring countdown (140 of 140 days, due June 9, 2029) under "Where things stand" on China's file, in the act page's "Already under way" with the section heading and its chip marked 1, in the Brief's "Waiting on others", and on the trade view. A link with `#act-situation` or `#pending` lands on its card and rings it. The rail and the phone tab carry a badge, and "1 waiting" opens the decision holding Continue. No horizontal scroll at 390, and a fresh tab's console is clean. Not exercised live: the run actually reaching the finding (covered by the tests).
- **Status:** closed · high · engine, player-core, packages/ui, apps/player.
- **Owner:** universal player program.
- **Missing:** the owner, 2026-10-16: "If I have started an investigation into a country, I would expect to see the pending investigation under the 'where it stands'. … a mechanism that is counting down how much time remains for pending things like investigations against the progressing game time, so the player isn't just waiting endlessly. … ensure tie in with the notification system (which still doesn't seem to be drawing attention to specific components and sections as needed)." A trade investigation showed only as a locked tariff row's reason. Nothing counted down with progress. The navigation could carry badges (`NavCounts`) but the game layout never passed any; "N waiting on you" was inert text, hidden on phones; a deep link landed only on pages with a section bar; section headings carried no marker; the phone tab badge was positioned off its icon; two waits on one subject collapsed into one row; and a finding or a vote coming back never stopped Continue.
- **Acceptance:** one player-core reading of pending work built on the attention producers, each item saying what it is, who it waits on, the pages it belongs on, its door, game days left from the one day counter, progress and whether its answer stops time; one drawn countdown reused on the subject's page ("Where things stand" on the country file and the act page), the Brief, the calendar and the trade view; nav badges, a working "waiting on you" control, section heading markers, and deep links that land on and mark the exact card; Continue stops once when a finding or a vote lands, without leaving a row that holds it; verified live at 390 and 1440.
- **Evidence:** inventory of every engine clock (shared notes `BL-235-pending-design.md`); `packages/player-core/src/desk/pending.ts`, `attention-trade.ts`, `calendar/sources-pending.ts`; `packages/engine/src/advance.ts` `answersReturned`; `packages/ui/src/world/Clock.tsx` `Countdown`, `layout/landing.web.ts`, `Section` `waiting`; `apps/player/src/shell/Pending.tsx`, `nav.ts` `waitingCounts`, `ContinueButton.tsx`. The Trade Advisory overlap the owner saw no longer reproduces after BL-234 (`8e3ad6b55`), checked at 375 and 1440.
- **Left for later, each needs its own item:** the Brief has no put-off control, so a `soft` desk row that is presented (a war or condition the week it moves) may hold Continue with no way to clear it (unverified, found by the design review); statutory clock rows open `/brief/clock/…`, so their nav badge lands on the Brief rather than the place that answers them; emergency renewals reach the calendar but not the pending reading; a link to another part of the page already open does not re-land (expo-router pushes state without a hash change).

### BL-234 The act workspace's rows are cramped and say too little

- **Closed:** October 16, 2026, in `8e3ad6b55`. Proof: player-core act tests 91 of 91 and the engine instruments tests 34 of 34 (Codex run, report only); `packages/ui` typecheck clean, and the player typecheck and lint show no errors in the files this changed (the errors left are the BL-233 session's work in progress in other files, and one prose finding in the War Powers note was fixed before the commit). In the running app against Belarus at 1440, 1066, 768 and 390, rows have medium padding, one line on wide screens, Compare and Details as labeled controls (a footer on a phone), and every open force row shows its changes from today, what it sends, partners, reactions, what could go wrong, escalation, civilian risk and the War Powers clock. Two flex collapses found on the way (the stacked name and the phone row) were fixed and rechecked at 1066 and 390. Against China, three goods (consumer electronics, machine tools, textiles) ticked under Section 122 at 10% each read about $13.2 billion a year in, and one review numbered all three; the review was closed, not confirmed, to leave the owner's save alone, so the commit of a several-goods order was proved by `tariff-package.test.ts` (two goods build two packets and two distinct measures) rather than in the app. Not run: the full build, test and gate sweep and `verify-dist-freshness`, which cannot pass while another session has uncommitted dist in the tree.

- **Status:** open · high · apps/player, packages/ui, player-core.
- **Owner:** universal player program. Follows BL-231.
- **Missing:** the owner, on the rebuilt force rows (2026-10-16): "there doesn't seem to be enough spacing, padding, and or inner margins. Also I would imagine more impact information to be displayed. I would expect to be able to change / apply tariffs on more or more items simultaneously." The rows used the tightest padding, Compare was a narrow bordered side column, most rows showed one reading or "Nothing we can read yet", and a tariff covered one kind of goods.
- **Acceptance:** rows take the card spacing (medium inner padding, large gaps between readings, a uniform one-line height on wide screens); Compare is a labeled checkbox and Details a labeled disclosure, beside the row on wide screens and in a footer on a phone, outside the row's press target. Every open option shows every reading the engine computes before it is taken: each change from today, what it sends, who stands with you, who reacts, what could go wrong, escalation, civilian risk, the chance they hit back and a War Powers clock, with the full staff findings one press away. No row says "Nothing we can read yet". A tariff order covers several goods in one review (the part of BL-179 that does not need its blockers). Checked at 390, 768, 1066 and 1440.
- **Evidence:** the owner's capture; `packages/ui/src/review/Results.tsx`; `packages/player-core/src/act/option-effects.ts` (military pressure was read only from their edge, so exercises and deployments read as moving nothing).
- **Blocked by:** nothing.

### BL-231 Rebuild the act workspace on the shared workspace pattern and the control plane

- **Closed:** October 16, 2026, in `a19cce042`. Proof: a Codex run on the tree before the commit (build 0, lint 0, 9,213 tests with one failure, the engine test that matched the old blockade wording, fixed to `/coast/` and re-run, 34 of 34; typecheck failed once on `SectionNav.web.tsx`, fixed, then `pnpm run typecheck` exit 0 on the committed tree; every proof gate passed except `verify-dist-freshness` and its proof, which needed dist committed, and `verify-dist-freshness` then passed on the committed tree: "dist/ matches src/ in all 9 tsc projects"). In the running app against Belarus: at 1440 every goal in one list, a phone call, a tariff and Forward Deploy checked and compared in the Checked view, a locked State visit with its meter and "Stabilization Package first", which plans that act with "This builds toward State visit", and the review sheet opened and closed for Forward Deploy (cost line now carries the weekly bill, one Laws line) and the Stabilization Package; at 768 the force filter in the two-line row; at 1066 the row stacks under the name (one-line rows start at 1,000 pixels of list); at 390 the Checked view with every change drawn from today; no horizontal overflow at 1440; the only console errors were from before the reload (the deleted `ActDesk` import and the duplicate "Law" key), and neither recurred after reopening the two-law review. Not exercised: confirming an act and its receipt, because ordering would change the owner's save; the receipt typechecks against the same `ActDone` the old one read.

- **Status:** open · high · apps/player, packages/ui, player-core.
- **Owner:** universal player program, with the connected control plane program (BL-171 to BL-211) and the presidential authority items (BL-221 to BL-228). Follows BL-229.
- **Missing:** the owner, on the force goal at `/world/nation/:id/act` (2026-10-16): "this interface feels disjointed from the rest; the entire UI/UX around this needs to be rebuilt as part of the broader efforts." BL-229 added effect readings, a comparison and prerequisite paths inside the existing desk; the desk itself still has its own look and its own flow.
- **Acceptance:** the act workspace is built from the same pieces as the rest of the app's workspaces (Section, Card, the results list, the control plane's selection) instead of its own cards: select one or more options, compare them side by side as a results list, reach a locked option through its prerequisite path, and approve through one review. Each defect below is gone, checked at 390 and 1440 wide with a clean console.
- **Added acceptance (owner, 2026-10-16):** "The player should be able to compare different types of goal actions against each other should they not? … It should be easy to understand and navigate." Goals are a filter over one set of options, and options checked from different goals (a phone call, a tariff and a forward deployment) compare in one results list with the same drawn readings, on phone and desktop. "Pick the interface and sub component apart and rebuild them from scratch, completely": every old part (goal picker, option cards, effect readings, comparison, terms, review summary, receipt, under-way list) is replaced. No option offers doing nothing or keeping the same; every reading is a change from today (DECISIONS §8.13, the rest of the app in BL-233). Design for review: https://claude.ai/artifact/5mBGLnWwz2JfZBf9Erx9WP (v3).
- **Evidence:** the owner's capture of the force goal, 2026-10-16:
  1. Expeditionary Invasion reads $129M and Limited Strike $235M, so the invasion looks cheaper. The headline shows only what each act charges up front: the invasion's $129M is four brigades' shipping, and it then bills about $853M a week (`engine/src/force-costs.ts` `US_FORCE_PRICES`), while the strike is priced whole. The pricing and labeling half is BL-232.
  2. The locked state reads "Not open" there and "Not available" elsewhere. "Not open" exists only in the frozen legacy player (`apps/web/src/world/nation/ActChoices.tsx`); `apps/player`'s `Choices.tsx` says "Not available". Check which player the capture came from.
  3. The blockade reason uses a parenthetical and an expert's tone: "a coastal target (a landlocked nation cannot be blockaded)" (`engine/src/instruments-military.ts:171`), printed as "This needs …".
  4. The cards' colored left rules, odds pips and cost and time chips don't match the app's workspace pattern.
- **Blocked by:** the joint BL-221 and BL-229 gate and commits; the control plane's shared selection and review pieces.

### BL-229 The act workspace cannot compare options or reach locked ones

- **Closed:** October 16, 2026, in `43352ddac`. Proof: the joint Codex gate with BL-221 (typecheck, lint, 9,208 tests, 89 of 90 proof gates; dist freshness passed after the commit), the balance harness after the declaration retune (138 passed, 0 failed, 4 skipped), and the checks at 390 and 1440 recorded below.
- **Owner:** universal player program.
- **Missing:** at `/world/nation/:id/act` each option card shows only its odds, cost and timing (`packages/player-core/src/act/preview.ts` `OptionPreview`). What an option moves (trust, tension, common aims, money) appears only after it is picked, and only against doing nothing (`act/assessment.ts`, `act/assessment-ties.ts`); two options cannot be set side by side. A locked option (state visit, joint declaration, every treaty, stabilization package, arms transfer, security guarantee) says only "build trust first": not how much trust it needs, how much there is, or which open act builds it, and nothing links there. The owner also reads the impact sizes as too small (2026-10-16, week-one `/dev/seed`, China, "Build ties").
- **Acceptance:** every option card draws what it moves, computed in player-core from the engine's own effect packets, never typed into copy. The President can select two or more options and compare them as a results list (rows with drawn cost, odds and effects; expand for detail; no option-column table). A locked option is visibly disabled, names its prerequisite with the current and required band drawn on one scale, and offers a one-press path to an open act that builds it; after that act the receipt returns to the locked option. The impact sizes are audited against real precedent in a written note with sources; any retune is justified there and passes `pnpm --filter @admin/engine run test:balance`. Checked at 390 and 1440 wide with a clean console.
- **Evidence:** owner capture 2026-10-16; `act/preview.ts` `ENGAGEMENT_HOLD_WORDS`; `engine/src/engagement.ts` `ENGAGEMENT_TERMS`; `engine/src/treaties.ts` `TREATY_TERMS.minTrust`; `engine/src/instruments-economic.ts` `trustAtLeast`.
- **Blocked by:** nothing. Builds on BL-221's finding-then-act pattern.
- **Proof (2026-10-16, working tree):** player-core `act/option-effects.ts` (each option's marks off the engine's packets, one scale set by the largest `TREATY_TERMS` step) and `act/prerequisite.ts` (floor, current band and open builders); engine `GateShortfall` on refused trust gates, `projectSuccessEffects` (`success-effects.ts`), `counterpartTrustFloor`, and engagement holds that carry their floors. `apps/player` cards draw the marks, locked cards are disabled with meters and a one-press builder, `Compare.tsx` is the results list, and the receipt leads back to the locked option. Tests: `packages/player-core/src/act/` 79 passed (8 new in `option-effects.test.ts`); `packages/engine/src/gate-readings.test.ts` 4 passed; `engagement.test.ts` 19 passed. Codex run: engine 4,639 passed and 1 failed (the 3-second timing budget in `person-network-graph.test.ts`, a known load flake while the balance run shared the machine); player-core 1,626 passed, `shell/doors.test.ts` setup failed on BL-221's `imposeTariff` export; player typecheck and lint pass; `verify-file-size`, `verify-renderer-boundary`, `verify-doctrine-metric-alignment`, `verify-no-history-references`, `verify-american-spelling` and `verify-us-units` pass. Balance harness after the one retune (joint declaration common aims +0.04 → +0.06): 138 passed, 0 failed, 4 skipped. Live at 390×844 and 1440×900 on a `/dev/seed` campaign (China, Build ties): three options compared, a summit taken from the trade agreement's builder link, and the receipt showed "Back to Agreement on Trade and Investment" with the meter re-read after it; no horizontal scroll; a fresh tab's console shows no errors (only the engine's existing require-cycle warnings). The audit is `docs/audits/2026-10-16-act-workspace/impact-audit.md`; the call and envoy cap is BL-230, the rebuild BL-231, and force-act pricing BL-232.

### BL-221 Tariffs need a statutory authority, a finding and its clock

- **Closed:** October 16, 2026, in `0e140f27a`.
- **Result:** every American tariff names one of five laws, each held to its finding, cap and clock (`packages/engine/src/tariff-statutes.ts`, `tariff-orders.ts`): §232 (a Commerce finding about the goods), §301 (a Trade Representative finding about the country), §201 (an International Trade Commission finding; at most 50 points more, four years, every supplier), §122 (at most 15%, 150 days, only against a partner that sells more than it buys) and §338 (answering a partner's own tariff; at most 50%). Where a law needs a finding, the act orders the investigation instead, and `tariffFindingPhase` rules on it in a later week. The ladder rung, scenario answers and conversation reports take the first law that fits (`fittingTariffStatute`) or refuse. The act form lists each law with its standing, limits and court risk (`player-core act/tariff-law.ts`, `apps/player world/act/Terms.tsx`), the citation follows the chosen law, §338 joins the registry, and saves move to v67 (`TradeMeasure.statute`, `TradeState.findings`).
- **Proof:** the joint Codex gate over this change and BL-229 on 2026-10-16: typecheck and lint pass, `pnpm run test` 9,208 passed across 859 files, and 89 of 90 proof gates pass (dist freshness was expected to fail on the uncommitted tree; four tracked-file-rewriting proofs were not run). `packages/engine/src/tariff-orders.test.ts` covers the refusal without a finding, the investigation clock, the ruling, the §122 cap and clock, §338, the §201 every-supplier reach and the fitting order. In the running app on a `/dev/seed` campaign (China, consumer electronics), a §301 investigation was ordered through review and confirmation, saved, and listed as "investigating, due July 21, 2029". The law list was checked at 375 px with no horizontal overflow.

### BL-164 The own-record landmarks read weeks from before the oath

- **Closed:** October 16, 2026, in `e96af65a3`.
- **Result:** `ownRecord` reads only governed weeks. The engine owns `inheritedRowCount`, and player-core's `record/inheritance.ts` reads it rather than keeping a copy. "Opening" is the first governed week and is dropped once the oath week scrolls out of the 24-week window.
- **Proof:** `packages/engine/src/benchmarks.test.ts`: 13 passed, including "never reads the inherited quarter as this administration's own record" and "drops the opening once the oath week has scrolled out of the kept history". `packages/player-core/src/record`: 55 passed.

### BL-162 Browser storage fallback can misreport durability

- **Closed:** October 15, 2026. Implementation `2556a4c65`; original browser regression `8ed988486`; remaining absence/blocked-upgrade cases retained in `apps/web/tests/browser-storage-durability.spec.ts` in this closeout.
- **Result:** silent memory fallback removed; save success waits for transaction completion. Failed manifest preflight preserves prior saved identity/time. Unreadable storage is unavailable rather than empty, and failed open/write can retry the real vault. Desktop storage semantics retained.
- **Proof:** `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/browser-storage-durability.spec.ts --project=desktop-1440 --workers=1 --output=/private/tmp/admin-shadcn-storage-complete-results` passed all four cases in 33.0 seconds. The absent-IndexedDB case explicitly uses 390px. The blocked case holds version 1 in a second document, intercepts the application's request to require version 2, observes the browser's actual blocked event, releases the holder, verifies the late upgrade aborts, then retries and reloads. Campaign manifest/payload hashes remain equal. No simulated blocked event or replacement in-memory vault is used.
- **Checks:** `pnpm exec eslint apps/web/tests/browser-storage-durability.spec.ts` and `git diff --check` passed. Existing full-suite timing failures remain BL-137; this closes the specified browser durability regression, not cross-browser or application-wide acceptance.

### BL-156 Tests that read generated or local-only files

- **Closed 2026-10-14:** `84136d248` vendors the existing report/repair regression inputs and generates the navigation fixtures into a fresh temporary directory. `720417b13` bounds the generator below its separate setup deadline, preserving every fixture and the route assertions. No ignored authoring job or pre-existing browser fixture directory is required.
- **Proof:** full content suite 1,045 passed; `pnpm --filter @admin/player-core exec vitest run src/shell/doors.test.ts` passed all 5 checks after generating the complete fixture set (910.19s total; main route assertion 25.607s against its unchanged 120s limit). The initial 15-minute setup failure remains recorded; no simulation horizon or assertion was removed. Evidence: `audits/2026-10-12-grounded-casting/READINESS-2026-10-14.md`.

### BL-155 `impact-accounting.test.ts` reads a gitignored job file

- **Closed 2026-10-14:** `84136d248` vendors the exact existing regression input under `packages/content/src/__fixtures__/authored-regressions/` and changes the test's read path. No authoring job directory is needed; no scenario was published.
- **Proof:** `impact-accounting.test.ts` passed in the recorded 66-test affected command; the later full content suite passed 1,045 tests. Vendored bytes were compared with the original input. Full readiness evidence: `audits/2026-10-12-grounded-casting/READINESS-2026-10-14.md`.

- **2026-10-14 · BL-148 · Regime change's first slice.** Merge `c03e17d98` (`9bb406009`, `6b3179587`, `ccd970757`), `f14cf2e13`, `a867688fb`, `1410a6dc8`. Coup support as a decaying sponsored term on the existing coup hazard, readable past the stability ceiling; political action through the existing selection and confidence draws; capture always offered and a lethal operation only under the President's order amending EO 12333 §2.11 (owner Q20), both seating the charter successor through the existing succession; weekly exposure into the scandal path, lapse at 104 weeks, a leaning successor; other governments on the shared tempo ledger (6 a term, 104 weeks a pair, treaty partners targetable, owner Q21); nuclear-armed targets refused by data; the operation chosen on the act screen. Proof: `REGIME-SLICE-1.md` (12 seeds), `regime-acts.test.ts`, `regime-npc.test.ts`, the integration gate record of 2026-10-14. Tuning and the next slice in BL-158.
- **2026-10-14 · BL-151 · Coercion follow-ups.** Merge `2b0541b1c` (`0386c736f`, `ddb6eb300`, `adbed9aa1`, `0837ea4ea`), `6e052172b`, `221357a2b`. Other governments' acts of force rationed (8 a term, 26 weeks a pair) and strait closures (2 a term, 104 weeks a strait, owner Q24) on one tempo ledger; per-flag passage through a closed Hormuz from EIA cargo by destination (Q23); acts of force against a declared arsenal with delivery refused, blockades included (Q2); crude kernel refit to the 2026 Hormuz shut-ins; hit-back labels without effect removed; a measure on a supplier now removes only the imposing buyer's modeled share (a US measure its full reach) and simultaneous shocks on one producer charge the heaviest. Proof: `FOLLOW-UPS.md` (12 seeds: NPC acts of force 17 → 0, NPC-opened wars 13 → 0, weeks of Brent above $90 at 0 after the shock fixes), `commodity-calibration.test.ts`. Declined with reasons in FOLLOW-UPS.md: bypass capacities EIA does not state, a blockade's import cut (billed inside its war), per-flag splits beyond Hormuz crude.
- **2026-10-14 · BL-154 · War follow-ups.** Merge `2b0541b1c`. Held fronts lose at the Korean static line's rate (Reister); a war's money billed once through the deployment that pays for it (DECISIONS 6.14); civilian deaths at 0.3 per soldier killed (OHCHR Ukraine); US hulls lost by name and class from the Naval Vessel Register, crews unnamed (owner Q4). Proof: `FOLLOW-UPS.md`, `hull-losses.test.ts`, `war-attrition.test.ts`, the balance harness in the integration gate record of 2026-10-14. Declined: a non-US wounded-per-killed curve (non-US ratios sit near the US heavy figure already used).
- **2026-10-13 · BL-152 · Unified appointments: relevant pools, one path, one desk.** `ea5c1d9bd`, `cca6efef6`, `26e935d2c`. A pool per seat applies sourced hard rules (10 U.S.C. §§113, 7013, 8013, 9013, 152 opened on Cornell LII; a legal career as the administration's floor for judges) and ranks by relevance with reasons shown; every Senate-confirmed seat, cabinet included, goes through `openNomination`; benches are generated once when a seat opens; each senator weighs a nominee's record (every nominee had counted 68-32); one desk at the Oversight appointments route with a preselected name per seat (never for the Supreme Court), a per-seat override and one review, the same seat row on the office page, Courts and the Brief. Proof: `docs/audits/2026-10-11-simulation-depth/gates/integration-2026-10-13.md` (full suite, 87 of 87 gates, Playwright 618 of 618 including the desk specs at six widths). Plan: `docs/audits/2026-10-13-appointments/PLAN.md`, `SOURCES.md`. Follow-ups in BL-153.
- **2026-10-13 · BL-144 · War losses scale with the forces committed, decisive victory can happen, and reach is coherent.** Merge `4d95a3e19` (`19de7e5b0`, `ed520c71d`). Losses from the forces in theater and the enemy, killed and wounded apart with CRS-sourced ratios, killed debited from population; strength from quality and people in theater with a decisive ratio of 3, a decisive end seating a successor; reach from the nearest base or treaty ally. Proof: `war-calibration.test.ts` (Iraq 2003-2011 within 6% killed and 2% wounded, fitted; the Gulf War held out, 10 of 12 decisive; peer wars indecisive) and the integration gate record. Follow-ups in BL-154.
- **2026-10-13 · BL-119 · Proof gates red before BL-116.** Merge `e26f508ba` (`0d64c3a6c`). The last red gate, `verify-publish-gate`, failed on a defect that was not there: `scenarios validate` judged the core pack without the shipped corpus, whose closes answer both arcs. The validator now reads the bake's opener and close index; the publish gate passes; two review pins came off the ledger. Proof: the integration gate record, 87 of 87.
- **2026-10-13 · BL-145 · Blockades: hostilities, an export cut that ends, prices at every sourced chokepoint.** Merged `6832dd1a5` (`a575b593f`, `258a9f04b`, `7e1bcebca`, `e447f4b24`). A first blockade is an act of war with a War Powers clock and no rally for a President-started blockade war; a standing blockade record replaces the permanent imports cut and lifts with the force; Hormuz crude and LNG and Bab el-Mandeb crude feed the price kernel from EIA figures; dependence weights reach the nation; hitting back is real; the NPC agent weighs a blockade as a strike. Proof: `docs/audits/2026-10-12-coercion-geography/SMALLER-CHANGE.md` (12 seeds: Brent $85-97 at turn 10 where the blockade lands, about $74 without; NPC blockades 54 → 7; nations ending below founding imports 16 → 0); merged tree clean build, typecheck, lint, full suite, 85 of 86 gates (publish gate, BL-119), Playwright 606 of 606 at six widths. Open follow-ups in BL-151.
- **2026-10-13 · BL-141 · Polish pass: one panel and title rhythm, whole-card targets, open detail, role records on every person.** `9ea84627e`, `03237a3bb`, `12bb10ff9`, `05081b030`; the coordinated gate that was its only open item ran in the interim checkpoint (`docs/audits/2026-10-11-simulation-depth/gates/interim-2026-10-13.md`): clean build, typecheck, lint and the full workspace suite, 85 of 86 safe gates, and Playwright at all six widths (605 of 606, the one failure fixed and re-run 126 of 126), including `washington-courts.spec.ts` against the dossier. Left as known limits, not defects: foreign leaders' records start at the opening or their recorded change of leader, and only acts the engine stamps are listed.
- **2026-10-10 · BL-91 · Marks and arcs ride the camera in flight; seam-split targets crossfade (W9).** `32033bd5e`, `0ad0e7568`. A flight frame never emitted on the view bus, so pins and arcs held their take-off positions for the whole flight and jumped on landing; a resize mid-flight snapped back; a flight to a target split by the view's antimeridian (Russia, New Zealand) swung through the far edge. Proof: `flight.test.ts` "pins in flight" (3) and `framing.test.ts` "the view's seam" (3), `npx vitest run src/map` 140 of 140; live, a pin sampled every frame on `/world` → `/world/nation/JPN` took 44 distinct positions over 42 flight frames; `/world` → the Russia–Ukraine war lands with no swing.
- **2026-10-10 · BL-72 · W6 Washington.** `a03c7464d`, `6fce3e27c`, `ac42fbe2c`. Proof: `docs/audits/2026-10-10-map-first/gates/w6.md`; all 85 rows due by W6 reached; Playwright 204 of 204.
- **2026-10-10 · BL-71 · W5 Nation.** `704dc356f`, `113144b49`, `d992e782d`, `1d550b04e`. Proof: `gates/w5.md`; all 50 rows due by W5 reached.
- **2026-10-10 · BL-84 · District holders.** `b11b75357`. 191 of 436 rows had the wrong holding party (party had been read from district number); all 436 regenerated from the House Clerk's member data (October 1, 2026), no names stored. Leans remain a spread (BL-85).
- **2026-10-10 · BL-83 · Same-day re-raise of a settled case.** `d2e3efbda`. Reproduced and fixed in `family-commodity.ts`; two store tests prove Continue spends at least a day.
- **2026-10-10 · BL-82 · Inherited sanctions.** `d2e3efbda`. Measures withhold US sales by kind (export controls and two-way embargoes do; sanctions, asset restrictions and import-only bans don't), sourced to the programs' orders; tests fail on the old rule. Remaining breadth of export controls is BL-88.
- **2026-10-10 · BL-79 · The owner approved the test pins.** The owner approved, in chat, every pin left on the ledger: 15 rows, 11 due W8 and 4 due W5. Each row carries `ownerApproved: true`. Proof: `node scripts/verify-pin-ledger.mjs` passes.
- **2026-10-10 · BL-70 · W4 Brief and the decision loop.** `3f318133e`. Proof: `docs/audits/2026-10-10-map-first/gates/w4.md`; 90 Playwright tests over the full loop at six widths; all 19 W4 ledger rows reached.
- **2026-10-10 · BL-19 · `hideGuidance` decided and built.** `3f318133e`. Dismissing the walkthrough is remembered per device; "Turn off guidance" writes `hideGuidance`; Settings turns it back on.
- **2026-10-10 · BL-69 · W3 design system and shell.** `e8f389e91`, integrated `454a02269`. Proof: `gates/w3.md`; a campaign is founded at all six widths; all 8 W3 ledger rows reached.
- **2026-10-10 · BL-68 · W2 map engine.** `c23fb0570`, integrated `454a02269`. Proof: `gates/w2.md`; first paint 171 ms desktop and 512 ms on a 4×-throttled phone.
- **2026-10-10 · BL-63 · E3 federal sites and state capitols.** `9706dd004`. 63 sourced HQ points, 13 `none` with reasons, 51 capitols, `checkSites` in the validator; DC-fallback count 1 → 0.
- **2026-10-10 · BL-67 · W1 map spike: go on the runtime-projected canvas.** `94eeb5695`. Proof: `docs/audits/2026-10-10-map-first/spike-w1.md`. Desktop and 4×-throttled 390×844 hold 16.7 ms frame intervals (p95 ≤ 16.8, 0 frames over 22.2 ms) during flights and pans; first paint is 166 ms on desktop and about 485 ms on the throttled phone; 129 KB loads up front. Not measured: a real phone GPU and Safari, the two conditions that would reopen the fallback.
- **2026-10-10 · BL-61 · E1 state approval.** `ef719fbb9`. `engine/src/regional-opinion.ts` solves a logit offset by bisection. The population-weighted mean equals headline minus honeymoon within 1e-9 across headlines 0.05–0.95 and polarization 0–1. The sign agrees with the electoral call; there is no district figure; save v55 carries `stateApprovalHistory`. Player-core `world/state-approval.ts` gives approval, call and the divergence line. The balance harness is identical before and after (4 known economy-balance failures, unchanged).
- **2026-10-10 · BL-62 · E2 force placement.** `10443b364` (data) and `c1eec11b7` (engine). 13 maritime zones; 35 installations with Wikidata coordinates, 5 zone-level, composites split; a validator with a 10 km coastal tolerance; `CommitmentLocation.theater` is a `ZoneId`, with save v56 migrating the old strings and composite bases; player and joiner deployments carry a location (a war deployment stores the defender's zone); `player-core/src/geo/force-placement.ts` computes command areas live and places seeded slots.
- **2026-10-10 · BL-64 · E4 one place resolver for incidents.** `a13c4aca5`. `world/dataset/places.ts` `placeAt` (city, then the state's largest city, then nation) behind `player-core/src/geo/place-of.ts` `placeOf`; `verify-incident-places` with its proof places 4,186 items across 4 kinds. Delaware, Montana and Wyoming pin at the nation until E3's capitols land (BL-63).
- **2026-10-10 · BL-60 · W0: relocate, then delete.** Relocation landed in `d848a36af`..`86c3ec659`, deletion and history purge in `2694017a8`..`0c9f03c1e`. Proof: `docs/audits/2026-10-10-map-first/gates/w0.md`. Build, typecheck, lint and every package's tests pass (0 failing; 51 pinned, awaiting BL-79). `verify-no-history-references` passes. Each of the 13 red gates is listed with its due wave. `dist/` is fresh.
**The map-first W0 reconciliation (2026-10-10).** W0 deleted the previous player (`apps/web/src`, the old `packages/ui-web` components, player-core's shell, room, route-table and guidance modules, `apps/web/e2e`), its gates (Grail, journeys, `verify-decision-legacy`, `verify-no-legacy-runtime`, `verify-screen-truth`, `verify-image-provenance`) in `bb5fb3387`, and the old records (`docs/_archive`, every earlier `docs/audits` folder, `docs/grail`, `PATTERNS.md`, specs, PRDs, ADRs and RFCs) in `1211e624e`. The items below were about those things. Each one's still-valid intent is named where it now lives. The proof for each is the deletion commit plus the named home.

- **2026-10-10 · BL-57 · Decision-grade UI: every screen proven against the critical journeys.** Superseded by the map-first rebuild: the twelve journeys, their contracts and the old e2e suite are deleted. The decision contract (effects, risk, authority and timing before authorization; every option kept on compact layouts) lives in `docs/DESIGN.md` §1 "Shared patterns" and §2 (`/brief/decision/:id`), proven by BL-70, and the full task suite at every size is BL-75. Its carried audit findings D01 to D12 are design rules now in `docs/DESIGN.md`. Commit `bb5fb3387`.
- **2026-10-10 · BL-59 · Visual foundation across every room.** Superseded by the map-first rebuild: the rooms and their stylesheets are deleted. Tokens, primitives and shell are rebuilt in W3 (BL-69) against `docs/DESIGN.md`. Commit `bb5fb3387`.
- **2026-10-10 · `admin-owca` · presidency.depth program umbrella.** Superseded by the map-first rebuild: `docs/PLAN.md` carries only the map-first program (`70d3c6b0e`), and the program's register was deleted with the old audits. Its landed engine work stays open under "Landed engine work awaiting proof" (`admin-owca.6` and its children); the no-push rule stays until the owner lifts it (BL-27). Commit `1211e624e`.
- **2026-10-10 · `admin-owca.7` · W6 presence, proof and the long tail.** Superseded by the map-first rebuild: its UI, docs and proof children close below; `admin-owca.7.2` (the order catalog) stays open on its own. Commit `1211e624e`.
- **2026-10-10 · `admin-owca.7.1` · W6 6C: presence at 1280, 1440 and 1920.** Superseded by the map-first rebuild: every surface it styled is deleted. Visual grammar, edge insets, the Record's recomposition and live readings now follow `docs/DESIGN.md` (BL-69 for the system, BL-74 for the Record, BL-75 for every size). Commit `bb5fb3387`.
- **2026-10-10 · `admin-owca.7.3` · W6 6E: docs, authority and wire-or-delete.** Superseded by the map-first rebuild: the ADR supersessions, PATTERNS, Grail sections and `verify-no-legacy-runtime` are deleted, and `docs/DECISIONS.md` is the one authority chain (`1211e624e`). The duplicate founding guidance went with the old player; the glossary is the one explanation system (`player-core/src/glossary/`). Its engine wire-or-delete rows (`admin-eayi.2`, `admin-po1d.10.3`, `admin-vbul`, `admin-917f`) move to BL-77; `admin-d7gi.15` (stores owed a door) is answered by the route tree in `docs/DESIGN.md` §2. Commit `1211e624e`.
- **2026-10-10 · `admin-owca.7.4` · W6 6F: proof, first session and release.** Superseded by the map-first rebuild: the web suite it proved is deleted. Flows, semantic assertions and accessibility move to BL-75; counsel as tutor and first-run calibration (`admin-qk1.2`, `.5`) to the first-run walkthrough in BL-70; the engine proofs (`admin-546.17`, `admin-3pt5.7`, `admin-xto`) to BL-78; the owner playtest stays open as `admin-suy.11.2`. Commit `bb5fb3387`.
- **2026-10-10 · `admin-owca.6.5` · W5 5D: security surfaces.** Superseded by the map-first rebuild: the security rooms and `war-room.spec.ts` are deleted. The theater, war files, clocks and munitions readings are World screens in `docs/DESIGN.md` §2 (BL-73). Its engine half (`c9c9aaad3`, including more than one branch answer at a military rung, `admin-y2x.1`) stays in the engine; the capability ledger's `issueAction` rows hold it to W7. Commit `bb5fb3387`.
- **2026-10-10 · `admin-owca.6.7` · W5 5F: world and press surfaces.** Superseded by the map-first rebuild: the World, nation and press screens are deleted. The named lenses and deployments are map lenses (BL-68, BL-73); trade bars and market components are `/world/nation/:id` and Nation economy content (BL-71, BL-73); the front page and foreign press are `/record/press` (BL-74); EVT-7's pins are map marks (BL-68). Commit `bb5fb3387`.
- **2026-10-10 · `admin-po1d.21` · full regression on the web: seventeen flows, semantic assertions, a blind first session, a fresh-context review.** Superseded by the map-first rebuild: the suite and the screens are deleted. All four children's intent is BL-75's acceptance. Commit `bb5fb3387`.
- **2026-10-10 · `admin-po1d.21.1` · the seventeen representative flows.** Superseded: the flows are listed in BL-75's acceptance. Commit `bb5fb3387`.
- **2026-10-10 · `admin-po1d.21.2` · semantic assertions for every critical surface.** Superseded: BL-75's full task suite and axe at every size. Commit `bb5fb3387`.
- **2026-10-10 · `admin-po1d.21.3` · blind first-session usability bar.** Superseded: the nine first-session questions are in BL-75's acceptance; the first-run walkthrough is BL-70. Commit `bb5fb3387`.
- **2026-10-10 · `admin-po1d.21.4` · adversarial review by a context that did not implement the work.** Superseded: an independent review of the rebuilt player is in BL-75's acceptance. Commit `bb5fb3387`.
- **2026-10-10 · BL-3 · the person dossier, rebuilt around the person.** Superseded by the map-first rebuild: `routes/person.$id.tsx` and `apps/web/src/dossier/` are deleted. The screen is `/washington/person/:id` in `docs/DESIGN.md` §2 (BL-72, W6); player-core's dossier copy stays open as BL-8 and BL-9, and the engine it reads is BL-2. Commit `bb5fb3387`.
- **2026-10-10 · BL-4 · finish the foreign-action workspace.** Superseded by the map-first rebuild: `apps/web/src/act/` is deleted. The workspace is `/world/nation/:id/act` in `docs/DESIGN.md` §2 (BL-73, W7), with objective, instrument, terms including support requests and protection, an assessment against the do-nothing baseline, then authorize. The engine terms it landed (support requests, protection, objectives, civilian and service consequences) stay; their balance run joins BL-21. Commit `bb5fb3387`.
- **2026-10-10 · BL-13 · richer flag and portrait primitives in `packages/ui-web`.** Superseded by the map-first rebuild: the old primitives are deleted; `Portrait` and `Flag` are W3 primitives (BL-69), and the face renderer stays at `@admin/ui-web/portrait`. Commit `bb5fb3387`.
- **2026-10-10 · BL-15 · speak a notice's severity to screen readers.** Superseded by the map-first rebuild: `NoticeCenter.tsx` is deleted. Spoken severity is a shell requirement for W3 (BL-69); `stanceSpoken` is still at `packages/player-core/src/desk/attention.ts:82` for it. Commit `bb5fb3387`.
- **2026-10-10 · BL-16 · draw `EmptyReading` where a reading is absent.** Superseded by the map-first rebuild: the old `EmptyReading` is deleted with the old ui-web components; the empty-state treatment is a W3 primitive (BL-69). Commit `bb5fb3387`.
- **2026-10-10 · BL-23 · close the gaps in `verify-no-legacy-runtime`.** Obsolete: the gate is deleted; `verify-no-history-references` takes over the denylist job (PROGRAM.md W0b step 5). Commit `bb5fb3387`.
- **2026-10-10 · BL-25 · point `verify-image-provenance` at the tracked scene images.** Obsolete: the gate is deleted, and no screen in `docs/DESIGN.md` consumes generated images (`docs/DECISIONS.md` §12.2). Commit `bb5fb3387`.
- **2026-10-10 · BL-31 · make the build and dev scripts portable.** Obsolete: `apps/web/src/build/assetsInlineLimit.test.ts` and `scripts/dev/shoot-rooms.mjs` are both deleted. Commit `bb5fb3387`.
- **2026-10-10 · BL-32 · ADR-0006 contradicts itself on `scripts/secrets.env`.** Superseded: the ADR is deleted, and `docs/DECISIONS.md` §12.1 states one rule (`scripts/with-secrets.sh` backed by `scripts/secrets.env`, or `scripts/run.sh`), which matches `scripts/with-secrets.sh:20`. Commit `1211e624e`.
- **2026-10-10 · BL-33 · reconcile the god-mode PRD with RFC 0021 on replay.** Obsolete: both documents are deleted; God Mode's rules are `docs/DECISIONS.md` §10, and its open grant question is BL-42. Commit `1211e624e`.
- **2026-10-10 · BL-37 · recount the PLAN references the unanchored ignore rule hid.** Obsolete: `docs/PLAN.md` was rewritten for the map-first program, and the cleanup's prune decisions are history. Commit `1211e624e`.
- **2026-10-10 · BL-44 · decide D9: the RFCs still Proposed or Draft.** Superseded: the RFCs are deleted; their still-valid rules are in `docs/DECISIONS.md`, and `docs/audits/2026-10-10-map-first/gates/w0-decisions-map.md` maps each deleted record to its rule or to "obsolete". Items that waited on an RFC no longer do. Commit `1211e624e`.
- **2026-10-10 · BL-50 · decide D19: retire the TypeScript token mirror.** Superseded: W3 replaces the tokens (BL-69), so whether a TypeScript mirror exists is decided there; `scripts/lib/grail-derive.mjs`, which read it, is deleted. Commit `bb5fb3387`.
- **2026-10-10 · BL-56 · follow-ups from the 2026-10-09 Playwright repair.** Superseded by the map-first rebuild: the specs, rooms and stylesheets they named are deleted. Item 2 (commodity calibration) joins BL-21; items 1 (repeated weekly war lines in the feed) and 15 (`notableNonJoiners`) are player-core and move to BL-54 as items 9 and 10. Commit `bb5fb3387`.

- **2026-10-10 · BL-76 · God Mode lives in settings, entitlement-gated.** The owner chose the recommended option in chat: `enableGodMode` is one `/settings` row shown only to entitled players, not a developer route or a search-only command. Proof: `docs/DESIGN.md` (`/settings`) and the capability ledger's `enableGodMode` row name the placement; the row stays open until W3 builds settings.
- **2026-10-09 · BL-41 · The codex branch is in staging, and staging has the remote's work.** `4e431910d` merged `codex/presidential-experience-impact` (with `fix/retire-beads-and-prune` and `fix/e2e-fixture-setup` inside it) into `staging` with `--no-ff`; its tree is byte-identical to the head gated in `docs/audits/2026-10-09-playwright-repair/gate.md`. A read-only `git fetch origin` then found the remote `staging` two content commits ahead, and `0dd4ef7bf` merged them without conflict. Proof: `git rev-list --count staging..origin/staging` is 0; content tests show the same failures before and after the merge (the two pack-importing suites fail 3 tests on the pre-merge pack files too); `verify-dist-freshness` passes. The three merged branches were deleted after pinning under `refs/safety/prune-2026-10-09/`.
- **2026-10-09 · BL-40 · PATTERNS is the brief; revision 03 is folded in and archived.** The owner chose to fold the still-valid rules into `docs/PATTERNS.md` and archive the October 1 material (`docs/DESIGN_ALIGNMENT_PLAN.md`, `docs/audits/2026-10-01-design-alignment.md`, `design/presidential-design-review/`, `design/presidential-command-concept/`) to `docs/_archive/design-governance-2026-10-09/`. Proof: BL-57 W0's commit; its findings D01 to D12 are re-homed under BL-57.
- **2026-10-09 · `admin-ln2i` · superseded by BL-57.** The redesign's P0 to P9 rollout is replaced by the journey-proven program; its unproven scope (populated crises, receipts, keyboard end to end, zoom, reduced motion, forced colors, cross-route regression) is BL-57's acceptance and D10.
- **2026-10-09 · BL-21 (its Playwright half) · Playwright runs, and the suite is green.** `51bb1cd86` rebuilt the two fixture saves global setup died on: `nato-call` read relationships with a retired key, and `contested-nominee` hunted for a contested Senate no seed produced any more. Eleven fix branches (merged into `fix/e2e-fixture-setup`), then `465375217`, `d412ac36e` and `cef35c548`, turned 118 failing tests green. Most were stale specs left by the redesign. The app fixes were invalid `dl` structure, truncation, the Record's scroll, contrast, a nested-interactive map and the risk ladder's layout. Proof: the full suite at 1440, 1280 and 1920 ran 844 passed, 0 failed, 0 flaky and 14 skipped, against 495 passed and 343 failed before (gate record `docs/audits/2026-10-09-playwright-repair/gate.md`). The balance half stays open as BL-21.
- **2026-10-09 · BL-54 item 1 · `war-room.spec.ts` asserted `.casualty-range`, which nothing rendered.** The spec now asserts what `WarBoard` draws (merge of `e2e/war-forces-security`). Proof: `war-room.spec.ts` green at all three widths.
- **2026-10-09 · BL-55 item 1 · `verify-american-spelling` is green.** `cef35c548` stopped the gate reading a camelCase identifier as a misspelling, with proof cases either way, and made the real British spellings American. Proof: `node scripts/verify-american-spelling.mjs` reports "American spelling across 2355 files", and its proof passes.
- **2026-10-09 · two of BL-20's baseline unit failures:** `family-commodity` ("raises one case per factory and commodity past its line") and `war-powers-reading` ("heads approval lower while the war lasts") now pass after the Playwright repair's player-core fixes. Proof: `pnpm run test` shows player-core at 6 failures, down from 8, with none new.
