import { describe, expect, it } from "vitest";
import { castBound, plantHolidayScenario, storyPlace } from "@admin/content";
import { selectFamilyRun, selectOpenFamilies } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { withScenarioCases } from "./scenario-cases";
const opening = openingCampaign();
const home = opening.founding.nation;
const opener = {
    ...plantHolidayScenario,
    id: "pin-opener",
    once: false,
    conditions: [],
    family: { id: "pin-thread", role: "opener" },
    locus: { site: "coast", ground: "home", descriptor: "the mill yards along the river where the shift reads the notice" },
};
describe("a thread is pinned the week its opener appears", () => {
    const cast = castBound(opening, opener, home);
    const raised = withScenarioCases(opening, [cast]);
    const pinned = selectFamilyRun(raised, "pin-thread");
    it("exists from the raise, with the place the opener was datelined in", () => {
        expect(cast.locus?.state).toBeDefined();
        expect(pinned).toMatchObject({ unanswered: true, counterpart: home, beats: ["pin-opener"], place: storyPlace(cast.locus, home) });
        expect(selectOpenFamilies(raised)).toEqual([]);
    });
    it("is not pinned twice by a second pass over the same desk", () => {
        expect(selectFamilyRun(withScenarioCases(raised, [cast]), "pin-thread")).toEqual(pinned);
    });
});
