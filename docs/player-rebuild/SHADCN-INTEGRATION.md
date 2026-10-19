# Shadcn integration verification — draft

Current status: source and evidence are checkpointed locally; BL-162 storage acceptance is closed below. Full workspace/balance and application-wide acceptance remain incomplete. Earlier check blocks are chronological observations; the latest integrated checks and storage closeout supersede their pending notices.

October 15, 2026. The shared migration and all five isolated streams are reconciled locally. Application-wide visual acceptance remains open under BL-136. The current primary application is available on ports 5188 and 5189; port 5190 serves the latest built output for verification. It is frozen only between builds. No push, deployment, scenario writing or content publication in this wave.

## Scope and reuse

Read the engineering guide, current design/plan/backlog, relevant route compositions, dataset readers/executors, UI package and tests. Searched existing canonical controls, evidence helpers, icon/seal registries and navigation contracts before extending them. Shared APIs were migrated in place. Removed MUI/Emotion/provider outputs, duplicate World tags/evidence wrappers, duplicated Brief/Digest bodies/navigation, native navigation/search dialogs, unused Bench and procedural FaceBuilder, the unused FileNavigation component and their superseded styles. No second simulation/rendering stack was introduced.

Blast radius: shared controls and modal layers across player surfaces; route search/presentation models; Brief/calendar, Congress, Courts/Oversight, Nation/economy/state and World/security/trade; founding redaction, Record investigations, saves/settings/help. Existing state shapes remain intact. Domestic force availability now refuses unsupported generic paths; Guard support coordination spends 10 USD millions without a deployment/command change. SCHEMA/ARCHITECTURE carry those contracts. Person-level collection remains unavailable in the UI; its missing engine/data predicates are BL-161.

## Vendor and interaction grounding

Official shadcn source/docs were retrieved through Context7 on October 15. Opened source references cover Sheet title/header/description, Button asChild anchors and Accordion composition: `apps/v4/content/docs/components/base/sheet.mdx`, `skills/shadcn/rules/base-vs-radix.md`, `skills/shadcn/rules/composition.md`, and `apps/v4/content/docs/components/radix/accordion.mdx` in https://github.com/shadcn-ui/ui. The foundation's full record is `packages/ui-web/SHADCN.md`. Actions use buttons, destinations retain real links, card selection preserves nested controls and keyboard semantics. Additional evidence opens the canonical inspector; route/filter/selection remains behind it. Latest-opened layers own the scrim and focus. Native form controls are retained where they preserve platform behavior and task parity.

Legal helpers use the opened National Archives Constitution transcript and official GovInfo 2024 U.S. Code extracts, recorded in `authority-sources/manifest.json`. Later statutory amendments are explicitly unverified. A legal citation is not a claim that every statutory procedure is implemented. The inactive person-collection and domestic-force choices explain that boundary.

## Observed checks so far

Check: workspace build before types
Command: `pnpm run build`, then `pnpm run typecheck`
Result: pass at the stable source checkpoint
Observed: all workspace compilation/type tasks completed; Vite still warns about the large initial bundle. No loading-performance acceptance follows from compilation.

Check: workspace lint
Command: `pnpm run lint`
Result: pass at the 12501c852 integration checkpoint
Observed: `pnpm run build`, `pnpm run typecheck` and `pnpm run lint` passed in sequence before the checkpoint. The stable-tree rerun passed. An earlier run failed ENOENT after enumerating FileNavigation while it was being deleted; that failure was preserved. The header/theme, bounded popover and trade-sort fixes are included in that checkpoint.

Check: complete workspace tests
Command: `pnpm run test`
Result: fail; focused corrections/reruns in progress
Observed: the original aggregate failed timing-sensitive Studio/core tests and one obsolete content baseline; it is not a clean full-suite pass. The interrupted core runner was later shown to include legitimate long-running fixture setup, not a proven deadlock. The complete bounded core rerun (`pnpm --filter @admin/player-core exec vitest run --maxWorkers=2 --minWorkers=1`) passed193 files/1,468 tests in26.5 minutes before the latest policy/durability changes; affected reader/store tests accompany those changes. All nine original Studio failures subsequently passed affected reruns, including the final isolated preservation-invalid case at79.6 seconds under its unchanged90-second limit. No timeout, test, baseline or snapshot was loosened. Web passed76 files/462 tests before this continuation; a fresh final integration run is pending. Balance is still running and unclaimed.

Check: content baseline ratchet
Command: `TIME_FRAMING_BASELINE=shrink pnpm --filter @admin/content exec vitest run src/scenario-audit-time-baseline.test.ts`
Result: pass
Observed: four tests passed; only obsolete exceptions were removed, no content bodies or thresholds changed.

