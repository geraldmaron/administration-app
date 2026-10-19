# Source-owned shadcn/ui foundation

The shared package owns the components, rather than importing an opaque UI vendor.
The implementation follows shadcn/ui's manual Vite integration and MIT-licensed
Radix composition patterns, adapted to the existing public application API.

Sources inspected on 2026-10-15 through Context7:
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/vite.mdx
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/installation/manual.mdx
- https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/changelog/2023-06-new-cli.mdx
- https://github.com/shadcn-ui/ui/blob/main/README.md

Canonical components:
- Button: Radix Slot, class-variance-authority; existing action kinds retained.
- Sheet: Radix Dialog portal, overlay, title, description and close; existing
  center/side/wide and non-dismissible authorization contracts retained.
- Popover and HelpTip: Radix collision positioning, focus and dismissal.
- Tabs: Radix controlled activation and roving focus; caller owns URL state.
- Field label and Toggle: Radix Label and Switch.
- Card structural parts, Badge, Input and Tooltip are source-owned shared parts.
  Tag is the semantic political/status adapter around Badge, not a parallel chip.
- Choice preserves native radios and full-card labels, including adaptive select
  on narrow layouts. The native platform control remains preferable to hiding
  long choices in a custom menu.

`shadcn.css` uses Tailwind v4 through the Vite plugin. It imports theme and utility
layers without Tailwind's preflight; the application's existing reset remains
canonical. All shadcn color variables map to semantic design tokens, retaining
navy/white themes and contrast/vision preferences. Material UI, Emotion, and the
Material provider are removed. Domain charts, flags, documents and institutional
components remain application-owned; migration of primitives does not establish
visual acceptance of every route.

Risk and decision: replacing focus/layer behavior can regress dismissal, nested
help, focus restoration or non-dismissible authorization. Accepted with controls:
preserve API/class hooks, keep real interactive browser verification at the
integration checkpoint, and never infer browser success from static tests.

## Verification record (foundation scope)

Project inspected: `CLAUDE.md`, package manifests, shared controls, layers, tabs,
choice CSS, design tokens, parity tests and current Vite integration. Reuse
searched in `packages/ui-web`, sibling worktrees and current dependencies;
existing public components were migrated in place. No engine or saved shape changed.

Checks executed from this worktree with Node 22 on PATH:

- `pnpm --filter @admin/ui-web... build`: pass (design, world, ui-web).
- `pnpm --filter @admin/ui-web typecheck`: pass.
- `pnpm --filter @admin/ui-web lint`: pass.
- `pnpm --filter @admin/ui-web test`: pass, six files and 89 tests.
- `pnpm --filter @admin/design test`: pass, two files and 23 tests,
  including CSS/TypeScript token parity.
- `pnpm --filter @admin/web build`: pass, existing large-chunk warning remains.
- `pnpm --filter @admin/web typecheck`: pass.
- `node scripts/verify-css-architecture.mjs`: pass with no forgiven findings.

Outcome observed: the actual development `/dev/layers` surface opened a side
inspector, dismissed by Escape, returned focus to its trigger, opened help into a
deeper inspector and restored the original help trigger. Expanded charts stayed
inside the viewport at 390×900 and 1440×900 in both light and dark themes.
A disposable Playwright browser ran `node /private/tmp/shadcn-layer-proof.cjs`:
four width/theme cases passed, no page errors. The four captures were opened and
inspected: no overlap, dialog clipping or text truncation observed. Entry motion
was allowed to settle before inspection. Initial blank recovery was reproduced
and traced to duplicate React resolution in the nested checkout; Vite dedupe
fixed the browser and inlined Vitest dependencies fixed the test runtime.

Diff reviewed: removed vendor provider/imports/dependencies and tracked generated
provider output; removed obsolete native layer mechanics, old switch CSS and
late Material pill overrides. Radio cards retain full-label activation. Series
now opens its data in a contextual inspector; unknown values remain unknown.

