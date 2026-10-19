# Universal player program: Expo + Tamagui

Owner direction, 2026-10-16: deliver the player to iOS, Android and the web from one Expo + Tamagui codebase. Evaluate every surface against one component-based, context-aware design system that supports data-driven decisions. The goal is a rebuilt presidential management application that is immersive, intuitive and works at every device size, not polish on the existing player. It must have:

- benchmark comparison: against defined benchmarks, between entities, against the player's own record, and between the player and other entities;
- linked related information and helpers;
- a real calendar, notification centre and news interface;
- emblems and branding for every organization;
- maps;
- classification markings;
- a Handbook and helpers that cite the law enabling each act.

Owner answers to the planning questions, 2026-10-16:

- **Platform.** Build a new Expo app (`apps/player`) and a new Tamagui design system (`packages/ui`), rebuilding on `packages/player-core` surface by surface. Retire `apps/web` and `packages/ui-web` at route parity. Electron hosts the web export.
- **Emblems.** Authored, faithful SVG emblems, never official artwork, with a non-endorsement notice (DECISIONS §8.10).
- **Maps.** MapLibre Native on devices and maplibre-gl on the web, both reading one lens registry in player-core (DECISIONS §8.8).
- **Pace.** Everything, continuously, wave after wave, committed and pushed per wave.

The standing rules are in DECISIONS §8.1–§8.12. This file is the execution plan and the wave ledger.

## Stack, as installed

| Piece | Version | Notes |
|---|---|---|
| Expo SDK | 58.0.11 | Latest on npm at install, released 2026-09-29. Native module versions are pinned from the SDK's `bundledNativeModules.json`. |
| React / React Native | 19.3.0 / 0.88.0 | One React for the whole workspace through the root `pnpm.overrides`. The legacy web player moved from 19.2 to 19.3 with it. |
| Tamagui | 3.0.17 | See "Tamagui v3 dialect" below. The runtime drives the styling; the optimizing compiler is not enabled. |
| Router | expo-router 58 | Typed routes; `web.output: "single"` for the export Electron loads. |
| Icons | phosphor-react-native 3.0.6 | The legacy player's icon names, ported one-to-one (`packages/ui/src/icons/icon-data.ts`), imported per icon. |
| Saves | expo-sqlite kv-store on device; IndexedDB on the web; the desktop bridge under Electron | All three go through player-core's `StoragePort`; `createSaveStore` is unchanged. |
| Fonts | Source Sans 3, Source Serif 4 via `@expo-google-fonts` | Face names in `packages/ui/src/theme/tamagui.config.ts` (`FONT_FACES`). |

**Tamagui v3 dialect.** These are recorded because each one cost a debugging round:

- Theme keys and tokens are written bare (`backgroundColor="surface"`, `gap="md"`), with no `$`.
- Pseudo-states are flat objects (`{ default, hover, press, "focus-visible" }`). `hoverStyle` and `pressStyle` are gone.
- A custom variant named `space` or `role` collides with Tamagui's own props. Text sizes use `variant`; spacing uses `gap`.
- The React Native animation driver is native-only. `animations.ts` (CSS) and `animations.native.ts` split it.
- Expo Router uses `src/app` as the routes root whenever that folder exists, so app code never lives there.

## Wave ledger

Wave keys are `UP0`–`UP11`. The keys `W0`–`W10` and the pin ledger belong to the map-first program, which this program does not close or reopen.

