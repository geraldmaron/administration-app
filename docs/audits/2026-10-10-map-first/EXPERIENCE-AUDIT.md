# Presidential experience audit and execution brief

Working audit, 2026-10-10. This record distinguishes source inspection, live observation and proposed work. It does not close W9, W10, BL-99, BL-100 or BL-101. The working tree already contained changes to the map, dossiers, charts and several screens when this audit began; those are part of the baseline, not work credited to this audit.

## Resolved brief

Intake
- Primary outcome: Make the player experience a coherent, credible presidential decision desk whose visual guidance, founding choices and world behavior agree.
- Also wanted: Audit every player route and nested surface; explicit Short and Long setup; twenty consequential questions; fifty researched historical reference profiles; meaningful NPC leadership; a broader observable world; realistic maritime disruption.
- Constraints: Official, appealing, consistent, icon-supported, context aware, never gimmicky. Preserve cabinet selection. No runtime model calls, duplicate simulation systems, publishing or deployment. Existing map-first interaction and phone/desktop parity remain in force.
- Decided: Offer both setup paths; the long path asks twenty questions; profiles must affect play, not just a label; expand beyond a Hormuz-only experience.
- Superseded: None. The existing eight-stage transition is an implementation to evolve, not the requested Short/Long choice.
- Assumptions: [assumed] Historical names belong in research/calibration and explicitly identified comparisons, not as the actual fictional campaign cast. [assumed] A questionnaire is a transparent game setup instrument, not a validated psychological test. [assumed] Age and school do not establish moral worth or intellectual ability.
- Parking lot: No request discarded. Historical research and calibration are separate from the UI work; extra event classes must pass through the existing content and simulation pipelines.
- Blocked on you: Nothing for the audit or reversible implementation. Real-person presentation needs a deliberate amendment if it replaces the standing fictional-cast rule.
- Plan: (1) Inventory surfaces and existing mechanics. (2) Fix shared presentation and journey defects. (3) Extend founding through the existing draft and seal. (4) Research and validate historical calibration. (5) Extend transit and governance through existing engine phases. (6) Exercise journeys, replay, balance, saves and accessibility before closing work.

Mode: readback before expensive execution; repository inspection and live audit proceed immediately.

### Optimized implementation instruction

Audit the existing application as a President, a first-time player, an accessibility user and a skeptical domain expert. Inventory routes, tabs, drawers, overlays, empty/error/loading states, confirmations, receipts and endings. For each defect identify the affected surface, visible evidence, shared owner, severity, proposed change and a checkable acceptance condition. Establish one official visual language using the existing icon, dossier, chart and action primitives. Preserve information density where it aids a decision; replace unexplained text or decorative readings with meaningful state, comparison, geography and consequence.

Offer Short and Long founding over the same validated campaign draft. Short exposes identity, party, governing style, age, education and key appointments. Long adds exactly twenty trade-off questions, a readable profile with answer provenance, review/edit controls and the same appointment rights. The profile must influence recorded founding inputs and existing mechanical consumers. Historical comparisons require fifty sourced, time-bounded leader references with uncertainty, contradictory evidence and editorial review. Never infer competence, integrity or violence from a school, demographic identity or party label.

Audit world behavior before adding it. Reuse the existing NPC utility agent, leader temperament, governance, conditions, commodities, diplomacy and incident lifecycle. Model transit disruption as capacity and causation, with lawful administration distinct from coercive interdiction, affected cargo, rerouting, duration and recovery. Make the evidence and response visible to the player. Verify the real game at every supported viewport and with representative populated, sparse and adverse states. Record remaining uncertainty rather than presenting planning values as researched facts.

## Principal findings at intake

1. **P1 — There is no Short/Long founding choice.** `FoundingFlow.tsx` renders eight stages and a “Skip to the oath” button. That shortcut bypasses informed setup and does not substitute for a compact setup path. No twenty-question flow was found. `leader.ts` assigns education from the career ID rather than letting the player choose it.
2. **P1 — Chokepoints exist as data, but the requested transit system does not.** `packages/world/src/dataset/geography.ts` contains twelve points: Hormuz, Malacca, Suez, Bab el-Mandeb, Panama, Bosphorus, Gibraltar, Danish Straits, Taiwan Strait, Cape of Good Hope, Dover and Sunda. `Chokepoint` has location, regions, a traffic-share scalar and `closableByOneState`; it lacks operator, authority, disruption cause, remaining capacity, alternate route and recovery. Do not add a second point catalogue.
3. **P1 — Traffic denominators are not safe for a realism claim.** The schema calls `globalTrafficShare` a share of world seaborne trade. Hormuz is assigned 0.2 and the commodity registry reuses that field. Petroleum flow, maritime trade value, tonnage and vessel transits are different denominators. Those values need independent primary-source verification before being displayed as factual percentages or propagated into commodity-specific losses.
4. **P1 — The history request is a calibration program, not fifty names and scores.** Existing `LeaderConstraint` preserves office, age band, regime and governing parties; `foreign-leader.ts` and `temperament.ts` already give fictional incumbents bounded behavioral effects. Neither constitutes fifty documented historical leadership profiles. A new unsupported score table would make the simulation less credible.
5. **P1 — Scenario casting can undermine the whole presentation.** The audit campaign's first brief, “A failed harvest across the border again,” was placed on the United Kingdom–Ireland frontier. This is observed evidence of a plausibility concern, not proof that all casts are wrong. Check the scenario's agricultural exposure, existing crisis, trade access, state capacity and actual US decision relevance before widening event variety.
6. **P2 — Official identity and reading hierarchy were inconsistent.** The owner clarified that stars, stripes and familiar government patterns belong across working screens. Retain a restrained star canton, institutional icon and red-white-blue rule on the shared header; keep headings compact and reserve stronger color for data and the current action. The earlier proposal to confine the identity to entry screens is superseded by that clarification.
7. **P2 — The shared vocabulary exists but adoption is uneven.** `Icon`, `IconBadge`, `DoorTile`, `Dossier`, `Vitals`, `Tag`, `Gauge`, `Steps`, `Series`, `Hemicycle`, `CompareAuthorize` and `Receipt` already exist. Country files still mix plain metadata, meters, underlined action links and a duplicate footer action. Fix the consumer composition instead of inventing another card framework.
8. **P2 — A stage indicator is not necessarily a staged journey.** The foreign act desk presents an objective rail, but progressively appends objective, act, terms and assessment into one long surface. On a phone, preserve the selected target and back/edit affordances and bring the current task into view; keep an explicit do-nothing baseline and receipt.
9. **P2 — Empty does not always mean safe.** World starts with known wars alongside “No government has been in the news”; its headline says none are hostile while Iran's file says its view is unread and the US view is hostile. Counts need directional labels and a clear separation of known stance, unknown intelligence and active threat. BL-102 already owns part of this; do not open a duplicate fix.
10. **P2 — Some readings imply unsupported precision or importance.** Repeated half-dials for categorical lean and five personal ratings make unrelated concepts look commensurable. Use `Steps` for assessed bands, a diverging line for ideology, a percentage only for an actual ratio, a time series for change, and chamber seats for votes. Always keep text equivalents.

