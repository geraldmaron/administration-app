# National Security and Intelligence: Structural Facts

Research note. Dated 2026-09-01. No code changes accompany it.

Purpose: verify, against primary sources, the structural facts a later phase would
have to implement for national security and intelligence, and record what the
engine already models so that nothing working gets rebuilt.

Source classes used below:
- **Statute**: U.S. Code, retrieved from the Office of Law Revision Counsel (uscode.house.gov).
- **Executive order**: Federal Register text retrieved from govinfo.gov, plus the
  National Archives codification of the original order.
- **CRS**: Congressional Research Service products retrieved from congress.gov.
- **IC primary**: a declassified Intelligence Community Assessment retrieved from
  intelligence.senate.gov.
- `[unverified]` marks anything the note could not open. Nothing is cited that was
  not opened; where a primary host refused automated retrieval, that is stated.

---

## 1. What the game already models for military force

This is the existing simulation of armed force. It works, it is tested, and none of
it should be replaced by a defense or intelligence phase. A later phase adds
institutions on top of it.

### 1.1 The instrument ladder

`packages/engine/src/instruments.ts`

- Five instruments, five rungs each: `InstrumentId` at instruments.ts:41
  (`diplomatic`, `economic`, `covert`, `military`, `assistance`), `RungLevel` at
  instruments.ts:50.
- Coercion ordering shared by every reader (NPC agent, counsel pricing, pursuit
  classification): `INSTRUMENT_COERCION` at instruments.ts:62, military at 1.0,
  covert at 0.75.
- Military rungs: `militaryRungs` at instruments.ts:658. Exercises (instruments.ts:663),
  Forward Deploy (instruments.ts:671), Blockade (instruments.ts:698), Limited Strike
  (instruments.ts:723), Expeditionary Invasion (instruments.ts:751).
- Covert rungs: `covertRungs` at instruments.ts:374, with reach gated by
  `covertReach` (instruments.ts:368) and spending intelligence capability through
  `spendsTradecraft` (instruments.ts:452).
- Every rung is a `gate` plus a `resolve` (`InstrumentRung`, instruments.ts:81), so a
  refusal is a named missing capability rather than a hidden failure.

### 1.2 Force projection, readiness, order of battle

- Distance gate: `PROJECTION_CAPS` (instruments.ts:510) and `projectionAccess`
  (instruments.ts:512). Rung 5 needs airlift plus sealift above a floor
  (instruments.ts:751 gate body).
- Readiness gate and bill: `forceAvailable` (instruments.ts:528),
  `spendsReadiness` (instruments.ts:548).
- Readiness economy: `MILITARY_READINESS_COST` (capacity.ts:53, 0.05/0.08/0.15 for
  rungs 3/4/5), `MILITARY_READINESS_GATES` (capacity.ts:68, 0.3/0.45/0.6),
  `READINESS_RECOVERY_PER_TURN` (capacity.ts:50, 0.02 per week),
  `readinessAnchor` (capacity.ts:33), `readinessCeiling` (capacity.ts:213),
  `capacityPhase` (capacity.ts:281).
- Intelligence capacity on the same machinery: `COVERT_CAPABILITY_COST`
  (capacity.ts:232), `INTEL_RECOVERY_PER_TURN` (capacity.ts:237).
- Formations actually available: `availableUnits` (capacity.ts:104),
  `availableUnitsOfType` (capacity.ts:126), `committedUnits` (capacity.ts:148),
  `commitmentDrag` (capacity.ts:199), enforced at the gate by
  `formationsAvailable` (instruments.ts:589) and `packageFormations`
  (instruments.ts:563).

### 1.3 Standing commitments

`packages/engine/src/commitments.ts`

- A rung that puts forces somewhere opens a durable commitment:
  `standingCommitment` (instruments.ts:473), `packageCommitment` (instruments.ts:595),
  `openCommitment` (commitments.ts:99), refused when the order of battle cannot
  supply it (`forceShortfall`, commitments.ts:211).
- Weekly cost and lapse handling: `commitmentPhase` (commitments.ts:438),
  `commitmentWeeklyCost` (commitments.ts:537), `lapseGrudge` (commitments.ts:372).
- Early withdrawal is remembered: `setCommitmentStatus` (commitments.ts:242),
  `withdrawalGrudge` (commitments.ts:303), `releaseWarCommitments` (commitments.ts:515).

### 1.4 Wars as running state

`packages/engine/src/conflicts.ts`

- Conflicts open, escalate, and settle: `openConflict` (conflicts.ts:56),
  `openOrEscalate` (conflicts.ts:78), `escalate` (conflicts.ts:90),
  `settleByAgreement` (conflicts.ts:130), `deescalateConflict` (conflicts.ts:345),
  `CONFLICT_MOVES` (conflicts.ts:111).
- Third parties join with their own capability check and price: `joinConflict`
  (conflicts.ts:269), `selectJoinableConflicts` (conflicts.ts:232), `joinCost`
  (conflicts.ts:261).
- Weekly attrition, allies, world opinion, terminal states: `conflictPhase`
  (conflicts.ts:806), `strengthRatio` (conflicts.ts:533), `terminalState`
  (conflicts.ts:675).
- Nuclear deterrence is shown as information rather than a locked door:
  `assessDeterrence` (conflicts.ts:368).
- Pre-decision projection of what an act does to the war ledger:
  `projectConflictConsequence` (conflicts.ts:433).
- Command quality reads the defense minister's competence and loyalty, and a vacant
  ministry degrades it: `commandQuality` (conflicts.ts:506), `VACANT_MINISTRY_COMMAND`
  (conflicts.ts:503).

