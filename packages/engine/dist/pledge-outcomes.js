import { programShiftOf } from "./fiscal-impulse.js";
import { lawShiftBySigning } from "./law-offsets.js";
import { usPosition, usStructuralBalance } from "./national-books.js";
import { plankDeliverable } from "./platform-deliverables.js";
import { hasOffshoreExplorationPermit } from "./offshore-leasing.js";
import { deliveredCleanPowerPurchase } from "./clean-power-purchasing.js";
import { selectNation } from "./state.js";
/** Less than a tenth of a point is the aging of the programs, not a budget closing. */
const CLOSING_MARGIN = 0.001;
/** A third of what the country imported at the oath, so a few weeks of drift is not a result. */
const IMPORT_FALL_SHARE = 1 / 3;
// A promise is the President's to keep. A law Congress passed over a veto, or
// one that became law with the President silent, is not the administration's
// act, so what it did to the books is taken back out before the budget is
// judged, and it cannot be the law that keeps a promise either.
//
// The books open on the inherited program, so the balance at the oath is that
// anchor plus what the platform's held programs changed on the first day.
function oathProgramBalance(campaign) {
    const held = Object.fromEntries((campaign.pledges ?? []).flatMap((pledge) => {
        const deliverable = plankDeliverable(pledge.plank);
        return deliverable?.kind === "hold-program" ? [[deliverable.domain, deliverable.stance]] : [];
    }));
    const shift = programShiftOf(held);
    return shift.take - shift.outlays;
}
function deficitClosed(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return false;
    const { unsigned } = lawShiftBySigning(campaign);
    const notTheirs = unsigned.take - unsigned.outlays;
    const { anchor } = position.books;
    const atOath = anchor.primaryBalance + oathProgramBalance(campaign) - (anchor.programBalance ?? 0);
    return usStructuralBalance(campaign, position) - notTheirs - atOath >= CLOSING_MARGIN;
}
function importsFell(campaign) {
    const us = selectNation(campaign, campaign.founding.nation);
    if (!us)
        return false;
    const opened = us.base.stats.energy.importDependence;
    return opened > 0 && us.stats.energy.importDependence <= opened * (1 - IMPORT_FALL_SHARE);
}
function tariffStands(campaign) {
    return Object.values(campaign.trade.measures).some((measure) => measure.kind === "tariff" && measure.origin === "us" && measure.liftedTurn === undefined);
}
const HELD_OUTCOMES = {
    "fiscal-austerity": {
        met: deficitClosed,
        keptWhen: "the budget is closer to balance than at the oath, setting the business cycle aside",
        missed: "the deficit had not closed",
    },
    "fiscal-investment": {
        met: (campaign) => {
            const { signed } = lawShiftBySigning(campaign);
            return signed.outlays - signed.transfers > 0;
        },
        keptWhen: "Congress has appropriated the building money",
        missed: "Congress had appropriated nothing to build with",
    },
    "fiscal-redistribution": {
        met: (campaign) => lawShiftBySigning(campaign).signed.take > 0,
        keptWhen: "a law raising what the top pays is in force",
        missed: "no law had raised what the top pays",
    },
    "industry-extraction": {
        met: (campaign) => hasOffshoreExplorationPermit(campaign) && importsFell(campaign),
        keptWhen: "an offshore lease and exploration permit have issued, and energy imports are a third lower than at the oath",
        missed: "a lease and exploration permit had not issued, or energy imports had not fallen by a third",
    },
    "industry-transition": {
        met: (campaign) => deliveredCleanPowerPurchase(campaign) && importsFell(campaign),
        keptWhen: "clean power was delivered under a federal purchase and energy imports are a third lower than at the oath",
        missed: "clean power had not been delivered under a federal purchase, or energy imports had not fallen by a third",
    },
    "trade-protective": {
        met: tariffStands,
        keptWhen: "a tariff you imposed is still in force",
        missed: "no tariff of yours was in force",
    },
};
/** What a held program's pledge promised, or nothing for a program no plank holds. */
export function heldOutcome(stance) {
    return HELD_OUTCOMES[stance];
}
