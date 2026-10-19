# Nation rebuild — integration candidate

## Outcome and scope

A President can compare current economic conditions with recorded history, inspect modeled channels, follow commodity exposure into countries, and understand national approval through its communities and judgments. The work extends the existing economic, fiscal and electorate readers; no simulation, persisted campaign shape, new economic model or new dependency is introduced.

This is an integration candidate, not whole-application visual acceptance. The shared shadcn foundation is owned by the integration stream; this branch composes its preserved shared component APIs.

## Experience and data dependencies

| Surface | Presentation and journey | Existing capability extended | Observable acceptance |
|---|---|---|---|
| Economy overview | Conditions header, three measured histories, four whole-card investigation destinations, aligned driver tables, household channels, state comparisons | `cycleReading`, `economyReading`, `economyHistory`, `rateDriverReadings`, `householdReadings`, `stateEconomyBoard` | Conditions have units and history; destinations change the URL/tab; current values never become forecasts through presentation |
| Historical comparison | Focused shared Sheet with US-record and country comparisons, visible method and cautions | `comparisonView`, `peerComparisonView`, existing series chart | Comparison opens from Overview; Escape/close restores trigger focus; agency versus simulated evidence remains labeled |
| Markets and commodity detail | Existing coordinated board/history/suppliers/input channels retained; source/consequence context visible without an expander; Fed decisions use a focused Sheet | `commodityBoard`, `commodityDetail`, `fedReading`, `releaseTimeline` | Supplier and input destinations retain their subjects; every category remains selectable; a source is visible without Read all |
| Household exposure | Recorded observations charted separately; lag-set projected points are explicitly labeled as forward path with units | `householdReadings` | Projected points are not drawn as observed history; sparse observations show a meaningful absence instead of a fabricated line |
| Nation opinion | Headline trend and three bloc comparisons followed by six score/bar/course cards; each whole card opens evidence inspector | `electorateView`, `approvalBreakdown`, `OpinionTrends` | All six judgments display their actual weight and score; inspector contains full meaning/cause/target/course and restores focus |
| Nation communities | One category at a time with population share, full-range support strip, national reference, gap and course | `CrosstabGroup`, `OpinionTrends`, `COHORT_AXES` | All ten categories selectable; 0% and 100% remain on the axis; categories explicitly overlap; URL `group` survives reload |
| Nation states | Map and fully sortable/filterable state table belong to States, followed by conditions and community matrix | `nationOverview`, `stateTableRows`, `stateGroupGrid`, shared map | Opinion and Groups do not require scrolling through an unrelated map/table; States keeps map/table selection and state destinations |
| State dossier and subroutes | Remove off-election electoral forecasts from masthead/overview; retain allocation in representation context | `stateDossier`, existing People/Economy/Conditions/Response/Representation views | Current approval and actual state conditions lead; allocation remains available with representation; existing acts unchanged |
| Policy | Preserve the existing domain workflow; increase domain-door inner padding | `policyPortfolio`, domain selection and shared comparison | Icons/text no longer hug borders; entire existing domain door remains its target |
| Budget | Add actual authority held/weekly release/standing commitments/net, explicitly distinguish from annual finances; padded authorization region | `authorityFlow`, existing appropriation editor, projections, books and ledger | Holdings and flows use their true units/bases; annual outlays are not conflated with treasury capacity; proposal edits and vote projections remain intact |

## Pruning and navigation

Removed the obsolete adaptive crosstab scale and its implementation-only tests, retired six-judgment text-table composition and CSS, unused commodity details selectors, and elector topline component. The replacement group tests exercise rendered category availability and both support extremes. No compatibility wrapper retains the retired composition.

The Nation route accepts a `group` query value only from the existing cohort-axis registry. Tab/lens changes retain that value. The legacy electorate route still redirects into Nation. Existing state, economy, budget, policy and order URLs remain valid. Map tests must explicitly enter `view=states`; this intentionally replaces the always-visible map design.

## Challenge and controls

Strongest failure: apparent analytical richness could imply causal precision, or unmeasured trends could masquerade as observations. Best alternative: retain the original single long page and its disclosures. Accepted with controls: reuse the simulation readers, keep driver contributions in their original units, show comparison transformation caveats, separate household projections from observed history, retain unassigned commodity supply and absent history, and avoid putting current election predictions in routine state management. No new authority or legal assertion is introduced here.

## Verification record

