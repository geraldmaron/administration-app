# Implementation verification — 2026-10-14

## Current Material direction checkpoint

The owner’s Material 3 direction supersedes the earlier palette checkpoint below. Shared navigation, type, shape and controls now follow the active theme; Brief, Economy and Security have substantive composition changes. Logo work is deferred. See MATERIAL-REFRESH.md for scope and official references.

- `pnpm run build`: passed after the TypeScript/component integration; final CSS delivery build recorded in `verification/material-build-delivery.log`. Existing large-bundle warnings remain.
- `pnpm run typecheck`: passed (`verification/material-typecheck-final.log`).
- `pnpm run lint`: passed (`verification/material-lint-final.log`).
- `pnpm --filter @admin/design run test`: 23 passed with the Material shape/type tokens.
- `pnpm --filter @admin/ui-web run test`: 83 passed, including unknown-gap area fill, circular assessment and readable/empty share composition.
- `pnpm --filter @admin/web run test`: 450 passed.
- `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e visual-workspace.spec.ts --workers=2`: 12 passed, both themes at all six sizes, now including supplier-row AND relationship-flow dossier visits with exact return focus and history cursor.
- `node /private/tmp/material-visible.cjs`: actual save import, full-page Axe WCAG 2 A/AA and 2.1 AA checks on Economy, Brief and Security × phone/desktop × both themes. All 12 combinations had zero violations, zero document overflow and no page errors. This supersedes the first scan that exposed and led to fixes for the phone date label and interactive map grouping.
- `node /private/tmp/material-flow.cjs`: both-theme current supplier and connection detail captures at 1440×1800 so the full flow fits without sticky-header obstruction. Explicitly exposes the unassigned 26% in the oil fixture instead of normalizing incomplete data. Final flow layout uses the containing panel width, not the outer workspace width.
- `node scripts/verify-css-architecture.mjs`, `node scripts/verify-adhoc-color-lint.mjs`, `node scripts/verify-no-history-references.mjs`: passed. The documentation was placed under the active `docs/player-visual-overhaul/` directory to comply with the live-document gate; no gate was weakened.
- `git diff --check`: passed.

Opened and inspected the Material desktop light Economy/Brief/Security captures, desktop dark Economy, phone light Economy, phone dark Security and commodity comparison, plus supplier and relationship-flow details. Final captures are retained under `evidence/material/`; captured but unopened variants are not claimed visually accepted. Broader route-family compositions, nested-state acceptance, independent design/comprehension review and committed-dist proof remain open. Earlier full-suite failures and reruns are disclosed below and are not recharacterized as a clean full-suite pass.

## Earlier palette checkpoint

Status: representative implementation verified; full application visual acceptance and committed-dist proof remain open. Evidence is local to this worktree. No commit, push or deployment performed.

## Project inspection and reuse

Read engineering conventions and relevant player source before editing. Extended existing Series, WorkSurface, Screen, Door, Choice/sort controls, map preferences, commodity presentation models and semantic glyphs. The source cause for chart geometry was fixed with actual container measurement; mixed-unit quotes retain their unit. No new library, engine behavior, save schema or authored scenario.

## Executed checks

| Command | Observed result |
| --- | --- |
| `pnpm run build` | Passed; latest logs `verification/overhaul-palette-build-final.log`. Existing large-bundle warnings remain. |
| `pnpm run typecheck` | Passed after build; latest log `verification/overhaul-palette-typecheck-final.log`. |
| `pnpm run lint` | Passed across workspace; `verification/overhaul-palette-lint.log`. |
| `pnpm --filter @admin/design run test` | 23 passed after palette revision: contrast and exact CSS/TS parity. |
| `pnpm --filter @admin/ui-web run test` | 80 passed, including missing observations, finite replay and labels. |
| `pnpm --filter @admin/web run test` | 450 passed. |
| `pnpm --filter @admin/player-core exec vitest run src/economy/markets.test.ts` | 11 passed; direction, quote precision and commodity presentation. |
| `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e visual-workspace.spec.ts --workers=2` | Final palette: 12 passed, two themes × six sizes. Tests cover imported real campaign, commodity selection, replay from latest, pause, keyboard scrub, supplier→dossier→back preserving cursor and invoking focus, overflow and reduced-motion behavior. |
| `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e nation-economy.spec.ts record.spec.ts world-security.spec.ts washington.spec.ts --workers=2` | Initial broad run 117 passed / 3 failed. Two tablet Record cases encountered an intermediate formatter defect; command authorization had a mobile timeout. Exact failing cases passed after stable-source reruns (2 Record, 1 command); original run is not represented as fully green. |
| `node scripts/verify-css-architecture.mjs` | Passed after removing a literal shadow color; all surfaces use semantic tokens. |
| `node scripts/verify-adhoc-color-lint.mjs` | Passed. |
| `git diff --check` | Passed. |