## Surface ledger

Evidence key: **L** live desktop observation in this audit; **S** source inspection; **P** live proof still pending. An L entry is not a claim that every nested state was exercised. Every row requires phone, keyboard and adverse-state acceptance before closure. Route sources are under `apps/web/src/routes`; composition owners below are under `apps/web/src` unless stated otherwise.

| Surface / route | Evidence | Change needed / acceptance | Shared owner |
|---|---|---|---|
| Title `/` | L | Keep emblem and one obvious new/continue action; explain local saves; avoid oversized empty panel | `Screen`, `screens.css` |
| Founding `/founding` | L/S | Explicit Short/Long; preserve editable identity and appointments; complete both into a saved Brief | `founding/FoundingFlow`, `useFounding`, `draft`, player-core stages |
| Person / face builder | S | School choice; restrained identity plate; age bounds explained; no hidden demographic stat bonuses | `PersonStage`, `FaceBuilder`, engine `leader` |
| Career / politics | S | Distinguish biography, ideology and governing style; show mechanical consequences and trade-offs | `RecordStage`, `PoliticsStage`, profile scorer |
| Ticket / platform / staff / cabinet | S | Same control in both paths; shortlist fit explained; selected people remain stable when revisiting | Existing founding stages and candidate selectors |
| Oath / preview / seal failure | L | Show profile, choices and defaults; route each refusal to the field; one seal and persistent save | `OathStage`, `seal`, `Receipt` |
| Administrations `/administrations` | S/P | Official archive, date/status/seed; import errors and capacity guide a next action; deletion distinct | Existing library screen, `EmptyState`, `Receipt` |
| Recovery `/recovery` | S/P | Specific recoverability and next action; distinguish corrupt, incompatible and unavailable saves | Recovery screen and save adapter |
| Settings `/settings` | S/P | Icon-marked groups and previews; fix copy still referring to thicker map dots; scope preferences visibly | Settings `Group`, `Field`, `Choice` |
| Missing route / unavailable campaign | S/P | Contextual icon and working return destination; no raw exception or empty map-only screen | `__root`, `InTerm`, `EmptyState` |
| Brief `/brief` | L | Put current matter before low-priority receipt; show urgency, location and time held; retain chart drilldown | Brief, `Receipt`, common header |
| Decision `/brief/decision/$id` | S/P | Memo, options, counsel, cost, uncertainty, authorization and aftermath must form one connected journey | `decision/Decision`, `CompareAuthorize` |
| Metric `/brief/metric/$id` | S/P | Units, real baseline, time horizon, contributors and record links; no decorative empty trend | Metric route, `Series`, `Radar`, `Gauge` |
| Clock `/brief/clock/$id` | S/P | Timeline, consequence of expiry, responsible office and reachable response | `brief/CaseScreen`, `Gauge` |
| Scandal `/brief/scandal/$id` | S/P | Allegation/status/evidence distinguished; response and result visible; no guilt implied by red | `brief/ScandalScreen` |
| Digest `/brief/digest` | S/P | What changed, why stopped, where affected, next decision; no wall of unrelated dispatches | Digest, map delta, `Moves` |
| Nation `/nation` | L | Keep electoral/approval visuals; meaningful legends and keyboard access to every state | `nation/state/NationHome`, lenses |
| State `/nation/state/$id`, district selection | S/P | One dossier with flag/vitals/conditions/representation; district facts distinct from state estimates | `StateScreen`, `Dossier`, `Vitals` |
| State act / receipt | S/P | Affected locale and authority stay visible through compare, confirmation and result | `LocaleActDesk`, `LocaleReceipt` |
| Economy `/nation/economy` | L | Keep sourced trends; expose present value, change and cause; distinguish historical and simulated series | `EconomyScreen`, `Readings`, `Series` |
| Economy markets / households / levers | S | Commodity route and price transmission should be inspectable; indices must not look like prices | `Markets`, `Household`, `Levers` |
| Budget `/nation/budget` | L | Group appropriation, recurring cost and available authority; compare current/draft on matching units | `AllocationEditor`, `DraftProjection`, `CompareAuthorize` |
| Policy `/nation/policy` | L | Keep domain icons; locked policies lead directly to the required legislative action | `PolicyScreen`, `ChoiceCompare` |
| Order `/nation/policy/order/$id` | S/P | Authority, notice, court exposure and effective date as one pipeline | `OrderScreen`, `OrderPipeline` |
| Emergency `/nation/emergency` | L empty | Contextual empty-state icon; eligibility, duration and expiry visible for a live condition | `EmergencyScreen`, `EmergencyActs` |
| Washington `/washington` | L | Keep hierarchy and person cards; distinguish appointed, acting and Senate-confirmed officeholders | `ExecutiveTree`, `PersonCard`, status tags |
| Office `/washington/office/$id` | S/P | Shared official file; remit, incumbent, performance, pending actions and appointments | `OfficeScreen`, `Dossier` |
| Person `/washington/person/$id` | S/P | Biography and evidenced traits; comparable ratings; relationship graphic has usable links/list | `PersonScreen`, `PersonVisuals`, `Dossier` |
| Congress `/washington/congress` | L | Keep hemicycles; obvious chamber thresholds and current floor business; reduce jump-pill clutter | `CongressScreen`, `Hemicycle`, section navigation |
| Bill `/washington/congress/bill/$id` | S/P | Legislative stage, whip count, authority and next action; passage/veto/failed states | `BillScreen`, `WhipCount`, `CompareAuthorize` |
| Hill post `/washington/congress/post/$id` | S/P | Officeholder, leverage and cost of request, using person/office patterns | `PostScreen`, `HillAct` |
| Courts `/washington/courts`, judge query | L/S | Keep bench; show relevant jurisprudence, not economic lean as a universal predictor | `Bench`, `JudgeFile`, person readings |
| Court case `/washington/courts/case/$id` | S/P | Filing/hearing/decision/effect timeline, standing order and legal options | Courts `CaseScreen`, `Docket` |
| Oversight `/washington/oversight` | L | Inquiry stages distinguish unopened/unknown/closed; lawful authority and refusal exposed before directive | `Inquiries`, `DirectiveComposer`, `Inspectors` |
| Press `/washington/office/press` | L | Put current issue, audience and goal before tactic; corpus posture is an assessment, not approval | `PressScreen`, `Podium`, `PressActs` |
| World `/world` | L | Directional stance headline, active crisis hierarchy, transit door, regional scan, unknowns | `WorldHome`, `WorldHeadline`, `DoorTile` |
| Country `/world/nation/$id` | L Panama/Iran | Adopt shared file/vitals; visible geography and governance; coherent route to act | `NationScreen`, `Overview`, `Dossier` |
| Country relationship / economy / forces / moves | S | Consistent section navigation and assessed-vs-known readings; leader disposition linked to observed acts | Existing country components, `Steps`, `Series` |
| Foreign act `/world/nation/$id/act` | L initial | Objective → act → terms → compare → authorize → receipt, with target and edits retained | `ActDesk`, `ActStages`, `CompareAuthorize`, `Receipt` |
| Organization `/world/org/$id` | S/P | Charter, members, obligations, votes and action, not a list without stakes | `OrgScreen`, `set/Party`, `SetAct` |
| Treaty `/world/treaty/$id` | S/P | Signatories, ratification, commitments, deadlines, breach and withdrawal consequences | `TreatyScreen`, `SetAct` |
| War `/world/war/$id` | S/P | Parties, theater, stage, casualties as uncertainty bands, obligations and exit routes | `WarScreen`, `WarActs` |
| Security `/world/security` | L | Rank intelligence by presidential consequence; commands, findings, collection and commitments retain scope | `SecurityScreen`, `Desk`, `Ledgers` |
| Command `/world/security/command/$id` | S/P | Commander, theater, resources, current orders and consequences; no fictional precision in force positions | `CommandScreen`, `CommandActs` |
| Record `/record` | L empty | Clear event types, actor, date, causal trail and affected places; explain filters with no results | Record route, entry marks, `EmptyState` |
| Event `/record/event/$id` | S/P | Decision → authorized act → realized effects → delayed consequences; source uncertainty retained | Event route, player-core `record-entry` |
| Ending / legacy / retired campaign | S/P | Cause and constitutional outcome, final record, restart/archive; never a generic failure modal | Existing ending/read-only paths; e2e ending fixtures |
| Search / glossary / walkthrough | S/P | Same icon meanings; result destination/context; focus trap, Escape and return focus | `Search`, `CommandPalette`, `GlossaryTip`, `FirstRun` |
| Map / lenses / pins / cards / list | L/S | Geography and units agree with panel; no hover-only evidence; keyboard/list parity; reduced motion | Existing map and lens system |
| Save / loading / error / confirmation / receipt | S/P | Plain reason, recovery and pending state; prevent duplicate commit; status not color alone | `SaveStatus`, `EmptyState`, `CompareAuthorize`, `Receipt` |

