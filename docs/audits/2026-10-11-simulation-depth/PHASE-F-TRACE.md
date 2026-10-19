# Phase F trace: delegation

The delegation half of Phase F (requirement 4, "bounded delegation that executes"; the modeling workbench half of F was built early, see PROGRAM.md "Requirement 8"). Read against the working tree of `feat/map-first` on 2026-10-11, with the operations redesign, C3, D1 and the I1 ledger slice uncommitted and other sessions editing `packages/engine` while this was read. Line numbers are from that tree; re-grep before trusting one. Nothing was built. One targeted run: `npx vitest run src/case-save.test.ts src/case-dispositions.test.ts` in `packages/engine`, 12 tests passed.

Each section separates **Facts** (read in source, with file:line), **Inferences** (what the facts imply, not checked by running anything) and, at the end, **Recommendations**.

## Finding dispositions

| Finding | Disposition | Evidence |
|---|---|---|
| C15 case automation (`case-automation.ts`, 33 lines) | **Present, unwired, and unsafe to wire as written** | Exported from the engine index (`index.ts:15`); its only callers are `case-save.test.ts:6,180-183`. It writes a bare case transition and skips the family act and the price the player's own path charges. Detail in section 2. |
| C05 healthiest executor leads (`institutions.ts:472-497`) | **Stale reference; the defect was fixed in C1** | `selectExecutorsFor` and `selectDeliveryCapacity` are gone (`git grep` finds them only in docs); deleted in `f33ff628f`, an ancestor of HEAD. Lines 467-510 of `institutions.ts` now hold `ARRIVAL_PER_TURN`, `CLEARANCE_PER_TURN` and `institutionTick`. The 0.7/0.3 blend survives on purpose in two places with a fixed lead. PROGRAM.md's disposition row still says "Still present" and should be corrected. Detail in section 3. |
| A delegated case is executed | **Not present** | `delegate` is a legal disposition and `delegated` a case status, but nothing acts on a delegated case and no player surface offers the disposition. Section 1.2. |
| GOV-06 targets (`PortfolioGoal`) | **Not present** | No target type, producer or store anywhere (section 5). BL-115 holds it. |
| The Chief of Staff's hand-off reads the Chief of Staff | **No** | `hand-off.ts` imports nothing about the person in the job (`hand-off.ts:4-12`). Section 1.3. |

## 1. Everything that acts on the President's behalf today

### 1.1 Declared defaults when a clock runs out

**Facts**
- Every case kind has a contract: urgency, who must respond, allowed dispositions, clock kind and default kind (`case-families.ts:20-36`). A case with a clock must declare a default or it cannot be raised (`cases.ts:33-35`).
- Each day the loop applies due defaults before the day runs (`advance.ts:161`, `withDueCaseDefaults(working)`), held by `scripts/verify-case-contract.mjs:22`.
- What a default does: an `allow-default` transition, actor `world`, narration "The deadline passed.", in a packet summarized "A deadline passed." (`case-defaults.ts:26-34,44-56`). The comment says it outright: "The case stays, with status `defaulted`. The legal sentence is not run." (`case-defaults.ts:36`).
- The default's content is a phrase, not an act: "Nothing in the engine executes them yet. They are stored so a later effect can be checked against the sentence the contract already names." (`case-families.ts:49-51`, phrases at `:52-68`).
- The real consequence is carried elsewhere, by the matter's own record. A bill becomes law unsigned by the legislation clock and the family case is settled afterward from the bill's status (`family-cases.ts:32-40`); a decision left to lapse is priced by the lapse source when its held document closes (`docket-loop.ts:33-39`; ARCHITECTURE.md:182 "the lapse source still prices a case that lapsed before its held document closed").
- A case kind whose contract has `defaultKind: "delegated"` cannot be raised through the family helper: `case-families.ts:77-78` throws "has a delegated default and no institution on the raise". No family uses it (`case-families.ts:20-36`).

**Who decides, commit path, bounds, Record**
- Who: the calendar. Path: `apply()` with a `simulate`/`world` packet, not `resolveAction`. Bounds: the family contract. Record: the packet is not marked `background` (`case-defaults.ts:26-34`), so `foreground.ts:13` keeps it on the ledger, and the case keeps a `defaulted` transition in its history.

