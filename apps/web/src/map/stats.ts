/** What the map was doing when a frame was drawn. */
export type FramePhase = "idle" | "pan" | "zoom" | "flight" | "settle";

export interface FrameSample {
  /** Time between this frame's rAF callback and the previous one, ms. */
  readonly interval: number;
  /** Main-thread time spent inside the map's frame callback, ms. */
  readonly work: number;
  readonly phase: FramePhase;
}

export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[rank] ?? Number.NaN;
}

export interface FrameSummary {
  readonly frames: number;
  readonly intervalP50: number;
  readonly intervalP95: number;
  readonly workP50: number;
  readonly workP95: number;
  readonly workMax: number;
  readonly fps: number;
}

export function summarize(samples: readonly FrameSample[]): FrameSummary {
  const intervals = samples.map((s) => s.interval);
  const work = samples.map((s) => s.work);
  const meanInterval = intervals.reduce((sum, v) => sum + v, 0) / Math.max(1, intervals.length);
  return {
    frames: samples.length,
    intervalP50: percentile(intervals, 50),
    intervalP95: percentile(intervals, 95),
    workP50: percentile(work, 50),
    workP95: percentile(work, 95),
    workMax: work.length > 0 ? Math.max(...work) : Number.NaN,
    fps: meanInterval > 0 ? 1000 / meanInterval : Number.NaN,
  };
}

/** A bounded history of frames, newest last. */
export class FrameLog {
  private readonly samples: FrameSample[] = [];

  constructor(private readonly capacity = 4000) {}

  push(sample: FrameSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.capacity) this.samples.splice(0, this.samples.length - this.capacity);
  }

  recent(count: number): readonly FrameSample[] {
    return this.samples.slice(-count);
  }

  all(): readonly FrameSample[] {
    return this.samples.slice();
  }

  clear(): void {
    this.samples.length = 0;
  }
}
