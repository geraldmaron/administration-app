import path from "node:path";
import { CORE_SCENARIOS } from "@admin/content";
import {
  corpusPathsFor,
  corpusStats,
  readBody,
  readCorpusIndex,
} from "@admin/studio-cli/dist/corpus/shard-store.js";
import { esc, shell } from "./view.mjs";
import { formatCondition } from "./scenario-view.mjs";

// The shipped content, browsable without loading it. The bundled floor is
// small and read straight from @admin/content; the corpus is read from its
// selector index, one page at a time, and a body is fetched only when someone
// opens a single scenario. A page that rendered every scenario in a five-figure
// corpus would be the same mistake the runtime made before the pool split.

const CORPUS_DIR = path.join("content", "corpus");
const PER_PAGE = 50;

const corpusPaths = () => corpusPathsFor(CORPUS_DIR);

export async function findLibraryScenario(scenarioId) {
  const bundled = CORE_SCENARIOS.find((def) => def.id === scenarioId);
  if (bundled) return bundled;
  const selector = (await readCorpusIndex(corpusPaths())).find((entry) => entry.id === scenarioId);
  return selector ? readBody(corpusPaths(), selector) : undefined;
}

function bundledRows() {
  return CORE_SCENARIOS.map((def) => {
    const words = [...def.opening.map((b) => b.text), ...def.replies.map((r) => r.text)].join(" ").split(/\s+/).length;
    const conditions = def.conditions.length ? def.conditions.map(formatCondition).join(" · ") : "always live";
    return `<tr>
      <td><a href="/library/${esc(def.id)}">${esc(def.subject)}</a><div class="k"><code>${esc(def.id)}</code></div></td>
      <td>${esc(def.class)}</td><td>${esc(def.cast.pick)}</td>
      <td class="num">${def.opening.length}/${def.replies.length}</td>
      <td class="num">${words}</td>
      <td class="num">${def.weight}${def.once ? " · once" : ""}</td>
      <td class="k">${esc(conditions)}</td></tr>`;
  }).join("");
}

export async function libraryPage(query = new URLSearchParams()) {
  const paths = corpusPaths();
  const stats = await corpusStats(paths);
  const selectors = await readCorpusIndex(paths);

  const klass = query.get("class") ?? "";
  const search = (query.get("q") ?? "").trim().toLowerCase();
  const filtered = selectors.filter(
    (selector) =>
      (!klass || selector.class === klass) && (!search || selector.id.toLowerCase().includes(search)),
  );
  const page = Math.max(1, Number(query.get("page") ?? 1));
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const classes = [...new Set(selectors.map((selector) => selector.class))].sort();
  const corpusRows = slice
    .map(
      (selector) => `<tr>
      <td><a href="/library/${esc(selector.id)}"><code>${esc(selector.id)}</code></a></td>
      <td>${esc(selector.class)}</td><td>${esc(selector.cast.pick)}</td>
      <td class="num">${selector.weight}${selector.once ? " · once" : ""}</td>
      <td class="k">${esc(selector.conditions.length ? selector.conditions.map(formatCondition).join(" · ") : "always live")}</td>
      <td class="k"><code>${esc(selector.shard ?? "—")}</code></td></tr>`,
    )
    .join("");

  const pageLink = (target, label, disabled) =>
    disabled
      ? `<span class="k" style="padding:4px 10px">${label}</span>`
      : `<a style="padding:4px 10px" href="/library?${new URLSearchParams({ ...(klass ? { class: klass } : {}), ...(search ? { q: search } : {}), page: String(target) })}">${label}</a>`;

  return shell(
    "Library",
    `<div class="pagehead"><h1>Scenario library</h1></div>
<div class="tiles" style="max-width:720px">
  <div class="tile"><div class="v">${CORE_SCENARIOS.length}</div><div class="l">bundled floor</div></div>
  <div class="tile"><div class="v">${stats.scenarios}</div><div class="l">in the corpus</div></div>
  <div class="tile"><div class="v">${stats.shards}</div><div class="l">shards</div></div>
</div>

<h2>Bundled floor · ${CORE_SCENARIOS.length}</h2>
<p class="k">Compiled into the app and parsed at boot, so it is deliberately small — everything else loads from a shard on demand. Read live from <code>@admin/content</code>.</p>
<div class="wrap"><table><tr><th>Scenario</th><th>Class</th><th>Cast</th><th>Beats/Replies</th><th>Words</th><th>Weight</th><th>Conditions</th></tr>${bundledRows()}</table></div>

<h2>Corpus · ${stats.scenarios}</h2>
<p class="k">Read from the selector index, never from the bodies — this page loads no prose at all. Open a scenario to fetch its body from its shard.</p>
<form method="get" action="/library" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
  <input name="q" value="${esc(search)}" placeholder="search by id">
  <select name="class"><option value="">every class</option>${classes
    .map((name) => `<option value="${esc(name)}" ${name === klass ? "selected" : ""}>${esc(name)}</option>`)
    .join("")}</select>
  <button type="submit">Filter</button>
</form>
${
  stats.scenarios === 0
    ? `<p class="k">Nothing published yet — <code>studio corpus publish &lt;jobId&gt;</code> appends a shipped batch.</p>`
    : `<div class="wrap"><table><tr><th>Id</th><th>Class</th><th>Cast</th><th>Weight</th><th>Conditions</th><th>Shard</th></tr>${corpusRows}</table></div>
<div style="display:flex;gap:6px;align-items:center;margin-top:12px">
  ${pageLink(current - 1, "‹ prev", current <= 1)}
  <span class="k">${filtered.length === 0 ? 0 : (current - 1) * PER_PAGE + 1}–${Math.min(current * PER_PAGE, filtered.length)} of ${filtered.length} · page ${current} of ${pages}</span>
  ${pageLink(current + 1, "next ›", current >= pages)}
</div>`
}`,
    { active: "/library" },
  );
}
