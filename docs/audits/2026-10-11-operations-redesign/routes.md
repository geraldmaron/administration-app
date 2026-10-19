# Current route and embedded-workflow coverage matrix

Scope: the player in `apps/web` on branch `feat/map-first`, working tree as read on 2026-10-10 (uncommitted changes present, mostly under `apps/web/src/map/`). This replaces the 48-entry historical snapshot in `BRIEF.txt` section 12.

Evidence class: every observation below is **current source only**. Nothing was rendered, built or run for this document, so no claim here is a screenshot-backed finding. Line numbers are working-tree lines at read time. Where a fact could not be established from source it is marked **unverified**.

Inventory basis: `apps/web/src/routeTree.gen.ts:250-290` lists 39 route paths; `apps/web/src/routes/` holds 39 route files plus `__root.tsx` (40 files). The two lists match one to one. `routeTree.gen.ts` is not in the git-modified set, so it is current.

Reading guide for the "Map" lines: a screen declares a class (`spatial`, `hybrid`, `workspace`), a camera key, an optional lens, selection, marks, pins and arcs through `Screen` (`shell/Screen.tsx:56-58`), which calls `useMapDirective` (`map/directive.tsx:89-103`). `workspace` additionally sets `paused: true` (`Screen.tsx:58`). The contract's camera keys are documented at `map/directive.tsx:40-45`.

---

## 1. Summary table (one row per route)

| # | URL pattern | Route file (`apps/web/src/routes/`) | Main screen component(s) | Purpose | Historical equivalent (BRIEF s12) | Class / camera |
|---|---|---|---|---|---|---|
| R00 | root (not found, error) | `__root.tsx` | `shell/Frame.tsx`, `NotFound`, `ScreenFailure` | Shell for every route; unknown address; render failure | Catch-all `routes/$.tsx` | workspace / world (NotFound) |
| R01 | `/` | `index.tsx` | `Title` (same file) | Title screen: continue, start, saves, settings | `/welcome` | spatial / world, turning |
| R02 | `/administrations` | `administrations.tsx` | `Administrations`, `Slot`, `EmptySlots` | Five save slots: open, discard, import | `/campaigns` | workspace / world |
| R03 | `/founding` | `founding.tsx` | `founding/FoundingFlow.tsx`, `founding/stages/*` | Setup ("The transition") ending in the oath | `/founding` | workspace / us |
| R04 | `/recovery` | `recovery.tsx` | `Recovery`, `RetrySave` | Retry a failed save, list damaged saves | `/recovery` | workspace / world |
| R05 | `/settings` | `settings.tsx` | `Settings`, `screens/AttentionSettings.tsx`, `screens/GodModeRow.tsx` | Camera, density, contrast, palette, guidance, time-pause rules, God Mode | `/settings` | workspace / world |
| R06 | `/brief` | `brief.index.tsx` | `brief/*` (MatterCard, TopMatter, MatterRow, RunningClocks, NowStrip, Standing, TimeControls) | The desk: what needs the President, clocks, readings, time | `/` | hybrid / computed |
| R07 | `/brief/digest` | `brief.digest.tsx` | `DigestBody`, `Wire`, `Stops` | What happened while time ran | `/digest` | hybrid / us |
| R08 | `/brief/clock/$id` | `brief.clock.$id.tsx` | `SummonsScreen`, `brief/CaseScreen.tsx` | A statutory clock or a family "case" with a tray of dispositions | `/summons/$id` | hybrid / us |
| R09 | `/brief/decision/$id` | `brief.decision.$id.tsx` | `decision/Decision.tsx`, `Situation.tsx`, `DecisionReceipt.tsx` | Decision memorandum, compare answers, authorize, receipt | `/conversation` | workspace / decision place |
| R10 | `/brief/metric/$id` | `brief.metric.$id.tsx` | `MetricScreen`, `Drivers` (same file) | History and drivers of one of five desk readings | `/metric/$id` | hybrid / us |
| R11 | `/brief/scandal/$id` | `brief.scandal.$id.tsx` | `brief/ScandalScreen.tsx` | A running story: heat, counsel read, answers | `/scandal/$id` | hybrid / dc |
| R12 | `/dev/map` | `dev/map.tsx` | `map/harness/MapHarness.tsx` | Map engine diagnostic | `/dev` | none set by the route |
| R13 | `/nation` | `nation.index.tsx` | `nation/state/NationHome.tsx` | The country by state, portfolios, conditions | no equivalent | spatial / us |
| R14 | `/nation/budget` | `nation.budget.tsx` | `nation/budget/BudgetScreen.tsx` | Appropriation status, five-line draft, request | `/budget` | workspace / us |
| R15 | `/nation/economy` | `nation.economy.tsx` | `nation/economy/EconomyScreen.tsx` | Cycle, rates, markets, households, trade, levers | `/economy` | hybrid / us |
| R16 | `/nation/emergency` | `nation.emergency.tsx` | `nation/emergency/EmergencyScreen.tsx` | Declarations, conditions board, Guard | `/emergency` | hybrid / by act |
| R17 | `/nation/policy?domain=` | `nation.policy.index.tsx` | `nation/policy/PolicyScreen.tsx` | Six policy domains, stance comparison, order pipeline | `/policy` and `/brief/$id` (memo) | hybrid / us |
| R18 | `/nation/policy/order/$id` | `nation.policy.order.$id.tsx` | `nation/policy/OrderScreen.tsx` | One executive order: law, projection, sign | `/order/$id` | workspace (desk) or hybrid (receipt) |
| R19 | `/nation/state/$id?district&lens&act` | `nation.state.$id.tsx` | `nation/state/StateScreen.tsx`, `LocaleActDesk.tsx` | State dossier, district detach, locale act | `/state/$id`, `/district/$id` | spatial / state or district |
| R20 | `/record` | `record.index.tsx` | `RecordScreen`, `Timeline`, `Impacts` | Timeline of the term | `/record` | spatial / us |
| R21 | `/record/event/$id` | `record.event.$id.tsx` | `Entry` (same file) | One Record entry: before/after, causes, consequences | no equivalent | spatial / entry |
| R22 | `/washington` | `washington.index.tsx` | `WashingtonScreen`, `washington/executive/ExecutiveTree.tsx` | Executive branch roster and doors to other branches | `/government` | hybrid / dc |
| R23 | `/washington/congress` | `washington.congress.index.tsx` | `washington/congress/CongressScreen.tsx` | Chambers, floor, agenda, notices, leaders | `/congress` | hybrid / us |
| R24 | `/washington/congress/bill/$id` | `washington.congress.bill.$id.tsx` | `washington/congress/BillScreen.tsx` | Bill stage, whip count, sign or veto | `/bill/$id` | hybrid / us |
| R25 | `/washington/congress/post/$id` | `washington.congress.post.$id.tsx` | `washington/congress/PostScreen.tsx` | A leadership or committee post and lobbying | `/hill/$post` | hybrid / state or us |
| R26 | `/washington/courts?judge=` | `washington.courts.index.tsx` | `washington/courts/CourtsScreen.tsx` | Bench, docket, nominations, justice file | `/judiciary`, `/judge/$id` | workspace / keep |
| R27 | `/washington/courts/case/$id` | `washington.courts.case.$id.tsx` | `washington/courts/CaseScreen.tsx` | A challenge to one of the President's orders | `/case/$id` | workspace / keep |
| R28 | `/washington/office/$id` | `washington.office.$id.tsx` | `washington/executive/OfficeScreen.tsx`, `ChairActs.tsx` | Office file, performance, fill or empty the chair | `/office/$id` | hybrid / office (workspace while filling) |
| R29 | `/washington/office/press` | `washington.office.press.tsx` | `washington/press/PressScreen.tsx` | Podium, press plays, framing, coverage | `/press` | hybrid / us |
| R30 | `/washington/oversight` | `washington.oversight.tsx` | `washington/oversight/OversightScreen.tsx` | Inquiries, directives, inspectors, officers, vacancies | `/oversight` | hybrid / dc or office set |
| R31 | `/washington/person/$id` | `washington.person.$id.tsx` | `washington/person/PersonScreen.tsx` | Personnel dossier and acts on the person | `/person/$id` | hybrid / person place |
| R32 | `/world?lens&view&region&q` | `world.index.tsx` | `world/nation/WorldHome.tsx` | Situation brief and ranked directory of governments | `/world` | spatial / world, nation or set |
| R33 | `/world/nation/$id` | `world.nation.$id.index.tsx` | `world/nation/NationScreen.tsx` | Country file | `/nation/$id` | spatial / nation |
| R34 | `/world/nation/$id/act?goal&option...` | `world.nation.$id.act.tsx` | `world/nation/ActDesk.tsx` and `Act*.tsx` | Act workspace: objective, instrument, terms, assessment, authorize | `/instrument/$id` | workspace / nation |
| R35 | `/world/org/$id` | `world.org.$id.tsx` | `world/org/OrgScreen.tsx` | International body, members, calls, commitments | no equivalent | spatial / member set |
| R36 | `/world/security` | `world.security.index.tsx` | `world/security/SecurityScreen.tsx` | Security desk and ledgers | `/security`, `/service/$id`, `/ops` (part) | hybrid / world, forces |
| R37 | `/world/security/command/$id` | `world.security.command.$id.tsx` | `world/security/CommandScreen.tsx` | One combatant command | no equivalent | spatial / command |
| R38 | `/world/treaty/$id` | `world.treaty.$id.tsx` | `world/treaty/TreatyScreen.tsx` | Treaty terms, parties, odds, acts | `/treaty/$id` | spatial / party set |
| R39 | `/world/war/$id` | `world.war.$id.tsx` | `world/war/WarScreen.tsx` | War sides, front, forces, powers, choices | `/war/$id` | spatial / war set |

Counts: 39 routes plus root. Four routes have no historical entry (R13, R21, R35, R37); see section 4.

---

## 2. Cross-cutting observations (referenced by route sections)

All source-only. "Brief" below means `BRIEF.txt`.

