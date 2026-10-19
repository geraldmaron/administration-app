# Phase C trace: executive delivery and consequential secretaries

Slice C1 of the simulation-depth program. Read against source at `feat/map-first` `e5e2dfd77` on 2026-10-11. Line numbers are from that tree after the C1 edit to `institutions.ts`; re-grep before trusting one.

## Finding dispositions

| Finding | Disposition | Evidence |
|---|---|---|
| Healthiest executor leads (`selectExecutorsFor` sorts by `implementationQuality`, `selectDeliveryCapacity` weights it 0.7) | **Was present, fixed in C1** | Its one production reader was `trade.ts` `selectCustomsReceipts`, reading the domain `"trade"`: USDA, Commerce, USTR, CBP and BIS sorted by health. Measured before the fix on the balance founding with a 25% tariff on China: hollowing CBP (the only holder of `customs-collection`) to 0.1 while the other four ran at 1.0 *raised* weekly receipts from 189.54 to 206.52, and dropping USDA to 0.05 cut them to 185.29. Fixed by `executive-work.ts` (below); the test that showed both failures is `executive-work.test.ts` "customs collection belongs to the agency the law gives it to". |
| A required dependency blocks or delays its stage | **Not present before C1, added** | Nothing in the engine modeled a stage another body must clear. `WorkDependency` `approval` now caps a work's capacity at the approving body's quality (delayed) and stops it below `APPROVAL_FLOOR` (blocked). Tests: "delays the work to the pace of a slow approval", "stops the work when the approving body is not clearing its stage". |
| `department-ownership.ts` should reconcile with executor selection | **Partly: different vocabularies, reconciled by authority** | `department-ownership.ts` maps cabinet *roles* to instruments, policy domains, scenario classes, budget accounts and executive orders. The institution catalog tags *institutions* with free domain strings (`"trade"`, `"homeland"`) that are not `PolicyDomain`s. Work ownership is now keyed by the catalog's `authorities`, which is the legal fact the catalog already carries, and `workIsLawful` checks every owner and edge against it. The role tables are unchanged; a department's work is found through the owner's `parent`/cabinet role. |
| `response.ts` lead | **Already correct** | `RESPONSE_MEMBERS` (`response.ts:103`) fixes the lead per condition kind by table order, not by health. Only its comment pointed at the removed selector; it now points at `selectWorkDelivery`. |
| `institutionTick` generic arrivals (6 × staffScale) and clearance (8.5 × staffScale × quality) | **Still present, kept, scoped** | `institutions.ts:467-468`, `institutionTick` at `:485`. It is the right model for an institution's *general* administrative backlog, which feeds `deriveImplementationQuality`. It is the wrong model for a named public service, where arrivals, valid completions, errors that come back, withdrawals and the age of what is waiting are the facts a player needs. Decision below. |
| Secretaries: policy and ownership paths consume the secretary; institution competence excludes cabinet heads | **Confirmed** | `leaderDeliveryTerm` returns 0 for any body with a `cabinetRole` (`institutions.ts:331`). Secretaries are read by `policy.executionQuality` (`policy.ts:308`), `stewardship.stewardSway` (`stewardship.ts:156`), `budget.appropriationQuality` (`budget.ts:360`), `war-tick.commandQuality` (`war-tick.ts:89`), `execution.carryOutTerms` (`execution.ts:65`) and `order-review`. Full map below. |
| Acting Secretaries are read inconsistently | **Fixed in C3 for the mechanism readers; counsel left** (see the C3 section) | `selectChairRunner` (confirmed, else acting) is used by `policy.executionQuality`, `execution.ts` and `order-review.ts`. `ministerFor` (`stewardship.ts:107`, confirmed only) is used by `stewardSway` and `commandQuality`; `selectCabinetHolder` (confirmed only) by `appropriationQuality` and `counsel.ts:367`. So an acting Secretary of Defense signs orders but the war is commanded at the vacant-ministry value 0.25. Fixing it moves stewardship odds and war attrition, which the balance harness depends on; carried to C3 as its own item. |
| C15 case automation | **Not executive delegation** | `case-automation.ts` (33 lines) previews and applies a player rule to *soft cases* only, and only for ids the caller confirms. It never delegates department work. Delegation stays Phase F. |
| Every implemented cabinet portfolio covered | **C3: every department has a service or a program, a reading and a perturbation case** (see the C3 section) | 15 departments plus the DNI seat carry a `cabinetRole`. Several have no ongoing mechanism of their own. |

