import { debtToGdp } from "@admin/world";
import { selectNation } from "./state.js";
import { selectConflictBetween } from "./conflicts.js";
import { commitmentWeeklyCost } from "./commitments.js";
import { selectBudgetOutlook } from "./budget.js";
import { TURNS_PER_YEAR } from "./pace.js";
import { AGING_PER_YEAR, bookUsDebt, booksEffect, pendingOffshoreLeaseBonus, booksFor, commitmentOutlay, foreignWeek, outputStep, trendGrowth, usBooksWeek, usCrowding, usDiscretionaryLine, usOutlays, usPosition, usRevenue, usStructuralBalance, usStructuralMix, WEEK_OF_YEAR, } from "./national-books.js";
import { programShift } from "./fiscal-impulse.js";
import { fiscalCrises, foreignDowngradeEntry, rollBills, rollCoupons, usEffectiveRate, usRatingEntry, } from "./sovereign.js";
import { closeLimitWeek, governanceNotch, limitCeiling, limitEntry, limitRecord, mustWithhold, openLimitWeek, usUnprioritizedBalance, } from "./debt-limit.js";
import { AUTHORITY_CARRY_SHARE, DISCRETIONARY_BASE, inShutdown } from "./funding.js";
import { discretionaryCharge, lapseDelayedShare, nextLapseArrears } from "./discretionary-line.js";
import { sameBooks } from "./books-same.js";
import { apply } from "./effects.js";
const round = (value) => Math.round(value);
const round3 = (value) => Math.round(value * 1000) / 1000 + 0;
const NO_OUTLAY = { defense: 0, entitlements: 0, discretionary: 0, foreignAffairs: 0, debtService: 0 };
function roundLines(lines) {
    return Object.fromEntries(Object.entries(lines).map(([key, value]) => [key, round(value)]));
}
function sum(values) {
    return values.reduce((total, value) => total + value, 0);
}
/**
 * What the government takes in this year, source by source. Read off the
 * standing program rather than stored, so a player who changes the fiscal
 * stance sees the revenue line move on the same screen that made the change.
 */
export function selectRevenue(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return { income: 0, corporate: 0, tariff: 0, other: 0 };
    return roundLines(usRevenue(campaign, position));
}
/**
 * Past the X-date the Treasury can borrow nothing: interest is paid in full,
 * and everything else is paid from the week's receipts as far as they go.
 * What it cannot pay is withheld across the other lines in proportion, and
 * owed when the limit is lifted.
 */
function withheldLines(outlay, revenueTotal) {
    const shortfall = Math.max(0, sum(Object.values(outlay)) - revenueTotal);
    const payable = sum(Object.values(outlay)) - outlay.debtService;
    if (shortfall === 0 || payable <= 0)
        return { outlay, unpaid: 0 };
    const factor = Math.max(0, (payable - shortfall) / payable);
    const cut = { ...outlay };
    for (const line of ["defense", "entitlements", "discretionary", "foreignAffairs"])
        cut[line] = Math.floor(outlay[line] * factor);
    const over = sum(Object.values(cut)) - revenueTotal;
    if (over > 0)
        cut.entitlements = Math.max(0, cut.entitlements - over);
    return { outlay: cut, unpaid: sum(Object.values(outlay)) - sum(Object.values(cut)) };
}
function statementLines(campaign, position, withhold) {
    const revenue = roundLines(usRevenue(campaign, position));
    const outlay = roundLines(usOutlays(campaign, position));
    if (!withhold)
        return { revenue, outlay, unpaid: 0 };
    return { revenue, ...withheldLines(outlay, sum(Object.values(revenue))) };
}
/** Whether the Treasury is withholding payments now: the limit binds and its room ran out. */
function withholdingNow(campaign) {
    const limit = campaign.debtLimit;
    return limit?.bindingSince !== undefined && limit.xDateTurn !== undefined;
}
/**
 * What the government spends this year, function by function. Defense is the
 * authored military budget at today's prices; the rest are shares of what the
 * economy could produce, moved by the program that governs them. Commitments
 * are added on their own line, which is what makes an aid package something the
 * deficit feels rather than a sentence in a scenario.
 */
