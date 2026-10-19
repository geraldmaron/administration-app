import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { cmdRun } from "@admin/studio-cli/dist/cli.js";
import { JobFile, progressEntryOf } from "@admin/studio-cli/dist/jobs/job-file.js";
import {
  doneItems,
  finishReview,
  recordDefects,
  reviewPathsFor,
  scaffoldReview,
} from "@admin/studio-cli/dist/jobs/review-core.js";
import { esc, shell } from "./view.mjs";
import { rowOf } from "./scenario-index.mjs";
import { JOB_KINDS, kindFor } from "./job-kinds.mjs";
import { icons, KIND_ICON, STAGE_ICON } from "./icons.mjs";

// The same generation-loop artifacts studio-cli's `scenarios review` command
// works with, given a page instead of a terminal: what's journaled, what's
// been judged, and what's shipped. The gate logic itself lives once, in
// studio-cli — this module only renders and mutates review.json, then hands
// the actual accept/finish decision to the same functions the CLI calls, so a
// click here and a `studio scenarios review` run there can never disagree
// about whether a batch is ready to ship.

const JOBS_DIR = path.join("content", "jobs");
const REVIEWS_DIR = path.join("content", "reviews");
const LEDGER_PATH = path.join("content", "ledger", "spend.jsonl");

async function listJobIds() {
  if (!existsSync(JOBS_DIR)) return [];
  const entries = await readdir(JOBS_DIR);
  return entries
    .filter((name) => name.endsWith(".json") && !name.endsWith(".progress.json"))
    .map((name) => name.replace(/\.json$/, ""))
    .sort();
}

async function loadJob(jobId) {
  const jobPath = path.join(JOBS_DIR, `${jobId}.json`);
  if (!existsSync(jobPath)) return undefined;
  return JobFile.parse(JSON.parse(await readFile(jobPath, "utf8")));
}

async function loadReview(paths, kind) {
  if (!kind.reviewable) return undefined;
  const reviewPath = path.join(paths.reviewDir, "review.json");
  if (!existsSync(reviewPath)) return undefined;
  return kind.ReviewFile.parse(JSON.parse(await readFile(reviewPath, "utf8")));
}

async function loadShipped(paths) {
  const shippedPath = path.join(paths.reviewDir, "shipped.json");
  if (!existsSync(shippedPath)) return undefined;
  return JSON.parse(await readFile(shippedPath, "utf8"));
}

/** Last journal entry per item — the journal is append-only, so the latest line is the item's current truth. */
async function progressByItem(progressPath) {
  const byItem = new Map();
  if (!existsSync(progressPath)) return byItem;
  for (const line of (await readFile(progressPath, "utf8")).split("\n")) {
    if (!line.trim()) continue;
    const entry = progressEntryOf(JSON.parse(line));
    if (entry) byItem.set(entry.itemId, entry);
  }
  return byItem;
}

async function jobSpendUsd(jobId) {
  if (!existsSync(LEDGER_PATH)) return 0;
  let total = 0;
  for (const line of (await readFile(LEDGER_PATH, "utf8")).split("\n")) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    if (entry.jobId === jobId && typeof entry.spendUsd === "number") total += entry.spendUsd;
  }
  return total;
}

/** One snapshot of everything the dashboard and the poller need to say about a job. */
async function jobStatus(jobId) {
  const job = await loadJob(jobId);
  if (!job) return undefined;
  const kind = kindFor(job);
  const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, jobId);
  const progress = await progressByItem(paths.progressPath);
  const review = await loadReview(paths, kind);
  const shipped = await loadShipped(paths);

  let done = 0;
  let failed = 0;
  const items = job.items.map((item) => {
    const entry = progress.get(item.id);
    const status = entry?.status === "done" ? "done" : entry?.status === "failed" ? "failed" : "open";
    if (status === "done") done++;
    if (status === "failed") failed++;
    return { id: item.id, status, error: entry?.error, timestamp: entry?.timestamp };
  });
  // Only what a human still owes an answer on counts as pending: a clean
  // scenario left untouched is the intended outcome at scale, not a backlog.
  const owed = (review?.decisions ?? []).filter((d) => (d.tier ?? "clean") !== "clean");
  const pendingDecisions = owed.filter((d) => d.decision === "pending").length;
  // A kind this console models no review for cannot sit in "review": its only
  // honest stages are running and finished.
  const stage = !kind.reviewable
    ? done + failed === job.items.length
      ? "done"
      : "generating"
    : shipped
    ? "shipped"
    : review
      ? "review"
      : done > 0 && done === job.items.length
        ? "review"
        : "generating";
  return {
    jobId, job, kind, paths, items, done, failed,
    open: job.items.length - done - failed,
    review, shipped, pendingDecisions, owedCount: owed.length, stage,
    shippedCount: shipped?.[kind.manifestKey]?.length ?? 0,
    spendUsd: await jobSpendUsd(jobId),
  };
}

