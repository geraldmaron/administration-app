import { type Charter, type RoleId } from "@admin/world";
import type {
  AlignmentVector,
  Campaign,
  ExecutiveOrderRecord,
  PendingRule,
  PersonRuntime,
} from "./state.js";
import { selectCabinetHolder } from "./state.js";
import { activeExternalEmergency } from "./external-emergency.js";
import { answerReliefClaims } from "./obligations.js";
import { constructionNotice, constructionTransferAmount, firstOrderSubject, inEmergency, orderSubjectRefusal, reliefAllocation, type OrderSubject } from "./order-subjects.js";
import { assetBlockingEffects, blockedAssetForOrder } from "./blocked-assets.js";
export { constructionOrderSubjects, energyLeasingOrderSubjects, entryClassOrderSubjects, federalSiteOrderSubjects, firstOrderSubject, grantOrderSubjects, leasePlanningArea, LEASE_PLANNING_AREAS, regulatoryReviewOrderSubjects, reliefOrderSubjects, type OrderSubject } from "./order-subjects.js";
import { inShutdown, obligationAvailability } from "./funding.js";
import { DEFENSE_PRIORITY_CLASS, DEFENSE_PRIORITY_SUPPLIER, hasLiveDefensePriorityContract, munitionContractBook, munitionsOf, priorityOrder } from "./munitions.js";
import type { Effect, EffectPacket } from "./effects.js";
import type { RngStreams } from "./rng.js";
import { matchRole } from "./stewardship.js";
import { orderDepartment } from "./department-ownership.js";
import { playerGdp, type PolicyStatPath } from "./policy.js";
import { constitutionalGround, lawAuthorizesOrder, lawBlocksOrder } from "./legislation.js";
import type { ConstitutionalGround } from "./legislative-acts.js";
import type { RungBand } from "./consequences.js";
import { deedFlag } from "./deeds.js";
import { markedFlags } from "./marked-flags.js";
import { routeDomestic, type DomesticSignature } from "./domestic-signature.js";
import { routeCohorts } from "./route-cohorts.js";
import { beliefSplitEffects } from "./party-beliefs.js";
import type { BenchMember } from "./judiciary.js";
import { accumulatedOverreach, groundFactor, institutionalCheck, ministerSway } from "./strike-odds.js";
import { FURTHER_US_ORDERS } from "./order-families.js";
import { overruledReview, reviewedChance, reviewOrder, type OrderReview } from "./order-review.js";
import { campaignDay } from "./clock.js";
import { carryOutOrder, type OrderExecution } from "./execution.js";
import { openedProceeding } from "./court-procedure.js";
import { orderLandingEffects, realizedOrderContribution } from "./order-contribution.js";
import { agencyRuleProcess, specializedMatter } from "./specialized-court-matters.js";
import type { DeltaMetricKey, MetricDeltas } from "./effect-types.js";

// The instrument the player points at their own country.
// An executive order is that act. It is a domestic instrument and is priced
// like a foreign one: what it costs and how likely it is to be contested are
// both shown before it is signed, out of the same estimator the resolution
// uses, so a projection that misrepresents the outcome is impossible by
// construction rather than by discipline.
//
// What makes it a different kind of risk from a foreign instrument is who
// pushes back. A démarche that fails costs standing with one capital; an order
// that is contested is the player's own assembly or judiciary refusing them,
// and the mechanism it refuses through is the charter's own removal path. An
// administration that governs by decree is building the case against itself,
// which is the point: overreach compounds, and the compounding is visible.

export type OrderDomain = "security" | "economy" | "civil" | "emergency";

