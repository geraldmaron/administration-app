import { METRICS, METRIC_SURFACES } from "@admin/world";
import { METRIC_REGISTRY } from "@admin/engine";
import { esc, shell } from "./view.mjs";
import { boundsText, provenanceBadge, typeChip, unitWord } from "./metric-render.mjs";

// The metric catalog: every figure the game keeps, with what it is, what it
// is measured in, what values it admits, where it comes from and who reads
// it. Read straight from the registry, so this page is the registry, not a
// second description of it.

const SURFACE_NOTE = {
  record: "The nation record's own fields, outside any group.",
  identity: "Who the nation is. Authored; presentation for the most part.",
  geo: "Where it is and what it is exposed to. Coordinates and exposure are authored; neighbors and chokepoints are filled from the geography table.",
  stats: "The numbers that must mechanically matter. Every one has a unit, a reader (or a written-down debt), and a description.",
  traits: "Personality. The authored value is a midpoint; each campaign rolls inside a band around it.",
  doctrine: "What the government has said it will do.",
  bands: "Derived from stats at assembly, never authored. Content targets bands.",
  person: "A generated person's fields. People are rolled per campaign from name banks and role profiles; none is stored on the dataset.",
  relationship: "A directed edge between two nations, built at founding and moved by play. None is stored on the dataset.",
};

const humanGroup = (group) => group.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function metricsPage(query) {
  const surface = query.get("surface") ?? "";
  const provenance = query.get("provenance") ?? "";
  const type = query.get("type") ?? "";
  const q = (query.get("q") ?? "").trim().toLowerCase();
  const owed = query.get("owed") === "1";

  const filtered = METRICS.filter(
    (m) =>
      (!surface || m.surface === surface) &&
      (!provenance || m.provenance === provenance) &&
      (!type || m.valueType === type) &&
      (!owed || m.owedBy) &&
      (!q || m.recordPath.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)),
  );

  const counts = (pick) => {
    const map = new Map();
    for (const m of METRICS) map.set(pick(m), (map.get(pick(m)) ?? 0) + 1);
    return map;
  };
  const bySurface = counts((m) => m.surface);
  const byProvenance = counts((m) => m.provenance);
  const owedCount = METRICS.filter((m) => m.owedBy).length;

  const tiles = `<div class="tiles">
<div class="tile"><div class="v">${METRICS.length}</div><div class="l">metrics</div></div>
<div class="tile"><div class="v">${byProvenance.get("authored") ?? 0}</div><div class="l">authored</div></div>
<div class="tile"><div class="v">${byProvenance.get("derived") ?? 0}</div><div class="l">derived</div></div>
<div class="tile"><div class="v">${byProvenance.get("runtime") ?? 0}</div><div class="l">runtime only</div></div>
<a class="tile" href="/metrics?owed=1"><div class="v">${owedCount}</div><div class="l">owed a reader</div></a>
</div>`;

  const params = (overrides) => new URLSearchParams({ ...(surface ? { surface } : {}), ...(provenance ? { provenance } : {}), ...(type ? { type } : {}), ...(q ? { q } : {}), ...(owed ? { owed: "1" } : {}), ...overrides });
  const option = (value, selected, label = value) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`;
  const types = [...new Set(METRICS.map((m) => m.valueType))];

  const grouped = new Map();
  for (const m of filtered) {
    const key = `${m.surface}::${m.group}`;
    const list = grouped.get(key) ?? [];
    list.push(m);
    grouped.set(key, list);
  }

  const sections = [...grouped.entries()]
    .map(([key, metrics]) => {
      const [s, group] = key.split("::");
      const rows = metrics
        .map(
          (m) => `<tr id="${esc(m.recordPath)}">
<td class="mname"><b>${esc(m.label)}</b><div class="k"><code>${esc(m.recordPath)}</code></div><div class="k">${esc(m.description)}</div></td>
<td>${typeChip(m)}<div class="k" style="margin-top:4px">${esc(boundsText(m) || "unbounded")}</div>${unitWord(m) ? `<div class="k">${esc(unitWord(m))}</div>` : ""}</td>
<td>${provenanceBadge(m)}${m.derivedBy ? `<div class="k readby">${esc(m.derivedBy)}</div>` : ""}${m.editable ? '<div class="k">editable</div>' : ""}</td>
<td class="k" style="max-width:320px">${m.readBy ? `${esc(m.purpose)}<div><code>${m.readBy.map(esc).join("<br>")}</code></div>` : m.owedBy ? `<span class="badge pending">owed</span> ${esc(m.owedBy)}` : "<span class=\"k\">no registered reader</span>"}</td></tr>`,
        )
        .join("");
      const heading = group === s ? humanGroup(s) : `${humanGroup(group)} <span class="k">${esc(s)}</span>`;
      return `<h2 id="${esc(s)}-${esc(group)}">${heading} <span class="k">${metrics.length}</span></h2>