- **X1 Links to routes that do not exist.** `PLACES.press` (`/record/press`), `PLACES.ending`, `PLACES.legacy` and `place.dispatch` (`/record/press/dispatch/$id`) are defined (`packages/player-core/src/navigation/places.ts:32,68,73-74,143`) but `routeTree.gen.ts:250-290` has no such route. `place.press()` is the href of a live attention item (`packages/player-core/src/desk/attention.ts:308`). Screens guard unbuilt hrefs with `useBuilt` (`shell/built-routes.ts:22-29`) and print "Answered on its own screen, which a later build adds." (`brief/MatterRow.tsx:83`), "A later build adds this screen." (`shell/DoorTile.tsx:39`) or "...happens on a screen a later build adds." (`routes/brief.clock.$id.tsx:52`). That is build-process language shown to a player (Brief section 10.3 asks for institutional language).
- **X2 `?service=` is built but not read.** `place.service(id)` returns `/world/security?service=<id>` (`places.ts:137`) and is registered as the `service` subject (`packages/player-core/src/shell/subject.ts:56`). `routes/world.security.index.tsx:5-7` has no `validateSearch`, and a grep of `apps/web/src/world/security` found no `useSearch` or `validateSearch`. The deep link lands on the plain desk.
- **X3 Metric route is narrower than the links to it.** `isMetric` accepts only the five desk readings (`routes/brief.metric.$id.tsx:33-34`, `NOW_KEYS` at `packages/player-core/src/desk/now-readings.ts:18`). `player-core` also builds `place.metric("unemployment" | "inflation" | "growth" | "policy-rate")` and `place.metric(<commodity id>)` (`economy/market-releases.ts:25-28`, `economy/markets.ts:178,189,200,288,292`, `economy/readings.ts:94`). Those would render "No such reading" (`brief.metric.$id.tsx:235-250`). The economy screens do not currently link them (the only `Door` in `nation/economy/` is `Household.tsx:65`), so this is latent, not yet a visible dead end.
- **X4 Workflow state that is not in the URL.** Local `useState` holds: the open emergency act (`nation/emergency/EmergencyScreen.tsx:158`), the open security act (`world/security/SecurityScreen.tsx:61`), the open command act (`world/security/CommandScreen.tsx:163`), the fill-the-chair workspace (`washington/executive/OfficeScreen.tsx:149`), the Record filter and paging (`routes/record.index.tsx:126-127`), the map lens on Economy, Congress and Bill (`nation/economy/EconomyScreen.tsx:36`, `washington/congress/CongressScreen.tsx:40`, `washington/congress/BillScreen.tsx:164`), the setup stage and draft (`founding/useFounding.ts:54-55`), and every comparison selection. URL-addressed state exists for: Nation lens (`routes/nation.index.tsx:6-16`), State lens, district and locale act (`routes/nation.state.$id.tsx:9,35-39`), policy domain (`routes/nation.policy.index.tsx:6-16`), World lens, view, region, query (`routes/world.index.tsx:6-15`), act-desk configuration (`routes/world.nation.$id.act.tsx:15-17`), and the justice (`routes/washington.courts.index.tsx:5,13`). Browser back or a reload therefore loses the first group. No draft store exists in `apps/web/src/app/` (grep for "draft" found nothing); budget draft is `BudgetScreen.tsx:60`.
- **X5 Phrases Brief s10.3 wants replaced.** "Sign it" is a comparison column label in `packages/player-core/src/policy/order-desk.ts:133`, `congress/congress-acts.ts:87` and `world/treaty-screen.ts:267`, and is in bill copy at `desk/family-sources.ts:70`. The verb "Sign the order" is at `nation/policy/OrderScreen.tsx:125`. "Who carries it" is a comparison row label at `policy/stance-comparison.ts:103` and `act/assessment-ties.ts:61` (icon map at `world/nation/ActCompare.tsx:29`). Greps for "Its clocks", "How to move them" and "What it is collecting" found no matches in `apps/web/src` or `packages/player-core/src` (excluding the generated corpus and glossary).
- **X6 Every screen opens its phone sheet at full.** `Screen.tsx:77` passes `initialDetent={detent ?? "full"}`, while its own prop doc says "the class decides when this is absent" (`Screen.tsx:31`) and `WorkSurface.tsx:87` would default a panel to `half`. Only screens that pass `detent` explicitly say so (`EconomyScreen.tsx:39`, `OfficeScreen.tsx:153`, `PersonScreen.tsx:283`, `NationScreen.tsx:41`, `OrgScreen.tsx:153`), and those pass `"full"` too. On a phone the map sits behind a full-height sheet on first paint unless the player lowers it.
- **X7 Panel and workspace are the same width on desktop.** `.ui-surface` is `clamp(var(--panel-min), 48vw, var(--panel-max))` = 420 to 640 px at 48em and up (`packages/ui-web/src/styles/surface.css:96-107`; tokens `packages/design/src/tokens.css:144-146`). No CSS keys off `ui-surface--workspace` or `--panel` (grep). The only widening is a per-screen "Expand panel" button to 960 px (`WorkSurface.tsx:115`, `surface.css:146`), whose state is local (`WorkSurface.tsx:88`). Multi-column comparisons (`CompareAuthorize`) therefore live in a 420-640 px panel by default and collapse to stacked blocks under a 48rem container (`acts.css:261`).
- **X8 Navigation is five destinations, no groups.** `MODES` is brief, washington, nation, world, record (`shell/modes.ts:14`). There is no drawer, no "More", and no heading groups. Several tasks are reachable only through a screen's inner tile or an attention link: Digest only from the Brief "While time ran" panel (`brief/Sections.tsx:30`); Press office from the Washington executive tree node (`player-core/src/government/executive-tree.ts:164-182`) and attention links; Emergency from the Nation tile (`nation/state/NationHome.tsx:149`); Security from the World Situation tile (`world/nation/WorldHome.tsx:250`). Search lists the 20 `PLACES` whose route exists (`shell/search-index.ts:24-37`).
- **X9 Phone masthead hides date and the reason time is held.** `.ui-top-bar__status` is `display: none` below 40em (`shell/shell.css:140-148`); `TermStatus` is what it carries (`shell/TermChrome.tsx:22-28`). The "N waiting" word beside a held Continue is also `display: none` below 40em (`shell.css:114-122`) and the full note is `ui-visually-hidden` (`shell/ContinueControl.tsx:101-105`), wired through `aria-describedby` (`ContinueControl.tsx:96`) for assistive technology. A sighted phone user sees a paused icon and a disabled "Continue", not the reason. Only the Brief screen repeats date and week in its own eyebrow (`routes/brief.index.tsx:69`).
- **X10 No inspector column, no labeled rail.** The Brief s8.3 table asks for a roughly 224 px labeled navigation at 1440 and up and an optional 320-360 px inspector. The current rail is 76 px (`tokens.css:143`), labels are 12 px caption text under the glyph (`--size-caption: 0.75rem`, `tokens.css:107`; item rule `frame.css:152-169`), and the only second column is the docked panel (X7). The shell has no width at which three columns appear; the map is the other "column".
- **X11 Missing destinations that Brief s12 lists.** No route for: Reference, Showcase, Ending, Legacy, Removal, Summons list, Ops list, Dispatch, an action-first instrument picker. See section 4 for how each is covered or not.
- **X12 Catch-all is generic.** One `notFoundComponent` for every unknown address ("This address has no page", link "Back to the start", `__root.tsx:7-16,46`). A stale entity id gets its own per-screen "No such ..." screens (for example `NoSuchState` `nation/state/StateScreen.tsx:110-118`), which is the correct split, but the unknown-page case offers no contextual alternative (search, last mode).
- **X13 Trailing slash.** Index routes register with a trailing slash (`routeTree.gen.ts:262-266,279-282,289`). `useBuilt` accepts both forms (`shell/built-routes.ts:4-10`). Whether `router.routesByPath` keys are trimmed, which `Search` (`shell/Search.tsx:35`) and `Frame` (`Frame.tsx:67`) depend on to match `PLACES` hrefs such as `/brief`, was **not verified at runtime**; `shell/search-index.test.ts` exists but was not run.

---

## 3. Per-route sections

Format for each: purpose and historical mapping; embedded workflows; map; entry paths; observations. Every embedded workflow is listed by name with file and line. "Act workspace" means a `CompareAuthorize` (`packages/ui-web/src/CompareAuthorize.tsx`) comparison, with its one verb docked in the surface foot when `docked` is set (`CompareAuthorize.tsx:92-98,145`), followed by a `Receipt` (`packages/ui-web/src/Receipt.tsx`).

### R00 `__root.tsx`

- Purpose: wraps every route in `DeviceProviders` and `Frame` (`routes/__root.tsx:38-45`). `NotFound` (`:7-16`) and `ScreenFailure` (`:18-35`) are the not-found and error components (`:46-47`). Historical: catch-all `routes/$.tsx`.
- Embedded: `ScreenFailure` offers "Reload this screen" and a plain anchor to `/administrations` (`:29-31`) and warns that a recent action may already be saved (`:33`).
- Map: `NotFound` is `workspace`, camera `world` (`:9`). `ScreenFailure` deliberately mounts no map (`:17`).
- Entry: automatic.
- Observations: X12. Positive: recovery text tells the player to check the Record before repeating an act (`:33`), which fits Brief s9.3.

### R01 `/` (title)

- Purpose: title; "Continue the administration" when a presidency is in play (`routes/index.tsx:26-41`), "Start a new administration", "Your administrations (n of 5)", Settings (`:44-71`). Historical: `/welcome`. The historical `/` desk is now `/brief`.
- Embedded: save-slot count line (`:8-24,61`); full-vault message replaces the start button (`:49-52`); load failure notice with link to `/recovery` (`:81-86`).
- Map: `spatial`, camera `world`, `turning` (`:78`). Frame treats `/` and `/founding` as outside the term, so no mode navigation (`shell/Frame.tsx:21,103,127`) and the stores are not required for first paint (`Frame.tsx:28,130`).
- Entry: app load; top-bar wordmark when outside the term (`Frame.tsx:119`).
- Observations: Brief s12.G `/welcome` composition (resume, start new, premise, settings) is met in order; it has no reference or help link beyond Search. Source-only.

