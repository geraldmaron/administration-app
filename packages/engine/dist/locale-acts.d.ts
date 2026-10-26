import { type Charter, type ForceAssetId, type MilitaryBranch, type StateId } from "@admin/world";
import type { Campaign, ConditionKind, OutlayFunction, PendingClaim } from "./state.js";
import type { CoercionRisk } from "./domestic-coercion.js";
import { type OrderAuthority, type OrderSubject } from "./orders.js";
import { type InsurrectionGround } from "./locale-missions.js";
export type LocaleActId = "relief" | "request-deployment" | "waiver" | "review" | "property-surge" | "immigration-operation" | "task-force" | "federalize" | "proclaim" | "troops" | "priority" | "surveil" | "surveil-under-order";
export type LocaleActGroup = "relief" | "enforcement" | "military" | "investigation";
/**
 * What has to be happening for the act to be an answer at all. `disorder` is
 * unrest in the state; `enforcement` is routine federal law, which runs in
 * every state whether or not anything is wrong there, so it is never read as
 * unprovoked.
 */
export type LocaleOccasion = "any" | "disorder" | "enforcement";
/** A mark the act leaves on the state, `opposed` only where the governor withheld assent. */
export type LocaleMark = {
    readonly valence: 1 | -1;
    readonly weight: number;
    readonly signature: string;
    readonly when: "always" | "opposed";
};
/** What the public reads into the act, `opposed` only where the governor withheld assent. */
export type LocaleOpinion = {
    readonly integrity?: number;
    readonly competence?: number;
    readonly polarize?: number;
    readonly when?: "opposed";
};
/** What the troop act and the proclamation change by the Insurrection Act section they rest on. */
export type LocaleTier = {
    readonly standingCost: number;
    readonly governor: {
        readonly opposed: number;
        readonly assenting: number;
    };
    readonly answersClaim: boolean;
    readonly mark?: LocaleMark;
    readonly opinion?: LocaleOpinion;
    /** The purpose the troop order states, past which the Posse Comitatus Act bars the troops. */
    readonly mission?: string;
};
export type LocaleAct = {
    readonly id: LocaleActId;
    readonly name: string;
    readonly summary: string;
    readonly group: LocaleActGroup;
    /** Whether the act needs a declared emergency reaching this state. */
    readonly needsDeclaration: boolean;
    /** Whether the seated governor has to agree for it to happen at all. */
    readonly needsGovernorAssent: boolean;
    readonly occasion: LocaleOccasion;
    /**
     * The statutory predicate beyond the occasion: `request` is the Stafford
     * Act's requirement that the state ask first, `federal-service` §12406's
     * three occasions, `insurrection` one of the Insurrection Act's, and
     * `proclaimed` a §254 proclamation already in force, and `court-order` a
     * FISA or Title III order granted for the state and still running.
     */
    readonly predicate?: "request" | "federal-service" | "insurrection" | "proclaimed" | "court-order";
    /** Whether taking it discharges the state's open relief claim; `with-assent` only where the governor agrees. */
    readonly answersClaim: boolean | "with-assent";
    /**
     * What it obligates up front, as a share of national output per use, the
     * way every other priced act in the engine states money. Force acts price a
     * surge at about $300k per loaded officer-year, a planning value.
     */
    readonly treasuryOfGdp: number;
    /** Standing paid at home for reaching this far into a state's own business. */
    readonly standingCost: number;
    /**
     * See `ExecutiveOrder.excepted` — work that continues through a lapse. Force
     * sent into a state to keep order is the "emergencies involving the safety
     * of human life or the protection of property" the Antideficiency Act
     * excepts (31 U.S.C. §1342), and so is its weekly bill.
     */
    readonly excepted?: true;
    /**
     * Force or surveillance pointed at Americans: the chance something goes
     * wrong and how hard it lands, before the run of earlier acts raises both.
     * See `domestic-coercion.ts`.
     */
    readonly coercion?: CoercionRisk;
    /** The law the act runs on, or for a refused act the law that closes it. */
    readonly authority?: OrderAuthority;
    /** The mission order the act signs; the troop act's depends on its tier. */
    readonly orderId?: string;
    /** What the mission is worth to the unrest it answers, and for how long. */
    readonly mission?: {
        readonly attention: number;
        readonly weeks: number;
    };
    /** National protest pressure moved: easing only where unrest reaches the state, inflaming always. */
    readonly protest?: number;
    /** A standing federal mission: USD millions a week, for a term, on one outlay line, with any formations it takes. */
    readonly commitment?: {
        readonly amountPerTurn: number;
        readonly weeks: number;
        readonly line: OutlayFunction;
        readonly forces?: {
            readonly branch: MilitaryBranch;
            readonly unitType: ForceAssetId;
            readonly count: number;
        };
    };
    /** The governor's step toward or away from the administration, by whether they assented. */
    readonly governor?: {
        readonly opposed: number;
        readonly assenting: number;
    };
    readonly mark?: LocaleMark;
    readonly opinion?: LocaleOpinion;
    readonly stability?: number;
    readonly readiness?: number;
    /** Scales protest, the opposed governor's step and the mark by the state's foreign-born share. */
    readonly reach?: "foreign-born";
    /** Refused by law in every case; kept so the desk can say which law. */
    readonly boundary?: true;
    readonly tiers?: Readonly<Record<InsurrectionGround, LocaleTier>>;
};
/**
 * Priced against `order-relief-program`, which is the *national* relief
 * program at 0.0015 of output — about $41B. Reaching one state costs a
 * fraction of reaching the whole country: direct relief to a single state is a
 * sixth of the national program, which is the order of magnitude of a real
 * state-level disaster supplemental, and a locale act that cost two-thirds of
 * the national program would make helping Michigan and helping America nearly
 * the same decision.
 */
