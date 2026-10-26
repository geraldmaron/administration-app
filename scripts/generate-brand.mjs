/** Rebuild every player identity asset from the mark's one geometry source in @admin/design. */
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The built copy, so the script reads exactly what the players import. Rebuild @admin/design first after editing brand.ts.
const design = await import(pathToFileURL(path.join(root, 'packages/design/dist/index.js')).href);
const { BRAND_VIEW_BOX, BRAND_PARTS, BRAND_PARTS_SMALL, BRAND_CLEAR_SPACE, desk } = design;
const night = desk.night;
const day = desk.day;
const assets = path.join(root, 'assets/player/brand');

const artwork = (inks, parts = BRAND_PARTS) =>
  parts.map((part) => `<path fill-rule="evenodd" d="${part.d}" fill="${inks[part.role]}"/>`).join('');
const NIGHT_INKS = { ink: night.ink, brass: night.brass };
const DAY_INKS = { ink: day.ink, brass: day.brass };
const MONO_INKS = { ink: day.ink, brass: 'none' };

const square = (body, size = 1024) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${BRAND_VIEW_BOX}">${body}</svg>\n`;
// The icon tile insets the glyph by 8 units for the platform's corner rounding. Favicons draw it at
// full grid scale instead: the nib's own 4-unit margin clears rx 14, and only grid scale keeps the
// slit and hole on whole pixels at 16 and 32px.
const tiled = (parts, { rounded = true, inset = true } = {}) =>
  `<rect width="64" height="64"${rounded ? ' rx="14"' : ''} fill="${night.plane}"/>${inset ? `<g transform="translate(8 8) scale(0.75)">${artwork(NIGHT_INKS, parts)}</g>` : artwork(NIGHT_INKS, parts)}`;
// Android masks the adaptive foreground to as little as the center 66%; the nib's farthest corner is 30.5 units out, so 0.6 keeps it inside.
const adaptive = `<g transform="translate(12.8 12.8) scale(0.6)">${artwork(NIGHT_INKS)}</g>`;

function render(source, output, size) {
  execFileSync('rsvg-convert', ['--width', String(size), '--height', String(size), '--output', output, source]);
}
function write(name, content) {
  writeFileSync(path.join(assets, name), content);
  return path.join(assets, name);
}

const glyph = write('mark-glyph.svg', square(artwork(DAY_INKS)));
write('mark-glyph-reversed.svg', square(artwork(NIGHT_INKS)));
write('mark-glyph-mono.svg', square(artwork(MONO_INKS)));
write('mark.svg', square(tiled(BRAND_PARTS)));
const favicon = write('favicon.svg', square(tiled(BRAND_PARTS, { inset: false }), 32));
const icon = write('icon.svg', square(tiled(BRAND_PARTS, { rounded: false })));
const tileSmall = write('favicon-16.svg', square(tiled(BRAND_PARTS_SMALL, { inset: false }), 16));
const foreground = write('adaptive-foreground.svg', square(adaptive));
const splash = write('splash-icon.svg', square(artwork(NIGHT_INKS)));
rmSync(path.join(assets, 'mark-glyph-pack.svg'), { force: true });

render(icon, path.join(assets, 'icon.png'), 1024);
render(favicon, path.join(assets, 'favicon.png'), 32);
render(tileSmall, path.join(assets, 'favicon-16.png'), 16);
render(foreground, path.join(assets, 'adaptive-foreground.png'), 1024);
render(splash, path.join(assets, 'splash-icon.png'), 512);
render(glyph, path.join(assets, 'mark-glyph.png'), 512);

// The legacy DOM player links its own browser icons from public/brand until it is deleted; they are derived here so its tab shows the same mark.
const legacyBrand = path.join(root, 'apps/web/public/brand');
writeFileSync(path.join(legacyBrand, 'favicon.svg'), readFileSync(favicon));
render(favicon, path.join(legacyBrand, 'favicon.png'), 32);
render(icon, path.join(legacyBrand, 'apple-touch-icon.png'), 180);

