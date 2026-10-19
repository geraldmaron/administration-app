# Owner questions: one decision list, 2026-10-13

Compiled from the four 2026-10-12 audit folders (approval-model, coercion-geography, grounded-casting, data-model) and the backlog items they feed (BL-142 to BL-148). Read-only compilation: no source, backlog or plan file was changed. The questions are the audits' own; the recommendations are the audits', adjusted where a VERIFY file changed the ground. Where an audit gave no recommendation, the recommendation is marked "mine" and rests on the evidence cited in the entry.

## Summary

**29 open questions** after merging. The six audit files asked 39 as written (approval AUDIT 6, approval DESIGN 7, coercion AUDIT 6, REGIME-CHANGE 6, casting AUDIT 7, TARGET-MODEL 7). Of the 39, 8 merged into entries that two sources asked, 2 are settled (listed in the last section), and the rest map one to one.

**What blocks work now.** Only three questions touch work already in build (Q1 to Q3, BL-145 on `feat/blockade-smaller`). BL-143 R0 and BL-144 need no owner answer to start. The first answer that gates a later build is Q5 (founding party balance, BL-146 slice 1).

**The five that block the soonest work**

1. Q1, whether a war the President starts rallies the public. BL-145's first blockade now opens hostilities, so this is live in the build. The backlog's acceptance already says "no free rally", which is a default chosen without your answer.
2. Q3, whether the default founding carries the October 2026 board. BL-145's 12-seed measurement runs on seeded boards that carry no conflicts; the answer decides what that measurement represents.
3. Q2, which acts may be offered against nuclear-armed powers. BL-145's menu rows (a US blockade of China, a Chinese blockade of the US at $5.26M and 0.23 odds) and BL-148's coup support both depend on it.
4. Q4, whether US ships can be sunk and crews named. BL-144 rebuilds war losses and needs the unit of loss.
5. Q5, founding party balance. It gates BL-146 slice 1 and the A0 data slice, which source the shares.

**Ambiguous points** are in the last section.

## How to read an entry

Each entry gives: where it was asked, the question in plain words, options with their costs, the recommendation, and what it unblocks. "Needed by" names the build step that cannot start or close without it. Order follows `docs/PLAN.md`: BL-145, BL-143, BL-144, BL-146, BL-147, then BL-148, BL-142 and the rest of the target model. Later entries within an area are marked "can wait".

---

## 1. Blockades and war rules (BL-145, in build)

### Q1. Does a war the President starts rally the public?

- **Asked in:** REGIME-CHANGE §14 Q4. The coercion VERIFY (required change f, finding 11) asked the same thing as a required decision and measured the effect: once a first blockade opens a war, every blockade buys a rally of about +0.007 in the week the war opens (`twice.mjs`).
- **Question:** should a war the President starts lift approval, or only wars started against the US?
- **Options.**
  - (a) No rally for self-started wars. Simple, and what BL-145 builds now. Cost: the record has self-started lifts (Gallup +18 in 1991, +13 in 2003; `RESEARCH-SECURITY-CONFLICT.md` §1.7), so a real lift disappears.
  - (b) A damped rally from the approval design's rally table, "war launched" class. Cost: needs BL-146 slice 3, and DESIGN-VERIFY found the class's size (valence 2.0 to 2.4) sits above the Iraq fit (1.86), so it is a judgment, not a fit.
  - (c) Today's full `RALLY_PEAK` (0.15, six-week half-life, `opinion-war.ts:13-16`) for every war. Cost: each blockade-opened war pays the President, which rewards starting wars.
- **Recommendation:** (a) until BL-146 slice 3, then (b) refit to the Iraq value. This is the coercion VERIFY's "damp or cap" taken one step further; the audits did not choose between (a) and (b) for the interim.
- **Unblocks:** BL-145 (ratifies what is built), BL-144, BL-148 (an invasion is a self-started war), BL-146 slice 3.

### Q2. Which acts may be offered against nuclear-armed powers?

