import { existsSync } from "node:fs";
import path from "node:path";
import { ScenarioClass } from "@admin/content";
import { cmdJob, cmdRun } from "@admin/studio-cli/dist/cli.js";
import { esc, num, shell } from "./view.mjs";
import { scenarioIndex, tally } from "./scenario-index.mjs";
import { draftScenarioRows } from "./scenarios-view.mjs";

// Job creation and brief materialization, as a form: the same two steps
// `studio scenarios job` and `studio scenarios run` are from a terminal.
// Both calls go straight into the CLI's own exported functions rather than
// reimplementing job-file writing or brief materialization here — one
// generation-loop implementation, two front ends onto it.
//
// The form is a grid over the real vocabularies, seeded from the corpus's own
// thinnest classes, the same coverage figure the explorer and the command
// center show. A bare textarea taking `class:cast:count[:steer]` lines would
// make composing a run mean knowing a syntax, remembering eighteen class names
// and four cast names, and having no idea whether the run being launched aimed
// at the classes that actually needed content.
//
// The driver is fixed to "session": the CLI's `openrouter` path spends real
// money and gates on typing the job id back in a terminal, a friction this
// form has no honest way to reproduce. A form that fired an unattended, billed
// generation run on one click would be the wrong shape for that decision, so
// the CLI is where that path stays.

const JOBS_DIR = path.join("content", "jobs");

const CASTS = [
  ["none", "none — trouble at home, no foreign counterpart"],
  ["tensest", "tensest — whoever is closest to the edge"],
  ["closest", "closest — the firmest friend"],
  ["band", "band — any nation matching a shape"],
  ["warCounterpart", "warCounterpart — whoever the player is actually fighting"],
  ["belligerent", "belligerent — a principal of a war the player is not in"],
];

const ROWS = 8;

/** The classes with the least playable content, which is what a new run should usually aim at. */
async function thinnestClasses(limit) {
  const rows = (await scenarioIndex(await draftScenarioRows())).filter((row) => row.source !== "draft");
  const counts = new Map(tally(rows, (row) => row.class));
  return ScenarioClass.options
    .map((name) => ({ name, count: counts.get(name) ?? 0 }))
    .sort((a, b) => a.count - b.count)
    .slice(0, limit);
}

function classOptions(selected) {
  return ScenarioClass.options
    .map((name) => `<option value="${esc(name)}" ${name === selected ? "selected" : ""}>${esc(name)}</option>`)
    .join("");
}

function castOptions(selected) {
  return CASTS.map(
    ([value, label]) => `<option value="${esc(value)}" ${value === selected ? "selected" : ""}>${esc(label)}</option>`,
  ).join("");
}

/** One cell of the run: a class, who it is with, how many, and an optional steer. */
function cellRow(index, prefill) {
  return `<tr>
    <td><select name="class${index}"><option value="">—</option>${classOptions(prefill?.class)}</select></td>
    <td><select name="cast${index}">${castOptions(prefill?.cast ?? "none")}</select></td>
    <td><input class="count" name="count${index}" type="number" min="0" max="200" value="${prefill?.count ?? ""}" style="width:80px"></td>
    <td><input name="steer${index}" value="${esc(prefill?.steer ?? "")}" placeholder="optional — what this cell should be about" style="width:100%"></td>
    <td class="k">${prefill ? `${num(prefill.have)} live today` : ""}</td>
  </tr>`;
}

// The count in the header is arithmetic over fields the operator just typed,
// so it is done in the page rather than by a round trip. Nothing else here is
// client-side: the job is written by the CLI on submit, as always.
const TOTALLER = `<script>
(() => {
  const form = document.getElementById("composer");
  if (!form) return;
  const paint = () => {
    const total = [...form.querySelectorAll("input.count")].reduce((sum, field) => sum + (Number(field.value) || 0), 0);
    const cells = [...form.querySelectorAll("input.count")].filter((field) => Number(field.value) > 0).length;
    document.getElementById("total-items").textContent = total;
    document.getElementById("total-cells").textContent = cells;
  };
  form.addEventListener("input", paint);
  paint();
})();
</script>`;

