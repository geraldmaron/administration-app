# Executive rebuild — locally verified, integration caveats recorded

## Outcome and boundary

At `/washington`, the President can compare actual delivery, staffing and service readings, select an office to see its evidence, and browse a compact full roster. Related institutional navigation panels occupy equal grid tracks and stretch to equal heights. The roster no longer inherits the old rounded phone-card presentation. Logo, person dossiers and the review ceremony are separate remaining work; this checkpoint does not claim those are rebuilt.

The existing isolated implementation worktree and port 5188 are retained. No engine contracts, save schema, dependency or simulation numbers change.

## Reuse and replacement

Searched Executive, roster, shared doors, Portrait, Steps, delivery and service sources and their tests. Reused `executiveOverview`, `executiveTree`, `personFile`, roster grouping/sorting, `Door`, `DoorTile`, `Collection`, `Tabs`, `Field`, `Bar`, `Steps` and the existing delivery/service composition charts. Existing local executive/cabinet seals provide identity and watermarks. No outside component framework or second chart implementation was introduced.

Replaced the unused KPI/card wall and retired its source/styles. The full roster keeps hierarchical sorting, actual alerts and office/person destinations, with compact numeric ordinal assessments. Delivery/services now compare aligned data on desktop and compact grids on phones; reasons/actions expand in place. Pending work has an Executive-only compact disclosure retaining all existing actionable rows. Other destinations retain their default attention presentation.

Interface extensions: `Screen.compactAttention`, `WaitingHere.compact`, `Steps.showBand`, `Portrait.redacted`; Executive search carries the selected office/view and existing filters. Default redacted portraits affect all Portrait consumers. Approved image rendering remains available explicitly; primitive tests cover both paths. Personal assessment numerals label ordinal bands out of four; they are not precise hidden attribute scores. Public delivery percentages retain their actual simulation values.

## Challenge and controls

Strongest failure: forcing equal dimensions can hide long labels, while a compact summary can conceal pending work. Best alternative: retain content-sized cards and accept their uneven geometry. Verdict: accepted with controls. Use equal grid tracks and natural height stretching rather than clipping/fixed card heights; allow labels to wrap. Keep a visible pending count and a keyboard-operable disclosure. Preserve sortable semantic tables, visible assessment words beside colors, truthful unknowns and explicit chart scales. Verify both themes, 320px reflow, existing user journeys and exact focus return. This is a shared-context review, not independent design acceptance.

## Checks

Check: workspace build before typecheck
Command: `pnpm run build` then `pnpm run typecheck`
Result: pass
Observed: both commands completed successfully; build retained the existing large-chunk advisory. Final CSS compiled separately with `pnpm --filter @admin/web run build`.

Check: workspace lint
Command: `pnpm run lint`
Result: pass
Observed: every workspace lint task completed.

Check: all four Executive views, both themes, six supported viewport widths
Command: `node /private/tmp/executive-final.cjs`
Result: pass for document overflow and Axe; equal-panel width acceptance required a subsequent correction
Observed: 48 view/theme/width combinations, no document overflow or WCAG A/AA Axe violations. This run overlapped the final style adjustments; a final layout-specific sweep is required below.

Check: equal peer panels, final layout and document reflow
Command: `node /private/tmp/executive-layout-proof.cjs` and `node /private/tmp/executive-phone-final.cjs`
Result: pass
Observed: 56 combinations across 320, 390, 768, 845, 1280, 1440 and 1920px in both themes and all four views; three institutional links have equal width/height within subpixel tolerance and no document overflow. Four additional 320px service/delivery cases passed after removing the remaining desktop column width. Inspection caught and corrected that constraint; the earlier capture is not an accepted phone layout.

Check: actual office, person, appointment and back-navigation journeys
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e browser-comments.spec.ts washington.spec.ts --workers=2`
Result: 47 passed, one timeout
Observed: all six supported widths exercised real imported campaigns. One 1440px appointment timed out awaiting its review dialog during an overlapping package rebuild. The timeout's cause is not independently proven.

Check: timed-out journey at the stable checkpoint
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e washington.spec.ts --project=desktop-1440 --grep 'an office opens' --workers=1`
Result: pass
Observed: one test passed in 17.7 seconds, including nomination confirmation and receipt. This isolated pass does not turn the first 48-test command into a clean pass.

Check: metric-consumer inventory
Command: `node scripts/report-metric-registry.mjs`, `node scripts/verify-metric-registry.mjs`, `node scripts/verify-metric-registry-proof.mjs`
Result: pass
Observed: replacement components made the report stale; regenerated it. Both gates then passed: 284 registered fields, 704 claimed readers; existing forgiven claims remain in their baseline.

