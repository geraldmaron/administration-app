import { selectActiveConflicts, selectBills, } from "./state.js";
import { hasLapsed, selectDeclaredEmergencies } from "./emergency.js";
import { playerGdp } from "./policy.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { FISCAL_ACTS, playerStats } from "./legislative-acts-fiscal.js";
import { DOMESTIC_ACTS, TARGETED_DOMESTIC_ACTS } from "./legislative-acts-domestic.js";
// The catalogue of what Congress can pass, and nothing about how it passes it.
//
// Code rather than dataset, for the reason the policy stances and the executive
// orders are: these are rules with effects, and a save carrying a copy of them
// would reload against a build that had since rebalanced them.
//
// Split out of legislation.ts, which owns the week — origination, the desk
// clock, the veto and the override — and had reached its size ceiling with the
// catalogue inside it. The two are genuinely different subjects: one is a table
// of measures, the other is the arithmetic of a floor.
// The fiscal family lives in legislative-acts-fiscal.ts and is re-exported here,
// so every reader of the catalogue still has one import to make.
export { CONTINUING_RESOLUTION_TURNS } from "./legislative-acts-fiscal.js";
/**
 * Whether the country is in one of the two cases the Suspension Clause names.
 *
 * Article I, Section 9 permits the writ to be suspended in cases of rebellion
 * or invasion and in no others, so a declared emergency over a storm is not a
 * case for it however grave the storm is. Rebellion is read off the cause the
 * declaration was actually made over; invasion is a war the country is
 * defending on its own soil, which is the one the clause is written for — a
 * war it is prosecuting abroad is not.
 *
 * It sits with the statute book because the clause is Congress's: the order
 * catalogue carries no detention power for it to open, and a President has no
 * authority of their own to hold anyone without charge (18 U.S.C. §4001(a)).
 */
export function underRebellionOrInvasion(campaign) {
    const rebellion = selectDeclaredEmergencies(campaign).some((emergency) => !hasLapsed(emergency, campaign.turn) && emergency.cause === "unrest");
    return rebellion || selectActiveConflicts(campaign).some((conflict) => conflict.defender === campaign.founding.nation);
}
const always = () => true;
/**
 * How long after a rule takes effect Congress may still disapprove it.
 *
 * The Congressional Review Act's window is sixty days of continuous session,
 * counted in the weeks this game runs on. It is what makes the resolution a
 * real instrument rather than a permanent veto over the whole statute book:
 * miss it, and the rule stands.
 */
