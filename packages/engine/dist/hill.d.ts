import type { NationId, PartyBeliefs, Person, PersonId, RoleId, StateId } from "@admin/world";
import type { DomesticSignature } from "./domestic-signature.js";
import { type AdministrationStanding } from "./party.js";
import { type TieEffect } from "./ties.js";
import type { Campaign, Chamber, ChamberComposition, Congress, HillCaucus, HillFigure, HillPostId, PersonRuntime, StateDelegation, StateRuntime, UsMajorParty } from "./state.js";
/** Which side of a chamber a post is held by, before the seats are counted. */
type PostSide = "majority" | "minority";
export type HillPost = {
    readonly id: HillPostId;
    /** What the post is called on a screen and in narration. */
    readonly title: string;
    readonly chamber: Chamber;
    readonly side: PostSide;
    /** The seat archetype this post is drawn from in the person pool. */
    readonly role: string;
    /**
     * The share of the chamber that moves with them.
     *
     * A Speaker sets the calendar and therefore decides what is voted on at all,
     * which is why they are worth more than twice a committee chair. The chairs
     * are worth what they are because a bill has to come through them first.
     */
    readonly influence: number;
    /** What this member is actually for, in the words a member page would use. */
    readonly brief: string;
};
export declare const HILL_POSTS: readonly HillPost[];
export declare function hillPost(id: HillPostId): HillPost | undefined;
/**
 * Which caucus holds the majority of a chamber, on the seats as they stand.
 *
 * Control is a majority of the members who caucus with a side, and the
 * independents caucus with the Democrats, as every independent senator of the
 * last two decades has. Given the anchor, they are counted where they sit;
 * without it they are counted out of both sides, which is what a caller that
 * does not know which side is which can honestly do. A tie goes to the
 * administration, whose Vice President breaks it: that is the Senate's rule
 * only, so a caller asking about the House asks `chamberMajority`.
 */
export declare function majorityCaucus(composition: ChamberComposition, caucusAnchor?: UsMajorParty): HillCaucus;
/**
 * Which caucus holds a chamber, with each chamber's own way of settling a tie.
 *
 * A tied Senate is organized by the administration's side because the Vice
 * President breaks the tie. A tied House has nobody to break it: the Speaker is
 * elected by a majority of the members voting, and until one side finds that
 * majority the House stays with the caucus holding the Speakership. Only before
 * a Speaker has ever been seated does the tie fall to the side whose own party
 * has more members, and past that to the administration, so the answer is
 * never undefined.
 */
export declare function chamberMajority(congress: Congress, chamber: Chamber): HillCaucus;
/**
 * What one member settles at, absent anything the president does about them.
 *
 * Read off the room plus their caucus plus who they are, so that a disposition
 * moved by a phone call decays back toward a member's own nature rather than
 * back to a number that has nothing to do with them. Ambition pulls against the
 * administration in both caucuses: a member with a future of their own is a
 * member with a reason not to be the president's. When the caller's act carries
 * a domestic signature, the caucus ticket's reading of it is a further nudge: a
 * co-partisan bloc costs a president less for an act its own platform is for.
 *
 * The tilt toward the administration is scaled by reach, so a president with no
 * party gets a Speaker who is nearer their politics than the other side's and
 * still not theirs. The tilt away is not scaled: nothing about an independent
 * presidency makes the far caucus friendlier.
 */
export declare function figureTarget(roomDisposition: number, figure: HillFigure, person?: Person, caucusBeliefs?: PartyBeliefs, signature?: DomesticSignature, standing?: AdministrationStanding): number;
/**
 * The same reading for a member who holds no leadership post.
 *
 * A committee chair is a member of a caucus with a character, not a Speaker,
 * and their reading of an administration is the room plus those two things.
 * Kept here rather than in the committee file so that every member of Congress
 * whose disposition the game reads is read by one rule.
 */
export declare function caucusTarget(roomDisposition: number, caucus: HillCaucus, person?: Person, standing?: AdministrationStanding): number;
/**
 * The leadership after a week of it, as the moves in each holder's rapport.
 *
 * Every global signal the room responds to — the polls, a budget that never
 * passed, force used without a vote — reaches these people through the room's
 * own disposition, so there is one account of how an administration is regarded
 * and the members are positions on it rather than a second opinion. A holder
 * who is already where they settle is left out, and so is one the people table
 * does not carry, who has no tie to move.
 */
export declare function leadershipDrift(leadership: readonly HillFigure[], roomDisposition: number, people: Readonly<Record<string, PersonRuntime>>, standing?: AdministrationStanding, signature?: DomesticSignature): readonly TieEffect[];
/**
 * Share of a chamber's seats that move with the state delegations. Soft enough
 * that leadership still dominates the displacement, hard enough that a region
 * turned against the administration shows up in the count.
 */
export declare const DELEGATION_LEVERAGE = 0.25;
/**
 * Seat-weighted mean of a reading over every state that has an apportioned
 * delegation. Absent or empty tables contribute nothing (mass stays 0 → 0),
 * which is what keeps a pre-delegation save counting votes identically.
 */
