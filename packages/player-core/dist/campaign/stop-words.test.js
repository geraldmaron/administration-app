import { describe, expect, it } from "vitest";
import { matterDoor, spanWords, stopLines, stopWords } from "./stop-words";
const date = { year: 2029, month: 2, day: 1 };
const matter = (id, urgency = "hard") => ({ id, source: "scenario", urgency, title: `Matter ${id}`, reason: "Because.", subject: id, date });
describe("why the world stopped", () => {
    it("says the span in weeks when whole weeks ran, and in days otherwise", () => {
        expect(spanWords({ elapsedDays: 14 })).toBe("2 weeks");
        expect(spanWords({ elapsedDays: 4 })).toBe("4 days");
        expect(spanWords({ elapsedDays: 1 })).toBe("1 day");
        expect(spanWords({ elapsedDays: 0 })).toBe("no time");
    });
    it("names every stop reason in words, never the engine's code", () => {
        const stop = { presented: [matter("scenario:a")], deferred: [], ambient: [] };
        expect(stopWords({ stopReason: "attention", stop })).toBe("It stopped because one item needs you.");
        expect(stopWords({ stopReason: "horizon", stop })).toMatch(/Nothing needed you/);
        expect(stopWords({ stopReason: "election", stop })).toMatch(/Election Day/);
        expect(stopWords({ stopReason: "ended", stop })).toMatch(/presidency ended/);
    });
    it("opens each matter where it is answered", () => {
        expect(matterDoor(matter("scenario:the-port"))).toBe("/brief/decision/the-port");
        expect(matterDoor(matter("case:bill:hr-1"))).toBe("/brief/clock/case%3Abill%3Ahr-1");
        expect(matterDoor(matter("summons:appropriation"))).toBe("/brief/clock/appropriation");
        expect(matterDoor(matter("scandal:s-4"))).toBe("/brief/scandal/s-4");
        expect(matterDoor(matter("war:w-1"), "/world/war/w-1")).toBe("/world/war/w-1");
        const lines = stopLines({ stop: { presented: [matter("scenario:x"), matter("press", "soft")], deferred: [], ambient: [] } }, () => undefined);
        expect(lines.map((line) => line.href)).toEqual(["/brief/decision/x", undefined]);
    });
});
