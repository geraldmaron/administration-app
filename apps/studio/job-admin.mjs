import { readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { ScenarioDef } from "@admin/content";
import { JobFile } from "@admin/studio-cli/dist/jobs/job-file.js";
import { doneScenarios, ReviewFile, reviewPathsFor } from "@admin/studio-cli/dist/scenarios/review.js";
import { esc, shell } from "./view.mjs";

// The update/delete half of the console's CRUD surface. Reads and creates
// live in scenarios-view.mjs and job-launch-view.mjs; this module owns the
// two operations that can destroy or rewrite authored state, which is why
// every write here re-validates through the same zod schemas the CLI trusts
// (JobFile, ScenarioDef, ReviewFile) before a byte lands on disk, and why
// deletion demands the job id typed back rather than a bare button press.

const JOBS_DIR = path.join("content", "jobs");
const REVIEWS_DIR = path.join("content", "reviews");

const jobPath = (jobId) => path.join(JOBS_DIR, `${jobId}.json`);

async function loadJob(jobId) {
  if (!existsSync(jobPath(jobId))) return undefined;
  return JobFile.parse(JSON.parse(await readFile(jobPath(jobId), "utf8")));
}

export async function editJobPage(jobId, error) {
  const job = await loadJob(jobId);
  if (!job) return shell("Edit job", `<p>No job <code>${esc(jobId)}</code>.</p>`);
  return shell(
    `Edit · ${jobId}`,
    `<h2>Edit job <code>${esc(jobId)}</code></h2>
<p class="k">The whole job file, validated as <code>JobFile</code> on save. The id cannot change — rename by creating a new job. Items already journaled done keep their outputs; removing such an item orphans its output file rather than deleting it.</p>
${error ? `<div class="card" style="border-color:var(--bad)"><h3>Not saved</h3><div class="defect">${esc(error)}</div></div>` : ""}
<form method="post" action="/scenarios/${esc(jobId)}/update" class="card" style="max-width:760px">
  <textarea name="job" rows="24" style="width:100%;font-family:monospace">${esc(JSON.stringify(job, null, 2))}</textarea>
  <div style="margin-top:10px;display:flex;gap:10px">
    <button type="submit">Save job</button>
    <a href="/scenarios/${esc(jobId)}"><button type="button">Cancel</button></a>
  </div>
</form>
<form method="post" action="/scenarios/${esc(jobId)}/delete" class="card" style="max-width:760px;margin-top:14px;border-color:var(--bad)">
  <h3>Delete this job</h3>
  <p class="k">Removes the job file, its progress journal, its work directory (briefs and outputs), and its review record. Nothing shipped is touched. Type the job id to confirm.</p>
  <input name="confirm" placeholder="${esc(jobId)}" style="width:280px">
  <button type="submit" class="danger" style="margin-left:10px">Delete job</button>
</form>`,
  );
}

export async function updateJob(jobId, body) {
  let parsed;
  try {
    parsed = JobFile.parse(JSON.parse(body.get("job") ?? ""));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (parsed.id !== jobId) return { ok: false, error: `job id must stay "${jobId}" — got "${parsed.id}"` };
  await writeFile(jobPath(jobId), `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  return { ok: true };
}

export async function deleteJob(jobId, body) {
  if ((body.get("confirm") ?? "").trim() !== jobId) {
    return { ok: false, error: "type the job id exactly to confirm deletion" };
  }
  const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, jobId);
  await rm(jobPath(jobId), { force: true });
  await rm(paths.progressPath, { force: true });
  await rm(paths.workDir, { recursive: true, force: true });
  await rm(paths.reviewDir, { recursive: true, force: true });
  return { ok: true };
}

async function locateScenario(jobId, scenarioId) {
  const paths = reviewPathsFor(JOBS_DIR, REVIEWS_DIR, jobId);
  const found = (await doneScenarios(paths)).get(scenarioId);
  return found ? { paths, ...found } : undefined;
}

export async function editScenarioPage(jobId, scenarioId, error) {
  const located = await locateScenario(jobId, scenarioId);
  if (!located) return shell("Edit scenario", `<p>No journaled-done scenario <code>${esc(scenarioId)}</code> in job <code>${esc(jobId)}</code>.</p>`);
  return shell(
    `Edit · ${scenarioId}`,
    `<h2>Edit scenario <code>${esc(scenarioId)}</code></h2>
<p class="k">Lives in <code>${esc(located.sourcePath)}</code>. Validated as <code>ScenarioDef</code> on save; the id cannot change. Editing after approval is visible: finish re-clears every approved scenario's current content through the gate.</p>
${error ? `<div class="card" style="border-color:var(--bad)"><h3>Not saved</h3><div class="defect">${esc(error)}</div></div>` : ""}
<form method="post" action="/scenarios/${esc(jobId)}/scenario/${esc(scenarioId)}/update" class="card" style="max-width:760px">
  <textarea name="scenario" rows="28" style="width:100%;font-family:monospace">${esc(JSON.stringify(located.def, null, 2))}</textarea>
  <div style="margin-top:10px;display:flex;gap:10px">
    <button type="submit">Save scenario</button>
    <a href="/scenarios/${esc(jobId)}"><button type="button">Cancel</button></a>
  </div>
</form>
<form method="post" action="/scenarios/${esc(jobId)}/scenario/${esc(scenarioId)}/delete" class="card" style="max-width:760px;margin-top:14px;border-color:var(--bad)">
  <h3>Delete this scenario</h3>
  <p class="k">Removes it from its output file and drops its review decision, if any. Type the scenario id to confirm.</p>
  <input name="confirm" placeholder="${esc(scenarioId)}" style="width:340px">
  <button type="submit" class="danger" style="margin-left:10px">Delete scenario</button>
</form>`,
  );
}

async function rewriteSource(sourcePath, defs) {
  await writeFile(sourcePath, `${JSON.stringify(defs, null, 2)}\n`, "utf8");
}

export async function updateScenario(jobId, scenarioId, body) {
  const located = await locateScenario(jobId, scenarioId);
  if (!located) return { ok: false, error: `no journaled-done scenario "${scenarioId}"` };
  let next;
  try {
    next = ScenarioDef.parse(JSON.parse(body.get("scenario") ?? ""));
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
  if (next.id !== scenarioId) return { ok: false, error: `scenario id must stay "${scenarioId}" — got "${next.id}"` };
  const defs = z.array(ScenarioDef).parse(JSON.parse(await readFile(located.sourcePath, "utf8")));
  await rewriteSource(located.sourcePath, defs.map((def) => (def.id === scenarioId ? next : def)));
  return { ok: true };
}

export async function deleteScenario(jobId, scenarioId, body) {
  if ((body.get("confirm") ?? "").trim() !== scenarioId) {
    return { ok: false, error: "type the scenario id exactly to confirm deletion" };
  }
  const located = await locateScenario(jobId, scenarioId);
  if (!located) return { ok: false, error: `no journaled-done scenario "${scenarioId}"` };
  const defs = z.array(ScenarioDef).parse(JSON.parse(await readFile(located.sourcePath, "utf8")));
  await rewriteSource(located.sourcePath, defs.filter((def) => def.id !== scenarioId));

  // A review must never hold a decision for a scenario absent from disk, and
  // ReviewFile requires at least one decision — so a record this deletion
  // would empty is removed outright.
  const reviewPath = path.join(located.paths.reviewDir, "review.json");
  if (existsSync(reviewPath)) {
    const record = ReviewFile.parse(JSON.parse(await readFile(reviewPath, "utf8")));
    const remaining = record.decisions.filter((decision) => decision.scenarioId !== scenarioId);
    if (remaining.length === 0) {
      await rm(reviewPath, { force: true });
    } else if (remaining.length !== record.decisions.length) {
      await writeFile(reviewPath, `${JSON.stringify({ ...record, decisions: remaining }, null, 2)}\n`, "utf8");
    }
  }
  return { ok: true };
}
