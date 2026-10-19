> Historical Material first-slice record. It does not certify the superseding shadcn integration; see `SHADCN-INTEGRATION.md`.

# Rebuild checkpoint verification — October 15, 2026

Status: first vertical slice implemented; broad application rebuild remains open under BL-136. Historical temporary-worktree results are not counted.

## Inspected scope and reuse

Read `CLAUDE.md`, the design/plan/backlog, shared form/button/layer/reading APIs, action catalogue/configuration/preview/build, action workspace, war presentation readers/executors and existing browser journeys. Searched the repository's existing shared components, institution artwork and semantic icon registry before adding anything. Extended the canonical Button and Choice surfaces, Sheet, Steps/Bar, Flag, Collection, existing projection/authorization/receipt executors and tariff trade model. No second simulation or renderer was introduced.

Blast radius: shared button styling/theme/hit areas and workspace background; foreign-action layout and route-instance identity; tariff catalogue/config/preview/build and repeated-order identity; conflict presentation. Existing save record shapes remain unchanged. Deterministic tariff IDs now preserve repeated same-turn orders and exact retaliation causes; `SCHEMA.md` and `ARCHITECTURE.md` document this change.

## Checks

All commands use the existing Node 22 installation on PATH.

Check: Workspace compilation, before typecheck
Command: pnpm run build
Result: pass
Observed: Every workspace build completed. Vite still reports large bundles; loading-performance acceptance is not claimed.

Check: Workspace types after final product source
Command: pnpm run typecheck
Result: pass
Observed: All workspace typecheck tasks completed.

Check: Workspace lint
Command: pnpm run lint
Result: pass
Observed: All workspace lint tasks completed.

Check: Web unit suite
Command: pnpm --filter @admin/web test
Result: pass
Observed: 69 files, 446 tests passed.

Check: Shared UI suite
Command: pnpm --filter @admin/ui-web test
Result: pass
Observed: Six files, 89 tests passed, including native Material button semantics.

Check: Design token suite
Command: pnpm --filter @admin/design test
Result: pass
Observed: Two files, 23 tests passed, including token projection and palette checks.

Check: Tariff selection, invalid configuration, catalogue compatibility and receipts
Command: pnpm --filter @admin/player-core exec vitest run src/act/catalogue.test.ts src/act/config.test.ts src/act/preview.test.ts src/act/workspace.test.ts
Result: pass
Observed: Four files, 70 tests passed.

Check: Real trade execution and repeated-order identity
Command: pnpm --filter @admin/engine exec vitest run src/trade.test.ts
Result: pass
Observed: 40 tests passed. Before correction, two same-turn rates of .25 and .15 left .15; after correction both persist, total .40, with separate lift/provenance and deterministic IDs. No treasury charge is invented.

Check: CSS architecture and rejection proof
Command: node scripts/verify-css-architecture.mjs; node scripts/verify-css-architecture-proof.mjs
Result: pass
Observed: Shared Material cascade layer accepted; no forgiven CSS findings. Proof rejects the prohibited architecture breaks.

Check: Shared primitive use and rejection proof
Command: node scripts/verify-unused-primitives.mjs; node scripts/verify-unused-primitives-proof.mjs
Result: pass
Observed: 50 exported parts, 50 used at player surfaces; zero forgiven. Proof cases passed.

Check: Web boundary, player units and file sizes
Command: node scripts/verify-web-boundary.mjs; node scripts/verify-us-units.mjs; node scripts/verify-file-size.mjs
Result: pass
Observed: No prohibited web imports, no unit findings, no new oversized logic files.

Check: Browser journeys at all supported widths and both themes
Command: E2E_ATTACH=1 E2E_PORT=5189 pnpm --filter @admin/web exec playwright test tests/rebuild-workspaces.spec.ts tests/tariff-goods-journey.spec.ts --workers=2
Result: pass
Observed: 36 checks passed at 320, 390, 768, 1280, 1440 and 1920. Selected plan, responsive alternatives, whole-card war-option selection, focus return, actual trade-category selection, reload and exact-goods/rate authorization receipt were exercised in disposable profiles. Earlier expanded run was interrupted after a wrongly scoped test locator hung; correcting that locator produced this pass without increasing timeouts.

Check: Final representative navigation/captures and existing war lifecycles
Command: E2E_ATTACH=1 E2E_PORT=5189 pnpm --filter @admin/web exec playwright test tests/rebuild-workspaces.spec.ts tests/world-sets.spec.ts --grep 'workspace:|A war:|The President' --project=mobile-390 --project=desktop-1440 --workers=2 --output=/private/tmp/admin-rebuild-regression-results
Result: pass
Observed: 12 checks passed. Actual entry, War Powers report, exit and settlement execute on 390px and 1440px. Final action/war captures were refreshed and section navigation places its target heading inside the viewport.

Check: Full workspace aggregate, full proof sweep, balance and committed-dist freshness
Command: Not run at this partial rebuild checkpoint
Result: not run
Observed: The entire application rebuild remains open. The final stable integration checkpoint must run the repository's complete gate sequence. No commit was requested; committed-dist freshness cannot establish this uncommitted tree as shipped. Balance and aggregate regressions remain a release risk.

## User-visible proof

Outcome: A President can compare and configure a real foreign-policy action or tariff, and investigate a conflict through participants, assessed conditions, theater, evidence and decisions at phone and desktop sizes.
Surface: Live Vite app at port 5189; action, tariff and war routes.
Data: Existing engagement-week and war-joined campaign exports, imported through the actual saved-administration UI into disposable browser profiles. User campaign was not authorized or overwritten.
Observed: The 36-check matrix passes across both themes and six widths. Tariffs preserve lower-ranked selected goods through reload and an actual authorization receipt. Unknown conflict readings remain explicitly unassessed. Reconstructed war actions retain existing review/receipt executors.
Verdict: proven for the covered slice; broad application rebuild and every unvisited state remain unproven.

## Visual inspection and challenge

Inspected captures under `captures/`: phone light/dark action and war compositions, 320px reflow and desktop 1440px selected-plan/war overview. Corrected the inherited tinted primary workspace background to the white/navy base, added direct selected-action facts and ordinal readings, supplied the sourced Department of Defense identity where relevant, and removed the unused stage rail/number styles. Automated reflow checks span six widths; this is not a claim that every captured pixel or every application page has received visual approval.

The bounded review found duplicate inline/drawer heading IDs, an inherited 64rem action width cap and a four-column tariff ledger footer missing its colspan. All were corrected. A further route boundary now keys the action workspace by nation, keeping a previous country's local receipt state from carrying into a different country. Source review found no displayed rough-headcount strength ratios or fabricated war front lines. Shared-context review is disclosed; Material foundations were self-reviewed by their author.

Verdict: accepted with controls for the covered rebuild slice. Prefer current domain readers and execution paths; recover behavior selectively. Do not certify the broader application from these representative routes.

## Closing gates

1. Project inspected and blast radius named above.
2. Reuse checked against existing shared controls, media, readers and execution paths.
3. Validation executed as recorded; no full aggregate claim.
4. Covered live outcomes observed using realistic saved campaigns.
5. Representative captures inspected; whole-application visual gate not done.
6. Product/test diffs reviewed; obsolete rail CSS removed, no validator baseline weakened.
7. Residual risks: remaining route families and missing historical behavioral corrections require reconciliation; final aggregate/balance gates remain open; shell lazy-loading can leave chrome absent in early captures, so loading stability remains unaccepted. No deployment or publication.
