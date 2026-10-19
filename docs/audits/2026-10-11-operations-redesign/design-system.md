# Design system inventory against BRIEF section 7

Scope: read-only inventory of branch `feat/map-first` (working tree, 2026-10-10) against `BRIEF.txt` section 7 (lines 158-418) and `docs/DESIGN.md`. Nothing was built, typechecked, linted or staged. Only `node scripts/verify-icon-registry.mjs` (read-only) and one `npm view` registry lookup were run. Every claim carries a file:line; counts come from `grep` over `apps/web/src` and `packages/ui-web/src` CSS (36 files) unless stated.

## 0. Findings that change the brief's premises

1. **The icon pipeline the brief names does not exist on this branch.** `design/os-ui`, `design/domain-glyphs`, `scripts/bake-os-icons.mjs`, `packages/ui-web/src/icon-data.ts` and `apps/web/src/glyphs.ts` are all absent from the working tree. They exist on `staging` (262 files under those paths; `git ls-tree staging`), where `icon-data.ts` is generated and holds 141 glyphs. Commit `bf2ac38b8` (2026-10-10, "Draw the player's icons from Phosphor and give every chapter its mark") replaced them with `@phosphor-icons/react` 2.1.10 (`packages/ui-web/package.json:23`). The set is now the hand-written table `packages/ui-web/src/assets/icons/icon-data.ts` (299 lines, 145 names, 16 categories). Section 7.3's "edit source masters and regenerate" and "64x64 grid / derived stroke" rules have no referent here. The decision is a real fork: keep Phosphor (one family, ~1,500 glyphs in `dist/defs`, but no jet, tank, submarine, helicopter, satellite, barrel) or restore the staging pack. Mixing is the brief's one forbidden outcome.
2. **Fonts: Source Sans 3 is not installed.** `apps/web/package.json:22-25` carries Archivo Variable 5.3.0, Geist ^5.2.5, Geist Mono ^5.2.5, Source Serif 4 ^5.2.8. The lockfile has no `source-sans-3` entry (`pnpm-lock.yaml:133-142, 957-966`), `node_modules/@fontsource/` holds only `geist`, `geist-mono`, `source-serif-4`. Registry lookup on 2026-10-10: `@fontsource/source-sans-3` latest = 5.3.0; `@fontsource/source-serif-4` latest = 5.3.0 (installed 5.3.0, `node_modules/@fontsource/source-serif-4/package.json:3`, OFL-1.1 at :43, `LICENSE` file present). Weight import paths for Sans 3 are unverified until it is installed.
3. **The app is dark-only.** `color-scheme: dark` at `packages/design/src/tokens.css:12`; no light canvas, light surface, status-pair or light-ink tokens exist. The brief's palette (7.2) is a light-surface-first system with navy chrome. Adopting it is a new token layer, not a retune.
4. **The brief says the dotted map "stays removed"; this branch is map-first** (`docs/DESIGN.md:1-3, 18-30`, `apps/web/src/map/`). Out of scope here, but it means the brief's snapshot is not this tree.

## 1. Typography

### Packages and loading

| Item | Current | Brief | Ref |
|---|---|---|---|
| UI face | Geist 400/500/600 | Source Sans 3 400/600/700 | `apps/web/src/main.tsx:10-12` |
| Display face | Archivo Variable (`wdth` axis) | none | `main.tsx:9`, `tokens.css:98` |
| Serif | Source Serif 4, weight 400 only | 400/600/700 where needed | `main.tsx:14` |
| Mono | Geist Mono 400 | system stack | `main.tsx:13`, `tokens.css:101` |
| Font CSP | `font-src 'self'`; Vite forces woff2 to emit as files, never inline | keep | `apps/web/index.html:6`, `apps/web/vite.config.ts:9-17` |

Imports are only in `main.tsx`; no other file imports `@fontsource`. Token side: `--font-display/-sans/-serif/-mono` at `tokens.css:98-101`, mirrored in `packages/design/src/tokens/typography.ts:14-19` (header comment :3-9 names Archivo/Geist). `docs/DESIGN.md:347-354` ("Type study") specifies Archivo + Geist + Source Serif 4 + Geist Mono and must change with the fonts. Geist consumers are all through `--font-sans`/`--font-display` fallbacks (`tokens.css:98-99`); no CSS names a family literally (family counts: display 16, serif 11, sans 7, mono 3 declarations).

### Size and leading scale

`tokens.css:107-119` (parity-tested against `typography.ts:26-44` by `tokens/parity.test.ts`):

| Token | px | Brief role it nearest matches |
|---|---|---|
| `--size-caption` | 12 | Metadata 12/16 |
| `--size-label` | 13 | none (brief has no 13) |
| `--size-small` | 14 | Compact data 14/20 |
| `--size-body` | 16 | Body/controls 16/24 |
| `--size-title` | 18 | Subheading 18/24 |
| `--size-heading` | 22 | Panel heading 22/28 |
| `--size-figure` | 28 | Page title 28/36 (narrow: 24/32 absent) |
| `--size-display` | clamp 28-36 | Primary figure 36/40 |
| `--size-hero` | clamp 36-48 | none |

Leading tokens are unitless (1.15, 1.3, 1.5; `tokens.css:117-119`), not size/line-height pairs, so the brief's role table (12/16, 14/20, 16/20 controls, 18/28 formal reading) is not representable. Formal-document reading (18/28, 65ch) has no token; `--measure: 640px` (`tokens.css:153`) is a pixel width.

