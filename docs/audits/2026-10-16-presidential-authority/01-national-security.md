# 01. National security, war and force, intelligence and covert action, domestic use of force

Presidential authority review, 2026-10-16. Read-only: no code, data or existing doc was edited, and nothing was built, tested or run. Every file:line was read in this session on branch `codex/reconcile-worktrees-2026-10-14`. Every legal source in the list at the end was opened in this session. History marked **(not opened)** is stated from the general record and was not checked against a source here; treat it as unverified. Anything about 2025 or 2026 is dated "as of" the source and marked UNCONFIRMED where no source was opened.

## Summary

58 acts and decision options were reviewed: the five covert rungs and four regime operations, the order that unlocks the lethal option, the five military rungs and the strike terms, the War Powers gate, report, extension and termination, the force authorization request, joining and leaving wars, the eleven combatant-command acts, commitments and basing, arms transfers and security guarantees, every intelligence act (collection, assessments, findings, sharing, referral), and every domestic locale act. **36 ACCURATE, 9 MISSING GATE, 7 MISFRAMED, 5 UNDERSTATED, 1 OVERSTATED.** The engine is unusually careful about domestic surveillance, the covert-action finding's legal content and the War Powers clock. Its serious problems cluster in three places:

1. **The lethal covert option (critical).** The game lets the President kill the sitting leader of any government without a declared deliverable arsenal, at any time, after signing one executive order that "amends the ban." No President has publicly amended Executive Order 12333 §2.11. The real practice is the opposite: the executive keeps the prohibition and has a lawyer determine that a particular killing is lawful self-defense or an act in an armed conflict, and therefore not "assassination." No modern President has acknowledged ordering the killing of a sitting head of state or government.
2. **Covert action without a finding (high).** Sabotage, proxy support, coup support, election operations, capture and the lethal option all run whether or not a finding stands. The game only records them as "unfounded." Under 50 U.S.C. §3093(a) a President may not authorize covert action without a finding, and the influence rung leaves no record at all.
3. **Domestic force is refused rather than modeled (high).** Federalizing the Guard, the Insurrection Act, troops and federal agent surges are all hard refusals ("the game doesn't include it yet"). Yet these are the most visible presidential acts of 2025, and the law around them is now unusually well defined: *Trump v. Illinois* (Dec. 23, 2025) and *Newsom v. Trump*. Meanwhile a glossary entry tells the player that a state emergency "opens acts like federalizing the Guard," which is wrong twice.

The War Powers "second front" refusal is also a game rule presented as law. And the strike option "Infrastructure" invites the player to hit "the systems a country runs on," which the law of war does not allow as a category.

---

## How to read the rows

Each row gives: **Act** (id, file:line, what the player can do), **Law** (source of the power, with links in the source list), **Procedure and limits**, **History**, **Politics**, **Game today**, **Verdict**, and **Fix** (label, severity). The engine paths are under `packages/engine/src/` unless stated. Player-core paths are under `packages/player-core/src/`.

---

## A. Covert ladder, regime operations and findings

### N1. Covert rung 1, Surveillance
- **Act:** `instruments.ts:165-179`. Standing watch on one government. Gate: intel capability ≥ 0.1. Produces a collection product and a seeded exposure.
- **Law:** Foreign intelligence collection under EO 12333 (§1.7 duties, §2.3 procedures). Collection whose primary purpose is to acquire intelligence is excluded from "covert action" (§3093(e)(1)), so no finding is needed.
- **Procedure:** Collection follows agency procedures approved by the Attorney General where U.S. persons are involved (EO 12333 §2.3). The committees are kept informed of significant activity (general duty, 50 U.S.C. §3091, not opened).
- **History:** Routine in every administration.
- **Politics:** Routine. Exposure costs bilateral trust, which the game models.
- **Game:** No finding is required and exposure is a seeded draw (`instruments.ts:154-156`).
- **Verdict: ACCURATE.**

### N2. Covert rung 2, Influence Operation
- **Act:** `instruments.ts:181-190`. Raises the target's protest pressure. Gate: intel capability ≥ 0.25. **No paper trail:** the resolver does not call `covertRecord`, so no finding is counted and no "unfounded" record is written.
- **Law:** An activity "to influence political, economic, or military conditions abroad" with the U.S. role hidden is covert action (§3093(e)) and needs a written finding (§3093(a)). It may never aim at U.S. audiences (§3093(f)).
- **Procedure:** A written finding before the action, reported to the intelligence committees, or to the "Gang of Eight" in extraordinary circumstances (§3093(c)(1)-(2)). A finding may not authorize anything that violates the Constitution or a statute (§3093(a)(5)).
- **History:** The Church Committee (1975-76) documented decades of such operations and led to the intelligence committees and FISA (senate.gov). Trump confirmed on Oct. 15, 2025 that he had authorized CIA covert action in Venezuela (OPB/AP, as of Oct. 16, 2025).
- **Politics:** Routine inside the intelligence system. A leak is notable. Allies react badly when they are the target.
- **Game:** The rung runs with or without a finding and records nothing (`instruments.ts:186-189`).
- **Verdict: MISSING GATE.**
- **Fix (engine, high):** Call `covertRecord` from rung 2. Then apply the finding gate in N3.

### N3. Covert rung 3, Sabotage
- **Act:** `instruments.ts:192-207`. One-off growth shock and tension. Gate: capability ≥ 0.4 and covert reach. Records "under finding" or "unfounded" (`findings.ts:320-344`).
- **Law:** Covert action, §3093(a). Sabotage that kills or injures is also bounded by the law of armed conflict and by EO 12333 §2.11 where it targets a person.
- **Procedure:** Same as N2.
- **History:** Stuxnet is widely reported (not opened, never officially acknowledged).
- **Politics:** Notable. Exposure is a diplomatic incident.
- **Game:** It runs without a finding. The "unfounded" record is "the fact the committees eventually ask about" (`findings.ts:313-316`). The President pays later, never at the moment of the act.
- **Verdict: MISSING GATE.** The statute does not allow covert action first and paperwork never. The game's own contemporaneous state (`findings.ts:21-25`) already models the one lawful emergency path.
- **Fix (new gate, high):** Refuse covert rungs 2-5 unless `standingFinding(campaign, target)` exists (`findings.ts:89-93`). Offer "Sign a finding" inline, with the contemporaneous option as the emergency path. Keep "unfounded" only as a hard case (§3.6) that counsel objects to, never as a quiet default.

### N4. Covert rung 4, Proxy Support
- **Act:** `instruments.ts:209-226`. Raises insurgency pressure and spends tradecraft. Gate: capability ≥ 0.5 and a shared border or a base abroad.
- **Law, procedure:** Covert action (§3093). Lethal aid to a non-state force can also trigger statutory limits on assistance (for example the Leahy laws, not opened).
- **History:** Afghanistan in the 1980s, Syria in 2013-17 (both not opened). The Iran-Contra affair (1985-87) was a proxy program run around a statutory ban (not opened).
- **Politics:** Notable to extraordinary. Iran-Contra is the defining scandal of this rung.
- **Game:** It runs without a finding (see N3).
- **Verdict: MISSING GATE.** **Fix:** the same as N3 (high).

