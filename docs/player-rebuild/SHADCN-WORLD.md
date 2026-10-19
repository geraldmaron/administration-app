# World workspace migration — integration draft

Outcome: a President can read security posture, investigate evidence without unfolding the page, select an actual traded category and carry it into the tariff comparison and authorization workflow at phone and desktop widths.

## Scope and dependencies

Source-reviewed World overview, all six country dossier tabs, country action/terms/comparison/receipt, Security theaters/forces/intelligence/operations and command acts, conflict workspace/decisions/War Powers, international bodies and treaty instruments. Existing canonical reader models and execution gates remain intact. No engine, save schema, classification or capability changes.

The shared foundation supplies source-owned shadcn Card and Radix-backed Sheet; the parent owns its dependencies, legal source catalog, build-first verification and browser integration. This work extends the existing `Collection`, `SortPicker`, `Door`, `Sheet`, `useSort`, `nationFile`, `securityOverview`, trade category and action routing capabilities.

## Changes

- Compact linked World and Security indicators retain figures, semantic status and comparison bars without oversized headline tiles. Each indicator opens its specific view or focus target.
- Security readiness drivers, assessment sources/gaps/dissent, report exposure/sharing and closed findings open in focused evidence sheets. Long foreign-action reasoning uses the same sheet. No native details/summary remains in `apps/web/src/world`.
- Active Security, command, organization, treaty and war panels adopt the canonical Card boundary while preserving the meaningful rebuilt war/action workflow and its separate legal review.
- Country identity and operating context lead the dossier. Wide screens pair the geography with the identity; narrow screens stack both before the six contextual views.
- Bilateral goods use whole-card category selection, paired import/export bars on a shared scale, exact annual values and the existing tariff. The selected inspector stays ahead of the collection and carries the actual category into the tariff workspace. All categories remain available through Collection; existing URL sector selection remains authoritative.
- Foreign trade partner meters now show the actual share on a 0–100% scale, rather than normalizing the largest partner to a full bar. A goods deficit is shown as an accounting direction without asserting it is a welfare loss. Zero trade no longer draws a positive bar in dossier overviews.
- Contextual authority help at War Powers, findings, intelligence collection and selected tariff category uses the parent’s verified-source helper. Treaty language distinguishes the modeled signature route from actual legal bases; Article II consent is two thirds of Senators present and precedes ratification.
- Retired native-expand and retired bilateral-table selectors removed after checking consumers.

## Adversarial controls

Strongest failure: polished figures can imply certainty the model does not possess. Keep unknown readings unknown, retain confidence wording, keep service assets in their own units, do not display map-sizing personnel as troop strength, distinguish assessed intensity/support/exhaustion indices from measured casualties or outcome probabilities. Best alternative is targeted shared-component repair; retained the good action/war workflows and replaced the weak evidence interaction and goods selection instead of rebuilding their resolvers. Verdict: accepted with controls, pending the actual browser matrix.

## Verification

Check: focused existing trade scale/selection and Security URL/deadline behavior.
Command: PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/web exec vitest run src/world/nation/trade-rows.test.ts src/world/security/security-search.test.ts src/world/security/obligation-order.test.ts
Result: pass
Observed: 3 files, 11 tests passed.

Check: World source lint.
Command: PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/web exec eslint src/world
Result: pass
Observed: no findings.

Check: CSS architecture.
Command: PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH node scripts/verify-css-architecture.mjs
Result: pass
Observed: 85 sheets, 4840 rules; zero findings forgiven (before final dead-selector removal).

Check: complete integrated build, types, lint, tests and supported browser matrix.
Command: parent integration checkpoint
Result: not run
Observed: this isolated branch depends on foundation Card and AuthorityHelp that land at integration; no visual pass is claimed here.

Outcome: the intended workflow above.
Surface: World/Security/country/trade/war/body/treaty routes.
Data: source reader contracts inspected, existing targeted tests exercised; no live campaign mutated.
Observed: source migration completed; actual browser inspection delegated to integration.
Verdict: not proven until populated/empty/unknown states at both themes and six widths, keyboard/focus/Back/reload, exact tariff receipt and authority-help links are exercised.

## Coverage limits and acceptance

Source inspection is not visual acceptance. Every listed family remains visually unverified on this isolated branch. Parent verification must include long category/country labels, no goods, a lower-ranked selected category, no imported goods, no legal clock, overdue clock, report without findings, low/unrecorded confidence, closed findings, unknown command/service, ended war and unknown war. Navigation must preserve country view/sector and return focus after evidence dismissal. No source-only coverage claim closes these gates. No broader scenario, legal lifecycle, portrait pool or loading-performance gap is closed by this change.

## Decision input reconciliation

Command relief and command-plan amendment now use predefined recorded rationales. Covert findings use predefined external objectives and recorded reasons for delaying notice, with the existing counsel, notification and review gates intact. These purpose labels do not establish that a threat exists or broaden the engine's legal authority. Optional collection notes remain personal annotations explicitly described as recorded, not interpreted instructions.

