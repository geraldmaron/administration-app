/** The rung a `climbing` player is reaching for, given how far into the term they are. */
export function climbingRung(step, horizon) {
    const share = horizon <= 1 ? 1 : step / (horizon - 1);
    return Math.min(5, 1 + Math.floor(share * 5));
}
/** Where a `measured` player sits on the ladder. */
export const MEASURED_RUNG = 3;
export const PROXY_PROFILES = {
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
        summary: "Staffs the government hard and acts almost never. The one proxy that separates filling the offices from playing well, which until this table existed were the same proxy.",
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
        summary: "Takes only the acts that cost nothing and offend nobody. The harness already counts free-win turns; this player is what happens to a presidency that takes every one of them and nothing else.",
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
        summary: "Starts at the bottom of the ladder and works up as the term runs. A deliberate escalation, which neither reckless nor prudent can express: one is already at the top and the other never leaves the bottom.",
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
export const SKILL_PROXIES = [
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
export const BRACKET_PROXIES = ["passive", "reckless", "prudent"];
/**
 * The careful player every fiscal profile is measured against: `prudent`'s
 * odds, reserve and staffing, and its program without a fiscal stance.
 */
const CAREFUL = {
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
export const FISCAL_PROXY_PROFILES = {
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
