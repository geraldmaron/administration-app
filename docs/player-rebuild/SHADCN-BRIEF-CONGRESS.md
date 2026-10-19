# Brief and Congress integration checkpoint — draft

The canonical President’s Brief owns the current desk, actual calendar dates and historical weekly evidence. `/brief/digest?week=N` redirects to `/brief?view=history&week=N`; no second Digest screen remains. Existing digest readers, state movers, weekly changes, grouped actions and wire evidence remain the single data sources. Root integration owns shell navigation and date affordance.

Congress now has a real Overview rather than repeating its full map/charts before every focused working list. Bills, nominations, members, delegations and powers are separate URL-backed views. View changes preserve browser Back. The operating picture uses whole clickable icon/count surfaces for floor business, nominations and signature work.

The position visualization selects the entire −1 to +1 range with pointer or keyboard. Sparse tails cannot fail a density threshold. A slice includes every party at that position. All members and farthest-from-you views retain the most distant legislators; distance is explicitly economic-position context, never a vote commitment or personal relationship.

## Dependencies and reuse

Inspected CLAUDE.md, DESIGN.md, PLAN.md and existing Brief/digest/Congress routes, readers, tests, shared Door/Card-door/Series/Collection/Tabs APIs. No engine, dataset, stored campaign or save changes. No new dependency. Existing navigation `place.digest()` now resolves the canonical Brief history view. Calendar uses `runningClocks` actual dates; it invents no appointments.

Own worktree dependency clones produced two React runtime copies because this checkout is nested under the primary repository. Browser reproduction showed a blank page and `useSyncExternalStore` failure; the built source map confirmed two React paths. Vite `resolve.dedupe: ["react", "react-dom"]` removed the browser failure. Vitest external dependencies still load mixed instances in this isolated copy, so root integration must rerun affected SSR tests. The unproven Vitest dedupe experiment was removed.

## Validation

Check: Complete workspace build before typecheck.
Command: `pnpm run build` (Node 22 PATH)
Result: pass
Observed: All workspace build scripts completed; web emitted the pre-existing large-chunk warning.

Check: Complete workspace typing.
Command: `pnpm run typecheck`
Result: pass
Observed: Every package completed. Subsequent `pnpm --filter @admin/web typecheck` passed after Congress view changes.

Check: Complete workspace lint.
Command: `pnpm run lint`
Result: pass
Observed: Every package completed. Subsequent `pnpm --filter @admin/web lint` passed.

Check: Focused search/calendar/Congress unit and render contracts.
Command: `pnpm --filter @admin/web test -- src/brief/search.test.ts src/brief/calendar.test.tsx src/washington/congress/aisle.test.tsx src/washington/congress/congress.test.tsx src/washington/congress/screens.test.tsx`
Result: fail
Observed: 17 passed, 21 failed from duplicate React useContext in both existing and new SSR tests. Root single-source rerun required; no mock or gate was weakened.

Check: Actual user journeys across six widths and both real themes.
Command: From apps/web: `E2E_ATTACH=1 E2E_PORT=5192 node node_modules/playwright/cli.js test tests/brief-congress-rebuild.spec.ts --project=mobile-320 --project=mobile-390 --project=tablet-768 --project=desktop-1280 --project=desktop-1440 --project=desktop-1920`
Result: pass
Observed: 12/12 passed. Own fixture campaign imported through actual save UI. Calendar month navigation/today, legacy week redirect, history rendering, workload navigation/Back, keyboard Home/End full-range selection, farthest members and no horizontal overflow verified; no page errors. Real `emulateMedia` theme is asserted on html. Using the primary installed runner avoids two Playwright Test instances while testing isolated source on port 5192.

Outcome: A player can use one Brief for current work, recorded calendar dates and prior weeks, then open Congress workload and inspect legislators at either end of the scale.
Surface: Browser on isolated built source, 320/390/768/1280/1440/1920, light and dark.
Data: Existing case-families campaign fixture, actual engine save and presentation readers.
Observed: All named journeys completed. Calendar mobile light/dark and history desktop top were manually inspected. Full source diff reviewed; generic Record/Explore footers and standing/roll-call disclosure folds removed.
Verdict: proven for these journeys; final shadcn visual acceptance awaits foundation integration.

## Remaining integration controls