An actual engine gap was found while removing free-text targets: `taskCollection` validates only a nonempty domestic-person label and agency boundaries; the Coast Guard path accepts such a label without proving existence, residency or maritime jurisdiction. No eligible person selector exists. The person categories remain visible for explanation, but cannot issue a new person tasking without a verified target; all historical taskings remain readable. The foreign-person path was already explicitly rejected by the engine. American-politics attempts use a predefined subject and preserve the existing counsel-refusal/oversight path. This is a guarded interface, not implementation of person-level jurisdiction. The parent owns the eligibility backlog and must not describe that engine gap as closed. Superseded in part by the case-bound subject contract (SCHEMA.md, "Person-level collection is bound to a case"): player-core now exposes only engine-derived leads. The control stays unavailable in this player until it is rebuilt in `apps/player`.

The existing world-security journey was adapted to choose predefined relief/finding options. A new journey checks the Coast Guard person-target block, foreign-person unavailability and preserved political-request refusal. Those browser cases have not run on this isolated branch.

## Force data at narrow widths

The counted-force table now reuses the shared `ui-table--stack` container pattern with explicit cell labels and a shared SortPicker, so each asset retains its units, fielded/abroad/free/not-ready readings and posture bar when the six-column layout no longer fits. Operation-type filters use the shared Button rather than another hand-styled native-button implementation; the retired default service-button furniture was removed after checking all consumers.

Check: counted holdings rendering and unit/comparison contract.
Command: PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/web exec vitest run src/world/forces/HoldingsTable.test.tsx
Result: pass
Observed: 1 file, 3 tests passed. The actual 320px/enlarged-font layout remains a parent browser checkpoint, not a static-render claim.

## Integrated evidence drilldowns — October 15 follow-up

Five browser specs still assumed native expanders or tried to focus the underlying trigger while a modal was open. They now use the named evidence dialog, assert the same sourced findings and recipient-specific receipts, dismiss with Escape and prove focus returns to the trigger. Trust help retains keyboard Enter opening and its betrayal/repair explanations. Screenshots use the test output directory rather than the temporary filesystem.

Check: focused integrated World evidence journeys at 390×844 and 1440×900.
Command: PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH node node_modules/playwright/cli.js test --config=.world-browser.config.mjs trust-help.spec.ts collection-focus.spec.ts collection-sharing.spec.ts intelligence-reports.spec.ts
Result: pass
Observed: 10 passed in 3.1 minutes against the primary integration server at 127.0.0.1:5189. The isolated plain config used the repository's Chromium browser, the same 120-second test and 15-second assertion limits, zero retries and one worker, with the two named viewports. The current primary shared helper was copied for this run without committing another helper implementation. Launch used the primary CLI to avoid two Playwright module instances resolving from a nested worktree.

The first run failed before these checks because the older local helper waited for `dialog.review[open]`; its captured page showed the actual Radix modal. The parent’s corrected `[role="dialog"].review[data-state="open"]` helper resolved it in a fresh process. No test or assertion timeout was raised.

Outcome: issued evidence opens without restructuring the page, retains source context and sharing receipts after reload, and closes back to the invoking control.
Surface: Security intelligence reports/collection/sharing and Canada diplomacy trust help.
Data: existing `security-desk` and `collection-intelligence` exported campaign fixtures, imported through the actual player into disposable browser contexts.
Observed: tasking records focus and annotation; dated reports retain confidence/source wording; Germany receives distinct selected observations in two disclosures, Canada receives a separate disclosure, and all receipts remain after reload. Escape dismissal restores focus for evidence and trust help. The report-sharing screenshots at both widths were opened and inspected; headings, recipient observations, body scrolling and return control remained readable without clipping or overlap.
Verdict: proven for these focused light-theme journeys at the two widths. Dark mode, the other four widths, other World surfaces and the longer generated-report journey are not covered by this result.

Check: generated-report critical journey on a 390×844 phone.
Command: PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH node node_modules/playwright/cli.js test --config=.world-browser.config.mjs collection-journey.spec.ts --project=mobile-390 --output=apps/web/tests/.results/world-collection-journey-final
Result: pass
Observed: 1 passed in 1.1 minutes at the unchanged 240-second journey limit. The player tasks NGA about Argentina, advances through actual held work, receives the sourced readiness observation, proves public search/country/person relationships did not acquire the private observation, shares it separately with Canada and Germany, reloads, and reads both dated disclosure receipts in the evidence inspector.

An initial long-journey run reached both retained receipts but tried to locate the background report by accessible role after opening the modal. Radix correctly hides the background from assistive navigation. The unchanged source-provenance assertion now runs immediately before opening the inspector; the disclosures remain asserted inside it. The corrected journey passes. The final Argentina inspector capture was opened and inspected: separate recipient/date lines and observation text remain readable, without overlap or clipped controls.

The scratch runner configuration and temporary copied helper were removed/restored after execution. Durable logs and captures remain in this isolated worktree’s ignored test outputs. The committed tests use the repository’s normal parent integration configuration and canonical helper; no second test helper was introduced.
