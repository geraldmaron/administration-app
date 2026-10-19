# scripts/

Rule proofs, bakes, vendors and measurement instruments. Nothing here calls a local model.

## Proof gates

Every `scripts/verify-*.mjs` is a gate, and the directory is the list: run them by glob, after `pnpm run build`.
A gate's own header says what rule it holds and why; that header is the documentation.

```bash
for g in scripts/verify-*.mjs; do node "$g" || echo "FAILED: $g"; done
```

A gate named `verify-X-proof.mjs` proves `verify-X.mjs` can fail: it builds a fixture with the violation the
rule exists for, requires the gate to reject it, then runs the gate on the real tree. A gate that has only ever
passed is a gate nobody has seen work.

`verify-incident-places.mjs` holds the one place resolver for incidents: every place-bearing record the engine keeps on the campaign is a kind `placeOf` pins (or is named as not a pin), and every condition kind, emergency scope, mark and claim resolves inside the city or state it names (at the capitol for a state the gazetteer has no city in).

`verify-attention-anchors.mjs` holds the notification deep-link convention: every `#anchor` player-core appends to a matter's href (through `anchored` in `navigation/places.ts`) is an `id` the web player draws, so a badge lands on its component and not the top of the page.

## Ratchets

A ratchet gate cannot pass today's tree without forgiving what is already
wrong with it, and must not forgive anything new. Its forgiven findings live
in `scripts/baselines/<gate>.json`, and all of them are read through
`scripts/baselines/ratchet.mjs`:

- a finding the baseline does not forgive fails the gate (NEW);
- a finding that is gone fails the gate until the baseline comes down with it
  (STALE), so headroom cannot quietly forgive the next regression;
- a baseline raised above the one at HEAD fails the gate (RAISED), because an
  edited baseline would otherwise pass its own comparison.

`node scripts/verify-<gate>.mjs --update-baseline` rewrites a baseline to the
tree's counts and refuses to raise any key above HEAD.

| Gate | What the baseline forgives |
|---|---|
| `verify-disclosure.mjs` | `disclosure.json`: prints of a person's loyalty, integrity, ambition, charisma or competence as a figure. |
| `verify-foreign-truth.mjs` | `foreign-truth.json`: prints of a foreign scalar outside a fog check, and how many governments the opening campaign reads. |
| `verify-opinion-causes.mjs` | `opinion-causes.json`: surfaces that draw a public judgment's level without its causes. |
| `verify-unused-primitives.mjs` | `unused-primitives.json`: design-system parts no player-reachable surface draws. |
| `verify-icon-registry.mjs` | `icon-registry.json`: glyphs nothing binds, and bindings to glyph names the set does not draw. Binders are read in `apps/web/src`, `packages/ui-web/src` and `packages/player-core/src`. |
| `verify-scenario-dc-fallback.mjs` | `scenario-dc-fallback.json`: per home-ground scenario in the bake and the packs, `dc-by-fallback:<id>` (in or around DC without a Washington site) and `seeded-state:<id>` (a US place drawn by the seed because it authors no city or state). Authoring the state shrinks it. |
| `verify-player-prose.mjs` | `player-prose.json`: per file and rule, the mechanical marks the player-text style rules refuse in player text (refused words such as "the room," em dashes and spaced en dashes in sentences, colons joining clauses, exclamation marks, staged contrasts, repeated words, spacing). Strings are read from the syntax tree by `player-text.mjs`, so comments, class names and thrown errors are never counted. |
| `verify-metric-registry.mjs` | Two baselines. `metric-registry.json`: claimed readers (`registry:path <- path#declaration`) in the registries that the typed walk does not see reading the field, directly or one call deep. `metric-registry-blind-sites.json`: per declaration, `opaque` effect payloads typed as the whole patch type and `computed` patches whose keys no dotted path in scope resolves. Its other checks (an unregistered stored field, a field with no reader or no writer its policy needs, a `founding-only` field a campaign writes, a scenario gate credited through an evaluator that does not read the field, an unclassified condition kind, a stale `metric-registry-report.json`) have no baseline and fail outright. The cohort shares, claims outside the typed packages and gates on relationship edges and the President's alignment are named blind spots it prints on every run. Run after `pnpm run build`; it reads the registries from `dist/`. |
| `verify-css-architecture.mjs` | `css-architecture.json`: per sheet, rules in `rooms.legacy`, rooms rules that set a surface on a `.ui-*` part, literal colors outside the tokens layer, `:root:root`, a misplaced `!important`, an unlayered rule and an undeclared layer. Empty since the old player's sheets were deleted, and it stays empty. |

`baselines/hazard-draws.json` and `baselines/willingness-pending.json` belong to
`verify-willingness-route.mjs`. It reads them directly, not through
`ratchet.mjs`, so the NEW, STALE and RAISED rules above do not apply to them.

