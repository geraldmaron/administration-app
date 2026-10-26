# The Administration identity: the Nib

The mark is an upright fountain-pen nib. The President's work in this game ends
in a signature, so the mark is the instrument of that act rather than the
building or the office. Brass fills the breather hole, the point where ink
leaves the pen, because in the desk system brass means presidential authority.
It is an authored product mark: never a seal, eagle, shield or anything that
claims official status (DECISIONS §8.10). It replaces the portal-and-desk mark
of 2026-10-15, which the frozen legacy DOM player keeps until it is deleted.

## Source and regeneration

`packages/design/src/tokens/brand.ts` is the only geometry source. `BrandMark`
in `packages/ui` draws it live; the generator renders every asset from the
built copy, with colors from the desk tokens (`packages/design/src/tokens/desk.ts`).
From the repository root:

```sh
pnpm --filter @admin/design run build
node scripts/generate-brand.mjs
```

The generator needs `rsvg-convert` (Homebrew `librsvg`) and the installed
workspace (it sets the lockup in the Newsreader TTF the player bundles). It also
fails if `apps/player/app.json`'s background and accent colors drift from the
desk tokens, since JSON cannot import them. Do not hand-edit derived files.

## Geometry

- 64-unit grid, mirror-symmetric about x=32. The body runs from a flat top
  (x 20–44, y 4) to shoulders at y 32 (x 12 and 52) and the point at (32, 60).
- The breather hole (r 6 at 32, 28) and the 4-unit slit are one keyhole cut, so
  in one ink the mark is a silhouette with a keyhole and needs no brass.
- Every edge is on a 4-unit step, so 32px renders land on whole pixels. Below
  24px, `BRAND_PARTS_SMALL` widens the slit to 8 units and the hole to r 8, so
  16px renders do too. `brandParts(size)` picks the set; `BrandMark` uses it.

## Usage

| Use | Ink | Accent | Ground |
|---|---|---|---|
| Night | `desk.night.ink` | `desk.night.brass` | `ground`, `plane`, `raised` |
| Day | `desk.day.ink` | `desk.day.brass` | `ground`, `plane`, `raised` |
| One ink (print, emboss, mono UI) | either ink | none: the hole stays cut | any |
| Tile (icon, favicon) | `desk.night.ink` | `desk.night.brass` | `desk.night.plane` |

Measured with `contrastRatio` from `@admin/design`: night brass 9.9:1 on
`plane`, 10.5:1 on `ground`; day brass 5.7:1 on `plane`, 4.8:1 on `ground`; ink
15–18:1 everywhere. In the player, `BrandMark` takes ink from the zone's
`chromeColor` or `color` and brass from `gold`, so on paper and in the
situation room the accent follows that zone's ink.

- **Clear space:** 12 units (the hole's diameter) on every side. At 24px that is
  4.5px; beside a name, the gap to the text is at least that.
- **Minimum size:** 16px. `BrandMark` will not draw smaller.
- **Don't:** recolor brass to signal blue, alarm red or a party color; put the
  hole in any color but brass or the ground; outline, tilt, animate any part;
  set the nib inside a ring, wreath, star field or shield; stretch it.
- **The name:** in the player, live text beside the mark. For store pages and
  press, the lockup sets "The Administration" in Newsreader Medium, the desk's
  ceremonial face, with its x-height near the shoulders of the nib.

## Files

| File | What |
|---|---|
| `mark-glyph.svg` / `.png` | transparent glyph, Day inks |
| `mark-glyph-reversed.svg` | transparent glyph, Night inks |
| `mark-glyph-mono.svg` | one ink, hole cut |
| `mark.svg` | rounded graphite tile, glyph inset 8 units |
| `icon.svg` / `icon.png` | 1024 app icon, full-bleed square (iOS and Steam apply their own masks) |
| `adaptive-foreground.svg` / `.png` | Android foreground, glyph at 0.6 scale inside the 66% mask circle; background `night.plane` |
| `splash-icon.svg` / `.png` | Night-ink glyph for the splash on `night.ground` |
| `favicon.svg` / `favicon.png` | 32px tile, glyph at grid scale for whole pixels |
| `favicon-16.svg` / `.png` | 16px tile, small geometry |
| `lockup*.svg` / `.png` | mark and name: transparent Day, transparent Night, on `night.ground`, on `day.ground` |
| `proof.svg` / `.png` | every size on Night, Day and one ink; the tile; the adaptive mask crop |

`apps/web/public/brand` holds the retired mark for the legacy player and is no
longer regenerated. The atmospheric `title-keyart.webp`, `loading-backdrop.webp`
and `splash-field.webp` are scene artwork, not identity.

## Decision record (2026-10-24)

Five directions were drawn and rendered at 16, 24, 32 and 512px on Night, Day,
the tile and one ink: the Oval (the room in plan), the Lit Window (the house at
night), the Apex (an open A over a desk line), the Lamp (a desk lamp's cone) and
the Nib. An adversarial review on Codex (`gpt-6.1-sol`, read-only) ranked them
Nib, Oval, Window, Apex, Lamp: the Oval read as a remove button or a visor, the
Window as a calculator or door, the Apex as a roof or caret, and the Lamp as a
traffic cone close to VLC's. The Nib won because signing is the player's own
act. Its strongest objection is that a recognizable tool risks reading as a
writing app; the controls are an upright, heavy, symmetric drawing unlike
angled pen-tool icons, a brass hole that ties it to the desk's authority color,
and pixel-true geometry. Still open: a blind recognition test with players.