### 1.5 The constitutional half, already present

- `warPowers` gate (instruments.ts:631) and `warPowersRecord` (instruments.ts:652),
  applied only to the player's own government.
- `warPowersStanding` (congress.ts:244), `MAJOR_FORCE_RUNGS` = rungs 4 and 5
  (congress.ts:213), `WAR_POWERS_WINDOW_TURNS = 9` weeks, chosen as sixty days in
  weeks (congress.ts:224).
- Unilateral action is recorded and priced: `recordUnilateralForce` (congress.ts:289),
  `UNILATERAL_FORCE_COST` (congress.ts:277), `UNILATERAL_DISPOSITION_COST`
  (congress.ts:287), which makes the next authorization vote harder.
- Who must be consulted per instrument and rung: `CONSULTATION` (instruments.ts:1104),
  `consultationFor` (instruments.ts:1142). Military rungs 3 and 4 already name
  congressional leadership under the War Powers Resolution; rung 5 names Congress.
  Covert rung 3 already names notification of the intelligence committees and rung 4
  names leadership before the secret order is signed.
- What a rung costs the establishment, quoted as weeks: `capacityCost`
  (instruments.ts:1061).

**Reading.** The engine already has force projection, readiness as a rate, order of
battle, standing commitments, running wars, deterrence information, a war powers
clock, and a consultation table. What it does not have is institutions: no combatant
commands, no chain of command below the president, no intelligence community with
distinct elements, no finished intelligence product, and no covert action finding as
an object. Those are the additions a later phase would make, and each one should
attach to the machinery above rather than duplicate it.

---

## 2. Unified combatant commands

**Count: eleven.** Confirmed current as of a CRS product updated 2026-02-05:
"U.S. European Command (USEUCOM, commonly referred to as EUCOM) is one of 11
combatant commands (CCMDs) within the Department of Defense (DOD, which is 'using a
secondary Department of War designation,' under Executive Order 14347 dated
September 5, 2025)."
Source: CRS, *Defense Primer: U.S. European Command (EUCOM)*, IF11130, updated
February 5, 2026, https://www.congress.gov/crs_external_products/IF/PDF/IF11130/IF11130.6.pdf

The enumeration and the geographic/functional split come from CRS, *Defense Primer:
Commanding U.S. Military Operations*, IF10542, updated December 6, 2022,
https://www.congress.gov/crs_external_products/IF/PDF/IF10542/IF10542.12.pdf
That product states: "There are currently eleven Combatant Commands," seven
"regionally focused" and four "functional."

### 2.1 Geographic commands (seven)

| Command | Area of responsibility (CRS wording) | Headquarters |
|---|---|---|
| U.S. Africa Command (USAFRICOM) | "sub-Saharan Africa" | Kelley Barracks, Stuttgart, Germany |
| U.S. European Command (USEUCOM) | "all of Europe, large portions of Central Asia, parts of the Middle East, and the Arctic and Atlantic Oceans"; the 2026 primer states the AOR "spans Europe, the Caucasus, Russia, and Iceland, encompassing 50 countries and territories" | Patch Barracks, Stuttgart, Germany |
| U.S. Central Command (USCENTCOM) | "most of the Middle East, parts of Northern Africa and west Asia, and part of the Indian Ocean" | MacDill AFB, FL |
| U.S. Northern Command (USNORTHCOM) | "the defense of the continental United States and coordination of security and military relationships with Canada and Mexico" | Peterson AFB, CO |
| U.S. Southern Command (USSOUTHCOM) | "Central America, South America, and the Caribbean" | Miami, FL |
| U.S. Indo-Pacific Command (USINDOPACOM) | "the Pacific Ocean, Southwest Asia, Australia, south Asia, and part of the Indian Ocean," sharing Alaska with NORTHCOM | Camp H.M. Smith, HI |
| U.S. Space Command (USSPACECOM) | "provides space combat power for the Joint/Combined force and develops joint warfighters in, from, and through the space domain" | Peterson AFB, CO (per the 2022 primer) |

AOR boundaries move by decision, not by geography. The 2026 EUCOM primer records
three: Africa left EUCOM in 2008 when AFRICOM stood up, Israel moved to CENTCOM in
2021, and Greenland moved to NORTHCOM in June 2025. A game that models AORs should
treat the map as an artifact of a document a president can change, which is exactly
what the Unified Command Plan is.

[unverified] USSPACECOM headquarters location after 2025 announcements. The 2022 CRS
primer says Peterson AFB; later reporting on a move was not opened for this note.

### 2.2 Functional commands (four)

| Command | Function (CRS wording) | Headquarters |
|---|---|---|
| U.S. Strategic Command (USSTRATCOM) | "deterring attacks on the United States and its allies and directing the use of U.S. strategic forces" | Offutt AFB, NE |
| U.S. Special Operations Command (USSOCOM) | "special forces, counter-paramilitary, counter-narcotics, guerilla, psychological warfare, civil education, and insurgency capabilities" | MacDill AFB, FL |
| U.S. Transportation Command (USTRANSCOM) | "air, land and sea transportation to different components of DOD" | Scott AFB, IL |
| U.S. Cyber Command (USCYBERCOM) | "directs, synchronizes, and coordinates cyberspace planning and operations to defend and advance national interests" | Fort George G. Meade, MD |

### 2.3 The Unified Command Plan