## Measurement instruments

Not gates. These play the game and report numbers; they pass or fail nothing.

| Script | Purpose |
|---|---|
| `measure-performance.ts` | Founding time, per-turn wall time as a distribution, retained heap and save size, over seeded campaigns founded the way the founding screen's quick oath founds them. `node --expose-gc scripts/measure-performance.ts --turns 208 --seeds 3 --json`, after `pnpm run build`. |
| `measure-npc-world.mjs` | What the other governments did over a run, for the world's balance. |
| `make-fixture-saves.mjs` | Builds the Playwright fixture saves in `scripts/fixtures/*.mjs` from the built engine into `apps/web/tests/.fixtures/`; the Playwright global setup (`apps/web/tests/global-setup.ts`) runs it. |
| `sim-failure-trajectories.ts` | Plays whole synthetic presidencies across five ways of governing and reports whether failure is reachable, how fast it arrives and whether it telegraphs. |
| `measure-cabinet-term.mjs` | How often the cabinet breaks over a term, per party, for idle and careful play, with empty chairs beside the counts. `node scripts/measure-cabinet-term.mjs [--party democrat\|republican\|independent]`, after `pnpm run build`. |
| `measure-join-duration.mjs` | NPC war durations under the built engine's join and under a week where no one joins. The `SEED_COUNT` and `WEEKS` environment variables size the run; `MODE=today` or `MODE=no-joins` measures one side only. |
| `probes/sec28-battery.mjs` | Who joins a staged war, and when: four wars over seeds `war-1` to `war-12`, fought 52 weeks by the war phase alone. `--mode draw\|peer`, `--carried-world on\|off`, `--out <file>`. Run it unedited, so each tree's figures compare with the last. |
| `speaker-debt.mjs` | Lists every speaker-department-mismatch warning in the shipped corpus. A work list that exits 0 either way; needs the built `packages/content` and `packages/player-core`. |
| `measure-map-spike.mjs` | Frame times of the runtime-projected map on `/dev/map`: flights, idle pans and post-landing settle, on a desktop profile and a phone profile with the CPU throttled 4× over the DevTools protocol (`MAP_PHONE_THROTTLE` overrides). Needs a built web app served by `vite preview`; `MAP_URL` points at it. |
| `report-metric-registry.mjs` | Per registered field (every `stat-consumers.ts` registry, and each stored node of the engine's `METRIC_REGISTRY`), the top-level declarations the type checker sees reading and writing it, keyed `path#declaration`, how many dealt scenarios gate on it (`scripts/lib/content-gates.mjs`), and the effect payloads too loosely typed to resolve. Writes `metric-registry-report.json` beside it, whose diff is the audit; `verify-metric-registry.mjs` fails when the committed report is not current, so rerun it and commit it with the change. `node scripts/report-metric-registry.mjs`, after `pnpm run build`. `docs/ARCHITECTURE.md` §3 describes what it resolves and what it cannot. |
| `profile-end-turn.ts` | Times each turn of one seeded campaign against the ledger's length, to show whether the cost per turn grows with the ledger. `node scripts/profile-end-turn.ts --turns 208 --seed <seed>`, after a build. |

## Migrations and dev tools

Not gates and not measurements. Run by hand when the work calls for them.

| Script | Purpose |
|---|---|
| `dev/make-state-saves.mjs` | Writes importable saves for screens no checked-in fixture reaches (`budget-building-toward`, `budget-grace`, `budget-grace-last`, `record-deep`). Needs the built `dist/`; open a save by importing it in the player. |
| `migrate-scenario-families.mjs` | Writes `family: { id, role }` onto corpus arcs that exist as bare flag pairs. `--check` prints the plan and writes nothing. |

## Bakes and vendors

`bake-*`, `vendor-*` and `draft-nation-records.mjs` regenerate checked-in
data: the world package's generated tables and maps, and the pinned inputs
under `scripts/vendor/` and `packages/world/src/dataset/seed/`. The icon table
(`packages/ui-web/src/assets/icons/icon-data.ts`) no longer has a baker; it is
edited by hand. Each generated
file's header names what writes it, so edit the source it names and rerun that
script rather than editing the output. Several `vendor-*` scripts fetch over the
network and run rarely; their headers say which.

`bake-map-lod.mjs` writes the runtime map's levels of detail to
`apps/web/src/map/data/` (world, state and district TopoJSON at two levels
each, plus `regions.json`). JSON carries no header, so this paragraph is
where those files name their writer. It reads the roster from the built
`packages/world`, so run it after `pnpm run build`.

`bake-nation-flags.mjs` and `bake-state-flags.mjs` write
`packages/ui-web/src/assets/flags/nation-flag-svgs.generated.ts` and
`state-flag-pngs.generated.ts` (same folder), neither of which is in the tree today, so
nothing consumes their output.
