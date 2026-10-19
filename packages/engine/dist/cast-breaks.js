import { campaignPhaseSequence, turnPhasesFrom } from "./turn-phases.js";
/**
 * How a cabinet packet broke, read off what it does: a resignation empties the
 * chair, a challenge moves the minister into a faction of their own, and a
 * leak does neither. An announced departure is counted the week it is
 * announced, which is when the Secretary decided to go; the week the
 * transition ends is the same departure and is not counted again.
 */
function cabinetOutcomeOf(packet) {
    const systems = packet.provenance?.systems ?? [];
    if (systems.includes("handover"))
        return undefined;
    if (systems.includes("ordinary"))
        return "resignation";
    if (packet.effects.some((effect) => effect.kind === "cabinet"))
        return "resignation";
    const joinsFaction = packet.effects.some((effect) => effect.kind === "person" && "affiliation" in (effect.changes ?? {}));
    return joinsFaction ? "challenge" : "leak";
}
/**
 * The campaign's own turn phases, with the cabinet's weekly sweep counted as
 * it runs. Counting what the phase actually returns, rather than re-deriving
 * its roll here, keeps the tally honest to whatever the phase decides.
 * `observe` sees the state each phase plans against, which is how the harness
 * tells what each phase moved.
 */
export function countedPhases(charter, tally, observe, layout = false) {
    const counted = (run) => (state) => {
        const packets = run(state);
        for (const packet of packets) {
            const outcome = cabinetOutcomeOf(packet);
            if (outcome)
                tally[outcome] += 1;
        }
        return packets;
    };
    const observed = (id, run) => (state) => {
        observe?.(id, state);
        return run(state);
    };
    const sequence = campaignPhaseSequence(charter).map((phase) => ({
        ...phase,
        run: observed(phase.id, phase.id === "cabinetConsequencesPhase" ? counted(phase.run) : phase.run),
    }));
    return turnPhasesFrom(sequence, layout);
}
export function mean(values) {
    return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}
/** The weeks in a four-year term, which every per-term count is scaled to. */
const TERM_WEEKS = 208;
const round3 = (value) => Math.round(value * 1000) / 1000;
/**
 * Breaks per campaign, scaled to a four-year term so a one-year run and a
 * two-term run read on one scale. The mean rather than the median, because
 * most campaigns count a handful of each and a median of small integers hides
 * the rate.
 */
export function cabinetPerTerm(outcomes) {
    const perTerm = (outcome, kind) => outcome.turnsPlayed === 0 ? 0 : (outcome.cabinetBreaks[kind] * TERM_WEEKS) / outcome.turnsPlayed;
    return {
        leak: round3(mean(outcomes.map((o) => perTerm(o, "leak")))),
        challenge: round3(mean(outcomes.map((o) => perTerm(o, "challenge")))),
        resignation: round3(mean(outcomes.map((o) => perTerm(o, "resignation")))),
    };
}