export function selectOutlay(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return NO_OUTLAY;
    return statementLines(campaign, position, withholdingNow(campaign)).outlay;
}
function statementFor(campaign, position, withhold) {
    if (!position) {
        return { revenue: { income: 0, corporate: 0, tariff: 0, other: 0 }, outlay: NO_OUTLAY,
            revenueTotal: 0, outlayTotal: 0, balance: 0, debt: 0, debtToGdp: 0, gdp: 0,
            commitmentCost: 0, cleanPowerPaymentsRecorded: 0, unpaid: 0 };
    }
    const { revenue, outlay, unpaid } = statementLines(campaign, position, withhold);
    const revenueTotal = sum(Object.values(revenue));
    const outlayTotal = sum(Object.values(outlay));
    return {
        revenue,
        outlay,
        revenueTotal,
        outlayTotal,
        balance: revenueTotal - outlayTotal,
        debt: round(position.debt),
        debtToGdp: round3(debtToGdp(position.runtime.stats)),
        gdp: round(position.output),
        commitmentCost: round(sum(Object.values(commitmentOutlay(campaign)))),
        cleanPowerPaymentsRecorded: round3((campaign.cleanPowerPurchases ?? []).reduce((total, purchase) => total + (purchase.paidUsdMillions ?? 0), 0)),
        unpaid,
    };
}
export function selectFiscalStatement(campaign) {
    return statementFor(campaign, usPosition(campaign), withholdingNow(campaign));
}
/**
 * The letter one year's figures alone would read at: the stock against output
 * and whether this year adds to it, the deficit weighted five to one because
 * agencies move on the trajectory before the ratio arrives. A snapshot, not the
 * rating: the rating is the agencies' notch in the books, reviewed on what
 * changed since they last looked (`reviewRating`).
 */
export function sovereignRatingFor(debtToGdpRatio, balanceShareOfGdp) {
    const strain = Math.max(0, debtToGdpRatio - balanceShareOfGdp * 5);
    if (strain < 0.9)
        return "AAA";
    if (strain < 1.6)
        return "AA";
    if (strain < 2.1)
        return "A";
    if (strain < 2.6)
        return "BBB";
    if (strain < 3.2)
        return "BB";
    if (strain < 3.9)
        return "B";
    if (strain < 4.6)
        return "CCC";
    return "D";
}
/** How much the Treasury is permitted to owe, in the same USD millions the debt is stated in. */
export function borrowingCeiling(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return 0;
    return round(limitCeiling(campaign, limitRecord(campaign), position.output));
}
/**
 * The path, a week at a time through the same booking the settlement uses. The
 * first week is the week `fiscalPhase` is about to book; after it the economy
 * runs at its potential on today's program and today's market rates, with the
 * aging of the programs still adding its tenth of a point a year.
 */