### 1.2 The `delegate` disposition

**Facts**
- `CaseDisposition` includes `{ kind: "delegate"; institution: string }` (`case-types.ts:39`); the status it produces, `delegated`, is an **open** status (`cases.ts:9`), so a delegated case stays on the books.
- The only check on the delegate is that the string is not blank (`cases.ts:85-87`). Tests delegate to `"relief-desk"` and `"INST-X"`, neither a catalog institution (`case-save.test.ts:84`, `case-dispositions.test.ts:29`).
- Families that allow `delegate`: emergency, foreign-request, compact-call, court-response, press-response, institution-request (`case-families.ts:26,28,30,32-34`). Of those, `responseRequirement: "delegable"` is set on foreign-request, compact-call, press-response and institution-request.
- The engine's generic disposition commit can carry a delegation (`case-dispositions.ts:31-52`, priced "at nothing beyond the case's own record"), but player-core's tray never offers it: `CASE_TRAY_DISPOSITIONS` is defer, decline, allow-default, with the comment "'delegate' needs a chosen body" (`case-detail.ts:13-14`); `FamilyDispositionKind` excludes it (`family-cases.ts:181`).
- Nothing reads a `delegated` case to do anything. `git grep '"delegated"'` finds only the type, the status mapping and the family helper's throw.
- The case screen promises what the tray cannot do: "Responsible: The President, or the office the President delegates it to" (`apps/web/src/brief/CaseScreen.tsx:83`), and the lapse words for a delegated default, "It passes to the office that would act in your place." (`CaseScreen.tsx:15`).

**Inference:** a delegated case would sit open until its clock defaulted it or `seatFamilyCases` settled it from the matter's own record (`family-cases.ts:77-85`). Delegation is a label today, not an executor.

### 1.3 "Hand the rest to the Chief of Staff and continue"

**Facts**
- `handOffPlan` splits owed matters into what stays (constitutional deadlines, bill signatures, statutory clocks, anything within `LAST_CALL_DAYS` = 2 of its due date; `hand-off.ts:16,25-29`; `attention-policy.ts` `LAST_CALL_DAYS`) and what goes (`hand-off.ts:41-48`).
- What goes is resolved by the President's own inaction path: each row is put off with its own `deferMatterPacket`, and each staged decision is charged its `inactionPacket` and closed `allow-default` (`hand-off.ts:59-65,75-81`; `scenario-dispositions.ts:89-104`). The comment states the rule: the press "is never a cheaper way past a decision than walking past it" (`hand-off.ts:55-58`).
- The press is in `TimeControls.tsx:22,34,60`, with the note "The Chief of Staff puts off N items and leaves M decisions unanswered, at the price each already shows. Each goes on the Record." (`TimeControls.tsx:72`). TimeControls.tsx is uncommitted (operations redesign).
- `hand-off.ts` imports nothing about the Chief of Staff (`hand-off.ts:4-12`). The person in the job changes nothing the press does.
- The plan reads the device's attention settings (`TimeControls.tsx:22`, `preferences.attentionByKind`), which are preferences, not campaign state.

**Who decides, commit path, bounds, Record:** the player presses once; the plan is fixed by `mustComeFromPresident`. Path: player-core builds ordinary packets and applies them (`hand-off.ts:64,79`); no `resolveAction`. Bounds: the President-only list and the last-call window. Record: one player act per matter (ARCHITECTURE.md:182), with summaries "Handed to the Chief of Staff: …" (`hand-off.ts:61-62`).

**Inference:** this is a one-shot proxy for inaction, not delegation. It cannot act, only defer and stay silent. The backlog's earlier deferral of player-authored automation rules (the historical entry titled "the Chief of Staff handoff covers the need"; current scope is BL-112) rests on this press.

### 1.4 The Chief of Staff's triage of department requests

