import { CONSEQUENCE_REVIEW } from "@admin/studio-cli/dist/consequences/review.js";
import { reviewSchemas } from "@admin/studio-cli/dist/jobs/review-core.js";
import { SCENARIO_REVIEW } from "@admin/studio-cli/dist/scenarios/review.js";
import { REVISION_KINDS } from "@admin/studio-cli/dist/scenarios/upgrade.js";
import { esc } from "./view.mjs";
import { formatCondition } from "./scenario-view.mjs";
import { consequenceSummary } from "./consequence-view.mjs";

// What a job produces decides how its output parses, how its review record is
// keyed, and what a reviewer is shown. A job file already carries that answer
// in `kind`; before this registry existed the console ignored it and parsed
// every output as a ScenarioDef, so opening a consequence batch raised a
// ZodError instead of a page. studio-cli already models the difference as a
// ReviewKind and every generic half of the review protocol takes one, so the
// console's job is to pick the right descriptor and stay kind-agnostic
// everywhere else — a third kind should join by adding an entry here.

const SCENARIO_KIND = {
  kind: "scenario-batch",
  label: "Scenarios",
  noun: "scenario",
  plural: "scenarios",
  review: SCENARIO_REVIEW,
  idKey: "scenarioId",
  manifestKey: "scenarios",
  reviewable: true,
  ReviewFile: reviewSchemas("scenarioId").File,
  editable: true,
  readerHref: (jobId, id) => `/scenarios/${encodeURIComponent(jobId)}/scenario/${encodeURIComponent(id)}`,
  summarize: (def) => ({
    title: esc(def.subject),
    badge: "",
    meta: [
      `<code>${esc(def.id)}</code> · ${esc(def.class)} · cast ${esc(def.cast.pick)} · weight ${def.weight}${def.once ? " · once" : ""} · ${def.opening.length} beats / ${def.replies.length} replies`,
      `conditions: ${def.conditions.length ? def.conditions.map(formatCondition).map(esc).join(" · ") : "always live"}`,
    ],
    excerpt: def.opening[0]?.text ?? "",
  }),
};

const CONSEQUENCE_KIND = {
  kind: "consequence-batch",
  label: "Consequences",
  noun: "consequence card",
  plural: "consequence cards",
  review: CONSEQUENCE_REVIEW,
  idKey: "consequenceId",
  manifestKey: "consequences",
  reviewable: true,
  ReviewFile: reviewSchemas("consequenceId").File,
  // No source editor exists for a card yet, so the console offers no edit
  // link rather than one that lands on a page built to parse a scenario.
  editable: false,
  readerHref: (jobId, id) => `/scenarios/${encodeURIComponent(jobId)}/card/${encodeURIComponent(id)}`,
  summarize: consequenceSummary,
};

// The two image kinds the harness actually runs. They are not reviewable
// *here*: studio-cli models review for the two prose kinds only, and a console
// that scaffolded a review record no CLI command could finish would be worse
// than one that admits the gap. What they are is manageable — a portrait batch
// still has items, failures, a journal and a bill, and until this descriptor
// existed eleven of fifteen runs on this machine rendered as a stack trace
// instead of a page.
const imageKind = (kind, label, noun) => ({
  kind,
  label,
  noun,
  plural: `${noun}s`,
  reviewable: false,
  editable: false,
  // Review-shaped fields deliberately absent: nothing may read them without
  // first checking `reviewable`, and an empty stub would let that check be
  // forgotten silently.
  readerHref: () => undefined,
  summarize: () => ({ title: "", badge: "", meta: [], excerpt: "" }),
});

// Portrait batches are retired: faces are drawn from each person's record
// rather than generated. The descriptor stays because job files are local and
// untracked, and a machine that ran portrait batches still has them; without
// it the console would refuse to list a history nothing can rerun.
const PORTRAIT_KIND = imageKind("portrait-batch", "Portraits (retired)", "portrait");
const SCENE_KIND = imageKind("scene-batch", "Dispatch scenes", "scene");

// A revision rewrites shipped scenarios in place, one body per item, and is
// reviewed through the same scenario review; it reads like a scenario batch.
// Its source is the shipped scenario, so the console offers no editor for it.
const REVISION_KIND_DESCRIPTORS = [...REVISION_KINDS].map((kind) => ({
  ...SCENARIO_KIND,
  kind,
  label: `Revisions (${kind.replace(/^scenario-/, "")})`,
  editable: false,
}));

const BY_KIND = new Map([
  [SCENARIO_KIND.kind, SCENARIO_KIND],
  ...REVISION_KIND_DESCRIPTORS.map((descriptor) => [descriptor.kind, descriptor]),
  [CONSEQUENCE_KIND.kind, CONSEQUENCE_KIND],
  [PORTRAIT_KIND.kind, PORTRAIT_KIND],
  [SCENE_KIND.kind, SCENE_KIND],
]);

export const JOB_KINDS = [...BY_KIND.values()];

/**
 * The descriptor for a job's kind. An unregistered kind is an authoring
 * mistake worth seeing rather than one to guess past: a job that cannot be
 * parsed has no safe default, and defaulting to scenarios is precisely the
 * bug this registry replaces.
 */
export function kindFor(job) {
  const descriptor = BY_KIND.get(job.kind);
  if (!descriptor) {
    throw new Error(
      `job "${job.id}" has kind "${job.kind}", which the console has no descriptor for — known kinds: ${[...BY_KIND.keys()].join(", ")}`,
    );
  }
  return descriptor;
}