function projectUsDebt(campaign, position, weeks) {
    const statement = statementFor(campaign, position, withholdingNow(campaign));
    const macro = campaign.macro?.[position.runtime.base.id];
    const nominalGrowth = outputStep(trendGrowth(position.runtime)) * (1 + (macro?.expectedInflation ?? 0)) ** WEEK_OF_YEAR;
    const primary = usStructuralBalance(campaign, position);
    const { rates } = position.books;
    let debt = bookUsDebt(position.debt, statement.balance);
    let potential = position.potential * nominalGrowth;
    let bills = rates.bills ?? rates.effective;
    let coupons = rates.coupons ?? rates.effective;
    const point = (week) => ({
        year: week * WEEK_OF_YEAR,
        debt,
        gdp: round(potential),
        debtToGdp: round3(debt / potential),
        interest: round(usEffectiveRate(bills, coupons) * debt),
    });
    const points = [point(1)];
    for (let week = 2; week <= weeks; week += 1) {
        const aging = AGING_PER_YEAR * (week - 1) * WEEK_OF_YEAR;
        const effective = usEffectiveRate(bills, coupons);
        const balance = (primary - aging) * potential - effective * debt;
        const next = bookUsDebt(debt, balance);
        bills = rollBills(bills, macro?.policyRate ?? bills);
        coupons = rollCoupons(coupons, rates.market, Math.max(0, -balance) / Math.max(1, debt));
        debt = next;
        potential *= nominalGrowth;
        points.push(point(week));
    }
    return points;
}
/** The campaign with the drafted stances adopted, as the path reads it. */
function withDraft(campaign, draft) {
    if (!draft || Object.keys(draft).length === 0)
        return campaign;
    return { ...campaign, player: { ...campaign.player, policies: { ...campaign.player.policies, ...draft } } };
}
export function selectDebtTrajectory(campaign, options = {}) {
    const settings = typeof options === "number" ? { years: options } : options;
    const years = settings.years ?? 10;
    const every = Math.max(1, Math.round(settings.everyWeeks ?? TURNS_PER_YEAR));
    const drafted = withDraft(campaign, settings.draft);
    const position = usPosition(drafted);
    if (!position)
        return [];
    return projectUsDebt(drafted, position, Math.round(years * TURNS_PER_YEAR)).filter((_, index) => (index + 1) % every === 0);
}
const NO_COST = { deficit: 0, debt: 0, interest: 0 };
/**
 * What a set of effects would add to the deficit, the debt and the interest
 * bill, a year of each: the week booked through the same step the settlement
 * uses, then the rest of the year at the deficit it added, and a year's
 * interest on all of it at what new borrowing costs today.
 */
export function projectFiscalCost(campaign, effects) {
    if (effects.length === 0)
        return NO_COST;
    const after = apply(campaign, { source: "simulate", actor: "player", turn: campaign.turn, narration: { summary: "What the books would look like." }, effects });
    const was = usPosition(campaign);
    const now = usPosition(after);
    if (!was || !now)
        return NO_COST;
    const before = statementFor(campaign, was, withholdingNow(campaign)).balance;
    const balance = statementFor(after, now, withholdingNow(after)).balance;
    const week = bookUsDebt(now.debt, balance) - bookUsDebt(was.debt, before);
    const debt = round(week + ((TURNS_PER_YEAR - 1) * (before - balance)) / TURNS_PER_YEAR);
    return { deficit: round(before - balance), debt, interest: round(debt * was.books.rates.market) };
}
// --- The apportionment: where the President's money actually comes from -----
/**
 * The discretionary appropriation the President's authority is released from,
 * per year, in constant dollars.
 *
 * Not the discretionary outlay line: a fiscal program's added spending is
 * earmarked for the program and reaches the deficit, never the President's own
 * wallet, while a program's cut shrinks the base the authority is a share of.
 * And the interest on the stock the President's own program added comes out of
 * it, so a President's borrowing is paid for in the one currency a President
 * spends. Held on potential output in constant dollars, so a recession does not
 * shrink an appropriation and a year of inflation does not rescale every price
 * in the game.
 */
export function discretionaryAppropriation(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return 0;
    const shift = programShift(campaign);
    const cap = shift.cap ?? 0;
    const cut = Math.min(0, shift.discretionary + cap);
    const line = (position.potential / position.price) * Math.max(0.01, DISCRETIONARY_BASE + cut);
    return round(Math.max(0, line - discretionaryCharge(position.potential, cap, usCrowding(position)) / position.price));
}
/**
 * The rate the appropriation releases at, per week. No money is drawn from the
 * Treasury but in consequence of appropriations made by law, so the only thing
 * that credits the President's authority is the appropriation Congress has
 * already enacted, released a week at a time the way OMB apportions it.
 */
