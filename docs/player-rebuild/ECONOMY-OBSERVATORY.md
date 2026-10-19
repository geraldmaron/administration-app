# Economy: visual investigation workspace

> Superseded composition: [Economy inline comparisons](ECONOMY-INLINE-COMPARISONS.md) replaces the detached Compare Sheet, default history basis and narrow three-column signals below. This document retains the earlier checkpoint and its evidence; it is not the current composition specification.

2026-10-15. Persistent Nation worktree and port5294. Follow-up to7b43dcccf, prompted by the owner's observation that the live application did not show enough substantive visual change.

## Concrete composition change

The inspected baseline was an isolated build of the same Economy source, not the owner's saved campaign in the shared5189 browser. Its entry view presented three large values, three small sparklines and three long source paragraphs. The driver comparisons were a separate later panel. This placed the evidence explaining a figure away from its history.

The replacement uses three compact, whole-card signal selectors and one shared investigation surface. A selected signal brings its larger dated area/history chart alongside the corresponding zero-centered model-contribution bars on desktop; phone stacks the same evidence. The current administration is the default window. Published context is an explicit alternative rather than the default compressed decade-long sparkline. Agency source and interpretation use the existing focused evidence Sheet. Household costs and the business-cycle position share the next comparison row; the state ranking follows. Existing market/supply, trade, finance, intervention and record investigations remain accessible.

This is a composition and information-hierarchy change, not a component-library skin. It reuses `economyReading`, `economyHistory`, `rateDriverReadings`, `Series`, `DriverTable`, `Choice`, `Card` and `EvidencePanel`. No duplicate model, new dataset, engine change or dependency was added. Rate selection and `historyWindow=published` are URL presentation state; the route's existing validated parser handles them.

## Data controls and strongest objection

A larger area chart can make a small change look dramatic. Accepted with controls: numeric y-domain labels, explicit percentage units and observation dates, current value and oath baseline retained on the signal, and exact values in the observation inspector. The chart's vertical scale adapts to the selected window; it must not imply a zero baseline.

Published agency history, the unobserved pre-oath interval and played weeks must not pass for the same evidence. The old sparkline counted the opening assumption in its “published” prefix. The new published window places a null gap across that interval, labels the gap in the observation table and never invents monthly points. Published context preserves the shared Series dashed/solid partition; finite replay is offered on the played-week window only. The resting rate is explicitly a model reference, not a forecast. Driver bars sum toward the modeled target, not to the current rate or to observed historical changes.

No further economic causal claims were invented. The exact existing driver rows and quantities are rendered. The larger visualization is not evidence of a different simulation capability.

## Verification record

Outcome: Select an economic signal and see its dated history alongside the matching model contributions, then inspect sources or published context without losing that subject.
Surface: Built isolated Vite player at5294, real save-import interface, Economy overview and existing comparison Sheet.
Data: Existing gulf-oil-shock fixture, ten recorded played weeks and the repository's published agency history.
Observed: Three signal cards control the selected rate; driver content changes with it; published window survives reload; the gap is explicitly Unknown in the observation table; source and comparison Sheets open; both composed themes fit without horizontal page overflow.
Verdict: bounded journey proven; final narrow-label verification is also proven below.

Check: production build, before typecheck
Command: `pnpm --filter @admin/web run build`
Result: pass
Observed: Final Vite production build completed in14.97s; existing large-chunk warning remains.

Check: player types
Command: `pnpm --filter @admin/web exec tsc --noEmit`
Result: pass
Observed: Command exited0.

Check: validated history-window presentation state
Command: `pnpm --filter @admin/web exec vitest run src/nation/economy/market-search.test.ts`
Result: pass
Observed:3 tests passed; published window retained, unsupported windows rejected.

Check: changed source/test lint
Command: `pnpm exec eslint apps/web/src/nation/economy/Readings.tsx apps/web/src/nation/economy/Drivers.tsx apps/web/src/nation/economy/EconomyScreen.tsx apps/web/src/nation/economy/market-search.ts apps/web/src/nation/economy/market-search.test.ts apps/web/tests/economy-observatory.spec.ts apps/web/tests/nation-economy.spec.ts`
Result: pass
Observed: Command exited0.