CRS IF10542: "The UCP is a classified executive branch document that articulates how
DOD assigns responsibility for different missions and areas of the world. It is
prepared by the Chairman of the Joint Chiefs of Staff every two years and approved by
the President." The same product notes Congress "is not included in this review
process but does have visibility into issues affecting UCP development."

Statutory frame, per CRS IF10542 and confirmed against the U.S. Code below:
10 U.S.C. sections 161 through 167b. Section 161 establishment, 162 chain of command
and assignment of forces, 163 role of the Chairman, 164 powers and duties of
combatant commanders, 165 administration and support, 166 and 166a budget, 167
special operations, 167b cyber.

### 2.4 Assigned versus allocated forces

**Assigned.** 10 U.S.C. 162(a), opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title10-section162&num=0&edition=prelim
The Secretary of Defense directs the military department secretaries to assign
specified forces under their jurisdiction to unified and specified combatant
commands. Forces not so assigned remain with their military departments for
departmental responsibilities. Transfers of assigned forces require Secretary of
Defense authorization and procedures prescribed by the Secretary and approved by the
President. Forces assigned to a unified combatant command operate under the command
of that commander.

CRS IF10542 describes a COCOM as "composed of significant assigned components of two
or more military departments," and describes service component commands as units that
"belong to a particular military service but are assigned to a Combatant Commander."

**Allocated.** Allocation is the temporary redistribution of forces among combatant
commands by the Secretary of Defense, published in the annual Global Force Management
Allocation Plan. [unverified] The governing manual (CJCSM 3130.06 series) and DoD
Directive 5100.01 both refused automated retrieval from jcs.mil and esd.whs.mil for
this note, so the GFM process detail beyond 10 U.S.C. 162(a) is not sourced here.

**Design consequence.** The distinction the game must respect is the one section
162(a) makes on its own: a combatant commander commands what has been assigned, and
moving forces between commands is a Secretary of Defense act under procedures the
President approved. A commander cannot help himself to another command's forces.

### 2.5 What a combatant commander can and cannot do

From 10 U.S.C. 164, opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title10-section164&num=0&edition=prelim

Can, inside the mission assigned:
- "giving authoritative direction to subordinate commands and forces necessary to
  carry out missions assigned to the command"
- "organizing commands and forces within that command as he considers necessary"
- "employing forces within that command as he considers necessary"
- "assigning command functions to subordinate commanders"
- "coordinating and approving those aspects of administration and support ...
  necessary to carry out missions"
- selecting subordinate commanders and combatant command staff, suspending
  subordinates, and convening courts-martial

Cannot, without the Secretary of Defense or the President:
- Act outside the missions assigned. Section 164(b): "The commander of a combatant
  command is responsible to the President and to the Secretary of Defense for the
  performance of missions assigned to that command," and "performs his duties under
  the authority, direction, and control of the Secretary of Defense."
- Receive or transfer forces not assigned to the command (section 162(a)).
- Change the command's area of responsibility or mission, which is a Unified Command
  Plan matter prepared by the Chairman and approved by the President.
- Initiate the use of force outside what the President and Secretary of Defense have
  ordered. Every execute order runs down the chain in section 162(b).

**Design consequence.** In a game the combatant commander is an executor with real
discretion inside a mission and none over whether the mission exists. Treating a
combatant commander as a source of policy would invert the statute.

---

## 3. The chain of command: President, Secretary of Defense, combatant commander

**Statute.** 10 U.S.C. 162(b), opened at uscode.house.gov: "the chain of command to a
unified or specified combatant command runs from the President to the Secretary of
Defense; and from the Secretary of Defense to the commander," subject only to
exceptions the President directs.

Corroborated by CRS IF10542: "Title 10 U.S.C. section 162 specifies that the chain of
command for military operations goes from the President, to the Secretary of Defense,
to Commanders of Combatant Commands."

**The Joint Chiefs are advisory and are not in the operational chain. This is sourced.**

- 10 U.S.C. 151(b), opened at uscode.house.gov: "The Chairman of the Joint Chiefs of
  Staff is the principal military adviser to the President, the National Security
  Council, the Homeland Security Council, and the Secretary of Defense." The other
  members are "military advisers" to the same principals.
- 10 U.S.C. 152(c), opened at uscode.house.gov, quoted verbatim: "The Chairman, while
  so serving, holds the grade of general or, in the case of the Navy, admiral, and
  outranks all other officers of the armed forces. However, he may not exercise
  military command over the Joint Chiefs of Staff or any of the armed forces."
- 10 U.S.C. 163(a), opened at uscode.house.gov: the President may direct that
  communications between the President or the Secretary of Defense and combatant
  commanders "be transmitted through the Chairman," and may assign the Chairman
  duties to assist the President and the Secretary in performing their command
  function. Transmitting is not commanding.
- CRS IF10542: "The Chairman of the Joint Chiefs of Staff acts as an intermediary,
  transmitting orders between the Secretary of Defense and the Commanders of
  Combatant Commands," and on the 1947 design, "a Chairman serving as an advisory body
  only. As a corporate body, the JCS was specifically not designed to exercise
  command; the Chairman of the Joint Chiefs of Staff (CJCS) had no command authority."
- Composition, 10 U.S.C. 151(a): Chairman, Vice Chairman, Chief of Staff of the Army,
  Chief of Naval Operations, Chief of Staff of the Air Force, Commandant of the Marine
  Corps, Chief of the National Guard Bureau, Chief of Space Operations.