### R02 `/administrations`

- Purpose: five save slots (`routes/administrations.tsx:139-165`). Historical: `/campaigns`.
- Embedded: per-slot discard with inline two-step confirm naming "Discard for good" / "Keep it" (`:28-29,54-60`); damage text per slot (`:14-20`); file import with capacity guard (`:156-168`).
- Map: `workspace`, camera `world` (`:140`).
- Entry: title doors (`routes/index.tsx:60-63`), Settings "Saves" (`routes/settings.tsx:105`), Recovery (`routes/recovery.tsx:97`), `ScreenFailure` (`__root.tsx:31`), oath failure when vault full (`founding/FoundingFlow.tsx:129`), Search keyword "saves" (`shell/search-index.ts:18`).
- Observations: confirm names the action but the slot name is not repeated in the confirm buttons (`:54-60`); the slot card above it carries the name. No export action is present on a slot (import only, `:156-168`), though Brief s12.G lists rename/export/import/delete. Source-only.

### R03 `/founding`

- Purpose: "The transition" (`founding/FoundingFlow.tsx:177-185`). Historical: `/founding`.
- Embedded workflows: setup path choice `SetupChoice` (`:174`); stage rail with stage buttons (`:69-93`); short path of four stages vs full eight (`:24-27`); `StageBody` per stage (`:95-115`); footer Back / Skip to the oath / Next / "Take the oath" (`:117-157`); "Change setup path" and "Customize every stage" (`:189-192`); leadership profile gate (`:198`); face builder with tab list (`founding/FaceBuilder.tsx:118-120`); oath latch against double submit (`:34-55`).
- Map: `workspace`, camera `us`, selection of the leader's home state when chosen (`:181-183`).
- Entry: title "Start a new administration" (`routes/index.tsx:54`), empty slot (`routes/administrations.tsx:77`).
- Observations: draft lives only in component state (`founding/useFounding.ts:54-55`), so reload loses it (X4). The oath is a single latch with a refusal path that re-opens it (`FoundingFlow.tsx:37-52`), a good match for Brief s9.3 duplicate-submit guard.

### R04 `/recovery`

- Purpose: save-problem screen (`routes/recovery.tsx:62-103`). Historical: `/recovery`; the brief asked whether it is a bare redirect. It is a real screen.
- Embedded: `RetrySave` with success `Receipt` (`:25-60`, receipt at `:41`); damaged-save integrity list with three states (`:75-99`).
- Map: `workspace`, camera `world` (`:67`).
- Entry: `SaveStatus` "Why?" link (`shell/SaveStatus.tsx:36`), `InTerm` when the read failed (`shell/InTerm.tsx:15`), title notice (`routes/index.tsx:84`), Settings (`routes/settings.tsx:105`).
- Observations: no export-the-save action here; options are retry and inspect (`:50-52,97`). Source-only.

### R05 `/settings`

- Purpose: device preferences (`routes/settings.tsx:92-111`). Historical: `/settings`.
- Embedded: camera mode cards (`:55-62`), map density (`:63`), high-contrast toggle (`:64`), color-vision palette cards with live swatches (`:65-72`), first-run guidance toggle (`:78-88`), `AttentionSettings` per-source pause rules (`screens/AttentionSettings.tsx:1-93`, three settings per source `:41-45`), Saves links (`:103-107`), `GodModeRow` (`screens/GodModeRow.tsx:40-59`, a `CompareAuthorize` with verb "Enable God Mode" at `:53-59`, plus a `Receipt` at `:40`).
- Map: `workspace`, camera `world` (`:94`).
- Entry: top bar gear (`shell/Frame.tsx:38-40`), title (`routes/index.tsx:65`), Search keywords (`shell/search-index.ts:19`).
- Observations: reduce-motion is described as automatic (`:54`). Keyboard shortcuts are documented only as `aria-keyshortcuts` on Search (`Frame.tsx:34`); no shortcuts list. Source-only.

### R06 `/brief` (the desk)

- Purpose: the Brief (`routes/brief.index.tsx:64-113`). Historical: `/`.
- Composition order as coded: map cards per placed matter (`:77-79`), oath receipt (`:80`), "While time ran" panel until the digest is read (`:81-87`), `TopMatter` for the leading decision (`:88`), empty state (`:89-93`), "Also needs you" list (`:94-104`), Running clocks (`:106`), Now strip (`:107`), Standing (`:108`), Time (`:109`).
- Embedded workflows: `MatterCard` map cards (`brief/MatterCard.tsx:20-35`); `TopMatter` card as a door (`brief/TopMatter.tsx:36-76`); `MatterRow` with "Put off" button committing a deferral packet and per-row problem alert (`brief/MatterRow.tsx:39-95`); `ClockMeter` ring (`MatterRow.tsx:11-32`); hover preview that re-aims the map camera (`MatterRow.tsx:64-65`, `brief.index.tsx:46,57`); `LastRun` (`brief/Sections.tsx:11-35`); `RunningClocks` with a folded "more on the calendar" `details` (`Sections.tsx:72-105`); `NowStrip` with approval gauge, six-judgment radar and four trend tiles each a door (`brief/NowStrip.tsx:34-91`); `Standing` removal-pressure gauge, folded while calm (`Sections.tsx:108-152`); `TimeControls` "Advance one day" and "Hand the rest to the Chief of Staff and continue" with explanatory note (`brief/TimeControls.tsx:44-71`).
- Map: `hybrid`. Camera is `preview ?? (advanced ? "us" : desk)` where `desk` is a `set:` of all placed matters' cameras, else the top matter's camera, else `us` (`brief.index.tsx:53-58`); selection lifts every matter's place (`:60-62`); lens `delta` after a run, `relations` for a matter abroad, else `approval` (`:64-65`).
- Entry: mode nav "Brief" with a count badge of matters that hold time (`shell/TermChrome.tsx:39-43`), top-bar wordmark (`shell/Frame.tsx:119`), every `Back to the Brief` link, after Continue (`shell/ContinueControl.tsx:73`), after load (`routes/administrations.tsx:116`).
- Observations (Brief s12 `/`): date and week lead in the eyebrow (`:69`) and the lede names the leading matter (`:70`); the leading decision card comes after map cards, the oath receipt and the "While time ran" panel in the body (`:77-88`). Cost of inaction is not on the desk row; it appears on the decision screen (R09). Time advance sits last in the scroll, but Continue is in the top bar (X9 for the phone hold reason). The page is a long stack of eight sections; on a phone the sheet opens at full (X6). Positive: honest quiet state ("Nothing is waiting", `:89-93`). "Standing" reads removal pressure here rather than on its own route (see R-removal in section 4). Source-only.

### R07 `/brief/digest`

- Purpose: "While time ran" (`routes/brief.digest.tsx:73-106`). Historical: `/digest`.
- Embedded: "What stopped it" (`:76-79`), "What moved" via `Moves` (`:80-84`), closed arcs (`:85-90`), wire with 6 leading stories and folded "more stories" and "Conditions already running" `details` (`:14-44`), security items `details` with marking line (`:95-100`), "Done reading" acknowledges the brief and returns to the Brief (`:69-72,102`), "Open the Record" door (`:103`).
- Map: `hybrid`, camera `us`, lens `delta` after an advance else `approval` (`:74`); a note states what the map shows (`:83`).
- Entry: `LastRun` button (`brief/Sections.tsx:30`), `PLACES.digest` (`places.ts:54`), Search.
- Observations: empty state tells the player to "Press Continue in the top bar" (`:121`). The Brief s12 `/digest` order (why time stopped, decisions now needing action, material changes, news) matches: stops first (`:76`), then moves (`:80`). A recap animation is not present. Source-only.

### R08 `/brief/clock/$id`

- Purpose: a statutory clock or an engine "case" with dispositions. Historical: `/summons/$id`.
- Embedded: for a family record, `brief/CaseScreen.tsx` (`routes/brief.clock.$id.tsx:62-63`): clock ring or "Waiting n days" (`CaseScreen.tsx:86`), "If the clock runs out" with outcome words per default kind (`:13-20,88-91`), "What it is about" (`:92-99`), "Your answer" door plus a `Tray` of Defer or Decline buttons (`:24-57,100-108`), `CaseReceipt` (`:60-75`). For a rule clock, `SummonsScreen` (`brief.clock.$id.tsx:13-57`): window meter, posture list, counsel, "The last time" history, and the door to act (`:49-53`).
- Map: `hybrid`, camera `us`, lens `approval` (`CaseScreen.tsx:83`, `brief.clock.$id.tsx:18`); receipt lens `delta` (`CaseScreen.tsx:62`).
- Entry: Running clocks rows (`brief/Sections.tsx:40`), stop lines (`packages/player-core/src/campaign/stop-words.ts:36-44`), `player-core/src/summons/running-index.ts:31`.
- Observations: the "inaction" outcome is above the answers (`CaseScreen.tsx:88`), matching Brief s9.1 cost-of-waiting. The Tray offers only defer or decline, committed on one click with no review (`:49-53`); whether a click is reversible is not stated in the screen. Unbuilt-door text appears at `CaseScreen.tsx:105` and `brief.clock.$id.tsx:52` (X1). Source-only.

### R09 `/brief/decision/$id`

