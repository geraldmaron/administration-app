import type { StateId } from "@admin/world";
import type { Campaign, ConditionKind, GovernorStanding, PendingClaim } from "./state.js";
import type { EffectPacket } from "./effects.js";
import { type CoercionRisk } from "./domestic-coercion.js";
export type LocaleActId = "relief" | "request-deployment" | "federalize" | "waiver" | "review" | "agents" | "troops" | "surveil";
export type LocaleAct = {
    readonly id: LocaleActId;
    readonly name: string;
    readonly summary: string;
    /** Whether the act needs a declared emergency reaching this state. */
    readonly needsDeclaration: boolean;
    /** Whether the seated governor has to agree for it to happen at all. */
    readonly needsGovernorAssent: boolean;
    /**
     * Whether the act needs a statutory predicate beyond a declared emergency:
     * `guard` is an unavailable military-authority pathway; `request` is the Stafford
     * Act's requirement that the state ask first, `disorder` that the matter is
     * unrest: agents and collection are answers to a crowd, not to a flood.
     */
    readonly predicate?: "guard" | "request" | "disorder";
    /** Whether taking it discharges the state's open relief claim. */
    readonly answersClaim: boolean;
    /**
     * What it obligates, as a share of national output per use, the way every
     * other priced act in the engine states money.
     *
     * These used to be flat figures — 60, 80, 25 — justified against an
     * `order-relief-program` that charged 350. That order has not charged a flat
     * figure since orders.ts abandoned the unit on the grounds that "the −80 this
     * order used to charge was 0.003% of the federal accounts: a price on an act
     * of government that no president could see and none would ever weigh". The
     * locale acts went on charging exactly those invisible numbers against a
     * benchmark that had been deleted.
     */
    readonly treasuryOfGdp: number;
    /** Standing paid at home for reaching this far into a state's own business. */
    readonly standingCost: number;
    /** See `ExecutiveOrder.excepted` — work that continues through a lapse. */
    readonly excepted?: true;
    /**
     * Force or surveillance pointed at Americans: the chance something goes
     * wrong and how hard it lands, before the run of earlier acts raises both.
     * See `domestic-coercion.ts`.
     */
    readonly coercion?: CoercionRisk;
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
/** How long a federal review pushes a claim's deadline out. Once only; see `deferClaims`. */
export declare const REVIEW_DEFERRAL_TURNS = 3;
export type LocaleAvailability = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly missing: string;
};
/**
 * Whether the governor will go along with an act that needs them.
 *
 * Read off `GovernorStanding`, which founding seats and
 * which nothing has ever consulted for a decision. A governor disposed against
 * the administration refuses, and refusing is what makes federalizing the only
 * remaining road — at its own price.
 */
export declare const GOVERNOR_ASSENT_FLOOR = 0.45;
export declare function governorAssents(governor: GovernorStanding | undefined): boolean;
/** What one use of an act obligates, resolved against the country paying for it. */
export declare function localeActCost(campaign: Campaign, act: LocaleAct): number;
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
export type LocaleActResult = {
    readonly ok: true;
    readonly packet: EffectPacket;
} | {
    readonly ok: false;
    readonly reason: string;
};
/**
 * Take one act against one state, over one condition kind.
 *
 * An act that answers discharges the claim without a mark; the others cost
 * their price and leave the obligation standing, which is the honest outcome —
 * a waiver is not an answer, and the state goes on waiting.
 */
export declare function takeLocaleAct(campaign: Campaign, id: StateId, actId: LocaleActId, cause: ConditionKind): LocaleActResult;
/** Standing paid for force or collection with no unrest to answer, as a multiple of the act's own. */
export declare const UNPROVOKED_STANDING = 2;
/** A second entry point cannot waive the ordinary authority boundary. */
export declare function homeActAvailability(campaign: Campaign, id: StateId, act: LocaleAct): LocaleAvailability;
/** Force or collection sent into a state on the President's own initiative, with no unrest to answer. */
export declare function takeHomeAct(campaign: Campaign, id: StateId, actId: LocaleActId): LocaleActResult;
/**
 * Whether this state is currently asking for something.
 *
 * The player-facing half of the obligation ledger: a governor's request is a
 * claim, and this is how a surface asks whether one is open.
 */
export declare function openRequests(campaign: Campaign, id: StateId): readonly PendingClaim[];
