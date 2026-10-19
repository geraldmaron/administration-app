import { Person, type IdeologyVector, type LeaderAttributes, type LeaderBackground, type LeaderBackgroundId, type LeaderRoute, type LeaderRouteId, type NationId, type Party, type PersonId, type PersonTrait, type PortraitGenderPresentation, type RoleId, type StateId, type SchoolId } from "@admin/world";
import { type GoverningStyle, type LeadershipAnswers } from "./leadership-profile.js";
import type { AdministrationParty } from "./state-legislature.js";
/** What the player states about themselves at founding. */
export type LeaderDraft = {
    readonly name: string;
    readonly age: number;
    readonly backgroundId: LeaderBackgroundId;
    readonly routeId: LeaderRouteId;
    /** Signed, -1..1 per axis — the same vector every other person carries. */
    readonly ideology: IdeologyVector;
    /**
     * What the player runs as, chosen outright rather than derived.
     *
     * Kept independent of `ideology` on purpose: a conservative Democrat and a
     * liberal Republican are both people who have held this office, and a party
     * inferred from one economic slider could seat neither. Independent is a real
     * third answer, not the absence of one.
     */
    readonly party: AdministrationParty;
    /** Explicit biography, never an attribute bonus. Absent preserves the legacy career-derived school. */
    readonly schoolId?: SchoolId;
    /** An approach the player may review and edit; it uses the existing Person trait consumers. */
    readonly governingStyle?: GoverningStyle;
    /** Original questionnaire answers, retained even if the player edits the resulting positions. */
    readonly leadershipAnswers?: LeadershipAnswers;
    /**
     * A local image the player chose from their own device, if any. Held as the
     * URI the picker returned rather than as bytes: a save is a document, not an
     * asset bundle, and a missing file falls back to initials rather than
     * breaking the screen.
     */
    readonly portraitUri?: string;
    /**
     * The state the President calls home. It is where their birthplace is
     * drawn from and what a running mate is balanced against. Optional because
     * a draft that has not chosen one is still a person.
     */
    readonly homeState?: StateId;
    /** How the President presents, which picks the face drawn for them. */
    readonly presentation?: PortraitGenderPresentation;
    /** Only when the player states them; nothing infers pronouns from presentation. */
    readonly pronouns?: LeaderPronouns;
    /**
     * The face the player built, as a `face:` reference carrying the whole
     * genome, whose presentation has to agree with `presentation` where both are
     * given. A save from before the face builder holds a facet reference picked
     * from the old cast, whose age facet is replaced by the President's own age.
     */
    readonly portraitRef?: string;
};
export type LeaderPronouns = "she/her" | "he/him" | "they/them";
/**
 * The draft a founding opens on: the first authored career, taken by the first
 * authored route, at the midpoint of that career's age window, with no politics
 * declared. Everything except the name is a real starting position the player
 * edits — the name is deliberately blank, because a default name is the one
 * field a player would seal without noticing.
 */
export declare function defaultLeaderDraft(): LeaderDraft;
/** The sentinel `portraitRef` a composed leader carries — no facet catalogue entry exists for them. */
export declare const LEADER_PORTRAIT_REF = "portrait-player-leader";
/**
 * How far from the center the player's politics sit, 0..1.
 *
 * Conviction is the one thing the ideology sliders are allowed to buy. A leader
 * who holds hard positions reads as harder to move and easier to believe, and
 * pays for it in flexibility — which is the trade a conviction politician
 * actually makes.
 */
export declare function ideologyConviction(ideology: IdeologyVector): number;
/**
 * The five readings the chosen life produces.
 *
 * Exported on its own because the founding screen draws this while the player
 * is still choosing — the preview and the sealed campaign are the same call.
 */
export declare function deriveLeaderAttributes(draft: Pick<LeaderDraft, "age" | "ideology">, background: LeaderBackground, route: LeaderRoute): LeaderAttributes;
/** The dispositions the life leaves behind — career first, then route, then politics. */
export declare function deriveLeaderTraits(ideology: IdeologyVector, background: LeaderBackground, route: LeaderRoute): readonly PersonTrait[];
export type LeaderComposition = {
    readonly person: Person;
    readonly background: LeaderBackground;
    readonly route: LeaderRoute;
    readonly conviction: number;
};
export type LeaderRefusal = {
    readonly ok: false;
    readonly reason: string;
};
export type LeaderResult = ({
    readonly ok: true;
} & LeaderComposition) | LeaderRefusal;
/** The id a composed leader always carries, so a save has one stable player person. */
export declare function leaderPersonId(nation: NationId): PersonId;
export declare function composeLeader(draft: LeaderDraft, nation: NationId, nationName: string, leadRole: RoleId, parties?: readonly Party[]): LeaderResult;