- Purpose: the decision memorandum. Historical: `/conversation`.
- Composition as coded (`decision/Decision.tsx:88-115`): `Situation` memo (masthead, 1 The situation with particulars, 2 Who is involved, 3 If you wait with clock and "Not yet known", 4 folded Background) then `CompareAuthorize` "Compare the answers", then problem alert, `Counsel` for the selected reply, "Without answering" dispositions, `FirstRun` walkthrough.
- Embedded workflows: `Situation` (`decision/Situation.tsx:195-257`, wait section `:219-230`, folded background `details` `:231-255`); comparison table with a "Leave it unanswered" baseline column and per-option lock reasons (`Decision.tsx:35-48,92-104`); verb switches to "Start preparing" for timed replies (`:98`); review sentence (`:72-76,100`); `Dispositions` Put off / Decline buttons (`:50-70`); `Counsel` (`decision/Counsel.tsx`); `DecisionReceipt` with "What it moved", "In the room after", next-decision and Record doors (`decision/DecisionReceipt.tsx:19-68`); `FirstRun` non-modal four-step `role="dialog"` aside (`walkthrough/FirstRun.tsx:48-78`); `ScenarioTags` and memo flags.
- Map: `workspace`, camera and selection from `decisionCamera(cast)`, lens `approval` (`Decision.tsx:87-89`); receipt `hybrid` lens `delta` (`DecisionReceipt.tsx:20`).
- Entry: Brief `TopMatter` button "Open the decision" (`brief/TopMatter.tsx:70-73`), `MatterCard` and `MatterRow` titles, stop lines, `NotWaiting` next link (`Decision.tsx:124`).
- Observations vs Brief s12 `/conversation` and H01/H08: inaction and the unknown are visible above the comparison (`Situation.tsx:219-230`) and only background is disclosed (`:231`); this resolves H01 for this screen on source. The commitment area is one docked verb (`Decision.tsx:103`), resolving H08 here. Selecting an option does not leave the route, so inspecting people is by Counsel in place, not by opening dossiers; there are no links to the officials in the memo (voices are text, `Situation.tsx:35-58`). Source-only.

### R10 `/brief/metric/$id`

- Purpose: one of the five desk readings: approval, treasury, stability, military readiness, standing (`routes/brief.metric.$id.tsx:33-34`). Historical: `/metric/$id`, which the brief describes as polymorphic (X3).
- Embedded: headline gauge (`MetricScreen` `:156-172`), weekly `Series` with the inherited split (`:195-211`), approval-only `Drivers`: radar, drag line, six `Judgment` meters, polarization gauge (`:81-154`, mounted at `:212`), "Where the number comes from" (`METRIC_PROVENANCE`, `:213-218`), "What your acts did to it" list of up to eight Record rows with doors (`DecisionsOn`, `:219-224`).
- Map: `hybrid`, `us`, `approval` (`:172-178`).
- Entry: Now strip tiles (`brief/NowStrip.tsx:37,53`), stop words (`stop-words.ts:44`).
- Observations: money and ratio formatting branch on `metric === "treasury"` (`:35-36`). Unknown ids show an honest "No such reading" (`:238-250`). X3 for the commodity and rate links.

### R11 `/brief/scandal/$id`

- Purpose: running story. Historical: `/scandal/$id`.
- Embedded: `Heat` gauge plus stage list Breaking, Developing, Fading, Over (`brief/ScandalScreen.tsx:42-57`), `Named` implicated officer (`:59-71`), "kept alive by" hostility meter (`:185`), lawyer's read (`:122-134`, thin / named / thick), `CompareAuthorize` "Compare the answers" with a "Stay silent" baseline and a fixed review line "Each answer is final: a story can be answered once." (`:135-147`), `Answered` receipt (`:153-166`).
- Map: `hybrid`, camera `dc`, lens `delta` once answered, else `approval` (`:179`). The camera stays on Washington; it does not follow the implicated office.
- Entry: stop lines (`stop-words.ts:42`) and Brief matters.
- Observations (Brief s12 `/scandal/$id`): the screen separates the lawyer's read from the story's heat but carries no "allegations vs verified facts" structure; `scandal.context` is one paragraph (`:182`). The lawyer's read is deliberately uncertain ("usually right, but not always", `:133`). Source-only.

### R12 `/dev/map`

- Purpose: map engine harness, enabled by `import.meta.env.DEV` or `VITE_MAP_HARNESS=1`, otherwise `notFound()` (`routes/dev/map.tsx:8,22-24`). Historical: `/dev`.
- Embedded: `MapHarness` (lazy) (`:10,15`).
- Map: the route sets no directive itself; `Frame` still mounts `MapLayer` (`Frame.tsx:112-113`). Interaction with the harness's own renderer is **unverified**.
- Entry: direct URL only.
- Observations: no fixtures tool for presidential screens (Brief s12.G asks for fixture access); that lives in tests (`apps/web/tests/helpers.ts`, not read in detail).

### R13 `/nation`

- Purpose: Nation home (`nation/state/NationHome.tsx:126-162`). No historical entry (the old `/nation/$id` was a foreign nation).
- Embedded: `LensSwitch` "Color the map by" Approval, Call, Lean, Population with an `aria-live` explanation (`:141`, `nation/state/lenses.tsx:39-50`), "The country" gauges for approval and electors (`NationHome.tsx:102-123`), "Presidential portfolios" door tiles Economy, Budget, Policy, Emergencies (`:143-151`), `StateStrip` every state on one axis sized by electors, each dot a door (`:59-99`), conditions list (`:153-159`).
- Map: `spatial`, camera `us`, lens `NATION_MAP_LENS[lens]`, selection of the hovered state (`:130-139`). Lens in the URL (`routes/nation.index.tsx:6-16`).
- Entry: mode nav Nation (`places.ts:60`).
- Observations: this is where Economy, Budget, Policy and Emergency are reachable from by mouse (X8); no direct nav entries. Source-only.

### R14 `/nation/budget`

- Purpose: appropriation and the five-line book. Historical: `/budget`.
- Embedded: appropriation `Status` with funding meter and 8-week risk mark (`nation/budget/BudgetScreen.tsx:20-49`), `AllocationEditor` with reset (`nation/budget/AllocationEditor.tsx`), `DraftProjection` meters including the vote needed (`DraftProjection.tsx:35,51`), `Request` as `CompareAuthorize` "Compare sending the draft" with baseline "Keep the book in force" (`Request.tsx:87-104`) and `RequestReceipt` (`:60-66`), `Books` federal books gauges (`Books.tsx:38-48`).
- Map: `workspace`, `us`, lens `federal-dependence`, or `delta` after commit (`BudgetScreen.tsx:74`).
- Entry: Nation tile (`NationHome.tsx:147`), summons door "Open the budget" (`summons/clocks-legislative.ts:85`), mode-adjacent Search.
- Observations (Brief s12 `/budget`, H10): the order is Status, Editor with Projection, Request, Books (`BudgetScreen.tsx:76-90`), so the constraint and projection sit with the editor and the submission follows; the draft is local state (`:60`) and is cleared on send (`:89`). Whether the editor and the request are visible together on a phone sheet was not measured. Source-only.

### R15 `/nation/economy`

- Purpose: economy overview and levers. Historical: `/economy`.
- Embedded: map-lens `Choice` Jobs / Prices / Output (`nation/economy/EconomyScreen.tsx:41`), `FileNavigation` jump list of five sections (`:21-27,42`; the control is a `details` of anchors, `shell/FileNavigation.tsx:7-17`), `Cycle`, `Rates` with per-rate `details` source (`Readings.tsx:69`), `Markets` (series, gauges, calendar `Markets.tsx:105`), `Household`, `Trade` balance (`Household.tsx:57`), `Levers` as `CompareAuthorize` "Compare the levers" against a Wait column, with `ActReceipt` (`Levers.tsx:82-93`).
- Map: `hybrid`, detent full, `us`, lens `jobs|prices|output`, `delta` after commit (`EconomyScreen.tsx:39`).
- Entry: Nation tile (`NationHome.tsx:146`), attention links (`desk/attention-brief.ts:47`, `attention-markets.ts:30`).
- Observations (Brief H09, s12 `/economy`): one long page of five stacked topics with an anchor list instead of scoped tabs (`:43-52`). Trade shows a balance and two gauges only; the text sends the player to policy for tariffs (`Household.tsx:65`), but tariffs and embargoes are set on the country act desk (R34), not on `/nation/policy`. That wording looks stale; the link target is `place.policy()` (`Household.tsx:54`). Source-only.

### R16 `/nation/emergency`

- Purpose: emergency powers board. Historical: `/emergency`.
- Embedded: `Board` sections Guard (`EmergencyScreen.tsx:73`), declared (`:97`), conditions (`:111`), incidents (`:128`); an open act switches the whole screen body to `EmergencyActPanel` with focus moved to its heading (`nation/emergency/EmergencyActs.tsx:114-118`); `ChoiceCompare` against doing nothing, with a back button (`:136-158`); `ActDone` receipt (`:167-168`).
- Map: `hybrid`, camera from `actCamera` (state of the open act, else `us`), lens `conditions` or `delta` (`EmergencyScreen.tsx:143-165`).
- Entry: Nation tile with active count (`NationHome.tsx:149`), state Acts text (`nation/state/Acts.tsx:53`), attention (`desk/family-emergency.ts:116,122,150`).
- Observations: open act is local state (X4), so back leaves the screen rather than closing the act. Brief s12 `/emergency` wants a linked incident map and list; here rows are a list (`ConditionRow`) and the map follows the open act only. Source-only.

### R17 `/nation/policy`

- Purpose: standing program by domain. Historical: `/policy`, and the stance desk absorbs `/brief/$id` (policy memorandum).
- Embedded: `Portfolio` nav of six domain doors with `aria-current` (`nation/policy/PolicyScreen.tsx:19-36`), `DomainHead` (`:39-74`), `StanceDesk` via `ChoiceCompare` "Compare the positions", verb "Enact this stance", baseline "keep in force" (`:77-108`), `ActDone` receipt (`:128`), `OrderPipeline` with per-stage `details` (`OrderPipeline.tsx:30`).
- Map: `hybrid`, `us`, lens `shareLensId(domain)` or `delta` (`PolicyScreen.tsx:116-124`). Domain in URL (`routes/nation.policy.index.tsx:6-12`).
- Entry: Nation tile (`NationHome.tsx:148`), `place.policyDomain` doors, summons (`summons/clocks-executive.ts:267`).
- Observations: the unknown `?domain=` falls back to "fiscal" silently (`routes/nation.policy.index.tsx:10`). Executive orders open on their own route from the pipeline (`OrderPipeline.tsx:39`).

### R18 `/nation/policy/order/$id`

