# Appointments: one way to fill an open seat, with a pool that fits the seat

Plan, 2026-10-13. Branch `codex/simulation-depth-completion`. Read-only apart from this file: no source was changed, nothing was built, and no workspace tests, verify sweeps or Playwright were run (an integration pass was running in the tree). Every number below comes from source read this session or from two probes run one at a time against the committed `dist/` (`scripts/fixtures/_campaign.mjs` `foundFixture`, seed text `appointments-probe`). The probes were scratch scripts and are not committed; §3.4 says what they did so they can be rerun.

Labels: **Fact** is observed in source or probe output this session. **Inference** is my reading of facts. **Recommendation** is what I propose. A statute or practice I recall but did not open a primary source for is marked **unverified**, and must be sourced before it ships (DECISIONS §4.11, `docs/DECISIONS.md:190`).

## 0. Summary

**The owner's question.** "Is there a way to easily fill open roles, whether courts or other appointments?" Partly. Oversight → Appointments sends one name up for every open chair in one act, but the player cannot change any of the names, the same chair can be filled by two different processes depending on which screen you use, and the people the batch picks are often wrong for the seat: an economist with no law career for Chief Justice, the same 83-year-old engineer for the FDA, the CDC, the NIH and the EPA, a civilian physician for Chairman of the Joint Chiefs.

**Recommendation.** One appointments desk and one per-seat row:

1. **One engine path.** Every Senate-confirmed seat is filled through `openNomination` and the nomination pipeline. The cabinet's same-day `appointMinister` vote is retired as a second path for the same chair.
2. **One candidate pool function per office** that applies hard eligibility rules, then ranks by relevance to the seat (career and study in the seat's field, fit with the President, the Senate's count, tenure for life seats, home circuit for circuit seats), and returns the reasons it used. Where the cast is too thin to offer a credible shortlist, a seeded generator fills the bench once, when the vacancy opens, never in a selector.
3. **One desk** listing every open seat across the cabinet, agencies, regulators and both court levels. Each seat has its best-fit nominee preselected, can be overridden from its candidate list, and the whole set goes through one presidential review.
4. **The same seat row reused where a vacancy is noticed**: the office page, the Courts Nominations tab, and a door from the Brief's vacancy rows. No other fill path remains.

**Verdict: accepted with controls.** The controls are (a) the pool slice lands and is measured by probe across several seeds before any UI is built, (b) a Supreme Court seat is never preselected in a batch (owner question Q2), and (c) a generated bench is created once per vacancy and stored, so waiting never conjures a better candidate.

**Top risks.** (1) Easy filling turns a presidential decision into a chore the game plays for you. (2) The relevance score becomes a hidden number the player cannot see or argue with. (3) A generator that refreshes on demand lets the player reroll the bench. (4) Moving the cabinet onto the pipeline changes pacing and the balance numbers.

**Next actions.** Owner answers §8. Then slice A1 (pool and reasons, engine only) with its probe, then A2 (one path), then A3 and A4 (player-core desk, web), each in §7.

## 1. What the owner asked, read closely

- **Primary outcome:** filling open seats is fast, and the default choice for each seat is one a reasonable President would make.
- **Explicit constraints:** courts and other appointments together; one unified plan; decide the surfaces where filling is needed; make each seat's candidate pool relevant.
- **Constraints from earlier owner direction:** analysis inline on the screen where the choice is made, one shared pattern, no duplicate paths (memory notes `analysis-inline-not-separate-screens`, `choices-as-results-list-not-table`; `docs/DESIGN.md:201` Compare and authorize). Phone and desktop have task parity (`CLAUDE.md`).
- **Constraint from the rules:** a nomination is the President's decision even when its execution is delegated (DECISIONS §3.6, `docs/DECISIONS.md:133-135`). A preselected batch is acceptable only because the President reviews and signs it.

## 2. Inventory of appointable seats

Facts, from source and the first probe. "Senate" means the office carries `confirmingChamber: "senate"` in the catalog. The catalog has 76 bodies (`INSTITUTION_CATALOG`, probe) plus 179 circuit seats (`CIRCUIT_SEAT_DEFS`, `packages/engine/src/lower-bench.ts:83`; probe count).

