# Integration checkpoint, 2026-10-14

One combined proof over the six lanes merged after `011d0c042` and the integration fixes on top of them, on `codex/simulation-depth-completion`, local only, nothing pushed. Not a wave close-out; `scripts/pin-ledger.json`'s `currentWave` does not move.

## What landed

| Work | Merge / commits | Item |
|---|---|---|
| The electorate as five partisan blocs with symmetric seeded party shares; a polarization stock; cohorts as bloc mixtures and turnout as bloc composition; coalitions retired; the caucus on own identifiers and removal for inability; a hawk/dove force term; salience on change, one bill per cause, recurring writers budgeted; save v66 | merge `759316b3f`; `26029aef1` (war rally as an impulse) | BL-146 |
| Three blocs shown, why each bloc moved, the polarization stock panel, the caucus and inability readouts, glossary | merge `69c90873f`; `9c50c4a34` | BL-146 |
| Regime change's first slice, the operation choice on the act screen, other governments' starts on the shared tempo ledger | merge `c03e17d98`; `f14cf2e13`, `a867688fb`, `1410a6dc8`, `5b0c87d09` | BL-148 (closed), BL-158 |
| Metric registry R2 | merge `685f4d9c1`; `937bf9505` | BL-143 |
| Coercion and war follow-ups; the two shock fixes | merge `2b0541b1c`; `6e052172b`, `221357a2b` | BL-151, BL-154 (closed) |
| A thread pinned at its opener's raise; the governor effect and its remembered tilt; the 20-scenario pilot | merge `bca5a9efc`; `445d40789` | BL-147 |
| Scenario money from sourced appropriations (the parallel session's branch) | merge `465290c37` | BL-81, BL-155 to BL-157 |
| Integration fixes: state-campaign split under 800 lines, the gates the lanes tripped, the founding rail on the seed's party shares, the import cycles, the Hill golden re-taken with its reason | `84214a521`, `5ff885754`, `5b0c87d09`, `ba5a60960`, `0e29da729`, `0a288b7dd` | — |

## What was run, on the final tree

| Step | Command | Result |
|---|---|---|
| Clean | delete every `tsconfig.tsbuildinfo` | done |
| Build | `pnpm run build` | exit 0 |
| Typecheck | `pnpm run typecheck` | exit 0 |
| Lint | `pnpm run lint` | exit 0 |
| Test | `pnpm run test` | exit 0: engine 4,601, player-core 1,456, content 1,029, world 557, web 445, studio-cli 360, studio 92, ui-web 77, api 32, design 23, contracts 1, desktop 1 |
| Registry report | `node scripts/report-metric-registry.mjs` | regenerated and committed (`0a288b7dd`) |
| Gates | every `scripts/verify-*.mjs` | 89 of 89 |
| Balance | `pnpm --filter @admin/engine run test:balance` | 138 passed, 4 skipped, 0 failed (H2 and H3 included) |
| Dist | commit `70f59d34a`, then `node scripts/verify-dist-freshness.mjs` | OK |
| Fixture saves | `node scripts/make-fixture-saves.mjs` | 83 fixtures at v66 |
| e2e | `pnpm --filter @admin/web run test:e2e` (six widths) | 603 of 618 on the full run; the 15 failures fixed in `5d92ae451` and their four specs re-run at all six widths, 120 of 120 (80 at 320, 390, 768 and 1440; 40 at 1280 and 1920) |

## The e2e failures

- **A real defect:** at 200% text on a 320 or 390 phone, the Nation page's approval sum row (new this checkpoint) overflowed its surface by 171 to 241 pixels; it had no narrow-width rule. Fixed in `electorate.css`.
- **Pins the change moved by design:** the fixture now projects 412 electors on the steeper bloc ballot (349 before); the Record's polarization meter is named "Division against the 2020s level".
- **A helper gap:** a war the President joined held the week at tablet width, and the hold helper had no branch for leaving a joined war.

## Measurements behind the closes

- Brent, 12 seeds, passive, 208 weeks: weeks above $90 at 0 (200 before the buyer-share fix on the integrated tree; 135 before the lane). `docs/audits/2026-10-12-coercion-geography/FOLLOW-UPS.md`.
- Regime change, 12 seeds: other governments 1.17 operations a term; coup support falls Haiti and Venezuela in 3 of 12 runs, Canada in none by coup. `REGIME-SLICE-1.md`.
- The valence midpoint: at 0.60 careful play's term mean is 0.506 (inside the 2020s band) but the national books' H2 and H3 fail; at 0.52 on the same tree all 28 pass. Held at 0.52 (`0e29da729`), the move recorded on BL-146.

## How the pass was reached

Earlier passes on this tree found and fixed: a module-initialization cycle in the cohort composition tables; a cycle through the regime starter that dropped a re-exported binding under vite-node; the amending order's catalogue coverage and its missing predicate; a miscalibrated overreach that pushed the Attorney General's objection rate past its bound; twelve gate findings from the new code; a commodity double count that held Brent above $90 with no war on the board; and the midpoint's effect on the national books, settled by holding the dial rather than loosening a bound.
