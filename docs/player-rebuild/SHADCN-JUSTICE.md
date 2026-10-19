# Courts and oversight rebuild — integration record

Status: source implemented and locally verified at 390 and 1440 in both themes. Integrated acceptance and the remaining viewport/state matrix stay with the coordinating agent. This is a scoped justice record, not a whole-application completion claim.

## Outcome and scope

A player can inspect the federal bench, find a case and its governing judgment, follow its calendar, and respond through the existing legal action flow. Oversight presents independent inquiries separately from presidential directives and staffing decisions, with record-backed subjects and contextual evidence.

The work extends `courtSystem`, `courtDocket`, `caseFile`, `caseProcess`, `inquiryPipeline`, `directiveTargets`, and the existing appointment/notice executors. No engine, save schema, dataset, or scenario changes. Shared shadcn foundations, `AuthorityHelp`, the legal source catalog, and their dependency manifests belong to the coordinating agent.

Source checkpoints: `bfea1442a`, `55d6c4214` and `17c198765`. Foundation dependency copies `c11d309cc` and `64813e8da` must not be integrated a second time. The isolated worktree is inside the persistent project `.worktrees/shadcn-justice`, not a temporary directory.

## Composition and interaction

- Courts has distinct URL-backed Bench, Docket and Nominations workspaces. It no longer repeats the entire court overview and another bench underneath every tab.
- The docket is a sortable whole-card ledger. Each case retains its actual subject, legal question, final or pending status, forum, date, and qualitative assessment. Worker recovery and surveillance damages do not become generic “order struck down” outcomes.
- Federal jurisdiction opens a contextual Sheet. The circuit map, circuit controls and case path share recorded case identity. Dates and the judicial appointment balance remain descriptive rather than predictions.
- Bench cards, case cards, calendar agenda rows, pending nominee identities, response obligations and vacancy tasks expose whole-subject links. A separate case-selection control can coordinate the map without nesting controls inside the navigation link.
- Case detail uses a single compositor for executive-order and other proceedings. Recorded lower-court composition is aligned against authorized judgeships; snapshot date and limits remain explicit. Governing judgment, stay request and final disposition remain distinct.
- Oversight separates its attention worklist, inquiry stages and task workspace. An inquiry card opens its recorded evidence and dates in a contextual Sheet, with Escape and focus restoration.
- Directed investigations/targeting use active institution-matched recorded subjects. Where none exists, the operation stays unavailable. Other supported instruction kinds use predefined requests. A request is not represented as a direct change to policy rates or enforcement outcomes. Closed matters are not recycled as new active subjects.
- Inspector and delayed-notice reasons are selected statements, not free text. They do not assert unsupported misconduct or certify legal sufficiency. The inspector roster uses exact department artwork where available and a semantic institutional icon elsewhere.
- Portraits on the bench are explicitly redacted, with no procedural aging image generated for those placeholders.

## Removed code

Deleted the unused `Bench.tsx` composition, including its duplicate lean-line rendering. Rebuilt the old Docket table rather than leaving an unreachable alternate screen. Removed stale court, judge, docket, case-grid, inquiry pipeline and native disclosure selector families. Inspectors no longer use native `details`. The existing shared appointment pipeline and meaningful stage-strip styles remain because they still have real consumers.

Search evidence: source references across `apps/web/src` and `packages/ui-web/src` were checked before deleting selectors. `Bench`, `LeanTrack`, legacy case-grid and old inquiry-pipeline consumers were checked explicitly. `SortPicker` was extended by the foundation owner with `alwaysVisible` because its former table-only visibility contract hid sorting on card collections.

## Route and journey coverage

