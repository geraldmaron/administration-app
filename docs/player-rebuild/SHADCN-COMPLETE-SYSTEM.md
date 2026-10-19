# Complete system stream — integration record

Persistent worktree: `.worktrees/shadcn-complete-system`, base `12501c852`.
Scope: shared primitives; entry, founding, library, recovery, settings, handbook;
browser storage. No engine, save schema, scenario or public StoragePort changes.

## Contracts

`NativeSelect` is the canonical native platform selector. It accepts native
SelectHTMLAttributes, children options/optgroups and a ref; use it with Field.
Native OS menus preserve keyboard and phone behavior while the source-owned
shadcn wrapper provides shared focus, spacing and a registry chevron. Forced
colors restore the browser's arrow. Existing ui-input native controls remain
compatible during consumer migration; no second options-object API is added.

The browser storage contract now rejects unavailable reads and writes rather
than silently substituting an empty memory vault. Successful request events do
not constitute a committed transaction. Failed, blocked and timed-out opens can
be retried; late connections close. Existing recovery controls remain the
canonical way to retry. Core save status must reflect manifest preflight errors
as well as payload errors, retaining the last saved timestamp and payload.

## Challenge and controls

Strongest failure: refusing storage might look like an empty vault or strand a
new player behind an indefinite loader. Controls: visible unavailable-state
explanations, disabled founding/import until the vault is read, explicit retry,
existing-save retention and a real browser failure/recovery journey. An explicit
session-only mode is the best alternative; it requires broader durability
metadata and is deferred rather than implied by a false Saved badge.

## Verification so far

- `pnpm --filter @admin/ui-web... build`: passed.
- `pnpm --filter @admin/web exec vitest run src/app/device-storage.test.ts`:
  five tests passed (commit completion, abort/retry, read failure/retry, blocked
  late close and unavailable storage).
- User-visible storage/entry/browser outcomes: not yet verified in this stream.

Official sources inspected via Context7: MDN transaction complete/abort, blocked
open and IndexedDB durability notes; shadcn Native Select component documentation.

## Source and surface disposition

| Surface | Change and retained capability | Browser observation |
| --- | --- | --- |
| Title | Existing whole-card resume retained; unavailable restore becomes canonical Card with retry and recovery | Genuine empty context permits founding after vault read; unavailable vault never implies zero saves |
| Founding entry | Existing short/long paths retained; canonical whole-card target; verified vault/capacity gate before setup |390 px summary-area click chooses Short setup |
| Founding profile | Shared Input and NativeSelect replace raw text/select implementations; native range and label-based radios retained |390 px person form inspected; options remain readable |
| Platform and oath | Whole-card label targets with native checkbox above overlay; 100-day priority remains separate |390 px platform summary toggles selection; eligible priority checks independently without clearing plank |
| Other founding stages | Existing Choice, redacted candidate labels and deterministic preview retained after source inspection | Full long questionnaire and complete oath/confirmation journey not repeated in this stream |
| Saved administrations | Existing whole-card SaveCard and rename/discard Sheet retained; unavailable vault has explicit retry; import/founding gated | Real file import, existing save retention, transaction abort and retry exercised |
| Recovery | Canonical unavailable Card and retry; duplicate unavailable integrity panel removed; existing retry-save receipt retained | Actual storage retry restores previously imported campaign |
| Settings | Canonical Card hierarchy, shared Choice/Switch and NativeSelect attention settings | Light390 and dark320 captures inspected; dark theme and native attention setting change observed; no horizontal overflow |
| Handbook index/chapters/terms | Existing full-card chapters and all-readable terms retained; shared Input; explicit navigation callbacks replace delegated anchor sniffing |390 px index and terms inspected;320 px dark term search finds 3 of 105; chapter Sheet closes on Congress navigation |
| Shared stages | Narrow container becomes a vertical sequence, preserving whole labels and the actual connector order | Decision stream observed actual390 px dark scandal, full stage labels and no overflow |
| Shared authorization Sheet | Clear inherited work-surface footer context at modal boundary | World stream verified four real 390 px Security/command authorization journeys in both themes; action and receipt stay inside Sheet and close restores trigger focus |
| Shared inherent navigation | Card/row title anchors use primary text and no idle underline; button variants and inline prose links retained | Style is limited to canonical card/row anchor targets; integration matrix owns route-level acceptance |
| Ended top bar | One compact outcome action with complete accessible outcome, calendar/save/Search retained | Real loses-reelection fixture at 320/390 px: every control within viewport and outcome opens /ending |

## Official component basis

Inspected with Context7 on 2026-10-15:
[shadcn Native Select documentation source](https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/aria/native-select.mdx).
The documented pattern explicitly recommends native select for browser behavior,
performance and mobile dropdowns. The local source-owned implementation uses
native option/optgroup children rather than adding unnecessary option wrappers.
No new dependency or competing selector state model was introduced.