- **Asked in:** coercion AUDIT §6 Q4 (distant blockade of a great power, for example US energy interdiction at Malacca) and REGIME-CHANGE §14 Q1 (coup support and political action against North Korea, Russia, China). Same decision, two acts.
- **Question:** are these rows offered at all against a nuclear power, or refused as a design rule?
- **Options.**
  - (a) Offer them, with escalation as the cost. Cost: the engine has no sourced outcome base for a nuclear target (O'Rourke's successes were against weak states; REGIME-VERIFY D6), and NPC symmetry gives China a cheap blockade of the US today.
  - (b) Refuse by a hand list of countries. Cost: a list drifts and misses new cases.
  - (c) Refuse by data: a declared arsenal with a delivery capability, read from the existing `arsenal.declared` and `deliveryTriad` fields. Cost: North Korea sits near the line and needs your call.
- **Recommendation (mine; the audits gave none):** (c) for the first build, revisited after the 12-seed measurement of the first slices.
- **Unblocks:** BL-145 (menu rows), BL-148 (first slice targets), the NPC symmetry rules in both.

### Q3. Does the default founding carry the October 2026 board?

- **Asked in:** coercion AUDIT §6 Q2 (Hormuz contested at the oath) and REGIME-CHANGE §14 Q6 (Venezuela as it stands: an acting government under US pressure after a decapitation). Same decision applied to two places.
- **Question:** should every default campaign open on the 2026 snapshot, or should it stay in the `world-2026` preset only?
- **Options.**
  - (a) Preset only; default boards stay calm. Cost: the default game does not open on the real moment; the preset must be offered clearly.
  - (b) Default carries the snapshot. Cost: every campaign opens with a live Hormuz shock and carried conflicts (`carried-conflicts.tsv:9`), so replay variety falls and every balance run starts in an oil crisis.
- **Recommendation (mine):** (a). The coercion VERIFY confirmed the preset already puts a live Hormuz shock in place at the oath (route 0.015 and 0.009, `preset.mjs`), so nothing is lost for those who want it.
- **Unblocks:** BL-145 (what the 12-seed measurement covers), BL-148 (which targets the first slice is measured on).

## 2. Metric registry (BL-143)

No question blocks R0. Its only blocker is the BL-145 merge, which is a branch matter. The one registry question the design asked (gate strictness) is settled; see the last section. The registry-adjacent questions about the model's scope (Q25 to Q29) come later.

## 3. War losses (BL-144)

### Q4. Can US ships be sunk, and are crews named?

- **Asked in:** coercion AUDIT §6 Q6.
- **Question:** may the game sink US ships, with names and crews in the Record, or only damage and withdraw them?
- **Options.**
  - (a) Damaged and withdrawn only. Cost: a naval war has no sharpest loss, and the readiness drain carries all of it.
  - (b) Hulls can be lost, shown by name and class with deaths counted by the new casualty model, crews not named. Cost: a loss ledger for hulls; no new people records.
  - (c) Sunk, with named crews. Cost: person records for crews in a graph of 8,053 people, a casualty-notification path, and the sensitivity of naming individuals.
- **Recommendation (mine):** (b). It fits BL-144's killed and wounded split without person records. Revisit (c) with the occupation work.
- **Unblocks:** BL-144 (unit of loss), BL-145 (what a failed blockade can cost), BL-148 (occupation casualties).

## 4. Approval and the electorate (BL-146)

These are the approval DESIGN §11 questions, with DESIGN-VERIFY's amendments applied. Order is by the slice that needs them. DESIGN's control 4 requires Q5 to Q7 answered before slice 4.

### Q5. What party balance does the founding start with?