Internal Studio and developer map harness are not player surfaces; audit separately before describing “all applications” as complete. Electron shares the renderer but its native window/menu/file operations require an actual packaged-host check.

## Shared presentation contract

**Retain:** navy ground, existing logo, white text, restrained gold institutional marks, blue navigation/selection and vivid data palettes. Preserve chart types that tell different kinds of truth. **Change:** compact working headings, quieter decoration, consistent labeled icons, clear reading provenance, and a visible next action.

One icon means one concept throughout navigation, lists, sections and receipts. A labeled icon supplements words. Icon-only controls need an accessible name and a visible tooltip. Flags identify countries; portraits identify people; neither replaces a descriptive name. Status requires words and shape as well as color. Gold is institutional emphasis, not universal goodness. Red identifies urgent risk or destructive consequence, not an ideological position. Do not add seals or classification markings unsupported by the document's actual game function.

Extend existing components: `Screen` for header scale and hierarchy; `Dossier`/`Vitals` for files; `DoorTile` for destinations; `Choice`/`Field` for input; `CompareAuthorize` for consequential action; `Receipt` for outcome. Section jump links should share icon, focus and wrapping behavior. Avoid a universal “card” abstraction that erases differences between a dossier, a time series and an authorization.

## Founding and profile contract

Both paths produce the same `FoundingChoices` and engine seal. A Short player receives no hidden penalty; a Long player receives no extra attribute budget. Name, party, identity and schooling remain explicit choices. Twenty questions should cover economic policy, institutions/civil liberties, foreign alignment, use of force, executive working style, response to evidence and compromise. Each answer must buy something and give something up; “be competent” versus “be corrupt” is not a meaningful question.

