import { describe, expect, it } from "vitest";
import { buildCampaign, nationA, nationB } from "./__fixtures__/campaign.js";
import { apply } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { conflictPhase } from "./war-tick.js";
import { CIVILIANS_PER_SOLDIER_KILLED, accumulateCasualties, casualtyBand, civilianDeaths, warDeathTolls, weeklyLosses, withSplitCasualties, woundedPerKilled, } from "./war-attrition.js";
const USA = nationA.id;
const ALP = nationB.id;
function war(campaign, aggressor, defender, intensity = 0.5) {
    return { ...openConflict(aggressor, defender, campaign.turn, "A war."), intensity };
}
function withMilitary(campaign, nation, military) {
    const runtime = campaign.nations[nation];
    return {
        ...campaign,
        nations: { ...campaign.nations, [nation]: { ...runtime, stats: { ...runtime.stats, military: { ...runtime.stats.military, ...military } } } },
    };
}
function brigades(campaign, count) {
    const id = `commitment:deployment:${USA}:${ALP}`;
    const commitment = {
        id,
        kind: "deployment",
        actor: USA,
        target: { kind: "nation", id: ALP },
        resource: { spec: { kind: "currency", scale: 6, suffix: "USD" }, amountPerTurn: 0 },
        source: { kind: "orderOfBattle", branch: "army", unitType: "army.brigade-combat-team", count },
        startedTurn: campaign.turn,
        review: "standing",
        status: "active",
        rationale: "In the field.",
    };
    return { ...campaign, commitments: { ...campaign.commitments, [id]: commitment } };
}
const total = (losses) => losses.killed + losses.wounded;
describe("losses are derived, never drawn", () => {
    it("rise with intensity and with the size of the force in the field", () => {
        const campaign = buildCampaign();
        expect(total(weeklyLosses(campaign, war(campaign, ALP, USA, 0.8), "aggressor", 0.5))).toBeGreaterThan(total(weeklyLosses(campaign, war(campaign, ALP, USA, 0.2), "aggressor", 0.5)));
        const small = withMilitary(campaign, ALP, { activeHeadcount: 10_000 });
        const large = withMilitary(campaign, ALP, { activeHeadcount: 1_000_000 });
        expect(total(weeklyLosses(large, war(large, ALP, USA), "aggressor", 0.5))).toBeGreaterThan(total(weeklyLosses(small, war(small, ALP, USA), "aggressor", 0.5)));
    });
    it("fall hardest on the side the strength is pressing", () => {
        const campaign = buildCampaign();
        const conflict = war(campaign, ALP, USA);
        expect(total(weeklyLosses(campaign, conflict, "aggressor", 0.8))).toBeGreaterThan(total(weeklyLosses(campaign, conflict, "aggressor", 0.2)));
    });
    it("give the same band for the same week, whatever the seed", () => {
        const campaign = buildCampaign();
        const conflict = war(campaign, ALP, USA);
        const pressure = { aggressor: 0.6, defender: 0.4 };
        expect(accumulateCasualties(campaign, conflict, pressure)).toEqual(accumulateCasualties({ ...campaign, seed: `${campaign.seed}-other` }, conflict, pressure));
    });
});
describe("losses follow the forces committed and the opponent", () => {
    it("charge the President's side for the force it sent, whatever its establishment", () => {
        const campaign = brigades(buildCampaign(), 12);
        const conflict = war(campaign, USA, ALP);
        const bigger = withMilitary(campaign, USA, { activeHeadcount: campaign.nations[USA].stats.military.activeHeadcount * 10 });
        expect(weeklyLosses(bigger, conflict, "aggressor", 0.5)).toEqual(weeklyLosses(campaign, conflict, "aggressor", 0.5));
        expect(total(weeklyLosses(brigades(campaign, 30), conflict, "aggressor", 0.5))).toBeGreaterThan(total(weeklyLosses(campaign, conflict, "aggressor", 0.5)));
    });
    it("are bounded by what the other side brings: a corps against a militia meets the militia", () => {
        const campaign = brigades(buildCampaign(), 12);
        const conflict = war(campaign, USA, ALP);
        const militia = withMilitary(campaign, ALP, { activeHeadcount: 2_000 });
        const army = withMilitary(campaign, ALP, { activeHeadcount: 400_000 });
        expect(total(weeklyLosses(militia, conflict, "aggressor", 0.5))).toBeLessThan(total(weeklyLosses(army, conflict, "aggressor", 0.5)));
    });
    it("are heavier against a better force than a worse one of the same size", () => {
        const campaign = brigades(buildCampaign(), 12);
        const conflict = war(campaign, USA, ALP);
        const ready = withMilitary(campaign, ALP, { readiness: 0.9, doctrineQuality: 0.9 });
        const hollow = withMilitary(campaign, ALP, { readiness: 0.1, doctrineQuality: 0.1 });
        expect(total(weeklyLosses(ready, conflict, "aggressor", 0.5))).toBeGreaterThan(total(weeklyLosses(hollow, conflict, "aggressor", 0.5)));
    });
});
describe("killed and wounded are kept apart", () => {
    it("counts more wounded than killed, and more wounded per killed the lighter the fighting", () => {
        const campaign = brigades(buildCampaign(), 12);
        const light = weeklyLosses(campaign, war(campaign, USA, ALP, 0.3), "aggressor", 0.5);
        expect(light.wounded).toBeGreaterThan(light.killed);
        expect(woundedPerKilled(0.2)).toBeCloseTo(9.2, 6);
        expect(woundedPerKilled(1)).toBeCloseTo(3.2, 6);
        expect(woundedPerKilled(0.3)).toBeGreaterThan(woundedPerKilled(0.8));
    });
    it("still loses people on a quiet front: a deployed force has deaths no enemy causes", () => {
        const campaign = brigades(buildCampaign(), 12);
        const quiet = weeklyLosses(campaign, war(campaign, USA, ALP, 0), "aggressor", 0.5);
        expect(quiet.killed).toBeGreaterThan(0);
    });
});
// Korea's static line: 3,629 killed in action over 3,494 division-days at a
// mean strength of 18,926 (Reister, Table 26), about 0.38 a week per 1,000,
// with 6.36 wounded for each killed counting same-day returns to duty.
describe("a held front loses at the Korean static line's rate", () => {
    const evenFight = (campaign, intensity) => {
        const conflict = war(campaign, USA, ALP, intensity);
        return weeklyLosses(campaign, conflict, "aggressor", 0.5);
    };
    it("charges a held front the static line's killed per person in contact, whatever its drift beneath the line", () => {
        const campaign = withMilitary(brigades(buildCampaign(), 12), ALP, { activeHeadcount: 2_000_000 });
        const held = evenFight(campaign, 0.15);
        const quieter = evenFight(campaign, 0.05);
        expect(held.wounded / held.killed).toBeGreaterThan(6);
        expect(held.wounded).toBeCloseTo(quieter.wounded, 6);
    });
    it("loses far fewer a week on a held line than the fought-front rate scaled down to it did", () => {
        const campaign = withMilitary(brigades(buildCampaign(), 12), ALP, { activeHeadcount: 2_000_000 });
        const held = evenFight(campaign, 0.19);
        const fought = evenFight(campaign, 0.2);
        expect(held.killed).toBeLessThan(fought.killed * 0.6);
    });
});
describe("civilians die where the war is fought", () => {
    it("kills civilians in the defender's country at the Ukrainian share of its soldiers killed", () => {
        const campaign = withMilitary(buildCampaign(), ALP, { activeHeadcount: 400_000 });
        const conflict = war(campaign, ALP, USA, 0.9);
        const pressure = { aggressor: 0.7, defender: 0.3 };
        const soldiers = weeklyLosses(campaign, conflict, "defender", 0.3).killed;
        expect(civilianDeaths(campaign, conflict, pressure)).toBe(Math.round(soldiers * CIVILIANS_PER_SOLDIER_KILLED));
    });
});
describe("the bands", () => {
    it("carry killed and wounded with a confidence on each side, counted with high confidence where the United States fights", () => {
        const campaign = buildCampaign();
        const bands = accumulateCasualties(campaign, war(campaign, ALP, USA), { aggressor: 0.5, defender: 0.5 });
        expect(bands.defender.confidence).toBe("high");
        expect(bands.aggressor.confidence).toBe("low");
        for (const band of [bands.aggressor, bands.defender]) {
            expect(band.killed.high).toBeGreaterThan(band.killed.low);
            expect(band.wounded.high).toBeGreaterThan(band.wounded.low);
        }
    });
    it("accumulate week on week on the war record, and read coarsened", () => {
        const campaign = buildCampaign();
        // Below the decisive line, so neither week can end the war.
        const conflict = war(campaign, ALP, USA, 0.3);
        const opened = { ...campaign, conflicts: { [conflict.id]: conflict } };
        const once = conflictPhase(opened).reduce((state, packet) => apply(state, packet), opened);
        const twice = conflictPhase({ ...once, turn: once.turn + 1 }).reduce((state, packet) => apply(state, packet), { ...once, turn: once.turn + 1 });
        const first = once.conflicts[conflict.id].casualties.defender;
        const second = twice.conflicts[conflict.id].casualties.defender;
        expect(second.wounded.high).toBeGreaterThan(first.wounded.high);
        const read = casualtyBand(twice, twice.conflicts[conflict.id], "defender");
        for (const edge of [read.killed.low, read.killed.high, read.wounded.low, read.wounded.high])
            expect(edge % 10).toBe(0);
    });
    it("read nothing before a week has been counted", () => {
        const campaign = buildCampaign();
        expect(casualtyBand(campaign, war(campaign, ALP, USA), "defender")).toBeUndefined();
    });
});
describe("the dead reach the population", () => {
    it("files the week's killed against each fighting government, the defender's civilians with its own, and nothing for the wounded", () => {
        const campaign = withMilitary(buildCampaign(), ALP, { activeHeadcount: 400_000 });
        const conflict = war(campaign, ALP, USA, 0.9);
        const pressure = { aggressor: 0.7, defender: 0.3 };
        const tolls = warDeathTolls(campaign, conflict, pressure);
        const filed = (nation) => tolls.reduce((sum, effect) => sum + (effect.kind === "populationToll" && effect.nation === nation ? effect.deaths : 0), 0);
        expect(filed(ALP)).toBe(Math.round(weeklyLosses(campaign, conflict, "aggressor", 0.7).killed));
        expect(filed(USA)).toBe(Math.round(weeklyLosses(campaign, conflict, "defender", 0.3).killed) + civilianDeaths(campaign, conflict, pressure));
    });
    it("takes a fought week's dead off the board's population once", () => {
        const campaign = withMilitary(buildCampaign(), ALP, { activeHeadcount: 400_000 });
        const conflict = war(campaign, ALP, USA, 0.3);
        const opened = { ...campaign, conflicts: { [conflict.id]: conflict } };
        const after = conflictPhase(opened).reduce((state, packet) => apply(state, packet), opened);
        const lost = campaign.nations[ALP].stats.demography.population - after.nations[ALP].stats.demography.population;
        expect(lost).toBeGreaterThan(0);
        expect(lost).toBeLessThanOrEqual(after.conflicts[conflict.id].casualties.aggressor.killed.high);
    });
});
describe("a war saved with one band", () => {
    it("is split into killed and wounded that add back to it, and a split war is left alone", () => {
        const campaign = buildCampaign();
        const conflict = war(campaign, ALP, USA);
        const legacy = { ...conflict, casualties: { defender: { low: 900, high: 1_800, confidence: "medium" } } };
        const split = withSplitCasualties({ ...campaign, conflicts: { [conflict.id]: legacy } });
        const band = split.conflicts[conflict.id].casualties.defender;
        expect(band.killed.low + band.wounded.low).toBe(900);
        expect(band.killed.high + band.wounded.high).toBe(1_800);
        expect(withSplitCasualties(split)).toBe(split);
    });
});