- **Asked in:** approval DESIGN §11 Q3, amended by DESIGN-VERIFY §3 (Q3). TARGET-MODEL §8.4 Q7 says this gates slice A1's founding shares.
- **Question:** are founding party shares fixed, seeded, or drifting?
- **Options.**
  - (a) Fixed at Gallup's 2025 shares (Democrats and leaners 47, Republicans and leaners 42, no lean 10). Cost: a Democratic President reads about 3 points higher at the same record, and with one share set the ballot gap is 2.0 points at equal headline and 3.5 at equal record (DESIGN-VERIFY `ballot.mjs`).
  - (b) Seeded across Gallup's recent range (R+4 to D+8), the DESIGN's recommendation. Cost: DESIGN-VERIFY found the mean is D+2, so Democrats are favored on average.
  - (c) Seeded across a symmetric range. Cost: the shares are no longer a single sourced snapshot, only a sourced spread.
  - (d) Shares drift with the President's own-side approval, fit to Gallup's quarterly series (a 12-point swing in four quarters after a change of President). Cost: another fitted stock, and it belongs after slice 1.
- **Recommendation (adjusted by DESIGN-VERIFY):** (c) now, (d) as a later slice. DESIGN's own pick, (b), is withdrawn.
- **Unblocks:** BL-146 slice 0 (sourcing) and slice 1 (electorate core).

### Q6. How large may a rally be?

- **Asked in:** approval AUDIT §9 Q6; approval DESIGN §11 Q2. The first asked it of a formula that DESIGN replaced with a fitted table.
- **Question:** accept a 9/11-scale attack lifting a 2020s President about 31 points (a pandemic about 4), or cap the largest class?
- **Options.**
  - (a) Accept the fitted table. Cost: one event can swing a term; no 2020s case exists to test the size, and DESIGN-VERIFY notes the 55 baseline would be 51 with the last pre-attack reading, which raises it.
  - (b) Cap the largest class. Cost: breaks the 9/11 replay (slice 3 requires RMSE of 3 or less) and needs a cap with no source.
- **Recommendation (mine; DESIGN asked without recommending):** (a), with the 51 baseline tested in slice 3 and the Q1 damping kept for self-started wars.
- **Unblocks:** BL-146 slice 3 (events).

### Q7. Should an honest, failing President be removable?

- **Asked in:** approval AUDIT §9 Q1; approval DESIGN §11 Q1. DESIGN-VERIFY confirmed the arithmetic (headline 30, polarization 1.0 gives own identifiers 77.9 and a break of 0.242).
- **Question:** keep removal tied to a grave charge, or add a capacity path that reads the President's own-party approval alone?
- **Options.**
  - (a) Keep. Incompetence makes a scandal fatal rather than being fatal itself; a failing President's caucus is already a quarter gone if a charge arrives. Cost: pure incompetence never removes anyone.
  - (b) Add a 25th-Amendment-style capacity path below some own-party line. Cost: a new mechanism and thresholds with no roll-call anchor, since the sourced thresholds come from grave-charge votes only.