function composerForm(error, previous, prefill) {
  const rows = Array.from({ length: ROWS }, (_, index) => cellRow(index, prefill[index])).join("");
  return `<div class="pagehead"><h1>New generation run</h1></div>
<p class="lede">A run is a grid of cells: a class of month, who it is with, and how many to write. The rows below are seeded with the classes a player currently has the least of — change any of them, or clear a count to drop the cell.</p>
${error ? `<div class="card bad"><h3>Could not create the run</h3><div class="defect">${esc(error)}</div></div>` : ""}

<form method="post" action="/scenarios/new" id="composer">
  <div class="card" style="margin-bottom:12px">
    <div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap">
      <div><div class="k">run id</div>
        <input name="id" value="${esc(previous?.id ?? "")}" placeholder="e.g. spine-econ-02" required style="width:260px"></div>
      <div style="margin-left:auto;text-align:right">
        <div class="k">this run will write</div>
        <div style="font-size:20px;font-weight:650"><span id="total-items">0</span> scenario(s) across <span id="total-cells">0</span> cell(s)</div>
      </div>
    </div>
  </div>

  <div class="wrap"><table class="dense">
    <thead><tr><th>Class</th><th>Cast</th><th class="num">Count</th><th>Steer</th><th>Coverage</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>

  <div class="card" style="margin-top:14px">
    <h3>Driver · session</h3>
    <p class="k" style="margin:0">An agentic session (this one or another) writes the outputs by hand against the same gate as any other batch. Creating the run also materializes its briefs, so it is ready to write against immediately. For an unattended, billed OpenRouter run use <code>studio scenarios job … --driver openrouter</code> from a terminal; that path's spend confirmation has no honest form equivalent.</p>
    <div style="margin-top:12px"><button type="submit">Create run and materialize briefs</button>
      <a class="chip" href="/scenarios" style="margin-left:10px">cancel</a></div>
  </div>
</form>
${TOTALLER}`;
}

export async function newJobPage(query) {
  const thin = await thinnestClasses(ROWS);
  const prefill = thin.map((entry) => ({ class: entry.name, cast: "none", count: "", steer: "", have: entry.count }));
  const previous = query.get("id") ? { id: query.get("id") } : undefined;
  return shell(
    "New run",
    composerForm(query.get("error") ?? undefined, previous, prefill),
    { active: "/scenarios", crumb: `<a href="/scenarios">Runs</a> / new` },
  );
}

/**
 * Read the grid back into the `class:cast:count[:steer]` cells the CLI takes.
 *
 * A row with no class or a count of zero is simply not a cell — the grid is
 * eight rows because that is a comfortable size to compose in, not because a
 * run has eight cells.
 */
function cellsFrom(body) {
  const cells = [];
  for (let index = 0; index < ROWS; index++) {
    const klass = (body.get(`class${index}`) ?? "").trim();
    const count = Number(body.get(`count${index}`) ?? 0);
    if (!klass || !Number.isFinite(count) || count <= 0) continue;
    const cast = (body.get(`cast${index}`) ?? "none").trim();
    const steer = (body.get(`steer${index}`) ?? "").trim();
    // The CLI splits on ":", so a steer carrying one would silently become a
    // fifth field and change what the cell means.
    cells.push([klass, cast, String(Math.trunc(count)), ...(steer ? [steer.replace(/:/g, " —")] : [])].join(":"));
  }
  return cells;
}

/** Create the job file, then materialize its briefs immediately — the two steps a session needs before it can start writing. */
export async function createJob(body) {
  const id = (body.get("id") ?? "").trim();
  const cells = cellsFrom(body);

  if (!id) return { ok: false, error: "a run id is required", id };
  if (existsSync(path.join(JOBS_DIR, `${id}.json`))) return { ok: false, error: `a run named "${id}" already exists`, id };
  if (cells.length === 0) return { ok: false, error: "at least one cell needs a class and a count above zero", id };

  try {
    await cmdJob(id, cells, "session");
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), id };
  }

  // Briefs materialize immediately: an empty work directory has nothing a
  // session can start writing against, and the CLI's own two-step (job, then
  // run) exists for iteration, not because the first run needs a human
  // between the steps.
  await cmdRun(id);
  return { ok: true, id };
}
