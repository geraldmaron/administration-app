import { beforeEach, describe, expect, it, vi } from "vitest";
import { counselOnReply, dissentingCounsel, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { counselSentence } from "./counsel-lines";
// counselOnReply and dissentingCounsel are the engine's own judgment; this
// suite fakes only those two, through the module they are imported from, so
// counselSentence's composition can be driven over every stance and reason
// without depending on a live campaign happening to produce all fifteen.
vi.mock("@admin/engine", async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, counselOnReply: vi.fn(), dissentingCounsel: vi.fn() };
});
const campaign = openingCampaign();
// Never read by the mocked pair; counselSentence passes them through untouched.
const script = {};
const reply = {};
const STANCES = ["for", "against", "wary"];
const REASONS = ["instinct-for", "instinct-against", "thin-odds", "department-stake", "crowded-out"];
const STAKES = ["owns", "standing", "outside"];
function counsel(personSeed, role, stance, reason, stake, conviction) {
    return {
        kind: "counsel",
        role: role,
        person: `person-${personSeed}`,
        name: `Secretary ${personSeed}`,
        stance,
        reason,
        conviction,
        reply: `reply-${personSeed}`,
        course: { kind: "instrument", instrument: "diplomatic", rung: 1, name: "a formal démarche" },
        stake,
    };
}
beforeEach(() => {
    vi.mocked(counselOnReply).mockReset();
    vi.mocked(dissentingCounsel).mockReset();
});
describe("counselSentence, composed only from CabinetCounsel's own fields", () => {
    it("is undefined when the engine names no role for this reply", () => {
        vi.mocked(counselOnReply).mockReturnValue(undefined);
        expect(counselSentence(campaign, script, reply)).toBeUndefined();
    });
    it("is undefined when the chair the engine would ask is vacant, leaving the surface's own vacant copy to render", () => {
        vi.mocked(counselOnReply).mockReturnValue({ kind: "vacant", role: "role-treasury-minister" });
        expect(counselSentence(campaign, script, reply)).toBeUndefined();
    });
    it.each(STANCES.flatMap((stance) => REASONS.map((reason) => [stance, reason])))("renders a coherent sentence for stance %s and reason %s, at every conviction band", (stance, reason) => {
        for (const [index, stake] of STAKES.entries()) {
            for (const conviction of [0.9, 0.5, 0.1]) {
                const primary = counsel(`${stance}-${reason}-${index}-${conviction}`, "role-treasury-minister", stance, reason, stake, conviction);
                vi.mocked(counselOnReply).mockReturnValue(primary);
                vi.mocked(dissentingCounsel).mockReturnValue(undefined);
                const sentence = counselSentence(campaign, script, reply);
                expect(sentence).toBeDefined();
                expect(sentence.speaker).toBe(primary.person);
                expect(sentence.line).toContain(primary.name);
                expect(sentence.line).not.toContain("undefined");
                expect(sentence.line.length).toBeGreaterThan(primary.name.length);
                expect(sentence.dissent).toBeUndefined();
            }
        }
    });
    it("names the department for a stake-driven reason, and not merely the minister's temperament", () => {
        const primary = counsel("a", "role-treasury-minister", "against", "crowded-out", "outside", 0.6);
        vi.mocked(counselOnReply).mockReturnValue(primary);
        vi.mocked(dissentingCounsel).mockReturnValue(undefined);
        const sentence = counselSentence(campaign, script, reply);
        expect(sentence.line).toContain("Treasury");
    });
    it('prefixes a real dissent with "But", and only a real dissent', () => {
        const primary = counsel("a", "role-treasury-minister", "for", "instinct-for", "owns", 0.8);
        const dissenter = counsel("b", "role-defense-minister", "against", "instinct-against", "outside", 0.7);
        vi.mocked(counselOnReply).mockReturnValue(primary);
        vi.mocked(dissentingCounsel).mockReturnValue(dissenter);
        const sentence = counselSentence(campaign, script, reply);
        expect(sentence.dissent).toBeDefined();
        expect(sentence.dissent.speaker).toBe(dissenter.person);
        expect(sentence.dissent.line.startsWith("But ")).toBe(true);
        // The dissenter's own raw stance never leaks as a bare word.
        expect(sentence.dissent.line).not.toMatch(/\bagainst\b/);
    });
    it("carries no dissent when the room agrees, or the engine finds no real disagreement", () => {
        const primary = counsel("a", "role-treasury-minister", "for", "instinct-for", "owns", 0.8);
        vi.mocked(counselOnReply).mockReturnValue(primary);
        vi.mocked(dissentingCounsel).mockReturnValue(undefined);
        expect(counselSentence(campaign, script, reply).dissent).toBeUndefined();
    });
    it("carries no dissent when the engine returns only a vacant second chair", () => {
        const primary = counsel("a", "role-treasury-minister", "for", "instinct-for", "owns", 0.8);
        vi.mocked(counselOnReply).mockReturnValue(primary);
        vi.mocked(dissentingCounsel).mockReturnValue({ kind: "vacant", role: "role-defense-minister" });
        expect(counselSentence(campaign, script, reply).dissent).toBeUndefined();
    });
});