Check: integrated Brief/Congress/action/conflict/Nation/tariff journeys
Command: `E2E_ATTACH=1 E2E_PORT=5189 pnpm --filter @admin/web exec playwright test tests/brief-congress-rebuild.spec.ts tests/shadcn-nation.spec.ts tests/rebuild-workspaces.spec.ts tests/tariff-goods-journey.spec.ts --project=mobile-390 --project=desktop-1440 --workers=2`
Result: initial 17 passed / 5 failed; corrected affected rerun 8 passed
Observed: three failures were obsolete native-dialog selectors, and two reproduced a 43px desktop community trend overflow. The helper and wrapping were corrected. The affected rerun of Nation/tariff specs passed eight cases across both themes and two widths.

Check: state/cohort context, calendar/legal help and save dialogs
Command: `E2E_ATTACH=1 E2E_PORT=5189 pnpm --filter @admin/web exec playwright test tests/rebuild-interactions.spec.ts tests/nation-context.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`
Result: pass
Observed: eight cases passed. Exact community value, filters/sort/map selection, Back/reload/focus, masthead calendar, primary-source legal inspector, rename focus, discard cancellation and whole save-card activation worked. An initial rename focus failure was corrected with explicit field autofocus; the initial stretched-card test targeted obscured text and was corrected to a real card pointer target.

Check: shared architecture gates
Command: `node scripts/verify-unused-primitives.mjs`; `node scripts/verify-css-architecture.mjs`
Result: pass at latest observed source
Observed: 62 exported parts used; zero forgiven unused or CSS findings. The complete 89-script proof sweep has pending corrections/rechecks; no blanket proof-pass claim.

Check: dated step-series semantics
Command: `pnpm --filter @admin/ui-web exec vitest run src/Series.test.tsx`
Result: pass
Observed: five tests passed in the final focused rerun, preserving unknown gaps and non-interpolated dated decisions. The assertion tests relative temporal spacing rather than fixed drawing coordinates.