| Surface | Rebuilt or extended behavior | Evidence and limits |
|---|---|---|
| `/washington/courts?view=bench` | Single bench, real vacancy task, shared-vote agreement, contextual jurisdiction | Both themes at 390/1440 in focused browser coverage; no-vote evidence in source tests |
| `/washington/courts?view=docket` | Stage counts, sortable full-card pending/decided ledger, dated agenda | Card keyboard navigation, Back to the same view, jurisdiction Escape/focus covered |
| `/washington/courts?view=nominations` | Scoped court appointment desk; full nominee identity link; withdrawal comparison | View reflow and send/withdraw executor journey passed |
| `/washington/courts/case/$id` | Governing process and exact legal evidence, one responsive compositor | Fixture-based card-to-case journey; source tests include election, housing, wages, surveillance, lower ruling and recusal |
| Legacy courts `judge` search | Existing person dossier redirect retained | Route source inspected; no new redirect implementation |
| `/washington/oversight?view=inquiries` | Attention worklist, stage board, full-card evidence Sheet, notice terms | Real Treasury inquiry; Sheet evidence, Escape and focus return covered |
| `/washington/oversight?view=directives` | Body, supported kind and predefined/recorded subject with actual response preview | No gameplay text input; missing subject unavailable; monetary request and exact institution matching tested |
| `/washington/oversight?view=inspectors` | Activity roster, contextual full roster, selectable reasons, comparison/receipt retained | View reflow and absence of native disclosure covered; removal executor rerun passed |
| `/washington/oversight?view=appointments` and `seat` | Existing scoped appointment executor and officer removal remain embedded in rebuilt workspace | View reflow covered; detailed officer removal is source-inspected, not newly browser-proven |

## Verification

Check: project and reuse inspection
Command: source reads and `rg` reference searches across the court/oversight modules, shared primitives, presentation readers and existing tests
Result: pass
Observed: shared readers and command executors were reused; no parallel model or saved shape was added.

Check: full monorepo build before type checking
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm run build`
Result: pass
Observed: all workspace builds completed; the existing large Vite chunk warning remains.

Check: player type checking
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/web typecheck`
Result: pass
Observed: `tsc --noEmit` exited successfully after the build.

Check: player lint
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/web lint`
Result: pass
Observed: `eslint src` exited successfully.

Check: affected court and subject behavior
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH pnpm --filter @admin/web test -- src/washington/courts src/washington/oversight/directive-options.test.ts`
Result: pass
Observed: four test files, 28 tests passed. Existing isolated server-rendering router warnings remain; no assertion failures.

Check: focused browser behavior before final spacing/action-row refinement
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH E2E_PORT=5194 E2E_FIXTURES=court-overview-recorded,courts-and-oversight pnpm --filter @admin/web exec playwright test justice-workspace.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`
Result: pass
Observed: 12 checks passed, both themes at 390 and 1440, covering all seven court/oversight views plus subject navigation and contextual evidence. Visual inspection caught an overly tall phone command strip; it was reduced to a 2×2 grid before the final rerun.

Check: final browser and retained executor journeys
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH E2E_PORT=5194 E2E_FIXTURES=court-overview-recorded,courts-and-oversight,circuit-vacancy pnpm --filter @admin/web exec playwright test justice-workspace.spec.ts court-overview.spec.ts washington-courts.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1`
Result: fail
Observed: 22 passed and two failed. Both failures were the old inspector label locator matching the new legal-help button as well as the select. No aggregate-green claim. The exact combobox locator was corrected, and the affected two journeys passed the rerun below.