export type OrderRequirement = {
  // Role-id hints, matched the way the instrument stewards are matched: role
  // ids are charter-authored strings, not a fixed enum.
  readonly roleHints?: readonly string[];
  // Emergency powers exist only while there is an emergency. An order gated
  // this way cannot be signed in a quiet week at all, which is what stops the
  // heaviest instruments being the ordinary ones.
  readonly needsEmergency?: boolean;
  // Below this, the state has not got the grip to enforce what it is ordering.
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
export const EXECUTIVE_ORDERS: readonly ExecutiveOrder[] = [
  {
    id: "order-border-controls",
    name: "Tighten border controls",
    domain: "security",
    summary: "Direct additional admissibility checks at federal ports of entry, subject to agency capacity and appropriations.",
    requires: { roleHints: ["interior", "security", "home"] },
    overreach: 0.2,
    cost: {},
    // ~$5.5B: the marginal surge in checks at every crossing, not the agency
    // that runs them — real customs appropriations are already in the baseline.
    treasuryOfGdp: -0.0002,
    nationEffects: { "security.borderControl": 0.03 },
    alignment: { authLibertarian: 0.1, nationalistGlobalist: 0.15 },
    viaRulemaking: true,
    domestic: {
      channels: { immigration: -0.35 },
      magnitude: "light",
      signature: "order:border-controls",
      reason: "More checks at every crossing fall on people crossing and the families waiting on them.",
    },
    authority: {
      kind: "statute",
      cite: "8 U.S.C. §1103(a)(5)",
      name: "The Immigration and Nationality Act",
      limit: "Enforces the entry laws as Congress wrote them; it adds no new ground to turn anyone away.",
      source: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title8-section1103&num=0&edition=prelim",
      opened: "2026-09-29",
    },
  },
  {
    id: "order-price-controls",
    name: "Freeze prices and wages",
    domain: "economy",
    summary: "A ninety-day freeze on prices, rents and wages, under a statute Congress has passed for the purpose.",
    requires: {
      roleHints: ["treasury", "finance", "economy"],
      minStability: 0.4,
      needsCongress:
        "an act of Congress granting the power, as the Economic Stabilization Act of 1970 did; no standing statute lets a President fix prices, and that one expired in 1974",
    },
    overreach: 0.35,
    cost: {},
    // ~$14B: enforcement plus the subsidies that hold a ceiling in place. The
    // real price of a freeze is the market distortion, and that is carried by
    // `nationEffects` rather than by this line.
    treasuryOfGdp: -0.0005,
    nationEffects: { "economy.inflation": -0.02, "economy.growth": -0.01, "politics.protestPressure": -0.04 },
    alignment: { economicLeftRight: -0.3 },
    domestic: {
      sectors: ["agriculture"],
      magnitude: "moderate",
      signature: "order:price-controls",
      reason: "Staple ceilings land hardest where the farms are.",
    },
    authority: {
      kind: "needs-act",
      cite: "Pub. L. 91-379, tit. II, §202, 84 Stat. 799",
      name: "The Economic Stabilization Act of 1970",
      limit: "Lapsed in 1974; a freeze needs Congress to grant the power again before it can be signed.",
      source: "https://www.govinfo.gov/content/pkg/STATUTE-84/pdf/STATUTE-84-Pg796.pdf",
      opened: "2026-09-29",
    },
  },
  {
    id: "order-asset-seizure",
    name: "Block a hostile government's assets",
    domain: "emergency",
    summary: "Property of a foreign threat held in the United States is frozen, and Americans are barred from dealing in it.",
    requires: { roleHints: ["treasury", "finance", "economy"], needsEmergency: true },
    overreach: 0.3,
    // No money: blocking is not a taking. The property stays its owners' and
    // stays where it is; what the government spends is standing abroad.
    cost: { standing: -0.02 },
    nationEffects: {},
    alignment: { nationalistGlobalist: 0.2, authLibertarian: 0.1 },
    authority: {
      kind: "statute",
      cite: "50 U.S.C. §1702(a)(1)(B)",
      name: "The International Emergency Economic Powers Act",
      limit: "Only against a threat from abroad, and only while a national emergency declared over it stands (§1701).",
      source: "https://www.govinfo.gov/link/uscode/50/1702",
      opened: "2026-10-12",
    },
  },
  {
    id: "order-relief-program",
    name: "Direct relief to the affected regions",
    domain: "civil",
    summary: "Direct appropriated disaster relief to one state that has requested federal help.",
    requires: {},
    overreach: 0.15,
    cost: { stability: 0.06 },
    // The recovery act already books the outlays. This order allocates that
    // authority to one declared disaster; it creates no second appropriation.
    nationEffects: { "politics.protestPressure": -0.005 },
    alignment: { economicLeftRight: -0.2 },
    domestic: {
      federal: 1,
      magnitude: "moderate",
      signature: "order:relief-program",
      reason: "Federal disaster relief helps the state that requested it.",
    },
    authority: {
      kind: "statute",
      cite: "42 U.S.C. §5170",
      name: "The Stafford Disaster Relief and Emergency Assistance Act",
      limit: "Answers a governor's request over a disaster beyond what the state can meet.",
      source: "https://www.govinfo.gov/link/uscode/42/5170",
      opened: "2026-10-12",
    },
  },
  ...FURTHER_US_ORDERS,
];

// An order has no rung to read a `RungBand` off, so the band is fixed to
// `OrderDomain` instead: `civil` is the ordinary business of running
// a country, `security` and `economy` reach further, and `emergency` — which
// cannot even be signed outside a declared emergency — is the top of the
// ladder. It is a closed authored field read straight off the catalogue
// above, not a judgment this file makes per order.
export const ORDER_DOMAIN_BAND: Readonly<Record<OrderDomain, RungBand>> = {
  civil: "low",
  security: "mid",
  economy: "mid",
  emergency: "high",
};

// An executive order is signed against the player's own country — it names
// no counterparty nation, unlike every instrument on the four foreign
// ladders. So only the unbound `deed:order:...` form is ever stamped here:
// `deedTowardFlag` demands a nation, and the only candidate for one would be
// the player's own, which is exactly the case `deeds.ts`'s bound-form
// invariant forbids (the nation on a bound flag is always the counterparty,
// never this government). There is no `deed-from:` either — `order` is not
// in `RECEIVED_DEED_FAMILIES`, because no foreign capital signs one of these.
export function orderDeed(band: RungBand, outcome: "landed" | "failed", turn: number): Effect {
  return { kind: "flag", set: markedFlags([deedFlag("order", band, outcome)], turn) };
}

const BY_ID = new Map(EXECUTIVE_ORDERS.map((order) => [order.id, order]));

export function executiveOrder(id: string): ExecutiveOrder | undefined {
  return BY_ID.get(id);
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * What an order actually costs this government, money included.
 *
 * The catalogue states the money as a share of output, so the sum only exists
 * once there is a country to take it out of. Exported because every surface
 * that quotes a price to the player has to quote this one: reading `cost` off
 * the catalogue entry now yields the metric lines and no money at all.
 */
export function orderCost(campaign: Campaign, order: ExecutiveOrder): MetricDeltas {
  if (order.treasuryOfGdp === undefined) return order.cost;
  return { ...order.cost, treasury: Math.round(order.treasuryOfGdp * playerGdp(campaign)) };
}

// --- Availability ---

export type OrderAvailability = { readonly ok: true } | { readonly ok: false; readonly missing: string };

/** The refusal an emergency power gives in a quiet week, naming the act the declaration is made under. */
export const EMERGENCY_MISSING = "a war, or a national emergency declared under the National Emergencies Act";

/**
 * The chair that carries an order out: the department the charter's table
 * names, filled or not, and by hint among the seated chairs where it names none.
 */
export function orderChair(campaign: Campaign, order: ExecutiveOrder): RoleId | undefined {
  const tabled = orderDepartment(campaign.founding.charter, order.id);
  if (tabled !== undefined || !order.requires.roleHints) return tabled;
  return matchRole(Object.keys(campaign.player.cabinet) as RoleId[], order.requires.roleHints);
}

/** The seated minister an order is signed through, if the charter seats one. */
export function orderMinister(campaign: Campaign, order: ExecutiveOrder): PersonRuntime | undefined {
  if (!order.requires.roleHints) return undefined;
  const role = orderChair(campaign, order);
  if (!role) return undefined;
  const holder = selectCabinetHolder(campaign, role);
  return holder && holder.alive ? holder : undefined;
}

/** Availability is distinct from a projection of whether a signable order survives review. */
export function orderAvailability(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): OrderAvailability {
  if (campaign.orders.some((record) => record.id === orderRecordId(order.id, campaign.turn, subject))) {
    return { ok: false, missing: "a new week before signing this order for the same subject again" };
  }
  // Statute first. An act of Congress does not make an order likely to be
  // struck down, it makes it something the President cannot sign at all, and
  // collapsing the two would price a law as a risk.
  const barred = lawBlocksOrder(campaign, order.id);
  if (barred) return { ok: false, missing: `an order ${barred.title} has not already forbidden` };
  if (!order.authority) return { ok: false, missing: "a statute or a clause of the Constitution that grants it" };
  const subjectRefusal = orderSubjectRefusal(campaign, order.id, subject);
  if (subjectRefusal) return { ok: false, missing: subjectRefusal };
  if (order.id === "order-defense-production") {
    if (hasLiveDefensePriorityContract(campaign))
      return { ok: false, missing: "completion or end of the existing named defense priority while its contracted backlog remains outstanding" };
    if (!priorityOrder(campaign)) return { ok: false, missing: "an outstanding federal precision-fires replenishment order" };
    if (campaign.turn > campaign.congress.appropriation.throughTurn || inShutdown(campaign)
      || (campaign.player.budget.military ?? 0) <= 0
      || (campaign.nations[campaign.founding.nation]?.stats.military.budget ?? 0) <= 0)
      return { ok: false, missing: "a live defense appropriation and funded procurement line" };
  }
  if (order.requires.needsEmergency && order.id !== "order-asset-seizure" && !inEmergency(campaign)) {
    return { ok: false, missing: EMERGENCY_MISSING };
  }
  if (order.requires.needsCongress && !lawAuthorizesOrder(campaign, order.id)) {
    return { ok: false, missing: order.requires.needsCongress };
  }
  if (order.requires.minStability !== undefined && campaign.player.metrics.stability < order.requires.minStability) {
    // The threshold is not quoted: it is a scalar in the simulation's own units,
    // and a President told they need "stability of at least 0.40" has been
    // handed the model's arithmetic instead of the government's reason.
    return { ok: false, missing: "the grip on the country it would take to enforce" };
  }
  if (order.requires.roleHints && !orderMinister(campaign, order)) {
    return { ok: false, missing: "a living Secretary in the chair that would carry it out" };
  }
  // The money, last, because it is the one refusal that reads as an accounting
  // fact rather than a constitutional one — and because a president told "you
  // have no Secretary for this" is better served by that sentence than by the
  // balance. An order that raises money rather than spending it is not an
  // obligation and is never asked about.
  const money = orderCost(campaign, order).treasury ?? 0;
  if (money < 0) {
    const funded = obligationAvailability(campaign, -money, { excepted: order.excepted });
    if (!funded.ok) return funded;
  }
  return { ok: true };
}

export function availableOrders(campaign: Campaign): readonly ExecutiveOrder[] {
  return EXECUTIVE_ORDERS.filter((order) => orderAvailability(campaign, order, firstOrderSubject(campaign, order.id)).ok);
}

/**
 * What a President can sign on the morning of the oath: the desk as it stands
 * that day, less every emergency power. A new administration has declared
 * nothing yet, and a power that opened only because a war happened to be
 * running at the transition would be one the President never chose to claim.
 */
export function dayOneOrders(campaign: Campaign): readonly ExecutiveOrder[] {
  return availableOrders(campaign).filter((order) => !order.requires.needsEmergency);
}

// --- The challenge ---

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

const MIN_CHALLENGE = 0.02;
const MAX_CHALLENGE = 0.95;

/**
 * What the player reads before signing. Pure and seed-independent, the same
 * contract `projectAction` holds: `signOrder` calls this and nothing else to
 * decide the odds, so the number shown is the number rolled against.
 */
export function projectOrder(campaign: Campaign, charter: Charter, order: ExecutiveOrder): OrderProjection {
  const minister = orderMinister(campaign, order);
  const accumulated = accumulatedOverreach(campaign);
  const ground = constitutionalGround(campaign, order.id);
  const authorizing = ground === "authorized" ? lawAuthorizesOrder(campaign, order.id) : undefined;
  // The statute discounts the reach past the office and leaves the record alone:
  // a president refused four times is one the institutions have taken the
  // measure of, and an act of Congress does not undo that.
  const reach = order.overreach * institutionalCheck(charter) * groundFactor(ground);
  const review = reviewOrder(campaign, order, { reach, accumulated, ground });
  const execution = carryOutOrder(campaign, order, orderChair(campaign, order), RULEMAKING_TURNS);
  const chance = reviewedChance(
    clamp01(Math.max(MIN_CHALLENGE, Math.min(MAX_CHALLENGE, (reach + accumulated) * ministerSway(minister)))),
    review,
    MAX_CHALLENGE,
  );
  return {
    order,
    challengeChance: chance,
    mechanism: charter.removalMechanism,
    cost: orderCost(campaign, order),
    accumulated,
    ground,
    ...(minister ? { minister } : {}),
    ...(authorizing ? { authorizedBy: authorizing.title } : {}),
    reasoning: reasoningFor(ground, authorizing?.title, accumulated),
    ...(review ? { review } : {}),
    ...(execution ? { execution } : {}),
  };
}

/**
 * Why the odds read as they do, in the vocabulary of the three grounds. The
 * authorized case names the act, because that is the whole content of the
 * ground: a player who cannot see which statute is carrying the order cannot
 * tell a strong position from a lucky one.
 *
 * The charter's own name reads badly as a possessive ("The Constitution of the
 * United States's institutions"), so the silent case names the bodies that
 * actually weigh an order instead: the courts and the legislature.
 */
function reasoningFor(ground: ConstitutionalGround, title: string | undefined, accumulated: number): string {
  if (ground === "authorized" && title) {
    return `${title} puts Congress behind this, and the courts weigh an order the legislature asked for far more gently than one it never spoke to.`;
  }
  return accumulated > 0
    ? "Congress has said nothing about this, so the courts and the legislature read it as reaching past the office — and this administration has been told so before."
    : "Congress has said nothing about this, so the courts and the legislature weigh how far it reaches past the office on their own.";
}

// --- Signing ---
function orderRecordId(orderId: string, turn: number, subject?: OrderSubject): string {
  const target = subject?.kind === "foreign" || subject?.kind === "entry-class" ? subject.nation : subject?.kind === "state" ? subject.state
    : subject?.kind === "grant" ? subject.billId : subject?.kind === "construction" ? subject.sourceId
      : subject?.kind === "rule-review" ? subject.ruleId : subject?.kind === "lease-planning" ? subject.areaId : undefined;
  const key = subject?.kind === "federal-site" ? subject.institutionId : target;
  return key ? `${orderId}:${key}:${turn}` : `${orderId}:${turn}`;
}
export type OrderResult =
  | { readonly ok: false; readonly reason: string; readonly missing: string }
  | {
      readonly ok: true;
      readonly projection: OrderProjection;
      readonly contested: boolean;
      readonly record: ExecutiveOrderRecord;
      readonly packet: EffectPacket;
    };

/** What being refused by your own institutions costs, on top of the order. */
const CONTEST_COST: MetricDeltas = { stability: -0.05, standing: -0.06 };

function narrate(order: ExecutiveOrder, contested: boolean, mechanism: Charter["removalMechanism"]): string {
  if (!contested) {
    return order.viaRulemaking
      ? `${order.name} is signed, and the departments are directed to write the rule.`
      : `${order.name} is signed and takes effect.`;
  }
  return `${order.name} is signed, and challenged — the ${mechanism.replace("-", " ")} process now has one more count against this government.`;
}

// Takes the already-resolved cost rather than the order: the catalogue entry
// carries the money as a share of output, and spreading that key in here would
// put an unrecognized metric into the packet.
function mergedCost(cost: MetricDeltas, contested: boolean): MetricDeltas {
  if (!contested) return cost;
  const merged: MetricDeltas = { ...cost };
  for (const [key, delta] of Object.entries(CONTEST_COST) as [DeltaMetricKey, number][]) merged[key] = (merged[key] ?? 0) + delta;
  return merged;
}

/**
 * Sign it. The draw is seeded on (campaign seed, order, turn), so a replay of
 * the same campaign signs the same orders to the same answers, and signing a
 * different order first cannot change the roll on this one.
 */
export function signOrder(campaign: Campaign, charter: Charter, orderId: string, streams: RngStreams, subject?: OrderSubject): OrderResult {
  const order = executiveOrder(orderId);
  if (!order) return { ok: false, reason: `no executive order "${orderId}"`, missing: "a known order" };
  const availability = orderAvailability(campaign, order, subject);
  if (!availability.ok) {
    return { ok: false, reason: `${order.name} cannot be signed: missing ${availability.missing}`, missing: availability.missing };
  }

  const projection = projectOrder(campaign, charter, order);
  const contested = streams.stream("executive-order", orderId, campaign.turn).next() < projection.challengeChance;
  const effectiveTurn = campaign.turn + RULEMAKING_TURNS + (projection.execution?.addedWeeks ?? 0);
  const process = agencyRuleProcess(orderId, effectiveTurn - campaign.turn, projection.execution);
  const independentlyFiled = (orderId === "order-energy-leasing" && Boolean(process && (!process.commentsAnswered || !process.siteReviewPreserved)))
    || orderId === "order-entry-suspension"
    || (orderId === "order-emergency-construction" && subject?.kind === "construction"
      && Boolean(campaign.militaryConstructionProjects?.find((project) => project.id === subject.sourceId)?.hostState));
  const resolvedSubject = orderId === "order-border-controls" && subject === undefined
    ? { kind: "ports-of-entry" as const, scope: "all-federal-ports" as const }
    : subject?.kind === "foreign"
    ? { ...subject, declarationId: activeExternalEmergency(campaign, subject.nation)!.id }
    : subject?.kind === "construction"
      ? { ...subject, amount: constructionTransferAmount(campaign, subject.sourceId, subject.declarationId) }
      : subject?.kind === "state"
        ? { ...subject, amount: reliefAllocation(campaign, subject.billId) }
      : subject;
  const record: ExecutiveOrderRecord = {
    id: orderRecordId(orderId, campaign.turn, subject),
    order: orderId,
    ...(orderId === "order-defense-production" && priorityOrder(campaign)
      ? { defenseContract: { supplier: DEFENSE_PRIORITY_SUPPLIER, munitionClass: DEFENSE_PRIORITY_CLASS,
        initialIndex: priorityOrder(campaign)!.count, due: priorityOrder(campaign)!.arrives,
        provenance: "planning value" as const } } : {}),
    ...(resolvedSubject ? { subject: resolvedSubject } : {}),
    ...(resolvedSubject?.kind === "construction" ? { constructionNotice: constructionNotice(campaign,
      resolvedSubject.sourceId, resolvedSubject.declarationId, resolvedSubject.amount,
      `milcon-contract:${orderRecordId(orderId, campaign.turn, subject)}`) } : {}),
    turn: campaign.turn,
    ...(orderId === "order-price-controls" ? { sunsetDay: campaignDay(campaign) + 90 } : {}),
    contested,
    // The odds it was signed against, kept rather than recomputed: a
    // retrospective has to be able to say what the government knew when it
    // signed, and a later reading of the same order would use the record this
    // very signature added to.
    challengeChance: projection.challengeChance,
    ...(projection.review ? { legalReviewer: { person: projection.review.reviewer.base.id,
      reviewedDay: campaignDay(campaign) } } : {}),
    ...(!order.viaRulemaking ? { nationContribution: realizedOrderContribution(campaign, order.nationEffects) } : {}),
    // An independently filed statutory matter follows the same review clock.
    ...(contested || independentlyFiled ? { review: { dueTurn: orderId === "order-energy-leasing" ? effectiveTurn + 1 : campaign.turn + JUDICIAL_REVIEW_TURNS,
      status: "pending" as const } } : {}),
  };
  const ruleRecord: PendingRule | undefined = order.viaRulemaking ? { id: record.id, order: orderId,
    signedTurn: campaign.turn, effectiveTurn, status: "pending",
    ...(process ? { process } : {}) } : undefined;
  const courtMatter = specializedMatter(campaign, record, ruleRecord);
  const blockedAsset = orderId === "order-asset-seizure" && subject?.kind === "foreign"
    ? blockedAssetForOrder(campaign, subject.nation, record.id) : undefined;

  const counsel = overruledReview(projection.review);
  // An objection signed over is the decision that changed the most, so it is the
  // one the packet keeps; a rule's pace is still read off its own proceeding.
  const decision = counsel ? projection.review?.decision : projection.execution?.decision;
  const packet: EffectPacket = {
    source: "action",
    actor: "player",
    turn: campaign.turn,
    narration: { summary: narrate(order, contested, projection.mechanism) },
    ...(counsel ? { counsel } : {}),
    ...(decision ? { provenance: { origin: "decision" as const, entities: [orderId], decision } } : {}),
    effects: [
      { kind: "metric", deltas: mergedCost(projection.cost, contested) },
      { kind: "alignment", pull: order.alignment },
      // A contested order still changes the country: the challenge is a bill
      // the government pays, not an undo. What a court can reverse is a
      // question the removal arc answers, not this one.
      //
      // What the country is changed *by* is the other question, and it is the
      // one the rulemaking flag answers. A decree lands here; a rule lands
      // when the proceeding it starts finishes, weeks later, and until then
      // the only thing that has happened is that the government has spent the
      // money and the standing to start it.
      ...(order.viaRulemaking ? [] : orderLandingEffects(campaign, order.nationEffects, record.id)),
      ...(record.defenseContract ? [{ kind: "munitions" as const, set: {
        ...munitionsOf(campaign), us: { ...munitionsOf(campaign).us,
          [DEFENSE_PRIORITY_CLASS]: { ...munitionsOf(campaign).us[DEFENSE_PRIORITY_CLASS]!,
            onOrder: munitionContractBook(campaign, record.id) } } } }] : []),
      ...(blockedAsset ? assetBlockingEffects(campaign, blockedAsset) : []),
      ...(ruleRecord ? [{ kind: "pendingRule" as const, set: ruleRecord }] : []),
      ...orderDomesticEffects(campaign, order, subject),
      ...(order.id === "order-emergency-construction" && subject?.kind === "construction"
        ? [{ kind: "militaryConstructionProject" as const, set: { ...campaign.militaryConstructionProjects!.find((project) => project.id === subject.sourceId)!,
          status: "canceled" as const, redirected: resolvedSubject?.kind === "construction" ? resolvedSubject.amount : 0 } }]
        : []),
      ...(order.id === "order-relief-program" && subject?.kind === "state"
        ? [answerReliefClaims(campaign, subject.state, subject.cause)].filter((effect) => effect !== undefined)
        : []),
      { kind: "order", set: record },
      ...(record.review && orderId !== "order-energy-leasing" && orderId !== "order-entry-suspension" ? [{ kind: "courtProceeding" as const, set: openedProceeding(record.id, orderId, campaign.turn,
        courtMatter ? campaign.turn + 1 : record.review.dueTurn, courtMatter) }] : []),
      // Landed the moment it is signed, contested or not — a contested order
      // still changes the country this same packet (see the comment on
      // `mergedCost` above), so "landed" here answers "was it signed", not
      // "did it survive review". Whether it later gets struck down is a
      // separate fact `judicialReviewPhase` stamps for itself, weeks later.
      orderDeed(ORDER_DOMAIN_BAND[order.domain], "landed", campaign.turn),
    ],
  };
  return { ok: true, projection, contested, record, packet };
}

/**
 * Route the catalogue signature, if any, into state lean + marks, opinion, and
 * the people the order actually lands on.
 *
 * The cohort half was missing, and its absence was the reason the constituency
 * model saw almost nothing a president did: an order routed to fifty states and
 * to none of the sixteen cells the states are made of, so signing price
 * controls moved a map and left every household in the country with no memory
 * of it. `routeCohorts` reads the state effects that actually landed rather
 * than the signature alone, so the weighting follows who was moved.
 */
function orderDomesticEffects(campaign: Campaign, order: ExecutiveOrder, subject?: OrderSubject): readonly Effect[] {
  if (!order.domestic) return [];
  const all = routeDomestic(campaign, order.domestic);
  const routed = order.id === "order-relief-program" && subject?.kind === "state"
    ? all.filter((effect) => effect.state === subject.state)
    : all;
  return [
    ...routed,
    ...(order.id === "order-relief-program" ? [] : beliefSplitEffects(campaign, order.domestic)),
    ...routeCohorts(campaign, order.domestic, routed),
  ];
}

// --- Judicial review ---------------------------------------------------------
//
// A challenged order goes to a bench, and the bench comes back weeks later. It
// is the downstream half of what makes an order a decision: the unilateral
// track is faster and narrower than legislation precisely because it is
// reversible, and until the reversal existed the "faster" was free.

/** How long a challenge takes to be heard and ruled on. */
export const JUDICIAL_REVIEW_TURNS = 6;

export type { BenchMember };

/**
 * The part of an order the national books read: its movements on the economy's
 * own paths, landed the way the signature lands them. A price row prices these
 * and nothing else, so it cannot quote an order's security or standing effects
 * as money.
 */
export function orderFiscalEffects(campaign: Campaign, order: ExecutiveOrder): readonly Effect[] {
  const economic = Object.entries(order.nationEffects).filter(([path]) => path.startsWith("economy."));
  return orderLandingEffects(campaign, Object.fromEntries(economic));
}

// --- Rulemaking -------------------------------------------------------------
//
// A rule-shaped order does not change the country on the week it is signed; it
// starts a proceeding. The clock and the reader live here beside the signature
// that starts them, and the week the proceeding finishes — along with the
// resolution of disapproval that can unmake it — lives in rulemaking.ts, which
// needs the statute book this file must not read.

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
export const RULEMAKING_TURNS = JUDICIAL_REVIEW_TURNS;

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
export function latestRuleForOrder(campaign: Campaign, orderId: string): PendingRule | undefined {
  return [...campaign.pendingRules]
    .filter((rule) => rule.order === orderId)
    .sort((a, b) => b.signedTurn - a.signedTurn)[0];
}

