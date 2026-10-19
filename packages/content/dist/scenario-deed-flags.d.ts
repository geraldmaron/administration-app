import { DEED_FLAGS, deedFlag, deedReceivedFlag, type DeedFamily, type DeedOutcome } from "@admin/engine";
import { z } from "zod";
export { DEED_FLAGS, deedFlag, deedReceivedFlag };
export type { DeedFamily, DeedOutcome };
/**
 * Whether `flag` speaks one of the two bound forms (`deed-toward:`,
 * `deed-from:`) that always name the counterparty nation. Those are
 * engine-only by doctrine: a scenario that names a country in its gate stops
 * being reusable across every nation it could otherwise be cast onto.
 */
export declare function isBoundDeedFlag(flag: string): boolean;
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
export declare const ReadableFlag: z.ZodString;
/**
 * A flag field authored content WRITES: a scenario reply's `sets`, a
 * consequence card's `sets`. A deed flag — bound or unbound — is a fact the
 * engine resolves for itself, never a judgment content makes, so no authored
 * `sets` may name one at all, only gate on one.
 */
export declare const WritableFlag: z.ZodString;
/**
 * The turn-stamped marker `rememberReply` leaves beside every authored `sets`
 * flag, which is what lets an `agedAtLeast` condition tell a fresh deed from a
 * cold one. The flag itself says *that* something happened; this says *when*,
 * in the same record and without any change to the save shape. The resolver's
 * own act-stamping path builds this same key via the engine's `flagMarker` —
 * delegating here instead of holding a second literal is what keeps the two
 * in sync.
 */
export declare function flagSetFlag(flag: string, turn: number): string;
