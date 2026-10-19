import { describe, expect, it } from "vitest";
import { PRESS_OUTLETS } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { deskFilings, deskProfile, deskProfiles, pressCoverageTrend, pressHistory, reachWords, silenceWords } from "./desks";
import { pressLandscape } from "./landscape";
const base = openingCampaign();
function withEngagements(campaign, outcomes) {
    const engagements = outcomes.map((wentWell, index) => ({
        id: `press:interview:${index + 1}`,
        kind: "interview",
        turn: index + 1,
        wentWell,
        summary: wentWell ? "It went well." : "It did not.",
        outletId: "outlet-capital-register",
    }));
    return { ...campaign, press: { ...campaign.press, engagements } };
}
describe("the desks' profiles", () => {
    it("profiles every desk in words, with no disposition figure anywhere", () => {
        const profiles = deskProfiles(base);
        expect(profiles).toHaveLength(PRESS_OUTLETS.length);
        for (const profile of profiles) {
            const text = [profile.format, profile.reach, profile.credibility, profile.stanceWord, ...profile.reasons.map((r) => r.reason)].join(" ");
            expect(text).not.toMatch(/\d\.\d/);
            expect(profile.readers.length).toBeGreaterThan(0);
        }
    });
    it("says why a partisan channel sits where it does, and names who the President is as a reason", () => {
        const frontier = deskProfile(base, "outlet-frontier-channel");
        expect(frontier.format).toBe("Cable news");
        expect(frontier.reasons.map((reason) => reason.reason)).toContain("who the President is to its audience");
    });
    it("names a regional paper's region", () => {
        expect(deskProfile(base, "outlet-western-correspondent").region).toBe("the West");
        expect(deskProfile(base, "outlet-national-wire").region).toBeUndefined();
    });
    it("puts a reach in plain words", () => {
        expect(reachWords(0.24)).toBe("Reaches about one American adult in four each week");
        expect(reachWords(0.03)).toBe("Reaches about one American adult in thirty each week");
    });
    it("lists nothing under a desk that has filed nothing", () => {
        expect(deskFilings({ ...base, feed: [] }, "outlet-rampart")).toEqual([]);
    });
});
describe("the engagement history", () => {
    it("lists every outing newest first, with its desk", () => {
        const rows = pressHistory(withEngagements(base, [true, false]));
        expect(rows.map((row) => row.id)).toEqual(["press:interview:2", "press:interview:1"]);
        expect(rows[0].desk).toBe("The Capital Register");
        expect(rows[0].play).toBe("Sit for an interview");
    });
    it("says how long the White House has gone without taking a question", () => {
        expect(silenceWords(base)).toBe("Someone from the White House has answered reporters' questions this week or last.");
        const quiet = { ...base, turn: base.press.lastSpokeTurn + 9 };
        expect(silenceWords(quiet)).toBe("9 weeks since anyone at the White House took a question.");
    });
    it("draws no trend from a single outing, and reads the run once there are two", () => {
        expect(pressCoverageTrend(withEngagements(base, [true]))).toBeUndefined();
        const trend = pressCoverageTrend(withEngagements(base, [false, false, true]));
        expect(trend.values).toEqual([-1, -2, -1]);
        expect(trend.tone).toBe("adverse");
        expect(trend.summary).toBe("1 of the last 3 went well. Coverage is running against you.");
    });
});
describe("a desk's reach as a number", () => {
    it("carries the weekly share the reach sentence is said from, and its place against the widest desk", () => {
        const profiles = deskProfiles(base);
        for (const profile of profiles) {
            const outlet = PRESS_OUTLETS.find((entry) => entry.id === profile.id);
            expect(profile.reachShare).toBe(outlet.reach);
            expect(profile.reach).toBe(reachWords(profile.reachShare));
            expect(profile.reachOfWidest).toBeGreaterThan(0);
            expect(profile.reachOfWidest).toBeLessThanOrEqual(1);
        }
        expect(Math.max(...profiles.map((profile) => profile.reachOfWidest))).toBe(1);
    });
    it("agrees with the landscape's scale for the same desk", () => {
        const landscape = pressLandscape(base);
        for (const desk of landscape)
            expect(deskProfile(base, desk.id).reachOfWidest).toBe(desk.reach);
    });
});