export async function jobStatusJson(jobId) {
  const status = await jobStatus(jobId);
  if (!status) return undefined;
  const { job, kind, paths, review, shipped, ...rest } = status;
  return { ...rest, total: job.items.length, shipped: Boolean(shipped), decided: review ? review.decisions.length - status.pendingDecisions : 0 };
}

function stageBadge(status) {
  const label = status.shipped ? (status.shipped.provisional ? "shipped · provisional" : "shipped") : status.stage;
  const cls = status.shipped ? "shipped" : status.stage;
  const icon = STAGE_ICON[cls] ?? icons.circle;
  return `<span class="badge ${cls}">${icon}${esc(label)}</span>`;
}

function progressBar(status, total) {
  const w = (n) => (total ? (n / total) * 100 : 0);
  return `<div class="progress" title="${status.done} done · ${status.failed} failed · ${status.open} open">
    <span class="done" style="width:${w(status.done)}%"></span>
    <span class="failed" style="width:${w(status.failed)}%"></span>
  </div>`;
}

const DECISION_ICON = { approve: icons.check, reject: icons.x, pending: icons.clock };

function decisionBadge(decision) {
  return decision
    ? `<span class="badge ${decision.decision}">${DECISION_ICON[decision.decision] ?? icons.clock}${esc(decision.decision)}</span>`
    : `<span class="badge pending">${icons.clock}not in review</span>`;
}

const TIER_ICON = { flagged: icons.flag, sampled: icons.dice, clean: icons.spark };

function tierBadge(tier) {
  const cls = tier === "flagged" ? "review" : tier === "sampled" ? "generating" : "pending";
  const label = tier === "clean" ? "clean · ships on the gate" : tier;
  return `<span class="badge ${cls}">${TIER_ICON[tier] ?? icons.spark}${esc(label)}</span>`;
}

/**
 * Three icon buttons standing in for the old bare `<select>` — same "decide"
 * POST contract (a hidden `decision` field carries the value), just faster to
 * read and to operate: color and icon say the current state at a glance, one
 * click changes it, no menu to open first.
 */
function decisionToggle(current) {
  const opt = (value, icon, label) =>
    `<button type="submit" name="decision" value="${value}" class="${value === current ? `active ${value}` : ""}" title="${label}">${icon}</button>`;
  return `<div class="decision-toggle">
    ${opt("approve", icons.check, "Approve")}
    ${opt("reject", icons.x, "Reject")}
    ${opt("pending", icons.clock, "Reset to pending")}
  </div>`;
}

function decisionForm(jobId, kind, decision) {
  return `
  <form method="post" action="/scenarios/${esc(jobId)}/decide" style="margin-top:10px">
    <input type="hidden" name="itemId" value="${esc(decision[kind.idKey])}">
    ${decision.flags?.length ? `<div class="defect">${decision.flags.map(esc).join("<br>")}</div>` : ""}
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      ${tierBadge(decision.tier ?? "clean")}
      ${decisionToggle(decision.decision)}
    </div>
    <textarea name="note" rows="2" placeholder="note (optional)" style="margin-top:6px">${esc(decision.note)}</textarea>
  </form>`;
}

/**
 * Decide many at once. The checkboxes live inside each card below, associated
 * to this form by id (`form="bulk-decide-form"`) rather than nesting — a form
 * cannot contain a form, and each card already owns its own single-item one.
 * The shared note is optional context applied to every item checked, not a
 * requirement — nothing here blocks the decision from saving.
 */