### N5. Covert rung 5, coup support
- **Act:** `regime-rung.ts:46-63` and `regime-acts.ts`. A standing operation that adds a decaying hazard to the target's coup risk. Gate: capability ≥ 0.65, counterintelligence ≥ 0.4, reach, no declared deliverable arsenal, none already running. The workspace copy is "Back a move against the government" (`player-core/src/act/workspace.ts:136`).
- **Law:** Covert action (§3093). Domestically lawful under a finding if no statute is broken. Under international law it breaches non-intervention and the UN Charter's art. 2(4) principle; this is contested only in its edges.
- **History:** Guatemala 1954 and Chile 1970-73 (Church Committee era; the senate.gov page confirms the committee, not these specific cases). There is no acknowledged U.S.-sponsored coup in recent decades (not opened).
- **Politics:** Extraordinary. In the modern era it is the kind of act a White House would never describe.
- **Game:** DECISIONS §6.15 routes it through the existing coup hazard, which is a sound design. It runs without a finding.
- **Verdict: MISSING GATE.** **Fix (new gate, high):** the N3 finding gate. Mark it a hard case with an Attorney General consult (already in `consultation.ts` covert row 5).

### N6. Covert rung 5, political action (elections abroad)
- **Act:** `regime-acts.ts`. Lowers the sitting government's hold at its next selection. Copy: "Work against it at the polls" (`workspace.ts:137`).
- **Law, procedure:** Covert action (§3093). The finding may not touch U.S. politics (§3093(f)). The engine already refuses U.S.-directed objectives (`findings.ts:105-120`).
- **History:** Italy 1948 (not opened).
- **Politics:** Extraordinary when exposed.
- **Game:** It runs without a finding.
- **Verdict: MISSING GATE.** **Fix:** the same as N3 (high).

### N7. Covert rung 5, capture of a foreign leader
- **Act:** `regime-rung.ts:65-76`. "Always offered" (DECISIONS §6.15). Seats the charter's successor and always exposes. Copy: "Take its leader into custody... There's no way to keep it secret" (`workspace.ts:138`). It writes a covert record only. **No War Powers obligation is opened** (`covertRecord` only, `regime-rung.ts:82`).
- **Law:** The two real precedents were not covert actions. Both were overt military operations carrying out an existing indictment. The President's constitutional authority to order the arrest is supported by the 1989 OLC opinion on extraterritorial arrests, which is contested and advisory. Courts try a defendant brought in by force (Ker-Frisbie). Head-of-state immunity was rejected for Noriega because the U.S. did not recognize him (CS Monitor, Jan. 5, 2026). Using the armed forces triggers the War Powers report (50 U.S.C. §1543) and, once hostilities begin, the 60-day clock (§1544(b)).
- **History:** Panama 1989-90, an invasion followed by Noriega's surrender and a 1991 conviction (CS Monitor). Venezuela, Jan. 3, 2026: strikes across Venezuela ended in Maduro's capture and transfer to New York on an indictment first returned in 2020 and superseded in 2025, which is the one CRS cites (CRS IN12618, Jan. 12, 2026). The administration called it "an arrest of two indicted fugitives" and gave no prior notice to Congress. The Senate discharged S.J.Res. 98, then killed it on a point of order after a 50-50 tie that the Vice President broke, Jan. 14, 2026 (Al Jazeera). Whether a formal War Powers report was filed is UNCONFIRMED.
- **Politics:** Extraordinary. It brings immediate War Powers votes, allied and UN reaction, and a criminal trial with its own news cycle.
- **Game:** A covert rung with no indictment, no force, no report, and no trial or custody afterward. It is "always offered" against any government without a deliverable arsenal, including allies.
- **Verdict: MISSING GATE** (and misplaced on the ladder).
- **Fix (new act and gates, high):** Move capture off the covert ladder into a force act "Apprehend an indicted leader." It needs (a) an existing federal indictment (a new Justice fact or a scenario flag), (b) a military package and the rung-4 or rung-5 War Powers record, and (c) the Attorney General and Defense consults. Afterward come custody and trial beats. Leave allies untargetable unless a war with them exists.

### N8. Covert rung 5, lethal operation against a leader
- **Act:** `regime-rung.ts:50` requires only `prohibitionLifted` (`:31-35`), meaning the amending order is signed and not rescinded or struck down. Resolve seats the successor, exposes at 0.6 (`:38`, `:67`) and opens a scandal flag when exposed (`:68-74`). The option appears in the workspace only while the order stands, with the copy "Lethal operation against its leader... It's allowed only because you signed an order changing the long-standing ban. If it comes out, expect an investigation" (`workspace.ts:139`, `:143`). No finding, war, armed attack, self-defense predicate or counsel's opinion is required.
- **Law:**
  - EO 12333 §2.11: "No person employed by or acting on behalf of the United States Government shall engage in, or conspire to engage in, assassination." §2.12 bars doing it indirectly. The order does not define "assassination."
  - The executive's long-standing position is that a lawful killing in self-defense or in an armed conflict is not assassination. Attorney General Holder, March 5, 2012: "Some have called such operations 'assassinations.' They are not." His tests: an imminent threat, capture infeasible, and conduct consistent with the law of war. The 2010 OLC memorandum on al-Aulaqi applied the "public authority" justification to federal murder statutes (not opened on justice.gov; described in secondary sources only).
  - A finding "may not authorize any action that would violate the Constitution or any statute" (§3093(a)(5)).
  - 18 U.S.C. §1116 makes killing an "internationally protected person" murder. That includes a head of state or government *when in a country other than his own*, with U.S. jurisdiction where the offender is a U.S. national (§1116(b)(4), (c)). A leader killed abroad is squarely inside the statute, and OLC's public-authority argument is the only answer to it. That argument is contested.
  - International law: UN Charter art. 2(4) and art. 51 (registry record `un-charter-art51`). Without an armed attack or an armed conflict, killing a foreign state's leader is a use of force against that state.
- **History:**
  - The Church Committee documented plots against foreign leaders in the 1960s (Castro, Lumumba; not opened beyond the committee page). Ford's EO 11905 (1976) introduced the ban (not opened).
  - Soleimani, Jan. 2, 2020: a military airstrike in Iraq on a foreign *military commander*, not a head of state. It rested on Article II and the 2002 AUMF (OLC memorandum, Mar. 10, 2020), with Article 51 self-defense claimed internationally.
  - The 2002 AUMF was repealed by the FY2026 NDAA, signed Dec. 18, 2025 (Sen. Kaine release), so that leg is gone for a future President.
  - Al-Aulaqi, 2011, killed as an operational leader in an armed conflict under the 2001 AUMF (Holder speech context).
  - Venezuela: Trump declined on Oct. 15, 2025 to say whether the CIA's finding reached Maduro (OPB). He was later captured, not killed.
  - No President has publicly amended §2.11 or acknowledged ordering the killing of a sitting head of state or government.