- Purpose: sign one executive order. Historical: `/order/$id`.
- Embedded: `Authority` "The law it runs on" (`nation/policy/OrderScreen.tsx:27-41`), `Projection` with challenge-odds meter (`:44-69`), "What it changes" (`:72-88`), `SignDesk` as `ChoiceCompare` "Compare signing it" with verb "Sign the order" and baseline "Leaving it unsigned" (`:110-133`), "Signed before" (`:90-107`), `ActDone` receipt (`:154`).
- Map: `workspace` for the desk, `hybrid` plus lens `delta` for the receipt, keyed to remount (`:151`).
- Entry: policy `OrderPipeline` row doors (`player-core/src/policy/order-pipeline.ts:57,91`).
- Observations (Brief s10.2 order contract): there is no document body. The screen is a projection and a table; no letterhead, numbered operative sections, effective-date block or issued-document preview; the receipt (`ActDone`) shows title and lines. The comparison column is labelled "Sign it" (`order-desk.ts:133`, X5). Source-only.

### R19 `/nation/state/$id`

- Purpose: state dossier and locale act. Historical: `/state/$id` and `/district/$id` (merged via `?district=`).
- Embedded: `LensSwitch` Approval, Lean, Call, House seats (`nation/state/StateScreen.tsx:97`, `lenses.tsx:15-23`); `FileNavigation` Overview, Politics, Economy, Conditions, Acts (`:17-23,98`); `DistrictPanel` detach with "Close the district" (`:26-54`) and scroll-into-view on change (`:29-32`); lead matter in the foot "Answer the ..." (`:87-93`); `Acts` door to `?act=<cause>` (`nation/state/Acts.tsx:31`); `LocaleActDesk` (`LocaleActDesk.tsx:69-91`, a `CompareAuthorize`) and `LocaleReceipt` (`LocaleReceipt.tsx:32-60`) at the same pathname with `?act=` (`routes/nation.state.$id.tsx:22-23`).
- Map: `spatial`, camera `state:ID` or `district:ID`, selection `state:ID|district:ID`, lens from `?lens` (`StateScreen.tsx:84-86`); the act desk is `workspace` (`LocaleActDesk.tsx:69`).
- Entry: map click on a state or district (`shell/map-routes.ts:3-8`, `Frame.tsx:64-76`), Nation strip dots (`NationHome.tsx:93`), conditions rows (`Conditions.tsx:14`), `place.district` from politics list (`Politics.tsx:20`).
- Observations: id is upper-cased and validated (`routes/nation.state.$id.tsx:17`); District of Columbia handling beyond this was not checked. Source-only.

### R20 `/record`

- Purpose: term timeline. Historical: `/record`.
- Embedded: "Who acted" `Choice` Everything / Your administration / The world (`routes/record.index.tsx:13-19,132`), day-grouped timeline with a region label `role="region"` (`:98-123`), "Show n older entries" paging at 40 (`:22,140-144`), 90-day impact assessments (`:24-50`).
- Map: `spatial`, `us`, `approval` (`:130`).
- Entry: mode nav Record, Receipt doors "Open the Record entry", Digest door (`brief.digest.tsx:102`).
- Observations (Brief s12 `/record`): no text search, date filter or per-system filter; filter and page count are local state (X4, `:126-127`); impacts appear last, under a 40-row timeline (`:145`), so a person reading "original assessment vs later result" must scroll the whole page. Brief s3 task "find an old act and compare its original assessment with later results" is supported by `/record/event/$id` (R21) and impact reports, but not by search. Source-only.

### R21 `/record/event/$id`

- Purpose: one entry: came from, status, takes effect, readings before and after, what it answered to, what followed, impact assessments it caused (`routes/record.event.$id.tsx:24-76`). No historical entry.
- Embedded: cause and consequence `Links` doors between entries (`:11-22,54-63`).
- Map: `spatial`, the entry's camera and selection, lens `delta` if just made else `approval` (`:29`).
- Entry: every receipt "Open the Record entry", Record timeline, office and metric lists (`washington/executive/OfficeScreen.tsx:138`, `brief.metric.$id.tsx` `DecisionsOn`).
- Observations: no previous or next entry control; the only exit is "The whole Record" (`:70-72`). Source-only.

### R22 `/washington`

- Purpose: executive branch roster. Historical: `/government`.
- Embedded: `Branches` door tiles Congress, Courts, Oversight (`routes/washington.index.tsx:33-50`), "Only the chairs that need you (n)" `Toggle` (`:61`), `ExecutiveTree` sections with `PersonCard` and folded agencies `details` (`washington/executive/ExecutiveTree.tsx:60,112-125`), tally lede for vacant, acting and waiting chairs (`washington.index.tsx:12-30`).
- Map: `hybrid`, camera `dc`, `marks="offices"` (`:58`).
- Entry: mode nav Washington, Search keywords (`search-index.ts:14`).
- Observations (Brief s12 `/government`): staffing counts lead (`:58`); acting versus confirmed are separate counts (`:15-17`). The Press office and Oversight are on this page (`ExecutiveTree` node, Branches tile) but there is no nominations calendar or history section here. Source-only.

### R23 `/washington/congress`

- Purpose: chambers, floor, agenda, notices. Historical: `/congress`.
- Embedded: map lens `Choice` Senate / House / House equal area (`washington/congress/CongressScreen.tsx:16-20,45`), `FileNavigation` seven sections (`:22-30,46`), `Chambers` hemicycles (`Chambers.tsx:16`), `FloorBusiness` (`FloorBusiness.tsx:45`), `Transmit` legislative agenda with topic `select`, pager of 4 and "Show n more proposals" (`LegislativeAgenda.tsx:17,43,63`) and a picked-act compare (`:25`), `Notices` with necessity field (`Notices.tsx:18,45`), `Standing`, `Leaders` and `Committees` person cards (`Hill.tsx:15,47,65`), `Delegation` state `select` (`Notices.tsx:73-90`).
- Map: `hybrid`, `us`, lens `senate|house|house-hex|delta` (`:43`).
- Entry: Washington Branches tile, floor-business doors to `/washington/congress/bill/$id` (`congress/floor-schedule.ts:95,114,172`).
- Observations (Brief s12 `/congress`, H09): eight stacked sections after an anchor list (`:47-54`), no chamber or workload tabs. Source-only.

### R24 `/washington/congress/bill/$id`

- Purpose: bill detail with sign or veto. Historical: `/bill/$id`.
- Embedded: chamber map `Choice` (`washington/congress/BillScreen.tsx:170`), `Pipeline`, `StageRows` (`:37,57`), `WhipCount` (`WhipCount.tsx:16`), `Effects` (`:80`), `DeskActs` "Sign or veto" with a veto-message `textarea` required for veto (`:104-134`), `HillAct` compare (`HillAct.tsx:56`) and `ActReceipt` (`:115`), `BillLobby` post `select` (`:139-160`).
- Map: `hybrid`, `us`, lens `whipLensId(chamber, bill.id)` or `delta` (`:168`).
- Entry: floor business rows, Congress agenda.
- Observations (Brief s12 `/bill/$id`): the presidential decision sits fifth, after pipeline, whip count and effects (`:172-179`) even when the bill is on the desk; deadline is inside `deskComparison` (`player-core congress-acts.ts:78`). Columns are labelled "Sign it" (`congress-acts.ts:87`, X5). Source-only.

### R25 `/washington/congress/post/$id`

- Purpose: a Hill post, its holder, standing and lobbying. Historical: `/hill/$post`.
- Embedded: sections post-holder, post-standing, post-lobby, post-history (`washington/congress/PostScreen.tsx:27,41,51,58`), `LobbyActs` compare (`LobbyActs.tsx`), `HillAct`.
- Map: `hybrid`, home state or `us`, selection of home state, lens by chamber or `delta` (`:16-25`).
- Entry: Congress leaders (`congress/hill-reading.ts:126`), attention (`desk/attention-outstanding.ts:30`).

### R26 `/washington/courts`

- Purpose: the Supreme Court. Historical: `/judiciary`; `/judge/$id` is merged here as `?judge=`.
- Embedded: `JudgeFile` shown first when `?judge=` is set (`washington/courts/CourtsScreen.tsx:21,31`; heading `JudgeFile.tsx:71`), not-on-bench empty state (`:26-30`), `Bench` seat cards (`Bench.tsx:30-34,73`), `Docket` with strike-odds meters (`Docket.tsx:12-26,63`), `Nominations` with one `CompareAuthorize` per open seat plus one per pending name for withdrawal (`Nominations.tsx:79-101,112-144,161-181`), `ActReceipt` replacing the section (`:151-159`).
- Map: `workspace`, camera `keep` (`:24`): paused, no geography.
- Entry: Washington Branches tile, bench cards (`judiciary/courts.ts:130`), case vote lists (`judiciary/case-file.ts:109`).
- Observations (Brief s12 `/judiciary`): the page order is justice file, bench, docket, nominations, with no Bench / Docket / Nominations tabs. Nominations are single-seat; there is no batch review of several nominations. The docket shows "odds a pending case is struck down" as a meter (`Docket.tsx:11-14`); the brief's s9.2 warns about exposing hidden outcomes, and this one is a stated forecast, not verified against the engine here. Source-only.

### R27 `/washington/courts/case/$id`

- Purpose: a challenge to an order. Historical: `/case/$id`.
- Embedded: sections stakes, timeline, ruling, paths (`washington/courts/CaseScreen.tsx:18,41,60,93`), challenged-order heading (`:134`), not-found screen (`:122`).
- Map: `workspace`, `keep` (`:131`).
- Entry: docket rows (`judiciary/courts.ts:172,247`).
- Observations: the status word is the eyebrow (`:131`), keeping stay, pending and decided distinct only through `STATUS_WORDS`; contents of that map were not read. Source-only.

### R28 `/washington/office/$id`