Check: final shared interaction integration
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/rebuild-interactions.spec.ts --project=mobile-320 --project=mobile-390 --project=desktop-1440 --workers=1 --output=/private/tmp/admin-shadcn-final2-interactions`
Result: pass
Observed: 12 cases passed in both themes, including actual calendar, authority help, save dialog/focus and failed receipt→recovery→retry. The first 320px run reproduced a help action below the viewport; the shared popover now uses Radix's documented available-height variable with scrolling. Failed header captures at 320px light and 1440px dark were opened and inspected: Search and recovery remained inside the screen. Failure injection uses the actual desktop storage boundary, not proof of browser durability (BL-162).

Check: domestic authority and monetary regression
Command: `pnpm --filter @admin/engine exec vitest run src/guard-federalization.test.ts src/domestic-coercion.test.ts src/authority-boundaries.test.ts src/war-party.test.ts src/emergency.test.ts --maxWorkers=2 --minWorkers=1`
Result: pass
Observed: five files/59 tests passed. Guard consent books ten USD millions and does not change security state; unsupported generic domestic-force pathways refuse.

## Route coverage and limits

`ROUTE-COVERAGE.json` inventories every registered file route; it distinguishes rebuilt and retained families and explicit remaining state coverage. The broad sweep covers 41 workspace/view addresses in each width/theme, checks headings/errors/overflow, and is not visual approval. The initial matrix passed ten combinations and failed two light-theme combinations at 768 and 1280 pixels with missing headings during development changes. The frozen-build rerun passed both affected combinations over all 41 addresses; no blank was reproduced. Hot reload is a suspicion, not a proven cause. This is ten initial passes plus two affected rerun passes, not one clean twelve-case aggregate. Dynamic case/office/person/bill/post/command/org/treaty/war, ending/recovery/founding states require their specific fixtures and journeys. Do not infer all conditional states from a route's default view.

Stream evidence: `SHADCN-BRIEF-CONGRESS.md`, `SHADCN-JUSTICE.md`, `SHADCN-NATION.md`, `SHADCN-WORLD.md` and `packages/ui-web/SHADCN.md`. Root inspected the phone calendar/Congress, desktop dark opinion, judicial bench and oversight command captures. The first opinion capture exposed narrow caucus labels; the final integrated layout gives labels/deltas one row and the diverging bar a full-width second row. The final state/cohort desktop dark capture was opened: labels, values and full-width bars were legible without overlap. Record assessment desktop dark, arc phone light and negative-inflation phone dark captures were opened: exact report context, whole-row chapter navigation and signed negative values were visible. The phone captures also exposed the header clipping now being corrected; body-overflow checks alone had missed it. Historical Material captures are preserved; current captures have a separate `shadcn-captures/` directory.

## Adversarial challenge

VERDICT: Needs validation

Shared-context review: the coordinator shares implementation context; this is not an independent audit. Steelman: source-owned shadcn primitives keep the existing simulation and public component APIs while consolidating evidence, actions and navigation. Rebuilt analytical workspaces expose real comparisons and subject-specific context without adding fictional data.

1. Strongest failure [serious]: a shared control swap can pass compilation while a nested authorization, intermediate-width layout or sparse subject page fails. Evidence includes the reproduced nested scrim and desktop overflow, and a phone header clipping Search that body-overflow checks missed. The frozen rerun did not reproduce the earlier blank-page sweep failures. Control: actual executor/focus/Back journeys and frozen-build six-width checks; no global completion claim from representative pages.
2. Best alternative: targeted repairs on the existing components would reduce migration risk and cost. That remains appropriate for the mostly accepted Executive surfaces. It does not retire competing vendor/modal implementations or satisfy the explicitly requested system migration; the canonical API and removal ledger make the chosen cost checkable.
3. Load-bearing claims: numeric visuals come from existing readers/executors; stored-case/report joins use exact IDs. Legal extracts are opened official 2024 sources, with recency limits stated. Rich UI does not establish complete engine jurisdiction, performance or legal fidelity. BL-161 and remaining route states stay open.
4. Inverted assumptions: if a report, history, target or legal predicate is absent, an attractive chart/choice must not manufacture it. Unknowns remain gaps; absent targets refuse; no event link is guessed from matching prose/date. Complete missing/sparse-state fixtures remain a control, not an assumed pass.
5. Cost bearers: players bear focus/navigation failures and misleading education; future maintainers bear duplicate controls, dependencies and orphan styles. Deletions and one canonical implementation reduce that cost, but unverified routes cannot be represented as accepted. Local named checkpoints/worktrees preserve recovery.
6. Hostile expert: a government-law expert would reject unrest/declaration as blanket domestic-force authority and a data analyst would reject smooth rates, false trade welfare coloring or clipped deflation. These concrete defects were corrected. The expert would still challenge unsupported legal pathways, incomplete portrait/brand recovery and large bundle loading cost; none is silently certified.

## Closing record

Project inspected and dependencies named: above. Reuse checked: existing shared controls/readers/executors extended. Validation: exact commands and incomplete checks above. Outcome: focused real-campaign journeys proven; complete application acceptance not proven. Surface inspection: bounded captures inspected, remaining routes/states explicit. Diff review: bounded source patches reviewed before their named local checkpoints; full application acceptance remains open. Residual risk: conditional-state coverage, full integration test/balance results, assistive-technology/contrast acceptance, final visual acceptance, and large-bundle loading performance. Header and storage followups are recorded below. BL-136 remains open; there is no release approval.

## Continued page completion — active

The owner requested continuing through all pages after checkpoint `12501c852`.
Five new persistent isolated worktrees start from that exact commit, with correct
frozen workspace installs rather than copied dependency identities. Their
ownership/base is in `WORKTREES.json`. The coordinator owns Record/dispatch/
ending/legacy and integration. These new changes are not covered by the earlier
checkpoint passes; scoped proofs precede a new stable integration gate. Existing
recovery branches remain intact; unused product code is removed in the slice
that replaces it, rather than pruning unreconciled source history.


## Continued integration checkpoints

The live5188/5189 checkout now includes Office/Person workspaces (`a1ca6d496`, `563813470`, `d6e10858e`), World/Security contextual actions (`e5e39be71`), Budget/Policy/Emergency (`d36eaf6e1`), decision/legislative/statutory-clock flows (`64b2b57e3`, `30460dec4`), durable browser save acknowledgments (`2556a4c65`), and entry/settings/ended-header controls (`6454aef28`, `bd304b529`). These are local checkpoints; no push or deployment. Economy's additional composition rebuild (`b06b15296`) and compact country workspaces (`2642c8b1a`) are now integrated after bounded browser proof. The country reader also distinguishes wartime allies from actual opponents (`3c1d5d36c`).

Shared browser-storage proof includes a successful IndexedDB request followed by transaction abort, unchanged prior manifest/payload, visible Retry save, retry/reload recovery, manifest-preflight failure and unavailable-vault recovery. This fixes the silent memory fallback; the persistent browser regression is retained at `8ed988486`. The full long founding questionnaire/new oath and all library mutations remain unverified. Complete stream evidence is in `SHADCN-COMPLETE-SYSTEM.md`, `SHADCN-COMPLETE-INSTITUTIONS.md`, `SHADCN-COMPLETE-DECISIONS.md` and `SHADCN-COMPLETE-NATION.md`.


## Press and Record composition checkpoints

`517de4387` gives exact stored causes, selected entry and consequences a visual path; persistent subjects and filed assessments use whole targets. The same assessment inspector opens from the Record list and its exact originating act, eliminating duplicated presentation. `afaf9d9d7` splits Press into Coverage, Desks and trends, Response and Abroad with query state and legacy-fragment compatibility. Three relevant value/bar signals precede current coverage. A final inspected390dark capture showed stacked selects burying stories, so a single shared Filters Sheet now exposes those choices while the list remains visible.

Check: integrated Press and Record journeys
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/press-workspaces.spec.ts tests/record-investigations.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --output=/private/tmp/admin-press-integrated-final-results`
Result: pass
Observed: eight cases passed in both themes, including report-to-origin-to-same-report, restored inspector focus, signed Legacy rates, Press desk-to-story-to-Back and explicit-query precedence over legacy sections.

