import { type Charter, type RoleId } from "@admin/world";
import type { AlignmentVector, Campaign, ExecutiveOrderRecord, PendingRule, PersonRuntime } from "./state.js";
import { type OrderSubject } from "./order-subjects.js";
export { constructionOrderSubjects, energyLeasingOrderSubjects, entryClassOrderSubjects, federalSiteOrderSubjects, firstOrderSubject, grantOrderSubjects, leasePlanningArea, LEASE_PLANNING_AREAS, regulatoryReviewOrderSubjects, reliefOrderSubjects, type OrderSubject } from "./order-subjects.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { type PolicyStatPath } from "./policy.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { RungBand } from "./consequences.js";
import { type DomesticSignature } from "./domestic-signature.js";
import type { BenchMember } from "./judiciary.js";
import { type OrderReview } from "./order-review.js";
import { type OrderExecution } from "./execution.js";
import type { MetricDeltas } from "./effect-types.js";
export type OrderDomain = "security" | "economy" | "civil" | "emergency";
export type OrderRequirement = {
    readonly roleHints?: readonly string[];
    readonly needsEmergency?: boolean;
    readonly minStability?: number;
    /**
     * The clause that puts this act with Congress rather than with the office,
     * where the Constitution does. An order carrying one cannot be signed on the
     * President's own authority at all: a statute in force has to name it in
     * `authorizesOrders`. Held as the refusal sentence rather than as a flag, so a
     * president is told which provision closed it rather than told they lack a
     * capability when what they lack is the power.
     */
    readonly needsCongress?: string;
};
/**
 * The law an order runs on, as its card names it before the President signs.
 *
 * Catalogue data rather than campaign state: which statute carries an order is
 * a fact about the United States Code, and a save that kept a copy would
 * outlive the next amendment.
 */
