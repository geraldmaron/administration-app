#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { z } from "zod";
import {
  auditScenarios,
  ConsequenceDef,
  ConsequenceInstrument,
  ConsequenceRungBand,
  ConsequenceValence,
  formatDeeds,
  mergeDeeds,
  ScenarioClass,
  ScenarioDef,
  ScenarioSeverity,
  ScenarioTopicTag,
  type ScenarioFinding,
} from "@admin/content";
import { SessionDriver } from "./jobs/drivers/session-driver.js";
import { jobHarnessCorpus } from "./jobs/repair-session-context.js";
import { MockDriver } from "./jobs/drivers/mock-driver.js";
import { OpenRouterDriver, estimateItemWorstCaseUsd, type OpenRouterFetch } from "./jobs/drivers/openrouter-driver.js";
import { ImageDriver, type ImageFetch } from "./jobs/drivers/image-driver.js";
import { ReplicateDriver, type ReplicateFetch } from "./jobs/drivers/replicate-driver.js";
import { normalizeToStandard } from "./jobs/drivers/normalize-image.js";
import { SCENE_STANDARD } from "@admin/content";
import { JobFile } from "./jobs/job-file.js";
import { pathsFor, runJob } from "./jobs/runner.js";
import { clearSpendGate, spendAuthorizationFrom, type SpendAuthorizationRequest } from "./jobs/spend-authorization.js";
import { guardScenarioPublish, reviewJob, reviewPathsFor } from "./scenarios/review.js";
import { OwnerAuthorizationSchema, ownerReviewFrom } from "./jobs/review-core.js";
import { guardConsequencePublish, reviewConsequenceJob } from "./consequences/review.js";
import { courtesyWaived, REVISION_KINDS, upgradeCorpusContext } from "./scenarios/upgrade.js";
import {
  cmdRetimeBaseline,
  cmdRetimeJob,
  cmdRetimeReport,
  cmdUpgradeJob,
  cmdUpgradePublish,
  existingCorpusErrors,
  findingKey,
  isError,
  printFindings,
  reportCorpusHealth,
} from "./scenarios/revision-commands.js";
import { NgramBaseline } from "./scenarios/retime.js";
import { scenarioJob, type ScenarioBriefSpec } from "./scenarios/brief.js";
import { bakeWithKit, cmdKitGroup } from "./scenarios/kit-commands.js";
import { PersonaId } from "./personas/index.js";
import { shippedErrorKeys, validateScenarioDir, validateScenarioDocument } from "./scenarios/validate.js";
import { bakedFamilyIndex } from "./corpus/player-bundle.js";
import { bindingFindings } from "./scenarios/binding.js";
import { validateConsequenceDir, validateConsequenceDocument } from "./consequences/validate.js";
import { consequenceJob, CONSEQUENCE_README, type ConsequenceBriefSpec } from "./consequences/brief.js";
import { consequenceCoverage, formatCoverage } from "./consequences/coverage.js";
import {
  corpusPathsFor,
  corpusStats,
  publishToCorpus,
  writeCorpusManifest,
  corpusDeeds,
  type CorpusPaths,
} from "./corpus/shard-store.js";
import {
  consequenceCorpusStats,
  consequencePathsFor,
  publishConsequences,
  readConsequenceBodies,
  writeConsequenceManifest,
} from "./corpus/consequence-store.js";
import { harnessCorpus, type HarnessCorpus } from "./corpus/harness-corpus.js";
import { cmdArcs, cmdRetire } from "./corpus/arcs.js";
import {
  buildContentManifest,
  readContentSetManifest,
  writeContentSet,
  type ManifestBuild,
} from "./corpus/content-manifest.js";
// The offline-playability audit the delivery service already owns. Building a
// content set is the moment that claim can still be fixed, so the producer
// asks the same question the server would rather than a second copy of it.
import { auditStarterPack } from "@admin/api";
import type { DocumentValidator } from "./jobs/drivers/session-driver.js";

// Re-exported so anything that imported the revision commands from
// "./cli.js", where they lived until the behavior-neutral extraction into
// "./scenarios/revision-commands.js", keeps working unchanged.
export { cmdRetimeBaseline, cmdRetimeJob, cmdRetimeReport, cmdUpgradeJob, cmdUpgradePublish };

// The command surface a generation session drives:
//
//   studio scenarios job <id> <class[/persona]:cast:count[:steer]>...  write a job file
//     a cell prefixed "arc:" is one chain instead of N siblings — a setter plus
//     count-1 readers gated on its flags, written in one call so the readers can
//     quote the setter's own remembered lines (e.g. arc:scandal:none:serious:3)
//   studio scenarios upgrade <id> [--limit <n>]                 job over shipped scenarios missing context/impact
//   studio scenarios upgrade-publish <id> [--allow-provisional] write a reviewed upgrade back over the corpus in place
//   studio scenarios retime <id> [--limit <n>] [--shard <class>]  job over shipped scenarios with a flash-forward
//   studio scenarios retime-baseline [--out <path>]              the §8 3-gram baseline, measured once before a wave
//   studio scenarios retime-report <id> --baseline <path>        before/after per changed field, the §8 ceiling
//   studio scenarios run <id> [--recheck] [--authorize-spend <id> --as <name>]  materialize briefs / validate outputs
//     --recheck puts items the journal already calls done back through the gate,
//     for an output edited after review; session and mock drivers only
//   studio scenarios validate <dir>                             gate any directory of scenario JSON
//   studio scenarios review <id> [--owner-review "<why>"]        scaffold a review record / finish it into shipped.json
//   studio consequences job <id> <instrument[/persona]:band:valence:count[:steer]>...
//   studio consequences run <id>                                the same handshake, aftermath side
//   studio consequences validate <dir>                          gate any directory of consequence JSON
//   studio consequences review <id> [--owner-review "<why>"]     the same review handshake, aftermath side
//   studio consequences coverage                                the instrument x band x valence matrix
//   studio corpus publish <id>                                  append a shipped batch to the sharded corpus
//   studio corpus stats                                         what the corpus holds
//   studio corpus arcs [--dir <workdir>] [--json] [--all]       every arc a door opens and nothing answers
//   studio corpus arcs --from <id|flag> [--json]                 upstream: what set the doors this one reads
//   studio corpus arcs --check-delete <id> [--json]               would retiring this scenario orphan a live reader
//   studio corpus consequences <publish|stats>                  the sibling corpus under content/corpus/consequences
//   studio corpus build [--content-set <id>]                    index the corpus into a deployable content set
//
// Conventions: job files live in content/jobs, the spend ledger in
// content/ledger, and session work directories in content/jobs/work/<id>.
// The OpenRouter driver is constructed only where a run is unattended and
// keyed; sessions never need it.

