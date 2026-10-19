import { useEffect, useRef, useState } from "react";
import type { Campaign, ProjectionRun } from "@admin/engine";
import { PROJECTION_ENSEMBLE_SIZE } from "@admin/engine";
import { modelingChoice, modelingChoiceKey, runModelingJobs, type ModelingChoiceSpec, type ModelingJob, type ModelingRequest } from "@admin/player-core";
import type { ProjectionWorkerReply, ProjectionWorkerRequest } from "./projection.worker";

export type ProjectionState =
  | { readonly status: "idle" }
  | { readonly status: "running"; readonly weeksDone: number; readonly weeksTotal: number; readonly runs: readonly ProjectionRun[] }
  | { readonly status: "done"; readonly runs: readonly ProjectionRun[]; readonly ms: number; readonly firstMs?: number }
  | { readonly status: "failed"; readonly message: string };

/** Never more workers than jobs, and one core left for the page. */
function poolSize(jobs: number): number {
  const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(jobs, cores - 1, 6));
}

function jobsOf(campaign: Campaign, spec: ModelingChoiceSpec): readonly ModelingJob[] {
  const choice = modelingChoice(campaign, spec);
  if (!choice) return [];
  // Run-major: every alternative's first run comes before any second run, so the first complete comparison is ready early.
  return Array.from({ length: PROJECTION_ENSEMBLE_SIZE }, (_, member) => choice.alternatives.map((alternative) => ({ alternative: alternative.id, member }))).flat();
}

type Handlers = { readonly onWeek: () => void; readonly onRun: (run: ProjectionRun) => void; readonly onDone: () => void; readonly onFailed: (message: string) => void };

/**
 * Each worker takes every n-th job, so a slow alternative is spread across the
 * pool rather than left to one. Workers start one after another, each once the
 * last has loaded: unbundled in development, a worker is a thousand module
 * requests, and six at once exhaust the browser's request budget. A worker
 * whose script still fails to load (a plain Event, not an ErrorEvent) is
 * started once more before the run is called failed.
 */
function runInWorkers(campaign: Campaign, spec: ModelingChoiceSpec, weeks: number, jobs: readonly ModelingJob[], on: Handlers): () => void {
  const size = poolSize(jobs.length);
  const json = JSON.stringify(campaign);
  const live = new Set<Worker>();
  let finished = 0;
  let next = 1;
  const start = (index: number, retries: number) => {
    const worker = new Worker(new URL("./projection.worker.ts", import.meta.url), { type: "module" });
    live.add(worker);
    const request: ModelingRequest = { spec, weeks, jobs: jobs.filter((_, job) => job % size === index) };
    worker.onmessage = (event: MessageEvent<ProjectionWorkerReply>) => {
      const reply = event.data;
      if (reply.kind === "ready") return next < size ? start(next++, 1) : undefined;
      if (reply.kind === "week") return on.onWeek();
      if (reply.kind === "failed") return on.onFailed(reply.message);
      if (reply.kind === "run") return on.onRun(reply.run);
      finished += 1;
      if (finished === size) on.onDone();
    };
    worker.onerror = (event) => {
      worker.terminate();
      live.delete(worker);
      if (!(event instanceof ErrorEvent) && retries > 0) return start(index, retries - 1);
      on.onFailed(event instanceof ErrorEvent && event.message ? event.message : "The projection could not start on this device.");
    };
    worker.postMessage({ campaign: json, request } satisfies ProjectionWorkerRequest);
  };
  start(0, 1);
  return () =>
    live.forEach((worker) => {
      // A worker stopped mid-load reports its aborted script as an error; a stopped run has nothing left to report.
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    });
}

/** Without workers (a test page), the runs go one job per task so the page still paints progress between them. */
function runInline(campaign: Campaign, spec: ModelingChoiceSpec, weeks: number, jobs: readonly ModelingJob[], on: Handlers): () => void {
  let canceled = false;
  const step = (index: number) => {
    if (canceled) return;
    if (index === jobs.length) return on.onDone();
    try {
      runModelingJobs(campaign, { spec, weeks, jobs: [jobs[index]!] }, () => on.onWeek()).forEach(on.onRun);
    } catch (error) {
      return on.onFailed(error instanceof Error ? error.message : String(error));
    }
    setTimeout(() => step(index + 1), 0);
  };
  setTimeout(() => step(0), 0);
  return () => {
    canceled = true;
  };
}

/**
 * Runs the choice's ensemble while a horizon is chosen, again whenever the
 * campaign, the choice or the horizon changes, and drops a run that is no
 * longer wanted. No horizon, no run: a projection costs seconds of every core,
 * so it starts only when asked for.
 */
export function useProjection(campaign: Campaign | undefined, chosen: ModelingChoiceSpec | undefined, weeks: number | undefined): ProjectionState {
  const [state, setState] = useState<ProjectionState>({ status: "idle" });
  // Keyed on the choice's content, so a new object naming the same choice does not restart a long run.
  const key = chosen ? modelingChoiceKey(chosen) : undefined;
  const latest = useRef(chosen);
  latest.current = chosen;
  useEffect(() => {
    const spec = latest.current;
    if (!campaign || !spec || weeks === undefined) return setState({ status: "idle" });
    const jobs = jobsOf(campaign, spec);
    if (jobs.length === 0) return setState({ status: "failed", message: "This choice is no longer pending, so there is nothing to model." });
    const weeksTotal = jobs.length * weeks;
    const started = performance.now();
    const firstRound = jobs.length / PROJECTION_ENSEMBLE_SIZE;
    let weeksDone = 0;
    let runs: readonly ProjectionRun[] = [];
    let firstMs: number | undefined;
    let over = false;
    let stop = () => undefined as void;
    setState({ status: "running", weeksDone, weeksTotal, runs });
    const on: Handlers = {
      onWeek: () => {
        if (over) return;
        weeksDone += 1;
        setState({ status: "running", weeksDone, weeksTotal, runs });
      },
      onRun: (run) => {
        if (over) return;
        runs = [...runs, run];
        if (firstMs === undefined && runs.filter((entry) => entry.member === 0).length === firstRound) firstMs = performance.now() - started;
        setState({ status: "running", weeksDone, weeksTotal, runs });
      },
      onDone: () => {
        over = true;
        setState({ status: "done", runs, ms: performance.now() - started, ...(firstMs === undefined ? {} : { firstMs }) });
      },
      // One failed share fails the run: an ensemble missing runs would draw a narrower band than the world has.
      onFailed: (message) => {
        if (over) return;
        over = true;
        stop();
        setState({ status: "failed", message });
      },
    };
    // Started a tick late, so a mount that is undone at once (a development double render) never spawns a pool it then tears down mid-load.
    const timer = setTimeout(() => {
      stop = typeof Worker === "undefined" ? runInline(campaign, spec, weeks, jobs, on) : runInWorkers(campaign, spec, weeks, jobs, on);
    }, 0);
    return () => {
      over = true;
      clearTimeout(timer);
      stop();
    };
  }, [campaign, key, weeks]);
  return state;
}
