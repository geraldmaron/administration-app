# The Administration identity

The working portal is a symmetric architectural frame around a centered desk.
Its open negative space keeps the silhouette readable at small sizes. It is an
original product mark, not a government seal or an assertion of official status.
It replaces both the asymmetric A and the illustrated legacy kit.

## Source and regeneration

`packages/ui-web/src/brand-geometry.ts` is the single geometry source.
`BrandGlyph` renders it directly. From the repository root, run:

```sh
node scripts/generate-brand.mjs
```

The generator requires the installed `rsvg-convert` executable. It rewrites the
SVG/PNG mark assets and `apps/web/public/brand` browser icons together. Do not
hand-edit derived assets. `mark-glyph-pack.svg` is a compatibility filename for
the same new geometry, not a separate identity. The lockup is an editable SVG
handoff using system sans-serif text; application chrome uses live typography.

## Usage

- Platform tile: white portal and gold desk on deep navy `#0B1424`.
- Transparent glyph: navy portal and deep gold on white; reversed white and gold
  over navy. Runtime inherits the surface's readable foreground and gold token.
- Do not apply party or severity colors, animate individual pieces, or surround
  the glyph with a faux official seal.
- Keep a clear area at least one stroke (8 units on the 64-unit grid). The
  exported icon has that inset. Render no smaller than 16px. Use live text beside
  the mark where the application name needs to be read.
- The two uprights and lintel are on an 8-unit grid. At 16px they use 2px strokes;
  at 24px, 3px strokes. Geometry is exactly mirror-symmetric about x=32.

`mark.svg`/`icon.png` are the tiled platform identity; `mark-glyph.svg` is the
transparent primary glyph. `adaptive-foreground.*` and `splash-icon.png` are
reversed transparent derivatives. `favicon.*` is the 32px tiled browser identity.
The web player now references generated SVG/PNG favicons and an Apple touch icon.
Desktop packager/window icon configuration is not changed by this bounded pass.

The atmospheric `title-keyart.webp`, `loading-backdrop.webp` and
`splash-field.webp` remain scene artwork. The obsolete `design/brand-kit` exports
remain explicitly historical and must not be used as regeneration inputs.

## Verification record (2026-10-15)

`node scripts/generate-brand.mjs` generated the assets successfully.
`node --check scripts/generate-brand.mjs` passed. Scoped ESLint passed via
`pnpm exec eslint packages/ui-web/src/BrandGlyph.tsx packages/ui-web/src/brand-geometry.ts scripts/generate-brand.mjs`.
SHA-256 comparison before and after a second generator run found identical outputs.
`rsvg-convert` rendered `proof.svg`; `proof.png` was opened and inspected at
native 16/24px and enlarged in both theme grounds. Bracket and colonnade
alternatives were rejected as coding-logo and generic courthouse readings.
Full application build, typecheck, lint, and browser verification are deferred
to the integration checkpoint; this record does not claim those have passed.