export function weeklyApportionment(campaign) {
    return round(discretionaryAppropriation(campaign) / TURNS_PER_YEAR);
}
/**
 * The most budget authority an administration may be holding at once: the
 * carry share the founding opens on. An unobligated balance is not banked, so
 * a president who spends nothing for a year does not arrive at the next one
 * holding a year's discretionary budget in hand.
 */
export function authorityCeiling(campaign) {
    return round(discretionaryAppropriation(campaign) * AUTHORITY_CARRY_SHARE);
}
/**
 * The week's release of the enacted appropriation, before the accounts draw
 * on it. Nothing is released during a lapse: that is what a lapse is, which is
 * what makes the guard in `obligationAvailability` a fact about the accounts.
 */
export const apportionmentPhase = (state) => {
    if (inShutdown(state))
        return [];
    const room = authorityCeiling(state) - state.player.metrics.treasury;
    const credit = Math.min(weeklyApportionment(state), round(room));
    if (credit <= 0)
        return [];
    return [
        {
            source: "simulate",
            actor: "player",
            turn: state.turn + 1,
            background: true,
            narration: {
                summary: `This week, ${credit.toLocaleString("en-US")} million of the budget Congress passed becomes available to spend.`,
            },
            effects: [{ kind: "metric", deltas: { treasury: credit } }],
        },
    ];
};
function bookUsWeek(state, position, crises) {
    const limit = limitRecord(state);
    const need = Math.max(0, -usUnprioritizedBalance(state, position)) / TURNS_PER_YEAR;
    const opening = openLimitWeek(state, limit, position, need);
    const statement = statementFor(state, position, mustWithhold(opening.state, need));
    const lapse = nextLapseArrears(position.books.lapseArrears ?? 0, (usDiscretionaryLine(state, position) * lapseDelayedShare(state)) / TURNS_PER_YEAR, inShutdown(state));
    const debt = bookUsDebt(position.debt, statement.balance, opening.arrearsPaid + lapse.paid);
    const closed = closeLimitWeek(state, opening, {
        debt,
        borrowing: Math.max(0, debt - position.debt),
        withheld: statement.unpaid / TURNS_PER_YEAR,
    });
    const economy = position.runtime.stats.economy;
    const compounding = outputStep(economy.growth);
    const gdp = round(economy.gdp * compounding);
    const books = usBooksWeek(state, position, {
        balance: statement.balance,
        debt,
        gdp,
        mix: usStructuralMix(state, position, statement.outlay),
        interestShare: statement.revenueTotal > 0 ? statement.outlay.debtService / statement.revenueTotal : 0,
        governance: governanceNotch(closed.state, state.turn),
        forceReview: closed.events.some((event) => event.kind === "x-date"),
        ...(crises.get(position.runtime.base.id) ? { crisis: crises.get(position.runtime.base.id) } : {}),
    });
    const { lapseArrears: _settled, ...rest } = books.books;
    const kept = { ...books, books: lapse.owed > 0 ? { ...rest, lapseArrears: lapse.owed } : rest };
    return { statement, debt, gdp, gdpPerCapita: round(economy.gdpPerCapita * compounding), limit: closed.state, events: closed.events, books: kept };
}
/** A foreign downgrade is the President's news where the United States is fighting that government or has a measure on it. */
function usCaused(state, nation) {
    if (selectConflictBetween(state, state.founding.nation, nation))
        return true;
    return Object.values(state.trade.measures).some((measure) => measure.target === nation && measure.origin === "us" && measure.liftedTurn === undefined);
}
/**
 * Every other government's week: its output grows at its own rate and its books
 * take the identity. Output is real and grows at real growth, as the
 * President's does; prices reach it through the index `debtToGdp` deflates by.
 */
