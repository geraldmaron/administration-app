import type { InstrumentId, RungLevel } from "./instruments.js";

// The players the harness stands in for.
//
// Three proxies bracketed the space for as long as the harness has existed:
// never act, always reach for the top of the ladder, act only on odds you
// like. That is a bracket, not a population, and it hid two whole classes of
// question. A bracket cannot answer "does a president who governs entirely
// through trade end up anywhere different from one who governs entirely
// through force", because both of those live inside `prudent` and are averaged
// together with everything else it does. It also cannot answer "is staffing
// the government worth it on its own", because until this table existed
// exactly one proxy staffed and it also happened to be the one that played
// carefully, so the two effects arrived welded together and no measurement
// could separate them.
//
// Thirteen players, each a data record rather than an arm of a switch. Every
// dial below is something a person actually varies: how sure they need to be
// before they act, how much of the treasury they refuse to touch, where on the
// escalation ladder they reach, which instrument they reach for first, whether
// they fill the offices, and what they legislate in their first week.
//
// The first three are byte-identical in behavior to the switch they replaced —
// their dials were chosen to reproduce it exactly — because the bands in
// `balance.test.ts` were measured against them and a refactor that moved those
// numbers would have invalidated the gate it was meant to widen.

export type SkillProxy =
  | "passive"
  | "reckless"
  | "prudent"
  | "hawk"
  | "diplomat"
  | "economist"
  | "institutionalist"
  | "populist"
  | "technocrat"
  | "opportunist"
  | "spendthrift"
  | "escalator"
  | "caretaker";

/**
 * How a player picks among the acts they can afford.
 *
 * `heaviest` reaches for the top rung it can pay for; `surest` takes the best
 * odds and, among equal odds, the gentlest rung; `climbing` starts at the
 * bottom and works up as the term runs, which is what escalation actually
 * looks like when someone is doing it on purpose; `measured` sits at the
 * middle of the ladder and refuses both ends.
 */
export type RungBias = "heaviest" | "surest" | "climbing" | "measured";

export type ProxyProfile = {
  /** Why this player is in the population — the question only they can answer. */
  readonly summary: string;
  /**
   * The program they mean to govern under. Adopted in the first week where the
   * domain is the President's own; where its substance is revenue, the bill is
   * transmitted and the program waits on the count, the same way a player's
   * does.
   */
  readonly program: readonly string[];
  /**
   * The success chance they refuse to act below. Above 1 means they never act
   * at all, which is how `passive` is expressed as data rather than as a case.
   */
  readonly oddsFloor: number;
  /**
   * The share of the opening treasury they will not spend past in one act.
   * 0 means they will spend to the floor.
   */
  readonly reserveShare: number;
  readonly rungBias: RungBias;
  /** Reached for first where anything affordable matches; empty means no preference. */
  readonly instruments: readonly InstrumentId[];
  /** Names sent up per week. 0 is a president who never fills an office. */
  readonly nominationsPerWeek: number;
  /** How many names they keep moving at once. */
  readonly pipelineWidth: number;
  /** Acts only where the act is free — high odds, trivial price, nobody objects. */
  readonly freeWinsOnly: boolean;
};

/** The rung a `climbing` player is reaching for, given how far into the term they are. */
export function climbingRung(step: number, horizon: number): RungLevel {
  const share = horizon <= 1 ? 1 : step / (horizon - 1);
  return (Math.min(5, 1 + Math.floor(share * 5)) as RungLevel);
}

/** Where a `measured` player sits on the ladder. */
export const MEASURED_RUNG: RungLevel = 3;

