/**
 * When each step of a moment appears.
 *
 * A moment is a short sequence the player is shown after an act — what was
 * said, who answered, what moved — and the only thing this decides is the
 * delay before each step. The delays are the design system's own durations,
 * never a number chosen here: a beat is one `normal` step, a reveal one `slow`
 * step. Under reduced motion every delay is zero, so the whole moment is on
 * screen at once and nothing is withheld from a reader who asked for stillness.
 *
 * Pure on purpose: the renderer turns these into `animation-delay`, and a test
 * can check the schedule without a DOM.
 */
export type MomentPause = "beat" | "reveal";

export type MomentStep<K extends string = string> = {
  readonly key: K;
  /** What kind of wait precedes this step; the first step is never waited for. */
  readonly pause?: MomentPause;
};

export type ScheduledStep<K extends string = string> = {
  readonly key: K;
  readonly delayMs: number;
};

export type MomentDurations = {
  readonly normal: number;
  readonly slow: number;
};

export function stageMoment<K extends string>(
  steps: readonly MomentStep<K>[],
  durations: MomentDurations,
  reducedMotion: boolean,
): readonly ScheduledStep<K>[] {
  let elapsed = 0;
  return steps.map((step, index) => {
    if (index > 0 && !reducedMotion) {
      elapsed += step.pause === "reveal" ? durations.slow : durations.normal;
    }
    return { key: step.key, delayMs: elapsed };
  });
}

/** The whole moment's length: when its last step has appeared. */
export function momentLengthMs(schedule: readonly ScheduledStep[]): number {
  return schedule.at(-1)?.delayMs ?? 0;
}
