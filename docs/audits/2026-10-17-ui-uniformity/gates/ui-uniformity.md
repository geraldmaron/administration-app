# Gate: UI uniformity pass (BL-237), 2026-10-17

Branch `claude/ui-uniformity`, worktree `.claude/worktrees/ui-uniformity`. Base `f681d3f04` plus the chart reference-line commit `81bb08e23` and the act-workspace commits up to `86a494a0e`.

## What was run, and what it showed

| Step | Command | Result |
|---|---|---|
| Clean build | `find . -name tsconfig.tsbuildinfo -not -path '*/node_modules/*' -delete && pnpm -r --filter '!@admin/web' run build` | Pass |
| Typecheck | `pnpm -r --filter '!@admin/web' run typecheck` | Pass |
| Lint | `pnpm run lint` | Pass |
| Proof gates | `for g in scripts/verify-*.mjs; do node "$g" \|\| echo "FAILED: $g"; done` | All pass once `dist/` is committed (`verify-dist-freshness` then reports no diff in 9 projects) |
| Workspace tests | `pnpm -r --filter '!@admin/web' run test`, then per package | engine 4640 passed, 1 skipped; content 1047; world 560; ui 60; ui-web 92; design 26; api 32; contracts 1; player 210; player-core, see below |
| Player-core | `npx vitest run` in `packages/player-core` | 1669 passed in 212 files, twice |
| studio-cli | its suite | 359 of 360 in the workspace run; `repair-session-context.test.ts` hit its 90-second timeout under load from three parallel runs and passes alone, 7 of 7. This branch does not touch studio-cli. |
| Doors | `src/shell/doors.test.ts` (51 fixture saves) | Pass, about 15 minutes |

## Not run, and why

- **`pnpm run build` for `@admin/web` fails.** `4c2ee4b25`, before this branch's base, removed the keep-the-same option from player-core while about 40 legacy call sites still use it. Recorded as BL-238. Every other package builds.
- **The balance harness** (`pnpm --filter @admin/engine run test:balance`) was not run: this pass changed no engine scoring, opinion, removal, impact or cabinet constants.
- **Native builds and on-device runs** were not run. All checks are on the web build in Chromium.
- **The legacy e2e suite** was not run: legacy is frozen and does not build (BL-238).

## Visual and journey verification

- **Before:** `scripts/dev/shoot-screens.mjs --app player` against the week-30 fixture. 31 routes at 1440×900 and 390×844 in light and dark.
- **After:** the same 31 routes at those sizes, plus 320×568, 768×1024, 1280×800 and 1920×1080 in light.
- **Final sweep:** 18 routes at 320, 390 and 1440. No page scrolls sideways and there are no console errors. The `wide` flags that remain are sideways strips and tables that scroll by design.
- **Independent review:** a reviewer who did not build the work compared every route before and after. All ten defects it ranked were addressed in a second round, except the parts recorded in BL-240.
- **Walked live at 1440 by the lead:** Brief, then the lead decision, the answer, the presidential review, confirm and the one result view, with no not-found flash and the next matter offered. An old `?power=1` state address redirects to `/nation/state/CA/act`, and a cold-link Back names its parent.
- **Landing doors:** fourteen of the 29 corrected Brief and notification doors were checked live by Playwright, each landing its target in view.

## Rulings that shaped the work

The owner's rulings and the lead's reversible defaults are at the end of `JOURNEYS.md`.

## Player-core suite

The suite passed 1669 of 1669 tests in 212 files on both full runs: after the door fixes, and again after the second round.
