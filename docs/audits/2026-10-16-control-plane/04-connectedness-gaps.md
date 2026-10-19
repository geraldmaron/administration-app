# 04. Connectedness gaps: where the player is not one control plane

Date: 2026-10-16. Read-only audit. Scope: every route in `apps/player/app` and the screens under `apps/player/src` that they mount. All paths below are relative to `apps/player/` unless they start with `docs/` or `packages/`.

## Verdict first

The game has a strong decision-and-review pattern (compare against waiting, then one confirmation) but it is applied one object at a time, on the object's own page. The owner's three examples are all confirmed as real gaps:

- **Tariffs:** one act sets one rate on one kind of goods for one country (`src/world/act/Terms.tsx:35,84-98`). There is no board where several tariffs are visible and editable together.
- **Troops:** a deployment is one country, one slider (`src/world/act/Terms.tsx:104`). Re-posting forces between commands is three dropdowns (`src/security/CommandActs.tsx:83-87`). The "Where US forces are" panel is a list, not a map (`src/security/SecurityScreen.tsx:53`).
- **States:** managing a state inline now exists on the Nation page, but it is uncommitted work in this tree (`src/nation/home/SelectionPanel.tsx`, `ManageStates.tsx` shows as deleted in git status). The State page still sends the player to a sub-desk (`src/nation/state/StateScreen.tsx:44,86`), so there are two paths to the same act.

Counts across 42 rated screens: **13 connected, 17 partial, 12 disconnected.** Recommendation: build one persistent "selection plus act dock" pattern (select on a map or list, see the live terms and consequences, stage, review once) and move tariffs, forces, states and emergencies onto it first. Those four are the owner's examples and share one missing piece, a multi-target staged plan.

How this was done: static read of the source plus `docs/NORTH_STAR.md`, `docs/DESIGN.md`, `docs/PLAN.md`. I did not run the app, so anything about runtime look and feel is UNCONFIRMED. The tree has uncommitted Nation changes; I audited the working tree. `CLAUDE.md` still describes `apps/web`; the active player is `apps/player` (Expo, per `docs/PLAN.md` line 1), and that is what I walked.

## Legend

- **Inline?** Can the player change the thing on this screen: Yes, Partly, No.
- **Navs** is the count of route changes (or sub-desk swaps) for the most common action, starting from this screen.
- **Missing data**: what the choice depends on that is not on screen at the point of choice.
- **Multi**: is acting on several things at once natural here, and is it offered (Needed, Offered, n/a).
- Verdict: **C** connected, **P** partial, **D** disconnected.

## Screen tables

### Brief and calendar

| Screen | File | Shows | Inline? | Navs for common action | Missing at point of choice | Multi | Verdict |
|---|---|---|---|---|---|---|---|
| Brief `/brief` | `app/(game)/brief/index.tsx`, `src/brief/Matters.tsx:55,77` | Ranked "needs you" list: decisions, cases, owed rows, vacancies, unanswered stories | No. Every row is a link; the lead has "Take it up" | 1 to a decision; 2 to 3 for a clock or vacancy | Options and odds of the lead matter are not previewed | Needed (triage several, defer, answer the easy ones) | P |
| Decision `/brief/decision/[id]` | `src/decision/Decision.tsx:94` | Briefing, every answer vs waiting, projection, advisers | Yes (compare, review, commit, defer, decline) | 0 | Nothing material | n/a | C |
| Clock `/brief/clock/[id]` | `src/decision/ClockScreen.tsx:60` | Due date, posture, counsel | No. "Your answer" is a button that navigates to the real act | 2 (Brief, Clock, door) | The act's options are on the next screen | n/a | P |
| Scandal `/brief/scandal/[id]` | `src/decision/ScandalScreen.tsx:112` | Heat, people, responses vs silence | Yes | 0 | none | n/a | C |
| Metric `/brief/metric/[id]` | `app/(game)/brief/metric/[id].tsx` | Redirect to the owning screen (DESIGN.md) | n/a | n/a | n/a | n/a | not rated |
| Calendar `/calendar` | `app/(game)/calendar/index.tsx`, `src/calendar/rows.ts` | Dated obligations, term timeline, month grid | No. Rows are links | 1 to 2 | What the date requires is shown; the act is not | Needed (defer or prepare several) | D |

