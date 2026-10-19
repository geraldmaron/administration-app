import type { PersonId, RoleId } from "@admin/world";
import { type Campaign } from "./state.js";
import { type InstrumentId, type RungLevel } from "./instruments.js";
export { appetiteOnScale, instinctFor, type CounselRegister } from "./counsel-instinct.js";
import type { ConversationScript, ConversationTone, ReplyProjection } from "./conversations.js";
export type CounselStance = "for" | "against" | "wary";
/**
 * Why the stance, as a named driver the surface can phrase.
 *
 * The first three are the minister: the reply matches their instincts, cuts
 * against them, or the odds worry them more than the idea does. The last two
 * are the department they run — a cabinet officer does not only hold opinions,
 * they hold a budget, a staff and a mandate, and the most common objection in
 * a real room is not "I disagree" but "not out of my account".
 */
export type CounselReason = "instinct-for" | "instinct-against" | "thin-odds" | "department-stake" | "crowded-out";
/**
 * Whose business this course is, as the room would recognize it.
 *
 * The seat that would carry the course out, a seat with standing in this kind
 * of week, or a department watching from outside it. Emitted as structure
 * because the surface phrases a Treasury objection differently from an
 * Agriculture one, and because how loudly a minister speaks depends on whether
 * they are on their own ground.
 */
export type CounselStake = "owns" | "standing" | "outside";
/**
 * What the minister is actually giving a view on, said in structure.
 *
 * An opinion with no course attached can only ever be phrased against the
 * person holding it, which is how a cabinet came to have nine sentences for a
 * whole presidency: the same minister said the same words about a bomb threat,
 * a drought and a naval standoff, because the words had nothing else to be
 * about. The rung's catalogue name and the register a position was answered in
 * are the two facts a sentence can name without inventing one.
 */
export type CounselCourse = {
    readonly kind: "instrument";
    readonly instrument: InstrumentId;
    readonly rung: RungLevel;
    readonly name: string;
} | {
    readonly kind: "position";
    readonly tone: ConversationTone;
    /**
     * What kind of week this answer is an answer to. The register alone gives
     * five courses for a whole presidency, which is not enough for a minister
     * to say something different about a bomb threat and a drought; the class
     * is what the sentence is actually about. A slug, not a phrase — the words
     * belong to the surface.
     */
    readonly scenarioClass?: string;
} | {
    readonly kind: "join";
    readonly side: "beside" | "against";
};
export type CabinetCounsel = {
    readonly kind: "counsel";
    readonly role: RoleId;
    readonly person: PersonId;
    readonly name: string;
    readonly stance: CounselStance;
    readonly reason: CounselReason;
    readonly conviction: number;
    /** Which reply this is an opinion about — the other half of the key a phrasing varies on. */
    readonly reply: string;
    readonly course: CounselCourse;
    /** Whose business the course is, so a sentence can say whether they are on their own ground. */
    readonly stake: CounselStake;
} | {
    readonly kind: "vacant";
    readonly role: RoleId;
};
/**
 * Whose business the course is: the chair that would run it, a chair with
 * standing in the week, or a department outside it.
 *
 * The owner is whichever chair `counselRole` already routes the decision to, so
 * the seat the room asks first and the seat that carries the course are the
 * same seat by construction rather than by two tables agreeing.
 */
export declare function counselStake(campaign: Campaign, script: ConversationScript, reply: ReplyProjection, role: RoleId): CounselStake;
export declare function counselOnReply(campaign: Campaign, script: ConversationScript, reply: ReplyProjection): CabinetCounsel | undefined;
export declare function dissentingCounsel(campaign: Campaign, script: ConversationScript, reply: ReplyProjection): CabinetCounsel | undefined;
export declare function roomCounselOnReply(campaign: Campaign, script: ConversationScript, reply: ReplyProjection, limit?: number): readonly CabinetCounsel[];
/**
 * What every seated chair privately makes of one reply, an empty one read as
 * empty rather than skipped.
 *
 * The room the player is shown is a selection out of this — four voices, chosen
 * for standing and for disagreement. This is the whole cabinet, and it is what
 * a check on the room's plurality has to read: a Secretary who would have
 * opposed the course but was never called on is a different fact from a
 * Secretary who cannot oppose anything.
 */
export declare function cabinetViewsOnReply(campaign: Campaign, script: ConversationScript, reply: ReplyProjection): readonly CabinetCounsel[];