- Purpose: office file. Historical: `/office/$id`.
- Embedded: `Dossier` frame with `Masthead` and `HolderCard` (`washington/executive/OfficeScreen.tsx:154-156`), `AgendaActs` proposals, offers and factions (`:162`), department performance rings (`:62-88`), leadership assessment (`:164`), "Your authority over this chair" `ChairActs` (`:165`), agencies list (`:90-106`), commands (`:108-124`), "On the Record" (`:126-145`). "Compare the shortlist" and "Compare who could act" open `FillChair`, which re-renders the whole route as a `workspace` with a `Choice` between appoint and acting and a back button (`ChairActs.tsx:99-124,138-153`; local state `OfficeScreen.tsx:149,151`). Candidate matrix via `PricedCompare` (`PricedCompare.tsx:59-89`), dismiss compare (`PersonActs.tsx:46-62` for the person variant), `ActReceipt` (`OfficeScreen.tsx:178`).
- Map: `hybrid`, detent full, the office camera, `marks="offices"` (`:153`); `FillChair` `workspace` (`ChairActs.tsx:106`).
- Entry: executive tree nodes, person dossier link (`washington/person/PersonScreen.tsx:185`).
- Observations (Brief s12 `/office/$id`): acting and confirmed are separate shortlist modes ("Send the nomination" vs "Name them acting", `ChairActs.tsx:64,75`) and their reviews state the Senate vote and signature (`:49`). The shortlist is not URL-addressable, so back leaves the office rather than the shortlist (X4). Source-only.

### R29 `/washington/office/press`

- Purpose: press office. Historical: `/press` (see section 4 for the unbuilt `/record/press`).
- Embedded: section jump `nav` of anchors (`washington/press/PressScreen.tsx:8-15,28-34`; a second jump pattern, not `FileNavigation`), `Podium` (`Podium.tsx:14`), `PressPlays` with desk `select` (`PressActs.tsx:20,41`), `Framing` with record `select` (`:59,99`), `TakeTheHit` (`:122`), `Coverage` (`Podium.tsx:44`), `Desks` (`:77`), all using `useHillCommit` (`PressScreen.tsx:24`).
- Map: `hybrid`, `us`, lens `press-reach` or `delta` (`:26`).
- Entry: executive tree node (`executive-tree.ts:164-182`), attention links (`desk/attention-outstanding.ts:60`), counsel (`summons/counsel-world.ts:108`). It is not in the mode nav and not under any Washington tile (X8).
- Observations (Brief s12 `/press`): coverage, plays, framing and the hit are interleaved on one page, which the brief warns against; there is no running-stories list (scandals are reached through the Brief, R11).

### R30 `/washington/oversight`

- Purpose: oversight of and by the executive. Historical: `/oversight`.
- Embedded: `NoticesOwed` compare (`washington/oversight/NoticesOwed.tsx:24`), `Inquiries` pipeline with closed `details` (`Inquiries.tsx:66`), "Issue a directive" `DirectiveComposer` with institution `select`, instruction `Choice` cards and `CompareAuthorize` (`DirectiveComposer.tsx:108-122`), `Inspectors` removal compare (`Inspectors.tsx:90,102`), `Officers` (`Officers.tsx:40,78`), `Vacancies` (`Vacancies.tsx:65`); each commit swaps its section for an `ActReceipt` (`DirectiveComposer.tsx:101`, `Inspectors.tsx:131`, `Vacancies.tsx:63`).
- Map: `hybrid`, camera `dc` or a `set:` of inquiry offices, `marks="none"`, and `pins` (`OversightScreen.tsx:25-27`).
- Entry: Washington Branches tile.
- Observations: Brief s12 asks for a clear separation of oversight of the executive from oversight directed by it; the code order is notices, inquiries, directive composer, inspectors, officers, vacancies (`OversightScreen.tsx:29-39`) with no heading for that distinction beyond section titles. Source-only.

### R31 `/washington/person/$id`

- Purpose: personnel dossier. Historical: `/person/$id`.
- Embedded: `Dossier` plate (`washington/person/PersonScreen.tsx:285-286`), Ratings radar plus five readings (`:292-295`), `PersonActs` removal, dismissal or withdrawal compares (`PersonActs.tsx:37,57,80`), Faction (`:297`), Circle with `details` of all (`:205`), Career (`:238`), Counsel given (`:262`), `ActReceipt` (`:316`).
- Map: `hybrid`, detent full, the person's camera, offices marks when applicable (`:283`).
- Entry: executive tree and office holder links (`ExecutiveTree.tsx:26`, `OfficeScreen.tsx:52`).
- Observations: "Back to Washington" is the only fixed exit (`:303`); return to the same roster selection is not preserved because the roster has no selection (the filter `Toggle` is local, `washington.index.tsx:54`).

### R32 `/world`

- Purpose: foreign affairs workspace. Historical: `/world`.
- Embedded: two views, Situation and Governments, as buttons with `aria-current` (`world/nation/WorldHome.tsx:243-246`; view in URL), `SituationStatus` counts (`:135-145`), `Watchlist` conflicts, pending developments and a recent-developments `details` (`:109-133`), map cards for the three latest movers (`:90-106`), door tile to Security (`:250`), `StandingHeadline` and `RegionTiles` (`world/nation/WorldHeadline.tsx:27,71`), `LensSwitch` Standing / Forces / Trade share (`WorldHome.tsx:254`), directory with "Find a government" search, region `select`, count line `role="status"`, "Show every region", 24-row paging (`:181-205`).
- Map: `spatial`; camera `world`, `nation:ID` when one match, or a `set:` of the region; lens `relations` or the directory lens; `marks` forces only on the Forces lens; selection follows hover or focus (`:223-241`). Lens, view, region and query are in the URL (`routes/world.index.tsx:6-21`).
- Entry: mode nav World; map click on a country (`shell/map-routes.ts:5-7`); Search.
- Observations (Brief s8.2 and s12 `/world`): the Situation view puts conflicts first (`:116-120`) and the directory is a separate view, so the "map-led workspace with filter summary and roster" is two views, not one canvas. No full-canvas or focus mode for the map. Directory and map share the same rows (`rows` feeds both, `:223`). The accessible roster is the `MapDataList` toggle (`map/MapDataList.tsx:26-38`, X10). Source-only.

### R33 `/world/nation/$id`

- Purpose: country file. Historical: `/nation/$id`.
- Embedded: `FileNavigation` Overview, Relationship, Economy, Forces, Moves (`world/nation/NationScreen.tsx:18-24,55`), `Overview` (`Overview.tsx:41,68,75`), `Relationship` "Measures in force", "What you have committed to them" (`Relationship.tsx:43,72`), `CountryEconomy` trade with the US and where it sends trade (`CountryEconomy.tsx:54,86`), `CountryForces` (`CountryForces.tsx:58`), `CountryMoves` six groups (`CountryMoves.tsx:15-90`), "Act on <name>" footer door (`NationScreen.tsx:48-52`).
- Map: `spatial`, detent full, `nation:ID`, selection, lens `relations`, `marks="none"`, `pins` for US presence, `arcs` for trade, ally and rival ties (`:29-47`); `MapArc` contract `map/directive.tsx:20-32`.
- Entry: World directory, mover rows, map click, war and org rows, treaty parties.
- Observations (Brief s12 `/nation/$id`): the five sections are stacked in one scroll under an anchor list, not Overview / Diplomacy / Economy / Security tabs. The act door is in the surface foot, so it is persistent. Trade shows ranked partners, not the "every relevant sector" list the brief wants; the full sector list is on the act desk terms (R34). Source-only.

### R34 `/world/nation/$id/act`

- Purpose: act on a government. Historical: `/instrument/$id`, entity-first only (no route takes an instrument first).
- Embedded workflows (all configuration in the URL, `routes/world.nation.$id.act.tsx:11-17`): `TargetPlate`, `StageRail` nav "Stages of the act" (`world/nation/ActStages.tsx:36`), `UnderWay` list of acts in force (`ActDesk.tsx:45`, `ActUnderWay.tsx:14`), step 1 `Objective` cards (`ActChoices.tsx:80-105`), step 2 `Instruments` grouped by family with readings, odds pips and held states (`ActChoices.tsx:49-70,121`), step 3 `ActTermsForm` with sector `select` and `Choice` groups (`ActTerms.tsx:15,53,82,89`), step 4 `ActCompare` "Against doing nothing" with a `CompareAuthorize` and a "why" `details` (`ActCompare.tsx:105,164-178`), `ManageDesk` to end or change an act in force (`ActManage.tsx:15-30`), `ActReceipt` with "What it moved" and home effects (`ActReceipt.tsx:59-99`).
- Map: `workspace`, `nation:ID`, selection, lens `relations` (`ActDesk.tsx:41`); receipt `spatial` (`ActReceipt.tsx:62`).
- Entry: Country file footer (`NationScreen.tsx:49`), country overview link (`Overview.tsx:75`), world board in-flight rows (`world/world-board.ts:221,228`), org engage (`OrgScreen.tsx:119`), receipts "back to the workspace" (`ActReceipt.tsx:79`).
- Observations (Brief s8.1 entity-first vs action-first, s9.1 lifecycle): the four steps are the clearest lifecycle in the app and each is addressable. There is no action-first entry (choose a tariff, then a country). Terms are configured with select and choices, not a numeric input with unit and range (`ActTerms.tsx`; details not read in full). Source-only.

### R35 `/world/org/$id`

- Purpose: international body. No historical entry.
- Embedded: `Alignment` (`world/org/OrgScreen.tsx:22`), `Calls` linking wars (`:75-81`), `Members` (`:58`), `Commitments` (`:95`), `Engage` with nation `select` leading to `place.countryAct` (`:117-128`; href at `:119`), about text (`:176`).
- Map: `spatial`, detent full, member `set:` camera, selection, lens `bodyLensId`, `marks="none"` (`:153-164`).
- Entry: Country moves "Organizations" (`player-core world/nation-file.ts:114`).

### R36 `/world/security`

- Purpose: security desk. Historical: `/security`; `/service/$id` as readiness rows; `/ops` partly.
- Embedded: `Vitals` priorities (`world/security/SecurityScreen.tsx:87-91`), `FileNavigation` eight sections (`:22-31,92`), `Daily` (`Desk.tsx:14`), `WarPowers` and authorizations (`:119,142`), `Commands` with hover that lights an area on the map (`Desk.tsx:65`, `SecurityScreen.tsx:67,95`), `Readiness` (`Desk.tsx:88`), `Covert` with closed `details` (`Ledgers.tsx:38,61`), `Collection` (`:81,133`), `Assessments` (`:165`), `Commitments` (`:185`). Seven act panels replace the whole screen body: sign finding, close finding, task, close tasking, commitment, commission, press (`SecurityScreen.tsx:33-50`), each in `ActFrame` with `ChoiceCompare` (`ActFrame.tsx:24-35`), or an `ActReceipt` (`:82`).
- Map: `hybrid`, camera `world`, lens `forces`, `marks="forces"`, selection from the lit command (`:69-79`).
- Entry: World Situation tile (`WorldHome.tsx:250`), `PLACES.security`.
- Observations (Brief s12 `/security`, H09): a statutory clock (`WarPowers`, sections `:119,142`) sits second after "Today", which fits the brief's "do not bury a statutory clock"; the page then stacks eight topics. Act state is local (X4). X2 for `?service=`.

