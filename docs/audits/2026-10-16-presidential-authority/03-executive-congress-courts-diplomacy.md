# Presidential authority review 03: the executive branch, Congress, the courts, diplomacy, immigration, the press and clemency

Read-only review, 2026-10-16, branch `codex/reconcile-worktrees-2026-10-14`. No code, data or other doc was edited, built or run. Every game claim cites the source line it was read from. Every legal and historical claim cites a source opened on 2026-10-16 and listed at the end; anything not opened is marked UNCONFIRMED. Legal status is stated "as of 2026-10-16".

## Summary

38 acts and decision options in this domain were reviewed (the acts in `docs/audits/2026-10-16-control-plane/01-act-catalog.md` rows E1–E10, F1–F7, F10–F12, A1, A7, A8, B1, B2 and D1's two immigration orders, plus the Attorney General's order review, the special counsel and the clemency scenario replies). Verdicts: **23 ACCURATE, 1 OVERSTATED, 5 UNDERSTATED, 7 MISFRAMED, 2 MISSING GATE**. The game's legal skeleton is mostly sound: nomination, confirmation, the veto and override, the ten-day clock, the Senate's two thirds and the IRS bar are right. The serious problems are concentrated in four places. First, the removal and independence model is out of date: on 2026-06-29 the Supreme Court overruled *Humphrey's Executor* in *Trump v. Slaughter*, so the game's "for cause only" commissions and the refusal memoranda they write now state the law backwards, while *Trump v. Cook* (same day) puts a real, process-bound for-cause path on the Federal Reserve where the game has none. Second, the Justice Department's refusal to take presidential direction on a case is presented as statute signed by the Office of Legal Counsel, when it is a department policy that *Trump v. United States* (2024) places inside the President's own authority; the honest model is a norm breach with a price, not an automatic refusal. Third, the game refuses withdrawal from any ratified treaty and its glossary says a treaty outlasts a presidency; Presidents have withdrawn from ratified treaties repeatedly (ABM 2001, INF 2019, Open Skies 2020, the UN climate convention by memorandum of 2026-01-07), and only NATO is shielded by statute. Fourth, acting officers can be anyone with no other job, which the Vacancies Act forbids. Missing capabilities a President routinely or decisively uses: clemency, recess appointments, signing statements, executive privilege, declassification, recognition, withdrawal from international organizations, the refugee ceiling and TPS, the Alien Enemies Act (honestly framed), and civil-service reclassification.

Two process notes for BL-166. On 2026-10-16 the `uscode.house.gov` "granuleid" URLs the authority registry builds (`records-security.ts:6`) returned "Page Not Found" with a banner that the site is "operating in a temporary format"; the same sections resolved at `govinfo.gov/link/uscode/<title>/<section>`. `constitution.congress.gov` and `congress.gov` refused automated fetches (HTTP 403), so those links were not checked here.

## How to read each act

Each act has: **Game** (what the player can do, file:line), **Law** (source of the power, with links in the source list), **Procedure and limits**, **History**, **Politics**, **Verdict**, **Fix** (label and severity).

---

## A. Appointments, acting officials and removals

### R1. Open a nomination; fill vacant offices (E1)
- **Game.** `openNomination(campaign, office, nominee)` (`packages/engine/src/nomination.ts:293`) puts a name into vetting, then committee, executive calendar, cloture and floor stages (`nomination-stages.ts:27-48`, `:213-214`); the appointments desk sends several at once through one review (`apps/player/src/oversight/Appointments.tsx:72-111`).
- **Law.** Appointments Clause, U.S. Const. art. II, §2, cl. 2: principal officers by nomination with the Senate's advice and consent; inferior officers as Congress provides.
- **Procedure and limits.** Simple-majority cloture on nominations is Senate rule, not law. Vetting (FBI background, Office of Government Ethics) precedes transmission.
- **History.** Routine for every administration; contested nominations are withdrawn more often than defeated.
- **Politics.** Routine; cost is Senate floor time and committee goodwill.
- **Verdict.** ACCURATE.
- **Fix.** None.

### R2. Withdraw a nomination (E2)
- **Game.** `withdrawNomination` (`nomination.ts:338`), refused once confirmed.
- **Law / history.** The President's own act; common when a nominee lacks the votes.
- **Verdict.** ACCURATE.

### R3. Name an acting head (E3)
- **Game.** `appointActing(campaign, seat, person)` (`appointments.ts:365`). `actingRefusal` (`appointments.ts:304-328`) accepts any living national who holds no other chair and is not acting elsewhere. A pending nominee may act in the office they were nominated to: the comment says this "is how most contested chairs are held in practice" (`:322-326`). The 210-day clock runs from the day the acting is named (`appointments.ts:345`), for every Vacancies Act seat (`institution-catalog.ts:89-90`).
- **Law.** Federal Vacancies Reform Act, 5 U.S.C. §§3345–3349d.
- **Procedure and limits.** Only three classes may act: the office's first assistant; a Senate-confirmed officer the President directs; or a senior employee of the same agency (GS-15 or above) who served there at least 90 days in the year before the vacancy (§3345(a)). A nominee may not serve as acting unless they were first assistant for 90 days in the prior year or are a Senate-confirmed first assistant (§3345(b)), and *NLRB v. SW General* (2017) held that bar applies to every acting officer. The 210 days run from the date of the vacancy, are tolled while a first or second nomination is pending, and restart for 210 days after a rejection or withdrawal (§3346). An act by someone serving outside the Act "shall have no force or effect" (§3348, in the registry).
- **History.** On 2025-11-24 Judge Currie (E.D. Va.) dismissed the indictments of James Comey and Letitia James because the interim U.S. Attorney who alone presented them, Lindsey Halligan, was not lawfully serving. On 2025-12-01 the Third Circuit held that Alina Habba was not lawfully serving as acting U.S. Attorney for New Jersey. Both turned on vacancy statutes. (Status of any further appeal: UNCONFIRMED.)
- **Politics.** Actings are routine; actings who fail the statute are a litigation liability, because every act they sign can be attacked.
- **Verdict.** OVERSTATED. The game lets the President seat people the statute bars, and its comment states the nominee rule backwards.
- **Fix.** New gate (engine), high: restrict `actingRefusal` to first assistant, a Senate-confirmed officer, or a senior agency employee with 90 days' service; refuse a nominee unless first assistant; run the clock from the vacancy day with tolling for pending nominations. Copy: rewrite the `:322-326` comment.