const JOBS_DIR = path.join("content", "jobs");
const LEDGER_DIR = path.join("content", "ledger");
const CORPUS_DIR = path.join("content", "corpus");
const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";
// Defaults chosen to fail safe: a run that forgets to set a ceiling gets a
// small one rather than none, and one that forgets the price assumes a dear
// image rather than a cheap one.
const DEFAULT_IMAGE_BUDGET_USD = 1;
const DEFAULT_IMAGE_COST_USD = 0.05;

const StageModels = z.record(z.string().min(1), z.string().min(1));

async function defaultReadLine(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(prompt);
  } finally {
    rl.close();
  }
}

export type OpenRouterRunDeps = {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: OpenRouterFetch;
  readonly readLine?: (prompt: string) => Promise<string>;
  readonly jobsDir?: string;
  readonly ledgerDir?: string;
  /** A pre-authorization off the command line, for a run with nobody at the keyboard. */
  readonly authorization?: SpendAuthorizationRequest;
  /** Whether anyone can answer the typed confirmation. Defaults to whether stdin is a terminal. */
  readonly interactive?: boolean;
  /** Put items the journal calls done back through the gate. Refused on any driver that would pay to regenerate them. */
  readonly recheck?: boolean;
};

/**
 * The one question every billed driver asks before it constructs itself:
 * may this run spend? Built once per run so all three billed paths go through
 * the same decision — a second copy is a second thing to get wrong, and the
 * copy that gets it wrong is the one nobody is looking at.
 */
function spendGateFor(
  job: JobFile,
  progressPath: string,
  deps: OpenRouterRunDeps,
): (estimatedSpendUsd: number, confirm: () => Promise<boolean>) => Promise<boolean> {
  const interactive = deps.interactive ?? process.stdin.isTTY === true;
  return async (estimatedSpendUsd, confirm) => {
    const outcome = await clearSpendGate({
      job,
      progressPath,
      estimatedSpendUsd,
      ...(deps.authorization ? { requested: deps.authorization } : {}),
      interactive,
      confirm,
    });
    for (const line of outcome.ok ? outcome.notices : outcome.messages) console.log(line);
    return outcome.ok;
  };
}

// Spend stays owner-gated: a run against a real, keyed API is real money, so
// an attended one does not proceed on a flag alone — the owner types the job
// id back, the same "type the resource name to confirm" pattern destructive
// CLI operations already use elsewhere. A run with nobody at the keyboard
// takes the other door instead (jobs/spend-authorization.ts), which records
// who approved it rather than merely asking whoever is driving the terminal.
async function confirmOpenRouterSpend(
  job: JobFile,
  model: string,
  estimateUsd: number,
  readLine: (prompt: string) => Promise<string>,
): Promise<boolean> {
  console.log(`This run calls OpenRouter (${model}) for ${job.items.length} item(s) — real money, no session in the loop.`);
  // The image path has always quoted the money and the text path never did,
  // which left the owner confirming an item count. An item count is not a
  // price, and these prompts are large enough that the difference is the whole
  // decision.
  console.log(`  up to about $${estimateUsd.toFixed(2)} at this job's prompt sizes — OpenRouter's own billing is the real figure.`);
  const answer = await readLine(`Type the job id ("${job.id}") to confirm, anything else aborts: `);
  return answer.trim() === job.id;
}

// The same owner gate the text driver uses, plus the two numbers that decide
// how much money is at stake: an image run is billed per request, so the
// ceiling and the per-image price are the run's actual terms and the owner
// confirms against them rather than against an item count alone.
async function confirmImageSpend(
  job: JobFile,
  model: string,
  costPerImageUsd: number,
  budgetUsd: number,
  readLine: (prompt: string) => Promise<string>,
): Promise<boolean> {
  const worstCase = job.items.length * costPerImageUsd;
  console.log(`This run generates images with ${model} — real money, no session in the loop.`);
  console.log(
    `  ${job.items.length} item(s) × $${costPerImageUsd.toFixed(4)} = $${worstCase.toFixed(2)} at most, capped at $${budgetUsd.toFixed(2)} across all runs of this job.`,
  );
  if (worstCase > budgetUsd) {
    console.log(`  The cap binds first: the run will stop after roughly $${budgetUsd.toFixed(2)} and name what it skipped.`);
  }
  const answer = await readLine(`Type the job id ("${job.id}") to confirm, anything else aborts: `);
  return answer.trim() === job.id;
}

function resolveOpenRouterModels(env: NodeJS.ProcessEnv): { default: string; perStage?: Record<string, string> } {
  const perStage = env.OPENROUTER_STAGE_MODELS ? StageModels.parse(JSON.parse(env.OPENROUTER_STAGE_MODELS)) : undefined;
  return { default: env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL, perStage };
}

const CASTS = ["tensest", "closest", "band", "warCounterpart", "belligerent", "none", "stricken", "outlet", "collectionReport", "tradeMeasure", "liveBill", "judicialVacancy", "pendingOrderCase"] as const;

/** Pull "--name value" out of the argument list in place, so what remains is positional. */
function takeFlag(args: string[], name: string): string | undefined {
  const at = args.indexOf(name);
  if (at < 0) return undefined;
  const value = args[at + 1];
  if (value === undefined) throw new Error(`${name} needs a value`);
  args.splice(at, 2);
  return value;
}