### R37 `/world/security/command/$id`

- Purpose: one combatant command. No historical entry.
- Embedded: header posture (`world/security/CommandScreen.tsx:19`), `Doors` into acts, forces assigned from each service (`:71,87`), area (`:104`), acts (`:142`); `CommandActPanel` with reassign selects and a `Choice` share (`CommandActs.tsx:90-132,142-176`), `ActReceipt` (`:194`).
- Map: `spatial`, `file.camera`, lens `forces`, `marks="forces"` (`:181-191`).
- Entry: security Commands rows (`security/command-board.ts:84`).
- Observations: unknown id shows "Command" empty screen (`:170`).

### R38 `/world/treaty/$id`

- Purpose: treaty detail. Historical: `/treaty/$id`.
- Embedded: sections parties, terms, odds, acts, others (`world/treaty/TreatyScreen.tsx:29,44,64,104,126`); acts via `SetAct` (`world/set/SetAct.tsx:40,82`); linked treaty door (`:132`).
- Map: `spatial`, `set:` of parties, lens `partiesLensId` (`:144-153`).
- Entry: World in-flight rows (`world/world-board.ts:232`), attention (`desk/attention-outstanding.ts:84`).
- Observations: "Sign it" column (`treaty-screen.ts:267`, X5).

### R39 `/world/war/$id`

- Purpose: war detail. Historical: `/war/$id`.
- Embedded: `SideCards`, then sections sides, front, forces, war powers, beats (`world/war/WarScreen.tsx:87,101,120,145,173`), conditional join, AUMF, end, compact (`:198-236`), `Papers` and `Choices` acts (`WarActs.tsx:75-93`), `ActsReceipt` (`:282`).
- Map: `spatial`, `set:` camera, selection, lens `sidesLensId` or `delta`, `marks="none"`, `pins` for forces (`:259-270`).
- Entry: World war rows (`WorldHome.tsx:60`), org calls (`OrgScreen.tsx:81`), country overview (`Overview.tsx:68`).
- Observations (Brief s8.2): the map frames by party set, not by invented fronts; "front" is a section (`:101`) and its content was not read in this pass. Source-only.

---

## 4. Historical route reconciliation (all 48 entries of BRIEF s12)

Status vocabulary: **equivalent** (same job, same or comparable depth), **merged into** (the job survives inside another route), **removed or not found** (no route and no screen section does the job), **partial** noted in the row.

| # | Historical | Current status | Current location | Notes (source) |
|---|---|---|---|---|
| 1 | `/` | equivalent | `/brief` (R06) | The current `/` is the title screen (R01). |
| 2 | `/conversation` | equivalent | `/brief/decision/$id` (R09) | |
| 3 | `/digest` | equivalent | `/brief/digest` (R07) | |
| 4 | `/summons` | merged into `/brief` | "Running clocks" (`brief/Sections.tsx:72-105`) | No sortable list or completed-obligations view. |
| 5 | `/summons/$id` | equivalent | `/brief/clock/$id` (R08) | |
| 6 | `/government` | equivalent | `/washington` (R22) | |
| 7 | `/office/$id` | equivalent | `/washington/office/$id` (R28) | |
| 8 | `/person/$id` | equivalent | `/washington/person/$id` (R31) | |
| 9 | `/congress` | equivalent | `/washington/congress` (R23) | |
| 10 | `/hill/$post` | equivalent | `/washington/congress/post/$id` (R25) | |
| 11 | `/judiciary` | equivalent | `/washington/courts` (R26) | |
| 12 | `/judge/$id` | merged into `/washington/courts` | `?judge=` (R26) | |
| 13 | `/case/$id` | equivalent | `/washington/courts/case/$id` (R27) | |
| 14 | `/policy` | equivalent | `/nation/policy` (R17) | |
| 15 | `/brief/$id` (policy memorandum) | merged into `/nation/policy` | `StanceDesk` (R17) | The path `/brief/*` is now the desk; no memorandum route. |
| 16 | `/order/$id` | equivalent | `/nation/policy/order/$id` (R18) | No document body (R18). |
| 17 | `/bill/$id` | equivalent | `/washington/congress/bill/$id` (R24) | |
| 18 | `/budget` | equivalent | `/nation/budget` (R14) | |
| 19 | `/economy` | equivalent | `/nation/economy` (R15) | |
| 20 | `/metric/$id` | equivalent, narrowed | `/brief/metric/$id` (R10) | Five desk readings only (X3). |
| 21 | `/world` | equivalent | `/world` (R32) | |
| 22 | `/nation/$id` | equivalent | `/world/nation/$id` (R33) | Prefix moved from `/nation` to `/world/nation`; `/nation` is now the US (R13). Old deep links would hit the Nation home or a not-found, **unverified**. |
| 23 | `/state/$id` | equivalent | `/nation/state/$id` (R19) | |
| 24 | `/district/$id` | merged into `/nation/state/$id` | `?district=` (R19) | |
| 25 | `/ops` | removed or not found, partial | none | Operations in flight appear in World "Pending developments" (`world/nation/WorldHome.tsx:121-125`) and "In force" on the act desk (`world/nation/ActUnderWay.tsx:14`); no operations list route. |
| 26 | `/security` | equivalent | `/world/security` (R36) | |
| 27 | `/service/$id` | merged into `/world/security`, partial | Readiness rows (`world/security/Desk.tsx:88`) | `?service=` is built and unread (X2). |
| 28 | `/instrument/$id` | merged into `/world/nation/$id/act` | R34 | Entity-first only. |
| 29 | `/war/$id` | equivalent | `/world/war/$id` (R39) | |
| 30 | `/treaty/$id` | equivalent | `/world/treaty/$id` (R38) | |
| 31 | `/emergency` | equivalent | `/nation/emergency` (R16) | |
| 32 | `/oversight` | equivalent | `/washington/oversight` (R30) | |
| 33 | `/press` | equivalent | `/washington/office/press` (R29) | `PLACES.press` `/record/press` is defined and unbuilt (X1). |
| 34 | `/scandal/$id` | equivalent | `/brief/scandal/$id` (R11) | |
| 35 | `/dispatch/$id` | removed or not found | none | `place.dispatch` builds `/record/press/dispatch/$id` (`places.ts:143`); no route (X1). |
| 36 | `/record` | equivalent | `/record` (R20) | New: `/record/event/$id` (R21). |
| 37 | `/removal` | merged into `/brief` | "Standing" section (`brief/Sections.tsx:108-152`) | Pressure gauge with threshold marks, three terms; no votes or responses. |
| 38 | `/ending` | removed or not found | none | `PLACES.ending` unbuilt; the top bar prints "Removed from office" etc. (`shell/ContinueControl.tsx:24-27,56-58`). |
| 39 | `/legacy` | removed or not found | none | `PLACES.legacy` unbuilt. |
| 40 | `/campaigns` | equivalent | `/administrations` (R02) | |
| 41 | `/welcome` | equivalent | `/` (R01) | |
| 42 | `/founding` | equivalent | `/founding` (R03) | |
| 43 | `/settings` | equivalent | `/settings` (R05) | |
| 44 | `/reference` | removed or not found | none | Glossary is reachable through Search (`shell/Search.tsx:36`), `GlossaryTip` (`shell/GlossaryTip.tsx`), `HelpTip`, and the first-run steps. No route. |
| 45 | `/recovery` | equivalent | `/recovery` (R04) | A real screen, not a redirect. |
| 46 | catch-all `routes/$.tsx` | equivalent | root `notFoundComponent` and `errorComponent` (R00) | X12. |
| 47 | `/dev` | equivalent, narrowed | `/dev/map` (R12) | Map harness only; not in production unless built with `VITE_MAP_HARNESS=1`. |
| 48 | `/showcase` | removed or not found | none | No design-system gallery route in `routes/`. |

Totals: 35 equivalent (including three narrowed), 7 merged into another route, 6 removed or not found (one of them, `/ops`, partly covered). 35 + 7 + 6 = 48.

Current routes with no historical entry: `/nation` (R13), `/record/event/$id` (R21), `/world/org/$id` (R35), `/world/security/command/$id` (R37). `/nation/state/$id?act=` (R19) and `/world/nation/$id/act` (R34) are workflows that the historical list carried inside other pages.

The Brief's note on the summons trailing slash: the current tree has no `/summons` route. Trailing-slash behavior for the registered index routes is X13.

---

## 5. Shell

### 5.1 Structure

- `Frame` composes `MapDirectiveProvider` > `AppFrame` with map, top bar, mode navigation, search overlay, and the routed screen as `children` (`shell/Frame.tsx:107-133`). `AppFrame` renders layers in this order: skip link "Skip to the work", map, bar, optional nav, `main#work`, overlays (`packages/ui-web/src/AppFrame.tsx:19-33`).
- Outside the term (`/` and `/founding`, `Frame.tsx:21`) there is no mode navigation or status. Otherwise `inTerm` is true when a campaign is loaded (`:103`).
- Loading and failure: `InTerm` shows "Opening the administration" while loading, redirects to `/recovery` on failure and to `/` when empty (`shell/InTerm.tsx:12-17`).
- Screen head: eyebrow, optional icon badge, `h1`, optional lede (`shell/Screen.tsx:80-90`). `useArrivalFocus` moves focus to the `h1` after the first navigation (`:46-53`). The document title is set to `<title> · Office of the President` (`:59-62`).

### 5.2 Navigation