Check: focused economic/electorate/state regression
Command: `pnpm --filter @admin/web exec vitest run src/nation/electorate/Cuts.test.tsx src/nation/state/states-table.test.ts src/nation/economy/market-search.test.ts src/nation/economy/compare-windows.test.ts src/nation/economy/measure-links.test.ts`
Result: pass
Observed: 5 files, 21 tests passed; rerun at final candidate recorded by integrator if later changed.

Check: web build
Command: `pnpm --filter @admin/web run build`
Result: pass
Observed: Vite built in 13.20 seconds; existing large-chunk warning remains. Shared/core packages were cloned with existing dist, so the complete workspace build remains an integration obligation.

Check: web typecheck
Command: `pnpm --filter @admin/web exec tsc --noEmit`
Result: pass
Observed: no diagnostics after fixing an accidentally assigned MapView prop. First construction run failed on that prop; corrected source rebuilt before the final candidate check.

Check: owned source lint
Command: `pnpm --filter @admin/web exec eslint src/nation/economy src/nation/electorate src/nation/state src/nation/budget src/nation/policy src/routes/nation.index.tsx`
Result: pass
Observed: no diagnostics.

Check: source whitespace
Command: `git diff --check`
Result: pass
Observed: no whitespace findings.

Outcome: the real campaign exposes economic investigation, judgment inspectors and reload-stable community selection on phone and desktop.
Surface: isolated preview at port 5196, actual imported gulf-oil-shock save, disposable Chromium context.
Data: generated gulf-oil-shock and wildfire-colorado campaign saves from the existing fixture generator.
Observed: browser verification could not reach the changed pages: imported baseline route throws `Cannot read properties of null (reading 'useSyncExternalStore')`. Bundle sourcemap contains both worktree and primary React paths. Playwright runner also resolves two runtime copies before executing tests. Build/typecheck/unit success does not prove the live result.
Verdict: not proven in this isolated dependency clone. Run `tests/shadcn-nation.spec.ts`, updated `tests/states.spec.ts` and `tests/nation-economy.spec.ts` against the integrated foundation at six widths and both themes; inspect captures, keyboard/focus, phone tasks and 200% text. No rendered acceptance is claimed.

## Explicit limits

No engine/save/financial-model change, legal authority invention, deployment, publication or push. Existing map matrix, state subroutes and policy/budget act outcomes are source-preserved but not browser re-certified in this branch. They remain required at integration. Whole-application validation, loading/error states, corpus quality, unsupported domestic force and legal lifecycle gaps are outside this stream's completion claim.


## Restored domestic-authority boundary — follow-up checkpoint

Read-only reconciliation found that the lost authority wave had not survived: generic unrest plus a declaration enabled federal-service/troop proposals, and the alternate home path bypassed even those conditions. The root requested a bounded correction. Historical recovery operations 2506, 2580 and 2585 were inspected before editing. This revision is stricter than the historical patch: generic agent surges are also unavailable because no specific federal mission, jurisdiction or limits are modeled.

`localeAvailability` refuses agents, federalization and active-duty troop proposals before monetary obligation. `homeActAvailability` delegates the same boundary. No declaration, unrest score, invasion flag or governor disposition is promoted into a legal finding. Missing governor data is not affirmative consent. Existing governor-controlled support requests remain modeled separately. Historic coercion flags, ledger entries, risk calculations and consequence handling remain readable and are not migrated or deleted. No stored fields or new legal predicates are introduced.

State response and both act desks replace blanket lawfulness claims with explicit model limitations and the root-owned `AuthorityHelp` domestic-force reference. Unavailable options remain visible for comparison, with reasons and no executable packet. The root owns the separate Guard support-coordination/unit repair and official-source helper implementation.

Strongest failure: a new invented threshold would only replace the old legal fiction. Best alternative: leave unsupported actions executable with a warning. Verdict: accepted with controls; actual executor refusal is required, while prior records and simulated risk consequences are preserved.

Check: authority refusal, declarations, domestic consequences and war-check census
Command: `pnpm --filter @admin/engine exec vitest run src/authority-boundaries.test.ts src/domestic-coercion.test.ts src/emergency.test.ts src/war-party.test.ts`
Result: pass
Observed: 4 files, 53 tests passed. The first run caught the removed `underInvasion` helper still listed in the census; only that paired retired-site entry was removed, preserving all census invariants.

Check: presentation options and modeling refusal
Command: `pnpm --filter @admin/player-core exec vitest run src/world/locale-act-options.test.ts src/modeling/acts.test.ts`
Result: pass
Observed: the existing options file contains 13 passing tests, including modeled-act refusal. No `src/modeling/acts.test.ts` exists in this checkout; the command matched only one file, so no second-file coverage is claimed.