| Seat type | Count | Where a vacancy arises | How it is filled today | Screen | Senate | Acting holder |
|---|---|---|---|---|---|---|
| Cabinet secretary (15 departments) and DNI | 16 chairs | Dismissal (`dismissMinister`, `packages/engine/src/appointments.ts:243`), resignation and departure (`vacates`, `:651`), founding picks the Senate did not confirm on day one (`packages/engine/src/founding-confirmations.ts`) | **Two paths.** Office page → `appointMinister` (`appointments.ts:409`), a same-day floor count that seats or rejects at once (`apps/web/src/washington/executive/ChairActs.tsx:58-68`). Oversight batch → `fillVacantOffices` → `openNomination` (`packages/engine/src/nomination.ts:368`, `:435`), the months-long pipeline. Probe 2: a dismissed Treasury Secretary's chair appears on the Oversight board and the batch names Clifford Gordon for it | `/washington/office/:id`, `/washington/oversight?view=appointments` | Yes | Yes. `vacates` seats the chair's strongest free bench name as acting the same day (`appointments.ts:651-666`, `deputyFor` `:635`); 210-day limit (catalog) |
| Deputy secretary (15) | 15 offices | No runtime record of its own. `chairHolder` treats a deputy's office as always empty (`nomination.ts:392`) | Only by `openNomination` from a cabinet agenda proposal (`packages/engine/src/cabinet-agenda-acts.ts:175`) or a conversation report action (`conversation-report-actions.ts:112`). Not on the vacancy board (`vacancyBoard` reads only `offices[0]`, `packages/player-core/src/oversight/appointments-pipeline.ts:52`) | None directly | Yes | Statutory succession (catalog) |
| Agency, bureau and EOP heads below the cabinet (OMB, USTR, EPA, CIA, FBI, CBP, ICE, TSA, FEMA, CISA, CDC, FDA, CMS, NIH, BIS, NOAA, IRS, DEA, ATF, USMS, INR, OIA, DHS-IA, NCTC, service secretaries, Joint Chiefs) | 28 Senate-confirmed (catalog) | Seated at founding from `role-agency-head` people (`packages/engine/src/career-incumbents.ts`); at founding four were open with actings (probe 1: OMB, USTR, EPA, DCIA). Removal (`removeOfficer`, `career-incumbents.ts:270`) | Oversight batch only, no per-seat choice (`apps/web/src/washington/oversight/Vacancies.tsx:51-102`) | `/washington/oversight?view=appointments`; office page offers acting only for non-cabinet bodies (`ChairActs.tsx:30-35`, `:118`) | Yes | Vacancies Act, 210 days, for most; FBI and CIA by statutory succession (catalog) |
| President-appointed, no Senate (Secret Service, OFAC, NSA, DIA, NGA, NRO, NCSC heads) | 7 (catalog, class `PA`) | Removal | Batch would open a Senate nomination for an office with no confirming chamber (inference from `openNomination`, which does not read `confirmingChamber`; not probed) | Oversight batch | No | None (`actingAuthority: "none"`) |
| Independent regulators (Fed chair and governors, SEC, FTC, FCC, CFPB, CFTC, FDIC, NRC, NLRB) | 9 bodies; Fed governors 7 seats | Only by removal for cause. **No term expiry ever empties a seat**: `selectSeatCalendar` computes when terms end (`packages/engine/src/seat-calendar.ts:35`) but nothing vacates on that day (searched: only readers in `nomination.ts` and `player-core/src/government/seat-calendar.ts`). The Fed chair is `term-protected` and never removable, so it never opens. These bodies are not vacant at founding (`foundingInstitutions` marks only `PAS`/`PA` tops vacant, `packages/engine/src/institutions.ts:255-272`) | Oversight batch if one opens | Oversight | Yes | Board quorum (none) except CFPB |
| Supreme Court (9 seats; seat 1 is the Chief Justice) | 9 | Seeded yearly death and retirement draw (`judicialVacancyPhase`, `packages/engine/src/judicial-vacancies.ts:43`) | **Two paths.** Courts → Nominations, per-seat radio choice from a competence-ranked list (`apps/web/src/washington/courts/Nominations.tsx:20-58`, `packages/player-core/src/judiciary/judicial-nominations.ts:84`). Oversight batch also includes it: probe 2 vacated seat 1 and the batch sent "Chief Justice of the United States → Gary McGuire" | `/washington/courts?view=nominations`, Oversight | Yes (Judiciary) | None |
| Courts of appeals (179 seats) | 179, all occupied at founding (probe 1) | Same yearly draw (`judicial-vacancies.ts:50-80`) | Oversight batch only; the Courts screen shows a summary and a door to Oversight (`apps/web/src/washington/courts/CourtsScreen.tsx:17-28`) | Oversight | Yes | None |
| District judges | 0 seats | Not modeled as seats; districts are aggregate sourced benches (BL-123, `docs/BACKLOG.md:451`) | Not fillable | None | — | — |
| U.S. attorneys, ambassadors | 0 seats | Not modeled. "Ambassador" appears only as an instrument (`Recall Ambassador`, `packages/engine/src/instruments.ts:85`) and in prose | Not fillable | None | — | — |
| Inspectors general (every top-level executive body) | One per body in `INSPECTED_INSTITUTIONS` (`packages/engine/src/oversight.ts:220`) | Removal after 30 days' notice (`IG_REMOVAL_NOTICE_DAYS`, `oversight.ts`); `removedTurn` is set (`inspectors-general.ts:189-193`) | **Never refilled.** An IG is an anonymous record, not a person (`InspectorGeneral`, `oversight.ts:120-136`); nothing writes a successor | `/washington/oversight` Inspectors | — | — |
| Combatant commanders | One per command | `relieveCommander` (`packages/engine/src/combatant-commands.ts:328`) | Automatic: the authored deputy acts, and is "confirmed" 84 days later (`SUCCESSOR_CONFIRMATION_DAYS`, `:622`, `commandPhase`). Commanders are not people (`CommandOfficer`, `:54`) | Defense office page (commands) | Modeled as a fixed delay, no vote | Deputy, always |
| White House staff (Chief of Staff, National Security Adviser, Press Secretary) | 3 | Chosen at founding (`staffCandidates`, `packages/engine/src/white-house.ts:34`; `founding-cast.ts:73`) | **No in-term replacement path found** (searched `staffCandidates`, `replaceStaff`, `appointStaff`: founding only) | Founding Staff stage | No | — |
| Vice President | 1 | Not found (searched for a VP vacancy or 25th Amendment path in `packages/engine/src`) | — | — | — | — |
| Founding appointments (cabinet, staff, running mate) | — | The transition | Founding stages (`apps/web/src/founding/stages/CabinetStage.tsx`, `StaffStage.tsx`, `TicketStage.tsx`); picks inside the consensus margin go to the Senate calendar with the deputy acting (`founding-confirmations.ts`) | `/founding` | Yes for the cabinet | Yes |