function bulkDecideBar(jobId) {
  return `
  <form method="post" action="/scenarios/${esc(jobId)}/decide-bulk" id="bulk-decide-form"
    style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:10px">
    <label style="display:flex;gap:6px;align-items:center;padding-top:6px">
      <input type="checkbox" id="bulk-select-all" onchange="document.querySelectorAll('.bulk-check').forEach(c => c.checked = this.checked)">
      <span class="k">select all on this page</span>
    </label>
    <select name="decision" required style="padding-top:6px">
      <option value="" disabled selected>bulk decision…</option>
      <option value="approve">approve selected</option>
      <option value="reject">reject selected</option>
      <option value="pending">reset selected to pending</option>
    </select>
    <textarea name="note" rows="1" placeholder="note (optional), applied to every item checked" style="flex:1;min-width:240px"></textarea>
    <button type="submit" onclick="return document.querySelectorAll('.bulk-check:checked').length > 0 || alert('check at least one item first')">${icons.check}Apply to selected</button>
  </form>`;
}

function reviewStatusLabel(status) {
  if (status.shipped) return `shipped ${status.shippedCount}${status.shipped.provisional ? " (provisional)" : ""}`;
  if (!status.review) return "no review yet";
  return status.pendingDecisions > 0
    ? `${status.pendingDecisions} of ${status.owedCount} owed a decision`
    : "decided, not finished";
}

/** One page of a list, with the controls to move through it. Everything the console lists is paged: a five-figure corpus has no "just render it all" mode. */
function paged(items, page, perPage) {
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * perPage;
  return { slice: items.slice(start, start + perPage), page: current, pages, total: items.length, start };
}

function pager(baseUrl, view, param = "page") {
  if (view.pages <= 1) return "";
  const link = (page, label, disabled) =>
    disabled
      ? `<span class="k" style="padding:4px 10px">${label}</span>`
      : `<a href="${baseUrl}${baseUrl.includes("?") ? "&" : "?"}${param}=${page}" style="padding:4px 10px">${label}</a>`;
  return `<div style="display:flex;gap:6px;align-items:center;margin-top:12px">
    ${link(view.page - 1, "‹ prev", view.page <= 1)}
    <span class="k">${view.start + 1}–${Math.min(view.start + view.slice.length, view.total)} of ${view.total} · page ${view.page} of ${view.pages}</span>
    ${link(view.page + 1, "next ›", view.page >= view.pages)}
  </div>`;
}

// The dashboard reads every job's file, journal, review and ledger share. That
// is fine for ten runs and quadratic-feeling for a thousand, and none of it
// changes between two page loads a second apart. Each job's summary is cached
// against the mtimes of the files it was computed from, so an unchanged job
// costs a stat call rather than a full re-read, and a changed one recomputes
// immediately — no staleness window to reason about.
const summaryCache = new Map();

async function stamp(filePaths) {
  const times = await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        return `${(await stat(filePath)).mtimeMs}`;
      } catch {
        return "-";
      }
    }),
  );
  return times.join("|");
}

async function cachedJobStatus(jobId) {
  const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, jobId);
  const watched = [
    path.join(JOBS_DIR, `${jobId}.json`),
    paths.progressPath,
    path.join(paths.reviewDir, "review.json"),
    path.join(paths.reviewDir, "shipped.json"),
    LEDGER_PATH,
  ];
  const key = await stamp(watched);
  const cached = summaryCache.get(jobId);
  if (cached?.key === key) return cached.status;
  const status = await jobStatus(jobId);
  summaryCache.set(jobId, { key, status });
  return status;
}