Check: affected oversight executor rerun
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH E2E_PORT=5194 E2E_FIXTURES=courts-and-oversight pnpm --filter @admin/web exec playwright test washington-courts.spec.ts --grep='oversight:' --project=mobile-390 --project=desktop-1440 --workers=1`
Result: pass
Observed: two checks passed. A predefined monetary request was issued and recorded; the Treasury inspector removal notice was selected, reviewed, authorized and receipted at both widths.

Check: final panel capture and view coverage
Command: `PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH E2E_ATTACH=1 E2E_PORT=5195 pnpm --filter @admin/web exec playwright test justice-workspace.spec.ts --grep='view coverage' --project=mobile-390 --project=desktop-1440 --workers=1 --output=tests/.justice-capture-results`
Result: pass
Observed: four checks passed against a stable preview of the final web build; every court/oversight tab was exercised in both themes at both widths. Individual panels were captured at a temporarily taller viewport so internal shell scrolling did not hide their content. Four inspected captures were retained below.

Outcome: a player can open exact court subjects, return to the same route view, inspect institutional evidence and complete the existing nomination, withdrawal, directive and inspector-notice flows without gameplay free text.
Surface: browser player court/oversight pages, contextual Sheets, review dialogs and receipts.
Data: existing `court-overview-recorded`, `courts-and-oversight` and `circuit-vacancy` fixture saves generated through the repository harness; no mocked presentation payloads.
Observed: keyboard card navigation, case Back navigation, all seven route views, both themes, contextual evidence, Escape/focus return and the retained executor journeys behaved as recorded above.
Verdict: proven for the exercised 390/1440 states; not a certificate for the whole application, the four remaining widths or all legal lifecycle states.

An earlier browser invocation forwarded a literal `--` through the package script and accidentally collected the whole suite. It was stopped with exit 130. Its partial output is not a test certificate. The initial dependency copy also caused duplicate React resolution; regenerating the isolated dependency installation removed the hook failures, before the 28-test pass.

## Inspected captures

| Capture | Inspected surface and observation |
|---|---|
| [Court bench, light, 390](justice-captures/courts-bench-light-390.png) | All nine seats, actual vacancy, fixed redacted portraits, role/age/tenure on separate lines; no metadata run-on |
| [Court bench, dark, 1440](justice-captures/courts-bench-dark-1440.png) | Shared lean arc and two-column justice roster; vacant seat remains dashed and the recorded-lean caption does not promise a ruling |
| [Oversight inquiry, light, 1440](justice-captures/oversight-inquiries-light-1440.png) | Stage counts, explicit modeled pressure, exact Treasury identity and dated inquiry card |
| [Oversight command, dark, 390](justice-captures/oversight-command-dark-390.png) | Compact 2×2 task grid with consistent icon/count/label order and distinct selected state |

These captures were opened and inspected with `view_image`; capture generation alone was not treated as visual acceptance. Phone card height and justice metadata defects were found and corrected before these retained images.

## Challenge and acceptance controls

Strongest failure: attractive visual proxies could be mistaken for a predicted ruling, genuine vote support, or legally sufficient grounds for removal. Controls: explicit economic-lean and appointing-party labels, shared-vote sample counts, qualitative rather than percentage merits projections, pressure labeled as a modeled index, source dates, primary-source legal help, and existing command-level refusal/review paths.

Best alternative: targeted CSS repairs to the old overview and inquiry stack. Rejected for this scope because they preserve duplicated bench data, competing page hierarchies, disconnected narrative links and gameplay free text. Existing readers and executors were retained instead of rewriting the engine.

Cost: contextual sheets introduce an extra step for detailed geography and inquiry evidence. Immediate response obligations, counts, actual case status and next dates remain visible; full-subject targets, keyboard operation, Escape and focus return are checkable controls.

Verdict: accepted with controls for integration. Browser coverage beyond 390/1440, 200% text, broader campaign states, detailed officer removal, a fresh full workspace test/proof sweep and the integrated live application remain the coordinating agent's acceptance checkpoint. Circuit selection is contextual state, not a new persistent campaign or URL contract. This implementation and challenge share the conversation context; this is not an independent adversarial sign-off.


A retained executor check exposed a shared automation migration gap: the actual shadcn presidential review opened, but `confirmReview` still searched for a native `dialog.review[open]`. The coordinating agent replaced that with the actual role-based open review selector. The final justice run uses that shared helper; the helper change is not owned or committed by this branch. The overview count check also now waits for the six hydrated stage readings instead of reading an empty main element immediately after navigation.