### R4. Dismiss a cabinet secretary (E4)
- **Game.** `dismissMinister` (`appointments.ts:170`) empties the chair, prices standing and a possible rival faction (`:136-163`), and prices dismissing an Attorney General while a special counsel sits (`:200-205`).
- **Law.** Executive power and Take Care Clause, art. II, §§1, 3; *Myers v. United States* (1926); reaffirmed in *Trump v. Slaughter* (2026), whose syllabus describes the President's power to remove subordinates at will as settled by "the Decision of 1789".
- **History.** The 1973 dismissal of the Watergate special prosecutor after the Attorney General and Deputy resigned is the model for the special-counsel pricing (not re-verified this session).
- **Verdict.** ACCURATE.

### R5. Cabinet management: answer a resignation offer, grant a minister's proposal, reconcile a faction (E5–E7)
- **Game.** `answerResignationOffer` (`cabinet-agenda-acts.ts:91`), `takeMinisterProposal` (`:192`), `cabinet-faction.ts:228`.
- **Law.** Ordinary management of subordinates under art. II, §1 and the Opinion Clause (art. II, §2, cl. 1).
- **Verdict.** ACCURATE (no legal issue).

### R6. Remove an at-will officer below the cabinet (E8, at-will offices)
- **Game.** `removeOfficer` (`career-incumbents.ts:271`); at-will offices go "on the president's word" (`:264-270`). The FBI Director is at will despite the ten-year term (`institution-catalog.ts:579`).
- **Law.** *Myers*; *Slaughter*. The FBI Director's ten-year term carries no removal protection.
- **Verdict.** ACCURATE.

### R7. Remove the head of an independent commission (E8, "for-cause" regulators)
- **Game.** The SEC, FTC, FCC, CFPB, CFTC, FDIC, NRC and NLRB chairs are `removal: "for-cause"` with fixed terms (`institution-catalog.ts:127-134`, `:150-161`). The player must pick a cause (Inefficiency, Neglect of duty, Malfeasance), and each raises politicization (`career-incumbents.ts:235-247`, `:287-289`); copy says "You can remove them only for a reason the law allows" (`apps/player/src/oversight/Officers.tsx:10`) and "Congress has set a rule that you can remove the leader only for certain reasons" (`Officers.tsx:38`).
- **Law, as of 2026-10-16.** *Trump v. Slaughter*, 609 U.S. 422 (decided 2026-06-29, Roberts, C.J., 6–3) held the FTC's for-cause provision (15 U.S.C. §41) "contrary to the separation of powers" and, "[i]f anything more is left of Humphrey's," overruled *Humphrey's Executor* (1935). It reserved the Federal Reserve and non-Article III courts "for another day". Earlier: *Seila Law* (2020) struck the CFPB Director's protection; *Collins v. Yellen* (2021) struck the FHFA Director's; *Trump v. Wilcox* (stay, 2025-05-22) let the President remove NLRB and MSPB members pending litigation. *Morrison v. Olson* (1988) remains the leading case upholding protection for an inferior officer.
- **Procedure and limits.** After *Slaughter*, removal of a multimember-commission member who wields executive power needs no stated cause. A chair's designation as chair has generally been at the President's pleasure even before *Slaughter* (statutes vary; not verified seat by seat). Statutes still require party balance on many commissions, which constrains the replacement, not the removal.
- **History.** In 2025 the President removed the FTC's two Democratic commissioners, an NLRB member and an MSPB member without stated cause; *Slaughter* and *Wilcox* arose from those removals.
- **Politics.** Now lawful, still notable: it reads as ending the commission's bipartisan character, draws hearings, and is a story in the regulated industry.
- **Verdict.** UNDERSTATED. The game forces a pretextual "cause" and teaches a rule the Court has now rejected.
- **Fix.** Engine and copy, high: change these regulators to `at-will` (keep a political price, and keep `for-cause` only for bodies the Court reserved: the Fed and adjudicatory courts). Replace the Officers copy with: removal is at will after *Trump v. Slaughter* (2026); Congress's tenure rules for these commissions no longer bind. Add the registry record for *Slaughter*.

### R8. Remove the Chair or a Governor of the Federal Reserve
- **Game.** `OFF-FED-CHAIR` is `removal: "term-protected"` (`institution-catalog.ts:607`), so `removeOfficer` refuses with "held for a fixed term. The President cannot end it" (`career-incumbents.ts:284-286`). Governors are for cause (`:608`) but unreachable through this act (it reads `def.offices[0]`, `:277`). The authority record says governors are removable "only for cause (§242)" (`packages/player-core/src/authority/records-offices.ts:60-70`), which disagrees with "cannot end it".
- **Law, as of 2026-10-16.** 12 U.S.C. §242 (removal "for cause"). *Trump v. Cook*, 609 U.S. 528 (2026-06-29, Roberts, C.J., 5–4, on a stay application) denied the government's application: whether cause exists is reviewable; "cause" for a Governor carries "a substantial threshold" reflecting the Fed's independence; and the President had not given the statutory pre-termination process. *Wilcox* had already called the Fed "a uniquely structured, quasi-private entity".
- **History.** August 2025, the first attempted removal of a Governor in the Fed's history (*Cook* syllabus).
- **Politics.** Extraordinary; markets, the Senate Banking Committee and the courts all react.
- **Verdict.** UNDERSTATED. The power exists, narrowly, with process and judicial review; the game says it does not exist at all.
- **Fix.** New gate (engine), medium: allow a for-cause removal of a Governor (and the Chair as Governor) only with a stated, serious, office-related cause and a notice-and-response step, then open a court proceeding with high odds against the President. Never a plain button. Align the authority record and the refusal text.

