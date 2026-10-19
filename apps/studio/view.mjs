// The shared page frame every studio view renders into, factored out of
// dev-server.mjs so the scenario-review views (scenarios-view.mjs) can use the
// same chrome without a circular import between the entry point and the view
// module it loads routes from.
//
// The frame is a rail plus a command bar rather than a row of header links.
// That is a scale decision, not a cosmetic one: the console now manages a
// five-figure corpus across four kinds of artifact, and a horizontal nav that
// wrapped to three lines could neither show where you are nor carry a search
// field that reaches everything.

import { STYLES } from "./theme.mjs";

export const esc = (v) =>
  String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const pct = (n) => `${Math.round(n * 100)}%`;

/** Thousands separators, because a corpus count is read at a glance or not at all. */
export const num = (n) => Number(n).toLocaleString("en-US");

export const usd = (n) => `$${Number(n).toFixed(2)}`;

// Single registry of rail sections and their routes: a new page joins the
// chrome by adding an entry here, never by editing every view.
const NAV = [
  {
    label: "Command",
    links: [
      ["/", "Overview"],
      ["/status", "What is live"],
    ],
  },
  {
    label: "Content",
    links: [
      ["/explore", "Scenarios"],
      ["/scenarios", "Runs"],
      ["/library", "Library"],
      ["/articles", "Articles"],
    ],
  },
  {
    label: "Dataset",
    links: [
      ["/nations", "Nations"],
      ["/metrics", "Metrics"],
      ["/forces", "Forces"],
      ["/bands", "Bands"],
      ["/regions", "Regions"],
      ["/geography", "Geography"],
      ["/orgs", "Compacts"],
    ],
  },
  {
    label: "Cast",
    links: [
      ["/people", "People"],
      ["/portraits", "Portraits"],
      ["/roles", "Roles"],
      ["/names", "Names"],
      ["/backstories", "Backstories"],
    ],
  },
  { label: "Edits", links: [["/overlay", "Overlay"]] },
];

/**
 * Counts painted onto rail entries.
 *
 * A rail that only names destinations makes an operator open each one to find
 * out whether anything is waiting there. The overview computes these once and
 * hands them to every page it renders; a page that has no cheap way to know
 * simply omits them rather than showing a number it guessed.
 */
function railCount(href, counts) {
  const value = counts?.[href];
  return value === undefined ? "" : `<span class="count">${esc(num(value))}</span>`;
}

function railNav(active, counts) {
  return NAV.map(
    (group) => `<div class="railgroup"><span class="glabel">${esc(group.label)}</span>${group.links
      .map(
        ([href, label]) =>
          `<a class="navlink ${active === href ? "on" : ""}" href="${href}">${esc(label)}${railCount(href, counts)}</a>`,
      )
      .join("")}</div>`,
  ).join("");
}

// One keystroke to the search field, and one to leave it. The console is a
// place someone spends an hour in; reaching for the mouse to filter a corpus
// of thousands is the friction that makes them go back to grep.
const SHORTCUTS = `<script>
document.addEventListener("keydown", (event) => {
  const field = document.getElementById("global-search");
  if (!field) return;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
  if (event.key === "/" && !typing) { event.preventDefault(); field.focus(); field.select(); }
  if (event.key === "Escape" && document.activeElement === field) field.blur();
});
</script>`;

/**
 * @param {string} title            browser title and the frame's own label
 * @param {string} body             the page's markup
 * @param {object} [options]
 * @param {string} [options.seed]   renders the seed field when the page is seed-derived
 * @param {string} [options.active] rail entry to mark current
 * @param {string} [options.crumb]  breadcrumb markup for the command bar
 * @param {string} [options.query]  current global search term, echoed back into the field
 * @param {object} [options.counts] href → count, painted onto the rail
 * @param {boolean} [options.narrow] hold the reading measure for prose-heavy pages
 * @param {boolean} [options.chromeless] drop the rail — for pages reached while signed out,
 *   where every rail link would only bounce back here
 */
export const shell = (title, body, { seed, active, crumb, query, counts, narrow, chromeless } = {}) => {
  if (chromeless) {
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Studio</title><style>${STYLES}</style></head><body>
<main class="narrow" style="max-width:560px;margin:12vh auto">${body}</main>
</body></html>`;
  }
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Studio</title><style>${STYLES}</style></head><body>
<div class="frame">
  <aside class="rail">
    <a class="brand" href="/"><span class="mark">A</span><span><b>Studio</b><span class="sub">Administration</span></span></a>
    ${railNav(active, counts)}
    <div class="railfoot">Press <b>/</b> to search everything.</div>
  </aside>
  <div class="workbench">
    <div class="commandbar">
      <div class="crumb">${crumb ?? esc(title)}</div>
      <form class="searchbox" method="get" action="/search">
        <span class="glyph">⌕</span>
        <input id="global-search" name="q" value="${esc(query ?? "")}" placeholder="scenarios, runs, nations, people" autocomplete="off">
        <kbd>/</kbd>
      </form>
      ${seed !== undefined ? `<form method="get"><input name="seed" value="${esc(seed)}" placeholder="seed" style="width:110px"></form>` : ""}
    </div>
    <main${narrow ? ' class="narrow"' : ""}>${body}</main>
  </div>
</div>
${SHORTCUTS}
</body></html>`;
};
