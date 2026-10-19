import { FORCE_ASSETS, MILITARY_BRANCHES, METRICS, forceAssetPersonnel, metricFor, metricsOf, nationTraitProfiles, personPoolSpecByNation, worldDataset } from "@admin/world";
import { esc, shell } from "./view.mjs";
import { figureFor, inputFor, metricRow, provenanceBadge, rangeTrack, boundsText } from "./metric-render.mjs";
import { applyEdits, scalarLeafPaths, valueAtPath } from "./overlay-model.mjs";

// One nation, every field, each with what it means — rendered from the metric
// registry rather than by walking the record, so a field the registry does
// not describe cannot appear here as a bare key, and a field the schema drops
// cannot linger.
//
// What is shown is the authored record. Traits carry the authored midpoint
// beside this seed's roll and the band the roll is drawn from, because the
// midpoint is what an operator edits and the roll is what a campaign sees.
// The cast is not on this page: people are generated per campaign from the
// pool spec and role profiles, and a country page listing them would read as
// data the country carries.

const charterName = new Map(worldDataset.charters.map((c) => [String(c.id), c.name]));
const orgName = new Map(worldDataset.organizations.map((o) => [String(o.id), o.name]));
const profileByNation = new Map(nationTraitProfiles.map((profile) => [String(profile.nation), profile]));

const BRANCH_LABEL = { army: "Army", navy: "Navy", air: "Air force", marines: "Marines", space: "Space force", cyber: "Cyber force" };

const humanGroup = (group) => group.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

function metricTable(metrics, record) {
  const rows = metrics.map((metric) => metricRow(metric, valueAtPath(record, metric.recordPath))).join("");
  return `<div class="wrap"><table class="metrics">${rows}</table></div>`;
}

/** Stats grouped as the schema groups them, each group its own card with an anchor. */
function statsSection(nation) {
  const groups = new Map();
  for (const metric of metricsOf("stats")) {
    if (metric.path.startsWith("military.orderOfBattle.")) continue;
    const list = groups.get(metric.group) ?? [];
    list.push(metric);
    groups.set(metric.group, list);
  }
  return [...groups.entries()]
    .map(([group, metrics]) => `<h3 id="stats-${esc(group)}">${esc(humanGroup(group))}</h3>${metricTable(metrics, nation)}`)
    .join("");
}

function bandChips(nation) {
  const b = nation.bands;
  return [
    ["archetype", b.archetype],
    ["power", `tier ${b.powerTier}`],
    ["wealth", `tier ${b.wealthTier}`],
    ["military", `tier ${b.militaryTier}`],
    ["stability", b.stabilityBand],
    ["alignment", b.alignmentBand],
  ]
    .map(([k, v]) => `<a class="chip" href="#bands" title="derived at assembly">${esc(k)} <b>${esc(v)}</b></a>`)
    .join("");
}

function traitsSection(authored, rolled, seed) {
  const profile = profileByNation.get(String(authored.id));
  const rows = metricsOf("traits")
    .filter((metric) => metric.path !== "agendas")
    .map((metric) => {
      const mid = authored.traits[metric.path];
      const roll = rolled.traits[metric.path];
      const range = profile?.ranges[metric.path];
      return `<tr id="${esc(metric.recordPath)}">
<td class="mname"><a href="/metrics#${esc(metric.recordPath)}">${esc(metric.label)}</a><div class="k">${esc(metric.description)}</div></td>
<td class="mvalue">${mid.toFixed(2)}${rangeTrack(metric, mid)}</td>
<td class="mvalue k">${range ? `${range.min.toFixed(2)} – ${range.max.toFixed(2)}` : "—"}</td>
<td class="mvalue">${roll.toFixed(2)}</td></tr>`;
    })
    .join("");
  const agendaMetric = metricFor("traits.agendas");
  const agendas = rolled.traits.agendas
    .map((a) => `<span class="chip">${esc(a.id)} <b>${a.weight.toFixed(2)}</b></span>`)
    .join("");
  const candidates = (profile?.candidateAgendas ?? []).map((a) => `<span class="chip">${esc(a.id)}</span>`).join("");
  return `<div class="wrap"><table class="metrics"><tr><th>Trait</th><th>Authored midpoint</th><th>Campaign band</th><th>Roll for seed ${esc(seed)}</th></tr>${rows}</table></div>
<div class="card" style="margin-top:10px"><h3>${esc(agendaMetric.label)} <span class="k">${profile?.agendaCount ?? "?"} chosen per campaign from ${profile?.candidateAgendas.length ?? 0} candidates</span></h3>
<div class="k">${esc(agendaMetric.description)}</div>
<div style="margin-top:6px">This seed: ${agendas}</div><div class="k" style="margin-top:6px">Candidates: ${candidates || "none"}</div></div>`;
}