export async function scenariosIndexPage(query = new URLSearchParams()) {
  const ids = await listJobIds();
  // One job the console cannot describe must not take the whole index down
  // with a stack trace: a single unrecognized batch in the jobs directory would
  // leave no operator able to see any run at all. `kindFor` is right to throw
  // rather than guess a kind, but the index is exactly the caller that must
  // not. It reports what is there, so an artifact it cannot render is a row to
  // acknowledge, not a reason to render nothing.
  const settled = await Promise.all(
    ids.map(async (id) => {
      try {
        return { id, status: await cachedJobStatus(id) };
      } catch (cause) {
        return { id, error: cause instanceof Error ? cause.message : String(cause) };
      }
    }),
  );
  const unrenderable = settled.filter((entry) => entry.error !== undefined);
  const all = settled.map((entry) => entry.status).filter(Boolean);
  const stageFilter = query.get("stage") ?? "";
  const kindFilter = query.get("kind") ?? "";
  const statuses = all.filter(
    (status) => (!stageFilter || status.stage === stageFilter) && (!kindFilter || status.job.kind === kindFilter),
  );
  // Filters compose, so each control has to carry whatever the other is set to
  // or clicking one would silently clear the other.
  const withFilters = (overrides) => {
    const params = new URLSearchParams();
    const stage = overrides.stage ?? stageFilter;
    const kind = overrides.kind ?? kindFilter;
    if (stage) params.set("stage", stage);
    if (kind) params.set("kind", kind);
    const query = params.toString();
    return `/scenarios${query ? `?${query}` : ""}`;
  };

  const totals = {
    jobs: all.length,
    open: all.reduce((n, s) => n + s.open, 0),
    failed: all.reduce((n, s) => n + s.failed, 0),
    awaiting: all.reduce((n, s) => n + s.pendingDecisions, 0),
    shipped: all.reduce((n, s) => n + s.shippedCount, 0),
    spend: all.reduce((n, s) => n + s.spendUsd, 0),
  };

  const chipRow = (label, current, options) =>
    `<div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">
      <span class="k" style="min-width:52px;text-transform:uppercase;letter-spacing:1px;font-size:10px">${label}</span>
      ${options
        .map(
          ([value, text, href]) =>
            // text may carry a trusted inline-icon prefix (job-kinds labels and
            // stage names are hardcoded, never user input), so it is not escaped.
            `<a class="chip" href="${href}" style="${current === value ? "border-color:var(--accent);color:var(--fg)" : ""}">${text}</a>`,
        )
        .join("")}
    </div>`;

  const filterRows =
    chipRow(
      "stage",
      stageFilter,
      // "done" is the terminal stage of a kind this console models no review
      // for; without it here an image batch is filterable by kind but not by
      // where it has got to.
      ["", "generating", "review", "done", "shipped"].map((stage) => [
        stage,
        `${stage ? STAGE_ICON[stage] ?? "" : ""}${stage || "all"}`,
        withFilters({ stage }),
      ]),
    ) +
    chipRow(
      "kind",
      kindFilter,
      [
        ["", "all", withFilters({ kind: "" })],
        ...JOB_KINDS.map((k) => [k.kind, `${KIND_ICON[k.kind] ?? ""}${k.label}`, withFilters({ kind: k.kind })]),
      ],
    );

  // Cross-run review queue: everything a reviewer still owes an answer on,
  // wherever it lives, so judging a batch never starts with hunting for which
  // job has anything left in it. Built entirely from counts `cachedJobStatus`
  // already computes per run — no extra read.
  const awaitingJobs = [...all].filter((s) => s.pendingDecisions > 0).sort((a, b) => b.pendingDecisions - a.pendingDecisions);
  const needsDecisionStrip = awaitingJobs.length
    ? `<div class="needs-decision">
        <span class="nd-label">${icons.flag}Needs your decision</span>
        <div class="nd-row">${awaitingJobs
          .map(
            (s) =>
              `<a class="chip warn" href="/scenarios/${esc(s.jobId)}?tier=owed"><b>${s.pendingDecisions}</b> in ${esc(s.jobId)}</a>`,
          )
          .join("")}</div>
      </div>`
    : "";

  const quicklinks = `<div class="quicklinks">
    <a href="/explore">${icons.search}Explorer — browse every scenario</a>
    <a href="/library">${icons.package}Library — shipped corpus</a>
    <a href="/overlay">${icons.edit}Overlay — pending dataset edits</a>
  </div>`;

  const unrenderableNote = unrenderable.length
    ? `<div class="card" style="border-color:var(--bad);margin-bottom:10px">
        <strong>${unrenderable.length} job${unrenderable.length === 1 ? "" : "s"} the console cannot render</strong>
        <div class="k" style="margin-top:6px">${unrenderable
          .map((entry) => `<div><code>${esc(entry.id)}</code> — ${esc(entry.error)}</div>`)
          .join("")}</div>
      </div>`
    : "";

  const runView = paged(statuses, Number(query.get("page") ?? 1), 48);

  const cards = runView.slice
    .map(
      (s) => `<a href="/scenarios/${esc(s.jobId)}" style="text-decoration:none;color:inherit"><div class="card">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <h3 style="margin:0;display:flex;align-items:center;gap:7px">${KIND_ICON[s.kind.kind] ?? ""}${esc(s.jobId)}</h3>${stageBadge(s)}
      </div>
      <div class="k" style="margin-top:4px"><span class="chip">${esc(s.kind.label)}</span> driver ${esc(s.job.driver)} · $${s.spendUsd.toFixed(2)} spent</div>
      <div style="margin-top:10px">${progressBar(s, s.job.items.length)}</div>
      <div class="k" style="margin-top:5px">${s.done}/${s.job.items.length} done${s.failed ? ` · <span style="color:var(--bad)">${s.failed} failed</span>` : ""} · ${esc(reviewStatusLabel(s))}</div>
    </div></a>`,
    )
    .join("");

  const tile = (icon, value, label, style = "") =>
    `<div class="tile"><div class="stat-icon">${icon}</div><div class="v" style="${style}">${value}</div><div class="l">${label}</div></div>`;

  return shell(
    "Runs",
    `<div class="pagehead"><h1>Generation runs</h1>
      <form method="get" action="/scenarios/new" style="margin-left:auto"><button type="submit">${icons.play}New run</button></form></div>
<p class="k">Every batch the generation harness has written, of any kind, wherever it sits in the loop: generating, reviewable, shipped.</p>
${quicklinks}
<div class="tiles">
  ${tile(icons.layers, totals.jobs, "runs")}
  ${tile(icons.clock, totals.open, "items open")}
  ${tile(icons.alert, totals.failed, "items failed", totals.failed ? "color:var(--bad)" : "")}
  ${tile(icons.flag, totals.awaiting, "awaiting decision", totals.awaiting ? "color:var(--warn)" : "")}
  ${tile(icons.ship, totals.shipped, "items shipped", "color:var(--good)")}
  ${tile(icons.dollar, `$${totals.spend.toFixed(2)}`, "total spend")}
</div>
${unrenderableNote}
${needsDecisionStrip}
<div style="margin-bottom:10px">${filterRows}</div>
<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">${cards || `<p class="k">No runs in this view.</p>`}</div>
${pager(withFilters({}), runView)}`,
    { active: "/scenarios" },
  );
}

