import { describe, expect, it } from "vitest";
import { COHORT_AXES, STATE_DEMOGRAPHICS } from "@admin/world";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { createSave, loadSave } from "./save.js";
import { nationalCohortShares } from "./demos.js";
const NEW_AXES = ["race", "sex", "nativity", "disability", "veteran"];
/** A save written before the demographic axes: each state carries only the five authored ones. */
function olderSave() {
    const campaign = buildCampaign();
    const states = Object.fromEntries(Object.entries(campaign.states).map(([id, runtime]) => {
        const cohorts = Object.fromEntries(Object.entries(runtime.base.character.cohorts).filter(([axis]) => !NEW_AXES.includes(axis)));
        return [id, { ...runtime, base: { ...runtime.base, character: { ...runtime.base.character, cohorts } } }];
    }));
    return { ...campaign, states: states };
}
describe("opening an older save without the demographic axes", () => {
    it("fills the five new axes from the authored table and leaves the five it had exactly as they were", () => {
        const before = olderSave();
        const loaded = loadSave(createSave(before));
        for (const [id, runtime] of Object.entries(loaded.states)) {
            const cohorts = runtime.base.character.cohorts;
            for (const axis of NEW_AXES)
                expect(cohorts[axis], `${id} ${axis}`).toEqual(STATE_DEMOGRAPHICS[id][axis]);
            for (const axis of COHORT_AXES.filter((a) => !NEW_AXES.includes(a))) {
                expect(cohorts[axis]).toEqual(before.states[id].base.character.cohorts[axis]);
            }
        }
    });
    it("then reads national shares on every axis, and loading again changes nothing", () => {
        const loaded = loadSave(createSave(olderSave()));
        const shares = nationalCohortShares(loaded);
        expect(shares["foreign-born"]).toBeGreaterThan(0.05);
        expect(shares["sex-female"] + shares["sex-male"]).toBeCloseTo(1, 3);
        expect(loadSave(createSave(loaded))).toEqual(loaded);
    });
    it("leaves a state that already carries the axes, sampled or not, untouched", () => {
        const current = buildCampaign();
        expect(loadSave(createSave(current)).states).toEqual(current.states);
    });
});
