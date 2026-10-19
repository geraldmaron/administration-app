import { SECTOR_LABELS, type Nation, type NationId } from "@admin/world";
import { acted, named, standingCommitment, tradeRegister } from "./instrument-records.js";
import { currencyBackstopFlag } from "./backstop.js";
import { markedFlags } from "./marked-flags.js";
import { GRANT_GROWTH_CAP, shockEffect } from "./external-shocks.js";
import { selectConditionsFor, selectRelationship, type NationCondition } from "./state.js";
import { selectConflictBetween } from "./conflicts.js";
import { borrowingCapacity, CREDIT_TO_LEND } from "./sovereign.js";
import type { Effect } from "./effects.js";
import { possessive, sentenceCase } from "./naming.js";
import { tradeSector } from "./trade-sectors.js";
import { denialMeasureKind, tradeEdgesWith } from "./trade.js";
import { fittingTariffStatute, imposeTariff } from "./tariff-orders.js";
import type { TradeSectorId } from "./trade-sectors.js";
import {
  PROJECTION_CAPS,
  jitter,
  liveNation,
  liveRelationship,
  notAlreadyStanding,
  projectionAccess,
  requireAll,
  requireAtLeast,
  requireTrue,
  tariffCompetence,
  type CapabilityCheck,
  type InstrumentContext,
  type InstrumentRung,
} from "./instrument-gates.js";

// The two ladders that move money rather than force or information: the
// economic one, which takes trade and reserves away from a government, and the
// assistance one, which gives them. Both write the trade register, the books'
// commitments and a target's economy, so they share their readers here and
// leave instruments.ts to assemble the ladder.

/**
 * How much of the actor's own export sector goes with an embargo.
 *
 * Read off the directed edge where one exists, so cutting off a major partner
 * costs more than cutting off a minor one, with a floor: no trade break is
 * free, and an edge the graph happens not to carry is not a country nobody
 * sold anything to.
 */
function embargoedShare(ctx: InstrumentContext): number {
  const dependence = selectRelationship(ctx.campaign, ctx.actor, ctx.target)?.tradeDependence ?? 0;
  return Math.min(0.25, Math.max(0.03, dependence));
}

function embargoSectorEffects(ctx: InstrumentContext): Effect[] {
  const share = embargoedShare(ctx);
  const exports = liveNation(ctx.campaign, ctx.target).stats.trade.topExports;
  return exports.flatMap((sector) => {
    const runtime = ctx.campaign.sectors[ctx.target]?.[sector];
    if (!runtime) return [];
    return [
      {
        kind: "sector" as const,
        nation: ctx.target,
        sector,
        deltas: {
          employment: -Math.max(1, Math.round(runtime.employment * share * 0.4)),
          laborPressure: Math.min(0.15, share * 0.5),
        },
        reason: `The embargo hits ${SECTOR_LABELS[sector].toLowerCase()} in ${named(ctx, ctx.target)}.`,
      },
    ];
  });
}

// --- Economic ladder: leverage requires an actual trade relationship (access) plus reserves to absorb the reply. ---

function tradeAccess(actor: Nation, target: NationId): CapabilityCheck {
  const dependence = actor.stats.trade.tradeDependence[target];
  return requireTrue(dependence !== undefined && dependence > 0, "a live trade channel with the target (no exposure to leverage)");
}

// A tenth: an increase, short of a ban, so a later increase can still stack
// until the register's ceiling. Receipts are not booked here. Customs already
// collect every week through selectCustomsReceipts once the measure is on the
// register, and a second share of GDP in this packet would count that money twice.
const TARIFF_INCREASE_RATE = 0.1;

function tariffSector(ctx: InstrumentContext): TradeSectorId | undefined {
  return tradeEdgesWith(ctx.campaign, ctx.target).find(
    (edge) => tradeSector(edge.sector)?.instrument === "tariff",
  )?.sector;
}

// An American tariff rests on a statute whose finding holds. Another capital's
// tariff schedule is its own business and is not checked here.
function tariffLaw(ctx: InstrumentContext): CapabilityCheck {
  if (ctx.actor !== ctx.campaign.founding.nation) return requireTrue(true, "");
  const sector = tariffSector(ctx);
  return requireTrue(
    sector !== undefined && fittingTariffStatute(ctx.campaign, ctx.target, sector, TARIFF_INCREASE_RATE) !== undefined,
    "a trade law that covers this country, such as a Section 301 or 232 finding, a deficit with them under Section 122, or a tariff of theirs on American goods to answer under Section 338",
  );
}