/** One journaled item in the review queue, rendered from its kind's summary rather than from a scenario's shape. */
function itemSummaryCard(jobId, kind, def, decision, review) {
  const summary = kind.summarize(def);
  const href = kind.readerHref(jobId, def.id);
  const excerpt = summary.excerpt
    ? `<p class="k" style="margin:8px 0 0;font-family:var(--serif);font-size:13.5px;line-height:1.6">${esc(summary.excerpt.slice(0, 240))}${summary.excerpt.length > 240 ? "…" : ""}</p>`
    : "";
  // The checkbox belongs to the bulk-decide form declared once above the card
  // list, referenced by id rather than nested — a form cannot contain a form,
  // and this card already owns the per-item one below.
  const bulkCheckbox = review
    ? `<input type="checkbox" name="itemIds" value="${esc(decision[kind.idKey])}" form="bulk-decide-form" class="bulk-check" style="margin:2px 10px 0 0">`
    : "";
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;flex-wrap:wrap">
      <h3 style="margin:0;display:flex;align-items:baseline">${bulkCheckbox}<a href="${href}" style="color:inherit;text-decoration:none">${summary.title}</a></h3>
      <div style="display:flex;gap:6px">${summary.badge}${decisionBadge(review ? decision : undefined)}</div>
    </div>
    ${summary.meta.map((line) => `<div class="k">${line}</div>`).join("")}
    ${excerpt}
    <div style="margin-top:8px;display:flex;gap:14px;align-items:center">
      <a href="${href}" style="display:inline-flex;align-items:center;gap:5px">${icons.chevron}Read</a>
      ${kind.editable ? `<a class="k" href="${href}/edit" style="display:inline-flex;align-items:center;gap:5px">${icons.edit}edit / delete</a>` : ""}
    </div>
    ${review ? decisionForm(jobId, kind, decision) : ""}
  </div>`;
}

/** The auto-refresh half of "see the full progress": poll status.json while items are open and repaint counts in place. */
function progressPoller(jobId) {
  return `<script>
  (() => {
    const bars = [document.getElementById("live-progress"), document.getElementById("live-progress-sticky")].filter(Boolean);
    if (!bars.length) return;
    let stale = 0;
    const tick = async () => {
      try {
        const s = await (await fetch("/scenarios/${encodeURIComponent(jobId)}/status.json")).json();
        const w = (n) => (s.total ? (n / s.total) * 100 : 0) + "%";
        for (const bar of bars) {
          bar.querySelector(".done").style.width = w(s.done);
          bar.querySelector(".failed").style.width = w(s.failed);
        }
        const counts = s.done + "/" + s.total + " done · " + s.failed + " failed · " + s.open + " open";
        document.getElementById("live-counts").textContent = counts;
        if (document.getElementById("live-counts-sticky")) document.getElementById("live-counts-sticky").textContent = counts;
        if (s.open === 0 && stale++ > 1) return;
      } catch {}
      setTimeout(tick, 4000);
    };
    setTimeout(tick, 4000);
  })();
  </script>`;
}

const ITEM_STATUS_ICON = { done: icons.check, failed: icons.x, open: icons.clock };

const PER_PAGE = 25;

export async function scenarioDetailPage(jobId, query = new URLSearchParams()) {
  const status = await jobStatus(jobId);
  if (!status) return shell("Runs", `<p>No job <code>${esc(jobId)}</code>.</p>`, { active: "/scenarios" });
  const { job, kind, paths, review, shipped } = status;

  const done = kind.reviewable ? await doneItems(kind.review, paths) : new Map();
  const defects = review ? recordDefects(kind.idKey, review, new Set(done.keys())) : [];
  const decisionsById = new Map((review?.decisions ?? []).map((decision) => [decision[kind.idKey], decision]));

  // Failures first: on a run of thousands, the open and failed items are the
  // only rows anyone opens this page to find.
  const rank = { failed: 0, open: 1, done: 2 };
  const sortedItems = [...status.items].sort((a, b) => rank[a.status] - rank[b.status]);
  const itemView = paged(sortedItems, Number(query.get("page") ?? 1), PER_PAGE);
  const itemRows = itemView.slice
    .map(
      (item) => `<tr><td><code>${esc(item.id)}</code></td>
      <td><span class="badge ${item.status}">${ITEM_STATUS_ICON[item.status]}${item.status}</span></td>
      <td class="k">${item.timestamp ? esc(item.timestamp.replace("T", " ").slice(0, 19)) : "—"}</td>
      <td class="k" style="max-width:480px">${item.error ? esc(item.error) : ""}</td></tr>`,
    )
    .join("");

  // The review queue is what a human is here for, so it leads with what they
  // owe an answer on and hides the clean remainder behind a filter.
  const tierOf = (id) => decisionsById.get(id)?.tier ?? (review ? "clean" : undefined);
  const filter = query.get("tier") ?? (review ? "owed" : "all");
  const entries = [...done.entries()].filter(([id]) => {
    if (filter === "all") return true;
    const tier = tierOf(id);
    return filter === "owed" ? tier !== "clean" : tier === filter;
  });
  const scenarioView = paged(entries, Number(query.get("spage") ?? 1), PER_PAGE);
  const scenarioCards = scenarioView.slice
    .map(([id, { def }]) => {
      const decision = decisionsById.get(id) ?? { [kind.idKey]: id, decision: "pending", note: "", tier: "clean", flags: [] };
      return itemSummaryCard(jobId, kind, def, decision, review);
    })
    .join("");

  const filters = ["owed", "flagged", "sampled", "clean", "all"]
    .map(
      (name) =>
        `<a href="/scenarios/${esc(jobId)}?tier=${name}" class="chip" style="${filter === name ? "border-color:var(--accent);color:var(--fg)" : ""}">${TIER_ICON[name] ?? ""}${name}</a>`,
    )
    .join("");

  const reviewerForm = review
    ? `<form method="post" action="/scenarios/${esc(jobId)}/reviewer" style="margin-top:12px">
        <div class="k">reviewer</div>
        <input name="reviewer" value="${esc(review.reviewer)}" placeholder="who is judging this batch">
        <label class="k" style="margin-left:12px"><input type="checkbox" name="reviewerIsAuthor" ${review.reviewerIsAuthor ? "checked" : ""}> reviewer authored this batch (ships provisional)</label>
        <button type="submit" style="margin-left:12px">Save</button>
      </form>`
    : "";

  const actions = `<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
    ${status.open + status.failed > 0 ? `<form method="post" action="/scenarios/${esc(jobId)}/materialize"><button type="submit" class="quiet">${icons.play}Materialize briefs / check outputs (${status.open + status.failed} outstanding)</button></form>` : ""}
    ${kind.reviewable && !review ? `<form method="post" action="/scenarios/${esc(jobId)}/scaffold"><button type="submit" class="quiet">${icons.flag}Scaffold review</button></form>` : ""}
    ${review ? `<form method="post" action="/scenarios/${esc(jobId)}/finish"><button type="submit" ${defects.length ? 'class="danger" title="will be refused — see defects below"' : ""}>${defects.length ? icons.alert : icons.ship}Finish review → ship</button></form>` : ""}
  </div>`;

  const readiness = !kind.reviewable
    ? `<p class="k">This console models no review pass for ${esc(kind.plural)} — the publish gate in <code>studio-cli</code> is what an image batch is held to, and it runs at generation time. What is on this page is the run itself: what the journal accepted, what failed, and what it cost.</p>`
    : !review
    ? `<p class="k">No review yet — scaffold one to start judging what's journaled done.</p>`
    : defects.length === 0
      ? `<p class="k" style="color:var(--good)">Every decision made and noted. Ready to finish.</p>`
      : `<div class="card" style="border-color:var(--bad)"><h3>Not finishable yet — ${defects.length} defect(s)</h3>${defects.map((defect) => `<div class="defect">${esc(defect)}</div>`).join("")}</div>`;

  const shippedPanel = shipped
    ? `<div class="card" style="border-color:var(--good);margin-top:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">
          <h3 style="display:flex;align-items:center;gap:7px;margin:0">${icons.ship}Shipped${shipped.provisional ? " · PROVISIONAL" : ""}</h3>
          <a href="/library" class="k">${icons.package}Open in Library ▸</a>
        </div>
        <div class="k" style="margin-top:6px">reviewer: ${esc(shipped.reviewer)}</div>
        <div class="k" style="margin-top:4px">${(shipped[kind.manifestKey] ?? []).map((s) => `<code>${esc(s.id)}</code>`).join(" · ")}</div>
      </div>`
    : "";

  return shell(
    `Run · ${jobId}`,
    `<div class="crumb"><a href="/scenarios">Runs</a> / ${esc(jobId)}</div>
<div class="pagehead"><h1 style="display:flex;align-items:center;gap:9px">${KIND_ICON[kind.kind] ?? ""}${esc(jobId)}</h1>${stageBadge(status)}
  <a class="k" href="/scenarios/${esc(jobId)}/edit" style="margin-left:auto;display:inline-flex;align-items:center;gap:5px">${icons.edit}edit / delete job</a></div>
<div class="k"><span class="chip">${esc(kind.label)}</span> driver ${esc(job.driver)} · ${job.items.length} item(s) · $${status.spendUsd.toFixed(2)} spent</div>

<div style="margin-top:14px;max-width:640px">
  <div class="progress" id="live-progress" style="height:9px">
    <span class="done" style="width:${(status.done / job.items.length) * 100}%"></span>
    <span class="failed" style="width:${(status.failed / job.items.length) * 100}%"></span>
  </div>
  <div class="k" style="margin-top:5px" id="live-counts">${status.done}/${job.items.length} done · ${status.failed} failed · ${status.open} open</div>
</div>
${progressPoller(jobId)}

<h2>Items</h2>
<div class="stickybar">
  <div class="progress" id="live-progress-sticky"><span class="done" style="width:${(status.done / job.items.length) * 100}%"></span><span class="failed" style="width:${(status.failed / job.items.length) * 100}%"></span></div>
  <span class="k" id="live-counts-sticky">${status.done}/${job.items.length} done · ${status.failed} failed · ${status.open} open</span>
</div>
<p class="k">Failed and open first — on a long run they are the only rows worth finding.</p>
<div class="wrap"><table><tr><th>Item</th><th>Status</th><th>Last journaled</th><th>Failure reason</th></tr>${itemRows}</table></div>
${pager(`/scenarios/${encodeURIComponent(jobId)}`, itemView)}

<h2>${kind.reviewable ? "Review" : "Run"}</h2>
${actions}
${reviewerForm}
<div style="margin-top:10px">${readiness}</div>
${shippedPanel}

${
      kind.reviewable
        ? `<h2>${done.size} journaled ${esc(kind.plural)}</h2>
${review ? `<div style="margin-bottom:8px">${filters}</div>` : ""}
${review ? bulkDecideBar(jobId) : ""}
<div class="grid" style="grid-template-columns:1fr">${scenarioCards || `<p class="k">Nothing in this view.</p>`}</div>
${pager(`/scenarios/${encodeURIComponent(jobId)}?tier=${encodeURIComponent(filter)}`, scenarioView, "spage")}`
        : ""
    }`,
    { active: "/scenarios" },
  );
}