Check: final source lint and diff whitespace
Command: `pnpm --filter @admin/web run lint` and `git diff --check`
Result: pass
Observed: no lint or whitespace findings. Superseded KPI and roster-card styles were removed rather than retained as another presentation variant.

## Rendered inspection

Inspected Office board at 1440/1920 dark, roster at 1440 light/dark and 320/390 light, services at 845 light/1920 dark/320 light, delivery at 1280/845/320 dark, and institutional panels at 1440 dark. Captures are retained under `evidence/executive/`. The last 320px captures supersede the squeezed-column captures discovered during iteration. The final institutional capture shows three matching compact panels beneath the roster.

Outcome: the Executive page offers coordinated actual-data comparisons, compact full-roster identities and equal institutional navigation panels without the old card wall.
Surface: actual `/washington` views served from the isolated worktree on port 5188.
Data: existing `washington-chairs` campaign, including acting officers, nominations, alerts, departments and agencies; opening campaign used by the comment regression journey.
Observed: the selected office exposes its actual composition and assessments; the full roster retains hierarchy and meaningful office/person doors; service and delivery comparisons reflow without narrow desktop tracks; equal panel dimensions measured in both themes.
Verdict: proven for the named Executive layouts and journeys; broader application acceptance remains open under BL-136.

Check: full workspace unit path
Command: `pnpm run test`
Result: fail; remaining process stopped after failures and stalled output
Observed: engine 4,542, content 1,011, UI 83, design 23, world 550, contracts 1 and API 32 tests passed. Player-core reported two 30-second timeouts in `lapse-source.test.ts`; CLI reported a 90-second timeout in `jobs/runner.test.ts`. This is not a clean full-suite pass. An attempted file rerun with an extra argument separator collected a whole package and was stopped; that run is not counted as a pass.

Check: timed-out unit files, unchanged time limits, sequential execution
Command: `pnpm --filter @admin/player-core run test src/conversation/lapse-source.test.ts` then `pnpm --filter @admin/studio-cli run test src/jobs/runner.test.ts`
Result: pass
Observed: two tests passed in the campaign-clock file; eight tests passed in the CLI job file. These isolated passes do not establish why the broad run timed out or certify the entire workspace suite.

Check: web unit suite, including roster sorting and the new office controls
Command: `pnpm --filter @admin/web run test`
Result: pass
Observed: 70 files and 452 tests passed.

Check: keyboard view selection, focus and attention disclosure; final roster accessibility
Command: `node /private/tmp/executive-keyboard-final.cjs`
Result: pass
Observed: ArrowRight, End and Home selected views and retained focused tabs; Enter opened pending work. All four combinations of 320/1440px and light/dark passed, with no roster Axe violations. The harness was corrected to create the explicit browser context Axe requires before this successful run.

Check: repository proof gates
Command: every `scripts/verify-*.mjs` run sequentially using Node; raw command/result records retained in `evidence/executive/proof-initial.json`
Result: 86 passed initially; two stale metric-report gates passed after regeneration; committed-dist gate remains unsatisfied
Observed: 89 gates executed. Current effective result is 88 passing gates and one gate requiring committed generated output. No commit or stash was created to force that gate green.

Check: running development server
Command: `curl --max-time 10 --silent --output /private/tmp/executive-http-final.html --write-out '%{http_code}\n' 'http://127.0.0.1:5188/washington?view=roster'`
Result: pass
Observed: HTTP 200. The separate worktree server remains on port 5188.

## Closing record

- Project inspected: Executive presentation models, route search, tables, shared attention, navigation tiles, Steps and Portrait consumers. Scope is presentation and navigation, with no engine/save-schema contract changes.
- Reuse checked: existing capabilities named above were extended; the superseded KPI/card variant and old roster CSS were removed.
- Validation path run: exact commands and limitations above. Full workspace unit acceptance remains unproven despite the successful isolated reruns. The committed-output proof remains unsatisfied.
- Outcome observed: real populated campaign; four views; 56 measured layouts, corrected 320px views, keyboard/disclosure proof, and named subject/action/back journeys.
- Surface inspected: final capture list above; no automated result substitutes for the named visual inspections. Other application families retain their separate earlier records and are not claimed reviewed here.
- Diff reviewed: Executive source/styles, shared attention and door changes, Portrait/Steps test implications and generated inventory checked; whitespace check clean. No staging, commit, push or deploy.
- Residual risk: broad unit run has no clean aggregate pass; one browser timeout passed its isolated recheck; committed-dist verification awaits a requested commit; Safari/Firefox and assistive-technology testing remain unverified. No balance retune occurred and the balance harness was not run for this presentation-only change. Full application visual acceptance stays open under BL-136.