**Senate procedure that exists** (fact): vetting, referral, disclosures, hearing, committee action, executive calendar, floor, cloture and vote (`NominationStage`, `packages/engine/src/nomination-stages.ts:15-33`); committee non-report returns a nomination (`resolveStage`, `:274-282`); floor congestion stretches every stage (`stageDuration`, `:184-196`); confirmation is counted member by member where the 100 senators are seated (`memberVote`, `packages/engine/src/member-votes.ts:17`; probe 2: 100 senators modeled, each with a state, `CongressMember` in `congress-members.ts`). **Not modeled** (searched): holds, blue slips, recess appointments.

**Where vacancies surface to the player today** (fact): the Desk raises "N cabinet seats are empty" linking to the first role (`packages/player-core/src/desk/attention.ts:223-236`) and an agency-vacancy row linking to the office empty longest (`:265-289`). The Courts screen's circuit summary links to Oversight (`CourtsScreen.tsx:26`).

## 3. What is wrong today

### 3.1 Duplicate paths (facts)

- **D1. The same cabinet chair has two processes.** From the office page the President gets an immediate floor count that seats the nominee that afternoon (`appointMinister`, `appointments.ts:409-447`; review copy "The vote is counted today", `ChairActs.tsx:49`). From the Oversight batch the same chair goes into vetting and waits months (`nomination.ts:435-474`; `Vacancies.tsx:89`). Price and timing differ for the same act.
- **D2. A Supreme Court seat has two processes.** Courts → Nominations (per-seat choice) and the Oversight batch (no choice). The batch filled the Chief Justice's seat without the President ever seeing a candidate (probe 2).
- **D3. Three candidate rankings for one question.** Cabinet chairs rank by `selectAppointableFor` (`eligibleRoles`, then party, ideology, competence; `appointments.ts:163-178`, `cast-fit.ts:125`); agencies by `rankByLife` (years in domain careers, party as tiebreak; `nomination.ts:278-351`); courts by raw competence (`nomination.ts:270`). The founding has a fourth, staff a fifth (`white-house.ts:34`).
- **D4. Likely double nomination in the court batch** (inference, needs a test). `batchPackets` builds every packet against the same unmodified campaign (`apps/web/src/washington/courts/batch.ts`), and every open seat shows the same candidates, so picking one person for two seats would produce two nominations. `fillVacantOffices` avoids this by applying each packet before the next (`nomination.ts:373-381`).

### 3.2 No per-seat choice in the batch (fact)

`fillVacantOffices` always takes `selectNominableFor(...)[0]` (`nomination.ts:376`). `fillPlan` shows only the result (`appointments-pipeline.ts:80-91`). The board draws the chairs and names as two prose cells (`Vacancies.tsx:42-48`), the option-column shape the owner rejected.

### 3.3 Pools that do not fit the seat (facts)

- **P1. The judicial bench excludes the only judge-shaped people and admits everyone else.** The court pool is every free national who is not "cabinet eligible" (`nomination.ts:256-270`, `isCabinetEligible` `packages/engine/src/judiciary.ts:35`). `CABINET_ROLES` includes `role-court-chancellor` (`packages/world/src/dataset/people.ts:19`), the one role whose career pool is law, civil service and academia (`packages/world/src/dataset/background.ts:96`), so those people are barred from the bench. The ten department secretaries are not in `CABINET_ROLES` (`people.ts:58-69`), so energy and health secretary candidates fill it. There is no judicial career archetype at all (`CareerArchetype`, `packages/world/src/schemas/background.ts:79-94`).
- **P2. Agency rankings repeat and ignore the agency-head bench.** `rankByLife` scores years in the domain's archetypes over the whole free cast (pool of 898, probe 1). It never prefers `role-agency-head`, the role the dataset generates for these offices (`people.ts:80-91` note on `AGENCY_HEAD_ROLE`). Coarse archetypes make health, environment and technology all "academia", so one academic tops several unrelated agencies.
- **P3. No statutory or professional floor on any seat.** Nothing checks a law degree for a judge or the Attorney General, recent active service for Secretary of Defense, or that the Chairman of the Joint Chiefs is a serving officer. The catalog classes the Joint Chiefs chair `PAS` rather than `military` (probe 1 catalog dump).
- **P4. Roles that mean nothing in this country count.** 8 Americans each carry `role-monarch`, `role-junta-chairman` and `role-first-councillor` (probe 1). They are not filtered out, and probe 1's top picks for FDA, EPA and CIA came from them.
- **P5. The Senate count barely separates nominees.** Probe 2: the top five Supreme Court candidates, of both parties, and the top Treasury candidate all count 68–32. Cause not traced (inference: the count reads competence and integrity through `nomineeAppeal`, `confirmation-count.ts:57-64`, and these candidates sit close together). Confirmability therefore cannot rank anyone today.

### 3.4 Probe results

Probe 1 founded the campaign and read the cast, the vacancy board, and the top five of each pool. Probe 2 then dismissed the Treasury Secretary with `dismissMinister`, emptied Supreme Court seat 1 and one D.C. Circuit seat with `vacate` effects (the shape `judicialVacancyPhase` writes), and read the board, the batch, `appointmentShortlist`, `judicialShortlist` and the circuit pool. Both ran against committed `dist/` with `scripts/register-player-core.mjs`.