/**
 * The one write path into review.json this server exposes. Everything that
 * decides whether a batch actually ships — the gate re-check, the completeness
 * rules — happens in `scaffoldReview`/`finishReview` from studio-cli, not
 * here: this function only ever mutates the record a human is allowed to
 * write to directly (a decision, a note, who the reviewer is).
 */
export async function handleScenarioAction(jobId, action, body) {
  const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, jobId);
  const job = await loadJob(jobId);
  if (!job) throw new Error(`no job "${jobId}"`);
  const kind = kindFor(job);

  if (action === "materialize") {
    await cmdRun(jobId);
    return;
  }
  if (action === "scaffold") {
    await scaffoldReview(kind.review, jobId, paths);
    return;
  }
  if (action === "finish") {
    await finishReview(kind.review, jobId, paths);
    return;
  }

  const reviewPath = path.join(paths.reviewDir, "review.json");
  const record = kind.ReviewFile.parse(JSON.parse(await readFile(reviewPath, "utf8")));

  if (action === "decide") {
    const itemId = body.get("itemId") ?? "";
    const target = record.decisions.find((decision) => decision[kind.idKey] === itemId);
    if (!target) throw new Error(`no such ${kind.noun} in this review: ${itemId}`);
    target.decision = body.get("decision") ?? "pending";
    target.note = body.get("note") ?? "";
  } else if (action === "decide-bulk") {
    const itemIds = new Set(body.getAll("itemIds"));
    if (itemIds.size === 0) throw new Error("no items selected — check at least one before applying a bulk decision");
    const decision = body.get("decision") ?? "pending";
    const note = body.get("note") ?? "";
    let matched = 0;
    for (const target of record.decisions) {
      if (!itemIds.has(target[kind.idKey])) continue;
      target.decision = decision;
      target.note = note;
      matched += 1;
    }
    if (matched === 0) throw new Error("none of the selected items are in this review");
  } else if (action === "reviewer") {
    record.reviewer = body.get("reviewer") ?? "";
    record.reviewerIsAuthor = body.get("reviewerIsAuthor") === "on";
  } else {
    throw new Error(`unknown scenario action "${action}"`);
  }

  kind.ReviewFile.parse(record);
  await writeFile(reviewPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

/**
 * Every run, reduced to what an overview says about it.
 *
 * Returned rather than rendered so the command center can rank, total and
 * alert on runs without importing the runs index's markup, and so a run this
 * console cannot describe becomes a named row instead of a thrown page.
 */
export async function runSummaries() {
  const ids = await listJobIds();
  return Promise.all(
    ids.map(async (jobId) => {
      try {
        const status = await cachedJobStatus(jobId);
        return {
          jobId,
          kind: status.kind.label,
          driver: status.job.driver,
          stage: status.stage,
          total: status.job.items.length,
          done: status.done,
          failed: status.failed,
          open: status.open,
          pendingDecisions: status.pendingDecisions,
          shippedCount: status.shippedCount,
          spendUsd: status.spendUsd,
          provisional: Boolean(status.shipped?.provisional),
        };
      } catch (cause) {
        return { jobId, error: cause instanceof Error ? cause.message : String(cause) };
      }
    }),
  );
}

/**
 * Every journaled-but-unshipped scenario, reduced to explorer rows.
 *
 * The explorer's whole claim is that it shows every scenario that exists, and
 * a draft is the one an operator is most likely to be hunting for. Job loading
 * and per-kind parsing stay here, where the review protocol already lives, so
 * the index never grows a second opinion about what a job contains.
 */
export async function draftScenarioRows() {
  const rows = [];
  for (const jobId of await listJobIds()) {
    let status;
    try {
      status = await cachedJobStatus(jobId);
    } catch {
      // A job of a kind this console cannot describe is reported on the runs
      // index; it must not take the scenario explorer down with it.
      continue;
    }
    if (!status || status.kind.kind !== "scenario-batch" || status.shipped) continue;
    const done = await doneItems(status.kind.review, status.paths);
    for (const [, { def }] of done) rows.push(rowOf(def, "draft", jobId));
  }
  return rows;
}

/** The reader route's data need: one journaled-done item by id, with the kind that says how to render it. */
export async function findJobItem(jobId, itemId) {
  const job = await loadJob(jobId);
  if (!job) return undefined;
  const kind = kindFor(job);
  const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, jobId);
  const def = (await doneItems(kind.review, paths)).get(itemId)?.def;
  return def ? { def, kind } : undefined;
}
