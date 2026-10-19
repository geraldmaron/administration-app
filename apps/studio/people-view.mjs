import { roleProfiles, worldDataset } from "@admin/world";
import { esc, shell } from "./view.mjs";
import { ATTRIBUTES } from "./role-edit.mjs";

// The cast, all of it. The pool is generated rather than stored — a seed and
// fifteen role profiles produce the same couple of thousand people every time —
// so this browses the roll and edits the profiles that produce it. Nothing here
// pretends an individual can be edited, because an individual cannot survive
// the next roll.

const PER_PAGE = 50;

const PORTRAIT_FACETS = [
  ["Heritage", 1],
  ["Gender presentation", 2],
  ["Age band", 3],
  ["Skin tone", 4],
  ["Attire", 5],
  ["Hair", 6],
  ["Build", 7],
];

const nationNames = new Map(worldDataset.nations.map((nation) => [String(nation.id), nation.identity.name]));
const nationName = (code) => nationNames.get(String(code)) ?? String(code);

function pagerFor(basePath, params, page, pages, start, shown, total) {
  const link = (target, label, disabled) =>
    disabled
      ? `<span class="k" style="padding:4px 10px">${label}</span>`
      : `<a style="padding:4px 10px" href="${basePath}?${new URLSearchParams({ ...params, page: String(target) })}">${label}</a>`;
  return `<div style="display:flex;gap:6px;align-items:center;margin-top:12px">
    ${link(page - 1, "‹ prev", page <= 1)}
    <span class="k">${total === 0 ? 0 : start + 1}–${start + shown} of ${total} · page ${page} of ${pages}</span>
    ${link(page + 1, "next ›", page >= pages)}
  </div>`;
}

const bar = (value) => `<div class="bar" style="width:60px;display:inline-block;vertical-align:middle"><span style="width:${Math.round(value * 100)}%"></span></div>`;

