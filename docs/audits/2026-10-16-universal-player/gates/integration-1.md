# Integration 1 gate record — 2026-10-16

**Status: partly closed.** The second wave's Nation, World and map work was still unreviewed when the session stopped (see HANDOFF.md).

## Run

| Check | Result |
|---|---|
| `pnpm run build` (clean, every tsbuildinfo deleted), after the first wave | exit 0 |
| `pnpm run typecheck`, `pnpm run lint` (whole workspace), after the first wave | passed |
| `apps/player`: `tsc --noEmit`, `eslint app src`, at the final commit | clean |
| Vitest, per area: preferences, notifications, calendar, authority, compare, seals, record, decision, review, congress, courts, oversight, handbook, executive, dossier, news, ui legislature, ui review | all passed when each was last run |
| `verify-renderer-boundary` (+ proof), `verify-file-size`, `verify-american-spelling`, `verify-adhoc-color-lint`, `verify-player-prose` (+ proof), `verify-seal-coverage` (+ proof), `verify-authority-citations` (+ proof), `verify-icon-registry`, `verify-unused-primitives`, `verify-css-architecture`, `verify-dist-freshness` | passed on the committed tree |
| `verify-no-history-references` | passes after the stray `apps/player/src/map/.verify/` folder was deleted |

## Not run

- The workspace test aggregate and the full 89-gate sweep after the second wave: the background run was stopped at its 30-minute limit and the tree was being edited by other agents. No result exists.
- The balance harness: no engine numbers changed except display landmarks (BL-164).
- The legacy `apps/web` browser suite.
- Any iOS or Android bundle or device run.
- The Nation, Compare, World and map screens in a browser (unreviewed).