**Facts**
- The Chief of Staff's reading (competence and loyalty, equally; `cabinet.ts:139-140`) sets the bar a department's request or a Secretary's own act must clear to reach the Desk (`cabinet-week.ts:32-39,161-166`) and the order they are read in: a strong chief reads urgency, a weak one hears the most ambitious Secretary (`cabinet-week.ts:168-176`). One item a week reaches the Desk (`cabinet-week.ts:238-255`).
- What does not clear the bar is not presented. An unanswered request lapses at the week's close with a dated flag (`cabinet-week.ts` `housekeeping`, `requestLapsedFlag`); an ignored resignation offer costs loyalty (`IGNORED_OFFER_LOYALTY`, `cabinet-week.ts:29`).

**Who, path, bounds, Record:** the Chief of Staff, by the person's attributes. Path: `simulate`/`world` packets with a decision stamp in provenance (`cabinet-week.ts:232-234`). Bounds: the bar's floor and ceiling (0.2 to 0.6). Record: the item that reaches the Desk is recorded; what was screened out leaves no entry the player can read (inference from the code path; not checked on screen).

### 1.5 Departments running services and programs

**Facts**
- Thirteen services run every week on the shared queue (`service-catalog.ts`, `servicePhase` at `services.ts:256-269`), owned by the body the law gives the work to (`WorkDef.owner`, `executive-work.ts:36-43`). Two grant programs run on `projects.ts` (`projectPhase`, `projects.ts:234`).
- The one discretionary choice inside a service is the Secretary's: where a service has a shortcut, the runner's integrity decides how much of a late backlog is cleared by refusals or forced pleas (`services.ts:50,213-216`; runner from `selectChairRunner`, so an acting Secretary counts, `services.ts:239-243`).
- The President's levers are indirect. The service row's action sentence names the person or the body to change ("A Secretary with more integrity would decide the cases instead", `player-core/government/services.ts:139-153`); the chair acts on `/washington/office/$id` (appoint, dismiss, acting; `ChairActs.tsx:1-11`).
- Each service week is a `simulate`/`world` packet, "The departments work through the week's cases.", not marked background (`services.ts:256-269`).

**Who, path, bounds, Record:** the owning body, and its Secretary only through the shortcut. Path: `apply()` from a turn phase. Bounds: the service's definition (`standardWeeks`, `shortcut`). Record: a weekly world entry; the service screen reads `ServiceRuntime.last` only (`services.ts:100-107`), so no week-by-week history exists (BL-111 says the same of branch delivery).

### 1.6 Standing program, orders and directives carried out by departments

**Facts**
- The standing program: one stance per policy domain, held "always" (`state-campaign.ts:481-488`), delivered weekly at a quality set by the domain chair's competence (`policy.ts:308-313`). The President chose it; the chair delivers it.
- Executive orders and instrument acts are carried out by the owning department at a pace set by the Secretary's deference, fit, exposure and times overruled (`execution.ts:42-51,65,120-167`), and a slow walk delays them (`delayedDays`, `delayedWeeks`, `execution.ts:179-186`).
- Directives: the President tells a named body to do one thing of five kinds (`directives.ts:45-55`); a barred one is refused with a memorandum and kept forever (`directives.ts:85-100,455-496`); a lawful one is carried or slow-walked by the body and its Secretary (`directives.ts` `carriedStatus`). Composer: `player-core/oversight/directive-composer.ts:83,102`; route `/washington/oversight`.
- Emergency response: every home condition gets a federal response at `standby` posture without any act, led by the first body `RESPONSE_MEMBERS` names (`response.ts:103-141,275-279,290-306`).

**Who, path, bounds, Record:** the department or body, inside a choice the President already made. Paths: `apply()` from phases, and `issueDirective` returns a player `action` packet (`directives.ts:478-494`). Bounds: the statute (refusal memoranda) and the Secretary's will. Record: directives and orders are player acts on the Record; weekly delivery is world entries.

**Inference:** a directive is the closest thing to a standing order today (an `enforcement-posture` directive persists in `InstitutionRuntime.directives`), but it has no scope beyond its kind, no expiry, no report and no revocation.

### 1.7 Player rules (C15)

See section 2. Not reachable from any surface.

## 2. C15: `case-automation.ts`