export const PROXY_PROFILES: Readonly<Record<SkillProxy, ProxyProfile>> = {
  passive: {
    summary: "Never spends and never staffs. The floor of the population: what the country does on its own.",
    program: [],
    oddsFloor: 2,
    reserveShare: 0,
    rungBias: "surest",
    instruments: [],
    nominationsPerWeek: 0,
    pipelineWidth: 0,
    freeWinsOnly: false,
  },
  reckless: {
    summary: "Reaches for the heaviest thing it can pay for, every week, and fills no offices.",
    program: ["civil-emergency-powers", "industry-extraction", "defense-conscription", "security-surveillance"],
    oddsFloor: 0,
    reserveShare: 0,
    rungBias: "heaviest",
    instruments: [],
    nominationsPerWeek: 0,
    pipelineWidth: 0,
    freeWinsOnly: false,
  },
  prudent: {
    summary: "Acts on odds it likes, keeps a year of headroom, and staffs the government.",
    program: ["civil-open-society", "security-disclosure", "trade-open", "fiscal-investment"],
    oddsFloor: 0.6,
    reserveShare: 0.9,
    rungBias: "surest",
    instruments: [],
    nominationsPerWeek: 3,
    pipelineWidth: 20,
    freeWinsOnly: false,
  },
  hawk: {
    summary: "Governs through force and covert action. Isolates what the coercive half of the ladder costs.",
    program: ["defense-rearmament", "security-surveillance"],
    oddsFloor: 0.4,
    reserveShare: 0.5,
    rungBias: "heaviest",
    instruments: ["military", "covert"],
    nominationsPerWeek: 1,
    pipelineWidth: 8,
    freeWinsOnly: false,
  },
  diplomat: {
    summary: "Governs through talking and giving. The other end of the same ladder, held to the same odds.",
    program: ["security-community", "civil-open-society"],
    oddsFloor: 0.4,
    reserveShare: 0.5,
    rungBias: "surest",
    instruments: ["diplomatic", "assistance"],
    nominationsPerWeek: 2,
    pipelineWidth: 12,
    freeWinsOnly: false,
  },
  economist: {
    summary: "Governs through the economic instrument and a trade program. Isolates the money half of statecraft.",
    program: ["trade-open", "fiscal-investment", "industry-transition"],
    oddsFloor: 0.5,
    reserveShare: 0.8,
    rungBias: "measured",
    instruments: ["economic"],
    nominationsPerWeek: 2,
    pipelineWidth: 12,
    freeWinsOnly: false,
  },
  institutionalist: {
    summary:
      "Staffs the government hard and acts almost never. The one proxy that separates filling the offices from playing well, which until this table existed were the same proxy.",
    program: ["fiscal-continuity", "trade-continuity"],
    oddsFloor: 0.85,
    reserveShare: 0.95,
    rungBias: "surest",
    instruments: [],
    nominationsPerWeek: 4,
    pipelineWidth: 24,
    freeWinsOnly: false,
  },
  populist: {
    summary: "Spends for the headline and legislates for it too. Tests whether chasing approval buys any.",
    program: ["fiscal-redistribution", "trade-protective", "civil-public-order"],
    oddsFloor: 0.3,
    reserveShare: 0.2,
    rungBias: "measured",
    instruments: ["assistance", "economic"],
    nominationsPerWeek: 1,
    pipelineWidth: 8,
    freeWinsOnly: false,
  },
  technocrat: {
    summary: "Will not move below four-in-five odds, keeps the accounts nearly whole, and fills every office it can.",
    program: ["fiscal-investment", "industry-transition", "security-disclosure"],
    oddsFloor: 0.8,
    reserveShare: 0.95,
    rungBias: "surest",
    instruments: [],
    nominationsPerWeek: 3,
    pipelineWidth: 20,
    freeWinsOnly: false,
  },
  opportunist: {
    summary:
      "Takes only the acts that cost nothing and offend nobody. The harness already counts free-win turns; this player is what happens to a presidency that takes every one of them and nothing else.",
    program: [],
    oddsFloor: 0.9,
    reserveShare: 0.99,
    rungBias: "surest",
    instruments: [],
    nominationsPerWeek: 1,
    pipelineWidth: 8,
    freeWinsOnly: true,
  },
  spendthrift: {
    summary: "Spends to the floor on anything with even odds, and borrows to build. Tests whether the accounts are a real constraint.",
    // Borrowing to build rather than redistribution: redistribution raises the
    // take by more than it spends, so a spendthrift running it borrowed less
    // than a President who did nothing, and the one player built to press on
    // the national accounts was the one paying them down. The populist keeps
    // redistribution in the population.
    program: ["fiscal-investment", "industry-nationalization"],
    oddsFloor: 0.5,
    reserveShare: 0,
    rungBias: "measured",
    instruments: [],
    nominationsPerWeek: 1,
    pipelineWidth: 8,
    freeWinsOnly: false,
  },
  escalator: {
    summary:
      "Starts at the bottom of the ladder and works up as the term runs. A deliberate escalation, which neither reckless nor prudent can express: one is already at the top and the other never leaves the bottom.",
    program: ["defense-continuity", "security-continuity"],
    oddsFloor: 0.45,
    reserveShare: 0.6,
    rungBias: "climbing",
    instruments: [],
    nominationsPerWeek: 2,
    pipelineWidth: 12,
    freeWinsOnly: false,
  },
  caretaker: {
    summary: "Keeps every stance on continuity, staffs slowly, acts rarely. A presidency that means to change nothing.",
    program: ["fiscal-continuity", "industry-continuity", "trade-continuity", "civil-continuity", "defense-continuity"],
    oddsFloor: 0.75,
    reserveShare: 0.9,
    rungBias: "surest",
    instruments: [],
    nominationsPerWeek: 1,
    pipelineWidth: 6,
    freeWinsOnly: false,
  },
};

