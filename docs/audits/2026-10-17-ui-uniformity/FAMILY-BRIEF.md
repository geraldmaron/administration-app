# Family brief: the shared rules every route-family agent follows

This is the common half of each family agent's brief for the 2026-10-17 UI uniformity pass. Each agent's own prompt adds the files it owns and its journey fixes.

## Where and how

- Work only in the worktree `.claude/worktrees/ui-uniformity`. Never cd to the main checkout.
- Never `git add -A`. Never `git stash`. Do not commit; the lead commits.
- Edit only the files you own. If another family's file or a `packages/ui` primitive needs a change, say so in your report. Do not make it yourself.
- Do not run `--update-baseline` on any gate; the lead updates baselines once at integration.
- Commands you may run:
  - `pnpm --filter @admin/player run typecheck`
  - `npx eslint <your files>`
  - `node scripts/verify-reading-keys.mjs`, `node scripts/verify-heading-levels.mjs` and `node scripts/verify-spacing-tokens.mjs`, read-only, to see what remains in your files
  - `node scripts/verify-player-prose.mjs`
  - the screen harness against the worktree server
- Commands you may not run: `pnpm run build`, the workspace test, balance, and `tsc -b`. The exception is a player-core module you own: run its vitest file with `pnpm --filter @admin/player-core exec vitest run <file>`.
- The worktree dev server is at http://localhost:8099. Capture with:
  `node scripts/dev/shoot-screens.mjs --app player --port 8099 --out <scratch path>> --sizes 1440x900,390x844 --themes light,dark <routes>`
  Metro may not hot-reload `packages/ui`; your edits in `apps/player` reload.
- "Before" captures of every route are in `.../scratchpad/caps2/`, named `<route-slug>-<w>x<h>-<theme>-partN.png`. Look at the images. The pass is judged on the rendered result, not on the code.

## Read first

- `CLAUDE.md`.
- `docs/DESIGN.md` §1 "Shared patterns" and §3. The type is Source Sans 3 and Source Serif 4, per `packages/design/src/tokens/typography.ts`; DESIGN's Archivo and Geist names are stale.
- `docs/audits/2026-10-17-ui-uniformity/VISUALS.md`, `SURFACES.md` and `JOURNEYS.md`, including the Rulings at the end of JOURNEYS. Take the rows for your routes.
- The memory notes on quality, summarized:
  - Whole-row targets, good and bad cues, strict alignment.
  - Draw readings, not words in boxes.
  - No washed-out color: solid inks for data marks, and translucency only for interaction dimming.
  - Marks link to their subject.
  - Tables sort and page.
  - Choices are a results list, not a column table.
  - Analysis sits inline where the choice is made.
  - Two registers: interface copy is standard, helpers teach in everyday words.
  - American English and US units.

## Shared pieces to use

All are from `@admin/ui` unless a path is given. Read their source for the API.

- `ReadingFrame` and `Key` (`packages/ui/src/data/`).
- The key helpers: `meterKeyEntries`, `sparklineKey`, `fanKeyEntries`, `seatKeyEntries`, `segmentKeyEntries`, `rollKeyEntries`, `ridgeKeyEntries`, `tieKeyEntries`, `MONTH_KEY`.
- `BarScale`.
- `LawHelp` (`packages/ui/src/context/LawHelp.tsx`).
- `Peek` (`packages/ui/src/layers/Peek.tsx`).
- `ResultView` (`packages/ui/src/review/ResultView.tsx`).
- `Loading`, `Empty` and `ErrorState` (`packages/ui/src/primitives/States.tsx`).
- `go`, `back` and `BackButton`, from `apps/player/src/shell/navigate.ts` and `BackButton.tsx`.
- Handbook term door: `/handbook/terms?at=<term id>`. Glossary ids are in `packages/player-core/src/glossary/`.

## The rules you apply to every route and nested state you own

1. **Every drawn reading has a frame.** Every chart, meter, gauge, sparkline, bar, hemicycle, map, timeline and network sits in a `ReadingFrame`, or passes `help`, `legend` or `keyed`. The frame says what the reading measures, its unit and period, and has a key for every color, dash, tick and shape. It has a "how to read this" help with a Handbook term door where the glossary has the term. It shows a press hint when the marks open something. Band words such as "Even", "Fair", "Sound" or "Simmering" either show their ladder or are defined in the help. Never print a figure that contradicts its mark: "Even 59%" with the tick at 50% is a defect.
2. **No old shims.** Migrate off `PartyLegend`, `SegmentLegend`, `BarKey`, `PairedKey`, the nation `ShareBar`, the screen-local `LawHelp` copies and the app's `useReducedMotion` copy. Delete the screen copies you own.
3. **Headings.** The page title is level 1, the section is level 2 through `SectionHeader` or `Section`, and the card title is level 3. Nothing deeper. Equivalent sections across your screens use the same component and size.
4. **Spacing and radius use tokens.** No numeric padding, margin, gap or radius. No hand-built swatches; use `Key`.
5. **Depth.** Ground is sunken or base, panels are raised, and inspectors, sheets and peeks are elevated. Every primary panel keeps the same treatment within a screen and across your family.
6. **No zero-value filler.** Collapse "0 waiting" or "nothing to sign" cards into a single quiet line, or show them only when they have content. Say what the empty state means and what would fill it, with `Empty`. Loading and error use `Loading` and `ErrorState`.
7. **Mono only for strings a player copies.** Legal citations and case names are not copy strings. If the monospace comes from `LegalCitation` in `packages/ui`, report it; do not patch around it.
8. **Every entity name is a door.** A person, office, member, judge, state, country, bill, case, war, treaty, org or command name opens its subject. Inside a row that is itself a door, the name opens a `Peek` (ruling R1).
9. **Back uses `BackButton`** with a declared parent (ruling R2). No "Back to X" that pushes.
10. **The post-commit result is one `ResultView`** (ruling R3). It has:
    - the verdict;
    - the moved readings;
    - a Record door;
    - a primary "Next waiting matter" when one exists;
    - no Close step;
    - no duplicate doors.
    Merge the receipt variants in your files into it.
11. **Overflow and widths.** Nothing spills sideways at 390, and tab strips do not clip silently. Check 390, 768 and 1440 at least once.
12. **Dark theme.** Check every changed surface in dark.
13. **Wording.** Use one word per concept, matching BL-215 in `docs/BACKLOG.md`. Use the plain-language rules in `docs/CONTENT_DOCTRINE.md` §10.2.

## Report back, under 600 words

- The files you changed.
- Each fix, mapped to its VISUALS, SURFACES or JOURNEYS row.
- The before and after capture paths for the five biggest changes.
- What remains in your files from the three gates.
- The commands you ran, with their results.
- What you need from `packages/ui` or another family.
- What you could not finish.
