# Visual contract for the operations redesign

Every screen and shared component follows this. Values live in `packages/design/src/tokens.css`; never hard-code a color, size or radius a token already names.

## Surfaces

| Role | Where | Tokens |
|---|---|---|
| Canvas | behind work areas | `--color-ground-sunken` (#F3F5F7) |
| Work surface | panels, tables, sections | `--color-ground-base` (#FFFFFF) with a `--color-border-subtle` edge |
| Row / card inside a surface | repeated entities | `--color-ground-raised`, hover `--color-ground-raised-hover` |
| Paper | issued documents | `--color-paper`, ink `--color-paper-ink`, rules `--color-paper-rule` |
| Chrome | masthead, navigation | `data-surface="chrome"` (navy); set by the frame only |
| Theater | the map and anything laid over it | `data-surface="dark"`; set by the frame on the map container |

Inside `data-surface="dark"` every semantic token resolves to its dark value, so a component drawn there needs no second stylesheet. A component must not assume dark: no `color-mix(… var(--color-white) N%, transparent)` for lines or fills on light surfaces, no navy hex, no glass blur on work surfaces. Use `--color-border-subtle` for decorative dividers and `--color-border-strong` for boundaries that must stay visible (fields, controls, table frames).

## Type roles

| Role | Token | Use |
|---|---|---|
| Metadata 12/16 | `--size-caption` | timestamps, reference ids. Never the only carrier of a cost, deadline, risk or action. |
| Compact data 14/20 | `--size-small` or `--size-label`, `line-height: var(--leading-compact)` | dense tables, chart labels, secondary rows |
| Body 16/24, controls 16/20 | `--size-body`, `--leading-body` / `--leading-control` | explanations, values, buttons, tabs |
| Subheading 18/24 | `--size-title` | subsections, assessment leads |
| Panel heading 22/28 | `--size-heading` | major work areas |
| Page title 28/36 (24 on phone) | `--size-display` | one per screen (the frame's header) |
| Primary figure 36/40 | `--size-figure` | a few primary metrics, with unit and period |
| Document reading 18/28 | `--size-document`, `--leading-document`, `--font-serif` | issued instruments, max 65ch |

No `font-size` below `--size-caption` (12px) anywhere, and nothing under 14px for primary content. Weights: 400, 600 (`--weight-medium`), 700 (`--weight-strong`); no 500 or 650. Sentence case. Uppercase with tracking only for brief institutional kickers, never combined with 12px muted text. Figures in columns use `font-variant-numeric: tabular-nums`.

## Color meaning

- Blue (`--color-blue`, fill `--color-blue-fill`): selection, links, primary action.
- Gold (`--color-gold` ink, `--color-gold-deep` rule): identity and "you are here". Never a warning.
- Red (`--color-red`, fill `--color-red-fill`): danger, failure, force. Not the color of every presidential act.
- State: `--status-{info,pending,success,warning,danger,unknown}-{ink,fill}`. A state is always icon or label plus color, never a colored dot alone.
- Party: `--color-party-*` on light surfaces (AA on white). The map uses its own `--map-party-*`.
- Favorable/unfavorable change, party, alliance and emergency severity are separate scales.

## Shape and space

Spacing 4/8/12/16/24/32/48 (`--space-xs` … `--space-3xl`). Radius: controls `--radius-control` (4px), panels and cards `--radius-card` (8px), sheets `--radius-sheet` (12px). Section padding 24px; compact rows 12–16px. Do not wrap every number in its own rounded card; group related figures in one surface with dividers.

## Controls

Four button roles: primary (one per decision region), secondary, tertiary (text), danger (destructive by effect). Tabs switch views of one subject (WAI tablist); navigation links change location; segmented controls pick 2–5 modes; filter chips narrow a set; status badges describe state. Each looks distinct. Focus: 3px outline, 2px offset, `--color-focus`. Touch targets 44×44 on phone.

## Data

No display `slice(0, n)` without a visible "N of M" and a path to every row. Bare dashes are not values: say "Not available", "None", "Not assessed" or "Held" as the case is.

## Language

Institutional labels: "Authorization" not "Sign it"; "Effective dates and review" not "clocks"; "Responsible department" not "Who carries it"; no "dice roll", "seed", "resolver", "a later build adds this". Adviser speech and journalism keep their own voice.

## Quick-read cues (owner feedback 2026-10-11)

The owner found screens sloppy: only headings clickable, too few good/bad cues, overlaps and misaligned tables. These rules close that.

**Whole-row targets.** Any row or card that opens something is clickable anywhere: use the existing card-door pattern: `ui-card-door` on a card (with hover edge) or `ui-row-target` on a table or list row (hover tint only), and `ui-card-door__link` / `ui-row-link` on its one primary link (the title). Both pairs are one rule in `packages/ui-web/src/styles/doors.css`. Other buttons and links in the row keep working (they sit above the stretched link). Hover lights the whole row. Do not wrap a whole card in an `<a>` that contains other controls.

**Valence.** Whether a reading is in the President's favor is shown at a glance with one scale: good (green), watch (amber), bad (red), neutral (plain). Sources, in order: the model's own stance (`MetricStance` favorable/neutral/caution/adverse → `toneOf`/`valenceOf` in `apps/web/src/shell/valence.ts`), a change's `good` flag, an explicit status. Readings (`Steps`, `Gauge`, `Ring`, `Trend`) take `tone="good|watch|bad"`. Any row, cell or figure takes `data-valence` plus one of `ui-valence-ink` (colored word/figure), `ui-valence-bar` (4px leading bar), `ui-valence-chip` (sign + word on a tint). Always pair color with a word or sign (▲ ▼ ✓ ⚠). Party color is not valence; a Republican seat is not "bad". Tags: `tone="good"` for favorable states (Confirmed, Signed, In effect, Passed), `caution` for watch, `risk` for bad.

**Alignment.**
- Tables and row grids use one grid template shared by header and rows (`display: grid` with the same `grid-template-columns` on the header and every row, or a real `<table>`); column headers sit exactly over their cells.
- Numbers right-aligned with `tabular-nums`; units in the same cell after the number; dates and short words never wrap mid-value (`white-space: nowrap` on dates, counts, tags, buttons).
- A row never spills out of its section: every grid column has `minmax(0, …)`, long text wraps inside its cell, actions column is `auto` width with `white-space: nowrap`.
- Long descriptions in a row clamp to 2 lines (`-webkit-line-clamp: 2`) with the full text in the detail, unless the description is the decision-critical consequence.
- Buttons in rows: one size (`size="sm"`), right-aligned, vertically centered on the row; secondary actions as tertiary (text) buttons, never wrapping ("Put off" on one line).
- Meters and their words: fixed-width track and the word beside it; never overlap.
- Below the narrow breakpoint, a table row becomes a labeled block (label left, value right) — not a squeezed table.
