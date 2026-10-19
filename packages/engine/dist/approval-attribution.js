import { OPINION_DRIVERS } from "./opinion-drivers.js";
import { OPINION_WEEK_SUMMARY, OPINION_WEIGHTS } from "./opinion.js";
import { approvalPathOf } from "./opinion-movement.js";
import { opinionTargets } from "./opinion-causes.js";
const PATHS = ["drift", "decisions", "pledges", "world"];
const zeroDrivers = () => Object.fromEntries(OPINION_DRIVERS.map((d) => [d, 0]));
const zeroGaps = () => Object.fromEntries(PATHS.map((path) => [path, zeroDrivers()]));
function copyGaps(gaps) {
    return Object.fromEntries(PATHS.map((path) => [path, { ...gaps[path] }]));
}
/** Whatever the opening left between the mood and its targets is the world's to close. */
export function openAttribution(campaign) {
    const targets = opinionTargets(campaign);
    const gaps = zeroGaps();
    for (const driver of OPINION_DRIVERS)
        gaps.world[driver] = targets[driver] - campaign.player.opinion[driver];
    return { gaps, byDriver: zeroDrivers(), byPath: { drift: 0, decisions: 0, pledges: 0, world: 0 } };
}
/** Charges a road with how far it moved each judgment's target. */
function chargeTargets(ledger, from, to, path) {
    const gaps = copyGaps(ledger.gaps);
    for (const driver of OPINION_DRIVERS)
        gaps[path][driver] += to[driver] - from[driver];
    return { ...ledger, gaps };
}
/**
 * Credits one ledger entry's mood movement. A direct write belongs to its own
 * road and leaves that road holding the gap it opened. The weekly revision is
 * paid out across the roads by the share of the open gap each holds, and
 * closes each road's gap by the fraction it closed of the whole.
 */
function creditEntry(ledger, entry) {
    if (!entry.mood)
        return ledger;
    const gaps = copyGaps(ledger.gaps);
    const byDriver = { ...ledger.byDriver };
    const byPath = { ...ledger.byPath };
    const revision = entry.description === OPINION_WEEK_SUMMARY;
    for (const driver of OPINION_DRIVERS) {
        const moved = entry.mood[driver] ?? 0;
        if (moved === 0)
            continue;
        const weighted = Math.abs(moved) * OPINION_WEIGHTS[driver];
        byDriver[driver] += weighted;
        if (!revision) {
            const path = approvalPathOf(entry);
            byPath[path] += weighted;
            gaps[path][driver] -= moved;
            continue;
        }
        const open = PATHS.reduce((sum, path) => sum + gaps[path][driver], 0);
        const held = PATHS.reduce((sum, path) => sum + Math.abs(gaps[path][driver]), 0);
        const closed = open !== 0 ? moved / open : 0;
        if (held === 0 || closed <= 0) {
            byPath.drift += weighted;
            continue;
        }
        for (const path of PATHS) {
            byPath[path] += (weighted * Math.abs(gaps[path][driver])) / held;
            gaps[path][driver] *= 1 - Math.min(1, closed);
        }
    }
    return { gaps, byDriver, byPath };
}
/**
 * The phases that act for the President inside the turn: the standing program
 * they chose does its week's work in the policy phase, and the pledges they ran
 * on are judged in theirs. Every other phase is the world.
 */
const PHASE_ROADS = { policyPhase: "decisions", budgetPhase: "decisions", pledgePhase: "pledges" };
function attributeSegment(targetsOf) {
    return (ledger, segment) => {
        if (segment.from === segment.to)
            return ledger;
        const charged = chargeTargets(ledger, targetsOf(segment.from), targetsOf(segment.to), segment.road);
        return segment.to.ledger.slice(segment.from.ledger.length).reduce(creditEntry, charged);
    };
}
/**
 * One week of a harness campaign: `start` before the President acted,
 * `decided` after their acts and appointments, then each phase of the turn from
 * the state it planned against to the next one's, and `end` after the turn
 * ran. Each stretch's target movement is charged to its road before the mood
 * movement it wrote is credited, so the revision late in the turn pays out
 * against everything the week moved before it.
 */
export function attributeWeek(ledger, start, decided, phases, end) {
    const seen = new Map();
    const targetsOf = (campaign) => {
        const known = seen.get(campaign) ?? opinionTargets(campaign);
        seen.set(campaign, known);
        return known;
    };
    const turn = phases.length > 0
        ? phases.map((phase, index) => ({ road: PHASE_ROADS[phase.id] ?? "world", from: phase.state, to: phases[index + 1]?.state ?? end }))
        : [{ road: "world", from: decided, to: end }];
    const segments = [{ road: "decisions", from: start, to: decided }, ...turn];
    return segments.reduce(attributeSegment(targetsOf), ledger);
}
/** The credited movement as shares, in the shape the harness reports. */
export function attributedMovement(ledger) {
    const total = OPINION_DRIVERS.reduce((sum, driver) => sum + ledger.byDriver[driver], 0);
    const share = (value) => (total > 0 ? Math.round((value / total) * 1000) / 1000 : 0);
    return {
        byDriver: Object.fromEntries(OPINION_DRIVERS.map((driver) => [driver, share(ledger.byDriver[driver])])),
        byPath: Object.fromEntries(PATHS.map((path) => [path, share(ledger.byPath[path])])),
        total: Math.round(total * 10_000) / 10_000,
    };
}
