import { esc, num, shell } from "./view.mjs";
import { draftScenarioRows } from "./scenarios-view.mjs";
import { filterRows, scenarioIndex, SORT_KEYS, sortRows, tally, TONES } from "./scenario-index.mjs";

// The one place every scenario in the checkout can be found, whatever stage it
// is at. Before this existed the answer to "where does this scenario live"
// depended on which of three pages you happened to open — the library listed
// published ids with no prose, the runs index listed batches rather than
// scenarios, and the bundled floor was a table on a fourth page. None of them
// could answer the question the corpus is actually managed by: what is in
// there, what does it cost the player, and where are the holes.

const PER_PAGE = 100;

const CLASS_ORDER = [
  "tragedy", "terror", "unrest", "disaster", "public-health", "migration",
  "foreign-crisis", "war", "espionage", "hostage", "technology", "economy",
  "scandal", "justice", "institution", "culture", "death", "triumph",
];

const SOURCE_LABEL = { bundled: "bundled", corpus: "corpus", draft: "draft" };

function sourceBadge(source) {
  const cls = source === "corpus" ? "live" : source === "bundled" ? "bundled" : "draft";
  return `<span class="badge ${cls}">${esc(SOURCE_LABEL[source] ?? source)}</span>`;
}

/** The five tones as one 70px bar — a scenario's answer space, readable without a legend at row height. */
function toneBar(toneMix, branches) {
  if (!branches) return "";
  const segments = TONES.filter((tone) => toneMix[tone])
    .map((tone) => `<i style="width:${(toneMix[tone] / branches) * 100}%;background:var(--tone-${tone})"></i>`)
    .join("");
  const title = TONES.filter((tone) => toneMix[tone]).map((tone) => `${tone} ${toneMix[tone]}`).join(", ");
  return `<span class="tonebar" title="${esc(title)}">${segments}</span>`;
}

/**
 * What answering this scenario actually does to the board.
 *
 * A position's loudest cost and an instrument's highest rung are different
 * currencies, so they are shown as different marks rather than summed into one
 * misleading score.
 */
function impactCell(row) {
  const marks = [];
  if (row.stake) marks.push(`<span title="loudest branch moves ${row.stake} points of stability, standing and readiness combined">${row.stake} pts</span>`);
  if (row.treasury) marks.push(`<span class="chip" title="loudest branch costs ${row.treasury} treasury">−${num(row.treasury)}</span>`);
  if (row.maxRung) marks.push(`<span class="chip" title="reaches instrument rung ${row.maxRung} of 5">rung ${row.maxRung}</span>`);
  if (row.flags.length) marks.push(`<span class="chip" title="${esc(row.flags.join(", "))}">${row.flags.length} flag${row.flags.length === 1 ? "" : "s"}</span>`);
  return marks.join(" ") || `<span class="k">—</span>`;
}

function gateCell(row) {
  if (row.conditions === 0) return `<span class="k">always live</span>`;
  return `<span title="${esc(row.conditionKinds.join(", "))}">${row.conditions} · <span class="k">${esc(row.conditionKinds.slice(0, 2).join(", "))}${row.conditionKinds.length > 2 ? "…" : ""}</span></span>`;
}

function rowMarkup(row) {
  if (row.broken) {
    return `<tr><td colspan="8" class="defect">${esc(row.subject)} <span class="k">(${esc(row.origin)})</span></td></tr>`;
  }
  return `<tr>
    <td><a href="${row.href}">${esc(row.subject)}</a><div class="sub"><code>${esc(row.id)}</code>${row.setPiece ? " · set piece" : ""}${row.once ? " · once" : ""}</div></td>
    <td>${sourceBadge(row.source)}<div class="sub">${esc(row.origin)}</div></td>
    <td>${esc(row.class)}</td>
    <td>${esc(row.cast)}</td>
    <td class="num">${row.weight}${row.boosts ? `<div class="sub">${row.boosts} boost${row.boosts === 1 ? "" : "s"}</div>` : ""}</td>
    <td>${gateCell(row)}</td>
    <td>${toneBar(row.toneMix, row.branches)}<div class="sub">${row.branches} branches · ${row.beats} beats · ${num(row.words)}w</div></td>
    <td>${impactCell(row)}</td>
  </tr>`;
}

/** Every control carries every other one, or clicking a facet silently clears the rest. */
function linkWith(query, overrides) {
  const params = new URLSearchParams(query);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === "" || value === undefined) params.delete(key);
    else params.set(key, value);
  }
  if (!("page" in overrides)) params.delete("page");
  const text = params.toString();
  return `/explore${text ? `?${text}` : ""}`;
}

