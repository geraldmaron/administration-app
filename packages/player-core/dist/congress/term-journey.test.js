import { describe, expect, it } from "vitest";
import { addDays } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { termJourney } from "./term-journey";
const base = openingCampaign();
describe("termJourney", () => {
    it("opens on the oath, one station reached", () => {
        const stations = termJourney(base);
        expect(stations.map((station) => station.key)).toEqual(["oath", "hundred", "midterm", "reelection", "next-oath"]);
        expect(stations.find((station) => station.active)?.key).toBe("oath");
    });
    it("moves to the hundred-day mark once a hundred days have passed", () => {
        const later = { ...base, calendar: addDays(base.calendar, 100) };
        const stations = termJourney(later);
        expect(stations.find((station) => station.active)?.key).toBe("hundred");
    });
    it("restarts at the oath once a second term's clock takes over", () => {
        const secondTerm = { ...base, termClock: { ...base.termClock, term: 2 } };
        const stations = termJourney(secondTerm);
        expect(stations[0].label).toBe("Term 2 begins");
        expect(stations.find((station) => station.active)?.key).toBe("oath");
    });
});
