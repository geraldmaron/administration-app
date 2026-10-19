import { describe, expect, it } from "vitest";
import { traitProfileByNation } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { projectAlternatives, projectRun } from "./modeling-projection.js";
import { BELIEF_RATE_ERROR, beliefStreams, believedCampaign, intelligenceCoverage } from "./projection-belief.js";
import { selectForecastRecord } from "./projection-record.js";
import { createSave } from "./save.js";
import { hasIntelOnNation } from "./state-selectors.js";
import { rollNationTraits } from "./traits.js";
import { campaignTurnPhases } from "./turn-phases.js";
const founded = foundedForBalance("projection-belief");
const campaign = founded.campaign;
const advance = { phases: campaignTurnPhases(founded.charter, true) };
const staff = (competence) => ({ kind: "staff", role: "role-foreign-minister", competence });
const stand = { id: "stand", build: () => ({ ok: true, packets: [] }) };
/** A foreign government the services cannot read, with a public profile to draw from. */
const unread = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation && !hasIntelOnNation(campaign, id) && traitProfileByNation.has(id));
/** The same campaign with that government's true character turned to its most hostile. */
function withHostileTruth(state) {
    const runtime = state.nations[unread];
    const traits = { ...runtime.traits, aggression: 1, opportunism: 1, vengefulness: 1, reliability: 0, transparency: 0 };
    return { ...state, nations: { ...state.nations, [unread]: { ...runtime, traits } } };
}
describe("a forecast from a believed copy", () => {
    it("has a government the services cannot read to test against", () => {
        expect(unread).toBeDefined();
        expect(intelligenceCoverage(campaign)).toBeLessThan(1);
    });
    it("gives an unread government the plausible draw from its public profile, never its true character", () => {
        const believed = believedCampaign(campaign, 0, staff(0.5)).nations[unread].traits;
        expect(believed).toEqual(rollNationTraits(traitProfileByNation.get(unread), beliefStreams(campaign, 0)));
        expect(believedCampaign(withHostileTruth(campaign), 0, staff(0.5)).nations[unread].traits).toEqual(believed);
    });
    it("cannot be read for a hidden agenda: the projected paths are the same whatever the hidden truth", () => {
        const options = { weeks: 2, members: 2, advance, basis: staff(0.5) };
        const plain = projectAlternatives(campaign, [stand], options);
        const hostile = projectAlternatives(withHostileTruth(campaign), [stand], options);
        expect(hostile).toEqual(plain);
    });
    it("reads the economy as it was published, with an error a stronger adviser narrows", () => {
        const spread = (competence) => {
            const read = [0, 1, 2, 3, 4].map((member) => believedCampaign(campaign, member, staff(competence)).nations[campaign.founding.nation].stats.economy.inflation);
            return Math.max(...read) - Math.min(...read);
        };
        expect(spread(1)).toBe(0);
        expect(spread(0.2)).toBeGreaterThan(spread(0.8));
        expect(spread(0)).toBeLessThanOrEqual(2 * BELIEF_RATE_ERROR);
    });
    it("narrows the projected band under a stronger adviser", () => {
        const width = (competence) => {
            const runs = projectAlternatives(campaign, [stand], { weeks: 4, members: 5, advance, basis: staff(competence) });
            const finals = runs.map((run) => run.readings.at(-1).approval);
            return Math.max(...finals) - Math.min(...finals);
        };
        expect(width(1)).toBeLessThan(width(0));
    });
    it("is deterministic and leaves the live campaign untouched", () => {
        const before = JSON.stringify(createSave(campaign));
        expect(believedCampaign(campaign, 3, staff(0.4))).toEqual(believedCampaign(campaign, 3, staff(0.4)));
        projectRun(campaign, stand, { weeks: 1, member: 0, advance, basis: staff(0.4) });
        expect(JSON.stringify(createSave(campaign))).toBe(before);
    });
    it("reads the truth only under a truth basis", () => {
        expect(believedCampaign(campaign, 0, { kind: "truth" })).toBe(campaign);
    });
});
describe("the forecast record", () => {
    const record = {
        id: "forecast:test",
        turn: campaign.turn,
        date: campaign.calendar,
        role: "role-foreign-minister",
        subject: "A test",
        option: "Act",
        horizonWeeks: 0,
        dueTurn: campaign.turn - 1,
        approval: { median: 0.5, low: 0.4, high: 0.6 },
        confidence: "moderate",
    };
    const filed = apply(campaign, { source: "action", actor: "player", turn: campaign.turn, background: true, narration: { summary: "A staff forecast is filed." }, effects: [{ kind: "forecast", record }] });
    it("keeps a filed forecast by adviser, beside what happened", () => {
        const [adviser] = selectForecastRecord(filed);
        expect(adviser.role).toBe("role-foreign-minister");
        expect(adviser.records[0].record).toEqual(record);
    });
    it("says a forecast is pending until its week closes", () => {
        const future = { ...record, id: "forecast:later", dueTurn: campaign.turn + 4 };
        const later = apply(filed, { source: "action", actor: "player", turn: campaign.turn, background: true, narration: { summary: "A staff forecast is filed." }, effects: [{ kind: "forecast", record: future }] });
        expect(selectForecastRecord(later)[0].records[1].outcome).toEqual({ state: "pending" });
    });
});
