import { IMPULSE_SPAN_YEARS, projectFiscalCost, projectFiscalImpulse, selectBooksChange, selectBooksOpening, selectDebtLimit, selectDebtTrajectory, selectFiscalStatement, selectMacroState, selectNationalBooks, selectSovereign, } from "@admin/engine";
import { formatRatio } from "../format/figures";
import { formatMoney } from "../format/money";
function compose(inputs, history, debtToGdp, comingYear, balance, interestShare) {
    if (!inputs.books || !inputs.sovereign || !inputs.macro)
        return undefined;
    return {
        debtToGdp,
        debtToGdpComingYear: comingYear,
        balance,
        interestShare,
        sovereign: inputs.sovereign,
        limit: inputs.limit,
        ...(history.yearChange ? { yearChange: history.yearChange } : {}),
        ...(history.opening ? { opening: history.opening } : {}),
    };
}
/**
 * The ratio's move over the next fifty-two weeks, both ends read off the one
 * projection, so a gap between output and its potential cannot pass for a move.
 */
function comingYearChange(campaign) {
    const weeks = selectDebtTrajectory(campaign, { years: 53 / 52, everyWeeks: 1 });
    const first = weeks[0];
    const last = weeks.at(-1);
    return first && last ? last.debtToGdp - first.debtToGdp : 0;
}
export function fiscalBooks(campaign) {
    const nation = campaign.founding.nation;
    const statement = selectFiscalStatement(campaign);
    const interestShare = statement.revenueTotal > 0 ? statement.outlay.debtService / statement.revenueTotal : 0;
    return compose({
        books: selectNationalBooks(campaign, nation),
        sovereign: selectSovereign(campaign, nation),
        macro: selectMacroState(campaign, nation),
        limit: selectDebtLimit(campaign),
    }, { yearChange: selectBooksChange(campaign, 52), opening: selectBooksOpening(campaign) }, statement.debtToGdp, comingYearChange(campaign), statement.balance, interestShare);
}
/** The ten-year debt-to-output path, as `FiscalBooks`' series prop wants it. */
export function fiscalPath(campaign) {
    return selectDebtTrajectory(campaign).map((point) => ({ label: `Year ${point.year}`, value: point.debtToGdp, figure: formatRatio(point.debtToGdp) }));
}
/** The year's balance, as `FiscalBooks`' series prop wants it; negative is a deficit. */
export function fiscalBalanceSeries(campaign) {
    const balance = selectFiscalStatement(campaign).balance;
    return [{ label: "This year", value: balance, figure: formatMoney(balance) }];
}
const REVENUE_LABELS = { income: "Individual income", corporate: "Corporate income", tariff: "Tariffs", other: "Other" };
const OUTLAY_LABELS = {
    defense: "Defense",
    entitlements: "Entitlements",
    discretionary: "Discretionary",
    foreignAffairs: "Foreign affairs",
    debtService: "Interest",
};
/** This year's revenue by source, as `FiscalBooks`' series prop wants it. */
export function fiscalRevenueSeries(campaign) {
    const statement = selectFiscalStatement(campaign);
    return Object.entries(statement.revenue).map(([source, value]) => ({ label: REVENUE_LABELS[source], value, figure: formatMoney(value) }));
}
/** This year's outlays by function, as `FiscalBooks`' series prop wants it. */
export function fiscalOutlaySeries(campaign) {
    const statement = selectFiscalStatement(campaign);
    return Object.entries(statement.outlay).map(([fn, value]) => ({ label: OUTLAY_LABELS[fn], value, figure: formatMoney(value) }));
}
/**
 * The public-investment program's outlays reach demand only as they are
 * spent, not as they are authorized (the engine's `INVESTMENT_SPENDOUT`: 25%
 * of a step in its first year, 44% by the second, 58% by the third). The tax
 * cut half of every other program still fades the way `fadeWeeks` says; this
 * is the one figure a player needs that `fadeWeeks` cannot state, because it
 * runs in years, not weeks.
 */
const INVESTMENT_SPEND_OUT_YEARS = 3;
/**
 * The fiscal price of a draft, for the preview beside it: nothing where it
 * would add nothing, so a price row is drawn only where there is a price.
 *
 * A drafted stance is priced as the policy effect that would adopt it, through
 * the same statement the week's settlement books, so a program's row states
 * what it adds to the deficit rather than the zero an act-only reading gave it.
 */
export function fiscalPreview(campaign, draft, effects) {
    const adopted = Object.entries(draft).flatMap(([domain, stance]) => stance ? [{ kind: "policy", domain, stance }] : []);
    const cost = projectFiscalCost(campaign, [...adopted, ...effects]);
    const impulse = projectFiscalImpulse(campaign, draft);
    const priced = cost.deficit !== 0 || cost.debt !== 0 || cost.interest !== 0 || impulse !== 0;
    if (!priced)
        return undefined;
    const investing = draft.fiscal === "fiscal-investment";
    return {
        cost,
        impulse,
        fadeWeeks: Math.round(IMPULSE_SPAN_YEARS * 52),
        ...(investing ? { spentOverYears: INVESTMENT_SPEND_OUT_YEARS } : {}),
    };
}