**Mission requirement.** In the game, an order to use force must pass from the
president through the Secretary of Defense to a combatant commander. The Chairman may
carry it, advise on it, and dissent from it in the advice given, but the Chairman
never issues it and never refuses it as a commander. A design in which the player
"orders the Joint Chiefs" to execute an operation is factually wrong. A design in
which the Chairman's advice is on the record, is sometimes at odds with the
Secretary's, and is remembered afterward is factually right, and 10 U.S.C. 151(d)
supports it: a member may submit advice or an opinion in disagreement with the
Chairman's, which the Chairman must present at the same time.

---

## 4. War Powers Resolution: the actual clocks

Statutory citation: 50 U.S.C. chapter 33, sections 1541 to 1548 (Public Law 93-148).

### 4.1 The 48-hour report

50 U.S.C. 1543(a), opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section1543&num=0&edition=prelim

Trigger: in the absence of a declaration of war, the President must submit a written
report within 48 hours to the Speaker of the House and the President pro tempore of
the Senate whenever United States Armed Forces are introduced:

1. "into hostilities or into situations where imminent involvement in hostilities is
   clearly indicated";
2. "into the territory, airspace or waters of a foreign nation, while equipped for
   combat," excluding deployments solely for supply, replacement, repair, or training;
3. "in numbers which substantially enlarge United States Armed Forces equipped for
   combat already located in a foreign nation."

Content: the circumstances necessitating the introduction, the constitutional and
legislative authority relied on, and the estimated scope and duration.

Follow-on reporting, 50 U.S.C. 1543(c): while forces remain engaged, the President
reports periodically, and "in no event shall he report to the Congress less often
than once every six months."

### 4.2 The 60-day termination clock and the 30-day extension

50 U.S.C. 1544(b), opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section1544&num=0&edition=prelim

Trigger: the clock runs from the submission of a report under 1543(a)(1), **or from
the date such a report was required to be submitted**. That second branch matters:
declining to file does not stop the clock.

"Within sixty calendar days after a report is submitted or is required to be
submitted ... the President shall terminate any use of United States Armed Forces"
unless Congress (i) has declared war or enacted a specific authorization for that use
of force, (ii) has extended the sixty-day period by law, or (iii) is physically unable
to meet as a result of an armed attack upon the United States.

Extension: the sixty days extends by not more than thirty additional days if the
President determines and certifies to Congress in writing that "unavoidable military
necessity respecting the safety of United States Armed Forces requires the continued
use" of force in bringing about their removal. Maximum without a vote: ninety days.

Concurrent resolution, 50 U.S.C. 1544(c): forces engaged in hostilities abroad without
a declaration of war or statutory authorization "shall be removed by the President if
the Congress so directs by concurrent resolution."

### 4.3 What the engine already does with this, and what a later phase should add

`warPowersStanding` (congress.ts:244) models the sixty days as nine weeks
(`WAR_POWERS_WINDOW_TURNS`, congress.ts:224) and gates rungs 4 and 5. That is a fair
compression. Two facts are available to a later phase and are not yet modeled:

- The 48-hour report is a separate, earlier obligation from the 60-day clock, and its
  content (authority claimed, scope, duration) is exactly the sort of thing that can
  be honest or evasive.
- The clock starts when a report was **required**, not when it was filed. A president
  who does not report is not buying time.

[unverified] The constitutional status of the 1544(c) concurrent resolution mechanism
after *INS v. Chadha* is a contested legal question this note did not research. The
statutory text quoted above stands as enacted.

---

## 5. The 18-element Intelligence Community

Statutory definition: 50 U.S.C. 3003(4), opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section3003&num=0&edition=prelim
It names ODNI, CIA, NSA, DIA, NGA, NRO, other specialized reconnaissance offices
within DoD, the intelligence elements of the Army, Navy, Air Force, Marine Corps,
Space Force, Coast Guard, FBI, DEA and DOE, State's Bureau of Intelligence and
Research, Treasury's Office of Intelligence and Analysis, DHS's Office of Intelligence
and Analysis, and such other elements as the President or the DNI with the department
head may designate.

The enumeration to 18 named elements, with parent departments, is taken from CRS,
*Defense Primer: National and Defense Intelligence*, IF10525, updated November 29,
2022, https://www.congress.gov/crs_external_products/IF/PDF/IF10525/IF10525.12.pdf
which sources its table to "50 U.S. Code section 3003(4); ODNI" and states: "The IC is
composed of 18 elements, 2 of which are independent, and 16 of which are component
organizations of six separate departments of the federal government."

Note on sourcing: ODNI's own pages (odni.gov, dni.gov, intelligence.gov, intel.gov)
returned HTTP 403 to every automated retrieval attempted for this note. The CRS table
below is the opened source; it is the statutory list restated by Congress's own
research service.

**Count verified: 18.**

