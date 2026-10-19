import { describe, expect, it } from "vitest";
import { buildCampaign, nationB } from "./__fixtures__/campaign.js";
import { decisionProvenance, stampedDecision } from "./conversation-provenance.js";
import { commitReply } from "./conversations.js";
import { createRngStreams } from "./rng.js";
import { apply } from "./effects.js";
const at = (locales) => ({
    id: "the-yard",
    counterpart: "USA",
    subject: "The yard cannot make payroll",
    opening: [],
    options: [],
    ...(locales ? { locales } : {}),
});
describe("where a decision happened, on its causal stamp", () => {
    it("carries the place the matter was resolved to", () => {
        expect(decisionProvenance(buildCampaign(), at(["AL", "CITY-USA-mobile"]), []).locales).toEqual(["AL", "CITY-USA-mobile"]);
    });
    it("stamps no place for a matter that had none", () => {
        expect(decisionProvenance(buildCampaign(), at(), []).locales).toBeUndefined();
        expect(decisionProvenance(buildCampaign(), at([]), []).locales).toBeUndefined();
    });
    it("keeps both the matter's place and the place another module stamped", () => {
        const stamped = stampedDecision(buildCampaign(), at(["AL", "CITY-USA-mobile"]), {
            source: "conversation",
            actor: "player",
            turn: 0,
            provenance: { origin: "decision", locales: ["TX"] },
            narration: { summary: "The order went out." },
            effects: [],
        });
        expect(stamped.provenance?.locales).toEqual(["AL", "CITY-USA-mobile", "TX"]);
    });
    it("retains subject identities when an instrument supplies its own entity list and visibility", () => {
        const campaign = buildCampaign();
        const subject = { key: "yard", id: "entity:yard", kind: "organization", name: "The yard", description: "Recorded organization",
            nation: campaign.founding.nation, originCase: "scenario:earlier", originScenario: "earlier", originTurn: campaign.turn };
        const script = { ...at(), subjects: [subject] };
        const packet = { source: "conversation", actor: "player", turn: campaign.turn, effects: [], narration: { summary: "The order went out." },
            provenance: { origin: "decision", entities: ["FRA", "USA", "asset:recorded"], visibility: "intelligence" } };
        const stamped = stampedDecision(campaign, script, packet);
        expect(stamped.provenance?.entities).toEqual(["FRA", "USA", "asset:recorded", subject.id]);
        expect(stamped.provenance?.visibility).toBe("intelligence");
        expect(apply(campaign, stamped).ledger.at(-1)?.subjects).toEqual([subject]);
        expect(stampedDecision(campaign, at(), packet).provenance?.entities).toEqual(packet.provenance.entities);
    });
    it("records a subject through an actual instrument reply", () => {
        const campaign = buildCampaign();
        const subject = { key: "yard", id: "entity:yard", kind: "organization", name: "The yard", description: "Recorded organization",
            nation: campaign.founding.nation, originCase: "scenario:earlier", originScenario: "earlier", originTurn: campaign.turn };
        const script = { ...at(), counterpart: nationB.id, subjects: [subject],
            options: [{ id: "talk", text: "Send the message.", tone: "conciliatory", commitment: { kind: "instrument", instrument: "diplomatic", rung: 1 } }] };
        const result = commitReply(campaign, script, script.options[0], createRngStreams(campaign.seed));
        expect(result.ok).toBe(true);
        if (!result.ok)
            throw new Error(result.missingCapability);
        const entry = apply(campaign, result.packet).ledger.at(-1);
        expect(entry.subjects).toEqual([subject]);
        expect(entry.causal?.entities).toContain(subject.id);
    });
});
