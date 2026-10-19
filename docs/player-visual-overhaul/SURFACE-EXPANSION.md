VERDICT: Accepted with controls

# Shared action workspace and surface expansion — 2026-10-14

The isolated implementation worktree now extends the Executive approach into shared action comparisons, Press, World, Security, Nation, Congress, Oversight and linked dossiers. The owner's follow-up rejected individual metric cards: the final implementation uses compact reading strips and navigation counts. This is a verified presentation checkpoint, not full BL-136 closure or approval of every application state.

Worktree: `~/.codex/worktrees/player-visual-overhaul/admin-app`. Existing audit and original checkout preserved. Server: `http://127.0.0.1:5188/`. No engine, world dataset or save-schema changes, new dependencies, scenario writing, logo replacement, commit, push or deployment.

## What changed and what to check

| Change | Existing capability extended | Observable acceptance |
| --- | --- | --- |
| Action workspace | `ChoiceList`, `CompareAuthorize`, producer outcomes, real projection worker | Baseline first; native radios; all options' price, odds, impacts and downside visible; equal desktop option columns; one authorization area before full-width selected evidence; baseline and unavailable actions cannot commit. |
| Impact encoding | `choiceAxis`, `bandEffect` | Qualitative changes use discrete diverging steps with magnitude words, not percentages. Numeric changes retain common axes, units, ranges and clipped-range marks. A zero quantitative change draws no positive-length bar. Monetary-free wording does not imply absence of political costs. |
| Operating readings | `Stat`, `StatRow`, existing bars/distributions | Numbers sit alongside a relevant chart, with units and explanatory context. Individual metric boxes are absent. Word assessments have enough width to remain readable. Count-only readings do not acquire invented denominators. |
| Oversight | Existing URL-backed `Tabs`, notices, inquiry pipeline | Counts belong to navigation. No duplicate four-card dashboard. No empty three-box pipeline when no inquiry is open. Populated inquiries retain stages and underlying matters. Compact pending-work styles belong to the shared shell, not Executive-only CSS. |
| Dossier families | Command, emergency, conflict and treaty producers; shared document | Measured readings use compact number/chart comparisons; treaty assessments use explicit ordinal bands rather than synthetic probability tracks. Treaty authorization gets full width. Paper metadata uses paper-specific ink in both themes. |
| Confirmation | Existing review state machine, exactly-once authorization and save recovery | Review opens immediately, without a fake biometric scan or invented temperature. A named confirmation is still required. Cancel restores the originating focus and selection; result links reach the actual Record event. |
| Live theme consistency | `usePalette` and existing map renderer | Root `data-theme` changes recolor the persistent map, as well as the page. Light → dark → light matches the resolved CSS palette each time. |

`Stat` adds optional `layout`, `tone` and `heading` props. `StatRow` adds optional comparison layout, `as` and `className`. Existing defaults and data producers remain available. The shared row's frame is now a ruled strip rather than a rounded metric container. `ChoiceList` adds an optional authorization/footer slot; selected detail is outside the radio group and keeps its responsive container. Navigation destinations, forecast computation and Record contracts remain those of the existing adapters.

## Final route ledger

Each row below was measured at 320, 390, 768, 845, 1280, 1440 and 1920px in light and dark themes. Screenshots at 320 and 1440px are in `evidence/spread/`; the exact route/state/viewport ledger is `evidence/spread/layout-accessibility.json`.

| Surface | Route/state | Existing campaign fixture |
| --- | --- | --- |
| World | `/world` | `security-desk` |
| Country | `/world/nation/CAN` | `security-desk` |
| Security | `/world/security` | `security-desk` |
| Command | `/world/security/command/CCMD-INDOPACOM` | `security-desk` |
| Press | `/washington/office/press` | `day-one-orders` |
| Nation | `/nation` | `day-one-orders` |
| State | `/nation/state/CO?view=people` | `day-one-orders` |
| Emergency | `/nation/emergency` | `day-one-orders` |
| Congress | `/washington/congress` | `washington-chairs` |
| Oversight | `/washington/oversight` | `washington-chairs` |
| Office | `/washington/office/OFF-STATE-SEC` | `washington-chairs` |
| Organization | `/world/org/ORG-NATO` | `opening` |
| Draft instrument | `/world/treaty/draft%3Atrade%3AGBR` | `opening` |
| Signed instrument | Actual trade instrument ID read from fixture | `treaty-pending` |
| Conflict | Actual Russia/Ukraine war ID read from fixture | `war-joined` |