### Executive, Congress, Courts, Oversight

| Screen | File | Shows | Inline? | Navs | Missing at point of choice | Multi | Verdict |
|---|---|---|---|---|---|---|---|
| Executive `/washington` | `src/executive/ExecutiveScreen.tsx`, `OfficeBoard.tsx:114`, `OfficeInspector.tsx:100` | Offices with staffing, delivery, "N need you"; inspector beside the board | No. Inspector offers "Open the office" only | 3 to nominate (card, Open the office, Compare the candidates, then pick) | Candidates, Senate count only after Open | Needed (fill all vacant chairs) | P |
| Office `/washington/office/[id]` | `src/executive/OfficeScreen.tsx`, `ChairActs.tsx:68`, `AgendaActs.tsx` | Holder readings, proposals, resignations, factions | Yes: dismiss, grant, accept, reconcile in place; fill is a `?fill=` sub-view | 0 to 1 | none | n/a | C |
| Person `/washington/person/[id]` | `src/dossier/PersonActs.tsx:143` | Dossier, remove, support request | Yes | 0 | none | n/a | C |
| Congress Overview | `src/congress/CongressScreen.tsx`, `Overview.tsx` | Chambers, disposition, leaders | No acts; select state shows delegation | 1 to a bill | Count shown, but no whip by member | Needed (whip several members) | P |
| Congress Bills | `src/congress/Bills.tsx:21,37,66` | Desk, floor, committee, agenda, settled | Partly: transmit a proposal in place; sign or veto needs the bill page | 1 to sign or veto | Note says no member has promised a vote | Needed | P |
| Congress Nominations | `src/congress/Rosters.tsx:12-37` | Names with the Senate, and names not yet sent | No. Read-only, even for "still being prepared, not sent yet" | 2 to act (Executive office or Courts) | n/a | Needed | D |
| Congress Members | `src/congress/Rosters.tsx:76` | Searchable roster | No. Lobbying lives on `post/[id]` | 2 | Disposition not shown beside the name in the list | Needed (lobby a bloc) | D |
| Congress States | `src/congress/Rosters.tsx:116` | Delegation by state | No | 2 | n/a | Needed | D |
| Congress War powers and funding | `src/congress/Rosters.tsx:149` | Notices owed, funding status | No. "Open the War Powers paper" link | 1 to 2 | n/a | n/a | D |
| Bill `/washington/congress/bill/[id]` | `src/congress/BillScreen.tsx:80-95`, `BillActs.tsx:22` | Text, whip count, sign or veto compare, outreach, budget instruction | Yes | 0 | none | n/a | C |
| Post `/washington/congress/post/[id]` | `src/congress/PostScreen.tsx:39` | Holder, lobbying approaches compared | Yes | 0 | none | n/a | C |
| Courts `/washington/courts` | `src/courts/CourtsScreen.tsx`, `Docket.tsx:19-20`, `Nominations.tsx:34` | Bench, docket, nominations | Partly: nominate and withdraw in place; "You need to respond" rows are doors | 1 to answer a case | Strike-down odds shown on docket | Needed (several seats) | P |
| Court case `/washington/courts/case/[id]` | `src/courts/CaseScreen.tsx`, `CaseParts.tsx:122,155-156` | What is challenged, votes, timeline | No acts found here (links to order and Act). Where the response is taken is UNCONFIRMED (possibly `/brief/clock/[id]`, `src/decision/CaseScreen.tsx:39`) | 1 to 2 | The challenged order cannot be rescinded from here | n/a | D |
| Oversight `/washington/oversight` | `src/oversight/*.tsx`, `Appointments.tsx:106` | Inquiries, directives, inspectors, notices, officers, appointments | Yes, all in place through `ActChooser`; appointments is a batch plan across seats | 0 | none | Offered for appointments only | C |