function facet(label, param, current, options, query) {
  const chips = options
    .map(
      ([value, text, count]) =>
        `<a class="chip ${current === value ? "on" : ""}" href="${linkWith(query, { [param]: value })}">${esc(text)}${
          count === undefined ? "" : ` <b>${num(count)}</b>`
        }</a>`,
    )
    .join("");
  return `<div class="facet"><span class="flabel">${esc(label)}</span>${chips}</div>`;
}

/**
 * Facet counts come from the rows the *other* facets already left, so a count
 * says how many results the click would actually produce. Counting against the
 * full index instead is the classic filter lie: a facet offering "war 240"
 * that yields three once combined with the class you already picked.
 */
function facetsPanel(rows, query) {
  const counts = (pick) => new Map(tally(rows, pick));
  const byClass = counts((row) => row.class);
  const byCast = counts((row) => row.cast);
  const bySource = counts((row) => row.source);
  const byCondition = new Map(tally(rows.flatMap((row) => row.conditionKinds.map((kind) => ({ kind }))), (row) => row.kind));

  const classOptions = [["", "all", rows.length], ...CLASS_ORDER.filter((name) => byClass.has(name)).map((name) => [name, name, byClass.get(name)])];
  const castOptions = [["", "all"], ...[...byCast.keys()].sort().map((pick) => [pick, pick, byCast.get(pick)])];
  const sourceOptions = [["", "all"], ...["bundled", "corpus", "draft"].filter((s) => bySource.has(s)).map((s) => [s, SOURCE_LABEL[s], bySource.get(s)])];
  const conditionOptions = [["", "any"], ...[...byCondition.keys()].sort().map((kind) => [kind, kind, byCondition.get(kind)])];

  return `<div class="facets">
    ${facet("Class", "class", query.get("class") ?? "", classOptions, query)}
    ${facet("Cast", "cast", query.get("cast") ?? "", castOptions, query)}
    ${facet("Stage", "source", query.get("source") ?? "", sourceOptions, query)}
    ${facet("Gate", "gate", query.get("gate") ?? "", [["", "any"], ["open", "always live"], ["gated", "conditional"]], query)}
    ${facet("Fires", "once", query.get("once") ?? "", [["", "any"], ["yes", "once only"], ["no", "repeatable"]], query)}
    ${facet("Reads", "condition", query.get("condition") ?? "", conditionOptions, query)}
  </div>`;
}

const COLUMNS = [
  ["subject", "Scenario"], ["source", "Stage"], ["class", "Class"], ["cast", "Cast"],
  ["weight", "Weight"], ["gate", "Gate"], ["branches", "Answer space"], ["stake", "Impact"],
];

function headerRow(query, sort) {
  return COLUMNS.map(([key, label]) =>
    SORT_KEYS.includes(key)
      ? `<th><a href="${linkWith(query, { sort: key })}">${esc(label)}${sort === key ? " ↓" : ""}</a></th>`
      : `<th>${esc(label)}</th>`,
  ).join("");
}

/** Coverage across the classes generation fans out over — where the corpus is thin, at a glance. */
function coverageStrip(rows) {
  const byClass = new Map(tally(rows, (row) => row.class));
  const top = Math.max(1, ...byClass.values());
  return CLASS_ORDER.map((name) => {
    const count = byClass.get(name) ?? 0;
    const tone = count === 0 ? "var(--bad)" : count < top * 0.25 ? "var(--warn)" : "var(--accent)";
    return `<div class="meterrow"><span class="name">${esc(name)}</span>
      <span class="track"><span style="width:${(count / top) * 100}%;background:${tone}"></span></span>
      <span class="val">${num(count)}</span></div>`;
  }).join("");
}

function totalsTiles(rows) {
  const words = rows.reduce((sum, row) => sum + row.words, 0);
  const gated = rows.filter((row) => row.conditions > 0).length;
  const consequential = rows.filter((row) => row.stake > 0 || row.treasury > 0 || row.maxRung > 0).length;
  const flags = new Set(rows.flatMap((row) => row.flags)).size;
  return `<div class="tiles">
    <div class="tile"><div class="v">${num(rows.length)}</div><div class="l">scenarios in view</div></div>
    <div class="tile"><div class="v">${num(gated)}</div><div class="l">conditional</div><div class="note">${rows.length ? Math.round((gated / rows.length) * 100) : 0}% of view</div></div>
    <div class="tile"><div class="v">${num(consequential)}</div><div class="l">move the board</div><div class="note">a branch with a real cost or an instrument</div></div>
    <div class="tile"><div class="v">${num(flags)}</div><div class="l">distinct flags written</div></div>
    <div class="tile"><div class="v">${num(words)}</div><div class="l">authored words</div></div>
  </div>`;
}

