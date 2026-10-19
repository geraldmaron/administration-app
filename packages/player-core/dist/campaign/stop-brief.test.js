import { describe, expect, it } from "vitest";
import { addDays, advanceUntilAttention, apply, campaignTurnPhases, isDeferred, } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { charterOf } from "./founding-options";
import { briefIsWorthReading, briefMovements, deferMatterPacket, stopBriefOf } from "./stop-brief";
const CAMPAIGN = openingCampaign();
const READINGS = { metrics: CAMPAIGN.player.metrics, removalPressure: 0 };
const SECURITY = { marking: { family: "presidential-daily-brief", level: "SECRET", helper: "", caveats: [], line: "" }, items: [] };
function matter(id, over = {}) {
    return {
        id,
        source: "agency-request",
        urgency: "soft",
        title: `Matter ${id}`,
        reason: "The agency is asking.",
        subject: id,
        date: CAMPAIGN.calendar,
        ...over,
    };
}
function run(campaign, matters, horizonDays = 28) {
    return advanceUntilAttention(campaign, {
        phases: campaignTurnPhases(charterOf(campaign)),
        matterSources: matters.length === 0 ? [] : [() => matters],
        horizonDays,
    });
}
describe("the run, as one record", () => {
    it("takes every field off the advance that produced it", () => {
        const result = run(CAMPAIGN, [matter("bill", { urgency: "hard" })]);
        const brief = stopBriefOf(CAMPAIGN, result);
        expect(brief.fromTurn).toBe(CAMPAIGN.turn);
        expect(brief.toTurn).toBe(result.campaign.turn);
        expect(brief.turnsRun).toBe(result.turnsRun);
        expect(brief.elapsedDays).toBe(result.elapsedDays);
        expect(brief.stopReason).toBe(result.stopReason);
        expect(brief.stop).toBe(result.stop);
        expect(brief.ambient).toBe(result.ambientEvents);
    });
    it("reads its security section fresh off the campaign the run produced, not the one it started from", () => {
        const result = run(CAMPAIGN, []);
        const brief = stopBriefOf(CAMPAIGN, result);
        expect(brief.security.marking.family).toBe("presidential-daily-brief");
        expect(Array.isArray(brief.security.items)).toBe(true);
    });
    it("carries the readings at both ends of the run, so what moved can be said without the board that moved", () => {
        const result = run(CAMPAIGN, []);
        const brief = stopBriefOf(CAMPAIGN, result);
        expect(brief.before.metrics).toEqual(CAMPAIGN.player.metrics);
        expect(brief.after.metrics).toEqual(result.campaign.player.metrics);
        const moved = briefMovements(brief);
        for (const key of Object.keys(moved)) {
            expect(moved[key]).toBeCloseTo(result.campaign.player.metrics[key] - CAMPAIGN.player.metrics[key], 9);
        }
    });
    it("spends real days of the term when nothing needs the President", () => {
        const brief = stopBriefOf(CAMPAIGN, run(CAMPAIGN, []));
        expect(brief.stopReason).toBe("horizon");
        expect(brief.elapsedDays).toBeGreaterThan(7);
        expect(brief.toTurn).toBeGreaterThan(brief.fromTurn);
    });
});
describe("whether a run is worth a page", () => {
    it("refuses a run that spent no day of the term", () => {
        const brief = stopBriefOf(CAMPAIGN, run(CAMPAIGN, [matter("bill", { urgency: "hard" })]));
        expect(brief.turnsRun).toBe(0);
        expect(briefIsWorthReading(brief)).toBe(false);
    });
    it("refuses nothing at all", () => {
        expect(briefIsWorthReading(undefined)).toBe(false);
    });
    it("opens on a run that both spent days and produced news", () => {
        const brief = stopBriefOf(CAMPAIGN, run(CAMPAIGN, []));
        expect(brief.turnsRun).toBeGreaterThan(0);
        expect(brief.ambient.length).toBeGreaterThan(0);
        expect(briefIsWorthReading(brief)).toBe(true);
    });
    it("opens on a quiet run that still stopped for something", () => {
        expect(briefIsWorthReading({
            fromTurn: 1,
            toTurn: 3,
            turnsRun: 2,
            elapsedDays: 14,
            stopReason: "attention",
            stop: { presented: [matter("bill")], deferred: [], ambient: [] },
            ambient: [],
            before: READINGS,
            after: READINGS,
            security: SECURITY,
            closedArcs: [],
        })).toBe(true);
    });
    it("opens on a quiet run in which a story ended, and carries its one line", () => {
        const row = { family: "strait", title: "The strait closes at dawn", counterpart: "Alpland", openedDate: CAMPAIGN.calendar, closedDate: CAMPAIGN.calendar, disposition: "lapsed", weeks: 6, chapters: 2 };
        expect(briefIsWorthReading({
            fromTurn: 1,
            toTurn: 3,
            turnsRun: 2,
            elapsedDays: 14,
            stopReason: "horizon",
            stop: { presented: [], deferred: [], ambient: [] },
            ambient: [],
            before: READINGS,
            after: READINGS,
            security: SECURITY,
            closedArcs: [row],
        })).toBe(true);
        expect(stopBriefOf(CAMPAIGN, run(CAMPAIGN, [])).closedArcs).toEqual([]);
    });
    it("stays shut on a run that spent days and produced neither", () => {
        expect(briefIsWorthReading({
            fromTurn: 1,
            toTurn: 3,
            turnsRun: 2,
            elapsedDays: 14,
            stopReason: "horizon",
            stop: { presented: [], deferred: [], ambient: [] },
            ambient: [],
            before: READINGS,
            after: READINGS,
            security: SECURITY,
            closedArcs: [],
        })).toBe(false);
    });
    it("opens on an election even where the week filed nothing and presented nothing — the country voted, which is the news", () => {
        expect(briefIsWorthReading({
            fromTurn: 1,
            toTurn: 3,
            turnsRun: 2,
            elapsedDays: 14,
            stopReason: "election",
            stop: { presented: [], deferred: [], ambient: [] },
            ambient: [],
            before: READINGS,
            after: READINGS,
            security: SECURITY,
            closedArcs: [],
        })).toBe(true);
    });
    it("opens on an election that lands mid-week, closing no turn at all", () => {
        // The one shape a real election stop actually takes: Election Day is
        // whatever day of the week it falls on, so the run that reaches it has
        // spent a real day (elapsedDays > 0) without closing the week it is inside
        // (turnsRun 0). A guard written on turnsRun alone would call this a no-op.
        expect(briefIsWorthReading({
            fromTurn: 94,
            toTurn: 94,
            turnsRun: 0,
            elapsedDays: 1,
            stopReason: "election",
            stop: { presented: [], deferred: [], ambient: [] },
            ambient: [],
            before: READINGS,
            after: READINGS,
            security: SECURITY,
            closedArcs: [],
        })).toBe(true);
    });
    it("stays shut on a run that closed no turn and produced neither news nor a matter, election or not", () => {
        expect(briefIsWorthReading({
            fromTurn: 94,
            toTurn: 94,
            turnsRun: 0,
            elapsedDays: 0,
            stopReason: "attention",
            stop: { presented: [], deferred: [], ambient: [] },
            ambient: [],
            before: READINGS,
            after: READINGS,
            security: SECURITY,
            closedArcs: [],
        })).toBe(false);
    });
});
describe("putting a matter off", () => {
    it("writes the deferral through the ledger, not around it", () => {
        const soft = matter("chair");
        const next = apply(CAMPAIGN, deferMatterPacket(CAMPAIGN, soft));
        expect(isDeferred(next.deferrals, soft.id, next.calendar)).toBe(true);
    });
    it("never buys a day past the thing's own deadline", () => {
        const dueTomorrow = matter("bill", { urgency: "hard", dueDate: addDays(CAMPAIGN.calendar, 1) });
        const next = apply(CAMPAIGN, deferMatterPacket(CAMPAIGN, dueTomorrow));
        expect(next.deferrals[dueTomorrow.id]).toEqual(dueTomorrow.dueDate);
    });
    it("lets the world run the day a deadline that is due today lapses in, on the presidency's own closing day (CLK-13)", () => {
        const dueToday = matter("lapse", { urgency: "hard", dueDate: CAMPAIGN.calendar });
        expect(run(CAMPAIGN, [dueToday]).elapsedDays).toBe(0);
        const after = apply(CAMPAIGN, deferMatterPacket(CAMPAIGN, dueToday));
        // A deadline that has already arrived is put off to the founding weekday
        // on or after tomorrow, not to a bare tomorrow — so a matter due every day
        // it lapses stops the Desk at most once a week rather than every day it
        // stands. On this fixture the founding weekday equals today's, so the
        // next occurrence is a full week out and a turn crosses.
        const result = run(after, [dueToday]);
        expect(result.elapsedDays).toBeGreaterThan(0);
        expect(result.turnsRun).toBe(1);
    });
    it("lets the world move again once the standing matter is put off", () => {
        const standing = matter("bill", { urgency: "hard" });
        const stuck = run(CAMPAIGN, [standing]);
        expect(stuck.turnsRun).toBe(0);
        const after = apply(CAMPAIGN, deferMatterPacket(CAMPAIGN, standing));
        expect(run(after, [standing]).turnsRun).toBeGreaterThan(0);
    });
});