- Foundation remains root-owned. This branch composes retained shared APIs; screenshots are the pre-foundation styling, not a shadcn migration sign-off.
- Root must remove separate Digest shell entry and link top date to `/brief?view=calendar`.
- Shared Series still has a Read every observation disclosure: root/foundation must replace it globally with the common evidence inspector.
- All member/committee/dossier links keep actual recorded destinations. Bill/post detail source reviewed and native roll-call/outreach folds removed; their complete authorize/receipt visual journeys are unverified in this slice.
- Congress ridge/map/seat and member filters are now URL-backed; the follow-up record below verifies dossier return and reload. Aisle table column sort and pagination retain their existing transient behavior.
- Calendar keyboard buttons use normal focus order; a full arrow-key calendar-grid interaction has not been added. Native range provides keyboard parity for congressional positions.
- Unchanged lower history content, missing-week/older-history variants, nomination/bill action variants, enlarged text and reduced-motion matrix remain integration checks. Existing underlying data/renderers are reused; no complete-family acceptance is claimed.

Challenge: the strongest failure would be treating policy distance as actual opposition. Control: explicit economic-position wording, all parties selectable and unknown commitments retained. Best alternative was targeted tail repair alone; separating overview from task lists also removes repeated mobile navigation overhead. Verdict: accepted with the controls above, not release-ready.

## Congress return-context follow-up

A validated `CongressSearch` extends the route's existing search contract. It retains each chamber's preset/range, map lens, seat coloring, selected delegation/seat, member chamber/query and member sort direction. Unknown values, invalid states and off-scale ranges are rejected. Filter updates replace the current URL; view changes preserve every filter and add a history entry. Opening a drawn seat first records the source selection, then opens its real dossier. The existing departure helper now accepts HTML or SVG elements; all methods it uses (`closest`, `getAttribute`, `id`) exist on both. Back restores focus to the drawn seat.

Pruned the retired `dg-actions` name in favor of the real run-acknowledgment action, removed redundant Open buttons inside already-clickable stop cards, and replaced the remaining generic read-the-run footer with an inherent card destination. Actual last-run acknowledgment remains available; this is not unused functionality.

Check: Follow-up source build.
Command: `pnpm run build`, followed after final changes by `pnpm --filter @admin/web build`.
Result: pass
Observed: Full workspace build and final web build completed; only the known chunk warning remained.

Check: Follow-up typing and lint.
Command: `pnpm --filter @admin/web typecheck` and `pnpm --filter @admin/web lint`.
Result: pass
Observed: Both completed after the context and SVG-signature changes.

Check: Canonical query contracts.
Command: `pnpm --filter @admin/web test -- src/washington/congress/search.test.ts src/brief/search.test.ts`.
Result: pass
Observed: 2 files, 5 tests passed.

Check: Dossier return, focus and reload across all supported widths.
Command: From apps/web: `E2E_ATTACH=1 E2E_PORT=5192 node node_modules/playwright/cli.js test tests/brief-congress-rebuild.spec.ts --grep 'source context'`.
Result: pass
Observed: 6/6 passed. Actual chart seat→dossier→Back retained selected seat, −1 House range, Senate opponents and map lens; drawn-seat focus returned. Reload retained source selection. Member search for Wyoming with Senate filter and descending State sort survived dossier→Back and reload, with two matching seats. No horizontal overflow.

Outcome: A player can investigate a legislator and resume the same congressional analysis rather than rebuilding their filters.
Surface: Built application at port 5192, disposable case-families campaign, all six viewport sizes.
Data: Actual chamber membership and person dossiers in the fixture save.
Observed: Source address, controls, selected-seat marking, focus, row count and sort were retained.
Verdict: proven for tested journeys. Final root shadcn visual integration and the earlier SSR external-module issue remain separately gated.

## Founding redaction correction

Source inspection found raw procedural face thumbnails bypassing the shared Portrait's default redaction. Removed the only player FaceBuilder consumer and the FaceBuilder component, plus 107 lines of selectors with no remaining consumers. The shared portrait rendering library remains because other code and the developer gallery still use it. Person identity retains the same age range, gender presentation, pronouns, home state, school and heritage choice. Heritage uses the existing encoded `portraitRef` and deterministic profile helpers; no saved shape changes. Identity, candidate and oath presentation now explicitly uses shared redacted portraits without computing hidden face renders. The root-owned ProfileQuestionnaire is untouched.

