import { type CareerArchetype, type Person, type PersonConnection } from "@admin/world";
/**
 * What one pair of people is to each other, and how the record proves it.
 *
 * Split from `person-network.ts` because the two halves answer different
 * questions and only one of them is about relationships. This file decides what
 * a pair IS; the other decides which of those readings a circle has room to
 * draw. The seam is `bestCandidate`, which is the only thing the seating needs
 * from here.
 *
 * ### The rules read shared history, not collisions
 *
 * A `CareerPost` carries `startAge` and `years`, so a working life is a set of
 * dated intervals, and two lives can be compared without a calendar: a post ran
 * from `age - startAge` years ago to `age - startAge - years` years ago, and
 * the difference of two people's ages is the difference of their birth years.
 * Every rule below therefore asks for a real overlap in real time, in the same
 * country, before it will say two people know each other. Where the record
 * shows no shared history, it returns nothing and the pair gets no tie.
 *
 * The one modeled assumption, stated rather than hidden: an `academia` post
 * held by someone who names the same school as the student is taken to have
 * been served AT that school. The school is data; the posting's place is not,
 * and no `CareerPost` records one.
 */
export type Candidate = PersonConnection & {
    readonly score: number;
    /** What this pair is if the seating refuses the reading above. Only mentorships carry one. */
    readonly fallback?: Candidate;
};
export declare const MIN_CAREER_OVERLAP_YEARS = 3;
/** An interval in years-before-now. `from` is the older edge, `to` the newer. */
type Span = {
    readonly from: number;
    readonly to: number;
};
/**
 * How a shared working world is named in a sentence a player reads.
 *
 * Exported because the dossier's assessment names the same worlds when it says
 * which part of a record put a reading where it landed, and two tables for one
 * vocabulary is how "the diplomatic corps" becomes "the foreign service" on the
 * next screen down.
 */
export declare const WORLD_PHRASE: Readonly<Record<CareerArchetype, string>>;
/**
 * Everything a pair test needs about one person, derived once per cast rather
 * than per pair — the same reason the previous sweep derived one, with the
 * career spans added because every rule now reads them.
 */
export type Derived = {
    readonly person: Person;
    readonly id: string;
    readonly surname: string;
    readonly nationality: string;
    readonly school: string | undefined;
    readonly party: string | undefined;
    /**
     * Every posting in one archetype, in years-before-now.
     *
     * Kept as the separate intervals rather than one hull: a career that left a
     * world and came back has a gap in it, and a hull would let two people claim
     * years together that one of them spent somewhere else.
     */
    readonly spans: ReadonlyMap<string, readonly Span[]>;
    readonly archetypeSet: ReadonlySet<string>;
    /** The world they entered working life in — the only one a mentor can come from. */
    readonly firstArchetype: string | undefined;
    /** When they left school, in years-before-now. Undefined when no career post dates it. */
    readonly study: Span | undefined;
    readonly foreignSeat: boolean;
    readonly age: number;
    readonly economic: number;
    readonly authLib: number;
    readonly nationalist: number;
};
export declare function derive(person: Person): Derived;
/**
 * What a pair contributes: its best reading, and — when that reading is a
 * mentorship — the reading to fall back to if the seating refuses it.
 *
 * The fallback exists because mentorship is the one kind with a quota of its
 * own. A person has a mentor, not four, so `seatUnderCap` will refuse a second
 * one; and if the refusal simply dropped the pair, a true shared decade of
 * service would vanish from both files because the rule that describes it best
 * was already spoken for. The shared history is the same fact either way. Only
 * the claim made about it changes.
 */
export declare function bestCandidate(a: Derived, b: Derived, hashFor: (from: string) => number, publicOnly?: boolean): Candidate | undefined;
export {};