**Facts**
- `automationPreview(campaign, rule)` lists open cases whose kind is in the rule, whose `urgency` is not `hard`, and whose contract allows the rule's disposition (`case-automation.ts:7-17`). `confirmedAutomationEffects` returns a bare `CaseEffect` per confirmed id, actor `player`, narration "Rule: <name>." (`case-automation.ts:20-33`). It returns effects, not a packet; the caller would wrap them.
- `CaseAutomationRule` carries id, name, kinds, `maxUrgency: "soft"`, a disposition and `enabled` (`case-types.ts:103-111`). No campaign field stores rules (`state-campaign.ts:775-820` has `cases` and `deferrals`, no rules).
- Callers: only `case-save.test.ts:6,172-184`. DECISIONS §3.6 names this file as where hard cases are kept out (DECISIONS.md:133-136). BACKLOG.md:1127 (cleanup item 13) lists `case-automation.ts` among lost features to delete.
- The hard-case guard is the case's `urgency` only. A non-critical authored scenario is raised `soft` (`player-core/conversation/scenario-cases.ts:100`); nominations and executive orders are `soft` families (`case-families.ts:23,25`).

**Does automated resolution go through the same commit path, cost and Record entry as a player resolution? No, on all three.**
1. Commit path. A nomination declined by hand is withdrawn by the nomination's own act and the case records the decline only after it (`family-cases.ts:208-213`). A rule declining a `nomination` case (soft, `decline` allowed) would write the case transition alone: the case would say withdrawn while the nomination goes on.
2. Cost. A decision left unanswered by hand is charged its `inactionPacket` before the case closes (`scenario-dispositions.ts:89-104`). A rule over `authored-scenario` with `allow-default` or `decline` would close a soft scenario's case with no charge, a cheaper path than the player's, against DECISIONS §3.7 and the hand-off's own rule (`hand-off.ts:55-58`).
3. Record. The transition says "Rule: <name>." with actor `player`; nothing names a rule-set, a delegate or a date it was authorized. `disposition` can also be `act` with any `actionId`, which would record an act that never ran.
4. §3.6 is narrower in code than in the rule. DECISIONS lists categories (constitutional acts, force, removal, treaties, budget lapses, emergency authorities, irreversible harm); the code enforces urgency only. The listed categories happen to be `hard` families today (`case-families.ts:22,24,26,27,29,31,32`), so the gap is latent, not live.

**Verdict:** C15 is not delegation and should not be wired as it stands. Either delete it (cleanup item 13) and move DECISIONS §3.6's "Where" to the delegation module, or replace it with the delegation scope check below. Do not keep both.

## 3. C05: the healthiest executor, against `department-ownership.ts`

**Facts**
- The executor sort is gone (fixed in C1, commit `f33ff628f`, an ancestor of HEAD; PHASE-C-TRACE.md "Finding dispositions"). `institutions.ts:467-468` are now the generic arrival and clearance constants and `institutionTick` begins at `:487`.
- The 0.7/0.3 blend remains in two places, each with a lead fixed by law or table, never by health:
  - `executive-work.ts:61,101-119`: the owner (`WorkDef.owner`, checked against catalog authorities by `workIsLawful`, `:84-87`) carries 0.7, the mean of support bodies 0.3, and the slowest approval caps or stops it.
  - `response.ts:369-379`: the first body `RESPONSE_MEMBERS` names leads at 0.7, the rest 0.3.
- `department-ownership.ts` maps cabinet roles to instruments, policy domains, scenario classes (ordered, first owns), budget accounts, orders and the order reviewer (`department-ownership.ts:24-30,53-66`, accessors `:144-200`). It has no mapping from a case kind (bill, emergency, foreign-request, press-response…) to a role.
- `CaseDisposition.delegate` names an institution by free string (`case-types.ts:39`), not a role or a person.

