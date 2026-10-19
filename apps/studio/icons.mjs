// Minimal inline-SVG icon set for the studio console. Stroke-only, 1.75px,
// 24x24 viewBox scaled via the .icon CSS class — no external icon font or CDN,
// since the dev server has no build step and no network dependency to lean on.
// Each icon inherits color from its context (currentColor) so a badge, button
// or chip never needs a color prop threaded through here.

const svg = (paths, viewBox = "0 0 24 24") =>
  `<svg class="icon" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  play: svg(`<path d="M6 4l14 8-14 8V4z"/>`),
  check: svg(`<path d="M20 6L9 17l-5-5"/>`),
  x: svg(`<path d="M18 6L6 18M6 6l12 12"/>`),
  clock: svg(`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>`),
  flag: svg(`<path d="M5 21V4"/><path d="M5 5h11l-2 4 2 4H5"/>`),
  dice: svg(`<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/>`),
  spark: svg(`<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>`),
  dollar: svg(`<path d="M12 2v20M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.4-5 3.5S9.2 10 12 10s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5"/>`),
  layers: svg(`<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>`),
  search: svg(`<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`),
  edit: svg(`<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>`),
  ship: svg(`<path d="M21 8V6a1 1 0 00-1-1h-4l-2-2h-4L8 5H4a1 1 0 00-1 1v2"/><path d="M3 8l2 9h14l2-9"/><path d="M9 12h6"/>`),
  alert: svg(`<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4"/><circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none"/>`),
  chevron: svg(`<path d="M9 6l6 6-6 6"/>`),
  package: svg(`<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>`),
  stack: svg(`<path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 17l8 4 8-4"/>`),
  image: svg(`<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" stroke="none"/><path d="M21 16l-5.5-5.5L9 17"/>`),
  circle: svg(`<circle cx="12" cy="12" r="8"/>`),
};

export const KIND_ICON = {
  "scenario-batch": icons.layers,
  "consequence-batch": icons.stack,
  "portrait-batch": icons.image,
  "scene-batch": icons.image,
};

export const STAGE_ICON = {
  generating: icons.play,
  review: icons.flag,
  done: icons.check,
  shipped: icons.ship,
};