- **Recommendation (DESIGN's, confirmed by DESIGN-VERIFY):** (a).
- **Unblocks:** BL-146 slice 4 (removal terms and caucus thresholds).

### Q8. Do the coalition words (workers, business, elites) stay?

- **Asked in:** approval AUDIT §9 Q4; approval DESIGN §11 Q4. DESIGN-VERIFY had no objection.
- **Options.**
  - (a) Retire them as figures. Cost: the first approval VERIFY found the player is shown them today (`Coalitions.tsx`), so a visible screen goes; DESIGN-VERIFY lists six more consumers to rewrite either way.
  - (b) Keep as display-only lenses over the cohorts. Cost: a derived display with no model behind it.
- **Recommendation (DESIGN's):** (a).
- **Unblocks:** BL-146 slice 5 (cohorts as grouping; coalitions deleted).

### Q9. Amend DECISIONS §13.9 so capped issue agreement can enter bloc approval?

- **Asked in:** approval DESIGN §11 Q6; DESIGN-VERIFY §1 found the stated caps do not hold for a consensus act.
- **Question:** §13.9 now keeps contested issues out of headline approval. Allow a capped issue term?
- **Options.**
  - (a) Leave §13.9. BL-142 keeps derived polls and mobilization only. Cost: issue agreement never reaches the blocs or the caucus.
  - (b) Amend with DESIGN's caps (0.30 per bloc, 0.15 per act). Cost: DESIGN-VERIFY showed a consensus act moves the headline 45 to 46.9, and an agenda at the cap in every bloc gives 48.7 or 41.2, so "under a point per act" fails unless agreement splits by party.
  - (c) Amend with the per-bloc caps plus a direct cap on the headline effect.
- **Recommendation (adjusted by DESIGN-VERIFY):** (c), with the headline cap value set at slice 7 from the rule that an ordinary act is worth under a point.
- **Unblocks:** BL-146 slice 7, BL-142 issue scoring.

### Q10. Show five blocs to the player, or three?

- **Asked in:** approval DESIGN §11 Q7, and approval AUDIT §9 Q3 (independents as one or two). The engine side of AUDIT Q3 is settled; only the display remains.
- **Options.**
  - (a) Five (identifiers and leaners on each side, plus pure independents). Cost: DESIGN-VERIFY found the leaner distinction is not identified by approval data (the fit is flat across the leaner parameter), so five shows precision the data does not support.
  - (b) Three (party with its leaners, and pure independents). Cost: the engine keeps five for turnout and the caucus, so the screen is a roll-up.
- **Recommendation (mine; DESIGN-VERIFY had no objection and asked that the leaner habits be labeled judgment):** (b).
- **Unblocks:** BL-146 slice 8 (surfaces).

### Q11. Does using force divide the President's own and opposition blocs?

- **Asked in:** coercion AUDIT §6 Q5; REGIME-CHANGE §11.3 repeats it for interventions.
- **Options.**
  - (a) Outcomes only: prices, casualties and wars reach all blocs through the judgments. Cost: hawk and dove positions do not matter to the electorate.
  - (b) A hawk/dove issue term for force and sanctions, entered as a BL-142 `IssueDef` after its phase 1. Cost: no measured positions on force have been opened, and the term competes with the Q9 cap.
- **Recommendation (both audits' lean):** (a) now; (b) only after BL-142 phase 1 and Q9.
- **Unblocks:** nothing in BL-145 or BL-148's first slice (both add no mood writer); it shapes BL-146 slice 7 and BL-142.

### Q12. Offer a 1990s founding, and is the founding a 2020s public?

- **Asked in:** approval AUDIT §9 Q2 (founding era) and approval DESIGN §11 Q5 (1990s option).
- **Options.**
  - (a) 2020s only (polarization anchor 1.0). Cost: no less-polarized game.
  - (b) Add a 1990s option (polarization about 0.63). Cost: DESIGN-VERIFY found 0.63 is fit to one reading (Clinton year 4), and an era also needs era party shares (Pew: 1994 leaners 15 R and 12 D of voters). It is not one parameter.
- **Recommendation (adjusted by DESIGN-VERIFY, which overturned "one parameter"):** (a) for the first build; (b) as a later scenario option. **Can wait.**
- **Unblocks:** nothing now; a later scenario option.

## 5. Grounded casting (BL-147)

VERIFY recommended building an incremental slice first and judging the 20-scenario pilot against it. The first slice needs only Q13. Q14 and Q15 are needed before the pilot is chosen. Q16 to Q19 belong to the full binder and can wait until the pilot shows the incremental slice is not enough. The hold on drafting lifts when you accept the pilot; that acceptance is an action, not a question on this list.

### Q13. Where does a thread pin its place: at the opener's answer or its raise?

- **Asked in:** casting AUDIT §11 Q7.
- **Options.** (a) At the answer, as DECISIONS §7.8 has it today. Cost: an opener that expires unanswered leaves no thread. (b) At the raise. Cost: pins a place for stories the player never takes up.
- **Recommendation (audit's):** (a). The VERIFY did not touch it; the incremental slice's "arcs inherit the opener's place" uses it.
- **Unblocks:** BL-147 first slice.

### Q14. Retire or rewrite scenarios built on institutions the US lacks?

- **Asked in:** casting AUDIT §11 Q4 (finding F8: a state-owned mill, a bread subsidy, provinces, a district commissioner).
- **Options.** (a) Retire all. Cost: loses stories whose bones are fine. (b) Retire where the premise is the institution, rewrite where it is incidental. Cost: a human judgment per scenario. (c) Keep and token around them. Cost: the audit found no binding can ground them.
- **Recommendation (audit's):** (b).
- **Unblocks:** choice of the 20 pilot scenarios and the later migration.

### Q15. Allow a small set-piece tier tied to a named real place?

- **Asked in:** casting AUDIT §11 Q5.
- **Options.** (a) Yes, one per place, gated on the board and owned. Cost: the casting VERIFY found a `setPiece` field already exists (allowed only with `cast.pick: "nation"`, declared on 0 scenarios), so this extends it rather than adding a field. (b) No. Cost: the 40 scenarios that author a city or state today stay as undeclared set pieces.
- **Recommendation (audit's, adjusted by VERIFY to extend the existing field):** (a).
- **Unblocks:** pilot design, and the migration of the 22 city and 18 state scenarios.

### Q16. Add a town tier below metro size?

- **Asked in:** casting AUDIT §11 Q1.
- **Options.** (a) Metros and district names only. (b) Add the vendored Natural Earth places (`scripts/vendor/ne-us-places.tsv`, 771 lines) as a town tier. (c) Source a county table.
- **Recommendation (audit's):** (b). Cost note from VERIFY: the sector data for any tier comes from BLS QCEW at sector or three-digit level with suppressed cells as unknown; Census CBP excludes crop and animal production, and "fruit" is not a sector, so the flagship frost example stays unfixable without a crop-level source. **Can wait** until the incremental slice is judged.
- **Unblocks:** BL-147 S0 data.

### Q17. Mayors and local figures: named or offices only?

- **Asked in:** casting AUDIT §11 Q2.
- **Options.** (a) Offices without names. (b) Generate mayors for the 200 cities as persons. (c) Also generate local figures per binding.
- **Recommendation (audit's):** (b) plus (a) for local figures. Cost of (b): 200 more person records. **Can wait** for the pilot.
- **Unblocks:** the person slots of the full binder.

### Q18. May a governor or member speak through a relayed document?

- **Asked in:** casting AUDIT §11 Q3.
- **Options.** (a) Yes: a letter or call readout, the domestic counterpart of a foreign transmission. (b) No. Cost of (a): the AGENTS.md §5 neutrality rule has to hold for rendered names.
- **Recommendation (audit's):** (a). **Can wait.**
- **Unblocks:** the domestic voices of the full binder.

### Q19. Should an answer move the bound governor's or senator's standing, and how far?

- **Asked in:** casting AUDIT §11 Q6, which gave no recommendation ("needs a balance run before a number is set").
- **Options.** (a) No local standing effect. (b) A capped effect, sized by a balance run. The VERIFY found the state-aimed verbs already exist in `locale-acts.ts` and should be extended, not replaced.
- **Recommendation (mine):** defer; answer after the pilot, with a balance run, since the audit itself declined to set a number. **Can wait.**
- **Unblocks:** `local` reach in the full binder.

## 6. Regime change (BL-148, blocked by BL-144)

Q1 to Q3 also decide this item's first slice. REGIME-VERIFY rejected the design as written and recommended a first slice of coup support, political action through elections and decapitation. The first slice needs Q20 and Q21.

### Q20. Is "kill" offered in decapitation, and by what legal path?

- **Asked in:** REGIME-CHANGE §14 Q2. The 1976 executive ban the design cites came from general knowledge and was not opened.
- **Options.** (a) Capture only. Cost: a real act is missing. (b) Kill offered only after the player signs an order lifting the ban, with exposure, inquiry and scandal consequences. Cost: a new executive-order subject and legal content. (c) Offered always. Cost: removes the legal weight the audit describes.
- **Recommendation (mine):** (b), after the ban's text is verified.
- **Unblocks:** BL-148 decapitation row.

### Q21. How many NPC-started regime operations should a term see, and may a rival target a US treaty partner?

- **Asked in:** REGIME-CHANGE §14 Q3. BL-148's acceptance says you set the band. REGIME-VERIFY found no NPC covert-4 or covert-5 or military-5 in one passive term today, so the band is new tempo.
- **Options.** The audit's example band is 1 to 6 worldwide per 208-week term, one operation per target at a time. A lower band is safer against the audit's strongest failure mode (a world that churns); a higher one adds events.
- **Recommendation (mine):** 1 to 6 worldwide, enforced by a per-pair cooldown and a per-term cap, and no treaty partners as targets in the first slice, so the tempo is measurable before the alliance case is added.
- **Unblocks:** BL-148 NPC caps and calibration test N1.

### Q22. Occupation control: a yearly troop level or a strategy?

- **Asked in:** REGIME-CHANGE §14 Q5.
- **Options.** (a) The player sets troops each year. Cost: a control the player must tune against a hidden curve. (b) The player picks a strategy (light footprint, counterinsurgency, withdrawal by date) that sets the level. Cost: less direct control.
- **Recommendation (mine):** (b), with the troop level shown as a reading. **Can wait**; occupation is outside REGIME-VERIFY's first slice.
- **Unblocks:** the occupation page, a later BL-148 slice.

## 7. Maritime second step (after BL-145 lands; can wait)

VERIFY recommended the smaller blockade change first and the maritime family only after a balance pass shows NPC tempo is under control.

### Q23. Selective or total strait closure?

- **Asked in:** coercion AUDIT §6 Q1.
- **Options.** (a) One flow per strait for the first build. (b) Per-flag flow, so a denier can pass friendly ships. Cost of (b): per-flag data and a larger state.
- **Recommendation (mine; the audit's own phrasing leans to one flow first):** (a).
- **Unblocks:** the maritime family, not BL-145.

### Q24. How often may the world close a strait?

- **Asked in:** coercion AUDIT §6 Q3 (example band 0 to 2 NPC-started contests per term). The VERIFY showed the contest hazard as written is about 99.9 percent over 208 weeks and must be restated per term first.
- **Recommendation (mine):** 0 to 2 per term with a per-chokepoint cooldown. **Can wait.**
- **Unblocks:** the maritime family's NPC rules; not BL-145, whose acceptance (no compounding, export cut ends on lift) already removes the repeated-blockade tempo.

## 8. The rest of the target model (later slices; no open backlog item yet)

BL-143 follow-up slices will carry these. None blocks R0.

### Q25. Population ledger: US only, or every nation?

- **Asked in:** TARGET-MODEL §8.4 Q2; RESEARCH-SOCIETY-POPULATION §0 and §8.
- **Options.** (a) State by age band by sex ledger for the US, and the three-rate identity for the other 195. (b) A ledger for every nation. Cost of (b): a founding dataset the world package does not have, for 196 nations. (c) The brief's rejected alternative: three national rates plus weekly toll bookings; it would kill the wrong ages in an epidemic.
- **Recommendation (the brief's):** (a). TARGET-VERIFY added that the ledger needs a save rule (an older save has no ledger, and "absent reads empty" would mean zero people).
- **Unblocks:** slice P1.

### Q26. Model the hidden constitutional-health latent with annual report cards?

- **Asked in:** TARGET-MODEL §8.4 Q3; RESEARCH-PRESIDENCY-GOVERNMENT §5.
- **Options.** (a) Model one slow `checks` latent, shown only through events and yearly report cards in fictional voices. Cost: risks sounding didactic against NORTH_STAR; the research warns of over-fitting to 2025. (b) Skip.
- **Recommendation (the brief's):** (a), with the break parameters treated as scenario inputs, not a forecast. TARGET-VERIFY did not review this row.
- **Unblocks:** slice G1.

### Q27. Does the President see observed figures or true ones?

- **Asked in:** TARGET-MODEL §8.4 Q4.
- **Options.** (a) Observed by default (lagged releases, confidence ranges, poll sampling noise), with truth in the Record afterward and in God Mode. (b) True figures for the government's own statistics.
- **Recommendation (mine, from the briefs):** (a). Cost: more reporting machinery and the revision events the society brief says must be designed, not bugs. It also matches the quoted DECISIONS §7.9 (an unreliable briefing is played fair), which I did not open.
- **Unblocks:** the strike pipeline (S1), population reporting (P1), perception display.

### Q28. Pandemic frequency: accept a design number?

- **Asked in:** TARGET-MODEL §8.4 Q5; RESEARCH-SOCIETY-POPULATION §9 item 1 (the only frequency figure came from a search summary).
- **Options.** (a) A labeled design number until a source is opened. (b) Open the primary paper first and fit to it.
- **Recommendation (mine):** (b) first, then (a) only if the paper gives no usable rate. The cost of (b) is one research task.
- **Unblocks:** slice P3 (epidemic engine).

### Q29. Accept labeled design bounds on traits?

- **Asked in:** TARGET-MODEL §8.4 Q6 (charisma plus or minus 20 percent on rally size, competence plus or minus 15 percent on execution).
- **Options.** (a) Accept as design bounds, labeled, until a source exists. (b) Hold the modifiers until sourced. Cost of (b): trait effects stay at zero.
- **Recommendation (the brief's):** (a). No source quantifies an official's effect (RESEARCH-ECONOMY §6.3, RESEARCH-SOCIETY §7); the bounds modulate speed, information, variance and blame, not outcomes. Presidency research marks the bounds "needs validation".
- **Unblocks:** person-attribute modulators across the model.

---

## 9. Settled, and how

| Question | Where asked | How it was settled |
|---|---|---|
| Registry gate strictness at R1: turn on checks 1 to 4 and 10 at once, or report-only for a wave | TARGET-MODEL §8.4 Q1 | TARGET-VERIFY §7 item 8 and §8 replaced both options. R0 is report mode; R1 gates only checks 1, 2, 5 and 10, once the report is clean enough to ratchet. Checks 4, 6 and 7 are dropped or deferred (not computable, or false assurance). BL-143's acceptance already says this. You can still overrule it, but nothing waits on you. |
| Should the honeymoon reach the ballot | Approval AUDIT §9 Q5 | The DESIGN made the honeymoon a valence term (+2.1 points at the oath), so it reaches every bloc and the ballot by construction, and dropped the question from §11. DESIGN-VERIFY did not object, but noted Gallup says Trump had no honeymoon under record polarization. Settled by design choice, not by you. See ambiguities. |
| Independents as one bloc or two (engine side) | Approval AUDIT §9 Q3 | DESIGN uses five blocs. DESIGN-VERIFY found the leaner distinction unidentified by approval data and kept five for turnout and the caucus, asking only that the leaner habits be labeled judgment. The display half is Q10. |
| Is the founding a 2020s public | Approval AUDIT §9 Q2 | DESIGN fixes the 2020s as the default (polarization 1.0). The era option remains as Q12. |
| The approval design's open questions gating slice A1 | TARGET-MODEL §8.4 Q7 | Not a separate question; it points at DESIGN §11 Q1 to Q3, now Q7, Q6 and Q5. |

Questions in `RESEARCH-ECONOMY.md` and `RESEARCH-SECURITY-CONFLICT.md` are research gaps and model choices (for example which wage series to use), not decisions for you, so none are listed. `RESEARCH-PRESIDENCY-GOVERNMENT.md` and `RESEARCH-SOCIETY-POPULATION.md` each feed one entry above (Q26 and Q28).

## 10. Ambiguities

1. **BL-145 built an answer to Q1 before you gave one.** Its acceptance says "no free rally" and cites VERIFY item 10, but the rally point is item 11 in the coercion VERIFY (item 10 is the cost-model double billing). The default is reasonable, yet it is an unratified choice already in a branch.
2. **Honeymoon (settled list).** I treated the approval AUDIT's honeymoon question as settled because the DESIGN answered it by construction. If you want the honeymoon kept out of the ballot as the engine does today, it is a one-line reversal in the ballot formula and should be reopened.
3. **Q2's line for North Korea.** The audits name it with Russia and China. A declared arsenal without an assured delivery triad may put it on either side of a data rule; I left the call to you.
4. **Q3 wording.** "The default founding" could mean the default seeded campaign or the Short founding setup; the audits do not distinguish. I read it as the default seeded board.
5. **Q24 and Q21 are both "NPC tempo" but differ.** One is strait contests, the other regime operations. They stay separate because they have different bands and different build steps; answer them together if you prefer one policy.
6. **Recommendation provenance.** Where an audit gave none (Q1 interim, Q2, Q3, Q4, Q6, Q10, Q19 to Q24, Q27, Q28) the recommendation is mine and unreviewed by any VERIFY file.
7. **Unopened sources behind some questions.** The 1976 assassination ban (Q20) and DECISIONS §7.9 (Q27) are quoted from audit text and were not opened here.

## Owner answers, 2026-10-13

Answered in chat by the owner. Where the answer differs from the recommendation it is marked; those items need the extra work noted.

- **Q1:** No rally for a self-started war now; a damped rally fitted to Iraq 2003 once the bloc electorate lands.
- **Q2:** Refused by data: a declared arsenal with delivery capability.
- **Q3:** Preset only; default campaigns stay calm.
- **Q4:** Hulls can be lost by name and class, deaths through the casualty model; crews are not named.
- **Q5:** Seeded across a symmetric range; drift with events later.
- **Q6:** Accept the fitted rally sizes; self-started wars stay damped (Q1).
- **Q7:** **Add a capacity path** (not the recommendation): an honest, failing President can be removed without a grave charge. Its thresholds have no roll-call anchor and must be set and labeled when it is designed.
- **Q8:** Retire the coalition figures.
- **Q9:** Amend DECISIONS §13.9: per-bloc caps plus a cap on the headline effect.
- **Q10:** Show three blocs; the engine keeps five.
- **Q11:** **Add a hawk/dove issue now** (not the recommendation): force and sanctions divide the blocs; positions on force must be sourced before it is calibrated.
- **Q12:** 2020s only for now; a 1990s era later as a scenario option.
- **Q13:** **Pin the place when the opener appears** (not the recommendation): DECISIONS §7.8 and the casting code, which pins at the answer, change to match.
- **Q14:** Retire where the institution is the premise; rewrite where it is incidental.
- **Q15:** Yes: a small, owned set-piece tier, one per place, gated on the board.
- **Q16:** Add a town tier from the vendored Natural Earth US places.
- **Q17:** Generate named mayors for the cities; other local figures stay offices.
- **Q18:** Yes: governors and members may speak through a relayed letter or call readout.
- **Q19:** **Yes, a capped effect now** (not the recommendation), sized by a balance run.
- **Q20:** Capture always; kill only after the President signs an order lifting the ban, with exposure, inquiry and scandal consequences.
- **Q21:** **1 to 6 NPC regime operations per term worldwide, US treaty partners included from the start** (the recommendation excluded allies in the first slice); per-pair cooldown and per-term cap.
- **Q22:** A strategy (light footprint, counterinsurgency, withdrawal by date); the troop level is a reading.
- **Q23:** **Per-flag passage now** (not the recommendation): a denier can let friendly ships through.
- **Q24:** 0 to 2 strait closures per term by other governments, with a per-chokepoint cooldown.
- **Q25:** A full ledger for the US; national rates for the other 195; a save rule for older saves.
- **Q26:** Yes: one slow, hidden checks measure, seen through events and yearly report cards.
- **Q27:** Reported figures by default; the truth in the Record afterward and in God Mode.
- **Q28:** Research the pandemic rate from primary sources first; a labeled design number only if none is usable.
- **Q29:** Accept labeled design bounds on traits until sourced.
