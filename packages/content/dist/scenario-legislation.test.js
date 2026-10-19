import { describe, expect, it } from "vitest";
import { transmittableActs } from "@admin/engine";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { FIXTURE_SCENARIOS } from "./__fixtures__/scenarios.js";
import { auditLegislativeTransmission } from "./scenario-audit-legislation.js";
import { castScenario, scenarioLive } from "./scenario-cast.js";
const base = FIXTURE_SCENARIOS[0];
function proposal(act, gated = true) {
    return { ...base, id: "legislative-transmission-probe", cast: { pick: "none" },
        conditions: gated ? [{ kind: "legislationAvailable", act }] : [],
        replies: base.replies.map((reply, index) => index === 0 ? { ...reply, commitment: {
                kind: "position", cost: {}, remembered: "The President sent a bill to Congress.", transmit: act,
                rejoinder: { speaker: { kind: "narrator" }, text: "The bill was referred to committee; Congress has yet to vote." },
            } } : reply),
    };
}
function findings(def) {
    const found = [];
    auditLegislativeTransmission(def, found);
    return found;
}
describe("scenario legislative transmission", () => {
    it("gates an eligible bill and binds the same executable command", () => {
        const campaign = sealedCampaign("transmission-probe");
        const act = transmittableActs(campaign)[0];
        const def = proposal(act.id);
        expect(findings(def)).toEqual([]);
        const cast = castScenario(campaign, def);
        expect(cast.script.options[0]?.commitment).toMatchObject({ kind: "position", transmit: act.id });
        expect(scenarioLive(campaign, def, campaign.founding.nation)).toBe(true);
    });
    it("rejects a missing gate and an opposition bill", () => {
        expect(findings(proposal("act-tax-fairness-and-revenue", false)).some((finding) => finding.kind === "ungrounded-transmission")).toBe(true);
        expect(findings(proposal("act-fiscal-responsibility")).some((finding) => finding.message.includes("not an administration bill"))).toBe(true);
    });
});
