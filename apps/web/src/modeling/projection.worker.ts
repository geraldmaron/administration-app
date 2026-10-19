// A projection, off the main thread: one share of an ensemble's runs, each a
// few hundred weekly advances of the full engine. Run on the page it would
// freeze the screen for tens of seconds, so the page sends the campaign and its
// share of the jobs here and draws progress as weeks close.
import type { Campaign, ProjectionRun } from "@admin/engine";
import { runModelingJobs, type ModelingRequest } from "@admin/player-core";

/** The campaign as JSON: one stringify on the page is far cheaper than a structured clone per worker. */
export type ProjectionWorkerRequest = { readonly campaign: string; readonly request: ModelingRequest };

export type ProjectionWorkerReply =
  | { readonly kind: "ready" }
  | { readonly kind: "week" }
  | { readonly kind: "run"; readonly run: ProjectionRun }
  | { readonly kind: "done" }
  | { readonly kind: "failed"; readonly message: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<ProjectionWorkerRequest>) => void) | null;
  postMessage(message: ProjectionWorkerReply): void;
}

const scope = self as unknown as WorkerScope;

// Said as soon as the module graph has loaded, so the page can start the next worker on a warm cache.
scope.postMessage({ kind: "ready" });

scope.onmessage = (event) => {
  try {
    const campaign = JSON.parse(event.data.campaign) as Campaign;
    // One job at a time, each sent as it finishes, so the page can draw the first run of every alternative before the rest.
    for (const job of event.data.request.jobs) {
      const [run] = runModelingJobs(campaign, { ...event.data.request, jobs: [job] }, () => scope.postMessage({ kind: "week" }));
      scope.postMessage({ kind: "run", run: run! });
    }
    scope.postMessage({ kind: "done" });
  } catch (error) {
    scope.postMessage({ kind: "failed", message: error instanceof Error ? error.message : String(error) });
  }
};