${s !== group || !SURFACE_NOTE[s] ? "" : `<p class="k">${esc(SURFACE_NOTE[s])}</p>`}
<div class="wrap"><table class="metrics"><tr><th>Metric</th><th>Type · bounds · unit</th><th>Provenance</th><th>Read by</th></tr>${rows}</table></div>`;
    })
    .join("");

  // The campaign's own player-facing metrics — approval, treasury, stability —
  // are a different registry: a dependency graph the engine keeps, with the
  // definition and unit of each node. Listed here so the catalog is the whole
  // metric system and not only the dataset half of it.
  const campaign = q
    ? METRIC_REGISTRY.filter((node) => node.id.toLowerCase().includes(q) || node.label.toLowerCase().includes(q) || node.definition.toLowerCase().includes(q))
    : METRIC_REGISTRY;
  const campaignRows = campaign
    .map(
      (node) => `<tr id="campaign.${esc(node.id)}">
<td class="mname"><b>${esc(node.label)}</b><div class="k"><code>${esc(node.id)}</code></div><div class="k">${esc(node.definition)}</div></td>
<td><span class="chip type">${esc(node.unit)}</span><div class="k" style="margin-top:4px">${esc(node.updateCadence)}</div></td>
<td class="k" style="max-width:260px">${esc(node.provenance)}</td>
<td class="k">${node.parents.length ? `from ${node.parents.map(esc).join(", ")}` : "root"}${node.children.length ? `<div>feeds ${node.children.map(esc).join(", ")}</div>` : ""}</td></tr>`,
    )
    .join("");
  const campaignSection = surface || provenance || type || owed
    ? ""
    : `<h2 id="campaign">Campaign metrics <span class="k">${campaign.length} of ${METRIC_REGISTRY.length}</span></h2>
<p class="k">The player-facing metrics a campaign keeps — approval, the treasury, stability and what feeds them — from <code>packages/engine/src/metric-registry.ts</code>. These are not dataset fields: each is computed from the state above and moves per turn or per effect, and the graph is what keeps every player-visible figure traceable to the engine state under it.</p>
<div class="wrap"><table class="metrics"><tr><th>Metric</th><th>Unit · cadence</th><th>Provenance</th><th>Graph</th></tr>${campaignRows}</table></div>`;

  return shell(
    "Metrics",
    `<div class="pagehead"><h1>Metrics</h1><span class="crumb">${filtered.length} of ${METRICS.length}</span></div>
<p class="k">The metric registry, <code>packages/world/src/dataset/metrics.ts</code>: one record per figure the game keeps. Type and bounds are read off the zod schema, the unit off <code>units.ts</code>, the reader off <code>stat-consumers.ts</code>; only the description and what a scale's ends mean are written by hand, in <code>metric-copy.ts</code>, and a test fails the build on a field without one. Read-only here: the code is the record.</p>
${tiles}
<form method="get" action="/metrics" class="filters">
  <input name="q" value="${esc(q)}" placeholder="path, label or words">
  <select name="surface"><option value="">every surface</option>${METRIC_SURFACES.map((s) => option(s, surface, `${s} (${bySurface.get(s) ?? 0})`)).join("")}</select>
  <select name="provenance"><option value="">any provenance</option>${["authored", "derived", "runtime"].map((p) => option(p, provenance)).join("")}</select>
  <select name="type"><option value="">any type</option>${types.map((t) => option(t, type)).join("")}</select>
  <label class="k"><input type="checkbox" name="owed" value="1" ${owed ? "checked" : ""}> owed a reader</label>
  <button type="submit">Filter</button>
  ${surface || provenance || type || q || owed ? '<a class="k" href="/metrics">clear</a>' : ""}
</form>
${sections || '<p class="k">No dataset metric matches that filter.</p>'}
${campaignSection}`,
    { active: "/metrics", query: q },
  );
}
