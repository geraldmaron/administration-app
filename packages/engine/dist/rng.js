import { fnv1a, mulberry32 } from "@admin/world";
import { z } from "zod";
// Every random draw derives from the campaign seed via a
// named stream, so draws are reproducible and independent of call order.
export const CampaignSeed = z.string().min(1).brand();
export function makeCampaignSeed(raw) {
    return CampaignSeed.parse(raw);
}
function createStream(key, seed) {
    const draw = mulberry32(seed);
    return {
        key,
        next: () => draw(),
        nextInt(min, max) {
            return min + Math.floor(draw() * (max - min));
        },
        pick(items) {
            if (items.length === 0)
                throw new Error(`cannot pick from an empty list (stream ${key})`);
            return items[this.nextInt(0, items.length)];
        },
    };
}
/**
 * A deterministic index into a bank, keyed by a string rather than by a stream.
 *
 * The stream form is for draws that advance with the campaign; this is for the
 * draws that must come out the same every time the same thing is read, however
 * many times a surface re-renders it. There is no state to advance and no order
 * to depend on — the key is the whole input.
 */
export function hashIndex(seed, modulo) {
    return fnv1a(seed) % modulo;
}
/** The same hash as a fraction in [0, 1), for a weighted draw off a fixed key. */
export function hashFraction(seed) {
    return fnv1a(seed) / 4294967296;
}
export function createRngStreams(seed) {
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
export function replay(seed, program) {
    const first = program(createRngStreams(seed));
    const second = program(createRngStreams(seed));
    return [first, second];
}