### Occurrences of `font-size` across CSS (387 declarations)

| Value | px | Count |
|---|---|---|
| `var(--size-caption)` | 12 | 117 |
| `var(--size-small)` | 14 | 106 |
| `var(--size-label)` | 13 | 92 |
| `var(--size-title)` | 18 | 27 |
| `var(--size-heading)` | 22 | 10 |
| `var(--size-body)` (+1 with fallback) | 16 | 10 |
| `0.6875rem` | 11 | 7 |
| `var(--size-figure)` | 28 | 4 |
| `0.625rem` | 10 | 3 |
| `11px` / `10px` | 11 / 10 | 2 / 1 |
| other literals (1.375rem, 1.25rem, 1.125rem, 1.0625rem, 0.75rem, clamp(1.65..2rem), hero, inherit) | various | 1 each |

223 of 387 declarations (58%) are under 14px; 106 (27%) are 14px; 58 are 16px or larger. The brief reserves 12px for secondary timestamps and IDs only and 14px as the floor for dense data.

Sub-12px literals (no brief role): `washington/card/person-card.css:82,122,221,230`; `washington/executive/washington.css:532`; `world/nation/world-home.css:371`; `world/nation/act.css:62,420`; `map/map.css:213 (11px), 242 (10px)`; `packages/ui-web/src/styles/readings.css:654 (11px), 838 (10px), 849 (11px)`.

Primary content at under 14px (examples, not exhaustive): every `Tag` (severity, kind, staffing) is 12px uppercase with 0.06em tracking, `packages/ui-web/src/styles/tags.css:14-18`; the compact button is 13px, `controls.css:93`; the default button is 14px, `controls.css:71` (brief: 16/20); stat labels 13px, `readings.css:13`; mode-nav labels 12px at wide widths, `frame.css:263`; brief screen has the most 12-13px declarations (16), then `readings.css` (14) and `world-home.css` (13).

### Uppercase and tracking

`text-transform: uppercase` appears 14 times: `washington/card/person-card.css:86`, `washington/congress/agenda.css:14` (12px + 0.08em), `shell/dossier/dossier.css:32,39,50,109,163`, `map/map.css:224`, `brief/brief.css:405`, `decision/decision.css:37,55,62,104`, `packages/ui-web/src/styles/tags.css:18`. `letter-spacing` is set 34 times; non-zero values in use: 0.06em (4), 0.08em (3), 0.1em (2), 0.12em (2), 0.04em (2), 0.02em (2), plus -0.01em (4) and `--tracking-display` (2). `--tracking-eyebrow: 0.08em` at `tokens.css:123`. The combination the brief forbids (tiny type + muted color + uppercase + wide tracking) is the Tag and the dossier/decision eyebrows (`dossier.css:30-50`, `decision.css:35-62`). Sentence case is otherwise the norm.

Tabular numerals: `font-variant-numeric: tabular-nums` is declared per component, 44 places (e.g. `readings.css:20,36,120`, `frame.css:97`, `shell.css:367`), not on a data utility or on the root.

Mono use: 3 sites (`shell/dossier/dossier.css:106`, `nation/policy/policy.css:200`, `map/harness/harness.css:74`), consistent with the brief's "reference IDs only" if the stack is swapped for system mono.

Serif use: 11 sites for oath, decision titles, dossier banner, court and oversight headings (`founding.css:451,468`, `dossier.css:36`, `decision.css:52,175,228,417,459`, `policy.css:111`, `oversight.css:157`, `courts.css:259`). Only weight 400 is imported (`main.tsx:14`); whether any serif rule asks for a heavier weight (synthesized bold) was not checked.

Font-weight tokens: regular 400 (11+4), medium 500 (15), strong 600 (108), literal 650 (9) and 700 (5) (`tokens.css:103-105`). Sans 3 at 400/600/700 drops 500; 15 medium sites need a decision.

Gap list for 7.1: install Sans 3, replace `--font-sans`/`--font-display`/`--font-mono`, retire Geist and Archivo imports and `vite.config.ts:9` comment, add 600/700 serif weights, collapse 13px into 14px, add role pairs (size + line height), add a formal-reading role, move tabular numerals to a utility, remove sub-12px literals (13 occurrences), update `typography.ts`, `parity.test.ts`, `docs/DESIGN.md:347-354`.

## 2. Palette and surfaces

Color tokens live in `packages/design/src/tokens/color.ts` (TS source) and `tokens.css` (CSS projection), held together by `tokens/parity.test.ts`. Single theme (dark); a "light/dark" column therefore has only one value.

### Current tokens

