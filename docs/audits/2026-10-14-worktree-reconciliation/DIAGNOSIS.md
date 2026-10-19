# Integration failures and their resolution

## Whole-campaign Hill hashes

The full workspace run and isolated root `pnpm --filter @admin/engine run test hill-ledger-golden.test.ts` runs rejected the old whole-campaign capture. Comparison of all four 30-week captures found 120 changed digest strings and **no changes to any other captured field**: votes, probes, chamber readings, removal pressure, rapport, promises and lobbying all matched exactly. Engine and world runtime source and dist were identical to the starting primary checkout during this diagnosis.

An archive of the primary starting commit and the canonical checkout both passed the original pin when the Vitest executable was launched from their package directories. The apparent contradiction came from runtime selection: the root shell used Node v22.23.1; the package-directory shell used Homebrew Node v25.9.0. Explicit-binary probes of identical first-week source reproduced the discrepancy in both directions. Node 22 hashes to `a38fabaa5c750a8c`; Node 25 to the old `5dd92baddde936bd`. Eight final-bit numeric differences were found in foreign debt stocks and fiscal anchors, recorded path by path in `RUNTIME-PROBE.json`. No Hill reading changed. Instrumentation runs that inherited the root runtime naturally reproduced the Node 22 result; that was not an import-order defect.

The repository's `.nvmrc` specifies 22, and both rebuild CI and balance CI select Node 22. The corrective re-take therefore replaces only the 120 hashes with a capture from the declared runtime. No assertion, explicit Hill value, simulation rule, tolerance or test timeout changes. The test now names its reference runtime. The original pin remains in Git history and the safety refs.

Strongest failure: re-pinning could hide a real simulation regression. Controls: runtime source equality against the starting checkout, exact equality of every non-digest capture field, successful original-pin replay on Node 25, and an explicit Node 22 rerun after re-taking. Best alternatives were adopting Node 25 as the reference (conflicts with current repository/CI runtime) or rounding values before hashing (would weaken exact state detection). Verdict: accepted with these controls. Whole-state bitwise replay across different JavaScript engine versions remains unproven and is not claimed.

## Supplier link loses focus on Back

The full browser run failed its exact-source focus assertion after returning from Saudi Arabia to the commodity supplier list. The same journey was reproduced independently at 320 pixels. The actual active element was the Economy heading.

A disposable-browser focus trace showed the source return context being consumed while the departing Saudi Arabia surface was still rendered: `Screen` subscribed to the router's pending location. Its address effect ran before the destination component committed. On arrival, the context had already been removed, so the title received focus.

`Screen` now observes the resolved location before running the address restoration effect. The existing shared return-context mechanism, exact-source link occurrence, saved query and scroll restoration are retained. A second run of the same diagnostic ended with the exact `market-supplier__name` Saudi Arabia anchor focused. The unchanged market journey spec is re-run separately in both themes; the full matrix continues against the corrected source.

## Unit timeouts under concurrent integration load

The initial workspace run had one player-core lapse-source timeout at its existing 30-second limit and four studio repair-context timeouts at their existing 90-second limits. No timeout or assertion was changed. The isolated player-core file passed both tests; the isolated studio file passed all seven tests. The initial aggregate run remains recorded as failed, with these reruns recorded separately rather than relabeled as a passing aggregate run.

## A queued return can undo the player's next gesture

The first complete production matrix finished at 647 passed / one failed. The tablet Courts journey clicked Nominations after returning from a case, but Docket remained selected. A separate repeat also dropped the earlier Docket click after returning from a justice. Other repeated attempts passed, so this was not a missing nomination or bad campaign payload.

A deterministic probe on the actual Courts surface queued the existing return restoration, dispatched the next pointer gesture and focused Nominations before the next animation frame. Before the correction, the queued callback took focus back to the case link (`keptNewFocus: false`). This directly reproduced the late-focus defect; its late scroll is consistent with a tab moving during an immediate pointer action, although the original failing matrix did not retain that pointer trace.

Arrival handling now runs in layout effects, so restoration is scheduled before the arriving screen can receive input. The existing queued callback is canceled on a new pointer, key or wheel gesture, or when its address/surface is no longer current. Temporary input listeners are removed when that frame runs. The unchanged deterministic probe then kept Nominations focused (`keptNewFocus: true`). Logs preserve both results. This extends the same return-context mechanism rather than adding a second navigation path.

Build, typecheck, lint and all 447 web unit tests pass after this correction. Because shared arrival timing affects every route, the complete six-project production matrix is being rerun at this final stable checkpoint; the first 647/648 result remains recorded separately.

## Start moves while the save library loads

A delayed actual IndexedDB campaign-library response reproduced a title-screen startup miss. Start was enabled before library readiness/capacity was known; the control moved 130 pixels as the library settled, between press and release. The release missed the link and left the player on the title screen.

The existing Doors component now uses the existing disabled Button until campaign loading has settled and the used-slot count is known. Existing full-vault behavior is retained. The same probe waits for the ready link and reaches The transition with stable coordinates. `apps/web/tests/shell.spec.ts` now holds only the actual storage response at its boundary, checks the disabled state, releases the response, and navigates through the real Start link. All six browser projects pass that new check. No save data or engine schema changed.