| # | Element | Parent | Primary discipline | Statutory or executive boundary |
|---|---|---|---|---|
| 1 | Office of the Director of National Intelligence (ODNI) | Independent | Integration, standards, budget | 50 U.S.C. 3024: heads the IC, provides national intelligence "timely, objective, independent of political considerations, and based upon all sources available." EO 12333 section 1.7(j) limits ODNI's own collection to overt or publicly available sources. |
| 2 | Central Intelligence Agency (CIA) | Independent | Human intelligence, all-source analysis, covert action | 50 U.S.C. 3036(d)(1): "no police, subpoena, or law enforcement powers or internal security functions." EO 12333 1.7(a)(2): counterintelligence "without assuming or performing any internal security functions within the United States." |
| 3 | Defense Intelligence Agency (DIA) | Defense | Foreign military intelligence, defense HUMINT, attachés | EO 12333 1.7(b): collect and produce defense and defense-related intelligence for the Secretary of Defense, the Chairman, combatant commanders, other Defense components and non-Defense agencies; manages the Defense Attaché system. |
| 4 | National Security Agency (NSA) | Defense | Signals intelligence, cryptology, information assurance | EO 12333 1.7(c)(2): operates the unified organization for SIGINT, and "No other department or agency may engage in signals intelligence activities except pursuant to a delegation by the Secretary of Defense, after coordination with the Director." |
| 5 | National Geospatial-Intelligence Agency (NGA) | Defense | Geospatial intelligence | CRS IF10525: "produces geospatial intelligence products and services in support of policymakers, warfighters, other intelligence agencies, and first responders." |
| 6 | National Reconnaissance Office (NRO) | Defense | Overhead collection systems | EO 12333 1.7(d): research, development, acquisition, launch, deployment and operation of overhead systems; it builds and operates, it does not produce finished analysis. |
| 7 | U.S. Air Force Intelligence, Surveillance and Reconnaissance (AF/A2) | Defense | Service intelligence, air and ISR | Service element under EO 12333 section 1.7 and DoD control; MIP-funded tactical and operational focus. |
| 8 | U.S. Space Force Intelligence (S-2) | Defense | Service intelligence, space domain | As above. |
| 9 | U.S. Army Intelligence (G-2) | Defense | Service intelligence, land | As above. |
| 10 | U.S. Marine Corps Intelligence, Surveillance and Reconnaissance Enterprise (MCISR-E) | Defense | Service intelligence, expeditionary | As above. |
| 11 | U.S. Naval Intelligence (N2) | Defense | Service intelligence, maritime | As above. |
| 12 | FBI Intelligence Branch | Justice | Domestic counterintelligence, national security investigations | EO 12333 1.7(g): FBI intelligence elements act "under the supervision of the Attorney General and pursuant to such regulations as the Attorney General may establish," collecting foreign intelligence and counterintelligence "in accordance with procedural guidelines approved by the Attorney General." |
| 13 | DEA Office of National Security Intelligence (DEA/ONSI) | Justice | Narcotics-related national security intelligence | EO 12333 1.7(i): collects "overtly or through publicly available sources." |
| 14 | DHS Office of Intelligence and Analysis (I&A) | Homeland Security | Homeland threat analysis | EO 12333 1.7(i): overt or publicly available collection. |
| 15 | U.S. Coast Guard Intelligence (CG-2) | Homeland Security | Maritime intelligence and counterintelligence | EO 12333 1.7(h), with DoD provisions applying when operating as part of the Department of Defense. |
| 16 | Department of State, Bureau of Intelligence and Research (INR) | State | All-source analysis for diplomacy | EO 12333 1.7(i): overt or publicly available collection; INR analyzes, it does not run collection. |
| 17 | Department of the Treasury, Office of Intelligence and Analysis (OIA) | Treasury | Financial intelligence | EO 12333 1.7(i): overt or publicly available collection. |
| 18 | Department of Energy, Office of Intelligence and Counterintelligence (I&CI) | Energy | Nuclear and energy intelligence | EO 12333 1.7(i): overt or publicly available collection. |

Executive order text above is from Executive Order 13470 (August 4, 2008), which
amends EO 12333, opened as the Federal Register document at
https://www.govinfo.gov/content/pkg/FR-2008-08-04/pdf/E8-17940.pdf
Section 2.11 is unchanged from the 1981 order as codified by the National Archives,
https://www.archives.gov/federal-register/codification/executive-order/12333.html

Funding split, useful if the game ever shows an intelligence budget: CRS IF10525
distinguishes the National Intelligence Program from the Military Intelligence
Program, the latter funding "military service intelligence personnel, their training,
and tactical military intelligence programs and activities."

---

## 6. Boundaries the game must never collapse

Each boundary below is a rule with a citation, followed by the institutional
consequence of crossing it. The consequence is the mission requirement: an attempt to
politicize intelligence or direct an investigation must cost the player something,
and must not unlock a capability.

### 6.1 CIA: foreign intelligence and covert action, never domestic policing

- 50 U.S.C. 3036(d)(1): the Director of the CIA shall "collect intelligence through
  human sources and by other appropriate means, except that the Director of the
  Central Intelligence Agency shall have no police, subpoena, or law enforcement
  powers or internal security functions."
- EO 12333 section 1.7(a)(2): counterintelligence "without assuming or performing any
  internal security functions within the United States."
- EO 12333 section 1.7(a)(4): covert action approved by the President, and "No agency
  except the Central Intelligence Agency (or the Armed Forces of the United States in
  time of war declared by the Congress or during any period covered by a report from
  the President to the Congress consistent with the War Powers Resolution, Public Law
  93-148) may conduct any covert action activity unless the President determines that
  another agency is more likely to achieve a particular objective."

Consequence of an attempt: the request has no lawful executor. The CIA cannot arrest,
subpoena, or investigate an American on the president's say-so, and an order to do it
produces a refusal, a general counsel memorandum, and a reportable matter, not an
operation.

### 6.2 FBI: domestic law enforcement and counterintelligence, under the Attorney General

- 28 U.S.C. 533: the Attorney General may appoint officials "to detect and prosecute
  crimes against the United States," among other functions. Investigative authority is
  the Attorney General's, delegated, not the President's to exercise directly.
- EO 12333 section 1.7(g): FBI intelligence elements operate "under the supervision of
  the Attorney General and pursuant to such regulations as the Attorney General may
  establish," and collect foreign intelligence and counterintelligence "in accordance
  with procedural guidelines approved by the Attorney General."