// A cell may name its own director as "class/persona", which beats both the
// job-level flag and the severity/class routing. It rides the class token
// because the steer segment is free-form text and joining on ":" has to stay
// lossless. The severity segment may be omitted: a cell that goes straight from
// cast to count means "serious", which is the middle of the dial and the week
// most scenarios are, so the common case stays the short one to type.
export function parseCell(cell: string): ScenarioBriefSpec {
  // A leading "arc" turns the cell from N siblings into one chain. It rides a
  // literal prefix rather than another optional positional segment because the
  // tail is already three optionals deep and ends in free-form steer text —
  // "arc" is unambiguous where a fourth optional would not be, since no
  // ScenarioClass is named that.
  const arc = cell.startsWith("arc:");
  const [klass, cast, ...rest] = (arc ? cell.slice("arc:".length) : cell).split(":");
  const [classToken, personaToken] = (klass ?? "").split("/");
  const parsedClass = ScenarioClass.parse(classToken);
  const persona = personaToken === undefined ? undefined : PersonaId.parse(personaToken);
  if (!CASTS.includes(cast as (typeof CASTS)[number])) {
    throw new Error(`unknown cast "${cast}" in "${cell}" — one of ${CASTS.join(", ")}`);
  }
  const severityGiven = ScenarioSeverity.options.includes(rest[0] as ScenarioSeverity);
  const severity = severityGiven ? (rest[0] as ScenarioSeverity) : "serious";
  const [count, ...steer] = severityGiven ? rest.slice(1) : rest;
  const parsedCount = Number(count);
  if (!Number.isInteger(parsedCount) || parsedCount < 1) {
    throw new Error(`bad count "${count}" in "${cell}"`);
  }
  // An arc cell's count is its whole arithmetic: one setter with `count - 1`
  // replies, and one reader per reply, so every door leads somewhere. That puts
  // the floor at three rather than two, because a two-scenario arc asks for a
  // one-reply setter and `ScenarioReply` has a floor of two — a decision with
  // one option is not a decision. Refused at parse rather than discovered at
  // review, where it costs a written batch.
  if (arc && parsedCount < 3) {
    throw new Error(
      `arc cell "${cell}" needs a count of at least 3 — a setter with two replies, and a reader for each of them`,
    );
  }
  return {
    class: parsedClass,
    severity,
    cast: cast as ScenarioBriefSpec["cast"],
    count: parsedCount,
    ...(arc ? { arc: true } : {}),
    ...(steer.length > 0 ? { steer: steer.join(":") } : {}),
    ...(persona ? { persona } : {}),
  };
}