## The executor resolver (GOV-01)

`packages/engine/src/executive-work.ts`:

- `WorkDef`: `owner` (an institution) and the `authority` the owner holds for this work, plus `dependencies`.
- `WorkDependency`: `approval` or `support`, each naming an institution and the authority it uses. Prerequisite and substitutable edges from the brief were not added: no work in C1 or C2 has one, and the brief's own rule is no unused types.
- `selectWorkDelivery`: owner quality, then support blended at the response module's 0.7/0.3, then the slowest approval caps it. Status `delivering`, `delayed` (with the binding body) or `blocked`.
- `CUSTOMS_COLLECTION`: owned by `INST-CBP` under `customs-collection`, no dependencies. `selectCustomsReceipts` reads it.
- `selectExecutorsFor` and `selectDeliveryCapacity` are deleted. Their only other readers were tests, rewritten to read the body's own delivery.

## Which service models are needed

| Model | Needed for | Already in the engine? | C2 decision |
|---|---|---|---|
| Queue / case processing (arrivals, valid completions, errors returning as rework, withdrawals, age of the backlog) | Benefit claims, visas, arms-transfer cases, tax returns, inspections | No. `institutionTick` is a single undifferentiated backlog number | **Build once** as a shared primitive; State, Defense and Veterans Affairs each run one service on it |
| Readiness / maintenance | Force readiness | **Yes**: `capacity.ts` refit phase restores the force, and `militaryReadiness` is read by the ladder and command | Reuse. A second readiness stock under DoD would double-write the same fact |
| Negotiation / stages | Treaties | **Yes**: treaty records move signed → ratified or rejected (`TreatyEffect`), foreign consent is `engagement.ts`'s treaty-counterpart, read through the Secretary of State's craft | Reuse. State cannot force consent and already cannot |
| Project delivery (milestones, spend-out) | Infrastructure grants, energy and land programs | No | Not needed by the four C2 portfolios. C3 (Transportation, Interior, Energy) |

## Person attribute to consumer map (secretaries)

The authored-field registry `packages/world/src/dataset/stat-consumers.ts` (`PERSON_CONSUMERS`) lists every reader of every attribute across the whole cast. This table narrows it to readers that read a **cabinet Secretary** and names the mechanism, so a new reader can be checked against "each leadership effect once".

| Attribute | Reader | Which Secretary | Mechanism |
|---|---|---|---|
| competence | `policy.executionQuality` | the domain chair: Treasury (fiscal), Commerce (industry, trade), Justice (civil), DNI (security), Defense (defense) | How much of a standing program's movement is delivered each week |
| competence | `stewardship.stewardSway` | instrument owner: State (diplomatic, assistance), Treasury (economic), DNI (covert), Defense (military) | Odds an act on that instrument resolves |
| competence | `budget.appropriationQuality` | account owner; the domestic line split by appropriation across VA, HHS, Education, HUD, Labor | What a budget line's money buys |
| competence, loyalty | `war-tick.commandQuality` | Defense | Attrition per week of war |
| competence | `counsel.perceivedOdds` | any seat in the room for a matter | How accurately the Secretary reads the odds they advise on |
| competence, charisma, integrity, traits | `person-disposition` craft → `engagement` treaty-counterpart | State | How governments receive envoys and sign treaties |
| competence, charisma, integrity, traits | craft → `lobbying-advocate` | any Secretary backing a bill | Votes moved on the Hill |
| loyalty, traits | deference → `execution.carryOutTerms` | the department an order belongs to (`orderDepartment`) | Whether an order is carried out as signed |
| integrity, traits | principle → `order-review` | Justice | The Attorney General's objection to an order's form and legality |
| loyalty, ambition, integrity, traits | `cabinet`, `cabinet-revolt`, `minister-will`, `cabinet-initiative` | every seat alike | Cabinet politics: risk, leaks, resignations, initiatives |
| competence, integrity, charisma | `opening-portfolios` | most seats | A one-time push at the oath |

Added in C2, read nowhere else for that seat:

| Attribute | Reader | Which Secretary | Mechanism |
|---|---|---|---|
| integrity | `services.serviceTick` via `leadershipFor` (`selectChairRunner`, so an acting counts) | Veterans Affairs | Whether a late claims backlog is cleared by deciding claims or by refusals pushed through |