Check: compact Press filters
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/press-workspaces.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --output=/private/tmp/admin-press-filters-fixed-results`
Result: pass
Observed: four cases passed, including actual Lean selection, URL update, close/focus return and clearing. An initial unsupported icon name failed rendered tests; it was corrected to the existing `utilitySettings` registry entry before the successful rerun. Root opened390dark Coverage,1440light Analysis and the stored causal-path capture; retained copies are in `evidence/record-press/`. Source review by the institutions stream found no concrete blocker; it shares implementation context and is not independent visual acceptance.

Check: current root build/types/lint and web tests
Command: `pnpm run build`; `pnpm run typecheck`; `pnpm run lint`; `pnpm --filter @admin/web test`
Result: build/types pass; initial lint failed, corrected rerun passed; web tests pass at the pre-Economy followup source
Observed: final3 logs record all build/type tasks and79webfiles/471tests. Lint caught one stale MouseEvent import removed with the retired jump helper. The subsequent Filters change passed web build, web typecheck and seven Press tests. Latest incoming Economy/country changes still require the stable integrated gate.


## Stable coverage and gate sweep

Check: complete registered workspace matrix
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/rebuild-route-coverage.spec.ts --workers=2 --output=/private/tmp/admin-shadcn-stable-route-results`
Result: pass
Observed: all 12 cases passed in 9.4 minutes, each visiting 41 workspace addresses, across 320/390/768/1280/1440/1920 widths and both themes. This verifies mounted headings, absence of captured runtime errors and horizontal overflow. It is not visual acceptance of every element or conditional state. Final compact Economy/inline-benchmark and receipt-return followups require their focused proof.

Check: repository proof gates
Command: `for gate in scripts/verify-*.mjs; do node "$gate"; done` with individual logs and retained status
Result: initial 86 pass/3 fail; all three affected corrective reruns passed
Observed: all 89 ran. Dist freshness and its failure-injection proof passed with cleanup intact. Player prose found one obsolete allowance after PersonReadings replacement; the existing shrink command removed it. Unused-primitives and its proof found the now-unconsumed Radar component. Source-wide search confirmed no player usage; source, exports, compiled output, dedicated component tests and131obsolete CSS lines were removed. No gate allowance was added.

