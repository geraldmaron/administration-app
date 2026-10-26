import { describe, expect, it } from "vitest";
import { flagMarker, scandalResponseFlag, selectScandals, sentenceCase, SCANDAL_GRAVITY, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { subjectHref } from "../shell/subject";
import { attentionItems } from "./attention";
import { scandalAttentionItems, scandalDeskItems } from "./attention-scandal";
const opening = openingCampaign();
function story(over) {
    return {
        subject: "a file the papers will not drop",
        origin: { kind: "flagged", flag: "scandal:the-file" },
        charge: "flagged",
        gravity: SCANDAL_GRAVITY.flagged,
        brokeTurn: opening.turn,
        stage: "breaking",
        intensity: 0.5,
        ...over,
    };
}
function withFlags(campaign, flags) {
    return { ...campaign, player: { ...campaign.player, flags: { ...campaign.player.flags, ...flags } } };
}
describe("a scandal on the Desk", () => {
    it("draws one soft row from the story's own subject in the week it broke", () => {
        const scandal = story({ id: "story-1", context: "The order is what the papers are asking about." });
        const [row] = scandalDeskItems(opening, [scandal]);
        expect(row).toMatchObject({
            id: "scandal:story-1",
            source: "scandal",
            urgency: "soft",
            subject: "scandal:story-1",
            title: "A file the papers will not drop",
            reason: scandal.context,
            href: subjectHref({ kind: "scandal", id: "story-1" }),
            stance: "adverse",
        });
        expect(row?.title).not.toContain("story-1");
    });
    it("goes quiet after the week it broke, and stays on the Desk while it runs", () => {
        const later = { ...opening, turn: opening.turn + 3 };
        const [row] = scandalDeskItems(later, [story({ id: "story-2", stage: "developing" })]);
        expect(row?.urgency).toBe("ambient");
    });
    it("stops asking once the President has answered, and says so", () => {
        const answered = withFlags(opening, { [scandalResponseFlag("story-3", "fight-it")]: true });
        const [row] = scandalDeskItems(answered, [story({ id: "story-3" })]);
        expect(row?.urgency).toBe("ambient");
        expect(row?.reason).toMatch(/Your response: fight it/);
    });
    it("names the officer the story names", () => {
        const [role, person] = Object.entries(opening.player.cabinet).find(([seat]) => seat !== opening.founding.leadRole);
        const [row] = scandalDeskItems(opening, [story({ id: "story-4", implicated: { person: person, role: role } })]);
        expect(row?.reason).toContain(opening.people[person].base.name);
    });
    it("uses a fixed title when the story has no player-facing line", () => {
        const [row] = scandalDeskItems(opening, [story({ id: "story-9", subject: "   ", context: undefined })]);
        expect(row?.title).toBe("A scandal needs your response");
        expect(row?.reason).toBe("You haven't responded yet.");
    });
    it("omits a resolved story and keeps one row per live story", () => {
        const rows = scandalDeskItems(opening, [
            story({ id: "one", subject: "the first charge" }),
            story({ id: "two", subject: "the second charge" }),
            story({ id: "over", stage: "resolved", intensity: 0 }),
        ]);
        expect(rows.map((row) => row.id)).toEqual(["scandal:one", "scandal:two"]);
        expect(rows.map((row) => row.title)).toEqual(["The first charge", "The second charge"]);
    });
    it("reaches the Desk through buildRows for a story stamped this week", () => {
        const flag = "scandal:missing-funds";
        const campaign = withFlags(opening, { [flag]: true, [flagMarker(flag, opening.turn)]: true });
        const onBoard = selectScandals(campaign).find((item) => item.id.includes("missing-funds"));
        expect(onBoard.stage).toBe("breaking");
        const id = `scandal:${onBoard.id}`;
        const row = attentionItems(campaign).find((item) => item.id === id);
        expect(row).toEqual(scandalAttentionItems(campaign).find((item) => item.id === id));
        expect(row).toMatchObject({ source: "scandal", urgency: "soft", title: sentenceCase(onBoard.subject) });
    });
});