### R9. File an inspector general removal notice (E9)
- **Game.** `fileInspectorRemovalNotice` (`inspectors-general.ts:264`) requires a non-empty reason (`:279-280`) and empties the office after thirty days (`:257-262`). The screen offers two reasons, both "No finding of misconduct is asserted" boilerplate (`apps/player/src/oversight/Inspectors.tsx:11`). The authority record names only the thirty-day notice (`records-offices.ts:29-41`).
- **Law.** 5 U.S.C. §403(b): written reasons to both Houses thirty days before removal. Pub. L. 117-263, div. E, §5202 (2022-12-23), shown in the Code as an amendment applying to §403, replaced "reasons" with "substantive rationale, including detailed and case-specific reasons", added the committees as recipients, and limited placing an IG on non-duty status during the notice period.
- **History.** On 2025-01-24 seventeen IGs were removed the same day by two-sentence emails citing "changing priorities". On 2025-09-24 Judge Reyes (D.D.C.) held "President Trump violated the IGA. That much is obvious," but denied reinstatement for lack of irreparable harm. The government argued the notice requirement is unconstitutional as applied; that question is open.
- **Politics.** Notable to extraordinary depending on timing; bipartisan oversight committees treat IG removals as an attack on oversight.
- **Verdict.** MISSING GATE. The clock is right; the content requirement is missing, and the offered reasons are exactly the generic statement the 2022 amendment was written to stop.
- **Fix.** New gate and copy, high: require a case-specific rationale (a choice that names a finding on the record), show that a generic statement violates §403(b) as amended and invites suit, and add an "immediate removal without notice" option framed as unlawful with litigation and oversight cost, or leave it out. Update the registry record.

---

## B. Directives to agencies and legal review

### R10. Directive to the Justice Department or FBI to open, close or target a case (E10, investigation and targeting)
- **Game.** `STATUTORY_BARS` (`directives.ts:209-217`) makes every investigation or targeting directive to DOJ, FBI, DEA, ATF and the Marshals an automatic refusal, cited to "28 U.S.C. § 509 and the Department's standing policy on communications with the White House", "signed by" the Office of Legal Counsel, saying the Department "does not open, close or direct a case at the request of the President". The screen calls it "Refuses in writing, citing the law that forbids it" (`apps/player/src/oversight/Directives.tsx:10`, `:21`).
- **Law, as of 2026-10-16.** 28 U.S.C. §509 vests the Department's functions in the Attorney General; it does not forbid the President to direct the Attorney General. The White House contacts rule is internal Department policy (Attorney General memorandum of 2009-05-11, reissued by later Attorneys General; whether a 2025 version was issued is UNCONFIRMED). *Trump v. United States* (2024) held that the Executive Branch has "exclusive authority and absolute discretion" over which crimes to investigate and prosecute, that discussions with the Attorney General about investigations fall within the President's "conclusive and preclusive" authority, and that allegations the requested investigations "were shams or proposed for an improper purpose" do not change that.
- **Procedure and limits.** Real constraints are institutional and judicial: an Attorney General may refuse and resign; career prosecutors may decline to sign; grand juries may refuse to indict; courts dismiss vindictive or selective prosecutions and unlawfully appointed prosecutors (see R3); 26 U.S.C. §7217 is a real statutory bar, but only for the IRS.
- **History.** Department contacts policies date to the post-Watergate era. In 2025, after public presidential calls for prosecutions, the Eastern District of Virginia indicted James Comey and Letitia James; both indictments were dismissed on 2025-11-24 because the prosecutor was not lawfully serving.
- **Politics.** Extraordinary. Breaks a fifty-year norm, costs the Department's credibility before courts and juries, and draws congressional oversight.
- **Verdict.** MISFRAMED. The game presents a norm as statute, and a refusal by counsel as automatic, which mischaracterizes both the law and recent history.
- **Fix.** Engine and copy, high: remove DOJ and FBI from `STATUTORY_BARS`. Route the directive to the Attorney General's own willingness (the existing `weigh` pattern in `order-review.ts`): comply, slow-walk, or refuse and resign; on compliance, add risks of career resignations, grand-jury refusal, vindictive-prosecution dismissal and oversight. Make it a hard case (DECISIONS §3.6). Cite the 2009 memorandum as policy and *Trump v. United States* as the contested authority, each in its own registry record.

### R11. Directive to the IRS to audit or stop auditing a named taxpayer
- **Game.** `directives.ts:218-225`, cited to 26 U.S.C. §7217.
- **Law.** §7217 forbids the President and Executive Office staff to request an audit or termination of an audit of a particular taxpayer, and requires the request to be reported.
- **Verdict.** ACCURATE.

### R12. Directive to the Federal Reserve on the policy rate
- **Game.** `directives.ts:226-233` refuses every directive kind at the Fed.
- **Law.** 12 U.S.C. §§241–242; *Cook* (2026) on the Fed's independence; Executive Order 14215 (2025-02-18) expressly excludes "monetary policy" from presidential supervision while reaching the Board's supervision and regulation of financial institutions.
- **Verdict.** ACCURATE for the rate. The refusal of `enforcement-posture` at the Fed is contested under EO 14215; note it in copy (low).

### R13. Directive to an independent commission (the catch-all memorandum)
- **Game.** `independenceMemorandum` (`directives.ts:244-255`) has every `independent` body refuse "how, against whom, or how vigorously" it acts because its officers are "removable only for cause". BL-165 already records that it also fires for Congress, the courts and the states.
- **Law, as of 2026-10-16.** After *Slaughter*, commissioners of executive-power agencies are removable at will, so the memorandum's premise is false for them. EO 14215 (2025-02-18) requires independent regulatory agencies to submit significant regulatory actions for White House review and declares that the President's and the Attorney General's opinions on law are "controlling on all employees". The Fed, Article III courts, Congress and the states remain outside presidential direction.
- **Verdict.** UNDERSTATED. The President can now direct these bodies, and remove a commissioner who refuses; the game says no one can.
- **Fix.** Engine, high, folded into BL-165: restrict the memorandum to the Fed, the courts, Congress and the states; route commission directives through the same willingness and removal path as executive agencies, with a commission-specific political price.

### R14. Enforcement-posture and sanctions-tempo directives to executive agencies
- **Game.** Carried or slow-walked by capacity (`directives.ts:455-492`, `execution.ts`).
- **Law.** Take Care Clause; enforcement priorities are an ordinary executive function.
- **Verdict.** ACCURATE.