| Role | Token (css line) | Value |
|---|---|---|
| Navy ramp | `--color-ground-abyss/sunken/base/raised/raised-hover/overlay/overlay-hover` (14-20) | #030914 #08112A #0C1734 #14234A #1A2C5A #1D3163 #253B74 |
| Ink | `--color-text-primary/secondary/tertiary/disabled/on-light` (22-26) | #F3F6FC #C3CDE4 #98A8CC #5F6C8C #0C1734 |
| Anchors | blue #7DB1FF, blue-fill #2E6BDB, blue-fill-hover #255FC8, gold #E5BC62, gold-deep #A9843A, red #FF8D96, red-fill #C42F3C, red-fill-hover #AE2734, white (28-36) | |
| Borders / focus | `--color-border-subtle` #25386B, `--color-border-strong` #6B80B6, `--color-focus` #9CC4FF (38-40) | |
| Paper | `--color-paper` #F4F1E8, `-ink` #0C1734, `-rule` #C9C0A8 (42-44) | only used at `founding/founding.css:438-440,464,474` |
| Party | democrat #55B4F2, republican #F0625C, independent #B9B2A3 (46-48); vision variants (182-201) | |
| Map ramps | `--map-seq-1..7` (50-56), `--map-standing-1..7` (59-65), `--map-div-n3..p3` (66-72), `--map-cat-1..8` (74-81), `--map-board-*` (83-90) | |
| Washes | blue/gold/red/scrim via `color-mix` (93-96) | |
| Contrast modes | `data-contrast="high"` and `prefers-contrast: more` swap secondary/tertiary/borders (203-217) | |

### Mapping to the brief's token table

| Brief token | Value | Current equivalent | Gap |
|---|---|---|---|
| Institutional navy | #162E51 | none; closest `ground-base` #0C1734 (1.30:1 apart) | new token; masthead and nav need it |
| Main canvas | #F3F5F7 | none | missing |
| Primary surface | #FFFFFF | none | missing |
| Paper | #F8F6EF | `--color-paper` #F4F1E8 | near; only the founding oath uses it |
| Main ink | #1B1B1B | none (`text-on-light` #0C1734 is navy) | missing |
| Secondary ink | #565C65 | none | missing |
| Primary action | #005EA2 | `--color-blue-fill` #2E6BDB (white 4.95:1) | different blue; brief's has white label at higher contrast |
| Functional border, light | #71767A | none | missing |
| Decorative divider | #DFE1E2 | `--color-border-subtle` #25386B (1.56:1 on base, decorative) | dark analogue only |
| Gold accent | #C9A86C | `--color-gold` #E5BC62 | brighter; brief's is 2.26:1 on white, so insignia only |
| Dark geographic surface | #14273E | `ground-raised` #14234A / `--map-board-land` #16244E | near |
| Dark foreground | #F2F5F7 | `text-primary` #F3F6FC | near |
| Dark secondary | #C4CFDA | `text-secondary` #C3CDE4 | near |
| Dark interactive | #73B3F4 | `--color-blue` #7DB1FF | near |
| Functional border, dark | #6B839C | `border-strong` #6B80B6 (4.54:1 on base) | near |
| Status: info #005EA2/#E8F2F8, pending #565C65/#F0F0F0, success #216E39/#ECF3EC, warning #7A4D00/#FFF3CD, danger #B50909/#FDE7E9, unknown #565C65/#F0F0F0 | | **none** | missing entirely; brief pairs measure 5.5-6.6:1 each |
| Focus | 3px, blue on light, #FFBE2E on navy | 2px `--color-focus` #9CC4FF, offset 2px (`apps/web/src/shell/shell.css:34-37`); override 2px gold at `washington/congress/agenda.css:11` | width and color differ; #FFBE2E on #162E51 = 8.20:1 |
| Disabled | distinct state, readable explanation | text #5F6C8C (3.38:1 on base, 3.57 on sunken) at `controls.css:84-88,138-142` | below 4.5:1; no explanation affordance |

Brief hex values computed here (WCAG relative luminance, this session): ink #1B1B1B on paper 15.93; #565C65 on canvas 6.17; #71767A on canvas 4.20 (passes the 3:1 non-text bar); #DFE1E2 on white 1.31 (decorative only, as the brief says).

### Status vocabulary today

There are no status tokens. Status is carried by `Tag` tones (`risk | caution | identity | action | neutral`, `packages/ui-web/src/Tag.tsx:5`), colored red / gold / gold / blue / secondary ink (`styles/tags.css:23-26`). `caution` and `identity` are both gold, so a warning and the institution share a color, which the brief forbids ("gold is not a substitute for a warning"). No green or success color exists in the ink or anchor sets. `.notice[data-tone="risk"]` is a separate banner (`shell/shell.css:309-324`). Gauges use `reading | identity | risk` (`Gauge.tsx:9`). Party, favorable/unfavorable and severity are separate palettes in color terms (party at `tokens.css:46-48`, diverging at 66-72) but `favorable`/`adverse` glyphs (`icon-data.ts`, status category) are TrendUp/TrendDown with no color token.

### Contrast enforcement

`packages/design/src/tokens/color.test.ts` (83 lines) enforces, on navy surfaces only:
- :9-16 text.primary/secondary/tertiary, blue, gold, red, focus at AA text (4.5:1) on abyss/sunken/base/raised/overlay.
- :18-24 white on blue-fill, blue-fill-hover, red-fill, red-fill-hover at AA; navy on gold; paper ink on paper.
- :26-30 `line.strong` at 3:1 on four grounds.
- :32-35 high-contrast variants only get louder.
- :38-82 party, sequential, diverging and categorical colors at 3:1 vs abyss; diverging symmetry; ramp steps 2.2:1 vs land.
Helpers: `tokens/contrast.ts` (AA_NORMAL_TEXT, AA_NON_TEXT, `contrastRatio`).

