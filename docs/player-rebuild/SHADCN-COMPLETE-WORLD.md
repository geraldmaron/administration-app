# World and Security completion checkpoint

Base: `12501c852`. Durable checkout: `.worktrees/shadcn-complete-world`; isolated browser server: port 5295. No engine/save shape changes, publication or deployment. The integration owner runs the full repository gates after combining streams.

## Outcome, dependencies and reuse

The President can compare known country/trade/security data, open contextual actions without losing the workspace, reload or use Back, and review/authorize exactly once. The selected country view leads; Overview retains the full leader, relationship, attention and geographic evidence. Genuine risk/caution notes remain reachable from a counted alert in the compact identity ribbon.

Direct scope: `apps/web/src/world/**`, World route wrappers and the bounded `packages/player-core/src/world/nation-file.ts` reader correction. Dependencies: existing country/security/command readers, trade category action config, shared Card/Sheet/HelpTip/CompareAuthorize, presidential review and commit machinery. URL contracts gain bounded Security/command action and coalition-member state. Stored campaign and effect contracts remain unchanged.

Searched existing shared components, URL parsers, sorting utilities, country identity markup, conflict-side readers and tests. Reused shared Sheet and HelpTip, `sortRows`, the existing identity/flag/stance presentation, Stat's existing ReactNode value and inline-small style, and engine `sideOf`. No route-owned modal, second identity component family, generic return URL, dependency or invented data was added.

## Source changes and evidence

- World and Security indicators use two-column phone grids; contextual HelpTip is independently operable beside the card's navigation.
- Security actions and receipts use a contextual Sheet while the selected view and data remain mounted. Validated action/subject URLs restore the inspector after reload. Browser Back, Escape, reviewed commit, one receipt and restored trigger focus are exercised.
- Command actions use the same bounded inspector and shared authorization path.
- Security theaters retain readiness and legal evidence. Other views expose readiness through a contextual evidence inspector; active legal clocks stay before the selected work.
- Country subviews use one compact real flag/capital/stance ribbon; the full dossier/map belongs to Overview below the view strip. Selected tabs survive reload. Existing full identity markup is refactored, not duplicated.
- Annual GDP, per-person output and bilateral trade units are grouped with their values using existing Stat support; generic explanatory captions remain captions.
- Country trade-value sorting actually sorts imports plus exports in both offered directions. Goods selection survives sort changes and reload. Force holdings honor listed-order reversal.
- Coalition member selection persists in the URL and after returning from the member action. Unknown members are unselected, not silently substituted.
- War Presidential decisions receives the missing inline panel inset. Existing parties, authority, observed history, unknown placements and unit distinctions remain intact.
- A concrete reader defect was found: a government alongside the US in a conflict was labeled as an enemy. `nationFile` now requires opposite active sides using existing `sideOf`. Principal allies and coalition partners are not enemy badges or war alerts. Original regression: four failures, two passes; corrected regression: six passes.

## Challenge and controls

Strongest failure of contextual actions: a docked authorization can portal into the inert background footer. The first phone browser run reproduced this, despite correct route source. Foundation's shared Sheet footer-scope correction fixes the composition. No route workaround or weaker modal behavior was accepted. The full action/command matrix then passed.

Best alternative: replace the workspace with a task page. That avoids inherited modal scope but loses orientation. Verdict: contextual sheets accepted with controls: bounded URL parsing, actual Back/reload/Escape, nested presidential review, one receipt and focus restoration at phone and desktop widths.

A separate truth control is necessary: richer badges amplify false interpretation. Enemy/ally assertions exercise the actual joined-war UI and the reader's principal/coalition permutations, rather than trusting plausible badge text.

## Rendered route/state ledger

`tests/world-surface-coverage.spec.ts` passed 24 cases: six family journeys × light/dark × 390/1440. Each route capture records the top and, when scrollable, middle/end of the actual work surface. A full-page screenshot alone had missed the nested scrolling body; the final capture helper explicitly scrolls it.

| Family | Exercised states |
|---|---|
| World and country | World; Canada overview, diplomacy, economy, security, intelligence, activity; missing government; five nonoverview tabs reloaded with URL selection |
| Security and command | Theaters, forces, intelligence, operations; missing-service fallback; INDOPACOM; missing command |
| Foreign actions | Philippine military configuration; Chinese category tariff; Iranian covert configuration; missing government |
| International body | NATO; selected Canada survives reload → member action → browser Back; missing body |
| Treaty | Existing signed trade instrument awaiting Senate action; missing instrument |
| Conflict | Existing Russia–Ukraine front, parties, unknown force placements, authority and observed record; missing war |

The fixture named `war-joined` initially contains a front the US has not entered. The later joined-war journey actually joins Ukraine through review before asserting opponent/ally identity; its name is not treated as proof of state.

Named capture roots, under `apps/web/tests/.results/` in this persistent checkout:

- `world-context-verified`: Security task and command posture inspectors in both themes/widths; inspected phone dark command and desktop light task captures show reachable in-modal authorization.
- `world-surfaces-final`: complete route matrix with top/middle/end captures. Inspected country six-view phone light set, phone dark economy, desktop light economy, Security phone light theaters/forces/intelligence/operations/command samples, foreign force/trade/covert phone dark configurations, treaty phone light/dark and war phone light/dark evidence states. Capture files use their route-state-theme names.
- `world-goods-final`: category/rate → reload → category comparison → reviewed tariff → exact category/rate receipt, both themes/widths, plus country sorting regressions.
- `world-opposing-final`: actual join → Russia enemy ribbon → alert Overview → Back with selected Economy and focused alert → Ukraine allied ribbon. Inspected phone dark war-inset/opponent and phone light ally captures: annual units adjoin values, no false allied war badge, padded selectable action cards.

Before/after: preliminary `world-surfaces/.../country-overview-light.png` shows the repeated full country header occupying the phone before tab content. Final `world-surfaces-final/.../country-economy-light.png` shows selected data immediately after the compact identity and tabs. `world-opposing-final/.../opponent-dark.png` includes the final inline units and real active alerts.

Captured does not mean individually visually inspected. The named examples above were opened; other matrix captures establish rendered coverage and overflow assertions, not an assertion that every pixel was inspected.

## Verification record

Runtime for these commands: `/opt/homebrew/opt/node@22/bin` and `/opt/homebrew/bin` prepended to PATH.

Check: dependency and player production build before typecheck.
Command: pnpm --filter @admin/web... run build
Result: pass
Observed: final selected dependency builds and Vite completed; large-chunk warning remains. Log: `.world-completion-build.log`.

Check: player and reader types, after completed build.
Command: pnpm --filter @admin/web run typecheck; pnpm --filter @admin/player-core run typecheck
Result: pass
Observed: both tsc --noEmit commands exited zero. Logs: `.world-completion-types.log`, `.world-completion-core-types.log`.

Check: World URL, scale, sorting, action and holdings contracts.
Command: pnpm --filter @admin/web exec vitest run src/world
Result: pass
Observed: 12 files, 38 tests passed. Log: `.world-unit-final.log`.

Check: opposing-side regression and related war/board contracts.
Command: pnpm --filter @admin/player-core exec vitest run src/world/nation-file.test.ts src/world/war-screen.test.ts src/world/war-powers-home.test.ts src/world/world-board.test.ts
Result: pass
Observed: four files, 42 tests passed. Before-fix log: `.world-opposing-before.log`; after-fix: `.world-opposing-after.log`.

Check: scoped lint and CSS architecture.
Command: pnpm --filter @admin/web exec eslint src/world tests/world-workspace-context.spec.ts tests/world-surface-coverage.spec.ts
Result: pass
Observed: zero lint output. Earlier scoped lint also included the three changed route wrappers. Log: `.world-final-lint.log`.

Check: reader lint.
Command: pnpm --filter @admin/player-core exec eslint src/world/nation-file.ts src/world/nation-file.test.ts
Result: pass
Observed: zero lint output. Log: `.world-core-lint.log`.

Check: CSS layering proof.
Command: node scripts/verify-css-architecture.mjs
Result: pass
Observed: 90 sheets, 4929 rules, zero forgiven findings. Log: `.world-final-css.log`.

Check: Security/command task and country sorting workflows.
Command: E2E_ATTACH=1 E2E_PORT=5295 pnpm --filter @admin/web exec playwright test tests/world-workspace-context.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=tests/.results/world-context-verified
Result: pass
Observed: 12 cases passed before the final annual-unit/inset/reader corrections. Security/command source did not change afterward. Log: `.world-context-verified.log`.

Check: rendered family matrix.
Command: E2E_ATTACH=1 E2E_PORT=5295 pnpm --filter @admin/web exec playwright test tests/world-surface-coverage.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=tests/.results/world-surfaces-final
Result: pass
Observed: 24 cases passed before final annual-unit/inset/reader corrections. The final affected war and country states are checked by the joined-war journey. Log: `.world-surfaces-final.log`.

Check: tariff terms, receipt and sorting regression.
Command: E2E_ATTACH=1 E2E_PORT=5295 pnpm --filter @admin/web exec playwright test tests/tariff-goods-journey.spec.ts tests/world-workspace-context.spec.ts --grep='tariff goods|trade sorting' --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=tests/.results/world-goods-final
Result: pass
Observed: eight cases passed after country restructuring. Later trade change only groups annual units with values. Log: `.world-goods-final.log`.

Check: final actual enemy/ally and alert-return journey.
Command: E2E_ATTACH=1 E2E_PORT=5295 pnpm --filter @admin/web exec playwright test tests/world-workspace-context.spec.ts --grep='joined war' --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=tests/.results/world-opposing-final
Result: pass
Observed: all four final cases passed; whole-card selection, reviewed join, real enemy/ally badges, annual unit grouping, alert Overview, browser Back, selected Economy and focused alert. Log: `.world-opposing-browser.log`.