**How this bears on who a delegated task goes to**
- Department work already has its delegate fixed by law: `WorkDef.owner`, rolled up to its department (`serviceDepartment`, `services.ts:246-249`), run by `selectChairRunner` of the portfolio (`services.ts:241`). A delegation of service work cannot be routed to a healthier agency, and should not try: the only legitimate delegate is the owner's chair.
- Matters (cases) have no owner table. A delegation needs one: `scenarioClassDepartments` covers authored scenarios (`department-ownership.ts:158`), `instrumentDepartment` covers instrument acts (`:144`), and case kinds need a new row per kind (press-response to the Press Secretary, foreign-request to State, emergency to Homeland Security, and so on).
- Inference: if F let the player pick any institution string, it would reintroduce C05 by the back door: the player would route every task to the healthiest office. The delegate must be resolved from ownership, and the player chooses only whether to delegate, the bounds and the expiry.

## 4. What bounded delegation needs, and what already exists

| Piece | Needed | Exists today under another name | Gap |
|---|---|---|---|
| Delegate | A person in a seat, resolved through ownership | `selectChairRunner` (confirmed, else acting); `department-ownership.ts` accessors; `CaseDisposition.delegate.institution` (free string) | No case-kind-to-role table; the case delegate is unvalidated |
| Scope | A class of matter, a service or program, or an act family | `CaseAutomationRule.kinds` (`case-types.ts:107`); `CASE_FAMILIES.responseRequirement: "delegable"` (`case-families.ts:28,30,33,34`); `ServiceId`, `ProjectId` | No scope over services or programs; no scope over scenario classes |
| Bounds: severity ceiling | Never a hard case; never a §3.6 category | `maxUrgency: "soft"` (`case-types.ts:108`); `urgency` on every case | Enforced by urgency only (section 2.4) |
| Bounds: prohibited acts | Force, treaties, removal, emergency authority, budget lapse, constitutional acts | DECISIONS §3.6 list; `PRESIDENT_ONLY` in the hand-off (`hand-off.ts:16`) | No machine list keyed by act or case kind |
| Bounds: budget | A spend or political-cost ceiling per period | Each path's price: `inactionPacket`, a reply's cost, `silencePrice` (`scenario-dispositions.ts:65-76`) | Nothing sums what a delegate has spent |
| Bounds: expiry | A date, in days (DECISIONS §2.5) | `MinisterProposal.expiresTurn` (`state-cabinet-agenda.ts`); case `deferredUntil`; `agendaItemLive` (`cabinet-week.ts:70-71`) | Expiry in turns, not days, on existing records |
| Reporting duty | A periodic report on the Record, and a stop when a bound is hit | Department requests reaching the Desk (`cabinet-week.ts:238-255`); `consequence-return` stops (`advance.ts:164-175`); forecast records kept against outcomes per adviser (`Campaign.forecasts`, ARCHITECTURE.md:190) | No report record or attention source for a delegation |
| Revocation | Ends the delegation from a date; never rewrites what it did | Case history is append-only (`cases.ts:105-122`); directives kept forever (`directives.ts:99-100`) | No revoke act |
| Audit trail (GOV-06) | Every grant, amendment, target change and revocation dated and kept | `RulesState.log`, "the log is the whole history" (`rules.ts:213-217`); `CaseTransition` history; `causality.ts` provenance (DECISIONS §1.11) | No delegation or target log |
| Executor | Something that acts on in-scope matters each day, at the player's price | The hand-off (one-shot, inaction only); lapse sources in the day loop (`docket-loop.ts:8-15,33-39`) | Nothing acts |
| Delegate's judgment | Who the delegate is changes what they choose | `minister-will.ts` (`decideMinister`, `ministerSituation`, overruled memory `:39,60-66`); `willingness.ts` draws; `carryOutTerms` (`execution.ts:65`) | Not applied to cases |
| Cost of overriding the delegate | Overruling a Secretary is remembered | `timesOverruled` in `ministerSituation` (`minister-will.ts:66`); I1's `Tie` on `PersonRuntime.tie` (in flight, `state-campaign.ts` diff) | Not tied to delegations |

## 5. Targets