Check: engine/core compile and engine typecheck
Command: `pnpm --filter @admin/engine run build`, then `pnpm --filter @admin/engine exec tsc --noEmit`, then `pnpm --filter @admin/player-core run build`
Result: pass
Observed: all commands finished without diagnostics after removing an invalid test call to the conversation projection API, whose typed contract only accepts relief/review.

Check: UI outcome
Command: integrated `tests/states.spec.ts` and authority fixture browser verification
Result: not run
Observed: root owns integrated browser verification; this branch has no root-owned AuthorityHelp implementation/shared shadcn foundation, so its UI imports require integration. Updated the existing locked-federalization browser assertions to require the factual/legal model boundary rather than merely a declaration.

Required root contract update: public availability semantics now explicitly refuse unsupported agents/federalization/troops on locale and home paths; governor-controlled support requires a recorded governor with modeled assent. No save-schema change; no historical mutation. Add that change to SCHEMA/ARCHITECTURE and retain the unfinished legal lifecycle in BACKLOG.

## Persistent investigation context and exact community destinations

Nation now uses one presentation-only query parser, following the existing country-search pattern. It validates view/lens, cohort axis, selected map state, bounded search text, governor-party/condition filter, table sort/direction and community-matrix sort/direction against the existing registries. The legacy electorate redirect preserves that validated context. The existing StatesTable accepts controlled filters/sort; it still uses the existing shared `nextSort`, filtering and sorting implementations. No second table, sort engine or persisted campaign state was added.

Every community heatmap cell is a keyboard-accessible Door to the exact state and cohort. The state People view places that selected community first, with actual population share and modeled support versus its national support, including groups that the default six-row summary omits. It uses `stateGroupRating`, a narrow public wrapper around the existing private rating reader and state demographics, without new calculations or dataset fields. A missing reading is explicit. Selected evidence receives focus and is brought into view on arrival/reload; normal Back uses the existing Door return-context mechanism. Source map selection, filter, sort and cohort axis are encoded in its URL, so they survive dossier navigation and reload.

Caucus cards also receive a layout correction from the integrated capture: driver names and signed values share the first row, and their common-scale diverging bar spans the second. This removes the narrow label column caused by the old desktop row grid inside three compact cards. No driver data or weights changed.

Check: Nation query, existing state filtering/sorting and community range regression
Command: `pnpm --filter @admin/web exec vitest run src/nation/state/nation-search.test.ts src/nation/state/states-table.test.ts src/nation/electorate/Cuts.test.tsx`
Result: pass
Observed: 3 files, 18 tests passed. URL roundtrip, unknown input rejection and cross-axis invalid-sort removal are included.

Check: exact community reader and existing state-group reconciliation
Command: `pnpm --filter @admin/player-core exec vitest run src/electorate/state-people.test.ts`
Result: pass
Observed: 16 tests passed, including all 29 exact Colorado cohort readings against the existing grid and a missing-state check. Existing state/national weighted reconciliation assertions remain intact.

Check: player-core build and owned lint
Command: `pnpm --filter @admin/player-core run build`; `pnpm exec eslint apps/web/src/nation/electorate/StateGroups.tsx apps/web/src/nation/state apps/web/src/routes/nation.index.tsx 'apps/web/src/routes/nation.state.$id.tsx' packages/player-core/src/electorate/state-people.ts packages/player-core/src/electorate/state-people.test.ts`
Result: pass
Observed: compile and lint finished without diagnostics.

Check: isolated whole-web typecheck and sortable-table rendering regression
Command: `pnpm --filter @admin/web exec tsc --noEmit`; initial combined Vitest invocation additionally included `src/sortable-tables.test.tsx`
Result: fail
Observed: web types report only the root-owned AuthorityHelp imports absent from this isolated branch. The additional sortable-table file hit the already-diagnosed cloned dependency React hook identity failure (7 cases), before rendered assertions. These are not counted as passing; run on integration.

Outcome: source state investigation survives a dossier roundtrip/reload, and selecting a heatmap cell opens its exact community evidence with the same displayed support.
Surface: `tests/nation-context.spec.ts`, actual wildfire-colorado imported campaign, both themes and configured viewports.
Result: not run in the isolated worktree
Observed: root integration owns the working shared foundation and dependency graph. The new browser journey asserts query/sort/map selection, immediate Back focus, arbitrary cohort support, selected-panel focus and reload persistence. Run and inspect its captures at integration; no new rendered acceptance is claimed here.
