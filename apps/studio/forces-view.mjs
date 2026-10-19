import { FORCE_ASSETS, FORCE_ASSET_IDS, MILITARY_BRANCHES, checkForceAssets, forceAssetPersonnel, worldDataset } from "@admin/world";
import { esc, shell } from "./view.mjs";

// The force-asset catalog and every order of battle authored against it.
//
// A holding is a catalog id, so this page can do the arithmetic a string
// never allowed: people per unit, people accounted for per service, and the
// validator's own verdict on whether the decomposition can be true.

const BRANCH_LABEL = { army: "Army", navy: "Navy", air: "Air force", marines: "Marines", space: "Space force", cyber: "Cyber force" };

function catalogSection() {
  return MILITARY_BRANCHES.map((branch) => {
    const rows = FORCE_ASSET_IDS.filter((id) => FORCE_ASSETS[id].branch === branch)
      .map((id) => {
        const a = FORCE_ASSETS[id];
        return `<tr id="${esc(id)}"><td><b>${esc(a.label)}</b><div class="k"><code>${esc(id)}</code></div><div class="k">${esc(a.description)}</div></td>
<td class="k">${esc(a.echelon)}</td><td class="k">${esc(a.domain)}</td><td class="k">${esc(a.counts)}</td><td class="num">${a.nominalPersonnel.toLocaleString("en-US")}</td></tr>`;
      })
      .join("");
    return `<h3 id="catalog-${esc(branch)}">${esc(BRANCH_LABEL[branch])}</h3>
<div class="wrap"><table class="metrics dense"><tr><th>Asset</th><th>Echelon</th><th>Domain</th><th>Counts</th><th>People each</th></tr>${rows}</table></div>`;
  }).join("");
}

function nationSection(nation) {
  const oob = nation.stats.military.orderOfBattle;
  const errors = checkForceAssets(nation);
  const branches = MILITARY_BRANCHES.map((branch) => {
    const service = oob[branch];
    const capabilities = (service.capabilities ?? []).map((c) => `<tr><td>${esc(c.label ?? FORCE_ASSETS[c.name].label)} <span class="k"><code>${esc(c.name)}</code></span></td><td class="num">${c.count.toLocaleString("en-US")}</td><td class="num k">${forceAssetPersonnel(c.name, c.count).toLocaleString("en-US")}</td></tr>`).join("");
    const units = (service.units ?? []).map((u) => `<tr><td>${esc(u.label ?? FORCE_ASSETS[u.type].label)} <span class="k"><code>${esc(u.type)}</code></span></td><td class="num">${u.count.toLocaleString("en-US")}</td><td class="num">${Math.round(u.readiness * 100)}%</td><td class="num k">${forceAssetPersonnel(u.type, u.count).toLocaleString("en-US")}</td></tr>`).join("");
    const people = (service.units ?? []).reduce((sum, u) => sum + forceAssetPersonnel(u.type, u.count), 0);
    const share = service.headcount > 0 ? Math.min(1, people / service.headcount) : 0;
    return `<div class="card"><h3>${esc(BRANCH_LABEL[branch])} <span class="k">${service.headcount.toLocaleString("en-US")} personnel · units account for ${Math.round(share * 100)}%</span></h3>
<div class="bar"><span style="width:${Math.round(share * 100)}%"></span></div>
${capabilities ? `<table class="dense"><tr><th>Capability</th><th>Count</th><th>People</th></tr>${capabilities}</table>` : '<div class="k">no capabilities named</div>'}
${units ? `<table class="dense" style="margin-top:6px"><tr><th>Unit</th><th>On books</th><th>Ready</th><th>People</th></tr>${units}</table>` : '<div class="k">no units named</div>'}</div>`;
  }).join("");
  const total = MILITARY_BRANCHES.reduce((sum, b) => sum + oob[b].headcount, 0);
  return `<h2 id="${esc(nation.id)}"><a href="/nations/${esc(nation.id)}">${esc(nation.identity.name)}</a> <span class="k">${total.toLocaleString("en-US")} across six services against ${nation.stats.military.activeHeadcount.toLocaleString("en-US")} active</span></h2>
${errors.length ? `<div class="card bad"><h3>Validator findings</h3>${errors.map((e) => `<div class="defect">${esc(e.path)}: ${esc(e.message)}</div>`).join("")}</div>` : '<p class="k"><span class="badge approve">valid</span> every holding sits under its own service, once, and the named units fit inside each service\'s headcount.</p>'}
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(380px,1fr))">${branches}</div>`;
}

export function forcesPage(query) {
  const focus = query.get("nation") ?? "";
  const authored = worldDataset.nations.filter((n) => n.stats.military.orderOfBattle);
  const shown = focus ? authored.filter((n) => String(n.id) === focus) : authored;
  const focused = focus && !shown.length ? `<p class="k">${esc(focus)} carries no order of battle; the engine infers its composition from the aggregates.</p>` : "";
  return shell(
    "Forces",
    `<div class="pagehead"><h1>Forces</h1><span class="crumb">${FORCE_ASSET_IDS.length} catalog assets · ${authored.length} nations with an order of battle</span></div>
<p class="k">The force-asset catalog is <code>packages/world/src/schemas/force-asset.ts</code>: the closed set of things a service can count, each with its service, the domain it fights in, its echelon, what one of it is counted as, and roughly how many people field one. An order of battle names holdings by these ids, so a force package, a commitment and a deployment all draw on the same bench by id rather than by spelling. <code>readiness</code> on a unit is the share of it that could move this month.</p>
<h2>Authored orders of battle ${focus ? `<a class="k" href="/forces">show all</a>` : ""}</h2>
${focused}${shown.map(nationSection).join("")}
<h2 id="catalog">Catalog</h2>
${catalogSection()}`,
    { active: "/forces" },
  );
}