| Wave | Scope | Acceptance | Status |
|---|---|---|---|
| UP0 | Decisions and gates; scaffold `apps/player` and `packages/ui`; theme from `packages/design`; responsive shell; title | Renderer boundary gate and proof pass; `expo export -p web` serves the themed title and frame at 390×844 and 1440×900 | landed (`gates/up0.md`) |
| UP1 | Move renderer-neutral logic out of `apps/web` into player-core: search indexes, review machine, handbook selectors (the lenses move with the map in UP7; chart scale went to `packages/ui` in UP0, since the design system may not import player-core) | Legacy web tests unchanged and green | not started |
| UP2 | The `packages/ui` catalog (below), with a `/catalog` route as its live inventory | Catalog renders in light, dark, high contrast and situation at both sizes; axe clean on the web export | not started |
| UP3 | Shell and founding: title, administrations, founding, the Brief desk, Continue, Settings | Playwright on the export: found an administration, Continue, reload, and the save is restored. **Integration checkpoint** | landed: Brief, Continue, decisions and the presidential review, founding, settings, saves; Continue advances time after the lead decision and its scandal are answered (`HANDOFF.md`) |
| UP4 | Calendar and notifications: `player-core/calendar` (`buildCalendar`), `player-core/notifications` (`buildInbox`), agenda and month views, deadline clocks, inbox, badge, opt-in local reminders | Every clock source unified in tests; inbox reachable from the badge at both sizes | partly landed: models, Calendar screen and inbox; device reminders not wired |
| UP5 | Law and Washington: `player-core/authority` registry (below); "The law" Handbook chapter; Executive, cabinet, offices, person dossier, Congress, courts and oversight with citations wherever an act is offered | `verify-authority-citations` passes | landed: authority registry, "The law", Handbook, Executive, dossiers, Congress, courts, oversight; some acts not exercised (`HANDOFF.md`) |
| UP6 | Emblems and documents: `player-core/seals` registry; authored emblems for every institution, organization and outlet; Document, Letterhead, classification banner and portion marks | `verify-seal-coverage` reports 100%; the President's daily brief and memos render their banners | partly landed: 129 emblems, mastheads, document primitives in use on the oath, decisions and press |
| UP7 | Maps: `MapView` native and web, all lenses, legend as key, list view from the same rows | Lens row parity against the legacy snapshot; `expo prebuild --no-install` passes. **Integration checkpoint** | work in progress, unreviewed: MapLibre web and native MapView and lenses are committed but not wired into screens or run on a device |
| UP8 | Comparison, Nation and World: `player-core/compare` (`compareEntities`); BenchmarkChart and CompareMatrix; Nation (budget, economy, electorate, emergency, policy, states) and World (nations, organizations, treaties, wars, security, command) | Unit tests cover all four comparison modes; e2e compares the U.S. against a nation, a benchmark and its own record | partly landed: comparison model reviewed; Nation, Compare workspace and World are work in progress, unreviewed |
| UP9 | News: feed by outlet, topic and entity; mastheads; article view; press desk and responses; entity peeks from copy | Feed filters; links open the right dossiers | landed from the agent's report: front page, feed, mastheads, articles, press desk; not re-run by the integrator |
| UP10 | Record and the rest: Record, dispatches, the full Handbook, ending, legacy | Route coverage for `apps/player` equals the legacy route list | partly landed: Record, ending, legacy, recovery, More; full Handbook done under UP5; route coverage not yet measured |
| UP11 | Cut-over: Electron hosts the player's export; delete `apps/web`, `packages/ui-web` and their gate branches; DESIGN, ARCHITECTURE and SCHEMA match the tree | Desktop launches the export; full gate set green. **Final integration** | not started |

Each wave lands with targeted checks and a gate record in `gates/<wave>.md` saying what was actually run. It is committed and pushed to the working branch. Bulk sweeps run at the integration checkpoints (UP3, UP7, UP11), per the owner's validation cadence.

## Parallel construction

From UP3 the model halves of UP4, UP5, UP6 and UP8 and the founding, settings and saves screens were built by five agents working in one tree, each owning a disjoint set of paths. The integrator alone edited the barrels, docs, BACKLOG, builds and commits. Each module was reviewed, wired and verified before it was committed.

## The design system catalog (`packages/ui`)

Every component is themed through tokens. It works with keyboard and screen reader on the web, carries accessibility labels on devices, and takes its data as view models. It never reads the engine.