Final result: 210 layout checks; zero document/work-surface overflow findings; zero individually boxed comparison `Stat` readings; zero page errors. Axe WCAG 2 A/AA and 2.1 AA checks at 320 and 1440px in both themes: no violations. Oversight received an additional fourteen checks after the final empty-pipeline and shared-attention corrections; Command received fourteen further checks of the service-force readings and corrected denominators.

Direct capture inspection covered the office impact workspace and forecast, World and its map, Congress and chambers, Oversight, Press and its empty history, Nation, state identity, treaty assessment/document contrast, Security/readiness and conflict context. The ledger measures remaining sizes; automated measurements are not independent aesthetic acceptance. Entry, founding, saves, help, loading/error variants, endings and all other nested states were not freshly walked in this pass. Their broader acceptance remains open under BL-136; prior records are not claimed as new verification.

## Verification record

Check: repository build-before-typecheck sequence
Command: `pnpm run build`, then `pnpm run typecheck`, then `pnpm run lint`
Result: pass
Observed: final sequence completed for the workspace; Vite retains its large-chunk advisory. Logs are retained under `evidence/spread/`.

Check: shared UI unit contracts
Command: `pnpm --filter @admin/ui-web run test`
Result: pass
Observed: six files, 85 tests passed, including numeric/qualitative scales, clipping, baseline order, selection and footer placement.

Check: web unit integration checkpoint
Command: `pnpm --filter @admin/web run test`
Result: pass
Observed: 70 files, 450 tests passed. The simulated-reading tests were replaced by explicit-review state-machine tests.

Check: full workspace unit path
Command: `pnpm run test`
Result: fail
Observed: eleven packages passed; CLI reported one 90-second timeout in `src/jobs/repair-session-context.test.ts`, with 359 tests passing. Engine 4,542, Player Core 1,452, Content 1,011, World 550, shared UI 85 and Web 450 tests passed. One content file remained skipped. This is not an aggregate green run.

Check: timed-out CLI file, unchanged limits
Command: `pnpm --filter @admin/studio-cli run test src/jobs/repair-session-context.test.ts`
Result: pass
Observed: seven tests passed. This rerun does not prove why the aggregate run timed out.

Check: consequential actions across route families
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e washington.spec.ts nation-economy.spec.ts washington-press.spec.ts washington-congress.spec.ts world-security.spec.ts world-sets.spec.ts nation-policy.spec.ts --project=mobile-320 --project=desktop-1440 --workers=2`
Result: pass
Observed: 48 real browser journeys passed, including appointments, policy/order signatures, emergency declaration/end, press response, command actions, conflict and treaty acts and their receipts. This checkpoint preceded the final metric-strip correction.

Check: corrected strip consumers
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e washington-congress.spec.ts washington-press.spec.ts world-security.spec.ts states.spec.ts world.spec.ts --project=mobile-320 --project=desktop-1440 --workers=2`
Result: partial
Observed: 26 passed; twelve failed because three required fixture files had not been generated. Their errors named missing files, not layout assertions. The files were prepared with the repository fixture generator, without changing test limits or assertions.

Check: prepared state/World journeys
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e states.spec.ts world.spec.ts --project=mobile-320 --project=desktop-1440 --workers=2`
Result: pass
Observed: all 24 journeys passed, including map/state/district selection, locale authorization, country navigation, tariff impose/lift, force order/cancel, treaty workspace and Record receipts.

Check: final compact command comparison and action
Command: `E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web run test:e2e world-security.spec.ts --grep 'a command:' --project=mobile-320 --project=desktop-1440 --workers=2`
Result: pass
Observed: both phone and desktop command/posture journeys passed after the last aligned-row and denominator correction.

Check: final layouts and accessibility
Command: `node /private/tmp/flat-browser-final.cjs`, then `node /private/tmp/oversight-flat-final.cjs`
Result: pass
Observed: the final 210-row ledger and fourteen Oversight rechecks have no overflow, boxed comparison readings, Axe findings or page errors. Earlier sweeps that timed out on importing a reused campaign context are superseded by the final fresh-context-per-fixture sweep.

Check: map theme switching, both directions
Command: `node /private/tmp/map-theme-proof.cjs`
Result: pass
Observed: before the fix, the map sea stayed `#E8EDF5` after the page became dark. After observing `data-theme`, rendered sea and CSS palette matched at `#E8EDF5` → `#040811` → `#E8EDF5`.