function dropsDebt(effect: Effect): boolean {
  return effect.kind === "nationStat" && effect.setStats?.economy?.debt !== undefined;
}

/**
 * The relationship movement, and a United States tariff measure when the
 * actor is the campaign's founding nation.
 *
 * Another capital keeps the relationship movement only. This model has no
 * revenue formula for a tariff imposed anywhere but the United States, and
 * a failed imposition does not invent a debt payment to stand in for one.
 */
function tariffIncrease(ctx: InstrumentContext): Effect[] {
  const dependence: Effect = {
    kind: "relationship",
    from: ctx.actor,
    to: ctx.target,
    deltas: { tradeDependence: -0.05 * jitter(ctx) },
  };
  if (ctx.actor !== ctx.campaign.founding.nation) return [dependence];
  const sector = tariffSector(ctx);
  if (!sector) return [dependence];
  const statute = fittingTariffStatute(ctx.campaign, ctx.target, sector, TARIFF_INCREASE_RATE);
  if (!statute) return [dependence];
  const imposed = imposeTariff(ctx.campaign, statute, ctx.target, sector, TARIFF_INCREASE_RATE);
  if (!imposed.ok) return [dependence];
  return [dependence, ...imposed.packet.effects.filter((effect) => !dropsDebt(effect))];
}