// The lockup: the mark beside the name set in Newsreader, the desk's ceremonial face. A private
// fontconfig points rsvg at the TTF the player already bundles, so no system font is needed.
const fontDir = path.join(root, 'node_modules/@expo-google-fonts/newsreader/500Medium');
const fontConf = path.join(assets, '.fonts.conf');
writeFileSync(fontConf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${fontDir}</dir><cachedir>${path.join(root, 'node_modules/.cache/brand-fontconfig')}</cachedir></fontconfig>`);
const lockup = (inks, ground) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="160" viewBox="0 0 1040 160">${ground ? `<rect width="1040" height="160" fill="${ground}"/>` : ''}<g transform="translate(24 16) scale(2)">${artwork(inks)}</g><text x="168" y="104" font-family="Newsreader" font-weight="500" font-size="72" letter-spacing="-0.5" fill="${inks.ink}">The Administration</text></svg>\n`;
// On macOS pango defaults to CoreText, which ignores fontconfig; force the fontconfig backend.
const env = { ...process.env, FONTCONFIG_FILE: fontConf, PANGOCAIRO_BACKEND: 'fontconfig' };
for (const [name, inks, ground] of [['lockup', DAY_INKS, null], ['lockup-reversed', NIGHT_INKS, null], ['lockup-night', NIGHT_INKS, night.ground], ['lockup-day', DAY_INKS, day.ground]]) {
  const source = write(`${name}.svg`, lockup(inks, ground));
  execFileSync('rsvg-convert', ['--width', '1040', '--output', path.join(assets, `${name}.png`), source], { env });
}
rmSync(fontConf);

// The proof: every size on Night, Day, the tile and in one ink, plus the circular adaptive crop.
const proof = ['<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560">'];
const rows = [[night.plane, NIGHT_INKS, 'Night'], [day.plane, DAY_INKS, 'Day'], ['#FFFFFF', MONO_INKS, 'One ink']];
rows.forEach(([ground, inks, label], index) => {
  const y = index * 140;
  proof.push(`<rect y="${y}" width="960" height="140" fill="${ground}"/>`);
  let x = 24;
  for (const size of [16, 24, 32, 64, 128]) {
    proof.push(`<g transform="translate(${x} ${y + 6}) scale(${size / 64})">${artwork(inks, size < design.BRAND_SMALL_BELOW ? BRAND_PARTS_SMALL : BRAND_PARTS)}</g>`);
    x += size + 32;
  }
  proof.push(`<text x="840" y="${y + 24}" font-family="sans-serif" font-size="13" fill="${inks.ink}">${label}</text>`);
});
proof.push(`<rect y="420" width="960" height="140" fill="${night.ground}"/>`);
proof.push(`<g transform="translate(24 426) scale(2)">${tiled(BRAND_PARTS)}</g>`);
proof.push(`<clipPath id="mask"><circle cx="268" cy="490" r="42.24"/></clipPath><rect x="204" y="426" width="128" height="128" fill="${night.plane}" clip-path="url(#mask)"/><g clip-path="url(#mask)"><g transform="translate(204 426) scale(2)">${adaptive}</g></g>`);
proof.push(`<text x="360" y="496" font-family="sans-serif" font-size="13" fill="${night.ink2}">Tile; adaptive icon under the smallest (66%) circular mask. Clear space ${BRAND_CLEAR_SPACE} units.</text>`);
proof.push('</svg>');
const proofSvg = write('proof.svg', `${proof.join('')}\n`);
execFileSync('rsvg-convert', ['--output', path.join(assets, 'proof.png'), proofSvg]);

// app.json cannot import tokens, so hold its ground colors to them here.
const appJson = readFileSync(path.join(root, 'apps/player/app.json'), 'utf8');
for (const [what, hex] of [['adaptive icon background', night.plane], ['splash background', night.ground], ['notification accent', night.brass]]) {
  if (!appJson.includes(`"${hex}"`)) throw new Error(`apps/player/app.json ${what} must be ${hex} (desk night token).`);
}
console.log('Generated the Nib: glyphs, tile, icon, favicons, adaptive foreground, splash, lockups and proof.');