export async function cmdJob(
  id: string,
  cells: readonly string[],
  driver: JobFile["driver"],
  persona?: PersonaId,
): Promise<void> {
  if (cells.length === 0) {
    throw new Error("no cells given — expected class[/persona]:cast[:severity]:count[:steer], e.g. espionage:tensest:routine:3");
  }
  // Built with the corpus's own deeds in hand, so rule 26 offers a writer a
  // list rather than a file path. A tree with no corpus yet passes an empty
  // list and the section simply does not print.
  const deeds = await corpusDeeds(corpusPathsFor(CORPUS_DIR));
  const job = scenarioJob(id, driver, cells.map(parseCell), persona, deeds);
  await mkdir(JOBS_DIR, { recursive: true });
  const file = path.join(JOBS_DIR, `${id}.json`);
  await writeFile(file, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  console.log(`wrote ${file}: ${job.items.length} item(s), driver "${driver}"`);
}

// `cmdUpgradeJob` and `cmdUpgradePublish` moved to `./scenarios/revision-commands.js`,
// behavior-neutral, alongside the retime kind's `cmdRetimeJob`, `cmdRetimeReport`
// and `cmdRetimeBaseline` — every command that reads one shipped scenario,
// briefs one allowed change, and writes the result back in place. Re-imported
// above and re-exported at the bottom of this file.

// The driver's own courtesy check, chosen by what the job produces. The
// runner's gate is the enforcement; this is what lets a session read its
// findings beside the brief, so it has to be the right validator for the kind.
//
// It takes the same corpus the runner's gate takes, and that is the whole
// point of the parameter. Without it this check ran against an empty flag
// vocabulary while the gate behind it ran against the real one, so the two
// disagreed in the one direction that costs content: a scenario waiting on a
// flag the shipped corpus genuinely stamps was refused here, by an error, and
// never reached the gate that would have passed it. The brief's rule 26 asks
// every batch to answer an older batch's deed, and on this driver that rule
// was unsatisfiable — which is why the corpus reads its own flags and almost
// nobody else's.
/**
 * The corpus a review reads, chosen by what the job produced. A revision —
 * upgrade, retime or regate — is judged against the same reduced corpus its
 * gate used: its id is a shipped id and the nearest thing to it in the pool is
 * its own shipped self, so the full corpus would flag every item in the batch
 * as a duplicate of itself and refuse the ones the reviewer approved.
 */
async function reviewCorpusFor(jobPath: string, corpus: HarnessCorpus): Promise<HarnessCorpus> {
  const kind = await readFile(jobPath, "utf8")
    .then((text) => JobFile.parse(JSON.parse(text)).kind)
    .catch(() => undefined);
  if (kind === undefined || !REVISION_KINDS.has(kind)) return corpus;
  return { ...corpus, scenarios: upgradeCorpusContext(corpus.scenarios) ?? corpus.scenarios };
}

// A retime does not touch `conditions` or `cast` either, so it is exempted the
// same way an upgrade is. A regate exists to change `conditions`, so its
// reachability really is this revision's to get right — exempting it here
// would let the courtesy validator stay quiet about a defect the gate behind
// it refuses, which is the exact disagreement this function exists to avoid.
const REACHABILITY_EXEMPT_REVISION_KINDS = new Set(["scenario-upgrade", "scenario-retime", "scenario-rejoin"]);

export function validatorFor(kind: string, corpus?: HarnessCorpus): DocumentValidator {
  if (kind === "consequence-batch") {
    return (file, raw) => validateConsequenceDocument(file, raw, corpus?.consequenceFlags, corpus?.consequences);
  }
  // A revision is judged against a reduced corpus, for the reasons at
  // `upgradeCorpusContext`. It cannot check preservation — the original is on
  // the job item and this signature never sees it — and does not need to: the
  // gate behind it does, and a session that hears about a finding the gate
  // will never raise is a session that rewrites a shipped scenario to satisfy
  // it, which is the exact failure this whole pass is built to prevent.
  // A fresh batch is the only thing held to the binding contract, and it is
  // held to it here as well as at the gate so a session sees the named defect
  // in its findings file rather than a one-line refusal from the runner. The
  // revision branch below deliberately does not: an upgrade or a retime may
  // not touch `conditions`, so a session shown "unbound-week" on a shipped
  // scenario has one move left and it is the one this pass exists to prevent.
  if (!REVISION_KINDS.has(kind)) {
    return (file, raw) => {
      const result = validateScenarioDocument(file, raw, corpus?.scenarios, corpus?.scenarioFlags);
      const binding = bindingFindings(raw);
      return { ...result, binding, ok: result.ok && binding.length === 0 };
    };
  }
  const scenarios = upgradeCorpusContext(corpus?.scenarios);
  const exemptReachability = REACHABILITY_EXEMPT_REVISION_KINDS.has(kind);
  // A revision returns one scenario rather than a batch of them, because it is
  // handed one. The document validator takes a batch, so a lone object is
  // wrapped instead of being reported as a shape error — a session told its
  // correct output is malformed goes looking for a defect that is not there.
  return (file, raw, item) => {
    const result = validateScenarioDocument(file, Array.isArray(raw) ? raw : [raw], scenarios, corpus?.scenarioFlags);
    if (kind === "scenario-repair") {
      const binding = bindingFindings(Array.isArray(raw) ? raw : [raw]);
      return {
        ...result,
        binding,
        ok: result.shapeErrors.length === 0 &&
          !result.findings.some((finding) => finding.severity === "error") && binding.length === 0,
      };
    }
    // The same standing debt the gate forgives: errors the shipped original already carried, word for word.
    const shipped = item ? shippedErrorKeys(item.id, item.payload.original, scenarios, corpus?.scenarioFlags) : new Set<string>();
    const findings = result.findings.filter(
      (finding) =>
        (!exemptReachability || finding.kind !== "unreachable-scenario") &&
        !courtesyWaived(kind, finding.kind) &&
        !shipped.has(`${finding.kind}|${finding.message}`),
    );
    return { ...result, findings, ok: result.shapeErrors.length === 0 && !findings.some((finding) => finding.severity === "error") };
  };
}

export async function cmdRun(id: string, deps: OpenRouterRunDeps = {}): Promise<number> {
  const jobsDir = deps.jobsDir ?? JOBS_DIR;
  const paths = pathsFor(jobsDir, deps.ledgerDir ?? LEDGER_DIR, id);
  const job = JobFile.parse(JSON.parse(await readFile(paths.jobPath, "utf8")));
  const env = deps.env ?? process.env;
  // A recheck re-reads an output the session already wrote, which costs
  // nothing. On a driver that generates the item, the same flag would buy the
  // whole batch a second time, so it is refused rather than quietly honored.
  if (deps.recheck && job.driver !== "session" && job.driver !== "mock") {
    console.error(`--recheck is only for the session and mock drivers; "${job.driver}" would regenerate every item and pay for it again`);
    return 2;
  }
  const readLine = deps.readLine ?? defaultReadLine;
  const maySpend = spendGateFor(job, paths.progressPath, deps);
  const corpus = await jobHarnessCorpus(job, jobsDir, CORPUS_DIR);

  let driver;
  let imageBudgetUsd: number | undefined;
  let worstCaseItemUsd: number | undefined;
  if (job.driver === "session") {
    const consequences = job.kind === "consequence-batch";
    driver = new SessionDriver({
      workDir: path.join(jobsDir, "work", id),
      validate: validatorFor(job.kind, corpus),
      ...(consequences ? { readme: CONSEQUENCE_README } : {}),
    });
  } else if (job.driver === "mock") {
    driver = new MockDriver();
  } else if (job.driver === "image") {
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set — an image run needs a real key");
    const model = env.IMAGE_MODEL;
    if (!model) throw new Error("IMAGE_MODEL is not set — an image run must name the model it is paying for");
    // Per-image price is configured rather than read back: OpenRouter bills
    // image models per request and does not return the price, so the ceiling
    // is only as honest as this number.
    const costPerImageUsd = Number(env.IMAGE_COST_PER_IMAGE_USD ?? DEFAULT_IMAGE_COST_USD);
    if (!Number.isFinite(costPerImageUsd) || costPerImageUsd <= 0) {
      throw new Error("IMAGE_COST_PER_IMAGE_USD must be a positive number");
    }
    const budgetUsd = Number(env.IMAGE_BUDGET_USD ?? DEFAULT_IMAGE_BUDGET_USD);
    if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) {
      throw new Error("IMAGE_BUDGET_USD must be a positive number");
    }
    imageBudgetUsd = budgetUsd;
    worstCaseItemUsd = costPerImageUsd;
    const estimate = Math.min(job.items.length * costPerImageUsd, budgetUsd);
    if (!(await maySpend(estimate, () => confirmImageSpend(job, model, costPerImageUsd, budgetUsd, readLine)))) {
      return 1;
    }
    driver = new ImageDriver({
      apiKey,
      model,
      fetchImpl: (deps.fetchImpl ?? (fetch as unknown as OpenRouterFetch)) as unknown as ImageFetch,
      outputDir: path.join(jobsDir, "images", id),
      costPerImageUsd,
      // Dispatch scenes are the one image the player ships: 16:9, held to the
      // same standard the gate checks them against.
      normalize: (source) =>
        normalizeToStandard(source, {
          edge: SCENE_STANDARD.width,
          maxBytes: SCENE_STANDARD.maxBytes,
          aspect: { width: 16, height: 9 },
        }),
    });
  } else if (job.driver === "replicate") {
    // The open-weight image backend. Same job files, same gate, same
    // normalization standard as the closed-weight path — only the billing and
    // the catalogue differ, which is the whole reason it exists.
    const apiToken = env.REPLICATE_API_TOKEN;
    if (!apiToken) throw new Error("REPLICATE_API_TOKEN is not set — a replicate run needs a real token");
    const model = env.REPLICATE_MODEL;
    if (!model) throw new Error('REPLICATE_MODEL is not set — name the model being paid for, e.g. "black-forest-labs/flux-schnell"');
    // Replicate prices per prediction and does not return the price, so the
    // ceiling is only as honest as this number — the same caveat the
    // closed-weight path carries, and the reason there is no default here:
    // guessing a per-image price on the cheap backend is how a run that was
    // supposed to save money quietly stops being capped.
    const perImage = Number(env.REPLICATE_COST_PER_IMAGE_USD);
    if (!Number.isFinite(perImage) || perImage <= 0) {
      throw new Error("REPLICATE_COST_PER_IMAGE_USD must be set to a positive number — the run's cap depends on it");
    }
    const budgetUsd = Number(env.IMAGE_BUDGET_USD ?? DEFAULT_IMAGE_BUDGET_USD);
    if (!Number.isFinite(budgetUsd) || budgetUsd <= 0) {
      throw new Error("IMAGE_BUDGET_USD must be a positive number");
    }
    imageBudgetUsd = budgetUsd;
    worstCaseItemUsd = perImage;
    const estimate = Math.min(job.items.length * perImage, budgetUsd);
    if (!(await maySpend(estimate, () => confirmImageSpend(job, model, perImage, budgetUsd, readLine)))) {
      return 1;
    }
    driver = new ReplicateDriver({
      apiToken,
      model,
      fetchImpl: (deps.fetchImpl ?? (fetch as unknown as ReplicateFetch)) as unknown as ReplicateFetch,
      outputDir: path.join(jobsDir, "images", id),
      costPerImageUsd: perImage,
      ...(env.REPLICATE_INPUT ? { input: JSON.parse(env.REPLICATE_INPUT) as Record<string, unknown> } : {}),
      normalize: (source) =>
        normalizeToStandard(source, {
          edge: SCENE_STANDARD.width,
          maxBytes: SCENE_STANDARD.maxBytes,
          aspect: { width: 16, height: 9 },
        }),
    });
  } else {
    const apiKey = env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set — an unattended openrouter run needs a real key");
    const models = resolveOpenRouterModels(env);
    // Priced off the prompts actually being sent rather than a flat per-item
    // constant. The constant was `DEFAULT_WORST_CASE_ITEM_USD` (ten cents), and
    // against a 65,000-character brief it under-stated the first real run by
    // more than five times — an authorization is a statement of terms, and a
    // gate that quotes a fifth of the price is not gating anything.
    const estimate = job.items.reduce(
      (total, item) => total + estimateItemWorstCaseUsd(typeof item.payload.prompt === "string" ? item.payload.prompt : ""),
      0,
    );
    if (!(await maySpend(estimate, () => confirmOpenRouterSpend(job, models.default, estimate, readLine)))) {
      return 1;
    }
    const fetchImpl = deps.fetchImpl ?? (fetch as unknown as OpenRouterFetch);
    driver = new OpenRouterDriver({ apiKey, models, fetchImpl });
  }

  // Every batch is gated against the corpus it is joining, not just against
  // itself — a duplicate id or a near-duplicate of something shipped months
  // ago is exactly the failure a growing pool produces and a batch-local check
  // cannot see. Both halves are indexes, so this costs the batch's size.
  //
  // Both corpora are loaded whichever kind is running, because each one's flag
  // vocabulary is half of the other's chain closure: a card waiting on a flag a
  // shipped scenario stamps is legitimate, and a gate that only knew its own
  // side would refuse it.
  const summary = await runJob(paths, driver, corpus, {
    ...(imageBudgetUsd !== undefined ? { budgetUsd: imageBudgetUsd } : {}),
    ...(worstCaseItemUsd !== undefined ? { worstCaseItemUsd } : {}),
    ...(deps.recheck ? { recheck: true } : {}),
  });
  console.log(
    `${summary.jobId}: ${summary.ran.length} done, ${summary.failed.length} open, ${summary.skipped.length} already done, $${summary.totalSpendUsd.toFixed(4)} spent`,
  );
  // A run that stopped early has to say so, or a partial batch reads as a
  // complete one and the missing images look like buckets nobody wanted.
  if (summary.haltedForBudget.length > 0) {
    console.log(
      `  BUDGET REACHED — $${summary.lifetimeSpendUsd.toFixed(4)} of $${(imageBudgetUsd ?? 0).toFixed(2)} spent across all runs; ${summary.haltedForBudget.length} item(s) never ran:`,
    );
    console.log(`    ${summary.haltedForBudget.slice(0, 8).join(", ")}${summary.haltedForBudget.length > 8 ? ", …" : ""}`);
  }
  for (const itemId of summary.failed) console.log(`  open: ${itemId} — ${summary.failedReasons[itemId]}`);
  // Accepted, with craft warnings against it. Printed as loudly as an open
  // item because this run is the last one that will ever mention them: the
  // journal skips a done item, so nothing downstream reads these again.
  for (const [itemId, count] of Object.entries(summary.warned)) {
    const plural = count === 1 ? "warning" : "warnings";
    console.log(`  done with ${count} ${plural}: ${itemId} — see ${itemId}.findings.json (shipped; fix before publishing)`);
  }
  if (job.driver === "session" && (summary.failed.length > 0 || Object.keys(summary.warned).length > 0)) {
    console.log(`briefs and findings: ${path.join(jobsDir, "work", id)} — write <item>.out.json and run again`);
  }
  return 0;
}