Outcome: selected country evidence leads, contextual reviewed actions retain the workspace, annual units remain beside values, and allies do not receive enemy badges.
Surface: real Vite player, port 5295, disposable Playwright contexts.
Data: existing populated engagement/security/treaty/conflict saves; actual task, posture, tariff and join actions rather than mocked commit responses.

## Residuals and integration boundary

- These checks cover 390 and 1440, not all six supported viewport projects or enlarged-text combinations. Global integration owns the complete matrix.
- The foreign receipt's in-app country return residual is closed by the bounded follow-up below. Local sort/filter settings generally do not persist across reload; those settings are not reported as resolved.
- Deep Overview priority forward-scroll behavior is not verified here; existing exact Back context is reused. The counted alert's actual Overview → browser Back, selection and focus are tested separately.
- Relief/reassignment/plan, non-task Security actions and treaty draft/ratify/withdraw authorizations received source assessment but were not committed through their full browser workflows in this wave. No blanket authorization-path claim is made.
- Map captures are not a substitute for the repository's dedicated map-ink proof. Full global tests, lint, distribution freshness and other repository proof gates are the integration owner's stable-checkpoint responsibility.
- Existing unavailable person collection/jurisdiction limitations remain explicit. No invented intelligence, force locations, outcome precision, historical series, classification or official artwork was added.

Project inspected; dependency and stored-contract boundary named. Reuse checked against existing shared components and readers. Applicable bounded validation run; global validation remains named above. Representative actual surfaces opened and inspected, with capture-only coverage distinguished. Diff reviewed against the described outcome. No broad application-complete claim is made by this stream.

## Follow-up: same-government foreign receipt return

The concrete foreign receipt return gap is addressed without adding engine/save state or accepting a return URL. The existing app `country-search` module owns the presentation contract:

- `returnView` uses the existing six country views, with Overview canonicalized to omission.
- `returnSector` uses the existing bounded country selection parser (nonempty string, at most 80 characters). It is encoded as query data, never interpreted as a destination.
- The action's current government supplies the return route. `returnTo`, `returnNation`, foreign URLs, unknown views and array selections cannot choose a different destination.
- Country footer and selected-goods tariff entry links carry these fields. The action route preserves them across option/rate changes and reload while passing only `parseActConfig` output into execution.
- `returnSector` is independent of the action's tariff `sector`: choosing different goods for the order never overwrites the originating evidence selection.
- Receipt `Back to {country}` reconstructs the same-country view/sector route. `Act again` preserves that origin. A direct action without valid context retains the canonical country Overview fallback.

The strongest failure would be returning to the newly tariffed category instead of the category the President was inspecting. The browser journey deliberately changes category, authorizes a real 12% tariff through review, verifies the new category in the receipt, then clicks the receipt's in-app return and checks the original Economy/category. This extends the existing Door and transient departure-context behavior. Continuous journeys restore originating link focus and scroll. A full draft reload clears the existing transient map; tab/category survive in the URL and standard country heading focus applies. No new persistent navigation store was introduced.

Check: bounded origin parsing, encoded routing and independent action terms.
Command: pnpm --filter @admin/web exec vitest run src/world/nation/country-search.test.ts
Result: pass
Observed: all six tests passed, including direct-action fallback and rejection of alternate destination fields. Log: `.world-return-unit.log`.

Check: production build, then player types.
Command: pnpm --filter @admin/web... run build; pnpm --filter @admin/web run typecheck
Result: pass
Observed: build completed before tsc --noEmit; Vite's existing large-chunk warning remains. Logs: `.world-return-build.log`, `.world-return-types.log`.

Check: scoped implementation and journey lint.
Command: pnpm --filter @admin/web exec eslint src/world/nation/country-search.ts src/world/nation/country-search.test.ts src/world/nation/NationScreen.tsx src/world/nation/TradeView.tsx src/world/nation/ActDesk.tsx src/world/nation/ActReceipt.tsx 'src/routes/world.nation.$id.act.tsx' tests/world-return-context.spec.ts
Result: pass
Observed: zero findings. Log: `.world-return-lint-final.log`.

Check: actual country evidence → configured tariff → review → receipt → in-app return.
Command: E2E_ATTACH=1 E2E_PORT=5295 pnpm --filter @admin/web exec playwright test tests/world-return-context.spec.ts --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=tests/.results/world-return-verified
Result: pass
Observed: all eight cases passed (light/dark × 390/1440 × continuous/reloaded). Light/dark phone continuous/reloaded captures and desktop dark continuous capture were opened and inspected. Log: `.world-return-verified.log`. Initial failed test attempted to enumerate options before the action form arrived; the test now waits for the visible combobox. Product source was not patched to address that synchronization mistake. Initial failure remains in `.world-return-browser.log` and `tests/.results/world-return-final`.

Outcome: receipt in-app return restores the originating government tab and goods selection even when tariff goods change and the draft reloads.
Surface: real player on isolated port 5295; existing engagement save, real tariff review and receipt.
Residual: reload restores the route's tab/category but cannot restore the intentionally transient pre-reload scroll/focus record. Other previously named residuals remain outside this bounded change.
