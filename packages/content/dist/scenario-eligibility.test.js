import { describe, expect, it } from "vitest";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { selectScenario } from "./scenario-cast.js";
// What the player's own founding does to what can reach their desk.
//
// Two claims: that the charter changes which content is eligible, and that the
// leader's alignment does. They are proven here, against the mechanism that
// actually ships — @admin/content's `selectScenario`, reached from the player
// shell through `pendingConversation`.
//
// The engine cannot host these: it must not import @admin/content, and the
// dependency-direction lint enforces it.
function defWith(id, conditions) {
    return {
        id,
        class: "institution",
        severity: "serious",
        dilemmaShape: "containment",
        subject: `A scenario gated on ${id}`,
        cast: { pick: "none" },
        conditions,
        weight: 1,
        locus: { site: "capital", ground: "counterpart", descriptor: "the square outside the government quarter" },
        opening: [
            {
                speaker: { kind: "narrator" },
                text: "Sixty characters of narration so the schema floor is satisfied here.",
            },
        ],
        replies: [
            {
                id: "a",
                tone: "firm",
                text: "Forty characters of a reply somebody says.",
                commitment: {
                    kind: "position",
                    cost: { standing: -0.01 },
                    remembered: "Fifty characters of what the record will remember.",
                    rejoinder: { speaker: { kind: "cabinet", roleHint: "interior" }, text: "The clerk who keeps that register has started keeping a second one of her own, in her own hand, and has told two colleagues about it." },
                },
            },
            {
                id: "b",
                tone: "evasive",
                text: "Another forty characters of a second reply.",
                commitment: {
                    kind: "position",
                    cost: { stability: -0.01 },
                    remembered: "Fifty more characters of what the record remembers.",
                    rejoinder: { speaker: { kind: "cabinet", roleHint: "finance" }, text: "It cost about what the estimate said and took twice as long as anybody promised, and the contractor has asked for the difference." },
                },
            },
        ],
    };
}
describe("the founding charter changes which content is eligible", () => {
    // A junta has no independent court; a parliamentary republic does. A
    // scenario about the courts defying the government is not a thing that can
    // happen under every government, and this is the condition that says so.
    const courts = defWith("courts-defy-the-government", [
        { kind: "charterInstitution", institution: "judiciary", present: true },
    ]);
    const council = defWith("council-demands-a-loyalty-purge", [
        { kind: "charterInstitution", institution: "judiciary", present: false },
    ]);
    const deck = [courts, council];
    it("draws the court scenario only under a charter that has courts", () => {
        const withCourts = sealedCampaign("charter-eligibility", "charter-parliamentary-republic");
        expect(selectScenario(withCourts, deck)?.def.id).toBe("courts-defy-the-government");
    });
    it("draws the council scenario under a charter that has none", () => {
        const withoutCourts = sealedCampaign("charter-eligibility", "charter-military-junta");
        expect(selectScenario(withoutCourts, deck)?.def.id).toBe("council-demands-a-loyalty-purge");
    });
    it("names no charter anywhere in the selection code: the charter is data", () => {
        // Both draws above came out of the same deck through the same function.
        // Nothing branched on a charter id — the only thing that differed was the
        // dataset row the founding pointed at.
        const withCourts = sealedCampaign("charter-eligibility", "charter-parliamentary-republic");
        const withoutCourts = sealedCampaign("charter-eligibility", "charter-military-junta");
        expect(selectScenario(withCourts, deck)?.def.id).not.toBe(selectScenario(withoutCourts, deck)?.def.id);
    });
});
describe("the leader's alignment changes which content is eligible", () => {
    const hawks = defWith("hawks-demand-action", [
        { kind: "alignment", axis: "nationalistGlobalist", atLeast: 0.3 },
    ]);
    const allies = defWith("allies-propose-a-summit", [
        { kind: "alignment", axis: "nationalistGlobalist", atMost: -0.3 },
    ]);
    const deck = [hawks, allies];
    function alignedAs(nationalistGlobalist) {
        const campaign = sealedCampaign("alignment-eligibility");
        return {
            ...campaign,
            player: { ...campaign.player, alignments: { ...campaign.player.alignments, nationalistGlobalist } },
        };
    }
    it("puts the hawks on the desk of a nationalist administration", () => {
        expect(selectScenario(alignedAs(0.8), deck)?.def.id).toBe("hawks-demand-action");
    });
    it("puts the summit on the desk of an internationalist one", () => {
        expect(selectScenario(alignedAs(-0.8), deck)?.def.id).toBe("allies-propose-a-summit");
    });
    it("puts neither on a desk in the middle, rather than defaulting to one", () => {
        expect(selectScenario(alignedAs(0), deck)).toBeUndefined();
    });
});
