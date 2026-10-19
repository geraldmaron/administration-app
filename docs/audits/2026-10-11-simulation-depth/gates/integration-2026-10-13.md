# Integration checkpoint, 2026-10-13

One combined proof over everything landed after the interim checkpoint (`gates/interim-2026-10-13.md`): 36 commits from `df7d238ce` to `bd3321db7` on `codex/simulation-depth-completion`, local only, nothing pushed. Not a wave close-out; `scripts/pin-ledger.json`'s `currentWave` does not move.

## What landed

| Work | Commits | Item |
|---|---|---|
| A first blockade is an act of war; a standing blockade record; sourced Hormuz and Bab el-Mandeb flows reach prices; dependence weights; a real hit-back | merge `6832dd1a5` | BL-145 (closed earlier) |
| Registry R0 and R1: approval unwritable by type; reader claims as checked `path#declaration` sites; kinds and write policies; the extractor and its committed report; `verify-metric-registry` with a proof twin and a shrinking baseline (207 → 89 forgiven); six loose patches typed | `28ff5d2ef`, `dfcd21345`, `b6026fa0d`, `c3920230b`, `6fa05ec4d`, `4e6ba66e7` | BL-143 |
| `scenarios validate` judges a directory against the arcs the committed bake closes; the publish gate passes; two known-failing review pins removed and the review snapshot re-taken | merge `e26f508ba` (`0d64c3a6c`) | BL-119 |
| War losses from committed forces and the enemy, killed and wounded apart, killed reach population; decisive ends reachable with a successor seated; reach from bases and treaty allies | merge `4d95a3e19` | BL-144 |
| Grounded casting's first change: a fit-weighted state draw, arcs and flag callbacks returning to their opener's place, the place reaching effects and the Record, domestic straits to a US port, foreign cities only where they exist | merge `73e19ad2e` | BL-147 |
| The weekly phases' clock: impact events and the War Powers continuing bill read the week's close, not their office day | `b8a3d9e07`, `593b3f27d` | DECISIONS §2.3, §2.4 |
| Unified appointments: a relevant pool per seat with sourced hard rules, one nomination path for every Senate-confirmed seat, generated benches, a per-senator Senate count, the desk and its shared seat row | `ea5c1d9bd`, `cca6efef6`, `26e935d2c` | BL-152 |
| Integration fixes: the contested-nominee fixture, registry claims, the history allowlist, the Hill pin re-taken with each move traced to a commit, the e2e helper's War Powers branches | `3c568f443`, `4e6ba66e7`, `2e4331510`, `cff580857`, `02beb9ff4` | — |
| Owner balance decisions: removal checked over a full term; a pace shift converted to whole days the same way in both directions; R1.1 at 36 seeds in three party files run in parallel | `1593ff4da`, `90669b94f`, `d43a3db4c` | BL-137 |
| Owner answers to all 29 open questions, recorded | `2e8159259` | `docs/audits/2026-10-12-data-model/OWNER-QUESTIONS.md` |

## What was run, on the final tree, in one pass

| Step | Command | Result |
|---|---|---|
| Clean | delete every `tsconfig.tsbuildinfo` | done |
| Build | `pnpm run build` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Lint | `pnpm run lint` | exit 0 |
| Test | `pnpm run test` | exit 0: engine 4,542, player-core 1,451, content 1,011, world 550, web 448, studio-cli 360, studio 92, ui-web 77, api 32, design 23, contracts 1, desktop 1 |
| Registry report | `node scripts/report-metric-registry.mjs` | regenerated and committed |
| Gates | every `scripts/verify-*.mjs` except the two dist-freshness scripts | 87 of 87 |
| Balance | `pnpm --filter @admin/engine run test:balance` | 137 passed, 1 failed, 4 skipped; 4,480 s wall |
| e2e | `pnpm --filter @admin/web exec playwright test` (six widths) | 618 of 618 |
| Dist | commit `bd3321db7`, then `node scripts/verify-dist-freshness.mjs` | OK: a forced rebuild produced no diff in 9 projects |

The one balance failure is H3 ("consolidation against careful play spends less of revenue on interest by the end"), failing the same way before today (BL-137).

## How the pass was reached

Three earlier combined passes on this tree found what this one proves fixed: the contested-nominee fixture broke e2e setup after the Senate-count change; five registry claims pointed at a function that delegates its reads; the history gate lacked the appointments folder; a second office-day difference in the War Powers bill; four appointments specs never before run (two product defects: the office page discarded the nomination receipt, and an empty seat could never reach the Brief); and three balance checks that today's intended changes moved, each settled by the owner rather than by loosening a bar. Separate per-branch builds and test cycles were stopped on the owner's direction; every result above comes from the one pass.

## Not run, or open

- The dark-theme browser matrix.
- The owner's 29 answers that need building are mapped to backlog items (BL-143, BL-146, BL-147, BL-148, BL-151, BL-153, BL-154); none is built in this checkpoint beyond what the table lists.
- `.github/workflows/balance-harness.yml` still has `timeout-minutes: 60`, shorter than one R1.1 party file; the workflow is disabled.
