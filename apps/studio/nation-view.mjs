import { personPoolSpecByNation, NAME_BANKS, worldDataset } from "@admin/world";
import { careerBankDepth, careerLinesFor, BIO_ROLES } from "@admin/engine";
import { esc, shell } from "./view.mjs";

// Reference pages beside the nation records: which name bank a country draws
// from, which region it sits in, and what a generated person can have been.
// The nation profile itself is nation-page.mjs.

const nationName = new Map(worldDataset.nations.map((n) => [String(n.id), n.identity.name]));

/** The name banks, and which countries draw from each. */
export function namesPage(query) {
  const selected = query.get("culture") ?? "";
  const nationsByCulture = new Map();
  for (const spec of personPoolSpecByNation.values()) {
    const list = nationsByCulture.get(spec.nameCulture) ?? [];
    list.push(String(spec.nation));
    nationsByCulture.set(spec.nameCulture, list);
  }

  const givenCount = (group) => group.given.masculine.length + group.given.feminine.length + group.given.neutral.length;
  const bankGivenCount = (bank) => bank.groups.reduce((sum, g) => sum + givenCount(g), 0);
  const bankSurnameCount = (bank) => bank.groups.reduce((sum, g) => sum + g.surname.length, 0);
  const bankPairings = (bank) => bank.groups.reduce((sum, g) => sum + givenCount(g) * g.surname.length, 0);

  const rows = Object.entries(NAME_BANKS)
    .map(([culture, bank]) => {
      const bound = nationsByCulture.get(culture) ?? [];
      return `<tr${culture === selected ? ' style="background:rgba(122,162,247,.08)"' : ""}>
<td><a href="/names?${new URLSearchParams({ culture })}"><code>${esc(culture)}</code></a></td>
<td class="num">${bank.groups.length}</td>
<td class="num">${bankGivenCount(bank)}</td><td class="num">${bankSurnameCount(bank)}</td>
<td class="num">${bankPairings(bank).toLocaleString("en-US")}</td>
<td>${bound.length ? bound.map((c) => `<a class="chip" href="/nations/${esc(c)}">${esc(nationName.get(c) ?? c)}</a>`).join("") : '<span class="k">unused</span>'}</td></tr>`;
    })
    .join("");

  const bank = NAME_BANKS[selected];
  const detail = bank
    ? `<h2>${esc(selected)}</h2>
${bank.groups
  .map(
    (group, i) => `<h3>${bank.groups.length > 1 ? `Group ${i + 1} · weight ${group.weight}` : "Names"}</h3>
<div class="grid">
<div class="card"><h4>Masculine given · ${group.given.masculine.length}</h4><div>${group.given.masculine.map((n) => `<span class="chip">${esc(n)}</span>`).join("")}</div></div>
<div class="card"><h4>Feminine given · ${group.given.feminine.length}</h4><div>${group.given.feminine.map((n) => `<span class="chip">${esc(n)}</span>`).join("")}</div></div>
<div class="card"><h4>Neutral given · ${group.given.neutral.length}</h4><div>${group.given.neutral.map((n) => `<span class="chip">${esc(n)}</span>`).join("")}</div></div>
<div class="card"><h4>Surname · ${group.surname.length}</h4><div>${group.surname.map((n) => `<span class="chip">${esc(n)}</span>`).join("")}</div></div>
</div>`,
  )
  .join("")}`
    : "";

  return shell(
    "Name banks",
    `<div class="pagehead"><h1>Name banks</h1><span class="crumb">${Object.keys(NAME_BANKS).length} cultures</span></div>
<p class="k">The pool a country's cast is named from, authored in <code>packages/world/src/dataset/name-banks.ts</code>.
A bank is one or more weighted groups; a person's gender presentation picks which given-name bucket (masculine, feminine, neutral) they draw from within their group.
Given and surname are combined at random per campaign, so the combinations are not listed here — only the halves and how many pairings each bank can produce.</p>
<div class="wrap"><table><tr><th>Culture</th><th>Groups</th><th>Given</th><th>Surname</th><th>Pairings</th><th>Nations</th></tr>${rows}</table></div>
${detail}`,
    { active: "/names" },
  );
}

/** Regions as entities: who is in each, and what they look like together. */
export function regionsPage(nations, seed) {
  const byRegion = new Map();
  for (const nation of nations) {
    const region = String(nation.geo.region);
    const list = byRegion.get(region) ?? [];
    list.push(nation);
    byRegion.set(region, list);
  }

  const cards = [...byRegion.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, members]) => {
      const gdp = members.reduce((sum, n) => sum + n.stats.economy.gdp, 0);
      const population = members.reduce((sum, n) => sum + n.stats.demography.population, 0);
      const rows = members
        .sort((a, b) => b.stats.economy.gdp - a.stats.economy.gdp)
        .map(
          (n) => `<tr><td><a href="/nations/${esc(n.id)}?${new URLSearchParams({ seed })}">${esc(n.identity.name)}</a></td>
<td class="k">${esc(n.bands.archetype)}</td><td class="k">${esc(n.doctrine.posture)}</td>
<td class="num">${Math.round(n.stats.economy.gdp).toLocaleString("en-US")}</td></tr>`,
        )
        .join("");
      return `<div class="card" id="${esc(region)}">
<h3>${esc(region)} <span class="k">${members.length} ${members.length === 1 ? "nation" : "nations"}</span></h3>
<div class="k">GDP ${Math.round(gdp).toLocaleString("en-US")}m USD · population ${Math.round(population).toLocaleString("en-US")}</div>
<table><tr><th>Nation</th><th>Archetype</th><th>Posture</th><th>GDP</th></tr>${rows}</table></div>`;
    })
    .join("");

  return shell(
    "Regions",
    `<div class="pagehead"><h1>Regions</h1><span class="crumb">${byRegion.size} regions · ${nations.length} nations</span></div>
<p class="k">A region is authored per nation as <code>geo.region</code>; it is the grouping scenario targeting and the situation map both read. Nothing is authored about a region itself, so what a region <em>is</em> is exactly its membership.</p>
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(380px,1fr))">${cards}</div>`,
    { seed, active: "/regions" },
  );
}

/** The backstory pool: what a generated person can have been before the chair. */
export function backstoriesPage() {
  const cards = BIO_ROLES.map((role) => {
    const lines = careerLinesFor(role).map((line) => `<li>${esc(line.replace("{nation}", "…"))}</li>`).join("");
    return `<div class="card"><h3>${esc(role.replace("role-", ""))}</h3>
<ol class="k" style="padding-left:18px;line-height:1.7">${lines}</ol></div>`;
  }).join("");

  return shell(
    "Backstory pool",
    `<div class="pagehead"><h1>Backstory pool</h1><span class="crumb">${BIO_ROLES.length} seats · ${BIO_ROLES.reduce((n, role) => n + careerBankDepth(role), 0)} lines</span></div>
<p class="k">A person's bio is composed, not stored: one career line chosen by shortlist position, then one sentence about whichever of their five attributes rolled furthest from what the seat expects.
The bank is authored in <code>packages/engine/src/bio-career-lines.ts</code>; the attribute half and the long-form dossier live beside it.
A bank is as deep as the bench it dresses, by test: twelve for a shortlisted chair, one line per chair for the fifty statehouses, the sixty bureaus and the thirty-four Senate panels, so two people never open on the same sentence.</p>
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(420px,1fr))">${cards}</div>`,
    { active: "/backstories" },
  );
}
