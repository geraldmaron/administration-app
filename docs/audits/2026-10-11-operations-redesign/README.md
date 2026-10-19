# Operations redesign, started 2026-10-11

The owner's brief (`BRIEF.txt`, verbatim) asks for a full audit and redesign of the player as a presidential operations application. This folder is the one linked set of artifacts for that work. It supersedes the visual half of W9 in the map-first program (`../2026-10-10-map-first/PROGRAM.md`); the engine, dataset, content pipeline, saves, player-core selectors and the map directive contract carry over unchanged.

| File | What it holds |
|---|---|
| `HANDOFF.md` | Start here in a new session: state, what is in flight, next steps in order. |
| `CONTRACT.md` | Binding visual and interaction rules, including the owner's quick-read cues. |
| `BRIEF.txt` | The owner's brief, unedited. Its route list and H-series leads describe an October 1 snapshot, not this tree. |
| `README.md` | This index: baseline, decisions, waves, status. |
| `routes.md` | Current route and workflow coverage matrix (39 routes plus root), reconciliation of the brief's 48 historical entries, shell structure and breakpoints. |
| `leads.md` | H01–H18 revalidated against current source; display truncations; implementation language; commit lifecycle. |
| `design-system.md` | Typography, palette, spacing, icons and component contracts against brief section 7. |
| `data-inventory.md` | Collection sizes, growth, truncation and unit handling. |
| `before/` | Rendered baseline at 1440×900 and 390×844 (`before/INDEX.md`). |
| `after/` | Rendered result, same sizes plus the breakpoint matrix for shared layouts. |
| `findings.md` | The findings register (ID, severity, evidence, correction, acceptance, status). |

## Baseline (2026-10-11)

- Checkout `.`, branch `feat/map-first`, HEAD `896234467`, 0 behind `staging`.
- Uncommitted at start: 159 modified files and untracked `apps/web/src/map/gl/`, `apps/web/public/map/relief/`, `apps/web/src/map/view.ts`, `apps/web/src/record/`, `scripts/bake-map-relief-tiles.mjs`. This is BL-98 (MapLibre rebuild, steps 1 and 2) and the experience-pass screenshots. Pinned unchanged as `refs/safety/pre-ops-redesign-2026-10-11` before any edit.
- The play map is no longer dotted: MapLibre GL draws filled regions with relief tiles. Dots remain only on the title globe. The brief's "dotted map removed" holds.
- The current player has 39 routes under five modes (Brief, Washington, Nation, World, Record). Six historical routes have no current screen (`/ending`, `/legacy`, `/dispatch/$id`, `/reference`, `/showcase`, most of `/ops`), and player-core links to four routes that do not exist (`routes.md` X-findings).
- The icon family is Phosphor (`@phosphor-icons/react` 2.1.10) bound through a hand table in `packages/ui-web/src/assets/icons/icon-data.ts`; the brief's native pack was retired on this branch in `bf2ac38b8`.
- Fonts loaded: Geist, Geist Mono, Archivo, Source Serif 4 (400). Source Sans 3 is not installed. The palette is dark-only.

## Superseded requirements

| Earlier rule | Where | Replaced by |
|---|---|---|
| "The game is played on one persistent map; every screen sets the camera" | `docs/DESIGN.md` opening, `PROGRAM.md` owner decisions | D1 below (owner decision 2026-10-11) |
| Deep-navy canvas as the ground | `docs/DESIGN.md` Identity | D2 |
| Geist/Archivo pairing | `docs/DESIGN.md` §3 typography | D3 |
| Standard panel `clamp(420px, 48vw, 640px)` for every class | `docs/DESIGN.md` §1 work surface | D6 |
| Five flat modes | `apps/web/src/shell/modes.ts` | D5 |

## Decisions

Each is task → friction → constraint → chosen pattern → reason → test.