- 28 U.S.C. 532 and its statutory note (P.L. 90-351 as amended by P.L. 94-503 and
  P.L. 112-24): the Director is appointed by the President by and with the advice and
  consent of the Senate, and "the term of service of the Director of the Federal
  Bureau of Investigation shall be ten years. A Director may not serve more than one
  ten-year term."

Consequence of an attempt: the ten-year term exists precisely because the office was
made hard to churn. A president who directs an investigation is acting through the
Attorney General's chain, on the record, against guidelines that exist in writing.
Firing a director does not produce the investigation; it produces a vacancy, a
confirmation fight, and a documented reason.

### 6.3 NSA: signals intelligence, and nobody else's

- EO 12333 section 1.7(c)(1) and (c)(2): NSA collects, processes, analyzes, produces
  and disseminates signals intelligence "for foreign intelligence and
  counterintelligence purposes," and no other department or agency may engage in
  signals intelligence activities except by delegation from the Secretary of Defense
  after coordination with the DNI.

Consequence of an attempt: a request to point SIGINT at a domestic political target
has no path that does not run through the Attorney General's approved procedures and
the FISA framework. It is not a dial the president turns.

[unverified] The FISA framework itself (50 U.S.C. chapter 36) was not opened for this
note and should be researched before any surveillance mechanic is designed.

### 6.4 DIA: military intelligence for military decisions

- EO 12333 section 1.7(b)(2): DIA collects, analyzes, produces or coordinates
  "defense and defense-related intelligence for the Secretary of Defense, the Chairman
  of the Joint Chiefs of Staff, combatant commanders, other Defense components, and
  non-Defense agencies."
- CRS IF10525: DIA "serves as the nation's primary manager and producer of foreign
  military intelligence."

Consequence: DIA answers a military question. It is the right source for order of
battle and an adversary's capability, and the wrong source for a political judgment
about a domestic opponent.

### 6.5 ODNI: integration, not collection

- 50 U.S.C. 3024(a): the DNI ensures national intelligence reaches the President,
  departments, the military and Congress, and that such intelligence "should be
  timely, objective, independent of political considerations, and based upon all
  sources available."
- EO 12333 section 1.7(j): the DNI collects "overtly or through publicly available
  sources" to support ODNI's own missions, including the National Counterterrorism
  Center.

Consequence: the DNI cannot task a result into existence. The DNI sets standards,
allocates the National Intelligence Program, and integrates. A president leaning on
the DNI to change a judgment is leaning on the one office whose statutory job
description contains the words "independent of political considerations."

### 6.6 Assassination

- EO 12333 section 2.11, from the National Archives codification: "No person employed
  by or acting on behalf of the United States Government shall engage in, or conspire
  to engage in, assassination." Section 2.12 forbids indirect participation, that is,
  requesting another person to do what the order forbids.

Consequence: this is an executive order, so a president can amend it, and amending it
is itself a visible, consequential act rather than a hidden toggle.

### 6.7 What follows from an attempt to politicize intelligence or direct an investigation

These are the institutional mechanisms that actually fire. Each is sourced.

1. **The finding cannot authorize it.** 50 U.S.C. 3093(a): "A finding may not
   authorize any action that would violate the Constitution or any statute of the
   United States," and "No covert action may be conducted which is intended to
   influence United States political processes, public opinion, policies, or media."
   A domestic influence operation is not a hard action in the game; it is an
   unavailable one, and asking for it is itself an event.
2. **The Inspector General of the Intelligence Community.** 50 U.S.C. 3033: an IG
   appointed by the President with Senate confirmation, removable only by the
   President with written notice to Congress at least 30 days in advance and
   "detailed and case-specific reasons." The IG must keep the congressional
   intelligence committees informed of significant problems and deficiencies.
3. **The urgent concern channel.** 50 U.S.C. 3033(k)(5): an employee may report to
   the IG a complaint of urgent concern, defined to include "a serious or flagrant
   problem, abuse, violation of law or Executive order, or deficiency relating to the
   funding, administration, or operation of an intelligence activity" that is a matter
   of national security. The IG makes a credibility determination within 14 calendar
   days and the Director transmits it to the intelligence committees within 7 days.
   The clock is short and it does not run through the White House.
4. **Anti-reprisal.** 50 U.S.C. 3033(g)(3)(A): "no action constituting a reprisal, or
   threat of reprisal, for making such complaint or disclosing such information to the
   Inspector General may be taken by any employee."
5. **Congressional notification is not optional.** 50 U.S.C. 3093(c): findings are
   reported in writing to the congressional intelligence committees, and where prior
   notice was withheld the President "shall fully inform the congressional
   intelligence committees in a timely fashion and shall provide a statement of the
   reasons for not giving prior notice."
6. **Analytic objectivity is a written standard with an owner.** 50 U.S.C. 3024(a)
   requires national intelligence independent of political considerations, and the IC
   maintains analytic standards and an analytic ombuds to receive complaints of
   politicization (see section 8 and its [unverified] note).

**Design rule.** Pressure on intelligence should behave like the war powers machinery
already in the engine: available to take, priced, recorded, and compounding. The
closest existing model is `recordUnilateralForce` (congress.ts:289), where the act is
permitted, the record is permanent, and every instance makes the next authorization
harder. An attempted politicization should produce an analogous durable record, a
disposition cost with the professional workforce and the oversight committees, and a
raised probability of an IG referral or a leak, and it must never increase the quality
or the compliance of the product.

