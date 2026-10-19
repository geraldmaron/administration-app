import type { Person } from "@admin/world";
/** The scale a course is measured on: a spoken answer's tones, or the instrument ladder. */
export type CounselRegister = "position" | "instrument";
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
export declare function appetiteOnScale(person: Person, kind: CounselRegister): number;
/**
 * How well a course this coercive sits with this person's instincts, from -1
 * (it cuts against everything they would do) to 1 (what they would have chosen).
 *
 * The same reading a minister's opinion in the room starts from, exported so a
 * rule asking whether someone believes in an act they are handed reads the
 * person the way the room already does rather than through a second formula.
 */
export declare function instinctFor(person: Person, register: CounselRegister, coercion: number): number;
export declare function clampUnit(value: number): number;
