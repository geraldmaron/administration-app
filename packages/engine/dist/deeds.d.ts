import type { NationId } from "@admin/world";
import { type InstrumentId } from "./instrument-ids.js";
import type { RungBand } from "./consequences.js";
/**
 * The nine things a durable act can be. The first five are `InstrumentId`
 * verbatim so this list cannot drift from the instrument ladder; the rest
 * name the other three choke points where an act becomes a durable record:
 * a commitment opened, a commitment wound down, and a standing obligation
 * answered rather than left to accumulate weight.
 */
export type DeedFamily = InstrumentId | "pledge" | "withdrawal" | "order" | "neglect-answered";
export declare const DEED_FAMILIES: readonly DeedFamily[];
/**
 * What another capital can do *to* this government: the instrument ladder and
 * nothing else. The other four families name machinery only this government
 * operates — a commitment it opened or wound down, an order it signed, an
 * obligation it answered — so a received flag in one of them would be a
 * string no emitter can ever write and no gate can ever reach.
 */
export declare const RECEIVED_DEED_FAMILIES: readonly InstrumentId[];
/**
 * A deed flag is a fact, not a gate on sort-of: an act landed or it did not.
 * `ConsequenceValence` has a `partial`; a deed flag deliberately does not.
 */
export declare const DEED_OUTCOMES: readonly ["landed", "failed"];
export type DeedOutcome = (typeof DEED_OUTCOMES)[number];
/**
 * Direction lives in the prefix.
 *
 * ```
 * deed:<family>:<band>:<outcome>                   this government acted
 * deed-received:<family>:<band>:<outcome>          this government was acted on
 * deed-toward:<nation>:<family>:<band>:<outcome>   ...it acted on that nation
 * deed-from:<nation>:<family>:<band>:<outcome>     ...that nation acted on it
 * ```
 *
 * Without the split, a record could say what was done and how hard without
 * saying who did it: one string covered both "we ran this operation" and
 * "this operation was run on us", which are opposite facts to answer, and the
 * only name in the bound form was whichever end happened to be the target —
 * this government's own id, half the time, which identifies nobody.
 *
 * The two unbound prefixes name no country, so authored content stays
 * world-neutral and a scenario gating on one can still be cast any way. The
 * two bound prefixes always name the *other* party and never this
 * government's own nation. That is the invariant every engine-side reader
 * leans on: `deed-toward:<X>:` counts what this government has done to X,
 * `deed-from:<X>:` counts what X has done to it, and neither can be mistaken
 * for the other.
 */
export declare const UNBOUND_DEED_PREFIXES: readonly ["deed", "deed-received"];
export declare const BOUND_DEED_PREFIXES: readonly ["deed-toward", "deed-from"];
/** An act this government took. Content gates on this form. */
export declare function deedFlag(family: DeedFamily, band: RungBand, outcome: DeedOutcome): string;
/** An act taken on this government by another. Content gates on this form too. */
export declare function deedReceivedFlag(family: InstrumentId, band: RungBand, outcome: DeedOutcome): string;
/**
 * An act this government took on `nation`. Engine-only — the obligation
 * ledger, NPC disposition and the Record legitimately know which country;
 * authored content never does and never may write a bound form.
 */
export declare function deedTowardFlag(nation: NationId, family: DeedFamily, band: RungBand, outcome: DeedOutcome): string;
/**
 * An act `nation` took on this government. The counterparty a standing
 * obligation to answer is owed to is readable off this string alone, which is
 * the whole reason the form exists.
 */
export declare function deedFromFlag(nation: NationId, family: InstrumentId, band: RungBand, outcome: DeedOutcome): string;
/**
 * The exhaustive unbound vocabulary: 9 × 3 × 2 = 54 acts this government can
 * take, plus 5 × 3 × 2 = 30 acts that can be taken on it, built from the
 * builders themselves so the array and the builders cannot disagree. 84 is
 * still small enough to print as a table in a generation brief, which is the
 * point: a writer picks from a list instead of inventing a string. The
 * received half is deliberately the shorter one — padding it to a second 54
 * would print thirty-six rows no emitter can ever write.
 *
 * Durations are deliberately absent from this grammar. A deed flag never
 * expires — the record does not forget an act happened — so there is no
 * fiction-time wait encoded here for a later conversion to touch. What
 * decays is neglect, a different flag family entirely, not this one.
 */
export declare const DEED_FLAGS: readonly string[];