---

## 7. Covert action: findings and notification

Statute: 50 U.S.C. 3093 (section 503 of the National Security Act), opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title50-section3093&num=0&edition=prelim

**Definition, 3093(e).** Covert action means "an activity or activities of the United
States Government to influence political, economic, or military conditions abroad,
where it is intended that the role of the United States Government will not be
apparent or acknowledged publicly." Excluded: intelligence gathering and
counterintelligence, traditional diplomatic or military activities, law enforcement
activities, and routine support to overt activities of other agencies.

**The finding, 3093(a).**
- The President must determine that the action is necessary to support identifiable
  foreign policy objectives and is important to the national security.
- "Each finding shall be in writing, unless immediate action by the United States is
  required and time does not permit the preparation of a written finding, in which
  case a written record of the President's decision shall be contemporaneously made
  and shall be reduced to a written finding as soon as possible but in no event more
  than 48 hours after the decision is made."
- "a finding may not authorize or sanction a covert action, or any aspect of any such
  action, which already has occurred." No retroactive blessing.
- "A finding may not authorize any action that would violate the Constitution or any
  statute of the United States."
- "No covert action may be conducted which is intended to influence United States
  political processes, public opinion, policies, or media."

**Notification, 3093(c).**
- Ordinary case: the finding "shall be reported in writing to the congressional
  intelligence committees as soon as possible after such approval and before the
  initiation of the covert action."
- Restricted case, the Gang of Eight: access may be limited to the chairmen and
  ranking minority members of the two intelligence committees, the Speaker and
  minority leader of the House, and the majority and minority leaders of the Senate.
- Withheld prior notice: the President "shall fully inform the congressional
  intelligence committees in a timely fashion and shall provide a statement of the
  reasons for not giving prior notice."

**Fit with the engine.** The covert ladder already exists (instruments.ts:374) and
already spends a real capacity (capacity.ts:232). The consultation table already
names the intelligence committees at covert rung 3 and leadership "before the secret
order is signed" at rung 4 (instruments.ts:1104). A later phase can promote the
finding to an object with three honest states: written before the act, made
contemporaneously and reduced to writing inside 48 hours, or notified after the fact
with reasons. Each carries a different price with the committees, and none of them is
"nobody found out."

---

## 8. What a finished intelligence assessment carries

Primary source opened: the declassified Intelligence Community Assessment "Assessing
Russian Activities and Intentions in Recent US Elections," 6 January 2017, retrieved
from the Senate Select Committee on Intelligence,
https://www.intelligence.senate.gov/sites/default/files/documents/ICA_2017_01.pdf
Its first annex, "Background ... The Analytic Process and Cyber Incident Attribution,"
states the IC's own description of the tradecraft standards.

Structural elements, in the ICA's own words:

1. **A scope and sourcing caveat.** "The Intelligence Community rarely can publicly
   reveal the full extent of its knowledge or the precise bases for its assessments,"
   and the declassified version "does not and cannot include the full supporting
   information, including specific intelligence and sources and methods."
2. **Source characterization.** The standards include "describing sources (including
   their reliability and access to the information they provide)."
3. **Expressed uncertainty.** "clearly expressing uncertainty."
4. **Separation of information from judgment.** "distinguishing between underlying
   information and analysts' judgments and assumptions."
5. **Alternatives.** "exploring alternatives."
6. **Relevance, logic, and change over time.** "demonstrating relevance to the
   customer, using strong and transparent logic, and explaining change or consistency
   in judgments over time."
7. **Two distinct axes, likelihood and confidence.** "Intelligence Community judgments
   often include two important elements: judgments of how likely it is that something
   has happened or will happen (using terms such as 'likely' or 'unlikely') and
   confidence levels in those judgments (low, moderate, and high) that refer to the
   evidentiary basis, logic and reasoning, and precedents that underpin the
   judgments."
8. **Signaled judgment language.** "When Intelligence Community analysts use words
   such as 'we assess' or 'we judge,' they are conveying an analytic assessment or
   judgment."
9. **Recorded dissent by element.** The body of the same ICA shows the form: on one
   judgment, "All three agencies agree with this judgment. CIA and FBI have high
   confidence in this judgment; NSA has moderate confidence." Dissent and differing
   confidence are attributed to the element, in line, not hidden.
10. **Collection gaps as a stated cause of uncertainty.** "A critical part of the
    analyst's task is to explain uncertainties associated with major judgments based
    on the quantity and quality of the source material, information gaps, and the
    complexity of the issue."

**ICD 203 itself: [unverified].** Intelligence Community Directive 203, *Analytic
Standards*, is the governing document. Every ODNI host for it (dni.gov,
archive.dni.gov, odni.gov, intelligence.gov, intel.gov) returned HTTP 403 to
automated retrieval, and mirrors either returned nothing or are not primary. The
following are therefore recorded as unverified and must be checked against the
directive before implementation:

- The exact enumeration and wording of the five analytic standards and the nine
  analytic tradecraft standards.
- The expressions-of-likelihood table and its percentage bands.
- The revision history (2007, with revisions reported in 2015 and 2023).
- The analytic ombuds provision as worded in the directive.

What is verified above from the ICA annex is sufficient to design the product: an
assessment carries a key judgment, a likelihood word, a separate confidence level with
its reason, characterized sources, named gaps, an alternative hypothesis, and
attributed dissent.

**Design consequence.** An intelligence product in the game should never be a single
truth value. The minimum honest shape is: judgment, likelihood, confidence, what the
confidence rests on, what is missing, who disagrees. That also gives the game its
best mechanism for the politicization theme: pressure does not change the world, it
changes the wording, and the record shows the wording changed.

