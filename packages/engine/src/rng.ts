import { fnv1a, mulberry32 } from "@admin/world";
import { z } from "zod";

// Every random draw derives from the campaign seed via a
// named stream, so draws are reproducible and independent of call order.
export const CampaignSeed = z.string().min(1).brand<"CampaignSeed">();
export type CampaignSeed = z.infer<typeof CampaignSeed>;

export function makeCampaignSeed(raw: string): CampaignSeed {
  return CampaignSeed.parse(raw);
}

export type RngStream = {
  readonly key: string;
  next(): number;
  nextInt(min: number, max: number): number; // inclusive of min, exclusive of max
  pick<T>(items: readonly T[]): T;
};

function createStream(key: string, seed: number): RngStream {
  const draw = mulberry32(seed);
  return {
    key,
    next: () => draw(),
    nextInt(min, max) {
      return min + Math.floor(draw() * (max - min));
    },
    pick(items) {
      if (items.length === 0) throw new Error(`cannot pick from an empty list (stream ${key})`);
      return items[this.nextInt(0, items.length)]!;
    },
  };
}

export type RngStreams = {
  // Streams are keyed by an ordered tuple (e.g. nation id, subsystem, turn) and
  // are pure functions of (campaignSeed, keyParts) — deriving one never
  // touches another's state, so callers can draw in any order.
  stream(...keyParts: Array<string | number>): RngStream;
};

/**
 * A deterministic index into a bank, keyed by a string rather than by a stream.
 *
 * The stream form is for draws that advance with the campaign; this is for the
 * draws that must come out the same every time the same thing is read, however
 * many times a surface re-renders it. There is no state to advance and no order
 * to depend on — the key is the whole input.
 */
export function hashIndex(seed: string, modulo: number): number {
  return fnv1a(seed) % modulo;
}

/** The same hash as a fraction in [0, 1), for a weighted draw off a fixed key. */
export function hashFraction(seed: string): number {
  return fnv1a(seed) / 4294967296;
}

export function createRngStreams(seed: CampaignSeed): RngStreams {
  return {
    stream(...keyParts) {
      const key = keyParts.join(":");
      return createStream(key, fnv1a(`${seed}::${key}`));
    },
  };
}

// The replay harness the whole rebuild leans on: same seed + same decisions
// => byte-identical state. `program` should be a pure function of its streams
// and its decision script; it must not read Math.random/Date.now (banned by
// lint in this package) or any other ambient state.
export function replay<TResult>(seed: CampaignSeed, program: (streams: RngStreams) => TResult): [TResult, TResult] {
  const first = program(createRngStreams(seed));
  const second = program(createRngStreams(seed));
  return [first, second];
}
