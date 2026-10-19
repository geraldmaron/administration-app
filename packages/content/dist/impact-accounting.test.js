import { readFileSync } from "node:fs";
import { IMPACT_CALIBRATION, NATURAL_IMPACT_PROFILES, apply, commitReply, createRngStreams, openImpactEvent, independentImpactPressure, selectFiscalStatement, } from "@admin/engine";
import { describe, expect, it } from "vitest";
import { sealedCampaign } from "./preview-board.js";
import { castBound } from "./scenario-cast.js";
import { ScenarioDef } from "./scenario.js";
import { CORE_SCENARIOS } from "./packs/core.js";
const repairedRiver = ScenarioDef.parse(JSON.parse(readFileSync(new URL("./__fixtures__/authored-regressions/river-reported-toll-pilot-2026-10-12-the-river-over-the-levee.out.json", import.meta.url), "utf8")));
function reportedRiver() {
    const base = sealedCampaign("reported-river-toll");
    const id = "condition:reported-river";
    const condition = { id, nation: base.founding.nation, kind: "flood", scope: "region",
        severity: 0.7, startedTurn: base.turn, status: "active", beats: [], state: "MO" };
    const state = { ...base, conditions: { ...base.conditions, [id]: condition } };
    const spec = {
        version: 1, id: `impact:${id}`, nation: base.founding.nation, title: "The river overtops the levee",
        source: "condition", parentId: id, accounting: { population: "self", economy: "parent" },
        exposure: { population: 100_000, serviceUsers: 100_000, careCapacity: 200, assetsUSDm: 500,
            dailyOutputUSDm: 2, vulnerability: 0.5, resilience: 0.4, evidence: "regional-estimate", basis: "Known flood district" },
        mechanism: { kind: "natural", hazard: "flood", intensity: 0.7, ...NATURAL_IMPACT_PROFILES.flood },
        calibration: IMPACT_CALIBRATION,
    };
    const event = openImpactEvent(spec, state.calendar);
    return apply(state, { source: "simulate", actor: "world", turn: state.turn,
        narration: { summary: "The river's seven confirmed dead are reported." },
        effects: [{ kind: "impactEvent", event: { ...event, revision: 1, totals: { ...event.totals, deaths: 7, outputLossUSDm: 5 } }, expectedRevision: null }] });
}
function answerRiver(campaign, def) {
    const cast = castBound(campaign, def, campaign.founding.nation);
    const option = cast.script.options.find((entry) => entry.id === "hold-the-levee-line");
    if (!option)
        throw new Error("Repaired river reply is absent");
    const result = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
    if (!result.ok)
        throw new Error(`Repaired river reply was refused: ${result.missingCapability}`);
    return { option, after: apply(campaign, result.packet) };
}
describe("reported condition deaths and the river reply", () => {
    it("keeps one population toll while preserving the reply's opinion and domestic memory", () => {
        const before = sealedCampaign("reported-river-toll");
        const reported = reportedRiver();
        const home = reported.founding.nation;
        const total = (campaign) => Object.values(campaign.states).reduce((sum, row) => sum + row.population, 0);
        expect(reported.nations[home].stats.demography.population).toBe(before.nations[home].stats.demography.population - 7);
        expect(total(reported)).toBe(total(before) - 7);
        const { option, after } = answerRiver(reported, repairedRiver);
        if (option.commitment.kind !== "position")
            throw new Error("River reply must remain a position");
        const effects = option.commitment.resolved ?? [];
        expect(effects.some((effect) => effect.kind === "populationToll")).toBe(false);
        expect(effects.some((effect) => effect.kind === "opinion")).toBe(true);
        expect(effects.some((effect) => effect.kind === "state" && effect.addMark?.signature === "levee-breach-closed-before-the-crest")).toBe(true);
        expect(after.nations[home].stats.demography.population).toBe(reported.nations[home].stats.demography.population);
        expect(total(after)).toBe(total(reported));
        expect(after.player.opinion).not.toEqual(reported.player.opinion);
        expect(Object.values(after.states).some((row) => row.marks.some((mark) => mark.signature === "levee-breach-closed-before-the-crest"))).toBe(true);
    });
    it("keeps named-cohort harm without treating the same deaths as new people lost", () => {
        const def = ScenarioDef.parse({ ...repairedRiver, replies: repairedRiver.replies.map((reply) => reply.id === "hold-the-levee-line" && reply.commitment.kind === "position"
                ? { ...reply, commitment: { ...reply.commitment, impact: { ...reply.commitment.impact,
                            human: { ...reply.commitment.impact?.human, cohorts: ["rural"] } } } }
                : reply) });
        const reported = reportedRiver();
        const { option, after } = answerRiver(reported, def);
        if (option.commitment.kind !== "position")
            throw new Error("River reply must remain a position");
        expect(option.commitment.resolved?.some((effect) => effect.kind === "populationToll")).toBe(false);
        expect(option.commitment.resolved?.some((effect) => effect.kind === "cohort" && effect.cohort === "rural" && effect.addStrain?.valence === -1)).toBe(true);
        expect(after.cohorts.rural.some((strain) => strain.valence === -1)).toBe(true);
        expect(after.nations[reported.founding.nation].stats.demography.population).toBe(reported.nations[reported.founding.nation].stats.demography.population);
    });
    it("keeps incident lost output separate from a reply's borrowing and budget authority", () => {
        const before = sealedCampaign("reported-river-toll");
        const reported = reportedRiver();
        const home = reported.founding.nation;
        const beforeDebt = reported.nations[home].stats.economy.debt;
        const beforeAuthority = reported.player.metrics.treasury;
        const beforeFiscal = selectFiscalStatement(reported);
        const event = Object.values(reported.impactEvents ?? {})[0];
        expect(event.totals.outputLossUSDm).toBe(5);
        expect(independentImpactPressure(reported, home)).toBe(0);
        expect(reported.nations[home].stats.economy.gdp).toBe(before.nations[home].stats.economy.gdp);
        const { option, after } = answerRiver(reported, repairedRiver);
        if (option.commitment.kind !== "position")
            throw new Error("River reply must remain a position");
        const borrowing = option.commitment.resolved?.find((effect) => effect.kind === "choiceBorrowing");
        expect(borrowing?.kind).toBe("choiceBorrowing");
        if (borrowing?.kind !== "choiceBorrowing")
            throw new Error("River relief borrowing is absent");
        const receipt = after.ledger.at(-1)?.accounting?.[0];
        if (!receipt)
            throw new Error("Missing scenario accounting receipt");
        expect(receipt.estimated).toBe(borrowing.amount);
        expect(after.nations[home].stats.economy.debt - beforeDebt).toBe(receipt.booked);
        expect(after.books?.[home]?.choiceDebt).toBe((reported.books?.[home]?.choiceDebt ?? 0) + receipt.booked);
        expect(after.player.metrics.treasury).toBe(beforeAuthority);
        expect(selectFiscalStatement(after).debt).toBeGreaterThan(beforeFiscal.debt);
        expect(after.impactEvents).toEqual(reported.impactEvents);
        expect(independentImpactPressure(after, home)).toBe(0);
    });
    it("charges an actual federal share to authority separately from relief borrowing", () => {
        const base = sealedCampaign("ridge-financial-accounting");
        const condition = { id: "condition:ridge", nation: base.founding.nation, kind: "wildfire",
            scope: "region", severity: 0.6, startedTurn: base.turn, status: "active",
            beats: [], state: "MO" };
        const campaign = { ...base, conditions: { ...base.conditions, [condition.id]: condition } };
        const def = CORE_SCENARIOS.find((entry) => entry.id === "the-ridge-above-the-reservoir");
        if (!def)
            throw new Error("Core ridge scenario is absent");
        const cast = castBound(campaign, def, campaign.founding.nation);
        const option = cast.script.options.find((entry) => entry.id === "sign-the-federal-share");
        if (!option)
            throw new Error("Federal share reply is absent");
        const result = commitReply(campaign, cast.script, option, createRngStreams(campaign.seed));
        if (!result.ok)
            throw new Error(`Federal share refused: ${result.missingCapability}`);
        const after = apply(campaign, result.packet);
        const home = campaign.founding.nation;
        const borrowing = option.commitment.kind === "position"
            ? option.commitment.resolved?.find((effect) => effect.kind === "choiceBorrowing") : undefined;
        if (borrowing?.kind !== "choiceBorrowing")
            throw new Error("Federal relief borrowing is absent");
        // The authored federal share is 2,200, drawn per occurrence (DECISIONS §6.16); authority pays the drawn figure.
        const share = option.commitment.kind === "position" ? option.commitment.cost.treasury ?? 0 : 0;
        expect(share).toBeLessThan(-1100);
        expect(share).toBeGreaterThan(-5500);
        expect(after.player.metrics.treasury).toBeCloseTo(campaign.player.metrics.treasury + share, 6);
        const receipt = after.ledger.at(-1)?.accounting?.[0];
        if (!receipt)
            throw new Error("Missing scenario accounting receipt");
        expect(receipt.estimated).toBe(borrowing.amount);
        expect(after.nations[home].stats.economy.debt - campaign.nations[home].stats.economy.debt).toBe(receipt.booked);
        expect(after.books?.[home]?.choiceDebt).toBe((campaign.books?.[home]?.choiceDebt ?? 0) + receipt.booked);
    });
});
