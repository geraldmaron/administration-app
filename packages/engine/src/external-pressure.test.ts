import { describe, expect, it } from "vitest";
import { US_GOODS_TRADE, type NationId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import {
  COERCION_BITE,
  COERCION_CAP,
  chipShortfall,
  DOLLAR_REACH,
  EVASION,
  evasionOn,
  exportShare,
  externalMacroPressure,
  financialReachOf,
  measureCut,
  PARTNER_ELASTICITY,
  coercionsInForce,
  stoppedShare,
  partnerShare,
  WAR_PRESSURE,
  worldExportShare,
} from "./external-pressure.js";
import { withWeeksElapsed } from "./__fixtures__/campaign.js";
import { selectDateOfTurn } from "./clock.js";
import { COERCION_AS_RATE, leadingExportSector, retaliationFall, sectorFlow } from "./trade-volume.js";
import { liftMeasure, tradeEdgesWith } from "./trade.js";
import { tradeSector } from "./trade-sectors.js";
import { assetBlockingEffects } from "./blocked-assets.js";
import { COMMODITY_IDS } from "./commodities.js";
import { commodityShocks } from "./commodity-shocks.js";
import { restingProgram } from "./governance.js";
import { MACRO_SHOCK, NO_CYCLE, REVERSION_RATE, macroBaseline, macroEffectsFor } from "./macro.js";
import { driversTarget, selectMacroDrivers } from "./macro-drivers.js";
import { apply } from "./effects.js";
import { openConflict } from "./conflicts.js";
import { resolveAction } from "./resolution.js";
import { createRngStreams, makeCampaignSeed } from "./rng.js";
import type { TradeMeasure } from "./trade.js";
import type { Campaign, Conflict } from "./state.js";

const USA = "USA" as NationId;
const MEX = "MEX" as NationId;
const CHN = "CHN" as NationId;
const UKR = "UKR" as NationId;
const RUS = "RUS" as NationId;
const POL = "POL" as NationId;
const { campaign: SEEDED } = foundedForBalance("external-pressure");

/** Every economy growing exactly at its own trend, so a partner's swing is only the one a test gives it. */
function atTrend(campaign: Campaign): Campaign {
  const nations = Object.fromEntries(
    Object.entries(campaign.nations).map(([id, runtime]) => {
      const trend = macroBaseline(runtime, NO_CYCLE).growth + restingProgram(campaign, id as NationId)["economy.growth"];
      return [id, { ...runtime, stats: { ...runtime.stats, economy: { ...runtime.stats.economy, growth: trend } } }];
    }),
  );
  return { ...campaign, nations } as Campaign;
}

const FOUNDED = atTrend(SEEDED);

const war = (intensity: number): Conflict => ({
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

const atWar = (campaign: Campaign, intensity: number): Campaign => ({
  ...campaign,
  conflicts: { ...campaign.conflicts, [war(intensity).id]: war(intensity) },
});

const embargoOnMexico: TradeMeasure = {
  id: `embargo:${MEX}:1`,
  kind: "embargo",
  sector: "autos-light-vehicles" as TradeMeasure["sector"],
  target: MEX,
  rate: 0,
  imposedTurn: 1,
  imposedDate: FOUNDED.calendar,
  authority: "INST-OFAC",
  origin: "us",
};

const withMeasure = (campaign: Campaign, measure: TradeMeasure): Campaign => ({
  ...campaign,
  trade: { ...campaign.trade, measures: { ...campaign.trade.measures, [measure.id]: measure } },
});

const withFlag = (campaign: Campaign, flag: string, standing: boolean): Campaign => ({
  ...campaign,
  player: { ...campaign.player, flags: { ...campaign.player.flags, [flag]: standing } },
});

describe("war, by role", () => {
  it("costs a defender, an aggressor and a joiner what the table says per unit of intensity, and a bystander nothing", () => {
    const campaign = atWar(FOUNDED, 0.7);
    const base = (nation: NationId) => externalMacroPressure(FOUNDED, nation);
    for (const [nation, role] of [
      [UKR, "defender"],
      [RUS, "aggressor"],
      [POL, "joiner"],
    ] as const) {
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
    const usRestricts = (campaign: Campaign) =>
      commodityShocks(campaign, "soybeans").filter((shock) => shock.kind === "sanction" && shock.cause.includes("United States"));
    expect(usRestricts(withMeasure(FOUNDED, embargoOnMexico)).length).toBe(usRestricts(FOUNDED).length + 1);
    expect(usRestricts(importsOnly)).toEqual(usRestricts(FOUNDED));
  });

  it("withholds American sales only for an export control or a two-way embargo, as the trade book reads each kind", () => {
    const usRestricts = (campaign: Campaign) =>
      commodityShocks(campaign, "soybeans").filter((shock) => shock.kind === "sanction" && shock.cause.includes("United States")).length;
    const ofKind = (kind: TradeMeasure["kind"]) => withMeasure(FOUNDED, { ...embargoOnMexico, id: `${kind}:${MEX}:1`, kind });
    for (const kind of ["sanctions", "asset-restriction"] as const) {
      expect(externalMacroPressure(ofKind(kind), USA).growth, kind).toBeCloseTo(externalMacroPressure(FOUNDED, USA).growth, 9);
      expect(usRestricts(ofKind(kind)), kind).toBe(usRestricts(FOUNDED));
    }
    expect(externalMacroPressure(ofKind("export-control"), USA).growth).toBeLessThan(externalMacroPressure(FOUNDED, USA).growth);
    // An export control reaches only the sector it is filed under: one on light
    // vehicles leaves American grain on the market, one on row crops does not.
    expect(usRestricts(ofKind("export-control"))).toBe(usRestricts(FOUNDED));
    const onCrops = withMeasure(FOUNDED, { ...embargoOnMexico, id: `export-control:${MEX}:crops`, kind: "export-control", sector: "agriculture-row-crops" as TradeMeasure["sector"] });
    expect(usRestricts(onCrops)).toBe(usRestricts(FOUNDED) + 1);
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
    const request = { actor: CHN, target: USA, instrument: "economic" as const, rung: 5 as const };
    const landed = [...Array(40).keys()]
      .map((attempt) => resolveAction(FOUNDED, request, createRngStreams(makeCampaignSeed(`embargo-${attempt}`))))
      .find((result) => result.ok && result.success);
    expect(landed && landed.ok).toBe(true);
    if (!landed || !landed.ok) return;
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
    const canada = "CAN" as NationId;
    const runtime = FOUNDED.nations[canada]!;
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
    const growth = (campaign: Campaign) => {
      const stat = macroEffectsFor(campaign, MEX).find((effect) => effect.kind === "nationStat");
      return stat && stat.kind === "nationStat" ? stat.setStats?.economy?.growth ?? 0 : 0;
    };
    const shift = externalMacroPressure(embargoed, MEX).growth - externalMacroPressure(FOUNDED, MEX).growth;
    expect(growth(embargoed) - growth(FOUNDED)).toBeCloseTo(shift * REVERSION_RATE, 5);
    expect(Math.abs(shift * REVERSION_RATE)).toBeGreaterThan(MACRO_SHOCK.growth);
  });
});

describe("sanctions reach", () => {
  const IRN = "IRN" as NationId;
  const oilSanctions = (id: string, imposedTurn: number, liftedTurn?: number): TradeMeasure => ({
    id,
    kind: "sanctions",
    sector: "energy-crude" as TradeMeasure["sector"],
    target: IRN,
    rate: 0,
    imposedTurn,
    imposedDate: selectDateOfTurn(FOUNDED, imposedTurn),
    authority: "INST-OFAC",
    origin: "us",
    ...(liftedTurn !== undefined ? { liftedTurn } : {}),
  });
  const withMeasures = (campaign: Campaign, measures: readonly TradeMeasure[]): Campaign => ({
    ...campaign,
    trade: { ...campaign.trade, measures: { ...campaign.trade.measures, ...Object.fromEntries(measures.map((m) => [m.id, m])) } },
  });
  const embargoOn = (target: NationId): TradeMeasure => ({ ...embargoOnMexico, id: `embargo:${target}:reach`, target, imposedDate: FOUNDED.calendar });
  const delta = (campaign: Campaign, nation: NationId) => externalMacroPressure(campaign, nation).growth - externalMacroPressure(FOUNDED, nation).growth;

  it("reaches past the administration's own market, so a US embargo hurts Iran more than one by its largest buyer", () => {
    const us = delta(withMeasure(FOUNDED, embargoOn(IRN)), IRN);
    const china = delta(withFlag(FOUNDED, `embargo:${CHN}:${IRN}`, true), IRN);
    expect(china).toBeLessThan(0);
    expect(us).toBeLessThan(china);
    // Another capital's measure reaches only its own trade: Iran's world sales times China's share of them.
    expect(exportShare(FOUNDED, IRN, CHN)).toBeCloseTo(worldExportShare(FOUNDED, IRN) * partnerShare(FOUNDED, IRN, CHN), 9);
  });

  it("keeps a measure to its sector: an oil designation moves crude, not wheat, and an embargo moves both", () => {
    // Canada sells the world both, and the opening carries no program on it.
    const CAN = "CAN" as NationId;
    const lossOn = (campaign: Campaign, id: "crude" | "wheat") => commodityShocks(campaign, id).filter((s) => s.kind === "sanction" && s.cause.includes("Canada")).reduce((sum, s) => sum + s.loss, 0);
    const oil = withMeasure(FOUNDED, { ...oilSanctions("sanctions:CAN:oil", FOUNDED.turn), target: CAN });
    const all = withMeasure(FOUNDED, embargoOn(CAN));
    expect(lossOn(oil, "crude")).toBeGreaterThan(lossOn(FOUNDED, "crude"));
    expect(lossOn(oil, "wheat")).toBeCloseTo(lossOn(FOUNDED, "wheat"), 12);
    expect(lossOn(all, "wheat")).toBeGreaterThan(lossOn(FOUNDED, "wheat"));
  });

  it("charges two designations of the same sector once", () => {
    const one = withMeasure(FOUNDED, oilSanctions("s:one", FOUNDED.turn));
    const two = withMeasure(one, oilSanctions("s:two", FOUNDED.turn));
    expect(externalMacroPressure(two, IRN).growth).toBeCloseTo(externalMacroPressure(one, IRN).growth, 9);
  });

  it("loses reach to evasion while it stands, and a lift and reimposition do not reset it", () => {
    const start = FOUNDED.turn;
    const fresh = withMeasures(FOUNDED, [oilSanctions("s:fresh", start)]);
    const held = withWeeksElapsed(withMeasures(FOUNDED, [oilSanctions("s:held", start)]), 104);
    const reimposed = withWeeksElapsed(withMeasures(FOUNDED, [oilSanctions("s:a", start, start + 26), oilSanctions("s:b", start + 104)]), 104);
    expect(financialReachOf(fresh, USA, IRN)).toBeCloseTo(DOLLAR_REACH, 9);
    expect(financialReachOf(held, USA, IRN)).toBeLessThan(DOLLAR_REACH);
    expect(financialReachOf(held, USA, IRN)).toBeGreaterThanOrEqual(DOLLAR_REACH * (1 - EVASION.ceiling));
    expect(evasionOn(reimposed, IRN)).toBeGreaterThan(0);
    expect(financialReachOf(reimposed, USA, IRN)).toBeLessThan(DOLLAR_REACH);
    // Refiling the program under another sector's name does not reset the networks either.
    const renamed = withWeeksElapsed(withMeasures(FOUNDED, [oilSanctions("s:a", start, start + 26), { ...oilSanctions("s:c", start + 104), sector: "chemicals" as TradeMeasure["sector"] }]), 104);
    expect(evasionOn(renamed, IRN)).toBeCloseTo(evasionOn(reimposed, IRN), 12);
  });

  it("takes no more off Iran over two years by imposing, lifting and reimposing than by holding the measure", () => {
    const start = FOUNDED.turn;
    const held = [oilSanctions("s:held", start)];
    const cycled = [0, 1, 2, 3].map((k) => oilSanctions(`s:cycle:${k}`, start + k * 26, start + k * 26 + 13));
    const standingAt = (measures: readonly TradeMeasure[], turn: number) =>
      measures.filter((m) => m.imposedTurn <= turn).map((m) => (m.liftedTurn !== undefined && m.liftedTurn > turn ? ({ ...m, liftedTurn: undefined } as TradeMeasure) : m));
    const cumulative = (measures: readonly TradeMeasure[]) =>
      Array.from({ length: 104 }, (_, week) => {
        const now = withWeeksElapsed(FOUNDED, week);
        return externalMacroPressure(withMeasures(now, standingAt(measures, now.turn)), IRN).growth - externalMacroPressure(now, IRN).growth;
      }).reduce((sum, value) => sum + value, 0);
    expect(cumulative(held)).toBeLessThan(cumulative(cycled));
    const afterLift = withWeeksElapsed(withMeasures(FOUNDED, standingAt(cycled, start + 104)), 104);
    const crude = (campaign: Campaign) => commodityShocks(campaign, "crude").filter((s) => s.kind === "sanction" && s.cause.includes("Iran"));
    expect(crude(afterLift)).toEqual([]);
  });

  it("lets the administration designate a government it has no trade lane with, and keeps the trade gate for an embargo", () => {
    expect(FOUNDED.nations[USA]!.stats.trade.tradeDependence[IRN]).toBeUndefined();
    const ask = (rung: 3 | 4 | 5) => resolveAction(FOUNDED, { actor: USA, target: IRN, instrument: "economic", rung }, createRngStreams(FOUNDED.seed), "simulate");
    expect(ask(3).ok).toBe(true);
    expect(ask(4).ok).toBe(true);
    const embargo = ask(5);
    expect(embargo.ok).toBe(false);
    expect((embargo as { missingCapability?: string }).missingCapability).toMatch(/trade channel/);
  });

  it("refuses a designation by a government with neither a trade lane nor a financial system the target's trade clears through", () => {
    const actor = (Object.keys(FOUNDED.nations) as NationId[]).find(
      (id) =>
        id !== USA &&
        id !== IRN &&
        FOUNDED.relationships[`${id}:${IRN}`] !== undefined &&
        FOUNDED.nations[id]!.stats.trade.tradeDependence[IRN] === undefined &&
        FOUNDED.nations[id]!.stats.economy.reserves >= 2000,
    )!;
    const result = resolveAction(FOUNDED, { actor, target: IRN, instrument: "economic", rung: 3 }, createRngStreams(FOUNDED.seed), "simulate");
    expect(result.ok).toBe(false);
    expect((result as { missingCapability?: string }).missingCapability).toMatch(/financial system/);
  });
});

describe("the sanction act on Iran, through the public path", () => {
  // No inherited program, so the act is the only measure on Iran.
  const { campaign: CLEAN } = foundedForBalance("iran-act", "democrat", {}, { carriedWorld: false });
  const IRN = "IRN" as NationId;
  const growth = (campaign: Campaign) => externalMacroPressure(campaign, IRN).growth;
  const land = (campaign: Campaign, rung: 3 | 4): Campaign => {
    const result = [...Array(40).keys()]
      .map((k) => resolveAction(campaign, { actor: USA, target: IRN, instrument: "economic", rung }, createRngStreams(makeCampaignSeed(`iran-${rung}-${k}`)), "action"))
      .find((r) => r.ok && r.success);
    if (!result || !result.ok) throw new Error(`rung ${rung} on Iran did not land`);
    return apply(campaign, result.packet);
  };

  it("files a designation on Iran's oil under OFAC, with reach, rather than an export control", () => {
    const after = land(CLEAN, 3);
    const filed = Object.values(after.trade.measures).filter((m) => m.target === IRN);
    expect(filed.map((m) => [m.kind, m.sector, m.authority])).toEqual([["sanctions", "energy-crude", "INST-OFAC"]]);
    expect(financialReachOf(after, USA, IRN)).toBeGreaterThan(0);
    expect(growth(after)).toBeLessThan(growth(CLEAN));
  });

  // B8's ordering on the flow the designation names: it stops more of Iran's
  // crude sales than China, its largest buyer, does by refusing all of them.
  it("stops more of Iran's crude sales through the designation than an embargo by China does", () => {
    const designated = land(CLEAN, 3);
    const china = withFlag(CLEAN, `embargo:${CHN}:${IRN}`, true);
    const crude = (campaign: Campaign) => stoppedShare(campaign, IRN, "energy-oil", "energy-crude");
    expect(crude(china)).toBeGreaterThan(0);
    expect(crude(designated)).toBeGreaterThan(crude(china));
  });

  it("lets a freeze block the government's holdings without reaching anyone else's purchases", () => {
    const frozen = land(CLEAN, 4);
    const freeze = Object.values(frozen.trade.measures).find((m) => m.target === IRN && m.kind === "asset-restriction")!;
    expect(coercionsInForce(frozen).find((c) => c.target === IRN)?.financialReach).toBe(0);
    expect(freeze.authority).toBe("INST-OFAC");
  });
});

describe("Wave 1R: a restriction is charged once, where it is in force, on what it covers", () => {
  const { campaign: CLEAN } = foundedForBalance("wave-1r", "democrat", {}, { carriedWorld: false });
  const preset = foundedForBalance("wave-1r-preset", "democrat", {}, { openingPreset: "world-2026" }).campaign;
  const at = (campaign: Campaign, measures: readonly TradeMeasure[]): Campaign => ({ ...campaign, trade: { ...campaign.trade, measures: { ...campaign.trade.measures, ...Object.fromEntries(measures.map((m) => [m.id, m])) } } });
  const measure = (id: string, target: string, kind: TradeMeasure["kind"], sector: string, extra: Partial<TradeMeasure> = {}): TradeMeasure => ({
    id, kind, sector: sector as TradeMeasure["sector"], target: target as NationId, rate: 0, imposedTurn: CLEAN.turn, imposedDate: CLEAN.calendar, authority: "INST-OFAC", origin: "us", ...extra,
  });
  const growth = (campaign: Campaign, nation: string) => externalMacroPressure(campaign, nation as NationId).growth;
  const ask = (campaign: Campaign, target: string, rung: 3 | 4) => resolveAction(campaign, { actor: USA, target: target as NationId, instrument: "economic", rung }, createRngStreams(campaign.seed), "simulate");
  const landed = (campaign: Campaign, target: string, rung: 3 | 4): Campaign => {
    const result = [...Array(40).keys()].map((k) => resolveAction(campaign, { actor: USA, target: target as NationId, instrument: "economic", rung }, createRngStreams(makeCampaignSeed(`r-${rung}-${k}`)), "action")).find((r) => r.ok && r.success);
    if (!result || !result.ok) throw new Error("did not land");
    return apply(campaign, result.packet);
  };

  it("refuses a designation or a freeze the register cannot file, before charging anything, and a second freeze on the same trade", () => {
    // Palau sells the United States nothing in any sector; with no export a
    // trade sector covers either, a freeze has nothing to be filed against.
    const PLW = "PLW" as NationId;
    const palau = CLEAN.nations[PLW]!;
    const bare: Campaign = { ...CLEAN, nations: { ...CLEAN.nations, [PLW]: { ...palau, base: { ...palau.base, stats: { ...palau.base.stats, trade: { ...palau.base.stats.trade, topExports: ["tourism-hospitality"] } } } } } };
    expect(leadingExportSector(bare, PLW)).toBeUndefined();
    expect(tradeEdgesWith(bare, PLW).some((edge) => edge.imports > 0)).toBe(false);
    const refused = ask(bare, "PLW", 4);
    expect(refused.ok).toBe(false);
    expect((refused as { missingCapability?: string }).missingCapability).toMatch(/filed against/);
    const again = ask(landed(CLEAN, "PRK", 4), "PRK", 4);
    expect(again.ok).toBe(false);
    expect((again as { missingCapability?: string }).missingCapability).toMatch(/already in force/);
  });

  it("files a further designation under the next export not already designated, so escalation never refiles what stands", () => {
    const iran = Object.values(preset.trade.measures).filter((m) => m.target === ("IRN" as NationId) && m.kind === "sanctions").map((m) => m.sector);
    expect(iran.length).toBeGreaterThan(0);
    const escalated = landed(preset, "IRN", 3);
    const added = Object.values(escalated.trade.measures).filter((m) => !(m.id in preset.trade.measures) && m.target === ("IRN" as NationId));
    expect(added).toHaveLength(1);
    expect(iran).not.toContain(added[0]!.sector);
  });

  it("files a blocked account as listed, so one modeled account is not the owner's whole trade", () => {
    const asset = { id: "a", owner: "CAN" as NationId, custodian: "modeled-us-clearing-account" as const, modeled: true as const, orderRecordId: "o", emergencyId: "e", tradeMeasureId: "asset-restriction:o", blockedTurn: CLEAN.turn, status: "blocked" as const };
    const filed = assetBlockingEffects(CLEAN, asset).flatMap((effect) => (effect.kind === "trade" && effect.measure ? [effect.measure] : []));
    expect(filed.map((m) => m.scope)).toEqual(["listed"]);
    expect(growth(at(CLEAN, filed), "CAN")).toBeCloseTo(growth(CLEAN, "CAN"), 9);
  });

  it("charges nothing for a measure a court has paused, and keeps its record for reinstatement", () => {
    const freeze = measure("asset-restriction:CAN:paused", "CAN", "asset-restriction", "energy-crude");
    const live = at(CLEAN, [freeze]);
    expect(growth(live, "CAN")).toBeLessThan(growth(CLEAN, "CAN"));
    const paused: Campaign = { ...live, blockedAssets: [{ id: "p", owner: "CAN" as NationId, custodian: "modeled-us-clearing-account", modeled: true, orderRecordId: "missing", emergencyId: "missing", tradeMeasureId: freeze.id, blockedTurn: CLEAN.turn, status: "blocked" }] };
    expect(growth(paused, "CAN")).toBeCloseTo(growth(CLEAN, "CAN"), 9);
    expect(paused.trade.measures[freeze.id]).toBeDefined();
  });

  it("charges a repeated designation once, and an embargo and a designation on the same flow once, in growth and in supply alike", () => {
    const one = at(CLEAN, [measure("s:COD:1", "COD", "sanctions", "bulk-mining")]);
    const two = at(one, [measure("s:COD:2", "COD", "sanctions", "bulk-mining")]);
    expect(growth(two, "COD")).toBeCloseTo(growth(one, "COD"), 9);
    const copper = (campaign: Campaign) => commodityShocks(campaign, "copper").filter((s) => s.kind === "sanction").reduce((sum, s) => sum + s.loss, 0);
    expect(copper(two)).toBeCloseTo(copper(one), 12);
    const embargo = at(CLEAN, [measure("e:IRN", "IRN", "embargo", "energy-crude")]);
    const both = at(embargo, [measure("s:IRN", "IRN", "sanctions", "energy-crude")]);
    expect(growth(both, "IRN")).toBeCloseTo(growth(embargo, "IRN"), 9);
  });

  it("does not compound repeated restrictions in the bilateral book", () => {
    const flow = (campaign: Campaign) => sectorFlow(campaign, "MEX" as NationId, "autos-light-vehicles" as TradeMeasure["sector"])?.imports ?? 0;
    const one = at(CLEAN, [measure("s:MEX:1", "MEX", "sanctions", "autos-light-vehicles")]);
    const two = at(one, [measure("s:MEX:2", "MEX", "sanctions", "autos-light-vehicles")]);
    expect(flow(one)).toBeLessThan(flow(CLEAN));
    expect(flow(two)).toBeCloseTo(flow(one), 6);
  });

  it("charges stacked answers on one partner's sector as the book compounds them", () => {
    const def = tradeSector("agriculture-row-crops")!;
    const answer = (id: string): TradeMeasure => measure(id, "CHN", "tariff", "agriculture-row-crops", { rate: 0.25, origin: "retaliation", actor: "CHN" as NationId, authority: "INST-USTR" });
    const twice = at(CLEAN, [answer("r:1"), answer("r:2")]);
    const fall = retaliationFall(def, 0.25);
    const sold = US_GOODS_TRADE["CHN"]!.exports["agriculture-row-crops"]! / CLEAN.nations[USA]!.base.stats.economy.gdp;
    // The pressure is reported to a millionth, so it is compared at that precision.
    expect(growth(twice, "USA") - growth(CLEAN, "USA")).toBeCloseTo(-COERCION_BITE * sold * (1 - (1 - fall) ** 2), 5);
  });

  it("reaches a designated good's share of its sector, as far as buyers can replace it", () => {
    const chips = at(CLEAN, [measure("s:CHN", "CHN", "sanctions", "semiconductor-equipment")]);
    const stopped = stoppedShare(chips, "CHN" as NationId, "semiconductors");
    expect(stopped).toBeGreaterThan(0);
    expect(stopped).toBeLessThan(COERCION_AS_RATE.sanctions * DOLLAR_REACH * tradeSector("semiconductor-equipment")!.substitutability + 1e-9);
  });

  it("scores an export control by the inputs it denies, not by what the target sells", () => {
    const control = measure("x:CHN", "CHN", "export-control", "semiconductor-equipment", { authority: "INST-BIS" }) as TradeMeasure & { kind: "export-control" };
    const def = tradeSector("semiconductor-equipment")!;
    const sold = US_GOODS_TRADE["CHN"]!.exports["semiconductor-equipment"] ?? 0;
    expect(measureCut(CLEAN, control)).toBeCloseTo(0.4 * (sold / CLEAN.nations["CHN" as NationId]!.base.stats.economy.gdp) * (1 - def.substitutability), 9);
    expect(stoppedShare(at(CLEAN, [control]), "CHN" as NationId, "semiconductors")).toBe(0);
  });

  it("charges an inherited program only for what changed since the baseline was published, and lets lifting it recover", () => {
    const VEN = "VEN" as NationId;
    const program = Object.values(preset.trade.measures).find((m) => m.target === VEN && m.id.endsWith(":inherited"))!;
    const without: Campaign = { ...preset, trade: { ...preset.trade, measures: Object.fromEntries(Object.entries(preset.trade.measures).filter(([id]) => id !== program.id)) } };
    // Only the evasion won back since the 2024 figure was published is new, and it eases the burden.
    expect(Math.abs(growth(preset, "VEN") - growth(without, "VEN"))).toBeLessThan(0.0005);
    const lifted = at(preset, [{ ...program, liftedTurn: preset.turn, liftedDate: preset.calendar }]);
    expect(growth(lifted, "VEN")).toBeGreaterThan(growth(preset, "VEN"));
    const russianOil = Object.values(preset.trade.measures).find((m) => (m.target as string) === "RUS" && m.sector === "energy-crude")!;
    const noOil: Campaign = { ...preset, trade: { ...preset.trade, measures: Object.fromEntries(Object.entries(preset.trade.measures).filter(([id]) => id !== russianOil.id)) } };
    expect(growth(preset, "RUS")).toBeLessThan(growth(noOil, "RUS"));
  });

  it("builds no evasion from a list-based program", () => {
    expect(evasionOn(preset, "COD" as NationId)).toBe(0);
  });

  it("stores the day a measure was lifted, and reads evasion from it", () => {
    const filed = at(CLEAN, [measure("s:IRN:lift", "IRN", "sanctions", "energy-crude")]);
    const later = withWeeksElapsed(filed, 10);
    const lift = liftMeasure(later, "s:IRN:lift");
    if (!lift.ok) throw new Error(lift.reason);
    const after = apply(later, lift.packet);
    expect(after.trade.measures["s:IRN:lift"]!.liftedDate).toEqual(later.calendar);
  });
});


describe("a war on the chips the country builds with", () => {
  const { campaign: QUIET } = foundedForBalance("chip-shortfall", "democrat", {}, { carriedWorld: false });
  const at = (aggressor: string, defender: string): Campaign => {
    const war = { ...openConflict(aggressor as NationId, defender as NationId, QUIET.turn, "A test war."), intensity: 1 };
    return { ...QUIET, conflicts: { [war.id]: war } };
  };
  const growth = (campaign: Campaign) => externalMacroPressure(campaign, USA).growth;

  it("costs American output more in a war on Taiwan than in a war on no chip supplier", () => {
    expect(chipShortfall(at("CHN", "TWN"))).toBeGreaterThan(0);
    expect(chipShortfall(at("RUS", "UKR"))).toBeLessThan(0.01 * chipShortfall(at("CHN", "TWN")));
    const taiwan = growth(at("CHN", "TWN")) - growth(QUIET);
    const elsewhere = growth(at("RUS", "UKR")) - growth(QUIET);
    expect(taiwan).toBeLessThan(elsewhere);
  });

  it("stops costing it the week the war ends", () => {
    expect(chipShortfall(QUIET)).toBe(0);
    expect(growth({ ...at("CHN", "TWN"), conflicts: {} })).toBeCloseTo(growth(QUIET), 9);
  });
});