- **Politics:** The most extraordinary act in the game. It would bring immediate congressional inquiry, allied rupture, possible criminal exposure for officers under §1116 abroad, and a lasting precedent against U.S. leaders.
- **Game:** A plain option behind one executive order, with exposure as its only real cost. The copy normalizes it: "allowed only because you signed an order."
- **Verdict: OVERSTATED** (the game allows what the law and practice do not, as an ordinary menu item).
- **Fix (engine, new gate, copy; critical).** Recommended: keep it, but only as an honest hard case.
  1. Delete the "amend the prohibition" unlock (N9).
  2. Gate the option on a predicate the law recognizes: an active armed conflict with that government (an open war in `conflicts`), or a recorded imminent threat (an active pursuit of the United States, which the engine already derives in `intel-authority.ts`). Also require a standing finding (N3) or a military order with a War Powers record.
  3. Require counsel's opinion as a step. The Attorney General consult is already in `consultation.ts`. Counsel refuses outright where no predicate exists.
  4. Make it a §3.6 hard case with named confirmation and copy such as: "EO 12333 §2.11 forbids assassination. Your counsel's view is that this is [self-defense against an imminent attack / an act in an armed conflict] and so is not assassination. No modern President has acknowledged ordering the killing of a sitting head of state. 18 U.S.C. §1116 reaches a leader killed outside his own country."
  5. Exclude treaty allies.

  The alternative is to remove the option and keep capture under N7. That costs a real question the game is honest about, so prefer the gated version.

### N9. Order: amend the standing prohibition
- **Act:** `order-families.ts:41-58`. "Amend the executive order's prohibition so that one class of covert operation against a foreign leader may be authorized under a finding." It costs standing −0.03 with overreach 0.25. Its authority is tagged `kind: "constitution"` while citing EO 12333 (already logged in BL-165). Its stated limit is that "Congress and the courts may still answer for its use."
- **Law:** A President can amend an executive order, as the registry says (`records-security.ts:167-171`). But amending §2.11 changes no statute (§1116, §3093(a)(5)) and no treaty obligation. Courts would almost certainly not review it, so "struck-down" (`regime-rung.ts:33`) is not a realistic exit.
- **History:** EO 12333 has been amended (for example in 2008, not opened). Section 2.11 never has been, publicly. The real path is a legal determination, not an amendment (N8).
- **Politics:** An open amendment of the assassination ban would itself be a global story the day it was signed.
- **Game:** A security order signed like any other, which unlocks N8.
- **Verdict: MISFRAMED.**
- **Fix (engine and copy, critical):** Remove it from the order catalog, or turn it into a non-public "legal determination" step inside the N8 hard case, with no court-review path. Fix the `kind` either way (BL-165).

### N10. Sign a covert finding (full committees, Gang of Eight, withheld; written or contemporaneous)
- **Act:** `findings.ts:141-233`. "Unwritten" is refused (`:151-153`). Withheld notice needs reasons (`:154-159`), and objectives aimed at U.S. politics are refused with a record (`:165-194`). Withholding costs disposition (`:235-247`).
- **Law:** §3093(a)(1) allows a contemporaneous record reduced to writing within 48 hours. §3093(c)(2) allows the Gang of Eight in extraordinary circumstances. §3093(c)(3) allows withheld notice with "a statement of the reasons." §3093(f) bars U.S.-directed action.
- **History:** Iran-Contra (findings withheld from the committees, not opened). Venezuela 2025 (OPB).
- **Politics:** Routine paperwork. Withholding is notable.
- **Game:** It matches the statute closely. The text check on the objective (`findings.ts:105-120`) is crude but honest.
- **Verdict: ACCURATE.** (The finding is not yet a gate on the rungs: see N3.)

### N11. Notify committees of a withheld finding
- `findings.ts:254-280`; statement required. §3093(c)(3). **ACCURATE.**

### N12. Close a finding
- `findings.ts:283-305`. Ending a program is a presidential act. **ACCURATE.**

---

## B. Military ladder and strikes

### N13. Military rung 1, Exercises
- `instruments-military.ts:133`. Readiness ≥ 0.1, threat only. Art. II, §2, cl. 1. Exercises do not introduce forces into hostilities, so no War Powers report is owed. Routine (for example annual exercises in Korea, not opened). **ACCURATE.**

### N14. Military rung 2, Forward deploy
- **Act:** `instruments-military.ts:141-160`. Needs a shared border or `basesAbroad > 0`. Opens an "equipped for combat" report obligation (`war-powers-report.ts:205-210`) and a standing deployment.
- **Law:** Art. II. 50 U.S.C. §1543(a)(2) requires a report when forces equipped for combat are introduced into a foreign nation's territory. Deploying to a third country's soil needs that host's consent (a status-of-forces agreement or similar, not opened).
- **Politics:** Routine to notable.
- **Game:** The report is modeled correctly. Host consent is only a national basing stat.
- **Verdict: ACCURATE.** Host consent is covered under N36.

### N15. Military rung 3, Blockade
- `instruments-military.ts:163`. Hostilities, the War Powers clock and a war (DECISIONS §6.9). A blockade is an act of war (GA Res. 3314 art. 3(c), cited in DECISIONS). The 1962 Cuban "quarantine" was framed to avoid that word and was backed by the OAS and a joint resolution (not opened). **ACCURATE.** Optional copy: note that Presidents have chosen the "quarantine" framing.

### N16. Military rung 4, Limited strike
- **Act:** `instruments-military.ts:181-210`. Unilateral if `warPowersStanding` allows, with the 48-hour report and 60-day clock.
- **Law:** OLC's two-part test is a national interest plus anticipated "nature, scope, and duration" short of a "war" in the constitutional sense (Libya opinion, Apr. 1, 2011; Syria opinion, May 31, 2018). WPR §§1543-1544.
- **History:** Libya 2011 (OLC). Syria Apr. 2018 (OLC). Iran June 21, 2025: strikes on three nuclear sites, reported June 23 "pursuant to my constitutional authority as Commander in Chief" and "consistent with the War Powers Resolution" (govinfo DCPD-202500715).
- **Politics:** Notable. Each strike brings a War Powers resolution fight in Congress.
- **Game:** It matches the OLC model and the reporting.
- **Verdict: ACCURATE.**

### N17. Strike objective "Infrastructure"
- **Act:** `player-core/src/act/workspace.ts:46`: "Hit power plants, ports, and the systems a country runs on. Civilians are at the most risk." Engine `strike-mission.ts:16-27` models a service outage.
- **Law:** Only military objectives may be attacked: objects that "by their nature, location, purpose or use make an effective contribution to military action" (DoD Law of War Manual §5.6, via the Lieber Institute). Dual-use objects qualify only on that test, and attacks remain subject to proportionality and precautions.
- **Politics:** Targeting is reviewed by military lawyers before strikes. A White House never describes a strike as aimed at "the systems a country runs on."
- **Verdict: MISFRAMED.**
- **Fix (copy, high):** Rename to "Dual-use targets" with detail like: "Power, ports and networks that support the military. Lawyers must find each one a military objective, and expected civilian harm must not be excessive. Civilian outages and deaths are the main risk." Add a targeting-review line to the review sheet.

### N18. Military rung 5, Expeditionary invasion
- **Act:** `instruments-military.ts:213-251`. Unilateral on first use if the War Powers standing allows it.
- **Law:** OLC's own test puts "prolonged and substantial" engagements with significant risk to U.S. forces toward "war," which needs Congress (Libya opinion, discussion of nature, scope and duration). History is mixed: Grenada 1983, Panama 1989 and Haiti 1994 went without authorization (not opened).
- **Politics:** Extraordinary. No modern President has opened a multi-brigade ground war without at least seeking a vote.
- **Game:** It is treated like a strike for the War Powers gate.
- **Verdict: MISSING GATE.**
- **Fix (new gate, medium):** Before a unilateral rung 5, require counsel's "war in the constitutional sense" assessment, read from the package size and estimated weeks. Show it as a hard case, and offer "Ask Congress first" (A9) inline.