Residual risk: this verifies shared foundations, not every application route,
production data state, keyboard journey, phone width, high-contrast mode or
reduced-motion combination. Final application verification belongs to the stable
integration checkpoint. No whole-application acceptance is claimed here.

### Final modal consumers and nested layers

SideNav and CommandPalette now consume the canonical Sheet. The custom native
`useDrawer`/`useDialog` lifecycle and their obsolete backdrop/header/close CSS
were removed. Search preserves combobox/listbox semantics, active-descendant
keyboard navigation and glossary context; its field uses shared Input.

An integrated economy comparison reproduced a stacking defect: opening View
observations left the underlying comparison fully bright because every scrim was
z-index 80 and every content was 81. Shared Sheet and Popover now allocate order
when opened, so each new scrim sits above previous content. This also covers a
globally mounted presidential review opened from a contextual inspector.

`node /private/tmp/shared-shell-proof.cjs` passed at 390 and 1440 pixels: search
initial focus, glossary result/context, Escape focus restoration, keyboard
shortcut reopening, Enter navigation and mobile More/menu routing. No page
errors were observed. `node /private/tmp/shared-layer-order-proof.cjs` proved
ordered scrim/content values 82/83 then 84/85 and child-to-parent focus return.
The mobile navigation and nested-layer captures were opened and inspected; a
missing theme footer class discovered visually was restored before rechecking.

UI build, typecheck, lint and 89 tests passed after the migration; web build and
typecheck passed. Existing shell browser tests are also run against the isolated
server from the primary Playwright installation to avoid nested-checkout test
runner identity. This does not change or authorize a user's campaign.

Existing search proof command (run from primary, against this worktree's server):
`E2E_ATTACH=1 E2E_PORT=5291 pnpm --filter @admin/web exec playwright test shell.spec.ts --grep "search finds a place" --project mobile-390 --project desktop-1440 --output /private/tmp/shared-search-existing-results --reporter line`
Result: two passed. The initial attempt from the nested worktree could not load
the suite because Playwright resolved two runner identities; rerunning the same
existing tests from primary's single installation passed without source changes.

### Header and display-control consistency

ThemeControl now uses canonical Popover, including its naming, collision and
focus behavior. Native popoverTarget/hidePopover and the separate theme-menu
positioning CSS were removed. `node /private/tmp/shared-theme-proof.cjs` passed:
choose dark, dismiss, restore focus, and mobile More access to light theme.

Frozen integration inspection reproduced Search extending to x354.69 at 320px
and x420.03 at 390px. Phone headers now omit the redundant standalone held marker;
Continue retains its accessible reason. Below 23em Continue shows its existing
pause/advance icon with the full name retained for assistive technology. Failed
save uses a 44px recovery link on phones; desktop keeps quick Retry/Why.
`node /private/tmp/header-responsive-proof.cjs` exercised actual failed save
receipts through a refusing desktop storage boundary, then restored writes and
followed Recovery→Retry. Both 320/390 normal and failed states passed; Search
ended at 312/382 respectively. Captures were opened and inspected.

Separate open correctness concern observed in existing browser storage:
`apps/web/src/app/device-storage.ts` demotes failed IndexedDB operations to an
in-memory fallback which resolves setItem successfully. Durability degradation
is not propagated through StoragePort, so a refused browser write can still be
reported as Saved. This predates the visual work and is not fixed by these header
changes. Propagate degraded durability and require recovery feedback as a separate
correctness change; do not confuse successful in-memory writes with durable saves.

### Short viewport context

The integrated 320×568 legal-help journey reproduced a popover whose More context
control was below the viewport. The canonical popover now constrains its block
size with `--radix-popover-content-available-height` and scrolls its own content,
following the official Radix Popover “Constrain the content size” example opened
through Context7 on October 15:
https://github.com/radix-ui/website/blob/main/data/primitives/docs/components/popover.mdx.
This applies to all consumers, rather than a route-specific help override.
