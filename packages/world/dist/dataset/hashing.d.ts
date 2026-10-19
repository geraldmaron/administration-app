/** FNV-1a — fast, deterministic, good-enough avalanche for seeding a PRNG. */
export declare const FNV_OFFSET = 2166136261;
/**
 * FNV-1a resumed from a state a previous call returned.
 *
 * `fnv1a(a + b)` and `fnv1aFrom(fnv1a(a), b)` are the same number: the hash
 * folds one character at a time and carries no other state, and the `>>> 0` a
 * caller sees does not change what the next `^` and `Math.imul` produce.
 *
 * It exists so a hot loop can hash a long shared prefix once. Deriving a
 * per-pair key across a cast of a few thousand means millions of hashes over
 * strings that differ only in their last few characters, and building those
 * strings to hash them was the expense, not the hashing.
 */
export declare function fnv1aFrom(state: number, input: string): number;
export declare function fnv1a(input: string): number;
/** mulberry32 — small, fast, deterministic 32-bit PRNG. */
export declare function mulberry32(seed: number): () => number;
/**
 * The first — and only — draw a fresh `mulberry32(seed)` would produce.
 *
 * Byte for byte the same number, without the generator closure. For a caller
 * that wants one deterministic value off a key rather than a sequence, the
 * closure was the whole allocation: a hot loop taking one draw per key
 * allocated a generator per key and threw it away.
 */
export declare function mulberryOnce(seed: number): number;