Check: retained real IndexedDB regressions on integration
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/browser-storage-durability.spec.ts --project=desktop-1440 --workers=1 --output=/private/tmp/admin-shadcn-storage-integrated-results`
Result: pass
Observed: both cases passed in 17.2 seconds: real request-success then transaction-abort, manifest preflight failure/retry/reload and preserved data; phone unavailable-vault/founding gate and recovery of the existing campaign. This extends the stream proof retained at `8ed988486`.


Check: retirement cleanup and gate corrections
Command: `pnpm --filter @admin/ui-web run build`; `pnpm --filter @admin/ui-web test`; `node scripts/verify-player-prose.mjs`; `node scripts/verify-unused-primitives.mjs`; `node scripts/verify-unused-primitives-proof.mjs`; `node scripts/verify-css-architecture.mjs`
Result: pass
Observed: 88 UI tests passed after removing the two tests belonging solely to the deleted Radar component. All 62 exported components are drawn by a player surface, with zero forgiven unused parts. The prose gate retains seven pre-existing findings across six allowed file/rule pairs; only stale allowance was shrunk. CSS architecture passes with zero forgiven findings. This is the initial 89-script sweep plus three corrective reruns, not a second clean 89-script aggregate.

Check: person-network performance budget followup
Command: `pnpm --filter @admin/engine exec vitest run src/person-network-graph.test.ts --maxWorkers=1 --minWorkers=1 --reporter=verbose` in the institutions worktree, with graph/rules/test hashes matched to primary
Result: pass scoped; full aggregate remains failed/in progress
Observed: the full workspace run reported 5058.85 ms against the existing 3000 ms graph budget;352 engine files finished with 4,611 passing tests and one failure. The unchanged scoped test passed 4/4, with its whole budget callback 1880 ms including founding. Three direct builds measured 1395.22/1323.34/1470.99 ms, preserving 8,054 people, 22,221 edges and the exact pinned digest. This supports resource-sensitive timing without proving the precise original cause. No algorithm, test, timeout, budget or config was changed. Rerun under settled load remains a control; the full run is not reported green.

`60dc7ac63` closes the known foreign receipt return-context residual: validated same-country view/sector live in the presentation URL independently from action terms, survive reconfiguration/reload and restore the original selected category after authorization. Eight stream browser cases pass across both themes and 390/1440, including an actually authorized different tariff category. A continuous journey restores prior focus/scroll; a reloaded draft restores the correct selection and standard heading focus. No arbitrary return URL, engine/save contract or history guessing was added.


## Final integrated source and observed user outcome

Production source is checkpointed through `c87229509` (last change is a shorter explanatory sentence; comparison behavior is unchanged). All five bounded streams are integrated into the persistent primary checkout. No app source remains only in a temporary folder. The live 5188 server returned HTTP200 for the Growth route. A fresh background in-app tab loaded the existing opening campaign with Growth selected, current/oath/model-reference values together, a published reference chart and the correct complete-quarter availability explanation. No gameplay action or save import was performed in the owner's browser. One older background verification tab had crashed during live reload; a fresh same-route load worked. Its exact cause remains unproven. The frozen-build checks below did not reproduce it.

`bc184940a` removes the disconnected Compare action/Sheet and independent Unemployment default. Selected rate, evidence basis and US window are shared validated URL state. Existing comparison readers determine period availability and approximate conversions. Current-weekly, oath and model-reference readings remain together; the reference is explicitly not a policy target. Published and played series share one SVG and percentage/elapsed-month axes. Opening and incomplete periods never acquire invented points. Narrowest-width signals use complete-label rows.

Check: final workspace compilation and types/lint
Command: `pnpm run build`, then `pnpm run typecheck`, then `pnpm run lint`
Result: pass before the final shorter explanatory sentence
Observed: all workspace tasks completed. Vite's large-chunk warning remains. No dependency or engine/save contract was added by the final comparison/return changes.

Check: final complete web unit suite
Command: `pnpm --filter @admin/web test`
Result: pass
Observed:79 files/476 tests passed at the final functional source. The subsequent wording-only change passed the player-prose gate; no claim is made of a new whole-suite rerun after that sentence.

Check: final integrated Economy comparison journeys
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/economy-observatory.spec.ts --workers=2 --output=/private/tmp/admin-shadcn-last-economy-results`
Result: pass
Observed:36/36 passed across all six configured widths and both themes: populated comparison, actual source/method/observation inspectors, opening/explicit empty term, and completed-quarter Growth on common axes. Rate/basis/window survive reload. Root opened the retained1440 dark and320 dark populated Growth comparisons and inspected a fresh live opening Growth surface.

