# Visual pass 2: icons, drawn readings and rich data

> **Current takeover rule — 2026-10-12:** This is historical evidence, not current visual acceptance. The owner requires application-wide visual-first layers, consistent help, target-only expansion, selectable themes and presidential review/processing. The current contract is `docs/audits/2026-10-11-simulation-depth/PROGRAM.md`, “Application-wide visual layers and presidential interaction,” and its handoff/BL-136/137. Light-only styling, previous polish claims, mandatory tool/agent assignments and bulk-first validation instructions here do not override that contract. Build with short local checks and batch expensive final validation; keep all work local with no additional cost. Historical counts/screenshots must be rechecked before use as current evidence.


Owner's direction, 2026-10-11:

- Several screens still lean heavily on text, with too few icons, visualizations and rich data.
- Some interfaces, such as the compare, look cheap and aren't what a professional application would ship.
- The player is a millennial President. The bar is a modern consumer-grade product, at the level of Linear, Stripe, Apple Health, Robinhood, Arc, or the FT and Reuters graphics desks. It should not read like a government form or a dashboard of words in boxes.
- Clean up the rough edges.

This brief binds every agent in the pass. It adds to `CONTRACT.md` in this folder, which still binds: tokens, type roles, valence, whole-row targets and alignment.

## The bar

1. **Draw readings; don't write them.** Every reading on a range, level, share, count over time, date or state gets a visual encoding:
   - thin range bars, 5-step scales, share bars, small multiples, sparklines where a real series exists
   - countdown rings for deadlines
   - status glyphs, hemicycles, flags and portraits
   - deltas with a sign and a valence color

   Words stay beside the mark, in visible text and in accessible text. A label plus a word in a tile ("Tension: Low") fails.
2. **Icons carry category and state.** Use the domain glyphs (`apps/web/src/shell/glyphs.ts`, gallery at `/dev/icons`) and the icons already in `packages/ui-web`. Every list row that names a kind of thing (department, instrument, policy area, matter type, outlet, nation) leads with its glyph, flag or portrait.
3. **Show the data the model already has.** Read the screen's player-core view model in full (`packages/player-core/src/...`). If a field exists and the screen hides it or turns it into a sentence, draw it. Never invent a number. If the screen needs data the view model doesn't expose, write it down as a data gap (file, field, why) in your report. Don't add it yourself.
4. **Professional, not gimmicky.** The owner rejected needle gauges, donut rings everywhere, saturated fills, colored card top strips and tracked caps as gimmicky. The target is:
   - flat, slim marks with hairline borders
   - big tabular figures
   - restrained color, with color used to mean something (valence, party, selection)
   - consistent spacing, aligned columns, no overlaps, nothing wrapping mid-value
5. **Comparisons look like a product decision table.** Options sit side by side as columns or cards of equal height. Each row is one attribute: cost, odds, risk, time, who objects, effects. The figures are drawn as bars or scales on one shared axis per row, so the eye reads across. The better value is marked with valence. The recommended or default option is flagged. Unchanged rows can collapse. A phone stacks the options with the attribute bars kept.
6. **Phone and desktop both:** compose at 1440×900 and 390×844, then check 1280×800 and 320px reflow.

## How to work

- **Look first.** The dev server is at http://localhost:5173. Screenshot your routes before and after:

  ```bash
  node scripts/dev/shoot-screens.mjs --out <your scratch dir> --fixture <name> --sizes 1440x900,390x844 <routes...>
  ```

  Fixtures are in `apps/web/tests/.fixtures/` (for example `week-30`, `washington-chairs`, `domestic-flood`, `failing-cr`, `court-challenge`, `senate-50-50`, `gulf-oil-shock`, `inflation-shock`). Open the PNGs and look at them; a passing build is not visual approval. The tool also reports overflow and spills. Fix every one on your routes.
- **Before writing,** read `packages/ui-web/src` (the primitive inventory) and `apps/web/src/shell`. Reuse what exists. Don't add a second variant of a primitive. If one is missing, build it inside your own folder and name it in your report as a candidate to promote.
- **Files:** you own only the files listed in your assignment. Every other file belongs to someone else. If you need a change in a file you don't own, report it; don't make it.
- **Never:**
  - run `pnpm build`, `pnpm typecheck`, `tsc`, `eslint`, the full test suite, the balance harness, the `verify-*` sweep or Playwright e2e
  - run `git add`, `git commit`, `git mv`, `git rm` or `git stash`

  Use plain `mv` and `rm`. You may run vitest on the test files in your own folders (`pnpm --filter @admin/web exec vitest run <path>`) and update those tests for your changes.
- **Report back** in under 400 words:
  - routes changed, with what is now drawn that was text
  - before and after PNG paths
  - data gaps
  - primitives you built that should be promoted
  - anything you saw outside your files