### R15. The special counsel
- **Game.** No presidential verb; the file says "from that day nobody in the administration supervises it" (`special-counsel.ts:21-28`) and the appointment headline says "Nobody in the administration supervises it" (`:123`).
- **Law.** 28 C.F.R. part 600 (a Department regulation since 1999, not a statute): the counsel "shall not be subject to the day-to-day supervision of any official", but the Attorney General may require an explanation of any step and decide it "should not be pursued", with notice to Congress (§600.7(b)); removal is by the Attorney General for misconduct or good cause (§600.7(d)). The Department can rescind the regulation.
- **Verdict.** MISFRAMED. The real exposure is the Attorney General's countermand and removal power, which is why its use is so costly.
- **Fix.** Copy, low: "No one supervises it day to day. The Attorney General can overrule a step or remove the counsel for cause, and must tell Congress."

### R16. The Attorney General's review of a proposed order
- **Game.** `reviewOrder` (`order-review.ts:96-108`) has the Attorney General clear or object before signature; orders below `REVIEW_REACH_FLOOR = 0.15` are not reviewed (`:26`); an objection raises challenge odds by 1.3 (`:29`) and is stamped `"public"` (`:105`, "an objection from the Attorney General is the kind of paper that reaches the courts and the press").
- **Law.** Executive Order 11030 (registry record `eo-11030`): every proposed order goes to OMB, then to the Attorney General (in practice the Office of Legal Counsel) for form and legality.
- **Procedure and limits.** The President may sign over an objection. OLC advice is confidential and privileged; it reaches courts and the press only by leak, by resignation, by later release or by the Attorney General's refusal to defend in court.
- **History.** Acting Attorney General Sally Yates's refusal to defend the January 2017 entry order and her dismissal is the closest modern precedent (not re-verified this session).
- **Verdict.** MISFRAMED. Making every objection public turns privileged advice into a press release; skipping review for "ordinary" orders contradicts EO 11030.
- **Fix.** Engine and copy, medium: stamp objections `internal`, add a separate risk that the objection leaks or that the Attorney General refuses to defend; review every order (low-reach orders clear without comment).

---

## C. The courts

### R17. Answer a lower-court ruling against an order: accept, seek review, seek review with a stay (F6)
- **Game.** `answerLowerOrderReview` (`judicial-review.ts:347-403`); accepting makes the judgment final; seeking leaves it in force unless stayed (`:402`); relief can be party-specific (`state-judiciary.ts:115`, `statutory-matters.ts:50`).
- **Law.** The Solicitor General controls the government's appeals. *Trump v. CASA* (2025-06-27) held universal injunctions "likely exceed the equitable authority" Congress gave federal courts, limiting injunctions to complete relief for plaintiffs with standing; class actions and APA set-aside were left available.
- **Verdict.** ACCURATE. Note (low, copy): where the generic opinion says a district court "sets aside the order" on a non-APA constitutional claim (`judicial-review.ts:83-86`), the honest relief after *CASA* is party-specific unless a class was certified, as in *Trump v. Barbara*.
- **Planned defiance (DECISIONS §13.13).** Keep it a hard case with integrity, impeachment and contempt exposure; the copy should say plainly that no President has openly defied a final Supreme Court judgment in modern practice and that doing so is unlawful.

---

## D. Congress and legislation

### R18. Sign a bill (F1)
- **Game.** `signBill` (`legislation.ts:336`) within the ten-day window (`signing-window.ts:19-56`).
- **Law.** Presentment Clause, art. I, §7.
- **Verdict.** ACCURATE.

### R19. Veto a bill with a message; override (F1)
- **Game.** `vetoBill` requires a message (`legislation.ts:374-377`); override by two thirds of both chambers, counted on members present (`:216-244`, `:770-786`).
- **Law.** Art. I, §7, cl. 2. *The Pocket Veto Case* (1929) and *Wright v. United States* (1938) on return and adjournment.
- **History.** Every modern President has vetoed; overrides are rare.
- **Verdict.** ACCURATE.

### R20. A bill left unsigned becomes law; no pocket veto
- **Game.** `signing-window.ts:14-16` and the glossary (`player-core/src/glossary/government.ts:112`) say plainly the pocket veto is left out because "Congress never adjourns here".
- **Law.** Art. I, §7: a bill not returned in ten days (Sundays excepted) is law "unless the Congress by their Adjournment prevent its Return". *The Pocket Veto Case* (1929) upheld a pocket veto at a session's end; *Wright* (1938) held a short recess of one House with an agent to receive the return does not prevent return. Intra-session and pro forma pocket vetoes remain contested between the branches.
- **Verdict.** UNDERSTATED. The copy is honest, but the end-of-Congress pocket veto is a real, common presidential tool, especially in the final days of a Congress.
- **Fix.** New act, low: model the sine die adjournment at the end of each Congress (January of odd years) and allow a pocket veto of bills presented in its last ten days, labeled contested for intra-session use.

### R21. Transmit an administration bill (F2)
- **Game.** `transmit` (`legislation.ts:475-511`): "The administration transmits {title}, and it is referred to committee"; one administration bill at a time; three measures in flight at most (`:168`, `:483-488`).
- **Law.** Art. II, §3: the President recommends measures. Only a member can introduce a bill; administration drafts are introduced by a member, often "by request".
- **Verdict.** MISFRAMED (low). The engine's "place on the calendar" is fine; the copy skips the sponsor, and the one-bill cap is a game rule, not law.
- **Fix.** Copy, low: "Your draft goes up as an executive communication; {sponsor} introduces it and it is referred to committee." Label the one-bill cap as a game rule.

### R22. Propose bill text; recommend conference text (F5)
- **Game.** `bill-text-actions.ts:6`, `:21`.
- **Law / practice.** Statements of Administration Policy and legislative-affairs drafting are routine.
- **Verdict.** ACCURATE.