### Nation, policy, budget, economy, emergency

| Screen | File | Shows | Inline? | Navs | Missing at point of choice | Multi | Verdict |
|---|---|---|---|---|---|---|---|
| Nation `/nation` | `src/nation/home/NationHome.tsx:85-110`, `SelectionPanel.tsx:68`, `StateActs.tsx`, `Levers.tsx` | Real map, state card with acts, states table, needs list, opinion, four levers | Yes for one state (uncommitted). No for policy, budget, economy, emergencies: cards navigate | 0 for a state; 1 for any lever | Lever cards show one reading, not the setting | Needed (several states) | P |
| State `/nation/state/[id]` | `src/nation/state/StateScreen.tsx:44,86`, `StateViews.tsx:214,256`, `LocaleDesk.tsx` | Dossier sections, conditions, acts | No. "Answer the ..." and "Send federal forces" navigate to `?act=` and `?power=1` | 1 | Request, odds and governor assent appear only after the nav | n/a | P |
| Policy `/nation/policy` | `src/nation/policy/PolicyScreen.tsx:45,88,96` | Six domains, stance compare, orders tab, implementation | Yes for one domain's stance | 0 for stance; "Nobody is in charge" has no fill action | State exposure is a ranked list, not a map | Needed (adopt a package across domains) | P |
| Order `/nation/policy/order/[id]` | `src/nation/policy/OrderScreen.tsx:62`, `OrderFollowups.tsx:30` | Draft, terms, sign vs wait, rescind | Yes, including rescind | 1 from the pipeline (`OrderPipeline.tsx:14` rows are links) | none | Needed (sign several ready orders) | C |
| Budget `/nation/budget` | `src/nation/budget/Allocation.tsx:50`, `Draft.tsx`, `Request.tsx` | Slider per account, live draft projection, reset, request | Yes. The only staged draft in the game | 0 | none | Offered | C |
| Economy `/nation/economy` | `src/nation/economy/EconomyScreen.tsx:17`, `Markets.tsx`, `Levers.tsx`, `Panels.tsx:101` | Overview, markets, trade, finances, "What you can do" tab | Partly: levers on a separate tab from the prices they act on | 1 (tab) | Crude and pump prices are not beside the reserve lever | n/a | P |
| Emergency `/nation/emergency` | `src/nation/emergency/EmergencyScreen.tsx:83,123,185` | Conditions, declarations, renewals | Partly: acts open in a sheet; map slot is a list | 0 | n/a | Needed (renew or end several) | P |

### World and security

| Screen | File | Shows | Inline? | Navs | Missing at point of choice | Multi | Verdict |
|---|---|---|---|---|---|---|---|
| World `/world` | `src/world/overview/MapPanel.tsx:65`, `GovernmentsTable.tsx`, `Kpis.tsx` | Situation, governments, regions; "map" is a legend list | No. All rows are links | 2 (country, Take action) | Tariffs and measures in force not shown in the list | Needed (act on a set of countries) | D |
| Country `/world/nation/[id]` | `src/world/nation/NationScreen.tsx:88`, `Economy.tsx:84`, `Diplomacy.tsx:48,78` | Standing, trade by goods, measures, commitments | No. "Set up a tariff", "Lift it" and "Take action" navigate | 1 | Rate currently in force is shown, the new rate is not | Needed | P |
| Act `/world/nation/[id]/act` | `src/world/act/ActDesk.tsx:90-96`, `Terms.tsx` | Objective, instrument, terms, assessment vs waiting, authorize | Yes, for one country and one instrument | 0 | Cross-country effects (retaliation) shown per act only | Needed | P |
| Org `/world/org/[id]` | `src/world/sets/OrgScreen.tsx:136-145` | Members, pledges, commitments | No. "You reach out to one country at a time", then navigates | 2 | n/a | Needed (summit with several members) | D |
| War `/world/war/[id]` | `src/world/war/WarScreen.tsx:28-66` | Intensity, forces, join, end, compact, congressional approval | Yes | 0 | Map is a list (`:275`) | n/a | C |
| Treaty `/world/treaty/[id]` | `src/world/sets/TreatyScreen.tsx:100-110` | Terms, sign, ratify, withdraw | Yes | 0 | none | n/a | C |
| Security `/world/security` | `src/security/SecurityScreen.tsx:53,104`, `Intel.tsx:60`, `Operations.tsx:26` | Intel, commands, readiness, covert findings, collection | Partly: intel acts open in a sheet; commands are links | 1 to a command | Forces map is a list | Needed (stop or share several taskings) | P |
| Command `/world/security/command/[id]` | `src/security/CommandScreen.tsx:114`, `CommandActs.tsx:83-87` | Posture, forces by zone, acts | Yes through a sheet; three selects to move forces | 1 from Security | No map; no before and after of both commands side by side | Needed (re-post several services) | P |

