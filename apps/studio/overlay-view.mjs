import { worldDataset } from "@admin/world";
import { esc, shell } from "./view.mjs";
import { valueAtPath } from "./overlay-model.mjs";
import { planPublish } from "./overlay-publish.mjs";

// The overlay's review page, where every pending edit is read together before
// any part of the set reaches source. The editor that produces the edits is
// the typed nation editor (nation-page.mjs).
//
// Review is a separate page rather than a confirm dialog because publishing is
// the moment hand-authored TypeScript changes. A reviewer needs the whole
// pending set in front of them with every staleness verdict already decided —
// the same verdicts the publisher reaches — not one field at a time.

const nationName = new Map(worldDataset.nations.map((n) => [String(n.id), n.identity.name]));

const editRow = (edit, verdict) => {
  const seed = worldDataset.nations.find((nation) => String(nation.id) === edit.recordId);
  const sourceValue = seed ? valueAtPath(seed, edit.fieldPath) : undefined;
  return `<tr>
<td><a href="/nations/${esc(edit.recordId)}">${esc(nationName.get(edit.recordId) ?? edit.recordId)}</a></td>
<td><code>${esc(edit.fieldPath)}</code></td>
<td class="k">${esc(String(sourceValue))}</td>
<td><b>${esc(String(edit.newValue))}</b></td>
<td>${verdict}</td>
<td class="k">${edit.note ? esc(edit.note) : "—"}</td>
<td><form method="post" action="/overlay/discard" style="margin:0">
  <input type="hidden" name="id" value="${esc(edit.id)}">
  <button class="quiet" type="submit" style="padding:3px 10px;font-size:12px">discard</button></form></td></tr>`;
};

/** Every pending edit, with the verdict publishing would reach for each. */
export function overlayPage(pending, { error, notice, role, enabled, source } = {}) {
  if (!enabled) {
    return shell(
      "Overlay",
      `<div class="pagehead"><h1>Overlay</h1></div>
<div class="card" style="border-color:var(--warn)"><h3>Editing is off</h3>
<p class="k">Dataset editing is unavailable on this server.</p></div>`,
      { active: "/overlay" },
    );
  }
  if (!role) {
    return shell(
      "Overlay",
      `<div class="pagehead"><h1>Overlay</h1></div>
<div class="card" style="border-color:var(--warn)"><h3>No dataset role</h3>
<p class="k">This operator holds no dataset role on this server.</p></div>`,
      { active: "/overlay" },
    );
  }

  // The same source text the publisher will read, so a verdict shown here is
  // the verdict acted on rather than a guess made against a stale import.
  const plan = planPublish(pending, source);
  const refusedById = new Map(plan.refused.map((entry) => [entry.edit.id, entry.reason]));

  const rows = pending
    .map((edit) => {
      const reason = refusedById.get(edit.id);
      const verdict = reason
        ? `<span class="badge reject">refused</span><div class="defect">${esc(reason)}</div>`
        : '<span class="badge approve">ready</span>';
      return editRow(edit, verdict);
    })
    .join("");

  const ready = plan.applicable.length;
  const mayPublish = role === "admin";

  return shell(
    "Overlay",
    `<div class="pagehead"><h1>Overlay</h1><span class="crumb">${pending.length} pending · ${ready} ready to publish</span></div>
<p class="k">Pending edits to the authored dataset. Publishing writes each one into <code>packages/world/src/dataset/nations.ts</code>, rebuilds <code>@admin/world</code>, and marks the row published.
An edit written against a value that source no longer carries is refused rather than applied — somebody changed that field by hand, and publishing over them would discard their change silently.</p>
${error ? `<div class="card" style="border-color:var(--bad)"><div class="defect">${esc(error)}</div></div>` : ""}
${notice ? `<div class="card" style="border-color:var(--good)"><div class="k">${esc(notice)}</div></div>` : ""}
${
  pending.length === 0
    ? '<p class="k">Nothing pending. Edits are made from a nation\'s editor (<a href="/nations">Nations</a> → edit).</p>'
    : `<div class="wrap"><table>
<tr><th>Nation</th><th>Field</th><th>Source</th><th>Pending</th><th>Verdict</th><th>Note</th><th></th></tr>${rows}</table></div>
${
        mayPublish
          ? `<form method="post" action="/overlay/publish" style="margin-top:16px">
  <button type="submit" ${ready === 0 ? "disabled style=\"opacity:.5;cursor:not-allowed\"" : ""}>Publish ${ready} edit${ready === 1 ? "" : "s"} to source</button>
</form>`
          : `<p class="k" style="margin-top:16px">${ready} edit${ready === 1 ? " is" : "s are"} ready, awaiting an admin to publish.</p>`
      }`
}`,
    { active: "/overlay" },
  );
}