export const economicRungs: readonly InstrumentRung[] = [
  {
    instrument: "economic",
    rung: 1,
    id: "economic-1",
    name: "Trade Advisory",
    gate: (ctx) => requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.trade.exports, 100, "an export sector large enough for an advisory to be credible"),
    resolve: (ctx) => [
      { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { tradeDependence: -0.01 * jitter(ctx) } },
    ],
  },
  {
    instrument: "economic",
    rung: 2,
    id: "economic-2",
    name: "Tariff Increase",
    // Competence first: a customs-union member has no tariff schedule to raise against anyone, so that is the refusal to name.
    gate: (ctx) => requireAll(tariffCompetence(ctx.campaign, ctx.actor, ctx.target), tradeAccess(liveNation(ctx.campaign, ctx.actor), ctx.target), tariffLaw(ctx)),
    resolve: (ctx) => tariffIncrease(ctx),
  },
  {
    instrument: "economic",
    rung: 3,
    id: "economic-3",
    name: "Targeted Sanctions",
    gate: (ctx) => requireAll(
      tradeAccess(liveNation(ctx.campaign, ctx.actor), ctx.target),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.reserves, 2000, "reserves deep enough to absorb the reciprocal shock"),
    ),
    resolve: (ctx) => {
      // A denial package is an export control where the partner buys something
      // licensed rather than taxed, and a designation where it does not: a
      // government cannot be export-controlled out of goods it never bought.
      const kind = denialMeasureKind(ctx.campaign, ctx.target);
      return [
        { kind: "nationStat", nation: ctx.target, setStats: { economy: { reserves: liveNation(ctx.campaign, ctx.target).stats.economy.reserves * (1 - 0.05 * jitter(ctx)) } } },
        acted(ctx, { tension: 0.1 * jitter(ctx) }, {
          kind: "sanctions",
          description:
            kind === "export-control"
              ? `${sentenceCase(named(ctx, ctx.actor))} denied ${named(ctx, ctx.target)} controlled technology.`
              : `${sentenceCase(named(ctx, ctx.actor))} designated ${named(ctx, ctx.target)} for sanctions.`,
        }),
        ...tradeRegister(ctx, kind),
      ];
    },
  },
  {
    instrument: "economic",
    rung: 4,
    id: "economic-4",
    name: "Asset Freeze",
    gate: (ctx) => requireAll(
      tradeAccess(liveNation(ctx.campaign, ctx.actor), ctx.target),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.gdp, 20_000, "a GDP large enough to hold the target's assets at all, which only a major economy is"),
    ),
    resolve: (ctx) => [
      { kind: "nationStat", nation: ctx.target, setStats: { economy: { reserves: liveNation(ctx.campaign, ctx.target).stats.economy.reserves * 0.85 } } },
      acted(ctx, { trust: -0.2 * jitter(ctx) }, {
        kind: "sanctions",
        description: `${sentenceCase(named(ctx, ctx.actor))} froze ${possessive(named(ctx, ctx.target))} assets.`,
      }),
      ...tradeRegister(ctx, "asset-restriction"),
    ],
  },
  {
    instrument: "economic",
    rung: 5,
    id: "economic-5",
    name: "Full Embargo",
    gate: (ctx) => requireAll(
      tradeAccess(liveNation(ctx.campaign, ctx.actor), ctx.target),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.reserves, 5000, "reserves deep enough to sustain a total trade break"),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.trade.exports, 5000, "exports worth withholding, since an embargo only bites where there is trade to cut"),
      notAlreadyStanding(ctx, `embargo:${ctx.actor}:${ctx.target}`, "trade left to cut off — the embargo already in force cannot be imposed twice"),
    ),
    resolve: (ctx) => [
      { kind: "nationStat", nation: ctx.target, setStats: { trade: { balance: liveNation(ctx.campaign, ctx.target).stats.trade.balance - liveNation(ctx.campaign, ctx.target).stats.trade.imports * 0.3 } } },
      {
        ...acted(ctx, { tension: 0.3 * jitter(ctx) }, {
          kind: "embargo",
          description: `${sentenceCase(named(ctx, ctx.actor))} cut off all trade with ${named(ctx, ctx.target)}.`,
        }),
        set: { tradeDependence: 0 },
      },
      { kind: "flag", set: [`embargo:${ctx.actor}:${ctx.target}`] },
      ...tradeRegister(ctx, "embargo"),
      // An embargo is a two-way break, so the actor's own export sector takes
      // the other half. Leaving it unmodeled lets a government cut itself off
      // from twenty-two trading partners in a year and still read as an export
      // power on every screen, and the rung's own "exports ≥ 5000" gate, which
      // is supposed to say that an embargo only bites if there is trade to
      // withhold, can never close.
      {
        kind: "nationStat",
        nation: ctx.actor,
        setStats: {
          trade: {
            exports: liveNation(ctx.campaign, ctx.actor).stats.trade.exports * (1 - embargoedShare(ctx)),
          },
        },
      },
      ...standingCommitment(ctx, {
        kind: "program",
        // Calibrated to what these things actually cost, not to what feels
        // heavy: sanctions enforcement is a couple of billion a year against a
        // twenty-seven-trillion economy, so the fraction is small and the
        // point is that twenty of them are not.
        shareOfGdp: 0.0000015,
        line: "foreignAffairs",
        rationale: "An embargo is enforced, not declared: the customs, the interdiction and the exemptions cost money every week it stands.",
      }),
      ...embargoSectorEffects(ctx),
    ],
  },
];

// --- Assistance ladder: leverage is what the actor has to give away — money it
// can spare, an economy big enough for the grant to matter, forces it can arm
// or send. Aid is not free of capability: a state with nothing cannot help.

/**
 * The recipient's own reading of the giver, where aid actually lands. Written
 * only when that direction of the relationship exists: the graph is directed
 * and a nation the target has never had a view of has no view to move.
 */
type RelationshipDeltas = Extract<Effect, { kind: "relationship" }>["deltas"];

function towardActor(ctx: InstrumentContext, deltas: RelationshipDeltas): readonly Effect[] {
  if (!selectRelationship(ctx.campaign, ctx.target, ctx.actor)) return [];
  return [{ kind: "relationship", from: ctx.target, to: ctx.actor, deltas }];
}

/**
 * Movement on the player's own panel, and only when the player is the one
 * acting. A metric effect is not addressed to a nation — apply() writes it to
 * the administration — so an unguarded one would bill the player for what some
 * other capital did with its own money.
 */
function actorMetrics(ctx: InstrumentContext, deltas: Extract<Effect, { kind: "metric" }>["deltas"]): readonly Effect[] {
  return ctx.actor === ctx.campaign.founding.nation ? [{ kind: "metric", deltas }] : [];
}