### Press, record, compare, reference, settings, founding

| Screen | File | Shows | Inline? | Navs | Missing at point of choice | Multi | Verdict |
|---|---|---|---|---|---|---|---|
| Press `/washington/office/press` | `src/news/PressScreen.tsx`, `RespondView.tsx:91,116` | Coverage, desks, respond, abroad | Yes on the Respond view; other views are links | 1 (tab) | n/a | n/a | P |
| Dispatch `/record/press/dispatch/[id]` | `src/news/Dispatch.tsx:92` | One story | No. "Respond to the press" navigates to the Respond tab without this story | 1 | The story is not carried across | n/a | D |
| Record `/record` | `src/record/RecordWorkspace.tsx`, `RecordSections.tsx:38` | Timeline, arcs, pledges | No. Pledge "door" is a link | 1 | n/a | n/a | D |
| Event `/record/event/[id]` | `src/record/RecordDetail.tsx:92-105` | What happened, readings, causes | No amend, lift or rescind from an entry | 2 to amend (to country or order, then Manage) | n/a | n/a | D |
| Compare `/compare` | `src/compare/CompareWorkspace.tsx:6,114` | Multi-subject comparison with CheckCard | Multi-select for subjects; no act handoff | 2 to act on a chosen country | n/a | Offered (read only) | P |
| Handbook (3 routes) | `app/handbook/*.tsx` | Chapters, terms | Reference. No links to the control that applies the rule | n/a | n/a | n/a | D (by design) |
| Settings | `app/settings.tsx`, `src/settings/Appearance.tsx` | Theme, contrast, map, attention | Yes, applies at once | 0 | Theme control is not in the shell (DESIGN.md asks for both) | n/a | C |
| Founding | `app/founding/index.tsx`, `src/founding/FoundingFooter.tsx:36` | Stepper, stages, oath review | Yes | 0 | none | n/a | C |

Not rated (utility, not walked in depth): `app/administrations.tsx`, `app/legacy.tsx`, `app/ending.tsx`, `app/recovery.tsx`, `app/(game)/more.tsx`, `app/(game)/catalog/index.tsx`, `app/dev/seed.tsx`, `app/(game)/dev-map/index.tsx`.

## The seven questions, answered once across the app

(a) **Shown but not changeable where shown.** Tariffs in force and sector rates (country page, `Diplomacy.tsx:36-50`), commitments (`Diplomacy.tsx:78`), a policy area's missing chair (`PolicyScreen.tsx:45`), a vacant seat on the executive board (`OfficeInspector.tsx:100`), un-sent nominations (`Rosters.tsx:12`), force posture on the Security map (`SecurityScreen.tsx:53`), fuel prices vs the reserve lever (`Markets.tsx` vs `Levers.tsx`), and every pledge on the Record (`RecordSections.tsx:38`).