**The cast** (probe 1): 8,052 people; 1,557 Americans; 902 free (no role) at founding. Free Americans' study fields: law 208, international relations 180, public administration 166, engineering 90, medicine 86, economics 79, journalism 59, natural sciences 32, military science 2. Free Americans by eligible role: congressional leader 678, governor 16, agency head 15, each cabinet role 6 to 9. Ages 27 to 83, median 59.

**Today's top five, judged** (career is archetype and years, in order):

| Seat | Top five today | Relevant? |
|---|---|---|
| Treasury (pool 8) | Clifford Gordon (public administration; civil service 4, private law 11); Kirk Lambert (international relations; private law 8, business 4, private law 24); Curtis McKenzie (law; academia 6, business 19); Andre Chapman (economics, postgraduate; business 11, civil service 9, private law 5, civil service 18; Republican); Colin Pratt (engineering; academia 10, business 7, civil service 6, academia 21; Republican) | **Mostly.** The bench is right; the order is not. Party sorts first (`cast-fit.ts:125-136`), so the two with economics or long Treasury-shaped careers rank fourth and fifth behind a 40-year-old with four years of civil service |
| Defense (pool 8) | Leo Fletcher (military command 3, civil service 22); Garry Fisher (military command 5, party organizing 18); Chase McDaniel (party organizing and civil service, no service); Hung Dumlao (last post military command 19); Anthony Villalobos (last post military command 20; Republican) | **Partly.** Plausible people, but two end their careers in uniform and nothing checks how recently (P3). Whether either breaks the seven-year rule needs the posts' start ages, which the probe did not print |
| Attorney General (pool 8) | Conrado Nghiem (public administration; academia 10, civil service 17); Tommy Black (natural sciences; civil service and academia, 46 years); Harry Morris (natural sciences; private law 3, academia 20); Clayton Miles (international relations; academia, private law 7, civil service); Herbert Harrison (engineering; private law 13 last) | **No.** None of the top five studied law |
| FDA (pool 898) | Harold Todd (83; engineering; academia, diplomatic corps, military command; `role-monarch`); Rhonda Black (79; public administration; `role-first-councillor`); Ricky McCarthy (71; medicine; academia 36); Tommy Black (the AG candidate above); Colin Pratt (the Treasury candidate above) | **No.** One of five studied medicine. The same Harold Todd tops the CDC, NIH and EPA lists too, and Reagan Atkinson tops both Army and Navy (probe 1) |
| CIA director (pool 899) | Five people with intelligence and command careers, all `role-junta-chairman`, integrity readings 0.34 to 0.42 | **Career yes, pool no.** The right careers, but all five come from a foreign-charter role, and one is below the vetting floor (`nomination.ts:167`, 0.35) |
| Chairman of the Joint Chiefs (pool 898) | Rita Fitzgerald (independent; medicine degree; intelligence and command; `role-junta-chairman`) and four with command careers from cabinet benches | **No.** A civilian bench for a serving officer's post (P3) |
| Supreme Court seat 1, Chief Justice (pool 791) | Gary McGuire (international relations; academia 28; `role-energy-secretary`); Frank Maxwell (economics; business 29; `role-health-secretary`); Spencer Bryan (economics; business 22; `role-health-secretary`); Nancy Martin (law; academia 15); Roberto Ortiz (law; academia 17) | **No.** Three of five never studied law, none practiced, and the Chief Justice's seat is offered no sitting justice. The sitting justice in seat 1 at founding is an engineer with no law career (probe 1), so the founding bench has the same defect (`judiciary.ts:45-62`) |
| D.C. Circuit seat 1 (pool 791) | The identical five | **No.** Same list as the Supreme Court; no home-circuit reading |
| Fed chair (pool 898; never opens, §2) | Frank Maxwell, Spencer Bryan (economics), then three with private-law careers | **Partly.** Economics first by luck of the archetype table, not by design |

Reachable material exists: 188 free Americans hold a law degree and are not cabinet-eligible (probe 2), so a law floor does not empty the judicial pool, though 159 of those 188 are congressional-leader-eligible, which says nothing about a judicial career.

## 4. Target surfaces (recommendation)

The principle: one producer, one seat row, one commit path, drawn wherever a vacancy is noticed.

### 4.1 The engine: one path, one pool

- **One commit path.** Every Senate-confirmed seat is filled by `openNomination` (`nomination.ts:435`) through the pipeline. `fillVacantOffices` (`:368`) gains a `picks` argument (office → person), keeps building each packet on the previous one's result, and falls back to the pool's first name only where no pick is given. `appointMinister` stops being a player act for an empty chair; the office page calls the same nomination (owner question Q1). `projectAppointment`'s price rows survive as the projection for a cabinet nominee, because they are already shown and charged (DECISIONS §3.7). Founding stays on its own seal (`founding-confirmations.ts`), which already puts contested picks onto the pipeline. The balance harness already drives `openNomination` (`packages/engine/src/balance-harness.ts:363`).
- **One pool.** A new `appointmentPool(campaign, office)` in the engine replaces the three rankings in D3 and returns `{ person, fit, reasons }` rows. `selectNominableFor` becomes a thin wrapper over it so the content selector that uses it (`packages/content/src/scenario-judicial-vacancy.ts:42`) keeps working; `selectAppointableFor` stays as the cabinet eligibility input (it is the `eligibleRoles` gate DECISIONS §4.9 requires) and also feeds `deputyFor` and the acting shortlist.
- **PA offices** (no Senate) are filled by a direct appointment packet rather than a nomination, or are left off the desk until owner question Q6 says otherwise.

