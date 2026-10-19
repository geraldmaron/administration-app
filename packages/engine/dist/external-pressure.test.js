import { describe, expect, it } from "vitest";
import { US_GOODS_TRADE } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { COERCION_BITE, COERCION_CAP, exportShare, externalMacroPressure, PARTNER_ELASTICITY, WAR_PRESSURE, } from "./external-pressure.js";
import { COMMODITY_IDS } from "./commodities.js";
import { commodityShocks } from "./commodity-shocks.js";
import { restingProgram } from "./governance.js";
import { MACRO_SHOCK, NO_CYCLE, REVERSION_RATE, macroBaseline, macroEffectsFor } from "./macro.js";
import { driversTarget, selectMacroDrivers } from "./macro-drivers.js";
import { apply } from "./effects.js";
import { resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
const USA = "USA";
const MEX = "MEX";
const CHN = "CHN";
const UKR = "UKR";
const RUS = "RUS";
const POL = "POL";
const { campaign: SEEDED } = foundedForBalance("external-pressure");
/** Every economy growing exactly at its own trend, so a partner's swing is only the one a test gives it. */
function atTrend(campaign) {
    const nations = Object.fromEntries(Object.entries(campaign.nations).map(([id, runtime]) => {
        const trend = macroBaseline(runtime, NO_CYCLE).growth + restingProgram(campaign, id)["economy.growth"];
        return [id, { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, growth: trend } } }];
    }));
    return { ...campaign, nations };
}
const FOUNDED = atTrend(SEEDED);
const war = (intensity) => ({
    id: `war:${RUS}:${UKR}:1`,
    aggressor: RUS,
    defender: UKR,
    joined: { aggressor: [], defender: [POL] },
    startedTurn: 1,
    cause: "a test",
    intensity,
    warSupport: { aggressor: 0.6, defender: 0.8 },
    exhaustion: { aggressor: 0, defender: 0 },
    status: "active",
    beats: [],
});
const atWar = (campaign, intensity) => ({
    ...campaign,
    conflicts: { ...campaign.conflicts, [war(intensity).id]: war(intensity) },
});
const embargoOnMexico = {
    id: `embargo:${MEX}:1`,
    kind: "embargo",
    sector: "autos-light-vehicles",
    target: MEX,
    rate: 0,
    imposedTurn: 1,
    imposedDate: FOUNDED.calendar,
    authority: "INST-OFAC",
    origin: "us",
};
const withMeasure = (campaign, measure) => ({
    ...campaign,
    trade: { ...campaign.trade, measures: { ...campaign.trade.measures, [measure.id]: measure } },
});
const withFlag = (campaign, flag, standing) => ({
    ...campaign,
    player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: standing } },
});
describe("war, by role", () => {
    it("costs a defender, an aggressor and a joiner what the table says per unit of intensity, and a bystander nothing", () => {
        const campaign = atWar(FOUNDED, 0.7);
        const base = (nation) => externalMacroPressure(FOUNDED, nation);
        for (const [nation, role] of [
            [UKR, "defender"],
            [RUS, "aggressor"],
            [POL, "joiner"],
        ]) {
            const moved = externalMacroPressure(campaign, nation);
            expect(moved.growth - base(nation).growth, nation).toBeCloseTo(WAR_PRESSURE[role].growth * 0.7, 6);
            expect(moved.inflation - base(nation).inflation, nation).toBeCloseTo(WAR_PRESSURE[role].inflation * 0.7, 6);
            expect(moved.outlays - base(nation).outlays, nation).toBeCloseTo(WAR_PRESSURE[role].outlays * 0.7, 6);
        }
        expect(externalMacroPressure(campaign, CHN)).toEqual(externalMacroPressure(FOUNDED, CHN));
        expect(WAR_PRESSURE.defender.growth).toBeLessThan(WAR_PRESSURE.aggressor.growth);
        expect(WAR_PRESSURE.aggressor.growth).toBeLessThan(WAR_PRESSURE.joiner.growth);
    });
});
describe("coercion, from both sides", () => {
    it("costs the target what it sells the imposer and the imposer what it sells the target, the United States included", () => {
        const embargoed = withMeasure(FOUNDED, embargoOnMexico);
        const mexicoShare = exportShare(FOUNDED, MEX, USA);
        const usShare = exportShare(FOUNDED, USA, MEX);
        expect(mexicoShare).toBeGreaterThan(0.1);
        expect(usShare).toBeGreaterThan(0.005);
        const mexico = externalMacroPressure(embargoed, MEX).growth - externalMacroPressure(FOUNDED, MEX).growth;
        expect(mexico).toBeCloseTo(-Math.min(COERCION_CAP, COERCION_BITE * mexicoShare), 6);
        const us = externalMacroPressure(embargoed, USA).growth - externalMacroPressure(FOUNDED, USA).growth;
        expect(us).toBeLessThan(0);
        expect(us).toBeCloseTo(-COERCION_BITE * usShare, 3);
    });
    it("costs the United States nothing of its own sales when the embargo bans only the partner's goods", () => {
        const importsOnly = withMeasure(FOUNDED, { ...embargoOnMexico, direction: "imports" });
        const mexico = externalMacroPressure(importsOnly, MEX).growth - externalMacroPressure(FOUNDED, MEX).growth;
        expect(mexico).toBeCloseTo(-Math.min(COERCION_CAP, COERCION_BITE * exportShare(FOUNDED, MEX, USA)), 6);
        expect(externalMacroPressure(importsOnly, USA).growth).toBeCloseTo(externalMacroPressure(FOUNDED, USA).growth, 9);
        const usRestricts = (campaign) => commodityShocks(campaign, "soybeans").filter((shock) => shock.kind === "sanction" && shock.cause.includes("United States"));
        expect(usRestricts(withMeasure(FOUNDED, embargoOnMexico)).length).toBe(usRestricts(FOUNDED).length + 1);
        expect(usRestricts(importsOnly)).toEqual(usRestricts(FOUNDED));
    });
    it("withholds American sales only for an export control or a two-way embargo, as the trade book reads each kind", () => {
        const usRestricts = (campaign) => commodityShocks(campaign, "soybeans").filter((shock) => shock.kind === "sanction" && shock.cause.includes("United States")).length;
        const ofKind = (kind) => withMeasure(FOUNDED, { ...embargoOnMexico, id: `${kind}:${MEX}:1`, kind });
        for (const kind of ["sanctions", "asset-restriction"]) {
            expect(externalMacroPressure(ofKind(kind), USA).growth, kind).toBeCloseTo(externalMacroPressure(FOUNDED, USA).growth, 9);
            expect(usRestricts(ofKind(kind)), kind).toBe(usRestricts(FOUNDED));
        }
        expect(externalMacroPressure(ofKind("export-control"), USA).growth).toBeLessThan(externalMacroPressure(FOUNDED, USA).growth);
        expect(usRestricts(ofKind("export-control"))).toBe(usRestricts(FOUNDED) + 1);
    });
    it("opens on no American export restriction in any market: the inherited programs bite only on their targets", () => {
        const inherited = Object.values(FOUNDED.trade.measures).filter((measure) => measure.id.endsWith(":inherited"));
        expect(inherited.length).toBeGreaterThan(0);
        for (const id of COMMODITY_IDS) {
            expect(commodityShocks(FOUNDED, id).filter((shock) => shock.cause.startsWith("export restrictions by") && shock.cause.includes("United States")), id).toEqual([]);
        }
    });
    it("reaches the United States when another government declares a measure against it, and lifting it restores the US target that week", () => {
        const flag = `embargo:${CHN}:${USA}`;
        const before = driversTarget(selectMacroDrivers(FOUNDED, USA).growth);
        const imposed = withFlag(FOUNDED, flag, true);
        const pressure = externalMacroPressure(imposed, USA).growth - externalMacroPressure(FOUNDED, USA).growth;
        expect(pressure).toBeCloseTo(-COERCION_BITE * exportShare(FOUNDED, USA, CHN), 6);
        expect(pressure).toBeLessThan(0);
        expect(driversTarget(selectMacroDrivers(imposed, USA).growth)).toBeLessThan(before);
        const lifted = withFlag(imposed, flag, false);
        expect(driversTarget(selectMacroDrivers(lifted, USA).growth)).toBeCloseTo(before, 12);
        expect(externalMacroPressure(imposed, CHN).growth).toBeLessThan(externalMacroPressure(FOUNDED, CHN).growth);
    });
    it("reaches the United States through a real embargo another government orders on the ladder", () => {
        const request = { actor: CHN, target: USA, instrument: "economic", rung: 5 };
        const landed = [...Array(40).keys()]
            .map((attempt) => resolveAction(FOUNDED, request, createRngStreams(makeCampaignSeed(`embargo-${attempt}`))))
            .find((result) => result.ok && result.success);
        expect(landed && landed.ok).toBe(true);
        if (!landed || !landed.ok)
            return;
        const after = apply(FOUNDED, landed.packet);
        expect(after.player.flags[`embargo:${CHN}:${USA}`]).toBe(true);
        expect(externalMacroPressure(after, USA).growth).toBeLessThan(externalMacroPressure(FOUNDED, USA).growth);
    });
    it("caps what every measure together can take off one economy", () => {
        let campaign = FOUNDED;
        for (const imposer of Object.keys(FOUNDED.nations).filter((id) => id !== USA && id !== MEX)) {
            campaign = withFlag(campaign, `embargo:${imposer}:${MEX}`, true);
        }
        campaign = withMeasure(campaign, embargoOnMexico);
        expect(externalMacroPressure(campaign, MEX).growth).toBeGreaterThanOrEqual(-COERCION_CAP - 1e-9);
    });
});
describe("the United States as a hub", () => {
    it("rises and falls with what its partners buy, weighted by what it sells each, and stops with an embargo", () => {
        const canada = "CAN";
        const runtime = FOUNDED.nations[canada];
        const booming = {
            ...FOUNDED,
            nations: {
                ...FOUNDED.nations,
                [canada]: { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, growth: runtime.stats.economy.growth + 0.04 } } },
            },
        };
        const lift = externalMacroPressure(booming, USA).growth - externalMacroPressure(FOUNDED, USA).growth;
        expect(US_GOODS_TRADE["CAN"]).toBeDefined();
        expect(lift).toBeCloseTo(exportShare(FOUNDED, USA, canada) * PARTNER_ELASTICITY * 0.04, 5);
        const cut = withFlag(booming, `embargo:${canada}:${USA}`, true);
        const exposure = externalMacroPressure(cut, USA).growth + COERCION_BITE * exportShare(FOUNDED, USA, canada);
        expect(exposure).toBeCloseTo(externalMacroPressure(FOUNDED, USA).growth, 5);
    });
});
describe("one writer", () => {
    it("moves where growth is headed and never where it is: a week of an embargo moves growth by the reversion step of the shift", () => {
        const embargoed = withMeasure(FOUNDED, embargoOnMexico);
        const growth = (campaign) => {
            const stat = macroEffectsFor(campaign, MEX).find((effect) => effect.kind === "nationStat");
            return stat && stat.kind === "nationStat" ? stat.setStats?.economy?.growth ?? 0 : 0;
        };
        const shift = externalMacroPressure(embargoed, MEX).growth - externalMacroPressure(FOUNDED, MEX).growth;
        expect(growth(embargoed) - growth(FOUNDED)).toBeCloseTo(shift * REVERSION_RATE, 5);
        expect(Math.abs(shift * REVERSION_RATE)).toBeGreaterThan(MACRO_SHOCK.growth);
    });
});
