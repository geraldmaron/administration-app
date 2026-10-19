import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { OPINION_WEEK_SUMMARY, OPINION_WEIGHTS } from "./opinion.js";
/** The road one ledger entry's own mood movement came in on. */
export function approvalPathOf(entry) {
    if ((entry.causal?.systems ?? []).includes("platform"))
        return "pledges";
    if (entry.description === OPINION_WEEK_SUMMARY)
        return "drift";
    return entry.actor === "player" ? "decisions" : "world";
}
/**
 * How much of a stretch of the ledger's approval movement each judgment
 * carried, and by which road.
 *
 * Read off the mood diff every packet already leaves on its ledger entry, each
 * driver's move priced at its resting weight and counted whichever way it went,
 * because the question is what moves the number, not where it ended. Resting
 * rather than salient weights so two campaigns can be compared on one scale.
 */
export function approvalMovement(ledger, fromTurn) {
    const byDriver = Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, 0]));
    const byPath = { drift: 0, decisions: 0, pledges: 0, world: 0 };
    for (const entry of ledger) {
        if (entry.turn < fromTurn || !entry.mood)
            continue;
        const path = approvalPathOf(entry);
        for (const driver of OPINION_DRIVERS) {
            const moved = Math.abs(entry.mood[driver] ?? 0) * OPINION_WEIGHTS[driver];
            byDriver[driver] += moved;
            byPath[path] += moved;
        }
    }
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + byDriver[driver], 0);
    const share = (value) => (total > 0 ? Math.round((value / total) * 1000) / 1000 : 0);
    return {
        byDriver: Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, share(byDriver[driver])])),
        byPath: { drift: share(byPath.drift), decisions: share(byPath.decisions), pledges: share(byPath.pledges), world: share(byPath.world) },
        total: Math.round(total * 10_000) / 10_000,
    };
}
