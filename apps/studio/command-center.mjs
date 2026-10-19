import { esc, num, shell, usd } from "./view.mjs";
import { contentStatus } from "./prod-status.mjs";
import { runSummaries, draftScenarioRows } from "./scenarios-view.mjs";
import { scenarioIndex, tally } from "./scenario-index.mjs";

// The console's front door. Its job is to answer three questions without a
// click: where is content stuck, what is it costing, and what is broken right
// now.
//
// It computes nothing itself. Every figure is read from the module that already
// owns that truth, the committed bake for what is live, the run summaries
// for the pipeline, the scenario index for the corpus, so this page can go
// stale but can never disagree.

/**
 * The content pipeline as the stages a scenario actually passes through, each
 * one a link to where that stage is worked. The funnel is the page's spine
 * because every alert below it is a stage that stopped moving.
 */
function funnel(stages) {
  return `<div class="funnel">${stages
    .map(
      // A stage whose figure cannot be established renders the reason, never a
      // number: "?" is the honest answer when the bake cannot be read,
      // and formatting an unknown as a count is how a console starts lying.
      (stage) => `<a class="step" href="${stage.href}">
        <div class="v" ${stage.tone ? `style="color:var(--${stage.tone})"` : ""}>${
          typeof stage.value === "number" ? num(stage.value) : esc(stage.value)
        }</div>
        <div class="l">${esc(stage.label)}</div>
        <div class="rule" style="background:var(--${stage.tone ?? "line2"})"></div>
        <div class="k" style="margin-top:6px">${stage.note}</div>
      </a>`,
    )
    .join("")}</div>`;
}

/**
 * Only conditions with an owner and a next action qualify.
 *
 * An alert list that also carries "things worth knowing" trains an operator to
 * skim past it, which costs exactly the failures it exists to surface.
 */
function alertsFor(status, runs, drafts) {
  const alerts = [];
  const failed = runs.filter((run) => run.failed > 0);
  const unrenderable = runs.filter((run) => run.error);
  const awaiting = runs.filter((run) => run.pendingDecisions > 0);
  const provisional = runs.filter((run) => run.provisional);

  if (status.live.status !== "live") {
    alerts.push({
      tone: "warn",
      title: "The bake cannot be read",
      body: `${esc(status.live.reason)} — nothing on this machine can be called live until the bake can be read.`,
      href: "/status",
      action: "Open what is live",
    });
  }
  if (status.staged.verified && status.staged.count > 0) {
    alerts.push({
      tone: "warn",
      title: `${num(status.staged.count)} scenario(s) published but not baked`,
      body: "They sit in this checkout's corpus and the bake does not carry them. That is what a publish looks like when `corpus build` never followed.",
      href: "/status",
      action: "Open what is live",
    });
  }
  // Grouped, not one card per run: eleven identical "unknown kind" cards is
  // how an alert list teaches an operator to stop reading it.
  if (unrenderable.length) {
    alerts.push({
      tone: "bad",
      title: `${unrenderable.length} run(s) the console cannot describe`,
      body: `${unrenderable.map((run) => `<code>${esc(run.jobId)}</code>`).join(" · ")} — ${esc(unrenderable[0].error)}`,
      href: "/scenarios",
      action: "Open runs",
    });
  }
  if (failed.length) {
    const items = failed.reduce((sum, run) => sum + run.failed, 0);
    alerts.push({
      tone: "bad",
      title: `${num(items)} item(s) failed across ${failed.length} run(s)`,
      body: failed.map((run) => `<a href="/scenarios/${esc(run.jobId)}">${esc(run.jobId)}</a> (${run.failed})`).join(" · "),
      href: `/scenarios/${encodeURIComponent(failed[0].jobId)}`,
      action: "Open the first",
    });
  }
  if (awaiting.length) {
    const owed = awaiting.reduce((sum, run) => sum + run.pendingDecisions, 0);
    alerts.push({
      tone: "warn",
      title: `${num(owed)} decision(s) owed a human`,
      body: awaiting.map((run) => `<a href="/scenarios/${esc(run.jobId)}">${esc(run.jobId)}</a> (${run.pendingDecisions})`).join(" · "),
      href: `/scenarios/${encodeURIComponent(awaiting[0].jobId)}`,
      action: "Start reviewing",
    });
  }
  if (provisional.length) {
    alerts.push({
      tone: "warn",
      title: `${provisional.length} batch(es) shipped provisionally`,
      body: "The reviewer authored the batch. A second pair of eyes is still owed on this content.",
      href: "/scenarios?stage=shipped",
      action: "Open shipped runs",
    });
  }
  if (drafts.length === 0 && status.localCorpus.count === 0) {
    alerts.push({
      tone: "warn",
      title: "Nothing beyond the bundled floor",
      body: "No scenario has been published to this checkout's corpus, so the game draws only from what is compiled into the app.",
      href: "/scenarios/new",
      action: "Start a run",
    });
  }
  return alerts;
}

