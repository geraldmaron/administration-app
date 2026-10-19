import type { ScenarioDef } from "./scenario.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
export type ReadoutFindingKind = "spelled-particular" | "hedged-particular" | "figureless-readout" | "essayistic-triad" | "essayistic-colon" | "place-as-actor" | "opaque-jargon";
/**
 * A particular's value writing its figure out in words.
 *
 * Player *prose* spells figures out — that is `numeral-in-prose`, and it is
 * right, because a person reading a briefing aloud says "twelve nights". A
 * particular is not prose. It is a labeled cell in a readout, sitting beside
 * two other cells, and the whole job of that grid is to be scannable at a
 * glance. "Days occupied: Twelve" makes the reader parse a word to recover a
 * number the cell existed to hand them.
 */
export declare function auditSpelledParticular(def: ScenarioDef, findings: FindingSink): void;
/**
 * A scenario that ships no figure at all.
 *
 * The scan grid draws three cells. Two of them are engine-derived — a sourcing
 * tag, a relationship reading — and neither is a fact about the case. When the
 * scenario contributes no numeral, those two are the entire readout, and the
 * player is asked to decide on a row that would read identically under any
 * other scenario in the corpus.
 */
export declare function auditFigurelessReadout(def: ScenarioDef, findings: FindingSink): void;
export declare function auditEssayisticColon(def: ScenarioDef, findings: FindingSink): void;
/**
 * A place given a chain of command.
 *
 * "The plaza's commanders" reads as though the plaza were an organization that
 * employs officers. It does not. Somebody commands the officers *at* the plaza,
 * and which body that is — a police department, a guard, a federal service — is
 * exactly the fact the sentence is dodging. The possessive is how a draft
 * skips naming an institution it has not decided on.
 */
export declare function auditPlaceAsActor(def: ScenarioDef, findings: FindingSink): void;
export declare function auditOpaqueJargon(def: ScenarioDef, findings: FindingSink): void;
/** Every readout rule, in one call for the scenario gate to make. */
export declare function auditReadout(def: ScenarioDef, findings: FindingSink): void;