### N19. War Powers gate: the "second front" and expiry refusals
- **Act:** `congress.ts:284-332`, enforced at `instrument-gates.ts:272-287`. Refuses rungs 3-5 when the administration has used force anywhere without a vote within the window, or when any 60-day obligation has expired. The copy says "opening a second front on [the President's] own authority is not something the office can do" (`congress.ts:303`, `:327`).
- **Law:** The WPR limits each use (one report, one clock) and has no one-front rule. Congress can withdraw forces by joint resolution, and §1544(c)'s concurrent resolution is constitutionally doubtful after *INS v. Chadha* (1983, not opened). Courts have declined to enforce the clock (for example *Campbell v. Clinton*, 2000, not opened).
- **History:** Concurrent unilateral operations are common:
  - 2011: Libya alongside the AUMF wars (OLC).
  - 2025: Iran strikes in June (govinfo) alongside lethal boat strikes from Sept. 2, 2025, which the administration framed as a "non-international armed conflict" with cartels (AP via ABC7, Oct. 2025, search summary only; UNCONFIRMED).
  - Kosovo 1999 ran past 60 days (not opened).
- **Politics:** Each additional front costs Congress's disposition and invites a forced vote. That is a political price, not a legal wall.
- **Verdict: MISFRAMED.** It is a sound design brake, but the copy presents it as law.
- **Fix (copy and engine, high):**
  - Keep the brake as a planning rule, but say so: "Your counsel says a second unilateral operation is lawful under Article II, but Congress has not voted on the first. Expect a forced War Powers vote and a sharp drop in the Hill's patience."
  - For the post-expiry case, make it a hard case: continuing after day 60 is the statute's clearest line, so let counsel object in writing.
  - Also adopt audit 02's BL-171 (pending legs must count).

### N20. Statute withdraws unilateral latitude
- `instrument-gates.ts:278-284`, read from enacted laws (`legislation.ts:89-103`). Congress's power of the purse and its war-declaring power (Art. I, §8, cl. 11, registry record) let it restrict force by law. **ACCURATE.**

### N21. No force against a government with a deliverable arsenal
- `instrument-gates.ts` `outsideNuclearDeterrence`, DECISIONS §6.9. This is a design rule, not law. It matches practice: no direct U.S. strike on a nuclear-armed state's territory is on record (not opened). **ACCURATE as design.** Copy should say it is the game's rule, not a legal bar.

---

## C. Congress and the clock

### N22. Request an authorization for the use of force
- **Act:** `force-authorization.ts:181`. One target, voted in 3 days (`:41`). The authorization lapses after 52 weeks (`congress.ts:382`).
- **Law:** Art. I, §8, cl. 11. An AUMF satisfies WPR §1544(b) (registry). The 2001 AUMF reaches the parties to 9/11. The 2002 and 1991 Iraq AUMFs were both repealed by §8370 of the defense authorization signed Dec. 18, 2025 (Kaine release).
- **History:** 2001 (passed within days, Pub. L. 107-40 in the registry); 2002 (not opened).
- **Game:** Accurate in mechanics. Real AUMFs carry no automatic sunset (the 2001 AUMF is still in force), so the 52-week lapse is a design choice.
- **Verdict: ACCURATE.**
- **Fix (copy, low):** Label the 52-week term "game rule: the Hill revisits it yearly" or drop the sunset. The registry also lacks a 2002 AUMF record; add one marked "repealed Dec. 18, 2025."

### N23. File the War Powers report
- `war-powers-report.ts:259-320`; due in 2 days (`:77`); the authority claimed is required (`:269`). §1543(a), 48 hours, to the Speaker and the President pro tempore. Recent letters say "consistent with" the Resolution (govinfo 2025). **ACCURATE.** Add the "consistent with" phrasing as the default claim choice.

### N24. Certify the 30-day extension
- `war-powers-report.ts:324`. §1544(b): 30 more days on certification of "unavoidable military necessity" for the safety of the forces while they are removed (registry). It opens 14 days before day 60, a design choice. **ACCURATE.**

### N25. Terminate the use of force
- **Act:** `war-powers-report.ts:386`. The only way, besides a vote, to stop the clock. The clock runs only for hostilities without an AUMF (`:136-140`).
- **Verdict: ACCURATE.**
- **Note (UNCONFIRMED):** A one-night strike (Iran, June 2025) ends hostilities by itself. Whether the game's obligation for a rung-4 strike ends when its 2-week deployment commitment ends was not traced. If it does not, the player is billed past-60-day costs for a raid that is over.
- **Fix (engine, medium, verify first):** End the hostilities obligation when the act's commitment winds down.

### N26. Declare an armed-forces national emergency
- `emergency.ts:187-201`; needs an active conflict involving the U.S. Under the National Emergencies Act (50 U.S.C. §1621) this unlocks statutes such as §2808 military construction (registry). Precedent: the Feb. 2019 border emergency used §2808 (not opened). **ACCURATE.**

---

## D. Entering and leaving wars

### N27. Join a war on the defender's side
- `war-entry.ts:321-356`, held to the same statute check (`:258-264`) and War Powers record (`:273-283`). Art. II and Art. 51 collective self-defense at a victim's request. **ACCURATE.**

### N28. Join a war on the aggressor's side
- **Act:** the same function with `side: "aggressor"`. The copy calls it "the same commitment made cynically" (`war-entry.ts:313-315`).
- **Law:** Domestically, the same as N27. Internationally, joining the side that struck first has no Art. 51 basis unless that side was itself answering an armed attack. Real letters always claim collective self-defense: the Iran letter of June 23, 2025 cites "collective self-defense of Israel" (govinfo, as summarized). Whether Israel's June 2025 strikes were lawful self-defense is contested.
- **Verdict: MISFRAMED.** The label "aggressor" is the engine's war record, not how a President acts or speaks.
- **Fix (copy, medium):** Show "Join [government]'s side" and require the player to pick the international-law claim (collective self-defense at a request, or none). With "none," show counsel's objection and an allied and UN cost.

### N29. Leave a war, offer terms, settle, cool the front
- `peace.ts:243, 272, 321, 391`. The President's Art. II powers over negotiation and the forces. Armistices are executive acts (Korea 1953, not opened). **ACCURATE.**

### N30. Call on a compact
- `compacts.ts:450`. North Atlantic Treaty art. 5 (registry). Art. 5 has been invoked once, after 9/11 (not opened). **ACCURATE.**

---

## E. Commands, commitments, basing, transfers

### N31. Set command posture
- `combatant-commands.ts:549-591`. 10 U.S.C. §§161-163 (registry): the chain of command runs through the Secretary of Defense. **ACCURATE.**

### N32. Relieve a commander
- `combatant-commands.ts:328`, with a reason from a list. Art. II command. Truman relieved MacArthur in 1951 and Obama accepted McChrystal's resignation in 2010 (not opened). **ACCURATE.**

### N33. Reassign forces between commands
- `combatant-commands.ts:392-446`. This is a real §161-162 act, but audit 02 §1.8 shows it changes only a displayed count. **MISFRAMED** (it reads as moving troops and moves nothing). **Fix (copy or engine, low):** audit 02's BL-180.

### N34. Amend the Unified Command Plan
- `combatant-commands.ts:448`. §161 makes this the President's act, with notice to Congress. The notice period is UNCONFIRMED (BL-166). **ACCURATE.**