export declare const LOCALE_ACTS: readonly LocaleAct[];
export declare function localeAct(id: LocaleActId): LocaleAct | undefined;
/** The law an act runs on: its own citation, or the mission order's it signs. */
export declare function localeActAuthority(act: LocaleAct): OrderAuthority | undefined;
/** The act as its tier changes it: the troop act and the proclamation read their Insurrection Act section. */
export declare function tieredLocaleAct(act: LocaleAct, ground: InsurrectionGround | undefined): LocaleAct;
/** The Insurrection Act section this act rests on now: the proclamation's for troops, this week's occasion for a proclamation. */
export declare function localeGround(campaign: Campaign, id: StateId, act: LocaleAct): InsurrectionGround | undefined;
/** The subject the act's mission order is signed for in this state. */
export declare function missionSubject(campaign: Campaign, id: StateId, act: LocaleAct): Extract<OrderSubject, {
    kind: "locale-mission";
}>;
/** How long a federal review pushes a claim's deadline out. Once only; see `deferClaims`. */
export declare const REVIEW_DEFERRAL_TURNS = 3;
export type LocaleAvailability = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly missing: string;
};
/** What one use of an act obligates, resolved against the country paying for it. */
export declare function localeActCost(campaign: Campaign, act: LocaleAct): number;
/** One investigative priority a week for each state: Justice keeps one record of the instruction per state and week. */
export declare function priorityDirectiveId(turn: number, id: StateId): string;
export declare function localeAvailability(campaign: Campaign, id: StateId, act: LocaleAct, cause?: ConditionKind): LocaleAvailability;
/**
 * What reaching into a state that has not asked costs at home.
 *
 * The Stafford Act runs the other way round: every request for a declaration is
 * made by the Governor, who has to have directed the state's own response
 * first. The game already models the asking — a governor's request is a claim —
 * and simply never consulted it. Unasked relief is not refused, because a
 * President who thinks a governor is failing their own people may act anyway;
 * it is charged, and it is charged hardest where the governor is most opposed,
 * because that is the one who will say so on television.
 */
export declare const UNREQUESTED_RELIEF_STANDING = 0.04;
export declare function unrequestedReliefCost(campaign: Campaign, id: StateId): number;
/** Push every open relief claim in this state further out, once. */
export declare function deferClaims(claims: readonly PendingClaim[], turn: number): readonly PendingClaim[];
/** Standing paid for force or collection with no unrest to answer, as a multiple of the act's own. */
export declare const UNPROVOKED_STANDING = 2;
/**
 * A second entry point cannot waive the ordinary authority boundary. The home
 * path takes coercive acts whose occasion is not `any`; it supplies no cause, so
 * an act that answers disorder is refused there, and routine enforcement is not.
 */
export declare function homeActAvailability(campaign: Campaign, id: StateId, act: LocaleAct): LocaleAvailability;
/** The charter the mission orders are signed under. */
export declare function playerCharter(campaign: Campaign): Charter | undefined;
/**
 * Whether this state is currently asking for something.
 *
 * The player-facing half of the obligation ledger: a governor's request is a
 * claim, and this is how a surface asks whether one is open.
 */
export declare function openRequests(campaign: Campaign, id: StateId): readonly PendingClaim[];