Record questionnaire version and answer IDs, derived dimensions and any manual overrides. Score missing answers as missing, never as neutral. Show progress and permit revisiting. Profile review explains which answers drove a tendency and what it changes mechanically. Contradictory choices are allowed; the system reports a mixed profile. Do not silently replace a selected party, career, age or cabinet after recomputing the questionnaire.

Separate world generation from personnel selection. If the seed changes after appointees were selected, the existing `withSeedText` deliberately clears appointments; never hash every keystroke into the seed and invalidate a cabinet in the background. Freeze/review profile generation before appointments, or preserve independent named RNG streams. Same seed, profile version and answers must replay; old saves must retain their original people and behavior.

Every claimed trait needs a consumer: ideology → institutional/party affinity and alignment; Person traits → counsel, rapport and existing role behavior; governing behavior → existing bounded temperament and governance program. Player decisions remain under player control. Do not make “hawkish” automatically declare a war for the human President. Compare founders against the same world to show that differences come from the profile, not only unrelated random draws.

### Fifty historical references

Use a period-specific research record for each reference: name, country/office, dates, observable policy choices, institutional constraints, source URLs and access dates, contradictory evidence, calibrated dimension ranges, confidence and reviewer. Do not grade a whole life with one precise integrity/competence scalar. Similarity must explain shared policy/working-style dimensions and disagreements; it is not moral equivalence, diagnostic psychology or an endorsement.

The user named Barack Obama and Justin Trudeau as examples. Treat recognizability as a roster-selection criterion, not a claim that those two exemplify the same behavior. Select the remainder across regions, eras, democracies, authoritarian systems, reformers, coalition builders and wartime leadership. Avoid fifty mostly American/European male incumbents and avoid importing a monarch's institutional powers into a US President. No researched roster or verified numerical calibration is claimed by this audit.

## World behavior and transit contract

Existing consumers to extend: `npc-agent.ts` (ranked utility, cost and capability), `foreign-leader.ts`/`temperament.ts` (bounded incumbent effects), `governance.ts` (government program), `foreign-politics.ts` (selection/succession), `world-events.ts` (international acts), conditions and commodity phases. These provide substantial behavior already. The missing work is traceable, calibrated coverage and player visibility, not a new random-event generator.

Event coverage must include domestic protest/repression/reform and service delivery; elections, coalitions and coups; bilateral coercion and cooperation; sanctions and trade disputes; cyber and infrastructure failure; natural hazards, epidemics and harvest loss; displacement and border pressure; logistics and energy disruption; alliance votes, mediation, escalation and settlement. For each family record trigger, actor eligibility, affected population, persistence, recovery, causal links, plausible responses and where the player can learn of it. A quiet world remains a valid outcome. Bound correlated cascades and avoid charging the same supply loss in both an incident and a commodity phase.

Transit is a network with residual capacity. A canal authority's operating restriction, an accident, drought, mines, a blockade and carrier/insurer avoidance are distinct causes. Coastal geography does not confer an unconditional lawful right to close an international strait. Territorial claim, legal authority, capability and actual control need separate fields. Hostile action has a duration, costs and countermeasures; reopen does not instantly erase queues, premiums and accumulated losses.

Hormuz acceptance: an eligible actor can attempt a disruption, cannot guarantee total closure merely by issuing an order, and the simulation accounts for affected cargo, available bypass capacity, escort/clearance, escalation, third-country effects, recovery and the player's information limits. Panama acceptance: operator restrictions and hydrological/operational constraints can lower throughput without becoming a military act; effects differ by cargo and alternate route. Neither acceptance is currently proven. Primary research must establish current capacities and legal regimes before numbers are implemented.

## Adversarial review of this brief

VERDICT: Accepted with controls

Steelman: A consistent official interface lets the player understand presidential choices, and a researched leadership/transit model makes consequences more legible and replayable. Reusing the existing deterministic engine preserves a single explanation of what happened.

This is shared-context self-review, not independent approval.

| Challenge | Failure tested | Result / required control |
|---|---|---|
| Strongest failure | A handsome quiz assigns a celebrity match, rerolls the cabinet, and has no traceable in-game effect | Serious. Same inputs must replay, appointments remain stable, every advertised dimension has a tested consumer |
| Best alternative | Spend all effort on shared UI and leave founding/world unchanged | Does not satisfy the request; adopt shared UI first, then extend existing mechanics instead of replacing them |
| Load-bearing claims | Twelve points and existing personality effects imply realism is complete | Serious. Source proves existence only; calibration, closure lifecycle and fifty researched profiles remain unproven |
| Assumption inversion | Player dislikes the inferred profile, gives mixed answers, changes party, or prefers Short | Serious. Review/edit, mixed results, explicit party, equal choice and no points advantage between modes |
| Cost bearer | Players absorb misleading history, inaccessible charts and save incompatibility | Serious. Evidence disclosure, keyboard/text equivalents, backward-compatible saves and regression tests |
| Hostile expert | School predicts intelligence; regime equals personality; all shipping uses one global percentage | Serious. Separate biography/person/institutions/capabilities; use dated, cargo-specific route data and ranges |