(b) **Navigation count.** Most common acts: answer a decision 1 (good); answer a deadline 2; nominate from the Executive board 3; set a tariff from the World list 3 (World, country, Take action or Set up a tariff); lift a tariff 2; deploy forces 3; sign a waiting bill from Congress 1; adopt a stance 1; declare an emergency 1 plus a sheet. On the Nation page a state act is 0 (selection stays on the page).

(c) **Data at point of choice.** Best-in-class where `CompareAuthorize` or `CompareChoices` is used: price, odds, who objects, legal gate. Gaps: "No member has promised their vote yet" (`Bills.tsx:37`) while the bill page has the whip count; State page shows request and governor assent only after navigating (`StateScreen.tsx:44`); the act desk prices one instrument at a time, so a tariff and its retaliation are not compared with an alternative sanction side by side.

(d) **Multi-select and bulk.** Offered in only three places: the budget editor (all accounts), the appointments plan (`Appointments.tsx:106`) and the Compare subject picker (`CompareWorkspace.tsx:114`). Needed and missing: tariffs, deployments, emergencies, state visits, lobbying, nominations, taskings, order signing, Brief triage.

(e) **See and amend a pending or recent decision where its effect shows.** Partial: orders can be rescinded on the order page (`OrderFollowups.tsx:22-36`), a nomination can be withdrawn on Courts (`Nominations.tsx:12-18`), measures can be lifted on a separate Manage screen (`Manage.tsx:28`). Nowhere does a Record entry, a state, or the economy panel offer "change this".

(f) **Map.** Real map only on Nation (`src/nation/home/StageMap.tsx`) and the State dossier. Everything else uses `MapPanelSlot` (a list under a heading): World, Security, Command, Country, Org, Treaty, War, Emergency, Locale desk (`grep MapPanelSlot`). Selection on a map drives actions only on Nation.

(g) **"What needs me" that starts the action.** The Brief has the list; its rows are links (`Matters.tsx:77`). Nation's "Needs your attention" does start the action (`Attention.tsx` calls `onAct`, which selects the state and scrolls to its card), which is the model to copy. Nav badges are never populated: `app/(game)/_layout.tsx:39` calls `navGroups()` with no counts although `NavCounts` is defined (`src/shell/nav.ts:25`).

## Ranked gap list

Ranked by how much each hurts the owner's "fully connected, optimal path" expectation, then by reach. Sizes: S under a day, M a few days, L a week or more.