async function cmdValidate(dir: string): Promise<number> {
  const results = await validateScenarioDir(dir, bakedFamilyIndex(process.cwd()));
  // Merged across the run rather than per file: a follow-up and the scenario
  // whose deed it answers are usually in different documents, so the only
  // honest read of the flag economy is over everything the run touched.
  const deeds = mergeDeeds(results.map((result) => result.deeds));
  let bad = 0;
  for (const result of results) {
    if (!result.ok) bad += 1;
    console.log(`${result.ok ? "ok  " : "FAIL"} ${result.file} (${result.scenarios} scenario(s))`);
    for (const error of result.shapeErrors) console.log(`  error shape [${path.basename(result.file)}]: ${error}`);
    // Warnings print on a passing file too — they are the whole reason a
    // writer would read this output when nothing is broken.
    for (const finding of result.findings) {
      console.log(`  ${finding.severity} ${finding.kind} [${finding.scenario}]: ${finding.message}`);
    }
  }
  console.log(`${results.length - bad}/${results.length} file(s) clean`);
  console.log(formatDeeds(deeds));
  return bad === 0 ? 0 : 1;
}

// A consequence cell rides the same "colon-separated, steer last" shape a
// scenario cell does, and names its director the same way, so a writer moving
// between the two groups is not learning a second grammar.
export function parseConsequenceCell(cell: string): ConsequenceBriefSpec {
  const [head, band, valence, count, ...steer] = cell.split(":");
  const [instrumentToken, personaToken] = (head ?? "").split("/");
  const instrument = ConsequenceInstrument.parse(instrumentToken);
  const persona = personaToken === undefined ? undefined : PersonaId.parse(personaToken);
  const parsedCount = Number(count);
  if (!Number.isInteger(parsedCount) || parsedCount < 1) throw new Error(`bad count "${count}" in "${cell}"`);
  return {
    instrument,
    band: ConsequenceRungBand.parse(band),
    valence: ConsequenceValence.parse(valence),
    count: parsedCount,
    ...(steer.length > 0 ? { steer: steer.join(":") } : {}),
    ...(persona ? { persona } : {}),
  };
}

