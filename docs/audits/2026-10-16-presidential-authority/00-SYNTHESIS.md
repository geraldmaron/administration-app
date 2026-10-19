# Presidential authority review: synthesis

Reviewed 2026-10-16. The owner asked that every player decision and action map to a real presidential power, governed by law and recent practice, so the game neither hands the President powers they don't have nor withholds the ones they rely on. Four reviews cover the whole surface:

| Review | Scope | Items | Accurate | Overstated | Understated | Misframed | Missing gate |
|---|---|---|---|---|---|---|---|
| 01 National security | force, covert action, intelligence, arms, domestic deployment | 58 acts | 36 | 1 | 5 | 7 | 9 |
| 02 Economy, trade, emergencies | tariffs, sanctions, budget, emergencies, the Fed | 45 acts | 24 | 5 | 3 | 8 | 5 |
| 03 Executive, Congress, courts, diplomacy | appointments, removals, the Justice Department, treaties, clemency | 38 acts | 23 | 1 | 2 | 7 | 5 |
| 04 Scenario replies | every authored reply | 991 replies | 819 | 43 | 0 | 87 | 42 |

An adversarial check of 13 of the reviews' recent legal claims found every one supported, three only in part. Those three were corrected in place: *Trump v. Cook* (2026-06-29) is a stay ruling that reads the statute to require "notice and some opportunity to respond", not a hearing. The 2026 climate memorandum directs withdrawal from the UN climate convention rather than completing it. The Maduro indictment CRS cites is the 2025 superseding one.

## What the reviews agree on

1. **Most of the game is right.** About three fifths of acts (83 of 141) and four fifths of replies (819 of 991) are accurate. Diplomacy, legislation and public statements are almost entirely sound.
2. **The game gives the President free economic levers that need a statute.** Tariffs have no process (*Learning Resources v. Trump*, 2026, held IEEPA authorizes no tariffs). Sanctions skip the emergency declaration. Nationalization and recurring program spending skip Congress. Scenario replies spend money no appropriation covers.
3. **Covert and lethal power is the riskiest framing.** The lethal option invites amending EO 12333's assassination ban as a routine order. Covert rungs run without a finding. Capture is modeled as covert action instead of a use of force tied to an indictment.
4. **Domestic force is both refused and misframed.** The game refuses Guard federalization outright while some scenario replies let the President clear squares. The law sits between the two: the Insurrection Act and §12406 are real, gated and contested (*Trump v. Illinois*, 2025).
5. **The executive branch law is out of date.** *Trump v. Slaughter* (2026) makes most commission members removable at will, treaty withdrawal (other than NATO, 22 U.S.C. §1928f) is the President's, the Justice Department refusal is a policy rather than a statute, and the Vacancies Act rules aren't enforced.
6. **The President lacks tools they rely on.** No clemency act, no rescission or deferral, no executive privilege, no recess appointments, no declassification, no recognition of governments, no refugee ceiling or TPS, no lawful targeted strike on a non-state group, and no forced War Powers vote.

## Ranked fixes, with backlog items

Severity first, then by how many surfaces each one unblocks. Items are in `docs/BACKLOG.md` under "Presidential authority program".

| Rank | Severity | Fix | Item | Reviews |
|---|---|---|---|---|
| 1 | Critical | Tariffs through statute-specific authorities (§232, §301, §201, §122, §338), each with its finding, clock, cap and court exposure | BL-221 | 02 T1, 04 pattern 4 |
| 2 | Critical | Rebuild the lethal option and put covert rungs 2-5 behind a finding; move capture to a force act | BL-222 | 01 N2-N9, 04 pattern 7 |
| 3 | High | Emergency gates: IEEPA emergency before sanctions, NEA separated from Stafford, relief needs a Stafford declaration, nationalization and new recurring spending need Congress | BL-223 | 02 S2-S4, E1, E7, E8, B4, B5 |
| 4 | High | Domestic force as gated, contested acts: Insurrection Act, §12406, the law-enforcement surge, and honest federalization copy | BL-224 | 01 N50-N53, 04 pattern 2 |
| 5 | High | Executive branch law: independent commissions after *Slaughter*, treaty withdrawal, Justice Department direction as a decision, Vacancies Act, inspector general removal, Fed governor removal for cause | BL-225 | 03 R3, R7-R13, R29, R32; 02 M3 |
| 6 | High | Scenario reply content pass: 125 statement-only replies and the nine clemency scenarios | BL-226 | 04 patterns 1-8 |
| 7 | High | Missing powers, first set: clemency, rescission and deferral, a lawful targeted strike on a non-state group, the forced War Powers vote | BL-227 | 01, 02, 03 missing capabilities |
| 8 | Medium | Missing powers, second set: executive privilege, recess appointments, signing statements, declassification, recognition, refugee ceiling and TPS, the arms sale notice | BL-228 | 01 N37, 03 capabilities |
| 9 | Medium | Strike objective and targeting copy in law-of-war terms; second-front refusal restated as a game rule with political cost | BL-222, BL-171 | 01 N17, N19 |
| 10 | Medium | Registry and glossary legal text from these findings, with govinfo links | BL-214, BL-165, BL-166 | all |

## What this changes in the plan

- **CP1 waits on BL-221.** The control plane's tariff package (BL-179) would build a multi-good form around a direct tariff the law doesn't allow. BL-221 gives each tariff line a statutory authority, so BL-179 now builds on it. BL-180 (forces to several countries) is unaffected by the tariff finding but must carry BL-222's capture change if a plan can hold one.
- **BL-214's legal text waits on this review.** Its glossary and law explanations are rewritten from these findings rather than in a separate pass.
- **Nothing here is built.** These are findings and items. No engine or copy change has been made.

## Framing rules for the fixes

Every fix follows the reviews' shared rules. Settled law is stated as settled, open litigation as open, and norms as norms. Nothing praises or condemns a party or person. Real precedents shape the mechanics and copy, and the officeholders stay fictional. An action that is clearly unlawful is never a plain button. Where a President could attempt something contested, the game shows counsel's objection, the legal risk, the courts, Congress and the political cost, or leaves the action out.

## Not verified

Each review lists what it couldn't confirm. The largest gaps: uscode.house.gov was in a temporary format and its section links failed (govinfo's link service worked); the Venezuela operation's War Powers report; Guard mission statuses after early 2026; the §338 proclamation numbers; seat-by-seat removal language for several commissions; and the items listed at the end of review 04.
