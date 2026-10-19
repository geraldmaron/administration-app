# Findings register

> **Current takeover rule — 2026-10-12:** This is historical evidence, not current visual acceptance. The owner requires application-wide visual-first layers, consistent help, target-only expansion, selectable themes and presidential review/processing. The current contract is `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Application-wide visual layers and presidential interaction,” and its handoff/BL-136/137. Light-only styling, previous polish claims, mandatory tool/agent assignments and bulk-first validation instructions here do not override that contract. Build with short local checks and batch expensive final validation; keep all work local with no additional cost. Historical counts/screenshots must be rechecked before use as current evidence.


Evidence kinds: **R** current rendered UI (`before/`, captured 2026-10-11 at 1440×900 and 390×844, above the fold of the inner scroll surface only); **S** current source only; **H** historical lead re-checked. 34 of 39 routes were captured; `/washington/courts/case/$id`, `/world/nation/$id/act`, `/world/org/$id`, `/world/treaty/$id` and `/dev` are source-only. Each screenshot shows the work surface's first screen, not the full scroll, because the app scrolls inside the surface rather than the document; lower sections are read from source.

Severity per brief §3. Status: open / fixed (with commit) / verified (with evidence). As of 2026-10-11 nothing is committed: "fixed, uncommitted" names where the fix was seen (live in the dev server, or source and tests only).

## Shell and navigation

| ID | Sev | Where | Evidence | Failure | Correction | Acceptance | Status |
|---|---|---|---|---|---|---|---|
| F01 | P1 | `shell/Frame.tsx`, `ui-web/AppFrame.tsx` | R `washington-index-1440x900.png`, `nation-budget-1440x900.png` | Every non-geographic screen gives about 60% of the desktop to a map that answers no question (an empty navy DC frame on Washington) while the work is held to a 640px panel | D1: workspace screens draw no map and take the canvas; spatial screens keep a full map with an inspector | No map node on workspace routes; work area ≥ 640px at 1024 | fixed, uncommitted (live); re-verify after gates |
| F02 | P1 | `ui-web/styles/surface.css:96-107` | S, R | Panel and workspace share `clamp(420px, 48vw, 640px)`; wide comparisons and tables are squeezed or hidden behind "Expand panel" | D6 layout contract | Budget table and comparisons fit without horizontal scroll at 1280 | fixed, uncommitted (live); re-verify after gates |
| F03 | P1 | `shell/modes.ts:14` | S | Five flat modes; Press, Digest, Emergency and Security have no navigation entry | D5 grouped navigation, phone More drawer | Every route family reachable from navigation in ≤ 2 activations | fixed, uncommitted (live); re-verify after gates |
| F04 | P2 | `tokens.css:143`, `shell.css` | S, R | 76px icon rail with no labels at any width; capture run shows the rail empty before its lazy chunk resolves | 224px labeled nav at ≥1440, 88px labeled compact below, drawer under 1024 | Labels visible at 1440 and 1280; no empty rail frame | fixed, uncommitted (live); re-verify after gates |
| F05 | P1 | `shell.css:114-148`, `ContinueControl.tsx:101-105` | S | On phones the date is hidden and the reason Continue is held is screen-reader-only | Masthead keeps date and a visible held reason at every width | 390 capture shows date and reason | fixed, uncommitted (live); re-verify after gates |
| F06 | P1 | `player-core/navigation/places.ts:32,68,73-74,143`, `attention.ts:308` | S | Links to `/record/press`, `/record/press/dispatch/$id`, `/ending`, `/legacy` that do not exist; a live attention item points at one | Build the routes (R4/R5) or stop emitting the links | Every `place.*` href resolves in the router (unit test) | fixed, uncommitted (source (places.test.ts)); re-verify after gates |
| F07 | P2 | `places.ts:137`, `world.security.index.tsx` | S | `?service=` deep link ignored | Security reads `service` and opens that service | Deep link opens the service | fixed, uncommitted (source); re-verify after gates |
| F08 | P2 | `brief.metric.$id.tsx:33-34` | S | Metric route accepts five desk readings; player-core emits other metric ids | Accept every metric id player-core emits, or narrow the emitter | Unit test over emitted ids | fixed, uncommitted (source (metric-ids.test.ts)); re-verify after gates |
| F09 | P2 | `Screen.tsx:31,77` | S | Every phone sheet opens at full height, contradicting the class comment | Phone uses full-page work for workspace screens; Map/List/Details on spatial | 390 captures | fixed, uncommitted (live); re-verify after gates |
| F10 | P2 | `shell/Search.tsx`, `search-index.ts` | S | Search finds 20 places and glossary terms only, caps at 30 with no count | Index people, governments, states, bills, offices; show count | Search "Canada" and a cabinet name both resolve | open |
| F32 | P1 | branch `w8a-record` (`dfb54f58d`) | S: `git merge-base --is-ancestor dfb54f58d HEAD` false | The press room, dispatch, `/ending`, `/legacy` and `record.spec.ts` were built on `w8a-record` but never merged, though the handoff records them as merged; player-core links to them (F06) | Merge `w8a-record` `--no-ff` after the redesign work is committed, then restyle under the contract | Routes resolve; `record.spec.ts` passes | fixed, uncommitted (live); re-verify after gates |
| F11 | P1 | `UsInsets.tsx` | R `nation-economy-1440x900.png` | Alaska and Hawaii insets render as black boxes on the GL map | Draw insets on the GL runtime or drop them from workspace screens (moot where D1 removes the map) | Insets show land on the US home | fixed, uncommitted (live once); re-verify after gates |

## Decisions and authorization

| ID | Sev | Where | Evidence | Failure | Correction | Acceptance | Status |
|---|---|---|---|---|---|---|---|
| F12 | P1 | nine commit copies (`leads.md` §3) | S | No shared authorize hook; behavior drifts; `GodModeRow` and `MatterRow` lack in-flight guards | D7 shared hook | Double activation yields one act (unit test) | fixed, uncommitted (source (use-authorize tests)); re-verify after gates |
| F13 | P1 | `shell/advance.ts:25` | S | Stale refusal always blames time ("Look at the Brief") even when another act changed the terms | Name the changed terms and refresh the assessment | Stale test covers both causes | fixed, uncommitted (source); re-verify after gates |
| F14 | P1 | `ScandalScreen`, `MatterRow`, `decision/acts.ts:45`, `washington/executive/acts.ts:46` | S | Save failure unreported or receipt dropped; silent return when store not ready | Shared hook owns applied/unsaved/refused | Each path renders a distinct message | fixed, uncommitted (source); re-verify after gates |
| F15 | P2 | act workspaces | S | Drafts are component state: lost on navigation and reload | Drafts keyed by campaign id + subject + act in session storage; cleared after commit | Reload keeps a budget draft; other campaign does not see it | open |
| F16 | P1 | `act/assessment.ts:103` | H02 | Ripples capped at 4 with no path to the rest | Shared collection contract (D9) | All ripples reachable | fixed, uncommitted (source); re-verify after gates |
| F17 | P2 | `OrderScreen.tsx:27-133` | H06, S | The order has no document body: no issuer, numbered sections, effective dates | Document viewer component; paper surface | Order shows issuer, type, sections, status | fixed, uncommitted (live); re-verify after gates |
| F18 | P2 | `order-desk.ts:133`, `congress-acts.ts:87`, `treaty-screen.ts:267`, `stance-comparison.ts:103`, `OrderScreen.tsx:125`, glossary "dice roll", six "a later build adds this" | H11, S | Implementation and improvised language in play | Institutional labels (brief §10.3) | grep gate finds none | fixed, uncommitted (source); re-verify after gates |
| F19 | P2 | force acts, `CountryForces.tsx:31-47` | H05, S | Force counts print bare integers mixing hulls, airframes and formations; no unit glyphs | Asset row: glyph + name + count + unit + committed/free | Same identity in picker, review, receipt | fixed, uncommitted (source); re-verify after gates |

## Data presentation

| ID | Sev | Where | Evidence | Failure | Correction | Acceptance | Status |
|---|---|---|---|---|---|---|---|
| F20 | P1 | `FloorBusiness.tsx:42`, shortlists, `world/trade-partners.ts:106,134`, circle/counsel, press outings, metros (`data-inventory.md`) | S | About 35 display truncations without totals or a full path (settled bills 3 of 69; trade partners 6 of 78) | D9 collection contract | No bare display `slice(0,n)` without count and full path (grep test) | fixed, uncommitted (source, partial); re-verify after gates |
| F21 | P2 | Nation home | S | 51 states have no sortable list | States table on the US home (sortable, filterable) | Table renders 51 rows | fixed, uncommitted (live); re-verify after gates |
| F22 | P2 | `CompareAuthorize.tsx:137`, `preview.ts:128`, `Request.tsx:28-29`, `Nominations.tsx:58-59` | S | Bare dash covers held, not computed and missing | Named empty states | No bare dash in data cells | fixed, uncommitted (source); re-verify after gates |
| F23 | P2 | Economy, Congress, Security, Country, State | H09, S, R | Long stacks with an "In this file" jump list; no tabs | D8 tablist with `?view=` | Each screen's first view fits its primary task | fixed, uncommitted (source); re-verify after gates |
| F24 | P2 | Record | S | Total in aria-label only | Visible count and filters | Count visible | fixed, uncommitted (live); re-verify after gates |

## Visual system

| ID | Sev | Where | Evidence | Failure | Correction | Acceptance | Status |
|---|---|---|---|---|---|---|---|
| F25 | P2 | all CSS | S (`design-system.md` §1) | 223 of 387 font sizes under 14px; tags 12px uppercase tracked; unitless line heights | Role scale (brief §7.1) in rem | No primary content under 14px | fixed, uncommitted (source); re-verify after gates |
| F26 | P2 | `main.tsx:9-14` | S | Geist/Archivo; Source Sans 3 absent; serif at 400 only | D3 | Fonts load from bundle, no Geist | fixed, uncommitted (live); re-verify after gates |
| F27 | P2 | `tokens.css` | S, R | Dark-only; no status pairs; gold doubles as warning; 2px focus | D2 palette, status tokens, 3px focus | `color.test.ts` covers every pair | fixed, uncommitted (live); re-verify after gates |
| F28 | P2 | `icon-data.ts`, glyph users | S | No glyphs for commodities (0 of 11), force assets (0 of 46), tornado/winter storm/heat wave; "disaster" shows earthquake | D4 domain extensions | Gallery shows every mapping | fixed, uncommitted (source (/dev/icons)); re-verify after gates |
| F29 | P3 | `scripts/verify-icon-registry.mjs` | S | Gate red on a stale baseline | Refresh baseline after icon work | Gate green | fixed, uncommitted (source (gate passed)); re-verify after gates |
| F30 | P3 | 71 icon sizes off grid | S | Optical inconsistency | 16/20/24/32 only | grep | open |
| F31 | P2 | buttons | S | Five button roles (primary, commit, danger, secondary, ghost) | Four roles; commit folds into primary | One primary per decision region | fixed, uncommitted (source, partial); re-verify after gates |

## Not found (closed against current evidence)

- H01 inaction and unknown visible before authorization: fixed (`Situation.tsx:219-230`).
- H08 one docked verb per decision: fixed (`Decision.tsx:92-104`).
- H10 budget totals beside editing: fixed per `leads.md`.
- H13 no automatic skip; Continue is held by waiting decisions. Reload mid-advance and last-call lapse remain unverified (tracked under R5 time audit).
- H15 the weather aliases file no longer exists; the gap is now F28.
