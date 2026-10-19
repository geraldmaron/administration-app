import { describe, expect, it } from "vitest";
import { Person } from "@admin/world";
import { buildCampaign, person } from "./__fixtures__/campaign.js";
import { cabinetAccess, cabinetBreakContacts, cabinetBreakSpread } from "./cabinet-reach.js";
import { createSave, loadSave } from "./save.js";
import { apply } from "./effects.js";
import { revoltPacket } from "./cabinet-revolt.js";
import { createRngStreams } from "./rng.js";
const role = "role-treasury-minister";
function actors() {
    const campaign = buildCampaign();
    const source = Person.parse({ ...person, id: "PER-REACH-SOURCE", ambition: 0.9 });
    const willing = Person.parse({ ...person, id: "PER-REACH-WILLING", loyalty: 0, ambition: 1, integrity: 0 });
    const refusing = Person.parse({ ...willing, id: "PER-REACH-REFUSING", loyalty: 1, integrity: 1 });
    return { source, willing, refusing, campaign: { ...campaign, player: { ...campaign.player, cabinet: { ...campaign.player.cabinet, [role]: source.id } }, people: { ...campaign.people, ...Object.fromEntries([source, willing, refusing].map((base) => [base.id, { base, alive: true }])) } } };
}
function withContacts() {
    const fixture = actors();
    const { campaign, source, willing, refusing } = fixture;
    const cooperation = [willing, refusing, willing].map((target) => ({ from: source.id, to: target.id, actId: "recorded-act", date: campaign.calendar, accepted: true, account: "They participated in a recorded issue conversation." }));
    return { ...fixture, campaign: { ...campaign, congress: { ...campaign.congress, lobbying: [{ id: "reach-record", approach: "call", turn: 0, landed: true, account: "Recorded dialogue", cooperation }] } } };
}
function hit(campaign, source, outcome) {
    const packet = revoltPacket(campaign, outcome, campaign.turn + 1, role, source, createRngStreams(campaign.seed).stream("reach-test"));
    return packet.effects.reduce((sum, effect) => sum + (effect.kind === "metric" ? (effect.deltas.standing ?? effect.deltas.stability ?? 0) : 0), 0);
}
describe("a cabinet actor's actual reach", () => {
    it("uses held office access, not equal ambition as equal national reach", () => {
        const { campaign, source } = actors();
        const outside = { ...campaign, player: { ...campaign.player, cabinet: {} } };
        expect(cabinetAccess(campaign, source.id)).toBe(1);
        expect(cabinetAccess(outside, source.id)).toBe(0);
        for (const outcome of ["leak", "challenge"]) {
            expect(hit(campaign, source, outcome)).toBeLessThan(0);
            expect(hit(outside, source, outcome)).toBe(0);
            expect(hit(campaign, { ...source, ambition: 0 }, outcome)).toBe(hit(campaign, source, outcome));
        }
    });
    it("lets actual contacts refuse independently, deduplicates and excludes dead contacts", () => {
        const { campaign, source, willing, refusing } = withContacts();
        const responses = cabinetBreakContacts(campaign, source.id);
        expect(responses).toHaveLength(2);
        expect(responses.find((entry) => entry.person === willing.id)?.decision.acts).toBe(true);
        expect(responses.find((entry) => entry.person === refusing.id)?.decision.acts).toBe(false);
        expect(cabinetBreakSpread(responses)).toBe(0.25);
        const dead = { ...campaign, people: { ...campaign.people, [willing.id]: { ...campaign.people[willing.id], alive: false } } };
        expect(cabinetBreakSpread(cabinetBreakContacts(dead, source.id))).toBe(0);
        for (const response of responses)
            expect(response.decision).toMatchObject({ question: "cabinet-break-cooperation", actor: response.person, subject: source.id, visibility: "intelligence" });
    });
    it("spreads through willing recorded contacts and not a biography overlap", () => {
        const { campaign, source } = withContacts();
        const isolated = { ...campaign, congress: { ...campaign.congress, lobbying: [] } };
        for (const outcome of ["leak", "challenge"])
            expect(hit(campaign, source, outcome)).toBeLessThan(hit(isolated, source, outcome));
        expect(cabinetBreakSpread(cabinetBreakContacts(isolated, source.id))).toBe(0);
    });
    it("keeps acceptance and refusal evidence across a save clone without putting private terms in the feed", () => {
        const { campaign, source } = withContacts();
        const packet = revoltPacket(campaign, "challenge", campaign.turn + 1, role, source, createRngStreams(campaign.seed).stream("reach-save"));
        const after = apply(campaign, packet);
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(after))));
        const decisions = restored.ledger.at(-1)?.causal?.internalDecisions;
        expect(decisions).toEqual(packet.provenance?.internalDecisions);
        expect(decisions?.map((decision) => decision.acts).sort()).toEqual([false, true]);
        expect(JSON.stringify(restored.feed)).not.toContain("cabinet-break-cooperation");
        expect(JSON.stringify(restored.feed)).not.toContain("co-partisanship");
    });
});