Not enforced (measured here, computed from token values, not from rendered states): `text.disabled` on `ground.base` 3.38:1; white on `gold-deep` (commit-button hover, `controls.css:112-116`) 3.47:1; Tag solid caution text #F3F6FC on `gold-deep` (`tags.css:36-38`) 3.21:1; `text.tertiary` on overlay 5.27:1 (passes). The brief demands rendered-state measurement (overlays, selected rows, focus rings, disabled text, map controls); no such harness is present in `color.test.ts`.

## 3. Spacing, radius and layout tokens

| Brief | Current | Ref |
|---|---|---|
| 4px base: 4/8/12/16/24/32/48 | `--space-xs..3xl` = 4, 8, 12, 16, 24, 32, 48, plus `--space-2xs: 2px` | `tokens.css:125-132`, `spacing.ts:7-16` |
| Control corner 4px, panel corner 8px | chip 4, **control 8**, **card 12**, sheet 16, pill 999 | `tokens.css:134-138`, `spacing.ts:18-24` |
| Rounding needs a role | usage: card 53, control 42, pill 36, 50% 19, chip 14, literals 2px 8 / 3px 3 / 4px 2 | CSS grep |
| Panel padding 24, rows 12-16, gutter 16 | no padding tokens by role | not tokenized |
| Touch target 44 | `--hit-min: 44px`, `--control-height: 44px`, `--control-compact: 36px` | `tokens.css:150-152` |
| Rail ~224px labeled / 80-96px compact | `--rail: 76px` | `tokens.css:143` |
| Work area, inspector 320-360 | panel `clamp(420px,48vw,640px)`, wide 960, landscape 340 | `tokens.css:144-147`, `docs/DESIGN.md:56-58` |

Brief 4/8 radii require shifting control 8 to 4 and card 12 to 8 (95 sites use those two tokens). Off-scale literal spacing in CSS: 2px (20), 3px (9), 6px (2), 5px (1), 14px (1). Media queries are em-based on 30/40/48/64 em plus height/orientation queries (see `frame.css:202,208,253`, `surface.css:90,96,151`); there is no 1440/1024/768 contract in code, because layout is panel-over-map, not rail-work-inspector.

## 4. Icons

### Pipeline as it exists

- Source of truth: `packages/ui-web/src/assets/icons/icon-data.ts`, hand-written, binding each semantic name to a Phosphor component (header comment :1-3, imports :5-148, `ICONS` table :151-296, `IconCategory` union :149). Not generated. No SVG masters exist in the tree.
- Renderer: `packages/ui-web/src/Icon.tsx`. `Icon` (:32-46) takes `name`, `size` (default 20), `weight` (`regular | duotone | bold | fill`, default **duotone**), optional `label` (img role + aria-label; otherwise `aria-hidden`, so decorative-by-default is correct). `IconBadge` (:61-67) sets a glyph in a 28/36/48 tinted tile at 0.56x. `isIconName` (:23) guards string data. Color via `--icon-ink`/`currentColor` (`styles/controls.css:13-16`).
- Phosphor is filled-path artwork per weight on a 256 viewBox (`node_modules/@phosphor-icons/react/dist/lib` shows `0 0 256 256`; `dist/defs/Airplane.es.js` shows one path set per weight). Rendered stroke width is therefore a property of the chosen weight, not a parameter; the brief's 1.5/1.75/2/2.25px targets and "64 x stroke / size" derivation cannot be applied without moving to stroke-based masters.
- Registry gate: `scripts/verify-icon-registry.mjs` (ratchet baseline `scripts/baselines/icon-registry.json`, proof twin `verify-icon-registry-proof.mjs`). Run today: **FAIL**, because the baseline is stale (11+ names listed as unbound are now bound, e.g. `eventEarthquake`, `sectorFinance`, `sectorSemiconductors`, `sectorTelecomCyber`); it needs `--update-baseline`. The baseline still forgives 50 unbound names (`icon-registry.json`).
- Bindings are scattered, not centralized: 50+ files hold their own `Record<..., IconName>` (e.g. `world/nation/ActChoices.tsx:5-33`, `record/entry-mark.ts:7-43`, `player-core/src/government/office-emblem.ts:8-67`, `washington/person/PersonVisuals.tsx:12-30`, `washington/congress/LegislativeAgenda.tsx:8-14`, `founding/stages/CabinetStage.tsx:10-27`, `nation/state/Economy.tsx:4-12`). player-core types them as `string` and the web checks `isIconName` with a `"building"` fallback (`washington/card/PersonCard.tsx:34`, `washington/executive/ExecutiveTree.tsx:12`, `world/nation/ActCompare.tsx:85`, `washington/oversight/Inspectors.tsx:21`). `apps/web/src/glyphs.ts` does not exist; the brief's "typed semantic mapping ... exhaustive" is absent.

### Glyph counts (145 names)

| Category | Count | Category | Count |
|---|---|---|---|
| sector | 23 | illustration | 6 |
| department | 19 | layer | 6 |
| action | 15 | subject | 5 |
| status | 11 | navigation | 5 |
| timeline | 10 | instrument | 5 |
| object | 10 | format | 5 |
| event | 10 | economy | 4 |
| commodity | 10 | utility | 1 |

Staging's pack was 141 across the same 16 categories (`git show staging:packages/ui-web/src/icon-data.ts`); 4 names were added on this branch (`chevron`, `expandPanel`, `info`, `restorePanel`; compared by key against staging).