/**
 * Ordered so a report reads as a population rather than as an alphabet: the
 * three that bracket the space first, then the ten that fill it in.
 */
export const SKILL_PROXIES: readonly SkillProxy[] = [
  "passive",
  "reckless",
  "prudent",
  "hawk",
  "diplomat",
  "economist",
  "institutionalist",
  "populist",
  "technocrat",
  "opportunist",
  "spendthrift",
  "escalator",
  "caretaker",
];

/**
 * The three the standing bands in `balance.test.ts` were measured against.
 *
 * Kept as its own list rather than sliced off the front of `SKILL_PROXIES`,
 * because what makes these three special is not their position — it is that
 * their numbers are written down in a gate, and reordering the population
 * must not silently re-point that gate at a different set of players.
 */
export const BRACKET_PROXIES: readonly SkillProxy[] = ["passive", "reckless", "prudent"];

/** A fiscal player, with the programs it takes up partway through the term, week by week since the oath. */
export type FiscalProxyProfile = ProxyProfile & {
  readonly schedule?: readonly { readonly week: number; readonly program: readonly string[] }[];
};

/**
 * The careful player every fiscal profile is measured against: `prudent`'s
 * odds, reserve and staffing, and its program without a fiscal stance.
 */
const CAREFUL: ProxyProfile = {
  ...PROXY_PROFILES.prudent,
  summary: "Plays as carefully as prudent and leaves the national books on the budget it inherited.",
  program: PROXY_PROFILES.prudent.program.filter((stance) => !stance.startsWith("fiscal-")),
};

/** Every half year, the stance the oscillating player swaps to, for a term. */
const OSCILLATION = Array.from({ length: 8 }, (_, index) => ({
  week: 26 * (index + 1),
  program: [index % 2 === 0 ? "fiscal-austerity" : "fiscal-investment"],
}));

/**
 * Players who differ from one another only in how they run the national books,
 * for measuring what borrowing costs a President. Kept apart from the
 * population above so that adding one moves none of the bands measured on it.
 */
export const FISCAL_PROXY_PROFILES: Readonly<Record<string, FiscalProxyProfile>> = {
  "careful-without-fiscal": CAREFUL,
  "investment-only": {
    ...CAREFUL,
    summary: "The careful player, borrowing to build from the first week: what the national books charge for it.",
    program: [...CAREFUL.program, "fiscal-investment"],
  },
  "consolidation-only": {
    ...CAREFUL,
    summary: "The careful player, closing the deficit from the first week: what consolidation costs growth and buys in room.",
    program: [...CAREFUL.program, "fiscal-austerity"],
  },
  "switch-at-150": {
    ...CAREFUL,
    summary: "The careful player until the last year, then borrowing into the election: whether spending late escapes the bill.",
    schedule: [{ week: 150, program: ["fiscal-investment"] }],
  },
  oscillating: {
    ...CAREFUL,
    summary: "Swaps consolidation for investment and back every half year: whether the market can be played by announcements.",
    schedule: OSCILLATION,
  },
};