### N35. Suspend, resume or wind down a commitment
- `commitments.ts:299-330`. Art. II. **ACCURATE.**

### N36. Basing and host consent
- **Act:** none. Inherited basing is opened at the oath (`basing.ts:79-160`). Staging is a static table (`staging.ts`), and forward deployment reads a national `basesAbroad` stat (audit 02, BL-181).
- **Law:** Executive agreements and status-of-forces agreements, reported under Case-Zablocki (1 U.S.C. §112b, registry). Congress has at times limited drawdowns in NDAAs (not opened).
- **History:** The 2020 announcement of a Germany drawdown (not opened).
- **Verdict: UNDERSTATED.**
- **Fix (new act, medium):** "Seek access" and "Close a base" acts as executive agreements with a host's consent, Case-Zablocki reporting, and NDAA limits where the world data carries them.

### N37. Arms transfer (assistance rung 4)
- **Act:** `instruments-economic.ts:424-447`. No congressional step.
- **Law:** Arms Export Control Act §36, 22 U.S.C. §2776 (registry): notify Congress, which may block the sale by joint resolution within 30 days (15 for close allies). An emergency waiver exists. A drawdown from stocks is a separate authority (Foreign Assistance Act §506, not opened).
- **Verdict: MISSING GATE.**
- **Fix (new gate, medium):** Add a notification step with a review window and a block risk read from Congress. Offer the emergency waiver as a cost.

### N38. Security guarantee (assistance rung 5)
- **Act:** `instruments-economic.ts:450-462`. A standing "promise to fight for them" by presidential act.
- **Law:** A binding mutual-defense obligation is a treaty that needs two-thirds of the Senate (Art. II, §2, cl. 2, registry). A President can give political assurances, which do not bind successors.
- **Verdict: MISFRAMED.**
- **Fix (copy, medium):** Rename it "Security assurance (political, not binding)" and point to "Sign treaty: alliance" (A8) for a binding guarantee.

---

## F. Intelligence

### N39. Task collection on a foreign government
- `intelligence.ts:463-560`. EO 12333 §1.7 duties. **ACCURATE.**

### N40. Task collection on a foreign person
- `intelligence.ts:434-437`. Only CIA human sources abroad, cited to 50 U.S.C. §3036(d) (BL-161). NSA signals collection on foreign leaders abroad is also routine under EO 12333 (not separately opened). **UNDERSTATED.** **Fix (engine and data, low):** source an NSA pathway in the authority manifest.

### N41. Public analysis of a state (DHS I&A, open sources only)
- `intelligence.ts:424-432`. A conservative reading of DHS I&A's role. **ACCURATE.**

### N42. A domestic person: refused, and referred to the Attorney General
- **Act:** `intelligence.ts:433`, `intel-authority.ts:168`.
- **Law:** EO 12333 §2.3 and §2.5: the Attorney General approves intrusive techniques, case by case, on probable cause that the target is a foreign power or its agent. FISA is the "exclusive means" for electronic surveillance (50 U.S.C. §1812(a)). Justice's contacts policy and 26 U.S.C. §7217 for the IRS are cited in `directives.ts:215-223`.
- **Verdict: ACCURATE.**

### N43. Domestic politics: refused outright
- `intelligence.ts:421-423`. §3093(f) and the Church Committee's finding of "no inherent constitutional authority... to violate the law" (senate.gov). **ACCURATE.**

### N44. Close a tasking
- `intelligence.ts:621`. **ACCURATE.**

### N45. Commission an assessment
- `assessments.ts:579`. Routine. **ACCURATE.**

### N46. Press an assessment (harden or soften)
- `assessments.ts:638-700`. It raises politicization, costs morale and can leak. Lawful but damaging, and the 2002 Iraq estimate is the reference case (not opened). **ACCURATE.**

### N47. Share a collection report with allies
- **Act:** `intelligence.ts:586`. Recipients need trust ≥ 0.4 or a treaty, and a domestic report never goes abroad (`:575`).
- **Law:** The President controls classification and release (EO 13526, registry). In practice sharing is bounded by originator control and agreements.
- **Verdict: ACCURATE.** The trust floor is a game rule. Label it so in the copy.

---

## G. Domestic use of force and locale acts

**Law common to N48-N58:**
- The Posse Comitatus Act (18 U.S.C. §1385) bars the armed forces from executing the laws "except in cases and under circumstances expressly authorized by the Constitution or Act of Congress."
- §12406 lets the President call the Guard into federal service on invasion, rebellion, or when "unable with the regular forces to execute the laws."
- *Trump v. Illinois*, No. 25A443 (Dec. 23, 2025, stay denied 6-3) read "regular forces" as "likely" the regular military. So §12406(3) "likely applies only where the military could legally execute the laws," which means an exception to Posse Comitatus such as the Insurrection Act. The Court left reviewability open.
- The Insurrection Act: §251 on a state's request; §252 when obstruction makes ordinary judicial enforcement of federal law "impracticable"; §253 for violence that denies rights, with "the militia or the armed forces, or both"; a proclamation to disperse first (§254, registry).
- 32 U.S.C. §502(f) lets Guard members perform "other duty" in state status, including in "support of operations or missions... at the request of the President or Secretary of Defense." The governor's role comes through state orders, not the statute's text.

### N48. Direct federal relief to a state
- **Act:** `locale-acts.ts:73-87`. No declaration is needed. Unrequested relief is allowed at a standing cost (`:256-262`).
- **Law:** Stafford Act aid generally needs a governor's request and a declaration. 42 U.S.C. §5191(a) requires the governor's request. §5191(b) allows the President to act without one only where the federal government has "exclusive or preeminent responsibility," after consulting the governor.
- **Verdict: MISSING GATE.**
- **Fix (new gate, medium):** Without a request, allow only (a) pre-positioning and surge without disaster-fund money, or (b) a §5191(b) emergency where a federal-responsibility condition exists. Cite §5191 in the copy.

### N49. Ask the governor to deploy the Guard
- **Act:** `locale-acts.ts:89-99`. Needs the governor's assent. Federally reimbursed.
- **Law:** State active duty or 32 U.S.C. §502(f) at federal request.
- **History:** Memphis 2025, with Tennessee's governor in a "multi-agency" mission (Task & Purpose). New Orleans, Title 32 through Feb. 28, 2026 per secondary reporting (UNCONFIRMED). D.C. 2025 with Guard from several states (Task & Purpose).
- **Verdict: ACCURATE.**
- **Fix (copy, low):** Cite §502(f) and add "and send to another jurisdiction" (out-of-state Guard in D.C.) as a later option.

### N50. "Request Guard federalization" (the Emergency page) and its glossary
- **Act:** `guard-federalization.ts:72-86`. Despite the name, consent buys $10M of "support coordination" and stability. The player copy says so honestly: "No troops are sent, and nobody new takes command" (`player-core/src/emergency/emergency-choices.ts:136`).
- **Defect:** The glossary says "A state declaration opens acts like federalizing the Guard (taking command of a state's National Guard over the governor's objection)" (`player-core/src/glossary/world.ts:705`). That is wrong in law: neither an NEA declaration nor a disaster declaration is a §12406 or Insurrection Act predicate. It is also wrong in the game: the engine refuses federalization (`locale-acts.ts:215`). The engine API name and test name (`emergency-board.test.ts:73`) keep the false framing alive.
- **Verdict: MISFRAMED.**
- **Fix (copy, high):** Rewrite the glossary entry. Rename the player-facing row "Coordinate with the governor." Keep the API name only where save compatibility needs it.