Check: actual forecast and scan-free confirmation
Command: `node /private/tmp/action-flow.cjs`
Result: pass
Observed: the four-week forecast completed five real runs; keyboard radio selection worked; baseline authorization stayed disabled; cancellation restored selection and button focus; explicit dismissal created a real event and opened its Record page. No biometric readout remained.

Check: applicable proof gates
Command: `node scripts/verify-css-architecture.mjs`; `node scripts/verify-web-boundary.mjs`; `node scripts/verify-disclosure.mjs`; `node scripts/verify-person-consequence-alignment.mjs`; `node scripts/verify-metric-registry.mjs`; `node scripts/verify-metric-registry-proof.mjs`
Result: pass
Observed: CSS layers and web imports remained valid, no hidden person scores printed, 57 dossier/engine constants aligned, and the current metric report and proof fixtures passed. Registry blind spots and baseline exceptions remain explicitly reported by the gate. No baseline was raised.

Check: diff and server
Command: `git diff --check`; `curl --max-time 10 --silent --output /private/tmp/final-server.html --write-out '%{http_code}\n' http://127.0.0.1:5188/washington/oversight`
Result: pass
Observed: no whitespace errors; HTTP 200. The worktree server remains running.

Outcome: a President can compare an act against keeping the current position, read meaningful visual impacts and a sourced forecast, confirm explicitly, and follow the consequence into the Record; overview readings share the Executive's compact strips.
Surface: live player on port 5188, disposable browser contexts.
Data: existing populated, sparse and active-conflict campaigns and actual engine-backed player journeys; no stubbed commits.
Observed: named actions, receipts and return paths worked on phone and desktop; the owner's rejected metric-card layout is absent from the migrated readings.
Verdict: proven for the named layouts and journeys; full application visual acceptance remains open.

## Adversarial challenge — shared-context review

This review shares the implementer's context. No independent reviewer was dispatched. The strongest case for the change is that it reduces reading/authorization fragmentation while retaining the existing data, engine actions and native controls. It extends the existing shared kit rather than introducing a second design system.

1. **Strongest failure mode — serious:** compact charts could turn qualitative direction into apparent precision, or imply that a free monetary cost means no political cost. Controls: discrete magnitude labels, explicit monetary wording, units on numerical effects, unselected downside visibility, forecast source/confidence/ensemble limits. Tests and live captures check these boundaries.
2. **Best alternative:** repair the old table rows and gauges locally. That preserves familiar components with less migration risk, but leaves the duplicated authorization text, compressed forecasts, redundant metric-card bands and inconsistent family layouts the owner rejected. The chosen approach still reuses the same components, datasets and workers; it changes composition.
3. **Load-bearing claims:** the fifteen named surfaces and 210 layouts are supported by the retained ledger; actions by the named browser runs; theme consistency by direct CSS/rendered-color observations. Full workspace green and universal visual acceptance are unsupported and expressly not claimed.
4. **Inverted assumptions:** if data is sparse, a plot may imply nonexistent history; if labels are long, columns may collapse; if the baseline carries future costs, immediate zero movement could be misread as immunity. Controls: explicit empty/unknown states, full-width qualitative labels, seven-width checks and a separate real forecast with a named baseline. The untouched states are a remaining validation boundary.
5. **Who pays:** players pay in misread decisions, keyboard users in disrupted focus, and maintainers in duplicated component contracts. Controls: existing radios/tabs/links, tested focus restoration and native confirmation, one shared strip/choice implementation and no new dependency. Screen-reader device testing remains unverified.
6. **Hostile-expert objection:** attractive gauges are not evidence, and a fixed estimate must not become a probability or an observed historical value. Controls: actual history/projection separation, labeled ordinal treaty/person assessments, actual sources and recorded outcomes, no new scores/history, and no fabricated sensor ceremony. A clean aggregate unit rerun remains a release-control requirement.

Closing gates: source and consumer contracts inspected; original shared components located and extended; exact validations and surface proof recorded above; final source/style/confirmation diffs reviewed against the acceptance table. Diff review caught and corrected a command-assignment caption: the denominator is each service’s total force, not the command’s mixed force. Those readings use the existing aligned `BarRows` component, retiring a legacy class that collided with founding-warning styling. No specialist or independent aesthetic review is claimed.

Residual controls: retain BL-136 as open; obtain owner visual acceptance of the new strips; complete untouched route/state coverage and Safari/Firefox/assistive-technology checks; obtain a clean aggregate unit run before integration; run committed-dist freshness only when a commit is requested. No balance retune occurred, so balance simulations were not repeated for this presentation-only change.
