import { formatFigure, unitFor, worldDataset } from "@admin/world";
import { esc, shell } from "./view.mjs";

// The nation index: every record at a glance, on the figures a roster is
// actually scanned by — where it is, what kind of state it is, how big, and
// whether an edit is waiting on it. Traits and posture are on the profile,
// where their definitions are, not squeezed into a row.

const tierPips = (tier) => `<span class="tiers" title="tier ${tier} of 5">${"●".repeat(tier)}${"○".repeat(5 - tier)}</span>`;

const SORTS = {
  name: (a, b) => a.identity.name.localeCompare(b.identity.name),
  gdp: (a, b) => b.stats.economy.gdp - a.stats.economy.gdp,
  population: (a, b) => b.stats.demography.population - a.stats.demography.population,
  power: (a, b) => b.bands.powerTier - a.bands.powerTier || b.stats.economy.gdp - a.stats.economy.gdp,
  region: (a, b) => String(a.geo.region).localeCompare(String(b.geo.region)) || a.identity.name.localeCompare(b.identity.name),
};

/**
 * @param {object} query  URLSearchParams
 * @param {Map<string, number>} pendingByNation  nation code → pending overlay edits
 */
export function nationsIndexPage(seed, query, pendingByNation) {
  const q = (query.get("q") ?? "").trim().toLowerCase();
  const region = query.get("region") ?? "";
  const archetype = query.get("archetype") ?? "";
  const sort = SORTS[query.get("sort") ?? ""] ? query.get("sort") : "power";

  const all = worldDataset.nations;
  const filtered = all
    .filter((n) => !q || n.identity.name.toLowerCase().includes(q) || String(n.id).toLowerCase().includes(q))
    .filter((n) => !region || String(n.geo.region) === region)
    .filter((n) => !archetype || n.bands.archetype === archetype)
    .sort(SORTS[sort]);

  const params = (overrides) => new URLSearchParams({ seed, ...(q ? { q } : {}), ...(region ? { region } : {}), ...(archetype ? { archetype } : {}), sort, ...overrides });
  const th = (key, label) => `<th><a href="/nations?${params({ sort: key })}">${label}${sort === key ? " ▾" : ""}</a></th>`;

  const rows = filtered
    .map((n) => {
      const pending = pendingByNation.get(String(n.id)) ?? 0;
      return `<tr>
<td><a href="/nations/${esc(n.id)}?${new URLSearchParams({ seed })}">${esc(n.identity.name)}</a>${n.playable ? ' <span class="badge live">playable</span>' : ""}</td>
<td><code>${esc(n.id)}</code></td>
<td class="k">${esc(String(n.geo.region).replace("region-", ""))}</td>
<td class="k">${esc(n.bands.archetype)}</td>
<td>${tierPips(n.bands.powerTier)}</td><td>${tierPips(n.bands.wealthTier)}</td><td>${tierPips(n.bands.militaryTier)}</td>
<td class="k">${esc(n.bands.stabilityBand)}</td>
<td class="num">${esc(formatFigure(n.stats.demography.population, unitFor("demography.population")))}</td>
<td class="num">${esc(formatFigure(n.stats.economy.gdp, unitFor("economy.gdp")))}</td>
<td class="k">${esc(n.doctrine.posture)}</td>
<td>${pending ? `<a class="badge pending" href="/nations/${esc(n.id)}/edit">${pending} pending</a>` : `<a class="k" href="/nations/${esc(n.id)}/edit">edit</a>`}</td></tr>`;
    })
    .join("");

  const regions = [...new Set(all.map((n) => String(n.geo.region)))].sort();
  const archetypes = [...new Set(all.map((n) => n.bands.archetype))].sort();
  const option = (value, selected) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(value.replace("region-", ""))}</option>`;

  return shell(
    "Nations",
    `<div class="pagehead"><h1>Nations</h1><span class="crumb">${filtered.length} of ${all.length}</span></div>
<p class="k">Every nation record in <code>packages/world/src/dataset/nations.ts</code>. Tiers, archetype and stability are derived at assembly; population and GDP are authored (summed from the states for the playable nation). Open a nation for every field with its definition, or <b>edit</b> for the typed editor. What each column means is on the <a href="/metrics">metrics catalog</a>.</p>
<form method="get" action="/nations" class="filters">
  <input type="hidden" name="seed" value="${esc(seed)}"><input type="hidden" name="sort" value="${esc(sort)}">
  <input name="q" value="${esc(q)}" placeholder="name or code">
  <select name="region"><option value="">every region</option>${regions.map((r) => option(r, region)).join("")}</select>
  <select name="archetype"><option value="">every archetype</option>${archetypes.map((a) => option(a, archetype)).join("")}</select>
  <button type="submit">Filter</button>
  ${q || region || archetype ? `<a class="k" href="/nations?${new URLSearchParams({ seed })}">clear</a>` : ""}
</form>
<div class="wrap"><table class="dense"><tr>${th("name", "Nation")}<th>Code</th>${th("region", "Region")}<th>Archetype</th>${th("power", "Power")}<th>Wealth</th><th>Military</th><th>Stability</th>${th("population", "Population")}${th("gdp", "GDP")}<th>Posture</th><th>Edits</th></tr>${
      rows || '<tr><td colspan="12" class="k">No nation matches that filter.</td></tr>'
    }</table></div>`,
    { seed, active: "/nations" },
  );
}