### N51. Federalize the Guard (§12406)
- **Act:** `locale-acts.ts:101-114`, refused: "federal command of the Guard, and the game doesn't include that yet" (`:215`). The verb "Take command of the Guard" is still shown, in danger styling (`apps/player/src/nation/state/locale-acts.tsx:21`).
- **History, Los Angeles 2025:**
  - June 7, 2025 memorandum under §12406; 4,000 California Guard federalized without the governor's consent (Clearinghouse, *Newsom v. Trump*). Marines were also deployed (search summary only, UNCONFIRMED).
  - June 12: TRO. June 19: the Ninth Circuit stayed it, holding review "highly deferential" and finding a "colorable basis" (No. 25-3727).
  - Sept. 2: Posse Comitatus violation found at trial. Dec. 10: injunction returning control.
  - Dec. 31: the President announced he would end deployments over state objections in California, Illinois and Oregon (Clearinghouse; Just Security).
- **History, Illinois:** the Supreme Court denied a stay on Dec. 23, 2025 (above).
- **History, 1957:** Eisenhower federalized the Arkansas Guard and sent the 101st Airborne to enforce federal court orders, citing then-§§332-334 (now the Insurrection Act) (archives.gov).
- **Politics:** Extraordinary over a governor's objection; routine with consent.
- **Verdict: UNDERSTATED.** It is refused entirely, though lawful on a narrow predicate.
- **Shipped 2026-10-25 (WIP commit `39476ba62`, gate not yet run):** `federalize` in `locale-acts.ts`, predicate `federalServiceGround` in `locale-missions.ts`: an invasion (the United States defends a war), a rebellion (insurgency pressure at 0.2 or worse), or the regular forces tried and unable (a live proclamation, Insurrection Act troops there at least two weeks under an operative order, unrest at 0.5 or worse), the §12406(3) reading of *Trump v. Illinois*. A declaration or a protest opens nothing. Signs `order-guard-federalization` (`locale-mission-orders.ts`), which gets counsel, a state suit and an interim ruling (`mission-interim-relief.ts`); the Guard is a commitment bound to the state and the order (`commitments.ts`) at the weekly rate from `force-costs.ts`. One federalized Guard and one troop mission per state. Refusal text: `LOCALE_REFUSALS.federalize`. Orders going "through the governor" is carried by the governor-assent and mark effects, not a separate step.
- **Original fix (new act, high):** Offer it only as a hard case gated on:
  - (a) a predicate the engine can hold: invasion; rebellion (an armed uprising condition, not protest); or an Insurrection Act proclamation in force (N53), per *Trump v. Illinois*;
  - (b) orders "through the governor" (registry limit);
  - (c) automatic litigation: a state suit, then a TRO risk, then appeal, with courts reading the predicate;
  - (d) governor opposition and a national story.

  Without a predicate, counsel refuses and the row cites *Trump v. Illinois*.

### N52. Surge federal agents
- **Act:** `locale-acts.ts:116-128`, refused: "a federal law-enforcement mission, and the game doesn't include those yet" (`:214`).
- **Law:** Federal officers enforce federal law in every state without the state's consent (the Supremacy Clause). Protecting federal property falls under 40 U.S.C. §1315, which the game already models as an order (N58). No Posse Comitatus issue arises, because these are civilians.
- **History:**
  - D.C., August 2025: EO 14333 declared a "crime emergency" under Home Rule Act §740 and took temporary direction of the Metropolitan Police; that direction expired Sept. 10 (Federal Register public inspection; Task & Purpose).
  - NSPM-7 (Sept. 25, 2025) directed Joint Terrorism Task Forces to "investigate, prosecute, and disrupt" political violence, "consistent with applicable law" (whitehouse.gov).
  - Portland and Operation Legend, 2020 (not opened).