### 4.2 Player-core: one desk producer and one seat row model

- `appointmentDesk(campaign)` returns every open seat (the existing `vacancyBoard` rows plus Supreme Court seats from `benchReading`), each with its pool, its preselected pick (pool row 0, except Supreme Court seats, see Q2), and the in-flight nominations from `selectPipelineReading` and `judicialNominations`.
- `seatChoice(campaign, office)` returns one `ChoiceOutcome` per candidate (`packages/player-core/src/choice/choice-outcome.ts`) plus "Leave it open" as the baseline row, reusing what `appointmentShortlist` (`packages/player-core/src/cabinet/shortlist.ts:89`) and `judicialShortlist` already compute: bands, the Senate count, who objects, cost now.
- `deskPlan(campaign, picks)` replaces `fillPlan` (`appointments-pipeline.ts:80`) and the courts' `batchEntries`/`batchPackets` (`apps/web/src/washington/courts/batch.ts`): one sequential packet list, so D4 cannot happen. The modeling acts `fill-vacancies` and `nominate-judges` (`packages/player-core/src/modeling/acts.ts:57`, `:65`, `:117`, `:125`) merge into one `nominate` act with picks.

### 4.3 The web: the desk and the seat row in context

- **The desk** replaces the Vacancies section at `/washington/oversight?view=appointments` (`Vacancies.tsx`). The route stays, so the Courts door and the Desk links keep working; it is titled Appointments. It lists open seats grouped Cabinet, Agencies and boards, Courts. Each seat is a whole-row target showing the seat, days open and acting holder, the preselected nominee's face and name, a fit word, the Senate meter, and the worst case. Picking a row opens that seat's candidates as a `ChoiceList` (rendered through `CompareAuthorize`, `packages/ui-web/src/CompareAuthorize.tsx:155`, which already draws `ChoiceList`) with "Leave it open" as the thin baseline. One verb, "Send N nominations", opens the existing full-tier review with one line per seat (`useNationCommit`, the review shape in `Vacancies.tsx:82-87`), then the receipt (`ActReceipt`). The pipeline strip (`Vacancies.tsx:14-40`) stays above the list.
- **The office page** (`/washington/office/:id`): "Compare the candidates" opens the same seat row and candidate list for that one chair, and authorizes a one-seat plan through the same review. `FillChair`'s `Appoint` (`ChairActs.tsx:58-68`) and its `appointMinister` call go. Naming an acting officer stays as the seat row's secondary act (`appointActing`, `appointments.ts:582`), shown only where the law allows one (`ChairActs.tsx:30-35`).
- **The Courts Nominations tab**: the same seat rows for Supreme Court and circuit seats, filtered to the judiciary, with the same batch verb. `SeatChoice` and `BatchReview` (`Nominations.tsx:20-123`) go. "Before the Senate" withdrawals stay as they are (`Nominations.tsx:135-177`). The circuit summary (`CourtsScreen.tsx:17-28`) becomes the seat rows themselves.
- **The Brief**: the cabinet and agency vacancy rows (`attention.ts:223`, `:265`) link to the desk filtered to that seat (`?view=appointments&seat=<office>`), so a seat is filled where it was noticed in one step.
- **The person dossier**: "Offer a chair" (`appointmentLever`, `packages/player-core/src/dossier/person-lever.ts:117`) prices the same nomination.

**Phone and desktop.** At 1440×900 the desk is two panes: seats on the left, the picked seat's candidates on the right, the batch verb docked in the surface foot. At 390×844 the desk is one list; picking a seat opens its candidates in place below it (target-only expansion, `docs/DESIGN.md` §8.9 contract), and the verb docks in the lowest 112px (`docs/DESIGN.md:205`). At 320 the seat row wraps the meter under the name; nothing scrolls sideways. The same rows serve both sizes; only layout changes.

### 4.4 Deleted or merged

| Today | Becomes |
|---|---|
| `appointMinister` as a player act (`appointments.ts:409`) | `openNomination` with the cabinet's projection price |
| `fillPlan` (`appointments-pipeline.ts:80`), `batchEntries`/`batchPackets` (`courts/batch.ts`) | `deskPlan` |
| `fill-vacancies` and `nominate-judges` modeling acts | One `nominate` act with picks |
| `Vacancies.tsx` batch-only compare | The desk |
| `Nominations.tsx` `SeatChoice` + `BatchReview` | The shared seat rows |
| `ChairActs.tsx` `Appoint` + `CandidateRoster` for nominations | The shared seat row |
| `CourtsScreen.tsx` `CircuitAppointments` summary | The seat rows |
| `rankByLife`, the competence sort, the fit-only sort | `appointmentPool` |

## 5. Relevant candidate pools, per seat type

### 5.1 Hard eligibility (every seat)

Already enforced and kept (fact): alive, own national, holds no role, not before the Senate for another office, not acting elsewhere (`nomination.ts:245-268`, `appointments.ts:163-173`, `nominationRefusal` `:406-423`).

Added (recommendation):

