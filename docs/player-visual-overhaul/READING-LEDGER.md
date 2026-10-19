# Reading composition correction — 2026-10-14

Status: implementation verified on the named surfaces; aggregate test run passed. Owner visual acceptance and application-wide coverage remain open.

## Outcome and scope

A President sees compact labels, exact figures and meaningful graphics in aligned reading rows, rather than oversized percentage tiles; Congress uses one shared disposition axis and linked workload counts.

The owner's Congress screenshot disproved the preceding report's claim that removing KPI borders produced the requested compact operating picture. Its 18rem tile minimum caused a two-plus-one layout, with large figures and a bulky quiet-work enclosure. The earlier shared-context aesthetic verdict is superseded for this composition. This correction changes the composition, not merely its border.

Reuse: inspected ExecutivePulse, Stat/StatRow, Bar/BarRows and all player Stat consumers. Extended existing comparison layout and BarRows threshold marks. No new component variant, dependency, score, history, engine change or stored shape. Shared CSS affects Nation, World, Press, Security, Emergency, Oversight, command and conflict readings; country and state dossier stat bands now opt into the same ledger. Household cost/history panels remain outside this change.

Congress retains exact room/chamber figures and the 50% reference, with disposition explicitly distinguished from a vote forecast. Floor bills, Senate nominees and signature backlog link to existing URL-backed tabs. Actual urgent papers and subject links remain; quiet absence is represented by zero counts instead of a large empty-work narrative. Elections retain their actual timing. Member seats, caucus thresholds, party meanings and state selection remain separate visuals.

## Observable acceptance

- Comparison groups stack aligned rows at desktop and intermediate widths; no 18rem tile minimum or two-plus-one KPI wrap.
- Comparison figures use body text size, with units adjoining them, rather than display-size percentages.
- Congress's three bars share identical endpoints and a visible 50% reference; the weekly container has no rounded card fill or accent rail.
- Phone retains label and exact value together above the graphic, with readable evidence below. No document/work-surface overflow.
- Empty workload takes one linked count band; urgent bill and clock details remain available.
- Keyboard/native links, reduced-motion preference and back navigation retain the existing application contracts.

## Verification record

Check: build before typecheck, then lint
Command: `pnpm run build`; `pnpm run typecheck`; `pnpm run lint`
Result: pass
Observed: final rerun after country/state migration exited successfully. Logs: `/private/tmp/reading-build-final.log`, `/private/tmp/reading-typecheck-final.log`, `/private/tmp/reading-lint-final.log`.

Check: shared UI tests
Command: `pnpm --filter @admin/ui-web run test`
Result: pass
Observed: 6 files, 86 tests; comparison threshold rendering preserves the exact figure and marker. `/private/tmp/reading-ui-test.log`.

Check: web tests
Command: `pnpm --filter @admin/web run test`
Result: pass
Observed: 70 files, 450 tests in the dedicated run; the aggregate run repeated those 450 tests successfully after the final dossier opt-ins.

Check: populated Congress journey
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e washington-congress.spec.ts --project=mobile-320 --project=desktop-1440`
Result: pass
Observed: 4 passed; workload nominations tab and browser back, 535 member seats, linked state selection, actual bill signature/override workflow and leader action. `/private/tmp/reading-congress-e2e.log`.

Check: live layouts and accessibility
Command: `node /private/tmp/reading-browser.cjs`; `node /private/tmp/reading-details.cjs`; `node /private/tmp/congress-ledger.cjs`; `node /private/tmp/reading-reflow.cjs`; `node /private/tmp/reading-dossiers-final.cjs`
Result: pass
Observed: first sweep: 132 layouts across eleven routes, six widths and both themes, no measured overflow, page errors or Axe violations. Axe ran at 320, 845 and 1440. Added below-fold crop inspection for country power, Colorado people and Security readings at 845 in both themes after dossier opt-ins. Additional sweep: 36 layouts added 768px coverage and active-conflict readings at seven widths, both themes; zero overflow, Axe violations or page errors. Combined main ledgers: 168 layouts across twelve routes. The final country/state dossier opt-ins received a separate 28-layout rerun covering seven widths and both themes, also without overflow, Axe violations or page errors.

Check: applicable proof gates
Command: `node scripts/verify-css-architecture.mjs`; `node scripts/verify-web-boundary.mjs`; `node scripts/verify-disclosure.mjs`
Result: pass
Observed: zero CSS findings, clean shipping import graph, no new hidden person-score disclosure.

Check: aggregate repository suite
Command: `pnpm run test`
Result: pass
Observed: aggregate command exited 0; all twelve package suites passed. Engine 4542, content 1011 (one file skipped), player-core 1452, UI 86, web 450, CLI 360. `/private/tmp/reading-all-test.log`.

Check: diff
Command: `git diff --check`; `curl --max-time 10 --silent --output /private/tmp/reading-server.html --write-out '%{http_code}\n' http://127.0.0.1:5188/washington/congress`
Result: pass
Observed: no whitespace errors; server returned HTTP 200 and remains running in the isolated worktree. Source/style/test diffs inspected; unrelated prior-session work preserved.

Outcome: compact reading rows preserve exact data and subject destinations while eliminating the rejected oversized KPI composition.
Surface: actual player server on port 5188, disposable browser contexts.
Data: existing security-desk, day-one-orders, washington-chairs, case-families and active-conflict saves; actual engine-backed bill/leader journeys, no mocked commit.
Observed: inspected Congress 320/845/1440 captures, Nation phone/intermediate, World phone/desktop, Press intermediate, and country/state/Security below-fold reading captures in both themes. The oversized rounded Congress summary is absent; exact readings, aligned graphics and workload links are visible.
Verdict: proven for named captures and journeys; owner aesthetic acceptance remains open.

## Challenge and remaining controls

Shared-context self-review, not independent review. Verdict: accepted with controls. Strongest failure: denser rows could hide a measure's denominator or make unrelated graphics appear comparable. Best alternative: individual local fixes preserve more familiar spacing but allow the rejected tile pattern to return across consumers. Controls: retain measure-specific units, visible evidence and chart labels; Congress alone gets its shared disposition axis. Data families without a shared scale retain separate graphics. Qualitative conflict readings remain qualitative, never invented percentages. No added looping animation or fabricated live data.

The prior report's border-absence criterion was inadequate. Capture inspection now checks composition, number size, common axes and quiet-state footprint. No claim covers every page/state, assistive-technology device, Safari or Firefox. Release/integration checks and committed-dist freshness remain pending a requested integration or commit. BL-136 remains open; logo remains deferred.
