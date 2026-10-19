/**
 * Release days on their standing rules, the exceptions named, and the figure
 * each release prints being the one the week computed.
 */
import { describe, expect, it } from "vitest";
import { weekdayOf } from "./clock.js";
import { isCpiRelease, isFomcRelease, isGdpRelease, isJobsRelease, jobsReleaseDay, nextReleases, releasesBetween, recordReleases, releasesOn, } from "./economic-releases.js";
import { foundedForBalance } from "./balance-harness.js";
describe("the jobs report", () => {
    it("comes on the first Friday: Friday, and the day number is 1 through 7", () => {
        const fridayTheThird = { year: 2023, month: 3, day: 3 };
        const fridayTheTenth = { year: 2023, month: 3, day: 10 };
        expect(weekdayOf(fridayTheThird)).toBe(5);
        expect(isJobsRelease(fridayTheThird)).toBe(true);
        expect(isJobsRelease(fridayTheTenth)).toBe(false);
        expect(isJobsRelease({ year: 2026, month: 4, day: 3 })).toBe(true);
    });
    it("moves to the next Friday when the first Friday is New Year's Day", () => {
        expect(jobsReleaseDay(2021, 1)).toEqual({ year: 2021, month: 1, day: 8 });
        expect(isJobsRelease({ year: 2021, month: 1, day: 1 })).toBe(false);
    });
    it("comes the Thursday before when the first Friday is Independence Day", () => {
        expect(jobsReleaseDay(2025, 7)).toEqual({ year: 2025, month: 7, day: 3 });
        expect(isJobsRelease({ year: 2025, month: 7, day: 4 })).toBe(false);
    });
});
describe("the other releases", () => {
    it("reads the price index on the Wednesday between the 10th and the 14th", () => {
        expect(isCpiRelease({ year: 2025, month: 6, day: 11 })).toBe(true);
        expect(isCpiRelease({ year: 2025, month: 6, day: 12 })).toBe(false);
        for (let month = 1; month <= 12; month += 1) {
            const days = [10, 11, 12, 13, 14].filter((day) => isCpiRelease({ year: 2030, month, day }));
            expect(days).toHaveLength(1);
        }
    });
    it("reads the advance output estimate on the last Thursday of the month after a quarter", () => {
        expect(isGdpRelease({ year: 2025, month: 4, day: 24 })).toBe(true);
        expect(isGdpRelease({ year: 2025, month: 7, day: 31 })).toBe(true);
        expect(isGdpRelease({ year: 2025, month: 4, day: 17 })).toBe(false);
        expect(isGdpRelease({ year: 2025, month: 5, day: 29 })).toBe(false);
    });
    it("reads the Fed's decision on its planning decision day", () => {
        expect(isFomcRelease({ year: 2025, month: 1, day: 16 })).toBe(true);
        expect(isFomcRelease({ year: 2025, month: 1, day: 15 })).toBe(false);
        expect(isFomcRelease({ year: 2025, month: 2, day: 16 })).toBe(false);
    });
    it("holds twelve jobs reports, twelve price releases, four output estimates and eight decisions a year", () => {
        const year = releasesBetween({ year: 2030, month: 1, day: 1 }, { year: 2030, month: 12, day: 31 });
        const count = (kind) => year.filter((release) => release.kind === kind).length;
        expect([count("jobs"), count("cpi"), count("gdp"), count("fomc")]).toEqual([12, 12, 4, 8]);
    });
});
describe("the figure a release prints", () => {
    const { campaign } = foundedForBalance("releases");
    it("is the rate the week computed, on the week it prints", () => {
        const later = { ...campaign.calendar, year: campaign.calendar.year + 1 };
        const [jobs] = releasesBetween(campaign.calendar, later).filter((release) => release.kind === "jobs");
        expect(jobs).toBeDefined();
        const [release] = releasesOn({ ...campaign, calendar: jobs.date }, jobs.date);
        const us = campaign.nations[campaign.founding.nation];
        expect(release?.figure).toBe(us.stats.economy.unemployment);
    });
    it("names the next of every kind", () => {
        expect(nextReleases(campaign.calendar).map((release) => release.kind)).toEqual(["jobs", "cpi", "gdp", "fomc"]);
    });
});
describe("an issued release", () => {
    const { campaign } = foundedForBalance("release-vintage");
    function weekWithJobs() {
        const to = { ...campaign.calendar, year: campaign.calendar.year + 1 };
        const jobs = releasesBetween(campaign.calendar, to).find((r) => r.kind === "jobs");
        return { ...campaign, calendar: jobs.date, releases: undefined, date: jobs.date };
    }
    it("keeps the figure it printed after the economy moves", () => {
        const { date, ...week } = weekWithJobs();
        const issued = recordReleases(week);
        const printed = releasesOn(issued, date)[0].figure;
        const us = issued.nations[issued.founding.nation];
        const moved = {
            ...issued,
            calendar: { ...date, day: date.day + 3 > 28 ? date.day : date.day + 3 },
            nations: { ...issued.nations, [issued.founding.nation]: { ...us, stats: { ...us.stats, economy: { ...us.stats.economy, unemployment: us.stats.economy.unemployment + 0.04 } } } },
        };
        expect(releasesOn(moved, date)[0].figure).toBe(printed);
    });
    it("is not backfilled from today's economy for a release this save never recorded", () => {
        const { date, ...week } = weekWithJobs();
        const later = { ...week, calendar: { ...date, month: date.month === 12 ? 1 : date.month + 2, year: date.month === 12 ? date.year + 1 : date.year } };
        expect(releasesOn(later, date)[0].figure).toBeUndefined();
    });
    it("is recorded once however many times the week is recorded", () => {
        const { date: _d, ...week } = weekWithJobs();
        const once = recordReleases(week);
        expect(recordReleases(once).releases?.issued).toEqual(once.releases?.issued);
    });
});
