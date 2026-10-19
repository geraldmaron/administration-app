# Institutional workspaces continuation — verified slice

Base: `12501c852`. Persistent branch: `codex/shadcn-complete-institutions`. Source checkpoint: `209db9976`.

This continuation finishes retained generic Office and Person dossiers using the current shared shadcn/Radix foundation. The earlier Courts/Oversight rebuild remains in the base and is regression checked here. Executive overview/roster/delivery is retained where it already supports the required task; no claim is made that changing its CSS would constitute a rebuild. Special Press Office and Record are owned by integration.

## Outcome and dependencies

A user can open an office, read actual operating measures, inspect leadership evidence, explore the organization, compare/authorize a personnel action, and follow the receipt; a person profile separates assessed qualities, actual service, public-network evidence and career without a continuous radar chart implying quantitative precision.

`Campaign` institution, personnel, Congress and ledger data → existing `officeFile` / `personFile` / `personRecord` → workspace. Existing qualitative `Steps` keep their four ordered categories; they do not become percentages. Existing department `Bar` measures retain their supplied 0–100 scale. Assessment evidence opens the existing shared `Sheet`, not a new modal implementation. Existing `InstitutionMark`, `Dossier` artwork registry, `PartyMark`, country/state flag registry and redacted `Portrait` supply identity. No invented seals, relationships, classification claims or legal sources were added.

Office Actions → existing `AgendaActs` / `ChairActs` / `ActCompare` → existing `useChairActs` confirmation → engine packet/application → existing receipt and Record route. Nomination and resignation journeys exercise those real boundaries using disposable campaign saves. No engine, world schema or save-schema changes.

The Person route now retains `view`, relationship scope, selected graph subject, expansion count, query, contact query and evidence filter in validated URL search. View changes make navigable history; graph changes replace the current URL so Back returns from another dossier to the selected graph. Office view and fill state preserve each other. Existing routes without search remain valid.

## Changes and source findings

- Replaced the long generic Office stack with Operating picture, Leadership, Organization, Actions and Record. An attention prompt selects the action workspace. Explicit no-assessment/no-subordinate-office states avoid empty diagrams.
- Replaced the long Person stack with Operating profile, Public network, and Career and counsel. Five complete assessment tiles expose colored ordinal bands and confidence; biographical facts move to Career so they do not bury the operating assessment on phones. Generic staff-watch guidance is distinct from pending service attention. Selecting anywhere on the tile opens full evidence, consequences and limitations. The old repeated basis matrix, heading jump links and ordinal-area radar are removed.
- Person identity reads seated Congress membership and canonical caucus mapping rather than assuming `person.party` exists. Governor identity uses the standing record. Foreign/state flags use existing verified asset registries.
- Redacted portraits replace direct procedural face calls on these dossiers and network nodes. Public network labels distinguish inferred biography from recorded dialogue; no private trust or vote is implied. Separate connection endpoints remain independently accessible targets.
- For-cause officer removal uses the existing predefined `REMOVAL_CAUSES`; choosing a cause explicitly remains an assertion, not evidence of misconduct or legal sufficiency.
- Shared token spacing and responsive columns distinguish identity, assessment, action and record surfaces. No second design system or component dependency added.

## Route and state ledger

| Surface | State and journey | Status |
|---|---|---|
| `/washington` | Populated grouped offices, attention filter | Browser regression passed at 390 and 1440 |
| `/washington/office/$id` | All five views; whole assessment → Sheet → Escape/focus; holder → Back | Both themes at 390 and 1440 passed, including final layout recheck |
| Office appointments | Acting chair → candidate comparison → confirmation → nomination receipt → Record | 390 and 1440 passed |
| Office resignation | Education offer → retain officer → confirmation → receipt | 390 and 1440 passed |
| `/washington/person/$id` | Five actual ordinal meters, dismissal baseline and career | 390 and 1440 regression passed; party correction passed both themes |
| Person Public network | Scope, direct/two-step graph; 8→12→15 stable nodes, no overlap/overflow | 390 and 1440 graph regression passed; URL return extension passed both themes |
| Unknown office/person IDs | Explicit error surfaces | Both errors passed at 390 and 1440, both themes |
| `/washington/courts` + case + justice | Bench → justice record → docket → case; nominate → withdraw | 390 and 1440 regression passed |
| `/washington/oversight` | Inquiry → directive → confirmation/receipt; IG removal notice | 390 and 1440 regression passed |
| `/washington?view=delivery` | Existing delivery workspaces retained | Not newly browser checked in this continuation |

