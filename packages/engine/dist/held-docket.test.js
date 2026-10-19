import { describe, expect, it } from "vitest";
import { advanceUntilAttention } from "./advance.js";
import { buildCampaign } from "./__fixtures__/campaign.js";
import { addDays, CAMPAIGN_OPENING_DATE, dayOfWeekInOffice } from "./clock.js";
import { apply } from "./effects.js";
import { createSave, loadSave } from "./save.js";
import { noopPhase } from "./turn-loop.js";
const phases = { simulate: noopPhase, select: noopPhase };
function key(date) {
    return `${date.year}-${date.month}-${date.day}`;
}
function entry(id, arrives, closes) {
    return { id, ref: { scenario: id }, arrives, closes };
}
function packet(state, summary, effects) {
    return { source: "simulate", actor: "world", turn: state.turn, narration: { summary }, effects };
}
describe("held docket", () => {
    const admitOn = addDays(CAMPAIGN_OPENING_DATE, 2);
    const closes = addDays(admitOn, 3);
    const staged = entry("doc", admitOn, closes);
    const staging = (_campaign, date) => (key(date) === key(admitOn) ? [staged] : []);
    const lapse = (campaign, closing) => closing.map((item) => packet(campaign, `Closed ${item.id}`, [{ kind: "flag", set: [`lapsed:${item.id}`] }]));
    function finish(oneByOne, days) {
        const options = { phases, stagingSources: [staging], lapseSources: [lapse] };
        if (!oneByOne)
            return advanceUntilAttention(buildCampaign(), { ...options, horizonDays: days }).campaign;
        let state = buildCampaign();
        for (let step = 0; step < days; step += 1) {
            state = advanceUntilAttention(state, { ...options, horizonDays: 1 }).campaign;
        }
        return state;
    }
    it("admits and lapses the same documents under one day, one week and four weeks", () => {
        const week = finish(false, 7);
        const month = finish(false, 28);
        const days = finish(true, 28);
        expect(week.docket).toEqual([]);
        expect(week.player.flags["lapsed:doc"]).toBe(true);
        expect(month.docket).toEqual(week.docket);
        expect(month.player.flags["lapsed:doc"]).toBe(true);
        expect(days.docket).toEqual(week.docket);
        expect(days.player.flags["lapsed:doc"]).toBe(true);
    });
    it("leaves the docket absent when no source is passed", () => {
        const result = advanceUntilAttention(buildCampaign(), { phases, horizonDays: 3 });
        expect(result.campaign.docket).toBeUndefined();
    });
    it("creates an empty docket on the first clock day that has sources and nothing to admit", () => {
        const result = advanceUntilAttention(buildCampaign(), {
            phases,
            horizonDays: 1,
            stagingSources: [() => []],
        });
        expect(result.campaign.docket).toEqual([]);
    });
    it("removes a held document when a docket effect says so", () => {
        const opened = apply(buildCampaign(), packet(buildCampaign(), "Hold doc", [{ kind: "docket", admit: [staged] }]));
        expect(opened.docket?.map((item) => item.id)).toEqual(["doc"]);
        const answered = apply(opened, packet(opened, "Answer doc", [{ kind: "docket", remove: ["doc"] }]));
        expect(answered.docket).toEqual([]);
    });
    it("keeps a docket across a save and does not invent one for a campaign that has none", () => {
        const held = { ...buildCampaign(), docket: [staged] };
        const restored = loadSave(JSON.parse(JSON.stringify(createSave(held))));
        expect(restored.docket).toEqual([staged]);
        const plain = loadSave(JSON.parse(JSON.stringify(createSave(buildCampaign()))));
        expect(plain.docket).toBeUndefined();
    });
    it("counts office days from the oath, with day 7 a week later", () => {
        const campaign = buildCampaign();
        expect(dayOfWeekInOffice(campaign, addDays(CAMPAIGN_OPENING_DATE, 1))).toBe(1);
        expect(dayOfWeekInOffice(campaign, addDays(CAMPAIGN_OPENING_DATE, 7))).toBe(7);
    });
});
