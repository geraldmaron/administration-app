import { selectFiscalStatement } from "./fiscal.js";
import { programShiftOf } from "./fiscal-impulse.js";
import { lawShift } from "./law-offsets.js";
import { discretionaryCharge, lapseDelayedShare } from "./discretionary-line.js";
import { usCrowding, usCustomsReceipts, usDiscretionaryLine, usForcedOutlays, usPosition, usRevenueTotal } from "./national-books.js";
/**
 * The year's balance, part by part. Each part is what that cause adds to the
 * balance on its own: the program and the laws against the inherited ones, the cycle as
 * the receipts and benefits a gap moves, the world as what a war or a street in
 * revolt forces, and interest as the whole bill. What the President's own added
 * stock costs in interest is paid out of the discretionary line, so it is
 * counted with the program: the books keep one added stock, whether a program,
 * a reply or an order borrowed it. Where a cap already holds the line lower,
 * only the crowding beyond the cap is the program's. The inherited part is what
 * is left, so the parts sum to the balance exactly.
 */
export function selectDeficitDrivers(campaign) {
    const position = usPosition(campaign);
    if (!position)
        return [];
    const statement = selectFiscalStatement(campaign);
    const forced = usForcedOutlays(campaign, position);
    const program = programShiftOf(campaign.player.policies);
    const laws = lawShift(campaign);
    const parts = {
        program: Math.round((program.take - program.outlays - (position.books.anchor.programBalance ?? 0)) * position.potential +
            discretionaryCharge(position.potential, laws.cap, usCrowding(position)) - laws.cap * position.potential),
        laws: Math.round((laws.take - laws.outlays) * position.potential),
        cycle: Math.round(usRevenueTotal(campaign, position) - usRevenueTotal(campaign, position, true) - forced.unemployment),
        world: -Math.round(forced.war + forced.unrest),
        orders: Math.round(usCustomsReceipts(campaign)),
        interest: -statement.outlay.debtService,
        limit: statement.unpaid + Math.round(usDiscretionaryLine(campaign, position) * lapseDelayedShare(campaign)),
    };
    const named = Object.values(parts).reduce((total, amount) => total + amount, 0);
    const drivers = [{ source: "inherited", amount: statement.balance - named }];
    for (const [source, amount] of Object.entries(parts)) {
        if (amount !== 0)
            drivers.push({ source, amount });
    }
    return drivers;
}