- **Politics:** Routine to notable. It becomes extraordinary only in coercive use, which `domestic-coercion.ts` already prices.
- **Verdict: UNDERSTATED.** The game refuses a routine federal power.
- **Shipped 2026-10-25 (WIP commit `39476ba62`, gate not yet run):** `agents` is split into three acts in `locale-acts.ts`: `property-surge` (40 U.S.C. §1315, answers unrest, no consent, `order-property-surge`), `immigration-operation` (8 U.S.C. §1357, routine enforcement in every state, scaled by foreign-born share, reachable from the home path, `order-immigration-operation`) and `task-force` (28 U.S.C. §533, at the governor's invitation, `order-joint-task-force`). All three carry the existing coercion risk (`domestic-coercion.ts`), none carries military forces, and each is excepted from a funding lapse (31 U.S.C. §1342).
- **Original fix (new act, high):** Enable it as a federal enforcement surge tied to a federal law the condition implicates (immigration, federal property, federal crimes), with the existing coercion-incident risk. Keep the "disorder" predicate optional. Never let it carry military forces.

### N53. Send in active-duty troops (Insurrection Act)
- **Act:** `locale-acts.ts:130-143`, refused: "the Insurrection Act, and the game doesn't include it yet" (`:216`).
- **History:** Los Angeles 1992: Proclamation 6427 recites that the governor "requested Federal assistance" and commands persons to disperse, under chapter 15 of title 10 (govinfo 106 Stat. 5261). Little Rock 1957, without the state's consent (archives.gov). In 2025 the Act was discussed but not invoked; Trump said he would withdraw after *Trump v. Illinois* (Just Security).
- **Politics:** With a governor's request, notable (1992). Without one, extraordinary (1957 and the civil-rights era).
- **Verdict: UNDERSTATED.**
- **Shipped 2026-10-25 (WIP commit `39476ba62`, gate not yet run):** two acts in `locale-acts.ts`, `proclaim` then `troops`, on the grounds in `locale-missions.ts` (`insurrectionGrounds`). §251: the governor assents and unrest reaching the state is at 0.4 or worse. §252: unrest placed in the state still at 0.3 or worse and a granted `injunction-enforcement` court order (`court-order-records.ts`) that the state has let stand with no answer since. §253: placed unrest at 0.6 or worse, the governor not assenting, no state answer in six weeks. The §254 proclamation is its own signed order (`order-insurrection-proclamation`), must come an earlier week and stays in force four weeks. Troops sign `order-insurrection-request` (§251) or `order-insurrection-enforcement` (§§252-253), carry the stated mission, and are one brigade combat team on a commitment bound to the order. The Posse Comitatus Act is pleaded in the suit beyond the stated mission. The game's reading of §252 ("impracticable by the ordinary course of judicial proceedings") is a modeled proxy and the player copy says so. Differs from the design brief: the brief read §252 off a two-week federal mission; the shipped code reads it off the court order (`OBSTRUCTION_WEEKS` = 1).
- **Original fix (new act, high):** Two tiers.
  1. §251 at a governor's or legislature's request: a normal, gated act.
  2. §§252-253 without a request: a hard case. It requires the predicate (obstruction of federal law or of court orders, or violence denying rights the state will not protect), the §254 proclamation as its own step, counsel's opinion, litigation, and the political cost.

  Both tiers lift the Posse Comitatus bar only for the stated mission.

### N54. Order surveillance of residents
- **Act:** `locale-acts.ts:145-158`, always refused through the FBI boundary (`:228`, `:352-358`). Copy: "Justice does not take case direction from this desk."
- **What the law allows:**
  - No presidential order can authorize surveillance of residents as a class. Electronic surveillance needs FISA or Title III, the "exclusive means" (§1812(a)), and a FISC order for a foreign-power target (registry).
  - Intelligence collection on U.S. persons follows AG-approved procedures, and intrusive techniques need case-by-case AG approval on probable cause (EO 12333 §§2.3, 2.5).
  - FBI investigations need predication under Justice rules.
  - A President may set investigative priorities by memorandum (NSPM-7 is a 2025 example), but not direct cases against named people (`directives.ts:215`).
- **What Presidents have done:** The COINTELPRO and NSA SHAMROCK and MINARET programs (Church Committee, senate.gov) led to FISA in 1978. The post-2001 warrantless program was later placed under FISA (not opened).
- **How the game should present it:** As it does, with three improvements (copy, low):
  1. Cite FISA §1812 and EO 12333 §2.3 in the refusal.
  2. Offer the lawful neighbor, "Set an investigative priority (memorandum to the Attorney General)," with First Amendment litigation and civil-liberties costs.
  3. Hide the "Order the surveillance" verb (`locale-acts.tsx:26`), or relabel it "Why you can't order this," so the refused act does not read as a button.
- **Verdict: ACCURATE.**
- **Shipped 2026-10-25 (WIP commit `39476ba62`, gate not yet run):** `surveil` stays refused in every case; its refusal now cites 50 U.S.C. §1812 and Executive Order 12333 §2.3 and points to the lawful neighbor (`LOCALE_REFUSALS.surveil`, `locale-missions.ts`). Added `priority` ("Set an investigative priority", 28 U.S.C. §509): a memorandum through `issueDirective` to `INST-DOJ`, one per state and week, which Justice may decline (`locale-act-effects.ts`). Added the court-ordered road: the President directs Justice to apply for a FISA, Title III, warrant or injunction order (`court-orders.ts`), the court rules on its own clock with the answer hidden until then (`court-order-records.ts`), and `surveil-under-order` opens only while a granted FISA or Title III order covers the state. Hiding the verb as a button is for the player-core and app lanes.

### N55. Grant a regulatory waiver
- `locale-acts.ts:159-169`. Generic. Real waivers are statute-specific (for example fuel waivers, already an act at D14). **ACCURATE.** Low: cite the statute in the copy when known.

### N56. Order a federal review
- `locale-acts.ts:170-180`. **ACCURATE.**

### N57. Force or collection with no unrest ("home acts")
- `locale-acts.ts:347-381`. The same boundary applies (`:349`), so they are refused today. **ACCURATE.** If N52 and N53 land, keep this unprovoked path as the hard-case version, with the `UNPROVOKED_STANDING` doubling.
- **Shipped 2026-10-25 (WIP commit `39476ba62`, gate not yet run):** `takeHomeAct` and `homeActAvailability` (`locale-acts.ts`, `locale-act-effects.ts`) now reach acts whose occasion is not `any`. Because the home path supplies no cause, acts that answer disorder (`property-surge`, `task-force`, `priority`) are refused there, and `immigration-operation`, whose occasion is routine enforcement, is the one act sent with no unrest. It charges `UNPROVOKED_STANDING` (2) times the standing and is always read as provoked for coercion.

### N58. Order: protect federal sites
- `order-families.ts:79-96`; 40 U.S.C. §1315; "Federal buildings, grounds and property only." This matches the statute. OLC's 1971 view that protecting federal property is not "executing the laws" (cited in *Trump v. Illinois*) explains why this differs from troops. **ACCURATE.**

---

## Critical capabilities missing

| Priority | Capability | Legal basis | Precedent | Why a player needs it |
|---|---|---|---|---|
| Critical | **Force against non-state actors and organizations** (terrorist groups, cartels, militias) as targets of strikes and AUMFs. Today every target is a nation (`resolution.ts:53-65`). | Art. II; the 2001 AUMF; WPR reports | 2001 onward; al-Aulaqi 2011 (Holder); boat strikes since Sept. 2, 2025 framed as armed conflict with cartels (UNCONFIRMED) | This is the most frequent use of force by modern Presidents. Without it, the lethal question in N8 has no lawful home. |
| High | **Lawful targeted strike** on an operational leader, inside an armed conflict or on an imminent threat (military rung 4 against a person) | Art. II, AUMF, Art. 51; Holder's test | Soleimani 2020 (OLC) | It replaces the covert "amend the ban" path with the one Presidents actually use. |
| High | **Insurrection Act**, both tiers (N53) | 10 U.S.C. §§251-254 | 1957, 1992 | The only lawful route to troops at home, and the gate §12406 now depends on |
| High | **Federal law-enforcement surge** (N52) | Supremacy Clause; 40 U.S.C. §1315 | D.C. 2025, NSPM-7 | A routine presidential tool the game refuses |
| High | **Apprehend an indicted leader** (N7) | Art. II; 1989 OLC (contested); Ker-Frisbie | Noriega 1989-90; Maduro, Jan. 3, 2026 | A real, recent act that is currently mis-modeled as covert |
| Medium | **Evacuation and hostage rescue** (noncombatant evacuation, embassy security) | Art. II; WPR reporting | Kabul 2021 (not opened) | A frequent, low-escalation use of force with its own reporting |
| Medium | **Basing access and status-of-forces agreements** (N36) | Executive agreements; 1 U.S.C. §112b | Germany drawdown 2020 (not opened) | Reach (DECISIONS §6.12) depends on it, and the player cannot touch it |
| Medium | **Arms sale notice and drawdown** (N37) | 22 U.S.C. §2776; FAA §506 | Ukraine drawdowns (not opened) | The actual path of most military assistance |
| Medium | **Congress-forced War Powers votes and the veto** | 50 U.S.C. §1546a (not opened); Art. I, §7 | S.J.Res. 98 killed on a point of order, the Vice President breaking a 50-50 tie, Jan. 14, 2026 | The real counterweight to N19, and a reason to replace the hard refusal with costs |
| Medium | **Declassify and publish intelligence** to shape allies and the public | EO 13526 | Pre-invasion releases on Ukraine, 2022 (not opened) | A routine modern lever that fits the existing report model |
| Medium | **Cyber operations** as an instrument | 10 U.S.C. §394 (not opened) | (not opened) | The game has cyber strength but no act |
| Low | **Reserve call-up** under §12302 during a national emergency | 10 U.S.C. §12302 (not opened) | 2001 onward | It follows the armed-forces emergency (N26) |
| Low | **Nuclear alert posture** as a signal. Leave employment out. | Art. II | (not opened) | Deterrence is modeled one way only. Use of nuclear weapons should stay out of the game. |

---

## Highest-priority fixes

1. **Critical. Rebuild the lethal option (N8, N9).**
   - Remove the "amend the prohibition" order.
   - Gate the option on an armed conflict or an engine-derived imminent threat, plus a standing finding or a military order.
   - Require counsel's opinion and a §3.6 hard case, and exclude allies.
   - Rewrite the copy to cite EO 12333 §2.11, Holder's 2012 test and 18 U.S.C. §1116.
2. **High. Require a standing finding for covert rungs 2-5 (N2-N6),** with the contemporaneous 48-hour path and "unfounded" only as a counsel-objected hard case. Make rung 2 write its record.
3. **High. Move capture off the covert ladder (N7)** into a force act gated on an indictment and the War Powers record.
4. **High. Fix the federalization framing (N50):** the glossary at `world.ts:705`, the row naming, and the hidden refused verbs.
5. **High. Add the Insurrection Act and §12406 as gated, contested acts (N51, N53),** reading *Trump v. Illinois* into the gate.
6. **High. Enable the federal law-enforcement surge (N52)** with the existing coercion pricing.
7. **High. Restate the second-front refusal as a game rule with political cost (N19),** and land audit 02's BL-171.
8. **High. Rewrite the "Infrastructure" strike objective (N17)** in law-of-war terms, with a targeting-review line.
9. **High (new act). Add non-state targets for strikes and AUMFs,** and a lawful targeted strike (missing capabilities 1-2).
10. **Medium. Add the arms-sale notice (N37), the relief request gate (N48), the security-assurance relabel (N38), and the rung-5 "war in the constitutional sense" check (N18).**

---

## Could not verify

- uscode.house.gov was under maintenance during this review. Statutory text came from govinfo.gov and the Cornell LII mirrors.
- The text of 10 U.S.C. §§12406 and 251 was not opened directly. §12406(3) is quoted from the Supreme Court's order; §251 and §254 come from the registry text.
- Whether a formal War Powers report followed the Jan. 3, 2026 Venezuela operation.
- The legal status (Title 32 or other) of the D.C. and Memphis Guard missions, and whether New Orleans continued past Feb. 28, 2026.
- The Marines in Los Angeles (search summary only).
- The October 2025 "armed conflict with cartels" notice (AP coverage via search only).
- The al-Aulaqi OLC memorandum on justice.gov.
- Whether a rung-4 strike's hostilities obligation ends on its own (N25).
- Anything after January 2026 on Venezuela, and later litigation in *Newsom v. Trump* after Jan. 23, 2026.

## Sources (all accessed 2026-10-16)

1. *Trump v. Illinois*, No. 25A443 (U.S. Dec. 23, 2025): https://www.supremecourt.gov/opinions/25pdf/25a443_new_b07d.pdf
2. *Newsom v. Trump*, No. 25-3727 (9th Cir. June 19, 2025): https://cdn.ca9.uscourts.gov/datastore/opinions/2025/06/19/25-3727.pdf
3. Civil Rights Litigation Clearinghouse, *Newsom v. Trump* docket summary: https://clearinghouse.net/case/46678/
4. Just Security, on *Trump v. Illinois* (secondary): https://www.justsecurity.org/128371/trump-v-illinois-supreme-court/
5. 50 U.S.C. §1544 (govinfo): https://www.govinfo.gov/link/uscode/50/1544?link-type=html
6. 32 U.S.C. §502 (govinfo): https://www.govinfo.gov/link/uscode/32/502?link-type=html
7. 50 U.S.C. §3093 (govinfo, 2023 ed.): https://www.govinfo.gov/content/pkg/USCODE-2023-title50/html/USCODE-2023-title50-chap44-subchapIII-sec3093.htm
8. 50 U.S.C. §3093 (LII): https://www.law.cornell.edu/uscode/text/50/3093
9. 50 U.S.C. §1812 (govinfo): https://www.govinfo.gov/link/uscode/50/1812?link-type=html
10. 18 U.S.C. §1385 (govinfo): https://www.govinfo.gov/link/uscode/18/1385?link-type=html
11. 10 U.S.C. §252 (LII): https://www.law.cornell.edu/uscode/text/10/252
12. 10 U.S.C. §253 (LII): https://www.law.cornell.edu/uscode/text/10/253
13. 18 U.S.C. §1116 (LII): https://www.law.cornell.edu/uscode/text/18/1116
14. 42 U.S.C. §5191 (LII): https://www.law.cornell.edu/uscode/text/42/5191
15. Executive Order 12333 (National Archives): https://www.archives.gov/federal-register/codification/executive-order/12333.html
16. OLC, Authority to Use Military Force in Libya (Apr. 1, 2011): https://www.justice.gov/olc/file/2011-04-01-libya-deployment/dl
17. OLC, April 2018 Airstrikes Against Syrian Chemical-Weapons Facilities (May 31, 2018): https://www.justice.gov/olc/opinion/april-2018-airstrikes-against-syrian-chemical-weapons-facilities
18. OLC, January 2020 Airstrike in Iraq Against Qassem Soleimani (Mar. 10, 2020): https://www.justice.gov/d9/2023-04/2020-03-10_soleimani_airstrike_redacted_2021.pdf
19. Letter to Congressional Leaders on U.S. Military Operations in Iran (June 23, 2025), DCPD-202500715: https://www.govinfo.gov/content/pkg/DCPD-202500715/html/DCPD-202500715.htm
20. CRS Insight IN12618, U.S. Capture of Venezuela's Nicolás Maduro (Jan. 12, 2026 version): https://www.everycrsreport.com/files/2026-01-12_IN12618_e1168c93bc89f61c812d8726da187d1044e5e5bd.html
21. Al Jazeera, Senate defeats Venezuela war powers resolution (Jan. 15, 2026): https://www.aljazeera.com/news/2026/1/15/us-senate-defeats-war-powers-resolution-designed-to-rein-in-trump
22. Christian Science Monitor, Maduro and Noriega legal comparison (Jan. 5, 2026): https://proof.csmonitor.com/USA/Justice/2026/0105/venezuela-maduro-noriega-trump-legal
23. OPB/AP, Trump confirms CIA covert operations in Venezuela (Oct. 16, 2025): https://www.opb.org/article/2025/10/16/trump-confirms-the-cia-is-conducting-covert-operations-inside-venezuela/
24. Sen. Kaine, repeal of the 1991 and 2002 AUMFs signed into law (Dec. 18, 2025): https://www.kaine.senate.gov/press-releases/kaine-and-young-applaud-bipartisan-bill-to-formally-end-iraq-wars-becoming-law
25. Attorney General Holder, Northwestern speech (Mar. 5, 2012), text via Opinio Juris: https://opiniojuris.org/2012/03/05/ag-holders-national-security-speech-text/
26. U.S. Senate, the Church Committee: https://www.senate.gov/about/powers-procedures/investigations/church-committee.htm
27. National Archives, Executive Order 10730 (1957): https://www.archives.gov/milestone-documents/executive-order-10730
28. Proclamation 6427 (May 1, 1992), 106 Stat. 5261: https://www.govinfo.gov/content/pkg/STATUTE-106/pdf/STATUTE-106-Pg5261.pdf
29. Executive Order 14333, Declaring a Crime Emergency in the District of Columbia (Aug. 11, 2025), public inspection: https://public-inspection.federalregister.gov/2025-15550.pdf
30. NSPM-7, Countering Domestic Terrorism and Organized Political Violence (Sept. 25, 2025): https://www.whitehouse.gov/presidential-actions/2025/09/countering-domestic-terrorism-and-organized-political-violence/
31. Lieber Institute, Dual-Use Objects and Dual-Purpose Attacks (on DoD Law of War Manual §5.6): https://lieber.westpoint.edu/dual-use-objects-dual-purpose-attacks/
32. Task & Purpose, National Guard in Memphis and Louisiana (2025): https://taskandpurpose.com/news/national-guard-memphis-louisiana/
