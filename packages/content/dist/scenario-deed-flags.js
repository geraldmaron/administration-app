import { BOUND_DEED_PREFIXES, DEED_FLAGS, UNBOUND_DEED_PREFIXES, deedFlag, deedReceivedFlag, flagMarker } from "@admin/engine";
import { z } from "zod";
// The content-side mirror of the engine's deed grammar (packages/engine's
// deeds.ts). Content cannot own a second copy of that vocabulary without
// risking drift, so every value below is either the engine's own export
// re-exported unchanged, or a check derived at runtime from the engine's own
// prefix and flag lists. A family, band or outcome the engine ever adds,
// renames or removes moves this file with it instead of leaving a stale
// enum for a writer to trust.
export { DEED_FLAGS, deedFlag, deedReceivedFlag };
const withColon = (prefixes) => prefixes.map((prefix) => `${prefix}:`);
const BOUND_PREFIX_MATCH = withColon(BOUND_DEED_PREFIXES);
const UNBOUND_PREFIX_MATCH = withColon(UNBOUND_DEED_PREFIXES);
const KNOWN_UNBOUND_DEED_FLAGS = new Set(DEED_FLAGS);
const startsWithAny = (flag, prefixes) => prefixes.some((prefix) => flag.startsWith(prefix));
/**
 * Whether `flag` speaks one of the two bound forms (`deed-toward:`,
 * `deed-from:`) that always name the counterparty nation. Those are
 * engine-only by doctrine: a scenario that names a country in its gate stops
 * being reusable across every nation it could otherwise be cast onto.
 */
export function isBoundDeedFlag(flag) {
    return startsWithAny(flag, BOUND_PREFIX_MATCH);
}
/** Whether `flag` is shaped like any of the four deed prefixes, bound or not. */
function looksLikeDeedFlag(flag) {
    return startsWithAny(flag, BOUND_PREFIX_MATCH) || startsWithAny(flag, UNBOUND_PREFIX_MATCH);
}
/**
 * A flag field authored content READS: a scenario's `flag` condition, a
 * consequence card's `flagsSet`/`flagsClear`. A bound deed flag is refused
 * outright. A string merely shaped like the unbound grammar has to be one of
 * the 84 the engine can actually stamp — checked against `DEED_FLAGS` itself
 * rather than a retyped family/band/outcome enum, so a typo'd family or an
 * invented band fails to parse instead of gating on a flag no emitter will
 * ever write. Every other flag family (a scenario's own fired marker, the
 * desk-closed marker, a writer's own governance memory) is untouched, since
 * none of those share the `deed` prefix.
 */
export const ReadableFlag = z
    .string()
    .min(1)
    .refine((flag) => !isBoundDeedFlag(flag), {
    message: "names a bound deed flag (deed-toward:/deed-from:) — those name the counterparty nation and are engine-only; gate on the unbound deed:/deed-received: form instead",
})
    .refine((flag) => !looksLikeDeedFlag(flag) || KNOWN_UNBOUND_DEED_FLAGS.has(flag), {
    message: "is shaped like a deed flag but is not one of the 84 flags DEED_FLAGS (from @admin/engine) says the engine can stamp",
});
/**
 * A flag field authored content WRITES: a scenario reply's `sets`, a
 * consequence card's `sets`. A deed flag — bound or unbound — is a fact the
 * engine resolves for itself, never a judgment content makes, so no authored
 * `sets` may name one at all, only gate on one.
 */
export const WritableFlag = z.string().min(1).refine((flag) => !looksLikeDeedFlag(flag), {
    message: "sets a deed flag — deed flags are facts the engine resolves and stamps itself; authored content may gate on the unbound deed:/deed-received: forms but must never write one",
});
/**
 * The turn-stamped marker `rememberReply` leaves beside every authored `sets`
 * flag, which is what lets an `agedAtLeast` condition tell a fresh deed from a
 * cold one. The flag itself says *that* something happened; this says *when*,
 * in the same record and without any change to the save shape. The resolver's
 * own act-stamping path builds this same key via the engine's `flagMarker` —
 * delegating here instead of holding a second literal is what keeps the two
 * in sync.
 */
export function flagSetFlag(flag, turn) {
    return flagMarker(flag, turn);
}