export const DISAPPROVAL_WINDOW_TURNS = 9;
/** The rule a resolution of disapproval would be written against this week. */
function disapprovableRule(campaign) {
    const barred = new Set(selectBills(campaign)
        .filter((bill) => bill.status !== "dead" && actOf(bill)?.disapproves === true)
        .flatMap((bill) => (bill.target === undefined ? [] : [bill.target])));
    // Newest first: Congress moves on the rule that has just landed, not on the
    // oldest one still inside the window.
    return [...campaign.pendingRules]
        .filter((rule) => rule.status === "in-effect" &&
        campaign.turn - (rule.resolvedTurn ?? rule.effectiveTurn) <= DISAPPROVAL_WINDOW_TURNS &&
        !barred.has(rule.order))
        .sort((a, b) => b.effectiveTurn - a.effectiveTurn)[0]?.order;
}
export const LEGISLATIVE_ACTS = [
    {
        id: "act-military-facilities-appropriation",
        title: "The Military Facilities Appropriation Act",
        summary: "Appropriates construction money to a coastal logistics depot and a training hospital, each named and accounted for separately.",
        topic: "Military construction projects",
        tradeoff: "The facilities expand capacity, but their funds cannot be moved without canceling or reducing a named project.",
        sponsor: "bipartisan",
        appeal: 0.13,
        cost: {},
        // The law grants authority; outlays land over the construction year via LAW_OFFSETS.
        militaryConstruction: [
            { id: "coastal-depot", name: "Coastal logistics depot", hostState: "NC", shareOfGdp: 0.00012 },
            { id: "training-hospital", name: "Military training hospital", hostState: "TX", shareOfGdp: 0.00003 },
        ],
        nationEffects: {},
        alignment: { nationalistGlobalist: 0.06 },
        recurs: TURNS_PER_YEAR,
        arises: always,
    },
    {
        id: "act-war-powers-enforcement",
        committee: "CMTE-FOREIGN",
        title: "The War Powers Enforcement Act",
        summary: "Requires an affirmative vote of both chambers before forces may be introduced into hostilities, and cuts off funds for any operation that lacks one.",
        sponsor: "bipartisan",
        appeal: 0.2,
        cost: { standing: -0.02 },
        nationEffects: { "politics.legitimacy": 0.04 },
        alignment: { authLibertarian: -0.25 },
        constrains: { barsUnilateralForce: true },
        // Congress writes this after being told rather than asked, and not before.
        // The constraint it puts in force does not expire, but the fight over it
        // does: a president who goes back around a standing enforcement act with a
        // fresh unauthorized deployment is the reason the floor takes it up again,
        // three years being long enough that this is a second fight and not the
        // same one continuing.
        recurs: TURNS_PER_YEAR * 3,
        arises: (campaign) => campaign.congress.unauthorized.length > 0,
    },
    {
        id: "act-emergency-powers-limitation",
        committee: "CMTE-HOMELAND",
        title: "The Emergency Powers Limitation Act",
        summary: "Sunsets declared emergencies at ninety days absent congressional renewal, and forbids moving military construction money under any of them.",
        sponsor: "opposition",
        appeal: 0.1,
        cost: { stability: -0.02 },
        nationEffects: { "politics.legitimacy": 0.05, "politics.pressFreedom": 0.04 },
        alignment: { authLibertarian: -0.35 },
        constrains: { blocksOrders: ["order-emergency-construction"] },
        // Re-arms when a *new* order draws a contest, the same way the floor took
        // this up the first time: the order it names is already closed off,
        // so what brings Congress back is a fresh emergency the statute did not
        // anticipate rather than the same one relitigated.
        recurs: TURNS_PER_YEAR * 3,
        arises: (campaign) => campaign.orders.some((record) => record.contested),
    },
    {
        id: "act-economic-stabilization",
        committee: "CMTE-BANKING",
        title: "The Economic Stabilization Act",
        summary: "Gives the President standby power to freeze prices, rents, wages and salaries, the power Congress granted in 1970 and let lapse in 1974.",
        // Congress wrote the 1970 act for a President who had not asked for it, and
        // he used it a year later. The chamber that hands over this power is daring
        // the office to take the blame for prices.
        sponsor: "opposition",
        appeal: 0.06,
        cost: {},
        nationEffects: {},
        alignment: { economicLeftRight: -0.25 },
        constrains: { authorizesOrders: ["order-price-controls"] },
        recurs: TURNS_PER_YEAR * 2,
        // A planning threshold: inflation above five percent, about where it stood
        // the year the 1970 act passed. Below it no Congress takes up controls.
        arises: (campaign) => (playerStats(campaign)?.economy.inflation ?? 0) > 0.05,
    },
    {
        id: "act-infrastructure-investment",
        committee: "CMTE-ENVIRONMENT",
        title: "The National Infrastructure Investment Act",
        summary: "Five years of federal money for roads, grid and rail, with initial spending authority and annual funding delivered through the states.",
        sponsor: "administration",
        appeal: 0.15,
        cost: { stability: 0.03 },
        // ~$110B: the up-front appropriation is one year's worth of the decade of
        // roads, grid and rail the summary promises.
        treasuryOfGdp: -0.004,
        nationEffects: { "politics.protestPressure": -0.03 },
        alignment: { economicLeftRight: -0.2 },
        domestic: {
            sectors: ["public-infrastructure"],
            magnitude: "moderate",
            signature: "act:infrastructure",
            reason: "Federal money for roads, grid and rail lands where the yards and the builders are.",
        },
        // A decade of money spent does not buy a decade of growth; the real
        // program has been written more than once inside a single presidency
        // (2009, then again in 2021) whenever the same slack shows up in the
        // numbers. Four years is long enough that this is a second package
        // answering to a slump the first one did not fix, not the same signing
        // twice.
        recurs: TURNS_PER_YEAR * 4,
        arises: (campaign) => (campaign.nations[campaign.founding.nation]?.stats.economy.growth ?? 0) < 0.03,
    },
    {
        id: "act-defense-authorization",
        committee: "CMTE-ARMED",
        title: "The Annual Defense Authorization Act",
        summary: "Sets the year's force structure, pay and procurement, renews the industrial-base authorities the President may reach for when defense production is short, and is the one bill that passes every year.",
        sponsor: "bipartisan",
        appeal: 0.3,
        // An authorization spends nothing and delivers nothing. It sets the force
        // structure Congress is willing to pay for and raises the ceiling the
        // appropriators may write against; readiness arrives only if the money is
        // then voted and the defense account actually builds with it. Charging the
        // treasury here and handing over readiness besides made the NDAA a purchase
        // the President never had to fund — the precise inversion of the rule that
        // no officer may obligate money Congress has not appropriated.
        cost: {},
        raisesCap: { account: "military", share: 0.01, turns: TURNS_PER_YEAR },
        nationEffects: { "military.doctrineQuality": 0.02 },
        alignment: { authLibertarian: 0.1, nationalistGlobalist: 0.1 },
        // The industrial-base title renews and extends what the Defense Production
        // Act already lets the office order, so a priority signed under a fresh
        // authorization stands on Congress's word for this year rather than on a
        // statute the bench may read as stale.
        constrains: { authorizesOrders: ["order-defense-production"] },
        domestic: {
            axes: { defense: 1 },
            magnitude: "light",
            signature: "act:defense-authorization",
            reason: "Force structure and procurement land where the bases and yards already are.",
        },
        recurs: TURNS_PER_YEAR,
        arises: always,
    },
    {
        id: "act-intelligence-authorization",
        committee: "CMTE-INTEL",
        title: "The Annual Intelligence Authorization Act",
        summary: "Sets the year's collection priorities and covert budget ceiling, and is the companion the defense bill has passed alongside for decades.",
        sponsor: "bipartisan",
        appeal: 0.25,
        // An authorization, exactly as the NDAA is one: it raises what the
        // appropriators may write against the covert account and buys nothing by
        // itself, for the identical reason the defense authorization does not.
        cost: {},
        raisesCap: { account: "covert", share: 0.006, turns: TURNS_PER_YEAR },
        nationEffects: { "security.intelCapability": 0.015, "security.counterIntel": 0.01 },
        alignment: { authLibertarian: 0.05 },
        recurs: TURNS_PER_YEAR,
        arises: always,
    },
    {
        id: "act-surface-transportation-reauthorization",
        committee: "CMTE-COMMERCE",
        title: "The Surface Transportation Reauthorization Act",
        summary: "Renews the multi-year formula that funds highways, transit and rail, on the cycle the authorization has run on since the interstate system was built.",
        sponsor: "bipartisan",
        appeal: 0.22,
        // ~$70B a year of formula money to the states, on the scale a real
        // multi-year surface bill runs at.
        cost: {},
        treasuryOfGdp: -0.0026,
        nationEffects: { "economy.growth": 0.003 },
        alignment: { economicLeftRight: -0.1 },
        domestic: {
            sectors: ["public-infrastructure"],
            magnitude: "light",
            signature: "act:surface-transportation",
            reason: "Formula money to the states lands where the road and transit contractors already are.",
        },
        // Five years, the length the real reauthorization has run at since the
        // 1990s.
        recurs: TURNS_PER_YEAR * 5,
        // A calendar rather than a condition, the same way the farm bill is: due
        // when the last cycle expires and for no other reason.
        arises: always,
    },
    {
        id: "act-press-shield",
        committee: "CMTE-JUDICIARY",
        title: "The Free Press Protection Act",
        summary: "Protects reporters from compelled disclosure of sources in federal proceedings.",
        sponsor: "opposition",
        appeal: 0.05,
        cost: { standing: 0.02 },
        nationEffects: { "politics.pressFreedom": 0.08, "security.corruptionIndex": -0.02 },
        alignment: { authLibertarian: -0.3 },
        constrains: { bindsTheExecutive: true },
        // The freedom it protects can still slide from causes the statute does not
        // touch, and a Hill that watches it slide again takes the subject up again.
        recurs: TURNS_PER_YEAR * 3,
        arises: (campaign) => (campaign.nations[campaign.founding.nation]?.stats.politics.pressFreedom ?? 1) < 0.7,
    },
    FISCAL_ACTS.fiscalResponsibility,
    FISCAL_ACTS.continuingResolution,
    {
        id: "act-rule-disapproval",
        title: "A Joint Resolution of Disapproval",
        summary: "Congress disapproves a rule this administration made without it: the rule has no force, and no rule substantially the same may be issued again.",
        sponsor: "opposition",
        appeal: 0.18,
        cost: { standing: -0.04 },
        nationEffects: {},
        alignment: { authLibertarian: -0.15 },
        disapproves: true,
        track: "privileged",
        targetsOrder: disapprovableRule,
        // Two turns is the pause after Congress *carries* one, so that disapproving
        // one rule this month and another the next is possible and disapproving the
        // whole statute book in a season is not.
        //
        // A resolution that dies on the floor, or is vetoed and not overridden, is
        // deliberately not bounded by it: `billsOnTheAgenda` counts only enacted
        // bills, and `disapprovableRule` stops barring a rule the moment the bill
        // against it dies, so the rule is eligible again immediately. Congress
        // losing a count is Congress losing a count, not Congress giving up its
        // power to try — what closes the question either way is the window, and a
        // rule that survives to the end of it survives for good.
        recurs: 2,
        arises: (campaign) => disapprovableRule(campaign) !== undefined,
    },
    FISCAL_ACTS.fullYearContinuingResolution,
    FISCAL_ACTS.debtLimitIncrease,
    FISCAL_ACTS.debtLimitDeal,
    {
        id: "act-agriculture-improvement",
        committee: "CMTE-AGRICULTURE",
        title: "The Agriculture Improvement Act",
        summary: "The farm bill: five years of commodity supports, crop insurance and nutrition assistance, renewed together because neither half passes without the other.",
        sponsor: "bipartisan",
        // High, and for the reason the real one is: the coalition is rural and
        // urban at once, which is why it survives Congresses that pass nothing else.
        appeal: 0.28,
        // ~$140B a year across supports, insurance and nutrition.
        cost: {},
        treasuryOfGdp: -0.005,
        nationEffects: { "economy.growth": 0.002, "politics.protestPressure": -0.02 },
        alignment: { economicLeftRight: -0.1 },
        domestic: {
            sectors: ["agriculture", "food-processing"],
            magnitude: "moderate",
            signature: "act:farm-bill",
            reason: "Commodity supports and crop insurance land where the farms and the processors are.",
        },
        // Five years, which is the term the real one is written for.
        recurs: TURNS_PER_YEAR * 5,
        // A calendar rather than a condition, and stated as one: the farm bill is
        // due when the last one expires and for no other reason.
        arises: always,
    },
    FISCAL_ACTS.taxReliefAndGrowth,
    FISCAL_ACTS.taxFairnessAndRevenue,
    ...DOMESTIC_ACTS,
    {
        id: "act-immigration-reform",
        committee: "CMTE-JUDICIARY",
        title: "The Immigration Reform Act",
        summary: "Pairs enforcement at the border with legal status for people already working inside it. Both halves are the price of the other, and the Senate has sixty votes to find.",
        sponsor: "bipartisan",
        // Low, and the arithmetic is the point: this is the act in the catalogue
        // most likely to sit on the agenda for a whole term and never carry,
        // because ordinary legislation needs sixty and this is what sixty costs.
        appeal: 0.06,
        cost: { stability: -0.03, standing: -0.02 },
        nationEffects: { "security.borderControl": 0.06 },
        alignment: { nationalistGlobalist: -0.1, authLibertarian: -0.05 },
        // The enforcement half of the bargain is written as authority, not just as
        // money: a president tightening the border on a statute Congress passed for
        // that purpose is doing what Congress asked, and the courts read it that
        // way.
        constrains: { authorizesOrders: ["order-border-controls"] },
        domestic: {
            values: { nationalistGlobalist: -0.5 },
            urban: 0.4,
            magnitude: "moderate",
            channels: { immigration: 0.6 }, signature: "act:immigration-reform",
            reason: "Enforcement and status are read as a statement about who belongs, and states hear it differently.",
        },
        arises: (campaign) => {
            const stats = playerStats(campaign);
            // Either half of the real coalition: a labor market short of workers, or
            // a border the country does not believe is under control.
            return stats ? stats.economy.unemployment < 0.045 || stats.security.borderControl < 0.65 : false;
        },
    },
];
const BY_ID = new Map(LEGISLATIVE_ACTS.map((act) => [act.id, act]));
export function legislativeAct(id) {
    return BY_ID.get(id);
}
/** A narrower authored provision exists only for these named measures. */
export function amendableAct(id) {
    return TARGETED_DOMESTIC_ACTS[id] !== undefined;
}
export function actForText(id, text) {
    return text === "targeted" ? TARGETED_DOMESTIC_ACTS[id] : BY_ID.get(id);
}
/** Compatibility reader for the established housing proceedings. */
export function housingActForText(text) {
    return actForText("act-housing-supply", text);
}
/** The act a bill on the record is an instance of. */
export function actOf(bill) {
    return actForText(bill.act, bill.text?.enrolled ?? "base");
}
/**
 * What an act costs the country it passes in, money included.
 *
 * The catalogue states the money as a share of output, so the sum only exists
 * once there is a country to appropriate it from. Exported because every
 * surface that quotes a bill's price has to quote this one: reading `cost` off
 * the catalogue entry now yields the metric lines and no money at all.
 */
export function actCost(campaign, act) {
    if (act.treasuryOfGdp === undefined)
        return act.cost;
    return { ...act.cost, treasury: Math.round(act.treasuryOfGdp * playerGdp(campaign)) };
}