/** The whole generated cast, filtered and paged — not a sample of it. */
export function peoplePage(people, seed, query) {
  const nation = query.get("nation") ?? "";
  const role = query.get("role") ?? "";
  const search = (query.get("q") ?? "").trim().toLowerCase();

  const filtered = people.filter(
    (person) =>
      (!nation || String(person.nationality) === nation) &&
      (!role || (person.eligibleRoles ?? []).includes(role)) &&
      (!search || person.name.toLowerCase().includes(search) || String(person.id).toLowerCase().includes(search)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number(query.get("page") ?? 1)), pages);
  const start = (page - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  const rows = slice
    .map(
      (person) => `<tr>
      <td><a href="/people/${esc(person.id)}?${new URLSearchParams({ seed })}">${esc(person.name)}</a>
        <div class="k"><code>${esc(person.id)}</code></div></td>
      <td>${esc(nationName(person.nationality))}</td>
      <td class="k">${(person.eligibleRoles ?? []).map((r) => esc(r.replace("role-", ""))).join(", ")}</td>
      <td class="num">${person.age}</td>
      <td class="num">${bar(person.competence)} ${person.competence.toFixed(2)}</td>
      <td class="num">${bar(person.loyalty)} ${person.loyalty.toFixed(2)}</td>
      <td class="num">${bar(person.integrity)} ${person.integrity.toFixed(2)}</td>
      <td class="k">${(person.traits ?? []).map(esc).join(", ")}</td></tr>`,
    )
    .join("");

  const nationOptions = [...new Set(people.map((person) => String(person.nationality)))]
    .sort((a, b) => nationName(a).localeCompare(nationName(b)))
    .map((code) => `<option value="${esc(code)}" ${code === nation ? "selected" : ""}>${esc(nationName(code))}</option>`)
    .join("");
  const roleOptions = roleProfiles
    .map((profile) => `<option value="${esc(profile.role)}" ${profile.role === role ? "selected" : ""}>${esc(profile.role.replace("role-", ""))}</option>`)
    .join("");

  const rerollSeed = `preview-${Math.random().toString(36).slice(2, 10)}`;
  const rerollParams = new URLSearchParams({ seed: rerollSeed, ...(nation ? { nation } : {}), ...(role ? { role } : {}), ...(search ? { q: search } : {}) });

  return shell(
    `Cast · ${seed}`,
    `<div class="pagehead"><h1>The cast</h1><a class="k" href="/roles?${new URLSearchParams({ seed })}" style="margin-left:auto">edit role profiles ▸</a></div>
<p class="k">All ${people.length} people this seed generates across ${new Set(people.map((p) => p.nationality)).size} nations, from ${roleProfiles.length} role profiles. Every name below is one roll of a first-name and a last-name pool, not a fixed record — <a href="/people?${rerollParams}">reroll the seed ▸</a> and every name changes. The pool is generated, never stored: the same seed reproduces it exactly, so what is editable is the <a href="/roles?${new URLSearchParams({ seed })}">profiles</a>, not the person.</p>

<form method="get" action="/people" style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap">
  <input type="hidden" name="seed" value="${esc(seed)}">
  <input name="q" value="${esc(search)}" placeholder="search name or id">
  <select name="nation"><option value="">every nation</option>${nationOptions}</select>
  <select name="role"><option value="">every role</option>${roleOptions}</select>
  <button type="submit">Filter</button>
</form>

<div class="wrap"><table><tr><th>Person</th><th>Nation</th><th>Eligible roles</th><th>Age</th><th>Competence</th><th>Loyalty</th><th>Integrity</th><th>Traits</th></tr>${
      rows || `<tr><td colspan="8" class="k">Nobody matches that filter.</td></tr>`
    }</table></div>
${pagerFor("/people", { seed, ...(nation ? { nation } : {}), ...(role ? { role } : {}), ...(search ? { q: search } : {}) }, page, pages, start, slice.length, filtered.length)}`,
    seed,
    "/people",
  );
}

/** One generated person in full — every field the engine will actually read. */
export function personPage(person, seed) {
  const facets = person.portraitRef.split("/");
  const attributeRows = ATTRIBUTES.map(
    (attribute) =>
      `<tr><td>${esc(attribute)}</td><td class="num">${bar(person[attribute])} ${person[attribute].toFixed(2)}</td></tr>`,
  ).join("");
  const ideologyRows = Object.entries(person.ideology)
    .map(([axis, value]) => `<tr><td>${esc(axis)}</td><td class="num">${value.toFixed(2)}</td></tr>`)
    .join("");
  const facetRows = PORTRAIT_FACETS.map(
    ([label, index]) => `<tr><td>${label}</td><td><code>${esc(facets[index] ?? "—")}</code></td></tr>`,
  ).join("");

  return shell(
    person.name,
    `<div class="crumb"><a href="/people?${new URLSearchParams({ seed })}">Cast</a> / ${esc(person.name)}</div>
<div class="pagehead"><h1>${esc(person.name)}</h1><code>${esc(person.id)}</code></div>
<div>
  <span class="chip">nation <b>${esc(nationName(person.nationality))}</b></span>
  <span class="chip">age <b>${person.age}</b></span>
  ${(person.eligibleRoles ?? []).map((role) => `<span class="chip">eligible <b>${esc(role.replace("role-", ""))}</b></span>`).join("")}
  ${(person.traits ?? []).map((trait) => `<span class="chip">${esc(trait)}</span>`).join("")}
</div>
<p class="k" style="margin-top:12px">Generated from seed <code>${esc(seed)}</code> — this person is a roll, not a record. To change who people like this are, edit the <a href="/roles?${new URLSearchParams({ seed })}">role profile</a> they come from.</p>

<div class="card" style="margin-top:14px"><h3>Bio</h3><div style="font-family:var(--serif);font-size:15px;line-height:1.7">${esc(person.bio)}</div></div>

<div class="grid" style="margin-top:14px">
  <div class="card"><h3>Attributes</h3><table>${attributeRows}</table></div>
  <div class="card"><h3>Ideology</h3><table>${ideologyRows}</table></div>
  <div class="card"><h3>Portrait facets</h3><table>${facetRows}</table>
    <div class="k" style="margin-top:6px"><code>${esc(person.portraitRef)}</code></div></div>
</div>`,
    seed,
    "/people",
  );
}

/** Coverage across every portrait facet, plus the people behind any one value. */
export function portraitsPage(people, seed, query) {
  const facetIndex = Number(query.get("facet") ?? "");
  const facetValue = query.get("value") ?? "";

  const cards = PORTRAIT_FACETS.map(([label, index]) => {
    const counts = new Map();
    for (const person of people) {
      const key = person.portraitRef.split("/")[index];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top = entries[0]?.[1] ?? 1;
    return `<div class="card"><h3>${label}</h3><div class="k">${entries.length} distinct</div>
${entries
  .map(
    ([value, count]) =>
      `<div style="margin-top:6px"><a href="/portraits?${new URLSearchParams({ seed, facet: String(index), value })}">${esc(value)}</a> <span class="k">${count}</span>
        <div class="bar"><span style="width:${(count / top) * 100}%"></span></div></div>`,
  )
  .join("")}</div>`;
  }).join("");

  let drill = "";
  if (facetValue && Number.isInteger(facetIndex)) {
    const matching = people.filter((person) => person.portraitRef.split("/")[facetIndex] === facetValue);
    const pages = Math.max(1, Math.ceil(matching.length / PER_PAGE));
    const page = Math.min(Math.max(1, Number(query.get("page") ?? 1)), pages);
    const start = (page - 1) * PER_PAGE;
    const slice = matching.slice(start, start + PER_PAGE);
    const label = PORTRAIT_FACETS.find(([, index]) => index === facetIndex)?.[0] ?? "facet";
    drill = `<h2>${esc(label)} · ${esc(facetValue)} — ${matching.length} ${matching.length === 1 ? "person" : "people"}</h2>
<div class="wrap"><table><tr><th>Person</th><th>Nation</th><th>Age</th><th>Portrait ref</th></tr>${slice
      .map(
        (person) => `<tr><td><a href="/people/${esc(person.id)}?${new URLSearchParams({ seed })}">${esc(person.name)}</a></td>
        <td>${esc(nationName(person.nationality))}</td><td class="num">${person.age}</td>
        <td class="k"><code>${esc(person.portraitRef)}</code></td></tr>`,
      )
      .join("")}</table></div>
${pagerFor("/portraits", { seed, facet: String(facetIndex), value: facetValue }, page, pages, start, slice.length, matching.length)}`;
  }

  return shell(
    `Portraits · ${seed}`,
    `<div class="pagehead"><h1>Portrait coverage</h1></div>
<p class="k">Every facet tuple across all ${people.length} generated people. Each ref is its own tuple, so coverage is read off the cast rather than a lookup table, and skin tone is an independent axis rather than one implied by heritage. Click a value to see who carries it.</p>
<div class="grid">${cards}</div>
${drill}`,
    seed,
    "/portraits",
  );
}

/** The fifteen profiles the whole cast is generated from — and the one place editing changes anyone. */
export function rolesPage(people, seed, error, saved) {
  const counts = new Map();
  for (const person of people) {
    for (const role of person.eligibleRoles ?? []) counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  const cards = roleProfiles
    .map((profile) => {
      const attributeInputs = ATTRIBUTES.map(
        (attribute) => `<tr><td>${esc(attribute)}</td>
        <td><input name="${esc(attribute)}Min" value="${profile.attributes[attribute].min}" size="4" step="0.05" min="0" max="1" type="number"></td>
        <td><input name="${esc(attribute)}Max" value="${profile.attributes[attribute].max}" size="4" step="0.05" min="0" max="1" type="number"></td></tr>`,
      ).join("");
      return `<div class="card" id="${esc(profile.role)}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
        <h3 style="margin:0">${esc(profile.role.replace("role-", ""))}</h3>
        <span class="k">${counts.get(profile.role) ?? 0} in the pool${profile.cabinet ? " · cabinet seat" : ""}</span>
      </div>
      <div class="k">likely traits ${(profile.likelyTraits ?? []).map(esc).join(", ")}</div>
      <form method="post" action="/roles/${esc(profile.role)}" style="margin-top:10px">
        <input type="hidden" name="seed" value="${esc(seed)}">
        <table><tr><th>Attribute</th><th>Min</th><th>Max</th></tr>${attributeInputs}</table>
        <div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <label class="k">age <input name="ageMin" type="number" value="${profile.ageRange.min}" size="3" min="18" max="100"> to
            <input name="ageMax" type="number" value="${profile.ageRange.max}" size="3" min="18" max="100"></label>
          <label class="k">ideology spread <input name="ideologySpread" type="number" value="${profile.ideologySpread}" step="0.05" min="0" max="1" size="4"></label>
          <button type="submit">Save profile</button>
        </div>
      </form>
    </div>`;
    })
    .join("");

  return shell(
    "Role profiles",
    `<div class="crumb"><a href="/people?${new URLSearchParams({ seed })}">Cast</a> / role profiles</div>
<div class="pagehead"><h1>Role profiles</h1></div>
<p class="k">The ${roleProfiles.length} profiles every one of the ${people.length} people in the pool is rolled from. Editing a band here rewrites <code>packages/world/src/dataset/people.ts</code> and rebuilds <code>@admin/world</code> before the page returns; a build failure reverts the edit. This is the real write surface for the cast — an individual person is a roll and cannot be edited.</p>
${error ? `<div class="card" style="border-color:var(--bad)"><h3>Not saved</h3><div class="defect">${esc(error)}</div></div>` : ""}
${saved ? `<p class="k" style="color:var(--good)">Saved <code>${esc(saved)}</code> and rebuilt. The pool above is rolled fresh from it.</p>` : ""}
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(340px,1fr))">${cards}</div>`,
    seed,
    "/people",
  );
}