function bookWorldWeek(state, crises) {
    const us = selectNation(state, state.founding.nation);
    const dollar = {
        inflation: us?.stats.economy.inflation ?? 0.02,
        expectedInflation: state.macro?.[state.founding.nation]?.expectedInflation ?? us?.stats.economy.inflation ?? 0.02,
    };
    const effects = [];
    const downgrades = [];
    for (const id of Object.keys(state.nations).sort((a, b) => a.localeCompare(b))) {
        const runtime = state.nations[id];
        if (id === state.founding.nation || !runtime)
            continue;
        const kept = state.books?.[id];
        const week = foreignWeek(state, runtime, booksFor(state, runtime), dollar, crises.get(id));
        effects.push({ kind: "nationStat", nation: id, setStats: { economy: { ...week.economy, ...(week.letter ? { sovereignRating: week.letter } : {}) } } });
        if (!sameBooks(kept, week.books))
            effects.push(booksEffect(id, week.books));
        if (week.action?.kind === "downgrade" && usCaused(state, id))
            downgrades.push({ ...week, nation: id });
    }
    return { effects, downgrades };
}
function fiscalWeekSummary(balance) {
    const weekly = round(balance / TURNS_PER_YEAR);
    if (weekly === 0)
        return "The week adds nothing to the federal debt.";
    const week = Math.abs(weekly).toLocaleString("en-US");
    return weekly < 0 ? `The week adds ${week} million to the federal debt.` : `The week retires ${week} million of the federal debt.`;
}
/**
 * The week the country's own books have, and every other country's.
 *
 * Runs after `commitmentPhase`, which is where the week's obligations are
 * finally known. It writes the levels (the debt the deficit accumulates into,
 * the output growth compounds, the rates the debt reprices at) and never a
 * rate of the economy: `macroDriftPhase` owns the law of growth, inflation and
 * unemployment. It is the one writer of output for every nation.
 *
 * The accrual is background: a week of arithmetic the Record does not need to
 * list. What the week decided (a rating action, the limit binding, the X-date,
 * a week of withheld payments) is written as its own packet naming its cause.
 */
export const fiscalPhase = (state) => {
    const position = usPosition(state);
    if (!position)
        return [];
    const crises = fiscalCrises(state);
    const booked = bookUsWeek(state, position, crises);
    const receiptIds = pendingOffshoreLeaseBonus(state).ids;
    const usBooks = receiptIds.length > 0 ? { ...booked.books.books,
        leaseBonusReceiptIds: [...(booked.books.books.leaseBonusReceiptIds ?? []), ...receiptIds] } : booked.books.books;
    const world = bookWorldWeek(state, crises);
    const nation = position.runtime.base.id;
    const accrual = [
        { kind: "nationStat", nation, setStats: { economy: { debt: booked.debt, gdp: booked.gdp, gdpPerCapita: booked.gdpPerCapita } } },
        ...world.effects,
        ...(sameBooks(state.books?.[nation], usBooks) ? [] : [booksEffect(nation, usBooks)]),
        { kind: "debtLimit", set: booked.limit },
    ];
    const turn = state.turn + 1;
    const entries = [
        usRatingEntry(state, position.books.anchor, booked.books, { crisisOpen: crises.has(nation), ownBorrowing: ownBorrowing(position) }),
        limitEntry(state, booked.events),
        foreignDowngradeEntry(state, world.downgrades.map((week) => ({ ...week, opening: week.books.anchor }))),
    ].filter((entry) => entry !== undefined);
    return [
        { source: "simulate", actor: "world", turn, background: true, narration: { summary: fiscalWeekSummary(booked.statement.balance) }, effects: accrual },
        ...entries.map((entry) => ({ source: "simulate", actor: "world", turn, narration: { summary: entry.summary }, effects: entry.effects })),
    ];
};
/** Whether the President's own program has added enough to the stock for the agencies to name it: a point of output. */
function ownBorrowing(position) {
    return (position.books.choiceDebt ?? 0) >= 0.01 * position.output;
}
// --- Solvency: whether the administration can pay for what it has voted -----
/**
 * The horizon an appropriation has to survive: the year it is voted for.
 *
 * The appropriation alone is not the standing bill, so the budget screen's
 * warning cannot be read against it. Two consequences of doing so, both
 * measured: maxing every buildable account to its cap from a fresh founding
 * still leaves thirty-seven weeks of funding, so no slider position a
 * first-term player can reach ever trips the warning; and a commitment, the
 * sustainment of a war, a basing arrangement, a standing program, costs
 * nothing at all as far as the warning is concerned, which is exactly the
 * spending a president is least able to see and most likely to accumulate.
 *
 * Counted against a year rather than half of one because a year is what the
 * appropriation is *for*: the honest statement is "this draft does not reach
 * the next appropriation", not "this draft runs out eventually".
 */
