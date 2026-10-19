import { describe, expect, it } from "vitest";
import { NATIONAL_OUTLETS, PRESS_OUTLETS, outletDisposition } from "@admin/engine";
import { sealedCampaign } from "./preview-board.js";
import { castScenario } from "./scenario-cast.js";
import { bindOutlet } from "./scenario-outlet.js";
import { ScenarioDef } from "./scenario.js";
function outletWeek(cast, overrides = {}) {
    return ScenarioDef.parse({
        id: "the-interview-with-strings",
        class: "scandal",
        severity: "routine",
        dilemmaShape: "containment",
        subject: "{{outlet}} wants the interview on its own terms",
        cast,
        conditions: [],
        weight: 1,
        locus: { site: "capital", ground: "home", descriptor: "the press office on the morning the request came in writing" },
        opening: [
            { speaker: { kind: "cabinet", roleHint: "justice" }, text: "{{outlet}} will give us the full hour if the first question is theirs to choose, and they want an answer by noon." },
        ],
        transmission: { relay: "communique", attribution: "the paper's managing editor", voice: "nonstate", text: "We are not asking for access. We are asking whether you will take the question we have." },
        replies: [
            {
                id: "take-their-terms",
                tone: "firm",
                text: "Take the hour on their terms and let them ask what they came to ask.",
                commitment: {
                    kind: "position",
                    cost: { standing: 0.01 },
                    remembered: "The President sat for the interview on the paper's terms.",
                    rejoinder: { speaker: { kind: "narrator" }, text: "The press office books the room and starts preparing for the one question nobody here wants." },
                },
            },
            {
                id: "decline-it",
                tone: "evasive",
                text: "Decline the hour and give the question to a friendlier desk tomorrow.",
                commitment: {
                    kind: "position",
                    cost: { stability: -0.01 },
                    remembered: "The President declined the interview and went to a friendlier desk.",
                    rejoinder: { speaker: { kind: "cabinet", roleHint: "justice" }, text: "They will print that we declined, and they will print the question anyway." },
                },
            },
        ],
        ...overrides,
    });
}
function coldest(campaign) {
    return [...NATIONAL_OUTLETS].sort((a, b) => outletDisposition(campaign.press, a) - outletDisposition(campaign.press, b) || a.id.localeCompare(b.id))[0];
}
describe("a masthead as the counterpart", () => {
    it("binds the national desk coldest to the administration when no masthead is named", () => {
        const campaign = sealedCampaign();
        expect(bindOutlet(campaign, { pick: "outlet" })?.id).toBe(coldest(campaign).id);
    });
    it("binds a named masthead only if it is on the roster", () => {
        const campaign = sealedCampaign();
        const named = PRESS_OUTLETS[0];
        expect(bindOutlet(campaign, { pick: "outlet", outlet: named.id })?.id).toBe(named.id);
        expect(bindOutlet(campaign, { pick: "outlet", outlet: "outlet-that-folded" })).toBeUndefined();
        expect(castScenario(campaign, outletWeek({ pick: "outlet", outlet: "outlet-that-folded" }))).toBeUndefined();
    });
    it("keeps the country slot at home, renders the masthead, and credits the paper's words to the paper", () => {
        const campaign = sealedCampaign();
        const cast = castScenario(campaign, outletWeek({ pick: "outlet" }));
        const name = coldest(campaign).name;
        expect(cast.counterpart).toBe(campaign.founding.nation);
        expect(cast.script.subject).toBe(`${name} wants the interview on its own terms`);
        expect(cast.script.opening[0]?.text).toContain(name);
        expect(cast.transmission?.source).toBe(name);
    });
    it("refuses the masthead token on a week that is not cast on a masthead", () => {
        expect(() => outletWeek({ pick: "none" }, { transmission: undefined })).toThrow(/outlet/);
    });
});