export type OrderAuthority = {
    /**
     * Where the power comes from. `needs-act` is the honest answer for a power
     * the office has held only when Congress granted it: the card names the
     * statute that once did, and the order stays shut until one does again.
     */
    readonly kind: "constitution" | "statute" | "regulation" | "needs-act";
    /** The citation as a lawyer writes it. */
    readonly cite: string;
    /** The law by the name a reader knows it. */
    readonly name: string;
    /** What the authority does not reach, in one sentence. */
    readonly limit: string;
    /** The primary source the citation was checked against, and the day it was opened. */
    readonly source: string;
    readonly opened: string;
};
export type ExecutiveOrder = {
    readonly id: string;
    readonly name: string;
    readonly domain: OrderDomain;
    readonly summary: string;
    readonly requires: OrderRequirement;
    /**
     * How far past the ordinary writ of the office this reaches, 0..1. It is the
     * whole basis of the challenge: an order is not contested for being unpopular
     * or for being expensive, it is contested for being more than the office is
     * meant to be able to do alone.
     */
    readonly overreach: number;
    /**
     * What it costs in the 0..1 metrics, which are already relative and need no
     * denominator. The money is not here — see `treasuryOfGdp`.
     */
    readonly cost: MetricDeltas;
    /**
     * What it costs (negative) or raises (positive) as a share of the acting
     * nation's annual output.
     *
     * A flat treasury figure is a sum with no unit attached to anybody. The
     * United States founds on a treasury of roughly 2,470,000, so the −80 this
     * order used to charge was 0.003% of the federal accounts: a price on an act
     * of government that no president could see and none would ever weigh. As a
     * share of GDP the same order costs a small state and a superpower the same
     * fraction of what they have, which is the arithmetic the instrument ladder,
     * the policy catalogue and the tariff rung already price money in.
     */
    readonly treasuryOfGdp?: number;
    /**
     * What it does to the country, in the same closed sixteen-path vocabulary a
     * policy stance moves it in. An order is a one-off where a program is a
     * standing position, so this lands once rather than every week — but it lands
     * through the same clamping, against the same live stats, because a decree
     * and a statute change the same country.
     */
    readonly nationEffects: Partial<Record<PolicyStatPath, number>>;
    readonly alignment: Partial<AlignmentVector>;
    /**
     * Whether the substance of this order is a rule rather than a decree.
     *
     * A president who directs an agency to set a ceiling, tighten a standard or
     * open a program has not changed anything yet: the agency has to propose the
     * rule, take comment and issue a final one, and the country is untouched
     * until it does. A president who blocks a foreign government's accounts has
     * changed something the moment the page is signed, and the courts are the
     * only thing that can take it back.
     *
     * The two are genuinely different instruments and the difference is the
     * whole reason the unilateral track is not simply the fast way to govern:
     * what an order can do immediately is narrow, and what it can do broadly it
     * cannot do quickly.
     */
    readonly viaRulemaking?: true;
    /**
     * Whether this is excepted work — the narrow class the Antideficiency Act
     * itself carries through a lapse: activity necessary for the safety of human
     * life or the protection of property.
     *
     * Declared on the catalogue entry rather than inferred from the domain,
     * because it is a legal classification and not a severity. Disaster relief
     * runs on a no-year fund and genuinely continues while the government is
     * closed; a new surge of border checks funded out of the interior budget is a
     * fresh obligation and stops with everything else, however urgent the
     * administration finds it.
     */
    readonly excepted?: true;
    /**
     * Who this order hits at home. Declared on the catalogue entry, never
     * inferred from the summary. When present, `signOrder` splices
     * `routeDomestic` (and belief-split polarization) into the packet beside
     * the nation-stat and metric effects — the same compiler scenario replies
     * use, so a steel seizure and a steel-tariff reply leave the same kind of
     * mark on the same states.
     */
    readonly domestic?: DomesticSignature;
    /**
     * The statute or clause that lets a President sign this at all. Optional in
     * the type because it is checked at the desk rather than assumed: an order
     * with no authority behind it is refused, so a catalogue entry that forgot
     * its citation cannot be offered as though the office held the power.
     */
    readonly authority?: OrderAuthority;
};
/**
 * The catalogue. Code rather than dataset, for the reason the policy stances
 * are: these are rules with effects, and a save that carried a copy of them
 * would reload against a build that had since rebalanced them.
 *
 * Every entry is something a President of the United States has actually been
 * able to sign, and names the law that lets them. The four here keep the ids
 * statutes, pledges and old saves name; the rest of the families live in
 * order-families.ts. Detention without charge, a reporting blackout and
 * suspending the legislature are not here at all: no statute or clause gives
 * the office any of them, and 18 U.S.C. §4001(a) forbids the first outright.
 */
export declare const EXECUTIVE_ORDERS: readonly ExecutiveOrder[];
export declare const ORDER_DOMAIN_BAND: Readonly<Record<OrderDomain, RungBand>>;
export declare function orderDeed(band: RungBand, outcome: "landed" | "failed", turn: number): Effect;
export declare function executiveOrder(id: string): ExecutiveOrder | undefined;
/**
 * What an order actually costs this government, money included.
 *
 * The catalogue states the money as a share of output, so the sum only exists
 * once there is a country to take it out of. Exported because every surface
 * that quotes a price to the player has to quote this one: reading `cost` off
 * the catalogue entry now yields the metric lines and no money at all.
 */
export declare function orderCost(campaign: Campaign, order: ExecutiveOrder): MetricDeltas;
export type OrderAvailability = {
    readonly ok: true;
} | {
    readonly ok: false;
    readonly missing: string;
};
/** The refusal an emergency power gives in a quiet week, naming the act the declaration is made under. */
export declare const EMERGENCY_MISSING = "a war, or a national emergency declared under the National Emergencies Act";
/**
 * The chair that carries an order out: the department the charter's table
 * names, filled or not, and by hint among the seated chairs where it names none.
 */