export declare function seatWeightedMean(states: Readonly<Record<StateId, StateRuntime>>, chamber: Chamber, of: (delegation: StateDelegation) => number): number;
/**
 * The most the chair is allowed to be worth to the Senate's disposition, either
 * way.
 *
 * Five points, which is a third of what sitting in a caucus is worth
 * (`CAUCUS_TILT`) and under two weeks of working the Speaker. A President of the
 * Senate who served there knows the members; they do not hold the chamber, and a
 * term that could hold it would make the running mate the most consequential
 * choice on the founding screen.
 *
 * Bounded here, at the read, rather than trusted from the write: the term is
 * computed in the Vice President's own file and stored on the Congress, so the
 * count that has to stay inside a band is the place to hold the band.
 */
export declare const SENATE_LIAISON_BOUND = 0.05;
/** What a seated Vice President is worth in the room they preside over. Zero when the chair is empty. */
export declare function senateLiaison(congress: Congress): number;
/**
 * The disposition a vote in this chamber is actually counted against.
 *
 * The room's own reading, moved by the members who can carry part of the room
 * with them, and by the state blocs when a delegation table is present. It is
 * a displacement rather than a replacement on purpose: with no leadership
 * seated and no (or empty) delegation table this is exactly the room's
 * disposition, which is what lets a save from before the Hill had names — or
 * before states had blocs — count votes identically.
 *
 * The displacement is never written back into `congress.disposition`. Writing
 * it back would close a loop with the delegation target (room → target →
 * chamberDisposition → room) with no damping — the boundary the depth audit
 * and ARCHITECTURE both pin.
 */
export declare function chamberDisposition(congress: Congress, chamber: Chamber, states: Readonly<Record<StateId, StateRuntime>> | undefined, people: Readonly<Record<string, PersonRuntime>>): number;
/**
 * Who is available to hold a post, in a fixed order.
 *
 * Sorted by id rather than drawn, because the pool was already drawn from the
 * campaign's seed: a second roll here would make the Hill the one part of the
 * cast that a replay staffs differently.
 */
export declare function benchFor(people: Readonly<Record<string, PersonRuntime>>, nation: NationId, role: string): readonly PersonRuntime[];
/**
 * The first free member of a caucus's own party, in bench order. Where the
 * bench has run out of that party, the member whose politics sit nearest the
 * party's platform is the one a caucus would still follow: an empty post is a
 * worse lie than an unusual leader.
 */
export declare function takeForCaucus(bench: readonly PersonRuntime[], free: (runtime: PersonRuntime) => boolean, party: UsMajorParty, platform: PartyBeliefs): PersonRuntime | undefined;
/**
 * Who holds the posts once they are seated, and the rapport each newcomer opens
 * at, as the tie effects that write it.
 */
export type SeatedLeadership = {
    readonly leadership: readonly HillFigure[];
    readonly ties: readonly TieEffect[];
};
/**
 * Seat the posts, keeping whoever still belongs where they are.
 *
 * Called at the founding, after a midterm has changed which caucus holds a
 * chamber, and when an old save is brought forward. An incumbent whose caucus
 * still matches their post keeps the seat *and their rapport*: a president
 * who spent a year building a relationship with the Speaker has not lost it
 * because the Senate changed hands.
 *
 * A pool with nobody eligible seats nobody, and that is a supported outcome
 * rather than a failure — it is what a campaign saved before these seats existed
 * genuinely contains, and every count still carries without them.
 */
/**
 * Whether a post's holder still sits in its chamber. A senator unseated at a
 * special election keeps no gavel and no leadership post; with no roster on
 * file (an old save, or the founding before members are seated) the post is
 * read as held.
 */
export declare function holdsSeat(congress: Congress, person: PersonId, chamber: Chamber): boolean;
export declare function seatLeadership(congress: Congress, people: Readonly<Record<string, PersonRuntime>>, nation: NationId, turn: number, signature?: DomesticSignature): SeatedLeadership;
/** The same, as the Congress it produces and the people whose ties it opened, for callers that hold both. */
export declare function withLeadership(congress: Congress, people: Readonly<Record<string, PersonRuntime>>, nation: NationId, turn: number): {
    readonly congress: Congress;
    readonly people: Readonly<Record<string, PersonRuntime>>;
};
/** The role a seated figure holds, for the person record that has to show it. */
export declare function hillSeats(leadership: readonly HillFigure[]): Readonly<Record<string, RoleId>>;
export type HillMember = {
    readonly state?: StateId;
    readonly figure: HillFigure;
    readonly post: HillPost;
    readonly person?: Person;
    /** The name a sentence uses: "Speaker Reyes", or the post alone if unstaffed. */
    readonly name: string;
};
/** The Hill as people, in the order the posts are listed. */
export declare function selectHill(campaign: Campaign): readonly HillMember[];
export declare function selectHillMember(campaign: Campaign, post: HillPostId): HillMember | undefined;
/** Everyone whose vote the president would have to move to change a count. */
export declare function selectHillByChamber(campaign: Campaign, chamber: Chamber): readonly HillMember[];
export {};