Controls are acceptance conditions, not permission requests. Unsupported reference scoring and binary universal closures are rejected designs.

## Verification and remaining work

Audit ran against the current working tree, with an audit-only local campaign named Morgan Vale. Live desktop observations above used 1440×900. No claim of full visual acceptance, complete historical research or completed simulation expansion is made. Baseline test results and implementation checks are recorded below as they finish.

Reuse search covered this repository, sibling projects under `~/Developer/Projects`, and installed skills. Existing game profile, founding, icon, dossier and geography implementations are the owners; unrelated profile utilities in sibling products are unsuitable. No new dependency is proposed.

Closing gates: intake covers the whole request, decisions, assumptions and no discarded tangents; adversarial review ran all six challenges and records serious findings; implementation and surface verification remain open. This file is an engineering working record, not a finished publication or a claim that the requested program is done.

## Responsive defects reproduced during verification

Reproduction
- Command: Open Nation in the Morgan Vale audit campaign at 390×844; measure the work surface's clientWidth and scrollWidth.
- Environment: local Vite player, Chromium in-app browser.
- Data: real founded campaign, all 51 state approval dots.
- Frequency: deterministic in the live screen and phone/desktop e2e.
- Observed: `clientWidth 390`, `scrollWidth 420`; e2e expected overflow <=1 and received 30.
- Expected: all readings and controls remain within the work surface.

The invisible DC tooltip was 195px wide at x340, despite a 16px dot. Opacity hid its ink without removing its overflow. Hiding inactive tooltip boxes and anchoring edge labels inward removed the overflow: observed 390/390 and 320/320. Separately, the segmented lens selector clipped Population; responsive grid choices now wrap and retain touch targets. Keyboard-visible edge-label overflow is covered in states.spec.ts. Existing hidden text remains accessible; there is no blanket clipping of the plot.

Reproduction
- Command: Open Department of State at 390×844 with the sheet full, then resize to 1440×900.
- Environment: same local Vite browser and audit campaign.
- Data: founded office with a real headquarters target.
- Frequency: observed repeatedly during the responsive audit.
- Observed: globe remains near the bottom left; console reports MapLibre matrix calculation failure.
- Expected: the headquarters reframes in the available desktop map area.

Hypothesis: fixed 32px framing margins on each edge exceed the 48px minimum map strip produced by visibleArea. Inspection confirms a negative inner frame height. Reframing the same target during a viewport change should also cut to its new frame rather than interpolate padding from the previous viewport. Verification follows below; the defect was present in the in-progress GL renderer and is more exposed by full phone sheets.

## Implemented visual correction after the owner's screenshot

The office screenshot was valid evidence that the earlier pass had not addressed the shared weak readings pattern. The following are now in source, with rendered evidence under `experience-screens` and the refreshed `w5-screens`, `w6-screens`, and `w7-screens` directories:

- Shared Screen: compact title, institutional icon where supplied, star canton and leading star, red-white-blue rule. Existing logo and navy/gold identity retained. Hybrid task screens open fully on phones; geographic overview screens still open on the map. Office, person, organization and country files explicitly open fully. All remain collapsible.
- Office: existing Dossier and numbered sections; identity and incumbent, performance, leadership readings, authority/actions, agencies, Record. Four icon-led performance rings replace slider-like lines. Workload is separate from assessment scores, and only staffing is described as a measured ratio.
- Shared readings: solid continuous meter fill without a draggable-looking knob or glow; discrete Steps for assessed personal/country bands. Labels and confidence/consequence text remain available. No simulation values were changed for visual effect.
- Organization: ring shows an explicit assessed-member numerator/denominator. Unknown is not counted as opposition. US membership is marked separately; member flags, names and labeled stance icons replace repetitive bars.
- State/country section links: meaningful icons beside the existing words. Shared segmented choices reflow instead of hiding options; the selected state uses a flat fill and clear edge instead of a glow.
- Archive/settings/recovery: matching icon-led headers and group labels. A failed library check explicitly says its condition is unknown; it cannot claim every save is healthy. Missing routes offer a contextual return. The top-level crash fallback is independent of the failed map/providers and offers reload or saved administrations, with a warning to check the Record before repeating an action.
- Map camera: padding scales to the available frame; reframing the same target after resize cuts rather than interpolating incompatible viewport padding. Live phone→desktop verification restored the headquarters map. The browser log also captured a development hot-refresh teardown error; that is distinct from the corrected matrix failure and is not described as production acceptance.

### Rendered inspection record

These are actual inspected renders, not a route-coverage claim. The first image inspection caught layout defects that the initial automated checks did not express. Later captures supersede earlier images of the same name.