Check: final integrated route-family executor/context journeys
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/world-return-context.spec.ts tests/institutions-workspace.spec.ts tests/shadcn-decision-workspaces.spec.ts tests/shadcn-complete-nation.spec.ts --project=mobile-390 --project=desktop-1440 --workers=2 --output=/private/tmp/admin-shadcn-last-journey-results`
Result:33 passed/1 intentional skip
Observed: both themes exercised Office/Person evidence and views, Budget proposal/order signatures, Emergency context, decision/legislative/outreach/clock/scandal routes and real changed-goods tariff receipts returning to the originating category. Desktop actual forecast observations passed; the separate forecast-only mobile case is intentionally skipped, not represented as a mobile forecast pass.

Check: final affected source gates
Command: `node scripts/report-metric-registry.mjs`; `node scripts/verify-metric-registry.mjs`; `node scripts/verify-player-prose.mjs`; `node scripts/verify-css-architecture.mjs`; `node scripts/verify-unused-primitives.mjs`; `node scripts/verify-dist-freshness.mjs`
Result: pass
Observed: registry report is current; player-prose retains only its existing seven findings/six allowed pairs; CSS and unused components have zero forgiven findings; all nine compiled packages match committed source. Final explanatory wording separately passed `node scripts/verify-player-prose.mjs`.

## Current gate boundary

The latest `pnpm run test` has two observed failures so far: the graph budget and the Studio session-reader90-second timeout (`src/jobs/repair-session-context.test.ts`, “recovers a real session reader that the mounted-only runner rejects”). Engine had4,611 passing tests/one failure; content passed1,046 tests; Studio had359 passing/one failure. The run subsequently completed: player-core passed194 files/1,476 tests; desktop passed1; Studio app passed92; web passed79 files/476 tests. The package summary was two failures/ten passes, exit1. The unchanged graph scoped rerun passed; the precise original timing cause is not proven. Concurrent heavy validation violated BL-137's scheduling control; no further heavy run should be launched concurrently. No thresholds, snapshots, validators or tests were loosened. The balance run also remains active, not an aggregate pass, and may have loaded engine source before the earlier bounded authority correction. Preserve its log without treating it as the final-source certificate.

Verdict remains **needs validation for full application/release acceptance**. The bounded functional UI outcomes above are proven. Remaining controls are the full aggregate/settled-load checks, uncovered conditional states and assistive-technology/contrast acceptance, stable Emergency map camera, deliberate branding acceptance and bundle loading cost. Real-country peer/year controls retain their documented local state. BL-136/137/161 remain open; BL-162 has the bounded browser closure below; no deployment, push or worktree/branch deletion.


Resource cleanup: after verification the coordinator inspected each isolated server's PID, command and worktree CWD and stopped only5291/5292/5294/5295.5293 was already stopped. No source, branch or worktree was removed. Primary5188(Economy) and5189(Brief) each returnedHTTP200 after cleanup. Remaining full-suite/balance jobs were preserved rather than interrupted or claimed complete.


## Storage acceptance closeout

Check: browser storage failure variants and recovery
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/browser-storage-durability.spec.ts --project=desktop-1440 --workers=1 --output=/private/tmp/admin-shadcn-storage-complete-results`
Result: pass
Observed: four cases passed in 33.0 seconds against the existing built application. Transaction-abort and access-denial regressions still pass. The new 390px IndexedDB-absence case refuses import/founding and restores the identical campaign after re-enabling storage/reload. The new blocked case uses a second real database connection to block an intercepted version-2 request; Chromium emits the actual blocked event. Releasing that connection triggers the late upgrade, which the production handler aborts. Retry/reload preserves the same committed record hashes. An initial assertion expected specific error wording that the observed library did not display; it was replaced with observation of the real browser event and the actual unavailable-library controls. No product behavior or acceptance threshold was changed.

Check: retained browser-test lint and patch hygiene
Command: `pnpm exec eslint apps/web/tests/browser-storage-durability.spec.ts`; `git diff --check`
Result: pass
Observed: neither command reported findings. No production code changed, so this closeout does not require a rebuilt application. The unavailable-vault phone capture from this run was opened and inspected: the library explains the failure, retry/recovery controls remain visible, import/founding are disabled, and no empty-library claim appears.

Outcome: unavailable or blocked storage cannot silently become a successful empty vault; existing saves recover unchanged.
Surface: real Chromium browser, administrations/founding, save toolbar and reload.
Data: existing collection-intelligence campaign imported through the actual player import flow in a disposable browser context.
Observed: refusal, retry and reload retain manifest/payload hashes across all four cases.
Verdict: proven for these Chromium workflows; BL-162 closed. Cross-browser acceptance and unrelated full workspace/balance checks remain unclaimed.

The full workspace worker was inspected without interruption: its apparent idle workers wait while the existing `make-fixture-saves.mjs` child consumes CPU building the complete fixture set. The balance run also still consumes CPU. These are active computations, not evidence of a deadlock. No additional broad build/matrix/balance run was launched in this closeout; only the bounded single-worker storage regression ran against the existing build.


Check: completed full workspace test run
Command: `pnpm run test`
Result: fail
Observed: the retained aggregate completed with two failing packages and ten passing packages. Engine:4,611pass/one graph-budget failure; Studio CLI:359pass/one90-second reader timeout. Player-core:194files/1,476pass, including the full fixture-door suite; web:79files/476pass; desktop:1pass; Studio app:92pass. Earlier packages and the unchanged thresholds are recorded above. This was the existing overlapping run, not a new settled-load certification. Balance continues with its three active borrowing workers; the completed18-test macro-balance file passed. No aggregate balance result is available.


## Requested completion followups — verification queued