## Real IndexedDB proof

Ran `node /private/tmp/system-storage-proof.cjs` against isolated Vite 5291 with a
disposable Chromium context and the existing collection-intelligence save file,
imported through the actual Your administrations file control. The only injected
failures were at IndexedDB browser API boundaries; no desktop storage mock was
used.

1. A real put request succeeded and its transaction was then aborted. The header
   showed Retry save. SHA-256 snapshots of both existing manifest and payload
   were unchanged. Clearing the abort and retrying returned Saved.
2. Reload restored that same campaign. Throwing during manifest preflight changed
   the header from Saved to Retry save; clearing failure and retrying saved it.
3. A SecurityError opening the vault displayed an unavailable library, disabled
   import and a storage-gated founding action. At 390 px the actual message and
   retry panel were readable. Clearing the failure and choosing Retry reading
   saves recovered the previously imported administration.
4. Unit event-boundary tests cover request completion vs transaction commit,
   abort/retry, read/open failure, blocked late connection cleanup and absent IDB.
   The core regression proves preflight failure retains prior campaign identity,
   timestamp and payload and can recover.

Durability limit: transaction completion confirms the browser transaction, not
an operating-system power-loss guarantee or a backup. There is no silent
in-memory success mode. Existing export remains the portable backup capability.

Inspected evidence is persisted under
[`evidence/system`](./evidence/system/), including transaction failure, unavailable
vault, phone profile/settings and ended-header captures. These images use the
actual existing campaign fixtures, not invented dashboard data.

## Commands and scope of verification

- `pnpm --filter @admin/ui-web... build`: passed after shared primitive changes.
- `pnpm --filter @admin/player-core... build`: passed before core tests.
- `pnpm --filter @admin/player-core exec vitest run src/persistence/save-store.test.ts`: 29 tests passed.
- `pnpm --filter @admin/web exec vitest run src/app/device-storage.test.ts src/handbook/handbook.test.tsx src/founding/draft.test.ts`: 23 tests passed.
- `pnpm --filter @admin/ui-web test`: 90 tests passed across six files.
- `pnpm --filter @admin/web build` followed by `pnpm --filter @admin/web typecheck`: passed on bounded stream checkpoint; final rerun passed after entry/header corrections.
- Scoped `pnpm exec eslint` over changed TS/TSX: passed on bounded checkpoint.
- `node scripts/verify-css-architecture.mjs`: 90 sheets, 4926 rules, zero findings on bounded checkpoint.
- `git diff --check`: passed.
- `node /private/tmp/system-interactions-proof.cjs`: whole-card setup/platform, independent priority, theme and attention settings, term search, chapter Sheet navigation passed.
- `node /private/tmp/system-header-proof.cjs`: real ended fixture at 320/390 px, all visible header controls within bounds, /ending navigation passed.

Full workspace tests/proof sweep and the integrated six-width route matrix are
owned by the parent integration stream. This record does not mark those complete.
The full long founding questionnaire, a complete new oath and every library
mutation were not repeated here; existing source-owned controls and focused
model tests cover those unchanged behaviors. Native OS option-menu rendering
cannot be established by headless screenshots; actual native option selection
was exercised in Chromium.

Verdict: accepted with controls for integration. Keep save status truthful,
retry against the real vault, gate founding until slot capacity is verified,
retain keyboard/whole-card semantics, and rerun the actual integrated journeys
before application-wide acceptance.


## Local checkpoints

- `42eb29c64`: canonical NativeSelect.
- `290c5f846`: authorization Sheet owns its footer scope.
- `7c7f58799`: narrow sequential Stages layout.
- `e9bfe6bb3`: inherent card/row navigation styling.
- `5040e6813`: browser durability, truthful preflight failure and recovery gates.
- `7c5577fb3`: entry/settings/handbook shared controls and targets.
- `74f74c11c`: compact ended-campaign header, all phone controls retained.

The generic proposal to move every comparison Stat period beside its value was
rejected after parent review: existing consumers also use long contextual
captions there. No Stat API change was retained. Genuine units can use the
already-supported ReactNode value with a small unit, while explanatory periods
retain their caption semantics.

## Persistent browser regression

`apps/web/tests/browser-storage-durability.spec.ts` retains the actual browser
proof as two Playwright cases using the existing `importFixture` and overflow
helpers. It uses real IndexedDB and real imported campaign records, with failures
injected at request/transaction/open boundaries. There is no desktop storage
bridge, stubbed campaign, new dependency or production change.

The transaction case explicitly uses 1440 px for the desktop toolbar retry
workflow. The unavailable-vault case explicitly uses 390 px and proves disabled
import/founding, actual founding storage gating, retry and restoration of the
same manifest/payload hashes. These are targeted durability workflows, not an
additional responsive acceptance matrix. The normal suite global setup generates
the existing collection-intelligence fixture; attached-server runs use its
already-generated fixture copy.