| Surface | Evidence inspected | Observation / status |
|---|---|---|
| Department of State arrival | `experience-screens/office-arrival-390.jpg`, `office-arrival-1440.jpg` | Identity, incumbent, numbered performance and official header read in order. No overlap; desktop headquarters reframes after resize. |
| Office performance / leadership | `office-performance-390.jpg`, `office-assessment-390.jpg` | Four labeled rings and separate workload; assessed bands retain confidence and consequence. |
| Settings | `settings-1440.jpg` | Icon-led groups and real preference controls. Full high-contrast/color-vision preference persistence also exercised by shell.spec.ts; not a claim that every screen was visually inspected in those modes. |
| Archive / Recovery | `administrations-1440.jpg`, `recovery-1440.jpg` | Clear save status/import/retry and contextual empty state. Latest recovery wording supersedes the early capture. |
| Failed screen download | `screen-failure-320.png`, `screen-failure-390.png` | Final compact layout inspected: official identity, explanation, reload and archive actions, saved-state guidance fit without clipping. The prior oversized empty-state treatment pushed the action below the smallest viewport and was removed. Reload after restoring the download reaches the archive at all six sizes. |
| Nation lenses | `nation-lenses-390.jpg` and live 320/390 geometry | All options visible after reflow; tooltip overflow corrected separately. |
| Economy, markets, levers, receipt | refreshed w5 `economy*` phone captures | Current values, plotted history, controls, comparison and receipt fit. Opening half sheet concealed readings; now full opening reveals the cycle and current readings. |
| Budget, draft, request, receipt | refreshed w5 `budget*` phone captures | Appropriation chart and draft/receipt hierarchy fit; comparison remains appropriately quantitative. |
| Congress, bill | refreshed w6 `congress`, `congress-bill` phone captures | Shared official header, readable chamber graphic and legislative stage; full opening exposes the chamber and choices. |
| Courts, nomination | refreshed w6 `courts`, `courts-nominate` phone captures | Bench cards fit; nomination comparison preserves candidates and vote count. Jurisprudence model remains a separate substantive concern. |
| Oversight, directive | refreshed w6 `oversight`, `oversight-directive` phone captures | Numbered inquiry stages, privacy/status and directive baseline remain legible. Full opening puts the first inquiry in view. |
| Press, plays | refreshed w6 `press`, `press-plays` phone captures | Podium portrait, current issue and audience reading visible; comparison retains explicit baseline. |
| World, country, economy | refreshed w7 `world-home`, `world-country`, `world-country-economy` phone captures | Geographic overview stays map-first; country file now opens fully. Initial oversized text dial problem was in Organization, not country economics. |
| Organization and members | refreshed w7 `org`, `org-members` phone captures | Corrected 31/31 assessed-member ring fits; flags and labeled stance icons replace repetitive bars. |
| Security, task, command | refreshed w7 `security`, `security-task`, `command` phone captures | Intelligence/current action visible on full desk; geographic command retains theater map. |
| Treaty | refreshed w7 `treaty` phone capture | Long title wraps; terms follow official identity without collision. |
| War, join | refreshed w7 `war`, `war-join` phone captures | Parties, role flags, stage and action baseline remain explicit. |
| Foreign objective, compare | refreshed w7 `world-act-objective`, `world-act-compare` phone captures | Icon objective tiles and four-stage rail fit. The long accumulating journey is still a finding; shared styling does not close it. |

Remaining visual acceptance: every route is inventoried, but a full per-state visual walk of endings, retired campaigns, every empty/error variation, enlarged text, keyboard focus and all contrast modes is not complete. Native Electron surfaces have not been exercised. BL-103 remains open for these gates; the fifty-reference and transit work remain BL-104/105.

### Adversarial review of the correction

Verdict: **accepted with controls; partial acceptance, not release approval**.

The strongest failure would be adding patriotic decoration while leaving opaque decisions and false numerical precision. The implemented control is to pair identity with information structure: shared reading semantics, measured versus assessed labels, unknown states, and unchanged comparison/authorization receipts. A plain generic dashboard would be easier to keep consistent, but would lose the requested presidential identity; it is rejected as the product direction. Full phone sheets could obscure geographic context, so map-first overviews remain half-open and every task panel can be lowered. The live resize defect was found and corrected rather than excused as decoration. No official seal, real-government affiliation claim, celebrity psychological scoring, or new dependency was added.

## Verification record for this working tree

Project inspected: `AGENTS.md`, `CLAUDE.md`, design/architecture/schema/backlog, existing founding, engine personality, geography, shared UI and route owners. Reuse search found the canonical components and pipelines; none was duplicated. Blast radius: shared browser screen/header, readings and choices; office/person/country/organization composition; root recovery; map framing; founding draft, public optional leader inputs, engine Person composition and saved founding choices. The public profile contract is documented in SCHEMA and ARCHITECTURE. No new runtime dependency or save migration.

Check:    workspace build, strict types, lint and normal tests
Command:  pnpm run build && pnpm run typecheck && pnpm run lint && pnpm run test
Result:   pass
Observed: sequence exited 0; logs `/private/tmp/admin-experience-final-{build,typecheck,lint,test}.log`. Map framing and top-level fallback received additional changes after the initial build; the subsequent e2e build and web typecheck/lint are recorded separately.

Check:    later web typecheck and lint
Command:  pnpm --filter @admin/web run typecheck && pnpm --filter @admin/web run lint
Result:   pass
Observed: both commands completed without errors in `/private/tmp/admin-experience-followup-{typecheck,lint}.log`.

Check:    final web types and lint after compact recovery refinement
Command:  pnpm --filter @admin/web run typecheck && pnpm --filter @admin/web run lint
Result:   pass
Observed: sequence exited 0 after the final recovery layout/prose and profile-summary font-token edits.

Check:    clean full composed-size browser journeys
Command:  E2E_PORT=4187 E2E_FIXTURES=wildfire-colorado E2E_SCREENS=1 STATE_SCREENS_DIR=../../../docs/audits/2026-10-10-map-first/experience-screens pnpm --filter @admin/web run test:e2e --project=mobile-390 --project=desktop-1440 --workers=2
Result:   pass
Observed: 106 passed in `/private/tmp/admin-experience-final-e2e.log`. The relative screenshot output path resolved outside this repository; the generated state captures were moved into this audit's experience-screens directory. Subsequent checks use an absolute output path.