function alertCards(alerts) {
  if (!alerts.length) {
    return `<div class="card good"><h3>Nothing is stuck</h3>
      <p class="k">No failed items, no decision owed, nothing published that production has not taken.</p></div>`;
  }
  return alerts
    .map(
      (alert) => `<div class="card ${alert.tone}">
        <div style="display:flex;gap:10px;align-items:baseline">
          <h3 style="margin:0">${alert.title}</h3>
          <a class="k" style="margin-left:auto" href="${alert.href}">${esc(alert.action)} ▸</a>
        </div>
        <p class="k" style="margin:6px 0 0">${alert.body}</p>
      </div>`,
    )
    .join("");
}

/** Runs ranked by what still needs doing, so the top of the list is the top of the queue. */
function runQueue(runs) {
  const outstanding = (run) => (run.error ? -1 : run.failed * 100 + run.pendingDecisions * 10 + run.open);
  const ranked = [...runs].sort((a, b) => outstanding(b) - outstanding(a)).slice(0, 8);
  if (!ranked.length) return `<p class="k">No generation run has been created on this machine.</p>`;
  const rows = ranked
    .map((run) => {
      if (run.error) return `<tr><td><a href="/scenarios">${esc(run.jobId)}</a></td><td colspan="4" class="defect">${esc(run.error)}</td></tr>`;
      const width = (n) => (run.total ? (n / run.total) * 100 : 0);
      return `<tr>
        <td><a href="/scenarios/${esc(run.jobId)}">${esc(run.jobId)}</a><div class="sub">${esc(run.kind)} · ${esc(run.driver)}</div></td>
        <td><span class="badge ${esc(run.stage)}">${esc(run.stage)}</span></td>
        <td style="min-width:150px"><div class="progress"><span class="done" style="width:${width(run.done)}%"></span><span class="failed" style="width:${width(run.failed)}%"></span></div>
          <div class="sub">${run.done}/${run.total} done${run.failed ? ` · ${run.failed} failed` : ""}</div></td>
        <td class="num">${run.pendingDecisions ? `<span style="color:var(--warn)">${run.pendingDecisions}</span>` : "—"}</td>
        <td class="num">${usd(run.spendUsd)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="wrap"><table class="dense"><thead><tr>
    <th>Run</th><th>Stage</th><th>Progress</th><th class="num">Owed</th><th class="num">Spend</th>
  </tr></thead><tbody>${rows}</tbody></table></div>`;
}

/** The thinnest classes first: what the next run should be aimed at. */
function thinClasses(rows) {
  const counts = new Map(tally(rows, (row) => row.class));
  const ranked = [...counts.entries()].sort((a, b) => a[1] - b[1]).slice(0, 6);
  const top = Math.max(1, ...counts.values());
  return ranked
    .map(
      ([name, count]) => `<div class="meterrow"><span class="name">${esc(name)}</span>
        <span class="track"><span style="width:${(count / top) * 100}%;background:var(--warn)"></span></span>
        <span class="val">${num(count)}</span></div>`,
    )
    .join("");
}

export async function commandCenterPage() {
  const status = await contentStatus();
  const runs = await runSummaries();
  const drafts = await draftScenarioRows();
  const index = await scenarioIndex(drafts);
  const playable = index.filter((row) => row.source !== "draft");

  const spend = runs.reduce((sum, run) => sum + (run.spendUsd ?? 0), 0);
  const owed = runs.reduce((sum, run) => sum + (run.pendingDecisions ?? 0), 0);
  const openItems = runs.reduce((sum, run) => sum + (run.open ?? 0), 0);
  const alerts = alertsFor(status, runs, drafts);

  const stages = [
    { label: "in a run", value: openItems, href: "/scenarios?stage=generating", note: "items not yet journaled", tone: openItems ? "accent" : undefined },
    { label: "drafted", value: drafts.length, href: "/explore?source=draft", note: "written, unshipped" },
    { label: "owed a decision", value: owed, href: "/scenarios?stage=review", note: "waiting on a human", tone: owed ? "warn" : undefined },
    { label: "published here", value: status.localCorpus.count, href: "/explore?source=corpus", note: "in this checkout's corpus" },
    { label: "live", value: status.staged.verified ? status.localCorpus.count - status.staged.count : "?", href: "/status", note: "in the bake", tone: "good" },
  ];

  return shell(
    "Overview",
    `<div class="pagehead"><h1>Command center</h1>
      <span class="k">${num(playable.length)} scenario(s) a player can draw · ${num(drafts.length)} in flight</span>
      <form method="get" action="/scenarios/new" style="margin-left:auto"><button type="submit">＋ New run</button></form></div>
<p class="lede">Where content is stuck, what it has cost, and what is broken. Every figure is read from whichever module owns it — the committed bake for what is live, the run journals for the pipeline — so this page can be stale but never wrong.</p>

${funnel(stages)}

<div class="tiles">
  <div class="tile"><div class="v">${num(status.bundled.count)}</div><div class="l">bundled floor</div><div class="note">live for anyone on this app version</div></div>
  <div class="tile"><div class="v">${num(index.length)}</div><div class="l">scenarios written</div><div class="note">every stage, this checkout</div></div>
  <div class="tile"><div class="v" style="${owed ? "color:var(--warn)" : ""}">${num(owed)}</div><div class="l">decisions owed</div></div>
  <div class="tile"><div class="v">${runs.length}</div><div class="l">generation runs</div></div>
  <div class="tile"><div class="v">${usd(spend)}</div><div class="l">total spend</div></div>
  <div class="tile"><div class="v">${num(new Set(index.flatMap((row) => row.flags)).size)}</div><div class="l">flags in play</div><div class="note">governance memory content writes</div></div>
</div>

<div class="split">
  <div>
    <div class="sectionhead"><h2>Needs attention</h2><span class="k">${alerts.length || "nothing"} open</span></div>
    <div class="grid" style="grid-template-columns:1fr">${alertCards(alerts)}</div>

    <div class="sectionhead"><h2>Run queue</h2><a class="k" href="/scenarios">All runs ▸</a></div>
    <p class="k">Ranked by what is still owed: failures first, then decisions, then unfinished items.</p>
    ${runQueue(runs)}
  </div>
  <div>
    <div class="sectionhead"><h2>Thinnest classes</h2></div>
    <div class="card">
      <p class="k">Counted over the ${num(playable.length)} scenario(s) a player can actually draw. These are where a month has the least to offer — aim the next run here.</p>
      ${thinClasses(playable)}
      <p class="k" style="margin-top:12px"><a href="/explore">Open the scenario explorer ▸</a></p>
    </div>
  </div>
</div>`,
    { active: "/", crumb: "Command center" },
  );
}