Verification: `E2E_ATTACH=1 E2E_PORT=5291 pnpm exec playwright test --config
apps/web/playwright.config.ts apps/web/tests/browser-storage-durability.spec.ts
--project desktop-1440 --workers 1 --reporter line` passed both cases in 37.8 s.
`pnpm exec eslint apps/web/tests/browser-storage-durability.spec.ts` and
`git diff --check` passed. The first case also proves unchanged campaign date and
exact committed record hashes after reload. Initial exploratory runs were
interrupted/corrected for the observed calendar link role and phone recovery
control difference; only the final bounded two-case run is reported as passing.


Integrated storage closeout: the retained browser spec now also covers absent
IndexedDB at390px and a genuinely blocked version upgrade across two documents.
The late upgrade aborts after the blocker closes, and retry/reload restores the
same committed campaign hashes. All four cases passed in33.0s against5190;
see `SHADCN-INTEGRATION.md` for the exact command and initial selector correction.
BL-162 is closed for these observed Chromium workflows. Full application and
cross-browser acceptance do not follow from this bounded result.

## Bounded accessibility closeout

Reconciled the persistent worktree to inspected primary checkpoint `d1879f0a9`;
merge conflicts used the primary versions of the expanded durability spec and
this record. No older route implementation was restored.

A focused DOM test reproduced loss of focus to the document body when an
unselected adaptive Choice changed from its native selector back to segmented
radios after measured text/container reflow. The shared hook now prefers the
selected radio and falls back to the first enabled radio. Existing focus outside
the choice remains outside it. `pnpm --filter @admin/ui-web exec vitest run
src/Field.focus.test.tsx` reproduced one failing case before the fix and passed
all four cases afterward. Geometry is explicitly controlled in this unit test;
it does not stand in for native browser text measurement.

Two fixed-duration infinite animations bypassed reduced-motion tokens: busy
Button and EmptyState spinners. Their existing animation now runs only under
`prefers-reduced-motion: no-preference`. The busy shape and its accessible busy
state remain present when motion is reduced.

`pnpm exec eslint packages/ui-web/src/Field.tsx
packages/ui-web/src/Field.focus.test.tsx` passed. `node
scripts/verify-css-architecture.mjs` passed with 92 sheets and 4,921 rules.
No browser or heavy build was launched during the active balance run. Final
integration must regenerate tracked output and observe the shared controls under
actual browser text enlargement/reduced-motion settings.

Existing inspected route proof covers Radix Escape and trigger focus restoration
in institution, decision and World inspectors; consistency proof contains a 200%
text-reflow case. Those tests were not rerun for this bounded source closeout.
Manual VoiceOver/NVDA reading order, OS display scaling, native option-menu speech
and assistive-technology announcement timing remain unverified. A passing DOM
focus test does not establish those results.

## Pending browser accessibility proof

Extended the existing `rebuild-interactions.spec.ts`, reusing `importFixture`,
`selectChoice`, `openFromNav` and overflow helpers. The new themed cases retain
real fixture campaigns and cover Nation's 200% text/Choice selection, pointer and
keyboard entry to actual authority inspectors, default focus containment, Tab /
Shift+Tab and Escape restoration. A separate real save/library workflow keeps
real IndexedDB transactions pending using read requests long enough to inspect
actual busy controls under reduced and unrestricted motion; release allows the
real transaction to finish. No demo UI, desktop storage substitute or production
interface was added.

Concrete stale test assumptions corrected: consistency now compares routes by
actual shared standard/data measure rather than requiring the two intentional
measures to be equal; States uses the existing fixture-import helper instead of
a duplicate requiring the retired Brief heading. Existing route heading,
overflow, phone detent and explicit title expansion checks remain. A source
search found no native-dialog-open/disclosure selectors needing replacement;
Radix dialog-role assertions and assertions that retired details are absent are
intentional.

`pnpm exec eslint apps/web/tests/rebuild-interactions.spec.ts
apps/web/tests/consistency.spec.ts apps/web/tests/states.spec.ts` and
`git diff --check` passed. Browser execution is pending while balance is active.
At the stable integration checkpoint, run:

```sh
E2E_ATTACH=1 E2E_PORT=5190 pnpm exec playwright test --config apps/web/playwright.config.ts apps/web/tests/rebuild-interactions.spec.ts --project mobile-390 --project desktop-1440 --grep 'shared accessibility' --workers 1 --reporter line
```

This is eight cases across two widths and both themes. The port is the parent's
integration preview and must hold the current rebuilt source before this check.
These tests do not establish manual screen-reader/native-menu speech or actual
OS scaling acceptance.
