// The two deterministic primitives every seeded draw in the game is built on.
//
// They live in the dataset package rather than in the engine because both sides
// need them and the dependency only runs one way: the engine imports the world,
// the world never imports the engine. A second copy on the world side would
// have to stay byte-identical to the engine's forever, enforced by nothing, and
// the first character of drift would silently rename a unit for the same
// campaign seed.
//
// Neither is cryptographic. A stream needs independence and reproducibility,
// not unpredictability.
/** FNV-1a — fast, deterministic, good-enough avalanche for seeding a PRNG. */
export const FNV_OFFSET = 0x811c9dc5;
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
export function fnv1aFrom(state, input) {
    let hash = state;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}
export function fnv1a(input) {
    return fnv1aFrom(FNV_OFFSET, input);
}
/** mulberry32 — small, fast, deterministic 32-bit PRNG. */
export function mulberry32(seed) {
    let state = seed >>> 0;
    return () => mulberryDraw(state, (state = (state + 0x6d2b79f5) >>> 0));
}
/**
 * The first — and only — draw a fresh `mulberry32(seed)` would produce.
 *
 * Byte for byte the same number, without the generator closure. For a caller
 * that wants one deterministic value off a key rather than a sequence, the
 * closure was the whole allocation: a hot loop taking one draw per key
 * allocated a generator per key and threw it away.
 */
export function mulberryOnce(seed) {
    return mulberryDraw(seed >>> 0, ((seed >>> 0) + 0x6d2b79f5) >>> 0);
}
function mulberryDraw(_previous, state) {
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