### Rendered sizes used (single-line `<Icon ... size={n}>`, 260 literal uses)

20px: 136; 16px: 47; 18px: 34; 14px: 28; 24px: 5; 22px: 4; 12px: 4; 32px: 1; 28px: 1. Seventy-one (27%) are off the brief's 16/20/24/32 grid (18, 14, 22, 12, 28). `Tag` fixes its icon at 14px bold (`Tag.tsx:18`). Default `Icon` size 20 (`Icon.tsx:32`). The brief puts commodity/asset rows at 24px; the code has five 24px icons.

### Semantic coverage, derived from current domain definitions

**Commodities (11)**, `packages/engine/src/commodities.ts:28-39` and `commodity-registry.ts:95-125`: crude, natural-gas, lng, wheat, corn, soybeans, potash, nitrogen, copper, lithium, rare-earths. The icon set's ten commodity names describe a different, older trade-good list (Aluminum, Batteries, CriticalMinerals, CrudeOil, Fertilizer, MachineTools, RefinedFuel, Shipbuilding, SpecialtyCrops, Steel; `icon-data.ts:232-241`). Alignment: crude -> `commodityCrudeOil` (a water drop, `DropIcon`, `icon-data.ts:235`, shared with `sectorEnergyOil` at :216; no barrel exists in Phosphor); potash and nitrogen -> `commodityFertilizer` (a leaf, would merge two commodities); lithium and rare-earths -> `commodityCriticalMinerals` (a diamond, merges two). No dedicated glyph and no mapping at all for natural-gas, lng (flame exists only as `sectorEnergyGas`), wheat, corn, soybeans (`sectorAgriculture` = Grains), copper. Steel, aluminum, semiconductors and refined fuel, which the brief lists, are not modeled commodities: refined fuel appears only as the household "pump" reading (`nation/economy/Household.tsx:8`, the only production binding of any commodity glyph). The commodity UI (`nation/economy/Markets.tsx`) binds no commodity glyph. Verdict: 0 of 11 commodities have a bound glyph; 3 families have a near-fit.

**Sectors (23)**, `packages/world/src/schemas/sector.ts:13-37`: all 23 have a glyph (`sector*`, one each, names match ids). Bound in production: about 10 (`PersonVisuals.tsx:18,25,26`, `nation/state/Economy.tsx:7-12` which maps the 6 economy axes, `Household.tsx:8`, `ScenarioTags.tsx:26`). No mapping is keyed on `SectorId`. Weak drawings: `sectorEnergyOil` = water drop, `sectorSteelHeavy` = factory, `sectorDefenseIndustrial` = chevron shield.

**Force assets (46 ids; 5 domains ground/sea/air/space/cyber)**, `packages/world/src/schemas/force-asset.ts:40-41, 95-199` (echelons platform/unit/formation :51; count nouns formations/hulls/airframes/satellites/teams/batteries :55). Dedicated glyphs: **none**. Nearest stand-ins in the set: `instrumentMilitary` (sword), `departmentDefense` (pentagon), `sectorAerospace` (airplane), `commodityShipbuilding` (boat), `sectorPortsShipping` (anchor). The security desk labels readiness by service with `layerReading` (`world/security/Desk.tsx:89`). Phosphor 2.1.10 in `node_modules` has Airplane, AirplaneTilt, Boat, Sailboat, Drone, Rocket, Bomb, Cpu, Shield, Truck, Tractor, Train but no jet, tank, submarine, helicopter, satellite or carrier. The 46 are not 12 types: the catalog counts divisions, brigades, battalions, squadrons, hulls, strike groups, constellations and cyber teams. A fighter appears as both `air.fighter` (airframes, platform) and `air.fighter-squadron` (unit) and `air.fighter-brigade` (formation), so the brief's warning not to show "all air assets as individually counted jets" is live. Recommended coverage key: domain + echelon (about 15 glyphs), not 46.

**Departments / institutions (66 institution ids)**, `packages/engine/src/institution-catalog.ts` (counted by `id: "INST-`), plus 10 secretary roles (`packages/world/src/dataset/people.ts:59-70`). `office-emblem.ts:8-31` maps 22 institution ids to glyphs (department glyphs for State, Treasury, Defense, Justice, Interior, Commerce, Labor, HHS, HUD, DOT, Energy, Education, VA, DHS, OMB, EPA, FBI, Fed, NSC; `sectorAgriculture` for USDA; `subjectTrade` for USTR; `westWing` for the Presidency), up to 44 others fall to a kind glyph (`:38-44` intelligence, military, regulator, independent-agency, executive-office) or `"building"` (`:53`): Army, Navy, Air Force, JCS, the intelligence agencies (CIA, NSA, DIA, NRO, NGA, ODNI), FEMA, IRS, SEC, FCC, FDA, NIH, CDC, nine SCOTUS seats and so on. Role map `:56-67` covers 10 roles; Cabinet stage keeps its own copy (`founding/stages/CabinetStage.tsx:10-27`), a duplicate. The set has 19 department glyphs.