The stable six-width matrix before the palette also had an interrupted desktop case during forced package emit/HMR; it passed in isolation. The final palette matrix above passed as a complete command without that interference.

## Full suite and proof-gate limits

`pnpm run test` was run across the workspace and failed. Do not interpret targeted reruns as a clean second full-suite pass. The initial failures and observed reruns were:

- UI summary/formatter defect: corrected, all 80 UI tests and 450 web tests passed afterward.
- Engine timing budget: `pnpm --filter @admin/engine exec vitest run src/person-network-graph.test.ts --maxWorkers=1 --minWorkers=1` passed 4.
- Player-core lapse timeout: `pnpm --filter @admin/player-core exec vitest run src/conversation/lapse-source.test.ts --maxWorkers=1 --minWorkers=1` passed 2.
- Content suites lacked ignored authored fixture files in the new worktree. Copied unchanged existing `.out.json` inputs from the original checkout into ignored work files. No scenario was drafted or revised. Scenario-report recheck passed 16; impact-accounting and scenario-repair-preview recheck passed 10.
- Studio CLI timing: `pnpm --filter @admin/studio-cli exec vitest run src/jobs/repair-session-context.test.ts --maxWorkers=1 --minWorkers=1` passed 7 in isolation.

The proof sweep executed 89 gate commands (`verification/proof-sweep.json`): 84 initially passed, with two attention-anchor entries, two metric-registry entries and committed-dist freshness failing. Restored the existing `economy-commodities` anchor; attention proof passed. Regenerated the metric-registry report for the added state reader; its proof passed. No gates were weakened. The committed-dist proof still requires committed output and is not claimed passing in this uncommitted worktree.

Supplementary generated-output check: `pnpm exec tsc -b --force packages/contracts packages/world packages/design packages/player-core packages/ui-web packages/engine packages/content services/api studio-cli` exited 0 with no changes across 3,724 generated files at the earlier stable checkpoint (`overhaul-dist-check.json`). The palette build subsequently regenerated its changed design tokens. This does not substitute for the committed-dist gate. No balance run: no engine/balance change.

## Browser evidence and inspection

Used the existing `scripts/dev/shoot-screens.mjs`, a separate server on 5188 and disposable browser contexts; imported `gulf-oil-shock` through the actual Saves UI. The finite history and supplier links use actual player payloads.

- Core capture run: Economy, Brief, Security, Energy office and Record × six sizes × both themes (60 combinations).
- Retained-family captures: Nation, Budget, Policy, Emergency, Executive, Congress, Courts, Oversight, World, Press, Settings, Saves, Handbook and Digest × phone/desktop × both themes (56 combinations).
- Final pre-palette core captures: five core surfaces × phone/desktop × both themes (20 combinations).
- Palette revision: Economy, Brief and Security × 1440×900 / 390×844 × both themes (12 combinations). First-view light/dark Economy, dark Security and phone dark market continuation were opened and inspected; selected inspected images are preserved under `evidence/`. Other captured variants are not automatically certified as inspected. Intentional horizontal tab/choice/table scroll remains local; document/workspace overflow was not reported. Capture helper caps six scroll parts: all long-page tails are not certified.

`node /private/tmp/overhaul-live-check.cjs`: real imported campaign, Markets Axe WCAG 2 A/AA and 2.1 AA scan returned zero violations in both themes, no page errors. Separate actual rendered Nation lean-map scan checked a saved Protanopia setting and reload; standard red/blue changed to orange/blue. Before/after map captures were opened and visibly differed. Automated Axe covers the market workspace, not every player route or subjective comprehension.

COVERAGE.csv preserves every prior audited route with its earlier inspection and current implementation disposition. Retained routes receive shared foundations, not an implicit claim of a new composition or complete final-state review. Opening, ending, legacy, unavailable subjects, unseen tabs, errors and confirmation variants not exercised remain unverified. No fresh-player comprehension study or independent visual acceptance has been performed.

## Running review surface

`pnpm --filter @admin/web dev --host 127.0.0.1 --port 5188 --strictPort` remains running in the implementation worktree. HTTP 200 checked with `curl` for `http://127.0.0.1:5188/nation/economy?view=markets`. The original and audit worktrees received no implementation writes.

## Closing record

Inspection/reuse: answered above. Real validation path: executed with full-suite and committed-dist limitations disclosed. User-visible outcome: exercised through real save import, both-theme six-width journeys, actual map preferences and inspected representative captures. Shared-context adversarial review: accepted with controls in ADVERSARIAL.md. Full BL-136 visual acceptance remains open.