export async function cmdConsequenceJob(
  id: string,
  cells: readonly string[],
  driver: JobFile["driver"],
  persona?: PersonaId,
): Promise<void> {
  if (cells.length === 0) {
    throw new Error("no cells given — expected instrument[/persona]:band:valence:count[:steer], e.g. covert:high:failure:3");
  }
  const job = consequenceJob(id, driver, cells.map(parseConsequenceCell), persona);
  await mkdir(JOBS_DIR, { recursive: true });
  const file = path.join(JOBS_DIR, `${id}.json`);
  await writeFile(file, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  console.log(`wrote ${file}: ${job.items.length} item(s), driver "${driver}"`);
}

async function cmdConsequenceValidate(dir: string): Promise<number> {
  const results = await validateConsequenceDir(dir);
  let bad = 0;
  for (const result of results) {
    if (!result.ok) bad += 1;
    console.log(`${result.ok ? "ok  " : "FAIL"} ${result.file} (${result.consequences} card(s))`);
    for (const error of result.shapeErrors) console.log(`  error shape [${path.basename(result.file)}]: ${error}`);
    for (const finding of result.findings) {
      console.log(`  ${finding.severity} ${finding.kind} [${finding.consequence}]: ${finding.message}`);
    }
  }
  console.log(`${results.length - bad}/${results.length} file(s) clean`);
  return bad === 0 ? 0 : 1;
}

/**
 * The name git will put on the commit this batch lands in.
 *
 * Deliberately not a prompt. An owner authorization is the one place a human
 * overrides a machine check, and a prompt in a terminal is answered by whatever
 * is driving that terminal — which, on this project, is usually an agent. An
 * agent typing the owner's name into an exception is precisely the failure the
 * independence check exists to prevent, so the name is read from the identity
 * that is already on the hook for the commit rather than from the keyboard.
 */
export function gitIdentity(): string | undefined {
  try {
    const name = execFileSync("git", ["config", "user.name"], { encoding: "utf8" }).trim();
    return name.length > 0 ? name : undefined;
  } catch {
    // No git, no identity, no silent default — the caller asks for --as instead.
    return undefined;
  }
}

/**
 * `run`, in every group that has one: the job id, plus the pre-authorization an
 * unattended invocation carries. Shared so a scheduled portrait job and a
 * scheduled scenario job are gated identically — the money is the same money.
 */
export async function cmdRunFrom(rest: readonly string[], usage: string): Promise<number> {
  const [id] = rest;
  if (!id) throw new Error(usage);
  const authorization = spendAuthorizationFrom(rest, gitIdentity);
  if (authorization && "error" in authorization) {
    console.error(authorization.error);
    return 2;
  }
  const recheck = rest.includes("--recheck");
  return await cmdRun(id, { ...(authorization ? { authorization } : {}), ...(recheck ? { recheck: true } : {}) });
}

/** The production dashboard: the whole matrix, with the depth a player draws from. */
export async function cmdCoverage(corpusRoot: string = CORPUS_DIR): Promise<number> {
  const shipped = await readConsequenceBodies(consequencePathsFor(corpusRoot));
  console.log(formatCoverage(consequenceCoverage(shipped)));
  return 0;
}

// `isError`, `findingKey`, `printFindings`, `existingCorpusErrors` and
// `reportCorpusHealth` moved to `./scenarios/revision-commands.js` with
// `cmdUpgradePublish`, which is their only caller outside this file's own
// publish path below. Re-imported above.

export type UnionAuditOutcome = {
  readonly newErrors: readonly ScenarioFinding[];
  readonly preExistingErrors: readonly ScenarioFinding[];
  readonly warnings: number;
};

/**
 * Audits the published corpus and an incoming batch as one pool — the check
 * that catches a scenario gating on a flag nothing anywhere ever sets, which
 * neither a batch-against-itself check nor a batch-against-the-index
 * duplicate check can see. Only errors the union introduces block a publish;
 * errors the published corpus already carries without this batch are printed,
 * not enforced, because the batch did not cause them and holding it hostage to
 * an old defect fixes nothing.
 */
async function auditCorpusUnion(paths: CorpusPaths, batch: readonly ScenarioDef[]): Promise<UnionAuditOutcome> {
  const existing = await existingCorpusErrors(paths);
  const existingKeys = new Set(existing.errors.map(findingKey));
  const unionFindings = auditScenarios([...existing.bodies, ...batch], existing.knownFlags, {});
  const unionErrors = unionFindings.filter(isError);
  return {
    newErrors: unionErrors.filter((finding) => !existingKeys.has(findingKey(finding))),
    preExistingErrors: unionErrors.filter((finding) => existingKeys.has(findingKey(finding))),
    warnings: unionFindings.filter((finding) => finding.severity === "warning").length,
  };
}

/** What a publish prints once it has decided to proceed: old defects named, warnings counted. */
function reportUnionAudit(outcome: UnionAuditOutcome): void {
  if (outcome.preExistingErrors.length > 0) {
    console.log(
      `PRE-EXISTING DEFECT(S) in the published corpus, not introduced by this batch and not blocking (${outcome.preExistingErrors.length}):`,
    );
    printFindings(outcome.preExistingErrors);
  }
  if (outcome.warnings > 0) console.log(`corpus-wide audit: ${outcome.warnings} warning(s)`);
}

/** Publish a finished batch into the sharded corpus, and report what the corpus holds. */
export async function cmdCorpus(command: string | undefined, rest: readonly string[]): Promise<number> {
  const paths = corpusPathsFor(CORPUS_DIR);
  if (command === "consequences") return await cmdConsequenceCorpus(rest[0], rest.slice(1));
  if (command === "stats") {
    const stats = await corpusStats(paths);
    console.log(`corpus: ${stats.scenarios} scenario(s) across ${stats.shards} shard(s) — ${paths.root}`);
    await reportCorpusHealth(paths);
    return 0;
  }
  if (command === "arcs") return await cmdArcs(rest, CORPUS_DIR);
  if (command === "retire") return await cmdRetire(rest, CORPUS_DIR);
  if (command === "publish") {
    const [jobId] = rest;
    if (!jobId) throw new Error("usage: studio corpus publish <jobId>");
    const shippedPath = path.join("content", "reviews", jobId, "shipped.json");
    const shipped = z
      .object({
        scenarios: z.array(ScenarioDef),
        provisional: z.boolean().optional(),
        ownerAuthorization: OwnerAuthorizationSchema.nullable().optional(),
      })
      .parse(JSON.parse(await readFile(shippedPath, "utf8")));
    const guard = guardScenarioPublish(jobId, shipped.provisional, rest, shipped.ownerAuthorization);
    if (!guard.ok) {
      for (const message of guard.messages) console.error(message);
      return 1;
    }
    for (const notice of guard.notices ?? []) console.log(notice);
    const union = await auditCorpusUnion(paths, shipped.scenarios);
    if (union.newErrors.length > 0) {
      console.error(`corpus-wide audit refuses this publish — ${union.newErrors.length} new error finding(s) the union introduces:`);
      printFindings(union.newErrors);
      return 1;
    }
    reportUnionAudit(union);
    const outcome = await publishToCorpus(paths, shipped.scenarios);
    await writeCorpusManifest(paths);
    console.log(
      `${jobId}: added ${outcome.added.length}, skipped ${outcome.skipped.length} already present — corpus now ${outcome.stats.scenarios} across ${outcome.stats.shards} shard(s)`,
    );
    return 0;
  }
  if (command === "build") return await cmdCorpusBuild(paths, rest);
  console.log("usage: studio corpus <publish|stats|arcs|retire|build|consequences> …");
  return 2;
}

const CONTENT_DIST_DIR = path.join("content", "dist");

/**
 * Where signed asset paths begin under the CDN origin.
 *
 * The signature covers the whole pathname of the URL a client is handed, so
 * this has to be the route the host actually mounts. It is overridable because
 * the host is a deployment choice, and wrong-by-default here would fail as a
 * signature mismatch at request time rather than as a bad build.
 */
const DEFAULT_ASSET_PREFIX = "/functions/v1/content/asset";

/** The content set id in play, from the flag or the environment, in that order. */
function contentSetIdFrom(args: string[]): string {
  const flag = takeFlag(args, "--content-set");
  const id = flag ?? process.env.CONTENT_SET_ID;
  if (!id || id.trim().length === 0) {
    throw new Error(
      "no content set id — pass --content-set <id> or set CONTENT_SET_ID. It names what a client is asking for, so it may not be defaulted.",
    );
  }
  return id;
}

async function buildFor(paths: CorpusPaths, args: string[]): Promise<{
  readonly build: ManifestBuild;
  readonly outDir: string;
  readonly contentSetId: string;
}> {
  const contentSetId = contentSetIdFrom(args);
  const assetPrefix = takeFlag(args, "--asset-prefix") ?? DEFAULT_ASSET_PREFIX;
  const outDir = path.join(CONTENT_DIST_DIR, contentSetId);
  const build = await buildContentManifest(paths, {
    contentSetId,
    assetPrefix,
    generatedAt: new Date().toISOString(),
    previous: await readContentSetManifest(outDir),
  });
  return { build, outDir, contentSetId };
}

/**
 * Index the published corpus into the tree the delivery service serves.
 *
 * The starter-pack audit runs here and refuses, because a content set whose
 * bundled floor reaches pools it does not bundle is a first launch that hangs
 * on a plane — and this is the last point where that is a build error rather
 * than a player's problem.
 */
async function cmdCorpusBuild(paths: CorpusPaths, rest: readonly string[]): Promise<number> {
  const args = [...rest];
  const { build, outDir, contentSetId } = await buildFor(paths, args);
  const audit = auditStarterPack(build.manifest);
  if (audit.status === "incomplete") {
    console.error(`content set ${contentSetId} would not be playable offline: ${audit.message}`);
    return 1;
  }
  const written = await writeContentSet(outDir, build);
  const items = build.manifest.entries.reduce((sum, entry) => sum + entry.itemCount, 0);
  console.log(
    `${contentSetId}: revision ${build.manifest.manifestRevision}, ${written.shardCount} shard(s) + bundled floor, ${items} item(s) — ${outDir}`,
  );
  console.log(`starter pack self-contained across: ${audit.poolKeys.join(", ")}`);

  // The same corpus, baked into the app. A set that is only ever built into
  // content/dist reaches a player who has a content service; this reaches the
  // one who does not, which since the service is off by default is everyone.
  const bundle = await bakeWithKit(outDir, build.manifest);
  console.log(
    `baked into the app: ${bundle.shardCount} shard(s), ${bundle.itemCount} scenario(s), ${(bundle.bytes / 1024).toFixed(0)} KB — ${bundle.path}`,
  );
  return 0;
}


/** The consequence corpus, same two verbs against the sibling store. */
async function cmdConsequenceCorpus(command: string | undefined, rest: readonly string[]): Promise<number> {
  const paths = consequencePathsFor(CORPUS_DIR);
  if (command === "stats") {
    const stats = await consequenceCorpusStats(paths);
    console.log(`consequence corpus: ${stats.consequences} card(s) across ${stats.shards} shard(s) — ${paths.root}`);
    return 0;
  }
  if (command === "publish") {
    const [jobId] = rest;
    if (!jobId) throw new Error("usage: studio corpus consequences publish <jobId>");
    const shippedPath = path.join("content", "reviews", jobId, "shipped.json");
    const shipped = z
      .object({
        consequences: z.array(ConsequenceDef),
        provisional: z.boolean().optional(),
        ownerAuthorization: OwnerAuthorizationSchema.nullable().optional(),
      })
      .parse(JSON.parse(await readFile(shippedPath, "utf8")));
    // The aftermath corpus is judged against exactly as the scenario one is,
    // so it is refused on the same terms — a self-reviewed batch setting the
    // standard is the same failure whichever pool it lands in.
    const guard = guardConsequencePublish(jobId, shipped.provisional, rest, shipped.ownerAuthorization);
    if (!guard.ok) {
      for (const message of guard.messages) console.error(message);
      return 1;
    }
    for (const notice of guard.notices ?? []) console.log(notice);
    const outcome = await publishConsequences(paths, shipped.consequences);
    await writeConsequenceManifest(paths);
    console.log(
      `${jobId}: added ${outcome.added.length}, skipped ${outcome.skipped.length} already present — corpus now ${outcome.stats.consequences} across ${outcome.stats.shards} shard(s)`,
    );
    return 0;
  }
  console.log("usage: studio corpus consequences <publish|stats>");
  return 2;
}

/** The aftermath group: the scenario group's verbs, one content type over, plus the matrix. */
export async function cmdConsequences(command: string | undefined, rest: readonly string[]): Promise<number> {
  switch (command) {
    case "job": {
      const args = [...rest];
      const driver = takeFlag(args, "--driver") ?? "session";
      const persona = takeFlag(args, "--persona");
      const [id, ...cells] = args;
      if (!id) {
        throw new Error(
          "usage: studio consequences job <id> <instrument[/persona]:band:valence:count[:steer]>... [--driver session|mock|openrouter] [--persona <id>]",
        );
      }
      await cmdConsequenceJob(id, cells, JobFile.shape.driver.parse(driver), persona === undefined ? undefined : PersonaId.parse(persona));
      return 0;
    }
    case "run":
      return await cmdRunFrom(rest, "usage: studio consequences run <jobId> [--authorize-spend <jobId> --as <name>]");
    case "validate": {
      const [dir] = rest;
      if (!dir) throw new Error("usage: studio consequences validate <dir>");
      return await cmdConsequenceValidate(dir);
    }
    case "review": {
      const [id] = rest;
      if (!id) throw new Error("usage: studio consequences review <jobId> [--owner-review \"<why>\"] [--as <name>]");
      const owner = ownerReviewFrom(rest, gitIdentity);
      if (owner && "error" in owner) {
        console.error(owner.error);
        return 2;
      }
      return await reviewConsequenceJob(id, reviewPathsFor(JOBS_DIR, path.join("content", "reviews"), id), owner, await harnessCorpus(CORPUS_DIR));
    }
    case "coverage":
      return await cmdCoverage();
    default:
      console.log("usage: studio consequences <job|run|validate|review|coverage> …");
      return 2;
  }
}

export async function main(argv: readonly string[]): Promise<number> {
  const [group, command, ...rest] = argv;
  if (group === "corpus") return await cmdCorpus(command, rest);
  if (group === "consequences") return await cmdConsequences(command, rest);
  if (group !== "scenarios") {
    console.log("usage: studio <scenarios|consequences|corpus> … ");
    return 2;
  }
  if (command === "kit" || command === "ingest" || command === "finish") return await cmdKitGroup(command, rest, { run: (id) => cmdRun(id), takeFlag });
  switch (command) {
    case "job": {
      const args = [...rest];
      const driver = takeFlag(args, "--driver") ?? "session";
      const persona = takeFlag(args, "--persona");
      const [id, ...cells] = args;
      if (!id) {
        throw new Error(
          "usage: studio scenarios job <id> <class[/persona]:cast:count[:steer]>... [--driver session|mock|openrouter] [--persona <id>]",
        );
      }
      await cmdJob(id, cells, JobFile.shape.driver.parse(driver), persona === undefined ? undefined : PersonaId.parse(persona));
      return 0;
    }
    case "upgrade": {
      const flags = [...rest];
      const limitFlag = takeFlag(flags, "--limit");
      const limit = limitFlag === undefined ? undefined : z.coerce.number().int().positive().parse(limitFlag);
      const upgradeDriver = takeFlag(flags, "--driver") ?? "session";
      const topicFlag = takeFlag(flags, "--topic");
      const topic = topicFlag === undefined ? undefined : ScenarioTopicTag.parse(topicFlag);
      const before = takeFlag(flags, "--before");
      const [id] = flags;
      if (!id) {
        throw new Error(
          "usage: studio scenarios upgrade <jobId> [--limit <n>] [--driver session|mock] [--topic <tag>] [--before <date>]",
        );
      }
      await cmdUpgradeJob(id, JobFile.shape.driver.parse(upgradeDriver), limit, topic, before);
      return 0;
    }
    case "upgrade-publish": {
      const [id, ...publishArgs] = rest;
      if (!id) throw new Error("usage: studio scenarios upgrade-publish <jobId> [--allow-provisional]");
      return await cmdUpgradePublish(id, publishArgs);
    }
    case "retime": {
      const flags = [...rest];
      const limitFlag = takeFlag(flags, "--limit");
      const limit = limitFlag === undefined ? undefined : z.coerce.number().int().positive().parse(limitFlag);
      const retimeDriver = takeFlag(flags, "--driver") ?? "session";
      const shard = takeFlag(flags, "--shard");
      const [id] = flags;
      if (!id) {
        throw new Error("usage: studio scenarios retime <jobId> [--limit <n>] [--driver session|mock] [--shard <class>]");
      }
      await cmdRetimeJob(id, JobFile.shape.driver.parse(retimeDriver), limit, shard);
      return 0;
    }
    case "retime-baseline": {
      const flags = [...rest];
      const out = takeFlag(flags, "--out");
      await cmdRetimeBaseline(out);
      return 0;
    }
    case "retime-report": {
      const flags = [...rest];
      const baselinePath = takeFlag(flags, "--baseline");
      const [id] = flags;
      if (!id || !baselinePath) {
        throw new Error("usage: studio scenarios retime-report <jobId> --baseline <path>");
      }
      const baseline = NgramBaseline.parse(JSON.parse(await readFile(baselinePath, "utf8")));
      return await cmdRetimeReport(id, baseline);
    }
    case "run":
      return await cmdRunFrom(rest, "usage: studio scenarios run <jobId> [--recheck] [--authorize-spend <jobId> --as <name>]");
    case "validate": {
      const [dir] = rest;
      if (!dir) throw new Error("usage: studio scenarios validate <dir>");
      return await cmdValidate(dir);
    }
    case "review": {
      const [id] = rest;
      if (!id) throw new Error("usage: studio scenarios review <jobId> [--owner-review \"<why>\"] [--as <name>]");
      const owner = ownerReviewFrom(rest, gitIdentity);
      if (owner && "error" in owner) {
        console.error(owner.error);
        return 2;
      }
      const paths = reviewPathsFor(JOBS_DIR, path.join("content", "reviews"), id);
      return await reviewJob(id, paths, owner, await reviewCorpusFor(paths.jobPath, await harnessCorpus(CORPUS_DIR)));
    }
    default:
      console.log("usage: studio scenarios <job|upgrade|upgrade-publish|retime|retime-baseline|retime-report|run|validate|review|kit|ingest|finish> …");
      return 2;
  }
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href;
if (invokedDirectly) {
  main(process.argv.slice(2))
    .then((code) => process.exit(code))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
