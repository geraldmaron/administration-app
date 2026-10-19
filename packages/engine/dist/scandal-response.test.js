// Which answer fits a live scandal, what each answer does, and which answers the engine will not take.
import { describe, expect, it, vi } from "vitest";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { appointActing, selectActing } from "./appointments.js";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { flagMarker } from "./marked-flags.js";
import { makeCampaignSeed } from "./rng.js";
import { favoredScandalResponse, projectScandalResponses, respondToScandal, scandalAnswer, scandalCounselRead, scandalEvidenceStrength, scandalResponseFlag, scandalResponsePrice, scandalResponseTaken, SCANDAL_COUNSEL_ACCURACY, SCANDAL_RESPONSE_VERBS, } from "./scandal-response.js";
// Passed through to the real act; wrapped only so a test can see what it was asked to seat.
vi.mock("./appointments.js", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, appointActing: vi.fn(actual.appointActing) };
});
const STORY_ID = "scandal:the-file";
const AG = "role-attorney-general";
function atSeed(seed) {
    return { ...buildCampaign(), seed: makeCampaignSeed(seed) };
}
function story(charge, id = STORY_ID, implicated) {
    return { id, subject: "a file the papers will not drop", charge, stage: "developing", ...(implicated ? { implicated } : {}) };
}
function integrityOf(campaign, target, verb) {
    const result = respondToScandal(campaign, target, verb);
    if (!result.ok)
        throw new Error(result.reason);
    const effect = result.packet.effects.find((item) => item.kind === "opinion");
    if (!effect || effect.kind !== "opinion")
        throw new Error("missing integrity price");
    return effect.deltas.integrity ?? 0;
}
function cheapest(campaign, target) {
    return ["come-clean", "fight-it"].reduce((best, verb) => integrityOf(campaign, target, verb) > integrityOf(campaign, target, best) ? verb : best, "fight-it");
}
function withCabinet() {
    return foundedForBalance("scandal-answer-cabinet", "democrat").campaign;
}
describe("scandal evidence", () => {
    it("draws the same strength from a seed and a story id every time", () => {
        const first = scandalEvidenceStrength("scandal-answer-4", STORY_ID);
        expect(scandalEvidenceStrength("scandal-answer-4", STORY_ID)).toBe(first);
        expect(first).toBeGreaterThanOrEqual(0);
        expect(first).toBeLessThan(1);
        expect(scandalEvidenceStrength("scandal-answer-0", STORY_ID)).not.toBe(first);
    });
});
describe("counsel's read of the file", () => {
    it("points at the answer that fits about three times in five, and not always", () => {
        const fits = { thin: "fight-it", named: "give-them-someone", thick: "come-clean" };
        const seeds = Array.from({ length: 400 }, (_, index) => `scandal-read-${index}`);
        const right = seeds.filter((seed) => {
            const read = scandalCounselRead(seed, STORY_ID, "emergency-powers");
            return scandalResponsePrice(seed, STORY_ID, "emergency-powers", fits[read]) === "fading";
        }).length;
        expect(right / seeds.length).toBeGreaterThan(SCANDAL_COUNSEL_ACCURACY - 0.08);
        expect(right / seeds.length).toBeLessThan(SCANDAL_COUNSEL_ACCURACY + 0.08);
    });
});
describe("which verb wins", () => {
    it("favors a fight on seed scandal-answer-4 when the story is a flagged file", () => {
        const campaign = atSeed("scandal-answer-4");
        expect(favoredScandalResponse(campaign, story("flagged"))).toBe("fight-it");
        expect(cheapest(campaign, story("flagged"))).toBe("fight-it");
    });
    it("favors handing someone over on seed scandal-answer-0 for the same charge", () => {
        expect(favoredScandalResponse(atSeed("scandal-answer-0"), story("flagged"))).toBe("give-them-someone");
    });
    it("favors coming clean on seed scandal-answer-4 when the charge is a covert failure", () => {
        const campaign = atSeed("scandal-answer-4");
        expect(favoredScandalResponse(campaign, story("covert-failure"))).toBe("come-clean");
        expect(cheapest(campaign, story("covert-failure"))).toBe("come-clean");
    });
    it("lets a burned source on that same seed favor handing someone over", () => {
        expect(favoredScandalResponse(atSeed("scandal-answer-4"), story("burned-source"))).toBe("give-them-someone");
    });
    it("dominates with no verb: for every charge, each answer is the best one on some seed", () => {
        const charges = [
            "emergency-powers", "burned-source", "covert-failure", "conduct-in-question", "leak", "cabinet-leak", "ig-finding", "flagged",
        ];
        for (const charge of charges) {
            const winners = new Set(Array.from({ length: 40 }, (_, index) => favoredScandalResponse(atSeed(`scandal-dominance-${index}`), story(charge))));
            expect([...winners].sort(), charge).toEqual([...SCANDAL_RESPONSE_VERBS].sort());
        }
    });
    it("prices one verb to fit, one a step off, and one as the worst answer, for any file", () => {
        const words = SCANDAL_RESPONSE_VERBS.map((verb) => scandalResponsePrice("any-seed", STORY_ID, "leak", verb)).sort();
        expect(words).toEqual(["fading", "heavy", "steady"]);
    });
});
describe("taking the answer", () => {
    it("rejects a response once the story is resolved", () => {
        const result = respondToScandal(atSeed("scandal-answer-4"), { ...story("flagged"), stage: "resolved" }, "come-clean");
        expect(result.ok).toBe(false);
        if (!result.ok)
            expect(result.reason).toMatch(/over/i);
    });
    it("stores the answer in the press corps, reads it back, and refuses a second answer", () => {
        const campaign = atSeed("scandal-answer-4");
        const target = story("flagged");
        const first = respondToScandal(campaign, target, "fight-it");
        if (!first.ok)
            throw new Error(first.reason);
        const next = apply(campaign, first.packet);
        expect(next.press.scandalResponses?.[target.id]).toEqual({ verb: "fight-it", turn: campaign.turn });
        expect(next.player.flags[scandalResponseFlag(target.id, "fight-it")]).toBeUndefined();
        expect(scandalResponseTaken(next, target.id)).toBe("fight-it");
        expect(scandalAnswer(next, target.id, target.charge)).toEqual({ verb: "fight-it", price: "fading", turn: campaign.turn });
        expect(next.player.cabinet).toEqual(campaign.player.cabinet);
        const again = respondToScandal(next, target, "come-clean");
        expect(again.ok).toBe(false);
        if (!again.ok)
            expect(again.reason).toMatch(/already/i);
        expect(first.packet.narration.summary).toContain("a file the papers will not drop");
    });
});
describe("giving them someone", () => {
    it("is on the board but closed when the story names no officer", () => {
        const row = projectScandalResponses(atSeed("scandal-answer-4"), story("leak")).find((item) => item.verb === "give-them-someone");
        expect(row?.unavailable).toMatch(/no officer/i);
        const result = respondToScandal(atSeed("scandal-answer-4"), story("leak"), "give-them-someone");
        expect(result.ok).toBe(false);
    });
    it("is closed when the officer it names has already left the government", () => {
        const campaign = withCabinet();
        const target = story("emergency-powers", STORY_ID, { person: "PER-LONG-GONE", role: AG });
        const row = projectScandalResponses(campaign, target).find((item) => item.verb === "give-them-someone");
        expect(row?.unavailable).toMatch(/no longer in the government/);
    });
    it("dismisses the officer the story names and leaves the rest of the cabinet seated", () => {
        const campaign = withCabinet();
        const holder = campaign.player.cabinet[AG];
        const target = story("emergency-powers", STORY_ID, { person: holder, role: AG });
        const result = respondToScandal(campaign, target, "give-them-someone");
        if (!result.ok)
            throw new Error(result.reason);
        const next = apply(campaign, result.packet);
        expect(next.player.cabinet[AG]).toBeUndefined();
        expect(next.people[holder]?.currentRole).toBeUndefined();
        const others = Object.entries(campaign.player.cabinet).filter(([role]) => role !== AG);
        for (const [role, person] of others)
            expect(next.player.cabinet[role]).toBe(person);
        expect(scandalResponseTaken(next, target.id)).toBe("give-them-someone");
    });
    it("seats an acting who is not the officer handed over, and names them", () => {
        const campaign = withCabinet();
        const holder = campaign.player.cabinet[AG];
        const target = story("emergency-powers", STORY_ID, { person: holder, role: AG });
        const result = respondToScandal(campaign, target, "give-them-someone");
        if (!result.ok)
            throw new Error(result.reason);
        const next = apply(campaign, result.packet);
        const acting = selectActing(next, AG);
        expect(next.player.cabinet[AG]).toBeUndefined();
        expect(acting).toBeDefined();
        expect(acting).not.toBe(holder);
        expect(next.press.scandalResponses?.[target.id]).toEqual({ verb: "give-them-someone", turn: campaign.turn, acting });
        expect(result.packet.narration.summary).toContain(`${next.people[acting].base.name} runs the department in an acting capacity.`);
    });
    it("names somebody else through appointActing when the dismissal leaves no deputy acting", () => {
        const campaign = withCabinet();
        const holder = campaign.player.cabinet[AG];
        const target = story("emergency-powers", STORY_ID, { person: holder, role: AG });
        const spy = vi.mocked(appointActing);
        spy.mockClear();
        const result = respondToScandal(campaign, target, "give-them-someone");
        expect(result.ok).toBe(true);
        for (const [, seat, person] of spy.mock.calls) {
            expect(seat).toBe(AG);
            expect(person).not.toBe(holder);
        }
    });
});
describe("an answer kept before the press corps recorded it", () => {
    it("still reads the dated flag an older save stored the answer as", () => {
        const campaign = atSeed("scandal-answer-4");
        const target = story("flagged");
        const flag = scandalResponseFlag(target.id, "come-clean");
        const legacy = { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: true, [flagMarker(flag, 3)]: true } } };
        expect(legacy.press.scandalResponses).toBeUndefined();
        expect(scandalResponseTaken(legacy, target.id)).toBe("come-clean");
        expect(scandalAnswer(legacy, target.id, target.charge)?.turn).toBe(3);
        const again = respondToScandal(legacy, target, "fight-it");
        expect(again.ok).toBe(false);
    });
});
