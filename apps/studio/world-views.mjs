import { chokepoints, cradles, geographyByNation, organizations, worldDataset } from "@admin/world";
import { cradleThreatMix, eligibleOrgs, forceProjectionCost, globalClosureSeverity, tradeVulnerability } from "@admin/engine";
import { esc, pct, shell } from "./view.mjs";

// The dataset's derived views: what assembly and the engine make of the
// authored records. Bands, geography and compacts are all read-only here
// because none of them is authored as such — a band is computed from stats, a
// chokepoint's dependants from the geography table, a compact's members from
// the organization registry.

const link = (nation, seed) => `<a href="/nations/${esc(nation.id)}?${new URLSearchParams({ seed })}">${esc(nation.identity.name)}</a>`;

export function bandsPage(seed) {
  const nations = worldDataset.nations;
  const dist = (label, pick) => {
    const counts = new Map();
    for (const n of nations) counts.set(pick(n), (counts.get(pick(n)) ?? 0) + 1);
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = entries[0]?.[1] ?? 1;
    return `<div class="card"><h3>${label}</h3><div class="k">${entries.length} occupied</div>
${entries.map(([k, c]) => `<div style="margin-top:6px">${esc(k)} <span class="k">${c}</span><div class="bar"><span style="width:${(c / top) * 100}%"></span></div></div>`).join("")}</div>`;
  };

  const rows = [...nations]
    .sort((a, b) => b.bands.powerTier - a.bands.powerTier || a.identity.name.localeCompare(b.identity.name))
    .map(
      (n) => `<tr><td>${link(n, seed)}</td><td>${esc(n.bands.archetype)}</td>
<td class="num">${n.bands.powerTier}</td><td class="num">${n.bands.wealthTier}</td><td class="num">${n.bands.militaryTier}</td>
<td>${esc(n.bands.stabilityBand)}</td><td>${esc(n.bands.alignmentBand)}</td>
<td class="k">${n.memberships.map(esc).join(", ") || "—"}</td></tr>`,
    )
    .join("");

  return shell(
    "Bands",
    `<div class="pagehead"><h1>Bands</h1><span class="crumb">derived at assembly</span></div>
<p class="k">Bands are derived from stats at assembly, never hand-authored. Content targets a band rather than a nation id, which is what keeps content cost flat as the roster grows. How each band is computed is on the <a href="/metrics?surface=bands">metrics catalog</a>.</p>
<div class="grid">
${dist("Archetype", (n) => n.bands.archetype)}
${dist("Power tier", (n) => `tier ${n.bands.powerTier}`)}
${dist("Wealth tier", (n) => `tier ${n.bands.wealthTier}`)}
${dist("Military tier", (n) => `tier ${n.bands.militaryTier}`)}
${dist("Stability", (n) => n.bands.stabilityBand)}
${dist("Alignment", (n) => n.bands.alignmentBand)}
</div>
<h2>Where each nation landed</h2>
<div class="wrap"><table><tr><th>Nation</th><th>Archetype</th><th>Pwr</th><th>Wlth</th><th>Mil</th><th>Stability</th><th>Alignment</th><th>Compacts</th></tr>${rows}</table></div>`,
    { seed, active: "/bands" },
  );
}

