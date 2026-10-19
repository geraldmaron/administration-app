# Economy: one selected signal and its comparison evidence

2026-10-15. This supersedes the detached comparison Sheet and three-column320 layout described in the earlier Economy checkpoint records. Source remains in the persistent Nation worktree. No dataset, simulation or save-schema change.

## Result

The three economic signals control one investigation. At320px they are full-label rows with adjacent right-aligned values and a short secondary delta/oath line; wider surfaces retain three cards. A common current-weekly / at-oath / model-resting-reference strip remains present across all evidence bases. The model reference is explicitly labeled “not a policy target.”

The default basis is an inline US-record comparison. The existing `comparisonView` and `SeriesChart` draw published and simulated series inside the same SVG and on the same percentage and elapsed-month axes. Selecting Growth cannot independently reopen an Unemployment comparison. The old Compare action, modal and independent measure state are removed.

Observed history and real-country reference are alternative bases inside that same selected investigation. The selected rate, basis, historical US window and explicit observed-history window are validated URL presentation state. World Bank peers are explicitly real countries and historical calendar years, not the simulated governments. The prior population-growth comparison remains available contextually from the real-country basis. Country choices/year controls retain their existing component-local state; this slice does not claim those additional peer controls survive an unmount/reload.

Published data do not invent results for this presidency. Opening has no completed comparable period: the reference can be drawn, but no played monthly/quarterly point is fabricated. When observed history is selected without an explicit window and there are no played observations, it defaults to published context. An explicitly chosen empty “This administration” window remains empty and survives reload. Completed-quarter Growth is verified with the existing week-30 fixture, not a ten-week campaign.

## Truth and interpretation controls

- Monthly/quarterly comparison cadence is visible. Growth waits for a complete quarter; monthly rates wait for a complete month.
- The reader's approximate-transform flag appears as a visible “Approximate comparison” tag. It applies when the actual verdict says so, including Growth where applicable.
- Full basis, conversion steps and caution are in the existing EvidencePanel. Inflation-specific annual-rate/twelve-month prose is restricted to Inflation; Growth retains its own actual transform steps.
- Unavailable windows show the reader's exact refusal rather than drawing substitute values.
- Published history retains the null gap for the unobserved pre-oath interval. A current weekly number is not inserted as a missing monthly/quarterly observation.
- Common axes permit comparison; matching trends are explicitly not a causal test or a universal target.

Strongest failure: the weekly current number could be mistaken for the plotted monthly/quarterly value, or a model resting rate for a policy target. Accepted with controls: explicit period labels, separate numeric context, actual-period plot/readouts, visible approximation, first-period status and exact observation evidence. The best alternative was another separate comparison view; that failed the owner's requirement to compare within the selected investigation.

## Source and reuse check

Reused the original comparison reader, shared-axis plot, country reader, reference windows, rate presentation and shared Card/Choice/NativeSelect/EvidencePanel. Removed the independent Compare-mode/measure controls, detached Sheet, unused comparison-control CSS and now-unconsumed `rate__source` selectors. Other Household/Markets `.eco-measures` and selected-Fed styles remain live and are retained.

The source read before changing included Compare, ComparePeers, Readings, market search, comparison.ts cadence/availability/aggregation, SeriesChart and existing browser journeys. No new chart library or second simulation/presentation model was introduced. The change affects only UI composition and URL presentation state.

## Validation

Check: production build, before final typecheck
Command: `pnpm --filter @admin/web run build`
Result: pass
Observed: Vite production build completed; existing large-chunk warning remains. Final method-only rebuild result is in the final verification note below.

Check: player types
Command: `pnpm --filter @admin/web exec tsc --noEmit`
Result: pass
Observed: Command exited0 after the inline composition build.

Check: changed source/tests
Command: `pnpm exec eslint apps/web/src/nation/economy/Compare.tsx apps/web/src/nation/economy/ComparePeers.tsx apps/web/src/nation/economy/Readings.tsx apps/web/src/nation/economy/EconomyScreen.tsx apps/web/src/nation/economy/market-search.ts apps/web/src/nation/economy/market-search.test.ts apps/web/tests/economy-observatory.spec.ts apps/web/tests/nation-economy.spec.ts apps/web/tests/shadcn-nation.spec.ts`
Result: pass
Observed: Command exited0.

Check: supported URL state only
Command: `pnpm --filter @admin/web exec vitest run src/nation/economy/market-search.test.ts`
Result: pass
Observed:4 tests passed, including explicit term/published, selected basis and known historical windows; unsupported bases/windows are rejected.

Check: shared CSS architecture
Command: `node scripts/verify-css-architecture.mjs`
Result: pass
Observed:90 sheets,4966 rules,0 findings forgiven; no baseline change.

Check: actual selected-rate comparison journeys
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test economy-observatory.spec.ts --project=mobile-320 --project=desktop-1440 --workers=2 --output=/private/tmp/shadcn-economy-inline`
Result: pass
Observed:12 journeys passed. Both themes at320/1440 exercised populated history, source/method/observation inspectors, same-SVG reference and played lines, visible approximation, retained basis/window/rate on reload, real-country references, opening/no fabricated period, explicit empty term and an exact unavailable-window state. Growth used week-30 (turn31,2029-08-18), providing two completed quarterly points. No owner's campaign was mutated; all saves were imported into disposable browser contexts.

## Outcome and inspected evidence

Outcome: Select Growth and compare its completed-period simulated line with a published historical line on the same axes, retaining the selected subject across bases, with honest opening and unavailable states.
Surface: Built isolated preview5294 and normal save import.
Data: Existing gulf-oil-shock, opening and week-30 fixtures generated from current compiled packages; published reference datasets already in the repository.
Observed: Both lines share one SVG in the completed-quarter campaign, while opening has no played-period marks. Growth selection persists through Countries, Observed history, US record and reload.320 labels remain complete and values align as compact rows.
Verdict: proven for the bounded journeys. Parent owns stable integration and the broader route/viewport acceptance.

Retained artifacts: `captures/economy-inline-*.png`. Opened and inspected the dark320 signal rows, dark1440 completed-quarter Growth chart and light320 Growth chart. The latter two show both actual series on common axes. Additional opening/entry/theme captures are retained automated evidence; no claim is made that every internal scroll position was manually walked. The chart inspection capture is scrolled and must not be represented as an equal-position entry comparison.

Residual risks: full integration gates and uncomposed intermediate widths remain parent work; real-country peer selection/year controls keep prior local state; the supplemental population-growth inspector is preserved but not independently visually accepted in this slice. No final claim of application-wide completion is made.

## Final method correction verification

The 12-journey browser run above preceded the final one-line restriction of inflation-specific prose to Inflation. After that correction, `pnpm --filter @admin/web run build` passed in 16.53s, then `pnpm --filter @admin/web exec tsc --noEmit` and the exact scoped ESLint command above both exited 0.

Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test economy-observatory.spec.ts --project=desktop-1440 --grep 'completed-quarter.*dark' --workers=1 --output=/private/tmp/shadcn-economy-inline-method`

Result: 1 passed in 9.3s. The completed-quarter Growth journey opened its Method panel, confirmed the actual elapsed-month basis and absence of “Your inflation,” then retained Growth across evidence bases and reload with both plotted series. The entire 12-journey matrix was not repeated after that method-only correction.
