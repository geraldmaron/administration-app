import type { Person } from "@admin/world";
import { dispositionOf } from "./person-disposition.js";

// How far a course sits from what a person would do by instinct, on the scale
// the course is measured on. Counsel's opinion in the room starts here, and so
// does a chair's reading of whether they believe in an act they are handed.
//
// A leaf on purpose: the instrument ladder sits on an import cycle with the
// modules that time and price an act, and a reading those modules call must
// load without pulling the ladder in half-built.

/**
 * Where "no strong feeling either way" sits on the scale a reply is measured on.
 *
 * A spoken answer's ladder tops out at `coercive` while the instrument ladder
 * runs to a military rung, so the two scales do not share a center. Reading an
 * ordinary chair's appetite against the instrument midpoint made every minister
 * in the government read as wanting more force than the room was offering, and
 * a firm answer — the most common register in the game — came back unanimously
 * endorsed by a cabinet that had never been asked anything about it.
 */
const REGISTER_MIDPOINT = { position: 0.3, instrument: 0.5 } as const;
const REGISTER_SPAN = { position: 0.65, instrument: 0.95 } as const;

// How far a mismatch between what a minister wants and what the reply asks has
// to run before it turns endorsement into opposition.
//
// Two numbers rather than one, because a flat tolerance cannot do the job that
// was asked of it. At 0.22 a coercive answer drew 75% of the cabinet against it,
// which reads less like a hard call being argued and more like a government in
// revolt whenever the President reaches for an ultimatum. Raising the flat
// number to 0.30 brought that to 59% and took the model's point with it: a hawk
// stopped opposing a conciliatory answer, and a department charged for a week it
// has no part in stopped objecting to the bill — the two properties this scoring
// model exists to produce.
//
// So tolerance is forgiven at the TOP OF THE LADDER ONLY. Above a firm answer,
// where reasonable people genuinely disagree about the use of force, a minister
// is allowed a wider gap before their view hardens into opposition. Below it
// nothing changes, because a chair who cannot live with a conciliatory line
// genuinely cannot, and because the two properties above are produced on a firm
// reply — forgiving that one is what cost them.
//
// Conciliatory through firm keep 0.22 exactly; coercive lands at 0.30. Measured:
// coercive opposition 75% to 59%, with the rest of the scale unmoved.
/** The scale a course is measured on: a spoken answer's tones, or the instrument ladder. */
export type CounselRegister = "position" | "instrument";

const MISMATCH_TOLERANCE = 0.22;
const FORGIVEN_ABOVE = 0.5;
const COERCION_FORGIVENESS = 0.4;

/** How far a gap may run, for a course this coercive, before it becomes opposition. */
function toleranceFor(coercion: number): number {
  return MISMATCH_TOLERANCE + COERCION_FORGIVENESS * Math.max(0, coercion - FORGIVEN_ABOVE);
}


/**
 * How much force this minister wants, expressed on the reply's own scale.
 *
 * Three inputs, because one was not enough to give a government opinions: only
 * four role profiles in the whole dataset carry a hawkish or dovish trait, so a
 * model that read the trait and one ideology axis gave every other minister in
 * the cabinet the same appetite to two decimal places. How a person reads the
 * country's place in the world is the axis that actually separates a Secretary
 * of Commerce from a Secretary of Labor on whether to answer an insult hard.
 */
export function appetiteOnScale(person: Person, kind: CounselRegister): number {
  const appetite = dispositionOf(person).forceAppetite;
  return REGISTER_MIDPOINT[kind] + REGISTER_SPAN[kind] * (appetite - 0.5);
}

/**
 * How well a course this coercive sits with this person's instincts, from -1
 * (it cuts against everything they would do) to 1 (what they would have chosen).
 *
 * The same reading a minister's opinion in the room starts from, exported so a
 * rule asking whether someone believes in an act they are handed reads the
 * person the way the room already does rather than through a second formula.
 */
export function instinctFor(person: Person, register: CounselRegister, coercion: number): number {
  const mismatch = Math.abs(appetiteOnScale(person, register) - coercion);
  const tolerance = toleranceFor(coercion);
  return clampUnit((tolerance - mismatch) / tolerance);
}

export function clampUnit(value: number): number {
  return Math.max(-1, Math.min(1, value));
}