**Emergency and condition kinds (16)**, `packages/engine/src/condition-kinds.ts:15-31, 41-50`: acute earthquake, flood, drought, cyclone, wildfire, pandemic, tornado, winter-storm, heat-wave; standing unrest, recession, inflation-shock, unemployment-shock, fiscal-crisis, energy-shortage, housing-crunch. Glyphs present: `eventCyclone, eventDrought, eventEarthquake, eventEnergyShortage, eventFiscalCrisis, eventFlood, eventHousingCrunch, eventPandemic, eventUnrest, eventWildfire` (10). Missing: tornado, winter-storm, heat-wave (Phosphor has Tornado, Snowflake, CloudSnow, ThermometerHot) and no dedicated recession, inflation-shock or unemployment-shock (the `economy*` glyphs would serve). **No `ConditionKind -> IconName` map exists**: `emergency/emergency-board.ts` carries no icon; the emergency desk uses `"mapPin"` and `"escalate"` (`player-core/src/desk/family-emergency.ts:119,153`). The misleading aliases are therefore not a winter-storm-to-flood map but two other collapses: scenario tag "disaster" shows `eventEarthquake` (`decision/ScenarioTags.tsx:19`), and the Record's emergency mark is `eventUnrest` (`record/entry-mark.ts:34`). `eventDrought` is a bare sun (`SunIcon`, `icon-data.ts:271`), which will collide with heat-wave once that is added. 7 of 10 event glyphs are unbound in the live gate output.

**Action families (9) and goals (5)**, `player-core/src/act/catalogue.ts:31`: meet, sign, assist, tariff, diplomatic, economic, covert, military, congress -> fully mapped at `world/nation/ActChoices.tsx:13-23`; goals ties/trade/pressure/covert/force at :5-11. Overloading: `tariff`, goal `trade`, USTR and the Record's `trade` all map to `subjectTrade` (a shipping container); `summit` serves meet, engagement and alliances (`entry-mark.ts:22-27`). `military` = sword in four files (ActChoices :21, Situation :68, ScenarioTags :23, entry-mark :29).

**Document and process states**: act-option states `held/underway/done` -> locked/pending/approve (`ActChoices.tsx:28-32`); order pipeline `desk/shut/rulemaking/court/standing/undone` -> sign/locked/pending/court/active/reject (`nation/policy/OrderPipeline.tsx:6-13`); in-flight `operation/authorization/treaty/retaliation` -> pending/subjectCapitol/sign/caution (`world/nation/WorldHome.tsx:22-27`); receipt `done/refused` -> approve/reject (`Receipt.tsx:7,35`); bill stages are text only (`washington/congress/BillScreen.tsx:40-45`). The brief's shared pending / issued / blocked / expired / challenged vocabulary: pending (clock) and blocked (lock) exist in the `status` category; **issued, expired and challenged have no glyph**, and `pending` is reused for operation, rulemaking and under way, so one icon means three states. Each screen defines its own state-to-icon map.

**Map layers / lenses (18 lens ids)** under `apps/web/src/map/lenses/`: approval, lean, call, state-population (`state-lenses.ts:31,61,106,131`), jobs, prices, output, federal-dependence (`economy-lenses.ts:41-92`), house, house-hex, senate (`house.ts:75-86`), relations, forces, population (`nation-lenses.ts:23-91`), trade-share, press-reach, delta, neutral. The six `layer*` glyphs are used as section marks (e.g. `World/OrgScreen.tsx:23`, `WarScreen.tsx:102`), not as lens icons; no lens-to-glyph map exists. `layerRegime` is unbound.

### Brief 7.3 required identities

Crude barrel, refined-fuel pump (Phosphor `GasPump` exists; the set uses `GasCan`), gas flame, I-beam/ingot/grain (Grains exists), chip (Cpu bound to `sectorSemiconductors`), jet/bomber/transport/helicopter/carrier/ship/submarine/armored/ground formation/missile/drone/satellite, storm/heat/tornado: of these, Phosphor in this tree draws pump, flame, grains, chip, Airplane, Boat, Drone, Rocket, Bomb, Tornado, Snowflake, ThermometerHot, but not barrel, jet, helicopter, carrier, submarine, tank, satellite. The brief's proposed filenames (`unit/fighter-jet.svg` etc.) need an SVG master directory that does not exist on this branch, so they presuppose either restoring staging's `design/` tree or authoring ~12 custom SVG masters that sit beside Phosphor, which is exactly the "permanent mixed family" the brief forbids unless the whole set moves.

