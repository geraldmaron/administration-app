import { describe, expect, it } from "vitest";
import { beatsWithoutParticularRestatement, trimParticularRestatement } from "./thread-dedupe";
const LINE_ITEM_PARTICULARS = [
    { label: "Clinics promised", value: "Fourteen" },
    { label: "Patrol boats past refit", value: "Nine" },
    { label: "What the money covers", value: "Half of either" },
    { label: "Since the promise", value: "11 months" },
];
const TREASURY_OPENING = "One budget, two programs, and it pays for half of either. Fourteen clinics in the north or nine patrol boats that are past the date they should have been refitted. The Secretary of the Interior and I have both written it into next year as though it were already ours, and whichever one you cut walks out of here carrying a grudge with your name on it.";
const INTERIOR_OPENING = "The clinics were promised in the campaign, in the north, on a stage, eleven months ago. The boats were promised in a memo. I know which one people will remember us breaking, and so does the Secretary of the Treasury, which is why this is on your desk instead of being argued out between us.";
describe("thread dedupe against scene particulars", () => {
    it("drops opening sentences that restate the particulars grid", () => {
        const treasury = trimParticularRestatement(TREASURY_OPENING, LINE_ITEM_PARTICULARS);
        expect(treasury).not.toMatch(/half of either/i);
        expect(treasury).not.toMatch(/fourteen clinics/i);
        expect(treasury).not.toMatch(/nine patrol boats/i);
        expect(treasury).toContain("Secretary of the Interior");
        expect(treasury).toContain("grudge with your name on it");
        const interior = trimParticularRestatement(INTERIOR_OPENING, LINE_ITEM_PARTICULARS);
        expect(interior).not.toMatch(/eleven months/i);
        expect(interior).toContain("boats were promised in a memo");
        expect(interior).toContain("on your desk");
    });
    it("carries every particular's value before trimming and none of them after", () => {
        expect(TREASURY_OPENING).toMatch(/half of either/i);
        expect(TREASURY_OPENING).toMatch(/fourteen clinics/i);
        expect(TREASURY_OPENING).toMatch(/nine patrol boats/i);
        const trimmed = trimParticularRestatement(TREASURY_OPENING, LINE_ITEM_PARTICULARS);
        expect(trimmed).not.toMatch(/half of either/i);
        expect(trimmed).not.toMatch(/fourteen clinics/i);
        expect(trimmed).not.toMatch(/nine patrol boats/i);
    });
    it("keeps beats that advance the meeting without repeating grid facts", () => {
        const beats = [
            {
                speaker: { kind: "official", role: "role-treasury-minister", person: "p1", name: "Hayden" },
                text: TREASURY_OPENING,
            },
            {
                speaker: { kind: "official", role: "role-interior-minister", person: "p2", name: "Logan" },
                text: INTERIOR_OPENING,
            },
        ];
        const trimmed = beatsWithoutParticularRestatement(beats, LINE_ITEM_PARTICULARS);
        expect(trimmed.length).toBe(2);
        const spoken = trimmed.map((beat) => beat.text).join(" ");
        expect(spoken).not.toMatch(/half of either/i);
        expect(spoken).not.toMatch(/fourteen clinics/i);
        expect(spoken).not.toMatch(/nine patrol boats/i);
        expect(spoken).not.toMatch(/eleven months/i);
    });
    it("leaves beats unchanged when there is no particulars grid", () => {
        const beats = [
            { speaker: { kind: "narrator" }, text: "The room waits." },
        ];
        expect(beatsWithoutParticularRestatement(beats, undefined)).toBe(beats);
        expect(beatsWithoutParticularRestatement(beats, [])).toBe(beats);
    });
    it("does not treat unrelated 'two programs' as a copies particular", () => {
        const memoParticulars = [
            { label: "Copies in circulation", value: "Two" },
            { label: "Days apart", value: "Eleven" },
        ];
        const line = "One budget, two programs, and it pays for half of either.";
        // A false match would trim the sentence; the near-keyword matcher must
        // leave a line alone when the number and the label's words never meet.
        expect(trimParticularRestatement(line, memoParticulars)).toBe(line);
    });
});