/** The worst thing the target is currently living through, if anything. */
function heaviestCondition(ctx: InstrumentContext): NationCondition | undefined {
  return selectConditionsFor(ctx.campaign, ctx.target)
    .filter((condition) => condition.status === "active")
    .reduce<NationCondition | undefined>(
      (worst, condition) => (worst === undefined || condition.severity > worst.severity ? condition : worst),
      undefined,
    );
}

/**
 * Relief reaching a country that is living through something: the condition
 * itself gets lighter. This is the only route by which one nation's decision
 * shortens another's disaster, and it is why the first rung is worth taking
 * for a friend in a bad week rather than only for the record.
 */
function conditionRelief(ctx: InstrumentContext, amount: number, summary: string): readonly Effect[] {
  const condition = heaviestCondition(ctx);
  if (!condition) return [];
  return [
    {
      kind: "condition",
      set: {
        ...condition,
        severity: Math.max(0, condition.severity - amount),
        beats: [...condition.beats, { turn: ctx.campaign.turn, description: summary }],
      },
    },
  ];
}

/**
 * The weeks of deliveries a relief shipment opens, named against the disaster
 * it answers.
 *
 * Only here, and only when the recipient is living through something: this is
 * the one rung whose whole purpose is a named condition, so letting it run out
 * while that condition still stands is a promise left short. A guarantee or an
 * arms transfer to a country that happens to be flooded answers the flood no
 * more than it answers the weather, and none of them is marked.
 *
 * Sized as a disaster response in the low hundreds of millions over two months,
 * against the administration's own output as every commitment is.
 */
function reliefOperation(ctx: InstrumentContext): readonly Effect[] {
  const condition = heaviestCondition(ctx);
  if (!condition) return [];
  const answering = { kind: condition.kind, nation: condition.nation };
  return standingCommitment(ctx, {
    kind: "aid",
    shareOfGdp: RELIEF_SHARE_OF_GDP,
    line: "foreignAffairs",
    weeks: RELIEF_WEEKS,
    rationale: "Relief is flown in for weeks after the first shipment lands, until the need it answers has passed.",
  }).map((effect) => (effect.kind === "commitment" ? { ...effect, set: { ...effect.set, addressedCondition: answering } } : effect));
}

const RELIEF_WEEKS = 8;
const RELIEF_SHARE_OF_GDP = 0.00000055;

function aidFlow(ctx: InstrumentContext, amount: number): readonly Effect[] {
  const actor = liveNation(ctx.campaign, ctx.actor);
  const target = liveNation(ctx.campaign, ctx.target);
  return [
    { kind: "nationStat", nation: ctx.actor, setStats: { softPower: { aidGiven: actor.stats.softPower.aidGiven + amount } } },
    { kind: "nationStat", nation: ctx.target, setStats: { softPower: { aidReceived: target.stats.softPower.aidReceived + amount } } },
  ];
}

/**
 * A grant's program, as a half-year's lift to the recipient's growth target
 * sized by what the money is against its economy: a program the size of a
 * point of output lifts growth about a point while it runs, and never more
 * than a development program can.
 */
function developmentShock(ctx: InstrumentContext, amount: number): Effect {
  const gdp = Math.max(1, liveNation(ctx.campaign, ctx.target).stats.economy.gdp);
  return shockEffect(ctx.campaign, ctx.target, "grant", { growth: Math.min(GRANT_GROWTH_CAP, amount / gdp) });
}

/**
 * Whether the recipient is in the kind of trouble the heavier rungs answer.
 *
 * Aid at this size is not a gift a state hands a comfortable neighbor: a
 * stabilization package presupposes something to stabilize. Without the check,
 * the top of the ladder was available every week against everyone, which is how
 * a government talks itself into spending a treasury on gestures.
 */
function inDifficulty(ctx: InstrumentContext): CapabilityCheck {
  const target = liveNation(ctx.campaign, ctx.target);
  const monthsOfCover = target.stats.economy.reserves / Math.max(1, target.stats.trade.imports / 12);
  const struggling =
    monthsOfCover < 6 ||
    target.stats.politics.regimeStability < 0.5 ||
    heaviestCondition(ctx) !== undefined ||
    selectConflictBetween(ctx.campaign, ctx.target, ctx.actor) !== undefined;
  return requireTrue(struggling, "a recipient actually in difficulty — nothing here is worth standing behind a comfortable government for");
}