## Verification record

Check: Project inspected and reuse checked
Command: Source and test reads; searches for `Tabs`, `Sheet`, `PersonReadings`, `RelationshipNavigator`, `InstitutionMark`, `PartyMark`, flag registry, `faceOf`, `Radar`, `REMOVAL_CAUSES` and route consumers
Result: pass
Observed: Extended existing shared controls and presentation selectors; removed duplicate assessment matrix/radar rather than introducing another variant. No new reusable dependency.

Check: Build before typecheck
Command: `pnpm --filter @admin/web... run build` then `pnpm --filter @admin/web typecheck`
Result: pass, including final source
Observed: Dependency/web build completed; first typecheck identified an omitted `Flag` import, corrected; subsequent typecheck exited zero. Final identity/layout build then typecheck exited zero. Build retains the pre-existing large-chunk warning.

Check: Lint
Command: `pnpm --filter @admin/web lint`
Result: pass, including final source
Observed: ESLint exited zero. Final identity/layout lint exited zero.

Check: Focused source regressions
Command: `pnpm --filter @admin/web exec vitest run src/washington/executive/cabinet-view.test.ts src/washington/executive/roster.test.ts src/washington/courts/CaseScreen.test.tsx src/washington/courts/CourtSystemView.test.tsx src/washington/courts/courts.test.tsx src/washington/appointments/desk.test.tsx src/washington/oversight/directive-options.test.ts --maxWorkers=1 --minWorkers=1`
Result: pass
Observed: 39 tests across 7 files passed. Static-render tests emit existing router-context warnings; no failed assertions.

Check: Fixture construction
Command: `node scripts/make-fixture-saves.mjs --only washington-chairs,member-outreach,courts-and-oversight,appointments-desk,court-overview-recorded`
Result: pass
Observed: Five real engine campaign save fixtures generated through existing harness; no runtime behavior stubbed.

Check: Browser regressions
Command: `E2E_ATTACH=1 E2E_PORT=5293 pnpm --filter @admin/web exec playwright test institutions-workspace.spec.ts relationship-graph.spec.ts washington.spec.ts washington-courts.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`
Result: fail, followed by successful corrected affected checks
Observed: Initial wave: 22 passed, 4 failed (one profile party-identity assertion per theme/width). Corrected affected workspace wave: 8 passed. Final capture inspection found confidence placement making a narrow prose column in assessment Sheet; scoped placement reset and a prose-width regression assertion added. Final layout/evidence rerun: 8 passed (1.1m), including full-width prose, Escape/focus, every office tab, party identity, graph scope/count after Back, career and unknown-ID surfaces.

Check: Final corrected browser outcome
Command: `E2E_ATTACH=1 E2E_PORT=5293 pnpm --filter @admin/web exec playwright test institutions-workspace.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`
Result: pass
Observed: 8 tests passed, including the prose-width regression assertion and final profile arrangement.

## Challenge and limits

Shared-context review, not independent review. Strongest failure: tabs could hide urgent actions or lose return context. Controls: persistent attention prompt, explicit view names, URL-backed views/graph, unchanged compare→review→receipt workflow, keyboard/Snapshot/Back assertions. Best alternative: restyle the old single long dossier. Rejected because repeated assessment prose and ordinal radar still distort the task and require scrolling past unrelated material.

Load-bearing claim: ordinal categories are preserved as categories. Checked in actual rendered meter assertions, not fabricated scores. Inverted assumption: richer visuals do not justify plotting every available trait as a continuous quantity. Cost: one additional workspace selection for career/network, offset by shorter primary screen; phone actions remain reachable. Hostile objection: canonical party/caucus mapping could misidentify independents. Control: seated member party wins; caucus mapping is only the existing leader fallback, not a label for arbitrary biographies.

Verdict: accepted with controls for this slice. Integration owns full build/type/lint/test/proof gates, all six viewport widths, 200% text/zoom and cross-family visual acceptance. This continuation does not certify untouched delivery flows, all officer removal outcomes or the whole application.


Outcome: A user can inspect an office or person, select assessment evidence, explore public relationships, return with the same view/graph context, and use the existing reviewed personnel workflow.
Surface: Isolated production preview on port 5293, Playwright Chromium, 390×844 and 1440×900, light/dark and reduced motion.
Data: Existing real-engine `washington-chairs`, `member-outreach`, `appointments-desk`, `courts-and-oversight` campaign fixtures imported through the user-facing save importer.
Observed: Final new workspace checks passed 8/8; earlier retained workflow checks passed for nomination, resignation, court nomination/withdrawal and oversight directive/notice. Five-step quality scales remained categorical; graph expansion preserved existing positions without overlaps. The source-party gap and narrow evidence prose column were found and corrected before handoff.
Verdict: proven within the listed slice; full integration and remaining viewports are not certified here.