function orderOfBattleSection(nation) {
  const oob = nation.stats.military.orderOfBattle;
  if (!oob) {
    return `<p class="k">No order of battle authored. The engine infers this nation's composition from the aggregates above; only the nations whose formations the game moves carry a decomposition. See <a href="/forces">forces</a>.</p>`;
  }
  const cards = MILITARY_BRANCHES.map((branch) => {
    const service = oob[branch];
    const unitsPersonnel = (service.units ?? []).reduce((sum, unit) => sum + forceAssetPersonnel(unit.type, unit.count), 0);
    const share = service.headcount > 0 ? Math.min(1, unitsPersonnel / service.headcount) : 0;
    const capabilities = (service.capabilities ?? [])
      .map((c) => `<tr><td>${esc(c.label ?? FORCE_ASSETS[c.name].label)}<div class="k"><code>${esc(c.name)}</code> · ${esc(FORCE_ASSETS[c.name].echelon)}</div></td><td class="num">${c.count.toLocaleString("en-US")}</td><td class="num k">${forceAssetPersonnel(c.name, c.count).toLocaleString("en-US")}</td></tr>`)
      .join("");
    const units = (service.units ?? [])
      .map((u) => `<tr><td>${esc(u.label ?? FORCE_ASSETS[u.type].label)}<div class="k"><code>${esc(u.type)}</code> · ${esc(FORCE_ASSETS[u.type].counts)}</div></td><td class="num">${u.count.toLocaleString("en-US")}</td><td class="num">${Math.round(u.readiness * 100)}%<div class="bar" style="width:60px"><span style="width:${Math.round(u.readiness * 100)}%"></span></div></td><td class="num k">${forceAssetPersonnel(u.type, u.count).toLocaleString("en-US")}</td></tr>`)
      .join("");
    return `<div class="card"><h3>${esc(BRANCH_LABEL[branch])} <span class="k">${service.headcount.toLocaleString("en-US")} personnel</span></h3>
<div class="k">Named units account for ${unitsPersonnel.toLocaleString("en-US")} people at catalog establishments (${Math.round(share * 100)}% of the service).</div>
<div class="bar"><span style="width:${Math.round(share * 100)}%"></span></div>
${capabilities ? `<h4>Capabilities <span class="k">what the service is</span></h4><table class="dense"><tr><th>Formation</th><th>Count</th><th>People</th></tr>${capabilities}</table>` : ""}
${units ? `<h4>Units <span class="k">what it can send</span></h4><table class="dense"><tr><th>Holding</th><th>On books</th><th>Ready</th><th>People</th></tr>${units}</table>` : ""}
</div>`;
  }).join("");
  return `<p class="k">Every name is an id from the <a href="/forces">force-asset catalog</a>, which is where the echelon, domain and people-per-unit behind each row are declared. The validator holds each service's units to its headcount.</p><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">${cards}</div>`;
}

