import { CARGO_BUCKETS, CHOKEPOINT_CARGO } from "@admin/world";
import { sideOf } from "./conflicts.js";
import { disposition } from "./relationships.js";
import { selectNation, selectRelationship } from "./state.js";
// Passage through a strait a war has closed, decided flag by flag.
//
// A government that closes a strait does not have to stop every ship: it can
// let through cargo bound for itself, for its allies and for governments it
// reads warmly, and stop the rest. So what a closure takes off the market is
// the share of the strait's cargo bound for flags the closing government will
// not pass, and those are the countries that lose the supply. The cargo split
// comes from the world's table (`CHOKEPOINT_CARGO`); a strait with no split
// on file is closed to every flag alike, and so is cargo the source files only
// under a region, because no denier can tell those ships apart.
/**
 * Planning value: how warmly a closing government has to read a flag's
 * government (`disposition`, -1..1) to let its ships through when the two are
 * not aligned. Set above neutral, so passage is a favor rather than a default.
 */
export const PASSAGE_DISPOSITION = 0.3;
function aligned(campaign, a, b) {
    const pulls = (from, to) => selectNation(campaign, from)?.base.doctrine.alignmentPull.some((id) => id === to) ?? false;
    return pulls(a, b) || pulls(b, a);
}
/**
 * Whether the closing government lets this flag's ships through: its own and
 * its co-belligerents' always, its enemies' in this war never, otherwise an
 * aligned government's or one it reads warmly.
 */
export function letsThrough(campaign, conflict, denier, flag) {
    if (flag === denier)
        return true;
    const flagSide = sideOf(conflict, flag);
    if (flagSide !== undefined)
        return flagSide === sideOf(conflict, denier);
    if (aligned(campaign, denier, flag))
        return true;
    const relationship = selectRelationship(campaign, denier, flag);
    return relationship !== undefined && disposition(relationship, campaign) >= PASSAGE_DISPOSITION;
}
/** Who passes a strait this war closes, for one commodity's cargo. */
export function straitPassage(campaign, conflict, chokepoint, commodity, littoral) {
    const deniers = littoral.filter((shore) => sideOf(conflict, shore) !== undefined);
    const rows = CHOKEPOINT_CARGO.filter((row) => row.chokepoint === chokepoint && row.commodity === commodity);
    if (rows.length === 0)
        return { chokepoint, deniers, passing: [], stopped: [], stoppedShare: 1 };
    const passes = (destination) => !CARGO_BUCKETS.includes(destination) && deniers.every((denier) => letsThrough(campaign, conflict, denier, destination));
    const total = rows.reduce((sum, row) => sum + row.mbd, 0);
    const stoppedRows = rows.filter((row) => !passes(row.destination));
    return {
        chokepoint,
        deniers,
        passing: rows.filter((row) => passes(row.destination)).map((row) => row.destination),
        stopped: stoppedRows.map((row) => row.destination),
        stoppedShare: total > 0 ? stoppedRows.reduce((sum, row) => sum + row.mbd, 0) / total : 1,
    };
}
