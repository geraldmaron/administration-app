// Cohort-layer and domestic-memory audit rules.
import { COHORT_AXIS, worldStates } from "@admin/world";
/**
 * Equal-weight mean of each state's authored share for a cohort. Offline and
 * dataset-only; population-weighted nationalCohortShares is the runtime reader.
 */
function authoredCohortShare(cohort) {
    const axis = COHORT_AXIS[cohort];
    let sum = 0;
    for (const state of worldStates) {
        const axisShares = state.character.cohorts[axis];
        sum += axisShares[cohort] ?? 0;
    }
    return worldStates.length > 0 ? sum / worldStates.length : 0;
}
/**
 * Within an axis, shares add (disjoint cells). Across axes, multiply — the
 * independence approximation of the intersection the toll fell on.
 */
function combinedCohortShare(cohorts) {
    const byAxis = new Map();
    for (const cohort of cohorts) {
        const axis = COHORT_AXIS[cohort];
        byAxis.set(axis, (byAxis.get(axis) ?? 0) + authoredCohortShare(cohort));
    }
    let product = 1;
    for (const share of byAxis.values())
        product *= share;
    return product;
}
/** borneBy one-group with no cohorts is a group the prose cannot name. */
export function auditUnnamedGroupToll(def, findings) {
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position")
            continue;
        const human = reply.commitment.impact?.human;
        if (human?.borneBy !== "one-group")
            continue;
        if (human.cohorts !== undefined && human.cohorts.length > 0)
            continue;
        findings.push({
            kind: "unnamed-group-toll",
            severity: "error",
            scenario: def.id,
            message: `reply "${reply.id}" declares borneBy "one-group" without human.cohorts naming which group bore it`,
        });
    }
}
/**
 * A thousands/mass toll confined to cohorts whose combined national share is
 * under 5% is a declaration that does not describe itself.
 */
export function auditCohortTollImplausible(def, findings) {
    for (const reply of def.replies) {
        if (reply.commitment.kind !== "position")
            continue;
        const human = reply.commitment.impact?.human;
        const lives = human?.lives;
        if (lives !== "thousands" && lives !== "mass")
            continue;
        const cohorts = human?.cohorts;
        if (!cohorts || cohorts.length === 0)
            continue;
        const share = combinedCohortShare(cohorts);
        if (share >= 0.05)
            continue;
        findings.push({
            kind: "cohort-toll-implausible",
            severity: "error",
            scenario: def.id,
            message: `reply "${reply.id}" declares a "${lives}" toll on cohorts whose combined national share is ${(share * 100).toFixed(1)}% ` +
                `(below 5%) — a mass-casualty event that small is not what the band says`,
        });
    }
}
/**
 * A cohortStrain gate naming a cause slug no reply writes. Warning until the
 * corpus carries enough causes for the rule to harden.
 */
export function auditDeadCohortGate(defs, findings) {
    const written = new Set();
    for (const def of defs) {
        written.add(def.class);
        for (const reply of def.replies) {
            const commitment = reply.commitment;
            if ((commitment.kind === "position" || commitment.kind === "instrument") &&
                commitment.domestic !== undefined) {
                written.add(commitment.domestic.signature);
            }
        }
    }
    for (const def of defs) {
        for (const condition of def.conditions) {
            if (condition.kind !== "cohortStrain" || condition.cause === undefined)
                continue;
            if (written.has(condition.cause))
                continue;
            findings.push({
                kind: "dead-cohort-gate",
                severity: "warning",
                scenario: def.id,
                message: `waits on cohortStrain cause "${condition.cause}", which no reply in this batch writes`,
            });
        }
    }
}
/** A domestic week with locus.state whose replies never route. */
export function auditUnroutedDomesticAct(def, findings) {
    if (def.cast.pick !== "none" || def.locus.state === undefined)
        return;
    const routed = def.replies.some((reply) => {
        const commitment = reply.commitment;
        if (commitment.kind === "position") {
            return commitment.gazetteer !== undefined || commitment.domestic !== undefined;
        }
        if (commitment.kind === "instrument")
            return commitment.domestic !== undefined;
        return false;
    });
    if (routed)
        return;
    findings.push({
        kind: "unrouted-domestic-act",
        severity: "error",
        scenario: def.id,
        message: "domestic scenario with locus.state declares neither gazetteer nor domestic on any reply — the state bind cannot remember the act",
    });
}
/** A stateGrievance gate naming a signature slug no reply in the batch writes. */
export function auditDeadGrievanceGate(defs, findings) {
    const written = new Set();
    for (const def of defs) {
        for (const reply of def.replies) {
            const commitment = reply.commitment;
            if ((commitment.kind === "position" || commitment.kind === "instrument") &&
                commitment.domestic !== undefined) {
                written.add(commitment.domestic.signature);
            }
        }
    }
    for (const def of defs) {
        for (const condition of def.conditions) {
            if (condition.kind !== "stateGrievance" || condition.signature === undefined)
                continue;
            if (written.has(condition.signature))
                continue;
            findings.push({
                kind: "dead-grievance-gate",
                severity: "warning",
                scenario: def.id,
                message: `waits on stateGrievance signature "${condition.signature}", which no reply in this batch writes`,
            });
        }
    }
}
export function auditStateGrievance(def, findings) {
    const ungrounded = def.conditions.some((condition) => condition.kind === "stateGrievance" && condition.scope === "locus" && def.locus.state === undefined);
    if (!ungrounded)
        return;
    findings.push({
        kind: "ungrounded-state-grievance",
        severity: "error",
        scenario: def.id,
        message: 'conditions on stateGrievance with scope "locus" but locus.state is missing, so the gate can never evaluate',
    });
}
/**
 * An event that happens in one place, priced as if it happened everywhere.
 * A locus at the capital is exempt: that is the seat of the decision, not the
 * place it lands.
 *
 * A domestic signature routes by the country's economy and values: it moves
 * every state that clears the floor. That is right for a tariff and wrong for a
 * flood on one river: a scenario whose locus is a place at home, and whose
 * reply declares a national signature without also moving that place's own
 * lean (`gazetteer.stateLean`), tells the player the whole country answered a
 * question only one state was asked. A warning, because a national echo of a
 * local event is sometimes the point — it should be a decision, beside the
 * local effect rather than instead of it.
 */
export function auditUnplacedDomesticSignature(def, findings) {
    // The capital is where a national decision is taken, not where it lands: a
    // currency run staged in Washington is the country's, and the national route
    // is the right one.
    if (def.locus.site === "capital")
        return;
    const place = def.locus.ground === "home" ? (def.locus.state ?? def.locus.city) : undefined;
    if (!place)
        return;
    for (const reply of def.replies) {
        const commitment = reply.commitment;
        if (commitment.kind !== "position" || !commitment.domestic)
            continue;
        if (commitment.gazetteer?.stateLean !== undefined)
            continue;
        findings.push({
            kind: "unplaced-domestic-signature",
            severity: "warning",
            scenario: def.id,
            message: `reply "${reply.id}" happens at ${place} but routes only the national signature "${commitment.domestic.signature}"; add gazetteer.stateLean so the place it happened moves first`,
        });
    }
}