Check: responsive investigation journey
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test economy-observatory.spec.ts --project=desktop-1440 --project=mobile-390 --workers=1`
Result: pass
Observed:4 journeys passed at390/1440 in both themes; this preceded the final320-only label-height correction.

Check: narrowest supported viewport
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test economy-observatory.spec.ts --project=mobile-320 --grep '· dark' --workers=1 --output=/private/tmp/shadcn-economy-320`
Result: pass
Observed: Final320dark journey passed, including an explicit numeric-row alignment assertion. Opened the final capture: the long label wraps inside its card and all three values align; no page overflow.

## Captures and boundaries

Before: `captures/economy-before-dark-desktop-1440.png`.
After entry: `captures/economy-entry-after-<theme>-<viewport>.png`, the same entry scroll position.
After workspace: `captures/economy-workspace-after-<theme>-<viewport>.png`, scrolled to the investigation surface.

The before entry and after workspace captures use different internal scroll positions and must not be presented as equal-position comparisons. Source was inspected before changes; baseline, phone and desktop captures were opened; the final narrow-label capture was inspected before committing. Remaining unverified: full integration gates, the uncomposed intermediate viewport sizes, every historical/empty campaign variation, and a full economic policy/lever mutation through this slice. Existing Economy market, trade and lever compositions were retained; this slice makes no new visual-acceptance claim for them.

Final inspection: opened the baseline dark desktop entry, new dark desktop entry, new light/dark desktop workspace, new light phone workspace and final320dark workspace captures. The entry-to-entry pair uses the same scroll position and demonstrates the composition change; workspace captures show the larger chart/contribution pairing. Other stored theme captures are retained automated evidence, not a claim that all internal scroll positions were walked. Project/source inspected, reuse checked, applicable scoped checks run, bounded outcome observed and diff reviewed. Parent owns stable integration gates and the remaining route families.

## Compact entry and verified CSS pruning

The repeated conditions label, sentence heading and phase/week paragraph are replaced by the existing cycle-word Tag and a small Compare button. The lower business-cycle panel retains the phase-duration detail. The Compare control retains its accessible name, “Compare the record.” Opened the refreshed equal-position320 and1440 dark entry captures (`economy-entry-compact-dark-*.png`): all three signal values are visible in the initial320 entry viewport and the desktop history plot begins higher in the entry view.

Source search removed only five obsolete selectors: three `.economy-geography` layout selectors, `.economy-brief h2` and `.economy-brief__label`. No source consumers remain for those names. `.rate__source` is intentionally retained: Compare and ComparePeers use it for method/source context. `.eco-measures` and its selected-item styling are intentionally retained: Household and Markets consume the list, and the Fed card receives selection state through `useSelectedMeasure`. There is no standalone `.rate` CSS rule remaining. Deleting live styles based on their old-sounding names would be a regression.

Check: CSS architecture
Command: `node scripts/verify-css-architecture.mjs`
Result: pass
Observed:90 sheets,4958 rules,0 findings forgiven; no baseline change.

Check: rebuilt compact entry
Command: `pnpm --filter @admin/web run build`
Result: pass
Observed: Production build completed in16.26s; existing large-chunk warning remains.

Check: player types
Command: `pnpm --filter @admin/web exec tsc --noEmit`
Result: pass
Observed: Command exited0.

Check: changed component lint
Command: `pnpm exec eslint apps/web/src/nation/economy/EconomyScreen.tsx`
Result: pass
Observed: Command exited0.

Check: responsive composition and drilldowns remain operational
Command: `E2E_PORT=5294 E2E_ATTACH=1 pnpm --filter @admin/web exec playwright test economy-observatory.spec.ts --project=mobile-320 --project=desktop-1440 --grep '· dark' --workers=1 --output=/private/tmp/shadcn-economy-prune`
Result: pass
Observed:2 journeys passed, including signal-row alignment, source and observation inspectors, published-window reload, comparison panel and no horizontal page overflow. Both refreshed entry captures were opened and inspected. No dataset or economic behavior changed.
