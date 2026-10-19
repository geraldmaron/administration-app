/** Rebuild the player identity from the same geometry used by BrandGlyph. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const geometry = readFileSync(path.join(root, 'packages/design/src/tokens/brand.ts'), 'utf8');
function literal(name) {
  const match = geometry.match(new RegExp(`export const ${name} = "([^"]+)";`));
  if (!match) throw new Error(`Missing canonical brand geometry: ${name}`);
  return match[1];
}
const viewBox = literal('BRAND_VIEW_BOX');
const portal = literal('BRAND_PORTAL_PATH');
const desk = literal('BRAND_DESK_PATH');
const navy = '#0B1424';
const gold = '#C6AA72';
const artwork = (body = navy, accent = '#76571E') => `<path d="${portal}" fill="${body}"/><path d="${desk}" fill="${accent}"/>`;
const svg = (body, tiled = false) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="${viewBox}">${tiled ? `<rect width="64" height="64" rx="12" fill="${navy}"/>` : ''}${body}</svg>\n`;
const assets = path.join(root, 'assets/player/brand');
const web = path.join(root, 'apps/web/public/brand');
mkdirSync(web, { recursive: true });
const glyph = svg(artwork());
const reversed = svg(artwork('#FFFFFF', gold));
const tile = svg(artwork('#FFFFFF', gold), true);
for (const name of ['mark-glyph.svg', 'mark-glyph-pack.svg']) writeFileSync(path.join(assets, name), glyph);
writeFileSync(path.join(assets, 'mark.svg'), tile);
writeFileSync(path.join(assets, 'adaptive-foreground.svg'), reversed);
writeFileSync(path.join(assets, 'lockup.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="128" viewBox="0 0 720 128"><g transform="translate(0 16) scale(1.5)">${artwork()}</g><text x="116" y="76" font-family="Arial, sans-serif" font-size="42" font-weight="600" letter-spacing="-1" fill="${navy}">The Administration</text></svg>\n`);
function render(source, output, size) {
  execFileSync('rsvg-convert', ['--width', String(size), '--height', String(size), '--output', output, source]);
}
render(path.join(assets, 'mark.svg'), path.join(assets, 'icon.png'), 1024);
render(path.join(assets, 'mark.svg'), path.join(assets, 'favicon.png'), 32);
render(path.join(assets, 'adaptive-foreground.svg'), path.join(assets, 'adaptive-foreground.png'), 1024);
render(path.join(assets, 'adaptive-foreground.svg'), path.join(assets, 'splash-icon.png'), 512);
writeFileSync(path.join(web, 'favicon.svg'), tile);
render(path.join(assets, 'mark.svg'), path.join(web, 'favicon.png'), 32);
render(path.join(assets, 'mark.svg'), path.join(web, 'apple-touch-icon.png'), 180);
const proof = ['<svg xmlns="http://www.w3.org/2000/svg" width="720" height="370" viewBox="0 0 720 370">'];
for (const [y, background, foreground, accent] of [[0, '#FFFFFF', navy, '#76571E'], [185, navy, '#FFFFFF', gold]]) {
  proof.push(`<rect y="${y}" width="720" height="185" fill="${background}"/>`);
  for (const [x, size] of [[32, 16], [104, 24], [190, 64], [340, 128]]) {
    proof.push(`<g transform="translate(${x} ${y + 24}) scale(${size / 64})">${artwork(foreground, accent)}</g>`);
    proof.push(`<text x="${x}" y="${y + 172}" font-family="Arial,sans-serif" font-size="12" fill="${foreground}">${size}px</text>`);
  }
}
proof.push('</svg>');
writeFileSync(path.join(assets, 'proof.svg'), `${proof.join('')}\n`);
execFileSync('rsvg-convert', ['--output', path.join(assets, 'proof.png'), path.join(assets, 'proof.svg')]);
console.log('Generated canonical player brand SVGs, platform PNGs, web icons and proof.');