---

## 9. Senior military appointments and how they differ from civilian PAS

**Senior officer appointments.** 10 U.S.C. 601, opened at
https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title10-section601&num=0&edition=prelim

- The President designates positions of importance and responsibility carrying the
  grade of general, lieutenant general, admiral, or vice admiral, and may assign to
  such a position an officer serving on active duty above colonel (Navy: above
  captain).
- "An officer assigned to any such position has the grade specified for that position
  if he is appointed to that grade by the President, by and with the advice and
  consent of the Senate."
- The grade attaches to the position. When the assignment ends the appointment to that
  grade ordinarily terminates, with limited carry-over periods (transition between
  like positions, hospitalization up to 180 days, awaiting orders up to 60 days,
  retirement).
- "An appointment of an officer under subsection (a) does not vacate the permanent
  grade held by the officer."

**Combatant commanders.** CRS IF10542: "Each Combatant Commander is a four-star Flag
or General Officer, whose appointment is confirmed by the Senate." The 2026 EUCOM
primer records the concrete instance: "The Senate confirmed the current EUCOM
commander, U.S. Air Force General Alexus Grynkewich, in June 2025."

**Chairman of the Joint Chiefs.** 10 U.S.C. 152(c), quoted in section 3, fixes the
grade and the express bar on command. Appointment is by the President with Senate
advice and consent [unverified as to subsection: 10 U.S.C. 152(a) was not separately
opened for this note].

**How this differs from civilian PAS appointments.**

| | Senior military (10 U.S.C. 601) | Civilian PAS (for example the Secretary of Defense, the DNI, the CIA Director, the FBI Director) |
|---|---|---|
| Confirmed by the Senate | Yes | Yes |
| What is confirmed | The officer's appointment to a temporary grade tied to a specific position | The person's appointment to a specific office |
| Career status | The officer keeps a permanent grade and remains a serving officer; the star is the position's | No underlying career status; leaving the office ends the relationship |
| End of tenure | Grade terminates with the assignment, subject to short carry-over windows | Serves at the President's pleasure, except where a statutory term applies |
| Statutory term | None | Sometimes: the FBI Director's ten years, 28 U.S.C. 532 note |
| Removal | Reassignment or relief, an internal military act, plus the loss of the position's grade | Dismissal, a political act, generally visible and immediate |
| Advisory duty | May be required to give personal military advice that differs from the department's position: 10 U.S.C. 151(d) | No equivalent statutory duty to dissent |

**Design consequence.** Relieving a combatant commander and firing a Cabinet
secretary are different acts with different residues. The officer reverts to a
permanent grade and remains in the service, and the relief is read inside the
institution as a professional judgment about the officer or a political one about the
president. The civilian simply leaves, and the seat is empty until the Senate acts.
The engine already models the empty-seat cost on the civilian side
(`VACANT_MINISTRY_COMMAND`, conflicts.ts:503); the military side would need its own
treatment rather than a reuse of that one.

---

## 10. Verification record

**Opened and cited (primary):**
- 10 U.S.C. 151, 152, 162, 163, 164, 601 (uscode.house.gov)
- 28 U.S.C. 532 and note, 533 (uscode.house.gov)
- 50 U.S.C. 1543, 1544 (uscode.house.gov)
- 50 U.S.C. 3003, 3024, 3033, 3036, 3093 (uscode.house.gov)
- Executive Order 13470 amending EO 12333, Federal Register, 4 August 2008 (govinfo.gov)
- EO 12333 as codified, section 2.11 and 2.12 (archives.gov)
- ICA 2017-01, declassified, 6 January 2017 (intelligence.senate.gov)

**Opened and cited (CRS):**
- IF10542, *Defense Primer: Commanding U.S. Military Operations*, updated 6 December 2022
- IF10525, *Defense Primer: National and Defense Intelligence*, updated 29 November 2022
- IF11130, *Defense Primer: U.S. European Command (EUCOM)*, updated 5 February 2026
- R42077, *The Unified Command Plan and Combatant Commands*, updated 3 January 2013
  (opened; superseded on the count, which was nine at the time, and used only to
  confirm that the count changes over time)

**Refused automated retrieval, therefore not cited:**
- war.gov and defense.gov combatant command pages (HTTP 403)
- odni.gov, dni.gov, archive.dni.gov, intelligence.gov, intel.gov, including ICD 203
  (HTTP 403)
- jcs.mil doctrine and CJCSM 3130.06E (HTTP 403)
- esd.whs.mil, DoD Directive 5100.01 (HTTP 403)
- federalregister.gov (redirect to an interstitial)

**Marked [unverified] in the body:**
- USSPACECOM headquarters location after 2025
- Global Force Management allocation process beyond 10 U.S.C. 162(a)
- The constitutional status of 50 U.S.C. 1544(c) after *INS v. Chadha*
- ICD 203's exact standards, likelihood table, revision history and ombuds wording
- FISA (50 U.S.C. chapter 36), not researched
- 10 U.S.C. 152(a) on the Chairman's appointment, not separately opened

**Live question for the implementation phase.** The combatant command structure is
under active political pressure. A restructuring proposal reported in 2025 would cut
the commands from eleven to eight; Congress limited funding for geographic combatant
command consolidation in December 2025 (P.L. 119-60 section 916, per CRS IF11130,
February 2026). The count of eleven is correct as of that CRS product and should be
re-checked before it is baked into content.