| # | Gap | Evidence | Symptom the owner sees | Proposed fix | Size |
|---|---|---|---|---|---|
| 1 | No tariff board: one country, one kind of goods, one rate per act | `src/world/act/Terms.tsx:35,84-98`; `src/world/nation/Economy.tsx:84`; `src/nation/economy/Panels.tsx:101` | To tariff three goods or three countries the player runs three separate acts, each on its own page | Build a trade-measures workspace: partners x goods grid with current rate, editable cells, one staged plan, one review | L |
| 2 | Force deployment is one country, one slider; re-posting is three dropdowns | `src/world/act/Terms.tsx:104-108`; `src/security/CommandActs.tsx:83-87` | No way to move troops to several countries at once, and no picture of where they go | Deployment workspace: map plus list, multi-select destinations, allocate by service, show distance and readiness, stage then review once | L |
| 3 | Only Nation has a real map; all other "maps" are lists | `MapPanelSlot` used in `SecurityScreen.tsx:53`, `CommandScreen.tsx:118`, `NationScreen.tsx:30`, `WarScreen.tsx:275`, `EmergencyScreen.tsx:185`, `OrgScreen.tsx:159`, `TreatyScreen.tsx:135`, `MapPanel.tsx:65` ("until the map lands") | Geography is promised by DESIGN.md section 1 but is absent where it answers the question | Mount the shared `MapView` (as in `StageMap.tsx`) in World, Security, Emergency, War and make selection feed the act dock | L |
| 4 | Brief is a list of links, not an action queue | `src/brief/Matters.tsx:54,77`; `ClockScreen.tsx:60` | A deadline takes Brief, Clock, then the act page: two hops to reach what the Brief already knows | Open the answer in a side sheet from the Brief row; keep defer and decline on the row; clocks open the act, not a dossier | M |
| 5 | Nation levers are doors, not controls | `src/nation/home/Levers.tsx` (whole file), `NationHome.tsx:108` | "Run the country" shows four cards and every one navigates | Put the live setting on each card (stance chips, budget lines, fuel lever, declare), opening the same compare sheet | M |
| 6 | No staged plan across targets; each act reviews alone | `src/nation/policy/PolicyScreen.tsx:88`, `src/world/act/ActDesk.tsx:82`; only exception `Appointments.tsx:106` and `Allocation.tsx` | Several related decisions need several reviews and cannot be compared as a package | Add a shared "plan" tray (add acts, see combined cost and odds, authorize together or individually) | L |
| 7 | No "recent and pending actions" list; nothing can be amended from where its effect shows | no such panel (searched `src` for recent actions); `Manage.tsx:28`, `OrderFollowups.tsx:22`, `Nominations.tsx:12` are isolated one-offs | The player cannot answer "what did I set in motion and can I change it" | Add an "In motion" panel (orders, measures, nominations, deployments, declarations) with Lift, Amend, Withdraw; mount on Nation, Brief, Record | L |
| 8 | Lifting a trade measure leaves the country page | `src/world/nation/Diplomacy.tsx:48` -> `actHref(... manage)`; `src/world/act/Manage.tsx:28` | A tariff in a list has "Lift it" that opens a different screen | Lift in place from the measure row using the existing `CompareAuthorize` in a sheet | S |
| 9 | Executive board shows vacancies and needs but cannot fill | `src/executive/OfficeInspector.tsx:100`; `ChairActs.tsx:68`; duplicate path at `src/oversight/Appointments.tsx:106` | "N need you" on a card, then three clicks to act; Oversight has a faster path to the same act | Embed the appointments row (`SeatRow`) in the inspector; make Oversight and Executive share it | M |
| 10 | Congress Nominations tab is read-only | `src/congress/Rosters.tsx:12-37` | A name "not sent yet" cannot be sent or withdrawn from the list that says so | Add send and withdraw to `NominationRow` (reuse `Nominations.tsx` withdraw compare and `deskPlan`) | S |
| 11 | Sign or veto requires opening the bill; whip and lobbying are on other pages | `src/congress/Bills.tsx:21`; `BillScreen.tsx:80-95`; `Rosters.tsx:76`; `PostScreen.tsx:39` | The desk row says "waiting for you" but offers nothing; members list has no lobby action | Put sign, veto and the whip count on the desk row (expandable); add lobby to member rows with multi-select | M |
| 12 | Trade partners table has no tariff column or action | `src/nation/economy/Panels.tsx:101,117` | The Economy trade view tells the player to set tariffs on each country's page | Add rate-in-force and an "Edit" cell per row opening the tariff sheet (feeds gap 1) | S |
| 13 | Economy levers sit on a different tab from the prices they move | `src/nation/economy/EconomyScreen.tsx:17`, `Markets.tsx`, `Levers.tsx` | Read the crude chart, switch tab, then act | Show the relevant lever card beside each commodity chart | S |
| 14 | Policy chair vacant: text only | `src/nation/policy/PolicyScreen.tsx:45,138` | "Nobody is in charge" with no fill action | Add "Choose a chair" opening the shared seat row | S |
| 15 | Policy changes one domain at a time | `src/nation/policy/PolicyScreen.tsx:75-99` | A coordinated shift across domains needs several adopt flows | Allow staging stances per domain and review the package (feeds gap 6) | M |
| 16 | State page acts navigate to a sub-desk; duplicates the Nation page path | `src/nation/state/StateScreen.tsx:44,86`; `StateViews.tsx:214,256`; Nation inline at `SelectionPanel.tsx:68` | Two ways to answer the same governor, with different data visible | Make the State page host `StateActs` inline and delete the `?act=` and `?power=1` desks | S |
| 17 | States acted on one at a time; no multi-select | `src/nation/home/StatesTable.tsx:162`; `StageMap.tsx` (single `selected`) | To visit, declare or request Guard for several states the player repeats the flow | Allow shift-click or check-select on map and table, with a group card showing aggregate odds | M |
| 18 | Emergency list: declare, renew, end are per item; map is a list | `src/nation/emergency/EmergencyScreen.tsx:83,123-126,185` | "Time to renew" on several cards means several flows | Multi-select declarations, "Renew selected"; real map with declaration pins | M |
| 19 | Org page engages one member at a time then navigates | `src/world/sets/OrgScreen.tsx:136-145` | "You reach out to one country at a time" | Let the player pick several members and run one grouped engagement act | M |
| 20 | Commitments edited on another screen | `src/world/nation/Diplomacy.tsx:78` | "Change these promises on the national security screen" | Inline set-status control on each commitment using the existing security act | S |
| 21 | Dispatch "Respond to the press" drops the story | `src/news/Dispatch.tsx:92` | The button opens a generic Respond tab | Pass the story id and open the framing compare for that story | S |
| 22 | Record entries cannot lift, amend or rescind | `src/record/RecordDetail.tsx:92-105`; `RecordSections.tsx:38` | The place that shows the effect of an act has no way to change it | Show a "Change this" action on entries whose act is still in force (links gap 7) | M |
| 23 | Courts case page is read-only; challenged order cannot be rescinded from it | `src/courts/CaseParts.tsx:122,155-156`; response location UNCONFIRMED | Reading a lawsuit with the order a click away | Show "Rescind" and "Defend" next to the strike-down meter | M |
| 24 | Calendar rows are links | `app/(game)/calendar/index.tsx`, `src/calendar/rows.ts` | The date list cannot start the action it lists | Put the row's act as a button, same as gap 4 | S |
| 25 | Nav badges are not populated | `app/(game)/_layout.tsx:39`; `src/shell/nav.ts:25` | Rail shows no counts, so the Brief is the only place that "needs you" is visible | Pass `NavCounts` from `briefMatters` grouped by place | S |
| 26 | Bell inbox rows navigate only | `src/shell/InboxButton.tsx:34-42` | A notification cannot be answered in place | Open the Brief sheet from gap 4 from the bell | S |
| 27 | Security taskings, reports and findings: one row, one act | `src/security/Intel.tsx:60,85`; `Operations.tsx:26` | Stopping or sharing many taskings is repeated | Row checkboxes with "Stop selected" and "Share selected" | S |
| 28 | Compare workspace is read-only | `src/compare/CompareWorkspace.tsx:114` | Choose two countries to compare, then no way to act on the result | Add "Act on selected" (tariff, engage) to the matrix header | S |
| 29 | Theme control missing from the shell | `src/shell/BarActions.tsx:9-16`; DESIGN.md "Application-wide layers" | Appearance is only in Settings | Add a theme toggle to the bar | S |
| 30 | Orders pipeline: sign several ready orders | `src/nation/policy/OrderPipeline.tsx:14` (link rows) | "N orders ready to sign" is a list of links | Multi-select with "Review selected" through the shared review | M |