function recordSection(nation) {
  const rows = [
    metricRow(metricFor("playable"), nation.playable),
    metricRow(metricFor("memberships"), nation.memberships.map((o) => orgName.get(String(o)) ?? String(o))),
    metricRow(metricFor("partySystem.contest"), nation.partySystem?.contest),
    metricRow(metricFor("partySystem.parties"), (nation.partySystem?.parties ?? []).map((p) => p.name)),
    metricRow(metricFor("sectors"), Object.fromEntries(nation.sectors.map((s) => [s.sector, s.mix]))),
  ].join("");
  return `<div class="wrap"><table class="metrics">${rows}</table></div>`;
}

function identitySection(nation) {
  const display = { ...nation.identity, government: charterName.get(String(nation.identity.government)) ?? nation.identity.government };
  return metricTable(metricsOf("identity"), { identity: display });
}

/** One country: everything authored about it, with definitions, plus what this seed rolled for its traits. */
export function nationProfilePage(authored, rolled, seed, pending) {
  const code = String(authored.id);
  const pool = personPoolSpecByNation.get(code);
  const merged = pending.length ? applyEdits(authored, pending) : authored;
  const pendingNote = pending.length
    ? `<div class="card warn"><b>${pending.length} pending edit${pending.length === 1 ? "" : "s"}</b> on this nation in the <a href="/overlay">overlay</a>; the figures below show source. <a href="/nations/${esc(code)}/edit">Open the editor</a> to see them side by side.</div>`
    : "";
  const edit = (surface) => `<a class="k" href="/nations/${esc(code)}/edit#${esc(surface)}">edit ▸</a>`;

  return shell(
    authored.identity.name,
    `<div class="pagehead"><h1>${esc(authored.identity.name)}</h1>
<span class="crumb"><a href="/nations?${new URLSearchParams({ seed })}">Nations</a> / <code>${esc(code)}</code></span>
<span class="actions" style="margin-left:auto;display:flex;gap:10px"><a href="/nations/${esc(code)}/edit">Edit authored fields</a><a href="/people?${new URLSearchParams({ seed, nation: code })}">Cast this seed</a><a href="/forces?${new URLSearchParams({ nation: code })}">Forces</a></span></div>
<div>${bandChips(authored)}${authored.playable ? ' <span class="badge live">playable</span>' : ""}</div>
${pendingNote}
<p class="k" style="margin-top:10px">Authored in <code>packages/world/src/dataset/nations.ts</code>; every row names its type and where it comes from, and links to its definition in the <a href="/metrics">metrics catalog</a>. People are not stored on a nation: this seed's cast is generated from name culture <code>${esc(pool?.nameCulture ?? "unmapped")}</code> and ${pool?.roles.length ?? 0} role profiles — browse it under <a href="/people?${new URLSearchParams({ seed, nation: code })}">Cast</a>.</p>

<div class="sectionhead"><h2 id="record">Record</h2></div>${recordSection(merged)}
<div class="sectionhead"><h2 id="identity">Identity</h2><span class="actions">${edit("identity")}</span></div>${identitySection(merged)}
<div class="sectionhead"><h2 id="geo">Geography</h2><span class="actions">${edit("geo")}</span></div>${metricTable(metricsOf("geo"), merged)}
<div class="sectionhead"><h2 id="doctrine">Doctrine</h2><span class="actions">${edit("doctrine")}</span></div>${metricTable(metricsOf("doctrine"), merged)}
<div class="sectionhead"><h2 id="traits">Traits</h2><span class="actions">${edit("traits")}</span></div>${traitsSection(merged, rolled, seed)}
<div class="sectionhead"><h2 id="stats">Statistics</h2><span class="actions">${edit("stats")}</span></div>${statsSection(merged)}
<div class="sectionhead"><h2 id="forces">Order of battle</h2></div>${orderOfBattleSection(merged)}
<div class="sectionhead"><h2 id="bands">Bands <span class="k">derived</span></h2></div>${metricTable(metricsOf("bands"), merged)}`,
    { seed, active: "/nations" },
  );
}