The owner requested committing and finishing the remaining rebuild. Locally integrated source now includes URL-controlled country/year comparisons (`481590bfe`), responsive Choice focus and reduced-motion busy controls (`aa56a1b66`), immediate workspace store loading (`99726f4cd`), canonical symmetric branding (`bf197aeaa`) and comparison flags (`4714800ba`). Actual camera and accessibility browser proofs are prepared (`196c8792a`, `b5bc67ac1`, `615c40706`). Root package serialization (`4ce60e45b`) follows the existing CI pattern; `VALIDATION-SCHEDULING.md` keeps the unresolved original causes explicit. No timeout or assertion changed. A candidate lazy term-chrome split was rejected before commit: other eager engine paths remain, so an additional control-loading waterfall had no demonstrated benefit.

Check: focused startup and comparison URL contracts
Command: `pnpm --filter @admin/web exec vitest run src/app/DeviceProviders.test.tsx src/nation/economy/market-search.test.ts --maxWorkers=1 --minWorkers=1`
Result: pass
Observed: two files/ten tests passed in3.20s. Scoped changed-file ESLint and patch hygiene also passed. Shared focus proof separately reproduced body focus before the correction, then passed all four DOM cases; source is retained with that proof.

Check: root brand generation and asset color contrast
Command: `node --check scripts/generate-brand.mjs`; `node scripts/generate-brand.mjs`; existing `contrastRatio` from `packages/design/dist/tokens/contrast.js` on the three rendered asset color pairs
Result: pass
Observed: generation left no asset diff. Navy/white ratio18.42, gold/navy8.24, and dark-gold/white6.66. Native16/24px and larger proof in both themes was opened and inspected. These are asset-color checks, not a whole-application contrast audit. Desktop packaging remains unverified.

Outcome: the live opening Economy retains its current/oath/reference context and shows the new identity without disturbing the campaign.
Surface: existing in-app browser tab on5188, read-only inspection.
Data: the owner's existing opening campaign; no fixture imported or gameplay action taken.
Observed: aligned three-signal cards, benchmark values together, honest incomplete-month explanation and new header mark. The other existing5189tab was already crashed; its original cause remains unproven and was not treated as an application pass.
Verdict: bounded rendered outcome proven; stable integration/browser/aggregate acceptance remains pending.

The original balance run is still active. A single dependent shell waits for it to exit before running `pnpm run build`, `pnpm run typecheck`, then `pnpm run lint`, with logs under `/private/tmp/admin-shadcn-closeout-{build,types,lint}.log`. No pass is claimed from queueing those commands.


## Final source corrections and settled verification — 2026-10-15

The local closeout adds bounded workspace pools (`099c5a6f0`), deterministic
Settings restore/layout (`fdddb9d6b`), desktop reduced-motion Sheet precedence
(`de127b76d`), inspected Economy context/chart captures (`ab37acbaa`), awaited
Emergency observations (`70f7e2b2e`), and enlarged-text test synchronization
(`eed5977b4`). No push or deployment.

Check: final integrated compilation and lint
Command: `pnpm run build`; `pnpm run typecheck`; `pnpm run lint` (sequential)
Result: pass
Observed: all three exited0. Logs: `/private/tmp/admin-shadcn-final-{build,types,lint}.log`. Source after this run changed only browser-test synchronization and documentation. No generated tracked output changed. Large initial-bundle warning remains; no loading-performance acceptance is claimed.

Check: affected integrated browser families
Command: `E2E_ATTACH=1 E2E_PORT=5190 pnpm --filter @admin/web exec playwright test tests/economy-observatory.spec.ts tests/rebuild-interactions.spec.ts tests/consistency.spec.ts --project=mobile-390 --project=desktop-1440 --workers=2 --output=/private/tmp/admin-shadcn-final-browser-results`
Result: fail
Observed:35passed/one enlarged-text test race. The earlier Settings224px mismatch and both Sheet animation-name failures passed after their source fixes. All Economy URL, reload, Back/Forward, benchmark and country/year workflows passed. The remaining test sampled radio/select visibility before ResizeObserver completed; its page had correctly transferred focus and selected value to the native selector.