function pager(query, page, pages, total, shown) {
  if (pages <= 1) return `<div class="k" style="margin-top:12px">${num(total)} scenario${total === 1 ? "" : "s"}.</div>`;
  const link = (target, label, disabled) =>
    disabled
      ? `<span class="k" style="padding:4px 10px">${label}</span>`
      : `<a style="padding:4px 10px" href="${linkWith(query, { page: String(target) })}">${label}</a>`;
  const start = (page - 1) * PER_PAGE;
  return `<div style="display:flex;gap:6px;align-items:center;margin-top:12px">
    ${link(page - 1, "‹ prev", page <= 1)}
    <span class="k">${num(start + 1)}–${num(start + shown)} of ${num(total)} · page ${page} of ${pages}</span>
    ${link(page + 1, "next ›", page >= pages)}
  </div>`;
}

export async function explorerPage(query = new URLSearchParams()) {
  const all = await scenarioIndex(await draftScenarioRows());
  const matched = filterRows(all, query);
  const sort = SORT_KEYS.includes(query.get("sort") ?? "") ? query.get("sort") : "subject";
  const sorted = sortRows(matched, sort);

  const pages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(query.get("page") ?? 1)), pages);
  const slice = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const search = query.get("q") ?? "";

  return shell(
    "Scenarios",
    `<div class="pagehead"><h1>Scenarios</h1>
      <span class="k">${num(all.length)} in this checkout — bundled, published and still in a run</span>
      <form method="get" action="/scenarios/new" style="margin-left:auto"><button type="submit">＋ New run</button></form></div>
<p class="lede">Everything the game can draw from, plus everything written for it that no player can reach yet. Search reaches the id and the subject; every facet counts against what the other facets already left.</p>

<form method="get" action="/explore" class="toolbar">
  <input name="q" value="${esc(search)}" placeholder="search subject or id" style="width:300px">
  <input type="hidden" name="sort" value="${esc(sort)}">
  ${["class", "cast", "source", "gate", "once", "condition"]
    .filter((param) => query.get(param))
    .map((param) => `<input type="hidden" name="${param}" value="${esc(query.get(param))}">`)
    .join("")}
  <button type="submit">Search</button>
  ${search || [...query.keys()].some((key) => key !== "sort") ? `<a class="chip" href="/explore">clear all</a>` : ""}
</form>

${facetsPanel(matched, query)}
${totalsTiles(matched)}

<div class="split">
  <div>
    <div class="wrap"><table class="dense"><thead><tr>${headerRow(query, sort)}</tr></thead>
      <tbody>${slice.map(rowMarkup).join("") || `<tr><td colspan="8" class="k">Nothing matches this view.</td></tr>`}</tbody></table></div>
    ${pager(query, page, pages, sorted.length, slice.length)}
  </div>
  <div class="card">
    <h3>Coverage by class</h3>
    <p class="k">Counted over the ${num(matched.length)} scenario(s) in view. A class the draw can fan out to and find nothing in is a hole in the month, not a stylistic gap.</p>
    ${coverageStrip(matched)}
  </div>
</div>`,
    { active: "/explore", query: search, crumb: "Scenarios" },
  );
}

/**
 * The global search field's landing page.
 *
 * It answers across artifact kinds rather than redirecting into one of them:
 * an operator who types "ferry" does not yet know whether the thing they
 * remember is a scenario, a run or a nation.
 */
export async function searchPage(query, extraSections = []) {
  const term = (query.get("q") ?? "").trim();
  if (!term) {
    return shell("Search", `<div class="pagehead"><h1>Search</h1></div><p class="lede">Type anything — a scenario subject, an id, a run name, a nation.</p>`, {
      active: "", crumb: "Search",
    });
  }
  const all = await scenarioIndex(await draftScenarioRows());
  const hits = filterRows(all, new URLSearchParams({ q: term })).slice(0, 40);
  const sections = extraSections
    .filter((section) => section.rows.length)
    .map(
      (section) => `<h2>${esc(section.title)} · ${num(section.rows.length)}</h2>
      <div class="wrap"><table class="dense"><tbody>${section.rows
        .map((row) => `<tr><td><a href="${row.href}">${esc(row.label)}</a></td><td class="k">${esc(row.note ?? "")}</td></tr>`)
        .join("")}</tbody></table></div>`,
    )
    .join("");

  return shell(
    `Search · ${term}`,
    `<div class="pagehead"><h1>“${esc(term)}”</h1></div>
${sections}
<h2>Scenarios · ${num(hits.length)}${hits.length === 40 ? " (first 40)" : ""}</h2>
${
  hits.length
    ? `<div class="wrap"><table class="dense"><thead><tr>${headerRow(new URLSearchParams(), "subject")}</tr></thead>
       <tbody>${hits.map(rowMarkup).join("")}</tbody></table></div>
       <p class="k" style="margin-top:10px"><a href="/explore?q=${encodeURIComponent(term)}">Open in the scenario explorer ▸</a></p>`
    : `<p class="k">No scenario's id or subject contains that.</p>`
}`,
    { active: "", crumb: "Search", query: term },
  );
}
