import { describe, expect, it } from "vitest";
import { relationshipKey } from "./state.js";
import { foundedForBalance } from "./balance-harness.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import { borderIncidentAssessmentPackets, borderIncidentPackets } from "./border-incidents.js";
import { worldEventPhase } from "./world-events.js";
import { apply } from "./effects.js";
import { createSave, loadSave } from "./save.js";
import { historyPressure } from "./relationships.js";
const zeroStreams = {
    stream: () => ({ key: "test-evidence", next: () => 0, nextInt: (min) => min, pick: (items) => items[0] }),
};
const noEvidenceStreams = {
    stream: () => ({ key: "test-no-evidence", next: () => 0.99, nextInt: (min) => min, pick: (items) => items[0] }),
};
function borderCampaign() {
    const base = foundedForBalance("border-incident-test").campaign;
    const a = base.founding.nation;
    const b = base.nations[a].base.geo.neighbors.find((id) => base.nations[id] && base.relationships[relationshipKey(a, id)] && base.relationships[relationshipKey(id, a)]);
    if (!b)
        throw new Error("The playable nation needs a real, linked land neighbor");
    const forward = base.relationships[relationshipKey(a, b)];
    const back = base.relationships[relationshipKey(b, a)];
    return { ...base, relationships: {
            [relationshipKey(a, b)]: { ...forward, trust: 0.4, tension: 0.5, militaryThreat: 0.3, history: [] },
            [relationshipKey(b, a)]: { ...back, trust: 0.4, tension: 0.5, militaryThreat: 0.3, history: [] },
        } };
}
function firedCampaign() {
    const base = borderCampaign();
    for (let index = 0; index < 5000; index += 1) {
        const seed = makeCampaignSeed(`border-hazard-${index}`);
        const candidate = { ...base, seed };
        if (borderIncidentPackets(candidate, createRngStreams(seed)).length)
            return candidate;
    }
    throw new Error("No bounded incident seed found");
}
function npcBorderCampaign() {
    const base = foundedForBalance("npc-border-incident-test").campaign;
    const pair = Object.values(base.nations).flatMap((nation) => nation.base.geo.neighbors.map((neighbor) => [nation.base.id, neighbor]))
        .find(([a, b]) => a < b && a !== base.founding.nation && b !== base.founding.nation &&
        base.relationships[relationshipKey(a, b)] && base.relationships[relationshipKey(b, a)]);
    if (!pair)
        throw new Error("The dataset needs a linked NPC land border");
    const [a, b] = pair;
    return { ...base, relationships: {
            [relationshipKey(a, b)]: { ...base.relationships[relationshipKey(a, b)], trust: -0.7, tension: 0.9, militaryThreat: 0.8, history: [] },
            [relationshipKey(b, a)]: { ...base.relationships[relationshipKey(b, a)], trust: -0.7, tension: 0.9, militaryThreat: 0.8, history: [] },
        } };
}
const hasDeliberateClash = (packet) => packet.effects.some((effect) => effect.kind === "relationship" && effect.addHistory?.kind === "world-event:border-clash");
describe("frontier incidents distinct from deliberate attacks", () => {
    it("can arise at a tense adversarial border without presuming a deliberate order", () => {
        const base = borderCampaign();
        const [a, b] = Object.values(base.relationships).map((edge) => [edge.from, edge.to])[0];
        const hostile = { ...base, relationships: {
                [relationshipKey(a, b)]: { ...base.relationships[relationshipKey(a, b)], trust: -0.7, tension: 0.8 },
                [relationshipKey(b, a)]: { ...base.relationships[relationshipKey(b, a)], trust: -0.7, tension: 0.8 },
            } };
        expect(borderIncidentPackets(hostile, zeroStreams)).toHaveLength(1);
    });
    it("does not relieve pressure that the incident did not actually add", () => {
        const base = borderCampaign();
        const [a, b] = Object.values(base.relationships).map((edge) => [edge.from, edge.to])[0];
        const key = relationshipKey(a, b);
        const saturated = { ...base, relationships: { ...base.relationships,
                [key]: { ...base.relationships[key], tension: 0.99, militaryThreat: 0.99 },
            } };
        const opened = apply(saturated, borderIncidentPackets(saturated, zeroStreams)[0]);
        const incident = Object.values(opened.borderIncidents)[0];
        const directed = incident.pressure[incident.parties[0] === a ? 0 : 1];
        expect(directed.tensionAdded).toBeCloseTo(0.01);
        expect(directed.militaryThreatAdded).toBeCloseTo(0.01);
        const lowered = { ...opened, turn: opened.turn + 2, relationships: { ...opened.relationships,
                [key]: { ...opened.relationships[key], tension: 0.99, militaryThreat: 0.99 },
            } };
        const assessed = apply(lowered, borderIncidentAssessmentPackets(lowered, zeroStreams)[0]);
        expect(assessed.relationships[key].tension).toBeGreaterThanOrEqual(0.99);
        expect(assessed.relationships[key].militaryThreat).toBeGreaterThanOrEqual(0.99);
    });
    it("leaves attribution unresolved and pressure standing when records do not support a finding", () => {
        const base = borderCampaign();
        const opened = apply(base, borderIncidentPackets(base, zeroStreams)[0]);
        const due = { ...opened, turn: opened.turn + 2 };
        const assessed = apply(due, borderIncidentAssessmentPackets(due, noEvidenceStreams)[0]);
        const incident = Object.values(assessed.borderIncidents)[0];
        expect(incident.assessment).toEqual({ turn: due.turn, finding: "undetermined", confidence: "low", evidence: [] });
        const [a, b] = incident.parties;
        expect(assessed.relationships[relationshipKey(a, b)].tension).toBe(opened.relationships[relationshipKey(a, b)].tension);
        expect(assessed.relationships[relationshipKey(b, a)].tension).toBe(opened.relationships[relationshipKey(b, a)].tension);
        expect(assessed.feed.at(-1).headline).toContain("cannot establish who fired first");
    });
    it("does not file a deliberate clash on the same pair and week as an independent incident", () => {
        // A deliberate clash is a weekly hazard raised by an episode, so the pair
        // is put in the middle of one: four clashes in the last two months.
        const quiet = npcBorderCampaign();
        const key = Object.keys(quiet.relationships)[0];
        const episode = [5, 6, 7, 8].map((weeks) => ({ turn: quiet.turn - weeks, kind: "world-event:border-clash", description: "an earlier clash" }));
        const base = { ...quiet, turn: quiet.turn + 8, relationships: { ...quiet.relationships, [key]: { ...quiet.relationships[key], history: episode.map((e) => ({ ...e, turn: e.turn + 8 })) } } };
        let witnessed = false;
        for (let index = 0; index < 5000 && !witnessed; index += 1) {
            const seed = makeCampaignSeed(`npc-border-hazard-${index}`);
            const candidate = { ...base, seed };
            const [incidentPacket] = borderIncidentPackets(candidate, createRngStreams(seed));
            if (!incidentPacket)
                continue;
            const incident = incidentPacket.effects.find((effect) => effect.kind === "borderIncident");
            if (!incident || incident.kind !== "borderIncident")
                continue;
            const suppressed = { ...candidate, borderIncidents: { [incident.incident.id]: incident.incident } };
            if (!worldEventPhase(suppressed).some(hasDeliberateClash))
                continue;
            const sameWeek = worldEventPhase(candidate);
            expect(sameWeek.some((packet) => packet.effects.some((effect) => effect.kind === "borderIncident"))).toBe(true);
            expect(sameWeek.some(hasDeliberateClash)).toBe(false);
            witnessed = true;
        }
        expect(witnessed).toBe(true);
    });
    it("opens an uncertain, cause-linked record on a real land border without assigning blame", () => {
        const campaign = firedCampaign();
        const [packet] = borderIncidentPackets(campaign, createRngStreams(campaign.seed));
        expect(packet).toBeDefined();
        expect(packet.provenance?.decision).toBeUndefined();
        expect(JSON.stringify(packet)).not.toMatch(/likely-inadvertent|orders logs|radio records/);
        expect(packet.effects.some((effect) => effect.kind === "conflict" || effect.kind === "populationToll")).toBe(false);
        const after = apply(campaign, packet);
        const [incident] = Object.values(after.borderIncidents ?? {});
        expect(incident).toBeDefined();
        expect(incident.causedBy).toBe(after.ledger.at(-1).causal.eventId);
        expect(incident.assessment).toBeUndefined();
        const [a, b] = incident.parties;
        expect(after.nations[a].base.geo.neighbors).toContain(b);
        expect(after.relationships[relationshipKey(a, b)].trust).toBe(campaign.relationships[relationshipKey(a, b)].trust);
        expect(historyPressure(after.relationships[relationshipKey(a, b)], after.turn)).toBe(historyPressure(campaign.relationships[relationshipKey(a, b)], after.turn));
        expect(after.relationships[relationshipKey(b, a)].grudges).toEqual([]);
        expect(after.feed.at(-1).actor).toBeUndefined();
        expect(after.feed.at(-1).headline).toContain("who fired first is not established");
        expect(borderIncidentPackets(after, createRngStreams(campaign.seed))).toEqual([]);
    });
    it("assesses the same saved incident later, with evidence and no invented friendship", () => {
        const campaign = firedCampaign();
        const opened = apply(campaign, borderIncidentPackets(campaign, createRngStreams(campaign.seed))[0]);
        const reloaded = loadSave(JSON.parse(JSON.stringify(createSave(opened))));
        expect(reloaded.borderIncidents).toEqual(opened.borderIncidents);
        const pending = { ...reloaded, turn: opened.turn + 2 };
        const [packet] = borderIncidentAssessmentPackets(pending, createRngStreams(pending.seed));
        expect(packet).toBeDefined();
        expect(packet.provenance?.causeIds).toEqual([Object.values(opened.borderIncidents)[0].causedBy]);
        const assessed = apply(pending, packet);
        const [incident] = Object.values(assessed.borderIncidents);
        expect(incident.assessment).toBeDefined();
        expect(["likely-inadvertent", "undetermined"]).toContain(incident.assessment.finding);
        expect(incident.assessment.finding === "likely-inadvertent").toBe(incident.assessment.evidence.length === 2);
        expect(borderIncidentAssessmentPackets(assessed, createRngStreams(assessed.seed))).toEqual([]);
        const [a, b] = incident.parties;
        expect(assessed.relationships[relationshipKey(a, b)].trust).toBe(opened.relationships[relationshipKey(a, b)].trust);
        expect(assessed.relationships[relationshipKey(b, a)].trust).toBe(opened.relationships[relationshipKey(b, a)].trust);
    });
    it("is reachable through the actual world-event phase and leaves the deliberate clash decision separate", () => {
        const campaign = firedCampaign();
        const packets = worldEventPhase(campaign);
        expect(packets.some((packet) => packet.effects.some((effect) => effect.kind === "borderIncident"))).toBe(true);
        expect(packets.filter((packet) => packet.effects.some((effect) => effect.kind === "borderIncident")))
            .toHaveLength(1);
    });
});