export declare function orderChair(campaign: Campaign, order: ExecutiveOrder): RoleId | undefined;
/** The seated minister an order is signed through, if the charter seats one. */
export declare function orderMinister(campaign: Campaign, order: ExecutiveOrder): PersonRuntime | undefined;
/** Availability is distinct from a projection of whether a signable order survives review. */
export declare function orderAvailability(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): OrderAvailability;
export declare function availableOrders(campaign: Campaign): readonly ExecutiveOrder[];
/**
 * What a President can sign on the morning of the oath: the desk as it stands
 * that day, less every emergency power. A new administration has declared
 * nothing yet, and a power that opened only because a war happened to be
 * running at the transition would be one the President never chose to claim.
 */
export declare function dayOneOrders(campaign: Campaign): readonly ExecutiveOrder[];
export type OrderProjection = {
    readonly order: ExecutiveOrder;
    readonly challengeChance: number;
    readonly mechanism: Charter["removalMechanism"];
    readonly cost: MetricDeltas;
    readonly accumulated: number;
    readonly minister?: PersonRuntime;
    /** Which of the three grounds the President is standing on this week. */
    readonly ground: ConstitutionalGround;
    /** The act carrying it, by the title the record keeps, where one does. */
    readonly authorizedBy?: string;
    /** The one-line reason the challenge odds are what they are. */
    readonly reasoning: string;
    /** The Attorney General's review, where the order reaches far enough past the office to get one. */
    readonly review?: OrderReview;
    /** How fast the chair writing the rule moves on it, where the order is a rule. */
    readonly execution?: OrderExecution;
};
/**
 * What the player reads before signing. Pure and seed-independent, the same
 * contract `projectAction` holds: `signOrder` calls this and nothing else to
 * decide the odds, so the number shown is the number rolled against.
 */
export declare function projectOrder(campaign: Campaign, charter: Charter, order: ExecutiveOrder): OrderProjection;
export type OrderResult = {
    readonly ok: false;
    readonly reason: string;
    readonly missing: string;
} | {
    readonly ok: true;
    readonly projection: OrderProjection;
    readonly contested: boolean;
    readonly record: ExecutiveOrderRecord;
    readonly packet: EffectPacket;
};
/**
 * Sign it. The draw is seeded on (campaign seed, order, turn), so a replay of
 * the same campaign signs the same orders to the same answers, and signing a
 * different order first cannot change the roll on this one.
 */
export declare function signOrder(campaign: Campaign, charter: Charter, orderId: string, streams: RngStreams, subject?: OrderSubject): OrderResult;
/** How long a challenge takes to be heard and ruled on. */
export declare const JUDICIAL_REVIEW_TURNS = 6;
export type { BenchMember };
/**
 * The part of an order the national books read: its movements on the economy's
 * own paths, landed the way the signature lands them. A price row prices these
 * and nothing else, so it cannot quote an order's security or standing effects
 * as money.
 */
export declare function orderFiscalEffects(campaign: Campaign, order: ExecutiveOrder): readonly Effect[];
/**
 * How long a rule takes from the signature to the day it binds anybody.
 *
 * Notice, a comment period, and a final rule. The real median is closer to a
 * year than to six weeks; this is the same clock a challenge runs on, which
 * keeps the two instruments legible against each other — the courts and the
 * agency come back at about the same time — and is already long enough to make
 * the unilateral track something a president has to start early rather than
 * something they reach for in the week the trouble arrives.
 */
export declare const RULEMAKING_TURNS = 6;
/**
 * Where this order's proceeding stands, for a screen that shows the clock.
 *
 * Keyed on the order rather than on the signature that started it, because
 * that is the question a desk actually asks: the player is looking at a
 * catalogue entry and wants to know whether one of these is already running.
 * The same order may have been signed more than once across a term, so the
 * newest signature wins — an old canceled proceeding is not what the clock on
 * the page is about.
 */
export declare function latestRuleForOrder(campaign: Campaign, orderId: string): PendingRule | undefined;