### R23. Lobby a Hill post: call, budget negotiation, public appeal, shared credit, campaign beside them (F3)
- **Game.** `LOBBY_PLAYS` (`lobbying.ts:95-147`); the trade copy says "a political commitment ... not money leaving the treasury today" (`lobbying-copy.ts:19-29`); two slots a day (`lobbying-person.ts:229`).
- **Law / practice.** Persuasion, project commitments and campaign appearances are lawful and routine; the line the copy correctly stays on the right side of is a personal benefit for an official act.
- **Verdict.** ACCURATE. The two-a-day cap is a game rule (see the control-plane audit's G10).

### R24. Member outreach, direct or through a broker (F4)
- **Game.** `issueMemberOutreach` (`member-outreach.ts:18-32`); "No votes were promised" (`:57`, `:70`).
- **Verdict.** ACCURATE.

---

## E. Diplomacy and treaties

### R25. Diplomatic instruments: private warning, public statement, recall ambassador, coalition pressure, sever relations (A1)
- **Game.** `instruments.ts:60-120`; gates on reach and legitimacy.
- **Law.** Reception Clause, art. II, §3; *Zivotofsky v. Kerry* (2015): the President has "the exclusive power to grant formal recognition to a foreign sovereign". Breaking relations is the President's act alone; ambassadors are confirmed by the Senate.
- **Verdict.** ACCURATE.

### R26. Engagement: call, envoy, visit, summit, joint declaration (A7)
- **Game.** `engagement.ts:340`; `ENGAGEMENT_KINDS` (`:35`).
- **Law.** Art. II foreign-affairs power. 1 U.S.C. §112b as amended in 2022 requires the Secretary of State to report monthly to congressional leaders and committees every international agreement and "qualifying non-binding instrument", with its text and the legal authority relied on.
- **Verdict.** MISSING GATE (low). A signed joint declaration is the kind of instrument that may now have to be reported; the game reports nothing.
- **Fix.** Copy, low: a declaration's receipt notes the Case Act report; the same for executive agreements (R29).

### R27. Sign an alliance or arms-control treaty; Senate two thirds (A8, B1)
- **Game.** `TREATY_TERMS` (`treaties.ts:66-102`), `bindsOn: "ratification"`; the Senate count is two thirds; signing is not gated on ratification odds (`treaties.ts:260-266`).
- **Law.** Treaty Clause, art. II, §2, cl. 2.
- **Verdict.** ACCURATE. Signing what the Senate will not ratify is real and the comment says so.

### R28. Sign a trade agreement as an Article II treaty (A8, `trade`)
- **Game.** `trade` is `bindsOn: "ratification"` with a Senate whip count (`treaties.ts:83-90`).
- **Law.** Modern U.S. trade agreements are congressional-executive agreements approved and implemented by statute, by majorities of both Houses, under trade promotion authority. 19 U.S.C. §4202(a) let the President enter trade agreements before 2021-07-01 for expedited approval; that authority has lapsed.
- **Verdict.** MISFRAMED (medium). The two-thirds Senate path is wrong for trade, and the lapse of trade promotion authority is a real constraint the game does not show.
- **Fix.** Engine and copy, medium: route trade agreements to a majority vote of both chambers (the bill path), and show whether trade promotion authority is in force.

### R29. Sign or revoke an executive agreement (A8, B2)
- **Game.** Takes effect on signature; "binds this administration the moment it is signed, and nothing more permanent than that" (`treaties.ts:103-113`); revocable with "nobody's permission" (`:680-716`); the glossary says a treaty "once it is in force, it outlasts your presidency" (`player-core/src/glossary/world.ts:278`).
- **Law.** An executive agreement binds the United States in international law, not only the administration. Sole executive agreements rest on art. II; congressional-executive agreements rest on a statute and are as durable as the statute. Case-Zablocki reporting applies (R26).
- **History.** The 2015 Iran nuclear arrangement was a political commitment ended in 2018; the Paris Agreement was joined without Senate consent and left in 2020 and again in 2025–2026 (dates not re-verified this session).
- **Verdict.** MISFRAMED (medium). The mechanics (revocable, smaller effect) are fine; the claim that it binds only the administration, and the contrast that a treaty cannot be left, are wrong.
- **Fix.** Copy, medium: "Binds the United States now, on your authority alone. A successor can end it as easily as you made it. It must be reported to Congress." Fix the glossary (see R32).

### R30. Send a signed treaty to the Senate (B1)
- **Game.** `issueRatification` (`treaties.ts:470-520`).
- **Verdict.** ACCURATE. (The President also decides whether to ratify after consent; not needed in play.)

### R31. Withdraw a signed treaty before a vote (B2)
- **Game.** `withdrawTreaty` for `signed` status (`treaties.ts:680-716`).
- **Verdict.** ACCURATE. Presidents withdraw treaties from the Senate.

### R32. Withdraw from a ratified treaty or an inherited compact
- **Game.** Refused: `withdrawTreaty` accepts only `signed` and `in-force-by-signature` (`treaties.ts:686-688`); the treaty screen says "This agreement was ratified before you took office, and in this game, you can't withdraw from it" (`apps/player/src/world/sets/TreatyScreen.tsx:107`); the glossary says a ratified treaty "outlasts your presidency" (`glossary/world.ts:278`).
- **Law, as of 2026-10-16.** The Constitution is silent on termination. *Goldwater v. Carter* (1979) vacated a challenge to President Carter's termination of the Taiwan defense treaty, four Justices calling it a political question. Practice since has settled on presidential withdrawal under a treaty's own withdrawal clause. The exception is NATO: 22 U.S.C. §1928f forbids the President to "suspend, terminate, denounce, or withdraw" from the North Atlantic Treaty except with two thirds of the Senate or an Act of Congress, bars funds for it, and requires 180 days' notice to the foreign-affairs committees; it adds that nothing in it implies the President may withdraw from other treaties, leaving that question open.
- **History.** ABM Treaty: notice 2001-12-13 (President G.W. Bush). INF Treaty: suspension 2019-02-01, withdrawal 2019-08-02. Open Skies: notice 2020-05-22, effective 2020-11-22 (from search-result summaries of the State Department statement; the statement itself was not opened, UNCONFIRMED). WHO: withdrawal order published 2025-01-29. Memorandum of 2026-01-07 directing withdrawal from 66 bodies, including the UN Framework Convention on Climate Change, to which the Senate consented in 1992.
- **Politics.** Notable to extraordinary depending on the treaty; costs allies and Senate goodwill; legal challenge is unlikely to succeed under *Goldwater*.
- **Verdict.** UNDERSTATED (high). The game refuses a power Presidents of both parties have used, and its glossary teaches the opposite.
- **Fix.** New act (engine), high: allow withdrawal from a ratified treaty under its withdrawal clause, with the clause's notice period (default six months or one year), the Senate and ally costs, and a contested-authority note; keep the refusal for the North Atlantic Treaty with the §1928f text as the reason. Copy: replace "outlasts your presidency" with "binds until the United States withdraws under its terms".

---

## F. Immigration and entry

### R33. Suspend entry of a class of aliens by proclamation (D1, `order-entry-suspension`)
- **Game.** `order-families.ts:60-77`, cited to 8 U.S.C. §1182(f); limit "Requires a finding of detriment for a defined class; reaches first entry from abroad only".
- **Law.** §1182(f) lets the President, on finding entry "detrimental", suspend entry of "any class of aliens" "for such period as he shall deem necessary". *Trump v. Hawaii* (2018) upheld the 2017 proclamation, applying rational-basis review to the Establishment Clause claim.
- **History.** Used by Presidents of both parties; the 2017–2018 entry proclamations were the most litigated.
- **Verdict.** ACCURATE. The game's "observed security threat" gate is narrower than the statute, which is a fair design choice.

### R34. Tighten border controls (D1, `order-border-controls`)
- **Game.** `orders.ts:203-229`, cited to 8 U.S.C. §1103(a)(5), "adds no new ground to turn anyone away".
- **Verdict.** ACCURATE. *Mullin v. Al Otro Lado* (2026-06-25) held an alien standing in Mexico has not "arrive[d] in the United States", so port-of-entry metering does not violate the asylum statute; this supports the order's reach at ports.

(Missing immigration powers are in the capabilities section.)

---

## G. Press and communications

### R35. Interview, press conference (F11)
- **Game.** `PRESS_PLAYS` (`press.ts:366-395`); one engagement a week (`press-issued.ts:57-62`, `:93`).
- **Law.** No legal constraint beyond the First Amendment's limits on government retaliation.
- **Verdict.** ACCURATE. The one-a-week cap is a game rule (control-plane G13); real Presidents speak daily.

### R36. Put the story out through someone else (F11, leak)
- **Game.** "A senior official familiar with the matter, speaking on condition of anonymity" (`press.ts:396-418`), heaviest integrity backfire.
- **Law / practice.** Authorized background briefings are routine. If the content is classified, an authorized disclosure turns on the President's declassification authority under EO 13526, which the game does not model (see missing capabilities).
- **Verdict.** ACCURATE.

### R37. Frame an order; press secretary takes the hit; scandal responses (F7, F10, F12)
- **Game.** `press-framing.ts:291`, `press-secretary.ts:66`, `scandal-response.ts:299`.
- **Verdict.** ACCURATE (political acts with no legal gate).

---

## H. Clemency

### R38. Pardons and commutations (scenario replies only)
- **Game.** No act. The authority record lists "Grant reprieves and pardons for federal offenses" with the right limits (`records-constitution.ts:28-48`), and the Executive Office catalog lists `pardon` (`institution-catalog.ts:366`). Pardons appear only as scenario replies in the bundled corpus (scenario ids `the-pardon-nobody-is-watching`, `the-pardon-nobody-has-asked-about`), whose copy speaks of putting a pardon "in the routine weekly list", a "pardons committee" and "the bench" being told it was wrong.
- **Law.** Art. II, §2, cl. 1: "Reprieves and Pardons for Offences against the United States, except in Cases of Impeachment". Federal offenses only; no Senate role; may be granted before charge (President Ford's pardon of President Nixon, Proclamation 4311 of 1974-09-08, covered 1969-01-20 to 1974-08-09). Department of Justice review through the Office of the Pardon Attorney is customary, not required.
- **History.** President Biden's pardons included a preemptive grant to Gen. Mark Milley dated 2025-01-19 covering offenses from 2014-01-01. President Trump's January 20, 2025 proclamation covered offenses related to the January 6, 2021 events; the Department's list shows about 169 further grants through 2026-09-08. (President Clinton's 2001 grants and the clemency controversies around them were not re-verified this session.)
- **Politics.** Routine when through the Pardon Attorney; extraordinary when for associates, family or political allies, which draws hearings and proposals to amend the Constitution but no legal check.
- **Verdict.** MISFRAMED (high): the content describes a parliamentary or monarchic process (weekly lists, a pardons committee), and the core power has no act.
- **Fix.** New act and copy, high: a clemency act (pardon, commutation, reprieve) on federal convictions and federal exposure, with the Pardon Attorney's recommendation shown, no Senate or court gate, and price set by who receives it. Rewrite the two scenarios to U.S. procedure.

---

## Critical capabilities missing

| Capability | Legal basis | Precedent | Why a player needs it | Priority |
|---|---|---|---|---|
| Clemency: pardon, commutation, reprieve | Art. II, §2, cl. 1 | Ford–Nixon 1974; Biden 2025 preemptive grants; Trump 2025 January 6 proclamation | A sole, unreviewable power and a recurring political test | High |
| Withdraw from a ratified treaty | Art. II; treaty withdrawal clauses; *Goldwater*; NATO bar at 22 U.S.C. §1928f | ABM 2001, INF 2019, Open Skies 2020, UNFCCC withdrawal directed 2026 | The game teaches the reverse today | High |
| Withdraw from an international organization or stop funding it | Art. II; organization charters; appropriations law | WHO order 2025-01-29; memorandum of 2026-01-07 (66 bodies) | Core to modern foreign policy | High |
| Executive privilege against a congressional or judicial subpoena | Art. II as read in *United States v. Nixon* (1974) and *Trump v. Mazars* (2020) | Nixon tapes; *Mazars* four-factor test | Oversight in the game has no presidential answer but scandal responses | Medium |
| Recess appointment | Art. II, §2, cl. 3; *NLRB v. Noel Canning* (2014): recesses of fewer than 10 days presumptively too short; pro forma sessions count | Obama January 2012 NLRB appointments invalidated in *Noel Canning* | A real but now rare lever; the honest model is "the Senate blocks it with pro forma sessions" | Medium |
| Signing statement | Art. II; Take Care Clause | Used by every modern President; contested when it declines to enforce a provision | Lets the player sign a bill while objecting to part of it | Medium |
| Declassification and classification | EO 13526 (registry record `eo-13526`) | Routine and politically charged releases | Pairs with DECISIONS §8.11 and the background-briefing play | Medium |
| Formal recognition or derecognition of a government | Art. II, §3; *Zivotofsky* (2015) | Recognition changes after coups and disputed elections | Opens real diplomatic choices the game already prices | Medium |
| Refugee admissions ceiling | 8 U.S.C. §1157 (annual consultation with Congress) | Annual determinations | A yearly presidential number with domestic and foreign effects | Medium |
| Temporary Protected Status designations and terminations (Secretary of Homeland Security) | 8 U.S.C. §1254a; *Mullin v. Doe* (2026-06-25) held §1254a(b)(5)(A) bars review of non-constitutional claims | 2025 terminations for Syria and Haiti | A real, largely unreviewable lever with large effects | Medium |
| Alien Enemies Act proclamation | 50 U.S.C. §21: declared war or an "invasion or predatory incursion" by a "foreign nation or government" | Proclamation 10903 (2025); *Trump v. J.G.G.* (2025-04-07): habeas in the district of confinement; *A.A.R.P. v. Trump* (2025-05-16): notice must allow time to seek habeas; Fifth Circuit en banc dismissed *W.M.M.* as moot on 2026-08-13 without reaching whether the predicate exists | Include only as a contested act with counsel's objection, the habeas and notice requirements and a high court risk; never a plain button | Low |
| Civil-service reclassification (Schedule Policy/Career) | 5 U.S.C. chapters 21 and 33; executive orders and OPM rules | January 2025 order (FR Doc. 2025-02095); OPM final rule published 2026-02-06; EO 14410 (2026-06-03) | Changes how directives are carried and how many officers are at will | Low |
| Convene or adjourn Congress | Art. II, §3 | Special sessions convened in the past (not re-verified); adjournment never used | Pairs with the pocket veto and recess appointments | Low |

**Leave out as a normal choice.** Denying citizenship to U.S.-born children of unlawfully or temporarily present parents: *Trump v. Barbara* (2026-06-30) held such children are citizens at birth under the Fourteenth Amendment. If the game ever references that order, it should be a historical record, not an option.

## Highest-priority fixes

1. **Treaty and organization withdrawal (R32, R29).** New act plus glossary and screen copy; keep the NATO refusal with §1928f as its reason. High.
2. **Removal and direction of independent commissions after *Slaughter* (R7, R13).** Make the commissions at will with a political price; restrict the independence memorandum to the Fed, courts, Congress and states (fold into BL-165); add registry records for *Slaughter*, *Seila Law*, *Collins* and *Wilcox*. High.
3. **Justice Department direction (R10).** Replace the automatic statutory refusal with an Attorney General decision, a hard case and real downstream risks; cite the contacts policy as policy and *Trump v. United States* as the contested authority. High.
4. **Acting officers (R3).** Enforce the Vacancies Act's eligible classes, the nominee bar and the vacancy-dated clock. High.
5. **Clemency (R38).** Add the act; rewrite the two pardon scenarios to U.S. procedure. High.
6. **Inspector general removal (R9).** Require a case-specific rationale; show generic notices as unlawful. High.
7. **Federal Reserve removal (R8).** A for-cause path with notice, response and court review; fix the registry and refusal disagreement. Medium.
8. **Trade agreements and executive agreements (R28, R29, R26).** Majority-of-both-Houses path for trade with trade promotion authority status; correct the "binds this administration" copy; note Case Act reporting. Medium.
9. **The Attorney General's order review (R16).** Keep objections internal with a leak or refusal-to-defend risk; review every order. Medium.
10. **Missing presidential tools (capabilities table).** Executive privilege, recess appointments (with pro forma sessions), signing statements, declassification, recognition, refugee ceiling and TPS, in that order. Medium.

## Could not verify

- Dates and details of the Iran 2015–2018 arrangement, the Paris Agreement exits, UNESCO, President Clinton's 2001 pardons, the 1973 dismissal of the Watergate special prosecutor and Acting Attorney General Yates's 2017 dismissal: stated from general knowledge and marked in place.
- Whether an Attorney General memorandum on White House contacts was reissued in 2025 (the 2009 version was opened).
- The status of any appeal in the Comey, James and Habba matters after December 2025.
- Seat-by-seat statutory removal language for the SEC, FCC, CFTC and FDIC, and the chair-designation provisions of each commission.
- The executive order number for FR Doc. 2025-02095 (January 2025 civil-service order).

## Sources (all accessed 2026-10-16)

Supreme Court
- *Trump v. Slaughter*, No. 25-332 (2026-06-29): https://www.supremecourt.gov/opinions/25pdf/609us2r62_g314.pdf
- *Trump v. Cook*, No. 25A312 (2026-06-29): https://www.supremecourt.gov/opinions/25pdf/609us2r63_e2pg.pdf
- *Trump v. Barbara*, No. 25-365 (2026-06-30): https://www.supremecourt.gov/opinions/25pdf/25-365_new_5if6.pdf
- *Mullin v. Doe*, No. 25-1083 (2026-06-25): https://www.supremecourt.gov/opinions/25pdf/609us1r60_7mip.pdf
- *Mullin v. Al Otro Lado*, No. 25-5 (2026-06-25): https://www.supremecourt.gov/opinions/25pdf/609us1r59_kjfl.pdf
- October Term 2025 opinion list: https://www.supremecourt.gov/opinions/slipopinion/25
- October Term 2024 opinion list: https://www.supremecourt.gov/opinions/slipopinion/24
- *Trump v. J.G.G.*, No. 24A931 (2025-04-07): https://www.supremecourt.gov/opinions/24pdf/604us2r25_7648.pdf
- *A.A.R.P. v. Trump*, No. 24A1007 (2025-05-16): https://www.supremecourt.gov/opinions/24pdf/605us1r31_7k47.pdf
- *Trump v. CASA*, No. 24A884 (2025-06-27): https://www.supremecourt.gov/opinions/24pdf/606us2r66_j426.pdf
- *Trump v. Wilcox*, No. 24A966 (2025-05-22): https://www.supremecourt.gov/opinions/24pdf/24a966_1b8e.pdf
- *Trump v. United States*, No. 23-939 (2024-07-01): https://www.supremecourt.gov/opinions/23pdf/23-939_e2pg.pdf
- *Seila Law v. CFPB* (2020): https://www.supremecourt.gov/opinions/19pdf/19-7_n6io.pdf
- *Trump v. Mazars* (2020): https://www.supremecourt.gov/opinions/19pdf/19-715_febh.pdf
- *NLRB v. Noel Canning* (2014): https://tile.loc.gov/storage-services/service/ll/usrep/usrep573/usrep573513/usrep573513.pdf
- *Zivotofsky v. Kerry* (2015): https://tile.loc.gov/storage-services/service/ll/usrep/usrep576/usrep576001/usrep576001.pdf
- *Humphrey's Executor v. United States* (1935): https://tile.loc.gov/storage-services/service/ll/usrep/usrep295/usrep295602/usrep295602.pdf
- *Myers v. United States* (1926): https://tile.loc.gov/storage-services/service/ll/usrep/usrep272/usrep272052/usrep272052.pdf
- *Morrison v. Olson* (1988): https://tile.loc.gov/storage-services/service/ll/usrep/usrep487/usrep487654/usrep487654.pdf
- *The Pocket Veto Case* (1929): https://tile.loc.gov/storage-services/service/ll/usrep/usrep279/usrep279655/usrep279655.pdf
- *Wright v. United States* (1938): https://tile.loc.gov/storage-services/service/ll/usrep/usrep302/usrep302583/usrep302583.pdf
- *United States v. Nixon* (1974): https://tile.loc.gov/storage-services/service/ll/usrep/usrep418/usrep418683/usrep418683.pdf
- *Youngstown Sheet & Tube Co. v. Sawyer* (1952): https://tile.loc.gov/storage-services/service/ll/usrep/usrep343/usrep343579/usrep343579.pdf
- *Goldwater v. Carter* (1979), Cornell LII: https://www.law.cornell.edu/supremecourt/text/444/996
- *NLRB v. SW General* (2017), Cornell LII: https://www.law.cornell.edu/supremecourt/text/15-1251
- *Trump v. Hawaii* (2018), Cornell LII: https://www.law.cornell.edu/supremecourt/text/17-965
- *Collins v. Yellen* (2021), Cornell LII: https://www.law.cornell.edu/supremecourt/text/19-422

Statutes and regulations (govinfo, U.S. Code 2024 edition)
- 5 U.S.C. §403 (inspectors general, with the 2022 amendments shown as not in text): https://www.govinfo.gov/link/uscode/5/403?link-type=html&year=mostrecent
- 5 U.S.C. §3345: https://www.govinfo.gov/link/uscode/5/3345?link-type=html&year=mostrecent
- 5 U.S.C. §3346: https://www.govinfo.gov/link/uscode/5/3346?link-type=html&year=mostrecent
- 50 U.S.C. §21: https://www.govinfo.gov/link/uscode/50/21?link-type=html&year=mostrecent
- 22 U.S.C. §1928f: https://www.govinfo.gov/link/uscode/22/1928f?link-type=html&year=mostrecent
- 1 U.S.C. §112b: https://www.govinfo.gov/link/uscode/1/112b?link-type=html&year=mostrecent
- 8 U.S.C. §1182: https://www.govinfo.gov/link/uscode/8/1182?link-type=html&year=mostrecent
- 8 U.S.C. §1157: https://www.govinfo.gov/link/uscode/8/1157?link-type=html&year=mostrecent
- 8 U.S.C. §1254a: https://www.govinfo.gov/link/uscode/8/1254a?link-type=html&year=mostrecent
- 19 U.S.C. §4202: https://www.govinfo.gov/link/uscode/19/4202?link-type=html&year=mostrecent
- 28 C.F.R. part 600: https://www.govinfo.gov/content/pkg/CFR-2024-title28-vol2/xml/CFR-2024-title28-vol2-part600.xml
- uscode.house.gov registry-style link (returned Page Not Found): https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title5-section403&num=0&edition=prelim

Presidential documents (Federal Register)
- Memorandum of 2026-01-07, withdrawal from international organizations (FR Doc. 2026-00976): https://www.federalregister.gov/documents/full_text/text/2026/01/16/2026-00976.txt and https://www.federalregister.gov/api/v1/documents/2026-00976.json
- Search listing including the WHO withdrawal order (FR Doc. 2025-01957) and EO 14199 (FR Doc. 2025-02504): https://www.federalregister.gov/api/v1/documents.json?conditions[term]=Withdrawing%20the%20United%20States%20from%20International%20Organizations&conditions[type][]=PRESDOCU
- EO 14215, Ensuring Accountability for All Agencies (2025-02-18): https://www.federalregister.gov/documents/full_text/text/2025/02/24/2025-03063.txt
- Schedule Policy/Career documents, including EO 14410 (2026-06-03) and OPM's 2026-02-06 rule: https://www.federalregister.gov/api/v1/documents.json?conditions[term]=%22Schedule%20Policy%2FCareer%22&order=newest&per_page=8 (pages 1 and 2) and https://www.federalregister.gov/api/v1/documents/2026-11594.json

Executive branch and archives
- White House statement on ABM withdrawal, 2001-12-13: https://georgewbush-whitehouse.archives.gov/news/releases/2001/12/20011213-2.html
- Attorney General memorandum, Communications with the White House and Congress, 2009-05-11: https://www.justice.gov/oip/foia-library/communications_with_the_white_house_and_congress_2009.pdf/dl
- Clemency grants by President Trump, 2025 to present: https://www.justice.gov/pardon/clemency-grants-president-donald-j-trump-2025-present
- Proclamation 4311 (Ford pardon of Nixon): https://www.fordlibrarymuseum.gov/library/speeches/740061.asp
- Executive Grant of Clemency, Gen. Mark A. Milley, 2025-01-19: https://www.presidency.ucsb.edu/node/395886

Reporting (used only for lower-court events)
- INF withdrawal timeline, CSIS Missile Threat: https://missilethreat.csis.org/united-states-withdraws-from-inf-treaty
- Comey and James dismissals, 2025-11-24: https://ladd.law.wisc.edu/2025/11/24/federal-judge-dismisses-cases-against-james-comey-and-letitia-james/
- Habba ruling, Third Circuit, 2025-12-01: https://www.democracydocket.com/news-alerts/trump-lawyer-alina-habba-appeals-court-disqualified-new-jersey-us-attorney/
- Inspectors general ruling, Judge Reyes, 2025-09-24: https://www.fedweek.com/federal-managers-daily-report/judge-finds-widescale-firings-of-igs-violated-law-but-doesnt-require-reinstatements
- Fifth Circuit en banc, *W.M.M. v. Trump* dismissed as moot, 2026-08-13: https://www.goodmorningamerica.com/news/story/appeals-court-dismisses-case-challenging-alien-enemies-act-135626524