Check:    founding, Nation edge labels, office resize and recovery at all six sizes
Command:  E2E_PORT=4187 E2E_FIXTURES=wildfire-colorado E2E_SCREENS=1 STATE_SCREENS_DIR=docs/audits/2026-10-10-map-first/experience-screens pnpm --filter @admin/web run test:e2e tests/setup-profile.spec.ts tests/states.spec.ts tests/map.spec.ts tests/shell.spec.ts --grep 'Short setup|Long setup|Nation sets|office map recovers|failed screen' --workers=2
Result:   pass
Observed: 30 passed in `/private/tmp/admin-experience-breakpoints.log`; sizes 320, 390, 768, 1280, 1440 and 1920. Both setup paths seal/reload, changed questionnaire answers require reapplication, focused edge labels stay within the screen, and the office map recovers after resizing.

Check:    final compact recovery at all six sizes
Command:  E2E_PORT=4187 E2E_FIXTURES=wildfire-colorado E2E_SCREENS=1 pnpm --filter @admin/web run test:e2e tests/shell.spec.ts --grep 'failed screen' --workers=2
Result:   pass
Observed: 6 passed in `/private/tmp/admin-experience-recovery-final.log`; final 320/390 captures inspected after the actions were moved above the fold.

Check:    initial full composed-size browser journeys
Command:  E2E_PORT=4187 E2E_SCREENS=1 pnpm --filter @admin/web run test:e2e --project=mobile-390 --project=desktop-1440 --workers=2
Result:   fail
Observed: 98 passed, 8 failed. Failures were Record's obsolete list expectation (2), Nation tooltip overflow (2), renamed district expectation (2), and receipt failures (2). The source/expectation fixes and clean rerun supersede this result; it is retained as defect evidence.

Check:    repository proof gates
Command:  for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done
Result:   fail
Observed: gates were executed, but the loop's zero exit is not proof that they all passed. Findings included CSS ownership/literal-color violations, stale icon-baseline allowances, an unrelated studio file-size violation, longitude wrapping flagged as calendar conversion, bundled content family/publish-gate findings, and committed-dist freshness on a dirty tree. The dist proof's temporary source marker was removed after its cleanup could not run; contracts remained clean. No validator was weakened and nothing was published.

Check:    CSS architecture after touched-file cleanup
Command:  node scripts/verify-css-architecture.mjs
Result:   fail
Observed: remaining findings are existing decision.css, person-card.css and world/nation/act.css shared-surface overrides and helptip.css literal color. This pass's readings, controls, office and shell changes add no reported violation.

Check:    simulation balance
Command:  pnpm --filter @admin/engine run test:balance
Result:   fail (run still progressing at this record)
Observed: population-balance's “leaves somebody in the population able to lose” expects a value >0 and receives 0. BL-89 already records that failure in the baseline after force-cost changes. Other completed batteries include profile/NPC, campaign, term and pledge balance. No passing full balance claim is made.

Outcome:  the office's old text-and-slider readings become an official, readable performance and leadership file, and shared screen identity remains consistent.
Surface:  Department of State, phone 390×844 and desktop 1440×900; related country, organization, Washington and economic screens.
Data:     Morgan Vale, a real sealed local campaign; engine-generated scenario fixtures for receipts, vacancies, hearings, war and treaties.
Observed: stars and flag rule in the header; incumbent identity; numbered performance section with four labeled rings; workload separate; categorical leadership bands; authority and actions later in the file. Phone opening now reveals the work. Nation has no horizontal overflow at 320/390; desktop framing recovered after resize.
Verdict:  proven for the named surfaces and states; exhaustive visual acceptance remains not proven for the open rows/states above.

Residual risk: this is a working implementation, not release-ready closure. Historical reference calibration, transit realism and complete adverse-state/native-host visual acceptance remain open. Existing balance and repository gates remain red. No commit, publication, or deployment was performed.

## Owner follow-up: World, consistency and legislation

**Status: substantial further changes, acceptance still open.** The earlier
route inventory was not proof that all routes had been adequately redesigned.
The owner's World and Congress screenshots correctly rejected that conclusion.
The following supersedes the earlier assessment of those openings.

Reproductions: at 1440px the Nation panel measured about 490px, Economy 879px
and Budget 1216px. Nation's Population option fell onto a second row. World
prioritized a quiet wire and an unread relationship summary over active wars;
its government directory began with tiny flag coins. Congress offered a narrow
administration agenda in one multi-column matrix. These were structural
presentation and gameplay problems, not missing decorative icons.

Shared fixes: a standard 420–640px panel, explicit expansion to 960px, full-height
phone openings, single-row segmented choices that become native selects when
labels do not fit, and a shared numbered file navigator. Comparison layouts
now stack full-width choices and alternate readings below 48rem; long option
names no longer compress the consequence beside them. Oversight's inquiry
stages are one vertical sequence. The Nation electoral dial uses the count in
the dial and total/threshold in the caption. The accessible map list falls back
to the lens's own level if a covered camera has not settled, instead of falsely
reporting no data.

World has separate Situation/Governments views, named searchable/paged
country rows, region and lens filters, preserved directory state on return,
active conflicts first, US involvement, pending commitments, and explicit
assessment coverage. A related correctness fix counts only the opposing
coalition as enemies when the US participates in a war, not its allies.
Selecting a region from Situation clears an old hidden directory search.

The Congress agenda now includes eighteen additional hypothetical packages.
Existing contextual predicates, one administration slot, referral/markup/floor,
veto/signature/override, fiscal offsets, state reactions and cohorts are reused.
No new dependency or save migration was added. The engine remains authoritative
for eligibility and authorization. Internal availability thresholds are never
shown. The player sees purpose, competing interests, annual spending/revenue,
program span, assessed effects and current vote counts before transmission.

### Rendered opening inspection, follow-up

Inspected the 16 `consistent-<route>-390.png` and 16
`consistent-<route>-1440.png` captures using contact sheets made from their
actual pixels. This is opening-state inspection, not blanket nested-state
acceptance. Realistic `wildfire-colorado` campaign data supplied these captures.

