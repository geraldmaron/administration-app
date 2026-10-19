# Emergency camera proof — prepared, browser verification pending

## Source finding

The primary integration record names a camera/highlight acceptance gap, not a reproduced instability: `SHADCN-COMPLETE-NATION.md` says the Emergency image was captured before a settled US camera/highlight was verified; `SHADCN-INTEGRATION.md` retains that control. No speculative production fix is included.

Inspected current primary Emergency composition: both Screen and embedded MapView use the constant `camera="us"`; selecting an incident changes the state's selection, not the camera key. The current primary map is 280px high. The isolated checkout still has the earlier Emergency composition, so the prepared proof targets primary's settled Vite dev server, not an assumed equivalent local surface.

Inspected shared sources: `MapView.tsx`, `gl/use-gl-sync.ts`, `gl/use-gl-runtime.ts`, `gl/gl-view.ts`, `camera-keys.ts`, `target.ts`, `insets.ts`, `UsInsets.tsx` and the conditions lens. Primary and isolated MapView/camera-sync source matched byte-for-byte when inspected. The embedded map requests Mercator before its camera hook; the camera effect depends on runtime, resolved target and available area. Element size retains object identity when dimensions do not change. Source alone does not establish that the correct frame is painted and settled in a browser.

Searched existing map and Nation browser specs and helpers. Extended the existing `apps/web/tests/map.spec.ts`, reusing `importFixture`, `expectMapDrawn` and `expectNoHorizontalOverflow`. The added local camera observer complements the existing image-ink check, which cannot itself establish national framing or the selected state.

## Prepared bounded proof

Two new theme tests, selected only in mobile-390 and desktop-1440, make four cases. They use the real `wildfire-colorado` fixture and select its Colorado wildfire through the incident control. No declaration is committed, fixture generated, engine effect changed, or application camera behavior modified.

The existing `window.__glRuntime` diagnostic is Vite DEV-only. The new tests explicitly skip in the standard unattached preview run with that reason; they must run attached to the known dev server. An attached preview lacking the diagnostic is not silently accepted. The observer requires the diagnostic runtime's connected container to belong to the Emergency map, preventing a global handle for another map from certifying it.

Before reading a camera, the observer requires:

- actual map `loaded()`, no MapLibre or overlay motion;
- actual Mercator projection and painted `conditions` lens;
- actual United States target, center inside its bounds, and both national framing corners inside the canvas;
- canvas dimensions matching the connected container;
- after selection, exactly Colorado in the view selection and selected feature state;
- two animation-frame boundaries with unchanged settled transform, without an elapsed-time sleep.

The journey records the camera before and after real incident selection, the geographic data-list view, Colorado dossier and browser Back, opening/closing the contextual declaration drawer, and reload. The selected incident URL, Colorado highlight and national transform must persist. Drawer close must restore the original trigger's focus. The existing map-ink check verifies actual land rendering; overflow assertions remain separate.

On success each case writes settled selected/reloaded map images plus a JSON attachment containing the measured transforms at every stage. Root must open the resulting images before closing the visual gap. A passing test cannot substitute for that image inspection.

## Verification and handoff

Check: scoped test lint.
Command: `pnpm --filter @admin/web exec eslint tests/map.spec.ts`
Result: pass
Observed: final scoped lint exited zero with no findings. Log: `.emergency-camera-lint-final.log`.

Check: exact prepared test inventory, without launching a browser or fixture generation.
Command: `E2E_DEV_RUNTIME=1 E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web exec playwright test tests/map.spec.ts --grep='Emergency camera' --project=mobile-390 --project=desktop-1440 --list`
Result: pass
Observed: four tests in one file listed. Log: `.emergency-camera-list.log`. Listing is not an execution pass.

Check: actual settled rendering and connected journey.
Command after balance/settled-load gate: `E2E_DEV_RUNTIME=1 E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web exec playwright test tests/map.spec.ts --grep='Emergency camera' --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=tests/.results/emergency-camera-settled`
Result: not run
Observed: deliberately not launched while the balance job is active. Use the current primary Vite dev server after its shared dependency build is stable. No browser pass or new inspected capture is claimed.

Expected outputs: `emergency-settled-selected-light.png`, `emergency-settled-selected-dark.png`, corresponding `emergency-settled-reloaded-*.png`, and `settled-emergency-camera.json` attachments under the named output directory.

Residual: actual Emergency geographic rendering, the prepared observer's runtime behavior, and visual acceptance remain unverified until that command and image inspection complete. A camera patch is warranted only if this bounded proof reproduces a real problem and establishes its cause. No unrelated Nation source, root plan or backlog was edited.

The explicit `E2E_DEV_RUNTIME=1` opt-in separates this dev-observer proof from attached production-preview suites. An opted-in run still fails if the correct connected runtime is absent; a preview skip is not camera acceptance.


## Executed closeout — 2026-10-15

Check: actual settled camera and connected journey
Command: `E2E_DEV_RUNTIME=1 E2E_ATTACH=1 E2E_PORT=5188 pnpm --filter @admin/web exec playwright test tests/map.spec.ts --grep='Emergency camera' --project=mobile-390 --project=desktop-1440 --workers=1 --max-failures=1 --output=/private/tmp/admin-shadcn-emergency-final-results`
Result: pass
Observed: four cases passed in50.0s. Both themes and widths retained identical national transforms and Colorado selection through incident→list→state→Back→declaration drawer→close→reload. No camera product change was needed. Log: `/private/tmp/admin-shadcn-emergency-final.log`.

The first execution failed after Back because the new observer returned null.
Installed Playwright's `waitForFunction` tests the returned Promise as truthy
before its async predicate resolves. A disposable browser probe reproduced this
with `async () => null`; awaited `expect.poll` correctly retried until its third
settled value. The helper now polls awaited `page.evaluate` readings; all actual
map readiness, geography, selection, canvas-size and two-frame stability checks
remain. No timeout or camera assertion was relaxed. Scoped test ESLint passed.

Outcome: Emergency preserves national geographic context and selected incident while investigating and returning.
Surface: actual Vite development app on5188 in disposable Chromium campaigns.
Data: existing wildfire-colorado fixture imported through the real player flow.
Observed: selected/reloaded light/dark phone and desktop captures were opened and inspected. National geography, Colorado highlight, labels and map controls remain visible; no state-only zoom appeared.
Verdict: proven for the four measured Chromium journeys. This does not establish cross-browser or whole-application acceptance.

Verification record: source and existing map helper inspected; observer reused;
installed dependency behavior reproduced; exact browser command passed; captures
inspected; full diff reviewed. The original balance workers were suspended for
this check, so it did not overlap active balance computation. No simulation,
save shape, authority or engine behavior changed.