The registry entry in `stat-consumers.ts` names it. `portfolio-perturbation.test.ts` fails if it is removed (checked by cutting the read: the Veterans Affairs case goes red).

## Implemented cabinet portfolios and what each does mechanically today

"Generic" below means the cabinet politics every seat shares (risk, leaks, resignation, initiatives, counsel, lobbying, the oath push). It is real, and it is not a portfolio mechanism.

| Portfolio | Institution | Mechanisms specific to the portfolio | Gap |
|---|---|---|---|
| State | `INST-STATE` | diplomatic and assistance stewardship; diplomatic account; treaty-counterpart craft; owns foreign-crisis, hostage, death matters | C2: visa applications (owner State under `visa`), and State is the approving body for arms transfers. Reads no Secretary: the department's delivery excludes its Secretary |
| Treasury | `INST-TREASURY` (IRS, OFAC below) | fiscal program delivery; economic stewardship (sanctions); economic account; three orders | C2: tax returns, owned by the IRS and rolled up to Treasury. The IRS is run by its commissioner, so the Secretary is not read twice: the perturbation test shows the Treasury Secretary moves the fiscal program, the economic instrument and its account and not the returns queue. Does not set the policy rate: the Federal Reserve's delivery is among the entries the Treasury perturbation must leave unchanged, and it does. Appropriates nothing: the Secretary's competence reaches what the economic account's money buys (`appropriationQuality`), not how much is appropriated |
| Defense | `INST-DOD` | defense program delivery; military stewardship; military account; war command; two orders | C2: arms transfer cases, owned by DoD under `procurement`, each needing State's approval under `foreign-assistance` (the civilian authorization). Basing access and logistics constraints are Phase E |
| Justice | `INST-DOJ` | civil program delivery; order review; grant-conditions order | No caseload; must not reward raw prosecution volume. C3 |
| Interior | `INST-INTERIOR` | energy-leasing order | C3 |
| Agriculture | `INST-USDA` | none beyond generic | C3 |
| Commerce | `INST-COMMERCE` | industry and trade program delivery | C3 |
| Labor | `INST-LABOR` | share of the domestic line | C3 |
| Health and Human Services | `INST-HHS` | share of the domestic line | C3 |
| Housing and Urban Development | `INST-HUD` | share of the domestic line | C3 |
| Transportation | `INST-DOT` | none beyond generic | C3 (project delivery) |
| Energy | `INST-DOE` | clean-energy order | C3 |
| Education | `INST-ED` | share of the domestic line | C3 |
| Veterans Affairs | `INST-VA` | share of the domestic line | C2: disability claims, the one service whose decision can refuse; the Secretary's integrity decides whether pressure is answered with refusals |
| Homeland Security | `INST-DHS` | four orders; owner of disaster, unrest, migration and other matters; FEMA, CBP and the rest answer conditions through `RESPONSE_MEMBERS` | Its components already work through the response module. C3 |
| Director of National Intelligence | `INST-ODNI` | security program delivery; covert stewardship and account | Not a department; listed because it holds a cabinet role |

## Slice C2: shared service primitive and four portfolios

What was built:

- `packages/engine/src/services.ts`: `ServiceDefinition`, `ServiceRuntime` (weekly cohorts by weeks waited, the rework pipeline, last week's flows; totals derived), `serviceTick`, `servicePhase` (after `institutionPhase`), `SERVICES` for State, Treasury (IRS), Defense and Veterans Affairs. Carried on `InstitutionEffect.services`; `Campaign.services` optional; save v57.
- The first draft aged cases in four wide bands on the assumption that ages spread evenly inside a band. On the week-30 fixture that put a quarter of a 2.5-week visa queue past four weeks while the queue was decided oldest first. Replaced by exact weekly cohorts before anything shipped; a test pins it.
- `packages/player-core/src/government/services.ts#departmentServices` and `apps/web/src/washington/executive/Services.tsx` on the Washington executive screen, after the delivery reading. Reused: `selectWorkDelivery`, `institutionReason` (exported from `delivery.ts`, the same line each delivery row prints), `institutionInProse`/`institutionOpening`, the executive tree's names, links and emblems, `ui-valence-chip`/`ui-valence-ink`, the delivery rows' grid and container query.

Acceptance, as it applies:

| Test | Where | Holds |
|---|---|---|
| GOV-01 | `executive-work.test.ts`; `services.test.ts` "an arms transfer waits on the State Department" | A hollow owner is not bypassed; a slow approval caps, a stalled one stops |
| GOV-02 | `portfolio-perturbation.test.ts` | Each of the four Secretaries, swapped between 0.95 and 0.15 on all four attributes, moves at least its named mechanisms and nothing owned by another seat, including every institution's delivery |
| GOV-03 | `services.test.ts` "a change in the chair leaves the department's work where it was" | Vacancy, confirmed replacement, and a resignation leaving the deputy acting leave the service records and VA's backlog, staffing, funding, capacity and directives unchanged |
| GOV-04 | `services.test.ts` "a service week counts every case once" and "throughput bought by refusing cannot pass for service"; player-core "does not let a backlog cleared by refusals read as keeping up" | Reconciles over 40 weeks to 1e-9; pressured refusals raise decisions, refusals and error rate, and come back as rework |
| GOV-05 | `services.test.ts` (one department per service); player-core summary test | Each service rolls up to one department; the summary counts services by status and pools no rate across services |
| GOV-06 | Not built | Nothing in C2 sets or lowers a target, so a `PortfolioGoal` type would have no producer. Deferred to the delegation slice, where a target is set |
| INT-02 | `portfolio-perturbation.test.ts` | Cutting the VA integrity read fails the Veterans Affairs case |

Not done in C2, and where it goes:

- C3: Justice, Interior, Agriculture, Commerce, Labor, HHS, HUD, Transportation, Energy, Education and Homeland Security on the shared models, and a project-delivery model for Transportation, Interior and Energy.
- C3: the acting-Secretary inconsistency above (`ministerFor` and `selectCabinetHolder` against `selectChairRunner`). It moves stewardship odds and war attrition, so it needs the balance harness.
- Phase F: a delegated or supervised work path per portfolio, and GOV-06 targets.
- Outcomes: no downstream rule reads a service yet (nothing in opinion, standing or the economy moves with a claims backlog). The service records are the authoritative record and the screen reads them; tying an outcome to them is a scoring change and needs the doctrine and the balance harness.
- Intake is flat: no filing season for returns, no rise in claims after a war. Each would need a sourced pattern.
- The normal-week intake (100) is an index. The engine carries no real volumes, so the screen never shows a count of real cases.

## Slice C3: the remaining portfolios

Built on the C2 primitives plus one new model. Line references are to the tree after C3.

### Per portfolio

| Portfolio | Mechanism (owner, authority, edges) | Secretary read, and where it is proved | Reading |
|---|---|---|---|
| Justice | `federal-cases`: owner DOJ under `prosecution`, `approval` by the Federal Judiciary under `adjudication`; plea shortcut | Integrity: a pliant Attorney General closes more cases by forcing pleas, 60% of them wrong, half back as rework. Plus the existing civil program and directive pace | Status "Clearing by forced pleas" (bad) even as the backlog shortens; when the courts bind, the action says they are independent and not the President's to direct |
| Agriculture | `farm-payments`: owner USDA under `farm-support`; refusal shortcut, ordinary refusal share 0.1 | Integrity, as Veterans Affairs; plus directive pace | Service row |
| Commerce | `export-licenses`: owner BIS under `export-control`, rolled up to Commerce | None in the service (BIS has its own head); the existing industry and trade programs | Service row |
| Labor | `wage-complaints`: owner Labor under `workplace-enforcement` | None in the service; its share of the domestic line, directive pace | Service row |
| HHS | `drug-applications`: owner FDA under `regulatory-approval`, rolled up to HHS | None in the service (the FDA Commissioner); domestic line, directive pace | Service row |
| HUD | `fair-housing-complaints`: owner HUD under `fair-housing` | None in the service; domestic line, directive pace | Service row |
| Education | `student-aid`: owner Education under `student-loans` | None in the service; domestic line, directive pace | Service row |
| Homeland Security | `disaster-assistance`: owner FEMA under `disaster-recovery`, rolled up to DHS | None in the service; directive pace (and its four orders, not in the fingerprint) | Service row |
| Interior | `drilling-permits`: owner Interior under `leasing` (a queue fits a permit better than a project) | None in the service; directive pace (and the leasing order) | Service row |
| Transportation | `highway-grants` program: owner DOT under `infrastructure-grants`, review by EPA under `permitting` | Competence at the award: projects arrive `0.6 × competence` through review | Program row, "Grant programs" |
| Energy | `reactor-demonstrations` program: owner DOE under `research`, review by the independent NRC under `nuclear-licensing` | Competence at the award, as Transportation | Program row; a stopped NRC review reads "Review stopped" and points at the Secretary's pick |

The project model (`projects.ts`) is the fourth service model from the C2 table. Review is the brief's prerequisite edge, implemented as the existing `approval` edge read as a serial stage (`slowestApproval`, exported from `executive-work.ts`), so no new edge type was added. Save v58 carries `Campaign.projects`.

### Person attribute to consumer map, added in C3

| Attribute | Reader | Which Secretary | Mechanism |
|---|---|---|---|
| integrity | `services.serviceTick` via `leadershipFor` | Attorney General | Whether a late caseload is cleared by forced pleas |
| integrity | same | Agriculture | Whether late applications are cleared by refusals |
| competence | `projects.awardReadiness` | Transportation, Energy | How far through review an award arrives |

`packages/world/src/dataset/stat-consumers.ts` still names only the Veterans Affairs integrity read under `services.serviceTick` and has no `projects.awardReadiness` entry. That file is outside this slice's ownership; its prose needs the three readers above added by whoever owns `packages/world`.

### Boundaries, and the test that holds each

- State cannot force consent; Treasury does not set the policy rate or appropriate: unchanged from C2, and still asserted by the State and Treasury perturbation cases.
- Justice is not rewarded for volume: `services.test.ts` "closes more cases under a pliant Attorney General only by forcing pleas"; player-core "reads a caseload cleared by forced pleas as worse": the pliant AG's late share is *lower* and the row is still `cutting-corners`, tone bad.
- Defense constrained by civilian authorization: C2's State approval on arms transfers. Access and logistics stay Phase E.
- Courts and independent agencies are not subordinates: the perturbation fingerprint includes every institution's delivery (the judiciary, NRC and EPA among them) and no Secretary moves one; the courts cap and stop federal cases (`services.test.ts`), the NRC stops reactor reviews whatever DOE's health (`projects.test.ts`), and the reading tells the President neither is theirs to direct.

### Acceptance, as it applies

| Test | Where | Holds |
|---|---|---|
| GOV-01 | `projects.test.ts` "a project cannot be built before its review clears"; `services.test.ts` federal cases | A healthy owner cannot outrun its review or the courts |
| GOV-02 | `portfolio-perturbation.test.ts`, now 15 cases, one per seat; the fingerprint gains every department's directive pace and both programs' review and build | Each Secretary moves at least its named entries and nothing foreign |
| GOV-03 | `projects.test.ts` "leaves the pipeline and the department where they were when the chair changes hands"; C2's services case | |
| GOV-04 | `projects.test.ts` "keeps what is underway equal to ...", over 120 weeks; services unchanged | |
| GOV-05 | `services.test.ts` "gives every department one service"; programs roll up to DOT and DOE; both summaries count by status | |
| GOV-06 | Not built | Still no producer of a target; delegation slice |
| INT-02 | Checked by hand: replacing `awardReadiness`'s competence with a constant fails Transportation and Energy; deleting the plea shortcut fails Justice | |

### Acting Secretaries (BL-114)

Fixed for the mechanism readers: `ministerFor` (`stewardship.ts`, read by `stewardSway` and `war-tick.commandQuality`), `budgetChair`'s domestic line, and `appropriationQuality`'s split line now resolve the chair through `selectChairRunner`, so an acting Secretary prices odds, attrition and appropriation as a confirmed one would; a chair nobody runs keeps its vacant value. Test: `department-ownership.test.ts` "runs a department's instrument, account and war through the deputy acting in an empty chair". **Not run: the balance harness** (owner's direction 2026-10-11, no long runs). The founding cabinet is fully seated, so the opening is unchanged; a campaign that loses a Secretary now pays less for it while an acting deputy sits. Left as they were: `counsel.ts` (`counselOnReply`, `dissentingCounsel`, `seatedViews`) still treats an acting chair as vacant. That is who sits in the room rather than how the department performs, and changing it moves conversation counsel; it needs its own decision.

### Not done in C3, and where it goes

- The balance harness after the BL-114 change.
- `stat-consumers.ts` prose (above).
- Outcomes: still no downstream rule reads a service or a program.
- Intake and award rates are flat indices; no filing season, no disaster surge, no appropriation-driven award rate.
- Phase F delegation and GOV-06 targets.

