import { FOUNDING_DYADS, worldNations } from "@admin/world";
import { relationshipKey } from "./state-campaign.js";
// Read against the country file's own bands: trust below -0.3 is hostile and
// below -0.1 wary, tension above 0.35 is no longer low, and a threat above 0.55
// is serious. A rival or an enemy at any intensity a source would bother to
// record clears those lines; that is what the row is saying.
const KIND_READINGS = {
    hostile: { trust: (i) => -(0.15 + 0.5 * i), tension: (i) => 0.25 + 0.5 * i, threat: (i) => 0.3 + 0.45 * i, hardens: true },
    rivalrous: { trust: (i) => -(0.1 + 0.3 * i), tension: (i) => 0.25 + 0.35 * i, threat: (i) => 0.45 + 0.3 * i, hardens: true },
    cool: { trust: (i) => 0.1 - 0.4 * i, tension: (i) => 0.15 + 0.3 * i, hardens: true },
    close: { trust: (i) => 0.3 + 0.5 * i, tension: (i) => 0.35 - 0.25 * i, threat: (i) => 0.25 - 0.2 * i, hardens: false },
    dependent: { trust: (i) => 0.2 + 0.4 * i, tension: (i) => 0.3 - 0.2 * i, hardens: false },
};
/**
 * How much of an enemy's hostility arrives as force, by its own authored
 * doctrine. A row says a pair is hostile; it does not say the weaker side points
 * an army at the stronger. A defensive government under blockade is an enemy
 * the reader worries about, not a military threat to it, which is how the
 * threat assessments read Havana beside Pyongyang.
 */
const POSTURE_REACH = {
    defensive: 0.25,
    balanced: 0.6,
    assertive: 1,
    expansionist: 1,
};
const postureById = new Map(worldNations.map((nation) => [nation.id, nation.doctrine.posture]));
// Three places, the same place the derivation settles at, so a sourced edge
// and a derived one round the same way and survive a save identically.
const round3 = (v) => Math.round(v * 1000) / 1000 || 0;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
/** Move a reading toward the row's target, never past it and never back the other way. */
function toward(current, target, raise) {
    return raise ? Math.max(current, target) : Math.min(current, target);
}
/** The reading a row sets on one direction of its pair: its levels where it has them, else its kind's. */
function targetFor(edge, row) {
    const reading = KIND_READINGS[row.kind];
    if (row.levels) {
        const first = edge.from === row.pair[0];
        return {
            trust: row.levels.trust[first ? 0 : 1],
            tension: row.levels.tension,
            threat: row.levels.threat[first ? 0 : 1],
        };
    }
    const i = clamp(row.intensity, 0, 1);
    const reach = POSTURE_REACH[postureById.get(edge.to) ?? "balanced"];
    const threat = reading.threat ? clamp(reading.threat(i) * (reading.hardens ? reach : 1), 0, 1) : undefined;
    return { trust: reading.trust(i), tension: reading.tension(i), ...(threat === undefined ? {} : { threat }) };
}
function overlay(edge, row) {
    const hard = KIND_READINGS[row.kind].hardens;
    const target = targetFor(edge, row);
    return {
        ...edge,
        trust: round3(clamp(toward(edge.trust, target.trust, !hard), -1, 1)),
        tension: round3(clamp(toward(edge.tension, target.tension, hard), 0, 1)),
        ...(target.threat === undefined ? {} : { militaryThreat: round3(clamp(toward(edge.militaryThreat, target.threat, hard), 0, 1)) }),
    };
}
/**
 * Lay the sourced dyads over a derived graph.
 *
 * Each row moves both directions of its pair, as bounded moves on trust,
 * tension and military threat: toward the reading the row's kind and intensity
 * give, never past it, and never softening an edge an adversarial row names or
 * hardening one a friendly row names. A pair the graph holds no edge for is
 * left alone, because the derivation decides who has a working relationship at
 * all and a row only says what that relationship is. It sits at the head of the
 * founding edge pipeline so that anything appended after it — a world posture,
 * a scenario's opening — reads the sourced pair rather than the derived one.
 */
export function applyFoundingDyads(graph, _player) {
    const next = { ...graph };
    for (const row of FOUNDING_DYADS) {
        const [a, b] = row.pair;
        for (const key of [relationshipKey(a, b), relationshipKey(b, a)]) {
            const edge = next[key];
            if (edge)
                next[key] = overlay(edge, row);
        }
    }
    return next;
}
