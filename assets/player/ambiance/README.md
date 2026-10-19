# Ambiance library

Authored environment rasters. Current direction is in `docs/DESIGN.md`. Existing integration uses masthead bands; this is implementation history, not a rule limiting imagery to those bands. Use a backdrop, scene or material where it strengthens setting and hierarchy without obscuring content or implying data.

- Assets ship as `.webp` in this directory.
- **Every route draws them in its masthead band.** Each route names a purpose
  in the chrome registry (`ROUTE_CHROME` in
  `packages/player-core/src/shell/route-table.ts`), and
  `apps/web/src/media/ambiance.ts` resolves the purpose to a plate
  (`import.meta.glob` over this directory, as `scenes.ts` and `overlays.ts`
  do). The band is at most `--chrome-masthead-band` (120 px) and moves no
  layout, so the Desk's decision card stays above the fold.
- A variant is picked deterministically from the room's purpose and a seed
  (FNV-1a over the seed), never at random, so a room shows the same plate on
  every load. The table below is the intent; `PURPOSE_VARIANTS` in
  `ambiance.ts` is what ships.

Dispatch **scene stills** (photography on decisions and wire articles) live in
`assets/player/scenes/` and resolve through `sceneUrlFor` in
`apps/web/src/media/scenes.ts`.

## Visual usage

Choose scene-specific color and lighting that sit coherently within the dark player UI. An image may contain blue, crimson, gold or other relevant hues; its color is not itself a selected control or status. Interaction and outcomes need explicit labels, shapes and semantic roles. Do not force every asset into a muted grade or repeat one treatment across all rooms.

Keep readable controls and text over artwork, and provide increased-contrast and reduced-motion alternatives. Decorative images have empty alt text; story images need an appropriate description. Preserve source provenance and avoid identifiable people, readable generated signage or real official logos in ambient assets.

## Purpose taxonomy

| Purpose | Intended for | Variants on disk |
|---|---|---|
| `ambient-field` | Default operations rooms | `operations-command`, `-b`, `-c` |
| `threshold-ceremony` | Welcome, campaigns, founding | `threshold-vault`, `-b`, `event-founding` |
| `map-field` | World / foreign desk canvas | `world-field`, `-b`, `event-drift`, `event-diplomatic`, `operations-command-c` |
| `chamber` | Conversation, person, cabinet | `human-chamber`, `-b`, `-c` |
| `press-desk` | Dispatch / editorial | `editorial-press`, `-b`, `-c` |
| `vault` | Ceremony / archive moments | `threshold-vault`, `-b`, `event-founding`, `event-removal`, `utility-instrument` |
| `event-diplomatic` | Diplomatic dispatch accents | `event-diplomatic` + chamber/ops backups |
| `event-economic` | Economic / treasury accents | `event-economic` + utility/press backups |
| `event-covert` | Intelligence / covert accents | `event-covert` + chamber/utility backups |
| `event-military` | Military / ops accents | `event-military` + ops backups |
| `event-removal` | Removal / verdict accents | `event-removal` + vault/utility backups |
| `event-drift` | Weekly digest accents | `event-drift` + world/press backups |
| `event-founding` | The oath and the founding seal | `founding-white-house`, `event-founding` + vault backups |
| `empty-state` | Honest empty surfaces | `utility-instrument`, `-b`, ops-c |
| `failure-state` | Recovery / not-found | `utility-instrument-b` + removal backup |

## Regenerating webp

Batch generation follows `docs/IMAGE_GENERATION_SPEC.md` §5 (`ambient_backdrop`).
Manual fallback:

```bash
cwebp -q 80 path/to/source.png -o assets/player/ambiance/<id>.webp
```

Register a new id in the web chrome registry when it lands, and record its
provenance the way `scripts/verify-image-provenance.mjs` requires.