**Facts**
- No `PortfolioGoal`, `MetricTarget`, service target or goal type exists in engine or player-core (`git grep -i "MetricTarget|PortfolioGoal|serviceTarget|goal"` finds only unrelated uses in `delegations.ts:102`, `governors.ts:227`, `house-seats.ts` and the act catalogue's `ActGoal`).
- The nearest thing is authored and fixed: a service's `standardWeeks` (4, 13 or 26), the age at which a case counts as late (`services.ts:77-78`), read by `lateShare` and the status. A program's `plannedWeeks` plays the same part (`projects.ts:89-94`).
- Pledges are the only player-made commitment with a due date and a verdict (`pledges.ts:27-42`), and they are about platform planks, not service performance.
- Past performance is not kept: `ServiceRuntime` holds the cohorts, the rework pipeline and `last` week only (`services.ts:100-107`). A target judged against history has no history to judge against.
- The generic weekly ring and monthly fold exist (`economy-archive.ts:20,39`, `foldIntoArchive` and `recordWeek`), reused by the opinion and relations records (PROGRAM.md "Opinion and relationship history").

**Where one would be stored and read (recommendation)**
- Stored: on the delegation that sets it, as an append-only list of target revisions, each `{ at, metric, threshold, by, reason }`; a lowered target is a new revision, never an edit. Performance is a separate observed record per service (`serviceRecord`, a ring of weekly `ServiceWeek` plus the late share, via `recordWeek`/`foldIntoArchive`), written once at the week's close (DECISIONS §1.10).
- Read: the delegation's report (did the delegate meet the target in force that week), the service row, and the Record. GOV-06 is then a test: lower a target, and every past week's verdict is judged against the revision in force that week.

## 6. Save

**Facts**
- `CURRENT_SCHEMA_VERSION = 63`, readable window 51 to 63 (`save.ts:102-110`), already in the working tree from the ledger slice: v63 moves Hill warmth and budget promises onto people (`save.ts:96-100`, `withTieLedger` imported at `:8`). v62 is `forecasts` (`save.ts:92-94`).
- The pattern for every field since v52: optional on `Campaign`, absent on an older save, never backfilled; the phase that writes it opens it on the save's next week (`save.ts:60-100`; DECISIONS §9.3). `normalizeCampaign` composes repairs and derivations (`save.ts` `normalizeCampaign`), and `repairCases` drops a damaged case without recording a decline (`case-defaults.ts:14-24`).
- `state-campaign.ts` is 820 lines in the working tree, over the 800-line budget and not in `LOGIC_DEBT`; the file-size gate was already red at baseline (PROGRAM.md "Baseline").

**Shapes Phase F would add (proposal), all optional and absent on load**
- `Campaign.delegations?: Readonly<Record<string, Delegation>>`, with `Delegation = { id, delegate: { role }, scope, bounds: { severity: "soft", prohibited, budget?, expiresOn }, reportEveryDays, grantedAt, log: readonly DelegationChange[], targets?: readonly TargetRevision[] }`. Defined in its own `state-delegation.ts` and imported, as `state-cabinet-agenda.ts` and `state-ties.ts` are, so `state-campaign.ts` grows by one line.
- `Campaign.serviceRecord?` (and `projectRecord?`), the observed weekly history, opening at the save's next close with `since` set.
- One save version for each slice that adds state: v64 after the ledger's v63 lands, not before. Every step needs its round-trip test and an "older save reads honestly" test, as v57 to v62 have.

## 7. Player surfaces

**Facts**
- Case: `/brief/clock/$id` and the case screen (`apps/web/src/brief/CaseScreen.tsx`, uncommitted), tray at `:20-40`, the "Responsible" fact at `:83`.
- The hand-off: `TimeControls.tsx` (uncommitted), on the Brief.
- Attention settings: `apps/web/src/screens/AttentionSettings.tsx`, device preferences only.
- Services and programs: `apps/web/src/washington/executive/Services.tsx` on `/washington`, reading `departmentServices` and the grant programs (`player-core/government/services.ts`, `projects.ts`, both uncommitted).
- A Secretary's office: `/washington/office/$id` (`OfficeScreen.tsx`, `ChairActs.tsx`), where appointments and dismissals are taken.
- Directives: `/washington/oversight`.
- Uncommitted operations-redesign files Phase F would touch: `brief/CaseScreen.tsx`, `brief/TimeControls.tsx`, `brief/MatterRow.tsx`, `player-core/desk/family-cases.ts`, `family-sources.ts`, `attention.ts`, `government/services.ts`, and the untracked `washington/executive/OfficeChart.tsx`.

**Where delegation belongs (recommendation)**
- Configure where the work is owned: a "Delegate" section on the Secretary's office (`/washington/office/$id`) for that department's services and matters, and a "Delegate this kind of matter" action on the case screen that opens the same form scoped to the case's kind. One form, two doors.
- Review where the President already looks: a "Delegated" list on the Brief (what each delegate did since the last look, spend against budget, any bound hit), and the delegation's own page as a record with its log, targets and a Revoke action.
- Task parity: the form is a short stack of fields (scope, bounds, expiry, report cadence) with a projected cost line, which composes at 390 as a single column and at 1440 beside the office's roster; the review list is rows, not a table, per the results-list rule. No hover-only control.

## 8. Proposed slice plan

Order assumes the ledger slice (I1, save v63) lands first. "Balance" means the harness must be re-run before the slice closes.

### F1. The delegation record (engine and player-core; no executor)
- **Scope:** `Delegation` type, `delegation` effect through `apply()` (grant, amend, revoke; each appends to `log`), validation (delegate resolved through ownership; a case-kind-to-role table added to `department-ownership.ts`; §3.6 categories refused by kind, not by urgency), player-core action packets with narration, save v64. Decide C15: delete `case-automation.ts` and `CaseAutomationRule`, or fold the preview into F1's scope check. Validate `CaseDisposition.delegate` against the catalog.
- **Files:** new `packages/engine/src/delegation.ts`, `state-delegation.ts`; `effect-types.ts`, `effects.ts`, `save.ts`, `department-ownership.ts`, `cases.ts`, `case-types.ts`, `index.ts`; new `player-core/src/delegation/`; `docs/SCHEMA.md`, `docs/ARCHITECTURE.md`, DECISIONS §3.6 "Where" (owner edit).
- **Balance:** no; nothing acts yet.
- **Proof:** a hard case and each §3.6 kind cannot enter a scope; an amend appends and never rewrites; revocation ends the delegation from its date and leaves the log; a blank or non-catalog delegate is refused; save round trip; an older save loads with no delegations.
- **Collisions:** ledger: `effects.ts`, `effect-types.ts`, `save.ts`, `state-campaign.ts` (all being edited now); land after I1. Phase E: none in files. Phase G: none.

### F2. Delegated matters execute (engine day loop, player-core source)
- **Scope:** a delegation source passed to `advanceUntilAttention` beside `lapseSources` (`docket-loop.ts:8-15`), so the store, the modeling workbench and stepping by day all run it the same way (DECISIONS §2.3). Each day, for open in-scope soft cases, the delegate picks a disposition with a `minister-will`-style decision from who they are, and the source builds exactly the packets the President's path builds (the family's own act, the `inactionPacket`, the reply's packet), never a bare transition. Provenance names the delegation and the person; the Record says "by the Secretary of State, under your delegation of <date>". A spend ledger per delegation sums the prices charged; reaching the budget, the expiry or a matter outside scope stops the run with a `consequence-return`-style attention item.
- **Files:** `delegation.ts`, `advance.ts` options, `docket-loop.ts` or a sibling, `player-core/campaign/store.ts` (`advanceOptions`), `player-core/desk/family-cases.ts`, `conversation/scenario-dispositions.ts`, `modeling/` advance.
- **Balance:** not for campaigns without a delegation; the engine harness cannot grant one. Run it anyway if the delegate's choice reads any constant the harness also reads.
- **Proof:** a delegated case closes at the same price the President's hand would pay (paired test against the manual path, byte-equal metrics); delegated and undelegated runs agree on everything outside scope; one 28-day advance equals 28 one-day advances with a delegation active; the workbench projects a delegated matter the way the live game resolves it; a delegate with different attributes chooses differently on the same case; the budget bound stops the run.
- **Collisions:** Phase G: the delegate's decision draws need their own stream key (DECISIONS §1.3), and G is re-keying streams; register the key in G's scheme or land F2 after G. Ledger: overruling a delegate's choice should cost rapport through I1's `tie` effect. Phase E: E's new act kinds (deployment orders, reservations) must be added to the prohibited list.

### F3. Department work under delegation, with targets (GOV-06)
- **Scope:** a service-scoped delegation: the President sets a target (late share at or under a figure by a date) and bounds (no shortcut; a refusal-share ceiling); the Secretary's integrity still decides, but a bound caps `pressured` and a breach stops the run. Target revisions append; an observed `serviceRecord` keeps weekly history. Fold BL-111's delivery series in if the same ring serves both.
- **Files:** `services.ts`, `projects.ts`, `delegation.ts`, a new `service-record.ts`, `save.ts` (v65 or folded into v64 if F1 and F3 land together), player-core `government/services.ts`.
- **Balance:** only if a service outcome feeds opinion, standing or the economy (BL-115's scoring decision). Without it, no.
- **Proof:** GOV-06 (lower a target; past weeks keep the verdict of the target in force then); GOV-04 still reconciles under a no-shortcut bound; GOV-03 (a change in the chair keeps the delegation and its record, and the new runner inherits the bounds); INT-02 (cutting the bound read fails a test).
- **Collisions:** ledger: none in files. Phase E: none. Phase G: none if no draw is added.

### F4. Surfaces
- **Scope:** the configure form on the office and the case screen, the Delegated list on the Brief, the delegation record page with Revoke, the "Responsible" line made true, the case tray offering "Delegate" where the family allows it. Phone and desktop composed together; verified live at 390×844 and 1440×900, plus 320, 1280×800 and 1920×1080.
- **Files:** `brief/CaseScreen.tsx`, `brief/TimeControls.tsx`, `washington/executive/OfficeScreen.tsx`, `Services.tsx`, a new route; `player-core/desk/case-detail.ts`, glossary entries.
- **Balance:** no.
- **Proof:** player-core view-model tests; Playwright captures at the six sizes; no horizontal scroll at 320.
- **Collisions:** every file is already modified by the uncommitted operations redesign; land it after that work is committed.

### F5 (optional). The hand-off reads the Chief of Staff
- **Scope:** make the person in the job matter: what a strong chief takes off the desk, and what a weak one lets through, using `chiefOfStaffReading`. Keep "never cheaper than by hand."
- **Balance:** no engine change. **Proof:** two chiefs, one desk, different plans, same prices. **Collisions:** `TimeControls.tsx`, `hand-off.ts`.

## Strongest failure mode, and the best alternative

**Failure mode:** delegation becomes a cheaper or timing-dependent way past the presidency. If the executor runs at the store's seams (as the hand-off does) instead of inside the day loop, the result depends on when the player looks (against DECISIONS §2.3) and the workbench's projections disagree with the live game; if it writes bare transitions (as C15 does), it skips prices the player pays (against §3.7). Either would let the game play itself, which is what §3.6 exists to stop. Control: F2's paired price test and the 28-days-equals-28-single-days test are acceptance, not extras.

**Best alternative:** no standing delegation at all. Keep delegation per case: the President delegates one matter at a time to its owner, the owner acts once at the President's price, and the hand-off stays the only bulk control. It is smaller, needs no budget or expiry, and cannot run away, but it does not meet requirement 4's "bounded delegation that executes" for department work, and it leaves GOV-06 with no producer.

**Conclusion:** accepted with controls. Build F1 and F2 with the paired-price and pacing tests as acceptance; treat a standing delegation as an automation rule under DECISIONS §3.6 (owner to confirm); and resolve the delegate from ownership, never from the player's pick of an institution.

## Open decisions for the owner

1. Is a standing delegation an "automation rule" under DECISIONS §3.6? This trace assumes yes, so hard cases and the §3.6 categories are out of any scope.
2. Delete `case-automation.ts` (cleanup item 13) or fold it into F1. Recommendation: delete, and move §3.6's "Where" to the delegation module.
3. Does a delegate ever choose a scenario reply (an `act`), or only defer, decline and let a default stand? Choosing replies is the real execution and the bigger content and balance question.
4. Does a service outcome feed a scored figure (BL-115)? It decides whether F3 needs the balance harness.
