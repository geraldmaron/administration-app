import { useEffect, useRef, useState } from "react";
import { PROJECTION_ENSEMBLE_SIZE, type Campaign, type ProjectionRun } from "@admin/engine";
import { modelingChoice, modelingChoiceKey, runModelingJobs, type ModelingChoiceSpec, type ModelingJob } from "@admin/player-core";

export type ProjectionState =
  | { readonly status: "idle" }
  | { readonly status: "running"; readonly weeksDone: number; readonly weeksTotal: number; readonly runs: readonly ProjectionRun[] }
  | { readonly status: "done"; readonly runs: readonly ProjectionRun[]; readonly ms: number }
  | { readonly status: "failed"; readonly message: string };

function jobsOf(campaign: Campaign, spec: ModelingChoiceSpec): readonly ModelingJob[] {
  const choice = modelingChoice(campaign, spec);
  if (!choice) return [];
  // Run-major: every alternative's first run comes before any second run, so the first complete comparison is ready early.
  return Array.from({ length: PROJECTION_ENSEMBLE_SIZE }, (_, member) => choice.alternatives.map((alternative) => ({ alternative: alternative.id, member }))).flat();
}

type Handlers = { readonly onWeek: () => void; readonly onRun: (run: ProjectionRun) => void; readonly onDone: () => void; readonly onFailed: (message: string) => void };

/**
 * The runs one job per task, so the screen paints progress between them. One
 * runner serves every device: there is no worker on a phone, and on the web
 * the export ships one bundle.
 */
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
 * campaign, the choice or the horizon changes, and drops a run no longer
 * wanted. No horizon, no run: a projection costs seconds, so it starts only
 * when asked for.
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
    if (jobs.length === 0) return setState({ status: "failed", message: "This choice isn't open anymore, so there's nothing to forecast." });
    const weeksTotal = jobs.length * weeks;
    const started = Date.now();
    let weeksDone = 0;
    let runs: readonly ProjectionRun[] = [];
    let over = false;
    setState({ status: "running", weeksDone, weeksTotal, runs });
    const stop = runInline(campaign, spec, weeks, jobs, {
      onWeek: () => {
        if (!over) weeksDone += 1;
      },
      onRun: (run) => {
        if (over) return;
        runs = [...runs, run];
        setState({ status: "running", weeksDone, weeksTotal, runs });
      },
      onDone: () => {
        over = true;
        setState({ status: "done", runs, ms: Date.now() - started });
      },
      // One failed run fails the ensemble: an ensemble missing runs would draw a narrower band than the world has.
      onFailed: (message) => {
        if (over) return;
        over = true;
        setState({ status: "failed", message });
      },
    });
    return () => {
      over = true;
      stop();
    };
  }, [campaign, key, weeks]);
  return state;
}