No gallery of the set at 16/20/24/32 on light and dark exists in the tree (staging's `/dev` contact sheet was removed with the old player; not re-checked).

## 5. Components

### `packages/ui-web/src` (exports in `index.ts`)

| Component | Purpose | Ref |
|---|---|---|
| AppFrame | Map plus bar, nav, overlay, children slots | `AppFrame.tsx:19` |
| TopBar, Wordmark | Mark, date/term status, Continue/save/search actions | `TopBar.tsx:14,30` |
| ModeNav | Five-mode nav (rail or tab bar), per-mode attention count, `aria-current` | `ModeNav.tsx:34` |
| WorkSurface | Panel/sheet with detents peek/half/full, footer slot | `WorkSurface.tsx:86` |
| Button, buttonClass | primary / commit / danger / secondary / ghost; md/sm; busy | `Button.tsx:10-26` |
| Field, Choice, Toggle | Label + hint + error (`aria-invalid`, `role=alert`); radio set (segments/cards, collapses to `<select>` when narrow); switch | `Field.tsx:20,93,131` |
| Tag | Pill for severity/kind/state; tones risk/caution/identity/action/neutral; solid pulsing variant | `Tag.tsx:16` |
| Icon, IconBadge | Phosphor-backed glyph; tinted tile | `Icon.tsx:32,61` |
| Stat | Label, value, delta arrow with spoken direction, period | `Stat.tsx:24` |
| Gauge, Ring, Steps, Trend, Series, Radar, Strip, PartyBar, Hemicycle | Drawn readings (dial, ring, pips, sparkline, time series, spider, swarm strip, party bar, seat arc) | `Gauge.tsx:72`, `Ring.tsx:23`, `Steps.tsx:22`, `Trend.tsx:49`, `Series.tsx:47`, `Radar.tsx:52`, `Strip.tsx:80`, `PartyBar.tsx:20`, `Hemicycle.tsx:55` |
| CompareAuthorize | Options table with baseline, rows, review stage, authorize verb | `CompareAuthorize.tsx:92` |
| Receipt | Past-tense title, date, term lines, outcome done/refused, record line, doors | `Receipt.tsx:24` |
| EmptyState | Icon + message, busy variant | `EmptyState.tsx:13` |
| HelpTip | Persistent tip button/popover | `HelpTip.tsx:17` |
| CommandPalette | Search overlay | `CommandPalette.tsx:95` |
| Portrait, Flag, BrandGlyph | Person, flag, seal | `Portrait.tsx:38`, `Flag.tsx:13`, `BrandGlyph.tsx:12` |
| styles | `acts.css` 384, `controls.css` 416, `doors.css` 112, `frame.css` 266, `helptip.css` 69, `palette.css` 136, `readings.css` 867, `surface.css` 161, `tags.css` 62 | `styles/` |

### `apps/web/src/shell` and screens (shared pieces)

`Frame.tsx` (135, app frame wiring), `Screen.tsx:6-37` (screen class + header: icon, title, eyebrow, lede), `ContinueControl.tsx` (111, run-clock with held-by-open-work and `role=status`), `SaveStatus.tsx` (50, save state, retry, `role=alert`), `Search.tsx`, `Door.tsx`/`DoorTile.tsx` (cards that link), `FileNavigation.tsx` (section anchors), `dossier/Dossier.tsx` (123, shared "official frame": banner, identity plate, vitals, numbered sections), `brief/TopMatter.tsx`, `MatterRow.tsx`, `MatterCard.tsx`, `NowStrip.tsx`, `TimeControls.tsx`, `decision/Decision.tsx` + `DecisionReceipt.tsx`, `world/nation/ActReceipt.tsx`, `ActChoices.tsx`, `ActCompare.tsx`, `ActStages.tsx` (act rail), `washington/card/PersonCard.tsx`.

### Brief 7.4 contract status

| Contract | Status | Evidence |
|---|---|---|
| Masthead | Partial | `TopBar.tsx` holds mark, status, actions; `ContinueControl` and `SaveStatus` live in it; there is no administration/date/attention block as one component and no separate "pause/time" control group with stable narrow layout beyond the 44px phone bar (`tokens.css:140-141`) |
| Workspace header | Partial | `Screen.tsx:37` icon/title/eyebrow/lede; no slot for contextual status or key figures; each screen builds its own header sections |
| National priority alert | Missing | the top matter is `brief/TopMatter.tsx` on the Brief only; no global alert strip that consolidates duplicates or counts further matters; attention is a number on the mode nav (`ModeNav.tsx:46-49`) |
| Local advisory | Partial | `.notice` banner `shell/shell.css:309-324` plus per-screen ad hoc blocks; no component |
| Inline validation | Partial | `Field` error (`Field.tsx:34-38`, `aria-invalid`, `role=alert`) is solid; but action problems are bare red paragraphs: **8 separately styled classes**, `.nation-problem` `economy.css:45`, `.act-problem` `policy.css:40`, `.hill-problem` `congress.css:44`, `.exec__problem` `washington.css:40` (the only one with a border and wash), `.set-problem` `set.css:37`, `.matter__problem` `brief.css:255`, `.decision__problem` `decision.css:339`, `.stage-foot__error` `founding.css:129`; 25 `role="alert"` paragraphs; red text with no icon, no summary, no correction path |
| Action receipt | Exists, shared | `Receipt.tsx` has 10 consumers (`washington/executive/ActReceipt.tsx:24`, `world/nation/ActReceipt.tsx:64`, `nation/economy/ActReceipt.tsx:26`, `nation/state/LocaleReceipt.tsx:34`, `nation/policy/ActDone.tsx:25`, `decision/DecisionReceipt.tsx:22`, `brief/CaseScreen.tsx:63`, `ScandalScreen.tsx:155`, `routes/brief.index.tsx:23`, `routes/recovery.tsx:41`). Fixed fields are title/date/lines/record; save condition and next modeled state are free text in `record`/`lines`, and there is no explicit "View record" action slot (children = doors). Three receipt-specific classes remain: `.receipt-standing` `nation.css:347`, `.set-receipt` `set.css:272`, `.nation-receipt` `economy.css:234` |
| Toast | Missing | grep for toast finds none; transient feedback is `role=status` text (`brief.index.tsx:84`, `ContinueControl.tsx:106`) and `SaveStatus` `role=alert` (`:39`) |
| Status badge | Partial | `Tag` is a pill with optional icon; state, severity and category share one component and tone set; uppercase 12px; gold doubles as caution and identity |
| Entity row | Partial | `DoorTile`/`Door` (card links), `PersonCard`, `MatterRow`, `world-list` rows in `WorldHome`; no shared row (icon + primary fact + secondary + state + chevron); each screen has its own row CSS (`.district-line` `Politics.tsx:18`, `.world-list`, `.matter`) |
| Metric | Exists | `Stat` (label, value, delta with direction word, period); evidence access and as-of are not fields |
| Inspector | Partial | `shell/dossier/Dossier.tsx`, `washington/oversight/Inspectors.tsx` (a screen, not a shared drawer); `WorkSurface` handles detents; selection/focus restoration not centralized |
| Decision workbench | Exists | `CompareAuthorize.tsx:92` + `world/nation/ActStages.tsx`/`ActDesk.tsx`/`ActManage.tsx` stage rail; three screens (`world/nation`, `nation/policy`, `nation/economy`) each assemble their own variant |
| Document viewer | Missing | no issuer/type/reference/date/status viewer; `--color-paper` is used only for the oath (`founding.css:438-440`); formal serif used piecemeal |

### Button roles

Brief: primary, secondary, tertiary, danger. Code: primary (blue), **commit** (gold, "an act that changes the presidency", `Button.tsx:3-9`), danger, secondary, **ghost**. Usage in `apps/web/src`: ghost 24, secondary 17, primary 11, danger 2, commit 1. The gold commit button is the identity color used for the consequential act, which the brief resolves with "primary identifies the main action"; keeping gold as a fifth role would be a deviation from "four roles". Sizes: md 44px / 14px text, sm 36px / 13px (`controls.css:64,71,89-93`). Disabled keeps a border and dims the ink with a 3.38:1 text color; no inline reason is rendered by `Button` (no `reason` prop).

### Tabs vs nav vs segmented vs chips vs badges

- Nav: `ModeNav` (`<nav aria-label="Modes">`, `aria-current="page"`), Doors (`aria-current`) e.g. `nation/policy/PolicyScreen.tsx:25`.
- Segmented: `Choice layout="segments"` is a radio fieldset that collapses to `<select>` (`Field.tsx:93-120`); correct semantics for 2-5 values.
- Tabs: only one real `role="tablist"` in the app (`founding/FaceBuilder.tsx:118-120`). View switches elsewhere are plain buttons using `aria-current` (`world/nation/WorldHome.tsx:244-245`, `nation/state/lenses.tsx`), styled like tabs, with no arrow-key tab behavior.
- Filter chips: no shared chip component; `.hill-jumps`/`.nation-jumps` wrap rows (`congress.css:48`, `economy.css:49`).
- Badges: `Tag`, `IconBadge`, nav count badge (`ui-mode-nav__badge`).
All five concepts therefore lean on the pill look (36 `--radius-pill` uses).

### Duplicated styling for one component

- Inline problem message: 8 classes above.
- Receipt extras: 3 above.
- Section titles: `.hill-section__title`, `.nation-section`, `.exec__*`, `.decision__*`, `.stage-*` are screen-prefixed re-implementations (not enumerated line by line).
- Gauge/meter wrappers: `ui-*` in `readings.css` (867 lines, the largest shared sheet) versus screen-local meters (`nation-*`, `person-reading__*`).
- `:focus-visible` is global in `shell.css:34-37`, then re-declared per component at `readings.css:667-672`, `helptip.css:35`, `controls.css:242,274,412`, `doors.css:30-35`, `founding.css:212`, `agenda.css:11` (gold, 2px/3px), so ring style is not one token.

## 6. What section 7 asks that the code cannot yet express, in order of leverage

1. Decide the icon family: keep Phosphor and add custom stroke-matched SVG masters for the missing silhouettes only if the whole set is re-based, or restore the staging pack from `staging` (141 glyphs; tree recoverable with `git show staging:<path>`) and extend it. The current mixed fate (Phosphor, no masters) blocks 7.3's "edit source, regenerate" rule.
2. Add a light-surface token layer (navy chrome, canvas, surface, paper, ink, status pairs, 3px focus) beside the existing dark ramp, and extend `color.test.ts` from navy-only to the new pairs and to rendered states.
3. Install Source Sans 3 (5.3.0 on the registry), add 600/700 Serif, replace `--font-sans`/`--font-mono`/`--font-display`, retire Geist and Archivo, and rewrite `docs/DESIGN.md:347-354`; collapse the 13px and sub-12px steps.
4. Introduce role pairs for type (size/line-height), keyed to the brief's table.
5. Create the missing shared components (priority alert, document viewer, toast, entity row, inline problem) and fold the eight problem classes and three receipt classes into them.
6. Resolve button roles (gold `commit` and `ghost` versus four roles) and the tab-versus-aria-current view switches.
7. Add a typed `ConditionKind -> IconName` map and a `ForceAssetId`/domain-echelon -> `IconName` map; neither exists, and `scripts/verify-icon-registry.mjs` cannot assert exhaustiveness without one.

## 7. Not verified

- Rendered contrast of any state; all ratios here are computed from token hex values.
- Whether any serif rule requests weight above 400; Sans 3 weight-file paths; font bundle size.
- Which of the 44 uncovered institutions are actually shown to the player today.
- Whether `staging`'s glyph pack passes the 48-52 unit silhouette rule; no rendering was done.
- Pixel-level icon legibility; no gallery exists to inspect.