- Five modes, labeled: Brief, Washington, Nation, World, Record (`shell/modes.ts:14-21`; titles from `places.ts:53-67`). The Brief badge counts matters that hold time (`shell/TermChrome.tsx:39-43`). Current mode is the first path segment (`modes.ts:27-30`).
- Second level is by door tile (`shell/DoorTile.tsx:23-44`; "Actions are buttons; places are tiles", `:20`) and file jump lists (`shell/FileNavigation.tsx`, a `details` of in-page anchors used on Economy, Congress, State, Country and Security; the press office has its own `hill-jumps` anchor row, `washington/press/PressScreen.tsx:28-34`). Nothing in the shell lists the second-level destinations together (X8).
- Map as navigation: selecting a state, district or nation on the map goes to its route when the route exists (`shell/map-routes.ts:3-22`, `Frame.tsx:64-76`); a pin with an `href` opens it (`Frame.tsx:79-87`).
- Search: command palette in a native `dialog` opened with Meta+K or Ctrl+K (`shell/search-shortcut.ts:4-15`, `packages/ui-web/src/CommandPalette.tsx:32,102`), lazily loaded (`Frame.tsx:18,46-61`). It searches the 20 built `PLACES` and the glossary (`shell/Search.tsx:34-37`, `search-index.ts:24-48`), scoring name starts above word starts above substrings (`:50-59`). Empty query shows the first 8 places (`:61,67`). It does not search entities (countries, people, bills, records).
- Brief s8.1 mapping: Desk (Brief), Government (Washington), Domestic policy (Nation: policy, budget, economy, emergency), World and security (World), Communications (inside Washington), Record, Utilities (top bar and title). The grouping exists as five modes, but Communications, Emergency, Security and Digest have no top-level entry (X8).

### 5.3 Masthead, time and attention

- Top bar: wordmark home link (to `/brief` in the term, else `/`), status (date and week), actions (`Frame.tsx:116-125`).
- `TermStatus`: "<date> · Week n" (`shell/TermChrome.tsx:22-28`), hidden below 40em (X9).
- `ContinueControl`: the single time-spending control (`shell/ContinueControl.tsx:42-111`). It is disabled while any decision waits or any presented attention item holds (`:52-54,17-22,95`), shows "N waiting" (`:31-34,85-89`), runs `continueUntilAttention` (`:69`), navigates to `/brief` after a run unless the player has moved on (`:66,73`), guards re-entry with a ref (`:48,61-63`), and replaces itself with "Removed from office", "Defeated at the polls" or "Both terms served" after an ending (`:24-27,56-58`). A visually hidden live region announces progress (`:106-108`). "Advance one day" and the Chief of Staff hand-off are on the Brief (R06), not in the bar.
- Attention: `briefMatters(campaign, preferences.attentionByKind)` supplies the Brief list and the badge (`TermChrome.tsx:41`); per-source pause rules are edited in Settings (R05).
- Save: `SaveStatus` shows "Save" or "Saved" and, on failure, "Retry save" and a "Why?" link to `/recovery` (`shell/SaveStatus.tsx:30-49`).
- Bar buttons: Search, with the word shown from 64em (`shell.css:150-155`), and Settings (`Frame.tsx:30-43`).

### 5.4 Phone versus desktop

| Aspect | Phone (under 48em, portrait) | Desktop (48em and up, or landscape under 30em tall) | Source |
|---|---|---|---|
| Top bar height | 44 px | 56 px | `tokens.css:140-141`, `frame.css:6,209` |
| Mode navigation | bottom tab bar, 50 px, 5 equal columns | floating left rail, 76 px wide, 68 px rows (52 px in landscape-short), gold highlight pane | `tokens.css:142-143`, `frame.css:14,49-58,208-243,253-261` |
| Work surface | bottom sheet with detents peek 112 px, half 334 px, full 100%, dragged from header or handle | docked left panel, `clamp(420px, 48vw, 640px)`, expandable to 960 px; no detents | `tokens.css:144-149`, `surface.css:6-26,96-107,146`, `WorkSurface.tsx:4,55-78,115` |
| Landscape under 30em tall | n/a | panel 340 px wide, eyebrow, lede and badge hidden | `surface.css:151-155`, `shell.css:289-300` |
| Short phone (under 37.5em tall) | half detent becomes 100% | n/a | `surface.css:90-94` |
| Wordmark text | hidden under 30em | shown | `frame.css:202-206` |
| Date and week in bar | hidden under 40em | shown | `shell.css:140-148` |
| "N waiting" next to Continue | hidden under 40em | shown | `shell.css:114-122` |
| Search and Save words | hidden under 64em | shown from 64em | `shell.css:150-155` |
| Comparison table | blocks per row under a 48rem container | table | `acts.css:261-290` |
| Compare verb row | stacks and clamps review to 3 lines under 30em | inline | `acts.css:114-130` |
| Founding rail | horizontal scroller | left column 12rem from 64em | `founding/FoundingFlow.tsx:57-67`, `founding.css:603-607` |

The same route tree and the same screen components serve both (no platform flag, per `CLAUDE.md` s8.1). The work surface places its verb in `ui-surface__foot` through a portal (`CompareAuthorize.tsx:98,145`; foot padding with safe-area inset `surface.css` `.ui-surface__foot`).

### 5.5 Breakpoints and container queries found in CSS

Pixel values assume a 16 px root (**unverified** that the root is 16 px). `grep` for `@media` and `@container` across `apps/web/src`, `packages/ui-web/src` and `packages/design/src` returned these (feature queries for forced-colors, reduced motion and print excluded; 8 such lines exist in total):

| Query | Pixels | Where | Effect |
|---|---|---|---|
| `min-width: 30em` | 480 | `ui-web/styles/frame.css:202`; `founding/founding.css:154` | wordmark name; footer next-step label |
| `max-width: 30em` | 480 | `ui-web/styles/acts.css:114`; `decision/decision.css:357`; `world/nation/act.css:408`; `world/nation/nation.css:352`; `nation/state/state.css:569` | compare action row stacks; narrow tweaks |
| `min-width: 40em` | 640 | `shell/shell.css:118,144`; | held word; top-bar status |
| `max-width: 40em` | 640 | `map/harness/harness.css:108` | dev harness only |
| `min-width: 48em` | 768 | `shell/shell.css:270`; `frame.css:208`; `surface.css:96`; `founding.css:583` | rail, docked panel, bar 56 px, emblem, stage titles |
| `max-width: 47.99em` | 767.84 | `shell/shell.css:258` | smaller title badge |
| `min-width: 64em` | 1024 | `shell/shell.css:150`; `founding.css:603` | Search and Save words; founding two-column |
| `max-height: 30em` and landscape | 480 tall | `shell.css:289`; `frame.css:208,253`; `surface.css:96,151`; `founding.css:589` | landscape phone treated as desktop layout |
| `max-height: 37.5em` | 600 tall | `surface.css:90` | half detent becomes full |
| `@container compare (max-width: 48rem)` | 768 | `ui-web/styles/acts.css:261` (container declared `:4`) | comparison table to blocks |
| `@container (max-width: 30rem)` | 480 | `decision/decision.css:73` (container `:16`) | decision layout |
| `@container (max-width: 26rem)` | 416 | `nation/state/state.css:616` (container `:612`); `shell/dossier/dossier.css:210` (container `:4`) | state and dossier layout |
| `@container (max-width: 24rem)` and `16rem` | 384 and 256 | `world/nation/world-home.css:28,53` (container `:52`) | world status grid |
| `@container (min-width: 36em)`, `44em`, `(max-width: 28rem)` | 576, 704, 448 | `washington/executive/washington.css:379,440,594` (container `:8`) | executive tree |
| `@container (max-width: 20rem)` | 320 | `washington/card/person-card.css:147` (container `:5`) | person card |
| `container-type: inline-size` only | | `ui-web/styles/readings.css:623` | readings container |

Observations against Brief s8.3 widths (source-only): there is no breakpoint at 1024, 1280, 1440 or 1920 for layout other than the Search/Save words at 64em; 1024 to 1919 and 768 to 1023 render the same rail-plus-panel composition, the panel width differing only through `48vw` between its 420 and 640 clamps. There is no labeled 224 px navigation, drawer or inspector (X10). JavaScript viewport logic is limited to chrome-insets measuring (`shell/chrome-insets.ts:25-42,63-87`), which reads element boxes rather than breakpoints, plus `matchMedia` for reduced motion and map settings (`app/display.ts:40-42`, `map/settings.ts:27-40`).

Test coverage of widths: `apps/web/playwright.config.ts` declares projects at 320x568, 390x844, 768x1024, 1280x800, 1440x900 and 1920x1080; its comment still says the suite is empty (`playwright.config.ts` header comment), yet 19 spec files exist under `apps/web/tests/`. Not run here.

### 5.6 Other shell-level embedded workflows

- `FirstRun` walkthrough, non-modal `role="dialog"` with Back, Next, Skip and "Turn off guidance" (`walkthrough/FirstRun.tsx:38-78`); shown on decisions only (`decision/Decision.tsx:113`), dismissed state in preferences (`:46`).
- Map data list: a toggle that opens a legend and keyboard-navigable table of the map's rows, standing in for the canvas (`map/MapDataList.tsx:26-38,46-58,60-90`, canvas is `role="img"` `map/MapLayer.tsx:190`).
- Map cards: `MapCard` overlays anchored to places, used by Brief and World (`map/MapCards.tsx`, `brief/MatterCard.tsx:26`, `world/nation/WorldHome.tsx:94`).
- `HelpTip` toggletip with Escape and outside-click dismissal (`ui-web/HelpTip.tsx:7-40`) and `GlossaryTip` (`shell/GlossaryTip.tsx`).
- Dialog inventory: the only modal `dialog` is Search (`CommandPalette.tsx:102`). The walkthrough is a non-modal aside. A face-builder `tablist` exists in Founding (`founding/FaceBuilder.tsx:118-120`). No other `role="tab"`, menu or popover exists in `apps/web/src` or `packages/ui-web/src` (grep). The "tabs" in the brief's compositions are implemented here as section anchors, lens `Choice` controls, or view buttons with `aria-current` (R32).
