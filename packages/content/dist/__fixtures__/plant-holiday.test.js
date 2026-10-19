import { describe, expect, it } from "vitest";
import { apply, commitReply, createRngStreams, selectCity, selectMacroDrivers, TURNS_PER_YEAR, } from "@admin/engine";
import { sealedCampaign } from "./campaign.js";
import { plantHolidayScenario } from "./plant-holiday.js";
import { auditScenario } from "../scenario-audit.js";
import { castBound } from "../scenario-cast.js";
const PITTSBURGH = "CITY-USA-pittsburgh";
describe("plant-holiday-pittsburgh", () => {
    it("clears the audit with no errors", () => {
        const errors = auditScenario(plantHolidayScenario).filter((finding) => finding.severity === "error");
        expect(errors).toEqual([]);
    });
    it("binds {{city}} to Pittsburgh and compiles one CityEffect per reply", () => {
        const campaign = sealedCampaign("plant-holiday");
        const cast = castBound(campaign, plantHolidayScenario, campaign.founding.nation);
        expect(cast.script.subject).toContain("Pittsburgh");
        expect(cast.script.subject).not.toContain("{{city}}");
        expect(cast.locus?.city).toBe(PITTSBURGH);
        expect(cast.locus?.placeName).toBe("Pittsburgh, Pennsylvania");
        // The descriptor is player copy too — the Desk prints it beside the
        // dateline — so it goes through the same interpolation as the subject.
        expect(cast.locus?.descriptor).toBe("the mill yards along the river through Pittsburgh");
        expect(cast.script.opening.some((beat) => beat.text.includes("Pittsburgh"))).toBe(true);
        expect(cast.script.opening.some((beat) => beat.text.includes("{{city}}"))).toBe(false);
        const cityEffects = (id) => {
            const option = cast.script.options.find((entry) => entry.id === id);
            expect(option?.commitment.kind).toBe("position");
            if (option?.commitment.kind !== "position")
                return [];
            return (option.commitment.resolved ?? []).filter((effect) => effect.kind === "city");
        };
        expect(cityEffects("approve-ten")).toHaveLength(1);
        expect(cityEffects("approve-five")).toHaveLength(1);
        expect(cityEffects("wage-subsidy")).toHaveLength(1);
        expect(cityEffects("approve-ten")[0]).toMatchObject({
            kind: "city",
            city: PITTSBURGH,
            deltas: { employment: 4000, adminLean: 0.05 },
            set: { taxHolidayTurns: 10 * TURNS_PER_YEAR },
        });
    });
    it("moves Pittsburgh through commitReply for each door", () => {
        const campaign = sealedCampaign("plant-holiday-commit");
        const cast = castBound(campaign, plantHolidayScenario, campaign.founding.nation);
        const streams = createRngStreams(campaign.seed);
        const opening = selectCity(campaign, PITTSBURGH);
        const openingJobs = opening.employment;
        const openingTreasury = campaign.player.metrics.treasury;
        const jobs = [];
        const holidays = [];
        const leans = [];
        for (const option of cast.script.options) {
            const result = commitReply(campaign, cast.script, option, streams);
            expect(result.ok).toBe(true);
            if (!result.ok)
                continue;
            const next = apply(campaign, result.packet);
            const city = selectCity(next, PITTSBURGH);
            jobs.push(city.employment);
            holidays.push(city.taxHolidayTurns);
            leans.push(city.adminLean ?? 0);
            if (option.id === "approve-ten") {
                expect(city.employment).not.toBe(openingJobs);
                // The hiring is dated as a fall in where unemployment is headed; the drift phase moves the rate.
                const world = selectMacroDrivers(next, campaign.founding.nation).unemployment.find((driver) => driver.source === "world");
                expect(world?.amount ?? 0).toBeLessThan(0);
                // The authored obligation is 60, drawn per occurrence (DECISIONS §6.16): the reply carries the drawn figure, near 60 and not round.
                const drawn = option.commitment.kind === "position" ? option.commitment.cost.treasury ?? 0 : 0;
                expect(drawn).toBeLessThan(-30);
                expect(drawn).toBeGreaterThan(-150);
                expect(next.player.metrics.treasury).toBeCloseTo(openingTreasury + drawn, 6);
            }
        }
        expect(new Set(jobs).size).toBe(3);
        expect(holidays).toEqual([10 * TURNS_PER_YEAR, 5 * TURNS_PER_YEAR, 0]);
        expect(new Set(leans.map((lean) => lean.toFixed(3))).size).toBe(3);
    });
});