Gaps 1 to 3 are the owner's own examples (tariffs, troops, maps) and the leverage point for the rest. Gaps 4, 6 and 7 are the structural fixes that make the others cheap.

## Cross-cutting deficiencies

1. **No command palette or global search for actions.** Search exists per screen only (Executive `OfficeBoard.tsx:20`, Members `Rosters.tsx`, Record `RecordWorkspace.tsx`, Network `src/dossier/network-search.ts`). No "go to X" or "do Y" entry. Grep for palette, hotkeys and `onKeyDown` finds only the founding radio roving focus (`src/founding/parts.tsx:80`).
2. **No staged plan or draft** except the budget editor (`src/nation/budget/Allocation.tsx`) and the appointments plan (`src/oversight/Appointments.tsx:106`). Everything else is compose, review, commit, one act.
3. **No undo or amend of a pending act.** The only reversals are per-object one-offs (rescind an order, withdraw a nomination, lift a measure).
4. **No bulk selection** outside Compare (`CompareWorkspace.tsx:6`) and the appointments plan.
5. **No keyboard shortcuts.** No next or previous item, no "answer" key, no "Continue" key. UNCONFIRMED beyond grep.
6. **No "recent actions" panel.** The Record is a timeline you read, not a place to change things.
7. **Inconsistent entry from alerts to the act.** Nation's Attention list selects a state and scrolls to its card (good). Brief rows open pages (`Matters.tsx:77`). The bell opens pages (`InboxButton.tsx:41`). Calendar rows open pages. Executive cards open an inspector, then a page. The same urgent item has four different routes.
8. **Duplicate paths for the same act.** Nominate: Executive office (`ChairActs.tsx`), Oversight appointments (`Appointments.tsx`), Courts (`Nominations.tsx`). Answer a governor: Nation card (`StateActs.tsx`) and State sub-desk (`LocaleDesk.tsx`). Engage a country: country page, Org page, act page.
9. **Buttons that exist only to navigate.** "Take it up" (`Matters.tsx:55`), "Your answer" (`ClockScreen.tsx:60`), "Open the office" (`OfficeInspector.tsx:100`), "Set up a tariff" (`Economy.tsx:85`), "Lift it" (`Diplomacy.tsx:48`), "Respond to the press" (`Dispatch.tsx:92`), "Send federal forces" (`StateScreen.tsx:86`), "Reach out to X" (`OrgScreen.tsx:143`), the four Levers cards.
10. **Every consequential act forces its own review.** Right for a single decision (`docs/DESIGN.md` Shared patterns), costly when five related settings are changed. `tier: "full"` is set per act (`PolicyScreen.tsx:88`, `ActDesk.tsx:83`). Needs a batch review that keeps stale-terms refusal.
11. **Context is lost on navigation.** Country act returns carry some context (`CountrySearch` origin, `ActDesk.tsx:109`), but a Brief row, Calendar row or bell item has no equivalent. UNCONFIRMED how many restore scroll and selection.
12. **Nation page is the target model but partly uncommitted.** The inline state card (`SelectionPanel.tsx`) and Attention list are in the working tree only; deleted `ManageStates.tsx` and `NationKpis.tsx` are not yet committed. Commit or revert before building on it.

