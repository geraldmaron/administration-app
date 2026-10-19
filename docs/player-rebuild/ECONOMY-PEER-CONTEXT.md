# Economy country comparison context — integration candidate

2026-10-15. Bounded follow-up to `8e1528b27`. This closes the source gap noted in `ECONOMY-INLINE-COMPARISONS.md`: country choices and historical-year windows were component-local state. It does not claim final browser acceptance.

## Change and controls

`marketSearch` now validates `peers` with the existing player-core `normalizePeers` and `peerWindow` with the existing `WINDOW_PRESETS`. Unknown and duplicate country identifiers are removed; the existing four-country maximum applies. An explicit empty list remains empty, preserving the reader's “Choose at least two countries” response instead of silently selecting defaults. Known but unavailable historical windows retain the reader's exact refusal; no data are substituted.

The existing route search controls the country comparison and its supplemental population-growth reference. Selections survive basis changes and are encoded in the URL for reload. Country/year edits add browser history entries; other Economy presentation edits keep the previous replacement behavior. No engine, dataset, save-schema or dependency changes.

Strongest failure: malformed country URLs could produce a different comparison than the controls indicate. Accepted with controls: canonical pack normalization, explicit-empty preservation and controlled props. The best alternative was keeping local state with a persistence effect, which would leave a second source of truth and make Back restoration race with URL initialization.

## Inspection and verification record

- Inspected the primary checkout's clean status and matching Economy search contract before editing this isolated worktree. Read Economy route, Compare/ComparePeers, Readings, market search and tests, player-core normalization/window/availability behavior, the current project engineering instructions and design brief. Searched for existing peer/search capabilities; reused the canonical reader and parser rather than adding a parallel model.
- `pnpm --filter @admin/web exec vitest run src/nation/economy/market-search.test.ts`: passed six tests. Coverage includes selected rate/basis, peer/year serialization, retention through unrelated edits, duplicate/unknown/excessive identifiers, explicit empty peers and invalid windows.
- `pnpm exec eslint apps/web/src/nation/economy/Compare.tsx apps/web/src/nation/economy/ComparePeers.tsx apps/web/src/nation/economy/EconomyScreen.tsx apps/web/src/nation/economy/Readings.tsx apps/web/src/nation/economy/market-search.ts apps/web/src/nation/economy/market-search.test.ts apps/web/src/routes/nation.economy.tsx apps/web/tests/economy-observatory.spec.ts`: exited 0.
- `git diff --check`: passed. Full source/test diff reviewed; scope is the comparison context, with no secrets or campaign saves included.
- Added real-browser assertions to the existing Economy journey for country selection, year selection, reload, two-step Back/Forward and changing evidence basis. These assertions have **not been run** in this slice.

Build, typecheck, full lint/tests and live surface/browser inspection are **not done for this candidate**, per the coordinator's instruction to avoid competing with active balance work. The integration owner must run the repository's build-before-typecheck sequence and stable checks, then the updated `economy-observatory.spec.ts` in both themes at 320 and 1440. Inspect that the same country selections/year window remain displayed after reload, Back/Forward, and basis changes, including empty and unavailable states. Residual risk: source/unit checks do not prove router history behavior or rendered state; the new actual-surface journey is required before claiming that outcome.

Local checkpoint only, explicitly authorized by the owner through the coordinator. No push or pull request.
