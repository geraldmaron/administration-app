// A driver executes one job item and reports its cost. Any
// driver implementing this interface can pick up any job file; the job model
// itself has no opinion on which driver runs it.
export type JobItem = {
  id: string;
  payload: Record<string, unknown>;
  // Which pipeline stage this item belongs to (e.g. "draft", "repair") — lets
  // a driver pick a different model per stage, since stage requirements
  // differ (structure-critical planning vs. bulk prose). Optional: a
  // single-stage job (every batch today) just omits it.
  stage?: string;
};

export type ItemResult = {
  itemId: string;
  status: "done" | "failed";
  spendUsd: number;
  output?: unknown;
  error?: string;
  /**
   * Non-blocking defects the driver's own validation found — craft smells the
   * audit reports as warnings rather than errors.
   *
   * Reported because acceptance is the last moment they are actionable: the
   * journal never re-checks a done item, so a warning not surfaced on the run
   * that accepts it is a warning nobody will ever act on.
   */
  warnings?: number;
  /**
   * What actually produced this item — the model id for a generation driver.
   *
   * Journaled because a job resumes by id across runs, and nothing forces a
   * resumed run to name the model the earlier one used. Without this, a
   * catalogue generated half by one model and half by another is only
   * detectable by looking at the images, which is exactly the inspection the
   * journal exists to save.
   */
  producer?: string;
};

export interface JobDriver {
  readonly name: string;
  runItem(item: JobItem): Promise<ItemResult>;
}