Check: enlarged-text strict focus after actual adaptive reflow
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm exec playwright test --config apps/web/playwright.config.ts apps/web/tests/rebuild-interactions.spec.ts --project mobile-390 --project desktop-1440 --grep 'keyboard, enlarged text' --workers 1 --reporter line --output /private/tmp/admin-choice-textscale-fixed-results`
Result: pass
Observed: four cases passed in34.0s. No refocusing, sleeps, focus assertion relaxation or application change. Diagnostic log `/private/tmp/admin-choice-reflow-proof.log` records the646px row/764px enlarged labels, then native SELECT focus with state-population retained. Bounded eight-case Settings restore/busy proof independently passed50.6s before integration; same integrated restore/busy cases passed in the35/36 run.

Check: real Emergency camera/subject journey
Command: `E2E_DEV_RUNTIME=1 E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web exec playwright test tests/map.spec.ts --grep='Emergency camera' --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=/private/tmp/admin-shadcn-emergency-final-results`
Result: pass
Observed: four cases passed in50.0s. Exact transforms and Colorado selection survive list, dossier, Back, action drawer, close and reload. The first run exposed a new observer bug, independently reproduced against installed Playwright; no camera product fix was necessary. Details: `SHADCN-EMERGENCY-CAMERA.md`.

Outcome: comparisons retain context, shared surfaces wait for restored navigation, enlarged controls preserve focus, and Emergency preserves geographic orientation.
Surface: production preview5190 and development5188, disposable Chromium profiles.
Data: existing case-families, collection-intelligence and wildfire-colorado campaigns via actual import; no owner campaign altered.
Observed: retained Economy context/chart and Emergency reloaded images at390/1440 in both themes were opened and inspected; readings, sources, same-axis comparisons, map highlights and controls remain visible. Evidence lives in `evidence/closeout/`. Legal inspector200% text captures show bounded scroll, visible close/focus and themed context.
Verdict: these bounded journeys proven; complete workspace aggregate and broader application acceptance remain pending. Manual assistive technology, cross-browser, full contrast, bundle cost and BL-161 jurisdiction/data work are not closed by these results.

Scheduling: the three original balance borrowing workers62646/62647/62648 were
suspended with SIGSTOP at2026-10-15 23:26:19UTC to prevent concurrent heavy
validation. Their memory/computation is preserved. They must receive SIGCONT
after heavy validation; the suspension interval must remain in timing evidence.
The original process may have loaded pre-correction engine code and cannot
certify the final binary. No wall-time improvement is inferred.

Verification record: project contracts, relevant source and tests inspected;
existing shared components and test helpers reused; source/test diffs reviewed;
required build/types/lint passed; bounded rendered outcomes observed as above;
current full workspace run and remaining acceptance risks explicitly open.
Commit review: deliberate paths only, one concern per checkpoint, no credentials
or real user data, working branch retained, no attribution trailers, no push/PR.


## Stable single-branch handoff — owner requested wrap-up

All integrated source stays on `codex/reconcile-worktrees-2026-10-14` in the
primary checkout. Eleven redundant worktrees and eleven local feature branches
were removed. Main and staging remain; `git rev-list --count staging..main`
returned0. Existing safety refs remain outside the branch list. No missing
functional work was found in per-path review of non-patch-equivalent commits.
Two old dirty worktrees contained superseded navigation/test/legal-helper files;
their exact blobs were verified in safety snapshots before removal, not replayed.
No further recovery is planned. Exact inventory/dispositions:
`RECONCILIATION-2026-10-15.json`.

The managed archive action for the clean detached recovery checkout returned
queued without removal; after confirming its tip was already reconciled/pinned,
`git worktree remove` removed it. This is a verified filesystem/Git cleanup, not
a claim that the app's queued archive metadata completed.

Check: final bounded cleanup gates
Command: `node scripts/verify-css-architecture.mjs`; `node scripts/verify-unused-primitives.mjs`; `node scripts/verify-web-boundary.mjs`; `git diff --check`
Result: pass
Observed:92sheets/4,921rules and zero forgiven CSS findings; all62 exported UI parts used, zero forgiven unused parts; shipping graph clean of platform imports; no whitespace findings.

Check: full current-source workspace and preserved balance aggregates
Command: `pnpm run test`; `pnpm --filter @admin/engine run test:balance`
Result: not completed
Observed: coordinator interrupted the runs for the owner's stable-session handoff. The workspace log is `/private/tmp/admin-shadcn-final-workspace-tests.log`; balance log is `/private/tmp/admin-shadcn-balance.log`. No aggregate pass is claimed. Suspended balance workers were resumed at23:52:32UTC before stopping; all owned test runners/workers were checked absent afterward. No budget, assertion or timeout was relaxed. Earlier complete failing aggregates remain documented above.

Check: serving and repository state
Command: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:5188/`; `git worktree list`; `git for-each-ref --format='%(refname:short)' refs/heads`; `git worktree prune --dry-run`
Result: pass
Observed:HTTP200; only primary checkout; only feature/main/staging branches; no stale prune entries. Old worktree previews5192/5196 and redundant primary5189/5190 listeners stopped. Primary5188 kept running. No push or deployment.

Verdict: **reconciled local source and cleanup complete; application/release acceptance needs validation.** Next session continues the existing branch, not recovery. Remaining BL-136/137 acceptance, final relevant-source balance and BL-161 remain explicit in PLAN/BACKLOG. Build/types/lint and bounded rendered outcomes above remain the verified scope.