| Surface | Observed at both sizes | Disposition |
|---|---|---|
| Digest | Restrained official header, icon-led empty state | Opening accepted; populated recap remains covered by existing journeys |
| Nation | Single-row desktop selector/native phone select, portfolio doors, approval/electoral dials | Overlong electoral value found and shortened; final render recheck required |
| Budget | Same panel measure; readable authority and editable account sliders | Opening accepted; sliders are actual inputs |
| Economy | Shared file navigator, cycle indicator, real readings and charts | Opening accepted; comparison width uses shared fix |
| Emergency | Declared count, live Colorado wildfire, severity and relevant actions | Opening accepted |
| Policy | Icon-led domains, authority context | Default desktop matrix still clipped in inspected capture; shared 48rem reflow correction applied |
| Record | Dated timeline, actor/target cues, consequence tags | Opening accepted; empty filter now distinguished from an empty whole record |
| Settings | Shared identity, labeled choices and actual toggles | Opening accepted; rich choice cards remain distinct from segmented filters |
| Washington | Institutional doors and icon/portrait-led staff cards | Opening accepted |
| Congress | Shared width and chamber charts; agenda moved before institutional background | Agenda separately inspected live at 390/1440; subject filtering and focused review observed |
| Courts | Bench composition and named justices, consistent panel | Opening accepted |
| Department of State | Official file, incumbent, numbered performance rings | Opening accepted |
| Oversight | Notices first, inquiry sequence and directive composer | Broken two-plus-one stage connector found; corrected to vertical sequence |
| World | Conflicts precede background; honest assessed/unknown counts | New Situation opening accepted; directory search/back/no-results observed live |
| Canada | Named file, flag, leader, differentiated relationship bands | Old section pills replaced with shared navigator; desktop inspected after replacement |
| Security | Priority counts, daily intelligence and war-powers work before background | Opening accepted; existing urgent fixtures exercise the populated path |

Live CUA inspection used a sealed local Morgan Vale campaign on port 4186.
`agenda-live-390.png` and `agenda-live-1440.png` show the healthcare agenda.
The focused review exposed $82.50B in annual spending for that campaign's GDP,
four-year funding, legislative standing cost, and the two chamber counts. The
first narrow review was rejected during this pass because alternate labels
squeezed the substantive text; the subsequent full-width layout was inspected
live. Native macOS selection was exercised with arrow keys and Return. Headless
native-menu keystrokes did not commit reliably, so automated checks use the
native change event plus radio keyboard navigation; no custom keyboard handler
was added to override the operating system.

### Adversarial review of the follow-up (shared-context self-review)

VERDICT: Accepted with controls

Steelman: use a consistent work surface and information hierarchy across the
presidential portfolio, while giving Congress a contextual programme whose
costs persist through the existing simulation. Reusing one legislative and
fiscal path makes the preview, enactment and later consequences checkable.

1. **Strongest failure mode — nominal policy depth [serious].** A player could
   read a health or civil-rights title as proof of individual health outcomes or
   discrimination-case simulation. The engine has no such state. Control:
   document the aggregate boundary and fictional fiscal assumptions in SCHEMA,
   ARCHITECTURE and BL-106; claim political/economic consequences only. Broader
   institutional/outcome modeling remains open.
2. **Best alternative — a new domain simulation [serious].** Separate health,
   housing and rights outcome systems would support stronger causal claims,
   but would require new data, validated parameters and saved contracts. The
   existing fiscal/state/cohort system is accepted for this increment only;
   it does not establish empirical realism.
3. **Load-bearing claims [serious].** Eighteen catalogue entries and their
   fiscal rows were inspected; lifecycle/save/expiry assertions are executable
   tests. Numeric costs are authored assumptions, not CBO scores. A full green
   simulation balance claim remains unsupported and is not made.
4. **Assumption inversion [serious].** Labels can grow and panels can narrow.
   The original selector wrapped; the first review still squeezed text.
   Controls: measured select fallback, 200% text checks, stable panel checks,
   full-width comparison reflow and six-size bill journeys. Unknown diplomatic
   relationships and stale hidden search are handled explicitly.
5. **Who pays [serious].** Players bear the cost of misleading previews and
   accidental authorization; maintainers bear a second simulation path.
   Controls: baseline selected initially, no benefits on transmission,
   engine revalidation on commit, same registry for previews, existing receipts,
   and no new saved shape/dependency.
6. **Hostile expert [serious].** Rights legislation must not bypass the Senate
   through reconciliation; a natural-disaster package must not unlock on an
   unrest declaration; grid construction must not instantly remove energy
   dependence. Controls: ordinary rights track, disaster-cause tests, removal
   of the premature import-dependence effect, and continuing fiscal/macro
   consequences. Health coverage and legal enforcement are still aggregate
   approximations; expert realism acceptance is not claimed.

Verification record
- Steelman stated: answered — above, “one legislative and fiscal path”.
- All six run: answered — findings from all six, controls named.
- Findings concrete: answered — 6 serious findings; none left concealed as a passing realism claim.
- VERDICT: accepted with controls.
- Self-review: answered — shared-context, disclosed.
- No improvement drift: answered — failure stories and minimum controls only.

## Commit checkpoint: validation stopped at owner request

The owner explicitly requested stopping tests and checks and committing the
current work. The running phone/desktop browser suite was interrupted; its
partial results are not a passing suite. The balance run did not establish a
passing result. No final six-size rerun or final render recheck was performed.
The earlier completed workspace build, typecheck, lint and unit-test run is
recorded above; the subsequent comparison and pipeline CSS changes are not
covered by that completed run. Existing proof-gate findings and the open
profile, transit, policy-calibration and adverse-state coverage work remain
open. This checkpoint is a local commit, not a release-readiness claim.