- **A role from this country's charter.** Eligibility from foreign-charter-only roles (`role-monarch`, `role-junta-chairman`, `role-first-councillor`, `role-council-chair`, `role-prime-minister`, `role-electoral-affairs-minister`) carries no relevance for an American seat (P4). They stay eligible on career grounds but get no credit for the role.
- **Not under an open disqualifying record.** Only where the engine already keeps one (for example a person whose dismissal or scandal response is on the record). Needs validation: I did not find a per-person scandal flag in `state.ts`; integrity below the vetting floor slows and prices a nomination (`vettingFindings`, `nomination.ts:177-189`) and should stay a price, not a bar.
- **No age bar.** None of these offices has a constitutional or statutory age requirement that I verified. Age enters as tenure (§5.2), never as a gate.

### 5.2 Per seat type

| Seat | Hard rules | Relevance (in order of weight) | Where the pool comes from |
|---|---|---|---|
| Cabinet secretaries, DNI | `eligibleRoles` includes the seat's role (existing). **Defense:** not within seven years of active duty, derived from career posts (`startAge + years` against `age`); statute as recalled is 10 U.S.C. §113(a), waivable by Congress, **unverified** | Years in the seat's careers (the role's own `ROLE_CAREER_POOL` row, `background.ts:89-119`) and study field; fit with the President (party, ideology closeness, `cast-fit.ts:110-118`); the Senate count; competence band. Party becomes a weight, not the first sort key, so a 22-year Treasury career is not ranked under a co-partisan with 4 | The `eligibleRoles` bench (6 to 9 free per role, probe 1). Thin but credible; top it up with `role-agency-head` people of the matching domain if fewer than the shortlist size (4, `SHORTLIST_SIZE`, `shortlist.ts:43`) remain |
| Attorney General | Same, plus `eligibleRoles`. A law degree is **not** a statutory requirement as far as I know (**unverified**); recommend a strong relevance weight, not a bar (Q3) | Law degree, then private-law and civil-service years, then fit, then count | Same bench; probe 1 shows its top five have no law degree, so the weight must move the order |
| Agency and bureau heads | Hard: a career or study in at least one of the body's domains (`DOMAIN_LIFE`, `DOMAIN_STUDY`, `nomination.ts:278-326`) | `role-agency-head` first, then domain years (primary domain triple-weighted as today), study field, then fit with the President for `executive` bodies; integrity before fit for `semi-autonomous` intelligence and law-enforcement bodies (`independence` in the catalog) | `role-agency-head` people (15 free at founding, probe 2), then the domain-matched free cast. Split the coarse "academia" by study field so health draws medicine and natural sciences, environment draws natural sciences |
| Service secretaries (Army, Navy, Air Force) | Civilian; same seven-year reading as Defense is **unverified** for these offices | Defense careers, then fit | Defense-domain cast |
| Chairman of the Joint Chiefs | A serving officer, not a civilian. The person pool has no "serving" status | Command years | Recommendation: draw from the combatant commands' authored officers (`CombatantCommandDef.deputy`, `combatant-commands.ts`) or a generated officer bench, and reclassify the office `military`. Until then, leave it off the desk (Q6) |
| Fixed-term regulators (Fed, SEC, FTC, FCC, CFPB, CFTC, FDIC, NRC, NLRB) | Domain career or study | Economics, banking and law for the financial boards; domain for the others; fit weighted lower than for executive bodies because these bodies are `independent` | Domain cast. Also needs term expiry to open seats at all (§2); that is a later slice |
| Supreme Court | Law degree (education field `law`). Federal judges have no statutory professional qualification as far as I know (**unverified**), so this is a design floor (Q3) | Judicial or legal career years; for the Chief Justice, sitting associate justices also eligible (elevation); ideology closeness to the President on the axes the Courts screen already reads (`leanAxes`); expected tenure (younger within a credible band ranks higher, read from age); the Senate count; integrity and competence bands | Today's free cast with law degrees (188 reachable, probe 2) plus a generated judicial bench (§5.3). Drop the `isCabinetEligible` exclusion's effect on `role-court-chancellor`, or replace the exclusion with "holds no executive role" |
| Courts of appeals | Law degree | As above, plus home circuit (birthplace state, `stateOfBirthplace`, `packages/engine/src/cast-home.ts:38`, mapped to the seat's circuit); district judges are not seats, so "elevated from the district bench" can only be a career line on a generated judge | Generated judicial bench per circuit, plus law-trained free cast from that circuit's states |

**Blue slips.** Home-state senators are seated by state (`CongressMember`), so a home-state courtesy reading is possible. For circuit seats the practice has not been honored as a veto in recent years (**unverified**, needs a dated source); district seats, where it still applies, do not exist. Recommendation: show home-state senators' positions in the seat's detail as information, not as a gate, and revisit when district seats exist.

### 5.3 Sizing and refresh, so a pool is never empty and never absurd

- **Minimum credible shortlist** per seat: the existing constants (4 for executive seats, `SHORTLIST_SIZE`; 3 for judicial, `JUDICIAL_SHORTLIST_SIZE`, `judicial-nominations.ts:34`), counted after the hard rules and a relevance floor.
- **A generated bench where the cast is thin.** When a vacancy opens for a judicial seat, the Joint Chiefs, or a domain the free cast cannot staff to the minimum, the phase that opens it creates the missing candidates with the existing generator (`generateRolePerson`, `packages/engine/src/people.ts:370`) under a new role profile (for example `role-federal-judge`, career pool private law, academia, civil service and a new judicial archetype), on its own stream key (DECISIONS §1.3) keyed by seed, office and vacancy ordinal. The people are written by a `person` effect, exactly as `materializeCircuitSeat` does (`lower-bench.ts:193-226`, "A panel event, never a selector") and `congressionalBench` does (`congress-members.ts`). Generated once per vacancy, stored, so a President cannot reroll the bench by waiting, which keeps the promise in `appointments.ts:159-161`. Deterministic and offline, so DECISIONS §7.1 (no runtime model calls) holds.
- **Refresh.** The pool is recomputed from state on every read (it is a selector); only the generated people are stored. A candidate who takes another office or dies leaves every list the same week.
- **Not absurd.** A relevance floor: a candidate with no years and no study in any of the seat's fields is not offered for agencies, courts or the Joint Chiefs, however competent. The probe in §3.4 becomes a test (§7, A1).

### 5.4 Data the person graph has and lacks (facts)

Has: education school, field and postgraduate flag; career posts with archetype, years and start age; ideology vector; the five attributes; traits; party; eligible roles; birthplace mapped to a state (`packages/world/src/schemas/person.ts:56-97`, `background.ts:62-103`, `cast-home.ts`). Career one-liners per role exist for dossier prose (`packages/engine/src/bio-career-lines.ts:22`), including `role-chief-justice` (`:577`), which no generated person holds.

Lacks: a judicial or prosecutorial career archetype; bar admission or state of practice; active-duty status and rank; any record of prior Senate confirmation. Adding a `CareerArchetype` value is a schema change (Doc Sync, §7).

## 6. What the player sees about each nominee

Every reason is a fact the dossier already exposes or a reading the engine already counts. No figure for a hidden attribute, and no fit score as a number (the portrait rule's "hidden stats never show", `docs/DECISIONS.md:518`, and the band-only readings from `judgeAttribute` and `chairRead`, `packages/player-core/src/dossier/chair-read.ts:92`).

For the preselected pick and for every candidate row:

1. **Why this person, in one line**, built from the pool's `reasons`: "27 years in Treasury-shaped work: business and civil service. Studied economics." / "Law professor 15 years; home circuit." Career years and fields are on the dossier timeline already.
2. **Fit with you**: the existing fit band against the list (`bandedAgainstList`, `cast-fit.ts:148`) as a word, and "from the other party" where it applies (`nomineeCrossesTheAisle`).
3. **The Senate**: the meter from today's count, labeled a staff projection (existing copy, `ChairActs.tsx:47`), and the committee it goes to. P5 must be fixed or the meter is decoration.
4. **What vetting will raise**: `vettingFindings` in words (`nomination.ts:177-189`), which also tells the player it will slow the nomination.
5. **Readings**: competence and loyalty bands for executive seats (`readingRows`, `shortlist.ts:60-66`); competence and integrity for judges (`judicial-nominations.ts:70-75`), as today.
6. **For a life seat**: "could serve about N years" is a derived figure and must say so (DECISIONS §4.11); recommend a band (decades, a decade or two, under a decade) from age, not a number.
7. **The recommended mark** on the preselected row (`ChoiceItem.recommended`, `packages/ui-web/src/ChoiceList.tsx`), and the face is a door to the dossier (memory note `marks-link-to-their-subject`).

## 7. Build slices

Validation cadence follows CLAUDE.md and BL-137: targeted tests per slice, bulk tests, verify sweep, balance and the browser matrix at the integration checkpoint. The six widths are the Playwright projects at `apps/web/playwright.config.ts:38-44` (320, 390, 768, 1280, 1440, 1920).

**A0. Sources and owner answers (docs only).** A dated research note in this folder for: the Secretary of Defense seven-year rule, judicial and Attorney General qualifications, blue-slip practice for circuit seats, PA versus PAS for the listed offices. Owner answers §8. Acceptance: every **unverified** line in §5 is sourced or removed.

**A1. The pool and its reasons (engine).** `appointmentPool(campaign, office)` with hard rules and relevance per §5, returning reasons; `selectNominableFor` wraps it; the judicial exclusion fixed (P1); party moved from first key to a weight for executive seats. Reuses `DOMAIN_LIFE`/`DOMAIN_STUDY`, `orderByFit`'s closeness, `confirmationVote`, `vettingFindings`. Tests (unit, four seeds): every judicial top three has a law degree; the FDA, CDC, NIH and EPA top picks are four different people, each with medicine, natural sciences or a matching career; no Defense candidate within the seven-year window; no candidate credited for a foreign-charter role; no pool below its minimum for any open seat; the Attorney General's top three include a law degree where the bench has one. Rerun the §3.4 probe and record before and after tables here. Investigate P5 in this slice. Doc sync: `stat-consumers-people.ts` entries for any field newly read (birthplace by appointments; `packages/world/src/dataset/stat-consumers.ts` registry and its paired test).

**A2. One path (engine).** `fillVacantOffices(campaign, offices, picks)`; the cabinet empty-chair act goes through `openNomination` with `projectAppointment`'s price; `appointMinister` removed from player acts (`modeling/acts.ts:110`) and kept, if at all, only for founding and tests. Tests: a dismissed cabinet chair filled from the office page and from the desk produces the same nomination record and price; a batch that names one person for two seats sends one nomination (D4); PA offices do not open Senate nominations. **Balance harness by hand** (`pnpm --filter @admin/engine run test:balance`), because cabinet seats now wait months under actings. Doc sync: `docs/ARCHITECTURE.md` (the appointment path), `docs/DESIGN.md` route rows `:295`, `:301`, `:303`.

**A3. The generated bench (engine and world).** Judicial role profile and archetype, the vacancy-time bench, stored people. Tests: the same seed and vacancy produce the same bench after save and reload; a second read does not create people; a vacancy filled and reopened draws a new ordinal. Doc sync (blocking): `docs/SCHEMA.md` and `docs/ARCHITECTURE.md` for the new `CareerArchetype` value and role, the dataset validator's role-profile checks, `ROLE_CAREER_POOL`, the save version if the person shape changes.

**A4. The desk and the seat row (player-core, ui-web, web).** `appointmentDesk`, `seatChoice`, `deskPlan`; the shared seat row; the desk at the Oversight route; the office page, Courts tab, Brief doors and dossier lever moved onto it; the deletions in §4.4. Unit tests: desk rows match `vacancyBoard` plus open Supreme Court seats; `deskPlan` with no picks equals today's `fillPlan` for executive seats; an override changes only its seat. E2E, six widths: open the desk with three open seats (Treasury, Supreme Court seat 1, one circuit seat, staged like probe 2 through a fixture save), change one nominee, pick the Supreme Court nominee explicitly, review shows three lines, commit, receipt, and the three nominations appear in the pipeline strip and on the Courts tab; from a Brief vacancy row, fill one seat in two steps; from the office page, fill a chair and see the same review. Extend `circuit-vacancy.spec.ts`, `judicial-vacancy.spec.ts` and `washington.spec.ts` rather than adding parallel specs. Visual: inspect 390×844 and 1440×900 captures by eye, then the other widths (CLAUDE.md design workflow). Doc sync: `docs/DESIGN.md` route table; glossary or explainer copy through the `player-tips` skill.

**Later, each needing an owner call:** fixed-term expiry opening regulator seats from the seat calendar; inspector general successors as people; White House staff replacement in term; Vice President vacancy; holds and recess appointments; district judges, U.S. attorneys and ambassadors as seats. None blocks A1 to A4.

**Tracking.** The integrator opens one backlog item (next free id, BL-152 at the time of writing) covering A1 to A4 with this file as its evidence, and links BL-123's vacancy acceptance to A1's judicial pool. This plan does not edit `docs/BACKLOG.md` or `docs/PLAN.md`.

### 7.1 Challenge

**Strongest failure mode.** The preselected batch makes filling the government a single click the President does not think about, which is the "game plays itself" outcome DECISIONS §3.6 exists to prevent, and the relevance score becomes an unexplained authority. Controls: the review lists every seat and name; Supreme Court seats are never preselected (Q2); every pick carries its reasons (§6); the baseline "Leave it open" is always present.

**Second failure mode.** Moving the cabinet onto the pipeline leaves departments under actings for months, which moves delivery and approval in the balance numbers. Control: A2 runs the balance harness before landing; actings already soften a vacancy (`appointments.ts:572-581`).

**Best alternative.** The minimal fix: keep both screens, add a per-seat override to the Oversight batch, fix the judicial exclusion and prefer `role-agency-head`. It is a third of the work and fixes the worst picks, but leaves two cabinet processes, two Supreme Court entry points and three rankings, which is the duplication the owner asked to remove.

**Verdict: accepted with controls.** A1 is the critical path and is useful on its own even if the surfaces change.

## 8. Owner questions

**Q1. Should an empty cabinet chair be filled through the months-long Senate pipeline, like every other seat?** Recommended: **yes, one pipeline**; the deputy acts meanwhile, and the projected count is shown before sending. Alternative: keep the same-day vote for cabinet chairs only, which keeps two processes and two prices for one chair.

**Q2. Should a Supreme Court seat be preselected in the batch?** Recommended: **no**; it is listed with its candidates and stays out of the batch until the President picks someone. Circuit seats are preselected. Alternative: preselect everything, which is fastest and makes a life appointment a default.

**Q3. Is a law degree a hard floor for judges and the Attorney General?** Recommended: **hard floor for judges, strong preference for the Attorney General**, both stated as design choices, not law, until A0 sources the actual rules. Alternative: preference only for both.

**Q4. May the game create plausible candidates when the cast is thin?** Recommended: **yes**, generated once when the vacancy opens, deterministic and stored, judicial and military benches first. Alternative: no generation; enlarge the authored pool at the dataset level, which changes every seed's cast.

**Q5. Where does the desk live?** Recommended: **keep `/washington/oversight?view=appointments`**, titled Appointments, so existing doors keep working. Alternative: its own Washington tab, which adds a nav entry.

**Q6. Which missing seat types come next?** Recommended: **none in this program**; fix filling for the seats that exist, leave the Joint Chiefs and PA offices off the desk until their pools are right, then schedule regulator term expiry first because it is half built (the seat calendar). Alternative: add U.S. attorneys and ambassadors now, which needs new institutions, pools and Senate load.

## 9. Parking lot

- The founding Supreme Court is seeded from non-cabinet people ranked by integrity plus competence (`judiciary.ts:45-62`), so sitting justices have no legal careers (probe 1, seat 1). Same root as P1; A1's floor should apply to the founding bench too, which changes seeded casts (a seed-stability decision).
- `deputyFor` picks the acting from the cabinet bench (`appointments.ts:635-640`), so the probe's Treasury acting was the second-ranked nominee. A deputy secretary as a person would be truer; out of scope.
- `actingShortlist` for an agency reads its parent department's cabinet bench (`shortlist.ts:132-133`), not agency people.
