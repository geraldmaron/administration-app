/** Whether two books records say the same thing, so a government whose books did not move writes nothing. */
export function sameBooks(a, b) {
    if (!a)
        return false;
    return (a === b ||
        (a.anchor === b.anchor &&
            a.rates.effective === b.rates.effective &&
            a.rates.market === b.rates.market &&
            a.rates.bills === b.rates.bills &&
            a.rates.coupons === b.rates.coupons &&
            a.rating === b.rating &&
            a.choiceDebt === b.choiceDebt &&
            a.lapseArrears === b.lapseArrears &&
            (a.leaseBonusReceiptIds ?? []).join("|") === (b.leaseBonusReceiptIds ?? []).join("|") &&
            a.trail === b.trail &&
            a.stress === b.stress &&
            a.impulse === b.impulse &&
            a.aidSeen === b.aidSeen &&
            a.lastStructuralBalance === b.lastStructuralBalance &&
            a.investmentSpent === b.investmentSpent &&
            sameMix(a.structural, b.structural)));
}
function sameMix(a, b) {
    return a === b || (a !== undefined && b !== undefined && a.taxes === b.taxes && a.purchases === b.purchases && a.transfers === b.transfers);
}