- **Theme.** Themes are `light`, `dark`, `light_contrast` and `dark_contrast`, with sub-themes `chrome` (navy masthead and navigation), `paper` (issued documents) and `situation` (classified material and crises). Media widths are `phone` (<768), `tablet` (≥768), `desktop` (≥1024) and `wide` (≥1440).
- **Layout.** AppShell (built), Page (built), Split (list and detail), Sheet (bottom sheet on phones, drawer on desktop), Panel, Section, Grid.
- **Primitives.** Text (built), Row and Column (built), Surface (built), Button and Pressable (built), Badge and CountDot (built), Icon (built), Tabs, Segmented, Field, Toggle.
- **Data.** Stat (value, unit, delta, provenance), Trend, BenchmarkChart (series, benchmark bands, gate lines, peer overlay), CompareTable and CompareMatrix (rank, percentile), Gauge, Meter, Hemicycle, PartyBar, Legend.
- **Documents.** Document, Letterhead, Seal and SealNotice, ClassificationBanner, PortionMark, Receipt, LegalCitation.
- **Context.** EntityLink (peek sheet), RelatedRail, HelpButton (one "?" sheet holding the term, the process and the cited law), CommandSearch.
- **News.** Masthead, ArticleCard, ArticleView, Feed.
- **Calendar and notifications.** Agenda, MonthGrid, DeadlineClock, TermTimeline, Inbox, NotificationRow, Toast.
- **Decision.** CompareAuthorize: compare (always with a wait option), review, named confirmation, resolution, receipt, then a Record entry (DECISIONS §8.9).
- **Identity.** Portrait (the legacy SVG renderer ported to react-native-svg), Flag, BrandMark (built).

## New player-core modules

- **`map/`.** The lens registry and its data helpers, moved out of `apps/web`. A lens returns rows, never GL paint.
- **`compare/`.** `compareEntities(state, metric, subjects)`. A subject is the U.S., a simulated nation, a historical benchmark (`engine/src/benchmarks.ts`), the player's own record at a turn, or a state. The result is aligned series, rank, percentile and the gap to each benchmark. It reuses `metricHistory`, `economyHistory` and the World Bank peer set, and adds simulated-nation series.
- **`calendar/`.** `buildCalendar(campaign): CalendarEvent[]` unifies summons clocks, `due`, the floor schedule, the court calendar, the election calendar and term milestones. It is derived on read and never stored.
- **`notifications/`.** `buildInbox(campaign, seen)` merges attention matters by urgency with high-salience feed items and near calendar events. Read state lives in preferences.
- **`authority/`.** One record per authority: citation, title, kind (constitution, statute, regulation, executive order, case, treaty), summary, what it enables, what limits it, and a public source link. It is seeded from `OrderAuthority`, the order families, the War Powers Resolution, the National Emergencies Act, IEEPA, the Stafford Act, the Defense Production Act, the Insurrection Act and Article II. Directive authority text becomes a reference into the registry.
- **`seals/`.** `sealFor(institution | organization | outlet) → SealId` plus metadata. The drawings live in `packages/ui/src/seals/`.

## Verification and its limits

- **Each wave.** Run targeted vitest for the changed packages, then `pnpm --filter @admin/player typecheck lint`. Then run `expo export -p web` and drive Playwright against the served export at 390×844 and 1440×900, with spot checks at 320, 1280 and 1920.
- **Native bundling.** `expo export -p ios -p android` from UP3, and `expo prebuild --no-install` from UP7.
- **No device runs here.** The cloud container has no iOS simulator or Android emulator. Native gestures, MapLibre Native rendering, the SQLite vault and notifications on a device are verified only by typecheck, bundling and prebuild until someone runs a development build on a device or through EAS. Every gate record says so.

## Risks

- **Duplicate React under the hoisted layout.** This is what retired the earlier Expo player. Mitigated by the root override; `pnpm why react` must show one version.
- **Electron serving the Expo export over `administration://`.** Asset paths are proved at UP11, or earlier if the desktop host is touched.
- **Engine speed on Hermes.** There is no web worker on devices, so end-of-turn time is measured at UP3, with chunking if needed.
- **Emblem intellectual property and citation accuracy.** Emblems are authored and noticed. Every authority record carries a source link and gets a review pass.
- **Two players during the overlap.** `apps/web` is feature-frozen.