export function geographyPage(nations, seed) {
  const byId = new Map(nations.map((n) => [String(n.id), n]));
  const cpRows = chokepoints
    .map((c) => {
      const dependants = [...geographyByNation.values()].filter((g) => g.chokepointDependence.some((d) => String(d.chokepoint) === String(c.id))).length;
      return `<tr><td>${esc(c.name)}</td><td class="num">${pct(c.globalTrafficShare)}</td>
<td>${c.closableByOneState ? "closable" : "detour only"}</td><td class="num">${dependants}</td>
<td class="num">${globalClosureSeverity(chokepoints, [String(c.id)]).toFixed(3)}</td></tr>`;
    })
    .join("");

  const hormuz = [...geographyByNation.values()]
    .map((g) => ({ nation: byId.get(String(g.nation)), v: tradeVulnerability(g, ["CP-HORMUZ"]) }))
    .filter((r) => r.v > 0 && r.nation)
    .sort((a, b) => b.v - a.v)
    .map((r) => `<tr><td>${link(r.nation, seed)}</td><td class="num">${r.v.toFixed(3)}</td></tr>`)
    .join("");

  const usa = byId.get("USA");
  const projRows = usa
    ? nations
        .filter((n) => String(n.id) !== "USA")
        .map((n) => ({ n, c: forceProjectionCost(usa, n) }))
        .sort((a, b) => b.c.multiplier - a.c.multiplier)
        .slice(0, 12)
        .map((r) => `<tr><td>${link(r.n, seed)}</td><td class="num">${r.c.distanceKm.toLocaleString()}</td><td class="num">${r.c.multiplier.toFixed(2)}×</td></tr>`)
        .join("")
    : "";

  return shell(
    `Geography · ${seed}`,
    `<div class="pagehead"><h1>Geography</h1><span class="crumb">${chokepoints.length} chokepoints</span></div>
<p class="k">Authored in <code>packages/world/src/dataset/geography.ts</code>: neighbors, chokepoint dependence and the projection distances every force-projection cost reads. A nation's own coordinates and region are on its record.</p>
<h2>Chokepoints</h2>
<div class="wrap"><table><tr><th>Chokepoint</th><th>World traffic</th><th>Weapon?</th><th>Dependants</th><th>Closure severity</th></tr>${cpRows}</table></div>
<h2>Who a Hormuz closure actually hurts</h2>
<p class="k">Per-nation weights compound, so the same closure is a shrug for one country and an emergency for another.</p>
<div class="wrap"><table><tr><th>Nation</th><th>Trade vulnerability</th></tr>${hormuz}</table></div>
<h2>Costliest US interventions</h2>
<div class="wrap"><table><tr><th>Target</th><th>Distance km</th><th>Cost multiplier</th></tr>${projRows}</table></div>`,
    { seed, active: "/geography" },
  );
}

export function orgsPage(nations, seed) {
  const byId = new Map(nations.map((n) => [String(n.id), n]));
  const orgCards = organizations
    .map(
      (o) => `<div class="card"><h3>${esc(o.name)} <span class="k">${esc(o.kind)}</span></h3>
<div class="k">${o.members.length} members: ${o.members.map((m) => (byId.get(String(m)) ? link(byId.get(String(m)), seed) : esc(m))).join(", ")}</div>
<div class="k">${o.requiresCradle ? `requires: ${o.requiresCradle.map(esc).join(", ")}` : "open to any cradle"}</div>
<div class="k">${o.conflictsWith.length ? `excludes: ${o.conflictsWith.map(esc).join(", ")}` : "excludes nothing"}</div></div>`,
    )
    .join("");
  const cradleCards = cradles
    .map((c) => {
      const mix = cradleThreatMix(c, nations);
      const open = eligibleOrgs(organizations, c).map((o) => o.name);
      return `<div class="card"><h3>${esc(c.name)}</h3>
<div class="k">${esc(c.region)} · ${mix.neighbors} neighbors · threat ${mix.pressure.toFixed(2)}</div>
<div class="k" style="margin-top:6px">Open: ${open.map(esc).join(", ")}</div></div>`;
    })
    .join("");
  return shell(
    `Compacts · ${seed}`,
    `<div class="pagehead"><h1>Compacts</h1><span class="crumb">${organizations.length} organizations · ${cradles.length} cradles</span></div>
<p class="k">Membership is authored on the organization in <code>packages/world/src/dataset/orgs-cradles.ts</code> and mirrored onto each nation at assembly; a nation's <code>memberships</code> field is never edited directly. Threat pressure is rolled from traits, so it moves with the seed.</p>
<h2>Organizations</h2><div class="grid">${orgCards}</div>
<h2>Cradles</h2><div class="grid">${cradleCards}</div>`,
    { seed, active: "/orgs" },
  );
}