export const SOLVENCY_HORIZON_TURNS = TURNS_PER_YEAR;
/**
 * Whether the administration can pay for what it has voted itself, this week
 * and for the year the appropriation covers.
 *
 * Takes an optional allocation so the budget room can read the draft under the
 * player's hand rather than the one currently in force — the same argument
 * `selectBudgetOutlook` takes, and for the same reason.
 */
export function selectSolvency(campaign, allocation) {
    const appropriationCost = selectBudgetOutlook(campaign, allocation).turnCost;
    const commitmentCost = commitmentWeeklyCost(campaign);
    const weeklyDraw = appropriationCost + commitmentCost;
    // Net of the week's own release. A draft drawing less than the appropriation
    // apportions is funded forever, which is the honest reading of a government
    // living inside its own budget — measuring the stock against the gross draw
    // would have called every such government insolvent on a long enough horizon.
    const netDraw = weeklyDraw - weeklyApportionment(campaign);
    const turnsFunded = netDraw > 0 ? Math.floor(campaign.player.metrics.treasury / netDraw) : Infinity;
    const underfunded = netDraw > 0 && turnsFunded < SOLVENCY_HORIZON_TURNS;
    return {
        appropriationCost,
        commitmentCost,
        weeklyDraw,
        turnsFunded,
        underfunded,
        summary: underfunded
            ? `At this rate the money Congress set aside runs out in ${turnsFunded} week${turnsFunded === 1 ? "" : "s"}, before the budget year ends.`
            : "At this rate the money Congress set aside lasts the full budget year.",
    };
}
/**
 * Whether what this administration has voted itself survives the year, said in
 * both books at once.
 *
 * The budget room could already read the treasury running out. What it could
 * not read is the fact that makes that number mean something: the same claim
 * as a share of the discretionary spending the country actually does, and what
 * it does to a balance that was already negative before this presidency voted
 * anything.
 */
export function selectFiscalOutlook(campaign, allocation) {
    const solvency = selectSolvency(campaign, allocation);
    const statement = selectFiscalStatement(campaign);
    const annualDraw = round(solvency.weeklyDraw * TURNS_PER_YEAR);
    const discretionary = statement.outlay.discretionary;
    const survivesTheYear = !solvency.underfunded;
    return {
        weeklyDraw: solvency.weeklyDraw,
        annualDraw,
        discretionary,
        shareOfDiscretionary: discretionary > 0 ? round3(annualDraw / discretionary) : 0,
        balanceWithDraw: round(statement.balance - annualDraw),
        survivesTheYear,
        turnsFunded: solvency.turnsFunded,
        summary: survivesTheYear
            ? `A year of this draft is ${shareWords(annualDraw, discretionary)} of what the country spends on everything government does outside pensions, defense and interest, and the money Congress set aside covers it until the next budget.`
            : `A year of this draft is ${shareWords(annualDraw, discretionary)} of the discretionary budget, and the authority does not reach the next appropriation: it runs out in ${solvency.turnsFunded} week${solvency.turnsFunded === 1 ? "" : "s"}.`,
    };
}
function shareWords(draw, discretionary) {
    if (discretionary <= 0 || draw <= 0)
        return "nothing";
    return `${Math.round((draw / discretionary) * 100)}%`;
}