/**
 * The editor: every authored scalar the record carries, typed from the
 * registry, with the pending value beside source where one is waiting.
 */
export function nationEditorPage(authored, pending, seed, { error, notice } = {}) {
  const code = String(authored.id);
  const pendingByPath = new Map(pending.map((edit) => [edit.fieldPath, edit]));
  const merged = applyEdits(authored, pending);
  const present = new Set(scalarLeafPaths(authored));
  const editable = METRICS.filter((metric) => metric.editable && present.has(metric.recordPath));

  const sections = new Map();
  for (const metric of editable) {
    const key = metric.surface === "stats" ? `stats.${metric.group}` : metric.surface;
    const list = sections.get(key) ?? [];
    list.push(metric);
    sections.set(key, list);
  }

  const cards = [...sections.entries()]
    .map(([key, metrics]) => {
      const rows = metrics
        .map((metric) => {
          const edit = pendingByPath.get(metric.recordPath);
          const shown = valueAtPath(merged, metric.recordPath);
          const bounds = boundsText(metric);
          return `<tr><td class="field"><label for="${esc(metric.recordPath)}">${esc(metric.label)}</label> ${provenanceBadge(metric)}
<div class="k">${esc(metric.description)}</div>
<div class="k"><code>${esc(metric.recordPath)}</code>${bounds ? ` · ${esc(bounds)}` : ""}${metric.unit?.suffix ? ` · ${esc(metric.unit.suffix)}` : ""}${metric.scale ? ` · ${esc(metric.scale.low)} → ${esc(metric.scale.high)}` : ""}</div>
${edit ? `<div class="pending">pending — source says <code>${esc(String(valueAtPath(authored, metric.recordPath)))}</code></div>` : ""}</td>
<td class="input">${inputFor(metric, shown)}${rangeTrack(metric, typeof shown === "number" ? shown : undefined)}</td></tr>`;
        })
        .join("");
      const [surface, group] = key.split(".");
      return `<div class="card" id="${esc(surface)}"><h3>${esc(humanGroup(group ?? surface))}${group ? ` <span class="k">${esc(surface)}</span>` : ""}</h3><table class="editor">${rows}</table></div>`;
    })
    .join("");

  return shell(
    `Edit · ${authored.identity.name}`,
    `<div class="pagehead"><h1>Edit ${esc(authored.identity.name)}</h1>
<span class="crumb"><a href="/nations?${new URLSearchParams({ seed })}">Nations</a> / <a href="/nations/${esc(code)}?${new URLSearchParams({ seed })}">${esc(code)}</a> / edit</span></div>
${error ? `<div class="card bad"><h3>Not saved</h3><div class="defect">${esc(error)}</div></div>` : ""}
${notice ? `<div class="card good"><div class="k">${esc(notice)}</div></div>` : ""}
<p class="k">Every authored scalar on this record, ${editable.length} fields, each typed from the schema: a number field carries the schema's own bounds, an enum is a closed list. Saving records pending edits in the <a href="/overlay">overlay</a>; nothing reaches <code>packages/world</code> until they are published from there. Lists, weighted mixes and derived fields are not here — each has to agree with something outside this record, or is overwritten at the next assembly.</p>
<form method="post" action="/nations/${esc(code)}/edit">
<input type="hidden" name="seed" value="${esc(seed)}">
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr))">${cards}</div>
<div class="stickybar"><input name="note" placeholder="why (optional)" style="flex:1;max-width:420px"><button type="submit">Save changes to overlay</button>
<a class="k" href="/overlay">${pending.length} pending on this nation</a></div>
</form>`,
    { seed, active: "/nations" },
  );
}

/** Which of a record's fields the editor exposes, for the paired test. */
export function editableFieldsOf(authored) {
  const present = new Set(scalarLeafPaths(authored));
  return METRICS.filter((metric) => metric.editable && present.has(metric.recordPath)).map((metric) => metric.recordPath);
}

export { figureFor };
