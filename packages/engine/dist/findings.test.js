import { describe, expect, it } from "vitest";
import { closeFinding, findingRefusal, notifyCommittees, recordCovertAction, selectFindings, selectUnfoundedActions, signFinding, standingFinding, } from "./findings.js";
import { apply } from "./effects.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
describe("what a finding may not authorize", () => {
    it("refuses an objective aimed at an American audience", () => {
        const campaign = buildCampaign();
        expect(findingRefusal(campaign, "Shift domestic public opinion on the war.", "ALP")).toContain("United States political processes");
    });
    it("refuses a finding against the President's own country", () => {
        const campaign = buildCampaign();
        expect(findingRefusal(campaign, "Anything at all.", "USA")).toBeTruthy();
    });
    it("records the attempt rather than pretending it never happened", () => {
        const campaign = buildCampaign();
        const attempt = signFinding(campaign, "Influence the domestic press ahead of the election.", "ALP", "written", "full-committees");
        expect(attempt.ok).toBe(true);
        if (!attempt.ok)
            return;
        const next = apply(campaign, attempt.packet);
        expect(selectFindings(next)).toHaveLength(0);
        expect(selectUnfoundedActions(next)).toHaveLength(1);
    });
});
describe("signing one", () => {
    it("will not be signed as unwritten, because that is what a finding stops being", () => {
        const campaign = buildCampaign();
        expect(signFinding(campaign, "Support the opposition.", "ALP", "unwritten", "full-committees").ok).toBe(false);
    });
    it("requires a statement of reasons when prior notice is withheld, and costs the Hill for it", () => {
        const campaign = buildCampaign();
        expect(signFinding(campaign, "Support the opposition.", "ALP", "written", "withheld").ok).toBe(false);
        const withheld = signFinding(campaign, "Support the opposition.", "ALP", "written", "withheld", "Operational security for a source who would be identified.");
        expect(withheld.ok).toBe(true);
        if (!withheld.ok)
            return;
        const next = apply(campaign, withheld.packet);
        expect(next.congress.disposition).toBeLessThan(campaign.congress.disposition);
        expect(standingFinding(next, "ALP")?.notifiedDay).toBeUndefined();
        const told = notifyCommittees(next, standingFinding(next, "ALP").id, "The source is out.");
        expect(told.ok).toBe(true);
        if (!told.ok)
            return;
        expect(standingFinding(apply(next, told.packet), "ALP")?.notifiedDay).toBeDefined();
    });
    it("refuses a second standing finding on the same country, and reopens once it is closed", () => {
        const campaign = buildCampaign();
        const first = signFinding(campaign, "Support the opposition.", "ALP", "written", "gang-of-eight");
        if (!first.ok)
            throw new Error("expected the finding to stand");
        const standing = apply(campaign, first.packet);
        expect(signFinding(standing, "Something else.", "ALP", "written", "full-committees").ok).toBe(false);
        const closed = closeFinding(standing, standingFinding(standing, "ALP").id);
        if (!closed.ok)
            throw new Error("expected the close to stand");
        const after = apply(standing, closed.packet);
        expect(signFinding(after, "Something else.", "ALP", "written", "full-committees").ok).toBe(true);
    });
});
describe("what a covert act leaves behind", () => {
    it("counts against a standing finding when there is one", () => {
        const campaign = buildCampaign();
        const signed = signFinding(campaign, "Support the opposition.", "ALP", "written", "full-committees");
        if (!signed.ok)
            throw new Error("expected the finding to stand");
        const covered = apply(campaign, signed.packet);
        const effects = recordCovertAction(covered, "USA", "ALP", 4, "Proxy support.");
        const next = effects.reduce((state, effect) => apply(state, {
            source: "action",
            actor: "player",
            turn: state.turn,
            narration: { summary: "An act under the finding." },
            effects: [effect],
        }), covered);
        expect(standingFinding(next, "ALP")?.activities).toBe(1);
        expect(selectUnfoundedActions(next)).toHaveLength(0);
    });
    it("records an act with nothing standing over it, and writes nothing for another capital", () => {
        const campaign = buildCampaign();
        const effects = recordCovertAction(campaign, "USA", "ALP", 5, "Regime action.");
        expect(effects).toHaveLength(1);
        const next = apply(campaign, {
            source: "action",
            actor: "player",
            turn: campaign.turn,
            narration: { summary: "An act with no finding." },
            effects,
        });
        expect(selectUnfoundedActions(next)).toHaveLength(1);
        expect(recordCovertAction(campaign, "ALP", "USA", 5, "Theirs.")).toHaveLength(0);
    });
});