## Inspected capture record

These eight final captures were opened and inspected. No clipping, overlap or broken contrast was observed in the shown region. Screenshots capture the application viewport; scrollable content remains reachable below it.

| Capture | Inspected result |
|---|---|
| [Office light, 1440](evidence/institutions/office-light-desktop-1440.png) | Five equal assessment tiles on a row, institutional watermark, pending-work cue, coherent identity/leadership link |
| [Office dark, 1440](evidence/institutions/office-dark-desktop-1440.png) | Navy surfaces and raised evidence tiles retain visible separation and text contrast |
| [Profile light, 1440](evidence/institutions/person-light-desktop-1440.png) | Assessments alongside actual legislative outreach; party label and elephant visible |
| [Profile dark, 1440](evidence/institutions/person-dark-desktop-1440.png) | Same information hierarchy and categorical visualization, no continuous radar |
| [Profile light, 390](evidence/institutions/person-light-mobile-390.png) | Compact identity beside redacted portrait; operating assessment begins on initial phone surface; no overflow |
| [Profile dark, 390](evidence/institutions/person-dark-mobile-390.png) | Matching structure and readable blue/green categories against navy |
| [Evidence light, 390](evidence/institutions/assessment-light-mobile-390.png) | Full-width prose and confidence on their own rows, clear close affordance |
| [Evidence dark, 390](evidence/institutions/assessment-dark-mobile-390.png) | Same readable prose measure, selected band and confidence remain distinct |

Final diff reviewed by this implementing context against the scoped outcome. Removed old assessment matrix, heading-jump basis links, and ordinal-area radar call site; The root integration sweep proved no player consumer remained, so the unused Radar primitive, exports, styles and component-only tests were removed rather than retained speculatively. No unrelated Press/Record source changes. No new runtime dependency or schema migration. Full repository gates, keyboard-only traversal of every retained action, 320/768/1280/1920 inspection, 200% text and screen-reader behavior remain integration controls; the existing browser checks cover native keyboard activation and Sheet focus restoration only where stated.

## Legacy dossier deep-link compatibility follow-up

Production caller inspection found `roleActionsHref()` and `institutionActionsHref()` still emit `#office-actions` for cabinet attention items. After the workspace rebuild, that fragment's content was only mounted in the Actions tab, while a no-query route selected Operating picture. The generic Office route now selects the owning view from known legacy fragments when no valid explicit `view` is supplied. Existing leadership, Record, organizational and operating section fragments are mapped as well. Person circle/career/counsel/ratings/faction/record fragments receive the same compatibility treatment; no active production Person fragment callers were found. Special Press routes are untouched.

A valid explicit query wins. Unknown fragments, including inherited JavaScript object property names, fall back to the default view. Choosing a new tab clears the fragment while retaining normal history; Back restores the original legacy link. Existing shared routing, selectors and action execution remain unchanged. No dependency/schema additions.

Check: Legacy route build, types and lint
Command: `pnpm --filter @admin/web run build` then `pnpm --filter @admin/web typecheck` then `pnpm --filter @admin/web lint`
Result: pass
Observed: All exited zero after the compatibility change; build retains the existing chunk-size warning.

Check: Direct legacy links and navigation
Command: `E2E_ATTACH=1 E2E_PORT=5293 pnpm --filter @admin/web exec playwright test institution-deep-links.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`
Result: pass
Observed: 4 tests passed in 48.5 seconds at phone and desktop widths; direct action/leadership/record/organization links, explicit query precedence, unknown-fragment fallback, reload and Back exercised.

Outcome: Existing cabinet attention links open actual office actions; reload and browser Back preserve that target, and explicit workspace links retain their chosen view.
Surface: Actual isolated preview and user-facing fixture import at 390×844 and 1440×900.
Data: Existing `washington-chairs` and `member-outreach` campaign saves.
Observed: The Actions heading rendered on direct #office-actions arrival and after reload/Back; person network and career fragments rendered their intended controls and sections. Explicit view queries took precedence over fragments.
Verdict: proven for listed links and widths. No visual styling changed; prior theme captures remain applicable. Full integration gates remain with root.