## What already works and should be copied

- **Budget allocation editor** (`src/nation/budget/Allocation.tsx`): all accounts at once, live projection, reset to what is in force.
- **Appointments plan** (`src/oversight/Appointments.tsx`): many seats, one comparison, one send.
- **Nation selection card** (`src/nation/home/SelectionPanel.tsx`): map, list and needs list share one selection and the acts sit beside it.
- **Security sheet acts** (`src/security/SecurityScreen.tsx:104`): acts open over the list without leaving it.
- **`CompareAuthorize` and `ActChooser`** with the baseline "do nothing" card: the right unit for a single act. The work above is about composing many of them.

## Proposed shape of the fix (one recommendation)

Build one **act dock** (side panel on desktop, bottom sheet on phone) that any list, table or map can feed. Selection (one or many) in the surface fills the dock with the same compare cards and terms, a running tray collects staged acts, and one review authorizes them. Order of delivery: tariffs (gap 1 and 12), then deployments with a real map (2 and 3), then Brief and bell entry (4, 25, 26), then the "In motion" panel (7). Strongest failure mode: the dock becomes a second copy of existing act desks. Control: each desk must reuse its `build*` and projection functions and the existing review, and the old desk route is deleted when its dock ships. Conclusion: accepted with controls.

## Unconfirmed items

- Runtime behaviour of every screen (no browser session was used).
- Where the Docket "You need to respond" doors land (`src/courts/Docket.tsx:19`).
- Whether any screen restores scroll and selection on Back.
- Whether the Congress Overview map or hemicycle supports selection that drives an act (`src/congress/Overview.tsx` not read in full).
- The not-rated utility routes listed above.