Check: Founding correction build, typing and lint.
Command: `pnpm --filter @admin/web build`, then `pnpm --filter @admin/web typecheck` and `pnpm --filter @admin/web lint`.
Result: pass
Observed: All completed, with the known web chunk warning.

Check: Existing encoded draft contract.
Command: `pnpm --filter @admin/web test -- src/founding/draft.test.ts`.
Result: pass
Observed: 11/11 passed, including retained portrait reference through age edits and presentation handling.

Check: Actual demographic/identity and oath surfaces.
Command: From apps/web: `E2E_ATTACH=1 E2E_PORT=5192 node node_modules/playwright/cli.js test tests/founding-redacted.spec.ts --project=mobile-390 --project=desktop-1440`.
Result: pass
Observed: 4/4 passed. Name, actual age and East Asian heritage remained selectable; identity and oath used redacted portraits; raw procedural SVG images/editor tabs/New face controls were absent; oath stayed enabled and pages did not overflow. Dark desktop identity capture manually inspected. This does not certify all setup stages or final root shadcn styling.

The old congress-members browser selector expected a native details summary for recorded passage. It now checks the visible passage panel and recorded tally while retaining Yea, reload and overflow assertions; that full fixture journey still needs root integration execution.

## Bounded Record investigation and signed-rate correction

Arcs and impact assessment cards now open the existing shared Sheet. Arc investigation reads the exact stored family and joins its chapter scenario IDs only to cases whose content pin names that scenario; absent original briefings remain explicitly unavailable. Country/state destinations use native subject routes and shared flag/button identity. Assessment investigation reads only filed public report ranges, basis, confidence and retained revisions. An originating act is linked only when the stored `causedBy` resolves through the canonical `recordEntry` reader. Internal event totals are not displayed.

Legacy comparisons and histories retain negative rates using declared signed domains, a zero marker and accessible scale labels. Inflation movement is neutral: falling into deflation is not automatically marked favorable. A validated completed-campaign fixture retains 2% and −3% inflation observations before its ending date. Legacy timeline marks stay noninteractive: their existing presentation model does not carry a guaranteed recorded-event pointer. No label/date/entity guess is presented as provenance.

Check: Initial Record implementation build, typing and lint.
Command: `pnpm --filter @admin/web build`, `pnpm --filter @admin/web typecheck`, `pnpm --filter @admin/web lint`.
Result: pass
Observed: These completed on the implementation before the final flag/button context refinement. Final source checks remain the root integration requirement.

Check: Actual negative-rate campaign reading and scale.
Command: `pnpm --filter @admin/web test -- src/record/legacy-scale.test.ts`.
Result: pass
Observed: 2/2 passed, including completed campaign inflation samples of 2% and −3%, signed bar positions, entirely negative series and fixed approval scale.

Check: Existing save contract for richer data fixtures.
Command: `node scripts/make-fixture-saves.mjs --only record-investigations,legacy-negative-rates`.
Result: pass
Observed: Both save fixtures generated and round-tripped through createSave/loadSave. The incident uses the engine's public impact calculation and filed reporting; the arc links an actual preserved case. No scenarios were authored or published.

Check: Record inspection and negative-history browser journeys.
Command: From apps/web: `E2E_ATTACH=1 E2E_PORT=5192 node node_modules/playwright/cli.js test tests/record-investigations.spec.ts --project=mobile-390 --project=desktop-1440`.
Result: pass
Observed: 4/4 passed in real light/dark modes. Preserved chapter/subject links, actual originating event, report history and basis, Escape focus return, negative inflation values and scale, neutral movement and no horizontal overflow were verified. Stable capture uses animations disabled; phone assessment Sheet and desktop signed comparison were inspected. The final chip refinement requires root-integrated captures.

Outcome: A player can investigate the actual subject and filed evidence behind an arc or assessment, and see deflation without clipping it to zero or marking it automatically favorable.
Surface: Record Arcs/Assessments and completed-campaign Legacy comparison, 390/1440 light/dark.
Data: Round-tripped engine-compatible fixtures using a preserved briefing, calculated incident reports and explicit negative historical rate samples.
Observed: These journeys passed on the pre-chip implementation. Original missing chapter snapshots, missing cause pointers and absent timeline provenance remain honestly noninteractive or unavailable.
Verdict: functional journeys proven; final shared-shadcn integration and chip-refinement visual check remain root gates. No engine, dataset or save schema changes; no expansion beyond this Record slice.