/** How far a relationship has to have come before a kind of help is credible. */
function trustAtLeast(ctx: InstrumentContext, floor: number, capability: string): CapabilityCheck {
  return requireAtLeast(liveRelationship(ctx.campaign, ctx.actor, ctx.target).trust, floor, capability, "trust");
}

export const assistanceRungs: readonly InstrumentRung[] = [
  {
    instrument: "assistance",
    rung: 1,
    id: "assistance-1",
    name: "Relief Shipment",
    gate: (ctx) => requireAll(requireTrue(borrowingCapacity(ctx.campaign, ctx.actor) > 0, CREDIT_TO_LEND), requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.reserves, 150, "reserves enough to buy a shipment and fly it")),
    resolve: (ctx) => [
      ...aidFlow(ctx, 60 * jitter(ctx)),
      ...towardActor(ctx, { trust: 0.04 * jitter(ctx), tension: -0.02 * jitter(ctx) }),
      { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { alignment: 0.02 * jitter(ctx) }, addHistory: { turn: ctx.campaign.turn, kind: "relief", description: `${sentenceCase(named(ctx, ctx.actor))} sent emergency relief to ${named(ctx, ctx.target)}.` } },
      ...conditionRelief(ctx, 0.06 * jitter(ctx), `Foreign relief arrives and takes some of the weight off.`),
      ...reliefOperation(ctx),
    ],
  },
  {
    instrument: "assistance",
    rung: 2,
    id: "assistance-2",
    name: "Development Grant",
    gate: (ctx) => requireAll(requireTrue(borrowingCapacity(ctx.campaign, ctx.actor) > 0, CREDIT_TO_LEND),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.reserves, 1000, "reserves enough to fund a program that outlives the news cycle"),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.gdp, 5000, "a GDP large enough for a grant of this size to be development money rather than a gesture"),
    ),
    resolve: (ctx) => [
      ...aidFlow(ctx, 240 * jitter(ctx)),
      developmentShock(ctx, 240 * jitter(ctx)),
      ...towardActor(ctx, { trust: 0.07 * jitter(ctx), alignment: 0.03 * jitter(ctx) }),
    ],
  },
  {
    instrument: "assistance",
    rung: 3,
    id: "assistance-3",
    name: "Stabilization Package",
    gate: (ctx) => requireAll(requireTrue(borrowingCapacity(ctx.campaign, ctx.actor) > 0, CREDIT_TO_LEND),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.reserves, 4000, "reserves enough to stand behind somebody else's currency"),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.economy.gdp, 20_000, "a GDP that makes the guarantee worth something, since one is only worth the economy behind it"),
      inDifficulty(ctx),
    ),
    resolve: (ctx) => [
      ...aidFlow(ctx, 700 * jitter(ctx)),
      {
        kind: "nationStat",
        nation: ctx.target,
        setStats: {
          economy: { reserves: liveNation(ctx.campaign, ctx.target).stats.economy.reserves * (1 + 0.06 * jitter(ctx)) },
          politics: { regimeStability: Math.min(1, liveNation(ctx.campaign, ctx.target).stats.politics.regimeStability + 0.05 * jitter(ctx)) },
        },
      },
      // Money that holds a currency up is money the recipient's economy then
      // runs through the giver: help at this size buys dependence, which is
      // the honest reason a state offers it.
      ...towardActor(ctx, { trust: 0.09 * jitter(ctx), tradeDependence: 0.06 * jitter(ctx) }),
      // The package is the backstop: reserves put behind the currency are what
      // the market reads, and the relief it buys lasts as long as they stand.
      { kind: "flag", set: markedFlags([currencyBackstopFlag(ctx.actor, ctx.target)], ctx.campaign.turn) },
    ],
  },
  {
    instrument: "assistance",
    rung: 4,
    id: "assistance-4",
    name: "Arms Transfer",
    gate: (ctx) => requireAll(
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.readiness, 0.35, "the readiness to spare the equipment, since a force with nothing in reserve has nothing to hand over"),
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.branchStrength.land, 0.3, "the land branch strength an arms transfer comes out of"),
      trustAtLeast(ctx, 0.15, "enough trust to hand a government weapons and expect to know where they end up"),
    ),
    resolve: (ctx) => [
      ...aidFlow(ctx, 400 * jitter(ctx)),
      { kind: "nationStat", nation: ctx.target, setStats: { military: { readiness: Math.min(1, liveNation(ctx.campaign, ctx.target).stats.military.readiness + 0.08 * jitter(ctx)) } } },
      // What is given away is gone: the transfer comes out of the giver's own
      // holdings, not out of nothing.
      { kind: "nationStat", nation: ctx.actor, setStats: { military: { readiness: Math.max(0, liveNation(ctx.campaign, ctx.actor).stats.military.readiness - 0.03 * jitter(ctx)) } } },
      ...standingCommitment(ctx, {
        kind: "arms",
        shareOfGdp: 0.0000035,
        line: "defense",
        weeks: 26,
        rationale: "A transfer is a schedule of deliveries, spares and training, not a single shipment.",
      }),
      ...towardActor(ctx, { trust: 0.1 * jitter(ctx), militaryThreat: -0.05 * jitter(ctx) }),
    ],
  },
  {
    instrument: "assistance",
    rung: 5,
    id: "assistance-5",
    name: "Security Guarantee",
    gate: (ctx) => requireAll(
      requireAtLeast(liveNation(ctx.campaign, ctx.actor).stats.military.readiness, 0.5, "the readiness to honor it, since a guarantee nobody could honor is a lie with a signature on it"),
      projectionAccess(ctx, PROJECTION_CAPS[4], "reach to put forces where the guarantee would have to be honored"),
      trustAtLeast(ctx, 0.35, "a relationship close enough that a promise to fight for them is believed by either side"),
      notAlreadyStanding(ctx, securityGuaranteeFlag(ctx.actor, ctx.target), "a promise still to make — this one is already given"),
    ),
    resolve: (ctx) => [
      ...aidFlow(ctx, 900 * jitter(ctx)),
      { kind: "flag", set: [securityGuaranteeFlag(ctx.actor, ctx.target)] },
      { kind: "relationship", from: ctx.actor, to: ctx.target, deltas: { alignment: 0.12 * jitter(ctx), trust: 0.08 * jitter(ctx) }, addHistory: { turn: ctx.campaign.turn, kind: "guarantee", description: `${sentenceCase(named(ctx, ctx.actor))} guaranteed ${possessive(named(ctx, ctx.target))} security.` } },
      ...towardActor(ctx, { trust: 0.15 * jitter(ctx), alignment: 0.12 * jitter(ctx), militaryThreat: -0.1 * jitter(ctx) }),
      { kind: "nationStat", nation: ctx.target, setStats: { politics: { regimeStability: Math.min(1, liveNation(ctx.campaign, ctx.target).stats.politics.regimeStability + 0.04 * jitter(ctx)) } } },
      // Forces promised elsewhere are forces not held at home, and the promise
      // is worth standing precisely because it is expensive to keep. The bill
      // is written on the actor's own services and not only on the player's
      // panel: a guarantee that cost the establishment nothing was a guarantee
      // an administration could give to every capital on earth in a single
      // term, which is how the top of this ladder came to be the cheapest rung
      // on the board once the military one had a ceiling.
      { kind: "nationStat", nation: ctx.actor, setStats: { military: { readiness: Math.max(0, liveNation(ctx.campaign, ctx.actor).stats.military.readiness - 0.06 * jitter(ctx)) } } },
      ...standingCommitment(ctx, {
        kind: "basing",
        shareOfGdp: 0.000007,
        line: "defense",
        forces: { branch: "air", unitType: "air.fighter", count: 48 },
        rationale: "A guarantee is believed because there are aircraft standing behind it, and they are standing there instead of somewhere else.",
      }),
      ...actorMetrics(ctx, { standing: 0.02 * jitter(ctx) }),
    ],
  },
];

/**
 * The standing promise one nation has made to defend another, in the same
 * governance-flag vocabulary an embargo or a severance is written in — so a
 * scenario, a card, or a later rung can read it without a second store.
 */
export function securityGuaranteeFlag(actor: NationId, target: NationId): string {
  return `security-guarantee:${actor}:${target}`;
}
