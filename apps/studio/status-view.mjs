import { esc, shell } from "./view.mjs";
import { contentStatus } from "./prod-status.mjs";

// The page that answers "what can a player reach right now, and what is
// sitting here that they cannot". Everything it says about production comes
// from the bake committed in this checkout; everything it says about this
// machine is labeled as being about this machine.

const tile = (value, label, tone = "") =>
  `<div class="tile"><div class="v"${tone ? ` style="color:var(--${tone})"` : ""}>${esc(String(value))}</div><div class="l">${esc(label)}</div></div>`;

function productionPanel(status) {
  const { live, bundled, liveShardCount } = status;

  if (live.status !== "live") {
    return `<div class="card" style="border-color:var(--warn)">
      <h3 style="margin:0">The bake could not be read</h3>
      <p class="k" style="margin:6px 0 0">${esc(live.reason)}</p>
      <p class="k" style="margin:6px 0 0">The bundled floor below is live regardless — it is compiled into the app.
      Nothing else on this page can be called live until the bake can be read, and this console will not
      guess from what happens to be in this checkout.</p>
    </div>`;
  }

  return `<div class="card" style="border-color:var(--good)">
    <h3 style="margin:0">Baked into this build: content set <code>${esc(live.setId)}</code>, revision ${esc(String(live.revision))}</h3>
    <p class="k" style="margin:6px 0 0">The player plays this bake and nothing else: ${esc(String(liveShardCount ?? 0))} scenario shard(s)
    carrying ${esc(String(live.ids.length))} scenario(s), on top of the ${esc(String(bundled.count))} bundled.</p>
  </div>`;
}

export async function statusPage() {
  const status = await contentStatus();
  const { bundled, localCorpus, staged, drafts, live } = status;

  const stagedNote = staged.verified
    ? staged.count > 0
      ? `<p class="k">${staged.count} scenario(s) are published into this checkout's corpus but are not carried by the bake.
         That is what a publish looks like when \`corpus build\` did not follow.</p>`
      : `<p class="k">Everything published locally is also in the bake.</p>`
    : `<p class="k">${localCorpus.count} scenario(s) sit in this checkout's corpus. Whether production has them is
       unknown until the bake can be read — they are counted here as not-in-production, which is the safe direction.</p>`;

  const draftRows = drafts.jobs.length
    ? drafts.jobs
        .map(
          (job) => `<tr>
        <td><a href="/scenarios/${esc(job.jobId)}">${esc(job.jobId)}</a></td>
        <td class="num">${job.journaled}</td>
        <td class="num">${job.awaitingReview ? `<span style="color:var(--warn)">${job.awaitingReview}</span>` : "0"}</td>
        <td class="num">${job.approved}</td>
        <td class="num">${job.rejected ? `<span style="color:var(--bad)">${job.rejected}</span>` : "0"}</td>
        <td class="num">${job.shippedCount}</td>
      </tr>`,
        )
        .join("")
    : `<tr><td colspan="6" class="k">No scenario batches on this machine.</td></tr>`;

  const bundledRows = bundled.scenarios
    .map(
      (s) => `<tr><td><a href="/library/${esc(s.id)}">${esc(s.subject)}</a><div class="k"><code>${esc(s.id)}</code></div></td>
      <td>${esc(s.class)}</td></tr>`,
    )
    .join("");

  return shell(
    "What is live",
    `<div class="pagehead"><h1>What is live</h1></div>
<p class="k">Production is whatever this build bakes in: the player has no content service and plays nothing else.
A directory in this checkout is not production, and this page never treats it as such.</p>

<div class="tiles">
  ${tile(bundled.count, "bundled in the app", "good")}
  ${tile(live.status === "live" ? (status.liveShardCount ?? 0) : "?", "shards baked")}
  ${tile(staged.count, "staged, not live", staged.count ? "warn" : "")}
  ${tile(drafts.totals.notScaffolded, "review not started", drafts.totals.notScaffolded ? "warn" : "")}
  ${tile(drafts.totals.awaitingReview, "awaiting a decision", drafts.totals.awaitingReview ? "warn" : "")}
  ${tile(drafts.totals.approved, "approved, unshipped")}
  ${tile(drafts.totals.rejected, "rejected", drafts.totals.rejected ? "bad" : "")}
</div>

<h2>Production</h2>
${productionPanel(status)}

<h2>Staged on this machine</h2>
${stagedNote}

<h2>Not published</h2>
<p class="k">Everything the generation harness has written that no player can reach.</p>
<table><thead><tr>
  <th>Batch</th><th class="num">Journaled</th><th class="num">Awaiting a decision</th>
  <th class="num">Approved</th><th class="num">Rejected</th><th class="num">Shipped</th>
</tr></thead><tbody>${draftRows}</tbody></table>

<h2>Bundled floor · ${bundled.count}</h2>
<p class="k">Compiled into every install. Live for anyone on this app version.</p>
<table><thead><tr><th>Scenario</th><th>Class</th></tr></thead><tbody>${bundledRows}</tbody></table>`,
    { active: "/status" },
  );
}