- **D1 Shell (owner, 2026-10-11).** Map only where geography helps. Screens keep declaring a class: `spatial` screens (World, a country, a state and the US home, emergency, war, command, organization, security theaters, the title) draw the map across the work canvas with an inspector beside it; `workspace` screens (Desk, decisions, Washington, courts, Congress, policy, orders, budget, economy, Record, settings, saves, founding) draw no map and take the full canvas. `hybrid` is retired: each hybrid screen was reassigned by brief §8.2. The map directive contract stays, so a screen that later needs geography opts in. Test: no map element mounted on a workspace route; spatial routes keep selection through layer changes.
- **D2 Surfaces.** Light analytical canvas `#F3F5F7`, white work surfaces, navy `#162E51` masthead and navigation, paper `#F8F6EF` for issued documents, dark theater `#14273E` for the map. No second theme in this pass. Test: `color.test.ts` contrast pairs for every role, plus rendered checks.
- **D3 Type.** Source Sans 3 (400/600/700) for UI and data, Source Serif 4 (400/600) for document titles and formal reading. Role scale per brief §7.1 in rem. Geist, Geist Mono and Archivo removed once no consumer remains.
- **D4 Icons.** Keep Phosphor as the single family; draw missing domain silhouettes (aircraft, ships, armor, formations, missile, drone, satellite, winter storm, heat wave, tornado, crude oil vs refined fuel, commodity marks) as custom glyphs on Phosphor's 256 grid in its regular weight, registered in the same table. Reason: the retired pack would need a full redraw and a second pipeline; Phosphor already covers 145 UI names at consistent optics. Fallback is explicit and warns in development.
- **D5 Navigation.** Grouped labeled navigation: Desk (Brief, Digest), Government (Executive, Congress, Courts, Oversight), Domestic (States, Policy, Budget, Economy, Emergency), World and security (World, Security), Communications (Press), Record, and utilities (Administrations, Settings). Phone keeps a five-slot bar: Desk, Government, Domestic, World, More (drawer with the full hierarchy).
- **D6 Breakpoints.** ≥1440: 224px labeled navigation, flexible work, optional 320–360px inspector. 1024–1439: 88px compact navigation with labels under icons. 768–1023: drawer navigation, one work area. <768: single column, bottom bar, sheets for detail, Map/List/Details on spatial screens.
- **D7 Authorization.** One shared authorize hook replaces the nine near-copies: single flight, stale-terms refusal that names what changed, applied-but-unsaved distinguished from refused, stay in context with a durable receipt and an explicit View record.
- **D8 Views.** Multi-topic screens use a real WAI tablist addressed by `?view=` so Back and reload keep the tab.
- **D9 Full data.** One shared collection contract: ranked first view, "N of M" visible count, and a path to every row. No bare `slice(0, n)` for display.

## Waves

Status as of 2026-10-11, measured against the working tree (nothing committed yet). Verification so far is the live dev server at the composed sizes plus focused unit tests; the full gate run, e2e specs and before/after evidence are not done (the owner asked to skip gates during the UI pass).

| Wave | Scope | Status |
|---|---|---|
| R0 | Baseline audit and decisions | Done: `routes.md`, `leads.md`, `design-system.md`, `data-inventory.md`, `findings.md`, 34 of 39 routes captured in `before/` |
| R1 | Tokens, type, palette, icons, shared components | Built and seen live: light tokens and dark scopes, Source Sans 3 and Source Serif 4, status pairs, 3px focus, custom domain glyphs and `/dev/icons`, `Tabs`, `Collection`, `Document`, one authorize hook, institutional language |
| R2 | Shell, navigation, map placement | Built and seen live at 1440, 1280, 1024, 820, 390 and 320: grouped navigation in four presentations, map only on spatial screens, phone Map/Details switch, masthead at every width |
| R3 | Washington, policy, budget, economy, decisions | Restructured by screen agents; seen live for the Desk, decision, Congress, executive roster, budget, economy, policy, order |
| R4 | World, security, states, emergency, Record, press | Restructured; restored press room, dispatch, ending, legacy from the unmerged `w8a-record` commit; seen live for the US home, Record, press, security |
| R5 | Polish to owner feedback (whole-row targets, good/bad cues, alignment), e2e spec updates, gates, before/after evidence | Polish pass running; specs and gates not started |
